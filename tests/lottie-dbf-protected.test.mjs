import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detect as detectDbf } from '../docs/types/binary/dbf/detect.js';
import { validateDbf } from '../docs/types/binary/dbf/validate.js';
import { extractMetadata as dbfMetadata } from '../docs/types/binary/dbf/metadata.js';
import { detect as detectProtected } from '../docs/types/binary/protected-data/detect.js';
import { inspectProtectedData } from '../docs/types/binary/protected-data/parser.js';
import { detect as detectJson } from '../docs/types/text/json/detect.js';
import { isLottieAnimation, matchesLottie, parseLottie } from '../docs/types/text/json/known/lottie/model.js';
import { assignDroppedFiles, prepareAnimation, resolveAssetPath } from '../docs/types/text/json/known/lottie/assets.js';
import {
  LOTTIE_EXPORT_LIMITS,
  authoredFrameCount,
  authoredFramePositions,
  frameFilename,
  gifFrameSchedule,
  outputDimensions,
  rasterCacheKey,
  stableCeil,
  validateExportJob,
} from '../docs/types/text/json/known/lottie/export-model.js';
import { GIFEncoder } from '../docs/vendor/gifenc/gifenc.esm.js';

const bytes = (path) => readFile(new URL(path, import.meta.url)).then((value) => new Uint8Array(value));
const lottie = JSON.parse(await readFile(new URL('../docs/examples/sample-lottie.json', import.meta.url), 'utf8'));

// DBF: a valid catalog table still parses, while the byte shape that caused the .dat false
// positive cannot pass header bounds/descriptor checks.
const dbf = await bytes('../docs/examples/sample.dbf');
const dbfIntake = { filename: 'sample.dbf', bytes: dbf, isBinary: true, size: dbf.length };
assert.equal(validateDbf(dbfIntake).valid, true);
assert.ok(detectDbf(dbfIntake) > 0.9);
const datShaped = new Uint8Array(64);
datShaped.set([0x30, 0x82, 0x01, 0xc1, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d]);
assert.equal(validateDbf({ filename: 'secret.dat', bytes: datShaped, isBinary: true }).valid, false);
assert.equal(detectDbf({ filename: 'secret.dat', bytes: datShaped, isBinary: true }), 0);
assert.match(dbfMetadata({ filename: 'bad.dbf', bytes: datShaped, isBinary: true }).Error, /header|field|record/i);
const badDate = dbf.slice(); badDate[3] = 99;
const badDateResult = validateDbf({ ...dbfIntake, bytes: badDate });
assert.equal(badDateResult.valid, true, 'invalid update date does not invalidate an otherwise coherent DBF');
assert.equal(badDateResult.lastUpdate, 'Unknown');
const dbase2 = new Uint8Array(32); dbase2[0] = 0x02;
assert.equal(validateDbf({ filename: 'old.dbf', bytes: dbase2, isBinary: true }).supported, false);
const vfpBacklink = new Uint8Array(296); vfpBacklink.set([0x30, 124, 1, 1, 0, 0, 0, 0, 0x28, 0x01, 1, 0]); vfpBacklink[32] = 0x0d;
assert.equal(validateDbf({ filename: 'empty.dbf', bytes: vfpBacklink, isBinary: true }).valid, true);

