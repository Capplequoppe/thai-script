"""Shared test fixtures.

`concurrency_probe` and its `ConcurrencyProbe` are the fake blocking
calls task 1.1's AC7 exercises to prove `app.main.run_serialized`
actually serializes access — task 1.2 extends this file with fake
model objects (Whisper/judge/TTS) built the same way, standing in for
the real ones until real-model (`gpu`-marked) tests take over.
"""

from __future__ import annotations

import threading
import time

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


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

    Real model calls don't exist until task 1.2; this stands in for
    one, so tests can prove `MODEL_LOCK` (via `run_serialized`) really
    prevents two calls from overlapping, without a GPU or any weights.
    """
    probe = ConcurrencyProbe()

    def fake_pipeline(payload):
        probe.blocking_call()
        raise HTTPException(status_code=501, detail="not implemented")

    monkeypatch.setattr("app.main._judge_pipeline", fake_pipeline)
    return probe
