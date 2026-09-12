---
doc_type: reference
title: "Task 2.2 — Offline generation + auto-filtered question bank"
description: A one-off script that generates candidate AI conversation-starter lines per vocabulary tier using the same LLM+compliance-checker approach validated in the spike, auto-filters them, and produces a reviewable static data file — including each entry's own word list, corrected from a first draft whose schema couldn't support the selection logic that reads it.
covers:
  - scripts/generate-conversation-bank/
  - backend/data/conversationStarters.json
status: draft
task_id: "2.2"
task_status: complete
depends_on: []
size: large
verify:
  - uv run --project scripts/generate-conversation-bank pytest scripts/generate-conversation-bank/tests -v -m "not gpu"
ac_enforcement:
  - "AC1 -> a non-GPU unit test: the compliance-filter function, given hand-authored candidate strings with KNOWN verdicts (one containing a word outside a fixture tier, one entirely within it), rejects the first and keeps the second - tests the filter against fixed inputs, not the filter's own output re-checked against itself"
  - "AC2 -> a non-GPU test: conversationStarters.json (once generated) parses as valid JSON and every entry has {id, tier, thai, english, words: string[]}, tier a positive integer, words the exact tokenization of thai - the shape 2.3's containment check reads, with no live tokenizer dependency in the backend"
  - "AC3 -> none - the generated content's naturalness/usefulness is judged by a human reviewer before this task is considered done, per this task's Architectural Decision; recorded as a reviewer note, not a test"
  - "AC4a -> a non-GPU test: given a FIXED candidate list, id assignment and serialization are deterministic and byte-identical across two runs - the property that actually protects existing ids from a re-run"
  - "AC4b -> a non-GPU test: an entry's id is derived from a stable hash of its own Thai text, not from generation order - so a re-run that produces different candidates (a real GPU run is not guaranteed byte-identical across driver/batching changes) still can't renumber an unchanged entry"
  - "AC5 -> a GPU-marked test: running the full generation pipeline against a small fixture vocabulary tier produces at least 8 surviving entries - a real, run-once check that the model+filter pipeline actually produces enough usable content, separate from AC1's fixed-input filter-correctness test"
  - "AC6 -> a non-GPU test: every tier in the shipped bank (once generated) holds at least 8 entries - phase 3's three-turn sessions need headroom to avoid exhausting a tier mid-session"
ac_tests:
  - "AC1 -> scripts/generate-conversation-bank/tests/test_filtering.py::test_rejects_a_candidate_containing_a_word_outside_the_tier"
  - "AC2 -> scripts/generate-conversation-bank/tests/test_shipped_bank.py::test_every_entrys_words_are_the_tokenization_of_its_thai"
  - "AC3 -> none"
  - "AC5 -> scripts/generate-conversation-bank/tests/test_generation_gpu.py::test_the_real_pipeline_fills_a_small_tier"
  - "AC6 -> scripts/generate-conversation-bank/tests/test_shipped_bank.py::test_every_tier_holds_at_least_the_minimum_number_of_entries"
  - "AC4 -> scripts/generate-conversation-bank/tests/test_bank_build.py::test_an_entrys_id_is_derived_from_its_own_thai_text"
red_proof:
  - "AC1 -> In filtering.py check_compliance, replaced the allowed-set comprehension with `violations = ()` — the filter pretends every token is in the tier. Reverted and re-ran green. KIND: re… [see red-proofs/]"
  - "AC2 -> Backed up the shipped bank, then truncated the first entry's `words` array by one token so it no longer equals the newmm tokenization of its `thai`. Restored from backup; all shippe… [see red-proofs/]"
  - "AC6 -> In the same mutated copy of the shipped bank, removed every tier-5 entry, taking that tier below MIN_ENTRIES_PER_TIER. Restored from backup and re-ran green. KIND: real assertion fa… [see red-proofs/]"
  - "AC4 -> In bank.py, replaced the sha256-of-normalized-Thai entry_id with a module-level counter (`_COUNTER[0] += 1; return f\"{ID_PREFIX}{_COUNTER[0]:04d}\"`) — ids from generation order, whi… [see red-proofs/]"
red_proof_waived:
  - "AC5 -> traced: The test's substrate only exists after this change: the generation pipeline (generation.py, QwenChatModel, generate_tier) is created by this task, so before it there was nothing to… [see red-proofs/]"
lint:
  before: 7
  after: 9
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 2.2 — Offline generation + auto-filtered question bank

## Description

