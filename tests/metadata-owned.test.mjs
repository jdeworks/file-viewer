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

function numberValue(rows, label) {
  return Number(value(rows, label).replace(/,/g, ''));
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
  assert.equal(rows.find((r) => r.label === 'Blank lines')?.section, undefined);
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

console.log('metadata-owned: ok');
