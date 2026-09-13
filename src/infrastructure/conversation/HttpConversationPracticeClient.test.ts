// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONVERSATION_BACKEND_URL } from "./ConversationBackendSettings";
import {
	CONVERSATION_REQUEST_TIMEOUT_MS,
	HttpConversationPracticeClient,
} from "./HttpConversationPracticeClient";

/** Blobs handed to `URL.createObjectURL`, newest last. */
let objectUrlBlobs: Blob[] = [];

function jsonResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as unknown as Response;
}

function stubFetch(impl: (...args: unknown[]) => unknown) {
	const spy = vi.fn(impl);
	globalThis.fetch = spy as unknown as typeof fetch;
	return spy;
}

const OPENING_QUESTION_BODY = {
	question_text: "สบายดีไหม",
	question_audio_base64: btoa("x"),
	question_audio_mime_type: "audio/wav",
};

beforeEach(() => {
	objectUrlBlobs = [];
	URL.createObjectURL = (blob: Blob) => {
		objectUrlBlobs.push(blob);
		return `blob:stub/${objectUrlBlobs.length}`;
	};
	URL.revokeObjectURL = () => {};
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("HttpConversationPracticeClient.startSession", () => {
	it("POSTs the known-word snapshot to the session-start endpoint and decodes the audio with the response's own MIME type", async () => {
		const audioBytes = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				session_id: "sess-1",
				question_text: "สบายดีไหม",
				question_audio_base64: btoa(String.fromCharCode(...audioBytes)),
				question_audio_mime_type: "audio/wav",
			}),
		);

		const result = await new HttpConversationPracticeClient().startSession([
			"สวัสดี",
			"ขอบคุณ",
		]);

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(
			`${DEFAULT_CONVERSATION_BACKEND_URL}/conversation/session/start`,
		);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			known_words: ["สวัสดี", "ขอบคุณ"],
		});

		expect(result).toEqual({
			status: "ok",
			sessionId: "sess-1",
			questionText: "สบายดีไหม",
			questionAudioUrl: "blob:stub/1",
		});
		expect(objectUrlBlobs).toHaveLength(1);
		expect(objectUrlBlobs[0].type).toBe("audio/wav");
		expect(new Uint8Array(await objectUrlBlobs[0].arrayBuffer())).toEqual(
			audioBytes,
		);
	});

	it("sends an empty known-word list as a real empty array, not an omitted field", async () => {
		const fetchSpy = stubFetch(async () =>
			jsonResponse({ session_id: "sess-1", ...OPENING_QUESTION_BODY }),
		);

		await new HttpConversationPracticeClient().startSession([]);

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({ known_words: [] });
	});

	it("accepts a realistic 600-word known-word snapshot without truncating it", async () => {
		const bigVocab = Array.from({ length: 600 }, (_, i) => `คำที่${i}`);
		const fetchSpy = stubFetch(async () =>
			jsonResponse({ session_id: "sess-1", ...OPENING_QUESTION_BODY }),
		);

		await new HttpConversationPracticeClient().startSession(bigVocab);

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string).known_words).toHaveLength(600);
	});

	it("treats a response with no session_id as unavailable", async () => {
		stubFetch(async () => jsonResponse(OPENING_QUESTION_BODY));

		await expect(
			new HttpConversationPracticeClient().startSession([]),
		).resolves.toEqual({ status: "unavailable" });
	});
});

describe("HttpConversationPracticeClient.next", () => {
	it("POSTs to the session-scoped next endpoint with no body and decodes the returned question", async () => {
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				question_text: "กำลังทำอะไรครับ",
				question_audio_base64: btoa("y"),
				question_audio_mime_type: "audio/wav",
			}),
		);

		const result = await new HttpConversationPracticeClient().next("sess-1");

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(
			`${DEFAULT_CONVERSATION_BACKEND_URL}/conversation/session/sess-1/next`,
		);
		expect(init.method).toBe("POST");
		expect(init.body).toBeUndefined();
		expect(result).toEqual({
			status: "ok",
			questionText: "กำลังทำอะไรครับ",
			questionAudioUrl: "blob:stub/1",
		});
	});

	it("maps an exhausted response to its own named state, not a question or a crash", async () => {
		stubFetch(async () => jsonResponse({ exhausted: true }));

		await expect(
			new HttpConversationPracticeClient().next("sess-1"),
		).resolves.toEqual({ status: "exhausted" });
	});
});

