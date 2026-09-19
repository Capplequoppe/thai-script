/**
 * The house's promises, which are the same two the rest of the palace makes:
 * every lodger has somewhere to be, and no two places answer to one name.
 */
import { describe, expect, it } from "vitest";
import { vowels } from "./symbols";
import {
	EVERY_POSITION_REACHES_A_ROOM,
	HOUSE_ROOMS,
	ROOM_NAMES_ARE_DISTINCT,
	roomNamed,
	roomsForPosition,
} from "./vowelHouse";
import { partsOf, positionFromParts } from "./vowelParts";

describe("the floor plan", () => {
	it("gives every written position a room", () => {
		expect(EVERY_POSITION_REACHES_A_ROOM).toBe(true);
	});

	it("keeps one name per room", () => {
		expect(ROOM_NAMES_ARE_DISTINCT).toBe(true);
	});

	it("has five rooms, which is what the page draws", () => {
		// Recorded rather than aimed at: a sixth room is a real change to the
		// metaphor and should have to edit this line to happen.
		expect(HOUSE_ROOMS).toHaveLength(5);
	});
});

describe("lodgers", () => {
	it("puts every one of the thirty vowels in at least one room", () => {
		// The failure this catches is a vowel added with a position nobody gave
		// a room to, which shows up in the app as a letter that is in the house
		// and in none of its rooms — a hole exactly where a learner goes
		// looking for it.
		expect(vowels.length).toBeGreaterThan(25);
		for (const vowel of vowels) {
			expect(roomsForPosition(vowel.position).length).toBeGreaterThan(0);
		}
	});

	it("puts a vowel written in two places in both of them", () => {
		// `เ-ือ` really is written before, above and after its consonant, so
		// finding it on the veranda and on the roof is the fact rather than a
		// duplicate. A house that picked one room for it would be teaching a
		// learner to leave a mark out.
		const rooms = roomsForPosition("left-above-right").map((room) => room.slug);
		expect(rooms).toContain("veranda");
		expect(rooms).toContain("roof");
	});

	it("derives a room from the parts alone, the way position is derived", () => {
		// The house and `positionFromParts` have to agree, because the lesson
		// teaches position from the parts and the map sorts by room. Checked
		// through the derivation rather than the stored field so a vowel whose
		// two disagree fails here as well as in `vowelParts.test.ts`.
		for (const vowel of vowels) {
			const derived = positionFromParts(partsOf(vowel.character));
			expect(roomsForPosition(derived)).toEqual(
				roomsForPosition(vowel.position),
			);
		}
	});
});

describe("looking a room up", () => {
	it("finds each declared room by its slug", () => {
		for (const room of HOUSE_ROOMS) {
			expect(roomNamed(room.slug)).toEqual(room);
		}
	});

	it("returns nothing for a name no room answers to", () => {
		expect(roomNamed("the attic")).toBeUndefined();
	});
});
