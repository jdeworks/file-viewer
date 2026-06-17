import { parseImageContainer } from '../docs/types/image/byte-metadata.js';
import { parseMediaContainer } from '../docs/types/media/byte-metadata.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const has = (rows, label, pattern) => rows.some((r) => r.label === label && pattern.test(String(r.value)));

// PNG IHDR facts: color type, bit depth, interlace.
{
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03,
    0x08, 0x06, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const rows = parseImageContainer(png);
  ok(has(rows, 'Color', /Truecolor \+ alpha, 8-bit/), 'PNG: color type and bit depth parsed');
  ok(has(rows, 'Interlace', /Adam7/), 'PNG: interlace parsed');
}

// Animated GIF facts: version, palette, frame count, loop marker.
{
  const gif = new Uint8Array([
    ...bytes('GIF89a'), 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255,
    0x21, 0xff, 0x0b, ...bytes('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00,
    0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x01, 0x00, 0x00,
    0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x01, 0x00, 0x00,
    0x3b,
  ]);
  const rows = parseImageContainer(gif);
  ok(has(rows, 'GIF version', /89a/), 'GIF: version parsed');
  ok(has(rows, 'Palette', /2 colors/), 'GIF: global palette parsed');
  ok(has(rows, 'Animation', /2 frames, loops forever/), 'GIF: frame count and loop parsed');
}

// Extended WebP facts: codec, canvas, feature flags.
{
  const webp = new Uint8Array([
    ...bytes('RIFF'), 0x1e, 0, 0, 0, ...bytes('WEBP'),
    ...bytes('VP8X'), 0x0a, 0, 0, 0, 0x1a, 0, 0, 0, 0x03, 0, 0, 0x04, 0, 0,
    ...bytes('ANMF'), 0, 0, 0, 0,
    ...bytes('ANMF'), 0, 0, 0, 0,
  ]);
  const rows = parseImageContainer(webp);
  ok(has(rows, 'Codec', /Extended WebP/), 'WebP: codec parsed');
  ok(has(rows, 'Canvas', /4 × 5 px/), 'WebP: canvas parsed');
  ok(has(rows, 'Features', /alpha.*animation|animation.*alpha/), 'WebP: feature flags parsed');
  ok(has(rows, 'Animation', /2 frames/), 'WebP: animation frame count parsed');
}

// ICO directory facts.
{
  const ico = new Uint8Array([
    0, 0, 1, 0, 2, 0,
    16, 16, 0, 0, 1, 0, 32, 0, 0, 0, 0, 0, 22, 0, 0, 0,
    0, 0, 0, 0, 1, 0, 24, 0, 0, 0, 0, 0, 22, 0, 0, 0,
  ]);
  const rows = parseImageContainer(ico);
  ok(has(rows, 'Images', /^2$/), 'ICO: image count parsed');
  ok(has(rows, 'Icon sizes', /16 × 16.*256 × 256/), 'ICO: sizes parsed');
  ok(has(rows, 'Color depth', /32-bit/), 'ICO: max bit depth parsed');
}

// WAV fmt/data facts.
{
  const wav = new Uint8Array([
    ...bytes('RIFF'), 44, 0, 0, 0, ...bytes('WAVE'),
    ...bytes('fmt '), 16, 0, 0, 0,
    1, 0, 2, 0, 0x44, 0xac, 0, 0, 0x10, 0xb1, 0x02, 0, 4, 0, 16, 0,
    ...bytes('data'), 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const rows = parseMediaContainer(wav);
  ok(has(rows, 'Audio codec', /PCM/), 'WAV: codec parsed');
  ok(has(rows, 'Channels', /^2$/), 'WAV: channels parsed');
  ok(has(rows, 'Sample rate', /44,100 Hz/), 'WAV: sample rate parsed');
  ok(has(rows, 'Bit depth', /16-bit/), 'WAV: bit depth parsed');
}

// MP3 frame facts after an ID3 tag.
{
  const tagSize = 3;
  const mp3 = new Uint8Array([
    ...bytes('ID3'), 3, 0, 0, 0, 0, 0, tagSize, 0, 0, 0,
    0xff, 0xfb, 0x90, 0x64,
  ]);
  const rows = parseMediaContainer(mp3);
  ok(has(rows, 'Audio codec', /MPEG 1 Layer III/), 'MP3: codec parsed after ID3');
  ok(has(rows, 'Bitrate', /128 kbps/), 'MP3: bitrate parsed');
  ok(has(rows, 'Sample rate', /44,100 Hz/), 'MP3: sample rate parsed');
}

// MP4/M4A/MOV ftyp facts.
{
  const mp4 = new Uint8Array([
    0, 0, 0, 24, ...bytes('ftyp'), ...bytes('isom'), 0, 0, 2, 0,
    ...bytes('isom'), ...bytes('mp42'),
    ...bytes('moov'),
  ]);
  const rows = parseMediaContainer(mp4);
  ok(has(rows, 'Major brand', /isom/), 'MP4: major brand parsed');
  ok(has(rows, 'Brand version', /^512$/), 'MP4: brand version parsed as big-endian');
  ok(has(rows, 'Compatible brands', /isom, mp42/), 'MP4: compatible brands parsed from ftyp box');
}

// Malformed/truncated bytes should fail closed without throwing.
{
  ok(parseImageContainer(new Uint8Array([0x89, 0x50, 0x4e])).length === 0, 'image parser: truncated bytes -> no rows');
  ok(parseMediaContainer(new Uint8Array([0x52, 0x49, 0x46, 0x46])).length === 0, 'media parser: truncated bytes -> no rows');
}

function bytes(s) {
  return [...s].map((c) => c.charCodeAt(0));
}

console.log(failed ? `\nIMAGE/MEDIA METADATA FAILED (${failed})` : '\nIMAGE/MEDIA METADATA PASSED');
process.exit(failed ? 1 : 0);
