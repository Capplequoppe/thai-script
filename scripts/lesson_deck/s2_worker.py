"""A resident S2 Pro process: load the model once, synthesise many clips.

Runs under `scripts/fish-env/.venv`, never under the deck environment — the two
pin incompatible torches, which is why this is a separate process at all rather
than an import.

**Why this exists.** The first wiring shelled out to fish-speech's CLI once per
clip, which loads eleven gigabytes of weights every time. Measured over
twenty-one clips of a real deck: about 31 seconds fixed per clip plus 4.6
seconds per second of audio produced — so a third of the build was spent
reading the same weights off disk, 61 times. It also loaded the codec a second
time, in a second process, to turn codes into audio.

So: one process, both models resident, requests over stdin.

**Protocol.** One JSON object per line in, one per line out — but *not* on the
inherited stdout, because fish-speech prints an ANSI-coloured visualisation of
the prompt structure there on every single call. Sharing a channel with a
library that prints is a protocol waiting to break, so this duplicates the real
stdout, keeps the copy for replies, and redirects file descriptor 1 to stderr.
Anything the library prints then lands in the log where it belongs, and the
reply channel carries nothing but JSON.

    -> {"text": ..., "prompt_text": ..., "prompt_tokens": ..., "seed": 42,
        "output": "/path/to/clip.wav"}
    <- {"ok": true, "output": "/path/to/clip.wav", "seconds": 12.3}
    <- {"ok": false, "error": "..."}

`{"ready": true}` is printed once the models are loaded, so a caller can wait
for it rather than guess.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint-path", type=Path, required=True)
    parser.add_argument("--device", default="cuda")
    parser.add_argument(
        "--compile",
        action="store_true",
        help="torch.compile the decode step; costs a minute once, and only "
        "pays for itself in a resident process like this one",
    )
    args = parser.parse_args()

    # Claim the reply channel *before* importing anything that might print to
    # it. From here on, `print()` goes to stderr and only `reply()` reaches the
    # caller.
    import os

    protocol = os.fdopen(os.dup(1), "w", encoding="utf-8")
    os.dup2(2, 1)

    def reply(payload: dict) -> None:
        protocol.write(json.dumps(payload) + "\n")
        protocol.flush()

    import numpy as np
    import soundfile as sf
    import torch

    from fish_speech.models.text2semantic.inference import (
        decode_to_audio,
        generate_long,
        init_model,
        load_codec_model,
    )

    precision = torch.bfloat16
    model, decode_one_token = init_model(
        args.checkpoint_path, args.device, precision, compile=args.compile
    )
    with torch.device(args.device):
        model.setup_caches(
            max_batch_size=1,
            max_seq_len=model.config.max_seq_len,
            dtype=next(model.parameters()).dtype,
        )
    # Loaded here rather than on first use: the caller's timeout should cover a
    # predictable startup, not a surprise on whichever clip happens to be first.
    codec = load_codec_model(args.checkpoint_path / "codec.pth", args.device, precision)
    if torch.cuda.is_available():
        torch.cuda.synchronize()

    # Cached across requests — the reference does not change within a run, and
    # re-reading it per clip would be a smaller version of the same mistake
    # this worker exists to fix.
    tokens_cache: dict[str, list] = {}

    reply({"ready": True})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        started = time.perf_counter()
        try:
            request = json.loads(line)
            output = Path(request["output"])
            token_path = str(request["prompt_tokens"])
            if token_path not in tokens_cache:
                tokens_cache[token_path] = [torch.from_numpy(np.load(token_path))]

            seed = int(request.get("seed", 42))
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)

            codes: list = []
            audio = None
            for response in generate_long(
                model=model,
                device=args.device,
                decode_one_token=decode_one_token,
                text=request["text"],
                num_samples=1,
                max_new_tokens=0,
                top_p=0.9,
                top_k=30,
                temperature=1.0,
                compile=args.compile,
                iterative_prompt=True,
                chunk_length=512,
                prompt_text=[request["prompt_text"]],
                prompt_tokens=tokens_cache[token_path],
            ):
                if response.action == "sample":
                    codes.append(response.codes)
                elif response.action == "next":
                    if codes:
                        merged = torch.cat(codes, dim=1)
                        audio = decode_to_audio(merged.to(args.device), codec)
                    codes = []

            if audio is None:
                raise RuntimeError("no audio produced")
            output.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output), audio.cpu().float().numpy(), codec.sample_rate)
            reply({
                "ok": True,
                "output": str(output),
                "seconds": round(time.perf_counter() - started, 2),
            })
        except Exception as error:  # noqa: BLE001 — the protocol reports, never dies
            # A bad clip must not take the worker down with it: the pipeline
            # retries, and a dead worker would turn one failed clip into a
            # failed build.
            reply({"ok": False, "error": f"{type(error).__name__}: {error}"})

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
