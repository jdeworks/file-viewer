import assert from 'node:assert/strict';
import { createHash, X509Certificate } from 'node:crypto';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

import { parseMidi } from '../docs/types/binary/midi/renderer.js';
import { render as renderDicom } from '../docs/types/binary/dicom/renderer.js';
import { render as renderNetcdf } from '../docs/types/binary/netcdf/renderer.js';
import { render as renderTorrent } from '../docs/types/binary/torrent/renderer.js';
import { detect as detectTorrent } from '../docs/types/binary/torrent/detect.js';
import { intakeFromBytes } from '../docs/core/intake.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const root = new URL('../docs/examples/', import.meta.url);
const bytes = (name) => readFile(new URL(name, root));
const u32be = (buffer, offset) => buffer.readUInt32BE(offset);
const pad4 = (value) => value + (4 - value % 4) % 4;

// NetCDF-3: strictly walk the header, then prove every declared float variable points to a
// complete, finite, nonconstant payload after the header instead of begin=0/header-only data.
const netcdf = await bytes('sample.nc');
assert.deepEqual([...netcdf.subarray(0, 4)], [0x43, 0x44, 0x46, 0x01]);
let ncPos = 4;
assert.equal(u32be(netcdf, ncPos), 0); ncPos += 4;
const ncName = () => {
  const length = u32be(netcdf, ncPos); ncPos += 4;
  const value = netcdf.subarray(ncPos, ncPos + length).toString('utf8');
  ncPos += pad4(length);
  return value;
};
const ncSkipAttributes = () => {
  const tag = u32be(netcdf, ncPos); ncPos += 4;
  if (tag === 0) { assert.equal(u32be(netcdf, ncPos), 0); ncPos += 4; return; }
  assert.equal(tag, 12);
  const count = u32be(netcdf, ncPos); ncPos += 4;
  const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8 };
  for (let index = 0; index < count; index++) {
    ncName();
    const type = u32be(netcdf, ncPos); ncPos += 4;
    const values = u32be(netcdf, ncPos); ncPos += 4;
    assert.ok(sizes[type]);
    ncPos += pad4(values * sizes[type]);
  }
};
assert.equal(u32be(netcdf, ncPos), 10); ncPos += 4;
const dimensionCount = u32be(netcdf, ncPos); ncPos += 4;
const dimensions = [];
for (let index = 0; index < dimensionCount; index++) dimensions.push({ name: ncName(), size: (ncPos += 4, u32be(netcdf, ncPos - 4)) });
assert.deepEqual(dimensions, [
  { name: 'time', size: 3 }, { name: 'latitude', size: 4 }, { name: 'longitude', size: 6 },
]);
ncSkipAttributes();
assert.equal(u32be(netcdf, ncPos), 11); ncPos += 4;
const variableCount = u32be(netcdf, ncPos); ncPos += 4;
const variables = [];
for (let index = 0; index < variableCount; index++) {
  const name = ncName();
  const dimensionIds = Array.from({ length: u32be(netcdf, ncPos) }, (_, dimIndex) => {
    if (dimIndex === 0) ncPos += 4;
    const id = u32be(netcdf, ncPos); ncPos += 4;
    return id;
  });
  ncSkipAttributes();
  const type = u32be(netcdf, ncPos); ncPos += 4;
  const size = u32be(netcdf, ncPos); ncPos += 4;
  const begin = u32be(netcdf, ncPos); ncPos += 4;
  variables.push({ name, dimensionIds, type, size, begin });
}
const netcdfHeaderEnd = ncPos;
assert.deepEqual(variables.map((variable) => variable.name), ['time', 'latitude', 'longitude', 'temperature', 'pressure']);
let priorEnd = netcdfHeaderEnd;
for (const variable of variables) {
  assert.equal(variable.type, 5, `${variable.name}: expected NC_FLOAT`);
  const expectedValues = variable.dimensionIds.reduce((count, id) => count * dimensions[id].size, 1);
  assert.equal(variable.size, expectedValues * 4, `${variable.name}: vsize must match shape`);
  assert.ok(variable.begin >= netcdfHeaderEnd && variable.begin >= priorEnd, `${variable.name}: invalid begin offset`);
  assert.ok(variable.begin + variable.size <= netcdf.length, `${variable.name}: payload exceeds file`);
  const values = Array.from({ length: expectedValues }, (_, index) => netcdf.readFloatBE(variable.begin + index * 4));
  assert.ok(values.every(Number.isFinite), `${variable.name}: non-finite payload`);
  assert.ok(new Set(values.map((value) => value.toFixed(4))).size > 1, `${variable.name}: constant/empty payload`);
  priorEnd = variable.begin + pad4(variable.size);
}
assert.equal(priorEnd, netcdf.length);
assert.match(renderNetcdf({ bytes: netcdf, size: netcdf.length }).bodyHtml, /Variables \(5\)/);

