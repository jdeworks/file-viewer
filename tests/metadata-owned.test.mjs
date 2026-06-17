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
  assert.equal(value(rows, 'Language'), 'javascript');
  assert.equal(value(rows, 'Functions'), '2');
  assert.equal(value(rows, 'Exports'), '1');
  assert.ok(Number(value(rows, 'Comment lines')) >= 3);
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
  const rows = reqMeta({ filename: 'requirements.txt', text: await text('requirements.txt') });
  assert.equal(value(rows, 'Packages'), '8');
  assert.equal(value(rows, 'Included files'), '1');
}

{
  const rows = codeownersMeta({ filename: 'CODEOWNERS', text: await text('CODEOWNERS') });
  assert.equal(value(rows, 'Rules'), '5');
  assert.ok(numberValue(rows, 'Owners') >= 3);
}

{
  const rows = editorconfigMeta({ filename: '.editorconfig', text: await text('.editorconfig') });
  assert.equal(value(rows, 'Root config'), 'yes');
  assert.equal(value(rows, 'Sections'), '3');
}

console.log('metadata-owned: ok');
