---
doc_type: reference
title: "Task 1.2 — Game history repository"
description: A JsonStore-backed GameHistoryRepository (mirroring the app's IStorage adapter split), in its own localStorage key, with validated reads and independence from SRS reset/export.
covers:
  - src/infrastructure/persistence/JsonStore.ts
  - src/infrastructure/persistence/JsonStore.test.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
status: draft
task_id: "1.2"
task_status: complete
depends_on: ["1.1"]
size: medium
verify:
  - npm test -- src/infrastructure/persistence/JsonStore
  - npm test -- src/infrastructure/persistence/StorageGameHistoryRepository
ac_enforcement:
  - "AC1 -> a case saving one entry then listing it back via a fresh repository instance over the same JsonStore backing store"
  - "AC2 -> a case listing on a repository that has never been written to, asserting {status:\"ok\", entries: []}"
  - "AC3 -> a case that saves a game-history entry, then loads the existing thai-srs-state LearnerState via LocalStorageAdapter and asserts it is unchanged from before the save"
  - "AC4 -> a case run with `localStorage` deleted/undefined asserting list() returns {status:\"ok\", entries: []} and save() does not throw"
  - "AC5 -> a case saving three entries in sequence and asserting the list order returned (most-recent-first, per playedAt)"
  - "AC6 -> a case in JsonStore.test.ts: a stored value that is not valid JSON, or that parses but fails a shape check, yields a distinguishable corrupt result — never the same shape as an empty store"
  - "AC7 -> a case where the underlying localStorage.setItem throws (simulating QuotaExceededError), asserting save() surfaces this as a typed failure rather than an uncaught throw"
  - "AC8 -> a case: reset the SRS LearnerState (via LocalStorageAdapter.reset()) after saving game history, then assert list() still returns the saved entries unchanged"
ac_tests:
  - "AC1 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC1: returns a saved entry from a fresh repository instance over the same store"
  - "AC2 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC2: an unwritten history returns {status: 'ok', entries: []}"
  - "AC3 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC3: saving a game-history entry leaves the SRS LearnerState blob untouched"
  - "AC4 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC4: with localStorage unavailable, list() is empty and save() does not throw"
  - "AC5 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC5: lists history most-recent-first after multiple saves"
  - "AC6 -> src/infrastructure/persistence/JsonStore.test.ts::reports invalid JSON as corrupt, never as empty or a throw"
  - "AC7 -> src/infrastructure/persistence/JsonStore.test.ts::surfaces a throwing setItem as a failed save, not an uncaught throw"
  - "AC8 -> src/infrastructure/persistence/StorageGameHistoryRepository.test.ts::AC8: an SRS reset does not affect saved game history"
red_proof:
  - "AC6 -> In StorageGameHistoryRepository.list(), changed the corrupt branch to return `{ status: \"ok\", entries: [] }` instead of `{ status: \"unavailable\" }` — collapsing corrupt into the sam… [see red-proofs/]"
  - "AC7 -> In LocalStorageJsonStore.save(), removed the try/catch around `localStorage.setItem(...)`, letting a thrown QuotaExceededError propagate uncaught. (Recorded previously in plans/game… [see red-proofs/]"
lint:
  before: 6
  after: 3
  outcome: incomplete
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.2 — Game history repository

## Description

Revised after panel review found the original draft's "thin class over
`localStorage.getItem`/`setItem`" design self-contradicted its own AC1
("a newly constructed repository instance over the same storage" — there was
no storage object to construct two repositories over), skipped the
validation the rest of this app already treats persisted blobs as needing,
and left no seam for a future store to reuse.

Introduce a small `JsonStore<T>` interface, mirroring `src/infrastructure
/persistence/Storage.ts`'s `IStorage`/`LocalStorageAdapter`/`InMemoryStorage`
split exactly:

```
interface JsonStore<T> {
  load(): { status: "empty" } | { status: "ok"; value: T } | { status: "corrupt" };
  save(value: T): { status: "ok" } | { status: "failed" };
}
```

`LocalStorageJsonStore<T>` and `InMemoryJsonStore<T>` implement it.
`LocalStorageJsonStore` reads via a caller-supplied key distinct from
`thai-srs-state` (e.g. `thai-srs-game-history`), catches a `JSON.parse`
failure or a caller-supplied shape check failing as `"corrupt"` (never
throws, never silently returns `"empty"`), and catches `setItem` throwing
(e.g. `QuotaExceededError`) as `{status:"failed"}` rather than propagating.

Build `StorageGameHistoryRepository` (implementing task 1.1's
`GameHistoryRepository` port) over a `JsonStore<GameHistoryEntry[]>`,
translating `JsonStore`'s three-state `load()` into the port's
`GameHistoryListResult` (`"empty"` and `"ok"` both map to
`{status:"ok", entries}` — an empty store is a valid, distinct state from an
unreadable one, per AC2 vs AC6 — `"corrupt"` maps to `{status:"unavailable"}`).

## Acceptance Criteria

- AC1: An entry saved via this repository is returned by a subsequent list
  call, including from a newly constructed repository instance over the same
  `JsonStore`.
- AC2: Listing history that has never been written to returns
  `{status:"ok", entries: []}` — the "never played" state, distinct from a
  corrupt read (AC6).
- AC3: Saving a game-history entry does not alter the existing
  `thai-srs-state` `LearnerState` blob in any way.
- AC4: With `localStorage` unavailable, `list()` returns `{status:"ok",
  entries: []}` and `save()` does not throw.
- AC5: History entries are listed most-recent-first (by `playedAt`) after
  multiple saves.
- AC6: A stored value that is not valid JSON, or that does not match the
  expected shape, yields `{status:"corrupt"}`/`{status:"unavailable"}` — never
  the same result as an empty store, and never an uncaught throw.
- AC7: A `setItem` that throws is surfaced as a typed failure result from
  `save()`, not an uncaught exception.
- AC8: Resetting SRS progress (`LocalStorageAdapter.reset()`) never affects
  saved game history — the two stores are independent in both directions.

## Architectural Decision

The separate-localStorage-key decision (from the plan's original draft) is
kept — the rationale (avoiding `Validation.ts`/`MergeService`/`SettingsPage`
machinery built to protect SRS progress) is sound and was reaffirmed by
review. What changes is the *layering*: `JsonStore` restores the
adapter/repository split the rest of this codebase already uses, which is
what makes "a fresh repository instance over the same storage" (AC1) an
honest sentence, and gives corrupt/quota-exceeded reads somewhere principled
to be handled instead of an inline `try/catch` duplicated per repository.

No cap on history length (matches the existing uncapped `sessionHistory`
precedent) — accepted consequence, stated explicitly: this grows the shared
5MB-per-origin localStorage quota alongside the SRS blob, which is exactly
why AC7 (a failing `save()` must not crash the page) exists rather than
being treated as unreachable.

**Cross-tab writes**: append is read-modify-write over one key; two tabs
finishing rounds at the same moment can lose one entry (last write wins).
Accepted explicitly — game history is a practice log, not progress data, and
this is the same tradeoff the app already accepts implicitly for
`sessionHistory`.

## Test Cases

- Save then list via a fresh repository instance: entry comes back.
- List on an empty store: `{status:"ok", entries: []}`.
- Save game history, then load `LearnerState` via `LocalStorageAdapter`:
  unchanged.
- `localStorage` deleted: no throw, `{status:"ok", entries: []}`.
- Three saves: most-recent-first order.
- Malformed JSON in the store: `{status:"corrupt"}`, not `[]`, not a throw.
- `setItem` throwing: `save()` returns `{status:"failed"}`, caller does not
  crash.
- SRS reset after a game-history save: history entries survive unchanged.