// DICOM Part 10: walk Explicit VR LE elements and verify the declared CT plane, core UIDs, image
// semantics, and actual pixel range agree.
const dicom = await bytes('sample.dcm');
assert.equal(dicom.subarray(128, 132).toString('ascii'), 'DICM');
const longVrs = new Set(['OB','OD','OF','OL','OQ','OV','OW','SQ','UC','UN','UR','UT']);
const dicomTags = new Map();
let dcmPos = 132;
while (dcmPos + 8 <= dicom.length) {
  const start = dcmPos;
  const group = dicom.readUInt16LE(dcmPos); const element = dicom.readUInt16LE(dcmPos + 2); dcmPos += 4;
  const vr = dicom.subarray(dcmPos, dcmPos + 2).toString('ascii'); dcmPos += 2;
  let length;
  if (longVrs.has(vr)) { dcmPos += 2; length = dicom.readUInt32LE(dcmPos); dcmPos += 4; }
  else { length = dicom.readUInt16LE(dcmPos); dcmPos += 2; }
  assert.ok(dcmPos + length <= dicom.length, `DICOM ${group.toString(16)},${element.toString(16)} exceeds file`);
  const value = dicom.subarray(dcmPos, dcmPos + length); dcmPos += length;
  dicomTags.set(`${group.toString(16).padStart(4, '0')}${element.toString(16).padStart(4, '0')}`, { vr, value, start, end: dcmPos });
}
assert.equal(dcmPos, dicom.length);
const dcmText = (key) => dicomTags.get(key)?.value.toString('ascii').replace(/[\0 ]+$/g, '');
const dcmUs = (key) => dicomTags.get(key)?.value.readUInt16LE(0);
assert.equal(dcmText('00020010'), '1.2.840.10008.1.2.1');
assert.equal(dcmText('00080016'), '1.2.840.10008.5.1.4.1.1.2');
assert.match(dcmText('00080008'), /ORIGINAL\\PRIMARY\\AXIAL/);
for (const uid of ['00080018', '0020000d', '0020000e', '00200052']) assert.match(dcmText(uid), /^1\.2\.826\./);
assert.equal(dcmUs('00280002'), 1);
assert.equal(dcmText('00280004'), 'MONOCHROME2');
assert.equal(dcmUs('00280010'), 64);
assert.equal(dcmUs('00280011'), 64);
assert.equal(dcmUs('00280100'), 16);
assert.equal(dcmUs('00280101'), 12);
assert.equal(dcmUs('00280102'), 11);
assert.equal(dcmUs('00280103'), 0);
const pixelData = dicomTags.get('7fe00010');
assert.equal(pixelData.vr, 'OW');
assert.equal(pixelData.value.length, 64 * 64 * 2);
const dicomPixels = Array.from({ length: 64 * 64 }, (_, index) => pixelData.value.readUInt16LE(index * 2));
assert.equal(Math.min(...dicomPixels), 0);
assert.equal(Math.max(...dicomPixels), 3760);
assert.ok(new Set(dicomPixels).size > 200);
const dicomHtml = renderDicom({ bytes: dicom, size: dicom.length }).bodyHtml;
assert.match(dicomHtml, /64 × 64 pixels/);
assert.match(dicomHtml, /Protected Health Information/);

