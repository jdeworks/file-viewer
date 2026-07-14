#!/usr/bin/env python3
"""Generate the deterministic ACX-targeted MP3 used by media QC tests."""

from __future__ import annotations

import math
import pathlib
import random
import shutil
import struct
import subprocess
import tempfile
import wave


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "examples" / "acx-qc-reference.mp3"
SAMPLE_RATE = 44_100
HEAD_SECONDS = 1.25
BODY_SECONDS = 3.0
TAIL_SECONDS = 2.25


def samples() -> list[float]:
    rng = random.Random(0xAC2026)
    count = round((HEAD_SECONDS + BODY_SECONDS + TAIL_SECONDS) * SAMPLE_RATE)
    head_end = round(HEAD_SECONDS * SAMPLE_RATE)
    body_end = head_end + round(BODY_SECONDS * SAMPLE_RATE)
    quiet_amp = 10 ** (-72 / 20)
    values: list[float] = []
    for index in range(count):
        if head_end <= index < body_end:
            t = (index - head_end) / SAMPLE_RATE
            # A deterministic speech-like harmonic bed, scaled so the complete file lands
            # near -20 dB RMS while retaining ample peak headroom.
            value = (
                0.135 * math.sin(2 * math.pi * 173 * t)
                + 0.072 * math.sin(2 * math.pi * 347 * t + 0.4)
                + 0.041 * math.sin(2 * math.pi * 691 * t + 1.1)
            )
            envelope = min(1.0, (index - head_end) / (0.03 * SAMPLE_RATE))
            envelope *= min(1.0, (body_end - index) / (0.03 * SAMPLE_RATE))
            values.append(value * max(0.0, envelope))
        else:
            values.append((rng.random() * 2 - 1) * quiet_amp)
    return values


def write_wav(path: pathlib.Path) -> None:
    pcm = bytearray()
    for value in samples():
        pcm.extend(struct.pack("<h", max(-32768, min(32767, round(value * 32767)))))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is required to regenerate acx-qc-reference.mp3")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="file-viewer-acx-") as tmp:
        wav_path = pathlib.Path(tmp) / "reference.wav"
        write_wav(wav_path)
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(wav_path),
                "-map_metadata",
                "-1",
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                "-c:a",
                "libmp3lame",
                "-b:a",
                "192k",
                "-write_xing",
                "0",
                "-id3v2_version",
                "0",
                str(OUTPUT),
            ],
            check=True,
        )


if __name__ == "__main__":
    main()
