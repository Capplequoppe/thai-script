// Maps Thai symbol characters to their pronunciation audio file URLs.
// Audio files are extracted from sounds.js base64 data into public/audio/.

const BASE = "/thai-script/audio";

export const consonantAudioMap: Record<string, string> = {
	ม: `${BASE}/consonant-mo-ma.mp3`,
	น: `${BASE}/consonant-no-nu.mp3`,
	ง: `${BASE}/consonant-ngo-ngu.mp3`,
	ย: `${BASE}/consonant-yo-yak.mp3`,
	ว: `${BASE}/consonant-wo-weng.mp3`,
	ก: `${BASE}/consonant-ko-kai.mp3`,
	ด: `${BASE}/consonant-do-dek.mp3`,
	บ: `${BASE}/consonant-bo-baimai.mp3`,
	ช: `${BASE}/consonant-cho-chang.mp3`,
	ซ: `${BASE}/consonant-so-so.mp3`,
	พ: `${BASE}/consonant-pho-phan.mp3`,
	ฟ: `${BASE}/consonant-fo-fan.mp3`,
	ค: `${BASE}/consonant-kho-khwai.mp3`,
	ท: `${BASE}/consonant-tho-thahan.mp3`,
	ฮ: `${BASE}/consonant-ho-nokhu.mp3`,
	ร: `${BASE}/consonant-ro-ria.mp3`,
	ล: `${BASE}/consonant-lo-ling.mp3`,
	จ: `${BASE}/consonant-jo-jan.mp3`,
	ต: `${BASE}/consonant-to-tau.mp3`,
	ป: `${BASE}/consonant-po-pla.mp3`,
	อ: `${BASE}/consonant-o-ang.mp3`,
	ข: `${BASE}/consonant-kho-khay.mp3`,
	ฉ: `${BASE}/consonant-cho-ching.mp3`,
	ศ: `${BASE}/consonant-so-sala.mp3`,
	ษ: `${BASE}/consonant-so-risi.mp3`,
	ส: `${BASE}/consonant-so-sia.mp3`,
	ผ: `${BASE}/consonant-pho-phing.mp3`,
	ฝ: `${BASE}/consonant-fo-fa.mp3`,
	ห: `${BASE}/consonant-ho-hip.mp3`,
	ภ: `${BASE}/consonant-pho-samphau.mp3`,
	ธ: `${BASE}/consonant-tho-thong.mp3`,
	ณ: `${BASE}/consonant-no-nen.mp3`,
	ญ: `${BASE}/consonant-yo-ying.mp3`,
	ถ: `${BASE}/consonant-tho-thung.mp3`,
	ฐ: `${BASE}/consonant-tho-than.mp3`,
	ฎ: `${BASE}/consonant-do-chada.mp3`,
	ฏ: `${BASE}/consonant-to-patak.mp3`,
	ฑ: `${BASE}/consonant-tho-montho.mp3`,
	ฒ: `${BASE}/consonant-tho-phuthau.mp3`,
	ฬ: `${BASE}/consonant-lo-jula.mp3`,
	ฆ: `${BASE}/consonant-kho-rakhang.mp3`,
	// ฃ (obsolete), ฅ (obsolete), ฌ (rare) — no audio available
};

export const vowelAudioMap: Record<string, string> = {
	า: `${BASE}/sara-a-long.mp3`,
	" ี": `${BASE}/sara-i-long.mp3`,
	ะ: `${BASE}/sara-a-short.mp3`,
	"ั": `${BASE}/sara-a-short.mp3`,
	" ิ": `${BASE}/sara-i-short.mp3`,
	"ุ": `${BASE}/sara-u-short.mp3`,
	"ู": `${BASE}/sara-u-long.mp3`,
	" ึ": `${BASE}/sara-eu-short.mp3`,
	" ื": `${BASE}/sara-eu-long.mp3`,
	เ: `${BASE}/sara-e-long.mp3`,
	"เ-ะ": `${BASE}/sara-e-short.mp3`,
	แ: `${BASE}/sara-ae-long.mp3`,
	"แ-ะ": `${BASE}/sara-ae-short.mp3`,
	โ: `${BASE}/sara-o-long.mp3`,
	"โ-ะ": `${BASE}/sara-o-short.mp3`,
	"เ-า": `${BASE}/sara-au.mp3`,
	ไ: `${BASE}/sara-ay-may-malay.mp3`,
	ใ: `${BASE}/sara-ay-may-muan.mp3`,
	"อ (as vowel)": `${BASE}/sara-aw-long.mp3`,
	"เ-าะ": `${BASE}/sara-aw-short.mp3`,
	"เ-ีย": `${BASE}/sara-ia-long.mp3`,
	"เ-ียะ": `${BASE}/sara-ia-short.mp3`,
	"เ-อ": `${BASE}/sara-uh-long.mp3`,
	"เ-อะ": `${BASE}/sara-uh-short.mp3`,
	"เ-ือ": `${BASE}/sara-eua-long.mp3`,
	"เ-ือะ": `${BASE}/sara-eua-short.mp3`,
	"-ัว": `${BASE}/sara-ua-long.mp3`,
	"-ัวะ": `${BASE}/sara-ua-short.mp3`,
	ำ: `${BASE}/sara-am.mp3`,
};

export const toneMarkAudioMap: Record<string, string> = {
	"่": `${BASE}/tone-mayek.mp3`,
	"้": `${BASE}/tone-maytho.mp3`,
	"๊": `${BASE}/tone-maytri.mp3`,
	"๋": `${BASE}/tone-mayjattawa.mp3`,
};

export function getAudioUrl(character: string): string | undefined {
	return (
		consonantAudioMap[character] ??
		vowelAudioMap[character] ??
		toneMarkAudioMap[character]
	);
}
