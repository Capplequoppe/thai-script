import { useCallback, useState } from "react";
import { extractPitchContour } from "../../domain/pronunciation/services/pitchContour";
import {
	scoreToneAttempt,
	type ToneAttemptResult,
} from "../../domain/pronunciation/services/toneAttemptScore";
import { decodeAudioSamples } from "../../infrastructure/audio/decodeAudioSamples";

export type ToneAttemptStatus = "idle" | "analyzing" | "done" | "error";

/**
 * Decodes the reference audio and a recorded attempt, extracts each one's
 * pitch contour, and scores the attempt against the reference — see
 * `scoreToneAttempt` for what the score means. `"error"` covers both a
 * decode failure and too little voiced signal in either recording (the
 * latter is not distinguished further; "couldn't hear you clearly, try
 * again" is the honest message either way).
 */
export function useToneAttempt(referenceUrl: string | undefined) {
	const [status, setStatus] = useState<ToneAttemptStatus>("idle");
	const [result, setResult] = useState<ToneAttemptResult | null>(null);

	const analyze = useCallback(
		async (attemptBlob: Blob) => {
			if (!referenceUrl) return;
			setStatus("analyzing");
			setResult(null);

			try {
				const [referenceBuffer, attemptBuffer] = await Promise.all([
					fetch(referenceUrl).then((r) => r.arrayBuffer()),
					attemptBlob.arrayBuffer(),
				]);
				const [reference, attempt] = await Promise.all([
					decodeAudioSamples(referenceBuffer),
					decodeAudioSamples(attemptBuffer),
				]);

				const scored = scoreToneAttempt(
					extractPitchContour(reference.samples, reference.sampleRate),
					extractPitchContour(attempt.samples, attempt.sampleRate),
				);

				if (!scored) {
					setStatus("error");
					return;
				}
				setResult(scored);
				setStatus("done");
			} catch {
				setStatus("error");
			}
		},
		[referenceUrl],
	);

	const reset = useCallback(() => {
		setStatus("idle");
		setResult(null);
	}, []);

	return { status, result, analyze, reset };
}
