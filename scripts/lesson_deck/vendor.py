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
import re
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

#: Fish Audio S2 Pro, run on this machine. English narration is 97% of the
#: course by character count and none of it is the language being taught, so it
#: has no business on a metered Thai voice.
#:
#: Not a HuggingFace id that anything imports — the engine is reached by
#: subprocess, because it pins a torch the deck environment does not have. This
#: string exists to be *hashed*: it is half the English cache key, so naming
#: the engine here is what makes replacing the engine regenerate the clips it
#: made. Changing this value without changing the engine would throw away
#: correct audio; changing the engine without changing this would serve stale
#: audio as current, which is worse.
#:
#: Licensing, which is not a footnote: the weights are Research and
#: Non-Commercial. Fish Audio's licence grants ownership of the *outputs*
#: (§IV(iii)), so the clips themselves are unencumbered — that was the
#: deciding difference against Breeze TTS 2, whose licence restricts outputs
#: too. See reference/ENGINES.md.
DEFAULT_ENGLISH_MODEL_ID = "fishaudio/s2-pro"

#: Zara — a Vietnamese-accented English narrator, and the voice the English
#: reference is cut from. Deliberately *not* `DEFAULT_VOICE_ID`.
#:
#: The reference used to be Anna, on the reasoning that one speaker should
#: narrate the whole course. That constraint was dropped — see
#: reference/ENGINES.md — and once it was, Anna had nothing to recommend her
#: for English: her ElevenLabs accent label is `singaporean`, which in English
#: reads as British and sits oddly on a Thai course.
#:
#: No Lao or Khmer voices exist in the shared library, and the one Burmese
#: candidate was too noisy to clone from (27 dB quiet-to-speech, against
#: Zara's 43). Vietnamese is the closest clean accent actually on offer: a
#: different language family from Thai, but a tonal one, and it reads as
#: Southeast Asian rather than European.
DEFAULT_ENGLISH_REFERENCE_VOICE_ID = "QocxxnxEa0x8mrL2d4VT"

#: Trung Caha, held for later. Conversation and listening exercises need two
#: speakers who are plainly different people, and a second voice picked at the
#: same time as the first — by the same ear, on the same day, against the same
#: reference text — will sit better beside it than one chosen months later.
#: Measured at 71 dB quiet-to-speech, the cleanest of the whole shortlist.
#: Nothing reads this yet.
DIALOGUE_ENGLISH_REFERENCE_VOICE_ID = "ueSxRO0nLF1bj93J2hVt"

#: The clip the English voice is cloned from, and exactly what it says. The
#: text is not optional: cloning without it degrades noticeably, and a text
#: that disagrees with the audio is worse than none.
REFERENCE_DIR = Path(__file__).resolve().parent / "reference"
DEFAULT_ENGLISH_REFERENCE_AUDIO = REFERENCE_DIR / "english-voice.mp3"
DEFAULT_ENGLISH_REFERENCE_TEXT = REFERENCE_DIR / "english-voice.txt"

#: The same arrangement for Thai, and it exists for the same reason: one
#: metered call buys a reference, and every Thai clip after it is free.
#:
#: Nine sentences lifted whole from `sentences.json` — written rather than
#: invented, because a reference whose text disagrees with its audio degrades
#: every clone made from it — plus `งาน ง่าย งาม งดงาม งู`, appended because
#: no female sentence in the corpus begins a word with ง and that is the sound
#: the harbour lesson exists to teach. 213 characters, transcribed back at
#: 0.97 before it was kept.
#:
#: Measured worth: cloning from a one-second clip put two of six words through
#: the gate and turned ง into ม. Cloning from this put all of them through.
DEFAULT_THAI_REFERENCE_AUDIO = REFERENCE_DIR / "thai-voice.mp3"
DEFAULT_THAI_REFERENCE_TEXT = REFERENCE_DIR / "thai-voice.txt"

#: What the shipped clips are encoded as, matching
#: `generate-sentence-audio.py` so every mp3 the app plays is one format.
#:
#: There is no tempo stretch any more. `ENGLISH_TEMPO = 0.82` used to live
#: here, because Qwen3-TTS could not be asked to slow down: its clone path took
#: sampling arguments and nothing else, and a literal "[pause one second]" was
#: spoken aloud as those words. Stretching afterwards was the only lever left.
#:
#: It was also the wrong one. Driven hard enough to sound calm, the result was
#: flat rather than deliberate — and the complaint that started all of this
#: turned out not to be about speed at all. The clips judged best were 158 and
#: 160 words a minute, faster than the stretched ones; what they had was a
#: pause between sentences. S2 Pro honours `[pause]`, so delivery is shaped by
#: the markup and by how the narration is written, and the audio ships as the
#: model made it.
MP3_SAMPLE_RATE = "44100"
MP3_BITRATE = "64k"

