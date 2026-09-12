// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConversationVerdict } from "../../domain/conversation/types";
import {
	createdAudioUrls,
	MIC_FIXTURE_MIME_TYPE,
	renderWithApp,
	StubConversationPracticePort,
	setMicPermission,
} from "../test-utils/renderWithApp";
import { ConversationPracticePage } from "./ConversationPracticePage";

function portWithOpening<T extends StubConversationPracticePort>(
	port: T = new StubConversationPracticePort() as T,
): T {
	port.opening = {
		status: "ok",
		questionText: "สบายดีไหม",
		questionAudioUrl: "blob:question-audio",
	};
	return port;
}

function renderPage(
	port: StubConversationPracticePort,
	graduatedVocab?: readonly string[],
) {
	return renderWithApp(
		<ConversationPracticePage />,
		{ conversationPractice: port },
		{ graduatedVocab },
	);
}

/**
 * Wraps the harness's stub port to record the known-word list each
 * `getOpening` call was actually sent — the stub itself only records
 * `judgeReply` calls, so this test-local subclass is what proves AC2/AC3
 * without touching the shared harness.
 */
class TrackingConversationPracticePort extends StubConversationPracticePort {
	readonly openingCalls: string[][] = [];

	override async getOpening(knownWords: string[] = []) {
		this.openingCalls.push(knownWords);
		return super.getOpening();
	}
}

/** Record → stop, driving the real `useMicRecorder` state machine. */
async function recordAndStop() {
	const recordButton = await screen.findByRole("button", {
		name: "Record your reply",
	});
	await act(async () => {
		fireEvent.click(recordButton);
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
	});
}

describe("ConversationPracticePage — backend unavailable", () => {
	it("says the backend is not running and offers no record control that would do nothing", async () => {
		// The stub port's default: both calls answer `"unavailable"`.
		renderPage(new StubConversationPracticePort());

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/backend is not running/i);
		expect(screen.queryByRole("button", { name: /record/i })).toBeNull();
	});
});

describe("ConversationPracticePage — the opening question", () => {
	it("shows the Thai question text and replays its audio on demand", async () => {
		renderPage(portWithOpening());

		expect(await screen.findByText("สบายดีไหม")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Play question" }));

		expect(createdAudioUrls()).toContain("blob:question-audio");
	});
});

describe("ConversationPracticePage — the known-vocabulary snapshot it sends", () => {
	it("sends the learner's real learned-vocabulary set, not a placeholder list", async () => {
		const words = ["มา", "กิน", "กัน"];
		const port = portWithOpening(new TrackingConversationPracticePort());

		renderPage(port, words);

		await screen.findByText("สบายดีไหม");

		expect(port.openingCalls).toHaveLength(1);
		expect(new Set(port.openingCalls[0])).toEqual(new Set(words));
	});

	it("still sends a request, with a real empty array, for a learner with no learned words yet", async () => {
		const port = portWithOpening(new TrackingConversationPracticePort());

		renderPage(port);

		await screen.findByText("สบายดีไหม");

		expect(port.openingCalls).toHaveLength(1);
		expect(port.openingCalls[0]).toEqual([]);
	});
});

describe("ConversationPracticePage — recording a reply", () => {
	it("drives the recorder from idle to stopped and hands the recorded blob to judgeReply", async () => {
		const port = portWithOpening();
		port.judgement = {
			status: "ok",
			transcript: "สบายดีค่ะ",
			verdict: "pass",
			feedbackEn: "Correct.",
		};
		renderPage(port);

		await recordAndStop();

		await waitFor(() => expect(port.judgeCalls).toHaveLength(1));
		const [call] = port.judgeCalls;
		expect(call.questionText).toBe("สบายดีไหม");
		expect(call.replyAudio).toBeInstanceOf(Blob);
		expect(call.replyAudio.type).toBe(MIC_FIXTURE_MIME_TYPE);
		expect(call.replyAudio.size).toBeGreaterThan(0);
	});
});

describe("ConversationPracticePage — verdicts", () => {
	const expectations: Record<ConversationVerdict, RegExp> = {
		pass: /Good answer/,
		fail: /Not quite/,
		unscored: /could not be scored/i,
	};

	for (const verdict of ["pass", "fail", "unscored"] as ConversationVerdict[]) {
		it(`renders the ${verdict} verdict in its own words`, async () => {
			const port = portWithOpening();
			port.judgement = {
				status: "ok",
				transcript: "สบายดีค่ะ",
				verdict,
				feedbackEn: "Some feedback.",
			};
			renderPage(port);

			await recordAndStop();

			const rendered = await screen.findByText(expectations[verdict]);
			expect(rendered).toBeTruthy();

			// Distinct means distinct: the other two verdicts' wording is absent.
			for (const other of [
				"pass",
				"fail",
				"unscored",
			] as ConversationVerdict[]) {
				if (other === verdict) continue;
				expect(screen.queryByText(expectations[other])).toBeNull();
			}
		});
	}

	it("does not read an unscored turn as the learner's own mistake", async () => {
		const port = portWithOpening();
		port.judgement = {
			status: "ok",
			transcript: "",
			verdict: "unscored",
			feedbackEn: "The judge's answer could not be read.",
		};
		renderPage(port);

		await recordAndStop();

		expect(await screen.findByText(/does not count against you/i)).toBeTruthy();
	});
});

describe("ConversationPracticePage — microphone failures", () => {
	it("shows a microphone-access message distinct from the backend-unavailable one when permission is denied", async () => {
		setMicPermission("denied");
		renderPage(portWithOpening());

		const recordButton = await screen.findByRole("button", {
			name: "Record your reply",
		});
		await act(async () => {
			fireEvent.click(recordButton);
		});

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/Microphone access needed/i);
		expect(alert.textContent).not.toMatch(/backend is not running/i);
	});

	it("shows a third, distinct message for a generic recorder failure", async () => {
		setMicPermission("error");
		renderPage(portWithOpening());

		const recordButton = await screen.findByRole("button", {
			name: "Record your reply",
		});
		await act(async () => {
			fireEvent.click(recordButton);
		});

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/microphone could not be started/i);
		expect(alert.textContent).not.toMatch(/Microphone access needed/i);
		expect(alert.textContent).not.toMatch(/backend is not running/i);
	});
});
