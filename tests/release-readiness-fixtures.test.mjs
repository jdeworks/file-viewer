import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { Archive } from 'libarchive.js/dist/libarchive-node.mjs';
import { FORMAT_CASES, mimeFor } from './release-readiness-format-cases.mjs';
import {
  FORMAT_ARTIFACT_ROOT, FORMAT_FIXTURE_ROOT, REPO_ROOT,
  ensureFormatArtifactDirs, sha256,
} from './release-readiness-format-helpers.mjs';
import { intakeFromBytes } from '../docs/core/intake.js';
import { pickType } from '../docs/core/detect.js';
import { REGISTRY } from '../docs/core/registry-runtime.generated.js';
import { matchKnown } from '../docs/known/registry.generated.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const XLSX = require('xlsx');
const yaml = require('js-yaml');

async function createRepresentativeTopoJson() {
  const topology = {
    type: 'Topology',
    transform: { scale: [0.01, 0.01], translate: [13.0, 52.0] },
    objects: {
      districts: {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Polygon', properties: { name: 'North district' }, arcs: [[0]] },
          { type: 'Polygon', properties: { name: 'South district' }, arcs: [[1]] },
        ],
      },
      transit: { type: 'LineString', properties: { name: 'Connector' }, arcs: [2] },
    },
    arcs: [
      [[0, 40], [30, 0], [0, 30], [-30, 0], [0, -30]],
      [[0, 0], [30, 0], [0, 30], [-30, 0], [0, -30]],
      [[5, 10], [10, 10], [10, 10], [10, 10]],
    ],
  };
  const target = join(FORMAT_FIXTURE_ROOT, 'representative.topojson');
  await writeFile(target, JSON.stringify(topology, null, 2) + '\n');
  return target;
}

const text = (bytes) => new TextDecoder().decode(bytes);
const starts = (bytes, values, offset = 0) => values.every((value, i) => bytes[offset + i] === value);
const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u16le = (b, o) => b[o] | b[o + 1] << 8;
const u32le = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
const u32be = (b, o) => (b[o] * 0x1000000) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u64le = (b, o) => Number(new DataView(b.buffer, b.byteOffset, b.byteLength).getBigUint64(o, true));

function mp4VideoDimensions(bytes) {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const codecs = ['avc1', 'hvc1', 'hev1', 'vp09', 'av01', 'mp4v'];
  for (const codec of codecs) {
    let offset = -1;
    while ((offset = data.indexOf(codec, offset + 1, 'ascii')) >= 0) {
      if (offset + 32 > data.length) break;
      const width = data.readUInt16BE(offset + 28);
      const height = data.readUInt16BE(offset + 30);
      if (width > 0 && height > 0) return { codec, width, height };
    }
  }
  return null;
}

