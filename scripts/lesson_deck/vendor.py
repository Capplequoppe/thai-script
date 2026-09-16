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


def encode_mp3(wav_bytes: bytes, tempo: float | None = None) -> bytes:
	"""WAV in, the shipped clips' mp3 format out, in memory.

	In memory because verification has to run on the *encoded* artifact — the
	bytes the app will actually play — and a take that fails is thrown away
	rather than written. Same encoder settings as
	`generate-sentence-audio.py`, so one lesson does not play back at a
	different bitrate from the vocabulary clips beside it.
	"""
	import subprocess  # noqa: PLC0415

	filters = [] if tempo is None else ["-af", f"atempo={tempo}"]
	completed = subprocess.run(
		[
			"ffmpeg", "-hide_banner", "-loglevel", "error",
			"-f", "wav", "-i", "pipe:0",
			*filters,
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


class S2ProEnglishVoice:
	"""The English narration: Fish Audio S2 Pro, cloned, run on this machine.

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

	#: Measured: `[whispers] Listen carefully. [pause] Now say it aloud.` came
	#: back transcribing as "Listen carefully. Now say it aloud." The tags
	#: shaped delivery and were not spoken.
	supports_markup = True

	def __init__(self, compile_model: bool = True) -> None:
		self._tokens: Path | None = None
		self._tokens_key: str | None = None
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

	def _tokens_for(self, spec: VoiceSpec) -> Path:
		"""The reference as VQ tokens, computed once and cached on disk.

		Keyed by the reference digest rather than by a filename, so a narrator
		swap produces a different path instead of silently reusing the previous
		speaker's tokens — which would be invisible and would sound wrong.
		"""
		key = spec.english_reference_digest()
		if self._tokens is not None and self._tokens_key == key:
			return self._tokens

		audio = spec.english_reference_audio
		text_path = spec.english_reference_text
		if not audio.exists() or not text_path.exists():
			raise VendorError(
				"the English reference voice is missing "
				f"({audio.name} / {text_path.name}). The English narration is "
				"cloned from it; regenerate it with "
				"scripts/make-english-reference.py, which is one metered call "
				"of about 113 characters."
			)

		cache = FISH_ROOT.parent / "reference-tokens" / key
		tokens = cache / "ref_vq.npy"
		if not tokens.exists():
			import subprocess  # noqa: PLC0415

			cache.mkdir(parents=True, exist_ok=True)
			wav = cache / "ref.wav"
			completed = subprocess.run(
				["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
				 "-i", str(audio.absolute()), "-ac", "1", "-ar", "44100",
				 str(wav)],
				capture_output=True, check=False,
			)
			if completed.returncode != 0:
				raise VendorError(
					"could not decode the English reference: "
					f"{completed.stderr.decode('utf-8', 'replace')[:200]}"
				)
			self._run(
				["fish_speech/models/dac/inference.py", "-i", str(wav),
				 "--checkpoint-path", str(S2_MODEL_DIR / "codec.pth"),
				 "-o", str(cache / "ref_vq.wav")],
				"encoding the English reference to VQ tokens",
			)
			if not tokens.exists():
				raise VendorError(
					"the reference encoder produced no tokens; expected "
					f"{tokens}"
				)
		self._tokens = tokens
		self._tokens_key = key
		return tokens

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		if language != "en":
			raise VendorError(
				f"refusing to synthesize {language!r} through S2 Pro: this "
				"engine voices the English narration, and Thai is taught by a "
				"native voice that is checked before it is accepted"
			)
		import json  # noqa: PLC0415
		import shutil  # noqa: PLC0415
		import tempfile  # noqa: PLC0415

		tokens = self._tokens_for(spec)
		reference = spec.english_reference_text.read_text(encoding="utf-8").strip()
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
					f"the English engine stopped responding: {error}. Its log "
					f"is at {self._log_path()}"
				) from error
			if not line:
				self._stop_worker()
				raise VendorError(
					"the English engine exited without replying; its log is at "
					f"{self._log_path()}"
				)
			reply = json.loads(line)
			if not reply.get("ok"):
				# The worker survives a bad clip on purpose, so this is a
				# normal failure the retry loop can act on rather than a dead
				# engine.
				raise VendorError(f"English synthesis failed: {reply.get('error')}")
			if not out.exists():
				raise VendorError("English synthesis reported success but wrote nothing")
			# No `tempo`: this engine is driven by markup and by how the
			# narration is written, not by stretching it afterwards. The
			# `atempo` pass that used to live here was half of what made the
			# old narration sound flat.
			return encode_mp3(out.read_bytes())
		finally:
			shutil.rmtree(work, ignore_errors=True)


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
		return self.transcriber.transcribe(audio)
