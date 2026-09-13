"""CONVERSATION_BACKEND_TOKEN — the shared-secret gate for a tunneled backend.

A no-op by default (every other test file's requests carry no token and
still pass), and enforced only once the env var is set — which is what
lets a test toggle it per-case with `monkeypatch.setenv` against the
same already-running `app` module, no reload required.
"""

from __future__ import annotations

TOKEN_HEADER = "X-Conversation-Backend-Token"


def test_no_token_required_when_the_env_var_is_unset(tts_only_client, monkeypatch):
    monkeypatch.delenv("CONVERSATION_BACKEND_TOKEN", raising=False)

    response = tts_only_client.post(
        "/conversation/session/start", json={"known_words": []}
    )

    assert response.status_code == 200


def test_missing_token_is_401_once_the_env_var_is_set(tts_only_client, monkeypatch):
    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")

    response = tts_only_client.post(
        "/conversation/session/start", json={"known_words": []}
    )

    assert response.status_code == 401


def test_wrong_token_is_401(tts_only_client, monkeypatch):
    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")

    response = tts_only_client.post(
        "/conversation/session/start",
        json={"known_words": []},
        headers={TOKEN_HEADER: "not-it"},
    )

    assert response.status_code == 401


def test_correct_token_is_accepted(tts_only_client, monkeypatch):
    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")

    response = tts_only_client.post(
        "/conversation/session/start",
        json={"known_words": []},
        headers={TOKEN_HEADER: "s3cret"},
    )

    assert response.status_code == 200


def test_auth_is_checked_before_the_session_lookup(tts_only_client, monkeypatch):
    # A bad token against a nonexistent session id must still 401, not
    # 404 — proving the gate runs before the handler body, not after a
    # route has already done real work.
    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")

    response = tts_only_client.post(
        "/conversation/session/does-not-exist/judge",
        json={
            "question_text": "สบายดีไหม",
            "reply_audio_base64": "AAAA",
            "reply_audio_mime_type": "audio/webm;codecs=opus",
        },
    )

    assert response.status_code == 401


def test_next_is_also_gated(tts_only_client, monkeypatch):
    monkeypatch.delenv("CONVERSATION_BACKEND_TOKEN", raising=False)
    start = tts_only_client.post(
        "/conversation/session/start", json={"known_words": []}
    )
    session_id = start.json()["session_id"]

    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")
    response = tts_only_client.post(f"/conversation/session/{session_id}/next")

    assert response.status_code == 401


def test_health_stays_open_even_when_a_token_is_configured(client, monkeypatch):
    monkeypatch.setenv("CONVERSATION_BACKEND_TOKEN", "s3cret")

    response = client.get("/health")

    assert response.status_code == 200
