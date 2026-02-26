// ============================================================================
// Thai Script Learning Data
// Source: ThaiPod101 "Thai Alphabet Made Easy" Lessons 1-25
// Organized for SRS-based accelerated learning
// ============================================================================

export class LearnableItem {
  constructor(
    public readonly priority?: number,
    public readonly lesson?: number,
  ) {}
}

export class ThaiSymbol extends LearnableItem {
  constructor(
    public readonly character: string,
    public readonly name: string,
    public readonly mnemonic?: string,
    priority?: number,
    lesson?: number,
  ) {
    super(priority, lesson);
  }
  static fromPlain({
    character,
    name,
    mnemonic,
    priority,
    lesson,
  }: {
    character: string;
    name: string;
    mnemonic?: string;
    priority?: number;
    lesson?: number;
  }): ThaiSymbol {
    return new ThaiSymbol(character, name, mnemonic, priority, lesson);
  }
}

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
    priority?: number,
    lesson?: number,
  ) {
    super(character, name, mnemonic, priority, lesson);
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
    priority,
    lesson,
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
    priority?: number;
    lesson?: number;
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
      mnemonic,
      priority,
      lesson,
    );
  }
}

export type VowelPosition = "left" | "right" | "above" | "below" | "around" | "left-above" | "left-above-right";

export class ThaiVowel extends ThaiSymbol {
  constructor(
    character: string,
    name: string,
    public readonly length: "short" | "long",
    public readonly sound: string,
    public readonly position: VowelPosition,
    mnemonic?: string,
    priority?: number,
    lesson?: number,
  ) {
    super(character, name, mnemonic, priority, lesson);
  }
  static fromPlain({
    character,
    name,
    length,
    sound,
    position,
    mnemonic,
    priority,
    lesson,
  }: {
    character: string;
    name: string;
    length: "short" | "long";
    sound: string;
    position: VowelPosition;
    mnemonic?: string;
    priority?: number;
    lesson?: number;
  }): ThaiVowel {
    return new ThaiVowel(character, name, length, sound, position, mnemonic, priority, lesson);
  }
}

export class ThaiToneMark extends ThaiSymbol {
  constructor(
    character: string,
    name: string,
    public readonly midClassTone: ToneValue,
    public readonly highClassTone: ToneValue | null,
    public readonly lowClassTone: ToneValue | null,
    mnemonic?: string,
    priority?: number,
    lesson?: number,
  ) {
    super(character, name, mnemonic, priority, lesson);
  }
  static fromPlain({
    character,
    name,
    midClassTone,
    highClassTone,
    lowClassTone,
    mnemonic,
    priority,
    lesson,
  }: {
    character: string;
    name: string;
    midClassTone: ToneValue;
    highClassTone: ToneValue | null;
    lowClassTone: ToneValue | null;
    mnemonic?: string;
    priority?: number;
    lesson?: number;
  }): ThaiToneMark {
    return new ThaiToneMark(character, name, midClassTone, highClassTone, lowClassTone, mnemonic, priority, lesson);
  }
}

export class ThaiWord {
  constructor(
    public readonly name: string,
    public readonly romanization: string,
    public readonly meaning: string,
    public readonly tone: ToneValue,
    public readonly toneRule: string,
    public readonly lesson: number,
    public readonly mnemonic?: string,
  ) {}
  static fromPlain({
    name,
    romanization,
    meaning,
    tone,
    toneRule,
    lesson,
    mnemonic,
  }: {
    name: string;
    romanization: string;
    meaning: string;
    tone: ToneValue;
    toneRule: string;
    lesson: number;
    mnemonic?: string;
  }): ThaiWord {
    return new ThaiWord(name, romanization, meaning, tone, toneRule, lesson, mnemonic);
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
    description: "Low class consonant + live syllable = mid tone. A mid tone is pronounced at a flat pitch in the middle of your regular vocal range.",
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
    description: "Low class consonant + dead syllable + short vowel = high tone. High tone starts at a high pitch and rises very slightly.",
    lesson: 4,
  },
  // Lesson 5: Low class dead long
  {
    id: "low-dead-long",
    consonantClass: ThaiSymbolClass.Low,
    syllableType: "dead-long",
    resultingTone: "falling",
    description: "Low class consonant + dead syllable + long vowel = falling tone. Falling tone begins with a relatively high pitch that drops sharply.",
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
    description: "Mid class consonant + dead syllable = low tone (regardless of vowel length).",
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
    description: "High class consonant + dead syllable = low tone (regardless of vowel length).",
    lesson: 13,
  },
];

// ============================================================================
// Tone Mark Rules (Lessons 17-18, 21-24)
// ============================================================================

export interface ToneMarkRule {
  toneMarkName: string;
  consonantClass: ThaiSymbolClass;
  resultingTone: ToneValue;
  lesson: number;
}

export const toneMarkRules: ToneMarkRule[] = [
  // Middle class (Lessons 17-18)
  { toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Mid, resultingTone: "low", lesson: 17 },
  { toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Mid, resultingTone: "falling", lesson: 17 },
  { toneMarkName: "mai tri", consonantClass: ThaiSymbolClass.Mid, resultingTone: "high", lesson: 18 },
  { toneMarkName: "mai chattawa", consonantClass: ThaiSymbolClass.Mid, resultingTone: "rising", lesson: 18 },
  // High class (Lessons 21-22)
  { toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.High, resultingTone: "low", lesson: 21 },
  { toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.High, resultingTone: "falling", lesson: 22 },
  // Low class (Lessons 23-24)
  { toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Low, resultingTone: "falling", lesson: 23 },
  { toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Low, resultingTone: "high", lesson: 24 },
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
    description: "Only ม, น, ง, ย, and ว can end a syllable and keep it live. These sounds can resonate indefinitely (mmm, nnn, nggg). Syllables ending in long vowels with no final consonant are also live.",
    lesson: 2,
  },
  {
    id: "dead-endings",
    title: "Dead Syllable Endings",
    description: "A dead syllable ends with a short vowel or one of the three stopping sounds: K-stop (ก), T-stop (ด,ต,ช,ซ,ท, etc.), or P-stop (บ,พ,ฟ). The sound is cut off abruptly.",
    lesson: 3,
  },
  {
    id: "mai-han-akat",
    title: "Mai Han Akat (ไม้หันอากาศ)",
    description: "When short sara a (สระ อะ) has a following consonant, the สระ อะ symbol is replaced by a single curl (ั) written above the initial consonant. Called ไม้หันอากาศ (mai-han-aa-gat).",
    lesson: 4,
  },
  {
    id: "consonant-clusters",
    title: "Consonant Clusters",
    description: "Only three letters can form consonant clusters when they follow other consonants: ร, ล, and ว. This is a major difference from English which has many more cluster possibilities.",
    lesson: 10,
  },
  {
    id: "ao-ai-tone-exception",
    title: "สระ เอา and สระ ไอ Tone Exception",
    description: "Although สระ เอา (ao) and สระ ไอ/ใอ (ai) are short vowels, they count as long vowels / live syllable endings for tone determination purposes.",
    lesson: 10,
  },
  {
    id: "mai-yamok",
    title: "Mai Yamok (ไม้ยมก) ๆ",
    description: "The symbol ๆ indicates that the preceding word should be repeated. For example, ใครๆ (khrai-khrai) means 'anyone'.",
    lesson: 10,
  },
  {
    id: "o-ang-dual-role",
    title: "อ (aaw aang) Dual Role",
    description: "อ serves two purposes: (1) As a silent placeholder consonant for words that start with a vowel sound. (2) When following another consonant without a vowel, it acts as the vowel สระ ออ (aaw).",
    lesson: 11,
  },
  {
    id: "sara-uee-placeholder",
    title: "สระ อื Requires อ Placeholder",
    description: "When สระ อื (long uee) is not followed by a consonant, อ must be written after it as a placeholder. Example: มือ (muue) = hand.",
    lesson: 6,
  },
  {
    id: "gaaran",
    title: "การันต์ (Gaa-ran) Silent Marker",
    description: "A symbol written above a consonant to indicate it is silent. Used to preserve original spellings of loanwords. Example: สัตว์ (sat) = animal, where ว์ is silent.",
    lesson: 13,
  },
  {
    id: "hor-nam",
    title: "ห as Class-Changing Prefix (ห นำ)",
    description: "ห can be placed as a silent letter before a low class consonant to make it follow high class tone rules. This allows low class consonants to produce rising tone and low tone, which they cannot make on their own. Example: หมี (mii, rising tone) = bear.",
    lesson: 15,
  },
  {
    id: "sara-am-properties",
    title: "สระ อำ (sara am) Properties",
    description: "สระ อำ combines สระ อะ (a) + ม (m). It always forms a live syllable because of its built-in final ม sound. Any letters following it begin the next syllable.",
    lesson: 16,
  },
  {
    id: "ror-han",
    title: "ร หัน (Ror Han) Double ร",
    description: "When two ร letters appear side-by-side after an initial consonant with no final consonant, pronounce it as อัน (an). This special pattern is called ร หัน. Example: ธรรม (tham).",
    lesson: 16,
  },
  {
    id: "tone-mark-placement",
    title: "Tone Mark Placement Rules",
    description: "Tone marks go above the initial consonant. If a vowel is above the consonant, the tone mark goes above the vowel. For consonant clusters, the tone mark goes over the second consonant, but the class of the first consonant determines the tone. Tone marks override all spelling-based tone rules.",
    lesson: 17,
  },
  {
    id: "mai-tri-chattawa-middle-only",
    title: "Mai Tri and Mai Chattawa: Middle Class Only",
    description: "ไม้ตรี (mai tri) and ไม้จัตวา (mai chattawa) are only used with middle class consonants. They are never used with high or low class consonants.",
    lesson: 18,
  },
  {
    id: "unwritten-vowels",
    title: "Unwritten Vowels",
    description: "When two consonants appear with nothing between them, there is an unwritten สระ โอะ (short o) between them. Example: กฎ (got) = rule. With three consonants, สระ อะ appears after the first, สระ โอะ between the second and third.",
    lesson: 19,
  },
  {
    id: "obsolete-consonants",
    title: "Obsolete Consonants ฃ and ฅ",
    description: "ฃ (kho khuat) and ฅ (kho khon) are still counted in the 44-consonant alphabet but are not used in any modern Thai words.",
    lesson: 22,
  },
  {
    id: "tho-ro-s-sound",
    title: "ทร Makes S Sound",
    description: "The consonant pair ท + ร acts like ซ, making an S sound. Example: ทราย (saai) = sand.",
    lesson: 25,
  },
  {
    id: "silent-ro-clusters",
    title: "Silent ร in Clusters with จ, ซ, ศ, ส",
    description: "When ร forms consonant clusters with จ, ซ, ศ, or ส, the ร is silent. Example: จริง (jing) = real.",
    lesson: 25,
  },
  {
    id: "silent-o-before-yo",
    title: "Silent อ Before ย (4 Words)",
    description: "Placing silent อ before ย makes it act like a mid class consonant. Only 4 words use this: อย่า (yaa, don't), อยู่ (yuu, to stay), อย่าง (yaang, a type), อยาก (yaak, to want). Mnemonic: อย่าอยู่อย่างอยาก = Don't exist in a state of desire.",
    lesson: 25,
  },
];

