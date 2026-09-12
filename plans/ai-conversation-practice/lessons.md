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
