// ============================================================================
// Thai Script Learning Data
// Sequencing follows ThaiPod101 "Thai Alphabet Made Easy" Lessons 1-25.
// All mnemonic content is in-house, written under the scene grammar from each
// symbol's own properties (see sceneGrammar.ts).
// ============================================================================

import type { District } from "./sceneGrammar";

/**
 * The structured mnemonic on a symbol: shape and sound bound as separate,
 * checkable cues. A class-bearing symbol stages its image in a class district;
 * a tone-carrying record names one of the five shipped motions. The prose the
 * UI renders is derived from this record and never authored separately.
 */
export interface SceneMnemonic {
	shapeCue: string;
	soundCue: string;
	/** Class district the image stages in — exactly the consonants carry one. */
	district?: District;
	/** Named tone motion — exactly the tone-carrying records carry one. */
	toneMotion?: ToneValue;
}

/** The one prose rendering of a record: shape first, then sound. */
export function composeMnemonic(record: SceneMnemonic): string {
	return `${record.shapeCue} ${record.soundCue}`;
}

function proseFor(record: SceneMnemonic | undefined): string | undefined {
	return record ? composeMnemonic(record) : undefined;
}

export class LearnableItem {
	constructor(
		public readonly priority?: number,
		public readonly lesson?: number,
	) {}
}

/**
 * Base of the learnable script symbols. When constructed with a
 * `sceneMnemonic` and no explicit prose, the rendered `mnemonic` string is
 * derived from the record via {@link composeMnemonic}.
 */
export class ThaiSymbol extends LearnableItem {
	constructor(
		public readonly character: string,
		public readonly name: string,
		public readonly mnemonic?: string,
		public readonly audioUrl?: string,
		priority?: number,
		lesson?: number,
		public readonly sceneMnemonic?: SceneMnemonic,
	) {
		super(priority, lesson);
	}
	static fromPlain({
		character,
		name,
		mnemonic,
		audioUrl,
		priority,
		lesson,
		sceneMnemonic,
	}: {
		character: string;
		name: string;
		mnemonic?: string;
		audioUrl?: string;
		priority?: number;
		lesson?: number;
		sceneMnemonic?: SceneMnemonic;
	}): ThaiSymbol {
		return new ThaiSymbol(
			character,
			name,
			mnemonic ?? proseFor(sceneMnemonic),
			audioUrl,
			priority,
			lesson,
			sceneMnemonic,
		);
	}
}

/** A consonant: class, aspiration and sound facts, staged by its mnemonic in a class district. */
export class ThaiConsonant extends ThaiSymbol {
	constructor(
		character: string,
		name: string,
		public readonly nameRomanized: string,
		public readonly nameMeaning: string,
		public readonly classType: ThaiSymbolClass,
		public readonly hasDeadEnding: boolean,
		public readonly isAspirated: boolean,
		public readonly initialSound: string,
		public readonly finalSound: string,
		mnemonic?: string,
		audioUrl?: string,
		priority?: number,
		lesson?: number,
		sceneMnemonic?: SceneMnemonic,
	) {
		super(character, name, mnemonic, audioUrl, priority, lesson, sceneMnemonic);
	}
	static fromPlain({
		character,
		name,
		nameRomanized,
		nameMeaning,
		classType,
		hasDeadEnding,
		isAspirated,
		initialSound,
		finalSound,
		mnemonic,
		audioUrl,
		priority,
		lesson,
		sceneMnemonic,
	}: {
		character: string;
		name: string;
		nameRomanized: string;
		nameMeaning: string;
		classType: ThaiSymbolClass;
		hasDeadEnding: boolean;
		isAspirated: boolean;
		initialSound: string;
		finalSound: string;
		mnemonic?: string;
		audioUrl?: string;
		priority?: number;
		lesson?: number;
		sceneMnemonic?: SceneMnemonic;
	}): ThaiConsonant {
		return new ThaiConsonant(
			character,
			name,
			nameRomanized,
			nameMeaning,
			classType,
			hasDeadEnding,
			isAspirated,
			initialSound,
			finalSound,
			mnemonic ?? proseFor(sceneMnemonic),
			audioUrl,
			priority,
			lesson,
			sceneMnemonic,
		);
	}
}

export type VowelPosition =
	| "left"
	| "right"
	| "above"
	| "below"
	| "around"
	| "left-above"
	| "left-above-right";

/** A vowel form: length, sound and written position around its host consonant. */
export class ThaiVowel extends ThaiSymbol {
	constructor(
		character: string,
		name: string,
		public readonly length: "short" | "long",
		public readonly sound: string,
		public readonly position: VowelPosition,
		mnemonic?: string,
		audioUrl?: string,
		priority?: number,
		lesson?: number,
		sceneMnemonic?: SceneMnemonic,
	) {
		super(character, name, mnemonic, audioUrl, priority, lesson, sceneMnemonic);
	}
	static fromPlain({
		character,
		name,
		length,
		sound,
		position,
		mnemonic,
		audioUrl,
		priority,
		lesson,
		sceneMnemonic,
	}: {
		character: string;
		name: string;
		length: "short" | "long";
		sound: string;
		position: VowelPosition;
		mnemonic?: string;
		audioUrl?: string;
		priority?: number;
		lesson?: number;
		sceneMnemonic?: SceneMnemonic;
	}): ThaiVowel {
		return new ThaiVowel(
			character,
			name,
			length,
			sound,
			position,
			mnemonic ?? proseFor(sceneMnemonic),
			audioUrl,
			priority,
			lesson,
			sceneMnemonic,
		);
	}
}

/** A tone mark and its class-dependent tone table; its mnemonic names the mid-class citation motion. */
export class ThaiToneMark extends ThaiSymbol {
	constructor(
		character: string,
		name: string,
		public readonly midClassTone: ToneValue,
		public readonly highClassTone: ToneValue | null,
		public readonly lowClassTone: ToneValue | null,
		mnemonic?: string,
		audioUrl?: string,
		priority?: number,
		lesson?: number,
		sceneMnemonic?: SceneMnemonic,
	) {
		super(character, name, mnemonic, audioUrl, priority, lesson, sceneMnemonic);
	}
	static fromPlain({
		character,
		name,
		midClassTone,
		highClassTone,
		lowClassTone,
		mnemonic,
		audioUrl,
		priority,
		lesson,
		sceneMnemonic,
	}: {
		character: string;
		name: string;
		midClassTone: ToneValue;
		highClassTone: ToneValue | null;
		lowClassTone: ToneValue | null;
		mnemonic?: string;
		audioUrl?: string;
		priority?: number;
		lesson?: number;
		sceneMnemonic?: SceneMnemonic;
	}): ThaiToneMark {
		return new ThaiToneMark(
			character,
			name,
			midClassTone,
			highClassTone,
			lowClassTone,
			mnemonic ?? proseFor(sceneMnemonic),
			audioUrl,
			priority,
			lesson,
			sceneMnemonic,
		);
	}
}

/** A lesson practice word; five carry scene mnemonics for spelling rules that live on no single symbol. */
export class ThaiWord {
	constructor(
		public readonly name: string,
		public readonly romanization: string,
		public readonly meaning: string,
		public readonly tone: ToneValue,
		public readonly toneRule: string,
		public readonly lesson: number,
		public readonly mnemonic?: string,
		public readonly sceneMnemonic?: SceneMnemonic,
	) {}
	static fromPlain({
		name,
		romanization,
		meaning,
		tone,
		toneRule,
		lesson,
		mnemonic,
		sceneMnemonic,
	}: {
		name: string;
		romanization: string;
		meaning: string;
		tone: ToneValue;
		toneRule: string;
		lesson: number;
		mnemonic?: string;
		sceneMnemonic?: SceneMnemonic;
	}): ThaiWord {
		return new ThaiWord(
			name,
			romanization,
			meaning,
			tone,
			toneRule,
			lesson,
			mnemonic ?? proseFor(sceneMnemonic),
			sceneMnemonic,
		);
	}
}

export enum ThaiSymbolClass {
	High = "high",
	Mid = "mid",
	Low = "low",
}

export type ToneValue = "mid" | "low" | "falling" | "high" | "rising";

// ============================================================================
// Tone Rules
// ============================================================================

export interface ToneRule {
	id: string;
	consonantClass: ThaiSymbolClass;
	syllableType: "live" | "dead-short" | "dead-long";
	resultingTone: ToneValue;
	description: string;
	lesson: number;
}

export const toneRules: ToneRule[] = [
	// Lesson 2: First tone rule
	{
		id: "low-live",
		consonantClass: ThaiSymbolClass.Low,
		syllableType: "live",
		resultingTone: "mid",
		description:
			"Low class consonant + live syllable = mid tone. A mid tone is pronounced at a flat pitch in the middle of your regular vocal range.",
		lesson: 2,
	},
	// Lesson 3: Mid class live
	{
		id: "mid-live",
		consonantClass: ThaiSymbolClass.Mid,
		syllableType: "live",
		resultingTone: "mid",
		description: "Mid class consonant + live syllable = mid tone.",
		lesson: 3,
	},
	// Lesson 4: Low class dead short
	{
		id: "low-dead-short",
		consonantClass: ThaiSymbolClass.Low,
		syllableType: "dead-short",
		resultingTone: "high",
		description:
			"Low class consonant + dead syllable + short vowel = high tone. High tone starts at a high pitch and rises very slightly.",
		lesson: 4,
	},
	// Lesson 5: Low class dead long
	{
		id: "low-dead-long",
		consonantClass: ThaiSymbolClass.Low,
		syllableType: "dead-long",
		resultingTone: "falling",
		description:
			"Low class consonant + dead syllable + long vowel = falling tone. Falling tone begins with a relatively high pitch that drops sharply.",
		lesson: 5,
	},
	// Lesson 11: Mid class dead
	{
		id: "mid-dead-short",
		consonantClass: ThaiSymbolClass.Mid,
		syllableType: "dead-short",
		resultingTone: "low",
		description: "Mid class consonant + dead syllable = low tone.",
		lesson: 11,
	},
	{
		id: "mid-dead-long",
		consonantClass: ThaiSymbolClass.Mid,
		syllableType: "dead-long",
		resultingTone: "low",
		description:
			"Mid class consonant + dead syllable = low tone (regardless of vowel length).",
		lesson: 11,
	},
	// Lesson 12: High class live
	{
		id: "high-live",
		consonantClass: ThaiSymbolClass.High,
		syllableType: "live",
		resultingTone: "rising",
		description: "High class consonant + live syllable = rising tone.",
		lesson: 12,
	},
	// Lesson 13: High class dead
	{
		id: "high-dead-short",
		consonantClass: ThaiSymbolClass.High,
		syllableType: "dead-short",
		resultingTone: "low",
		description: "High class consonant + dead syllable = low tone.",
		lesson: 13,
	},
	{
		id: "high-dead-long",
		consonantClass: ThaiSymbolClass.High,
		syllableType: "dead-long",
		resultingTone: "low",
		description:
			"High class consonant + dead syllable = low tone (regardless of vowel length).",
		lesson: 13,
	},
];

// ============================================================================
// Tone Mark Rules (taught together by the consolidated tone-mark lesson)
// ============================================================================

export interface ToneMarkRule {
	toneMarkName: string;
	consonantClass: ThaiSymbolClass;
	resultingTone: ToneValue;
	lesson: number;
}

export const toneMarkRules: ToneMarkRule[] = [
	// Middle class
	{
		toneMarkName: "mai ek",
		consonantClass: ThaiSymbolClass.Mid,
		resultingTone: "low",
		lesson: 29,
	},
	{
		toneMarkName: "mai tho",
		consonantClass: ThaiSymbolClass.Mid,
		resultingTone: "falling",
		lesson: 29,
	},
	{
		toneMarkName: "mai tri",
		consonantClass: ThaiSymbolClass.Mid,
		resultingTone: "high",
		lesson: 29,
	},
	{
		toneMarkName: "mai chattawa",
		consonantClass: ThaiSymbolClass.Mid,
		resultingTone: "rising",
		lesson: 29,
	},
	// High class
	{
		toneMarkName: "mai ek",
		consonantClass: ThaiSymbolClass.High,
		resultingTone: "low",
		lesson: 29,
	},
	{
		toneMarkName: "mai tho",
		consonantClass: ThaiSymbolClass.High,
		resultingTone: "falling",
		lesson: 29,
	},
	// Low class
	{
		toneMarkName: "mai ek",
		consonantClass: ThaiSymbolClass.Low,
		resultingTone: "falling",
		lesson: 29,
	},
	{
		toneMarkName: "mai tho",
		consonantClass: ThaiSymbolClass.Low,
		resultingTone: "high",
		lesson: 29,
	},
];

// ============================================================================
// Special Rules (accumulated across lessons)
// ============================================================================