// ============================================================================
// Consonants (organized by lesson introduction order)
// ============================================================================

const consonants: ThaiConsonant[] = [
  // === Lesson 1: ม, น ===
  ThaiConsonant.fromPlain({
    character: "ม", name: "ม ม้า", nameRomanized: "maaw maa", nameMeaning: "horse",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "m", finalSound: "m (live ending)",
    priority: 1, lesson: 1,
    mnemonic: "Think of a coffee mug with a broken handle. The head on top and loop on the bottom are where the handle used to be attached. ม has the head and loop on the SAME side (left). Both ม and 'mug' start with 'm'. Head is written clockwise.",
  }),
  ThaiConsonant.fromPlain({
    character: "น", name: "น หนู", nameRomanized: "naaw nuu", nameMeaning: "mouse/rat",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "n", finalSound: "n (live ending)",
    priority: 2, lesson: 1,
    mnemonic: "Looks very similar to ม but the loop is on the RIGHT side instead of the left. Think: the mouse (หนู) ran to the Right. ม and น don't change their sound at the beginning or end of syllables, making them the easiest consonants to learn first.",
  }),

  // === Lesson 2: ง, ย, ว ===
  ThaiConsonant.fromPlain({
    character: "ง", name: "ง งู", nameRomanized: "ngaaw nguu", nameMeaning: "snake",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "ng (like end of 'sing')", finalSound: "ng (live ending)",
    priority: 3, lesson: 2,
    mnemonic: "Think of a snake with its body bent. Start with clockwise circle for head, extend down, swerve left at 45 degrees. The 'ng' sound is the same as the ending of 'sing' -- you just need to get used to starting words with it too.",
  }),
  ThaiConsonant.fromPlain({
    character: "ย", name: "ย ยักษ์", nameRomanized: "yaaw yak", nameMeaning: "giant",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "y (like Y in 'yes')", finalSound: "i (blends with vowel, like Y in 'boy')",
    priority: 4, lesson: 2,
    mnemonic: "Counter-clockwise head continues into a half-circle, then another bump below, then cuts right and up at 90 degrees. ย is the ONLY Thai letter with two bumps on one side -- like a giant's big belly. ยักษ์ means 'giant'.",
  }),
  ThaiConsonant.fromPlain({
    character: "ว", name: "ว แหวน", nameRomanized: "waaw waaen", nameMeaning: "ring",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "w (like W in 'water')", finalSound: "o (blends with vowel, adds slight 'o' sound)",
    priority: 5, lesson: 2,
    mnemonic: "Counter-clockwise head at bottom, line extends up and curls down to the left. The shape looks like a ring (แหวน). Easy to write -- start at bottom, curl to left.",
  }),

  // === Lesson 3: ก, ด, บ (Mid class consonants with dead endings) ===
  ThaiConsonant.fromPlain({
    character: "ก", name: "ก ไก่", nameRomanized: "gaaw gai", nameMeaning: "chicken",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "g (hard G, unaspirated K)", finalSound: "K-stop (close off air at back of throat)",
    priority: 6, lesson: 3,
    mnemonic: "Looks like a chicken's head with its beak pointing to the left. One of only 2 Thai consonants without a head (no circle). As initial sound it's between G and K (unaspirated). As final sound, it's a K-stop -- try to say 'k' without letting air out.",
  }),
  ThaiConsonant.fromPlain({
    character: "ด", name: "ด เด็ก", nameRomanized: "daaw dek", nameMeaning: "child",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "d (like D in 'diamond')", finalSound: "T-stop (tongue touches near teeth, no air released)",
    priority: 7, lesson: 3,
    mnemonic: "The bottom is pointed like a Diamond. Head is written clockwise. The T-stop final sound is made by stopping air with your tongue near your teeth -- like trying to make a 't' without releasing air.",
  }),
  ThaiConsonant.fromPlain({
    character: "บ", name: "บ ใบไม้", nameRomanized: "baaw baimai", nameMeaning: "leaf",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "b (like B in 'bucket')", finalSound: "P-stop (close lips, no air released)",
    priority: 8, lesson: 3,
    mnemonic: "Looks like the shape of a bucket. The P-stop final sound is made by closing your lips -- try making a 'p' without opening lips. This is one of 3 basic stopping sounds (K, T, P).",
  }),

  // === Lesson 4: ช, ซ ===
  ThaiConsonant.fromPlain({
    character: "ช", name: "ช ช้าง", nameRomanized: "chaaw chaang", nameMeaning: "elephant",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "ch (like CH in 'China')", finalSound: "T-stop",
    priority: 9, lesson: 4,
    mnemonic: "Clockwise head, then small curve and line down like a question mark, line goes right and back up, with a little tail sticking out to upper right. Think of an elephant -- ช has a tail (trunk) sticking out at the top right.",
  }),
  ThaiConsonant.fromPlain({
    character: "ซ", name: "ซ โซ่", nameRomanized: "saaw soo", nameMeaning: "chain",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "s (like S in 'sun')", finalSound: "T-stop",
    priority: 10, lesson: 4,
    mnemonic: "Looks similar to ช (cho chaang) but does NOT have the tail sticking out on top. Think: a chain (โซ่) has no tail. Both make T-stop when final.",
  }),

  // === Lesson 5: พ, ฟ ===
  ThaiConsonant.fromPlain({
    character: "พ", name: "พ พาน", nameRomanized: "phaaw phaan", nameMeaning: "offering tray",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "ph (aspirated P, like P in 'panda')", finalSound: "P-stop",
    priority: 11, lesson: 5,
    mnemonic: "Looks like the letter W or an upside down M. Clockwise head, then down-up-down-up. The outside lines are straight, inside lines slanted. Think of a W-shaped Pedestal for offerings. Aspirated means air comes out when you say it.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฟ", name: "ฟ ฟัน", nameRomanized: "faaw fan", nameMeaning: "tooth",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "f (like F in 'family')", finalSound: "P-stop",
    priority: 12, lesson: 5,
    mnemonic: "Similar to พ (pho phaan) but the LAST line sticks out HIGHER than the rest. Think: teeth (ฟัน) stick up. Both พ and ฟ have clockwise heads (heads stick outside the letter).",
  }),

  // === Lesson 6: ค ===
  ThaiConsonant.fromPlain({
    character: "ค", name: "ค ควาย", nameRomanized: "khaaw khwaai", nameMeaning: "water buffalo",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "kh (like K in 'kite' or C in 'cup')", finalSound: "K-stop",
    priority: 13, lesson: 6,
    mnemonic: "Counter-clockwise head, short line down-left, then reverse direction with an arch left-to-right. Don't confuse with ด: ค has counter-clockwise head, ด has clockwise head. ค makes the same K-stop as ก when final.",
  }),

  // === Lesson 7: ท, ฮ ===
  ThaiConsonant.fromPlain({
    character: "ท", name: "ท ทหาร", nameRomanized: "thaaw thahaan", nameMeaning: "soldier",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "th (aspirated T, like T in 'top' with puff of air)", finalSound: "T-stop",
    priority: 14, lesson: 7,
    mnemonic: "Clockwise head, line straight down, then arch left to right. Looks like a hill -- think of a soldier standing on top of a hill. Aspirated T means you feel a puff of air.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฮ", name: "ฮ นกฮูก", nameRomanized: "haaw nok-huuk", nameMeaning: "owl",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "h (like H in 'hoot')", finalSound: "not used as final consonant",
    priority: 15, lesson: 7,
    mnemonic: "Counter-clockwise head, line curls down and around on right side, loop at top ending upper right. Looks like an owl's eye. Owls make the sound 'hoot-hoot' which starts with H.",
  }),

  // === Lesson 8: ร, ล ===
  ThaiConsonant.fromPlain({
    character: "ร", name: "ร เรือ", nameRomanized: "raaw ruuea", nameMeaning: "boat",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "r (trilled R, like double R in 'burrito')", finalSound: "n (same as น, live ending)",
    priority: 16, lesson: 8,
    mnemonic: "Counter-clockwise head at bottom, line goes up and curves left, then hook, line comes across to upper right. As a FINAL consonant, ร makes an 'n' sound (not 'r'). Can form consonant clusters with other consonants.",
  }),
  ThaiConsonant.fromPlain({
    character: "ล", name: "ล ลิง", nameRomanized: "laaw ling", nameMeaning: "monkey",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "l (like L in 'little')", finalSound: "n (same as ร final, live ending)",
    priority: 17, lesson: 8,
    mnemonic: "Clockwise head at bottom, small arch curving right, then larger curve over it going back left. Looks like a monkey with a curved tail sticking up. As a FINAL consonant, ล also makes an 'n' sound.",
  }),

  // === Lesson 9: จ, ต, ป (Mid class) ===
  ThaiConsonant.fromPlain({
    character: "จ", name: "จ จาน", nameRomanized: "jaaw jaan", nameMeaning: "plate/dish",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "j (like J in 'jump')", finalSound: "T-stop",
    priority: 18, lesson: 9,
    mnemonic: "Clockwise head in the middle, line goes down right, hooks back up and curves over to the left.",
  }),
  ThaiConsonant.fromPlain({
    character: "ต", name: "ต เต่า", nameRomanized: "dtaaw dtao", nameMeaning: "turtle",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "dt (between D and T, unaspirated T)", finalSound: "T-stop",
    priority: 19, lesson: 9,
    mnemonic: "Written almost exactly like ด but with a small indentation at the top of the bump -- like a turtle's bumpy shell. Make a T sound without a puff of air.",
  }),
  ThaiConsonant.fromPlain({
    character: "ป", name: "ป ปลา", nameRomanized: "bpaaw bplaa", nameMeaning: "fish",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "bp (between B and P, unaspirated P)", finalSound: "P-stop",
    priority: 20, lesson: 9,
    mnemonic: "Looks like บ but the line on the right side extends HIGHER than the head. Make a P sound without a puff of air. Think: the fish (ปลา) jumps higher than the bucket (บ).",
  }),

  // === Lesson 11: อ (Mid class, silent initial) ===
  ThaiConsonant.fromPlain({
    character: "อ", name: "อ อ่าง", nameRomanized: "aaw aang", nameMeaning: "basin",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "silent (placeholder for vowel-initial words)", finalSound: "acts as vowel สระ ออ (aaw)",
    priority: 21, lesson: 11,
    mnemonic: "Counter-clockwise head continues into a counter-clockwise curl. Dual purpose: (1) silent placeholder when a word starts with a vowel, (2) acts as the vowel สระ ออ (aaw, like AW in 'saw') when following a consonant without another vowel.",
  }),

  // === Lesson 12: ข, ฉ (High class) ===
  ThaiConsonant.fromPlain({
    character: "ข", name: "ข ไข่", nameRomanized: "khaaw khai", nameMeaning: "egg",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "kh (same sound as ค, but high class)", finalSound: "K-stop",
    priority: 22, lesson: 12,
    mnemonic: "Looks almost the same as ช (cho chaang) but WITHOUT the tail sticking out on top. Remember: eggs don't have tails. Same sound as ค but different class -- ข is high, ค is low.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฉ", name: "ฉ ฉิ่ง", nameRomanized: "chaaw ching", nameMeaning: "cymbals",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "ch (same sound as ช, but high class)", finalSound: "T-stop",
    priority: 23, lesson: 12,
    mnemonic: "Like a short letter น with a tail on top. Same sound as ช but different class -- ฉ is high, ช is low.",
  }),

  // === Lesson 13: ศ, ษ, ส (High class, all make 's' sound) ===
  ThaiConsonant.fromPlain({
    character: "ศ", name: "ศ ศาลา", nameRomanized: "saaw saalaa", nameMeaning: "pavilion",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false,
    initialSound: "s", finalSound: "T-stop",
    priority: 24, lesson: 13,
    mnemonic: "Looks like ค with an extra line. One of three high-class S consonants. Sometimes called ศอคอ ศาลา.",
  }),
  ThaiConsonant.fromPlain({
    character: "ษ", name: "ษ ฤๅษี", nameRomanized: "saaw ruuesii", nameMeaning: "hermit",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false,
    initialSound: "s", finalSound: "T-stop",
    priority: 25, lesson: 13,
    mnemonic: "Looks like บ with an extra line. One of three high-class S consonants.",
  }),
  ThaiConsonant.fromPlain({
    character: "ส", name: "ส เสือ", nameRomanized: "saaw suuea", nameMeaning: "tiger",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false,
    initialSound: "s", finalSound: "T-stop",
    priority: 26, lesson: 13,
    mnemonic: "Looks like ล with an extra line. The MOST COMMON of the three S-consonants (ศ, ษ, ส).",
  }),

  // === Lesson 14: ผ, ฝ (High class) ===
  ThaiConsonant.fromPlain({
    character: "ผ", name: "ผ ผึ้ง", nameRomanized: "phaaw phueng", nameMeaning: "bee",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "ph (like P in 'pig')", finalSound: "P-stop",
    priority: 27, lesson: 14,
    mnemonic: "Looks like พ but with counter-clockwise head (head stays INSIDE the letter). Key distinction: ผ/ฝ = counter-clockwise heads (inside), พ/ฟ = clockwise heads (outside). Same 'ph' sound as พ but high class.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฝ", name: "ฝ ฝา", nameRomanized: "faaw faa", nameMeaning: "lid/cover",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false,
    initialSound: "f (like F in 'fan')", finalSound: "P-stop",
    priority: 28, lesson: 14,
    mnemonic: "Looks like ฟ but with counter-clockwise head (head stays INSIDE the letter). Same 'f' sound as ฟ but high class.",
  }),

  // === Lesson 15: ห (High class, class-changer) ===
  ThaiConsonant.fromPlain({
    character: "ห", name: "ห หีบ", nameRomanized: "haaw hiip", nameMeaning: "chest/trunk",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false,
    initialSound: "h (like H in 'Hello')", finalSound: "not used as final consonant",
    priority: 29, lesson: 15,
    mnemonic: "Clockwise head at top, line down, diagonal upper right, loop, straight down right side. Special power: when placed before a low class consonant as a silent prefix (ห นำ), it makes that consonant follow HIGH class tone rules. Example: หมี = bear (rising tone).",
  }),

  // === Lesson 16: ภ, ธ, ณ, ญ (Low class) ===
  ThaiConsonant.fromPlain({
    character: "ภ", name: "ภ สำเภา", nameRomanized: "phaaw samphao", nameMeaning: "Chinese junk ship",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "ph (like P in 'pink')", finalSound: "P-stop",
    priority: 30, lesson: 16,
    mnemonic: "Contains shape of ก but with a counter-clockwise head sticking out to the LEFT. Distinguishes from ถ which has a clockwise head inside.",
  }),
  ThaiConsonant.fromPlain({
    character: "ธ", name: "ธ ธง", nameRomanized: "thaaw thong", nameMeaning: "flag",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "th (aspirated T, like T in 'tennis')", finalSound: "T-stop",
    priority: 31, lesson: 16,
    mnemonic: "No head -- one of only 2 Thai consonants without a head circle (ก and ธ). Upper right portion similar to ร. Short vertical line on left turns to L shape, top drawn like ร.",
  }),
  ThaiConsonant.fromPlain({
    character: "ณ", name: "ณ เณร", nameRomanized: "naaw neen", nameMeaning: "novice monk",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "n (same as น)", finalSound: "n (live ending)",
    priority: 32, lesson: 16,
    mnemonic: "Looks like a combination of ก and น. Clockwise head at bottom left, shape of ก, finish with loop on right side and vertical line like น.",
  }),
  ThaiConsonant.fromPlain({
    character: "ญ", name: "ญ หญิง", nameRomanized: "yaaw ying", nameMeaning: "woman/female",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "y (same as ย)", finalSound: "n",
    priority: 33, lesson: 16,
    mnemonic: "Similar to ณ. Clockwise head, shape of ก, line bends back up to upper right, then small curl drawn under right half. Often appears doubled (ญญ), where the first is final consonant and second is initial of next syllable.",
  }),

  // === Lesson 19: ถ, ฐ, ฎ, ฏ ===
  ThaiConsonant.fromPlain({
    character: "ถ", name: "ถ ถุง", nameRomanized: "thaaw thung", nameMeaning: "bag/sack",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "th (like T in 'top')", finalSound: "T-stop",
    priority: 34, lesson: 19,
    mnemonic: "Contains shape of ก but with a clockwise head at bottom (head ends up INSIDE the letter). ถุง means 'bag' -- imagine the head is fruit carried inside a bag. Distinguishes from ภ which has head sticking out to the left.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฐ", name: "ฐ ฐาน", nameRomanized: "thaaw thaan", nameMeaning: "base/platform",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "th (same as ถ)", finalSound: "T-stop",
    priority: 35, lesson: 19,
    mnemonic: "One of the most difficult letters. Top part like combination of จ and ร. Bottom has extra line with clockwise head, line goes left with bump and curl.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฎ", name: "ฎ ชฎา", nameRomanized: "daaw chada", nameMeaning: "pointed crown/headdress",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "d (same as ด)", finalSound: "T-stop",
    priority: 36, lesson: 19,
    mnemonic: "'Fancy version' of ด. Counter-clockwise head at bottom, shape of ก, line extends below head on right, loop on left side. Has just a loop on the bottom. Very uncommon.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฏ", name: "ฏ ปฏัก", nameRomanized: "dtaaw bpatak", nameMeaning: "spear/goad",
    classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false,
    initialSound: "dt (same as ต)", finalSound: "T-stop",
    priority: 37, lesson: 19,
    mnemonic: "'Fancy version' of ต. Same as ฎ but with one extra bump in the bottom line before the loop. The extra bump parallels how ต has an extra bump on top vs ด. Very uncommon.",
  }),

  // === Lesson 20: ฑ, ฒ ===
  ThaiConsonant.fromPlain({
    character: "ฑ", name: "ฑ มณโฑ", nameRomanized: "thaaw monthoo", nameMeaning: "Montho (literary character)",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "th (usually same as ท, sometimes d)", finalSound: "T-stop",
    priority: 38, lesson: 20,
    mnemonic: "Looks almost identical to ท but with a little bump after the head before the first vertical line. Since ฑ and ท make the same sound, remembering one helps remember the other.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฒ", name: "ฒ ผู้เฒ่า", nameRomanized: "thaaw phuuthao", nameMeaning: "elder/old man",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "th (same as ฑ and ท)", finalSound: "T-stop",
    priority: 39, lesson: 20,
    mnemonic: "Looks like a combination of ต and ม. Start with clockwise head, draw shape of ต, blend into shape of ม.",
  }),

  // === Lesson 21: ฬ, ฆ ===
  ThaiConsonant.fromPlain({
    character: "ฬ", name: "ฬ จุฬา", nameRomanized: "laaw julaa", nameMeaning: "star-shaped kite",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false,
    initialSound: "l (same as ล)", finalSound: "n (live ending)",
    priority: 40, lesson: 21,
    mnemonic: "Looks just like พ with an extra loop at the end. Same 'l' sound as ล. Named after จุฬา, also the name of Chulalongkorn University.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฆ", name: "ฆ ระฆัง", nameRomanized: "khaaw rakhang", nameMeaning: "bell",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "kh (same as ค and ข)", finalSound: "K-stop",
    priority: 41, lesson: 21,
    mnemonic: "Like ม but with an extra curved line with a bump after the head. Same 'kh' sound as ค. These are the last 2 low class consonants.",
  }),

  // === Lesson 22: ฃ, ฅ (Obsolete) and ฌ ===
  ThaiConsonant.fromPlain({
    character: "ฃ", name: "ฃ ขวด", nameRomanized: "khaaw khuat", nameMeaning: "bottle",
    classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true,
    initialSound: "kh (same as ข)", finalSound: "K-stop",
    priority: 42, lesson: 22,
    mnemonic: "OBSOLETE - not used in modern Thai. Like ข with an extra indentation on top. Even ขวด (bottle) is now spelled with ข.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฅ", name: "ฅ คน", nameRomanized: "khaaw khon", nameMeaning: "person",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "kh (same as ค)", finalSound: "K-stop",
    priority: 43, lesson: 22,
    mnemonic: "OBSOLETE - not used in modern Thai. Like ค with an extra indentation on top. Even คน (person) is now spelled with ค.",
  }),
  ThaiConsonant.fromPlain({
    character: "ฌ", name: "ฌ เฌอ", nameRomanized: "chaaw chooe", nameMeaning: "tree",
    classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true,
    initialSound: "ch (same as ช)", finalSound: "T-stop",
    priority: 44, lesson: 22,
    mnemonic: "Very rare. Same sound as ช. Few words use it, mostly from Cambodian, Balinese, and Sanskrit origins. Examples: ฌาน (meditative absorption), เพชฌฆาต (executioner).",
  }),
];

