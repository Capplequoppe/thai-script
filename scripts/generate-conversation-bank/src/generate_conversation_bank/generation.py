"""Offline candidate generation with Qwen2.5-7B-Instruct.

Nothing here ever runs at request time. The spike measured live generation at
0/5 clean independent samples even with retries, which is unusable in front of
a learner but perfectly fine offline, where a non-compliant candidate is simply
discarded and another one is drawn.

`torch`/`transformers` are imported inside `QwenChatModel` so that the filter,
the id scheme and the serializer — and therefore the default, non-GPU test run
— need none of the GPU stack.
"""

from __future__ import annotations

import re
from typing import Protocol

from .bank import MIN_ENTRIES_PER_TIER, Candidate
from .filtering import check_compliance, normalize
from .quality import quality_issues
from .tiers import Tier

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"

#: Topics rotated through so a tier's entries are not eight rephrasings of one
#: question. Plain English labels — they steer the model, they are not content.
TOPICS: tuple[str, ...] = (
    "greeting someone and asking how they are",
    "food and eating",
    "what the other person is doing right now",
    "where the other person is going",
    "family and friends",
    "likes and dislikes",
    "home and where someone lives",
    "the time of day and daily routine",
    "speaking and learning Thai",
    "how the other person is feeling",
)

#: Sampling temperatures, low first: a later round only relaxes sampling if an
#: earlier, tighter one did not yield enough. Chosen here, not inherited from
#: the spike — the spike's own temperatures are not recorded in this plan.
TEMPERATURE_LADDER: tuple[float, ...] = (0.3, 0.5, 0.7, 0.9)

#: Candidates requested per round, and the cap on rounds before a tier gives up
#: short. Tuning knobs: change them here rather than threading them through
#: every caller, none of which has ever wanted anything but these.
CANDIDATES_PER_ROUND = 10
MAX_ROUNDS = 24

_SYSTEM_PROMPT = """You write opening questions for a Thai conversation-practice app used by beginners.

You may use ONLY the Thai words in this list, and no other Thai word at all:
{allowed}

Rules:
- Write natural, friendly Thai questions that a person could genuinely open a conversation with.
- Every word you write must appear in the list above. This is the most important rule.
- Every line must be a question that invites an answer, not a greeting or a statement.
- Be polite. These are asked of someone you have only just met, so no slang and no rude particles.
- Pick one politeness particle and stay with it: ครับ throughout, or ค่ะ/คะ throughout. Never both in one line.
- Keep each question short: three to eight words.
- Thai script only. No punctuation, no digits, no Latin letters, no emoji.
- One question per line, nothing else: no numbering, no bullets, no quotes, no English, no explanation."""

_TRANSLATION_SYSTEM_PROMPT = (
    "You translate Thai to natural, idiomatic English. "
    "Reply with the English translation only — no notes, no transliteration, no quotes."
)

_LINE_NOISE = re.compile(r"^[\s\-\*•]*(?:\d+[\.\)]\s*)?[\"'“”]?|[\"'“”]?\s*$")


class ChatModel(Protocol):
    """The only thing generation needs from a language model."""

    def complete(
        self, system: str, user: str, *, temperature: float, max_new_tokens: int
    ) -> str: ...


def parse_lines(raw: str) -> list[str]:
    """Split a completion into candidate lines, stripping list decoration."""
    lines: list[str] = []
    for line in raw.splitlines():
        cleaned = normalize(_LINE_NOISE.sub("", line))
        if cleaned:
            lines.append(cleaned)
    return lines


def _prompt_for(tier: Tier, topic: str, count: int) -> tuple[str, str]:
    system = _SYSTEM_PROMPT.format(allowed=" ".join(tier.words))
    user = f"Write {count} different opening questions about: {topic}."
    return system, user


def generate_tier(
    model: ChatModel,
    tier: Tier,
    *,
    min_entries: int = MIN_ENTRIES_PER_TIER,
    exclude: frozenset[str] = frozenset(),
) -> list[Candidate]:
    """Draw candidates for one tier until `min_entries` clear both gates.

    A kept line has passed the compliance filter *and* `quality_issues` — the
    first run was 100% compliant and still shipped mixed-particle lines and
    statements, so compliance alone is not the bar.

    Looping — rather than shipping whatever a single pass happens to produce —
    is what makes AC6's per-tier floor a guarantee instead of a hope. It is
    still only a best effort: after MAX_ROUNDS this returns what it has, which
    may be fewer than `min_entries`, and the caller sees the shortfall in the
    count it prints.

    `exclude` is the Thai texts the bank already holds. A larger tier allows
    every word a smaller one does, so it re-proposes the smaller tier's lines
    constantly; without this, `build_bank`'s de-duplication would silently
    charge those back to the lower tier and leave this one short.
    """
    # Insertion-ordered set of accepted lines. The tokens `check_compliance`
    # computed are deliberately NOT carried in here: `make_entry` re-derives
    # them from `thai`, which keeps `words == tokenize(thai)` true even for an
    # entry a human hand-edited after review.
    kept: dict[str, None] = {}
    allowed = tier.allowed

    for round_index in range(MAX_ROUNDS):
        if len(kept) >= min_entries:
            break

        topic = TOPICS[round_index % len(TOPICS)]
        rung = min(round_index // len(TOPICS), len(TEMPERATURE_LADDER) - 1)
        system, user = _prompt_for(tier, topic, CANDIDATES_PER_ROUND)

        raw = model.complete(
            system,
            user,
            temperature=TEMPERATURE_LADDER[rung],
            max_new_tokens=48 * CANDIDATES_PER_ROUND,
        )
        for line in parse_lines(raw):
            if line in kept or line in exclude:
                continue
            if check_compliance(line, allowed).compliant and not quality_issues(line):
                kept[line] = None

    return [
        Candidate(tier=tier.number, thai=thai, english=translate(model, thai))
        for thai in kept
    ]


def translate(model: ChatModel, thai: str) -> str:
    """English gloss for a kept line. Unconstrained — the tier governs Thai only."""
    raw = model.complete(
        _TRANSLATION_SYSTEM_PROMPT,
        f"Translate this Thai question into natural English:\n\n{thai}",
        temperature=0.0,
        max_new_tokens=64,
    )
    first_line = next((line for line in parse_lines(raw)), "")
    return first_line


class QwenChatModel:
    """Qwen2.5-7B-Instruct, bf16, on the local GPU."""

    def __init__(self, model_id: str = MODEL_ID) -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self._torch = torch
        self._tokenizer = AutoTokenizer.from_pretrained(model_id)
        self._model = AutoModelForCausalLM.from_pretrained(
            model_id, dtype=torch.bfloat16, device_map="cuda"
        )
        self._model.eval()

    def complete(
        self, system: str, user: str, *, temperature: float, max_new_tokens: int
    ) -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        # transformers 5.x returns a BatchEncoding here, not a bare tensor.
        inputs = self._tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            return_tensors="pt",
            return_dict=True,
        ).to(self._model.device)

        sampling = (
            {"do_sample": True, "temperature": temperature, "top_p": 0.9}
            if temperature > 0
            else {"do_sample": False}
        )
        with self._torch.inference_mode():
            output = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                pad_token_id=self._tokenizer.eos_token_id,
                **sampling,
            )

        generated = output[0][inputs["input_ids"].shape[-1] :]
        return self._tokenizer.decode(generated, skip_special_tokens=True)