export interface SpecialRule {
	id: string;
	title: string;
	description: string;
	lesson: number;
}

export const specialRules: SpecialRule[] = [
	{
		id: "live-endings",
		title: "Live Consonant Endings",
		description:
			"Only ม, น, ง, ย, and ว can end a syllable and keep it live. These sounds can resonate indefinitely (mmm, nnn, nggg). Syllables ending in long vowels with no final consonant are also live.",
		lesson: 2,
	},
	{
		id: "dead-endings",
		title: "Dead Syllable Endings",
		description:
			"A dead syllable ends with a short vowel or one of the three stopping sounds: K-stop (ก), T-stop (ด,ต,ช,ซ,ท, etc.), or P-stop (บ,พ,ฟ). The sound is cut off abruptly.",
		lesson: 3,
	},
	{
		id: "mai-han-akat",
		title: "Mai Han Akat (ไม้หันอากาศ)",
		description:
			"When short sara a (สระ อะ) has a following consonant, the สระ อะ symbol is replaced by a single curl (ั) written above the initial consonant. Called ไม้หันอากาศ (mai-han-aa-gat).",
		lesson: 4,
	},
	{
		id: "mai-taikhu",
		title: "Mai Taikhu (ไม้ไต่คู้) ็",
		description:
			"When short sara e (สระ เอะ) has a following consonant, the สระ อะ is replaced by ไม้ไต่คู้ (็) written above the initial consonant -- the same swap ไม้หันอากาศ (ั) makes for สระ อะ. Example: เย็น (yen) = 'cool', เป็น (bpen) = 'to be'. It shortens the vowel; it does not change the tone rules. One common word breaks the pattern: ก็ (gaw) carries ็ with no final consonant at all and is simply learned as a word.",
		lesson: 7,
	},
	{
		id: "mai-taikhu-ae",
		title: "ไม้ไต่คู้ with สระ แอะ",
		description:
			"ไม้ไต่คู้ (็) shortens สระ แอะ exactly as it shortens สระ เอะ: when a final consonant follows, the สระ อะ is replaced by ็ above the initial consonant. Example: แข็ง (khaeng) = 'hard'. The แ stays in front, so only the อะ moves.",
		lesson: 8,
	},
	{
		id: "consonant-clusters",
		title: "Consonant Clusters",
		description:
			"Only three letters can form consonant clusters when they follow other consonants: ร, ล, and ว. This is a major difference from English which has many more cluster possibilities.",
		lesson: 10,
	},
	{
		id: "ao-ai-tone-exception",
		title: "สระ เอา and สระ ไอ Tone Exception",
		description:
			"Although สระ เอา (ao) and สระ ไอ/ใอ (ai) are short vowels, they count as long vowels / live syllable endings for tone determination purposes.",
		lesson: 10,
	},
	{
		id: "mai-yamok",
		title: "Mai Yamok (ไม้ยมก) ๆ",
		description:
			"The symbol ๆ indicates that the preceding word should be repeated. For example, ใครๆ (khrai-khrai) means 'anyone'.",
		lesson: 10,
	},
	{
		id: "o-ang-dual-role",
		title: "อ (aaw aang) Dual Role",
		description:
			"อ serves two purposes: (1) As a silent placeholder consonant for words that start with a vowel sound. (2) When following another consonant without a vowel, it acts as the vowel สระ ออ (aaw).",
		lesson: 11,
	},
	{
		id: "sara-uee-placeholder",
		title: "สระ อื Requires อ Placeholder",
		description:
			"When สระ อื (long uee) is not followed by a consonant, อ must be written after it as a placeholder. Example: มือ (muue) = hand.",
		lesson: 6,
	},
	{
		id: "gaaran",
		title: "การันต์ (Gaa-ran) Silent Marker",
		description:
			"A symbol written above a consonant to indicate it is silent. Used to preserve original spellings of loanwords. Example: สัตว์ (sat) = animal, where ว์ is silent.",
		lesson: 13,
	},
	{
		id: "akson-nam",
		title: "อักษรนำ (Leading Consonant Across Syllables)",
		description:
			"When a word starts with a lone consonant that has no vowel of its own, that consonant becomes its own short syllable with an unwritten 'a' — and if the next syllable starts with one of the single-class low consonants (ง ญ ณ น ม ย ร ล ว ฬ), the leading consonant also lends it its class. ขนาด is kha-NAAT: ข is high class, so the น is read as high class too, giving low tone rather than falling. Same idea as ห นำ, but across two syllables instead of inside one. It is a strong tendency rather than an absolute: สมาชิก is sa-MAA-chik, where the ม keeps its own low class.",
		lesson: 19,
	},
	{
		id: "hor-nam",
		title: "ห as Class-Changing Prefix (ห นำ)",
		description:
			"ห can be placed as a silent letter before a low class consonant to make it follow high class tone rules. This allows low class consonants to produce rising tone and low tone, which they cannot make on their own. Example: หมี (mii, rising tone) = bear.",
		lesson: 28,
	},
	{
		id: "sara-am-properties",
		title: "สระ อำ (sara am) Properties",
		description:
			"สระ อำ combines สระ อะ (a) + ม (m). It always forms a live syllable because of its built-in final ม sound. Any letters following it begin the next syllable.",
		lesson: 13,
	},
	{
		id: "ror-han",
		title: "ร หัน (Ror Han) Double ร",
		description:
			"When two ร letters appear side-by-side after an initial consonant with no final consonant, pronounce it as อัน (an). This special pattern is called ร หัน. Example: ธรรม (tham).",
		lesson: 26,
	},
	{
		id: "tone-mark-placement",
		title: "Tone Mark Placement Rules",
		description:
			"Tone marks go above the initial consonant. If a vowel is above the consonant, the tone mark goes above the vowel. For consonant clusters, the tone mark goes over the second consonant, but the class of the first consonant determines the tone. Tone marks override all spelling-based tone rules.",
		lesson: 29,
	},
	{
		id: "mai-tri-chattawa-middle-only",
		title: "Mai Tri and Mai Chattawa: Middle Class Only",
		description:
			"ไม้ตรี (mai tri) and ไม้จัตวา (mai chattawa) are only used with middle class consonants. They are never used with high or low class consonants.",
		lesson: 29,
	},
	{
		id: "unwritten-vowels",
		title: "Unwritten Vowels",
		description:
			"When two consonants appear with nothing between them, there is an unwritten สระ โอะ (short o) between them. Example: กฎ (got) = rule. With three consonants, สระ อะ appears after the first, สระ โอะ between the second and third.",
		lesson: 26,
	},
	{
		id: "obsolete-consonants",
		title: "Obsolete Consonants ฃ and ฅ",
		description:
			"ฃ (kho khuat) and ฅ (kho khon) are still counted in the 44-consonant alphabet but are not used in any modern Thai words.",
		lesson: 14,
	},
	{
		id: "tho-ro-s-sound",
		title: "ทร Makes S Sound",
		description:
			"The consonant pair ท + ร acts like ซ, making an S sound. Example: ทราย (saai) = sand.",
		lesson: 27,
	},
	{
		id: "silent-ro-clusters",
		title: "Silent ร in Clusters with จ, ซ, ศ, ส",
		description:
			"When ร forms consonant clusters with จ, ซ, ศ, or ส, the ร is silent. Example: จริง (jing) = real.",
		lesson: 27,
	},
	{
		id: "silent-o-before-yo",
		title: "Silent อ Before ย (4 Words)",
		description:
			"Placing silent อ before ย makes it act like a mid class consonant. Only 4 words use this: อย่า (yaa, don't), อยู่ (yuu, to stay), อย่าง (yaang, a type), อยาก (yaak, to want). Mnemonic: อย่าอยู่อย่างอยาก = Don't exist in a state of desire.",
		lesson: 28,
	},
];

// ============================================================================
// Consonants (organized by lesson introduction order)
// ============================================================================

