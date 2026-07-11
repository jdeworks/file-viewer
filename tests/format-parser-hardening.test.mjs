import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { decodeBencode } from '../docs/types/binary/torrent/bencode.js';
import { extract as torrentMetadata } from '../docs/types/binary/torrent/metadata.js';
import { render as renderTorrent } from '../docs/types/binary/torrent/renderer.js';
import { parseNetcdfHeader } from '../docs/types/binary/netcdf/parser.js';
import { render as renderNetcdf } from '../docs/types/binary/netcdf/renderer.js';
import { parseMidi, render as renderMidi } from '../docs/types/binary/midi/renderer.js';
import { parseCertificate } from '../docs/types/text/pem/asn1.js';
import { render as renderPem } from '../docs/types/text/pem/renderer.js';

const root = new URL('../', import.meta.url);
const examples = new URL('../docs/examples/', import.meta.url);
const textBytes = (value) => new TextEncoder().encode(value);

const pemChild = spawnSync(process.execPath, ['--input-type=module', '--eval', `
  import { parseCertificate } from './docs/types/text/pem/asn1.js';
  import { render } from './docs/types/text/pem/renderer.js';
  const der = Uint8Array.from([0x30, 0x08, 0x30, 0x84, 0x80, 0, 0, 0, 0, 0]);
  try { parseCertificate(der); process.exit(2); } catch (_) {}
  const encoded = btoa(String.fromCharCode(...der));
  const text = '-----BEGIN CERTIFICATE-----\\n' + encoded + '\\n-----END CERTIFICATE-----\\n';
  const html = (await render({ text, bytes: new TextEncoder().encode(text), isBinary: false })).bodyHtml;
  if (!/Could not parse certificate structure/.test(html)) process.exit(3);
`], { cwd: root, encoding: 'utf8', timeout: 1000 });
assert.ifError(pemChild.error);
assert.equal(pemChild.status, 0, pemChild.stderr || pemChild.stdout);

for (const malformed of [
  [0x30, 0x80, 0, 0],
  [0x30, 0x85, 1, 0, 0, 0, 0],
  [0x30, 0x82, 1],
  [0x30, 0x81, 0x7f],
  [0x30, 0x02, 0x02, 0x02, 0x01, 0x01],
]) assert.throws(() => parseCertificate(Uint8Array.from(malformed)));

const malformedDer = Uint8Array.from([0x30, 0x08, 0x30, 0x84, 0x80, 0, 0, 0, 0, 0]);
assert.throws(() => parseCertificate(malformedDer));
const malformedPem = `-----BEGIN CERTIFICATE-----\n${Buffer.from(malformedDer).toString('base64')}\n-----END CERTIFICATE-----\n`;
assert.match((await renderPem({ text: malformedPem, bytes: textBytes(malformedPem), isBinary: false })).bodyHtml,
  /Could not parse certificate structure/);

const midiChild = spawnSync(process.execPath, ['--input-type=module', '--eval', `
  import { parseMidi, render } from './docs/types/binary/midi/renderer.js';
  const bytes = Buffer.from('4d546864000000060000000101e04d54726b0000000700f08880808000', 'hex');
  try { parseMidi({ bytes }); process.exit(2); } catch (_) {}
  if (!/Preview failed/.test((await render({ bytes })).bodyHtml)) process.exit(3);
`], { cwd: root, encoding: 'utf8', timeout: 1000 });
assert.ifError(midiChild.error);
assert.equal(midiChild.status, 0, midiChild.stderr || midiChild.stdout);
const backwardVlqMidi = Buffer.from(
  '4d546864000000060000000101e04d54726b0000000700f08880808000',
  'hex',
);
assert.throws(() => parseMidi({ bytes: backwardVlqMidi }), /exceeds four bytes/);
assert.match((await renderMidi({ bytes: backwardVlqMidi })).bodyHtml, /Preview failed/);
const missingTrackMidi = Buffer.from('4d546864000000060000000101e0', 'hex');
assert.throws(() => parseMidi({ bytes: missingTrackMidi }), /Missing MTrk chunk 1/);
assert.match((await renderMidi({ bytes: missingTrackMidi })).bodyHtml, /Preview failed/);

// Run the exact historical infinite-loop repros out of process so a regression terminates with a
// focused one-second failure instead of hanging the complete check indefinitely.
const torrentChild = spawnSync(process.execPath, ['--input-type=module', '--eval', `
  import { render } from './docs/types/binary/torrent/renderer.js';
  import { extract } from './docs/types/binary/torrent/metadata.js';
  for (const byte of [0x64, 0x6c, 0x69, 0x31]) {
    const input = { bytes: new Uint8Array([byte]) };
    const html = (await render(input)).bodyHtml;
    if (!/Parse error/.test(html) || Object.keys(extract(input)).length) process.exit(2);
  }
`], { cwd: root, encoding: 'utf8', timeout: 1000 });
assert.ifError(torrentChild.error);
assert.equal(torrentChild.status, 0, torrentChild.stderr || torrentChild.stdout);

