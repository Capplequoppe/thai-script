/**
 * The originality gate: one check, consumed by every content task.
 *
 * The transcripts this course replaces are copyrighted. Facts about the Thai
 * writing system are free to reuse; the source's phrasing, its mnemonic images
 * and its curated examples are not, and the 82 mnemonic strings already in
 * `symbols.ts` are close paraphrases of exactly that material. Every task that
 * writes new prose has to be able to show that it did not paraphrase it again.
 *
 * The mechanism lives here and only here. The plan's first draft asserted an
 * overlap check in seven criteria spread across five tasks and produced it in
 * none of them, which would have meant the window width, the canary and the
 * size floor each being re-decided five times by five agents who could not see
 * each other. Content tasks import {@link checkOriginality} instead.
 *
 * ## What it compares against
 *
 * `originality-corpus.json`, built by `scripts/build-originality-corpus.py`
 * from both licensed PDF sets. That artifact holds **salted hashes and counts,
 * never text**: a gate that stored the extraction would be the largest
 * reproduction of the licensed material in the repository, which is precisely
 * the thing it exists to prevent. It is a membership oracle and nothing else.
 *
 * The normalisation and hashing below reproduce the Python side exactly. The
 * two are held together by the canary in `originality.test.ts`, which pushes a
 * phrase known to be verbatim in each PDF set through *this* code and requires
 * the *Python-built* artifact to contain it. Drift in tokenisation, Unicode
 * normalisation, the salt or the digest turns that test red.
 *
 * ## Why a canary rather than a planted overlap
 *
 * Planting a string in a fake corpus and finding it again proves the matching
 * algorithm runs. It says nothing about whether the real corpus was loaded,
 * and an empty corpus passes that test perfectly while clearing every
 * plagiarised candidate put to it. The canary is the check that the corpus is
 * *there*: a real phrase, from the real source, that must come back flagged.
 *
 * ## The third state
 *
 * A candidate is `cleared`, `overlapping`, or `not-checked`. The third exists
 * because the failure this gate is most likely to suffer is not a false clear
 * on a real paraphrase — it is the corpus silently failing to load and every
 * candidate sailing through. `not-checked` is a distinct value that no caller
 * can mistake for a pass, and {@link assertOriginal} throws on it.
 */

import corpusArtifact from "./originality-corpus.json";

/**
 * The comparison window, in tokens. **This is the single site.**
 *
 * Measured against the 82 shipped mnemonics — the only labelled positives that
 * exist, since CONTEXT.md establishes they are paraphrases of this source — an
 * 8-token window detects 17 and a 5-token window detects 48. The wider window
 * was chosen in the first draft because it sounded conservative; it is
 * near-vacuous. {@link loadOriginalityCorpus} refuses an artifact built at any
 * other width, so the constant cannot drift from the data it queries.
 */
export const NGRAM_WIDTH = 5;

/**
 * Below this many source tokens the corpus is treated as unusable.
 *
 * The real corpus carries ~42,000. The floor is not a guess at "enough to be
 * useful" — it is far enough below the real figure to never fire spuriously
 * and far enough above zero to catch the failures that matter: an empty file,
 * a truncated write, a build that found one PDF instead of fifty.
 */
export const MINIMUM_CORPUS_TOKENS = 10_000;

/** Which licensed set an n-gram came from. */
export type OriginalitySource =
	| "lesson-notes"
	| "recording-script"
	| "worksheet";

/**
 * The two sets the corpus may not be missing. The lesson notes are not
 * optional: the shipped ฌ mnemonic paraphrases a lesson-notes paragraph and
 * appears in no recording script, so a transcript-only corpus clears it.
 */
export const REQUIRED_CORPUS_SOURCES: readonly OriginalitySource[] = [
	"lesson-notes",
	"recording-script",
];

/** Where a candidate collided with the source, and in which set. */
export interface OriginalityOverlap {
	/** The candidate's own n-gram. Reporting it reproduces nothing committed. */
	readonly ngram: string;
	readonly sources: readonly OriginalitySource[];
}

/**
 * A candidate is in exactly one of three states.
 *
 * Modelled as a discriminated union rather than a status plus optional fields
 * so that "not checked" cannot be read as "cleared" by a caller that forgot to
 * look: there is no branch of this type that carries a clearance without
 * saying so.
 */
