"""Tests for the scaffolded conversation-backend API contract.

Only the shapes and error/CORS/concurrency behavior task 1.1 owns are
tested here. The routes exercised are the session endpoints (task
3.1) — the standalone `/conversation/opening`/`/conversation/judge`
pair these tests originally targeted was retired in task 3.4, once its
frontend caller (task 3.3) no longer called them.
"""

from __future__ import annotations

import threading
import time

from tests.conftest import ConcurrencyProbe

VALID_JUDGE_BODY = {
    "question_text": "สบายดีไหม",
    "reply_audio_base64": "AAAA",
    "reply_audio_mime_type": "audio/webm;codecs=opus",
}


def test_health_before_any_model_is_loaded(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "models_loaded": {"whisper": False, "judge": False, "tts": False},
    }


def test_judge_with_no_body_is_422(client):
    # Body validation runs before the session lookup, so a placeholder
    # id is fine here — the empty registry never gets far enough to
    # care whether it is real.
    response = client.post("/conversation/session/placeholder/judge")

    assert response.status_code == 422


def test_judge_missing_required_field_is_422(client):
    body = {k: v for k, v in VALID_JUDGE_BODY.items() if k != "reply_audio_base64"}

    response = client.post("/conversation/session/placeholder/judge", json=body)

    assert response.status_code == 422


def test_session_start_is_not_yet_implemented(client):
    # session_start's first line requires tts_loaded, checked before a
    # session is ever created — an empty registry 501s immediately,
    # the same "not yet implemented" state the retired standalone
    # `/conversation/opening` reported.
    response = client.post("/conversation/session/start", json={"known_words": []})

    assert response.status_code == 501


def test_judge_on_a_real_session_is_not_yet_implemented_while_whisper_is_unloaded(
    tts_only_client,
):
    # tts is loaded (so a session can exist at all), whisper/judge are
    # not — the state session_judge's own model-loaded check reports as
    # 501, distinct from the 404 an unknown session id gets.
    start = tts_only_client.post(
        "/conversation/session/start", json={"known_words": []}
    )
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    response = tts_only_client.post(
        f"/conversation/session/{session_id}/judge", json=VALID_JUDGE_BODY
    )

    assert response.status_code == 501


def test_cors_preflight_allowed_from_dev_origin(client):
    response = client.options(
        "/conversation/session/placeholder/judge",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "POST",
        },
    )

    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_preflight_rejected_from_foreign_origin(client):
    response = client.options(
        "/conversation/session/placeholder/judge",
        headers={
            "origin": "http://evil.example",
            "access-control-request-method": "POST",
        },
    )

    assert "access-control-allow-origin" not in response.headers


def test_allowed_origins_keeps_the_dev_server_defaults_with_no_env_var_set(
    monkeypatch,
):
    monkeypatch.delenv("CONVERSATION_ALLOWED_ORIGINS", raising=False)
    from app.main import _load_allowed_origins

    assert _load_allowed_origins() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_allowed_origins_adds_every_comma_separated_entry_from_the_env_var(
    monkeypatch,
):
    monkeypatch.setenv(
        "CONVERSATION_ALLOWED_ORIGINS",
        "https://phone.example, http://192.168.1.23:5173,,",
    )
    from app.main import _load_allowed_origins

    assert _load_allowed_origins() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://phone.example",
        "http://192.168.1.23:5173",
    ]


def test_concurrent_judge_calls_never_overlap_and_health_stays_responsive(
    tts_only_client, concurrency_probe: ConcurrencyProbe
):
    start = tts_only_client.post(
        "/conversation/session/start", json={"known_words": []}
    )
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    results: list[int] = []

    def call_judge():
        response = tts_only_client.post(
            f"/conversation/session/{session_id}/judge", json=VALID_JUDGE_BODY
        )
        results.append(response.status_code)

    threads = [threading.Thread(target=call_judge) for _ in range(2)]
    for thread in threads:
        thread.start()

    # Give the first call time to enter its (fake) blocking work, then
    # confirm /health -- which never takes MODEL_LOCK -- still answers
    # immediately instead of queueing behind it.
    time.sleep(0.05)
    health_response = tts_only_client.get("/health")

    for thread in threads:
        thread.join()

    assert health_response.status_code == 200
    assert concurrency_probe.max_active == 1
    assert results == [501, 501]
