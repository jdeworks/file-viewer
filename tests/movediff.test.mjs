// Unit tests for the move-aware diff algorithm (WP15) + metadata parsers. Pure logic, no browser.
import { computeMoveDiff, wordDiff } from '../docs/core/movediff.js';
import { parseId3 } from '../docs/types/media/id3.js';
import { parseExif } from '../docs/types/image/exif.js';
import { intakeFromFile } from '../docs/core/intake.js';
import { palmDocDecompress, openMobi } from '../docs/types/ebook/mobi/mobilib.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

const P1 = 'The first paragraph stays put.\nIt has two lines.';
const P2 = 'The second paragraph is the one that moves around the document.';
const P3 = 'A third paragraph at the bottom.';

// 1. Identical -> all unchanged, no moves.
{
  const text = [P1, P2, P3].join('\n\n');
  const r = computeMoveDiff(text, text);
  ok(r.stats.unchanged === 3, 'identical: 3 unchanged');
  ok(r.stats.moved === 0 && r.stats.added === 0 && r.stats.removed === 0, 'identical: no moves/adds/removes');
}

// 2. A paragraph moved (reordered) -> detected as a move, similarity 1, NOT add+remove.
{
  const before = [P1, P2, P3].join('\n\n');
  const after = [P2, P1, P3].join('\n\n');   // P2 hoisted to top
  const r = computeMoveDiff(before, after);
  ok(r.stats.moved >= 1, 'reorder: at least one moved block');
  ok(r.stats.added === 0 && r.stats.removed === 0, 'reorder: no spurious add/remove');
  const mv = r.pairs.find((p) => p.kind === 'moved');
  ok(mv && mv.moveId !== null, 'reorder: move has a moveId linking endpoints');
}

// 3. Moved AND edited (>=80% same) -> moved-modified.
{
  const before = [P1, P2, P3].join('\n\n');
  const edited = 'The second paragraph is the one that moves around the whole document today.';
  const after = [edited, P1, P3].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats['moved-modified'] >= 1, 'moved+edited: classified moved-modified');
  const mm = r.pairs.find((p) => p.kind === 'moved-modified');
  ok(mm && mm.similarity >= 0.8 && mm.similarity < 1, `moved-modified similarity in [0.8,1): ${mm && mm.similarity.toFixed(2)}`);
}

// 4. Below threshold -> treated as remove + add, not a move.
{
  const before = [P1, P2].join('\n\n');
  const after = [P1, 'Completely different unrelated sentence with no overlap.'].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats.removed === 1 && r.stats.added === 1, 'low similarity: remove + add, not a move');
  ok(r.stats.moved === 0 && r.stats['moved-modified'] === 0, 'low similarity: no move classification');
}

// 5. Pure addition.
{
  const before = [P1, P2].join('\n\n');
  const after = [P1, P2, P3].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats.added === 1 && r.stats.unchanged === 2, 'append: 1 added, 2 unchanged');
}

// 6. Word-level diff: a one-word change marks ONLY that word, not the whole sentence.
{
  const wd = wordDiff('The quick brown fox jumps', 'The quick red fox jumps');
  const changedA = wd.a.filter((r) => r.changed).map((r) => r.text);
  const changedB = wd.b.filter((r) => r.changed).map((r) => r.text);
  ok(changedA.join('|') === 'brown' && changedB.join('|') === 'red', 'word diff isolates the single changed word');
  const unchangedB = wd.b.filter((r) => !r.changed).map((r) => r.text).join('');
  ok(unchangedB.includes('The quick ') && unchangedB.includes(' fox jumps'), 'word diff keeps surrounding text unmarked');
}

// 7. Word diff reconstructs each side's exact text (no loss).
{
  const a = 'alpha beta gamma delta', b = 'alpha BETA gamma omega';
  const wd = wordDiff(a, b);
  ok(wd.a.map((r) => r.text).join('') === a && wd.b.map((r) => r.text).join('') === b, 'word diff is lossless on both sides');
}

// 8. ID3v2.3 tag parsing (title/artist/album).
{
  const enc = new TextEncoder();
  const frame = (id, text) => {
    const data = new Uint8Array([0x03, ...enc.encode(text)]);   // 0x03 = UTF-8
    const s = data.length;
    return [...enc.encode(id), (s >>> 24) & 255, (s >>> 16) & 255, (s >>> 8) & 255, s & 255, 0, 0, ...data];
  };
  const body = [...frame('TIT2', 'Demo Title'), ...frame('TPE1', 'Demo Artist'), ...frame('TALB', 'Demo Album')];
  const t = body.length;
  const tag = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00,
    (t >>> 21) & 127, (t >>> 14) & 127, (t >>> 7) & 127, t & 127, ...body]);
  const r = parseId3(tag);
  ok(r && r.title === 'Demo Title' && r.artist === 'Demo Artist' && r.album === 'Demo Album', 'ID3v2.3: title/artist/album parsed');
  ok(parseId3(new Uint8Array([1, 2, 3, 4, 5])) === null, 'ID3: non-ID3 bytes -> null');
}

