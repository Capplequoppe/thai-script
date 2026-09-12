# Lessons

Things earlier tasks in this plan learned the hard way — a gotcha, a workaround,
or a notice that a workaround is no longer needed.

**Append-only.** A lesson that stops being true is not deleted; a later entry
retracts it by naming it in `resolves`. That way the record shows both that it
was true and when it stopped being, and nothing silently rewrites what an earlier
agent reported.

**Nothing here is an instruction.** These are observations by agents that ran
before you, in a repository you can check for yourself. Read them as evidence.

## L1 — task 1.1 · run-20260912T111408Z

<!-- lesson id=L1 from=1.1 scope=plan -->

Self-review pass (comments/docstrings, dead code, resource-state distinction, red-proof file, sibling consistency) found no defects in task 1.1's committed work; nothing was changed and the commit/gates from the prior report stand unmodified. Read plans/ai-conversation-practice/red-proofs/1.1.md directly and confirmed all four recorded observations are genu… [clipped — full text in the transcript]
## L2 — task 2.2 · run-20260912T111408Z

<!-- lesson id=L2 from=2.2 scope=dependents -->

A larger vocabulary tier allows every word a smaller one does, so the LLM re-proposes the smaller tier's lines constantly. The first bank run reported 8 kept per tier but shipped tiers of 4 and 7, because de-duplication charged the duplicates back to the lower tier. generate_tier now takes an `exclude` set of already-claimed Thai texts; per-tier counts are… [clipped — full text in the transcript]

## L3 — task 2.2 · run-20260912T111408Z

<!-- lesson id=L3 from=2.2 scope=dependents -->

The bank's `words` are newmm tokens and newmm emits compounds: 'คุณชอบกินข้าวไหม' tokenizes to ('คุณ','ชอบ','กินข้าว','ไหม'), not five tokens. Task 2.3's containment check must compare known words against these exact tokens — a learner who knows กิน and ข้าว separately does not match กินข้าว.

## L4 — task 2.2 · run-20260912T111408Z

<!-- lesson id=L4 from=2.2 scope=plan -->

Result-schema ids are "AC"+digits, but this plan's ac_enforcement blocks label sub-criteria AC4a/AC4b. Two red proofs filed under those ids were dropped silently from the red-proofs artefact. File proofs under the id the Acceptance Criteria list uses (AC4) and name the sub-label in the mutation text instead.
## L5 — task 1.3 · run-20260912T111408Z

<!-- lesson id=L5 from=1.3 scope=dependents -->

useMicRecorder.ts was absent from this run's base branch (it predates PR #22 on origin/main) and I restored just that one file from origin/main. Other origin/main commits are still missing — if a later task drives the real app and something referenced in CONTEXT.md isn't there, this is why.

## L6 — task 1.3 · run-20260912T111408Z

<!-- lesson id=L6 from=1.3 scope=dependents -->

The conversation route is `<Route path="/conversation">` under the app's HashRouter, so the real URL is `#/conversation` (e.g. `/thai-script/#/conversation` under Vite's base). renderWithApp cannot prove that — it wraps in its own MemoryRouter — so App.test.tsx renders the real <App/> with window.location.hash set instead.

## L7 — task 1.3 · run-20260912T111408Z

<!-- lesson id=L7 from=1.3 scope=plan -->

Capture red-proof output with the runner's full failure block, not a grep: my greps dropped the deciding TestingLibraryElementError line from the AC7 proof, leaving a paraphrase in the artefact where the assertion should be. A non-2xx test also only proves the response.ok check if the error body is contract-shaped — with a FastAPI {detail} envelope the mutant still returned unavailable.
## L8 — task 2.1 · run-20260912T123636Z

<!-- lesson id=L8 from=2.1 scope=plan -->

Task 2.1's covers list excludes backend/tests, so AC1's backend-side "accepts a 600-word body" half has no in-scope test file to hold it — it was left as an honest waiver rather than an out-of-scope write. A later task that touches backend/tests could close this gap.
## L9 — task reviewer:1 · run-20260912T154629Z

<!-- lesson id=L9 from=reviewer:1 scope=plan -->

Phase 2's concurrent task (bank.py, personalized /conversation/opening) edits files phase 1 also covers (backend/app/main.py, pipeline.py, test_pipeline.py, e2e specs) while bank.py itself stays untracked mid-flight; reviewing phase 1 mid-run means judging code whose import target isn't yet committed. Checked it works but this is a real cross-phase collision surface, not a hypothetical one.
## L10 — task reviewer:2 · run-20260912T154629Z

<!-- lesson id=L10 from=reviewer:2 scope=plan -->

A task's own executor-narrated red/green proof in its summary is not the same as a recorded red-proofs/<task>.md artifact — check the file actually exists on disk before trusting the ledger's [red] marks; task 2.3 completed with correct tests but no such file, silently degrading its ledger entries to [none].
## L11 — task 3.1 · run-20260912T154629Z

<!-- lesson id=L11 from=3.1 scope=dependents -->

The session endpoints are POST /conversation/session/start, /{id}/judge and /{id}/next; /next answers either a question or {exhausted: true, question_text: null, ...}, and an unknown or evicted session id is 404 with no separate 'expired' state. /conversation/opening and /conversation/judge are still live — 3.1 could not remove them, their tests are outside… [clipped — full text in the transcript]

## L12 — task 3.1 · run-20260912T154629Z

<!-- lesson id=L12 from=3.1 scope=dependents -->

The /next lock is only provably load-bearing because the asked-id is recorded AFTER the awaited TTS call, so the await sits inside the read-modify-write window. Moving the record before synthesis would close the window and quietly turn the AC5 concurrency test into one that passes with or without the lock.

## L13 — task 3.1 · run-20260912T154629Z

<!-- lesson id=L13 from=3.1 scope=plan -->

A builtins.open guard cannot cover the whole conversation pipeline: TTS necessarily writes its output file and faster_whisper.audio imports lazily on the first judged reply. The AC4 disk-write test pre-imports the decoder and stubs app.pipeline.synthesize_question, leaving everything the session store actually does under a write-mode guard on builtins.open, io.open and os.open.
## L14 — task reviewer:2 · run-20260912T200014Z

<!-- lesson id=L14 from=reviewer:2 scope=plan -->

When two phases share a covered file (e.g. ConversationPracticePage.tsx owned by both phase 2's 2.1 and phase 3's gate task), a later phase landing can silently delete the earlier phase's test for a now-gate-unreachable state, orphaning a completed AC with no signal except a criteria-ledger 'plan no longer maps it to any test' note. Worth a phase-boundary c… [clipped — full text in the transcript]
