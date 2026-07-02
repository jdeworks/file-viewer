import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { extract as codeMeta } from '../docs/types/text/code/metadata.js';
import { extract as fontMeta } from '../docs/types/font/metadata.js';
import { extract as stlMeta } from '../docs/types/3d/stl/metadata.js';
import { extract as objMeta } from '../docs/types/3d/obj/metadata.js';
import { extract as plyMeta } from '../docs/types/3d/ply/metadata.js';
import { extract as gltfMeta } from '../docs/types/3d/gltf/metadata.js';
import { parseGLTF } from '../docs/types/3d/gltf/gltflib.js';
import { extractMetadata as blendMeta } from '../docs/types/binary/blend/metadata.js';
import { render as renderBlend } from '../docs/types/binary/blend/renderer.js';
import { detect as detectBsp } from '../docs/types/binary/bsp/detect.js';
import { extractMetadata as bspMeta } from '../docs/types/binary/bsp/metadata.js';
import { render as renderBsp } from '../docs/types/binary/bsp/renderer.js';
import { detect as detectCbor } from '../docs/types/binary/cbor/detect.js';
import { extractMetadata as cborMeta } from '../docs/types/binary/cbor/metadata.js';
import { render as renderCbor } from '../docs/types/binary/cbor/renderer.js';
import { detect as detectJavaClass } from '../docs/types/binary/class/detect.js';
import { extractMetadata as javaClassMeta } from '../docs/types/binary/class/metadata.js';
import { render as renderJavaClass } from '../docs/types/binary/class/renderer.js';
import { detect as detectDbf } from '../docs/types/binary/dbf/detect.js';
import { extractMetadata as dbfMeta } from '../docs/types/binary/dbf/metadata.js';
import { render as renderDbf } from '../docs/types/binary/dbf/renderer.js';
import { detect as detectDeb } from '../docs/types/binary/deb/detect.js';
import { extractMetadata as debMeta } from '../docs/types/binary/deb/metadata.js';
import { render as renderDeb } from '../docs/types/binary/deb/renderer.js';
import { detect as detectDicom } from '../docs/types/binary/dicom/detect.js';
import { extractMetadata as dicomMeta } from '../docs/types/binary/dicom/metadata.js';
import { render as renderDicom } from '../docs/types/binary/dicom/renderer.js';
import { detect as detectDmp } from '../docs/types/binary/dmp/detect.js';
import { extractMetadata as dmpMeta } from '../docs/types/binary/dmp/metadata.js';
import { render as renderDmp } from '../docs/types/binary/dmp/renderer.js';
import { detect as detectDwg } from '../docs/types/binary/dwg/detect.js';
import { extractMetadata as dwgMeta } from '../docs/types/binary/dwg/metadata.js';
import { render as renderDwg } from '../docs/types/binary/dwg/renderer.js';
import { detect as detectExe } from '../docs/types/binary/exe/detect.js';
import { extractMetadata as exeMeta } from '../docs/types/binary/exe/metadata.js';
import { render as renderExe } from '../docs/types/binary/exe/renderer.js';
import { detect as detectExr } from '../docs/types/binary/exr/detect.js';
import { extractMetadata as exrMeta } from '../docs/types/binary/exr/metadata.js';
import { render as renderExr } from '../docs/types/binary/exr/renderer.js';
import { detect as detectF3d } from '../docs/types/binary/f3d/detect.js';
import { metadata as f3dMeta } from '../docs/types/binary/f3d/metadata.js';
import { detect as detectFbx } from '../docs/types/binary/fbx/detect.js';
import { extractMetadata as fbxMeta } from '../docs/types/binary/fbx/metadata.js';
import { render as renderFbx } from '../docs/types/binary/fbx/renderer.js';
import { detect as detectHdf5 } from '../docs/types/binary/hdf5/detect.js';
import { extractMetadata as hdf5Meta } from '../docs/types/binary/hdf5/metadata.js';
import { render as renderHdf5 } from '../docs/types/binary/hdf5/renderer.js';
import { detect as detectIpa } from '../docs/types/binary/ipa/detect.js';
import { metadata as ipaMeta } from '../docs/types/binary/ipa/metadata.js';
import { detect as detectIso } from '../docs/types/binary/iso/detect.js';
import { extractMetadata as isoMeta } from '../docs/types/binary/iso/metadata.js';
import { detect as detectKmz } from '../docs/types/binary/kmz/detect.js';
import { extractMetadata as kmzMeta } from '../docs/types/binary/kmz/metadata.js';
import { detect as detectLnk } from '../docs/types/binary/lnk/detect.js';
import { extractMetadata as lnkMeta } from '../docs/types/binary/lnk/metadata.js';
import { detect as detectLmms } from '../docs/types/binary/lmms/detect.js';
import { metadata as lmmsMeta } from '../docs/types/binary/lmms/metadata.js';
import { detect as detectMat } from '../docs/types/binary/mat/detect.js';
import { extractMetadata as matMeta } from '../docs/types/binary/mat/metadata.js';
import { detect as detectMbtiles } from '../docs/types/binary/mbtiles/detect.js';
import { extractMetadata as mbtilesMeta } from '../docs/types/binary/mbtiles/metadata.js';
import { detect as detectMcworld } from '../docs/types/binary/mcworld/detect.js';
import { extractMetadata as mcworldMeta } from '../docs/types/binary/mcworld/metadata.js';
import { detect as detectGameRom } from '../docs/types/binary/gamerom/detect.js';
import { parseRom } from '../docs/types/binary/gamerom/headers.js';
import { extractMetadata as gameRomMeta } from '../docs/types/binary/gamerom/metadata.js';
import { extract as dockerMeta } from '../docs/types/text/known/dockerfile/metadata.js';
import { extract as packageJsonMeta } from '../docs/types/text/json/known/package-json/metadata.js';
import { extract as tsconfigMeta } from '../docs/types/text/json/known/tsconfig/metadata.js';
import { extract as composerMeta } from '../docs/types/text/json/known/composer-json/metadata.js';
import { extract as cargoMeta } from '../docs/types/text/toml/known/cargo-toml/metadata.js';
import { extract as pomMeta } from '../docs/types/text/xml/known/pom-xml/metadata.js';
import { extract as goModMeta } from '../docs/types/text/known/go-mod/metadata.js';
import { extract as reqMeta } from '../docs/types/text/known/requirements-txt/metadata.js';
import { extract as codeownersMeta } from '../docs/types/text/known/codeowners/metadata.js';
import { extract as editorconfigMeta } from '../docs/types/text/known/editorconfig/metadata.js';
import { extractMetadata as envMeta } from '../docs/types/text/env/metadata.js';
import { testExports as composeMeta } from '../docs/types/text/yaml/known/docker-compose/metadata.js';
import { testExports as composeRender } from '../docs/types/text/yaml/known/docker-compose/render.js';
import { testExports as csvMeta } from '../docs/types/text/csv/metadata.js';
import { parseJsonLike } from '../docs/types/text/json/jsonparse.js';
import { extract as jsonMeta } from '../docs/types/text/json/metadata.js';

