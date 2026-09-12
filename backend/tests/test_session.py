"""Tests for phase 3's multi-turn conversation sessions.

Nothing here needs a GPU: which question a session asks next, what
happens when its tier runs out, and how the store bounds itself are all
properties of `app/session.py` and `app/bank.py` plus the committed
bank file — the models are the per-model fakes from `conftest.py`.

The bank used is the **real** `backend/data/conversationStarters.json`,
following `test_bank.py`'s reasoning: a hand-written miniature bank
would prove the no-repeat and exhaustion rules against content that
does not exist.
"""

from __future__ import annotations

import base64
import builtins
import io
import os
import threading

import pytest

from app.bank import load_bank, select_entry
from app.main import app
from app.session import SessionStore
from tests.conftest import tiny_wav_bytes

BANK = load_bank()
# A learner who knows every word in the bank: their matched tier is the
# hardest one, which is also the tier this file exhausts in full.
ALL_KNOWN_WORDS = sorted({word for entry in BANK for word in entry.words})
TOP_TIER = max(entry.tier for entry in BANK)
TOP_TIER_ENTRIES = [entry for entry in BANK if entry.tier == TOP_TIER]


def judge_body(question_text: str) -> dict[str, str]:
    return {
        "question_text": question_text,
        "reply_audio_base64": base64.b64encode(tiny_wav_bytes()).decode("ascii"),
        "reply_audio_mime_type": "audio/wav",
    }


def start_session(client, known_words=ALL_KNOWN_WORDS):
    response = client.post(
        "/conversation/session/start", json={"known_words": known_words}
    )
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# AC1 — a session advances, and never repeats a question
# ---------------------------------------------------------------------------


def test_next_after_a_judged_turn_asks_a_different_question(fake_model_client):
    started = start_session(fake_model_client)
    session_id = started["session_id"]
    assert started["question_text"]
    assert started["question_audio_base64"]

    judged = fake_model_client.post(
        f"/conversation/session/{session_id}/judge",
        json=judge_body(started["question_text"]),
    )
    assert judged.status_code == 200, judged.text

    following = fake_model_client.post(f"/conversation/session/{session_id}/next")

    assert following.status_code == 200, following.text
    body = following.json()
    assert body["exhausted"] is False
    assert body["question_text"] != started["question_text"]
    # Both questions come from the tier this learner's snapshot matched —
    # the session stays at one difficulty instead of sliding down to
    # easier entries as it goes on.
    tier_texts = {entry.thai for entry in TOP_TIER_ENTRIES}
    assert {started["question_text"], body["question_text"]} <= tier_texts


def test_a_whole_session_never_repeats_a_question(fake_model_client):
    started = start_session(fake_model_client)
    session_id = started["session_id"]
    asked = [started["question_text"]]

    for _ in range(len(TOP_TIER_ENTRIES) - 1):
        body = fake_model_client.post(
            f"/conversation/session/{session_id}/next"
        ).json()
        assert body["exhausted"] is False
        asked.append(body["question_text"])

    assert len(set(asked)) == len(asked) == len(TOP_TIER_ENTRIES)


def test_two_sessions_are_independent(fake_model_client):
    """Same snapshot, two sessions: the second starts over, not mid-way."""
    first = start_session(fake_model_client)
    second = start_session(fake_model_client)

    assert first["session_id"] != second["session_id"]
    assert first["question_text"] == second["question_text"]


def test_select_entry_excludes_already_asked_ids():
    first = select_entry(ALL_KNOWN_WORDS, BANK)
    assert first is not None

    second = select_entry(ALL_KNOWN_WORDS, BANK, exclude_ids={first.id})

    assert second is not None
    assert second.id != first.id
    assert second.tier == first.tier


# ---------------------------------------------------------------------------
# AC2 — exhaustion is a named state, not an error and not a repeat
# ---------------------------------------------------------------------------


def test_exhausting_the_tier_returns_exhausted_rather_than_repeating(fake_model_client):
    started = start_session(fake_model_client)
    session_id = started["session_id"]
    asked = [started["question_text"]]
    for _ in range(len(TOP_TIER_ENTRIES) - 1):
        asked.append(
            fake_model_client.post(
                f"/conversation/session/{session_id}/next"
            ).json()["question_text"]
        )

    response = fake_model_client.post(f"/conversation/session/{session_id}/next")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["exhausted"] is True
    assert body["question_text"] is None
    # And it stays exhausted — never a repeat of something already asked.
    again = fake_model_client.post(f"/conversation/session/{session_id}/next").json()
    assert again["exhausted"] is True
    assert again["question_text"] not in asked


def test_select_entry_returns_none_once_the_matched_tier_is_exhausted():
    every_top_tier_id = {entry.id for entry in TOP_TIER_ENTRIES}

    assert select_entry(ALL_KNOWN_WORDS, BANK, exclude_ids=every_top_tier_id) is None


# ---------------------------------------------------------------------------
# AC3 — an unknown session id is a 404, never a silently created session
# ---------------------------------------------------------------------------