for (const malformed of [
  'i-0e', 'i01e', 'i1', '01:a', '3:ab', 'l1:a', 'd1:ai1e1:ai2ee',
  'd1:bi1e1:ai2ee', 'di1e1:aee', 'd1:ai1eejunk',
]) {
  assert.throws(() => decodeBencode(textBytes(malformed)), undefined, malformed);
}
assert.deepEqual(decodeBencode(textBytes('le')).value, []);
assert.deepEqual(Object.keys(decodeBencode(textBytes('de')).value), []);
const prototypeKey = decodeBencode(textBytes('d9:__proto__d1:x1:yee')).value;
assert.equal(Object.getPrototypeOf(prototypeKey), null);
assert.equal(prototypeKey.__proto__.x, 'y');

const torrent = await readFile(new URL('sample.torrent', examples));
const decodedTorrent = decodeBencode(torrent);
assert.deepEqual(decodedTorrent.infoRange, { start: 282, end: 552 });
assert.equal(torrentMetadata({ bytes: torrent }).fileCount, 3);
assert.match((await renderTorrent({ bytes: torrent, name: 'sample.torrent' })).bodyHtml, /docs\/readme\.txt/);

const netcdfChild = spawnSync(process.execPath, ['--input-type=module', '--eval', `
  import { render } from './docs/types/binary/netcdf/renderer.js';
  const p = [];
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  p.push(0x43, 0x44, 0x46, 0x01, ...u32(0), ...u32(0), ...u32(0));
  p.push(...u32(12), ...u32(1), ...u32(1), 0x61, 0, 0, 0);
  p.push(...u32(1), ...u32(0xffffffff));
  const html = render({ bytes: new Uint8Array(p), size: p.length }).bodyHtml;
  if (!/Parse error/.test(html)) process.exit(2);
`], { cwd: root, encoding: 'utf8', timeout: 1000 });
assert.ifError(netcdfChild.error);
assert.equal(netcdfChild.status, 0, netcdfChild.stderr || netcdfChild.stdout);

const u32 = (value) => {
  const output = Buffer.alloc(4);
  output.writeUInt32BE(value >>> 0);
  return output;
};
const streamingNetcdf = Buffer.concat([
  Buffer.from([0x43, 0x44, 0x46, 0x01]), u32(0xffffffff),
  u32(10), u32(1), u32(4), Buffer.from('time'), u32(0),
  u32(0), u32(0), u32(0), u32(0),
]);
assert.equal(streamingNetcdf.length, 44);
const streamingParsed = parseNetcdfHeader(streamingNetcdf);
assert.equal(streamingParsed.numRecs, null);
assert.equal(streamingParsed.streamingRecords, true);
const streamingHtml = renderNetcdf({ bytes: streamingNetcdf, size: streamingNetcdf.length }).bodyHtml;
assert.match(streamingHtml, /UNLIMITED<\/em> \(streaming record count\)/);
assert.doesNotMatch(streamingHtml, /4294967295 records/);

const pad4 = (value) => Buffer.concat([value, Buffer.alloc((4 - value.length % 4) % 4)]);
const ncName = (value) => Buffer.concat([u32(Buffer.byteLength(value)), pad4(Buffer.from(value))]);
const numericAttribute = (name, type, count, value) => Buffer.concat([ncName(name), u32(type), u32(count), pad4(value)]);
const numericNetcdf = Buffer.concat([
  Buffer.from([0x43, 0x44, 0x46, 0x01]), u32(0),
  u32(0), u32(0),
  u32(12), u32(3),
  numericAttribute('signed_byte', 1, 1, Buffer.from([0xff])),
  numericAttribute('signed_short', 3, 1, Buffer.from([0xff, 0xfe])),
  numericAttribute('positive_short', 3, 1, Buffer.from([0x12, 0x34])),
  u32(0), u32(0),
]);
const numericParsed = parseNetcdfHeader(numericNetcdf);
assert.deepEqual(numericParsed.globalAttrs.map(({ name, value }) => [name, value]), [
  ['signed_byte', '-1'], ['signed_short', '-2'], ['positive_short', '4660'],
]);
const numericHtml = renderNetcdf({ bytes: numericNetcdf, size: numericNetcdf.length }).bodyHtml;
assert.match(numericHtml, /signed_byte<\/dt><dd>-1/);
assert.match(numericHtml, /positive_short<\/dt><dd>4660/);

const validNetcdf = await readFile(new URL('sample.nc', examples));
const parsedNetcdf = parseNetcdfHeader(validNetcdf);
assert.equal(parsedNetcdf.dimensions.length, 3);
assert.equal(parsedNetcdf.variables.length, 5);
assert.match(renderNetcdf({ bytes: validNetcdf, size: validNetcdf.length }).bodyHtml, /Variables \(5\)/);

console.log('format parser hardening tests passed');
