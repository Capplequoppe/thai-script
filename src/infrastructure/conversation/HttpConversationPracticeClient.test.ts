// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CONVERSATION_BACKEND_BASE_URL,
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

describe("HttpConversationPracticeClient.getOpening", () => {
	it("POSTs the known-word snapshot to the contracted opening endpoint and decodes the audio with the response's own MIME type", async () => {
		const audioBytes = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				question_text: "สบายดีไหม",
				question_audio_base64: btoa(String.fromCharCode(...audioBytes)),
				question_audio_mime_type: "audio/wav",
			}),
		);

		const result = await new HttpConversationPracticeClient().getOpening([
			"สวัสดี",
			"ขอบคุณ",
		]);

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`${CONVERSATION_BACKEND_BASE_URL}/conversation/opening`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			known_words: ["สวัสดี", "ขอบคุณ"],
		});

		expect(result).toEqual({
			status: "ok",
			questionText: "สบายดีไหม",
			questionAudioUrl: "blob:stub/1",
		});
		// The blob behind that URL carries the declared MIME type and the
		// decoded bytes — not an assumed `audio/wav` and not the base64 text.
		expect(objectUrlBlobs).toHaveLength(1);
		expect(objectUrlBlobs[0].type).toBe("audio/wav");
		expect(new Uint8Array(await objectUrlBlobs[0].arrayBuffer())).toEqual(
			audioBytes,
		);
	});

	it("uses a non-WAV declared MIME type verbatim", async () => {
		stubFetch(async () =>
			jsonResponse({
				question_text: "สบายดีไหม",
				question_audio_base64: btoa("x"),
				question_audio_mime_type: "audio/mpeg",
			}),
		);

		await new HttpConversationPracticeClient().getOpening([]);

		expect(objectUrlBlobs[0].type).toBe("audio/mpeg");
	});

	it("sends an empty known-word list as a real empty array, not an omitted field", async () => {
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				question_text: "สบายดีไหม",
				question_audio_base64: btoa("x"),
				question_audio_mime_type: "audio/wav",
			}),
		);

		await new HttpConversationPracticeClient().getOpening([]);

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({ known_words: [] });
	});

	it("accepts a realistic 600-word known-word snapshot without truncating it", async () => {
		const bigVocab = Array.from({ length: 600 }, (_, i) => `คำที่${i}`);
		const fetchSpy = stubFetch(async () =>
			jsonResponse({
				question_text: "สบายดีไหม",
				question_audio_base64: btoa("x"),
				question_audio_mime_type: "audio/wav",
			}),
		);

		await new HttpConversationPracticeClient().getOpening(bigVocab);

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string).known_words).toHaveLength(600);
	});
});

describe("HttpConversationPracticeClient.judgeReply", () => {
	it("POSTs the contracted body including the recorded blob's own MIME type, and maps the response into the domain verdict shape", async () => {
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
			"สบายดีไหม",
			reply,
		);

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`${CONVERSATION_BACKEND_BASE_URL}/conversation/judge`);
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
	it("resolves both calls to unavailable when fetch rejects because the backend is not running", async () => {
		stubFetch(async () => {
			throw new TypeError("Failed to fetch");
		});
		const client = new HttpConversationPracticeClient();

		await expect(client.getOpening([])).resolves.toEqual({
			status: "unavailable",
		});
		await expect(
			client.judgeReply("สบายดีไหม", new Blob([], { type: "audio/webm" })),
		).resolves.toEqual({ status: "unavailable" });
	});

	for (const status of [500, 422, 404]) {
		// The body here is deliberately *well-formed* — the contracted
		// success fields, returned under an error status. That is the only
		// body shape that can tell "checks `response.ok` first" apart from
		// "parses whatever came back": an error envelope fails field
		// validation anyway, so it would pass either way. The status is
		// authoritative; a body that happens to look right does not make a
		// 500 a success.
		it(`treats a ${status} response as unavailable even when its body is contract-shaped`, async () => {
			stubFetch(async (_url, init) =>
				jsonResponse(
					(init as RequestInit | undefined)?.method === "POST"
						? {
								transcript: "สบายดีค่ะ",
								verdict: "pass",
								feedback_en: "Correct.",
							}
						: {
								question_text: "สบายดีไหม",
								question_audio_base64: btoa("x"),
								question_audio_mime_type: "audio/wav",
							},
					status,
				),
			);
			const client = new HttpConversationPracticeClient();

			await expect(client.getOpening([])).resolves.toEqual({
				status: "unavailable",
			});
			await expect(
				client.judgeReply("สบายดีไหม", new Blob([], { type: "audio/webm" })),
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
			new HttpConversationPracticeClient().getOpening([]),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("treats a 200 whose body is missing the contracted fields as unavailable, never ok with a garbage verdict", async () => {
		stubFetch(async () => jsonResponse({ verdict: "maybe" }));

		await expect(
			new HttpConversationPracticeClient().judgeReply(
				"สบายดีไหม",
				new Blob([], { type: "audio/webm" }),
			),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("resolves to unavailable within the bounded timeout when the request never settles", async () => {
		vi.useFakeTimers();
		stubFetch(() => new Promise(() => {}));

		const pending = new HttpConversationPracticeClient().getOpening([]);
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
