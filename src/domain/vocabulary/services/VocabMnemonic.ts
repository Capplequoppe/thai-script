import type { Validation } from "../../script/data/sceneGrammar";
import {
	CHARACTER_IDS,
	type CharacterId,
	characterFor,
	registerViolations,
} from "../data/characters";
import { assignRoom } from "../data/rooms";
import vocabulary from "../data/vocabulary.json";
import type { Room, VocabEntry, VocabProperty } from "../types";
import { ROOMS } from "../types";

// ============================================================================
// Vocabulary mnemonics — staged in rooms, cast with Pom and Chan
// ============================================================================
// A symbol's mnemonic binds shape to sound (sceneGrammar.ts). A word has no
// shape to bind, so a word's mnemonic binds a *scene* to its sound, and stages
// that scene in the room its part of speech lives in (rooms.ts).
//
// The room is never a pre-reveal cue — see `roomExposureFor` in rooms.ts and
// the phase README's rejection of literal memory palaces. Staging is for
// consistency and for post-reveal confirmation: the same six places and the
// same two people across every word, so a new image joins the others instead
// of competing with them.

// ----------------------------------------------------------------------------
// Room anchors — the one word that puts a scene in its room
// ----------------------------------------------------------------------------
// Declaring `room` on a record makes the room checkable against the corpus;
// it does not make the *prose* checkable, and a scene declared "connectors"
// while describing a shelf is exactly the failure AC2 names. So each room owns
// one anchor word, the scene has to contain its own and no other's, and the
// contradiction becomes a thing a test can see.
//
// The anchors are deliberately disjoint from the class districts (temple,
// market, harbor): a learner holds rooms and districts as two vocabularies,
// never one word meaning both.

export const ROOM_ANCHORS: Readonly<Record<Room, string>> = {
	"people-and-pronouns": "hallway",
	things: "shelf",
	"actions-and-states": "workshop",
	connectors: "corridor",
	particles: "doorway",
	"counting-and-classifiers": "abacus",
};

const ANCHOR_ENTRIES: readonly (readonly [Room, string])[] = ROOMS.map(
	(room) => [room, ROOM_ANCHORS[room]] as const,
);

// ----------------------------------------------------------------------------
// The record
// ----------------------------------------------------------------------------

export interface VocabMnemonic {
	/** The corpus `thai` this stages. */
	thai: string;
	/** The corpus `rank` it was drawn from — the only thing that tells two homographic entries apart. */
	rank: number;
	/** The room the scene is staged in. Must equal the room the word's class assigns. */
	room: Room;
	/** The recurring cast in this scene, by id. Empty is allowed; a name in the prose without the id is not. */
	characters: readonly CharacterId[];
	/** The image. Contains its room's anchor and no other room's. */
	sceneCue: string;
	/** What in the scene carries the Thai sound. A record without one describes a meaning and teaches no word. */
	soundCue: string;
	/** What the scene resolves to. */
	meaningCue: string;
}

/** The one prose rendering of a record: scene, then sound, then meaning. */
export function composeVocabMnemonic(record: VocabMnemonic): string {
	return `${record.sceneCue} ${record.soundCue} — ${record.meaningCue}`;
}

function isBlank(value: string | null | undefined): boolean {
	return value === null || value === undefined || value.trim() === "";
}

/** The loosely-typed shape validation accepts, so deficient records can be checked. */
export interface VocabMnemonicInput {
	room?: Room | string | null;
	characters?: readonly string[];
	sceneCue?: string | null;
	soundCue?: string | null;
	meaningCue?: string | null;
}

const ROOM_SET: ReadonlySet<string> = new Set(ROOMS);

/**
 * A record validates only if it declares a real room, stages its scene there
 * in prose, names every character it declares, binds a sound, and says what
 * the scene resolves to. Failures name their fields — a refused record must
 * never look like an empty one.
 */
