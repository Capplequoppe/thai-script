// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MIN_GRAMMAR_POINTS } from "../../domain/conversation/services/ConversationUnlockService";
import type { ConversationVerdict } from "../../domain/conversation/types";
import grammarData from "../../domain/grammar/data/grammar.json";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import {
	createdAudioUrls,
	MIC_FIXTURE_MIME_TYPE,
	renderWithApp,
	revokedObjectUrls,
	StubConversationPracticePort,
	setMicPermission,
} from "../test-utils/renderWithApp";
import {
	ConversationPracticePage,
	knownWordsFor,
} from "./ConversationPracticePage";

/**
 * A learner comfortably above both unlock thresholds — the baseline every
 * test in this file renders with unless it's specifically exercising the
 * lock itself (see the "the unlock gate" describe block below).
 */
const UNLOCKED_VOCAB: string[] = (vocabularyData as { thai: string }[])
	.slice(0, 220)
	.map((entry) => entry.thai);
const UNLOCKED_GRAMMAR: string[] = (grammarData as { id: string }[])
	.slice(0, MIN_GRAMMAR_POINTS)
	.map((entry) => entry.id);

function portWithSession<T extends StubConversationPracticePort>(
	port: T = new StubConversationPracticePort() as T,
): T {
	port.session = {
		status: "ok",
		sessionId: "sess-1",
		questionText: "สบายดีไหม",
		questionAudioUrl: "blob:question-audio",
	};
	return port;
}

function renderPage(
	port: StubConversationPracticePort,
	options: {
		graduatedVocab?: readonly string[];
		learnedGrammar?: readonly string[];
	} = {},
) {
	return renderWithApp(
		<ConversationPracticePage />,
		{ conversationPractice: port },
		{
			graduatedVocab: options.graduatedVocab ?? UNLOCKED_VOCAB,
			learnedGrammar: options.learnedGrammar ?? UNLOCKED_GRAMMAR,
		},
	);
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
	it("says the backend is unavailable and offers no record control that would do nothing", async () => {
		// The stub port's default: every call answers `"unavailable"`.
		renderPage(new StubConversationPracticePort());

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/backend isn.t answering/i);
		expect(screen.queryByRole("button", { name: /record/i })).toBeNull();
	});
});

describe("ConversationPracticePage — the opening question", () => {
	it("shows the Thai question text and replays its audio on demand", async () => {
		renderPage(portWithSession());

		expect(await screen.findByText("สบายดีไหม")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Play question" }));

		expect(createdAudioUrls()).toContain("blob:question-audio");
	});
});

describe("ConversationPracticePage — the known-vocabulary snapshot it sends", () => {
	it("sends the learner's real learned-vocabulary set, not a placeholder list", async () => {
		const port = portWithSession();

		// Below the unlock threshold, the page never reaches this call at all
		// (see the "the unlock gate" tests below) — so the only known-words
		// snapshot reachable through the real page is an above-threshold
		// learner's real, non-empty set, asserted here to be exactly what
		// was learned, never a placeholder.
		renderPage(port);

		await screen.findByText("สบายดีไหม");

		expect(port.startSessionCalls).toHaveLength(1);
		expect(new Set(port.startSessionCalls[0])).toEqual(new Set(UNLOCKED_VOCAB));
	});

	// A learner with zero known words is unreachable through a real render of
	// this page once the unlock gate requires a positive MIN_VOCAB_COUNT —
	// "unlocked" and "zero known words" can never co-occur (see "the unlock
	// gate" below). `knownWordsFor` is extracted specifically so this mapping
	// stays unit-testable on its own: a learner with nothing learned yet must
	// still map to a real empty array, never an omitted field or a throw.
	it("maps a learner with no learned words to a real empty array, not an omitted field", () => {
		const emptyVocab = { getLearnedEntries: () => [] };
		expect(knownWordsFor(emptyVocab)).toEqual([]);
	});
});

describe("ConversationPracticePage — the unlock gate", () => {
	it("shows the locked explanation, never the live recording UI, for a learner navigating here directly below threshold", async () => {
		const port = portWithSession();

		renderPage(port, { graduatedVocab: [], learnedGrammar: [] });

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/unlocks once you know/i);
		expect(screen.queryByRole("button", { name: /record/i })).toBeNull();
		expect(screen.queryByText("สบายดีไหม")).toBeNull();
		// The strongest proof "locked" isn't a label in front of a live,
		// reachable flow: the backend is never even asked for a question.
		expect(port.startSessionCalls).toHaveLength(0);
	});

	it("stays locked when only the grammar threshold is unmet, even with plenty of vocabulary", async () => {
		const port = portWithSession();

		renderPage(port, { graduatedVocab: UNLOCKED_VOCAB, learnedGrammar: [] });

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/grammar point/i);
		expect(port.startSessionCalls).toHaveLength(0);
	});
});