export type OriginalityResult =
	| { readonly status: "cleared"; readonly ngramsChecked: number }
	| {
			readonly status: "overlapping";
			readonly ngramsChecked: number;
			readonly overlap: OriginalityOverlap;
	  }
	| {
			readonly status: "not-checked";
			readonly ngramsChecked: 0;
			readonly reason: string;
	  };

/** A corpus that loaded and passed its floor. */
export interface OriginalityCorpus {
	readonly salt: string;
	readonly ngramWidth: number;
	readonly tokenCount: number;
	/** Truncated salted digest to OR-ed source flags. */
	readonly ngrams: Readonly<Record<string, number>>;
	/** Source name to its bit in the flag values above. */
	readonly sourceFlags: Readonly<Record<string, number>>;
}

/** Why a corpus could not be used. Carries no clearance, by construction. */
export interface OriginalityCorpusFailure {
	readonly reason: string;
}

export type CorpusLoad = OriginalityCorpus | OriginalityCorpusFailure;

export function isCorpusLoaded(load: CorpusLoad): load is OriginalityCorpus {
	return !("reason" in load);
}

/**
 * Characters that may appear inside a token: ASCII alphanumerics, Latin-1 and
 * Latin Extended-A/B plus combining diacritics (the romanisation writes "mǎa",
 * "thâo-rài"), and the whole Thai block including the vowel signs and tone
 * marks, which are combining characters.
 *
 * Spelled as explicit ranges rather than `\p{L}`/`\p{N}` because Python and
 * JavaScript do not agree on how those classify combining marks, and this
 * expression has to yield byte-identical tokens on both sides or every hash
 * disagrees. `TOKEN_PATTERN` in `build-originality-corpus.py` is the same
 * literal.
 */
// The combining range is deliberate and the lint's hazard does not arise. Its
// concern is a class that matches a combining mark *alone*, splitting a
// grapheme in two. Here the `+` takes maximal runs, so a base character and
// the marks that follow it are always taken together — which is the point: a
// decomposed "m" + U+0301 + "a" has to tokenise as one token and hash equal to
// the precomposed spelling. The alternation the rule suggests would also stop
// matching the Thai vowel signs, which legitimately follow their consonant.
// biome-ignore lint/suspicious/noMisleadingCharacterClass: see above
const TOKEN_PATTERN = /[0-9a-z\u00c0-\u024f\u0300-\u036f\u0e00-\u0e7f]+/g;

/**
 * Text to comparison tokens.
 *
 * NFC first: the PDFs are inconsistent about precomposed versus decomposed
 * accents and hand-typed prose is inconsistent in the other direction, so
 * without it a decomposed "máa" fails to match a precomposed one.
 */
export function tokenize(text: string): string[] {
	return text.normalize("NFC").toLowerCase().match(TOKEN_PATTERN) ?? [];
}

/** Every overlapping window of `width` tokens, space-joined. */
export function ngramsOf(tokens: readonly string[], width: number): string[] {
	const windows: string[] = [];
	for (let i = 0; i + width <= tokens.length; i += 1) {
		windows.push(tokens.slice(i, i + width).join(" "));
	}
	return windows;
}

/** The artifact truncates digests to this many hex characters. */
const DIGEST_HEX_CHARS = 16;

/**
 * Salted, truncated SHA-256 of one window — the mirror of `hash_ngram`.
 *
 * U+001F separates salt from payload because it cannot occur inside a token,
 * so no two salt/n-gram pairs can hash the same input. Web Crypto rather than
 * `node:crypto` keeps this module free of a Node builtin: it is domain code,
 * and the architecture has domain importing nothing outward.
 */