// ============================================================================
// Vowels (organized by lesson introduction order)
// ============================================================================

const vowels: ThaiVowel[] = [
  // === Lesson 1 ===
  ThaiVowel.fromPlain({
    character: "า", name: "sara aa", length: "long",
    sound: "aa (like A in 'father')", position: "right",
    priority: 1, lesson: 1,
    mnemonic: "A slightly curved line going right, then drops straight down -- looks like a cane or walking stick. Think: 'My faaaather walks with a cane.' Always follows a consonant, never appears alone.",
  }),

  // === Lesson 3 ===
  ThaiVowel.fromPlain({
    character: " ี", name: "sara ii", length: "long",
    sound: "ii (like EE in 'green')", position: "above",
    priority: 2, lesson: 3,
    mnemonic: "Written above a consonant. Has a small curl and a vertical line. Think of it as an eye looking down at the consonant.",
  }),

  // === Lesson 4 ===
  ThaiVowel.fromPlain({
    character: "ะ", name: "sara a", length: "short",
    sound: "a (like A in 'hat')", position: "right",
    priority: 3, lesson: 4,
    mnemonic: "Two small curls written after a consonant. Only written this way at the END of a syllable. When a consonant follows, use ไม้หันอากาศ (ั) above the initial consonant instead.",
  }),
  ThaiVowel.fromPlain({
    character: "ั", name: "mai han akat", length: "short",
    sound: "a (short a, used when sara a has a following consonant)", position: "above",
    priority: 4, lesson: 4,
    mnemonic: "A single curl above and between the initial and final consonants. This is the form of short sara a when followed by a consonant. Example: มัน (man) = 'it'.",
  }),
  ThaiVowel.fromPlain({
    character: " ิ", name: "sara i", length: "short",
    sound: "i (like I in 'sit')", position: "above",
    priority: 5, lesson: 4,
    mnemonic: "Written above a consonant. Same as sara ii (สระ อี) but WITHOUT the vertical line. Short version of the 'ee' sound.",
  }),

  // === Lesson 5 ===
  ThaiVowel.fromPlain({
    character: "ุ", name: "sara u", length: "short",
    sound: "u (like OO in 'put')", position: "below",
    priority: 6, lesson: 5,
    mnemonic: "Written BELOW a consonant. A little circle with a line coming down.",
  }),
  ThaiVowel.fromPlain({
    character: "ู", name: "sara uu", length: "long",
    sound: "uu (like OO in 'boot')", position: "below",
    priority: 7, lesson: 5,
    mnemonic: "Written BELOW a consonant. Looks like a cup that can hold water -- the long OO in 'boot'. Longer version of sara u.",
  }),

  // === Lesson 6 ===
  ThaiVowel.fromPlain({
    character: " ึ", name: "sara ue", length: "short",
    sound: "ue (no English equivalent -- try making 'uu' with lips spread wide)", position: "above",
    priority: 8, lesson: 6,
    mnemonic: "Written above a consonant. Like sara i (สระ อิ) plus a tiny clockwise circle. This sound doesn't exist in English -- spread your mouth wide while trying to say 'oo'.",
  }),
  ThaiVowel.fromPlain({
    character: " ื", name: "sara uee", length: "long",
    sound: "uee (long version of sara ue -- like German 'über')", position: "above",
    priority: 9, lesson: 6,
    mnemonic: "Written above a consonant. Like sara ii (สระ อี) plus an extra vertical line to the left. When not followed by a consonant, อ must be written after it (e.g., มือ = hand).",
  }),

  // === Lesson 7 ===
  ThaiVowel.fromPlain({
    character: "เ", name: "sara ee", length: "long",
    sound: "ee (like EY in British 'grey')", position: "left",
    priority: 10, lesson: 7,
    mnemonic: "Written to the LEFT of the consonant. A tall character that comes before the consonant in writing but the sound comes after. This is the first vowel that goes in front.",
  }),
  ThaiVowel.fromPlain({
    character: "เ-ะ", name: "sara e", length: "short",
    sound: "e (like E in 'red')", position: "around",
    priority: 11, lesson: 7,
    mnemonic: "Written with สระ เอ before + สระ อะ after the consonant. When a final consonant follows, the อะ is replaced by ไม้ไต่คู้ (looks like Thai number 8) above the consonant.",
  }),

  // === Lesson 8 ===
  ThaiVowel.fromPlain({
    character: "แ", name: "sara aae", length: "long",
    sound: "ae (like A in 'cat', long)", position: "left",
    priority: 12, lesson: 8,
    mnemonic: "Written with DOUBLE สระ เอ (แ) before the consonant. Like two tall lines before the consonant.",
  }),
  ThaiVowel.fromPlain({
    character: "แ-ะ", name: "sara ae", length: "short",
    sound: "ae (like A in 'cat', short)", position: "around",
    priority: 13, lesson: 8,
    mnemonic: "Written with double สระ เอ (แ) before the consonant, plus สระ อะ after.",
  }),

  // === Lesson 9 ===
  ThaiVowel.fromPlain({
    character: "โ", name: "sara oo", length: "long",
    sound: "oo (like O in 'go', long)", position: "left",
    priority: 14, lesson: 9,
    mnemonic: "Written to the left of the consonant. A tall character with a circle at the top.",
  }),
  ThaiVowel.fromPlain({
    character: "โ-ะ", name: "sara o", length: "short",
    sound: "o (like O in 'go', short)", position: "around",
    priority: 15, lesson: 9,
    mnemonic: "โ to the left of consonant + อะ after.",
  }),

  // === Lesson 10 ===
  ThaiVowel.fromPlain({
    character: "เ-า", name: "sara ao", length: "short",
    sound: "ao (like OW in 'how')", position: "around",
    priority: 16, lesson: 10,
    mnemonic: "สระ เอ before the consonant, สระ อา after. Although short, it counts as a LONG vowel for tone rules. Important exception to remember!",
  }),
  ThaiVowel.fromPlain({
    character: "ไ", name: "sara ai mai malaai", length: "short",
    sound: "ai (like I in 'Hi')", position: "left",
    priority: 17, lesson: 10,
    mnemonic: "Written to the left of the consonant. Clockwise head at bottom, tall vertical line, zig-zag at top. This is the MORE COMMON version of 'ai'. Counts as a live syllable for tone rules despite being short.",
  }),
  ThaiVowel.fromPlain({
    character: "ใ", name: "sara ai mai muuan", length: "short",
    sound: "ai (same sound as ไ)", position: "left",
    priority: 18, lesson: 10,
    mnemonic: "Same as ไ but with a curl at top instead of zig-zag. Used in only about 20 words. Same sound, just different spelling for specific words.",
  }),

  // === Lesson 11 ===
  ThaiVowel.fromPlain({
    character: "อ (as vowel)", name: "sara aaw", length: "long",
    sound: "aaw (like AW in 'saw')", position: "right",
    priority: 19, lesson: 11,
    mnemonic: "When อ follows another consonant without a separate vowel, it acts as the long vowel สระ ออ (aaw). Example: ตอบ (dtaawp) = to answer.",
  }),
  ThaiVowel.fromPlain({
    character: "เ-าะ", name: "sara aw", length: "short",
    sound: "aw (short version of สระ ออ)", position: "around",
    priority: 20, lesson: 11,
    mnemonic: "สระ เอ in front + สระ อา and สระ อะ after. Looks totally different from the long version. Example: เกาะ (gaw) = island.",
  }),

  // === Lesson 12 ===
  ThaiVowel.fromPlain({
    character: "เ-ีย", name: "sara iia", length: "long",
    sound: "iia (like IA in 'Mamma Mia')", position: "left-above-right",
    priority: 21, lesson: 12,
    mnemonic: "Three parts: สระ เอ to the left, สระ อี above, ย after the consonant. The long version is used much more often than the short version.",
  }),
  ThaiVowel.fromPlain({
    character: "เ-ียะ", name: "sara ia", length: "short",
    sound: "ia (short version of sara iia)", position: "around",
    priority: 22, lesson: 12,
    mnemonic: "Same as long version plus สระ อะ at the end.",
  }),

  // === Lesson 13 ===
  ThaiVowel.fromPlain({
    character: "เ-อ", name: "sara ooe", length: "long",
    sound: "ooe (like ER in 'her' with relaxed throat)", position: "around",
    priority: 23, lesson: 13,
    mnemonic: "When no final consonant: สระ เอ before + อ after. When WITH a final consonant: สระ เอ before + สระ อิ above (the อ is dropped). Exception: when final consonant is ย, the สระ อิ is NOT written.",
  }),
  ThaiVowel.fromPlain({
    character: "เ-อะ", name: "sara oe", length: "short",
    sound: "oe (short version of sara ooe)", position: "around",
    priority: 24, lesson: 13,
    mnemonic: "When no final consonant: สระ เอ before + อ after + สระ อะ. When with final consonant: สระ เอ before + สระ อิ above.",
  }),

  // === Lesson 14 ===
  ThaiVowel.fromPlain({
    character: "เ-ือ", name: "sara uuea", length: "long",
    sound: "uuea (combination of สระ อื + สระ อะ)", position: "left-above-right",
    priority: 25, lesson: 14,
    mnemonic: "สระ เอ before + สระ อื above + อ after the consonant.",
  }),
  ThaiVowel.fromPlain({
    character: "เ-ือะ", name: "sara uea", length: "short",
    sound: "uea (short combination of สระ อื + สระ อะ)", position: "around",
    priority: 26, lesson: 14,
    mnemonic: "Same as long version but with สระ อะ added at the end.",
  }),

  // === Lesson 15 ===
  ThaiVowel.fromPlain({
    character: "-ัว", name: "sara uua", length: "long",
    sound: "uua (combination of อู + อะ)", position: "above",
    priority: 27, lesson: 15,
    mnemonic: "No final consonant: ไม้หันอากาศ above + ว to the right. With final consonant: ว is sandwiched between initial and final consonants (ไม้หันอากาศ is dropped).",
  }),
  ThaiVowel.fromPlain({
    character: "-ัวะ", name: "sara ua", length: "short",
    sound: "ua (short combination of อู + อะ)", position: "around",
    priority: 28, lesson: 15,
    mnemonic: "Same as long version plus สระ อะ to the right of ว.",
  }),

  // === Lesson 16 ===
  ThaiVowel.fromPlain({
    character: "ำ", name: "sara am", length: "short",
    sound: "am (built-in: สระ อะ + ม)", position: "above",
    priority: 29, lesson: 16,
    mnemonic: "A tiny circle above the consonant plus สระ อา to the right. Special: always forms a LIVE syllable because of its built-in ม sound. Any letters following begin the next syllable.",
  }),
];