export function validateVocabMnemonic(record: VocabMnemonicInput): Validation {
	const missing: string[] = [];
	const invalid: string[] = [];

	if (isBlank(record.sceneCue)) missing.push("sceneCue");
	if (isBlank(record.soundCue)) missing.push("soundCue");
	if (isBlank(record.meaningCue)) missing.push("meaningCue");
	if (isBlank(typeof record.room === "string" ? record.room : null)) {
		missing.push("room");
	} else if (!ROOM_SET.has(record.room as string)) {
		invalid.push(`room: "${record.room}" is not one of the six rooms`);
	}

	const scene = record.sceneCue ?? "";
	if (typeof record.room === "string" && ROOM_SET.has(record.room)) {
		for (const [room, anchor] of ANCHOR_ENTRIES) {
			const staged = scene.toLowerCase().includes(anchor);
			if (room === record.room && !staged) {
				missing.push(`sceneCue: stages nothing in the ${anchor}`);
			}
			if (room !== record.room && staged) {
				invalid.push(
					`sceneCue: staged in the ${anchor} (${room}) but declared ${record.room}`,
				);
			}
		}
	}

	for (const id of record.characters ?? []) {
		if (!CHARACTER_IDS.includes(id as CharacterId)) {
			invalid.push(`characters: "${id}" is not one of the recurring cast`);
			continue;
		}
		if (!scene.includes(characterFor(id as CharacterId).name)) {
			invalid.push(
				`characters: declares ${id} but the scene never stages them`,
			);
		}
	}

	for (const violation of registerViolations(
		`${record.sceneCue ?? ""} ${record.soundCue ?? ""} ${record.meaningCue ?? ""}`,
		(record.characters ?? []).filter((id): id is CharacterId =>
			CHARACTER_IDS.includes(id as CharacterId),
		),
	)) {
		invalid.push(`register: ${violation}`);
	}

	return missing.length === 0 && invalid.length === 0
		? { ok: true }
		: { ok: false, missing, invalid };
}

// ----------------------------------------------------------------------------
// The staged mnemonics
// ----------------------------------------------------------------------------
// Written from each word's own sound, room and cast. Nothing here is derived
// from the licensed transcripts, and `VocabMnemonic.test.ts` puts every one of
// them — plus the 277 prose mnemonics already in the corpus — through the
// shared originality gate.

