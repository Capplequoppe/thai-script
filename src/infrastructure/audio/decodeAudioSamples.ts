/** Decoded PCM audio, mono-mixed, ready for pitch analysis. */
export interface DecodedAudio {
	readonly samples: Float32Array;
	readonly sampleRate: number;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
	if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

	const mixed = new Float32Array(buffer.length);
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		const data = buffer.getChannelData(channel);
		for (let i = 0; i < data.length; i++) {
			mixed[i] += data[i]! / buffer.numberOfChannels;
		}
	}
	return mixed;
}

/**
 * Decodes an encoded audio file (mp3, webm, wav, ...) into raw PCM samples
 * via the Web Audio API, mono-mixing multi-channel audio. Used for both the
 * reference `audioUrl` and the learner's own microphone recording, so
 * pitch analysis always runs against the same sample shape.
 */
export async function decodeAudioSamples(
	arrayBuffer: ArrayBuffer,
): Promise<DecodedAudio> {
	const context = new AudioContext();
	try {
		const buffer = await context.decodeAudioData(arrayBuffer);
		return { samples: mixToMono(buffer), sampleRate: buffer.sampleRate };
	} finally {
		await context.close();
	}
}