#: The encoder settings themselves, named once. Two places now write a shipped
#: mp3 — `encode_mp3`, and the carrier trim, which cuts straight to mp3 rather
#: than decoding to WAV only to re-encode — and a clip must not play back at a
#: different bitrate depending on which of them made it.
MP3_ENCODE_ARGS = (
	"-ac", "1", "-ar", MP3_SAMPLE_RATE, "-b:a", MP3_BITRATE,
	"-codec:a", "libmp3lame",
)
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


#: Everything that is not a Thai character. Whitespace, Latin text and
#: punctuation are things a transcriber adds or drops freely and none of them
#: carries a tone.
_NON_THAI = re.compile(r"[^\u0e00-\u0e7f]+")


def normalise_thai(text: str) -> str:
	"""Thai characters only, for comparing what was asked against what was said.

	Lives here rather than in the pipeline because two things now depend on
	agreeing exactly: the pipeline's transcribe-back check, and the trim that
	finds a short word inside its carrier sentence. If those two normalised
	differently, a clip could be cut on one reading of a word and judged on
	another.
	"""
	return _NON_THAI.sub("", text)


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
	thai_reference_audio: Path = DEFAULT_THAI_REFERENCE_AUDIO
	thai_reference_text: Path = DEFAULT_THAI_REFERENCE_TEXT

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
		ElevenLabs was the only engine, and it stayed that shape when the local
		engine learned Thai. That is the point rather than an oversight.

		A Thai key names the speaker and the words, not the machine that made
		them, because for Thai those are the same thing twice: the reference
		the local engine clones *is* this voice_id, recorded by this vendor,
		and every clip from either engine has to satisfy the same
		transcribe-back check before it is written. Two clips under one key are
		the same person saying the same words, both verified.

		Naming the engine here would mean the course's existing Thai — native,
		metered, already verified — is orphaned on the next build and quietly
		replaced by clones of itself. Keeping the key is what confines the
		local engine to Thai that does not exist yet, which is the whole of
		what it was turned on to do.
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

	def reference_for(self, language: str) -> tuple[Path, Path]:
		"""The clip and transcript the voice for `language` is cloned from."""
		if language == "th":
			return self.thai_reference_audio, self.thai_reference_text
		return self.english_reference_audio, self.english_reference_text

	def reference_digest(self, language: str) -> str:
		"""Identifies a cloned voice by its inputs, not by a name.

		A preset speaker has a stable id; a clone does not — it *is* the clip
		and the transcript it was built from. Hashing both means replacing a
		reference regenerates exactly the clips cloned from it and no others.
		"""
		audio_path, text_path = self.reference_for(language)
		digest = hashlib.sha256()
		digest.update(audio_path.read_bytes())
		digest.update(b"\x00")
		digest.update(text_path.read_text(encoding="utf-8").strip().encode("utf-8"))
		return digest.hexdigest()[:16]

	def english_reference_digest(self) -> str:
		return self.reference_digest("en")


#: Delivery markup an author may write inline: `[pause]`, `[whispers]`,
#: `[thoughtful]`. Square brackets, short, no nesting.
MARKUP = re.compile(r"\[[^\[\]]{1,48}\]")


def strip_markup(text: str) -> str:
	"""The text with tags removed and the spacing repaired.

	Two callers, for two different reasons. An engine that does not understand
	tags must never be handed them — Qwen3-TTS reads `[pause one second]` out
	loud as those words, which transcribing the clip back confirmed. And the
	transcribe-back check compares against what was *said*, so its expected
	text is always the stripped form whatever the engine supports.
	"""
	return re.sub(r"\s{2,}", " ", MARKUP.sub("", text)).strip()


class Vendor(Protocol):
	"""The entire network surface the pipeline depends on."""

	#: Whether this engine reads `[tags]` as direction or as words. Measured
	#: per engine by synthesising a tagged line and transcribing it back, never
	#: taken from a documentation page — the two disagreed for Qwen.
	supports_markup: bool

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		"""Audio bytes for one narration line."""

	def transcribe(self, audio: bytes) -> str:
		"""What a Thai clip actually says, for the accept/retry decision."""