export const VOCAB_MNEMONICS: readonly VocabMnemonic[] = [
	{
		thai: "ที่",
		rank: 1,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom sets a steaming cup of tea down on one numbered tile of the corridor and will not let anyone move it.",
		soundCue: "That tea is thîi.",
		meaningCue: "it pins whatever follows to a spot: at, in, on",
	},
	{
		thai: "ได้",
		rank: 2,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan rolls a die along the corridor floor, and each roll that lands earns her one more door she is allowed through.",
		soundCue: "That die is dâi.",
		meaningCue: "can, or managed to",
	},
	{
		thai: "จะ",
		rank: 3,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"A guide in the corridor answers every plan Pom describes with one long, certain German ja.",
		soundCue: "That ja is jà.",
		meaningCue: "it throws the verb after it into the future: will",
	},
	{
		thai: "นี้",
		rank: 4,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan taps her own knee instead of pointing away down the corridor.",
		soundCue: "That knee is níi.",
		meaningCue: "this — the one nearest the speaker",
	},
	{
		thai: "ครับ",
		rank: 5,
		room: "particles",
		characters: ["pom"],
		sceneCue:
			"Every time Pom finishes a sentence in the doorway, a crab behind him clacks its claw once.",
		soundCue: "That crab is khráp.",
		meaningCue: "the polite ending a male speaker closes with",
	},
	{
		thai: "ค่ะ",
		rank: 6,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan answers from the doorway and a heavy car door drops shut on its hinge as she finishes.",
		soundCue: "That falling kha is khâ.",
		meaningCue: "the polite ending a female speaker closes a statement with",
	},
	{
		thai: "คะ",
		rank: 7,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan asks from the doorway and the same car door swings back up instead of shutting.",
		soundCue: "That rising kha is khá.",
		meaningCue: "the polite ending a female speaker closes a question with",
	},
	{
		thai: "ว่า",
		rank: 8,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom says wah in the corridor and a screen behind him replays exactly the thing he just claimed.",
		soundCue: "That wah is wâa.",
		meaningCue: "it opens the reported thought or speech: that",
	},
	{
		thai: "เป็น",
		rank: 10,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue:
			"A ballpoint pen fills in the blank badge on Pom's workshop overall, and he straightens into whatever it now says.",
		soundCue: "That pen is bpen.",
		meaningCue: "is, or is able to",
	},
	{
		thai: "มี",
		rank: 11,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan pats every pocket of her workshop apron, saying me, me, me over each thing she turns out.",
		soundCue: "That me is mii.",
		meaningCue: "to have, or there is",
	},
	{
		thai: "ให้",
		rank: 12,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue:
			"Pom lifts a parcel high above the workshop bench and lets somebody else take it down.",
		soundCue: "That high is hâi.",
		meaningCue: "to give, or to let someone do it",
	},
	{
		thai: "คุณ",
		rank: 13,
		room: "people-and-pronouns",
		characters: ["chan"],
		sceneCue:
			"Chan greets a stranger in the hallway who is wrapped, very politely, in a silk cocoon.",
		soundCue: "The coon of that cocoon is khun.",
		meaningCue: "you, said with respect",
	},
	{
		thai: "ฉัน",
		rank: 14,
		room: "people-and-pronouns",
		characters: ["chan"],
		sceneCue:
			"Chan stands in the hallway with a chunk of mango and says ฉัน over her own shoulder before anyone can name her.",
		soundCue: "The chun of that chunk is chǎn.",
		meaningCue: "I, informally, most often from a woman",
	},
	{
		thai: "ผม",
		rank: 15,
		room: "people-and-pronouns",
		characters: ["pom"],
		sceneCue:
			"Pom straightens the pompom on his cap in the hallway before he introduces himself as ผม.",
		soundCue: "The pom of that pompom is phǒm.",
		meaningCue: "I, politely, from a man",
	},
	{
		thai: "ต้อง",
		rank: 16,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"A bell dongs down the corridor and Pom is on his feet before it stops, whatever he was doing.",
		soundCue: "That dong is dtâwng.",
		meaningCue: "must",
	},
	{
		thai: "ของ",
		rank: 17,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan strikes a gong in the corridor and every object in the building that belongs to her rattles back.",
		soundCue: "That gong is khǎawng.",
		meaningCue: "of — it ties a thing to whoever owns it",
	},
	{
		thai: "สบายดี",
		rank: 18,
		room: "actions-and-states",
		characters: ["pom", "chan"],
		sceneCue:
			"Pom asks after Chan at the workshop gate; she waves a light bye and walks off unhurried, nothing wrong anywhere.",
		soundCue: "That easy sah-bye-dee is sà-baai-dii.",
		meaningCue: "fine, well, doing all right",
	},
	{
		thai: "กับ",
		rank: 19,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom closes the gap between two carts in the corridor so they have to travel joined.",
		soundCue: "That gap is gàp.",
		meaningCue: "with",
	},
	{
		thai: "ไม่",
		rank: 20,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan lies across the workshop bench with both arms out — my bench, my rule — and nothing gets built today.",
		soundCue: "That my is mâi.",
		meaningCue: "not — it cancels whatever follows",
	},
	{
		thai: "และ",
		rank: 21,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan lays one plank down the corridor, then lays another, then lays another.",
		soundCue: "That lay is láe.",
		meaningCue: "and",
	},
	{
		thai: "ทำงาน",
		rank: 22,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue:
			"Pom presses his thumb to the scanner at the workshop gate and the shift begins.",
		soundCue: "That thumb, then a groan, is tham-ngaan.",
		meaningCue: "to work",
	},
	{
		thai: "ใน",
		rank: 23,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Night comes on in the corridor and Chan is already inside, with everything shut behind her.",
		soundCue: "That nigh is nai.",
		meaningCue: "in",
	},
	{
		thai: "กัน",
		rank: 24,
		room: "particles",
		characters: ["pom", "chan"],
		sceneCue:
			"Pom and Chan pass one water gun back and forth through the doorway and soak the garden between them.",
		soundCue: "That gun is gan.",
		meaningCue: "together, or at one another",
	},
	{
		thai: "ไหม",
		rank: 25,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan leans in the doorway and lifts the word my at the end until it curls into a question.",
		soundCue: "That rising my is mǎi.",
		meaningCue: "it turns the sentence into a yes-or-no question",
	},
	{
		thai: "ขอบคุณ",
		rank: 26,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue:
			"Pom thanks a cop who crosses the workshop to hand back the cocoon he dropped.",
		soundCue: "That cop, then that coon, is khàawp-khun.",
		meaningCue: "to thank",
	},
	{
		thai: "ขึ้น",
		rank: 30,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan cranks the workshop hoist and the ratchet bites one clipped note per notch as the crate climbs.",
		soundCue: "That clipped kern is khûen.",
		meaningCue: "to go up, to increase",
	},
	{
		thai: "ด้วย",
		rank: 31,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom walks the corridor round twice: do it the first way, and do it the other way as well.",
		soundCue: "That do-way is dûai.",
		meaningCue: "with, and also",
	},
	{
		thai: "จาก",
		rank: 32,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan winds a car jack up under the corridor floor and the whole load rises away from where it sat.",
		soundCue: "That jack is jàak.",
		meaningCue: "from",
	},
	{
		thai: "การ",
		rank: 33,
		room: "particles",
		characters: ["pom"],
		sceneCue:
			"Pom hangs a sign in the doorway of a garden that names not the plants but the gardening.",
		soundCue: "The garn of that garden is gaan.",
		meaningCue: "it turns a verb into the doing of it",
	},
	{
		thai: "ไป",
		rank: 34,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan waves bye at the workshop gate and is already out of sight before the wave finishes.",
		soundCue: "That bye is bpai.",
		meaningCue: "to go",
	},
	{
		thai: "ใช่",
		rank: 35,
		room: "particles",
		characters: ["pom"],
		sceneCue:
			"Pom is handed a cup of chai in the doorway and nods — that is exactly the cup he asked for.",
		soundCue: "That chai is châi.",
		meaningCue: "yes, that's right",
	},
	{
		thai: "มั้ย",
		rank: 36,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan files the word my to a point in the doorway until it hooks upward, quicker than before.",
		soundCue: "That high my is mái.",
		meaningCue: "the spoken question particle, faster than ไหม",
	},
	{
		thai: "มา",
		rank: 37,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue: "Pom's ma calls once across the workshop and he comes.",
		soundCue: "That ma is maa.",
		meaningCue: "to come",
	},
	{
		thai: "ชื่อ",
		rank: 38,
		room: "things",
		characters: ["chan"],
		sceneCue:
			"Chan chews a pencil at the shelf while she writes what each jar on it is called.",
		soundCue: "That chew is chûue.",
		meaningCue: "a name",
	},
	{
		thai: "ประเทศ",
		rank: 39,
		room: "things",
		characters: ["pom"],
		sceneCue:
			"Pom props a flag on the shelf with a brass plate bolted under it, one per country.",
		soundCue: "That brass plate is bprà-thêet.",
		meaningCue: "a country",
	},
	{
		thai: "ถึง",
		rank: 40,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan hauls a crate across the workshop until the tongue of rope on it touches the far wall.",
		soundCue: "That tongue is thǔeng.",
		meaningCue: "to reach, to arrive at",
	},
	{
		thai: "กว่า",
		rank: 41,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom weighs a guava in each hand in the corridor and keeps only the heavier one.",
		soundCue: "The guav of that guava is gwàa.",
		meaningCue: "than",
	},
	{
		thai: "ทั้ง",
		rank: 42,
		room: "connectors",
		characters: ["chan"],
		sceneCue:
			"Chan rings a tang out of the water pipe and every single room off the corridor hears it.",
		soundCue: "That tang is tháng.",
		meaningCue: "all, both",
	},
	{
		thai: "เมื่อ",
		rank: 43,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"A cow moos somewhere down the corridor and Pom looks up at exactly that moment, not before.",
		soundCue: "That mooa is mûea.",
		meaningCue: "when",
	},
	{
		thai: "สบาย",
		rank: 44,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan puts her feet up on a workshop stool and says a slow sah-bye to the whole afternoon.",
		soundCue: "That sah-bye is sà-baai.",
		meaningCue: "comfortable",
	},
	{
		thai: "นะ",
		rank: 45,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan softens an order from the doorway by tacking a small nah onto the end of it.",
		soundCue: "That nah is ná.",
		meaningCue: "the softener that takes the edge off a sentence",
	},
	{
		thai: "ที่อยู่",
		rank: 46,
		room: "things",
		characters: ["pom"],
		sceneCue:
			"Pom keeps a tin on the shelf labelled tea-you: the place where you can be found.",
		soundCue: "That tea-you is thîi-yùu.",
		meaningCue: "an address",
	},
	{
		thai: "คน",
		rank: 47,
		room: "things",
		characters: ["chan"],
		sceneCue:
			"Chan finds one traffic cone on the shelf with a face drawn on it, among all the boxes.",
		soundCue: "That cone is khon.",
		meaningCue: "a person",
	},
	{
		thai: "แต่",
		rank: 48,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"Pom reaches the end of the corridor and a strip of tape stops him: all of that, except this.",
		soundCue: "The tae of that tape is dtàae.",
		meaningCue: "but",
	},
	{
		thai: "อยู่",
		rank: 49,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan calls out to ask where you are, and the workshop radio answers from the bench: still here.",
		soundCue: "That you is yùu.",
		meaningCue: "to be located, to be present",
	},
	{
		thai: "ก็",
		rank: 50,
		room: "particles",
		characters: ["pom"],
		sceneCue:
			"Pom shuts the doorway and then, only then, the gate bolt drops across it with a flat gaw.",
		soundCue: "That gaw is gâaw.",
		meaningCue: "then, so",
	},
	{
		thai: "เรื่อง",
		rank: 51,
		room: "things",
		characters: ["chan"],
		sceneCue:
			"Chan lifts a rolled scroll off the shelf and a small bell rung above it starts the tale.",
		soundCue: "That rung bell is rûeang.",
		meaningCue: "a subject, a story",
	},
	{
		thai: "ก็ได้",
		rank: 52,
		room: "particles",
		characters: ["pom"],
		sceneCue:
			"Pom drops the gate bolt and the die together in the doorway: either one will do.",
		soundCue: "That gaw, then that die, is gâaw-dâi.",
		meaningCue: "it's all right to, that'll do",
	},
	{
		thai: "อะไร",
		rank: 53,
		room: "people-and-pronouns",
		characters: ["chan"],
		sceneCue:
			"Chan bites a slice of rye in the hallway and stops to ask what is actually in it.",
		soundCue: "That a-rye is à-rai.",
		meaningCue: "what",
	},
	{
		thai: "ที่นี่",
		rank: 54,
		room: "actions-and-states",
		characters: ["pom"],
		sceneCue:
			"Pom balances his tea on his knee at the workshop bench: not over there, right at this spot.",
		soundCue: "That tea, then that knee, is thîi-nîi.",
		meaningCue: "here",
	},
	{
		thai: "ที่นั่น",
		rank: 55,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan sends the tea across the workshop to a nun at the far bench: not at this spot, at that one.",
		soundCue: "That tea, then that nun, is thîi-nân.",
		meaningCue: "there",
	},
	{
		thai: "อย่าง",
		rank: 56,
		room: "things",
		characters: ["pom"],
		sceneCue:
			"Pom sorts the shelf by yang: one kind of jar to the left, another kind to the right.",
		soundCue: "That yang is yàang.",
		meaningCue: "a kind, a type, like this",
	},
	{
		thai: "ความ",
		rank: 57,
		room: "particles",
		characters: ["chan"],
		sceneCue:
			"Chan holds a warm mug in the doorway and means the warmth itself, never the mug.",
		soundCue: "That kwahm of warmth is khwaam.",
		meaningCue: "it turns a quality word into the quality itself",
	},
	{
		thai: "นั้น",
		rank: 58,
		room: "connectors",
		characters: ["pom"],
		sceneCue:
			"A nun walks the far end of the corridor and Pom points down at her, not at his own feet.",
		soundCue: "That nun is nán.",
		meaningCue: "that — the one further off",
	},
	{
		thai: "ช่วย",
		rank: 59,
		room: "actions-and-states",
		characters: ["pom", "chan"],
		sceneCue:
			"Chan chews at a knot on the workshop bench and Pom takes the other end of the rope without being asked.",
		soundCue: "That chew-way is chûuai.",
		meaningCue: "to help",
	},
	{
		thai: "มาก",
		rank: 60,
		room: "actions-and-states",
		characters: ["chan"],
		sceneCue:
			"Chan mocks up a stack on the workshop bench so tall it doubles the order twice over.",
		soundCue: "That mock is mâak.",
		meaningCue: "much, very",
	},
];

