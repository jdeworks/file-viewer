import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { extract as codeMeta } from '../docs/types/text/code/metadata.js';
import { extract as fontMeta } from '../docs/types/font/metadata.js';
import { extract as stlMeta } from '../docs/types/3d/stl/metadata.js';
import { extract as objMeta } from '../docs/types/3d/obj/metadata.js';
import { extract as plyMeta } from '../docs/types/3d/ply/metadata.js';
import { extract as gltfMeta } from '../docs/types/3d/gltf/metadata.js';
import { extract as dockerMeta } from '../docs/types/text/known/dockerfile/metadata.js';
import { extract as goModMeta } from '../docs/types/text/known/go-mod/metadata.js';
import { extract as reqMeta } from '../docs/types/text/known/requirements-txt/metadata.js';
import { extract as codeownersMeta } from '../docs/types/text/known/codeowners/metadata.js';
import { extract as editorconfigMeta } from '../docs/types/text/known/editorconfig/metadata.js';
import { extractMetadata as envMeta } from '../docs/types/text/env/metadata.js';
import { testExports as composeMeta } from '../docs/types/text/yaml/known/docker-compose/metadata.js';
import { testExports as composeRender } from '../docs/types/text/yaml/known/docker-compose/render.js';
import { testExports as csvMeta } from '../docs/types/text/csv/metadata.js';

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
}

{
  const src = await text('sample.env');
  const rows = envMeta({ filename: 'sample.env', text: src });
  assert.equal(value(rows, 'Total variables'), '20');
  assert.equal(value(rows, 'Sensitive variables'), '8');
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
