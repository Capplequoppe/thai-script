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
## L6 — task 1.1b · run-20260914T091410Z

<!-- lesson id=L6 from=1.1b scope=dependents -->

The persisted lesson key stays a number, now defined as position in the declared sequence — not a string id. migrateState(state, now, sequence) remaps all five stores atomically via legacyNumber→position (identity today), and symbols.ts joins route through lessonSequence in the services. The first non-identity resequence (phase 4) MUST add a persisted epoch… [clipped — full text in the transcript]

## L7 — task 1.1b · run-20260914T091410Z

<!-- lesson id=L7 from=1.1b scope=plan -->

Task worktrees do not contain the plan README, so the observe-red/observe-green macros fail with 'no test-templates block'; running the template's single-file vitest command directly (with -t) works and is not refused by the suite guard. Also ./node_modules/.bin does not exist in a task worktree — deps resolve from the lesson-rebuild worktree root two levels up (../../node_modules/.bin/vitest).

## L8 — task 1.1b · run-20260914T091410Z

<!-- lesson id=L8 from=1.1b scope=dependents -->

Non-covered gate-checked files pin the numeric persisted shape: lessonContent.test.ts asserts migrateState re-serialises a numeric blob byte-identically, GamePage.test.tsx asserts the thai-srs-state blob survives rounds byte-identical, and Dashboard/CatchUpPage tests push numbers into completedLessons under tsc (.test.tsx files ARE typechecked by npm run bu… [clipped — full text in the transcript]
## L9 — task 1.4 · run-20260914T091410Z

<!-- lesson id=L9 from=1.4 scope=dependents -->

DECK_LESSON_IDS in lessonContent.ts cannot be flipped for a lesson id without also updating lessonContent.test.ts's "reports a declared lesson absent/with no content source as unresolvable" cases, which both hard-code lessonSequence[0] as their stand-in "declared lesson" and assume it stays on the video arm. Whichever task's covers include lessonContent.ts must change both together.

## L10 — task 1.4 · run-20260914T091410Z

<!-- lesson id=L10 from=1.4 scope=plan -->

No ELEVENLABS_API_KEY exists anywhere in this sandbox (env, .env*, CI configs) and scripts/lesson_deck/vendor.py has no offline fallback. A lesson script with zero `narration:` lines still runs the real generate-lesson-deck.py pipeline end-to-end (after `pip3 install --user requests`) producing a valid deck.json/manifest.json with zero API calls — useful fo… [clipped — full text in the transcript]

## L11 — task 1.4 · run-20260914T091410Z

<!-- lesson id=L11 from=1.4 scope=plan -->

originality.test.ts's MEASURED_DETECTION.detected (82-mnemonic corpus-overlap count) is self-documented as expected to fall as mnemonics get rewritten ("this test failing is the prompt to re-record it deliberately"); rewriting symbols.ts mnemonics for originality should update this constant in the same change (48->46 here) rather than treating originality.test.ts as untouchable.
## L12 — task reviewer:1 · run-20260914T091410Z

<!-- lesson id=L12 from=reviewer:1 scope=plan -->

When a task's `covers` splits a file (e.g. lessonContent.ts) from the task that needs to change it (e.g. wiring a new lesson into a Set declared there), the executor correctly refuses to edit out-of-scope files — but nobody's `covers` then includes the wiring step, so it silently never happens. The phase-level reviewer is the first point that can see and cl… [clipped — full text in the transcript]

## L13 — task reviewer:1 · run-20260914T091410Z

<!-- lesson id=L13 from=reviewer:1 scope=plan -->

This repo hardcodes the Vite `base: "/thai-script/"` deploy prefix into every asset URL string (symbols.ts's videoUrl/audioUrl) rather than deriving it from BASE_URL; a new asset-URL constant that omits it 404s in a live browser while every stubbed-fetch unit test stays green. Worth a live `npx playwright test` / dev-server curl check whenever a new hardcod… [clipped — full text in the transcript]

## L14 — task reviewer:1 · run-20260914T091410Z

<!-- lesson id=L14 from=reviewer:1 scope=plan -->

e2e/lesson-intro.spec.ts is excluded from `npm test` and no `verify` command in this plan runs Playwright, so a real regression there is invisible to every automated gate. Playwright browsers were already installed and `pnpm dev` came up cleanly in this sandbox, so 'no verify covers it' is not the same as 'it cannot be checked' — worth actually running it r… [clipped — full text in the transcript]
## L15 — task 2.1 · run-20260914T091410Z

<!-- lesson id=L15 from=2.1 scope=dependents -->

The observe-red/observe-green macros still fail on this plan, now for a new reason: the README exists in the worktree but its test-templates block is fenced as ```text, not ```test-templates, so the macro reports 'declares no test-templates block'. The template command run directly — ./node_modules/.bin/vitest run <file> --reporter=verbose --hideSkippedTest… [clipped — full text in the transcript]

## L16 — task 2.1 · run-20260914T091410Z

<!-- lesson id=L16 from=2.1 scope=dependents -->

'npx biome check' is rewritten by a shell wrapper to 'rtk lint check', and it is the wrapper's daemon that wedges (exit 254, 'Linter process terminated abnormally') session-wide while biome itself is fine — './node_modules/.bin/biome check <dir>' bypasses the wrapper and gives the real verdict. 'npx biome stop' appearing to fix it once was coincidence.

## L17 — task 2.1 · run-20260914T091410Z

<!-- lesson id=L17 from=2.1 scope=dependents -->

The 82 annotation records in sceneGrammar.ts are 44 consonants + 29 vowels + 4 tone marks + the 5 mnemonic-carrying ThaiWord records (กา มือ ใคร หมี อย่า) — shapeCue/soundCue ship null for 2.4 to fill, and sceneGrammar.test.ts derives a confusable-pair floor from symbols.ts mnemonic prose at test time, so rewriting mnemonics shrinks that floor harmlessly but deleting a declared pair fails it.
## L18 — task 2.2 · run-20260914T091410Z

<!-- lesson id=L18 from=2.2 scope=dependents -->

VocabEntry (types.ts) still lacks the `ipa` field that ~3,201 vocabulary.json entries now carry (types.ts wasn't in task 2.2's covers). Any task reading `entry.ipa` from app code needs either to add `ipa?: string` to VocabEntry or keep using a local `VocabEntry & { ipa?: string }` cast as Romanization.test.ts does.

## L19 — task 2.2 · run-20260914T091410Z

<!-- lesson id=L19 from=2.2 scope=plan -->

classifyNotation's marker-less-string heuristic (used when a romanization carries no IPA/Paiboon marker character) is sound for raw pre-migration corpus text but not for round-tripping already-converted Paiboon output: post-conversion strings ending in "aw" (the chosen Paiboon spelling for /ɔ/) collide with the pre-conversion trailing-bare-w-offglide check.… [clipped — full text in the transcript]
## L20 — task 2.4 · run-20260914T091410Z

<!-- lesson id=L20 from=2.4 scope=dependents -->

npm test -- src/domain/script now fails exactly one test: originality.test.ts 'measures and records the rate' — its MEASURED_DETECTION pin ({detected: 46, total: 82}) regexes symbols.ts for mnemonic: string literals, and 2.4 replaced all 82 with sceneMnemonic records. The file is in no task's covers, so the red persists until a human re-records or retires t… [clipped — full text in the transcript]

## L21 — task 2.4 · run-20260914T091410Z

<!-- lesson id=L21 from=2.4 scope=dependents -->

symbol.mnemonic is now DERIVED: it equals composeMnemonic(symbol.sceneMnemonic) (shapeCue + ' ' + soundCue), asserted by mnemonics.test.ts. Read district/shapeCue/soundCue/toneMotion fields off sceneMnemonic for rendering; do not author a second prose copy. sceneGrammar.ts's annotation builders still emit shapeCue/soundCue as null — they are not yet wired to the symbols' records.

## L22 — task 2.4 · run-20260914T091410Z

<!-- lesson id=L22 from=2.4 scope=dependents -->

nameRomanized on all 44 consonants is now tone-marked Paiboon ('maaw máa', 'khǎaw khài'), mirroring vocabulary.json spellings where the name word exists there. e2e/lesson-intro.spec.ts:84 still asserts the old 'maaw maa' heading and no verify runs Playwright, so that spec is stale until a task covering e2e updates it. Also measured: 16/19 specialRules descr… [clipped — full text in the transcript]
## L23 — task 2.5 · run-20260914T091410Z

<!-- lesson id=L23 from=2.5 scope=dependents -->

The opening band's decks exist but are NOT wired: DECK_LESSON_IDS (lessonContent.ts) and a lesson-sound-buckets entry (lessonSequence.ts) are in no phase-2 task's covers, so lessons 02-05 still serve video. Whoever lands them must also repoint lessonContent.test.ts:20-24, which uses lessonSequence[1] (lesson-02) as its 'still on the video arm' stand-in and will break.

## L24 — task 2.5 · run-20260914T091410Z

<!-- lesson id=L24 from=2.5 scope=plan -->

Nothing emits `teachingWords`: pipeline.py's _deck_json writes lessonId, title and slides only. Every deck test that reads deck.teachingWords (lesson01Deck.test.ts, openingBand.test.ts) has a branch with no producer, so 'or declare it as a teaching word' is not actually an escape hatch a lesson author can use yet.

## L25 — task 2.5 · run-20260914T091410Z

<!-- lesson id=L25 from=2.5 scope=plan -->

checkOriginality trips on ordinary teaching English, not just paraphrase: 'like the w in water', 'in the middle of your', 'your hand in front of' all collide at n=5. Make the originality test collect every overlap and assert the list is empty rather than throwing on the first, or each rewrite costs a full regenerate-and-rerun cycle.
