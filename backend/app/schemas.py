"""Pydantic request/response models for the conversation practice API.

These shapes are the contract documented in
`docs/conversation-backend-api.md` — field names here are final for
this phase; a task that wants to change one edits both this file and
that document together, never one without the other.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ModelsLoaded(BaseModel):
    whisper: bool
    judge: bool
    tts: bool


class HealthResponse(BaseModel):
    status: Literal["ok"]
    models_loaded: ModelsLoaded


class OpeningResponse(BaseModel):
    question_text: str
    question_audio_base64: str
    question_audio_mime_type: str


class JudgeRequest(BaseModel):
    question_text: str
    reply_audio_base64: str
    reply_audio_mime_type: str


class JudgeResponse(BaseModel):
    transcript: str
    verdict: Literal["pass", "fail", "unscored"]
    feedback_en: str
