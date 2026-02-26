export class LearnableItem {
  constructor(public readonly priority?: number) { }

}

export class ThaiSymbol extends LearnableItem {
  constructor(
    public readonly character: string,
    public readonly name: string,
    public readonly mnemonic?: string,
    priority?: number
  ) {
    super(priority);
  }
  static fromPlain({ character, name, mnemonic, priority }: { character: string; name: string; mnemonic?: string; priority?: number }): ThaiSymbol {
    return new ThaiSymbol(character, name, mnemonic, priority);
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
    mnemonic?: string,
    priority?: number
  ) {
    super(character, name, mnemonic, priority);
  }
  static fromPlain({ character, name, nameRomanized, nameMeaning, classType, hasDeadEnding, isAspirated, mnemonic, priority }: { character: string; name: string; nameRomanized: string; nameMeaning: string; classType: ThaiSymbolClass; hasDeadEnding: boolean; isAspirated: boolean; mnemonic?: string; priority?: number }): ThaiConsonant {
    return new ThaiConsonant(character, name, nameRomanized, nameMeaning, classType, hasDeadEnding, isAspirated, mnemonic, priority);
  }
}

export class ThaiVowel extends ThaiSymbol {
  constructor(
    character: string,
    name: string,
    public readonly length: "short" | "long",
    mnemonic?: string,
    priority?: number
  ) {
    super(character, name, mnemonic, priority);
  }
  static fromPlain({ character, name, length, mnemonic, priority }: { character: string; name: string; length: "short" | "long"; mnemonic?: string; priority?: number }): ThaiVowel {
    return new ThaiVowel(character, name, length, mnemonic, priority);
  }
}

export class ThaiTone extends ThaiSymbol {
  static fromPlain({ character, name, mnemonic, priority }: { character: string; name: string; mnemonic?: string; priority?: number }): ThaiTone {
    return new ThaiTone(character, name, mnemonic, priority);
  }
}

export class ThaiWord {
  constructor(
    public readonly name: string,
    public readonly characters: ThaiSymbol[],
    public readonly romanization: string,
    public readonly meaning: string,
    public readonly mnemonic?: string
  ) { }
  static fromPlain({ name, characters, romanization, meaning, mnemonic }: { name: string; characters: ThaiSymbol[]; romanization: string; meaning: string; mnemonic?: string }): ThaiWord {
    return new ThaiWord(name, characters, romanization, meaning, mnemonic);
  }
}

export enum ThaiSymbolClass {
  High = "high",
  Mid = "mid",
  Low = "low",
}

