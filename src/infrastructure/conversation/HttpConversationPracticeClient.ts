import type {
	ConversationJudgeResult,
	ConversationNextResult,
	ConversationSessionStartResult,
	ConversationVerdict,
} from "../../domain/conversation/types";
import type { ConversationPracticePort } from "../../domain/ports/ConversationPracticePort";

/**
 * Where the local conversation backend listens (`docs/conversation-backend-api.md`).
 * A module constant, not user-configurable: the backend is a local-only,
 * single-user process, and the deployed GitHub Pages build can't reach it at
 * all — which is exactly the `"unavailable"` path below.
 */
export const CONVERSATION_BACKEND_BASE_URL = "http://localhost:8000";

/**
 * Generous on purpose: a cold backend loads Whisper, a 7B judge model and
 * TTS before it answers, and a judged reply is seconds of real GPU work. The
 * deadline exists so a request that never settles can't wedge the page
 * forever, not to police latency.
 */
export const CONVERSATION_REQUEST_TIMEOUT_MS = 60_000;

function isString(value: unknown): value is string {
	return typeof value === "string";
}

function isVerdict(value: unknown): value is ConversationVerdict {
	return value === "pass" || value === "fail" || value === "unscored";
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

/**
 * One request, with every failure flattened to `null`.
 *
 * `null` means "the backend did not answer with a usable body" and covers
 * all three failure shapes the port collapses together: `fetch` rejecting
 * (backend not running), a non-2xx status — checked *before* the body is
 * parsed, since a `500`/`422`/`404` resolves perfectly happily from
 * `fetch`'s point of view — and a request that never settles.
 *
 * The deadline is raced rather than left to the `AbortController` alone: the
 * controller is what actually cancels the in-flight request, but racing is
 * what guarantees this function returns even if nothing ever honours the
 * signal.
 */
async function fetchJson(
	path: string,
	init: RequestInit = {},
): Promise<unknown> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<null>((resolve) => {
		timer = setTimeout(() => {
			controller.abort();
			resolve(null);
		}, CONVERSATION_REQUEST_TIMEOUT_MS);
	});
	const attempt = (async (): Promise<unknown> => {
		const response = await fetch(`${CONVERSATION_BACKEND_BASE_URL}${path}`, {
			...init,
			signal: controller.signal,
		});
		return response.ok ? await response.json() : null;
	})().catch(() => null);

	try {
		return await Promise.race([attempt, deadline]);
	} finally {
		clearTimeout(timer);
	}
}

/** base64 → a `blob:` URL an `<audio>`/`new Audio(url)` can play. */
function toBlobUrl(base64: string, mimeType: string): string {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

/** A recorded `Blob` → base64, chunked so a long take can't blow the stack. */
async function toBase64(blob: Blob): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const CHUNK = 0x8000;
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
	}
	return btoa(binary);
}

/** Reads `{question_text, question_audio_base64, question_audio_mime_type}` off `body`, or `null` if any is missing/not a string. */
function questionFields(
	body: Record<string, unknown>,
): { questionText: string; questionAudioUrl: string } | null {
	const { question_text, question_audio_base64, question_audio_mime_type } =
		body;
	if (
		!isString(question_text) ||
		!isString(question_audio_base64) ||
		!isString(question_audio_mime_type)
	) {
		return null;
	}
	try {
		return {
			questionText: question_text,
			questionAudioUrl: toBlobUrl(
				question_audio_base64,
				question_audio_mime_type,
			),
		};
	} catch {
		// Undecodable base64 is a backend that isn't answering usefully.
		return null;
	}
}

/**
 * `ConversationPracticePort` over the local backend's HTTP contract
 * (`docs/conversation-backend-api.md`).
 *
 * Audio crosses the wire as base64 paired with the MIME type it was actually
 * encoded as, in both directions — never an assumed `audio/wav`. Outbound
 * that means the recorded `Blob`'s own `.type`, because `useMicRecorder` has
 * no fixed output format (Chromium gives `audio/webm;codecs=opus`); inbound
 * it means the response's declared `question_audio_mime_type`.
 */
export class HttpConversationPracticeClient
	implements ConversationPracticePort
{
	async startSession(
		knownWords: string[],
	): Promise<ConversationSessionStartResult> {
		const body = asRecord(
			await fetchJson("/conversation/session/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ known_words: knownWords }),
			}),
		);
		if (!body || !isString(body.session_id)) return { status: "unavailable" };

		const question = questionFields(body);
		if (!question) return { status: "unavailable" };

		return { status: "ok", sessionId: body.session_id, ...question };
	}

	async next(sessionId: string): Promise<ConversationNextResult> {
		const body = asRecord(
			await fetchJson(
				`/conversation/session/${encodeURIComponent(sessionId)}/next`,
				{ method: "POST" },
			),
		);
		if (!body) return { status: "unavailable" };
		if (body.exhausted === true) return { status: "exhausted" };

		const question = questionFields(body);
		if (!question) return { status: "unavailable" };

		return { status: "ok", ...question };
	}

	async judgeReply(
		sessionId: string,
		questionText: string,
		replyAudio: Blob,
	): Promise<ConversationJudgeResult> {
		let replyAudioBase64: string;
		try {
			replyAudioBase64 = await toBase64(replyAudio);
		} catch {
			return { status: "unavailable" };
		}

		const body = asRecord(
			await fetchJson(
				`/conversation/session/${encodeURIComponent(sessionId)}/judge`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						question_text: questionText,
						reply_audio_base64: replyAudioBase64,
						reply_audio_mime_type: replyAudio.type,
					}),
				},
			),
		);
		if (!body) return { status: "unavailable" };

		const { transcript, verdict, feedback_en } = body;
		if (
			!isString(transcript) ||
			!isVerdict(verdict) ||
			!isString(feedback_en)
		) {
			return { status: "unavailable" };
		}

		return { status: "ok", transcript, verdict, feedbackEn: feedback_en };
	}
}