// APK: validate binary AXML framing, DEX integrity/map coverage, honest unsigned state, and ELF ABI
// fixtures rather than accepting literal placeholder strings.
const apkBytes = await bytes('sample.apk');
const apk = await JSZip.loadAsync(apkBytes);
const apkNames = Object.values(apk.files).filter((entry) => !entry.dir).map((entry) => entry.name).sort();
assert.deepEqual(apkNames, [
  'AndroidManifest.xml', 'assets/config.json', 'classes.dex',
  'lib/arm64-v8a/libexample.so', 'lib/x86_64/libexample.so',
]);
assert.equal(apkNames.some((name) => name.startsWith('META-INF/')), false, 'unsigned fixture must not fake META-INF signing');
const axml = await apk.file('AndroidManifest.xml').async('nodebuffer');
assert.equal(axml.readUInt16LE(0), 0x0003);
assert.equal(axml.readUInt16LE(2), 8);
assert.equal(axml.readUInt32LE(4), axml.length);
assert.ok(axml.includes(Buffer.from('com.example.fileviewer')));
let axmlPos = 8;
const axmlTypes = [];
while (axmlPos < axml.length) {
  const type = axml.readUInt16LE(axmlPos);
  const headerSize = axml.readUInt16LE(axmlPos + 2);
  const size = axml.readUInt32LE(axmlPos + 4);
  assert.ok(headerSize >= 8 && size >= headerSize && axmlPos + size <= axml.length, `AXML chunk ${type.toString(16)} bounds`);
  axmlTypes.push(type); axmlPos += size;
}
assert.equal(axmlPos, axml.length);
assert.deepEqual(axmlTypes.slice(0, 2), [0x0001, 0x0180]);
assert.ok(axmlTypes.includes(0x0102) && axmlTypes.includes(0x0103));
const dex = await apk.file('classes.dex').async('nodebuffer');
assert.equal(dex.subarray(0, 8).toString('ascii'), 'dex\n035\0');
assert.equal(dex.readUInt32LE(32), dex.length);
assert.equal(dex.readUInt32LE(36), 0x70);
assert.equal(dex.readUInt32LE(40), 0x12345678);
assert.deepEqual(dex.subarray(12, 32), createHash('sha1').update(dex.subarray(32)).digest());
const adler32 = (data) => {
  let a = 1, b = 0;
  for (const value of data) { a = (a + value) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
};
assert.equal(dex.readUInt32LE(8), adler32(dex.subarray(12)));
assert.equal(dex.readUInt32LE(112), 2);
assert.deepEqual([
  dex.readUInt16LE(116), dex.readUInt32LE(120), dex.readUInt32LE(124),
  dex.readUInt16LE(128), dex.readUInt32LE(132), dex.readUInt32LE(136),
], [0x0000, 1, 0, 0x1000, 1, 112]);
for (const [name, machine] of [['lib/arm64-v8a/libexample.so', 0xb7], ['lib/x86_64/libexample.so', 0x3e]]) {
  const elf = await apk.file(name).async('nodebuffer');
  assert.equal(elf.subarray(0, 4).toString('hex'), '7f454c46');
  assert.equal(elf.readUInt16LE(16), 3);
  assert.equal(elf.readUInt16LE(18), machine);
  assert.ok(Number(elf.readBigUInt64LE(40)) + elf.readUInt16LE(60) * elf.readUInt16LE(58) <= elf.length);
}

// Comic: decode our filter-0 RGB PNGs, then enforce scale-worthy dimensions, color/luma variety,
// edges, and distinct page identities.
const comic = await JSZip.loadAsync(await bytes('sample.cbz'));
const comicNames = Object.values(comic.files).filter((entry) => !entry.dir).map((entry) => entry.name).sort();
assert.deepEqual(comicNames, ['page-01.png', 'page-02.png', 'page-10.png']);
const comicHashes = [];
for (const name of comicNames) {
  const png = await comic.file(name).async('nodebuffer');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 600);
  assert.equal(png.readUInt32BE(20), 900);
  let position = 8;
  const idat = [];
  while (position < png.length) {
    const length = png.readUInt32BE(position);
    const type = png.subarray(position + 4, position + 8).toString('ascii');
    if (type === 'IDAT') idat.push(png.subarray(position + 8, position + 8 + length));
    position += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  assert.equal(raw.length, (600 * 3 + 1) * 900);
  const quantized = new Set();
  const lumas = [];
  let edges = 0;
  for (let y = 0; y < 900; y++) {
    const row = y * (600 * 3 + 1);
    assert.equal(raw[row], 0, `${name}: expected deterministic PNG filter 0`);
    for (let x = 0; x < 600; x++) {
      const offset = row + 1 + x * 3;
      const red = raw[offset], green = raw[offset + 1], blue = raw[offset + 2];
      quantized.add(`${red >> 4},${green >> 4},${blue >> 4}`);
      const luma = (red * 299 + green * 587 + blue * 114) / 1000;
      lumas.push(luma);
      if (x && Math.abs(luma - lumas[lumas.length - 2]) > 24) edges++;
    }
  }
  const mean = lumas.reduce((sum, value) => sum + value, 0) / lumas.length;
  const deviation = Math.sqrt(lumas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lumas.length);
  assert.ok(quantized.size >= 32, `${name}: too few quantized colors (${quantized.size})`);
  assert.ok(deviation >= 25, `${name}: luma variation too low (${deviation})`);
  assert.ok(edges / (600 * 900) >= 0.005, `${name}: edge density too low`);
  comicHashes.push(createHash('sha256').update(png).digest('hex'));
}
assert.equal(new Set(comicHashes).size, 3);

// MIDI: exact track chunk bounds/EOT plus renderer metrics for a genuinely populated Type-1 file.
const midiBytes = await bytes('sample.mid');
assert.equal(midiBytes.subarray(0, 4).toString('ascii'), 'MThd');
assert.equal(midiBytes.readUInt16BE(8), 1);
assert.equal(midiBytes.readUInt16BE(10), 3);
let midiPos = 14;
for (let track = 0; track < 3; track++) {
  assert.equal(midiBytes.subarray(midiPos, midiPos + 4).toString('ascii'), 'MTrk');
  const size = midiBytes.readUInt32BE(midiPos + 4);
  const end = midiPos + 8 + size;
  assert.ok(end <= midiBytes.length);
  assert.equal(midiBytes.subarray(end - 4, end).toString('hex'), '00ff2f00');
  midiPos = end;
}
assert.equal(midiPos, midiBytes.length);
const midi = parseMidi({ bytes: midiBytes });
assert.equal(midi.declaredTracks, 3);
assert.equal(midi.totalNotes, 48);
assert.ok(midi.uniquePitches >= 12);
assert.equal(midi.durationSeconds, 8);
assert.deepEqual(midi.tracks.map((track) => track.name), ['Conductor', 'Piano Melody', 'Bass Foundation']);
assert.deepEqual(midi.tracks.slice(1).map((track) => track.program), [0, 32]);
assert.deepEqual(midi.tracks.slice(1).map((track) => track.channel), [1, 2]);

// PDB: complete backbone residues, realistic Cα spacing, nearby multi-atom ligand, and metadata/
// HELIX records that drive the viewer's default cartoon and molecule/organism surfaces.
const pdb = (await bytes('sample.pdb')).toString('ascii');
assert.match(pdb, /^COMPND\s+.*MOLECULE:/m);
assert.match(pdb, /^SOURCE\s+.*ORGANISM_SCIENTIFIC:/m);
assert.equal((pdb.match(/^HELIX\s/gm) || []).length, 2);
const pdbAtoms = pdb.split(/\r?\n/).filter((line) => /^(ATOM  |HETATM)/.test(line)).map((line) => ({
  record: line.slice(0, 6).trim(), name: line.slice(12, 16).trim(), residue: line.slice(17, 20).trim(),
  chain: line.slice(21, 22), residueId: Number(line.slice(22, 26)),
  x: Number(line.slice(30, 38)), y: Number(line.slice(38, 46)), z: Number(line.slice(46, 54)),
}));
const polymer = pdbAtoms.filter((atom) => atom.record === 'ATOM');
assert.ok(polymer.length >= 120);
const residues = new Map();
for (const atom of polymer) {
  const key = `${atom.chain}:${atom.residueId}`;
  if (!residues.has(key)) residues.set(key, []);
  residues.get(key).push(atom);
}
assert.ok(residues.size >= 20);
for (const atoms of residues.values()) {
  const names = new Set(atoms.map((atom) => atom.name));
  for (const name of ['N', 'CA', 'C', 'O']) assert.ok(names.has(name), `PDB residue missing ${name}`);
  if (atoms[0].residue === 'GLY') assert.equal(names.has('CB'), false);
}
for (const chain of ['A', 'B']) {
  const ca = polymer.filter((atom) => atom.chain === chain && atom.name === 'CA').sort((a, b) => a.residueId - b.residueId);
  for (let index = 1; index < ca.length; index++) {
    const distance = Math.hypot(ca[index].x - ca[index - 1].x, ca[index].y - ca[index - 1].y, ca[index].z - ca[index - 1].z);
    assert.ok(distance >= 3.4 && distance <= 4.2, `${chain} Cα distance ${distance}`);
  }
}
const ligand = pdbAtoms.filter((atom) => atom.record === 'HETATM' && atom.residue === 'LIG');
assert.ok(ligand.length >= 8);
const nearestLigand = Math.min(...ligand.flatMap((ligandAtom) => polymer.map((atom) =>
  Math.hypot(ligandAtom.x - atom.x, ligandAtom.y - atom.y, ligandAtom.z - atom.z))));
assert.ok(nearestLigand <= 8, `ligand is too far from polymer (${nearestLigand})`);

// Torrent: canonical strict bdecode, complete EOF consumption, multi-file branch, and piece hashes
// recomputed from the documented nested payload byte stream.
const torrentBytes = await bytes('sample.torrent');
const torrentIntake = intakeFromBytes(torrentBytes, 'sample.torrent', 'application/x-bittorrent');
assert.equal(torrentIntake.isBinary, false, 'regression fixture intentionally has no NUL byte');
assert.equal(detectTorrent(torrentIntake), 0.95, '.torrent detection must not depend on an accidental NUL byte');
function bdecode(buffer, start = 0) {
  const marker = buffer[start];
  if (marker === 0x69) {
    const end = buffer.indexOf(0x65, start + 1); assert.ok(end > start + 1);
    const raw = buffer.subarray(start + 1, end).toString('ascii');
    assert.match(raw, /^(0|-?[1-9]\d*)$/);
    return { value: Number(raw), end: end + 1 };
  }
  if (marker === 0x6c) {
    const value = []; let position = start + 1;
    while (buffer[position] !== 0x65) { const decoded = bdecode(buffer, position); value.push(decoded.value); position = decoded.end; }
    return { value, end: position + 1 };
  }
  if (marker === 0x64) {
    const value = {}; let position = start + 1, previous = null;
    while (buffer[position] !== 0x65) {
      const keyResult = bdecode(buffer, position); assert.ok(Buffer.isBuffer(keyResult.value)); position = keyResult.end;
      if (previous) assert.ok(Buffer.compare(previous, keyResult.value) < 0, 'torrent dictionary keys must be canonical');
      previous = keyResult.value;
      const item = bdecode(buffer, position); position = item.end;
      value[keyResult.value.toString('utf8')] = item.value;
    }
    return { value, end: position + 1 };
  }
  assert.ok(marker >= 0x30 && marker <= 0x39, `invalid bencode marker ${marker}`);
  const colon = buffer.indexOf(0x3a, start); assert.ok(colon > start);
  const rawLength = buffer.subarray(start, colon).toString('ascii'); assert.match(rawLength, /^(0|[1-9]\d*)$/);
  const length = Number(rawLength), end = colon + 1 + length; assert.ok(end <= buffer.length);
  return { value: buffer.subarray(colon + 1, end), end };
}
const decodedTorrent = bdecode(torrentBytes);
assert.equal(decodedTorrent.end, torrentBytes.length);
const torrent = decodedTorrent.value;
assert.equal(torrent.announce.toString(), 'https://tracker.invalid/announce');
assert.equal(torrent.info.files.length, 3);
assert.deepEqual(torrent.info.files.map((file) => file.path.map((part) => part.toString()).join('/')),
  ['docs/readme.txt', 'data/people.csv', 'src/example.js']);
const torrentPayload = Buffer.concat([
  Buffer.from('File Viewer torrent sample\nNested files and real piece hashes.\n'),
  Buffer.from('name,role\nAda Lovelace,Mathematician\nGrace Hopper,Computer scientist\n'),
  Buffer.from('export const answer = 42;\nexport function greet(name) { return `Hello ${name}`; }\n'),
]);
assert.equal(torrent.info['piece length'], 64);
const expectedPieces = [];
for (let offset = 0; offset < torrentPayload.length; offset += 64) expectedPieces.push(createHash('sha1').update(torrentPayload.subarray(offset, offset + 64)).digest());
assert.deepEqual(torrent.info.pieces, Buffer.concat(expectedPieces));
const torrentHtml = (await renderTorrent({ bytes: torrentBytes, name: 'sample.torrent' })).bodyHtml;
assert.match(torrentHtml, /Files \(3\)/);
for (const path of ['docs/readme.txt', 'data/people.csv', 'src/example.js']) assert.match(torrentHtml, new RegExp(path.replace('.', '\\.')));

// PEM: exact authoritative ISRG Root X1 identity, usable RSA public key, and self-signature.
const pem = await bytes('sample.pem');
const certificate = new X509Certificate(pem);
assert.equal(certificate.subject, certificate.issuer);
assert.equal(certificate.fingerprint256, '96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6');
assert.equal(certificate.publicKey.asymmetricKeyType, 'rsa');
assert.equal(certificate.publicKey.asymmetricKeyDetails.modulusLength, 4096);
assert.equal(certificate.verify(certificate.publicKey), true);

console.log('rich public example fixture tests passed');