// ----------------------------------------------------------------------------
// The three states, and the words found unsuitable
// ----------------------------------------------------------------------------
// A word has a staged mnemonic, has none yet, or was found unsuitable for one
// with a reason recorded. "Unsuitable" must never read as "missing": the first
// is a decision somebody took and can be argued with, the second is work not
// done, and a corpus that cannot tell them apart grows a pile of the second
// disguised as the first.

export interface UnsuitableWord {
	thai: string;
	/** The corpus rank of the specific entry — two homographs can differ in verdict. */
	rank: number;
	reason: string;
}

export const UNSUITABLE_FOR_MNEMONIC: readonly UnsuitableWord[] = [
	{
		thai: "สวัสดี",
		rank: 9,
		reason:
			"the corpus classes this greeting as a noun, and by backfill rather than from source — staging it on that class would put a greeting in the things room and teach the wrong room",
	},
	{
		thai: "ขอบคุณ",
		rank: 27,
		reason:
			"a second corpus entry for the word staged at rank 26; one word gets one scene",
	},
	{
		thai: "ขอโทษ",
		rank: 28,
		reason:
			"the corpus classes this apology as a noun, and by backfill rather than from source — staging it on that class would put a spoken formula in the things room",
	},
	{
		thai: "ขอโทษ",
		rank: 29,
		reason:
			"a second corpus entry for ขอโทษ, and carrying the same backfilled noun class as rank 28",
	},
];