class ElevenLabsVendor:
	"""The real client. `requests` is imported lazily so that a run with no
	credential fails naming the credential, rather than naming a dependency."""

	#: Measured: `[whispers] Listen carefully. [pause] Now say it aloud.` came
	#: back transcribing as "Listen carefully. Now say it aloud." — the tags
	#: shaped the delivery and were not spoken.
	supports_markup = True

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

	def __init__(
		self, model_id: str = WHISPER_MODEL_ID, device: str = "cuda"
	) -> None:
		self._model_id = model_id
		self._device = device
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
			if self._device == "cuda":
				_preload_cu12_libraries()
			self._model = WhisperModel(
				self._model_id,
				device=self._device,
				compute_type="float16" if self._device == "cuda" else "int8",
			)
		return self._model

	def _heard(self, audio: bytes, timestamps: bool) -> list[Any]:
		import io  # noqa: PLC0415

		from faster_whisper.audio import decode_audio  # noqa: PLC0415

		segments, _info = self._loaded().transcribe(
			decode_audio(io.BytesIO(audio)),
			language="th",
			vad_filter=True,
			word_timestamps=timestamps,
		)
		return list(segments)

	def transcribe(self, audio: bytes) -> str:
		return "".join(s.text for s in self._heard(audio, False)).strip()

	def words(self, audio: bytes) -> list[Any]:
		"""Every word heard, each with the seconds it starts and ends at.

		Only the carrier trim wants this. It is the same pass `transcribe`
		makes, asked to keep the timings it otherwise discards.
		"""
		return [w for s in self._heard(audio, True) for w in (s.words or [])]

	def release(self) -> None:
		"""Hand the model's GPU memory back, and be usable again after.

		The deck pipeline calls this between its Thai and English phases: the
		English engine needs 19.7 GB of a 24 GB card and this is holding around
		five of them for clips already verified and on disk. Dropping the
		reference is not enough on its own — ctranslate2 frees on collection,
		so the collection is asked for rather than waited for.

		Not a close: `_loaded` rebuilds on the next call, so a caller that
		releases early and then transcribes again is slow, not broken.
		"""
		if self._model is None:
			return
		import gc  # noqa: PLC0415

		self._model = None
		gc.collect()


def _run_ffmpeg(args: list[str], what: str, **kwargs):
	"""`subprocess.run` for ffmpeg, reporting its absence like its failures.

	Every call site below turns a non-zero ffmpeg into a `VendorError` naming
	what was being attempted — but `subprocess` raises `FileNotFoundError`
	when the binary is missing outright, before any of that can run. Two
	things then go wrong: a machine without ffmpeg gets a bare traceback
	instead of a sentence telling it what to install, and any test asserting
	the documented failure mode passes or fails depending on whether the
	machine running it happens to have ffmpeg. The second is not theoretical
	— it is how `test_carrier_trim.py` came to pass locally and fail on CI,
	where nothing needs ffmpeg and nothing installs it.

	Mirrors the `FISH_PYTHON.exists()` guard in `S2ProVoice._run`: a missing
	tool is a `VendorError` about the tool, not a traceback from `subprocess`.
	"""
	import subprocess  # noqa: PLC0415

	try:
		return subprocess.run(["ffmpeg", *args], check=False, **kwargs)
	except FileNotFoundError as exc:
		raise VendorError(
			f"ffmpeg is not on PATH, so {what} cannot run. Every clip this "
			"pipeline encodes or cuts is handed to it; install ffmpeg and "
			"re-run. Nothing was written."
		) from exc


def encode_mp3(wav_bytes: bytes, tempo: float | None = None) -> bytes:
	"""WAV in, the shipped clips' mp3 format out, in memory.

	In memory because verification has to run on the *encoded* artifact — the
	bytes the app will actually play — and a take that fails is thrown away
	rather than written. Same encoder settings as
	`generate-sentence-audio.py`, so one lesson does not play back at a
	different bitrate from the vocabulary clips beside it.
	"""
	filters = [] if tempo is None else ["-af", f"atempo={tempo}"]
	completed = _run_ffmpeg(
		[
			"-hide_banner", "-loglevel", "error",
			"-f", "wav", "-i", "pipe:0",
			*filters,
			*MP3_ENCODE_ARGS, "-f", "mp3", "pipe:1",
		],
		"encoding a clip",
		input=wav_bytes,
		capture_output=True,
	)
	if completed.returncode != 0:
		raise VendorError(
			"ffmpeg failed to encode the clip: "
			f"{completed.stderr.decode('utf-8', 'replace')[:300]}"
		)
	return completed.stdout


