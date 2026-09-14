---
run_id: "run-20260914T091410Z"
actor: "executor"
phase: "2"
task: "2.2"
round: 1
outcome: "complete"
audience: "human-reviewer"
summary_source: "model"
summarizer: "claude-haiku-4-5"
transcript: "transcripts/run-20260914T091410Z/phase-2__executor__2.2__r1.jsonl"
entries: 4239
dropped_noise: 3938
elapsed_ms: 1050615
files_touched: ["scripts/convert-romanization.py", "src/domain/vocabulary/types.ts", "src/domain/vocabulary/services/Romanization.ts", "src/domain/vocabulary/services/Romanization.test.ts"]
looks_complete: true
truncated: false
result_is_error: false
result_subtype: "success"
generated_at: "2026-09-14T11:27:18.610Z"
---

# executor 2.2 round 1

Run `run-20260914T091410Z`. This invocation **ended cleanly** (recorded outcome: `complete`).

## What tried and failed

**plan-runner macro invocation**: Attempted to use `plan-runner macro run observe-red --locator "..."` to automate red-green proof, but the fence mismatch from lesson L15 caused it to fail. Switched to manual mutation testing with `sed` and targeted vitest runs instead.

**Diphthong detection bug in first pass**: Initial logic checking for 'a' immediately after vowel tokens failed on strings like "mɯ̂ːa" where the length marker ː sits between the glide vowel and trailing 'a'. The lookahead adjustment added optional ː handling and fixed the 22 remaining conversion failures.

**Coda-glide false positive**: The heuristic flagging trailing 'w'/'j' as off-glides misclassified valid Paiboon vowel spellings like "aw" (meaning ɔ). This was real but didn't block the migration because Python's convert_corpus skips entries that already have `ipa` set, hiding the re-classification bug during idempotency check. Ruled out dropping the trailing-w check entirely since 22 legitimate bare off-glide entries (like "raw"→"rao") still needed it.

## Where it changed its mind

**VocabEntry type scope violation**: Initially edited `types.ts` to add an optional `ipa` field to the shared VocabEntry interface. On reviewing covers restrictions (file-path scoped, not including types.ts), reverted and instead declared a local `VocabEntryWithIPA` interface extending VocabEntry within Romanization.test.ts, avoiding scope creep while preserving the ability to access `.ipa` via cast.

**KNOWN_FAILURES logic**: First version filtered by rank only; realized 22 known failures included entries with `rank: null`, so switched to a set of Thai text forms (หมอ, หัวเราะ, หม้อ, etc.) since Thai text is always present even when rank is missing.

## Established by running

**Conversion success rate**: Python dry-run showed "3201 converted with 22 failures out of 3223, 99.3% success rate." Idempotency check confirmed zero new conversions on re-run, proving stable state.

**Mutation-proved red/green**: 
- AC2 (onset mapping): Mutated `p: "bp"` → `p: "XX"`, vitest test "unaspirated p" went red; reverted to green.
- AC1 (classifyNotation): Mutated `if (hasIpa) return "ipa"` → `if (hasIpa) return "paiboon"`, test "classifies known examples" went red; reverted to green.
- AC5 (unconverted state): Mutated `return { state: "unconverted", paiboon: null }` → `state: "converted"`, test went red; reverted to green.

**Full suite pass**: `npm test -- src/domain/vocabulary` showed "102/102" tests passing. `npx tsc --noEmit -p tsconfig.domain-check.json` clean. `biome check` showed 0 errors (pre-existing warnings only). `python3 -m py_compile scripts/convert-romanization.py` OK.

## Surprised by

**Combining diacritics not precomposed**: Vocabulary.json's romanization field contained non-precomposed vowels with separately-encoded combining marks (e.g., vowel + combining acute) rather than always using precomposed forms like á—required extraction of character inventory to understand the actual encoding scheme.

**JSON diff statistics doubled**: Initial 16,005-line diff (2 deletions + 3 insertions per entry × 3201) seemed like unwanted reformatting, but spot-check confirmed it was just the field-order shift when adding `ipa`: one line changed for romanization, two lines for the last field due to comma insertion.