export type VocabMnemonicState =
	| { state: "has-mnemonic"; mnemonic: VocabMnemonic }
	| { state: "none-yet" }
	| { state: "unsuitable"; reason: string };

const MNEMONIC_BY_RANK = new Map(VOCAB_MNEMONICS.map((m) => [m.rank, m]));
const UNSUITABLE_BY_RANK = new Map(
	UNSUITABLE_FOR_MNEMONIC.map((u) => [u.rank, u]),
);

/**
 * Which of the three states this corpus entry is in.
 *
 * Keyed on rank, not on the spelling: ขอบคุณ appears twice in the corpus and
 * the two entries have different verdicts, which a spelling lookup could not
 * express. An unranked entry can only be "none yet" — the floor below is
 * stated over ranks, so nothing off the frequency list has been considered.
 */
export function mnemonicStateFor(entry: {
	thai: string;
	rank: number | null;
}): VocabMnemonicState {
	if (entry.rank === null) return { state: "none-yet" };
	const unsuitable = UNSUITABLE_BY_RANK.get(entry.rank);
	if (unsuitable && unsuitable.thai === entry.thai) {
		return { state: "unsuitable", reason: unsuitable.reason };
	}
	const mnemonic = MNEMONIC_BY_RANK.get(entry.rank);
	if (mnemonic && mnemonic.thai === entry.thai) {
		return { state: "has-mnemonic", mnemonic };
	}
	return { state: "none-yet" };
}