describe("HttpConversationPracticeClient.judgeReply", () => {
	it("POSTs the contracted body, session-scoped, including the recorded blob's own MIME type, and maps the response into the domain verdict shape", async () => {
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				transcript: "สบายดีค่ะ",
				verdict: "pass",
				feedback_en: "Correct — a natural, on-topic reply.",
			}),
		);
		const reply = new Blob([Uint8Array.from([1, 2, 3])], {
			type: "audio/webm;codecs=opus",
		});

		const result = await new HttpConversationPracticeClient().judgeReply(
			"sess-1",
			"สบายดีไหม",
			reply,
		);

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(
			`${DEFAULT_CONVERSATION_BACKEND_URL}/conversation/session/sess-1/judge`,
		);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			question_text: "สบายดีไหม",
			reply_audio_base64: btoa(String.fromCharCode(1, 2, 3)),
			reply_audio_mime_type: "audio/webm;codecs=opus",
		});

		expect(result).toEqual({
			status: "ok",
			transcript: "สบายดีค่ะ",
			verdict: "pass",
			feedbackEn: "Correct — a natural, on-topic reply.",
		});
	});

	it("maps the contract's third verdict, unscored, rather than collapsing it into fail", async () => {
		stubFetch(async () =>
			jsonResponse({
				transcript: "",
				verdict: "unscored",
				feedback_en: "The judge's answer could not be read.",
			}),
		);

		const result = await new HttpConversationPracticeClient().judgeReply(
			"sess-1",
			"สบายดีไหม",
			new Blob([Uint8Array.from([1])], { type: "audio/ogg" }),
		);

		expect(result).toEqual({
			status: "ok",
			transcript: "",
			verdict: "unscored",
			feedbackEn: "The judge's answer could not be read.",
		});
	});
});

describe("HttpConversationPracticeClient — the backend not answering", () => {
	it("resolves every call to unavailable when fetch rejects because the backend is not running", async () => {
		stubFetch(async () => {
			throw new TypeError("Failed to fetch");
		});
		const client = new HttpConversationPracticeClient();

		await expect(client.startSession([])).resolves.toEqual({
			status: "unavailable",
		});
		await expect(client.next("sess-1")).resolves.toEqual({
			status: "unavailable",
		});
		await expect(
			client.judgeReply(
				"sess-1",
				"สบายดีไหม",
				new Blob([], { type: "audio/webm" }),
			),
		).resolves.toEqual({ status: "unavailable" });
	});

	for (const status of [500, 422, 404]) {
		// The body here is deliberately *well-formed* — the contracted
		// success fields, returned under an error status. That is the only
		// body shape that can tell "checks `response.ok` first" apart from
		// "parses whatever came back": an error envelope fails field
		// validation anyway, so it would pass either way. The status is
		// authoritative; a body that happens to look right does not make a
		// 500 a success. 404 is also the real shape a stale/unknown
		// session id answers with (task 3.1) — it maps to the same
		// `"unavailable"` state as any other unreachable backend, since the
		// frontend has no separate "your session expired" UI to show.
		it(`treats a ${status} response as unavailable even when its body is contract-shaped`, async () => {
			// Every field any of the three endpoints' success body could
			// contain, merged into one response: which fields a given call
			// "needs" is irrelevant here, since `response.ok` is checked
			// before any of them are ever read.
			stubFetch(async () =>
				jsonResponse(
					{
						session_id: "sess-1",
						transcript: "สบายดีค่ะ",
						verdict: "pass",
						feedback_en: "Correct.",
						...OPENING_QUESTION_BODY,
					},
					status,
				),
			);
			const client = new HttpConversationPracticeClient();

			await expect(client.startSession([])).resolves.toEqual({
				status: "unavailable",
			});
			await expect(client.next("sess-1")).resolves.toEqual({
				status: "unavailable",
			});
			await expect(
				client.judgeReply(
					"sess-1",
					"สบายดีไหม",
					new Blob([], { type: "audio/webm" }),
				),
			).resolves.toEqual({ status: "unavailable" });
		});
	}

	it("treats a non-2xx with an unparseable body as unavailable, never an unhandled parse error", async () => {
		stubFetch(async () => ({
			ok: false,
			status: 500,
			json: async () => {
				throw new SyntaxError("Unexpected token < in JSON at position 0");
			},
		}));

		await expect(
			new HttpConversationPracticeClient().startSession([]),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("treats a 200 whose body is missing the contracted fields as unavailable, never ok with a garbage verdict", async () => {
		stubFetch(async () => jsonResponse({ verdict: "maybe" }));

		await expect(
			new HttpConversationPracticeClient().judgeReply(
				"sess-1",
				"สบายดีไหม",
				new Blob([], { type: "audio/webm" }),
			),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("resolves to unavailable within the bounded timeout when the request never settles", async () => {
		vi.useFakeTimers();
		stubFetch(() => new Promise(() => {}));

		const pending = new HttpConversationPracticeClient().startSession([]);
		let settled = false;
		void pending.then(() => {
			settled = true;
		});

		await vi.advanceTimersByTimeAsync(CONVERSATION_REQUEST_TIMEOUT_MS - 1);
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(2);
		expect(settled).toBe(true);
		await expect(pending).resolves.toEqual({ status: "unavailable" });
	});
});