**Domain layer cross-imports already used**: Both toneSyllables.ts and symbols.ts already import from domain/script, so importing ToneValue in Romanization.ts had precedent despite the apparent layer boundary.

## Known locally only

The 22 failing entries are multi-syllable compound words (like "ข้อสงสัย") written as single tokens without spaces/hyphens, defeating simple syllable-splitting; they're reported by rank/Thai text rather than converted. Trailing "w"/"j" heuristics must distinguish between off-glides and vowel spellings (e.g., "aw" → ɔ), which ambiguity is resolved by checking whether the string mixes IPA and Paiboon markers already. Test fixtures need correct corpus format (e.g., `kaj` not `kai`) since the corpus uses `j` for offglides consistently. The diphthong classifier logic must account for optional length markers (ː) between glide vowel and following 'a'.

## Reusable errand

**Character inventory audit**: Extracting distinct Unicode characters from romanization corpus (step 38s) to build conversion tables. A macro `extract-romanization-inventory` extracting VOWEL_TOKENS, ONSET_MAP, and CODA_MAP targets from vocabulary.json would help any future phoneme-system changes.

## What it did

- 4239 transcript entries over 1051s (2026-09-14T11:06:39Z → 2026-09-14T11:24:10Z)
- tool calls: Bash ×76, Edit ×17, Read ×10, Write ×3, StructuredOutput ×1

### Files it wrote or edited

- `scripts/convert-romanization.py`
- `src/domain/vocabulary/types.ts`
- `src/domain/vocabulary/services/Romanization.ts`
- `src/domain/vocabulary/services/Romanization.test.ts`

## How it ended

> {"task_id":"2.2","task_status":"complete","gates":[{"command":"npx tsc --noEmit -p tsconfig.domain-check.json","source":"task.verify","outcome":"pass"},{"command":"npm test -- src/domain/vocabulary","source":"task.verify","outcome":"pass","detail":"ran via ./node_modules/.bin/vitest run src/domain/vocabulary --reporter=verbose --hideSkippedTests (npm test itself is a whole-suite command the runner…

## Last things it said

- Now let's re-verify tsc and tests.
- Excellent, still clean without touching types.ts. Now let's re-run biome and py_compile once more to be safe, then check overall repo build gate isn't required (task doesn't touch presentation) but let's also do a quick sanity `npm run build` isn't required per this task (not in verify list). Let's finalize with biome check.
- 0 errors, only pre-existing warnings (unrelated to my changes). Now let's check git diff summary and stage/commit only my covered files.
- Exactly the four covered files. Let's commit.
- Committed. The remaining modified/untracked files are runner-managed plan artifacts outside my scope, left as-is. Let's finalize with the full gate set.

---

*A record of one agent invocation, for a reader who can see the diff but not*
*the reasoning behind it. Nothing here has been independently verified — where*
*a narrative is present it is model-written from the transcript at*
*`transcripts/run-20260914T091410Z/phase-2__executor__2.2__r1.jsonl`.*


## Cost

| actor | invocations | output tok | cache read | wall | ~USD |
|---|---:|---:|---:|---:|---:|
| executor | 6 | 669,143 | 82,383,961 | 2.3 h | 82.95 |
| self-review | 6 | 120,714 | 22,541,286 | 25 min | 15.44 |
| reviewer | 1 | 54,169 | 17,513,126 | 12 min | 7.09 |
| summarizer | 24 | 34,404 | 181,930 | 8 min | 0.44 |
| **total** | 37 | 878,430 | 122,620,303 | 3.0 h | 105.91 |

cache hit **98.5%** — `cache_read / (input + cache_read + cache_write)`, the same definition `plan metrics` uses.

*USD is computed from a price table in this repository, not from anything the API returned. Cache reads are charged at a tenth of an input token and writes at 1.25x. Treat it as an order of magnitude, not an invoice.*