/**
 * The mnemonic a learner should actually be shown for this word: the staged
 * record where one exists, and the corpus's own prose otherwise.
 *
 * This exists because the two surfaces had drifted apart in the worst possible
 * direction. `WordCard` — the dictionary page, seen once and only if a learner
 * goes looking — resolved the staged record. `VocabCardGenerator`, which
 * builds every review card, took `word.mnemonic` straight out of the JSON. So
 * the sixty mnemonics written in the course's own world reached the browse
 * surface, and every single repetition to mastery drilled the corpus's
 * ALL-CAPS romanisation instead — which is the half of the corpus whose hooks
 * are sometimes a different Thai word entirely.
 *
 * One function, both callers, so the drift cannot recur.
 */
export function mnemonicTextFor(entry: {
	thai: string;
	rank: number | null;
	mnemonic?: string | null;
}): string | undefined {
	const staged = mnemonicStateFor(entry);
	if (staged.state === "has-mnemonic") {
		return composeVocabMnemonic(staged.mnemonic);
	}
	return entry.mnemonic ?? undefined;
}

// ----------------------------------------------------------------------------
// Room lookup for a card
// ----------------------------------------------------------------------------

const entries = vocabulary as unknown as VocabEntry[];

const BEST_ENTRY_BY_THAI = new Map<string, VocabEntry>();
for (const entry of entries) {
	const seen = BEST_ENTRY_BY_THAI.get(entry.thai);
	// Lowest rank wins, and any ranked entry beats an unranked one: nine
	// spellings in the corpus carry two word classes (ผม is both "hair" and
	// "I"), and the commoner sense is the one a review is asking about.
	if (
		!seen ||
		(entry.rank !== null && (seen.rank === null || entry.rank < seen.rank))
	) {
		BEST_ENTRY_BY_THAI.set(entry.thai, entry);
	}
}