def test_next_on_an_unknown_session_is_404(fake_model_client):
    response = fake_model_client.post("/conversation/session/no-such-session/next")

    assert response.status_code == 404
    assert app.state.sessions.get("no-such-session") is None


def test_judge_on_an_unknown_session_is_404(fake_model_client):
    response = fake_model_client.post(
        "/conversation/session/no-such-session/judge",
        json=judge_body("สบายดีไหม"),
    )

    assert response.status_code == 404
    assert app.state.sessions.get("no-such-session") is None


# ---------------------------------------------------------------------------
# AC4 — genuinely in memory only, across a real lifecycle
# ---------------------------------------------------------------------------


@pytest.fixture()
def no_disk_writes(monkeypatch: pytest.MonkeyPatch):
    """Fail the test if anything opens a file for writing.

    Reads stay allowed (imports, the reference clip, the bank file); any
    write — which is what persisting session state would be — raises.
    `io.open` is patched as well as `builtins.open` because `pathlib`
    goes through `io.open`, and `os.open` because that is the low-level
    route around both.
    """
    real_open = builtins.open
    real_os_open = os.open
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND

    def guarded_open(file, mode="r", *args, **kwargs):
        if any(character in mode for character in "wxa+"):
            raise AssertionError(f"wrote to disk: {file!r} (mode {mode!r})")
        return real_open(file, mode, *args, **kwargs)

    def guarded_os_open(path, flags, *args, **kwargs):
        if flags & write_flags:
            raise AssertionError(f"wrote to disk: {path!r} (flags {flags!r})")
        return real_os_open(path, flags, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", guarded_open)
    monkeypatch.setattr(io, "open", guarded_open)
    monkeypatch.setattr(os, "open", guarded_os_open)
    return guarded_open


def test_a_full_lifecycle_never_touches_the_filesystem(
    fake_model_client, monkeypatch: pytest.MonkeyPatch, no_disk_writes
):
    # Two things on this path write to disk for reasons that have
    # nothing to do with session state, and are taken out of the way
    # first so the guard measures only the store: TTS synthesis, which
    # writes its output to a file by the model's own API, and
    # faster-whisper's decoder module, which is imported lazily on the
    # first judged reply.
    from faster_whisper.audio import decode_audio  # noqa: F401

    monkeypatch.setattr(
        "app.pipeline.synthesize_question",
        lambda tts_pipeline, text: (b"\x00\x01fake-audio", "audio/wav"),
    )

    started = start_session(fake_model_client)
    session_id = started["session_id"]
    judged = fake_model_client.post(
        f"/conversation/session/{session_id}/judge",
        json=judge_body(started["question_text"]),
    )
    following = fake_model_client.post(f"/conversation/session/{session_id}/next")

    assert judged.status_code == 200, judged.text
    assert following.status_code == 200, following.text
    # The lifecycle really ran — state was created, mutated and read
    # back — so "nothing was written" is a fact about a live session,
    # not about an untouched empty dict.
    state = app.state.sessions.get(session_id)
    assert state is not None
    assert len(state.asked_ids) == 2
    assert len(state.history) == 1


# ---------------------------------------------------------------------------
# AC5 — concurrent /next calls can't double-serve or double-advance
# ---------------------------------------------------------------------------


def test_concurrent_next_calls_never_serve_the_same_question(fake_model_client):
    started = start_session(fake_model_client)
    session_id = started["session_id"]
    bodies: list[dict] = []
    lock = threading.Lock()

    def call_next():
        body = fake_model_client.post(f"/conversation/session/{session_id}/next").json()
        with lock:
            bodies.append(body)

    threads = [threading.Thread(target=call_next) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    questions = [body["question_text"] for body in bodies]
    assert len(questions) == 2
    assert questions[0] != questions[1], "two overlapping /next calls served the same question"
    # Neither did they collapse into one advance: the opening question
    # plus one entry per call.
    assert len(app.state.sessions.get(session_id).asked_ids) == 3


# ---------------------------------------------------------------------------
# AC6 — the store is bounded, oldest-first
# ---------------------------------------------------------------------------


def test_store_evicts_the_oldest_session_past_its_cap():
    store = SessionStore(max_sessions=2)

    first = store.start(["ก"])
    second = store.start(["ข"])
    third = store.start(["ค"])

    assert len(store) == 2
    assert store.get(first.session_id) is None
    assert store.session_ids == (second.session_id, third.session_id)


def test_an_evicted_session_behaves_exactly_like_an_unknown_one(
    fake_model_client, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(app.state, "sessions", SessionStore(max_sessions=1))
    evicted = start_session(fake_model_client)
    start_session(fake_model_client)

    following = fake_model_client.post(
        f"/conversation/session/{evicted['session_id']}/next"
    )
    judged = fake_model_client.post(
        f"/conversation/session/{evicted['session_id']}/judge",
        json=judge_body(evicted["question_text"]),
    )
    unknown = fake_model_client.post("/conversation/session/never-existed/next")

    assert following.status_code == 404
    assert judged.status_code == 404
    assert following.json() == unknown.json()