export async function hashNgram(salt: string, ngram: string): Promise<string> {
	const payload = new TextEncoder().encode(`${salt}\u001f${ngram}`);
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", payload));
	return Array.from(digest.slice(0, DIGEST_HEX_CHARS / 2), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

function decodeSources(
	flags: number,
	sourceFlags: Readonly<Record<string, number>>,
): OriginalitySource[] {
	return Object.entries(sourceFlags)
		.filter(([, bit]) => (flags & bit) !== 0)
		.map(([name]) => name as OriginalitySource);
}

/**
 * Validate a corpus artifact, or say why it is unusable.
 *
 * Every rejection here is a case where the alternative is a gate that reports
 * "cleared" on material it never actually compared: an empty object, a
 * truncated write, an artifact built at a width this module does not query at,
 * or one missing a whole PDF set.
 */
export function loadOriginalityCorpus(raw: unknown): CorpusLoad {
	if (typeof raw !== "object" || raw === null) {
		return { reason: "corpus artifact is not an object" };
	}
	const artifact = raw as Partial<OriginalityCorpus>;

	if (typeof artifact.salt !== "string" || artifact.salt.length === 0) {
		return { reason: "corpus artifact has no salt" };
	}
	if (artifact.ngramWidth !== NGRAM_WIDTH) {
		return {
			reason: `corpus was built at n=${String(artifact.ngramWidth)}, but this check queries n=${NGRAM_WIDTH}`,
		};
	}
	if (
		typeof artifact.ngrams !== "object" ||
		artifact.ngrams === null ||
		typeof artifact.sourceFlags !== "object" ||
		artifact.sourceFlags === null
	) {
		return { reason: "corpus artifact is missing its n-gram table" };
	}
	const sourceFlags = artifact.sourceFlags;
	if (Object.keys(artifact.ngrams).length === 0) {
		return { reason: "corpus contains no n-grams" };
	}
	if (
		typeof artifact.tokenCount !== "number" ||
		artifact.tokenCount < MINIMUM_CORPUS_TOKENS
	) {
		return {
			reason: `corpus holds ${String(artifact.tokenCount)} tokens, below the floor of ${MINIMUM_CORPUS_TOKENS}`,
		};
	}

	const present = new Set(
		Object.values(artifact.ngrams).flatMap((flags) =>
			decodeSources(flags, sourceFlags),
		),
	);
	const missing = REQUIRED_CORPUS_SOURCES.filter((set) => !present.has(set));
	if (missing.length > 0) {
		return { reason: `corpus is missing source set(s): ${missing.join(", ")}` };
	}

	return {
		salt: artifact.salt,
		ngramWidth: artifact.ngramWidth,
		tokenCount: artifact.tokenCount,
		ngrams: artifact.ngrams,
		sourceFlags,
	};
}

/** The shipped corpus, validated once at import. */
export const shippedCorpus: CorpusLoad = loadOriginalityCorpus(corpusArtifact);

/**
 * Does this candidate reuse a run of {@link NGRAM_WIDTH} tokens from the
 * licensed source?
 *
 * A candidate shorter than the window yields no comparisons and comes back
 * `cleared` with `ngramsChecked: 0` — there is nothing this measure can say
 * about a four-word phrase, and the count rides on the result so a caller can
 * see that rather than read a clearance it did not get.
 */
export async function checkOriginality(
	candidate: string,
	corpus: CorpusLoad = shippedCorpus,
): Promise<OriginalityResult> {
	if (!isCorpusLoaded(corpus)) {
		return { status: "not-checked", ngramsChecked: 0, reason: corpus.reason };
	}

	const windows = ngramsOf(tokenize(candidate), NGRAM_WIDTH);
	for (const [index, ngram] of windows.entries()) {
		const flags = corpus.ngrams[await hashNgram(corpus.salt, ngram)];
		if (flags !== undefined) {
			return {
				status: "overlapping",
				ngramsChecked: index + 1,
				overlap: { ngram, sources: decodeSources(flags, corpus.sourceFlags) },
			};
		}
	}
	return { status: "cleared", ngramsChecked: windows.length };
}

/**
 * The loud form, for content tasks that want the gate to stop them.
 *
 * Throws on `overlapping` *and* on `not-checked`. The second is the point: a
 * corpus that failed to load must not be the reason a paraphrase shipped.
 */
export async function assertOriginal(
	candidate: string,
	corpus: CorpusLoad = shippedCorpus,
): Promise<void> {
	const result = await checkOriginality(candidate, corpus);
	if (result.status === "overlapping") {
		throw new Error(
			`originality: candidate reuses a ${NGRAM_WIDTH}-token run from ${result.overlap.sources.join(", ")}: "${result.overlap.ngram}"`,
		);
	}
	if (result.status === "not-checked") {
		throw new Error(`originality: not checked — ${result.reason}`);
	}
}
