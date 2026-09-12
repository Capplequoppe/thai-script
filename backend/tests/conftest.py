"""Shared test fixtures.

Model substitution works through `app.state`: the lifespan in
`app.main` loads real models only when no `ModelRegistry` was pre-seeded
before startup, so every fixture here seeds one first —

- `client`: an EMPTY registry (no models, nothing loads) — the modelless
  process task 1.1's contract tests run against.
- `fake_model_client`: all three models replaced by the fakes below.
- `gpu_client` (session-scoped, for `-m gpu` runs only): NO pre-seeded
  registry, so the real lifespan loads the real models once.

The fakes stand in for exactly one real model each and are usable
independently of one another (task 1.2's AC8): `FakeWhisperModel` for
`faster_whisper.WhisperModel`, `FakeJudgeLLM`+`FakeJudgeTokenizer` for
the transformers pair, `FakeTTSPipeline` for flowtts' voice-cloning
pipeline. `ConcurrencyProbe` is task 1.1's fake blocking call proving
`app.main.run_serialized` really serializes.
"""

from __future__ import annotations

import io
import threading
import time
import wave
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models import ModelRegistry

# ---------------------------------------------------------------------------
# Fake models (one per real model, each independent of the others)
# ---------------------------------------------------------------------------


class FakeWhisperModel:
    """Stands in for `faster_whisper.WhisperModel`.

    Returns a canned transcript as one segment (or raises `error`),
    mirroring the real `(segments, info)` shape.
    """

    def __init__(self, transcript: str = "สบายดีครับ", error: Exception | None = None):
        self.transcript = transcript
        self.error = error

    def transcribe(self, audio, language=None, **kwargs):
        if self.error is not None:
            raise self.error
        segments = iter([SimpleNamespace(text=self.transcript)])
        info = SimpleNamespace(language=language)
        return segments, info


class _FakeEncoding(dict):
    """dict-with-.to(), like transformers' BatchEncoding."""

    def to(self, device):
        return self


class _FakeGeneratedRow:
    """`output[0][prompt_length:]` yields the canned completion payload."""

    def __init__(self, payload: str):
        self._payload = payload

    def __getitem__(self, key):
        return self._payload


class FakeJudgeLLM:
    """Stands in for the Qwen `AutoModelForCausalLM` (generate-only)."""

    device = "cpu"

    def __init__(
        self,
        response: str = "ผลลัพธ์: ผ่าน\nเหตุผล: A natural, on-topic reply.",
        error: Exception | None = None,
    ):
        self.response = response
        self.error = error

    def generate(self, input_ids=None, attention_mask=None, **kwargs):
        if self.error is not None:
            raise self.error
        return [_FakeGeneratedRow(self.response)]


class FakeJudgeTokenizer:
    """Stands in for the Qwen `AutoTokenizer` (chat-template + decode)."""

    def __init__(self):
        self.last_messages: list[dict[str, str]] | None = None

    def apply_chat_template(
        self, messages, add_generation_prompt=False, return_tensors=None, return_dict=False
    ):
        self.last_messages = messages
        return _FakeEncoding(
            input_ids=SimpleNamespace(shape=(1, 11)),
            attention_mask=SimpleNamespace(shape=(1, 11)),
        )

    def decode(self, token_ids, skip_special_tokens=False):
        # `token_ids` is the payload a _FakeGeneratedRow slice produced.
        return token_ids


class FakeTTSPipeline:
    """Stands in for `flowtts.inference.FlowTTSPipeline` (call shape only).

    Writes a small valid WAV to `output_file` and records each call, so
    tests can assert the voice-cloning wiring (reference clip +
    transcript) without a GPU.
    """

    def __init__(self):
        self.calls: list[dict[str, str | None]] = []

    def __call__(self, text, ref_voice, output_file, ref_text=None, **kwargs):
        self.calls.append({"text": text, "ref_voice": ref_voice, "ref_text": ref_text})
        with wave.open(output_file, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(b"\x00\x08" * 2400)  # 0.1 s of quiet non-silence
        return output_file


def tiny_wav_bytes(duration_s: float = 0.2, sample_rate: int = 16000) -> bytes:
    """A small, genuinely decodable WAV payload for inbound-reply tests."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x10" * int(duration_s * sample_rate))
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------


@contextmanager
def seeded_client(registry: ModelRegistry):
    """A TestClient whose app starts with `registry` pre-seeded.

    Seeding happens before startup so the lifespan skips real model
    loading; the previous registry (if any) is restored afterwards so a
    session-scoped gpu client and function-scoped fake clients can
    coexist in one pytest session.
    """
    previous = getattr(app.state, "models", None)
    app.state.models = registry
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if previous is None:
            del app.state.models
        else:
            app.state.models = previous


@pytest.fixture()
def client():
    """App with an empty registry: no models loaded, nothing loads."""
    with seeded_client(ModelRegistry()) as test_client:
        yield test_client


@pytest.fixture()
def fake_registry() -> ModelRegistry:
    return ModelRegistry(
        whisper=FakeWhisperModel(),
        judge_llm=FakeJudgeLLM(),
        judge_tokenizer=FakeJudgeTokenizer(),
        tts=FakeTTSPipeline(),
    )


@pytest.fixture()
def fake_model_client(fake_registry: ModelRegistry):
    """App with all three models faked — full request/response paths, no GPU."""
    with seeded_client(fake_registry) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def gpu_client():
    """App started with NO pre-seeded registry: the real lifespan loads
    the real models (once per session). Only `-m gpu` tests use this."""
    with TestClient(app) as test_client:
        yield test_client
    # Leave teardown to process exit: dropping 20 GB of weights mid-run
    # buys nothing, and no non-gpu fixture depends on this state.


# ---------------------------------------------------------------------------
# Task 1.1's concurrency probe (unchanged)
# ---------------------------------------------------------------------------


class ConcurrencyProbe:
    """Tracks how many fake blocking calls are in flight at once."""

    def __init__(self) -> None:
        self._guard = threading.Lock()
        self.active = 0
        self.max_active = 0

    def blocking_call(self, delay: float = 0.15) -> None:
        with self._guard:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
        time.sleep(delay)
        with self._guard:
            self.active -= 1


@pytest.fixture()
def concurrency_probe(monkeypatch: pytest.MonkeyPatch) -> ConcurrencyProbe:
    """Patch the judge pipeline with a fake blocking call.

    Stands in for a real model call, so tests can prove `MODEL_LOCK`
    (via `run_serialized`) really prevents two calls from overlapping,
    without a GPU or any weights.
    """
    probe = ConcurrencyProbe()

    def fake_pipeline(payload):
        probe.blocking_call()
        raise HTTPException(status_code=501, detail="not implemented")

    monkeypatch.setattr("app.main._judge_pipeline", fake_pipeline)
    return probe