function countWasmSections(bytes) {
  let offset = 8;
  let sections = 0;
  while (offset < bytes.length) {
    offset++;
    let size = 0;
    let shift = 0;
    let byte;
    do {
      if (offset >= bytes.length) return sections;
      byte = bytes[offset++];
      size |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    if (offset + size > bytes.length) break;
    sections++;
    offset += size;
  }
  return sections;
}

async function zipDetails(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.values(zip.files).filter((entry) => !entry.dir).map((entry) => entry.name);
  return { zip, names };
}

async function validateFixture(row, bytes) {
  const s = text(bytes);
  const result = (valid, richness, details) => ({ valid: !!valid, richness: !!richness, details });
  switch (row.expectedType) {
    case 'markdown': {
      const headings = (s.match(/^#{1,6}\s+/gm) || []).length;
      const bullets = (s.match(/^[-*]\s+/gm) || []).length;
      return result(headings >= 1, headings >= 2 && bullets >= 3, { headings, bullets, characters: s.length });
    }
    case 'csv': {
      const lines = s.trim().split(/\r?\n/);
      const columns = lines[0].split(',').length;
      return result(lines.length >= 2 && columns >= 2, lines.length >= 5 && columns >= 4, { rows: lines.length - 1, columns });
    }
    case 'json': {
      const value = JSON.parse(s);
      return result(value && typeof value === 'object', Object.keys(value).length >= 5, { topLevelKeys: Object.keys(value), characters: s.length });
    }
    case 'yaml': {
      const value = yaml.load(s);
      return result(value && typeof value === 'object', Object.keys(value).length >= 5, { topLevelKeys: Object.keys(value), lines: s.split(/\r?\n/).length });
    }
    case 'xml': {
      const tags = [...s.matchAll(/<([A-Za-z_][\w:.-]*)(?:\s|>|\/)/g)].map((m) => m[1]);
      return result(/^\s*<\?xml/.test(s) && tags.length > 0, new Set(tags).size >= 8 && tags.length >= 20, { elements: tags.length, distinctElements: new Set(tags).size });
    }
    case 'jsonl': {
      const records = s.trim().split(/\r?\n/).map((line) => JSON.parse(line));
      return result(records.length > 1, records.length >= 5 && new Set(records.map((r) => r.level)).size >= 3, { records: records.length, levels: [...new Set(records.map((r) => r.level))] });
    }
    case 'sqlite':
      return result(s.startsWith('SQLite format 3\0'), bytes.length >= 8192, { bytes: bytes.length, pageSize: u16be(bytes, 16) });
    case 'ipynb': {
      const notebook = JSON.parse(s);
      const cells = notebook.cells || [];
      return result(Array.isArray(cells), cells.length >= 3 && cells.some((c) => c.outputs?.length), { cells: cells.length, kinds: [...new Set(cells.map((c) => c.cell_type))], outputs: cells.reduce((n, c) => n + (c.outputs?.length || 0), 0) });
    }
    case 'image': {
      const png = starts(bytes, [137, 80, 78, 71, 13, 10, 26, 10]);
      return result(png, png && u32be(bytes, 16) >= 64 && u32be(bytes, 20) >= 64, { width: png ? u32be(bytes, 16) : 0, height: png ? u32be(bytes, 20) : 0 });
    }
    case 'svg': {
      const paths = (s.match(/<(path|rect|circle|line|polygon|text)\b/g) || []).length;
      return result(/<svg\b/.test(s), paths >= 3, { drawableElements: paths, characters: s.length });
    }
    case 'tiff': {
      const signature = starts(bytes, [0x49, 0x49, 0x2a, 0]) || starts(bytes, [0x4d, 0x4d, 0, 0x2a]);
      return result(signature, bytes.length >= 4096, { bytes: bytes.length, byteOrder: String.fromCharCode(bytes[0], bytes[1]) });
    }
    case 'layered': {
      const signature = s.slice(0, 4) === '8BPS';
      return result(signature, signature && u32be(bytes, 18) >= 64 && u32be(bytes, 14) >= 64, { width: signature ? u32be(bytes, 18) : 0, height: signature ? u32be(bytes, 14) : 0, channels: signature ? u16be(bytes, 12) : 0 });
    }
    case 'pdf': {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
      let textItems = 0;
      for (let p = 1; p <= doc.numPages; p++) textItems += (await (await doc.getPage(p)).getTextContent()).items.length;
      return result(s.startsWith('%PDF-'), doc.numPages >= 2 && textItems >= 2, { pages: doc.numPages, textItems });
    }
    case 'xlsx': {
      const wb = XLSX.read(bytes, { type: 'buffer' });
      const cells = wb.SheetNames.reduce((n, name) => n + Object.keys(wb.Sheets[name]).filter((key) => !key.startsWith('!')).length, 0);
      return result(wb.SheetNames.length > 0, wb.SheetNames.length >= 2 && cells >= 10, { sheets: wb.SheetNames, cells });
    }
    case 'docx': case 'pptx': case 'odf': case 'zip': case 'epub': case 'comic': case 'apk': {
      const { zip, names } = await zipDetails(bytes);
      const markers = {
        docx: ['word/document.xml'], pptx: ['ppt/presentation.xml'], odf: ['content.xml'],
        epub: ['META-INF/container.xml'], apk: ['AndroidManifest.xml'], zip: ['README.txt'], comic: [],
      }[row.expectedType];
      let extractedCharacters = 0;
      for (const name of names.filter((name) => /\.(xml|html?|txt|json|js)$/i.test(name)).slice(0, 20)) {
        extractedCharacters += (await zip.file(name).async('string')).length;
      }
      const valid = markers.every((name) => names.includes(name));
      const minimumFiles = { docx: 3, pptx: 10, odf: 3, zip: 4, epub: 6, comic: 3, apk: 8 }[row.expectedType];
      const contentRich = row.expectedType === 'comic'
        || (row.expectedType === 'apk' && names.includes('classes.dex') && names.some((name) => name.startsWith('lib/')))
        || extractedCharacters >= 100;
      return result(valid, names.length >= minimumFiles && contentRich, { entries: names.length, firstEntries: names.slice(0, 12), extractedCharacters });
    }
    case 'rtf':
      return result(/^\{\\rtf/.test(s), s.split(/\s+/).length >= 150, { wordsIncludingControls: s.split(/\s+/).length, characters: s.length });
    case 'archive': {
      const archive = await Archive.open(new Blob([bytes]));
      try {
        const files = await archive.getFilesArray();
        const names = files.map(({ path, file }) => `${path}${file.name}`);
        const readme = files.find(({ path, file }) => `${path}${file.name}` === 'README.md');
        const readmeText = readme ? await (await readme.file.extract()).text() : '';
        return result(names.length > 0,
          names.length >= 4 && names.some((name) => name.includes('/')) && /File Viewer archive sample/.test(readmeText),
          { entries: names, extractedReadmeCharacters: readmeText.length });
      } finally {
        await archive.close();
      }
    }
    case 'media': {
      const webm = starts(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
      const mp4 = s.slice(4, 8) === 'ftyp';
      const video = mp4 ? mp4VideoDimensions(bytes) : null;
      return result(webm || mp4, bytes.length >= 10000 && (webm || (video?.width >= 160 && video?.height >= 90)),
        { bytes: bytes.length, container: webm ? 'WebM' : mp4 ? 'ISO BMFF' : 'unknown', brand: mp4 ? s.slice(8, 12) : null, video });
    }
    case 'midi':
      return result(s.slice(0, 4) === 'MThd', u16be(bytes, 10) >= 2, { format: u16be(bytes, 8), tracks: u16be(bytes, 10), division: u16be(bytes, 12) });
    case 'font': {
      const signature = u32be(bytes, 0);
      return result(signature === 0x00010000 || s.slice(0, 4) === 'OTTO', u16be(bytes, 4) >= 10 && bytes.length >= 50000, { tables: u16be(bytes, 4), bytes: bytes.length });
    }
    case 'stl': {
      const triangles = u32le(bytes, 80);
      return result(bytes.length === 84 + triangles * 50, triangles >= 8, { triangles });
    }
    case 'gltf':
      return result(s.slice(0, 4) === 'glTF' && u32le(bytes, 4) === 2, u32le(bytes, 8) === bytes.length && bytes.length >= 500, { version: u32le(bytes, 4), declaredLength: u32le(bytes, 8), bytes: bytes.length });
    case 'dxf': {
      const entities = (s.match(/\n(?:LINE|CIRCLE|TEXT|LWPOLYLINE)\r?\n/g) || []).length;
      return result(/SECTION/.test(s) && /EOF/.test(s), entities >= 5, { entities, lines: s.split(/\r?\n/).length });
    }
    case 'geojson': {
      const geo = JSON.parse(s);
      const objects = Object.keys(geo.objects || {});
      return result(geo.type === 'Topology', objects.length >= 2 && geo.arcs?.length >= 3, { objects, arcs: geo.arcs?.length || 0, geometryTypes: objects.map((key) => geo.objects[key]?.type) });
    }
    case 'kml': {
      const placemarks = (s.match(/<Placemark\b/g) || []).length;
      return result(/<kml\b/.test(s), placemarks >= 3, { placemarks, characters: s.length });
    }
    case 'dicom':
      return result(s.slice(128, 132) === 'DICM', bytes.length >= 500 && /DEMO\^PATIENT/.test(s), { bytes: bytes.length, hasPixelTag: bytes.some((_, i) => bytes[i] === 0xe0 && bytes[i + 1] === 0x7f), syntheticMetadataFixture: true });
    case 'netcdf':
      return result(s.slice(0, 3) === 'CDF', bytes.length >= 500 && /temperature/.test(s), { version: bytes[3], bytes: bytes.length, containsTemperature: /temperature/.test(s) });
    case 'pdb': {
      const atoms = (s.match(/^ATOM\s/gm) || []).length;
      const chains = new Set(s.split(/\r?\n/).filter((line) => line.startsWith('ATOM')).map((line) => line.slice(21, 22)).filter(Boolean)).size;
      return result(/^HEADER/m.test(s) && atoms > 0, atoms >= 15 && chains >= 2, { atoms, chains, lines: s.split(/\r?\n/).length });
    }
    case 'fits': {
      const cards = [];
      let endOffset = -1;
      for (let offset = 0; offset + 80 <= bytes.length; offset += 80) {
        const record = text(bytes.subarray(offset, offset + 80));
        const keyword = record.slice(0, 8).trim();
        cards.push(record);
        if (keyword === 'END') { endOffset = offset; break; }
      }
      const headerValue = (keyword) => {
        const record = cards.find((candidate) => candidate.slice(0, 8).trim() === keyword);
        return record ? record.slice(10).split('/')[0].trim().replace(/^'(.*)'$/, '$1').trim() : null;
      };
      const width = Number(headerValue('NAXIS1'));
      const height = Number(headerValue('NAXIS2'));
      const bitpix = Number(headerValue('BITPIX'));
      const headerBytes = endOffset >= 0 ? Math.ceil((endOffset + 80) / 2880) * 2880 : 0;
      const pixelBytes = width * height * Math.abs(bitpix) / 8;
      let nonzeroPixels = 0;
      for (let offset = headerBytes; offset + 1 < Math.min(bytes.length, headerBytes + pixelBytes); offset += 2) {
        if (bytes[offset] || bytes[offset + 1]) nonzeroPixels++;
      }
      const valid = s.slice(0, 8) === 'SIMPLE  ' && endOffset >= 0 && bytes.length % 2880 === 0
        && width > 0 && height > 0 && [8, 16, 32, 64, -32, -64].includes(bitpix)
        && bytes.length >= headerBytes + pixelBytes;
      return result(valid, cards.length >= 15 && width >= 32 && height >= 32 && nonzeroPixels > width,
        { cards: cards.length, bytes: bytes.length, headerBytes, width, height, bitpix, pixelBytes, nonzeroPixels });
    }
    case 'wasm': {
      const sections = countWasmSections(bytes);
      return result(starts(bytes, [0, 97, 115, 109, 1, 0, 0, 0]), sections >= 2, { sections, bytes: bytes.length });
    }
    case 'npy': {
      const headerLength = bytes[8] | bytes[9] << 8;
      const header = text(bytes.subarray(10, 10 + headerLength));
      return result(starts(bytes, [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]), /'shape':/.test(header) && bytes.length > 10 + headerLength, { header: header.trim(), dataBytes: bytes.length - 10 - headerLength });
    }
    case 'exe': {
      const programHeaders = bytes.length >= 64 ? u16le(bytes, 56) : 0;
      const sectionHeaders = bytes.length >= 64 ? u16le(bytes, 60) : 0;
      const sectionOffset = bytes.length >= 64 ? u64le(bytes, 40) : 0;
      const entry = bytes.length >= 64 ? u64le(bytes, 24) : 0;
      const completeSectionTable = sectionOffset > 0 && sectionOffset + sectionHeaders * 64 <= bytes.length;
      return result(starts(bytes, [0x7f, 0x45, 0x4c, 0x46]),
        bytes[4] === 2 && programHeaders >= 2 && sectionHeaders >= 5 && completeSectionTable && entry > 0,
        { class: bytes[4] === 2 ? '64-bit' : '32-bit', machine: bytes[18] | bytes[19] << 8, bytes: bytes.length, entry, programHeaders, sectionHeaders, completeSectionTable });
    }
    case 'torrent':
      return result(bytes[0] === 0x64 && bytes.at(-1) === 0x65, /announce/.test(s) && /pieces/.test(s) && bytes.length >= 100, { bytes: bytes.length, hasAnnounce: /announce/.test(s), hasPieces: /pieces/.test(s) });
    case 'dockerfile': {
      const stages = (s.match(/^FROM\s+/gmi) || []).length;
      const instructions = (s.match(/^(FROM|RUN|COPY|CMD|ENTRYPOINT|ENV|ARG|WORKDIR|EXPOSE|USER|HEALTHCHECK)\b/gmi) || []).length;
      return result(stages > 0, stages >= 2 && instructions >= 12, { stages, instructions, lines: s.split(/\r?\n/).length });
    }
    case 'docker-compose': {
      const value = yaml.load(s);
      const services = Object.keys(value.services || {});
      return result(services.length > 0, services.length >= 4, { services, lines: s.split(/\r?\n/).length });
    }
    case 'sarif': {
      const sarif = JSON.parse(s);
      const results = sarif.runs?.reduce((n, run) => n + (run.results?.length || 0), 0) || 0;
      const rules = sarif.runs?.reduce((n, run) => n + (run.tool?.driver?.rules?.length || 0), 0) || 0;
      return result(sarif.version === '2.1.0' && Array.isArray(sarif.runs), results >= 4 && rules >= 4, { runs: sarif.runs.length, results, rules });
    }
    case 'pem': {
      const match = s.match(/-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/);
      const decoded = match ? Buffer.from(match[2].replace(/\s/g, ''), 'base64') : Buffer.alloc(0);
      return result(!!match && decoded.length > 0, decoded.length >= 500, { blockType: match?.[1] || null, derBytes: decoded.length });
    }
    case 'patch': {
      const files = (s.match(/^diff --git /gm) || []).length;
      const hunks = (s.match(/^@@ /gm) || []).length;
      return result(files > 0 && hunks > 0, files >= 2 && hunks >= 3, { files, hunks, lines: s.split(/\r?\n/).length });
    }
    case 'code':
      return result(/import Foundation/.test(s), s.split(/\r?\n/).length >= 10 && /struct\s+Release/.test(s), { lines: s.split(/\r?\n/).length, characters: s.length });
    default:
      return result(bytes.length > 0, bytes.length >= 256, { bytes: bytes.length });
  }
}

await ensureFormatArtifactDirs();
await createRepresentativeTopoJson();

const registryIds = REGISTRY.map((type) => type.id);
const rows = [];
const failures = [];

if (registryIds.length !== 144) failures.push(`registry has ${registryIds.length} entries, expected 144`);
if (new Set(registryIds).size !== registryIds.length) failures.push('registry IDs are not unique');
if (FORMAT_CASES.length !== 45) failures.push(`candidate matrix has ${FORMAT_CASES.length} rows, expected 45`);
if (new Set(FORMAT_CASES.map((row) => row.expectedType)).size !== FORMAT_CASES.length) failures.push('candidate base-type IDs are not distinct');

for (const row of FORMAT_CASES) {
  const absolute = join(REPO_ROOT, row.file);
  try {
    const bytes = new Uint8Array(await readFile(absolute));
    const intake = intakeFromBytes(bytes, basename(row.file), mimeFor(row.file));
    const detection = pickType(intake);
    const known = matchKnown(intake, detection.type);
    const validity = await validateFixture(row, bytes);
    const status = detection.type.id === row.expectedType && validity.valid && validity.richness ? 'candidate-pass' : 'candidate-fail';
    const evidence = {
      index: row.index,
      family: row.family,
      expectedType: row.expectedType,
      file: row.file,
      originalFile: row.originalFile || null,
      replacementReason: row.replacementReason || null,
      bytes: bytes.length,
      sha256: sha256(bytes),
      mimeType: intake.mimeType,
      isBinary: intake.isBinary,
      detectedType: detection.type.id,
      detectorScore: detection.score,
      detectorRanking: detection.ranking.slice(0, 6).map(({ type, score }) => ({ id: type.id, score })),
      knownEnhancement: known ? { id: known.id, label: known.label } : null,
      effectiveRenderer: known ? `known:${known.id}` : row.rawOnly ? 'raw:monaco' : `base:${detection.type.id}`,
      baseViewRequired: !!row.requireBaseView,
      validity,
      plannedLandmarkTokens: row.tokens,
      assignedConfiguration: row.config.id,
      status,
    };
    rows.push(evidence);
    if (status !== 'candidate-pass') failures.push(`${row.slug}: detection=${detection.type.id}, validity=${validity.valid}, richness=${validity.richness}`);
    console.log(`${status === 'candidate-pass' ? '✓' : '✗'} ${row.slug} ${basename(row.file)} → ${detection.type.id}${known ? ` + ${known.id}` : ''}; ${JSON.stringify(validity.details)}`);
  } catch (error) {
    failures.push(`${row.slug}: ${error.message}`);
    rows.push({ index: row.index, expectedType: row.expectedType, file: row.file, status: 'candidate-error', error: error.stack || error.message });
    console.error(`✗ ${row.slug}: ${error.stack || error.message}`);
  }
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim(),
  registry: { denominator: registryIds.length, uniqueIds: new Set(registryIds).size },
  candidateCount: FORMAT_CASES.length,
  distinctExpectedTypes: new Set(FORMAT_CASES.map((row) => row.expectedType)).size,
  validRichCandidates: rows.filter((row) => row.status === 'candidate-pass').length,
  replacements: rows.filter((row) => row.originalFile).map(({ expectedType, originalFile, file, replacementReason }) => ({ expectedType, originalFile, file, replacementReason })),
  failures,
  rows,
};

await writeFile(join(FORMAT_ARTIFACT_ROOT, 'format-fixture-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
assert.deepEqual(failures, [], `fixture preflight failed:\n${failures.join('\n')}`);
console.log(`\nFixture preflight passed: ${rows.length} meaningful candidates, ${new Set(rows.map((row) => row.expectedType)).size}/${registryIds.length} distinct registered base types.`);
