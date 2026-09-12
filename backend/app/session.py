"""In-memory, size-bounded conversation sessions.

Phase 3 turns the single fixed exchange of phases 1-2 into a real
multi-turn conversation. All the state that needs to survive between
one turn and the next lives here, in this process's memory and
**nowhere else**:

- which bank entries this session has already asked (so `/next` never
  repeats one),
- the learner's known-vocabulary snapshot as it was at session start
  (so every question in a session is drawn from one stable tier),
- the judged turns so far,
- and the session's own `asyncio.Lock`.

**Nothing here is persisted.** SRS state is entirely browser-side
(plan CONTEXT.md); a backend restart losing an in-progress conversation
is the accepted cost of not duplicating that store, and
`backend/tests/test_session.py` holds a filesystem-write guard over a
full lifecycle so this stays true rather than merely being intended.

**Bounded, not expiring.** There is no time-based expiry anywhere in
this design — the risk an unbounded store carries is a memory leak, not
staleness — so `SessionStore` caps how many sessions it holds and drops
the oldest when a new one pushes it over. An evicted id is
indistinguishable from an id that never existed: both are a `404`, so
the frontend has no third state to handle.

The request/response models for the session endpoints live here rather
than in `app/schemas.py` because they are this module's surface; the
`docs/conversation-backend-api.md` entries for them are authoritative
either way, and a field renamed in one is renamed in the other.
"""

from __future__ import annotations

import asyncio
import uuid
from collections import OrderedDict
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel

# How many sessions this process keeps at once before the oldest is
# dropped. A single-user local tool never approaches this; the cap
# exists so a client that starts sessions in a loop can't grow the
# process without bound.
MAX_SESSIONS = 500


@dataclass(frozen=True)
class Turn:
    """One judged exchange, recorded as it happened."""

    question_text: str
    transcript: str
    verdict: Literal["pass", "fail", "unscored"]
    feedback_en: str


@dataclass
class SessionState:
    """Everything one in-progress conversation needs, and nothing more."""

    session_id: str
    #: The learner's known words as of `/session/start`. Frozen for the
    #: session's life: re-reading a snapshot mid-session could move the
    #: matched tier under the learner and make "already asked" meaningless.
    known_words: tuple[str, ...]
    asked_ids: set[str] = field(default_factory=set)
    history: list[Turn] = field(default_factory=list)
    #: Guards the select-synthesize-record sequence in `/session/start`
    #: and `/session/{id}/next`.
    #: Per session, never global, so two learners' sessions still run
    #: concurrently — the only thing that must not interleave is two
    #: `/next` calls on the *same* session (a double-click, or React
    #: StrictMode double-invoking an effect in development).
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SessionStore:
    """A bounded `dict[str, SessionState]` with oldest-first eviction.

    Held on `app.state`, built once at startup — the same "init once,
    never per-request" pattern as the models and the bank.

    Eviction is by **insertion** order, not least-recently-used: `get`
    deliberately does not reorder, so "the oldest session" means the one
    started longest ago and an active session can still be evicted. That
    is fine precisely because an evicted id and an unknown id are the
    same `404` to the client.
    """

    def __init__(self, max_sessions: int = MAX_SESSIONS) -> None:
        if max_sessions < 1:
            raise ValueError("max_sessions must be at least 1")
        self._max_sessions = max_sessions
        self._sessions: OrderedDict[str, SessionState] = OrderedDict()

    def start(self, known_words: Iterable[str]) -> SessionState:
        """Create a session under a fresh server-generated id.

        The id is random, never derived from `known_words`: two learners
        (or one learner starting twice) can hold an identical snapshot,
        and a content-derived key would collide their histories.
        """
        state = SessionState(
            session_id=uuid.uuid4().hex, known_words=tuple(known_words)
        )
        self._sessions[state.session_id] = state
        while len(self._sessions) > self._max_sessions:
            self._sessions.popitem(last=False)
        return state

    def get(self, session_id: str) -> SessionState | None:
        """The session with this id, or `None` — never a new one.

        An unrecognized id is the caller's problem to hear about (a
        `404` at the HTTP layer), never quietly turned into a fresh
        session whose history starts empty and whose first question the
        learner has already been asked.
        """
        return self._sessions.get(session_id)

    @property
    def session_ids(self) -> tuple[str, ...]:
        """Live session ids, oldest first — the eviction order."""
        return tuple(self._sessions)


class SessionStartRequest(BaseModel):
    """The learner's known-vocabulary snapshot.

    Exactly task 2.1's `/conversation/opening` body, deliberately: there
    is no separate "vocabulary/grammar snapshot" shape, because nothing
    in this plan reads a grammar-id list back.
    """

    known_words: list[str]


class SessionStartResponse(BaseModel):
    session_id: str
    question_text: str
    question_audio_base64: str
    question_audio_mime_type: str


class NextQuestionResponse(BaseModel):
    """The next question, or an explicit end-of-content state.

    `exhausted` is a named field rather than an empty `200` or an error:
    "this tier has no unasked entry left" is a normal, expected end to a
    session, and must stay distinguishable from "selecting an entry went
    wrong" — the same never-asked/empty/failed distinction the judge
    endpoint's `unscored` verdict exists for.
    """

    exhausted: bool = False
    question_text: str | None = None
    question_audio_base64: str | None = None
    question_audio_mime_type: str | None = None