describe("ConversationPracticePage — recording a reply", () => {
	it("drives the recorder from idle to stopped and hands the recorded blob and session id to judgeReply", async () => {
		const port = portWithSession();
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
		expect(call.sessionId).toBe("sess-1");
		expect(call.questionText).toBe("สบายดีไหม");
		expect(call.replyAudio).toBeInstanceOf(Blob);
		expect(call.replyAudio.type).toBe(MIC_FIXTURE_MIME_TYPE);
		expect(call.replyAudio.size).toBeGreaterThan(0);
	});
});

describe("ConversationPracticePage — verdicts and the running tally", () => {
	const expectations: Record<ConversationVerdict, RegExp> = {
		pass: /Good answer/,
		fail: /Not quite/,
		unscored: /could not be scored/i,
	};

	for (const verdict of ["pass", "fail", "unscored"] as ConversationVerdict[]) {
		it(`renders the ${verdict} verdict in its own words, and after advancing to the next question`, async () => {
			const port = portWithSession();
			port.judgement = {
				status: "ok",
				transcript: "สบายดีค่ะ",
				verdict,
				feedbackEn: "Some feedback.",
			};
			// A real next question, not the default `exhausted` — otherwise
			// the page would move straight to the summary before this test
			// could observe the per-turn verdict rendering (AC1).
			port.nextResult = {
				status: "ok",
				questionText: "กำลังทำอะไรครับ",
				questionAudioUrl: "blob:next-question",
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

			// AC1: automatically advanced to the following question, no
			// manual step, no full reload.
			expect(await screen.findByText("กำลังทำอะไรครับ")).toBeTruthy();
		});
	}

	it("does not read an unscored turn as the learner's own mistake", async () => {
		const port = portWithSession();
		port.judgement = {
			status: "ok",
			transcript: "",
			verdict: "unscored",
			feedbackEn: "The judge's answer could not be read.",
		};
		// A real next question, not the default `exhausted` — otherwise the
		// page moves straight to the summary before this test could observe
		// the per-turn verdict note.
		port.nextResult = {
			status: "ok",
			questionText: "กำลังทำอะไรครับ",
			questionAudioUrl: "blob:next-question",
		};
		renderPage(port);

		await recordAndStop();

		expect(await screen.findByText(/does not count against you/i)).toBeTruthy();
	});

	it("distinguishes pass/fail/unscored in the running tally across three turns (AC1)", async () => {
		const port = portWithSession();
		port.judgements.push(
			{ status: "ok", transcript: "a", verdict: "pass", feedbackEn: "" },
			{ status: "ok", transcript: "b", verdict: "fail", feedbackEn: "" },
		);
		port.judgement = {
			status: "ok",
			transcript: "c",
			verdict: "unscored",
			feedbackEn: "",
		};
		port.nextResults.push(
			{ status: "ok", questionText: "q2", questionAudioUrl: "blob:q2" },
			{ status: "ok", questionText: "q3", questionAudioUrl: "blob:q3" },
		);
		renderPage(port);

		await recordAndStop();
		await screen.findByText("q2");
		expect(screen.getByText(/1 passed \/ 1 asked/i)).toBeTruthy();

		await recordAndStop();
		await screen.findByText("q3");
		expect(screen.getByText(/1 passed \/ 2 asked/i)).toBeTruthy();

		await recordAndStop();
		// unscored is named separately, never folded into "failed" or "passed".
		await screen.findByText(/1 passed \/ 3 asked, 1 unscored/i);
	});
});

describe("ConversationPracticePage — session exhaustion (AC2)", () => {
	it("ends the session at a summary naming all three tally components, rather than hanging on a question that will never come", async () => {
		const port = portWithSession();
		port.judgement = {
			status: "ok",
			transcript: "สบายดีค่ะ",
			verdict: "pass",
			feedbackEn: "Correct.",
		};
		// Default `nextResult` is already `exhausted`.
		renderPage(port);

		await recordAndStop();

		const summary = await screen.findByRole("status");
		expect(summary.textContent).toMatch(/1 passed \/ 1 asked/i);
		// The recording UI is gone — nothing left to answer.
		expect(screen.queryByRole("button", { name: /record/i })).toBeNull();
	});
});

describe("ConversationPracticePage — a mid-session backend failure (AC3)", () => {
	it("shows the established unavailable state without discarding the tally already earned", async () => {
		const port = portWithSession();
		port.judgements.push({
			status: "ok",
			transcript: "a",
			verdict: "pass",
			feedbackEn: "",
		});
		port.nextResults.push({
			status: "ok",
			questionText: "q2",
			questionAudioUrl: "blob:q2",
		});
		// The second turn's judge call fails.
		port.judgement = { status: "unavailable" };
		renderPage(port);

		await recordAndStop();
		await screen.findByText("q2");
		await recordAndStop();

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/backend isn.t answering/i);
		const tallyLine = await screen.findByRole("status");
		expect(tallyLine.textContent).toMatch(/1 passed \/ 1 asked/i);
	});
});

