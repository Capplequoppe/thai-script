import { useCallback, useRef, useState } from "react";

export type MicRecorderState =
	| "idle"
	| "recording"
	| "stopped"
	| "denied"
	| "error";

/**
 * Wraps `getUserMedia` + `MediaRecorder` for a single record/stop take.
 * `"denied"` is kept distinct from `"error"` so a caller can show "microphone
 * access needed" instead of a generic failure — the two need different UI
 * and only one of them is ever the user's fault.
 */
export function useMicRecorder() {
	const [state, setState] = useState<MicRecorderState>("idle");
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const stopTracks = useCallback(() => {
		for (const track of streamRef.current?.getTracks() ?? []) track.stop();
		streamRef.current = null;
	}, []);

	const start = useCallback(async () => {
		setAudioBlob(null);
		chunksRef.current = [];
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			streamRef.current = stream;

			const recorder = new MediaRecorder(stream);
			recorderRef.current = recorder;
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};
			recorder.onstop = () => {
				setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
				stopTracks();
				setState("stopped");
			};

			recorder.start();
			setState("recording");
		} catch (err) {
			stopTracks();
			setState(
				err instanceof DOMException && err.name === "NotAllowedError"
					? "denied"
					: "error",
			);
		}
	}, [stopTracks]);

	const stop = useCallback(() => {
		if (recorderRef.current?.state === "recording") {
			recorderRef.current.stop();
		}
	}, []);

	const reset = useCallback(() => {
		stopTracks();
		recorderRef.current = null;
		chunksRef.current = [];
		setAudioBlob(null);
		setState("idle");
	}, [stopTracks]);

	return { state, audioBlob, start, stop, reset };
}
