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

import os
from dataclasses import dataclass, field
from typing import Any, Protocol

API_KEY_VARIABLE = "ELEVENLABS_API_KEY"

#: What a redacted credential is replaced with. Recognisable, and not itself
#: key-shaped, so a scan for key-shaped strings does not trip on the redaction.
REDACTION = "[redacted]"

DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
DEFAULT_TRANSCRIBE_MODEL_ID = "scribe_v1"
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

	def to_json(self) -> dict[str, Any]:
		return {
			"voiceId": self.voice_id,
			"modelId": self.model_id,
			"settings": dict(self.settings),
		}


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

	def transcribe(self, audio: bytes) -> str:
		response = self._post(
			f"{API_ROOT}/speech-to-text",
			data={"model_id": DEFAULT_TRANSCRIBE_MODEL_ID, "language_code": "tha"},
			files={"file": ("clip.mp3", audio, "audio/mpeg")},
		)
		body = response.json()
		return str(body.get("text", ""))

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