const ROOT = new URL('../docs/examples/', import.meta.url);

async function text(name) {
  return readFile(new URL(name, ROOT), 'utf8');
}

async function bytes(name) {
  return new Uint8Array(await readFile(new URL(name, ROOT)));
}

function value(rows, label) {
  const row = rows.find((r) => r.label === label);
  assert.ok(row, `missing metadata row: ${label}`);
  return row.value;
}

function peFixture() {
  const b = new Uint8Array(160);
  b[0] = 0x4d; b[1] = 0x5a;
  b[0x3c] = 0x40;
  b[0x40] = 0x50; b[0x41] = 0x45;
  b[0x44] = 0x64; b[0x45] = 0x86;
  b[0x46] = 0x03;
  b[0x54] = 0xf0;
  b[0x56] = 0x02;
  b[0x58] = 0x0b; b[0x59] = 0x02;
  b[0x9e] = 0x03;
  b[0xa0] = 0x40; b[0xa1] = 0x01;
  return b;
}

function machoFixture() {
  const b = new Uint8Array(32);
  b[0] = 0xcf; b[1] = 0xfa; b[2] = 0xed; b[3] = 0xfe;
  b[4] = 0x07; b[7] = 0x01;
  b[12] = 0x02;
  b[16] = 0x03;
  return b;
}

function putAsciiBytes(target, offset, text, len = text.length) {
  const raw = Buffer.from(text.padEnd(len, '\0').slice(0, len), 'ascii');
  target.set(raw, offset);
}

function numberValue(rows, label) {
  return Number(value(rows, label).replace(/,/g, ''));
}

function metadataField(record, label) {
  const row = record.fields.find((r) => r.label === label);
  assert.ok(row, `missing metadata field: ${label}`);
  return row.value;
}

function bspHeaderBytes(magic, version, entityText) {
  const entityBytes = new TextEncoder().encode(entityText);
  const out = new Uint8Array(16 + entityBytes.length);
  out.set(new TextEncoder().encode(magic), 0);
  const view = new DataView(out.buffer);
  view.setUint32(4, version, true);
  view.setUint32(8, 16, true);
  view.setUint32(12, entityBytes.length, true);
  out.set(entityBytes, 16);
  return out;
}

{
  const src = await text('example.js');
  const rows = codeMeta({ filename: 'example.js', text: src });
  assert.equal(value(rows, 'Language'), 'JavaScript');
  assert.equal(value(rows, 'Lines of code'), '14');
  assert.equal(value(rows, 'Functions'), '2');
  assert.equal(value(rows, 'Exports'), '1');
  assert.equal(value(rows, 'Avg function LOC'), '6');
  assert.equal(value(rows, 'Max function LOC'), '7');
  assert.equal(value(rows, 'Most complex function'), 'classify (7)');
  assert.equal(value(rows, 'Complex functions'), '0');
  assert.ok(Number(value(rows, 'Comment lines')) >= 3);
  assert.equal(rows.find((r) => r.label === 'Language')?.section, 'Code metrics');
  assert.equal(rows.find((r) => r.label === 'Exports')?.section, 'Code structure');
  assert.equal(rows.find((r) => r.label === 'Max indentation')?.section, 'Code shape');
  assert.equal(rows.find((r) => r.label === 'Blank lines')?.section, 'Text structure');
}

{
  assert.equal(value(codeMeta({ filename: 'main.py', text: 'def main():\n    pass\n' }), 'Language'), 'Python');
  assert.equal(value(codeMeta({ filename: 'main.c', text: 'int main(void) { return 0; }\n' }), 'Language'), 'C');
  assert.equal(value(codeMeta({ filename: 'mesh.cpp', text: 'int main() { return 0; }\n' }), 'Language'), 'C++');
  assert.equal(value(codeMeta({ filename: 'Dashboard.tsx', text: 'export const View = () => <div />;\n' }), 'Language'), 'TypeScript TSX');
}

{
  const src = await text('sample.env');
  const rows = envMeta({ filename: 'sample.env', text: src });
  assert.equal(value(rows, 'Total variables'), '20');
  assert.equal(value(rows, 'Sensitive variables'), '8');
}

{
  const strict = parseJsonLike('{"url":"https://example.test/a//b","list":["keep,]"]}');
  assert.equal(strict.mode, 'strict');
  assert.equal(strict.data.url, 'https://example.test/a//b');
  assert.equal(strict.data.list[0], 'keep,]');
  const jsonc = '{\n  // comment\n  "name": "jsonc",\n  "items": [1, 2,],\n}\n';
  const parsed = parseJsonLike(jsonc);
  assert.equal(parsed.mode, 'jsonc');
  assert.equal(parsed.data.items.length, 2);
  const rows = jsonMeta({ filename: 'edge.jsonc', text: jsonc });
  assert.equal(value(rows, 'Valid JSON'), 'yes');
  assert.equal(value(rows, 'Parse mode'), 'JSONC recovery');
}

