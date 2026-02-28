import { beforeEach, describe, expect, it } from "vitest";
import { GrammarReviewCard } from "../../domain/grammar/entities/GrammarReviewCard";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import { SrsSchedule } from "../../domain/srs/value-objects/SrsSchedule";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import { InMemoryStorage } from "./Storage";
import { StorageCardRepository } from "./StorageCardRepository";

function makeScriptCard(id: string, now?: string): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		"What class?",
		"mid",
		["low", "mid", "high"],
		SrsSchedule.initial(now ?? "2024-01-01T00:00:00.000Z"),
		"ก",
		"class",
		1,
	);
}

function makeVocabCard(id: string, now?: string): VocabCard {
	return new VocabCard(
		id,
		"What does สวัสดี mean?",
		"hello",
		["hello", "goodbye", "thanks"],
		SrsSchedule.initial(now ?? "2024-01-01T00:00:00.000Z"),
		"สวัสดี",
		"thaiToEnglish",
	);
}

function makeGrammarCard(id: string, now?: string): GrammarReviewCard {
	return new GrammarReviewCard(
		id,
		"Which pattern?",
		"SVO",
		["SVO", "SOV", "VSO"],
		SrsSchedule.initial(now ?? "2024-01-01T00:00:00.000Z"),
		"grammar-1",
		"recognition",
	);
}

describe("StorageCardRepository", () => {
	let storage: InMemoryStorage;
	let repo: StorageCardRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repo = new StorageCardRepository(storage);
	});

	describe("save and findById round-trip", () => {
		it("persists and retrieves a script card", () => {
			const card = makeScriptCard("s1");
			repo.save(card);

			const found = repo.findById("s1", "script");
			expect(found).not.toBeNull();
			expect(found).toBeInstanceOf(ScriptPropertyCard);
			expect(found?.id).toBe("s1");
			expect(found?.question).toBe("What class?");
			expect(found?.correctAnswer).toBe("mid");
			expect(found?.pool).toBe("script");
		});

		it("persists and retrieves a vocab card", () => {
			const card = makeVocabCard("v1");
			repo.save(card);

			const found = repo.findById("v1", "vocab");
			expect(found).not.toBeNull();
			expect(found).toBeInstanceOf(VocabCard);
			expect(found?.id).toBe("v1");
			expect(found?.pool).toBe("vocab");
		});

		it("persists and retrieves a grammar card", () => {
			const card = makeGrammarCard("g1");
			repo.save(card);

			const found = repo.findById("g1", "grammar");
			expect(found).not.toBeNull();
			expect(found).toBeInstanceOf(GrammarReviewCard);
			expect(found?.id).toBe("g1");
			expect(found?.pool).toBe("grammar");
		});
	});

	describe("findById", () => {
		it("returns null when card does not exist", () => {
			expect(repo.findById("missing", "script")).toBeNull();
		});
	});

	describe("findAll", () => {
		it("returns all cards for a given pool", () => {
			repo.save(makeScriptCard("s1"));
			repo.save(makeScriptCard("s2"));
			repo.save(makeVocabCard("v1"));

			const scripts = repo.findAll("script");
			expect(scripts).toHaveLength(2);
			expect(scripts.every((c) => c.pool === "script")).toBe(true);
		});

		it("returns empty array when no cards exist", () => {
			expect(repo.findAll("vocab")).toHaveLength(0);
		});
	});

	describe("findDue", () => {
		it("returns only cards that are due", () => {
			const pastCard = makeScriptCard("due", "2024-01-01T00:00:00.000Z");
			const futureCard = makeScriptCard("notDue", "2099-01-01T00:00:00.000Z");

			repo.save(pastCard);
			repo.save(futureCard);

			const due = repo.findDue("2025-01-01T00:00:00.000Z", "script");
			expect(due).toHaveLength(1);
			expect(due[0].id).toBe("due");
		});

		it("returns empty array when no cards are due", () => {
			repo.save(makeScriptCard("notDue", "2099-01-01T00:00:00.000Z"));
			expect(repo.findDue("2024-01-01T00:00:00.000Z", "script")).toHaveLength(
				0,
			);
		});
	});

	describe("saveAll", () => {
		it("saves multiple cards at once", () => {
			const cards = [makeScriptCard("s1"), makeScriptCard("s2")];
			repo.saveAll(cards);

			expect(repo.findAll("script")).toHaveLength(2);
		});

		it("handles mixed pools", () => {
			repo.saveAll([
				makeScriptCard("s1"),
				makeVocabCard("v1"),
				makeGrammarCard("g1"),
			]);

			expect(repo.findAll("script")).toHaveLength(1);
			expect(repo.findAll("vocab")).toHaveLength(1);
			expect(repo.findAll("grammar")).toHaveLength(1);
		});

		it("does nothing with empty array", () => {
			repo.saveAll([]);
			expect(repo.findAll("script")).toHaveLength(0);
		});
	});

	describe("remove", () => {
		it("deletes a card from the pool", () => {
			repo.save(makeScriptCard("s1"));
			expect(repo.findById("s1", "script")).not.toBeNull();

			repo.remove("s1", "script");
			expect(repo.findById("s1", "script")).toBeNull();
		});

		it("does not throw when removing a nonexistent card", () => {
			expect(() => repo.remove("missing", "script")).not.toThrow();
		});
	});

	describe("cross-pool isolation", () => {
		it("saving to one pool does not affect another", () => {
			repo.save(makeScriptCard("s1"));
			repo.save(makeVocabCard("v1"));

			expect(repo.findAll("script")).toHaveLength(1);
			expect(repo.findAll("vocab")).toHaveLength(1);

			repo.remove("s1", "script");
			expect(repo.findAll("script")).toHaveLength(0);
			expect(repo.findAll("vocab")).toHaveLength(1);
		});

		it("findById in wrong pool returns null", () => {
			repo.save(makeScriptCard("s1"));
			expect(repo.findById("s1", "vocab")).toBeNull();
			expect(repo.findById("s1", "grammar")).toBeNull();
		});
	});
});