describe("ConversationPracticePage — question-audio blob URLs (AC4)", () => {
	it("revokes the previous question's blob URL when the page advances to the next one", async () => {
		const port = portWithSession();
		port.judgement = {
			status: "ok",
			transcript: "a",
			verdict: "pass",
			feedbackEn: "",
		};
		port.nextResult = {
			status: "ok",
			questionText: "q2",
			questionAudioUrl: "blob:q2",
		};
		renderPage(port);

		await screen.findByText("สบายดีไหม");
		expect(revokedObjectUrls()).not.toContain("blob:question-audio");

		await recordAndStop();
		await screen.findByText("q2");

		expect(revokedObjectUrls()).toContain("blob:question-audio");
	});

	it("revokes the active question's blob URL on unmount", async () => {
		const { unmount } = renderPage(portWithSession());
		await screen.findByText("สบายดีไหม");

		unmount();

		expect(revokedObjectUrls()).toContain("blob:question-audio");
	});
});

describe("ConversationPracticePage — microphone failures", () => {
	it("shows a microphone-access message distinct from the backend-unavailable one when permission is denied", async () => {
		setMicPermission("denied");
		renderPage(portWithSession());

		const recordButton = await screen.findByRole("button", {
			name: "Record your reply",
		});
		await act(async () => {
			fireEvent.click(recordButton);
		});

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/Microphone access needed/i);
		expect(alert.textContent).not.toMatch(/backend isn.t answering/i);
	});

	it("shows a third, distinct message for a generic recorder failure", async () => {
		setMicPermission("error");
		renderPage(portWithSession());

		const recordButton = await screen.findByRole("button", {
			name: "Record your reply",
		});
		await act(async () => {
			fireEvent.click(recordButton);
		});

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toMatch(/microphone could not be started/i);
		expect(alert.textContent).not.toMatch(/Microphone access needed/i);
		expect(alert.textContent).not.toMatch(/backend isn.t answering/i);
	});
});