{
  const data = await bytes('sample.ttf');
  const rows = fontMeta({ filename: 'sample.ttf', bytes: data, size: data.length });
  assert.equal(value(rows, 'Format'), 'TrueType');
  assert.ok(numberValue(rows, 'Tables') > 0);
  assert.ok(numberValue(rows, 'Glyphs') > 0);
}

{
  const data = await bytes('sample.stl');
  const rows = stlMeta({ filename: 'sample.stl', bytes: data, isBinary: true, size: data.length });
  assert.equal(value(rows, 'Format'), 'Binary STL');
  assert.equal(value(rows, 'Triangles'), '8');
  assert.ok(numberValue(rows, 'Vertices') > 0);
}

{
  const src = await text('sample.obj');
  const rows = objMeta({ filename: 'sample.obj', text: src });
  assert.equal(value(rows, 'Vertices'), '8');
  assert.equal(value(rows, 'Faces'), '6');
  assert.equal(value(rows, 'Triangles'), '12');
}

{
  const data = await bytes('sample.ply');
  const rows = plyMeta({ filename: 'sample.ply', bytes: data, isBinary: false, size: data.length });
  assert.equal(value(rows, 'Format'), 'ASCII PLY');
  assert.equal(value(rows, 'Vertices'), '8');
  assert.equal(value(rows, 'Faces'), '6');
}

{
  const data = await bytes('sample.glb');
  const rows = gltfMeta({ filename: 'sample.glb', bytes: data, isBinary: true, size: data.length });
  assert.equal(value(rows, 'Format'), 'GLB (binary glTF)');
  assert.equal(value(rows, 'Meshes'), '1');
  assert.equal(value(rows, 'Triangles'), '12');
}