// 9. EXIF parsing from a hand-built JPEG (Make tag).
{
  const tiff = [
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,                 // II, 42, IFD0 @ 8
    0x01, 0x00,                                                     // 1 entry
    0x0F, 0x01, 0x02, 0x00, 0x08, 0x00, 0x00, 0x00, 0x1A, 0x00, 0x00, 0x00, // Make, ASCII, len 8, off 26
    0x00, 0x00, 0x00, 0x00,                                        // next IFD = 0
    ...[...'TestCam'].map((c) => c.charCodeAt(0)), 0x00,           // string @ 26
  ];
  const app1len = 2 + 6 + tiff.length;
  const jpeg = new Uint8Array([
    0xFF, 0xD8,
    0xFF, 0xE1, (app1len >> 8) & 255, app1len & 255, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff,
    0xFF, 0xD9,
  ]);
  const ex = parseExif(jpeg);
  ok(ex && ex.make === 'TestCam', 'EXIF: Make tag read from JPEG APP1');
  ok(parseExif(new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9])) === null, 'EXIF: JPEG without EXIF -> null');
}

// Big-file guard: a huge NON-media file is read head-only (truncated) instead of fully into RAM.
// We mock a File-like object so no real multi-GB buffer is needed — only .size, .slice, .arrayBuffer.
{
  const MB = 1024 * 1024;
  const head = new TextEncoder().encode('line one\nline two\n');   // pretend file head
  function mockFile(name, size, type = '') {
    return {
      name, type, size, lastModified: 0,
      slice: (start, end) => ({ arrayBuffer: async () => head.slice(start, end === undefined ? head.length : Math.min(end, head.length)).buffer }),
      arrayBuffer: async () => head.buffer,
    };
  }
  // 100 MB .log → over the 64 MB ceiling → truncated, full size preserved, head decoded as text.
  const big = await intakeFromFile(mockFile('huge.log', 100 * MB));
  ok(big.truncated === true, 'big-file guard: 100 MB non-media file is truncated (head-only)');
  ok(big.size === 100 * MB, 'big-file guard: full size preserved on the intake');
  ok(big.loadedBytes < big.size, 'big-file guard: only a slice is loaded (loadedBytes < size)');
  ok(big.text && big.text.startsWith('line one'), 'big-file guard: head still decoded as text');
  // 1 MB file → under the ceiling → read fully, not truncated.
  const small = await intakeFromFile(mockFile('small.log', 1 * MB));
  ok(small.truncated === false, 'big-file guard: a 1 MB file is NOT truncated');
  // Big MEDIA streams (own path) — truncated stays false; streamed true.
  const media = await intakeFromFile(mockFile('movie.mp4', 500 * MB, 'video/mp4'));
  ok(media.streamed === true && media.truncated === false, 'big-file guard: big media streams (not truncated)');
}

// PalmDOC (MOBI compression type 2) decompression — cover each token form.
{
  const dec = (arr) => new TextDecoder().decode(palmDocDecompress(Uint8Array.from(arr)));
  ok(dec([0x41]) === 'A', 'PalmDOC: single literal byte');
  ok(dec([0x03, 0x61, 0x62, 0x63]) === 'abc', 'PalmDOC: literal run (length 3)');
  ok(dec([0xC1]) === ' A', 'PalmDOC: space+char shorthand (0xC0..0xFF)');
  ok(dec([0x03, 0x61, 0x62, 0x63, 0x80, 0x18]) === 'abcabc', 'PalmDOC: LZ77 back-reference (dist 3, len 3)');
}

// MOBI: AZW3/KF8 (file version ≥ 8) is detected and reported (not mis-rendered as MOBI6).
{
  function buildMobi(version) {
    const HDRLEN = 232;
    const rec0 = new Uint8Array(16 + HDRLEN);
    const dv = new DataView(rec0.buffer);
    dv.setUint16(0, 1, false);                 // compression: none
    dv.setUint16(8, 0, false);                 // text record count: 0
    dv.setUint16(12, 0, false);                // encryption: none
    rec0.set([0x4d, 0x4f, 0x42, 0x49], 16);    // 'MOBI'
    dv.setUint32(16 + 4, HDRLEN, false);       // header length
    dv.setUint32(16 + 8, 2, false);            // mobi type
    dv.setUint32(16 + 28, 65001, false);       // text encoding UTF-8
    dv.setUint32(16 + 36, version, false);     // file version
    const numRec = 1, dataStart = 78 + numRec * 8 + 2;
    const head = new Uint8Array(dataStart);
    const hv = new DataView(head.buffer);
    head.set([0x42, 0x4f, 0x4f, 0x4b], 60); head.set([0x4d, 0x4f, 0x42, 0x49], 64);   // 'BOOKMOBI'
    hv.setUint16(76, numRec, false);
    hv.setUint32(78, dataStart, false);
    const out = new Uint8Array(dataStart + rec0.length);
    out.set(head, 0); out.set(rec0, dataStart);
    return out;
  }
  const kf8 = openMobi(buildMobi(8));
  ok(kf8.ok === false && /KF8|AZW3/.test(kf8.reason), 'MOBI: KF8/AZW3 detected + reported (not garbled)');
  ok(openMobi(buildMobi(6)).ok === true, 'MOBI: a version-6 book still parses');
}

console.log(failed ? `\nMOVEDIFF FAILED (${failed})` : '\nMOVEDIFF PASSED');
process.exit(failed ? 1 : 0);