const consonants: ThaiConsonant[] = [
	// === Lesson 1: ม, น ===
	ThaiConsonant.fromPlain({
		character: "ม",
		name: "ม ม้า",
		nameRomanized: "maaw máa",
		nameMeaning: "horse",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "m",
		finalSound: "m (live ending)",
		audioUrl: "/thai-script/audio/consonant-mo-ma.mp3",
		priority: 6,
		lesson: 1,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Two loops run down the left side, one directly beneath the other, and the right side falls as a plain stroke — a great grey horse reared up on the quay, both forelegs pawing the air one above the other, its straight tail hanging plumb behind.",
			soundCue:
				"Close your lips and hum m, unaspirated and level: the idling drone of the harbor itself.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "น",
		name: "น หนู",
		nameRomanized: "naaw nǔu",
		nameMeaning: "mouse/rat",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "n",
		finalSound: "n (live ending)",
		audioUrl: "/thai-script/audio/consonant-no-nu.mp3",
		priority: 1,
		lesson: 1,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"The same loop high on the left, but the second is thrown across to the bottom right — a fat harbour mouse swinging from a mooring rope by one paw, its tail flung out low and wide to the other side. Where ม's horse rears with both legs stacked, the mouse hangs high and kicks low.",
			soundCue:
				"Hum n at the tooth-ridge, easy and unaspirated — a mouse nibbling nnn along the mooring line.",
		},
	}),

	// === Lesson 2: ง, ย, ว ===
	ThaiConsonant.fromPlain({
		character: "ง",
		name: "ง งู",
		nameRomanized: "ngaaw nguu",
		nameMeaning: "snake",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "ng (like end of 'sing')",
		finalSound: "ng (live ending)",
		audioUrl: "/thai-script/audio/consonant-ngo-ngu.mp3",
		priority: 5,
		lesson: 2,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A snake lifts its round head out of the water, body swerving away along the harbor's edge.",
			soundCue:
				"The ng that closes singing, moved to the front of the syllable — a hum from the nose, so it moors low.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ย",
		name: "ย ยักษ์",
		nameRomanized: "yaaw yák",
		nameMeaning: "giant",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "y (like Y in 'yes')",
		finalSound: "i (blends with vowel, like Y in 'boy')",
		audioUrl: "/thai-script/audio/consonant-yo-yak.mp3",
		priority: 7,
		lesson: 2,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Two bumps stacked on one flank — no other letter carries that pair — a giant's chin and belly wading past the pier.",
			soundCue:
				"A gliding y, hummed rather than hissed; the giant yawns yyy over the moored boats.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ว",
		name: "ว แหวน",
		nameRomanized: "waaw wǎaen",
		nameMeaning: "ring",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "w (like W in 'water')",
		finalSound: "o (blends with vowel, adds slight 'o' sound)",
		audioUrl: "/thai-script/audio/consonant-wo-weng.mp3",
		priority: 8,
		lesson: 2,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"One stroke closing into a single ring — a life-ring hung on its nail by the harbor steps.",
			soundCue:
				"Round your lips into w and let it hum; at a syllable's tail it melts into an o-glide.",
		},
	}),

	// === Lesson 3: ก, ด, บ (Mid class consonants with dead endings) ===
	ThaiConsonant.fromPlain({
		character: "ก",
		name: "ก ไก่",
		nameRomanized: "gaaw gài",
		nameMeaning: "chicken",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "g (hard G, unaspirated K)",
		finalSound: "K-stop (close off air at back of throat)",
		audioUrl: "/thai-script/audio/consonant-ko-kai.mp3",
		priority: 4,
		lesson: 3,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"A headless open frame — no circle anywhere, only a beak-line arching leftward — a hen pecking between market stalls.",
			soundCue:
				"A bare g with no puff and no buzz, the market's flat cluck; at a syllable's tail it snaps shut into a k-stop.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ด",
		name: "ด เด็ก",
		nameRomanized: "daaw dèk",
		nameMeaning: "child",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "d (like D in 'diamond')",
		finalSound: "T-stop (tongue touches near teeth, no air released)",
		audioUrl: "/thai-script/audio/consonant-do-dek.mp3",
		priority: 10,
		lesson: 3,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"A round bowl with a smooth rim, its head curled clockwise inside, the bottom drawn down to a point — a small child curled up asleep inside a market bowl, one arm tucked in, toes pointing out of the bottom.",
			soundCue:
				"A plain flat d with no breath riding it; at a syllable's tail the tongue seals it into a t-stop.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "บ",
		name: "บ ใบไม้",
		nameRomanized: "baaw bai-mái",
		nameMeaning: "leaf",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "b (like B in 'bucket')",
		finalSound: "P-stop (close lips, no air released)",
		audioUrl: "/thai-script/audio/consonant-bo-baimai.mp3",
		priority: 14,
		lesson: 3,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"An open basket with both walls stopping level at the rim — and one enormous glossy leaf growing straight up out of it, bigger than the stall it stands in, shading the whole market row.",
			soundCue:
				"A plain flat b, nothing breathy about it; at a syllable's tail the lips seal on a p-stop and hold.",
		},
	}),

	// === Lesson 4: ช, ซ ===
	ThaiConsonant.fromPlain({
		character: "ช",
		name: "ช ช้าง",
		nameRomanized: "chaaw cháang",
		nameMeaning: "elephant",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ch (like CH in 'China')",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-cho-chang.mp3",
		priority: 21,
		lesson: 4,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"The climbing stroke runs smooth and unbroken, and a tail flicks up past the top line — an elephant at the harbor hosing down its own back.",
			soundCue:
				"Ch ridden by a burst of breath — yet it moors low at the harbor, not up at the temple.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ซ",
		name: "ซ โซ่",
		nameRomanized: "saaw sôo",
		nameMeaning: "chain",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "s (like S in 'sun')",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-so-so.mp3",
		priority: 31,
		lesson: 4,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ช, but a notch dents the climbing stroke — one link of chain snagged in it — with the same tail above.",
			soundCue:
				"A plain hiss of s with no breath-burst: the low-berthed s, kept at the harbor while the temple keeps its own three.",
		},
	}),

	// === Lesson 5: พ, ฟ ===
	ThaiConsonant.fromPlain({
		character: "พ",
		name: "พ พาน",
		nameRomanized: "phaaw phaan",
		nameMeaning: "offering tray",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ph (aspirated P, like P in 'panda')",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-pho-phan.mp3",
		priority: 18,
		lesson: 5,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Three prongs in a row, every tip stopping level, the head curled outside the left rim — an offering tray set flat on a harbor crate.",
			soundCue:
				"P pushed out on a breath — ph — yet berthed low at the harbor.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฟ",
		name: "ฟ ฟัน",
		nameRomanized: "faaw fan",
		nameMeaning: "tooth",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "f (like F in 'family')",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-fo-fan.mp3",
		priority: 27,
		lesson: 5,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like พ — head outside — but the final stroke rises higher than the rest, one tooth outgrowing the row.",
			soundCue:
				"F, breath brushing the teeth: the harbor's f, low where its temple twin sits high.",
		},
	}),

	// === Lesson 6: ค ===
	ThaiConsonant.fromPlain({
		character: "ค",
		name: "ค ควาย",
		nameRomanized: "khaaw khwaai",
		nameMeaning: "water buffalo",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "kh (like K in 'kite' or C in 'cup')",
		finalSound: "K-stop",
		audioUrl: "/thai-script/audio/consonant-kho-khwai.mp3",
		priority: 16,
		lesson: 6,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A rounded body whose head curls counter-clockwise, tucked inside the bowl — a buffalo wallowing in harbor mud. ด turns its head clockwise; ค turns it the other way.",
			soundCue:
				"Kh — k on a gust of breath — yet it wallows low; its high twin ข chants up at the temple.",
		},
	}),

	// === Lesson 7: ท, ฮ ===
	ThaiConsonant.fromPlain({
		character: "ท",
		name: "ท ทหาร",
		nameRomanized: "thaaw thá-hǎan",
		nameMeaning: "soldier",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (aspirated T, like T in 'top' with puff of air)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-thahan.mp3",
		priority: 15,
		lesson: 7,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A head curls in, the back climbs straight, then an arch marches down — a soldier pacing the harbor bridge.",
			soundCue:
				"T carried out on a breath — th — pacing low along the waterfront.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฮ",
		name: "ฮ นกฮูก",
		nameRomanized: "haaw nók-hûuk",
		nameMeaning: "owl",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "h (like H in 'hoot')",
		finalSound: "not used as final consonant",
		audioUrl: "/thai-script/audio/consonant-ho-nokhu.mp3",
		priority: 35,
		lesson: 7,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like อ, but wearing a zigzag crest — an owl's ear-tufts over one round eye, blinking at the night harbor.",
			soundCue:
				"A breathed h — the owl's hoo across the water; the one h berthed at the harbor while ห keeps the temple.",
		},
	}),

	// === Lesson 8: ร, ล ===
	ThaiConsonant.fromPlain({
		character: "ร",
		name: "ร เรือ",
		nameRomanized: "raaw ruuea",
		nameMeaning: "boat",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "r (trilled R, like double R in 'burrito')",
		finalSound: "n (same as น, live ending)",
		audioUrl: "/thai-script/audio/consonant-ro-ria.mp3",
		priority: 2,
		lesson: 8,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A head sits low at the waterline while a pennant-line flies up and hooks over — a boat's prow flying its flag.",
			soundCue:
				"A rolled r, the outboard motor turning over; at a syllable's tail it flattens out into n.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ล",
		name: "ล ลิง",
		nameRomanized: "laaw ling",
		nameMeaning: "monkey",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "l (like L in 'little')",
		finalSound: "n (same as ร final, live ending)",
		audioUrl: "/thai-script/audio/consonant-lo-ling.mp3",
		priority: 9,
		lesson: 8,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A head at the base with a long tail arching right over its back — a monkey crouched on a harbor post.",
			soundCue:
				"L lapped off the tongue-ridge, humming low; at the tail of a syllable it too lands as n.",
		},
	}),

	// === Lesson 9: จ, ต, ป (Mid class) ===
	ThaiConsonant.fromPlain({
		character: "จ",
		name: "จ จาน",
		nameRomanized: "jaaw jaan",
		nameMeaning: "plate/dish",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "j (like J in 'jump')",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-jo-jan.mp3",
		priority: 19,
		lesson: 9,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"A hook curving up and over from a mid-height head — a plate spun on one finger at the noodle stall.",
			soundCue:
				"An unpuffed j, halfway toward ch — the market's plain j; its tail seals as a t-stop.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ต",
		name: "ต เต่า",
		nameRomanized: "dtaaw dtào",
		nameMeaning: "turtle",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "dt (between D and T, unaspirated T)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-to-tau.mp3",
		priority: 12,
		lesson: 9,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"Like ด, but the rim is notched — a dent in the shell where the turtle tucked its head in.",
			soundCue:
				"Dt — press d and t into one flat sound with no breath riding out.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ป",
		name: "ป ปลา",
		nameRomanized: "bpaaw bplaa",
		nameMeaning: "fish",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "bp (between B and P, unaspirated P)",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-po-pla.mp3",
		priority: 17,
		lesson: 9,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"Like บ, but the right wall rises higher than the rim — a fish jumping clear of the market basket.",
			soundCue:
				"Bp — b and p pressed into one flat sound, no puff; the fish slaps back down bp.",
		},
	}),

	// === Lesson 11: อ (Mid class, silent initial) ===
	ThaiConsonant.fromPlain({
		character: "อ",
		name: "อ อ่าง",
		nameRomanized: "aaw àang",
		nameMeaning: "basin",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "silent (placeholder for vowel-initial words)",
		finalSound: "acts as vowel สระ ออ (aaw)",
		audioUrl: "/thai-script/audio/consonant-o-ang.mp3",
		priority: 3,
		lesson: 11,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"A plain ring standing open — an empty basin in the middle of the market row.",
			soundCue:
				"Silent at the front: it minds the stall for words that open on a vowel. Set after a consonant instead, it becomes the long vowel aaw.",
		},
	}),

	// === Lesson 12: ข, ฉ (High class) ===
	ThaiConsonant.fromPlain({
		character: "ข",
		name: "ข ไข่",
		nameRomanized: "khǎaw khài",
		nameMeaning: "egg",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "kh (same sound as ค, but high class)",
		finalSound: "K-stop",
		audioUrl: "/thai-script/audio/consonant-kho-khay.mp3",
		priority: 20,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like ช stripped of its tail — nothing rises past the top line — an egg resting in the temple's alms bowl.",
			soundCue:
				"Kh, a k wrapped in soft breath — the temple's hush; first face of the eleven that must be learned by sight.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฉ",
		name: "ฉ ฉิ่ง",
		nameRomanized: "chǎaw chìng",
		nameMeaning: "cymbals",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ch (same sound as ช, but high class)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-cho-ching.mp3",
		priority: 32,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"A stubby น-profile wearing a flicked tail on top — finger-cymbals held up mid-chime on the temple step.",
			soundCue:
				"Ch on a breath, shimmering — the cymbal's hiss under the eaves; second face of the temple's eleven.",
		},
	}),

	// === Lessons 13 and 12: ศ, ษ (13), ส (12) — high class, all make 's' sound ===
	ThaiConsonant.fromPlain({
		character: "ศ",
		name: "ศ ศาลา",
		nameRomanized: "sǎaw sǎa-laa",
		nameMeaning: "pavilion",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "s",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-so-sala.mp3",
		priority: 24,
		lesson: 13,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like ค, but with an extra flag-stroke planted on the roof — a pavilion flying its pennant on the temple grounds.",
			soundCue:
				"S — wind hissing through the open pavilion; the first of the temple's three s-letters.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ษ",
		name: "ษ ฤๅษี",
		nameRomanized: "sǎaw ruue-sǐi",
		nameMeaning: "hermit",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "s",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-so-risi.mp3",
		priority: 28,
		lesson: 13,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like บ, but crossed with an extra line — the hermit's staff laid across the basket he carries up to the temple.",
			soundCue:
				"S — the second temple s, whispered through the hermit's beard.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ส",
		name: "ส เสือ",
		nameRomanized: "sǎaw sǔuea",
		nameMeaning: "tiger",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "s",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-so-sia.mp3",
		priority: 11,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like ล, but crossed with an extra line — a tiger behind the temple gate, one bar across its arched tail.",
			soundCue:
				"S — the everyday s of Thai text, hissed at the gate; third and busiest of the temple's s-letters.",
		},
	}),

	// === Lesson 12 (continued): ผ, ฝ (High class) ===
	ThaiConsonant.fromPlain({
		character: "ผ",
		name: "ผ ผึ้ง",
		nameRomanized: "phǎaw phûeng",
		nameMeaning: "bee",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ph (like P in 'pig')",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-pho-phing.mp3",
		priority: 22,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like พ in outline, but the head curls inside the left rim — a bee tucked head-first into a temple lotus.",
			soundCue:
				"P on a puff of breath — ph — fanned upward by wings on the temple steps.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฝ",
		name: "ฝ ฝา",
		nameRomanized: "fǎaw fǎa",
		nameMeaning: "lid/cover",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "f (like F in 'fan')",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-fo-fa.mp3",
		priority: 33,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"The head stays inside the rim and the last stroke stands tall — a lidded jar on the temple shelf, its knob turned inward.",
			soundCue:
				"F — breath brushed past the jar's lip; temple air, so plain syllables drift upward.",
		},
	}),

	// === Lesson 12 (continued): ห (High class) ===
	ThaiConsonant.fromPlain({
		character: "ห",
		name: "ห หีบ",
		nameRomanized: "hǎaw hìip",
		nameMeaning: "chest/trunk",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "h (like H in 'Hello')",
		finalSound: "not used as final consonant",
		audioUrl: "/thai-script/audio/consonant-ho-hip.mp3",
		priority: 13,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"The left stroke kinks where ท drops straight, then a loop and a tall right wall — a carved chest set against the temple wall.",
			soundCue:
				"H — pure breath, the temple's own hush. Stood silent before a humming letter, it lifts that letter into temple tone rules.",
		},
	}),

	// === Lesson 13 (continued): ภ, ธ, ณ, ญ (Low class) ===
	ThaiConsonant.fromPlain({
		character: "ภ",
		name: "ภ สำเภา",
		nameRomanized: "phaaw sǎm-phao",
		nameMeaning: "Chinese junk ship",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ph (like P in 'pink')",
		finalSound: "P-stop",
		audioUrl: "/thai-script/audio/consonant-pho-samphau.mp3",
		priority: 26,
		lesson: 13,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ก, but a head hangs outside the frame, off the left leg — a junk with its anchor swung out over the port side.",
			soundCue:
				"Another breathy ph riding low — the heavy freighter ph of the harbor.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ธ",
		name: "ธ ธง",
		nameRomanized: "thaaw thong",
		nameMeaning: "flag",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (aspirated T, like T in 'tennis')",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-thong.mp3",
		priority: 29,
		lesson: 13,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ร, but the open top closes into a loop with a crossbar through it — a flag knotted shut on its line above the quay.",
			soundCue:
				"A breathy th flying low — the flag snaps th-th in the harbor wind.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ณ",
		name: "ณ เณร",
		nameRomanized: "naaw neen",
		nameMeaning: "novice monk",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "n (same as น)",
		finalSound: "n (live ending)",
		audioUrl: "/thai-script/audio/consonant-no-nen.mp3",
		priority: 25,
		lesson: 13,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like น, but a whole ก-frame opens first, the loop arriving only at the end — the novice walking ahead of the mouse down the pier.",
			soundCue:
				"An n your ear cannot tell from น — a second n humming at the harbor.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ญ",
		name: "ญ หญิง",
		nameRomanized: "yaaw yǐng",
		nameMeaning: "woman/female",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "y (same as ย)",
		finalSound: "n",
		audioUrl: "/thai-script/audio/consonant-yo-ying.mp3",
		priority: 30,
		lesson: 13,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A frame flowing up to the right with a detached curl floating free underneath — a tall woman striding the harbour wall, her long hair streaming out behind her, one loose ringlet drifting down below the hem of her skirt.",
			soundCue:
				"A second gliding y, humming low; doubled inside a word it closes one syllable and opens the next.",
		},
	}),

	// === Lessons 12 and 14: ถ, ฐ, ฎ, ฏ ===
	ThaiConsonant.fromPlain({
		character: "ถ",
		name: "ถ ถุง",
		nameRomanized: "thǎaw thǔng",
		nameMeaning: "bag/sack",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (like T in 'top')",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-thung.mp3",
		priority: 23,
		lesson: 12,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like ก, but a head coils inside the near end of the frame — fruit sitting inside the cloth bag brought for the monks.",
			soundCue:
				"T breathed open — th — the bag sighing as it is set down at the temple.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฐ",
		name: "ฐ ฐาน",
		nameRomanized: "thǎaw thǎan",
		nameMeaning: "base/platform",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (same as ถ)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-than.mp3",
		priority: 34,
		lesson: 14,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"An upper จ-like curve floating over a separate footed base, head and curl beneath — the pedestal an image stands on in the temple hall.",
			soundCue:
				"The same breathed th, raised on a pedestal — grand spellings favour it.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฎ",
		name: "ฎ ชฎา",
		nameRomanized: "daaw chá-daa",
		nameMeaning: "pointed crown/headdress",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "d (same as ด)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-do-chada.mp3",
		priority: 36,
		lesson: 14,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"ด in regalia: the pointed bowl again, but its base line runs smooth into a loop hung below — a crown on its cushion at the silversmith's stall.",
			soundCue:
				"A plain d to the ear, twin of ด — kept for royal and Pali spellings, still flat, still mid.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฏ",
		name: "ฏ ปฏัก",
		nameRomanized: "dtaaw bpà-dtàk",
		nameMeaning: "spear/goad",
		classType: ThaiSymbolClass.Mid,
		hasDeadEnding: true,
		isAspirated: false,
		initialSound: "dt (same as ต)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-to-patak.mp3",
		priority: 37,
		lesson: 14,
		sceneMnemonic: {
			district: "market",
			shapeCue:
				"Like ฎ, but a bump is worked into the base line before the loop — the knuckle on the goad's shaft.",
			soundCue:
				"A flat unpuffed dt sharing duty with ต — rare, royal, and still market-plain.",
		},
	}),

	// === Lesson 14 (continued): ฑ, ฒ ===
	ThaiConsonant.fromPlain({
		character: "ฑ",
		name: "ฑ มณโฑ",
		nameRomanized: "thaaw mon-thoo",
		nameMeaning: "Montho (literary character)",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (usually same as ท, sometimes d)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-montho.mp3",
		priority: 40,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ท, but a bump swells just after the head, before the upright — Queen Montho herself on the quay in her tall gilded crown, shoulders squared where the soldier's back climbs straight.",
			soundCue:
				"The breathy th of ท again — a palace name paying a rare call at the harbor.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฒ",
		name: "ฒ ผู้เฒ่า",
		nameRomanized: "thaaw phûu-thâo",
		nameMeaning: "elder/old man",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "th (same as ฑ and ท)",
		finalSound: "T-stop",
		audioUrl: "/thai-script/audio/consonant-tho-phuthau.mp3",
		priority: 41,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Opens as ต's notched bowl and closes into ม's shouldered loop — an elder stooped over two canes on the quay.",
			soundCue:
				"A breathy th, rare and unhurried — the elder's soft th, low by the water.",
		},
	}),

	// === Lesson 14 (continued): ฬ, ฆ ===
	ThaiConsonant.fromPlain({
		character: "ฬ",
		name: "ฬ จุฬา",
		nameRomanized: "laaw jù-laa",
		nameMeaning: "star-shaped kite",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: false,
		isAspirated: false,
		initialSound: "l (same as ล)",
		finalSound: "n (live ending)",
		audioUrl: "/thai-script/audio/consonant-lo-jula.mp3",
		priority: 38,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like พ, but the last stroke coils on into an extra curled tail — a star kite's tail snapping above the masts.",
			soundCue:
				"A second l, flown high on its kite string yet berthed low at the harbor.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฆ",
		name: "ฆ ระฆัง",
		nameRomanized: "khaaw rá-khang",
		nameMeaning: "bell",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "kh (same as ค and ข)",
		finalSound: "K-stop",
		audioUrl: "/thai-script/audio/consonant-kho-rakhang.mp3",
		priority: 39,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ม, but an extra bumped curve swells in after the head — a ship's bell slung beside the mooring rope.",
			soundCue:
				"A breathy kh in harbor bronze — strike it and the note hums away low.",
		},
	}),

	// === Lesson 14 (continued): ฃ, ฅ (Obsolete) and ฌ ===
	ThaiConsonant.fromPlain({
		character: "ฃ",
		name: "ฃ ขวด",
		nameRomanized: "khǎaw khùat",
		nameMeaning: "bottle",
		classType: ThaiSymbolClass.High,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "kh (same as ข)",
		finalSound: "K-stop",
		priority: 42,
		lesson: 14,
		sceneMnemonic: {
			district: "temple",
			shapeCue:
				"Like ข, but a notch cut into the top stroke — a bottle with a chipped rim, shelved in the temple storeroom.",
			soundCue:
				"A breathy kh no modern word still spells — everything it once held now pours from ข.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฅ",
		name: "ฅ คน",
		nameRomanized: "khaaw khon",
		nameMeaning: "person",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "kh (same as ค)",
		finalSound: "K-stop",
		priority: 43,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"Like ค, but a notch cut into the top stroke — a retired stevedore in a dented cap, sitting out the day at the harbor.",
			soundCue:
				"A breathy kh retired from every modern spelling — the word for person sailed on with ค.",
		},
	}),
	ThaiConsonant.fromPlain({
		character: "ฌ",
		name: "ฌ เฌอ",
		nameRomanized: "chaaw chooe",
		nameMeaning: "tree",
		classType: ThaiSymbolClass.Low,
		hasDeadEnding: true,
		isAspirated: true,
		initialSound: "ch (same as ช)",
		finalSound: "T-stop",
		priority: 44,
		lesson: 14,
		sceneMnemonic: {
			district: "harbor",
			shapeCue:
				"A low arch first, then the taller ช-style stroke with its flicked tail — a sapling planted beside its stake at the harbor wall.",
			soundCue:
				"A breathy ch surviving in a handful of borrowed spellings — เฌอ itself is an old word for tree.",
		},
	}),
];

