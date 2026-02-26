import { describe, it, expect } from "vitest";
import { generateCardsForLesson, generateToneRuleCards } from "./card-generator";

describe("generateCardsForLesson", () => {
  it("generates 5 property cards per consonant for lesson 1 (ม, น)", () => {
    const cards = generateCardsForLesson(1);
    const consonantCards = cards.filter((c) => c.id.startsWith("ม:") || c.id.startsWith("น:"));
    expect(consonantCards).toHaveLength(10);
  });

  it("generates 3 property cards per vowel for lesson 1 (า)", () => {
    const cards = generateCardsForLesson(1);
    const vowelCards = cards.filter((c) => c.id.startsWith("า:"));
    expect(vowelCards).toHaveLength(3);
  });

  it("each card has question, correctAnswer, and choices containing the answer", () => {
    const cards = generateCardsForLesson(1);
    for (const card of cards) {
      expect(card.question).toBeTruthy();
      expect(card.correctAnswer).toBeTruthy();
      expect(card.choices.length).toBeGreaterThanOrEqual(2);
      expect(card.choices).toContain(card.correctAnswer);
    }
  });

  it("generates unique card IDs", () => {
    const cards = generateCardsForLesson(1);
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes tone rule cards when lesson has them", () => {
    const cards = generateCardsForLesson(2); // lesson 2 has tone rule "low-live"
    const toneCards = cards.filter((c) => c.id.startsWith("tone-rule:"));
    expect(toneCards.length).toBeGreaterThanOrEqual(1);
  });
});

describe("generateToneRuleCards", () => {
  it("generates cards for tone rules introduced in lesson 2", () => {
    const cards = generateToneRuleCards(2);
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(cards[0]!.id).toContain("tone-rule:");
  });

  it("returns empty for lessons with no tone rules", () => {
    const cards = generateToneRuleCards(1);
    expect(cards).toHaveLength(0);
  });

  it("generates tone mark rule cards for lesson 17", () => {
    const cards = generateToneRuleCards(17);
    const markRuleCards = cards.filter((c) => c.id.startsWith("tone-mark-rule:"));
    expect(markRuleCards.length).toBeGreaterThanOrEqual(1);
  });
});
