"""The credential, its redaction, and the two calls that leave this machine.

Three rules hold here and nowhere else:

1. **The key is read from the environment and never written.** It is not a
   flag, so it cannot land in a shell history or a CI log line; it is not
   defaulted, so a missing key is a loud failure rather than a silent run that
   produces a deck with no audio.

2. **Vendor text is redacted before it is allowed anywhere.** An API that
   rejects a request commonly echoes the request back, credential included, and
   that text would otherwise flow straight into the manifest and into stderr.
   `Redactor` is applied at the boundary — every vendor exception is caught
   here and re-raised redacted, so a caller cannot forget.

3. **The network is behind a protocol.** `Vendor` is the whole surface the
   pipeline knows about, which is what lets the retry state machine be driven
   against a scripted stand-in without the pipeline having a test mode in it.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

API_KEY_VARIABLE = "ELEVENLABS_API_KEY"

#: What a redacted credential is replaced with. Recognisable, and not itself
#: key-shaped, so a scan for key-shaped strings does not trip on the redaction.
REDACTION = "[redacted]"

#: Anna — Thailand Female. A Thai native voice for the Thai clips; the
#: English narration is not this voice and is not this vendor.
DEFAULT_VOICE_ID = "brM9iIbwDREZaWL8luun"
#: The only two TTS models that list Thai are `eleven_v3` and
#: `eleven_v3_conversational`; `eleven_multilingual_v2` rejects
#: `language_code: th` outright with an `unsupported_language` 400.
DEFAULT_MODEL_ID = "eleven_v3"
#: Verification runs on this machine — see `LocalTranscriber`. It is the
#: same faster-whisper large-v3 that `generate-sentence-audio.py` uses and
#: that transcribes the learner's own replies, so a clip is checked by the
#: very model that will later have to understand the learner saying it.
WHISPER_MODEL_ID = "large-v3"

#: Qwen3-TTS, Apache 2.0, run on this machine. English narration is 97% of
#: the course by character count and none of it is the language being taught,
#: so it has no business on a metered Thai voice.
#:
#: The *Base* checkpoint rather than CustomVoice, because the English is not a
#: preset speaker — it is cloned from the Thai voice, so the whole course is
#: narrated by one person. See reference/README.md.
DEFAULT_ENGLISH_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"

#: The clip the English voice is cloned from, and exactly what it says. The
#: text is not optional: cloning without it degrades noticeably, and a text
#: that disagrees with the audio is worse than none.
REFERENCE_DIR = Path(__file__).resolve().parent / "reference"
DEFAULT_ENGLISH_REFERENCE_AUDIO = REFERENCE_DIR / "english-voice.mp3"
DEFAULT_ENGLISH_REFERENCE_TEXT = REFERENCE_DIR / "english-voice.txt"

#: What the shipped clips are encoded as, matching
#: `generate-sentence-audio.py` so every mp3 the app plays is one format.
MP3_SAMPLE_RATE = "44100"
MP3_BITRATE = "64k"
DEFAULT_VOICE_SETTINGS: dict[str, Any] = {
	"stability": 0.5,
	"similarity_boost": 0.75,
	"speed": 1.0,
}

API_ROOT = "https://api.elevenlabs.io/v1"
REQUEST_TIMEOUT_SECONDS = 120


class MissingCredential(RuntimeError):
	"""No API key in the environment. Names the variable, carries no value."""


class VendorError(RuntimeError):
	"""A vendor call that failed, with its text already redacted."""


def load_api_key(env: dict[str, str] | None = None) -> str:
	source = os.environ if env is None else env
	value = (source.get(API_KEY_VARIABLE) or "").strip()
	if not value:
		raise MissingCredential(
			f"{API_KEY_VARIABLE} is not set. The deck pipeline calls ElevenLabs "
			"for every narration line; export the key (see .env.example) and "
			"re-run. Nothing was written."
		)
	return value


@dataclass(frozen=True)
class Redactor:
	"""Replaces known secrets wherever they appear in text.

	Substring replacement rather than a pattern: the key's own value is the one
	secret this process holds, and matching it literally cannot miss a variant
	spelling of it or mangle unrelated text that merely looks key-shaped.
	"""

	secrets: tuple[str, ...] = ()

	def redact(self, text: str) -> str:
		cleaned = text
		for secret in self.secrets:
			if secret:
				cleaned = cleaned.replace(secret, REDACTION)
		return cleaned


@dataclass(frozen=True)
class VoiceSpec:
	"""Everything about *how* a clip is voiced. Part of the cache key, so
	changing any of it regenerates the clips it affects and nothing else."""

	voice_id: str = DEFAULT_VOICE_ID
	model_id: str = DEFAULT_MODEL_ID
	settings: dict[str, Any] = field(
		default_factory=lambda: dict(DEFAULT_VOICE_SETTINGS)
	)
	english_model_id: str = DEFAULT_ENGLISH_MODEL_ID
	english_reference_audio: Path = DEFAULT_ENGLISH_REFERENCE_AUDIO
	english_reference_text: Path = DEFAULT_ENGLISH_REFERENCE_TEXT

	def to_json(self) -> dict[str, Any]:
		"""The whole spec, for the manifest — a reader wants to see both
		voices without having to know which one a given clip came from."""
		return {
			"voiceId": self.voice_id,
			"modelId": self.model_id,
			"settings": dict(self.settings),
			"english": {
				"modelId": self.english_model_id,
				"reference": self.english_reference_digest(),
			},
		}

	def for_language(self, language: str) -> dict[str, Any]:
		"""Only the half of the spec that voices `language`, for the cache key.

		Two engines now share one spec, and hashing the whole of it would mean
		that re-picking the Thai voice silently re-renders every English clip in
		the course — thousands of seconds of unchanged narration, thrown away
		and made again. A clip's key describes the engine that made it and
		nothing else.

		The Thai projection is deliberately the exact shape the key had when
		ElevenLabs was the only engine, so clips already generated and verified
		stay cached across this change.
		"""
		if language == "th":
			return {
				"voiceId": self.voice_id,
				"modelId": self.model_id,
				"settings": dict(self.settings),
			}
		return {
			"modelId": self.english_model_id,
			"reference": self.english_reference_digest(),
		}

	def english_reference_digest(self) -> str:
		"""Identifies the cloned voice by its inputs, not by a name.

		A preset speaker has a stable id; a clone does not — it *is* the clip
		and the transcript it was built from. Hashing both means replacing the
		reference regenerates every English clip in the course, which is
		correct, and that swapping the Thai voice leaves them alone, which is
		the point of keying the two languages separately.
		"""
		audio = self.english_reference_audio.read_bytes()
		text = self.english_reference_text.read_text(encoding="utf-8").strip()
		digest = hashlib.sha256()
		digest.update(audio)
		digest.update(b"\x00")
		digest.update(text.encode("utf-8"))
		return digest.hexdigest()[:16]


class Vendor(Protocol):
	"""The entire network surface the pipeline depends on."""

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		"""Audio bytes for one narration line."""

	def transcribe(self, audio: bytes) -> str:
		"""What a Thai clip actually says, for the accept/retry decision."""


class ElevenLabsVendor:
	"""The real client. `requests` is imported lazily so that a run with no
	credential fails naming the credential, rather than naming a dependency."""

	def __init__(self, api_key: str, redactor: Redactor) -> None:
		import requests  # noqa: PLC0415 — see the class docstring

		self._requests = requests
		self._session = requests.Session()
		self._session.headers.update({"xi-api-key": api_key})
		self._redactor = redactor

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		if language != "th":
			raise VendorError(
				f"refusing to synthesize {language!r} through ElevenLabs: this "
				"vendor is the Thai voice only, and billing English prose here "
				"is the spend the split exists to avoid"
			)
		payload = {
			"text": text,
			"model_id": spec.model_id,
			"language_code": language,
			"voice_settings": dict(spec.settings),
			"seed": seed,
		}
		response = self._post(
			f"{API_ROOT}/text-to-speech/{spec.voice_id}",
			json=payload,
			headers={"accept": "audio/mpeg"},
		)
		return response.content

	def _post(self, url: str, **kwargs: Any) -> Any:
		"""Every outbound call, and the one place vendor text is redacted.

		The response body is included in the error because a 422 from this API
		says which field was wrong and that is the whole diagnostic — but it is
		also exactly the body that echoes the request, so it goes through the
		redactor first.
		"""
		try:
			response = self._session.post(
				url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs
			)
		except self._requests.RequestException as error:
			raise VendorError(self._redactor.redact(str(error))) from None
		if response.status_code >= 400:
			raise VendorError(
				self._redactor.redact(
					f"{response.status_code} from the vendor: {response.text[:500]}"
				)
			)
		return response


def _preload_cu12_libraries() -> None:
	"""Preload libcublas/libcudnn from the nvidia cu12 wheels.

	The same fix `backend/app/models.py` carries, and for the same reason: the
	PyPI torch build bundles CUDA 13 (`libcublas.so.13`) while ctranslate2 —
	faster-whisper's engine — dlopens the `.so.12` names and dies at the first
	encode. Loading the cu12 wheels' libraries RTLD_GLOBAL first makes that
	dlopen resolve to the already-loaded copies, with no LD_LIBRARY_PATH.

	Duplicated rather than imported: this package is a standalone content
	pipeline and must not take a dependency on the conversation backend's
	application code to voice a lesson.
	"""
	import ctypes  # noqa: PLC0415
	from pathlib import Path  # noqa: PLC0415

	try:
		import nvidia.cublas.lib  # noqa: PLC0415
		import nvidia.cudnn.lib  # noqa: PLC0415
	except ImportError:
		return

	for package in (nvidia.cublas.lib, nvidia.cudnn.lib):
		for shared_object in sorted(Path(package.__path__[0]).glob("*.so*")):
			try:
				ctypes.CDLL(str(shared_object), mode=ctypes.RTLD_GLOBAL)
			except OSError:
				continue


class LocalTranscriber:
	"""The transcribe-back check, run on this machine.

	Verification is a check on our own output, not a service anyone needs to
	sell us: the clip is already on disk and the model that reads it back is
	already a dependency of this repository. Paying a vendor per clip to hear
	what we just made is spend with nothing on the other side of it, and it
	also required the API key to carry a speech-to-text permission it has no
	other reason to hold.

	`large-v3` is deliberate rather than convenient. It is the same model
	`generate-sentence-audio.py` verifies its 8,930 clips with, and the same one
	that transcribes the learner's spoken replies — so a clip that passes here
	has been understood by the exact model that will later have to understand
	the learner saying the same word back.

	The model is loaded once and on first use: a run whose Thai segments are all
	cached never loads it at all.
	"""

	def __init__(self, model_id: str = WHISPER_MODEL_ID) -> None:
		self._model_id = model_id
		self._model: Any | None = None

	def _loaded(self) -> Any:
		if self._model is None:
			try:
				from faster_whisper import WhisperModel  # noqa: PLC0415
			except ImportError as error:
				raise VendorError(
					"faster-whisper is not importable. The deck pipeline "
					"verifies every Thai clip locally; run it inside the "
					"backend environment, e.g. `uv run --project backend "
					"python scripts/generate-lesson-deck.py ...`"
				) from error
			_preload_cu12_libraries()
			self._model = WhisperModel(
				self._model_id, device="cuda", compute_type="float16"
			)
		return self._model

	def transcribe(self, audio: bytes) -> str:
		import io  # noqa: PLC0415

		from faster_whisper.audio import decode_audio  # noqa: PLC0415

		decoded = decode_audio(io.BytesIO(audio))
		segments, _info = self._loaded().transcribe(
			decoded, language="th", vad_filter=True
		)
		return "".join(segment.text for segment in segments).strip()


def encode_mp3(wav_bytes: bytes) -> bytes:
	"""WAV in, the shipped clips' mp3 format out, in memory.

	In memory because verification has to run on the *encoded* artifact — the
	bytes the app will actually play — and a take that fails is thrown away
	rather than written. Same encoder settings as
	`generate-sentence-audio.py`, so one lesson does not play back at a
	different bitrate from the vocabulary clips beside it.
	"""
	import subprocess  # noqa: PLC0415

	completed = subprocess.run(
		[
			"ffmpeg", "-hide_banner", "-loglevel", "error",
			"-f", "wav", "-i", "pipe:0",
			"-ac", "1", "-ar", MP3_SAMPLE_RATE, "-b:a", MP3_BITRATE,
			"-codec:a", "libmp3lame", "-f", "mp3", "pipe:1",
		],
		input=wav_bytes,
		capture_output=True,
		check=False,
	)
	if completed.returncode != 0:
		raise VendorError(
			"ffmpeg failed to encode the clip: "
			f"{completed.stderr.decode('utf-8', 'replace')[:300]}"
		)
	return completed.stdout


class QwenEnglishVoice:
	"""The English narration: the Thai voice, cloned, synthesised locally.

	Qwen3-TTS is Apache 2.0 and runs on this machine, which is the whole point.
	English is 97% of the course by character count and none of it is the
	language being taught; paying a per-character vendor to read it aloud buys
	nothing the learner can hear.

	It is a *clone* rather than a preset because the alternative is two voices.
	A lesson that changes speaker every time it says a Thai word sounds broken,
	and the seam falls in the worst possible place — right where the learner is
	supposed to be listening hardest. Cloning the Thai voice puts one person in
	front of the learner for the whole course, and because she is a Thai native
	reading English, it is a Thai teacher's English rather than a newsreader's.

	English takes no transcribe-back check. The check exists because a wrong
	Thai tone teaches a mispronunciation the learner will then practise; an
	English clip that renders slightly oddly is a clip that sounds slightly
	odd. `seed` is accepted and ignored — the retry loop passes one, and the
	honest thing is to say so here rather than to imply a re-roll happened.

	The model and the clone prompt are each built once, on first use: a run
	whose English is entirely cached loads neither.
	"""

	def __init__(self) -> None:
		self._model: Any | None = None
		self._loaded_id: str | None = None
		self._prompt: Any | None = None
		self._prompt_key: str | None = None

	def _model_for(self, model_id: str) -> Any:
		if self._model is None or self._loaded_id != model_id:
			try:
				from qwen_tts import Qwen3TTSModel  # noqa: PLC0415
			except ImportError as error:
				raise VendorError(
					"qwen-tts is not importable. The English narration is "
					"synthesised locally; run the pipeline inside the deck "
					"environment, e.g. `uv run --project scripts/deck-env "
					"python scripts/generate-lesson-deck.py ...`"
				) from error
			self._model = Qwen3TTSModel.from_pretrained(model_id, device_map="cuda:0")
			self._loaded_id = model_id
			# A prompt is bound to the model that built it.
			self._prompt = None
			self._prompt_key = None
		return self._model

	def _prompt_for(self, model: Any, spec: VoiceSpec) -> Any:
		"""The speaker embedding, computed once and reused for every clip.

		Rebuilding it per clip would be both slow and a source of drift — the
		one thing a single narrator must not do is vary between sentences.
		"""
		key = spec.english_reference_digest()
		if self._prompt is None or self._prompt_key != key:
			audio = spec.english_reference_audio
			text_path = spec.english_reference_text
			if not audio.exists() or not text_path.exists():
				raise VendorError(
					"the English reference voice is missing "
					f"({audio.name} / {text_path.name}). The English narration "
					"is cloned from it; regenerate it with "
					"scripts/make-english-reference.py, which is one metered "
					"call of about 430 characters."
				)
			self._prompt = model.create_voice_clone_prompt(
				ref_audio=str(audio),
				ref_text=text_path.read_text(encoding="utf-8").strip(),
			)
			self._prompt_key = key
		return self._prompt

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		if language != "en":
			raise VendorError(
				f"refusing to synthesize {language!r} through Qwen: this engine "
				"voices the English narration, and Thai is taught by a native "
				"voice that is checked before it is accepted"
			)
		import io  # noqa: PLC0415

		import soundfile as sf  # noqa: PLC0415

		model = self._model_for(spec.english_model_id)
		# `generate_voice_clone` returns a *batch* — a list of float32 mono
		# arrays — even for one line of text. Handing the list itself to
		# soundfile is a "Format not recognised", which reads like a codec
		# problem and is not one.
		wavs, sample_rate = model.generate_voice_clone(
			text=text,
			language="English",
			voice_clone_prompt=self._prompt_for(model, spec),
		)
		waveform = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
		buffer = io.BytesIO()
		sf.write(buffer, waveform, int(sample_rate), format="WAV")
		return encode_mp3(buffer.getvalue())


@dataclass
class SplitVendor:
	"""One narration track, three engines, none doing another's job.

	Thai is voiced by a metered native voice and checked before it is accepted.
	English is voiced on this machine and needs no check. The check itself also
	runs on this machine. Satisfies `Vendor` whole, so the pipeline and its
	scripted stand-in are unchanged by the split — all that moved is which side
	of the network each piece of work happens on.
	"""

	thai: Vendor
	english: Vendor
	transcriber: LocalTranscriber

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		engine = self.thai if language == "th" else self.english
		return engine.synthesize(text, language, spec, seed)

	def transcribe(self, audio: bytes) -> str:
		return self.transcriber.transcribe(audio)
