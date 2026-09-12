"""Loading the three local models, once, at FastAPI startup.

The loaded objects live in a `ModelRegistry` stored on `app.state` —
never module globals — which is what lets `backend/tests/conftest.py`
pre-seed the registry with lightweight per-model fakes (or nothing)
before the app starts, and what keeps the non-GPU suite from ever
touching a real model.

All heavy imports happen *inside* the load functions: importing this
module costs nothing, so the app (and its tests) start instantly and a
process that never loads models never pays for torch/transformers/
ctranslate2 import time either.
"""

from __future__ import annotations

import asyncio
import ctypes
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

WHISPER_MODEL_ID = "large-v3"
JUDGE_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
# ThonburianTTS weights (CC-BY-NC-SA — see backend/vendor/README.md).
TTS_CHECKPOINT = "hf://biodatlab/ThonburianTTS/megaF5/mega_f5_last.safetensors"
TTS_VOCAB_FILE = "hf://biodatlab/ThonburianTTS/megaF5/mega_vocab.txt"

# The vendored ThonburianTTS package (see backend/vendor/README.md for
# provenance) — inserted into sys.path here because the backend is a
# non-packaged uv project, so nothing installs the vendor tree.
_VENDOR_DIR = Path(__file__).resolve().parent.parent / "vendor"


@dataclass
class ModelRegistry:
    """The three loaded models; each field flips from None as it loads."""

    whisper: Any | None = None
    judge_llm: Any | None = None
    judge_tokenizer: Any | None = None
    tts: Any | None = None

    @property
    def whisper_loaded(self) -> bool:
        return self.whisper is not None

    @property
    def judge_loaded(self) -> bool:
        return self.judge_llm is not None and self.judge_tokenizer is not None

    @property
    def tts_loaded(self) -> bool:
        return self.tts is not None


def _preload_cu12_libraries() -> None:
    """Preload libcublas/libcudnn from the nvidia cu12 wheels.

    The PyPI torch build bundles CUDA 13 (`libcublas.so.13`), but
    ctranslate2 (faster-whisper's engine) dlopens the `.so.12` names and
    dies with "Library libcublas.so.12 is not found" at the first
    encode. Loading the cu12 wheels' libraries into the process first
    (RTLD_GLOBAL) makes that dlopen resolve to the already-loaded
    copies — no LD_LIBRARY_PATH required.
    """
    import nvidia.cublas.lib
    import nvidia.cudnn.lib

    for package in (nvidia.cublas.lib, nvidia.cudnn.lib):
        for shared_object in sorted(Path(package.__path__[0]).glob("*.so*")):
            try:
                ctypes.CDLL(str(shared_object), mode=ctypes.RTLD_GLOBAL)
            except OSError:
                # An optional sub-library with unmet deps of its own;
                # ctranslate2 will name any it truly needs.
                continue


def load_whisper() -> Any:
    """faster-whisper large-v3, GPU float16 (plan CONTEXT.md)."""
    _preload_cu12_libraries()
    from faster_whisper import WhisperModel

    return WhisperModel(WHISPER_MODEL_ID, device="cuda", compute_type="float16")