/** The room a spelling's commonest corpus sense stages in, or null if it has no assignable class. */
export function roomForWord(thai: string): Room | null {
	const entry = BEST_ENTRY_BY_THAI.get(thai);
	if (!entry) return null;
	const assignment = assignRoom(entry.word_class);
	return assignment.state === "assigned" ? assignment.room : null;
}

/** The properties a vocabulary review can present, as a value. */
export const VOCAB_PROPERTIES: readonly VocabProperty[] = [
	"thaiToEnglish",
	"englishToThai",
	"audioRecognition",
	"toneIdentification",
	"toneRule",
	"tonePronunciation",
	"spelling",
	"spellingFromAudio",
];

const VOCAB_PROPERTY_SET: ReadonlySet<string> = new Set(VOCAB_PROPERTIES);

/** Whether an unknown value off a card is one of the vocabulary properties. */
export function isVocabProperty(value: unknown): value is VocabProperty {
	return typeof value === "string" && VOCAB_PROPERTY_SET.has(value);
}

/**
 * The room behind a vocabulary card id (`vocab:<thai>:<property>`), or null.
 *
 * The card carries the Thai spelling nowhere else: `promptWord` is the
 * *English* on an englishToThai card, while the id holds the Thai for every
 * property. `WordGameItemSource.ts` parses the same id shape for the same
 * reason and keeps its parser private; this one is here rather than shared
 * because that file is not this task's to change.
 */
export function roomForVocabCardId(id: string): Room | null {
	const parts = id.split(":");
	if (parts.length !== 3) return null;
	const [prefix, thai, property] = parts;
	if (prefix !== "vocab" || !thai || !VOCAB_PROPERTY_SET.has(property)) {
		return null;
	}
	return roomForWord(thai);
}

/** A room id as the learner reads it. */
export function roomLabel(room: Room): string {
	return room.replace(/-/g, " ");
}

// ----------------------------------------------------------------------------
// The coverage floor
// ----------------------------------------------------------------------------
// Without a declared floor, "has none yet" is a valid terminal state for all
// 5,454 words and every other criterion on this task is satisfiable by writing
// nothing. So the floor is a number over a stated rank window, the way task
// 2.4 states 73 symbols.
//
// The window is the top 60 by frequency: every word a learner meets in the
// first lessons, and the band where a missing mnemonic costs the most. Four of
// those 60 are recorded unsuitable above, which is why the staged count is 56
// rather than 60 — an unsuitable word is *resolved*, not skipped, and the
// report below refuses to count a merely-missing word as either.