// ============================================================================
// Vowels (organized by lesson introduction order)
// ============================================================================

const vowels: ThaiVowel[] = [
	// === Lesson 1 ===
	ThaiVowel.fromPlain({
		character: "า",
		name: "sara aa",
		length: "long",
		sound: "aa (like A in 'father')",
		position: "right",
		audioUrl: "/thai-script/audio/sara-a-long.mp3",
		priority: 1,
		lesson: 1,
		sceneMnemonic: {
			shapeCue:
				"A post planted to the right of its consonant, its top curling over like a shepherd's crook.",
			soundCue:
				"An open aa held long — the doctor's say-aah drawn all the way out.",
		},
	}),

	// === Lesson 3 ===
	ThaiVowel.fromPlain({
		character: " ี",
		name: "sara ii",
		length: "long",
		sound: "ii (like EE in 'green')",
		position: "above",
		audioUrl: "/thai-script/audio/sara-i-long.mp3",
		priority: 2,
		lesson: 3,
		sceneMnemonic: {
			shapeCue:
				"Sits above its host like a beret, the brim flicking up at the right edge.",
			soundCue: "A long squeezed ii — string it out through a smile.",
		},
	}),

	// === Lesson 4 ===
	ThaiVowel.fromPlain({
		character: "ะ",
		name: "sara a",
		length: "short",
		sound: "a (like A in 'hat')",
		position: "right",
		audioUrl: "/thai-script/audio/sara-a-short.mp3",
		priority: 3,
		lesson: 4,
		sceneMnemonic: {
			shapeCue:
				"Two small hooks stacked after their consonant, one riding over the other — the spelling a syllable ends on.",
			soundCue: "A clipped a, cut off almost as soon as it starts.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "ั",
		name: "mai han akat",
		length: "short",
		sound: "a (short a, used when sara a has a following consonant)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-a-short.mp3",
		priority: 4,
		lesson: 4,
		sceneMnemonic: {
			shapeCue:
				"A single curl riding above, bridging initial and final — the stand-in ะ sends up when a final consonant arrives.",
			soundCue: "The same clipped a, now roofed over the syllable's middle.",
		},
	}),
	ThaiVowel.fromPlain({
		character: " ิ",
		name: "sara i",
		length: "short",
		sound: "i (like I in 'sit')",
		position: "above",
		audioUrl: "/thai-script/audio/sara-i-short.mp3",
		priority: 5,
		lesson: 4,
		sceneMnemonic: {
			shapeCue:
				"The ี beret without its upright flick — just the brim resting above.",
			soundCue: "A quick i, in and out before it settles.",
		},
	}),

	// === Lesson 5 ===
	ThaiVowel.fromPlain({
		character: "ุ",
		name: "sara u",
		length: "short",
		sound: "u (like OO in 'put')",
		position: "below",
		audioUrl: "/thai-script/audio/sara-u-short.mp3",
		priority: 6,
		lesson: 5,
		sceneMnemonic: {
			shapeCue: "A small hook hanging below the floor of its host letter.",
			soundCue: "A short u, lips rounded for just a beat.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "ู",
		name: "sara uu",
		length: "long",
		sound: "uu (like OO in 'boot')",
		position: "below",
		audioUrl: "/thai-script/audio/sara-u-long.mp3",
		priority: 7,
		lesson: 5,
		sceneMnemonic: {
			shapeCue: "The under-hook doubled into a deeper ladle below the letter.",
			soundCue: "A long uu — a wolf's howl held low and round.",
		},
	}),

	// === Lesson 6 ===
	ThaiVowel.fromPlain({
		character: " ึ",
		name: "sara ue",
		length: "short",
		sound:
			"ue (no English equivalent -- try making 'uu' with lips spread wide)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-eu-short.mp3",
		priority: 8,
		lesson: 6,
		sceneMnemonic: {
			shapeCue: "The ิ brim with a tiny ring balanced on its top.",
			soundCue:
				"Grin first, then push a short u through the grin — English never does.",
		},
	}),
	ThaiVowel.fromPlain({
		character: " ื",
		name: "sara uee",
		length: "long",
		sound: "uee (long version of sara ue -- like German 'über')",
		position: "above",
		audioUrl: "/thai-script/audio/sara-eu-long.mp3",
		priority: 9,
		lesson: 6,
		sceneMnemonic: {
			shapeCue: "The ี beret with a second upright pinned beside the first.",
			soundCue:
				"The grin-vowel held long; with nothing following, อ must stand behind it as a prop.",
		},
	}),

	// === Lesson 7 ===
	ThaiVowel.fromPlain({
		character: "เ",
		name: "sara ee",
		length: "long",
		sound: "ee (like EY in British 'grey')",
		position: "left",
		audioUrl: "/thai-script/audio/sara-e-long.mp3",
		priority: 10,
		lesson: 7,
		sceneMnemonic: {
			shapeCue:
				"A single mast raised ahead of its consonant — written first, sounded after.",
			soundCue: "A steady long ee, the vowel of a level gaze.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "เ-ะ",
		name: "sara e",
		length: "short",
		sound: "e (like E in 'red')",
		position: "around",
		audioUrl: "/thai-script/audio/sara-e-short.mp3",
		priority: 11,
		lesson: 7,
		sceneMnemonic: {
			shapeCue:
				"The mast in front plus the two stacked hooks behind; when a final consonant joins, the hooks give way to a small ็ roof on top.",
			soundCue: "A short e, snipped at the end.",
		},
	}),

	ThaiVowel.fromPlain({
		character: "็",
		name: "mai taikhu",
		length: "short",
		sound: "e (short e, used when sara e has a following consonant)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-e-short.mp3",
		priority: 12,
		lesson: 7,
		sceneMnemonic: {
			shapeCue:
				"A small roof set on the consonant, drawn like a tiny ๘. It turns up only when a final consonant crowds the vowel out of its place behind — the same swap ไม้หันอากาศ makes for สระ อะ.",
			soundCue:
				"It has no sound of its own. It cuts the vowel underneath it short, and ก็ is the one word that wears it with nothing following.",
		},
	}),

	// === Lesson 8 ===
	ThaiVowel.fromPlain({
		character: "แ",
		name: "sara aae",
		length: "long",
		sound: "ae (like A in 'cat', long)",
		position: "left",
		audioUrl: "/thai-script/audio/sara-ae-long.mp3",
		priority: 13,
		lesson: 8,
		sceneMnemonic: {
			shapeCue: "Twin masts raised side by side before the consonant.",
			soundCue: "A long flat ae — a goat's bleat stretched out.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "แ-ะ",
		name: "sara ae",
		length: "short",
		sound: "ae (like A in 'cat', short)",
		position: "around",
		audioUrl: "/thai-script/audio/sara-ae-short.mp3",
		priority: 14,
		lesson: 8,
		sceneMnemonic: {
			shapeCue:
				"The twin masts with the stacked hooks after — the short spelling of the bleat.",
			soundCue: "The same ae, clipped short.",
		},
	}),

	// === Lesson 9 ===
	ThaiVowel.fromPlain({
		character: "โ",
		name: "sara oo",
		length: "long",
		sound: "oo (like O in 'go', long)",
		position: "left",
		audioUrl: "/thai-script/audio/sara-o-long.mp3",
		priority: 15,
		lesson: 9,
		sceneMnemonic: {
			shapeCue:
				"A mast whose tip loops once and leans forward over the letter.",
			soundCue: "A long round oo, the mouth a full circle.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "โ-ะ",
		name: "sara o",
		length: "short",
		sound: "o (like O in 'go', short)",
		position: "around",
		audioUrl: "/thai-script/audio/sara-o-short.mp3",
		priority: 16,
		lesson: 9,
		sceneMnemonic: {
			shapeCue:
				"The looped mast plus the stacked hooks — and between two bare consonants this vowel is written with nothing at all.",
			soundCue: "A short round o, swallowed early.",
		},
	}),

	// === Lesson 10 ===
	ThaiVowel.fromPlain({
		character: "เ-า",
		name: "sara ao",
		length: "short",
		sound: "ao (like OW in 'how')",
		position: "around",
		audioUrl: "/thai-script/audio/sara-au.mp3",
		priority: 17,
		lesson: 10,
		sceneMnemonic: {
			shapeCue:
				"A mast before and the า post after — the pair bracketing the consonant.",
			soundCue:
				"Ao, a yelp of surprise — short to say, yet it counts long when tones are decided.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "ไ",
		name: "sara ai mai malaai",
		length: "short",
		sound: "ai (like I in 'Hi')",
		position: "left",
		audioUrl: "/thai-script/audio/sara-ay-may-malay.mp3",
		priority: 18,
		lesson: 10,
		sceneMnemonic: {
			shapeCue:
				"A mast whose top breaks into a zigzag — the everyday spelling of ai.",
			soundCue:
				"Ai, the English pronoun I; short, but the syllable it makes stays live.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "ใ",
		name: "sara ai mai muuan",
		length: "short",
		sound: "ai (same sound as ไ)",
		position: "left",
		audioUrl: "/thai-script/audio/sara-ay-may-muan.mp3",
		priority: 19,
		lesson: 10,
		sceneMnemonic: {
			shapeCue:
				"A mast whose top rolls into a curl — ไ's rarer twin, reserved for a short closed list of words.",
			soundCue: "The same ai — the spelling changes, the sound does not.",
		},
	}),

	// === Lesson 11 ===
	ThaiVowel.fromPlain({
		character: "อ (as vowel)",
		name: "sara aaw",
		length: "long",
		sound: "aaw (like AW in 'saw')",
		position: "right",
		audioUrl: "/thai-script/audio/sara-aw-long.mp3",
		priority: 20,
		lesson: 11,
		sceneMnemonic: {
			shapeCue:
				"The basin ring standing after another consonant, serving as its vowel.",
			soundCue: "A long aw — a yawn with the jaw fully dropped.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "เ-าะ",
		name: "sara aw",
		length: "short",
		sound: "aw (short version of สระ ออ)",
		position: "around",
		audioUrl: "/thai-script/audio/sara-aw-short.mp3",
		priority: 21,
		lesson: 11,
		sceneMnemonic: {
			shapeCue:
				"Mast in front, then the า post and the stacked hooks — three pieces wrapping one short syllable.",
			soundCue: "A clipped aw, gone before the yawn can open.",
		},
	}),

	// === Lesson 12 ===
	ThaiVowel.fromPlain({
		character: "เ-ีย",
		name: "sara iia",
		length: "long",
		sound: "iia (like IA in 'Mamma Mia')",
		position: "left-above-right",
		audioUrl: "/thai-script/audio/sara-ia-long.mp3",
		priority: 22,
		lesson: 12,
		sceneMnemonic: {
			shapeCue:
				"Mast in front, beret above, and ย standing after — three stations around one consonant.",
			soundCue: "Ee sliding down into ya — one long glide.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "เ-ียะ",
		name: "sara ia",
		length: "short",
		sound: "ia (short version of sara iia)",
		position: "left-above-right",
		audioUrl: "/thai-script/audio/sara-ia-short.mp3",
		priority: 23,
		lesson: 12,
		sceneMnemonic: {
			shapeCue:
				"The same three stations with the stacked hooks added at the end.",
			soundCue: "The ee-ya glide snipped short.",
		},
	}),

	// === Lesson 13 ===
	ThaiVowel.fromPlain({
		character: "เ-อ",
		name: "sara ooe",
		length: "long",
		sound: "ooe (like ER in 'her' with relaxed throat)",
		position: "around",
		audioUrl: "/thai-script/audio/sara-uh-long.mp3",
		priority: 24,
		lesson: 13,
		sceneMnemonic: {
			shapeCue:
				"Mast in front and the basin ring after; when a final consonant joins, the ring gives way to a ิ brim above — except before ย, where nothing is written at all.",
			soundCue: "An er with no r in it, throat loose, held long.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "เ-อะ",
		name: "sara oe",
		length: "short",
		sound: "oe (short version of sara ooe)",
		position: "around",
		audioUrl: "/thai-script/audio/sara-uh-short.mp3",
		priority: 25,
		lesson: 13,
		sceneMnemonic: {
			shapeCue:
				"Mast, consonant, ring, then the stacked hooks — the short spelling of the loose-throat vowel; a final consonant swaps in the ิ brim.",
			soundCue: "The same r-less er, clipped.",
		},
	}),

	// === Lesson 14 ===
	ThaiVowel.fromPlain({
		character: "เ-ือ",
		name: "sara uuea",
		length: "long",
		sound: "uuea (combination of สระ อื + สระ อะ)",
		position: "left-above-right",
		audioUrl: "/thai-script/audio/sara-eua-long.mp3",
		priority: 26,
		lesson: 14,
		sceneMnemonic: {
			shapeCue:
				"Mast in front, the double-pinned ื above, and the ring after — a three-story spelling.",
			soundCue: "The grin-vowel gliding open into ah.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "เ-ือะ",
		name: "sara uea",
		length: "short",
		sound: "uea (short combination of สระ อื + สระ อะ)",
		position: "left-above-right",
		audioUrl: "/thai-script/audio/sara-eua-short.mp3",
		priority: 27,
		lesson: 14,
		sceneMnemonic: {
			shapeCue: "The three-story spelling with the stacked hooks appended.",
			soundCue: "The same opening glide, cut off short.",
		},
	}),

	// === Formerly lesson 15 — now lesson 14 ===
	ThaiVowel.fromPlain({
		character: "-ัว",
		name: "sara uua",
		length: "long",
		sound: "uua (combination of อู + อะ)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-ua-long.mp3",
		priority: 27,
		lesson: 14,
		sceneMnemonic: {
			shapeCue:
				"The lone curl above with ว standing after; when a final consonant joins, the curl vanishes and ว sits sandwiched between.",
			soundCue: "Oo swinging open into ah — one long swing.",
		},
	}),
	ThaiVowel.fromPlain({
		character: "-ัวะ",
		name: "sara ua",
		length: "short",
		sound: "ua (short combination of อู + อะ)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-ua-short.mp3",
		priority: 28,
		lesson: 14,
		sceneMnemonic: {
			shapeCue: "The curl, then ว, then the stacked hooks to close it off.",
			soundCue: "The oo-ah swing pulled up short.",
		},
	}),

	// === Formerly lesson 16 — now lesson 13 ===
	ThaiVowel.fromPlain({
		character: "ำ",
		name: "sara am",
		length: "short",
		sound: "am (built-in: สระ อะ + ม)",
		position: "above",
		audioUrl: "/thai-script/audio/sara-am.mp3",
		priority: 29,
		lesson: 13,
		sceneMnemonic: {
			shapeCue:
				"A small ring floating above with the า post right after — ring first, post second.",
			soundCue:
				"Am — the ม comes built in, so the syllable always ends humming and lives.",
		},
	}),
];

// ============================================================================
// Tone Marks (the consolidated tone-mark lesson)
// ============================================================================

const toneMarks: ThaiToneMark[] = [
	ThaiToneMark.fromPlain({
		character: "่",
		name: "mai ek",
		midClassTone: "low",
		highClassTone: "low",
		lowClassTone: "falling",
		audioUrl: "/thai-script/audio/tone-mayek.mp3",
		priority: 1,
		lesson: 29,
		sceneMnemonic: {
			shapeCue: "A single short stick above the letter — one stroke, mark one.",
			soundCue:
				"The voice steps down and lies flat along the floor of your range — though over a harbor letter the same stick tips into a fall; the class, not the mark, has the last word.",
			toneMotion: "low",
		},
	}),
	ThaiToneMark.fromPlain({
		character: "้",
		name: "mai tho",
		midClassTone: "falling",
		highClassTone: "falling",
		lowClassTone: "high",
		audioUrl: "/thai-script/audio/tone-maytho.mp3",
		priority: 2,
		lesson: 29,
		sceneMnemonic: {
			shapeCue: "A hooked flag above the letter — two bends, mark two.",
			soundCue:
				"The voice climbs its crest and tips over into a fall — over a harbor letter it parks high instead.",
			toneMotion: "falling",
		},
	}),
	ThaiToneMark.fromPlain({
		character: "๊",
		name: "mai tri",
		midClassTone: "high",
		highClassTone: null,
		lowClassTone: null,
		audioUrl: "/thai-script/audio/tone-maytri.mp3",
		priority: 3,
		lesson: 29,
		sceneMnemonic: {
			shapeCue:
				"A small kinked peak floating above — mark three, worn by market letters only.",
			soundCue:
				"The voice parks up high and stays there; it mostly rides borrowed words — menu Thai in particular.",
			toneMotion: "high",
		},
	}),
	ThaiToneMark.fromPlain({
		character: "๋",
		name: "mai chattawa",
		midClassTone: "rising",
		highClassTone: null,
		lowClassTone: null,
		audioUrl: "/thai-script/audio/tone-mayjattawa.mp3",
		priority: 4,
		lesson: 29,
		sceneMnemonic: {
			shapeCue:
				"A little cross floating above — four points, mark four, again market letters only.",
			soundCue:
				"The voice dips and then swings upward — the rarest ride in the tone system.",
			toneMotion: "rising",
		},
	}),
];

// ============================================================================
// Special Vowels (the rare tail, lesson 14)
// ============================================================================

export interface RareVowel {
	character: string;
	name: string;
	pronunciation: string;
	length: "short" | "long";
	lesson: number;
	notes: string;
}

export const rareVowels: RareVowel[] = [
	{
		character: "ฤ",
		name: "rue",
		pronunciation: "ร + สระ อึ (sometimes ร + สระ อิ)",
		length: "short",
		lesson: 14,
		notes:
			"Used in some common words like ฤดู (rue-duu, season) and อังกฤษ (ang-grit, English). Written like ถ with an extra long line.",
	},
	{
		character: "ฤๅ",
		name: "ruue",
		pronunciation: "ร + สระ อื",
		length: "long",
		lesson: 14,
		notes: "Rare. Like ฤ with what looks like สระ อา on its right side.",
	},
	{
		character: "ฦ",
		name: "lue",
		pronunciation: "ล + สระ อึ or สระ อื",
		length: "short",
		lesson: 14,
		notes:
			"Extremely rare in modern Thai. Part of the official 32 vowels due to Sanskrit origins.",
	},
	{
		character: "ฦๅ",
		name: "luue",
		pronunciation: "ล + สระ อื",
		length: "long",
		lesson: 14,
		notes: "Extremely rare. Like ฤๅ but head sticks out on the left side.",
	},
];

// ============================================================================
// Thai Numerals (the optional numerals lesson)
// ============================================================================

export interface ThaiNumeral {
	thai: string;
	arabic: number;
	word: string;
	romanization: string;
	lesson: number;
}

export const thaiNumerals: ThaiNumeral[] = [
	{ thai: "๐", arabic: 0, word: "ศูนย์", romanization: "suun", lesson: 30 },
	{ thai: "๑", arabic: 1, word: "หนึ่ง", romanization: "nueng", lesson: 30 },
	{ thai: "๒", arabic: 2, word: "สอง", romanization: "saawng", lesson: 30 },
	{ thai: "๓", arabic: 3, word: "สาม", romanization: "saam", lesson: 30 },
	{ thai: "๔", arabic: 4, word: "สี่", romanization: "sii", lesson: 30 },
	{ thai: "๕", arabic: 5, word: "ห้า", romanization: "haa", lesson: 30 },
	{ thai: "๖", arabic: 6, word: "หก", romanization: "hok", lesson: 30 },
	{ thai: "๗", arabic: 7, word: "เจ็ด", romanization: "jet", lesson: 30 },
	{ thai: "๘", arabic: 8, word: "แปด", romanization: "bpaaet", lesson: 30 },
	{ thai: "๙", arabic: 9, word: "เก้า", romanization: "gao", lesson: 30 },
];

// ============================================================================
// Combined alphabet for lookup
// ============================================================================

const alphabet: ThaiSymbol[] = [...consonants, ...vowels, ...toneMarks];

const characterMap: Map<string, ThaiSymbol> = new Map(
	alphabet.map((symbol) => [symbol.character, symbol]),
);

export function getThaiSymbol(character: string): ThaiSymbol | undefined {
	return characterMap.get(character);
}

export function getConsonant(character: string): ThaiConsonant | undefined {
	return consonants.find((c) => c.character === character);
}

export function getConsonantsByLesson(lesson: number): ThaiConsonant[] {
	return consonants.filter((c) => c.lesson === lesson);
}

export function getVowelsByLesson(lesson: number): ThaiVowel[] {
	return vowels.filter((v) => v.lesson === lesson);
}

export function getSymbolsByLesson(lesson: number): ThaiSymbol[] {
	return alphabet.filter((s) => s.lesson === lesson);
}

export function getToneRulesByLesson(lesson: number): ToneRule[] {
	return toneRules.filter((r) => r.lesson === lesson);
}

// ============================================================================
// Practice Words (organized by lesson)
// ============================================================================

export const words: ThaiWord[] = [
	// === Lesson 1 ===
	ThaiWord.fromPlain({
		name: "มา",
		romanization: "maa",
		meaning: "to come",
		tone: "mid",
		toneRule: "Low class ม + live ending (long vowel า) = mid tone",
		lesson: 1,
	}),
	ThaiWord.fromPlain({
		name: "นา",
		romanization: "naa",
		meaning: "rice field",
		tone: "mid",
		toneRule: "Low class น + live ending (long vowel า) = mid tone",
		lesson: 1,
	}),
	ThaiWord.fromPlain({
		name: "นาน",
		romanization: "naan",
		meaning: "long time",
		tone: "mid",
		toneRule: "Low class น + live ending (น final) = mid tone",
		lesson: 1,
	}),

	// === Lesson 2 ===
	ThaiWord.fromPlain({
		name: "งาน",
		romanization: "ngaan",
		meaning: "work",
		tone: "mid",
		toneRule: "Low class ง + live ending (น final) = mid tone",
		lesson: 2,
	}),
	ThaiWord.fromPlain({
		name: "ยาว",
		romanization: "yaao",
		meaning: "long",
		tone: "mid",
		toneRule: "Low class ย + live ending (ว final adds 'o' sound) = mid tone",
		lesson: 2,
	}),
	ThaiWord.fromPlain({
		name: "นาย",
		romanization: "naai",
		meaning: "boss, Mr.",
		tone: "mid",
		toneRule: "Low class น + live ending (ย final) = mid tone",
		lesson: 2,
	}),

	// === Lesson 3 ===
	ThaiWord.fromPlain({
		name: "กา",
		romanization: "gaa",
		meaning: "crow",
		tone: "mid",
		toneRule: "Mid class ก + live ending (long vowel า) = mid tone",
		lesson: 3,
		sceneMnemonic: {
			shapeCue:
				"ก stands first with the า post planted after it — hen, then crook.",
			soundCue: "Gaa — the crow's own call, flat and level the whole way.",
			toneMotion: "mid",
		},
	}),
	ThaiWord.fromPlain({
		name: "ดี",
		romanization: "dii",
		meaning: "good",
		tone: "mid",
		toneRule: "Mid class ด + live ending (long vowel อี) = mid tone",
		lesson: 3,
	}),
	ThaiWord.fromPlain({
		name: "บาน",
		romanization: "baan",
		meaning: "to bloom",
		tone: "mid",
		toneRule: "Mid class บ + live ending (น final) = mid tone",
		lesson: 3,
	}),

	// === Lesson 4 ===
	ThaiWord.fromPlain({
		name: "นะ",
		romanization: "na",
		meaning: "particle to soften speech",
		tone: "high",
		toneRule: "Low class น + dead ending (short vowel อะ) = high tone",
		lesson: 4,
	}),
	ThaiWord.fromPlain({
		name: "มัน",
		romanization: "man",
		meaning: "it",
		tone: "mid",
		toneRule:
			"Low class ม + live ending (น final, short vowel but live ending) = mid tone",
		lesson: 4,
	}),
	ThaiWord.fromPlain({
		name: "นิด",
		romanization: "nit",
		meaning: "tiny",
		tone: "high",
		toneRule:
			"Low class น + dead ending (short vowel อิ + T-stop ด) = high tone",
		lesson: 4,
	}),
	ThaiWord.fromPlain({
		name: "ซัก",
		romanization: "sak",
		meaning: "to wash clothes",
		tone: "high",
		toneRule: "Low class ซ + dead ending (short vowel + K-stop ก) = high tone",
		lesson: 4,
	}),
	ThaiWord.fromPlain({
		name: "ชัด",
		romanization: "chat",
		meaning: "clear, clearly",
		tone: "high",
		toneRule: "Low class ช + dead ending (short vowel + T-stop ด) = high tone",
		lesson: 4,
	}),

	// === Lesson 5 ===
	ThaiWord.fromPlain({
		name: "ฟัน",
		romanization: "fan",
		meaning: "tooth",
		tone: "mid",
		toneRule: "Low class ฟ + live ending (น final) = mid tone",
		lesson: 5,
	}),
	ThaiWord.fromPlain({
		name: "ดู",
		romanization: "duu",
		meaning: "to watch",
		tone: "mid",
		toneRule: "Mid class ด + live ending (long vowel อู) = mid tone",
		lesson: 5,
	}),
	ThaiWord.fromPlain({
		name: "ชุด",
		romanization: "chut",
		meaning: "outfit, set",
		tone: "high",
		toneRule:
			"Low class ช + dead ending (short vowel อุ + T-stop ด) = high tone",
		lesson: 5,
	}),
	ThaiWord.fromPlain({
		name: "มาก",
		romanization: "maak",
		meaning: "very",
		tone: "falling",
		toneRule:
			"Low class ม + dead ending (LONG vowel า + K-stop ก) = falling tone",
		lesson: 5,
	}),
	ThaiWord.fromPlain({
		name: "พูด",
		romanization: "phuut",
		meaning: "to speak",
		tone: "falling",
		toneRule:
			"Low class พ + dead ending (LONG vowel อู + T-stop ด) = falling tone",
		lesson: 5,
	}),

	// === Lesson 6 ===
	ThaiWord.fromPlain({
		name: "คืน",
		romanization: "khuuen",
		meaning: "to return",
		tone: "mid",
		toneRule: "Low class ค + live ending (long vowel อื + น final) = mid tone",
		lesson: 6,
	}),
	ThaiWord.fromPlain({
		name: "นึก",
		romanization: "nuek",
		meaning: "to consider",
		tone: "high",
		toneRule:
			"Low class น + dead ending (short vowel อึ + K-stop ก) = high tone",
		lesson: 6,
	}),
	ThaiWord.fromPlain({
		name: "พืช",
		romanization: "phuuet",
		meaning: "vegetation, plants",
		tone: "falling",
		toneRule:
			"Low class พ + dead ending (long vowel อื + T-stop ช) = falling tone",
		lesson: 6,
	}),
	ThaiWord.fromPlain({
		name: "มือ",
		romanization: "muue",
		meaning: "hand",
		tone: "mid",
		toneRule:
			"Low class ม + live ending (long vowel อื + อ placeholder) = mid tone",
		lesson: 6,
		sceneMnemonic: {
			shapeCue:
				"ม wears the double-pinned ื above, and อ stands behind as a silent prop — ื may not end a word unpropped.",
			soundCue: "Muue — long, level, steady as an open palm.",
			toneMotion: "mid",
		},
	}),

	// === Lesson 7 ===
	ThaiWord.fromPlain({
		name: "เฮง",
		romanization: "heeng",
		meaning: "to be fortunate",
		tone: "mid",
		toneRule: "Low class ฮ + live ending (long vowel เอ + ง final) = mid tone",
		lesson: 7,
	}),
	ThaiWord.fromPlain({
		name: "เทพ",
		romanization: "theep",
		meaning: "god, angel",
		tone: "falling",
		toneRule:
			"Low class ท + dead ending (long vowel เอ + P-stop พ) = falling tone",
		lesson: 7,
	}),
	ThaiWord.fromPlain({
		name: "เย็น",
		romanization: "yen",
		meaning: "cool, cold",
		tone: "mid",
		toneRule:
			"Low class ย + live ending (short vowel เอะ written ็ + น final) = mid tone",
		lesson: 7,
	}),
	ThaiWord.fromPlain({
		name: "เม็ด",
		romanization: "met",
		meaning: "grain, pill",
		tone: "high",
		toneRule:
			"Low class ม + dead ending (short vowel เอะ written ็ + T-stop ด) = high tone",
		lesson: 7,
	}),
	ThaiWord.fromPlain({
		name: "เค็ม",
		romanization: "khem",
		meaning: "salty",
		tone: "mid",
		toneRule:
			"Low class ค + live ending (short vowel เอะ written ็ + ม final) = mid tone",
		lesson: 7,
	}),

	// === Lesson 8 ===
	ThaiWord.fromPlain({
		name: "แรง",
		romanization: "raaeng",
		meaning: "power, strength",
		tone: "mid",
		toneRule: "Low class ร + live ending (long vowel แอ + ง final) = mid tone",
		lesson: 8,
	}),
	ThaiWord.fromPlain({
		name: "บิล",
		romanization: "bin",
		meaning: "bill",
		tone: "mid",
		toneRule: "Mid class บ + live ending (ล final makes 'n' sound) = mid tone",
		lesson: 8,
	}),
	ThaiWord.fromPlain({
		name: "แมว",
		romanization: "maaeo",
		meaning: "cat",
		tone: "mid",
		toneRule: "Low class ม + live ending (long vowel แอ + ว final) = mid tone",
		lesson: 8,
	}),

	// === Lesson 9 ===
	ThaiWord.fromPlain({
		name: "ปี",
		romanization: "bpii",
		meaning: "year",
		tone: "mid",
		toneRule: "Mid class ป + live ending (long vowel อี) = mid tone",
		lesson: 9,
	}),
	ThaiWord.fromPlain({
		name: "ตาม",
		romanization: "dtaam",
		meaning: "to follow",
		tone: "mid",
		toneRule: "Mid class ต + live ending (long vowel า + ม final) = mid tone",
		lesson: 9,
	}),
	ThaiWord.fromPlain({
		name: "โจร",
		romanization: "joon",
		meaning: "thief, robber",
		tone: "mid",
		toneRule:
			"Mid class จ + live ending (long vowel โอ + ร final makes 'n' sound) = mid tone",
		lesson: 9,
	}),
	ThaiWord.fromPlain({
		name: "บน",
		romanization: "bon",
		meaning: "on, above",
		tone: "mid",
		toneRule:
			"Mid class บ + live ending (น final, unwritten short vowel) = mid tone",
		lesson: 9,
	}),

	// === Lesson 10 ===
	ThaiWord.fromPlain({
		name: "ไกล",
		romanization: "glai",
		meaning: "far",
		tone: "mid",
		toneRule:
			"Mid class ก + consonant cluster กล + live ending (สระ ไอ counts as live for tone) = mid tone",
		lesson: 10,
	}),
	ThaiWord.fromPlain({
		name: "เมา",
		romanization: "mao",
		meaning: "drunk",
		tone: "mid",
		toneRule:
			"Low class ม + live ending (สระ เอา counts as long for tone) = mid tone",
		lesson: 10,
	}),
	ThaiWord.fromPlain({
		name: "ใคร",
		romanization: "khrai",
		meaning: "who",
		tone: "mid",
		toneRule:
			"Low class ค + live ending (สระ ใอ counts as live for tone) = mid tone",
		lesson: 10,
		sceneMnemonic: {
			shapeCue:
				"The curl-topped ใ leads — the rarer ai — with ค and ร close behind.",
			soundCue: "Khrai — kh rolling straight into r, gliding out level.",
			toneMotion: "mid",
		},
	}),

	// === Lesson 11 ===
	ThaiWord.fromPlain({
		name: "เกาะ",
		romanization: "gaw",
		meaning: "island",
		tone: "low",
		toneRule: "Mid class ก + dead ending (short vowel เอาะ) = low tone",
		lesson: 11,
	}),
	ThaiWord.fromPlain({
		name: "อีก",
		romanization: "iik",
		meaning: "again, another",
		tone: "low",
		toneRule:
			"Mid class อ (silent initial) + dead ending (K-stop ก) = low tone",
		lesson: 11,
	}),
	ThaiWord.fromPlain({
		name: "เอา",
		romanization: "ao",
		meaning: "to take, to want",
		tone: "mid",
		toneRule: "Mid class อ + live ending (สระ เอา counts as live) = mid tone",
		lesson: 11,
	}),
	ThaiWord.fromPlain({
		name: "ตอบ",
		romanization: "dtaawp",
		meaning: "to answer",
		tone: "low",
		toneRule: "Mid class ต + dead ending (P-stop บ) = low tone",
		lesson: 11,
	}),

	// === Lesson 12 ===
	ThaiWord.fromPlain({
		name: "ขา",
		romanization: "khaa",
		meaning: "leg",
		tone: "rising",
		toneRule: "High class ข + live ending (long vowel า) = rising tone",
		lesson: 12,
	}),
	ThaiWord.fromPlain({
		name: "ฉัน",
		romanization: "chan",
		meaning: "I (informal)",
		tone: "rising",
		toneRule: "High class ฉ + live ending (น final) = rising tone",
		lesson: 12,
	}),
	ThaiWord.fromPlain({
		name: "เขียน",
		romanization: "khiian",
		meaning: "to write",
		tone: "rising",
		toneRule:
			"High class ข + live ending (long vowel เอีย + น final) = rising tone",
		lesson: 12,
	}),

	// === Lesson 13 ===
	ThaiWord.fromPlain({
		name: "เบอร์",
		romanization: "booe",
		meaning: "number (loanword)",
		tone: "mid",
		toneRule: "Mid class บ + live ending (long vowel เออ); ร์ is silent (การันต์)",
		lesson: 13,
	}),
	ThaiWord.fromPlain({
		name: "สัตว์",
		romanization: "sat",
		meaning: "animal",
		tone: "low",
		toneRule:
			"High class ส + dead ending (T-stop ต); ว์ is silent (การันต์). High class + dead = low tone",
		lesson: 13,
	}),
	ThaiWord.fromPlain({
		name: "ศีล",
		romanization: "siin",
		meaning: "moral precept",
		tone: "rising",
		toneRule:
			"High class ศ + live ending (long vowel อี + ล makes 'n' sound) = rising tone",
		lesson: 13,
	}),
	ThaiWord.fromPlain({
		name: "เยอะ",
		romanization: "yoe",
		meaning: "many, much",
		tone: "high",
		toneRule: "Low class ย + dead ending (short vowel เออะ) = high tone",
		lesson: 13,
	}),

	// === Lesson 14 ===
	ThaiWord.fromPlain({
		name: "ฝน",
		romanization: "fon",
		meaning: "rain",
		tone: "rising",
		toneRule: "High class ฝ + live ending (น final) = rising tone",
		lesson: 14,
	}),
	ThaiWord.fromPlain({
		name: "ผนัง",
		romanization: "pha-nang",
		meaning: "wall",
		tone: "mid",
		toneRule: "Two syllables",
		lesson: 14,
	}),
	ThaiWord.fromPlain({
		name: "เมือง",
		romanization: "muueang",
		meaning: "city",
		tone: "mid",
		toneRule: "Low class ม + live ending (ง final) = mid tone",
		lesson: 14,
	}),

	// === Formerly lesson 15 — now lessons 14/28 ===
	ThaiWord.fromPlain({
		name: "หมี",
		romanization: "mii",
		meaning: "bear",
		tone: "rising",
		toneRule:
			"ห changes low class ม to follow high class rules. High class + live ending = rising tone",
		lesson: 28,
		sceneMnemonic: {
			shapeCue:
				"A silent ห stands in front of ม — a temple usher escorting a harbor letter.",
			soundCue:
				"Mǐi — the usher hands it temple rules, and the syllable swings upward: the bear rears.",
			toneMotion: "rising",
		},
	}),
	ThaiWord.fromPlain({
		name: "หัว",
		romanization: "hua",
		meaning: "head",
		tone: "rising",
		toneRule: "High class ห + live ending = rising tone",
		lesson: 14,
	}),
	ThaiWord.fromPlain({
		name: "สวน",
		romanization: "suan",
		meaning: "garden",
		tone: "rising",
		toneRule: "High class ส + live ending (น final) = rising tone",
		lesson: 14,
	}),

	// === Formerly lesson 16 — now lessons 13/26 ===
	ThaiWord.fromPlain({
		name: "ดำ",
		romanization: "dam",
		meaning: "black",
		tone: "mid",
		toneRule:
			"Mid class ด + สระ อำ (live ending because of built-in ม) = mid tone",
		lesson: 13,
	}),
	ThaiWord.fromPlain({
		name: "ภูเขา",
		romanization: "phuu-khao",
		meaning: "mountain",
		tone: "mid",
		toneRule: "Two syllables: ภู (mid tone) + เขา (rising tone, high class ข)",
		lesson: 13,
	}),
	ThaiWord.fromPlain({
		name: "ธรรม",
		romanization: "tham",
		meaning: "dharma, teaching of Buddha",
		tone: "mid",
		toneRule: "Uses ร หัน (double ร = short a sound)",
		lesson: 26,
	}),
	ThaiWord.fromPlain({
		name: "สัญญา",
		romanization: "san-yaa",
		meaning: "promise",
		tone: "rising",
		toneRule:
			"First syllable: สัญ (rising, high class ส). Second syllable: ญา (mid, low class ญ)",
		lesson: 13,
	}),

	// === Formerly lesson 17 — now the tone-mark lesson ===
	ThaiWord.fromPlain({
		name: "ไก่",
		romanization: "gai",
		meaning: "chicken",
		tone: "low",
		toneRule: "Mid class ก + ไม้เอก = low tone",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "เบื่อ",
		romanization: "buuea",
		meaning: "to be bored",
		tone: "low",
		toneRule: "Mid class บ + ไม้เอก = low tone",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "แก้ว",
		romanization: "gaaeo",
		meaning: "glass (drinking)",
		tone: "falling",
		toneRule:
			"Mid class ก + ไม้โท = falling tone. Without tone mark แกว = 'hint/clue' (mid tone)",
		lesson: 29,
	}),

	// === Formerly lesson 18 — now the tone-mark lesson ===
	ThaiWord.fromPlain({
		name: "โต๊ะ",
		romanization: "dto",
		meaning: "table",
		tone: "high",
		toneRule:
			"Mid class ต + ไม้ตรี = high tone. Without tone mark would be low tone (mid class + dead ending)",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "เจ๋ง",
		romanization: "jeeng",
		meaning: "cool",
		tone: "rising",
		toneRule: "Mid class จ + ไม้จัตวา = rising tone",
		lesson: 29,
	}),

	// === Formerly lesson 19 — now lessons 12/14/26 ===
	ThaiWord.fromPlain({
		name: "กฎ",
		romanization: "got",
		meaning: "rule, law",
		tone: "low",
		toneRule:
			"Mid class ก + dead ending (ฎ T-stop) + unwritten สระ โอะ = low tone",
		lesson: 26,
	}),
	ThaiWord.fromPlain({
		name: "แถว",
		romanization: "thaaeo",
		meaning: "row, area",
		tone: "rising",
		toneRule: "High class ถ + live ending (ว final) = rising tone",
		lesson: 12,
	}),
	ThaiWord.fromPlain({
		name: "รัฐ",
		romanization: "rat",
		meaning: "state, government",
		tone: "high",
		toneRule: "Low class ร + dead ending (short vowel + T-stop ฐ) = high tone",
		lesson: 14,
	}),

	// === Formerly lesson 20 — now lesson 14 ===
	ThaiWord.fromPlain({
		name: "ครุฑ",
		romanization: "khrut",
		meaning: "Garuda (mythical eagle)",
		tone: "high",
		toneRule:
			"Low class ค + consonant cluster คร + dead ending (short vowel + T-stop ฑ) = high tone",
		lesson: 14,
	}),
	ThaiWord.fromPlain({
		name: "พัฒนา",
		romanization: "phat-tha-naa",
		meaning: "to develop",
		tone: "high",
		toneRule: "3 syllables: พัฒ (high) + ฒ-น (high, unwritten vowel) + นา (mid)",
		lesson: 14,
	}),

	// === Formerly lesson 21 — now lesson 14 ===
	ThaiWord.fromPlain({
		name: "นาฬิกา",
		romanization: "naa-li-gaa",
		meaning: "clock",
		tone: "mid",
		toneRule: "Three syllables: นา (mid) + ฬิ (high) + กา (mid)",
		lesson: 14,
	}),
	ThaiWord.fromPlain({
		name: "เมฆ",
		romanization: "meek",
		meaning: "cloud",
		tone: "falling",
		toneRule:
			"Low class ม + dead ending (long vowel เอ + K-stop ฆ) = falling tone",
		lesson: 14,
	}),

	// === Formerly lesson 22 — now lessons 14/29 ===
	ThaiWord.fromPlain({
		name: "ข้าว",
		romanization: "khaao",
		meaning: "rice",
		tone: "falling",
		toneRule:
			"High class ข + ไม้โท = falling tone. Without tone mark: ขาว (rising) = 'white'",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "ให้",
		romanization: "hai",
		meaning: "to give, to allow",
		tone: "falling",
		toneRule:
			"High class ห + ไม้โท = falling tone. One of the most common Thai words",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "ฤดู",
		romanization: "rue-duu",
		meaning: "season",
		tone: "high",
		toneRule:
			"ฤ = low class ร + short vowel (dead ending) = high tone. ดู = mid class + live ending = mid tone",
		lesson: 14,
	}),

	// === Formerly lesson 23 — now the tone-mark lesson ===
	ThaiWord.fromPlain({
		name: "คู่",
		romanization: "khuu",
		meaning: "pair, couple",
		tone: "falling",
		toneRule:
			"Low class ค + ไม้เอก = FALLING tone (low class mai ek = falling, not low!)",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "ที่นี่",
		romanization: "thii-nii",
		meaning: "here",
		tone: "falling",
		toneRule: "Both syllables: low class + ไม้เอก = falling tone",
		lesson: 29,
	}),

	// === Formerly lesson 24 — now the tone-mark lesson (and เนย to 13) ===
	ThaiWord.fromPlain({
		name: "น้ำ",
		romanization: "nam",
		meaning: "water",
		tone: "high",
		toneRule:
			"Low class น + ไม้โท = HIGH tone (low class mai tho = high, not falling!)",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "ร้าน",
		romanization: "raan",
		meaning: "shop",
		tone: "high",
		toneRule: "Low class ร + ไม้โท = high tone",
		lesson: 29,
	}),
	ThaiWord.fromPlain({
		name: "เนย",
		romanization: "nooei",
		meaning: "butter",
		tone: "mid",
		toneRule:
			"Low class น + live ending. Special: เ_ย pattern -- the vowel is สระ เออ, not สระ เอ. When final consonant is ย, the สระ อิ is NOT written",
		lesson: 13,
	}),

	// === Formerly lesson 25 — now lessons 27/28 ===
	ThaiWord.fromPlain({
		name: "ทราย",
		romanization: "saai",
		meaning: "sand",
		tone: "mid",
		toneRule:
			"Irregular: ทร makes an 'S' sound (like ซ). Low class + live ending = mid tone",
		lesson: 27,
	}),
	ThaiWord.fromPlain({
		name: "จริง",
		romanization: "jing",
		meaning: "real, true",
		tone: "mid",
		toneRule:
			"Irregular: ร is silent in cluster with จ. Mid class จ + live ending (ง final) = mid tone",
		lesson: 27,
	}),
	ThaiWord.fromPlain({
		name: "อย่า",
		romanization: "yaa",
		meaning: "don't",
		tone: "low",
		toneRule:
			"Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone",
		lesson: 28,
		sceneMnemonic: {
			shapeCue:
				"A silent อ stands before ย with the one-stroke ่ above — just four Thai words carry this silent-อ spelling, and this is the commonest.",
			soundCue:
				"Yàa — the escort makes ย behave market-class, and the stick drops it low: a flat, firm no.",
			toneMotion: "low",
		},
	}),
	ThaiWord.fromPlain({
		name: "อยู่",
		romanization: "yuu",
		meaning: "to stay, to be at",
		tone: "low",
		toneRule:
			"Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone",
		lesson: 28,
	}),
	ThaiWord.fromPlain({
		name: "อย่าง",
		romanization: "yaang",
		meaning: "a type, a style",
		tone: "low",
		toneRule:
			"Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone",
		lesson: 28,
	}),
	ThaiWord.fromPlain({
		name: "อยาก",
		romanization: "yaak",
		meaning: "to want",
		tone: "low",
		toneRule:
			"Silent อ before ย makes ย act like mid class. Mid class + dead ending = low tone",
		lesson: 28,
	}),
];

// ============================================================================
// Live ending consonants
// ============================================================================

export const liveEndingConsonants = [
	{ character: "ง", sound: "ng", description: "same as end of 'sing'" },
	{ character: "น", sound: "n", description: "same as end of 'sun'" },
	{ character: "ม", sound: "m", description: "same as end of 'sum'" },
	{
		character: "ย",
		sound: "i",
		description: "blends with vowel, like Y in 'boy'",
	},
	{
		character: "ว",
		sound: "o",
		description: "blends with vowel, adds slight 'o'",
	},
	{
		character: "ร",
		sound: "n",
		description: "as final consonant, sounds like น",
	},
	{
		character: "ล",
		sound: "n",
		description: "as final consonant, sounds like น",
	},
];

export const deadEndingSounds = [
	{
		sound: "K-stop",
		consonants: ["ก", "ข", "ค", "ฆ"],
		description: "Close off air at back of throat",
	},
	{
		sound: "T-stop",
		consonants: [
			"ด",
			"ต",
			"ท",
			"ธ",
			"ถ",
			"ฐ",
			"ฑ",
			"ฒ",
			"จ",
			"ช",
			"ซ",
			"ศ",
			"ษ",
			"ส",
			"ฎ",
			"ฏ",
		],
		description: "Tongue touches near teeth, no air released",
	},
	{
		sound: "P-stop",
		consonants: ["บ", "ป", "พ", "ฟ", "ภ", "ผ", "ฝ"],
		description: "Close lips, no air released",
	},
];

// ============================================================================
// Lesson structure for SRS ordering
// ============================================================================

export interface Lesson {
	number: number;
	title: string;
	focus: string;
	consonants: string[];
	vowels: string[];
	toneMarks: string[];
	toneRulesIntroduced: string[];
	specialRulesIntroduced: string[];
	videoUrl?: string;
}

export const lessons: Lesson[] = [
	{
		number: 1,
		title: "Maaw maa, Naaw nuu, and Long a",
		focus: "Two low class consonants and one vowel",
		consonants: ["ม", "น"],
		vowels: ["า"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [],
		videoUrl: "/thai-script/videos/TAME_L1_tpod101_video-h.webm",
	},
	{
		number: 2,
		title: "Ngaaw nguu, Yaaw yak, Waaw waaen, and Tone Rules",
		focus: "Three low class consonants and first tone rule",
		consonants: ["ง", "ย", "ว"],
		vowels: [],
		toneMarks: [],
		toneRulesIntroduced: ["low-live"],
		specialRulesIntroduced: ["live-endings"],
		videoUrl: "/thai-script/videos/TAME_L2_tpod101_video-h.webm",
	},
	{
		number: 3,
		title: "Gaaw gai, Daaw dek, Baaw baimai, and Long i",
		focus: "Three mid class consonants, dead endings, and long i vowel",
		consonants: ["ก", "ด", "บ"],
		vowels: [" ี"],
		toneMarks: [],
		toneRulesIntroduced: ["mid-live"],
		specialRulesIntroduced: ["dead-endings"],
		videoUrl: "/thai-script/videos/TAME_L3_tpod101_video-h.webm",
	},
	{
		number: 4,
		title: "Chaaw chaang, Saaw soo, Short a, and Short i",
		focus: "Two low class consonants, two short vowels, and high tone rule",
		consonants: ["ช", "ซ"],
		vowels: ["ะ", "ั", " ิ"],
		toneMarks: [],
		toneRulesIntroduced: ["low-dead-short"],
		specialRulesIntroduced: ["mai-han-akat"],
		videoUrl: "/thai-script/videos/TAME_L4_tpod101_video-h.webm",
	},
	{
		number: 5,
		title: "Phaaw phaan, Faaw fan, Short u, and Long u",
		focus: "Two low class consonants, u vowels, and falling tone rule",
		consonants: ["พ", "ฟ"],
		vowels: ["ุ", "ู"],
		toneMarks: [],
		toneRulesIntroduced: ["low-dead-long"],
		specialRulesIntroduced: [],
		videoUrl: "/thai-script/videos/TAME_L5_tpod101_video-h.webm",
	},
	{
		number: 6,
		title: "Khaaw khwaai, Short ue, and Long ue",
		focus: "One low class consonant and ue vowels",
		consonants: ["ค"],
		vowels: [" ึ", " ื"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["sara-uee-placeholder"],
		videoUrl: "/thai-script/videos/TAME_L6_tpod101_video-h.webm",
	},
	{
		number: 7,
		title: "Thaaw thahaan, Haaw nok-huuk, Short e, and Long e",
		focus: "Two low class consonants, front vowels, and ไม้ไต่คู้",
		consonants: ["ท", "ฮ"],
		vowels: ["เ", "เ-ะ", "็"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["mai-taikhu"],
		videoUrl: "/thai-script/videos/TAME_L7_tpod101_video-h.webm",
	},
	{
		number: 8,
		title: "Raaw ruuea, Laaw ling, Short ae, and Long ae",
		focus: "Two low class consonants and ae vowels",
		consonants: ["ร", "ล"],
		vowels: ["แ", "แ-ะ"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["mai-taikhu-ae"],
		videoUrl: "/thai-script/videos/TAME_L8_tpod101_video-h.webm",
	},
	{
		number: 9,
		title: "Jaaw jaan, Dtaaw dtao, Bpaaw bplaa, Short o, and Long o",
		focus: "Three mid class consonants and o vowels",
		consonants: ["จ", "ต", "ป"],
		vowels: ["โ", "โ-ะ"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [],
		videoUrl: "/thai-script/videos/TAME_L9_tpod101_video-h.webm",
	},
	{
		number: 10,
		title: "Ao, Ai mai-malaai, Ai mai-muuan, and Mai-yamok",
		focus: "Diphthongs and repetition symbol",
		consonants: [],
		vowels: ["เ-า", "ไ", "ใ"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [
			"consonant-clusters",
			"ao-ai-tone-exception",
			"mai-yamok",
		],
		videoUrl: "/thai-script/videos/TAME_L10_tpod101_video-h.webm",
	},
	{
		number: 11,
		title: "The Silent Letter aaw aang",
		focus: "Silent consonant อ and aw vowels",
		consonants: ["อ"],
		vowels: ["อ (as vowel)", "เ-าะ"],
		toneMarks: [],
		toneRulesIntroduced: ["mid-dead-short", "mid-dead-long"],
		specialRulesIntroduced: ["o-ang-dual-role"],
		videoUrl: "/thai-script/videos/TAME_L11_tpod101_video-h.webm",
	},
	// --- Task 4.3: the final band. The fourteen video lessons that stood here
	// (legacy numbers 12-25) are retired — see RETIRED_LESSONS in
	// `lessonSequence.ts` — and their letters land in these three lessons:
	// the seven paired high-class letters beside the low cousins the learner
	// already knows, the six Sanskrit-alphabet letters behind the commonest
	// loanwords, and the rare tail at the lowest scheduling priority.
	{
		number: 12,
		title: "The Temple Cousins",
		focus: "Seven high class letters that echo sounds already learned",
		consonants: ["ข", "ฉ", "ถ", "ผ", "ฝ", "ส", "ห"],
		vowels: ["เ-ีย", "เ-ียะ"],
		toneMarks: [],
		toneRulesIntroduced: ["high-live"],
		specialRulesIntroduced: [],
	},
	{
		number: 13,
		title: "The Sanskrit Set",
		focus: "Six loanword letters, sara am, the oe vowels, and gaaran",
		consonants: ["ศ", "ษ", "ภ", "ธ", "ณ", "ญ"],
		vowels: ["เ-อ", "เ-อะ", "ำ"],
		toneMarks: [],
		toneRulesIntroduced: ["high-dead-short", "high-dead-long"],
		specialRulesIntroduced: ["gaaran", "sara-am-properties"],
	},
	{
		number: 14,
		title: "The Rare Tail",
		focus:
			"The ten rarest letters, the rare vowel signs, and the ua/uea vowels",
		consonants: ["ฐ", "ฎ", "ฏ", "ฑ", "ฒ", "ฬ", "ฆ", "ฃ", "ฅ", "ฌ"],
		vowels: ["เ-ือ", "เ-ือะ", "-ัว", "-ัวะ"],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["obsolete-consonants"],
	},
	// --- Phase 3: the three concepts the source course taught as asides. ---
	// Declared here so every slot in `lessonSequence.ts` has the title, focus
	// and symbol sets every lesson consumer joins against; `startLesson` throws
	// outright on a sequence entry with no row here. They introduce no new
	// symbol — each teaches how symbols already taught combine — and carry no
	// `videoUrl`, so they read as declared-but-unfilled until task 3.2 puts them
	// on the deck arm.
	{
		number: 26,
		title: "Vowels That Are Not Written",
		focus: "The four ways a Thai syllable carries a vowel it does not spell",
		consonants: [],
		vowels: [],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["unwritten-vowels", "ror-han"],
	},
	// Task 4.2 — the consolidated tone-mark lesson. Replaces the six-lesson
	// spread of `toneMarkRules` with the eight-cell table taught as one
	// pattern; task 4.3's resequence filed the four mark symbols and all
	// eight rules here. Every spelling-based tone rule (lessons 2-13)
	// precedes it in the sequence.
	{
		number: 29,
		title: "The Eight-Cell Tone-Mark Table",
		focus:
			"All four tone marks against all three consonant classes, as one pattern",
		consonants: [],
		vowels: [],
		toneMarks: ["่", "้", "๊", "๋"],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [
			"tone-mark-placement",
			"mai-tri-chattawa-middle-only",
		],
	},
	{
		number: 27,
		title: "Consonant Clusters, True and False",
		focus:
			"The closed inventory of clusters, and the pairs that only look like one",
		consonants: [],
		vowels: [],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [
			"consonant-clusters",
			"tho-ro-s-sound",
			"silent-ro-clusters",
		],
	},
	{
		number: 28,
		title: "Leading Consonants (อักษรนำ)",
		focus:
			"One rule: a mid or high consonant in front of a sonorant hands over its class",
		consonants: [],
		vowels: [],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: ["hor-nam", "silent-o-before-yo"],
	},
	// Task 4.3 — Thai numerals as one optional lesson, replacing the front
	// halves of the three retired video lessons that taught them (legacy
	// 23-25). The ten `thaiNumerals` entries are filed under this number; the
	// sequence marks the lesson `required: false`, so completing the course
	// does not depend on it (AC4).
	{
		number: 30,
		title: "Thai Numerals, ๐ Through ๙",
		focus: "The ten digit glyphs and the number words behind them — optional",
		consonants: [],
		vowels: [],
		toneMarks: [],
		toneRulesIntroduced: [],
		specialRulesIntroduced: [],
	},
];

// ============================================================================
// Complete Tone Chart (Summary of all tone rules)
// ============================================================================

export const completeToneChart = {
	description: "Complete tone determination chart for Thai syllables",

	withoutToneMark: {
		description: "Tone rules based on spelling (no tone mark present)",
		rules: [
			{ class: "Mid", live: "mid", deadShort: "low", deadLong: "low" },
			{ class: "High", live: "rising", deadShort: "low", deadLong: "low" },
			{ class: "Low", live: "mid", deadShort: "high", deadLong: "falling" },
		],
	},

	withToneMark: {
		description:
			"Tone rules when a tone mark is present (overrides spelling-based rules)",
		rules: [
			{ mark: "mai ek (่)", mid: "low", high: "low", low: "falling" },
			{ mark: "mai tho (้)", mid: "falling", high: "falling", low: "high" },
			{ mark: "mai tri (๊)", mid: "high", high: "N/A", low: "N/A" },
			{ mark: "mai chattawa (๋)", mid: "rising", high: "N/A", low: "N/A" },
		],
	},
};

// ============================================================================
// Exports
// ============================================================================

export { consonants, vowels, toneMarks, alphabet };