This is a **content-authoring tool**, not part of the live backend —
it runs once (and again whenever the bank needs more entries), not per
request. It lives at `scripts/generate-conversation-bank/` (its own
small `uv` project — a deliberately separate toolchain from the
existing pip-based `scripts/enrich-vocabulary.py`, sharing the same
Hugging Face model cache so the 7B weights aren't downloaded twice) and
produces **`backend/data/conversationStarters.json`** — under
`backend/`, not `src/`, because its only reader is the Python backend
(task 2.3); CONTEXT.md's "never inside `src/`" rule for backend-owned
data applies to this file exactly as it does to model weights.

**Reuse the spike's own approach directly** — it's already validated:
for each vocabulary tier (a rank-ordered slice of `vocabulary.json`,
the first 80/150/250/400/600 words, matching the sizes the spike
tested), prompt Qwen2.5-7B-Instruct with the system prompt shape from
the spike at low temperature, generate several candidates per
instruction, then **filter** every candidate through the same
`pythainlp.tokenize.word_tokenize(text, engine="newmm")` +
allowed-word-set check the spike used to *measure* compliance — here,
used to *select*. This converts the spike's measurement tool into this
task's production filter; do not write a second implementation.

**Emit each entry's own tokenized word list** (`words: string[]`,
alongside `thai`/`english`/`tier`/`id`) — the tokenization already runs
to perform the filter, so recording it is free, and it is what lets
task 2.3's selection be a pure set operation with **no tokenizer
dependency in the live backend**, matching `sentences.json`'s own
precedent (`SentenceService.getUnlockedSentences` filters on
`entry.words.every(...)` for the same reason). A first draft of this
task shipped a schema without this field, which left task 2.3 unable to
make the assertions its own acceptance criteria required — fixed here,
at the source, rather than by adding a tokenizer to the backend later.

**Guarantee a minimum bank size per tier** (AC6): generate until every
tier holds at least 8 surviving entries, looping the generation step
(more candidates, or a slightly relaxed sampling temperature within the
range the spike validated) rather than shipping whatever a single pass
happens to produce — phase 3's three-question sessions need a tier deep
enough not to exhaust mid-session for a well-matched learner.

**A human reviews the filtered output before it ships.** The filter
catches vocabulary violations; it does not catch a grammatically odd
but technically-compliant sentence, or one that's a strange thing to
open a conversation with. Write the filtered candidates to
`conversationStarters.json` and flag in this task's close-out that a
person should read through it once.

## Acceptance Criteria

- AC1: The compliance filter, tested against fixed hand-authored inputs
  with known verdicts, correctly rejects an out-of-tier candidate and
  keeps a clean one.
- AC2: The output file is valid JSON, every entry carries its own
  `words: string[]` matching its `thai` field's tokenization.
- AC3: A human has read the generated bank once before it's considered
  final content — an explicit reviewer step, not a test.
- AC4: Id assignment is deterministic given fixed candidates (AC4a) and
  derived from stable content-hashing so a re-run with different
  candidates can't renumber an unchanged entry (AC4b).
- AC5: The real generation pipeline, run once against a fixture tier,
  produces enough surviving candidates to be usable.
- AC6: Every shipped tier holds at least 8 entries.

## Architectural Decision

**Generated once, offline, filtered automatically, then human-reviewed
— never generated live.** This is CONTEXT.md's central finding restated
as a build decision: the spike measured 0/5 clean independent samples
under live generation even with retries. Doing the same generation
*offline*, where a failed candidate is silently discarded rather than
shown to a learner, turns an unreliable live mechanism into a one-time
content-authoring pass with no runtime risk at all.

**Tier sizes match the spike's own tested sizes (80/150/250/400/600),
not arbitrary round numbers.** Reusing exactly what was measured means
this task inherits the spike's own evidence about each tier's
compliance rate, rather than generating fresh, unverified assumptions.

**Tiers 1 and 2 (80, 150) are pre-gate-only content, by design, not an
oversight.** Phase 3 gates `/conversation` behind `MIN_VOCAB_COUNT =
200`, which already sits above tier 2's word count — a learner who can
reach the page at all post-phase-3 already exceeds tiers 1 and 2, so
those two tiers only ever get selected during phases 1-2's ungated
window. Generating all five tiers anyway is deliberate: it makes phase
1-2 usable on their own (per each phase's own "would this stand alone"
answer) at a small, one-time generation cost, rather than adding a
special case for "don't bother generating the tiers the gate will make
unreachable."

**Filter correctness (AC1) and pipeline output (AC5) are tested
separately.** A first draft's single AC re-ran the filter's own
predicate over the filter's own output — unfalsifiable, since it can
only fail if the filter is deleted entirely. Testing the filter against
fixed known-verdict inputs (AC1, non-GPU, fast) proves the filter is
correct; a separate GPU-marked smoke test (AC5) proves the real
pipeline produces usable volume — neither claim substitutes for the
other.

**Ids derived from content hash, not generation order.** A first
draft's reproducibility test (AC4) asserted GPU-generation determinism
via a non-GPU test that necessarily stubs the model — it could only
prove the deterministic *serialization* around generation, not the
generation itself, and real GPU output is not guaranteed byte-identical
across driver or batching changes. Hashing each entry's own Thai text
for its id removes the dependence on model determinism entirely, which
is a more robust design, not just a better-tested one.

## Test Cases

- Filter, fixed inputs: an out-of-tier candidate rejected, a clean one
  kept.
- Output file: valid JSON, `words[]` present and correct per entry.
- Same fixed candidates, run twice: identical ids and serialization.
- A re-run with different candidates: an unchanged entry's id is
  unchanged (content-hash derived).
- Real pipeline against a fixture tier: produces enough surviving
  candidates.
- Every shipped tier: at least 8 entries.
- (Manual) a person has read the generated bank and flagged anything
  unnatural before this task is marked complete.