// Minimal DER builder for a clean protected-data recognizer fixture.
function oidValue(text) {
  const parts = text.split('.').map(Number);
  const out = [parts[0] * 40 + parts[1]];
  for (const part of parts.slice(2)) {
    const encoded = [part & 0x7f]; let n = Math.floor(part / 128);
    while (n) { encoded.unshift(0x80 | (n & 0x7f)); n = Math.floor(n / 128); }
    out.push(...encoded);
  }
  return Uint8Array.from(out);
}
function tlv(tag, value) {
  const length = value.length < 128 ? [value.length] : [0x81, value.length];
  return Uint8Array.from([tag, ...length, ...value]);
}
function concat(...items) {
  const out = new Uint8Array(items.reduce((sum, item) => sum + item.length, 0));
  let off = 0; for (const item of items) { out.set(item, off); off += item.length; } return out;
}
const protectedBody = concat(
  ...['1.2.840.113549.1.7.3', '1.3.6.1.4.1.311.74.1', '1.3.6.1.4.1.311.74.1.8', '2.16.840.1.101.3.4.1.45', '2.16.840.1.101.3.4.1.46'].map((oid) => tlv(0x06, oidValue(oid))),
  tlv(0x0c, new TextEncoder().encode('LOCAL')),
  tlv(0x0c, new TextEncoder().encode('user')),
);
const protectedFixture = concat(tlv(0x30, protectedBody), Uint8Array.from([1, 2, 3, 4]));
const protectedInfo = inspectProtectedData(protectedFixture);
assert.equal(protectedInfo.protectionScope, 'LOCAL=user');
assert.equal(protectedInfo.appendedPayloadSize, 4);
assert.equal(detectProtected({ filename: 'secret.dat', bytes: protectedFixture, isBinary: true }), 0.995);
assert.equal(inspectProtectedData(protectedFixture.subarray(0, 20)), null);
const nearMiss = protectedFixture.slice(); nearMiss[10] ^= 1;
assert.equal(inspectProtectedData(nearMiss), null);

// Lottie matching supports both extensions but never upgrades ordinary JSON by filename alone.
assert.equal(isLottieAnimation(lottie), true);
const lottieText = JSON.stringify(lottie);
assert.equal(matchesLottie({ filename: 'animation.json', text: lottieText }, { id: 'json' }), true);
assert.equal(matchesLottie({ filename: 'data.json', text: '{"layers":[]}' }, { id: 'json' }), false);
assert.ok(detectJson({ filename: 'animation.lot', text: lottieText, textSample: lottieText.slice(0, 4096), isBinary: false }) > 0.9);
assert.ok(detectJson({ filename: 'animation.bin', mimeType: 'video/lottie+json', text: lottieText, textSample: lottieText.slice(0, 4096), isBinary: false }) > 0.9);
assert.throws(() => parseLottie({ filename: 'partial.lot', text: lottieText, truncated: true }), /incomplete/);

// Asset paths are exact and folder-relative. Traversal, URLs, and ambiguous references are blocked.
assert.equal(resolveAssetPath('root/anim.lot', 'images/', 'dot.png'), 'root/images/dot.png');
assert.equal(resolveAssetPath('root/anim.lot', '../', 'dot.png'), null);
assert.equal(resolveAssetPath('root/anim.lot', '', 'https://example.test/dot.png'), null);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const imageFile = { name: 'dot.png', size: png.length, arrayBuffer: async () => png.buffer };
const external = structuredClone(lottie);
external.assets = [{ id: 'image_0', w: 1, h: 1, u: 'images/', p: 'dot.png', e: 0 }];
const prepared = await prepareAnimation(external, { folder: { currentPath: 'root/anim.lot', files: [{ path: 'root/images/dot.png', file: imageFile }] } });
assert.equal(prepared.missing.length, 0);
assert.equal(prepared.blocked.length, 0);
assert.match(prepared.data.assets[0].p, /^data:image\/png;base64,/);
const missing = await prepareAnimation(external, { folder: { currentPath: 'root/anim.lot', files: [] } });
assert.equal(missing.missing[0].target, 'root/images/dot.png');
const supplied = new Map();
assert.equal(assignDroppedFiles([imageFile], missing.missing, supplied), 1);
assert.equal(supplied.get('root/images/dot.png'), imageFile);
const remote = structuredClone(external); remote.assets[0].u = ''; remote.assets[0].p = 'https://example.test/tracker.png';
assert.match((await prepareAnimation(remote)).blocked[0].reason, /absolute|remote/);
const networkFields = structuredClone(lottie);
networkFields.segments = [{ time: 1 }];
networkFields.fonts = { list: [{ fName: 'Remote', fPath: 'https://example.test/font.woff2' }] };
networkFields.layers[0].ks.o.x = 'fetch("https://example.test/")';
const scrubbed = await prepareAnimation(networkFields);
assert.equal('segments' in scrubbed.data, false);
assert.equal('fPath' in scrubbed.data.fonts.list[0], false);
assert.ok(scrubbed.warnings.some((warning) => /Expressions/.test(warning)));

