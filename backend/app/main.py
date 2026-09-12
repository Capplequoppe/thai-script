"""FastAPI app for the conversation practice backend.

Route bodies are placeholders (`501 Not Implemented`) except `/health`,
which is fully real from this task onward — task 1.2 replaces the
`501`s with the real STT -> judge -> TTS pipeline, never the shapes
declared in `app/schemas.py` or documented in
`docs/conversation-backend-api.md`.

This is the first task in the plan to decide two properties every
later task builds against without re-deciding them:

- **CORS**: an explicit origin allowlist, never `allow_origins=["*"]``
  — this endpoint drives a local GPU with no auth, so a wildcard would
  make it callable by any page the user happens to have open.
- **Concurrency**: handlers are `async def`, and the (future) model
  calls are serialized behind one module-level `asyncio.Lock` via
  `run_serialized` below, so `/health` keeps answering while a model
  call is in flight and two overlapping requests never hit the GPU at
  the same time. Task 1.2's real model calls route through this same
  helper; this task proves the mechanism with fakes (see
  `backend/tests/conftest.py`).
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    HealthResponse,
    JudgeRequest,
    JudgeResponse,
    ModelsLoaded,
    OpeningResponse,
)

# Vite's default dev server origin, plus its 127.0.0.1 equivalent —
# the only origins allowed to call this backend. Add task 1.4's
# Playwright e2e origin here when that task defines it; never widen
# this to a wildcard.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(title="conversation-backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serializes access to the local models (STT, judge LLM, TTS) — the
# backend is single-process, single-GPU, synchronous per request (see
# the plan's CONTEXT.md). Held only around a model call, never around
# an entire request, so unrelated routes such as /health are never
# blocked by one in flight.
MODEL_LOCK = asyncio.Lock()


async def run_serialized(fn: Callable, *args, **kwargs):
    """Run a blocking callable under `MODEL_LOCK`, off the event loop.

    `asyncio.to_thread` keeps the blocking call from ever stalling the
    event loop itself (so `/health` stays responsive); the lock keeps
    two overlapping calls from ever running at once. Task 1.2's real
    model calls and this task's fake ones (task 1.1's AC7) share this
    one helper, so the guarantee is proven once and reused unchanged.
    """
    async with MODEL_LOCK:
        return await asyncio.to_thread(fn, *args, **kwargs)


def _judge_pipeline(payload: JudgeRequest) -> JudgeResponse:
    """Placeholder for task 1.2's real STT -> judge pipeline."""
    raise HTTPException(status_code=501, detail="not implemented")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    # No model-loading code exists yet in this task — every value is
    # `False` until task 1.2's startup loads that model.
    return HealthResponse(
        status="ok",
        models_loaded=ModelsLoaded(whisper=False, judge=False, tts=False),
    )


@app.get("/conversation/opening", response_model=OpeningResponse)
async def opening() -> OpeningResponse:
    raise HTTPException(status_code=501, detail="not implemented")


@app.post("/conversation/judge", response_model=JudgeResponse)
async def judge(payload: JudgeRequest) -> JudgeResponse:
    return await run_serialized(_judge_pipeline, payload)
