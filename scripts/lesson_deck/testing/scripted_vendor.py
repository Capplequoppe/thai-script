"""A vendor whose every answer is written down in advance.

Two things it has to be, to be worth driving the pipeline with:

**Deterministic and text-dependent.** The bytes for a line of narration are
derived from that line, so re-running produces identical files and changing one
word produces different ones. Without the second property the "changing one
segment leaves the rest byte-identical" claim could not be distinguished from
"nothing was written at all".

**A real MP3.** The frames are valid MPEG-1 Layer III, mono, 44.1kHz, 64kbps —
the same shape as the 8,930 clips already shipped — so a committed fixture clip
is a file a player accepts rather than a blob named `.mp3`.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from ..vendor import VendorError, VoiceSpec

# MPEG-1 Layer III, 64kbps, 44.1kHz, mono, no CRC, no padding. At that bitrate
# a frame is 144 * 64000 / 44100 = 208 bytes including its four-byte header.
_FRAME_HEADER = bytes((0xFF, 0xFB, 0x50, 0xC4))
_FRAME_BYTES = 208


def silent_mp3(seed_text: str) -> bytes:
	"""A short clip whose bytes are a pure function of the text it stands for."""
	digest = hashlib.sha256(seed_text.encode("utf-8")).digest()
	frames = 2 + digest[0] % 6
	payload_len = _FRAME_BYTES - len(_FRAME_HEADER)
	out = bytearray()
	for index in range(frames):
		filler = hashlib.sha256(digest + index.to_bytes(2, "big")).digest()
		body = (filler * (payload_len // len(filler) + 1))[:payload_len]
		out += _FRAME_HEADER + body
	return bytes(out)


@dataclass
class ScriptedVendor:
	"""Answers taken from a scenario, and a record of what it was asked.

	`mishears` maps a Thai line to the sequence of wrong transcripts to return
	before the correct one — so a scenario can say "this line fails twice then
	passes" or, by listing more entries than there are seeds, "this line never
	passes".

	`errors_for` maps a line to how many times synthesis should fail for it.
	The failure text deliberately embeds the credential, the way an API that
	echoes a rejected request does, so that a test can check the manifest and
	stderr do not carry it back out.
	"""

	api_key: str = ""
	mishears: dict[str, list[str]] = field(default_factory=dict)
	errors_for: dict[str, int] = field(default_factory=dict)
	synth_calls: list[dict[str, Any]] = field(default_factory=list)
	_heard: dict[bytes, str] = field(default_factory=dict)
	_error_counts: dict[str, int] = field(default_factory=dict)
	_mishear_counts: dict[str, int] = field(default_factory=dict)

	def synthesize(self, text: str, language: str, spec: VoiceSpec, seed: int) -> bytes:
		self.synth_calls.append({"text": text, "language": language, "seed": seed})
		budget = self.errors_for.get(text, 0)
		used = self._error_counts.get(text, 0)
		if used < budget:
			self._error_counts[text] = used + 1
			raise VendorError(
				f"401 from the vendor: "
				f'{{"detail":"invalid api key","xi-api-key":"{self.api_key}"}}'
			)
		audio = silent_mp3(f"{text}|{language}|{spec.voice_id}|{spec.model_id}")
		self._heard[audio] = text
		return audio

	def transcribe(self, audio: bytes) -> str:
		text = self._heard.get(audio, "")
		wrong = self.mishears.get(text, [])
		index = self._mishear_counts.get(text, 0)
		self._mishear_counts[text] = index + 1
		return wrong[index] if index < len(wrong) else text


def from_scenario(scenario: dict[str, Any], api_key: str) -> ScriptedVendor:
	return ScriptedVendor(
		api_key=api_key,
		mishears={
			key: list(value) for key, value in scenario.get("mishears", {}).items()
		},
		errors_for=dict(scenario.get("errorsFor", {})),
	)
