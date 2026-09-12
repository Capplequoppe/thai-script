# generate-conversation-bank

Offline content-authoring tool. It writes
`backend/data/conversationStarters.json` — the AI conversation partner's own
opening questions, tiered by vocabulary size.

It is **not** part of the live backend. It runs once, and again whenever the
bank needs more entries. Nothing in here is imported at request time.

## Why the bank is pre-generated

A spike measured live, prompt-constrained generation of these lines at 0/5
clean independent samples, and found that retrying or resampling did not
converge — sometimes it degraded into another language entirely. Generating
the same content *offline*, where a non-compliant candidate is silently
discarded instead of shown to a learner, turns that unreliable mechanism into
a one-time authoring pass with no runtime risk. Judging a learner's reply is
a different job with different measurements, and is still done live.

## How it works

1. **Tiers** (`tiers.py`) are rank-ordered slices of the app's own
   `vocabulary.json` — the first 80/150/250/400/600 words, which are the
   sizes the spike actually measured compliance against.
2. **Generation** (`generation.py`) prompts Qwen2.5-7B-Instruct with the
   tier's word list as an allowlist, rotating through topics and walking a
   low-to-higher temperature ladder, until enough candidates survive.
3. **Compliance filtering** (`filtering.py`) tokenizes each candidate with
   `pythainlp`'s `newmm` and keeps it only if every token is in the tier.
   This is the spike's own compliance *measurement*, reused as the *selection*
   step — there is deliberately no second implementation.
4. **Quality rejection** (`quality.py`) drops two defects the compliance
   filter cannot see: a line mixing ครับ with ค่ะ/คะ, and a line that is not
   a question at all. Both were produced, fully tier-compliant, by a real run.
5. **Assembly** (`bank.py`) gives each entry an id that is a hash of its own
   Thai text — not its position in a run — so regenerating the bank cannot
   renumber an entry whose text did not change.

Each entry records the tokenization the filter already computed, as
`words: string[]`. That is what lets the backend's selection be a set
operation with no tokenizer dependency of its own, matching `sentences.json`'s
precedent.

## Running it

```sh
uv run --project scripts/generate-conversation-bank --extra gpu \
  python -m generate_conversation_bank
```

Needs a local GPU and the Qwen weights. A re-run **merges into** the existing
file rather than replacing it: tiers already at the minimum are skipped, and
already-reviewed entries keep their ids. To start over, delete
`backend/data/conversationStarters.json` first.

`--tier N` (repeatable) regenerates one tier; `--min-entries` changes the
per-tier floor.

## Tests

```sh
uv run --project scripts/generate-conversation-bank \
  pytest scripts/generate-conversation-bank/tests -v -m "not gpu"
```

The `gpu`-marked test loads the real 7B model and takes minutes; it is
excluded by default and is a run-once check that the pipeline produces usable
volume, not a check that the filter is correct.

## The human review step

**The automatic filters are not sufficient, by design.** They decide
vocabulary compliance and the two defects listed above. They cannot decide
whether a line is stilted, whether it is a strange thing to open a
conversation with, or whether its English gloss is right. A person must read
`backend/data/conversationStarters.json` through once before its contents are
treated as final.

Known things to look for, seen in the current generated output:

- `สวัสดีคะ` appears where `สวัสดีค่ะ` is correct. `คะ` is a legitimate tier
  word and a legitimate question particle, so the compliance filter has no
  grounds to reject it here; it is still the wrong spelling after `สวัสดี`.
- A few lines are grammatical but odd as openers
  (e.g. `ทำอะไรเพื่ออะไรครับ`, `นี้ทำอะไรไหมครับ`).
- Some English glosses read as statements where the Thai is a question
  (e.g. `ไม่ชอบคนไหนครับ`).
- `สวัสดี… สบายดีไหม` recurs across several tiers. It is not wrong, just
  repetitive.

Edit the file in place. `words` must stay the exact `newmm` tokenization of
`thai` and `id` the hash of `thai`, and the test suite checks both — so after
editing a `thai` field, re-run the generator or recompute those two fields.