// ============================================================================
// Tone Marks (Lessons 17-18)
// ============================================================================

const toneMarks: ThaiToneMark[] = [
  ThaiToneMark.fromPlain({
    character: "่", name: "mai ek",
    midClassTone: "low", highClassTone: "low", lowClassTone: "falling",
    priority: 1, lesson: 17,
    mnemonic: "Short vertical line above the consonant. Named after the number 1 in an Indian language. Middle/High class = low tone, Low class = FALLING tone (different!).",
  }),
  ThaiToneMark.fromPlain({
    character: "้", name: "mai tho",
    midClassTone: "falling", highClassTone: "falling", lowClassTone: "high",
    priority: 2, lesson: 17,
    mnemonic: "Small clockwise head with a hook pointing left. Named after number 2. Middle/High class = falling tone, Low class = HIGH tone (different!).",
  }),
  ThaiToneMark.fromPlain({
    character: "๊", name: "mai tri",
    midClassTone: "high", highClassTone: null, lowClassTone: null,
    priority: 3, lesson: 18,
    mnemonic: "Small clockwise head, almost heart-shaped. Named after number 3. ONLY used with middle class consonants to make high tone. Often found in Chinese loanwords, especially food names.",
  }),
  ThaiToneMark.fromPlain({
    character: "๋", name: "mai chattawa",
    midClassTone: "rising", highClassTone: null, lowClassTone: null,
    priority: 4, lesson: 18,
    mnemonic: "Small plus sign (+) above the consonant. Named after number 4. ONLY used with middle class consonants to make rising tone. Relatively few words use this mark.",
  }),
];