#: Where fish-speech and its environment live. Its own venv because the two
#: engines pin incompatible torches — fish-speech wants 2.8, the deck
#: environment runs 2.14 — so this is reached by subprocess rather than by
#: import. `scripts/fish-env/` is gitignored whole; both are build inputs.
FISH_ROOT = Path(__file__).resolve().parent.parent / "fish-env" / "fish-speech"
#: `.absolute()`, never `.resolve()`: the venv's python is a symlink to uv's
#: managed interpreter, and resolving it jumps outside the venv to a base
#: Python with none of these packages installed.
FISH_PYTHON = (
	Path(__file__).resolve().parent.parent / "fish-env" / ".venv" / "bin" / "python"
)
#: The S2 Pro checkpoint, in the shared HuggingFace cache rather than a copy.
S2_MODEL_DIR = Path(
	"/run/media/capplequoppe/data/hf-cache/hub/models--fishaudio--s2-pro/"
	"snapshots/1de9996b6be38b745688de084d87a5633f714e4e"
)
#: The resident worker that keeps the model loaded. See its docstring for why
#: this is not the CLI.
S2_WORKER = Path(__file__).resolve().parent / "s2_worker.py"
#: Generation is not fast: about a minute for a fifty-word clip on this card.
S2_TIMEOUT_SECONDS = 600