def load_judge() -> tuple[Any, Any]:
    """Qwen2.5-7B-Instruct, bf16 on GPU: returns (llm, tokenizer)."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(JUDGE_MODEL_ID)
    llm = AutoModelForCausalLM.from_pretrained(
        JUDGE_MODEL_ID, dtype=torch.bfloat16, device_map="cuda"
    )
    llm.eval()
    return llm, tokenizer


def load_tts() -> Any:
    """ThonburianTTS (vendored flowtts), voice-cloning F5 pipeline."""
    if str(_VENDOR_DIR) not in sys.path:
        sys.path.insert(0, str(_VENDOR_DIR))
    from flowtts.inference import AudioConfig, FlowTTSPipeline, ModelConfig

    model_config = ModelConfig(
        language="th",
        model_type="F5",
        checkpoint=TTS_CHECKPOINT,
        vocab_file=TTS_VOCAB_FILE,
        ode_method="euler",
        use_ema=True,
        vocoder="vocos",
        device="cuda",
        # Deterministic synthesis (-1 would reseed randomly per call):
        # the same text always yields the same audio, so the one fixed
        # opening question sounds identical every time and flaky
        # renditions can't creep into gpu-test runs.
        seed=42,
    )
    # Values from upstream's own f5tts_thai_example.py (more current
    # than its README, per plan CONTEXT.md).
    audio_config = AudioConfig(
        silence_threshold=-45,
        max_audio_length=20000,
        cfg_strength=2.5,
        nfe_step=32,
        target_rms=0.1,
        cross_fade_duration=0.15,
        speed=1.0,
        min_silence_len=500,
        keep_silence=200,
        seek_step=10,
    )
    # FlowTTSPipeline writes intermediate reference clips into temp_dir;
    # keep that out of the repository working directory.
    temp_dir = tempfile.mkdtemp(prefix="flowtts-")
    return FlowTTSPipeline(
        model_config=model_config, audio_config=audio_config, temp_dir=temp_dir
    )


def _warm_up_whisper(whisper: Any) -> None:
    """Run one throwaway transcription so CUDA/cuDNN kernel selection and
    ctranslate2's own first-call setup happen during startup.

    Plan CONTEXT.md's ~1.1s/19s figure is a *warm* measurement — the
    first call on a freshly loaded model pays extra, unpredictable
    one-time cost that would otherwise land on the learner's first
    reply instead of on startup.
    """
    import io
    import wave

    from faster_whisper.audio import decode_audio

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(b"\x00\x00" * 1600)  # 0.1s of silence
    decoded = decode_audio(io.BytesIO(buffer.getvalue()))
    segments, _info = whisper.transcribe(decoded, language="th", vad_filter=True)
    list(segments)  # force the lazy generator through a real decode pass


def _warm_up_judge(llm: Any, tokenizer: Any) -> None:
    """Run one throwaway judge generation for the same reason as above —
    first-call CUDA graph/kernel setup, not startup weight loading.
    """
    from app.judge_prompt import build_judge_messages
    from app.pipeline import _generate_judge_completion

    messages = build_judge_messages("สบายดีไหม", "สบายดีครับ")
    _generate_judge_completion(llm, tokenizer, messages)


def _warm_up_tts(tts: Any) -> None:
    """Synthesize the real opening question once, discarding the result.

    Same rationale as the other two warm-ups; this one also happens to
    exercise the exact call `POST /conversation/opening` makes.
    """
    from app.pipeline import synthesize_opening

    synthesize_opening(tts)


async def load_models_into(registry: ModelRegistry) -> None:
    """Load all three models sequentially into `registry`, each followed
    by a throwaway warm-up call before its field is assigned.

    Each field is assigned only once that model is actually ready for a
    fast real request, so the registry's per-model flags are truthful
    at every instant. Note that in production nothing can observe a
    partial state over HTTP: the server only starts accepting
    connections after the lifespan (and therefore this function)
    returns — the per-model shape is what `/health` reads and what
    tests exercise by seeding partial registries. Loading runs in a
    worker thread; the single startup call site (`app.main`'s
    lifespan) is the only writer, so no lock is needed here.
    """
    whisper = await asyncio.to_thread(load_whisper)
    await asyncio.to_thread(_warm_up_whisper, whisper)
    registry.whisper = whisper

    judge_llm, judge_tokenizer = await asyncio.to_thread(load_judge)
    await asyncio.to_thread(_warm_up_judge, judge_llm, judge_tokenizer)
    registry.judge_llm = judge_llm
    registry.judge_tokenizer = judge_tokenizer

    tts = await asyncio.to_thread(load_tts)
    await asyncio.to_thread(_warm_up_tts, tts)
    registry.tts = tts