// ============================================================================
// Special Vowels (Lesson 22)
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
  { character: "ฤ", name: "rue", pronunciation: "ร + สระ อึ (sometimes ร + สระ อิ)", length: "short", lesson: 22, notes: "Used in some common words like ฤดู (rue-duu, season) and อังกฤษ (ang-grit, English). Written like ถ with an extra long line." },
  { character: "ฤๅ", name: "ruue", pronunciation: "ร + สระ อื", length: "long", lesson: 22, notes: "Rare. Like ฤ with what looks like สระ อา on its right side." },
  { character: "ฦ", name: "lue", pronunciation: "ล + สระ อึ or สระ อื", length: "short", lesson: 22, notes: "Extremely rare in modern Thai. Part of the official 32 vowels due to Sanskrit origins." },
  { character: "ฦๅ", name: "luue", pronunciation: "ล + สระ อื", length: "long", lesson: 22, notes: "Extremely rare. Like ฤๅ but head sticks out on the left side." },
];

// ============================================================================
// Thai Numerals (Lessons 23-25)
// ============================================================================

export interface ThaiNumeral {
  thai: string;
  arabic: number;
  word: string;
  romanization: string;
  lesson: number;
}

export const thaiNumerals: ThaiNumeral[] = [
  { thai: "๐", arabic: 0, word: "ศูนย์", romanization: "suun", lesson: 25 },
  { thai: "๑", arabic: 1, word: "หนึ่ง", romanization: "nueng", lesson: 23 },
  { thai: "๒", arabic: 2, word: "สอง", romanization: "saawng", lesson: 23 },
  { thai: "๓", arabic: 3, word: "สาม", romanization: "saam", lesson: 23 },
  { thai: "๔", arabic: 4, word: "สี่", romanization: "sii", lesson: 24 },
  { thai: "๕", arabic: 5, word: "ห้า", romanization: "haa", lesson: 24 },
  { thai: "๖", arabic: 6, word: "หก", romanization: "hok", lesson: 24 },
  { thai: "๗", arabic: 7, word: "เจ็ด", romanization: "jet", lesson: 25 },
  { thai: "๘", arabic: 8, word: "แปด", romanization: "bpaaet", lesson: 25 },
  { thai: "๙", arabic: 9, word: "เก้า", romanization: "gao", lesson: 25 },
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
  ThaiWord.fromPlain({ name: "มา", romanization: "maa", meaning: "to come", tone: "mid", toneRule: "Low class ม + live ending (long vowel า) = mid tone", lesson: 1 }),
  ThaiWord.fromPlain({ name: "นา", romanization: "naa", meaning: "rice field", tone: "mid", toneRule: "Low class น + live ending (long vowel า) = mid tone", lesson: 1 }),
  ThaiWord.fromPlain({ name: "นาน", romanization: "naan", meaning: "long time", tone: "mid", toneRule: "Low class น + live ending (น final) = mid tone", lesson: 1 }),

  // === Lesson 2 ===
  ThaiWord.fromPlain({ name: "งาน", romanization: "ngaan", meaning: "work", tone: "mid", toneRule: "Low class ง + live ending (น final) = mid tone", lesson: 2 }),
  ThaiWord.fromPlain({ name: "ยาว", romanization: "yaao", meaning: "long", tone: "mid", toneRule: "Low class ย + live ending (ว final adds 'o' sound) = mid tone", lesson: 2 }),
  ThaiWord.fromPlain({ name: "นาย", romanization: "naai", meaning: "boss, Mr.", tone: "mid", toneRule: "Low class น + live ending (ย final) = mid tone", lesson: 2 }),

  // === Lesson 3 ===
  ThaiWord.fromPlain({ name: "กา", romanization: "gaa", meaning: "crow", tone: "mid", toneRule: "Mid class ก + live ending (long vowel า) = mid tone", lesson: 3, mnemonic: "The sound a crow makes: Gaa Gaa" }),
  ThaiWord.fromPlain({ name: "ดี", romanization: "dii", meaning: "good", tone: "mid", toneRule: "Mid class ด + live ending (long vowel อี) = mid tone", lesson: 3 }),
  ThaiWord.fromPlain({ name: "บาน", romanization: "baan", meaning: "to bloom", tone: "mid", toneRule: "Mid class บ + live ending (น final) = mid tone", lesson: 3 }),

  // === Lesson 4 ===
  ThaiWord.fromPlain({ name: "นะ", romanization: "na", meaning: "particle to soften speech", tone: "high", toneRule: "Low class น + dead ending (short vowel อะ) = high tone", lesson: 4 }),
  ThaiWord.fromPlain({ name: "มัน", romanization: "man", meaning: "it", tone: "mid", toneRule: "Low class ม + live ending (น final, short vowel but live ending) = mid tone", lesson: 4 }),
  ThaiWord.fromPlain({ name: "นิด", romanization: "nit", meaning: "tiny", tone: "high", toneRule: "Low class น + dead ending (short vowel อิ + T-stop ด) = high tone", lesson: 4 }),
  ThaiWord.fromPlain({ name: "ซัก", romanization: "sak", meaning: "to wash clothes", tone: "high", toneRule: "Low class ซ + dead ending (short vowel + K-stop ก) = high tone", lesson: 4 }),
  ThaiWord.fromPlain({ name: "ชัด", romanization: "chat", meaning: "clear, clearly", tone: "high", toneRule: "Low class ช + dead ending (short vowel + T-stop ด) = high tone", lesson: 4 }),

  // === Lesson 5 ===
  ThaiWord.fromPlain({ name: "ฟัน", romanization: "fan", meaning: "tooth", tone: "mid", toneRule: "Low class ฟ + live ending (น final) = mid tone", lesson: 5 }),
  ThaiWord.fromPlain({ name: "ดู", romanization: "duu", meaning: "to watch", tone: "mid", toneRule: "Mid class ด + live ending (long vowel อู) = mid tone", lesson: 5 }),
  ThaiWord.fromPlain({ name: "ชุด", romanization: "chut", meaning: "outfit, set", tone: "high", toneRule: "Low class ช + dead ending (short vowel อุ + T-stop ด) = high tone", lesson: 5 }),
  ThaiWord.fromPlain({ name: "มาก", romanization: "maak", meaning: "very", tone: "falling", toneRule: "Low class ม + dead ending (LONG vowel า + K-stop ก) = falling tone", lesson: 5 }),
  ThaiWord.fromPlain({ name: "พูด", romanization: "phuut", meaning: "to speak", tone: "falling", toneRule: "Low class พ + dead ending (LONG vowel อู + T-stop ด) = falling tone", lesson: 5 }),

  // === Lesson 6 ===
  ThaiWord.fromPlain({ name: "คืน", romanization: "khuuen", meaning: "to return", tone: "mid", toneRule: "Low class ค + live ending (long vowel อื + น final) = mid tone", lesson: 6 }),
  ThaiWord.fromPlain({ name: "นึก", romanization: "nuek", meaning: "to consider", tone: "high", toneRule: "Low class น + dead ending (short vowel อึ + K-stop ก) = high tone", lesson: 6 }),
  ThaiWord.fromPlain({ name: "พืช", romanization: "phuuet", meaning: "vegetation, plants", tone: "falling", toneRule: "Low class พ + dead ending (long vowel อื + T-stop ช) = falling tone", lesson: 6 }),
  ThaiWord.fromPlain({ name: "มือ", romanization: "muue", meaning: "hand", tone: "mid", toneRule: "Low class ม + live ending (long vowel อื + อ placeholder) = mid tone", lesson: 6, mnemonic: "อ is needed as placeholder because สระ อื has no following consonant" }),

  // === Lesson 7 ===
  ThaiWord.fromPlain({ name: "เฮง", romanization: "heeng", meaning: "to be fortunate", tone: "mid", toneRule: "Low class ฮ + live ending (long vowel เอ + ง final) = mid tone", lesson: 7 }),
  ThaiWord.fromPlain({ name: "เทพ", romanization: "theep", meaning: "god, angel", tone: "falling", toneRule: "Low class ท + dead ending (long vowel เอ + P-stop พ) = falling tone", lesson: 7 }),

  // === Lesson 8 ===
  ThaiWord.fromPlain({ name: "แรง", romanization: "raaeng", meaning: "power, strength", tone: "mid", toneRule: "Low class ร + live ending (long vowel แอ + ง final) = mid tone", lesson: 8 }),
  ThaiWord.fromPlain({ name: "บิล", romanization: "bin", meaning: "bill", tone: "mid", toneRule: "Mid class บ + live ending (ล final makes 'n' sound) = mid tone", lesson: 8 }),
  ThaiWord.fromPlain({ name: "แมว", romanization: "maaeo", meaning: "cat", tone: "mid", toneRule: "Low class ม + live ending (long vowel แอ + ว final) = mid tone", lesson: 8 }),

  // === Lesson 9 ===
  ThaiWord.fromPlain({ name: "ปี", romanization: "bpii", meaning: "year", tone: "mid", toneRule: "Mid class ป + live ending (long vowel อี) = mid tone", lesson: 9 }),
  ThaiWord.fromPlain({ name: "ตาม", romanization: "dtaam", meaning: "to follow", tone: "mid", toneRule: "Mid class ต + live ending (long vowel า + ม final) = mid tone", lesson: 9 }),
  ThaiWord.fromPlain({ name: "โจร", romanization: "joon", meaning: "thief, robber", tone: "mid", toneRule: "Mid class จ + live ending (long vowel โอ + ร final makes 'n' sound) = mid tone", lesson: 9 }),
  ThaiWord.fromPlain({ name: "บน", romanization: "bon", meaning: "on, above", tone: "mid", toneRule: "Mid class บ + live ending (น final, unwritten short vowel) = mid tone", lesson: 9 }),

  // === Lesson 10 ===
  ThaiWord.fromPlain({ name: "ไกล", romanization: "glai", meaning: "far", tone: "mid", toneRule: "Mid class ก + consonant cluster กล + live ending (สระ ไอ counts as live for tone) = mid tone", lesson: 10 }),
  ThaiWord.fromPlain({ name: "เมา", romanization: "mao", meaning: "drunk", tone: "mid", toneRule: "Low class ม + live ending (สระ เอา counts as long for tone) = mid tone", lesson: 10 }),
  ThaiWord.fromPlain({ name: "ใคร", romanization: "khrai", meaning: "who", tone: "mid", toneRule: "Low class ค + live ending (สระ ใอ counts as live for tone) = mid tone", lesson: 10, mnemonic: "Uses the rare สระ ใอ ไม้ม้วน form" }),

  // === Lesson 11 ===
  ThaiWord.fromPlain({ name: "เกาะ", romanization: "gaw", meaning: "island", tone: "low", toneRule: "Mid class ก + dead ending (short vowel เอาะ) = low tone", lesson: 11 }),
  ThaiWord.fromPlain({ name: "อีก", romanization: "iik", meaning: "again, another", tone: "low", toneRule: "Mid class อ (silent initial) + dead ending (K-stop ก) = low tone", lesson: 11 }),
  ThaiWord.fromPlain({ name: "เอา", romanization: "ao", meaning: "to take, to want", tone: "mid", toneRule: "Mid class อ + live ending (สระ เอา counts as live) = mid tone", lesson: 11 }),
  ThaiWord.fromPlain({ name: "ตอบ", romanization: "dtaawp", meaning: "to answer", tone: "low", toneRule: "Mid class ต + dead ending (P-stop บ) = low tone", lesson: 11 }),

  // === Lesson 12 ===
  ThaiWord.fromPlain({ name: "ขา", romanization: "khaa", meaning: "leg", tone: "rising", toneRule: "High class ข + live ending (long vowel า) = rising tone", lesson: 12 }),
  ThaiWord.fromPlain({ name: "ฉัน", romanization: "chan", meaning: "I (informal)", tone: "rising", toneRule: "High class ฉ + live ending (น final) = rising tone", lesson: 12 }),
  ThaiWord.fromPlain({ name: "เขียน", romanization: "khiian", meaning: "to write", tone: "rising", toneRule: "High class ข + live ending (long vowel เอีย + น final) = rising tone", lesson: 12 }),

  // === Lesson 13 ===
  ThaiWord.fromPlain({ name: "เบอร์", romanization: "booe", meaning: "number (loanword)", tone: "mid", toneRule: "Mid class บ + live ending (long vowel เออ); ร์ is silent (การันต์)", lesson: 13 }),
  ThaiWord.fromPlain({ name: "สัตว์", romanization: "sat", meaning: "animal", tone: "low", toneRule: "High class ส + dead ending (T-stop ต); ว์ is silent (การันต์). High class + dead = low tone", lesson: 13 }),
  ThaiWord.fromPlain({ name: "ศีล", romanization: "siin", meaning: "moral precept", tone: "rising", toneRule: "High class ศ + live ending (long vowel อี + ล makes 'n' sound) = rising tone", lesson: 13 }),
  ThaiWord.fromPlain({ name: "เยอะ", romanization: "yoe", meaning: "many, much", tone: "high", toneRule: "Low class ย + dead ending (short vowel เออะ) = high tone", lesson: 13 }),

  // === Lesson 14 ===
  ThaiWord.fromPlain({ name: "ฝน", romanization: "fon", meaning: "rain", tone: "rising", toneRule: "High class ฝ + live ending (น final) = rising tone", lesson: 14 }),
  ThaiWord.fromPlain({ name: "ผนัง", romanization: "pha-nang", meaning: "wall", tone: "mid", toneRule: "Two syllables", lesson: 14 }),
  ThaiWord.fromPlain({ name: "เมือง", romanization: "muueang", meaning: "city", tone: "mid", toneRule: "Low class ม + live ending (ง final) = mid tone", lesson: 14 }),

  // === Lesson 15 ===
  ThaiWord.fromPlain({ name: "หมี", romanization: "mii", meaning: "bear", tone: "rising", toneRule: "ห changes low class ม to follow high class rules. High class + live ending = rising tone", lesson: 15, mnemonic: "Silent ห before ม makes it high class" }),
  ThaiWord.fromPlain({ name: "หัว", romanization: "hua", meaning: "head", tone: "rising", toneRule: "High class ห + live ending = rising tone", lesson: 15 }),
  ThaiWord.fromPlain({ name: "สวน", romanization: "suan", meaning: "garden", tone: "rising", toneRule: "High class ส + live ending (น final) = rising tone", lesson: 15 }),

  // === Lesson 16 ===
  ThaiWord.fromPlain({ name: "ดำ", romanization: "dam", meaning: "black", tone: "mid", toneRule: "Mid class ด + สระ อำ (live ending because of built-in ม) = mid tone", lesson: 16 }),
  ThaiWord.fromPlain({ name: "ภูเขา", romanization: "phuu-khao", meaning: "mountain", tone: "mid", toneRule: "Two syllables: ภู (mid tone) + เขา (rising tone, high class ข)", lesson: 16 }),
  ThaiWord.fromPlain({ name: "ธรรม", romanization: "tham", meaning: "dharma, teaching of Buddha", tone: "mid", toneRule: "Uses ร หัน (double ร = short a sound)", lesson: 16 }),
  ThaiWord.fromPlain({ name: "สัญญา", romanization: "san-yaa", meaning: "promise", tone: "rising", toneRule: "First syllable: สัญ (rising, high class ส). Second syllable: ญา (mid, low class ญ)", lesson: 16 }),

  // === Lesson 17 ===
  ThaiWord.fromPlain({ name: "ไก่", romanization: "gai", meaning: "chicken", tone: "low", toneRule: "Mid class ก + ไม้เอก = low tone", lesson: 17 }),
  ThaiWord.fromPlain({ name: "เบื่อ", romanization: "buuea", meaning: "to be bored", tone: "low", toneRule: "Mid class บ + ไม้เอก = low tone", lesson: 17 }),
  ThaiWord.fromPlain({ name: "แก้ว", romanization: "gaaeo", meaning: "glass (drinking)", tone: "falling", toneRule: "Mid class ก + ไม้โท = falling tone. Without tone mark แกว = 'hint/clue' (mid tone)", lesson: 17 }),

  // === Lesson 18 ===
  ThaiWord.fromPlain({ name: "โต๊ะ", romanization: "dto", meaning: "table", tone: "high", toneRule: "Mid class ต + ไม้ตรี = high tone. Without tone mark would be low tone (mid class + dead ending)", lesson: 18 }),
  ThaiWord.fromPlain({ name: "เจ๋ง", romanization: "jeeng", meaning: "cool", tone: "rising", toneRule: "Mid class จ + ไม้จัตวา = rising tone", lesson: 18 }),

  // === Lesson 19 ===
  ThaiWord.fromPlain({ name: "กฎ", romanization: "got", meaning: "rule, law", tone: "low", toneRule: "Mid class ก + dead ending (ฎ T-stop) + unwritten สระ โอะ = low tone", lesson: 19 }),
  ThaiWord.fromPlain({ name: "แถว", romanization: "thaaeo", meaning: "row, area", tone: "rising", toneRule: "High class ถ + live ending (ว final) = rising tone", lesson: 19 }),
  ThaiWord.fromPlain({ name: "รัฐ", romanization: "rat", meaning: "state, government", tone: "high", toneRule: "Low class ร + dead ending (short vowel + T-stop ฐ) = high tone", lesson: 19 }),

  // === Lesson 20 ===
  ThaiWord.fromPlain({ name: "ครุฑ", romanization: "khrut", meaning: "Garuda (mythical eagle)", tone: "high", toneRule: "Low class ค + consonant cluster คร + dead ending (short vowel + T-stop ฑ) = high tone", lesson: 20 }),
  ThaiWord.fromPlain({ name: "พัฒนา", romanization: "phat-tha-naa", meaning: "to develop", tone: "high", toneRule: "3 syllables: พัฒ (high) + ฒ-น (high, unwritten vowel) + นา (mid)", lesson: 20 }),

  // === Lesson 21 ===
  ThaiWord.fromPlain({ name: "นาฬิกา", romanization: "naa-li-gaa", meaning: "clock", tone: "mid", toneRule: "Three syllables: นา (mid) + ฬิ (high) + กา (mid)", lesson: 21 }),
  ThaiWord.fromPlain({ name: "เมฆ", romanization: "meek", meaning: "cloud", tone: "falling", toneRule: "Low class ม + dead ending (long vowel เอ + K-stop ฆ) = falling tone", lesson: 21 }),

  // === Lesson 22 ===
  ThaiWord.fromPlain({ name: "ข้าว", romanization: "khaao", meaning: "rice", tone: "falling", toneRule: "High class ข + ไม้โท = falling tone. Without tone mark: ขาว (rising) = 'white'", lesson: 22 }),
  ThaiWord.fromPlain({ name: "ให้", romanization: "hai", meaning: "to give, to allow", tone: "falling", toneRule: "High class ห + ไม้โท = falling tone. One of the most common Thai words", lesson: 22 }),
  ThaiWord.fromPlain({ name: "ฤดู", romanization: "rue-duu", meaning: "season", tone: "high", toneRule: "ฤ = low class ร + short vowel (dead ending) = high tone. ดู = mid class + live ending = mid tone", lesson: 22 }),

  // === Lesson 23 ===
  ThaiWord.fromPlain({ name: "คู่", romanization: "khuu", meaning: "pair, couple", tone: "falling", toneRule: "Low class ค + ไม้เอก = FALLING tone (low class mai ek = falling, not low!)", lesson: 23 }),
  ThaiWord.fromPlain({ name: "ที่นี่", romanization: "thii-nii", meaning: "here", tone: "falling", toneRule: "Both syllables: low class + ไม้เอก = falling tone", lesson: 23 }),

  // === Lesson 24 ===
  ThaiWord.fromPlain({ name: "น้ำ", romanization: "nam", meaning: "water", tone: "high", toneRule: "Low class น + ไม้โท = HIGH tone (low class mai tho = high, not falling!)", lesson: 24 }),
  ThaiWord.fromPlain({ name: "ร้าน", romanization: "raan", meaning: "shop", tone: "high", toneRule: "Low class ร + ไม้โท = high tone", lesson: 24 }),
  ThaiWord.fromPlain({ name: "เนย", romanization: "nooei", meaning: "butter", tone: "mid", toneRule: "Low class น + live ending. Special: เ_ย pattern -- the vowel is สระ เออ, not สระ เอ. When final consonant is ย, the สระ อิ is NOT written", lesson: 24 }),

  // === Lesson 25 ===
  ThaiWord.fromPlain({ name: "ทราย", romanization: "saai", meaning: "sand", tone: "mid", toneRule: "Irregular: ทร makes an 'S' sound (like ซ). Low class + live ending = mid tone", lesson: 25 }),
  ThaiWord.fromPlain({ name: "จริง", romanization: "jing", meaning: "real, true", tone: "mid", toneRule: "Irregular: ร is silent in cluster with จ. Mid class จ + live ending (ง final) = mid tone", lesson: 25 }),
  ThaiWord.fromPlain({ name: "อย่า", romanization: "yaa", meaning: "don't", tone: "low", toneRule: "Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone", lesson: 25, mnemonic: "One of only 4 words with silent อ before ย. Mnemonic: อย่าอยู่อย่างอยาก = 'Don't exist in a state of desire'" }),
  ThaiWord.fromPlain({ name: "อยู่", romanization: "yuu", meaning: "to stay, to be at", tone: "low", toneRule: "Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone", lesson: 25 }),
  ThaiWord.fromPlain({ name: "อย่าง", romanization: "yaang", meaning: "a type, a style", tone: "low", toneRule: "Silent อ before ย makes ย act like mid class. Mid class + ไม้เอก = low tone", lesson: 25 }),
  ThaiWord.fromPlain({ name: "อยาก", romanization: "yaak", meaning: "to want", tone: "low", toneRule: "Silent อ before ย makes ย act like mid class. Mid class + dead ending = low tone", lesson: 25 }),
];

