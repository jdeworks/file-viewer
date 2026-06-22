// One-off asset generator for the example media samples (the old sample.mp3 was a 627-byte
// near-empty placeholder). Synthesizes a short, audible melody and writes:
//   docs/examples/sample.wav  — 16-bit PCM (great for the media studio: spectrum / EQ / LUFS)
//   docs/examples/sample.mp3  — MP3 (lamejs) with an ID3v2 tag so the metadata viewer shows tags
//
// Run on demand: `node scripts/gen-sample-media.mjs`. Deterministic (no RNG), so re-running
// reproduces identical bytes. lamejs is a build-time devDependency only — nothing ships at runtime.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import lamejs from 'lamejs';

// lamejs 1.2.1's npm build references its internal classes as globals (MPEGMode, Lame, BitStream)
// that aren't defined when imported as a module — so `new Mp3Encoder` throws "MPEGMode is not
// defined". Inject them onto globalThis before use (well-known workaround).
const require = createRequire(import.meta.url);
for (const name of ['MPEGMode', 'Lame', 'BitStream']) {
  globalThis[name] = require('lamejs/src/js/' + name + '.js');
}

const DOCS = new URL('../docs/examples/', import.meta.url).pathname;
const SR = 44100;

// A cheerful C-major arpeggio motif, up then down, looped to ~6s. Each note gets an attack/release
// envelope (no clicks) plus a soft 2nd harmonic for a little warmth.
const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77, C6: 1046.50 };
const MOTIF = ['C5', 'E5', 'G5', 'C6', 'B5', 'G5', 'E5', 'C5'];
const NOTE_SECS = 0.34;
const TOTAL_SECS = 6;

const total = Math.floor(SR * TOTAL_SECS);
const pcm = new Int16Array(total);
const noteLen = Math.floor(SR * NOTE_SECS);
for (let i = 0; i < total; i++) {
  const noteIdx = Math.floor(i / noteLen) % MOTIF.length;
  const f = NOTE[MOTIF[noteIdx]];
  const tInNote = (i % noteLen) / SR;
  // attack 12ms, release over the tail of the note
  const atk = Math.min(1, tInNote / 0.012);
  const rel = Math.min(1, (NOTE_SECS - tInNote) / 0.08);
  const env = Math.max(0, Math.min(atk, rel));
  const t = i / SR;
  const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t);
  pcm[i] = Math.max(-32768, Math.min(32767, Math.round(s * env * 0.28 * 32767)));
}

// ── WAV (RIFF / PCM 16-bit mono) ──
function wav(samples, sampleRate) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

// ── ID3v2.3 tag (a few text frames) prepended to the MP3 ──
function id3(tags) {
  const frames = [];
  for (const [id, text] of Object.entries(tags)) {
    const body = Buffer.concat([Buffer.from([0x00]), Buffer.from(text, 'latin1')]); // ISO-8859-1
    const head = Buffer.alloc(10);
    head.write(id, 0);
    head.writeUInt32BE(body.length, 4);   // v2.3 frame size = plain big-endian
    frames.push(head, body);
  }
  const fb = Buffer.concat(frames);
  const header = Buffer.alloc(10);
  header.write('ID3', 0); header.writeUInt16BE(0x0300, 3); header.writeUInt8(0, 5);
  // tag size = synchsafe (7 bits per byte)
  let n = fb.length;
  header[9] = n & 0x7f; header[8] = (n >> 7) & 0x7f; header[7] = (n >> 14) & 0x7f; header[6] = (n >> 21) & 0x7f;
  return Buffer.concat([header, fb]);
}

function mp3(samples, sampleRate) {
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const out = [];
  const block = 1152;
  for (let i = 0; i < samples.length; i += block) {
    const chunk = samples.subarray(i, i + block);
    const b = enc.encodeBuffer(chunk);
    if (b.length) out.push(Buffer.from(b));
  }
  const end = enc.flush();
  if (end.length) out.push(Buffer.from(end));
  const audio = Buffer.concat(out);
  // Title/artist kept as "Demo Track"/"Demo Artist" (the values the ID3 smoke test asserts).
  const tag = id3({ TIT2: 'Demo Track', TPE1: 'Demo Artist', TALB: 'Sample Media', TCON: 'Electronic', TYER: '2026' });
  return Buffer.concat([tag, audio]);
}

await writeFile(join(DOCS, 'sample.wav'), wav(pcm, SR));
const mp3buf = mp3(pcm, SR);
await writeFile(join(DOCS, 'sample.mp3'), mp3buf);
console.log('sample.wav: ' + (44 + total * 2) + ' bytes, ' + TOTAL_SECS + 's mono PCM');
console.log('sample.mp3: ' + mp3buf.length + ' bytes, ' + TOTAL_SECS + 's 128kbps + ID3');
