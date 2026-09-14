/**
 * Pitch contour for every vocabulary recording, as JSON on stdout.
 *
 * Reuses the app's own `extractPitchContour` rather than reimplementing
 * pitch tracking here. That matters: the in-app pronunciation feedback
 * scores a learner against these same contours, so a clip this script
 * calls fine must be one the app also calls fine, and a disagreement
 * between the two would be invisible.
 *
 * ffmpeg decodes each mp3 to the mono float32 PCM that function wants.
 * Run from the repo root:
 *
 *   node scripts/audio-tone-check/extract-contours.mjs > contours.json
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
const SAMPLE_RATE = 22050;
const VOCABULARY = "src/domain/vocabulary/data/vocabulary.json";

/** `/thai-script/audio/x.mp3` -> `public/audio/x.mp3`. */
function diskPath(url) {
  return `public/${url.replace("/thai-script/", "")}`;
}

async function decode(path) {
  // -f f32le gives raw little-endian float32; -ac 1 mono; -ar fixes the rate
  // so the contour's time axis means the same thing for every clip.
  const { stdout } = await run(
    "ffmpeg",
    ["-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", String(SAMPLE_RATE), "-"],
    { encoding: "buffer", maxBuffer: 256 * 1024 * 1024 },
  );
  return new Float32Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.byteLength / 4));
}

const { extractPitchContour } = await import(
  pathToFileURL("src/domain/pronunciation/services/pitchContour.ts").href
);

const vocabulary = JSON.parse(readFileSync(VOCABULARY, "utf8"));
const best = new Map();
for (const entry of [...vocabulary].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))) {
  if (!best.has(entry.thai)) best.set(entry.thai, entry);
}

const out = [];
let done = 0;
for (const entry of best.values()) {
  if (!entry.thai_audio_file) continue;
  const path = diskPath(entry.thai_audio_file);
  if (!existsSync(path)) continue;
  try {
    const samples = await decode(path);
    const contour = extractPitchContour(samples, SAMPLE_RATE);
    out.push({
      thai: entry.thai,
      rank: entry.rank,
      file: entry.thai_audio_file,
      toneStatus: entry.toneStatus,
      tones: entry.syllables.map((s) => s.tone),
      durationSec: samples.length / SAMPLE_RATE,
      contour: contour.map((p) => [Number(p.timeSec.toFixed(4)), p.hz === null ? null : Number(p.hz.toFixed(2))]),
    });
  } catch (error) {
    out.push({ thai: entry.thai, file: entry.thai_audio_file, error: String(error).slice(0, 120) });
  }
  if (++done % 200 === 0) process.stderr.write(`  ${done} clips\n`);
}
process.stderr.write(`  ${done} clips total\n`);
process.stdout.write(JSON.stringify(out));