// ============================================================================
// Live ending consonants
// ============================================================================

export const liveEndingConsonants = [
  { character: "ง", sound: "ng", description: "same as end of 'sing'" },
  { character: "น", sound: "n", description: "same as end of 'sun'" },
  { character: "ม", sound: "m", description: "same as end of 'sum'" },
  { character: "ย", sound: "i", description: "blends with vowel, like Y in 'boy'" },
  { character: "ว", sound: "o", description: "blends with vowel, adds slight 'o'" },
  { character: "ร", sound: "n", description: "as final consonant, sounds like น" },
  { character: "ล", sound: "n", description: "as final consonant, sounds like น" },
];

export const deadEndingSounds = [
  { sound: "K-stop", consonants: ["ก", "ข", "ค", "ฆ"], description: "Close off air at back of throat" },
  { sound: "T-stop", consonants: ["ด", "ต", "ท", "ธ", "ถ", "ฐ", "ฑ", "ฒ", "จ", "ช", "ซ", "ศ", "ษ", "ส", "ฎ", "ฏ"], description: "Tongue touches near teeth, no air released" },
  { sound: "P-stop", consonants: ["บ", "ป", "พ", "ฟ", "ภ", "ผ", "ฝ"], description: "Close lips, no air released" },
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
  { number: 1, title: "Maaw maa, Naaw nuu, and Long a", focus: "Two low class consonants and one vowel", consonants: ["ม", "น"], vowels: ["า"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L1_tpod101_video-h.webm" },
  { number: 2, title: "Ngaaw nguu, Yaaw yak, Waaw waaen, and Tone Rules", focus: "Three low class consonants and first tone rule", consonants: ["ง", "ย", "ว"], vowels: [], toneMarks: [], toneRulesIntroduced: ["low-live"], specialRulesIntroduced: ["live-endings"], videoUrl: "/thai-script/videos/TAME_L2_tpod101_video-h.webm" },
  { number: 3, title: "Gaaw gai, Daaw dek, Baaw baimai, and Long i", focus: "Three mid class consonants, dead endings, and long i vowel", consonants: ["ก", "ด", "บ"], vowels: [" ี"], toneMarks: [], toneRulesIntroduced: ["mid-live"], specialRulesIntroduced: ["dead-endings"], videoUrl: "/thai-script/videos/TAME_L3_tpod101_video-h.webm" },
  { number: 4, title: "Chaaw chaang, Saaw soo, Short a, and Short i", focus: "Two low class consonants, two short vowels, and high tone rule", consonants: ["ช", "ซ"], vowels: ["ะ", "ั", " ิ"], toneMarks: [], toneRulesIntroduced: ["low-dead-short"], specialRulesIntroduced: ["mai-han-akat"], videoUrl: "/thai-script/videos/TAME_L4_tpod101_video-h.webm" },
  { number: 5, title: "Phaaw phaan, Faaw fan, Short u, and Long u", focus: "Two low class consonants, u vowels, and falling tone rule", consonants: ["พ", "ฟ"], vowels: ["ุ", "ู"], toneMarks: [], toneRulesIntroduced: ["low-dead-long"], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L5_tpod101_video-h.webm" },
  { number: 6, title: "Khaaw khwaai, Short ue, and Long ue", focus: "One low class consonant and ue vowels", consonants: ["ค"], vowels: [" ึ", " ื"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["sara-uee-placeholder"], videoUrl: "/thai-script/videos/TAME_L6_tpod101_video-h.webm" },
  { number: 7, title: "Thaaw thahaan, Haaw nok-huuk, Short e, and Long e", focus: "Two low class consonants and front vowels", consonants: ["ท", "ฮ"], vowels: ["เ", "เ-ะ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L7_tpod101_video-h.webm" },
  { number: 8, title: "Raaw ruuea, Laaw ling, Short ae, and Long ae", focus: "Two low class consonants and ae vowels", consonants: ["ร", "ล"], vowels: ["แ", "แ-ะ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L8_tpod101_video-h.webm" },
  { number: 9, title: "Jaaw jaan, Dtaaw dtao, Bpaaw bplaa, Short o, and Long o", focus: "Three mid class consonants and o vowels", consonants: ["จ", "ต", "ป"], vowels: ["โ", "โ-ะ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L9_tpod101_video-h.webm" },
  { number: 10, title: "Ao, Ai mai-malaai, Ai mai-muuan, and Mai-yamok", focus: "Diphthongs and repetition symbol", consonants: [], vowels: ["เ-า", "ไ", "ใ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["consonant-clusters", "ao-ai-tone-exception", "mai-yamok"], videoUrl: "/thai-script/videos/TAME_L10_tpod101_video-h.webm" },
  { number: 11, title: "The Silent Letter aaw aang", focus: "Silent consonant อ and aw vowels", consonants: ["อ"], vowels: ["อ (as vowel)", "เ-าะ"], toneMarks: [], toneRulesIntroduced: ["mid-dead-short", "mid-dead-long"], specialRulesIntroduced: ["o-ang-dual-role"], videoUrl: "/thai-script/videos/TAME_L11_tpod101_video-h.webm" },
  { number: 12, title: "Khaaw khai, Chaaw ching, Short ia, and Long ia", focus: "First high class consonants and ia vowels", consonants: ["ข", "ฉ"], vowels: ["เ-ีย", "เ-ียะ"], toneMarks: [], toneRulesIntroduced: ["high-live"], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L12_tpod101_video-h.webm" },
  { number: 13, title: "Saaw saalaa, Saaw ruuesii, Saaw suuea, Short oe, and Long oe", focus: "Three high class S-consonants, oe vowels, and gaaran", consonants: ["ศ", "ษ", "ส"], vowels: ["เ-อ", "เ-อะ"], toneMarks: [], toneRulesIntroduced: ["high-dead-short", "high-dead-long"], specialRulesIntroduced: ["gaaran"], videoUrl: "/thai-script/videos/TAME_L13_tpod101_video-h.webm" },
  { number: 14, title: "Phaaw phueng, Faaw faa, Short uea, and Long uea", focus: "Two high class consonants and uea vowels", consonants: ["ผ", "ฝ"], vowels: ["เ-ือ", "เ-ือะ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L14_tpod101_video-h.webm" },
  { number: 15, title: "The class-changing Haaw hiip, Short ua, and Long ua", focus: "High class ห as class-changer and ua vowels", consonants: ["ห"], vowels: ["-ัว", "-ัวะ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["hor-nam"], videoUrl: "/thai-script/videos/TAME_L15_tpod101_video-h.webm" },
  { number: 16, title: "Phaaw samphao, Thaaw thong, Naaw neen, Yaaw ying, and sara am", focus: "Four low class consonants and sara am", consonants: ["ภ", "ธ", "ณ", "ญ"], vowels: ["ำ"], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["sara-am-properties", "ror-han"], videoUrl: "/thai-script/videos/TAME_L16_tpod101_video-h.webm" },
  { number: 17, title: "Tone Rules Part 1 - mai ek and mai tho", focus: "First two tone marks with mid class consonants", consonants: [], vowels: [], toneMarks: ["่", "้"], toneRulesIntroduced: [], specialRulesIntroduced: ["tone-mark-placement"], videoUrl: "/thai-script/videos/TAME_L17_tpod101_video-h.webm" },
  { number: 18, title: "Tone Rules Part 2 - mai tri and mai chattawa", focus: "Last two tone marks (mid class only)", consonants: [], vowels: [], toneMarks: ["๊", "๋"], toneRulesIntroduced: [], specialRulesIntroduced: ["mai-tri-chattawa-middle-only"], videoUrl: "/thai-script/videos/TAME_L18_tpod101_video-h.webm" },
  { number: 19, title: "Thaaw thung, Thaaw thaan, Daaw chada, Dtaaw bpatak", focus: "Two high class and two mid class rare consonants", consonants: ["ถ", "ฐ", "ฎ", "ฏ"], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["unwritten-vowels"], videoUrl: "/thai-script/videos/TAME_L19_tpod101_video-h.webm" },
  { number: 20, title: "Thaaw monthoo and Thaaw phuuthao", focus: "Two low class rare consonants", consonants: ["ฑ", "ฒ"], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L20_tpod101_video-h.webm" },
  { number: 21, title: "Laaw julaa and Khaaw rakhang", focus: "Last two low class consonants + high class tone marks", consonants: ["ฬ", "ฆ"], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L21_tpod101_video-h.webm" },
  { number: 22, title: "Obsolete consonants, rare vowels, and ฌ", focus: "ฃ, ฅ (obsolete), ฤ, ฤๅ, ฦ, ฦๅ, ฌ", consonants: ["ฃ", "ฅ", "ฌ"], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["obsolete-consonants"], videoUrl: "/thai-script/videos/TAME_L22_tpod101_video-h.webm" },
  { number: 23, title: "Thai Numerals 1-3 and Low Class Mai Ek", focus: "Numbers and low class tone mark rules", consonants: [], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L23_tpod101_video-h.webm" },
  { number: 24, title: "Thai Numerals 4-6, เ_ย pattern, and Low Class Mai Tho", focus: "Numbers, irregular vowel pattern, and tone rules", consonants: [], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: [], videoUrl: "/thai-script/videos/TAME_L24_tpod101_video-h.webm" },
  { number: 25, title: "Thai Numerals 7-0 and Irregular Spellings", focus: "Final numbers and spelling exceptions", consonants: [], vowels: [], toneMarks: [], toneRulesIntroduced: [], specialRulesIntroduced: ["tho-ro-s-sound", "silent-ro-clusters", "silent-o-before-yo"], videoUrl: "/thai-script/videos/TAME_L25_tpod101_video-h.webm" },
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
    description: "Tone rules when a tone mark is present (overrides spelling-based rules)",
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
