"""Tests for the scaffolded conversation-backend API contract.

Only the shapes and error/CORS/concurrency behavior task 1.1 owns are
tested here — `/conversation/opening` and `/conversation/judge`'s
happy paths are still `501` in this task; their real behavior is task
1.2's to test.
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
    response = client.post("/conversation/judge")

    assert response.status_code == 422


def test_judge_missing_required_field_is_422(client):
    body = {k: v for k, v in VALID_JUDGE_BODY.items() if k != "reply_audio_base64"}

    response = client.post("/conversation/judge", json=body)

    assert response.status_code == 422


def test_opening_is_not_yet_implemented(client):
    response = client.get("/conversation/opening")

    assert response.status_code == 501


def test_judge_with_well_formed_body_is_not_yet_implemented(client):
    response = client.post("/conversation/judge", json=VALID_JUDGE_BODY)

    assert response.status_code == 501


def test_cors_preflight_allowed_from_dev_origin(client):
    response = client.options(
        "/conversation/judge",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "POST",
        },
    )

    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_preflight_rejected_from_foreign_origin(client):
    response = client.options(
        "/conversation/judge",
        headers={
            "origin": "http://evil.example",
            "access-control-request-method": "POST",
        },
    )

    assert "access-control-allow-origin" not in response.headers


def test_concurrent_judge_calls_never_overlap_and_health_stays_responsive(
    client, concurrency_probe: ConcurrencyProbe
):
    results: list[int] = []

    def call_judge():
        response = client.post("/conversation/judge", json=VALID_JUDGE_BODY)
        results.append(response.status_code)

    threads = [threading.Thread(target=call_judge) for _ in range(2)]
    for thread in threads:
        thread.start()

    # Give the first call time to enter its (fake) blocking work, then
    # confirm /health -- which never takes MODEL_LOCK -- still answers
    # immediately instead of queueing behind it.
    time.sleep(0.05)
    health_response = client.get("/health")

    for thread in threads:
        thread.join()

    assert health_response.status_code == 200
    assert concurrency_probe.max_active == 1
    assert results == [501, 501]