export const COVERAGE_FLOOR = {
	rankFrom: 1,
	rankTo: 60,
	/** Entries in the window that must carry a staged mnemonic. */
	staged: 56,
	/** Entries in the window that are resolved by a recorded reason instead. */
	unsuitable: 4,
} as const;

export interface CoverageReport {
	ok: boolean;
	staged: number;
	unsuitable: number;
	/** Entries in the window in neither state — the shortfall, by rank. */
	missing: { thai: string; rank: number }[];
}

/**
 * Measure the floor over the corpus (or over a supplied slice, for tests).
 *
 * `ok` requires the counts to be met *and* the window to be empty of
 * unresolved words: a run one word short fails here rather than in review.
 */
export function coverageReport(
	corpus: readonly { thai: string; rank: number | null }[] = entries,
): CoverageReport {
	const window = corpus.filter(
		(entry) =>
			entry.rank !== null &&
			entry.rank >= COVERAGE_FLOOR.rankFrom &&
			entry.rank <= COVERAGE_FLOOR.rankTo,
	);
	let staged = 0;
	let unsuitable = 0;
	const missing: { thai: string; rank: number }[] = [];
	for (const entry of window) {
		const state = mnemonicStateFor(entry);
		if (state.state === "has-mnemonic") staged += 1;
		else if (state.state === "unsuitable") unsuitable += 1;
		else missing.push({ thai: entry.thai, rank: entry.rank as number });
	}
	return {
		ok:
			missing.length === 0 &&
			staged >= COVERAGE_FLOOR.staged &&
			unsuitable <= COVERAGE_FLOOR.unsuitable,
		staged,
		unsuitable,
		missing,
	};
}

// ----------------------------------------------------------------------------
// Restaging
// ----------------------------------------------------------------------------

export type StagingReview =
	| { state: "staged"; room: Room }
	| { state: "needs-restaging"; stagedIn: Room; belongsIn: Room }
	| { state: "unroomed"; reason: string };

/**
 * Whether a record is still staged where its word's class puts it.
 *
 * Task 5.2's provenance can be revised — a backfilled class corrected, a
 * source class disputed — and a record staged on the old class would then
 * quietly contradict its room. This surfaces that as its own state rather than
 * letting the mismatch pass as a valid record.
 */
export function reviewStaging(
	record: VocabMnemonic,
	wordClass: string,
): StagingReview {
	const assignment = assignRoom(wordClass);
	if (assignment.state !== "assigned") {
		return {
			state: "unroomed",
			reason:
				assignment.state === "unassignable"
					? assignment.reason
					: "the word has no class yet, so no room can be derived",
		};
	}
	return assignment.room === record.room
		? { state: "staged", room: record.room }
		: {
				state: "needs-restaging",
				stagedIn: record.room,
				belongsIn: assignment.room,
			};
}

// ----------------------------------------------------------------------------
// The corpus's own 277 mnemonics, measured against the originality gate
// ----------------------------------------------------------------------------
// AC5 puts the prose that already shipped through the same gate as the new
// records. Three entries (ได้, ครับ, ค่ะ) came back overlapping on a stock
// grammatical run — "at the end of the" and its neighbours — which the
// 5-token window cannot tell apart from a reused phrase, and the licensed set
// happens to contain those runs too. Rather than declare them as tolerated
// exceptions to a gate whose whole point is not to be argued with, the three
// `vocabulary.json` strings were rewritten to drop the flagged run; this list
// is now empty and the test over it is exact in both directions, so a fourth
// overlap fails and so does a rewrite that reintroduces one of these three.
//
// See phase-5 review, 2026-09-14: rewrote the ได้/ครับ/ค่ะ mnemonics
// (rank 2, 5, 6) in vocabulary.json to clear the gate instead of allowlisting
// them.

export interface CorpusMnemonicOverlap {
	thai: string;
	rank: number;
	/** The exact run the gate matched. */
	ngram: string;
	note: string;
}

export const KNOWN_CORPUS_MNEMONIC_OVERLAPS: readonly CorpusMnemonicOverlap[] =
	[];