const alphabet: ThaiSymbol[] = [
  // Consonants
  ThaiConsonant.fromPlain({ character: "ก", name: "ก ไก่", nameRomanized: "ko kai", nameMeaning: "chicken", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false, mnemonic: "The shape of the character is a reminder of a chicken. The sound is the same as the end of 'sing'. It can also start a syllable (Makes similar to c in Scooter, unaspirated), but it is more common at the end of a syllable. At the end of a syllable, it is a dead ending. It makes a K-stop. " }),
  ThaiConsonant.fromPlain({ character: "ข", name: "ข ไข่", nameRomanized: "kho khai", nameMeaning: "egg", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ฃ", name: "ฃ ขวด", nameRomanized: "kho khuat", nameMeaning: "bottle", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ค", name: "ค ควาย", nameRomanized: "kho khwai", nameMeaning: "water buffalo", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true, mnemonic: "Makes a K-sound like the letter K in Kite. It is aspirated, which means that it is pronounced with a burst of air. The shape of the character is a reminder of a water buffalo, which has big horns that can be a reminder of the burst of air when pronouncing the sound. As a final sound, it is a dead ending. It makes a K-stop." }),
  ThaiConsonant.fromPlain({ character: "ฅ", name: "ฅ คน", nameRomanized: "kho khon", nameMeaning: "person", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ฆ", name: "ฆ ระฆัง", nameRomanized: "kho rakhang", nameMeaning: "bell", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ง", name: "ง งู", nameRomanized: "ngo ngu", nameMeaning: "snake", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: "Think of a snake coiled up. The shape of the character is a reminder of the shape of a snake. Same sound as the end of \"Sing\". The sounds can also start a syllable, but it is more common at the end of a syllable." }),
  ThaiConsonant.fromPlain({ character: "จ", name: "จ จาน", nameRomanized: "cho chan", nameMeaning: "plate", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฉ", name: "ฉ ฉิ่ง", nameRomanized: "cho ching", nameMeaning: "cymbals", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ช", name: "ช ช้าง", nameRomanized: "cho chang", nameMeaning: "elephant", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true, mnemonic: "As the initial Sound of a syllable, it sounds like the end of 'beige'. At the end of a syllable, it is a dead ending. It makes a T-stop. We can remember the character by thinking that it looks like an elephant with a trunk and big ears." }),
  ThaiConsonant.fromPlain({ character: "ซ", name: "ซ โซ่", nameRomanized: "sao so", nameMeaning: "chain", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true, mnemonic: "As the initial sound of a syllable it sounds like S in Sun. As the final sound of a syllable, it is a dead ending. It makes a T-stop. It looks similar to cho chiang but has an indentation on the top." }),
  ThaiConsonant.fromPlain({ character: "ฌ", name: "ฌ เฌอ", nameRomanized: "cho choe", nameMeaning: "tree", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true }),
  ThaiConsonant.fromPlain({ character: "ญ", name: "ญ หญิง", nameRomanized: "yo ying", nameMeaning: "woman", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฎ", name: "ฎ ชฎา", nameRomanized: "do cha-da", nameMeaning: "headdress", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฏ", name: "ฏ ปฏัก", nameRomanized: "to pa-tak", nameMeaning: "pike", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฐ", name: "ฐ ฐาน", nameRomanized: "tho than", nameMeaning: "base", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฑ", name: "ฑ มณโฑ", nameRomanized: "tho montho", nameMeaning: "montho", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฒ", name: "ฒ ผู้เฒ่า", nameRomanized: "tho phu-thao", nameMeaning: "elder", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ณ", name: "ณ เณร", nameRomanized: "no nen", nameMeaning: "novice monk", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ด", name: "ด เด็ก", nameRomanized: "do dek", nameMeaning: "child", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false, mnemonic: "As the initial sound of a syllable, it sounds like the end of 'diamond'. At the end of a syllable, it is a dead ending. It makes a T-stop. We can remember the character by thinking that the bottom left is shaped like a Diamond." }),
  ThaiConsonant.fromPlain({ character: "ต", name: "ต เต่า", nameRomanized: "to tao", nameMeaning: "turtle", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ถ", name: "ถ ถุง", nameRomanized: "tho thung", nameMeaning: "bag", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ท", name: "ท ทหาร", nameRomanized: "tho thahan", nameMeaning: "soldier", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ธ", name: "ธ ธง", nameRomanized: "tho thong", nameMeaning: "flag", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "น", name: "น หนู", nameRomanized: "no nu", nameMeaning: "mouse", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: "Similar to Mo ma, but the ring is on the other side. Imagine a mouse with a tail that curls." }),
  ThaiConsonant.fromPlain({ character: "บ", name: "บ ใบไม้", nameRomanized: "bo baimai", nameMeaning: "leaf", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false, mnemonic: "As the initial sound of a syllable, it sounds like the end of 'bucket'. At the end of a syllable, it is a dead ending. It makes a P-stop. We can remember the character by thinking that it looks like a bucket." }),
  ThaiConsonant.fromPlain({ character: "ป", name: "ป ปลา", nameRomanized: "po pla", nameMeaning: "fish", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ผ", name: "ผ ผึ้ง", nameRomanized: "pho phung", nameMeaning: "bee", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฝ", name: "ฝ ฝา", nameRomanized: "fo fa", nameMeaning: "lid", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "พ", name: "พ พาน", nameRomanized: "pho phan", nameMeaning: "offering tray", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: true, mnemonic: "As the initial sound of a syllable, it sounds like P in 'panda'. At the end of a syllable, it is a dead ending. It makes a P-stop. We can remember the character by thinking that it looks like a W shaped Pedistal." }),
  ThaiConsonant.fromPlain({ character: "ฟ", name: "ฟ ฟัน", nameRomanized: "fo fan", nameMeaning: "tooth", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: ". As the initial sound as of a syllable it makes an F-sound like 'family'. At the end of a syllable it a dead ending with P-stop. Similar to Po Pan but it has a longer vertical line on the left (For fun). We can remember the character by thinking that it looks like a tooth." }),
  ThaiConsonant.fromPlain({ character: "ภ", name: "ภ สำเภา", nameRomanized: "pho sam-phao", nameMeaning: "junk", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ม", name: "ม ม้า", nameRomanized: "mo ma", nameMeaning: "horse", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: "Think of a coffee mug with a broken handle. The rings are a reminder of where the handle used to be attached. ." }),
  ThaiConsonant.fromPlain({ character: "ย", name: "ย ยักษ์", nameRomanized: "yo yak", nameMeaning: "giant", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: "Same sound as Y in Yes when it is the initial sound of a syllable. When it is the final sound of a syllable, it sounds like the end of 'boy'. The shape of the character is a reminder of a giant with a big belly. It is the only consonant that has a loop at the bottom, which can be a reminder of a giant's big belly." }),
  ThaiConsonant.fromPlain({ character: "ร", name: "ร เรือ", nameRomanized: "ro rua", nameMeaning: "boat", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ล", name: "ล ลิง", nameRomanized: "lo ling", nameMeaning: "monkey", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ว", name: "ว แหวน", nameRomanized: "wo waen", nameMeaning: "ring", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false, mnemonic: "Same sound as W in Water when it is the initial sound of a syllable. When it is the final sound of a syllable, it sounds like the end of 'go'. The shape of the character is a reminder of a ring." }),
  ThaiConsonant.fromPlain({ character: "ศ", name: "ศ ศาลา", nameRomanized: "so sala", nameMeaning: "pavilion", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ษ", name: "ษ ฤๅษี", nameRomanized: "so rue-si", nameMeaning: "hermit", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ส", name: "ส เสือ", nameRomanized: "so suea", nameMeaning: "tiger", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ห", name: "ห หีบ", nameRomanized: "ho hip", nameMeaning: "chest", classType: ThaiSymbolClass.High, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฬ", name: "ฬ จุฬา", nameRomanized: "lo chu-la", nameMeaning: "kite", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "อ", name: "อ อ่าง", nameRomanized: "o ang", nameMeaning: "basin", classType: ThaiSymbolClass.Mid, hasDeadEnding: true, isAspirated: false }),
  ThaiConsonant.fromPlain({ character: "ฮ", name: "ฮ นกฮูก", nameRomanized: "ho nok-huk", nameMeaning: "owl", classType: ThaiSymbolClass.Low, hasDeadEnding: false, isAspirated: false }),

  // Vowels, sara in Thai
  ThaiVowel.fromPlain({ character: "ะ", name: "sara a", length: "short", mnemonic: "Similar to a in Hat" }), // It is only written with the "normal" form at the end of a syllable. When it is the initial sound of a syllable, it is written as "อ" and when it is in the middle of a syllable, it is not written at all. It is a dead ending.
  ThaiVowel.fromPlain({ character: "ั", name: "sara amark", length: "short" }),
  ThaiVowel.fromPlain({ character: "า", name: "sara aa", length: "long", mnemonic: "Looks like walking stick. Think of the sentence: \"My Faaaather walks with a stick.\". It is never used by itself, so it must always follow a consonant." }),
  ThaiVowel.fromPlain({ character: "ำ", name: "sara am", length: "long" }),
  ThaiVowel.fromPlain({ character: " ิ", name: "sara i", length: "short", mnemonic: "Makes the sound 'I' as in happy or sit. It is written above a consonant. To remember the character, think that it looks like an eye." }),
  ThaiVowel.fromPlain({ character: " ี", name: "sara ii", length: "long", mnemonic: "Like the double ee in see. It is written above a consonant. To remember the character, think that it looks like an eye, which is a reminder that the sound is like the ee in see." }),
  ThaiVowel.fromPlain({ character: " ึ", name: "sara ue", length: "short" }),
  ThaiVowel.fromPlain({ character: " ื", name: "sara uee", length: "long", mnemonic: "This vowel is a bit tricky to pronounce. It is like the sound of 'ue' in the German word 'über'. It is written above a consonant. " }),
  ThaiVowel.fromPlain({ character: "ุ", name: "sara u", length: "short", mnemonic: "Like the sound 'u' in put. It is written below a consonant." }),
  ThaiVowel.fromPlain({ character: "ู", name: "sara uu", length: "long", mnemonic: "Like O in boot. It is written below a consonant. To remember the character, think that it looks like a cup that can hold water, which is a reminder that the sound is like the 'u' in put." }),

  // Tones
  ThaiTone.fromPlain({ character: "่", name: "mai ek" }),
  ThaiTone.fromPlain({ character: "้", name: "mai tho" }),
  ThaiTone.fromPlain({ character: "๊", name: "mai tri" }),
  ThaiTone.fromPlain({ character: "๋", name: "mai chattawa" }),
];


const characterMap: Map<string, ThaiSymbol> = new Map(alphabet.map(symbol => [symbol.character, symbol]));

export function getThaiSymbol(character: string): ThaiSymbol | undefined {
  return characterMap.get(character);
}

// The thai vowels needs to be written and attached to a consonant and can be writtern on the left, right, above or below the consonant. The tone marks are also attached to the consonant and can be written above or below the consonant. The position of the vowel and tone mark can affect the pronunciation of the word.


const words: ThaiWord[] = [
  ThaiWord.fromPlain({ name: "มา", characters: [getThaiSymbol("ม")!, getThaiSymbol("า")!], romanization: "Maa", meaning: "to come" }),
  ThaiWord.fromPlain({ name: "นา", characters: [getThaiSymbol("น")!, getThaiSymbol("า")!], romanization: "Naa", meaning: "rice field" }), // Many Thai consonants have different sounds at the beginning and end of syllables, but Mo ma and No nu don't change their sound. So it is easy to build and learn new words.
  ThaiWord.fromPlain({ name: "นาน", characters: [getThaiSymbol("น")!, getThaiSymbol("า")!, getThaiSymbol("น")!], romanization: "Naan", meaning: "long time" }),
  ThaiWord.fromPlain({ name: "งาน", characters: [getThaiSymbol("ง")!, getThaiSymbol("า")!, getThaiSymbol("น")!], romanization: "Ngaan", meaning: "work" }), // The N sound at the end is a live ending, so the tone is mid even though it has a low class initial consonant and a long vowel. Tone rule 1
  ThaiWord.fromPlain({ name: "ยาว", characters: [getThaiSymbol("ย")!, getThaiSymbol("า")!, getThaiSymbol("ว")!], romanization: "Yaao", meaning: "long" }), // Mid tone because of the low class initial consonant and the long vowel and has a live ending. Tone rule 1
  ThaiWord.fromPlain({ name: "นาย", characters: [getThaiSymbol("น")!, getThaiSymbol("า")!, getThaiSymbol("ย")!], romanization: "Naay", meaning: "boss" }), // Mid tone because of the low class initial consonant and the long vowel and has a live ending. Tone rule 1
  ThaiWord.fromPlain({ name: "ดี", characters: [getThaiSymbol("ด")!, getThaiSymbol(" ี")!], romanization: "Dee", meaning: "good" }), // Mid tone because of the mid class initial consonant and the long vowel and has a live ending. Tone rule 2
  ThaiWord.fromPlain({ name: "กา", characters: [getThaiSymbol("ก")!, getThaiSymbol("า")!], romanization: "Gaa", meaning: "crow", mnemonic: "The sound a crow makes sounds like: Gaa Gaa" }), // Mid tone because of the mid class initial consonant and the long vowel and has a live ending. Tone rule 2
  ThaiWord.fromPlain({ name: "บาน", characters: [getThaiSymbol("บ")!, getThaiSymbol("า")!, getThaiSymbol("น")!], romanization: "Baan", meaning: "to bloom" }), // Mid tone because of the mid class initial consonant and the long vowel and has a live ending. Tone rule 2
  ThaiWord.fromPlain({ name: "มัน", characters: [getThaiSymbol("ม")!, getThaiSymbol("ะ")!, getThaiSymbol("น")!], romanization: "Man", meaning: "it" }),
  ThaiWord.fromPlain({ name: "นิด", characters: [getThaiSymbol("น")!, getThaiSymbol(" ิ")!, getThaiSymbol("ด")!], romanization: "Nit", meaning: "tiny" }), // High tone because of the low class initial consonant and the short vowel and has a dead ending. Tone rule 3
  ThaiWord.fromPlain({ name: "ซัก", characters: [getThaiSymbol("ซ")!, getThaiSymbol(" ั")!, getThaiSymbol("ก")!], romanization: "Sak", meaning: "to wash clothes" }), // Tricky
  ThaiWord.fromPlain({ name: "ชัด", characters: [getThaiSymbol("ช")!, getThaiSymbol(" ั")!, getThaiSymbol("ด")!], romanization: "Chat", meaning: "clearly" }), // Tricky
  ThaiWord.fromPlain({ name: "ฟัน", characters: [getThaiSymbol("ฟ")!, getThaiSymbol(" ั")!, getThaiSymbol("น")!], romanization: "Fan", meaning: "tooth" }), // Mid tone because of the low class initial consonant and the short vowel but it has a live ending. Tone rule 1
  ThaiWord.fromPlain({ name: "ดู", characters: [getThaiSymbol("ด")!, getThaiSymbol(" ู")!], romanization: "Duu", meaning: "to watch" }), // Mid tone because of the mid class initial consonant and the long vowel. Tone rule 2
  ThaiWord.fromPlain({ name: "ชุด", characters: [getThaiSymbol("ช")!, getThaiSymbol(" ุ")!, getThaiSymbol("ด")!], romanization: "Chut", meaning: "outfit/set of clothes" }), // Low class consonant + dead syllable + short vowel = high tone. Tone rule 3
  ThaiWord.fromPlain({ name: "มาก", characters: [getThaiSymbol("ม")!, getThaiSymbol("า")!, getThaiSymbol("ก")!], romanization: "Mak", meaning: "very" }), // Falling tone because of the low class initial consonant and the long vowel but it has a dead ending. Tone rule 4.  It is a common word that is used in many different contexts. For example, it can be used to mean "very good" (mak dee), "very bad" (mak mai dee), "very big" (mak yai), "very small" (mak noi), etc.
  ThaiWord.fromPlain({ name: "พูด", characters: [getThaiSymbol("พ")!, getThaiSymbol(" ู")!, getThaiSymbol("ด")!], romanization: "Puut", meaning: "to speak" }), // Low class initial consonant + long vowel + dead ending = falling tone. Tone rule 4. It is a common word that is used in many different contexts. For example, it can be used to mean "to speak Thai" (puut thai), "to speak English" (puut ang-grit), "to speak loudly" (puut rao rao), "to speak softly" (puut noi noi), etc.
  ThaiWord.fromPlain({ name: "นึก", characters: [getThaiSymbol("น")!, getThaiSymbol(" ึ")!, getThaiSymbol("ก")!], romanization: "Nuek", meaning: "to consider" }), // Initial Low class consonant + dead ending + short vowel = High Tone.  No nu + Sara ue + go gai = nuk, which means "to consider" or "to think about". It is a common word that is used in many different contexts. For example, it can be used to mean "to consider doing something" (nuk ja tam arai), "to think about something" (nuk ruea arai), "to consider someone" (nuk khon), etc.
  ThaiWord.fromPlain({ name: "พืช", characters: [getThaiSymbol("พ")!, getThaiSymbol(" ื")!, getThaiSymbol("ช")!], romanization: "Phuet", meaning: "vegetation" }), // Low class initial consonant + dead ending + long vowel = Falling tone. Tone rule 4.  It is a common word that is used in many different contexts. For example, it can be used to mean "vegetation in the forest" (phuet nai sai), "vegetation in the garden" (phuet nai suan), "vegetation in the field" (phuet nai thung), etc.
  ThaiWord.fromPlain({ name: "คืน", characters: [getThaiSymbol("ค")!, getThaiSymbol(" ื")!, getThaiSymbol("น")!], romanization: "Khuun", meaning: "to return" }), // Low class initial consonant + live ending + long vowel = Mid tone. Tone rule 1.  It is a common word that is used in many different contexts. For example, it can be used to mean "to return home" (khuun baan), "to return to work" (khuun ngan), "to return to school" (khuun rian), etc.
  ThaiWord.fromPlain({ name: "มือ", characters: [getThaiSymbol("ม")!, getThaiSymbol(" ื")!, getThaiSymbol("อ")!], romanization: "Muee", meaning: "hand" }), // Mid tone because of the low class initial consonant and the long vowel but it has a live ending. Tone rule 1. But tricky because of the ending "อ" (which is needed when sara uee is not followed by a consonant). Examples, it can be used to mean "hand in hand" (muee krap krap), "hand in hand with someone" (muee krap khon), "hand in hand with something" (muee krap arai), etc.
]


const charactersOfUniqueFinalSound: ThaiSymbol[] = [
  getThaiSymbol("ง")!, // ngo ngu, same sound as the end of "sing"
  getThaiSymbol("น")!, // no nu, same sound as the end of "sun"
  getThaiSymbol("ม")!, // mo ma, same sound as the end of "sum"
  getThaiSymbol("ย")!, // yo yak, same sound as the end of
  getThaiSymbol("ว")!, // wo waen, same sound as the end of "go"
  getThaiSymbol("ก")!, // ko kai, same sound as the end of "duck"
]

// Live or Dead syllables.
// A live endinging is one that makes it possible to keep resonating the sound. Syllables that endin long vowels are live. 
// Mo ma and No nu are the only consonants that can end a syllable with a live ending. All other consonants end a syllable with a dead ending. A syllable with a dead ending is one that cuts off the sound. Syllables that end in short vowels or any consonant other than Mo ma and No nu are dead. The tone of a syllable is determined by the class of the initial consonant, the length of the vowel, and whether the syllable ends in a live or dead ending.


// That does not have a "V" sound like the letter V in Valentine so thai speakers use the letter Wo waen to represent the "V" sound when writing loanwords. For example, the word "video" is written as "วีดีโอ" (wi-di-o) in Thai, using the letter Wo waen to represent the "V" sound.

// When Sara uee is not followed by a consonant, it is written differently. we need to add a "อ" after the vowel to make it look like this: " ือ". For example, the word "new" is written as "นิว" (niu) in Thai, using the vowel Sara uee followed by the consonant Wo waen to represent the "u" sound. However, when we want to write the word "new" without a consonant, we need to add an "อ" after the vowel to make it look like this: "นึอ" (nue). This is because the vowel Sara uee cannot be written by itself and needs to be attached to a consonant or followed by an "อ" to be written correctly.


// Particles
// Na no + Sara a = Na, which is a common particle that is used at the end of sentences to make them sound more polite.

// Tone rule 1.
// Low class initial consonant + live ending = mid tone

// Tone rule 2.
// Mid class initial consonant + live ending = mid tone

// Tone rule 3.
// A dead syllable occuers when it ends with a short vowel or one of the stopping sounds of k, t or p.
// Low class initial consonant + dead ending with a short vowel = high tone . High tone starts at a higher pitch and rises slightly. 

// Tone rule 4.
// Low class initial consonant + dead syllable with a long vowel = falling tone. Falling tone starts at a higher pitch and falls sharply.