class S2ProVoice:
	"""The narration: Fish Audio S2 Pro, cloned, run on this machine.

	Both languages, and one worker for them — the engine is a voice cloner
	rather than an English one, and which voice comes out is decided by which
	reference it is pointed at. Two instances would mean two copies of a model
	that wants 19.7 GB of a 24 GB card, so there is exactly one, and it is
	handed a different reference depending on the language asked for.

	Chosen over Qwen3-TTS by listening, after both cleared the accuracy bar —
	see `reference/ENGINES.md` for the measurements. The short version is that
	Qwen reads `[pause]` aloud as the word "pause", and S2 Pro treats it as
	direction. That single difference is what fixed narration which ran
	sentences together without drawing breath.

	Reached by **subprocess**, not import, and that is not an accident: this
	engine pins torch 2.8 while the deck environment runs 2.14, so the two
	cannot share an interpreter.

	It talks to **one resident worker** rather than launching the CLI per clip,
	and the difference is not small. Measured on a real deck:

	    per-clip subprocess   31s fixed + 4.6s per second of audio   104 min
	    resident worker        1s fixed + 4.4s                        70 min
	    resident + compile     1s fixed + 0.57s                       11 min

	The first version launched a process per clip, so it read eleven gigabytes
	of weights 61 times and spent a third of the build doing it. Keeping the
	model resident removes that, and — because `torch.compile` is then paid
	once instead of per clip — makes compilation affordable, which is where the
	real win is: generation goes from 4.4x slower than real time to roughly
	half of it. Compiled output was transcribed back and is faithful; speed
	alone would not have been a result.

	The reference is encoded to VQ tokens once and cached on disk, keyed by the
	reference digest, so swapping the narrator invalidates it exactly when it
	should.

	English takes no transcribe-back check, on the reasoning that a wrong Thai
	tone teaches a mispronunciation while odd English merely sounds odd. That
	reasoning has a measured limit: past roughly two hundred words in one clip
	this model fabricates whole sentences, silently and fluently. The parser's
	`MAX_MERGED_WORDS` keeps clips far below that, and if it is ever raised,
	the check has to come with it.

	`seed` is honoured — unlike the Qwen path, which accepted one and ignored
	it — so the pipeline's retry loop does real work here.
	"""

	#: The engine publishes a tag vocabulary — `[pause]`, `[whisper]`,
	#: `[excited]` and some thirty more — and reads them as direction rather
	#: than as words. Confirmed by transcribing a tagged line back: the tags did
	#: not appear in what was said.
	#:
	#: Note what that does *not* establish, because it was briefly taken to:
	#: an unrecognised tag is dropped just as silently. `[whispers]` is not a
	#: tag and does nothing, while `[whisper]` is. Not-spoken and
	#: interpreted look identical from outside, so the list is the authority —
	#: see reference/ENGINES.md and the studio's palette.
	supports_markup = True

	def __init__(self, compile_model: bool = True) -> None:
		self._tokens: dict[str, Path] = {}
		self._process: Any | None = None
		self._log: Any | None = None
		self._compile = compile_model

	def _log_path(self) -> Path:
		return FISH_ROOT.parent / "worker.log"

	def _worker(self) -> Any:
		"""The resident engine, started on first use and kept for the run.

		Started lazily rather than in `__init__`, so a build whose English is
		entirely cached never pays the startup at all — which is the common
		case when only one slide's wording changed.
		"""
		if self._process is not None and self._process.poll() is None:
			return self._process

		import subprocess  # noqa: PLC0415
		import json  # noqa: PLC0415

		if not FISH_PYTHON.exists():
			raise VendorError(
				f"the English engine's interpreter is missing ({FISH_PYTHON}). "
				"S2 Pro runs in its own environment because it pins a "
				"different torch; see scripts/lesson_deck/reference/ENGINES.md"
			)
		args = [
			str(FISH_PYTHON.absolute()), str(S2_WORKER.absolute()),
			"--checkpoint-path", str(S2_MODEL_DIR),
		]
		if self._compile:
			args.append("--compile")

		# The worker's stderr is a file rather than a pipe: nothing reads it
		# during a run, and an unread pipe fills its buffer and deadlocks the
		# engine mid-build. A file also survives the process, which is what
		# makes a failure diagnosable afterwards.
		self._log = self._log_path().open("w", encoding="utf-8")
		self._process = subprocess.Popen(
			args, cwd=FISH_ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
			stderr=self._log, text=True, bufsize=1,
		)
		ready = self._process.stdout.readline()
		if not ready:
			self._stop_worker()
			raise VendorError(
				"the English engine failed to start; its log is at "
				f"{self._log_path()}"
			)
		try:
			started = json.loads(ready).get("ready")
		except json.JSONDecodeError:
			started = False
		if not started:
			self._stop_worker()
			raise VendorError(
				f"the English engine said {ready.strip()[:120]!r} instead of "
				f"announcing itself ready; its log is at {self._log_path()}"
			)
		return self._process

	def _stop_worker(self) -> None:
		if self._process is not None:
			try:
				self._process.kill()
			except OSError:
				pass
			self._process = None
		if self._log is not None:
			self._log.close()
			self._log = None

	@property
	def resident(self) -> bool:
		"""Whether the worker is alive and holding the card *right now*.

		Asked of the process rather than of this object, because the two part
		company: `close` stands the worker down and leaves the instance in
		place to start another on demand. Anything reporting on the card from
		the object's existence says "held" forever after the first build, and
		the studio's stand-down endpoint then frees memory nobody is told
		about.
		"""
		return self._process is not None and self._process.poll() is None

	def close(self) -> None:
		"""Release the engine and its several gigabytes of GPU memory.

		Worth calling explicitly when a build is followed by other GPU work in
		the same process — image generation, or the transcriber — because the
		card does not hold both comfortably.
		"""
		if self._process is not None and self._process.poll() is None:
			try:
				self._process.stdin.close()
				self._process.wait(timeout=30)
			except (OSError, ValueError):
				pass
		self._stop_worker()

	def _run(self, args: list[str], what: str) -> None:
		import subprocess  # noqa: PLC0415

		if not FISH_PYTHON.exists():
			raise VendorError(
				f"the English engine's interpreter is missing ({FISH_PYTHON}). "
				"S2 Pro runs in its own environment because it pins a "
				"different torch; see scripts/lesson_deck/reference/ENGINES.md"
			)
		completed = subprocess.run(
			[str(FISH_PYTHON.absolute()), *args],
			cwd=FISH_ROOT,
			capture_output=True,
			text=True,
			check=False,
			timeout=S2_TIMEOUT_SECONDS,
		)
		if completed.returncode != 0:
			output = (completed.stderr or completed.stdout).strip()
			# Out-of-memory deserves its own message. The raw one is a wall of
			# allocator statistics whose *last* 400 characters are a link to
			# the PyTorch memory docs, so tailing it — the obvious thing —
			# reports the least useful part and even cuts "out of memory" in
			# half. The cause is almost always another job holding the card,
			# and the fix is to wait rather than to change anything.
			if "out of memory" in output.lower():
				raise VendorError(
					f"{what} ran out of GPU memory. S2 Pro wants most of this "
					"card to itself; check whether another job is holding it "
					"(nvidia-smi) and re-run. Nothing was written, and clips "
					"already generated stay cached."
				)
			raise VendorError(f"{what} failed: {output[-400:]}")

	def _tokens_for(self, spec: VoiceSpec, language: str) -> Path:
		"""The reference as VQ tokens, computed once and cached on disk.

		Keyed by the reference digest rather than by a filename, so a narrator
		swap produces a different path instead of silently reusing the previous
		speaker's tokens — which would be invisible and would sound wrong.

		Held per digest rather than in a single slot, because one worker now
		serves two references and alternating between them must not re-encode
		each time it changes language.
		"""
		key = spec.reference_digest(language)
		cached = self._tokens.get(key)
		if cached is not None:
			return cached

		audio, text_path = spec.reference_for(language)
		if not audio.exists() or not text_path.exists():
			raise VendorError(
				f"the {language} reference voice is missing "
				f"({audio.name} / {text_path.name}). The narration is cloned "
				"from it; it is rebuilt by one metered call — "
				"scripts/make-english-reference.py for English, and the Thai "
				"one is nine corpus sentences read by the Thai voice."
			)

		cache = FISH_ROOT.parent / "reference-tokens" / key
		tokens = cache / "ref_vq.npy"
		if not tokens.exists():
			cache.mkdir(parents=True, exist_ok=True)
			wav = cache / "ref.wav"
			completed = _run_ffmpeg(
				["-hide_banner", "-loglevel", "error", "-y",
				 "-i", str(audio.absolute()), "-ac", "1", "-ar", "44100",
				 str(wav)],
				f"decoding the {language} reference voice",
				capture_output=True,
			)
			if completed.returncode != 0:
				raise VendorError(
					f"could not decode the {language} reference: "
					f"{completed.stderr.decode('utf-8', 'replace')[:200]}"
				)
			self._run(
				["fish_speech/models/dac/inference.py", "-i", str(wav),
				 "--checkpoint-path", str(S2_MODEL_DIR / "codec.pth"),
				 "-o", str(cache / "ref_vq.wav")],
				f"encoding the {language} reference to VQ tokens",
			)
			if not tokens.exists():
				raise VendorError(
					"the reference encoder produced no tokens; expected "
					f"{tokens}"
				)
		self._tokens[key] = tokens
		return tokens

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		"""One clip, in whichever language the reference is for.

		This refused anything but English until the Thai reference existed,
		and the refusal said Thai is taught by a native voice checked before
		it is accepted. Half of that is still true and is the half that
		mattered: every Thai clip is still checked before it is accepted, by
		`LocalThaiVoice` and then again by the pipeline. What changed is that
		the native voice is now something this engine can clone rather than
		something only a metered call can reach — so the check stayed and the
		bill went away.
		"""
		import json  # noqa: PLC0415
		import shutil  # noqa: PLC0415
		import tempfile  # noqa: PLC0415

		tokens = self._tokens_for(spec, language)
		_audio, text_path = spec.reference_for(language)
		reference = text_path.read_text(encoding="utf-8").strip()
		worker = self._worker()

		work = Path(tempfile.mkdtemp(prefix="s2-clip-"))
		try:
			out = work / "voice.wav"
			request = json.dumps({
				"text": text,
				"prompt_text": reference,
				"prompt_tokens": str(tokens),
				"seed": seed,
				"output": str(out),
			})
			try:
				worker.stdin.write(request + "\n")
				worker.stdin.flush()
				line = worker.stdout.readline()
			except (BrokenPipeError, ValueError) as error:
				self._stop_worker()
				raise VendorError(
					f"the local engine stopped responding: {error}. Its log "
					f"is at {self._log_path()}"
				) from error
			if not line:
				self._stop_worker()
				raise VendorError(
					"the local engine exited without replying; its log is at "
					f"{self._log_path()}"
				)
			reply = json.loads(line)
			if not reply.get("ok"):
				# The worker survives a bad clip on purpose, so this is a
				# normal failure the retry loop can act on rather than a dead
				# engine.
				raise VendorError(f"local synthesis failed: {reply.get('error')}")
			if not out.exists():
				raise VendorError("local synthesis reported success but wrote nothing")
			# No `tempo`: this engine is driven by markup and by how the
			# narration is written, not by stretching it afterwards. The
			# `atempo` pass that used to live here was half of what made the
			# old narration sound flat.
			return encode_mp3(out.read_bytes())
		finally:
			shutil.rmtree(work, ignore_errors=True)