// Lottie raster exports preserve authored frames, while GIF scheduling samples by
// requested FPS and distributes GIF centisecond ticks without cumulative drift.
const summary = { width: 128, height: 128, fps: 30, inFrame: 0, outFrame: 60 };
assert.equal(stableCeil(59.99999999999999), 60);
assert.equal(stableCeil(60.0001), 61);
assert.equal(authoredFrameCount(summary), 60);
assert.deepEqual(authoredFramePositions({ ...summary, inFrame: 0.25, outFrame: 2.45 }).map((item) => item.relativeFrame), [0, 1, 2]);
assert.equal(frameFilename(0, 60), 'frame-001.png');
assert.equal(frameFilename(1999, 2000), 'frame-2000.png');
assert.deepEqual(outputDimensions(summary, 125), { width: 160, height: 160 });
assert.equal(rasterCacheKey({ scale: 100, backgroundMode: 'transparent', color: '#ABCDEF' }), '100:transparent:-');
assert.equal(rasterCacheKey({ scale: 100, backgroundMode: 'solid', color: '#ABCDEF' }), '100:solid:#abcdef');
for (const fps of [24, 30, 100]) {
  const schedule = gifFrameSchedule(summary, fps);
  assert.equal(schedule.length, 2 * fps);
  assert.equal(schedule.reduce((sum, frame) => sum + frame.delayMs, 0), 2000);
  assert.ok(schedule.every((frame) => frame.delayMs >= 10));
}
assert.ok(gifFrameSchedule(summary, 100).every((frame) => frame.delayMs === 10));
const exactBudget = { width: 500, height: 500, fps: 30, inFrame: 0, outFrame: 2000 };
assert.equal(validateExportJob(exactBudget, { action: 'split', scale: 100 }).ok, true);
assert.equal(validateExportJob({ ...exactBudget, outFrame: 2000.01 }, { action: 'split', scale: 100 }).frameCount, 2001);
assert.match(validateExportJob({ ...exactBudget, outFrame: 2000.01 }, { action: 'split', scale: 100 }).reason, /2,000/);
assert.equal(validateExportJob({ ...summary, width: 4097, height: 1 }, { action: 'split', scale: 100 }).ok, false);
assert.match(validateExportJob({ ...summary, outFrame: 100_000_000 }, { action: 'gif', scale: 10, fps: 100 }).reason, /frames/);
assert.equal(LOTTIE_EXPORT_LIMITS.maxGeneratedBytes, 256 * 1024 * 1024);

function onePixelGif(repeat) {
  const encoder = GIFEncoder();
  encoder.writeFrame(Uint8Array.of(0), 1, 1, {
    palette: [[0, 0, 0], [255, 255, 255]], delay: 10, repeat,
  });
  encoder.finish();
  return encoder.bytes();
}
const loopingGif = onePixelGif(0);
const onceGif = onePixelGif(-1);
const ascii = (value) => new TextDecoder('latin1').decode(value);
assert.match(ascii(loopingGif), /NETSCAPE2\.0/);
assert.doesNotMatch(ascii(onceGif), /NETSCAPE2\.0/);
const gce = loopingGif.findIndex((value, index) => value === 0x21 && loopingGif[index + 1] === 0xf9);
assert.equal(loopingGif[gce + 4] | (loopingGif[gce + 5] << 8), 1, '10 ms is encoded as one GIF centisecond');

const playerSource = await readFile(new URL('../docs/vendor/lottie/lottie_light.min.js', import.meta.url), 'utf8');
assert.doesNotMatch(playerSource, /\beval\s*\(|new\s+Function\s*\(|ExpressionManager/);

console.log('lottie-dbf-protected: ok');
