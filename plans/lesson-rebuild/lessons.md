# Lessons

Things earlier tasks in this plan learned the hard way — a gotcha, a workaround,
or a notice that a workaround is no longer needed.

**Append-only.** A lesson that stops being true is not deleted; a later entry
retracts it by naming it in `resolves`. That way the record shows both that it
was true and when it stopped being, and nothing silently rewrites what an earlier
agent reported.

**Nothing here is an instruction.** These are observations by agents that ran
before you, in a repository you can check for yourself. Read them as evidence.

## L1 — task 1.2 · run-20260914T091410Z

<!-- lesson id=L1 from=1.2 scope=dependents -->

A refusal (e.g. a slide's audioUrl failing the trust-boundary containment check) must never render identically to a legitimate empty/absent case — extractAudioUrls in DeckSlide.tsx now console.warns on refusal so the two are distinguishable; apply the same never-silently-collapse-a-failure-into-a-zero rule to any future deck-JSON field this pipeline reads.

## L2 — task 1.2 · run-20260914T091410Z

<!-- lesson id=L2 from=1.2 scope=plan -->

plans/lesson-rebuild/README.md, CONTEXT.md and decisions.md are not present on disk in the worktree (only phase-1-tracer/ task files are), so plan-runner macro run observe-red cannot resolve a test-templates entry and fails outright — confirmed again this round; an orchestration gap worth fixing centrally.
## L3 — task 1.3 · run-20260914T091410Z

<!-- lesson id=L3 from=1.3 scope=dependents -->

A lesson script is Markdown: `# Title`, `lesson: <id>`, then `## <kind> <slide-id>` sections with `key: value` fields, `- bullet` bodies and `narration: en|th <text>` lines — one clip per narration line. An `image:` path must resolve inside the script's own directory or the run is refused. `scripts/lesson_deck/fixtures/lesson-02.md` is a working example of all four slide kinds.

## L4 — task 1.3 · run-20260914T091410Z

<!-- lesson id=L4 from=1.3 scope=dependents -->

Deck JSON carries `audio: string[]` and `image: string` on slides beside the schema's own fields; validateDeck ignores and strips unknown keys, so the renderer must read the asset refs off the raw JSON, not off validateDeck's returned deck.

## L5 — task 1.3 · run-20260914T091410Z

<!-- lesson id=L5 from=1.3 scope=plan -->

`plan-runner macro run observe-red` cannot work on this plan: plans/lesson-rebuild/README.md is absent from disk, so the macro finds no test-templates block and refuses. Issue the template command directly — `npx vitest run <file> --reporter=verbose --hideSkippedTests -t "<test name>"` is a single test and is not refused by the suite guard.