{
  const positions = Buffer.alloc(36);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((n, i) => positions.writeFloatLE(n, i * 4));
  const doc = {
    asset: { version: '2.0' },
    buffers: [{ uri: 'data:application/octet-stream;base64,' + positions.toString('base64'), byteLength: positions.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.2, 0.1, 1] } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  const intake = { filename: 'colored.gltf', text: JSON.stringify(doc), bytes: new TextEncoder().encode(JSON.stringify(doc)), isBinary: false, size: 1 };
  const model = parseGLTF(intake);
  assert.deepEqual(model.tris[0].color, [0.8, 0.2, 0.1, 1]);
  const rows = gltfMeta(intake);
  assert.equal(value(rows, 'Base-color materials'), '1');
}

function glbHeader({ version = 2, length = 20, chunkLength = 0, chunkType = 0x4e4f534a, payload = [] } = {}) {
  const bytes = new Uint8Array(Math.max(length, 20));
  const dv = new DataView(bytes.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, version, true);
  dv.setUint32(8, length, true);
  dv.setUint32(12, chunkLength, true);
  dv.setUint32(16, chunkType, true);
  bytes.set(payload, 20);
  return bytes;
}

{
  assert.throws(
    () => parseGLTF({ filename: 'bad.glb', bytes: glbHeader({ length: 0 }), isBinary: true }),
    /Invalid GLB length/,
  );
  assert.throws(
    () => parseGLTF({ filename: 'bad.glb', bytes: glbHeader({ version: 1 }), isBinary: true }),
    /Unsupported GLB version 1/,
  );
  assert.throws(
    () => parseGLTF({ filename: 'bad.glb', bytes: glbHeader({ chunkType: 0x004e4942 }), isBinary: true }),
    /first chunk is not JSON/,
  );
  assert.throws(
    () => parseGLTF({ filename: 'bad.glb', bytes: glbHeader({ length: 20, chunkLength: 8 }), isBinary: true }),
    /extends past end/,
  );
  const rows = gltfMeta({ filename: 'bad.glb', bytes: glbHeader({ length: 0 }), isBinary: true, size: 20 });
  assert.equal(value(rows, 'glTF'), 'unreadable');
  assert.match(value(rows, 'Parse error'), /Invalid GLB length/);
}

{
  const rows = packageJsonMeta({ filename: 'package.json', text: await text('package.json') });
  assert.equal(value(rows, 'Package'), 'demo-package');
  assert.equal(value(rows, 'Dependencies'), '2');
  assert.equal(value(rows, 'Dev dependencies'), '2');
  assert.equal(value(rows, 'Scripts'), '3');
}

{
  const rows = tsconfigMeta({ filename: 'tsconfig.json', text: await text('tsconfig.json') });
  assert.equal(value(rows, 'Compiler options'), '9');
  assert.equal(value(rows, 'Strict mode'), 'yes');
  assert.equal(value(rows, 'Include patterns'), '1');
  assert.equal(value(rows, 'Exclude patterns'), '2');
}

{
  const rows = composerMeta({ filename: 'composer.json', text: await text('composer.json') });
  assert.equal(value(rows, 'Package'), 'acme/file-service');
  assert.equal(value(rows, 'Requirements'), '5');
  assert.equal(value(rows, 'Dev requirements'), '2');
  assert.equal(value(rows, 'Platform requirements'), '2');
}

{
  const rows = cargoMeta({ filename: 'Cargo.toml', text: await text('Cargo.toml') });
  assert.equal(value(rows, 'Package'), 'file-viewer-demo');
  assert.equal(value(rows, 'Edition'), '2021');
  assert.equal(value(rows, 'Dependencies'), '3');
  assert.equal(value(rows, 'Dev dependencies'), '1');
}

{
  const rows = pomMeta({ filename: 'pom.xml', text: await text('pom.xml') });
  assert.equal(value(rows, 'Group ID'), 'com.acme');
  assert.equal(value(rows, 'Artifact ID'), 'file-service');
  assert.equal(value(rows, 'Dependencies'), '3');
  assert.equal(value(rows, 'Dependency scopes'), '2');
}

{
  const rows = dockerMeta({ filename: 'Dockerfile', text: await text('Dockerfile') });
  assert.equal(value(rows, 'Build stages'), '2');
  assert.equal(value(rows, 'Healthcheck'), 'yes');
}

{
  const rows = goModMeta({ filename: 'go.mod', text: await text('go.mod') });
  assert.equal(value(rows, 'Go version'), '1.22');
  assert.equal(value(rows, 'Requirements'), '5');
  assert.equal(value(rows, 'Indirect requirements'), '2');
}

{
  const rows = composeMeta.summarize({
    services: {
      web: { build: '.', ports: ['8080:80'], depends_on: ['api'] },
      api: { image: 'node:20-alpine', environment: ['NODE_ENV=production'], volumes: ['./api:/app', 'data:/data'] },
      worker: { command: 'node worker.js' },
    },
    volumes: { data: {} },
    networks: { backend: {} },
    secrets: { api_key: {} },
  });
  assert.equal(value(rows, 'Services'), '3');
  assert.equal(value(rows, 'Images'), '1');
  assert.equal(value(rows, 'Build services'), '1');
  assert.equal(value(rows, 'Published ports'), '1');
  assert.equal(value(rows, 'Bind mounts'), '1');
  assert.equal(value(rows, 'Named volume mounts'), '1');
  assert.equal(value(rows, 'Local build contexts'), '1');
  assert.equal(value(rows, 'Top-level secrets'), '1');
  assert.equal(value(rows, 'Issue hints'), '3');
  assert.equal(composeMeta.classifyVolume('./api:/app', { data: {} }), 'bind');
  assert.equal(composeMeta.classifyVolume('data:/data', { data: {} }), 'named');
  assert.equal(composeMeta.classifyVolume('../cache:/cache', { data: {} }), 'bind');
  assert.equal(composeRender.imageLink('node:20-alpine'), 'https://hub.docker.com/_/node');
  assert.equal(composeRender.imageLink('ghcr.io/acme/api:latest'), '');
}

{
  const stats = csvMeta.rawCsvStats('a;b\r\n"c;d";e\r\n\r\n');
  assert.equal(stats.lineEndings, 'CRLF');
  assert.equal(stats.physicalLines, 3);
  assert.equal(stats.blankPhysicalLines, 1);
  assert.equal(stats.trailingNewline, true);
  assert.equal(stats.quotedFieldsLikely, true);
}

{
  const rows = reqMeta({ filename: 'requirements.txt', text: await text('requirements.txt') });
  assert.equal(value(rows, 'Packages'), '8');
  assert.equal(value(rows, 'Pinned'), '4');
  assert.equal(value(rows, 'Constrained'), '2');
  assert.equal(value(rows, 'Unpinned'), '2');
  assert.equal(value(rows, 'Extras'), '1');
  assert.equal(value(rows, 'Extras detail'), 'celery[redis]');
  assert.equal(value(rows, 'Index URLs'), '1');
  assert.equal(value(rows, 'Included files'), '1');
}

{
  const rows = reqMeta({
    filename: 'requirements.txt',
    text: [
      'pkg==1.0',
      'range>=1,<2',
      'extra[redis]==2.0; python_version < "3.12"',
      'plain',
      'direct @ https://example.test/direct.whl',
      '-r base.txt',
      '-c constraints.txt',
      '--index-url https://example.test/simple',
      '--extra-index-url https://mirror.example/simple',
      '--find-links ./wheels',
      '--no-index',
      '--hash=sha256:abc',
      '-e git+https://example.test/repo.git#egg=editable',
    ].join('\n'),
  });
  assert.equal(value(rows, 'Packages'), '5');
  assert.equal(value(rows, 'Pinned'), '2');
  assert.equal(value(rows, 'Constrained'), '1');
  assert.equal(value(rows, 'Unpinned'), '1');
  assert.equal(value(rows, 'Direct references'), '1');
  assert.equal(value(rows, 'Environment markers'), '1');
  assert.equal(value(rows, 'Index URLs'), '2');
  assert.equal(value(rows, 'Find links'), '1');
  assert.equal(value(rows, 'Editable installs'), '1');
  assert.equal(value(rows, 'Constraint files'), '1');
  assert.equal(value(rows, 'Hashes'), '1');
  assert.equal(value(rows, 'Options'), '1');
}

{
  const rows = codeownersMeta({ filename: 'CODEOWNERS', text: await text('CODEOWNERS') });
  assert.equal(value(rows, 'Rules'), '5');
  assert.ok(numberValue(rows, 'Owners') >= 3);
}

{
  const rows = editorconfigMeta({ filename: '.editorconfig', text: await text('.editorconfig') });
  assert.equal(value(rows, 'Root config'), 'yes');
  assert.equal(value(rows, 'Sections'), '10');
}

{
  const data = await bytes('sample.blend');
  const rows = blendMeta({ filename: 'sample.blend', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows['Blender version'], '4.2.0');
  assert.equal(rows['Pointer size'], '8 bytes');
  assert.equal(rows.Endianness, 'Little-endian');

  const truncated = new Uint8Array(12 + 24);
  truncated.set(new TextEncoder().encode('BLENDER-v420'), 0);
  truncated.set(new TextEncoder().encode('OB\0\0'), 12);
  new DataView(truncated.buffer).setUint32(16, 64, true);
  const rendered = renderBlend({ filename: 'bad.blend', bytes: truncated, isBinary: true, size: truncated.length }).bodyHtml;
  assert.doesNotMatch(rendered, /File blocks\s*1/, 'truncated Blender block body is not counted');
}

{
  const data = await bytes('sample.bsp');
  const rows = bspMeta({ filename: 'sample.bsp', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'BSP v29');
  assert.equal(rows.Game, 'Quake');
  assert.equal(rows['Map Name'], 'File Viewer Demo Map');

  const ibsp = bspHeaderBytes('IBSP', 46, '{"classname" "worldspawn" "message" "Arena"}');
  assert.ok(detectBsp({ filename: 'arena.bsp', bytes: ibsp }) > 0.9);
  assert.equal(bspMeta({ filename: 'arena.bsp', bytes: ibsp }).Format, 'IBSP v46');
  assert.match(renderBsp({ filename: 'arena.bsp', bytes: ibsp }).bodyHtml, /Quake III Arena/);

  const vbsp = bspHeaderBytes('VBSP', 20, '{"classname" "worldspawn" "message" "Source Map"}');
  assert.ok(detectBsp({ filename: 'source.bsp', bytes: vbsp }) > 0.9);
  assert.equal(bspMeta({ filename: 'source.bsp', bytes: vbsp }).Format, 'VBSP v20');
  assert.match(renderBsp({ filename: 'source.bsp', bytes: vbsp }).bodyHtml, /Counter-Strike: Source/);
}

{
  const data = await bytes('sample.cbor');
  const rows = cborMeta({ filename: 'sample.cbor', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'CBOR (RFC 8949)');
  assert.equal(rows['File Size'], '310 bytes');
  assert.equal(rows['Top-level Major Type'], 'Map');
  assert.ok(detectCbor({ filename: 'sample.cbor', bytes: data, isBinary: true }) > 0.9);

  const mapRendered = renderCbor({ filename: 'sample.cbor', bytes: data, isBinary: true }).bodyHtml;
  assert.match(mapRendered, /Map\{8 keys\}/);
  assert.match(mapRendered, /Alice Smith/);

  const indefiniteArray = new Uint8Array([0x9f, 0x01, 0x02, 0xff]);
  const arrayRendered = renderCbor({ filename: 'stream.cbor', bytes: indefiniteArray, isBinary: true }).bodyHtml;
  assert.match(arrayRendered, /array\[2\]/i);
  assert.match(arrayRendered, />1</);
  assert.match(arrayRendered, />2</);

  const tagged = new Uint8Array([0xc1, 0x63, 0x61, 0x62, 0x63]);
  const taggedRendered = renderCbor({ filename: 'tagged.cbor', bytes: tagged, isBinary: true }).bodyHtml;
  assert.match(taggedRendered, /"abc"/);
}

{
  const data = await bytes('sample.class');
  const rows = javaClassMeta({ filename: 'sample.class', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.label, 'Sample');
  assert.equal(metadataField(rows, 'Class name'), 'Sample');
  assert.equal(metadataField(rows, 'Java version'), 'Java 17');
  assert.equal(metadataField(rows, 'Major version'), '61');
  assert.equal(metadataField(rows, 'Constant pool entries'), '4');
  assert.ok(detectJavaClass({ filename: 'sample.class', bytes: data, isBinary: true }) > 0.9);

  const rendered = renderJavaClass({ filename: 'sample.class', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /CA FE BA BE/);
  assert.match(rendered, /Sample/);
  assert.match(rendered, /Java 17/);
  assert.match(rendered, /Constant pool/);

  const invalid = new Uint8Array([0, 1, 2, 3, 0, 0, 0, 61, 0, 1]);
  const invalidMeta = javaClassMeta({ filename: 'bad.class', bytes: invalid, isBinary: true, size: invalid.length });
  assert.equal(metadataField(invalidMeta, 'Error'), 'Missing CAFEBABE class-file signature');
  assert.match(renderJavaClass({ filename: 'bad.class', bytes: invalid, isBinary: true, size: invalid.length }).bodyHtml, /Missing CAFEBABE/);
}

{
  const data = await bytes('sample.dbf');
  const rows = dbfMeta({ filename: 'sample.dbf', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'dBase / DBF');
  assert.equal(rows.Version, 'dBASE III+');
  assert.equal(rows.Records, '3');
  assert.equal(rows.Fields, '4');
  assert.equal(rows['Last update'], '2024-06-19');
  assert.ok(detectDbf({ filename: 'sample.dbf', bytes: data, isBinary: true }) > 0.9);
  assert.ok(detectDbf({ filename: 'sample.bin', mimeType: 'application/dbf', bytes: data, isBinary: true }) >= 0.9);

  const rendered = renderDbf({ filename: 'sample.dbf', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /NAME/);
  assert.match(rendered, /ACTIVE/);
  assert.match(rendered, /Alice Johnson/);
  assert.doesNotMatch(rendered, /\0/, 'DBF preview strips NUL-padded character fields');
}

{
  const elf = await bytes('sample.elf');
  assert.equal(detectExe({ filename: 'sample.elf', mimeType: 'application/x-elf', bytes: elf, isBinary: true }), 0.99);
  assert.equal(detectExe({ filename: 'sample.bin', bytes: elf, isBinary: true }), 0.98);
  assert.ok(detectExe({ filename: 'empty.exe', bytes: new Uint8Array(0), isBinary: true }) > 0.5);

  const elfRows = (await exeMeta({ filename: 'sample.elf', bytes: elf, isBinary: true, size: elf.length })).fields;
  assert.equal(value(elfRows, 'Format'), 'ELF 64-bit');
  assert.equal(value(elfRows, 'Architecture'), 'x86-64');
  assert.equal(value(elfRows, 'Bit width'), '64-bit');

  const pe = peFixture();
  assert.equal(detectExe({ filename: 'demo.exe', mimeType: 'application/x-msdownload', bytes: pe, isBinary: true }), 0.99);
  const peRows = (await exeMeta({ filename: 'demo.exe', bytes: pe, isBinary: true, size: pe.length })).fields;
  assert.equal(value(peRows, 'Format'), 'PE32+ (EXE)');
  assert.equal(value(peRows, 'Architecture'), 'x86-64 (AMD64)');
  assert.equal(value(peRows, 'Bit width'), '64-bit');

  const macho = machoFixture();
  assert.equal(detectExe({ filename: 'demo.dylib', mimeType: 'application/x-mach-binary', bytes: macho, isBinary: true }), 0.99);
  const machoRows = (await exeMeta({ filename: 'demo.dylib', bytes: macho, isBinary: true, size: macho.length })).fields;
  assert.equal(value(machoRows, 'Format'), 'Mach-O 64-bit');
  assert.equal(value(machoRows, 'Architecture'), 'x86-64');
  assert.equal(value(machoRows, 'Bit width'), '64-bit');

  const rendered = renderExe({ filename: 'sample.elf', bytes: elf, isBinary: true, size: elf.length }).bodyHtml;
  assert.match(rendered, /ELF/);
  assert.match(rendered, /x86-64/);
  assert.match(rendered, /64-bit/);
}

{
  const data = await bytes('sample.deb');
  assert.equal(detectDeb({ filename: 'sample.deb', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectDeb({ filename: 'sample.udeb', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectDeb({ filename: 'sample.bin', mimeType: 'application/vnd.debian.binary-package', bytes: data, isBinary: true }), 0.98);
  assert.ok(detectDeb({ filename: 'libfoo.a', bytes: data.slice(0, 8), isBinary: true }) < 0.1);
  const rows = debMeta({ filename: 'sample.deb', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'Debian Package');
  assert.equal(rows['Format version'], '2.0');
  assert.equal(rows['Archive members'], '3');
  assert.equal(rows['Control archive'], 'present');
  assert.equal(rows['Data archive'], 'present');

  const rendered = renderDeb({ filename: 'sample.deb', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /debian-binary/);
  assert.match(rendered, /control\.tar/);
  assert.match(rendered, /data\.tar/);
}

{
  const data = await bytes('sample.dcm');
  assert.equal(detectDicom({ filename: 'sample.dcm', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectDicom({ filename: 'sample.bin', mimeType: 'application/dicom', bytes: data, isBinary: true }), 0.98);
  assert.ok(detectDicom({ filename: 'empty.dcm', bytes: new Uint8Array(0), isBinary: true }) > 0.5);
  const rows = dicomMeta({ filename: 'sample.dcm', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'DICOM');
  assert.equal(rows.Modality, 'CT - Computed Tomography');
  assert.equal(rows.Rows, '512');
  assert.equal(rows.Columns, '512');
  assert.equal(rows.Dimensions, '512 x 512');
  assert.equal(rows.Institution, 'File Viewer Demo Hospital');
  assert.equal(rows['Patient name present'], 'yes');

  const rendered = renderDicom({ filename: 'sample.dcm', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /Computed Tomography/);
  assert.match(rendered, /Demo Hospital/);
  assert.match(rendered, /Protected Health Information/);
}

{
  const data = await bytes('sample.dmp');
  assert.equal(detectDmp({ filename: 'sample.dmp', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectDmp({ filename: 'sample.bin', mimeType: 'application/x-dmp', bytes: data, isBinary: true }), 0.98);
  assert.ok(detectDmp({ filename: 'empty.mdmp', bytes: new Uint8Array(0), isBinary: true }) > 0.5);
  const rows = dmpMeta({ filename: 'sample.dmp', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'Windows Minidump');
  assert.equal(rows.Streams, '2');
  assert.equal(rows.Architecture, 'x64');
  assert.match(rows.OS, /Windows 11/);
  assert.equal(rows['Dump type'], 'MiniDumpNormal');

  const rendered = renderDmp({ filename: 'sample.dmp', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /MINIDUMP/);
  assert.match(rendered, /Windows 11/);
  assert.match(rendered, /x64|AMD64/);
}

{
  const data = await bytes('sample.dwg');
  assert.equal(detectDwg({ filename: 'sample.dwg', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectDwg({ filename: 'sample.bin', mimeType: 'image/vnd.dwg', bytes: data, isBinary: true }), 0.98);
  assert.ok(detectDwg({ filename: 'empty.dwg', bytes: new Uint8Array(0), isBinary: true }) > 0.9);
  const rows = dwgMeta({ filename: 'sample.dwg', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'AutoCAD DWG');
  assert.equal(rows.Version, 'AC1015');
  assert.equal(rows['Known version'], 'yes');
  assert.equal(rows['AutoCAD version'], 'AutoCAD 2000');

  const rendered = renderDwg({ filename: 'sample.dwg', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /DWG/);
  assert.match(rendered, /AutoCAD 2000/);
  assert.match(rendered, /AC1015/);
}

{
  const data = await bytes('sample.exr');
  assert.equal(detectExr({ filename: 'sample.exr', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectExr({ filename: 'sample.bin', mimeType: 'image/x-exr', bytes: data, isBinary: true }), 0.98);
  assert.ok(detectExr({ filename: 'empty.exr', bytes: new Uint8Array(0), isBinary: true }) > 0.5);
  const rows = exrMeta({ filename: 'sample.exr', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'OpenEXR (High Dynamic Range Image)');
  assert.equal(rows['File version'], '2');
  assert.equal(rows.Layout, 'Scanline');

  const rendered = renderExr({ filename: 'sample.exr', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /OpenEXR/);
  assert.match(rendered, /compression/);
  assert.match(rendered, /Display window/);
}

{
  const data = await bytes('sample.f3d');
  assert.equal(detectF3d({ filename: 'sample.f3d', bytes: data, isBinary: true }), 0.97);
  assert.equal(detectF3d({ filename: 'sample.f3z', bytes: data, isBinary: true }), 0.97);
  assert.ok(detectF3d({ filename: 'empty.f3d', bytes: new Uint8Array(0), isBinary: true }) > 0.5);
  const rows = f3dMeta({ filename: 'sample.f3d', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'Fusion 360 Design');
  assert.equal(rows['Archive format'], 'ZIP');
  assert.match(rows['File size'], /bytes/);
}

{
  const data = await bytes('sample.fbx');
  assert.equal(detectFbx({ filename: 'sample.fbx', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectFbx({ filename: 'sample.bin', bytes: data, isBinary: true }), 0.97);
  assert.ok(detectFbx({ filename: 'empty.fbx', bytes: new Uint8Array(0), isBinary: true }) > 0.9);
  assert.equal(detectFbx({ filename: 'ascii.fbx', bytes: new Uint8Array(0), textSample: '; FBX 7.4.0 project', isBinary: false }), 0.92);
  const rows = fbxMeta({ filename: 'sample.fbx', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'FBX (Filmbox 3D)');
  assert.equal(rows.Encoding, 'Binary');
  assert.match(rows['FBX version'], /7\.4 \(7400\)/);

  const rendered = renderFbx({ filename: 'sample.fbx', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /FBXHeaderExtension/);
  assert.match(rendered, /7\.4 \(7400\)/);
}

{
  const data = await bytes('sample.h5');
  assert.equal(detectHdf5({ filename: 'sample.h5', mimeType: 'application/x-hdf5', bytes: data, isBinary: true }), 0.98);
  assert.equal(detectHdf5({ filename: 'sample.bin', mimeType: 'application/x-hdf5', bytes: data, isBinary: true }), 0.97);
  assert.equal(detectHdf5({ filename: 'sample.nc', bytes: data, isBinary: true }), 0.95);
  assert.ok(detectHdf5({ filename: 'empty.h5', bytes: new Uint8Array(0), isBinary: true }) > 0.3);
  const rows = hdf5Meta({ filename: 'sample.h5', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'HDF5 (Hierarchical Data Format 5)');
  assert.equal(rows['Superblock Version'], '0');
  assert.equal(rows['Offset Size'], '8 bytes');
  assert.equal(rows['Length Size'], '8 bytes');

  const rendered = renderHdf5({ filename: 'sample.h5', bytes: data, isBinary: true, size: data.length }).bodyHtml;
  assert.match(rendered, /HDF5/);
  assert.match(rendered, /Superblock version/);
  assert.match(rendered, /Size of offsets/);
}

{
  const data = await bytes('sample.ipa');
  assert.equal(detectIpa({ filename: 'sample.ipa', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectIpa({ filename: 'empty.ipa', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectIpa({ filename: 'sample.zip', bytes: data, isBinary: true }), 0);
  const rows = ipaMeta({ filename: 'sample.ipa', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'iOS App Package (IPA)');
  assert.equal(rows['Info.plist'], 'present');
  assert.equal(rows['App name'], 'Demo App');
  assert.equal(rows['Bundle ID'], 'com.example.demoapp');
  assert.equal(rows['Minimum OS'], '15.0');
  assert.equal(rows.Platforms, 'iPhoneOS');
}

{
  const data = await bytes('sample.iso');
  assert.equal(detectIso({ filename: 'sample.iso', mimeType: 'application/x-iso9660-image', bytes: data, isBinary: true }), 0.98);
  assert.equal(detectIso({ filename: 'empty.iso', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectIso({ filename: 'sample.bin', mimeType: 'application/x-iso9660-image', bytes: new Uint8Array(0), isBinary: true }), 0.5);
  const rows = (await isoMeta({ filename: 'sample.iso', bytes: data, isBinary: true, size: data.length })).fields;
  assert.equal(value(rows, 'Format'), 'ISO 9660');
  assert.equal(value(rows, 'Volume ID'), 'FILEVIEWER_DEMO');
  assert.equal(value(rows, 'Publisher'), 'FILE VIEWER PROJECT');
  assert.equal(value(rows, 'Sector size'), '2,048 bytes');
  assert.equal(value(rows, 'Total sectors'), '18');
  assert.match(value(rows, 'Total size'), /36,864 bytes/);
}

{
  const data = await bytes('sample.kmz');
  assert.equal(detectKmz({ filename: 'sample.kmz', mimeType: 'application/vnd.google-earth.kmz', bytes: data, isBinary: true }), 0.97);
  assert.equal(detectKmz({ filename: 'sample.zip', mimeType: 'application/vnd.google-earth.kmz', bytes: data, isBinary: true }), 0.9);
  assert.equal(detectKmz({ filename: 'empty.kmz', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  const rows = kmzMeta({ filename: 'sample.kmz', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'KMZ (Compressed KML)');
  assert.equal(rows.Container, 'ZIP');
  assert.equal(rows.Files, '1');
  assert.equal(rows['KML files'], '1');
  assert.equal(rows['Primary KML'], 'doc.kml');
  assert.match(rows['Uncompressed size'], /1,170 bytes/);
}

{
  const data = await bytes('sample.lnk');
  assert.equal(detectLnk({ filename: 'sample.lnk', mimeType: 'application/x-ms-shortcut', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectLnk({ filename: 'empty.lnk', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectLnk({ filename: 'sample.bin', mimeType: 'application/x-ms-shortcut', bytes: new Uint8Array(0), isBinary: true }), 0.5);
  const rows = lnkMeta({ filename: 'sample.lnk', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.format, 'Windows Shortcut');
  assert.equal(rows.targetPath, 'C:\\Windows\\System32\\notepad.exe');
  assert.equal(rows.workingDir, 'C:\\Windows\\System32');
  assert.equal(rows.showCommand, 'Normal');
  assert.equal(rows.targetSize, 193536);
  assert.match(rows.created, /^2024-01-15T12:00:00/);
}

{
  const data = await bytes('sample.mmp');
  const textSample = await text('sample.mmp');
  assert.equal(detectLmms({ filename: 'sample.mmp', bytes: data, textSample, isBinary: false }), 0.99);
  assert.equal(detectLmms({ filename: 'empty.mmpz', bytes: new Uint8Array(0), isBinary: true }), 0.5);
  assert.ok(detectLmms({ filename: 'demo.xml', bytes: data, textSample, isBinary: false }) > 0.9);
  const rows = await lmmsMeta({ filename: 'sample.mmp', bytes: data, text: textSample, isBinary: false, size: data.length });
  assert.equal(rows.Format, 'LMMS Project');
  assert.equal(rows.BPM, '128');
  assert.equal(rows['Song name'], 'Demo Beat');
  assert.equal(rows['Time signature'], '4/4');
  assert.equal(rows['Master pitch'], '0');
  assert.equal(rows.Tracks, '4');
  assert.equal(rows['Instrument tracks'], '3');
  assert.equal(rows['Beat+bassline tracks'], '1');
  assert.equal(rows['LMMS version'], '1.2.2');
}

{
  const data = await bytes('sample.mat');
  assert.equal(detectMat({ filename: 'sample.mat', mimeType: 'application/x-matlab-data', bytes: data, isBinary: true }), 0.99);
  assert.equal(detectMat({ filename: 'empty.mat', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectMat({ filename: 'sample.bin', mimeType: 'application/x-matlab-data', bytes: data, isBinary: true }), 0.96);
  const rows = matMeta({ filename: 'sample.mat', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'MATLAB MAT-file v5');
  assert.equal(rows.Endianness, 'Little-endian');
  assert.equal(rows.Variables, '3');
  assert.match(rows['Variable names'], /pi_vals/);
  assert.match(rows['Variable names'], /counts/);
  assert.match(rows['Variable names'], /greeting/);
  assert.match(rows['Variable classes'], /double/);
  assert.match(rows.Dimensions, /pi_vals: 1x3/);
}

{
  const data = await bytes('sample.mbtiles');
  assert.equal(detectMbtiles({ filename: 'sample.mbtiles', mimeType: 'application/x-sqlite3', bytes: data, isBinary: true }), 0.97);
  assert.equal(detectMbtiles({ filename: 'empty.mbtiles', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectMbtiles({ filename: 'sample.bin', mimeType: 'application/x-sqlite3', bytes: data, isBinary: true }), 0.45);
  const rows = mbtilesMeta({ filename: 'sample.mbtiles', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'MBTiles');
  assert.equal(rows.Container, 'SQLite 3');
}

{
  const data = await bytes('sample.mcworld');
  assert.equal(detectMcworld({ filename: 'sample.mcworld', mimeType: 'application/x-mcworld', bytes: data, isBinary: true }), 0.97);
  assert.equal(detectMcworld({ filename: 'empty.mcworld', bytes: new Uint8Array(0), isBinary: true }), 0.6);
  assert.equal(detectMcworld({ filename: 'sample.zip', mimeType: 'application/x-mcworld', bytes: data, isBinary: true }), 0.9);
  const rows = mcworldMeta({ filename: 'sample.mcworld', bytes: data, isBinary: true, size: data.length });
  assert.equal(rows.Format, 'Minecraft Bedrock Package');
  assert.equal(rows.Container, 'ZIP');
  assert.equal(rows['Package type'], 'World');
  assert.equal(rows.Files, '8');
  assert.equal(rows['level.dat'], 'present');
  assert.equal(rows['levelname.txt'], 'present');
  assert.equal(rows.LevelDB, 'present');
}

{
  const nes = await bytes('sample.nes');
  assert.equal(detectGameRom({ filename: 'sample.nes', bytes: nes, isBinary: true }), 0.99);
  assert.ok(detectGameRom({ filename: 'empty.nes', bytes: new Uint8Array(0), isBinary: true }) > 0.9);
  const nesRom = parseRom(nes);
  assert.equal(nesRom.format, 'NES');
  assert.equal(nesRom.title, 'iNES ROM');
  assert.ok(nesRom.fields.some(([label, value]) => label === 'Mapper' && /NROM/.test(value)));

  const snes = new Uint8Array(0x8000);
  putAsciiBytes(snes, 0x7fc0, 'SNES DEMO', 21);
  snes[0x7fc0 + 0x15] = 0x20;
  snes[0x7fc0 + 0x17] = 10;
  snes[0x7fc0 + 0x18] = 5;
  snes[0x7fc0 + 0x19] = 1;
  assert.ok(detectGameRom({ filename: 'demo.sfc', bytes: snes, isBinary: true }) > 0.9);
  assert.equal(parseRom(snes).format, 'SNES');
  assert.equal(parseRom(snes).title, 'SNES DEMO');

  const gb = new Uint8Array(0x150);
  gb.set([0xce, 0xed, 0x66, 0x66], 0x104);
  putAsciiBytes(gb, 0x134, 'GB DEMO', 15);
  gb[0x143] = 0x80;
  gb[0x146] = 0x03;
  gb[0x147] = 0x13;
  gb[0x148] = 0x02;
  gb[0x149] = 0x03;
  gb[0x14a] = 0x01;
  assert.equal(detectGameRom({ filename: 'demo.gbc', bytes: gb, isBinary: true }), 0.99);
  assert.equal(parseRom(gb).format, 'Game Boy');

  const n64 = new Uint8Array(0x40);
  n64.set([0x80, 0x37, 0x12, 0x40], 0);
  n64.set([0x12, 0x34, 0x56, 0x78], 0x10);
  n64.set([0x9a, 0xbc, 0xde, 0xf0], 0x14);
  putAsciiBytes(n64, 0x20, 'N64 DEMO', 20);
  putAsciiBytes(n64, 0x3b, 'NABE', 4);
  assert.equal(detectGameRom({ filename: 'demo.z64', bytes: n64, isBinary: true }), 0.99);
  const n64Rows = (await gameRomMeta({ filename: 'demo.z64', bytes: n64, isBinary: true, size: n64.length })).fields;
  assert.equal(value(n64Rows, 'Format'), 'Nintendo 64');
  assert.equal(value(n64Rows, 'CRC2'), '9ABCDEF0');
}

console.log('metadata-owned: ok');