#: What the target is held between. Thai on both sides, so the engine never
#: leaves Thai phonetics, and short enough that the target is easy to find in
#: what comes back. "Sorry" and "thank you" — two things the engine has heard
#: a great many times, which is the point: the carrier's job is to be dull.
CARRIER_PREFIX = "ขอโทษ ค่ะ"
CARRIER_SUFFIX = "ขอบคุณ ค่ะ"

#: Below this many Thai characters, a request gets a carrier. Above it the
#: text is its own context and needs no help; a long sentence also gives the
#: trim more chances to cut in the wrong place, so it is left alone.
#:
#: Twelve is above every letter name in the alphabet (`วอ แหวน` is six) and
#: above the vocabulary this teaches one word at a time, and well below a
#: narration sentence.
CARRIER_LIMIT = 12

#: Kept either side of the target when cutting. Whisper's Thai boundaries are
#: good to a few hundredths and what surrounds the target here is silence, so
#: padding generously costs nothing — and it protects the onset, which is the
#: entire difference between ง and ม.
CARRIER_PAD = 0.12


@dataclass
class LocalThaiVoice:
	"""Thai, cloned on this machine, with short words given a sentence to live in.

	The engine underneath is the same one that voices English — same worker,
	same 19.7 GB, a different reference. What this adds is the handling short
	Thai turns out to need.

	A cloning engine asked for two syllables and nothing else has no context to
	settle its prosody against, so it guesses, and the guess is wrong often
	enough to matter: `วอ แหวน` came back as `วาเวน` on every seed tried. The
	same engine asked for a *sentence* with those two syllables inside it says
	them correctly. So it is asked for the sentence, and the sentence is thrown
	away.

	Measured on the five things lesson 2 needed and could not get:

	    bare request, one seed      1 of 5
	    bare request, eight seeds   3 of 5
	    carrier, cut on silence     1 of 5   (and one clip cut to nothing)
	    carrier, cut on timings     5 of 5

	The middle row is why the cut is made on word timings rather than on
	silence. `[pause]` is direction, not a guaranteed stretch of digital
	silence: only half the clips had two gaps loud enough to find, and
	measuring the silence measured the wrong thing.

	The trim's transcriber runs on the **CPU**, and that is what keeps this
	from reintroducing the contention it took two out-of-memory failures to
	remove. Generating Thai locally puts a 19.7 GB engine and a 4.1 GB verifier
	in the same phase of the same build, on a card holding 24.5. On the CPU the
	verifier reads a three-second carrier in 4.8 seconds and returns exactly
	what the GPU returned — same model, same text — so the phase stays a
	single-engine phase and the pipeline's retry loop did not have to change.
	"""

	engine: Any
	transcriber: LocalTranscriber

	#: The carrier is built from tags, so it had better survive them.
	supports_markup = True

	#: What was heard for each clip handed back, keyed by the clip's bytes.
	#:
	#: Read by `SplitVendor.transcribe`, and the reason it exists is the
	#: measurement in `reading_of`: a short Thai clip cannot be transcribed on
	#: its own, so the reading taken inside the carrier is the only usable one
	#: and it must survive as far as the pipeline's check.
	_readings: dict[str, str] = field(default_factory=dict)

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		if len(normalise_thai(text)) > CARRIER_LIMIT:
			return self.engine.synthesize(text, language, spec, seed)

		line = f"{CARRIER_PREFIX} [pause] {text} [pause] {CARRIER_SUFFIX}"
		carrier = self.engine.synthesize(line, language, spec, seed)

		words = self.transcriber.words(carrier)
		if not words:
			raise VendorError(
				f"nothing was heard in the carrier for {text!r}; the clip is "
				"discarded and the next seed tried"
			)
		heard, start, end = self._span(self._between_the_carrier(words), text)
		clip = self._cut(carrier, start, end)
		self._readings[hashlib.sha256(clip).hexdigest()] = heard
		return clip

	def reading_of(self, audio: bytes) -> str | None:
		"""What this clip was heard to say, read where it could be heard.

		The pipeline verifies a clip by transcribing it back, and for short
		Thai that check does not work on the clip alone. Measured on the
		course's own native recordings — clips that are correct, shipped, and
		already used in the listening quiz:

		    consonant-no-nu.mp3     นอ หนู    heard `นอนู`
		    consonant-mo-ma.mp3     มอ ม้า    heard `มอมมา`
		    consonant-ngo-ngu.mp3   งอ งู     heard `น้องโง่`
		    consonant-yo-yak.mp3    ยอ ยักษ์   heard `ยอยยาก`
		    consonant-wo-weng.mp3   วอ แหวน   heard `ว้าวแหวน`

		Five of five fail the gate. A check that rejects every known-good clip
		of a kind is not measuring that kind of clip, and it rejected the
		locally generated letter names for the same reason it rejects these —
		`วอ แหวน` generated here transcribes as `ว้าวแหวน`, which is
		character-for-character what the native recording transcribes as.

		A letter name is a syllable Thai does not otherwise use, so a
		transcriber hands back the nearest real word: `มอ` becomes `หมอ`,
		`งอ งู` becomes `น้องโง่`. Given the surrounding sentence it stops
		guessing and reads what is there.

		So the reading kept is the one taken inside the carrier, where the
		words either side settle what the target is. It is a real transcript of
		these bytes, not an exemption: a take that said the wrong word is heard
		saying the wrong word and is still rejected. What changed is only where
		whisper was standing when it listened.
		"""
		return self._readings.get(hashlib.sha256(audio).hexdigest())

	@staticmethod
	def _between_the_carrier(words: list[Any]) -> list[Any]:
		"""The heard words with the carrier's own words dropped from each end.

		Without this the target is searched for across the whole clip, and a
		target that happens to resemble the carrier could be "found" in it —
		`ขอ` inside `ขอโทษ`, `คะ` inside `ค่ะ`. The clip would then verify on
		audio of the carrier saying something else entirely, which is the one
		failure this whole arrangement must not have: a wrong clip that passes.

		Nothing lesson 2 asks for collides today. The guard is here because the
		cost of being wrong about that later is silent.

		The ends are found by *matching*, not by counting words off. A
		transcriber does not tokenise the same carrier the same way twice —
		real failures from this build came back as `ค่ะ น้องโอ้` and
		`สวัสดีครับ น้อง`, the second of which is a greeting nobody asked for —
		so a fixed two-words-per-end would sometimes discard the target itself.

		A carrier half is only dropped when it is clearly there. Below the
		threshold the engine did not say it recognisably, and guessing where it
		would have been is worse than searching the whole clip.
		"""
		import difflib  # noqa: PLC0415

		def matches(said: list[Any], against: str) -> float:
			return difflib.SequenceMatcher(
				None,
				normalise_thai(against),
				normalise_thai("".join(w.word for w in said)),
			).ratio()

		#: Enough to say "the carrier is there", not enough to demand it be
		#: transcribed perfectly — it never is, and it does not have to be.
		floor = 0.6

		first = max(
			range(len(words)),
			key=lambda i: matches(words[:i], CARRIER_PREFIX),
			default=0,
		)
		if matches(words[:first], CARRIER_PREFIX) < floor:
			first = 0

		last = max(
			range(first, len(words) + 1),
			key=lambda j: matches(words[j:], CARRIER_SUFFIX),
			default=len(words),
		)
		if matches(words[last:], CARRIER_SUFFIX) < floor:
			last = len(words)

		return words[first:last] or words

	@staticmethod
	def _span(words: list[Any], text: str) -> tuple[str, float, float]:
		"""What the target was heard as, and where it sits inside the carrier.

		Whichever contiguous run of heard words best matches what was asked
		for — which is a more honest question than "what comes after the
		prefix", because it does not assume the prefix was said correctly, and
		because the run it picks is then both the thing to cut and the thing to
		judge. One pass answers both, so the clip that ships and the transcript
		it was accepted on cannot describe different stretches of audio.
		"""
		import difflib  # noqa: PLC0415 — only the Thai path needs it

		wanted = normalise_thai(text)
		best = (-1.0, "", words[0].start, words[-1].end)
		for first in range(len(words)):
			for last in range(first + 1, len(words) + 1):
				said = "".join(w.word for w in words[first:last])
				ratio = difflib.SequenceMatcher(
					None, wanted, normalise_thai(said)
				).ratio()
				if ratio > best[0]:
					best = (ratio, said, words[first].start, words[last - 1].end)
		return best[1], best[2], best[3]

	@staticmethod
	def _cut(audio: bytes, start: float, end: float) -> bytes:
		completed = _run_ffmpeg(
			["-hide_banner", "-loglevel", "error", "-i", "pipe:0",
			 "-ss", f"{max(0.0, start - CARRIER_PAD):.3f}",
			 "-to", f"{end + CARRIER_PAD:.3f}",
			 *MP3_ENCODE_ARGS, "-f", "mp3", "pipe:1"],
			"cutting the carrier down to the word",
			input=audio, capture_output=True,
		)
		if completed.returncode != 0 or not completed.stdout:
			raise VendorError(
				"could not cut the carrier down to the word: "
				f"{completed.stderr.decode('utf-8', 'replace')[-200:]}"
			)
		return completed.stdout


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

	@property
	def supports_markup(self) -> bool:
		"""Only if *both* halves do. A single answer for a split vendor would
		be a lie about one of them, and the lie that matters is the optimistic
		one: it ends with an engine speaking the word "pause"."""
		return bool(self.thai.supports_markup and self.english.supports_markup)

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		engine = self.thai if language == "th" else self.english
		# Asked per engine rather than through `self`, so the Thai half keeps
		# its tags even while the English half cannot have them.
		payload = text if engine.supports_markup else strip_markup(text)
		return engine.synthesize(payload, language, spec, seed)

	def transcribe(self, audio: bytes) -> str:
		"""What this clip says, for the pipeline's check.

		A Thai engine that had to hear the words in order to cut them out
		already holds a reading of them, taken where they could be heard. It is
		asked first, because re-reading a one-second clip on its own is the
		thing that does not work — see `LocalThaiVoice.reading_of`, which has
		the measurement. Anything it does not recognise is transcribed
		normally.
		"""
		reading = getattr(self.thai, "reading_of", None)
		if reading is not None:
			heard = reading(audio)
			if heard is not None:
				return heard
		return self.transcriber.transcribe(audio)

	def release_transcriber(self) -> None:
		"""Drop the verifier once the Thai half of a build is done.

		The pipeline runs Thai first and English second precisely so this can
		happen in between: the English engine wants 19.7 GB of a 24 GB card and
		the verifier is holding about five of them, for clips that are already
		verified and written.
		"""
		self.transcriber.release()
