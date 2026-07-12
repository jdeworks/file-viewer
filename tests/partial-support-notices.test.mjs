import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { partialSupportHtml } from '../docs/core/partial-support.js';
import { render as renderBlend } from '../docs/types/binary/blend/renderer.js';
import { render as renderDicom } from '../docs/types/binary/dicom/renderer.js';
import { render as renderDwg } from '../docs/types/binary/dwg/renderer.js';
import { render as renderExr } from '../docs/types/binary/exr/renderer.js';
import { render as renderFbx } from '../docs/types/binary/fbx/renderer.js';
import { render as renderNetcdf } from '../docs/types/binary/netcdf/renderer.js';
import { render as renderNifti } from '../docs/types/binary/nifti/renderer.js';
import { render as renderFits } from '../docs/types/text/fits/renderer.js';
import { render as renderPostscript } from '../docs/types/text/postscript/renderer.js';

const examples = new URL('../docs/examples/', import.meta.url);
const partialFiles = [
  'sample.blend', 'sample.dcm', 'sample.dwg', 'sample.exr', 'sample.fbx', 'sample.fits',
  'sample.nc', 'sample.nii', 'sample.pages', 'sample.rtf', 'sample.sketch', 'sample.eps',
];

const escaped = partialSupportHtml('<img src=x onerror=alert(1)>');
assert.match(escaped, /data-partial-support/);
assert.doesNotMatch(escaped, /<img/);
assert.match(escaped, /&lt;img/);

const renderers = [
  ['sample.blend', renderBlend, true],
  ['sample.dcm', renderDicom, true],
  ['sample.dwg', renderDwg, true],
  ['sample.exr', renderExr, true],
  ['sample.fbx', renderFbx, true],
  ['sample.fits', renderFits, true],
  ['sample.nc', renderNetcdf, true],
  ['sample.nii', renderNifti, true],
  ['sample.eps', renderPostscript, false],
];

for (const [filename, render, forceBinary] of renderers) {
  const bytes = new Uint8Array(await readFile(new URL(filename, examples)));
  const text = forceBinary ? null : new TextDecoder().decode(bytes);
  const intake = { filename, bytes, text, isBinary: forceBinary, size: bytes.length };
  const valid = await render(intake);
  assert.match(valid.bodyHtml, /data-partial-support/, `${filename} normal preview must disclose partial support`);

  const invalidBytes = Uint8Array.of(0, 1, 2, 3);
  const invalid = await render({
    filename,
    bytes: invalidBytes,
    text: forceBinary ? null : 'not valid source',
    isBinary: forceBinary,
    size: invalidBytes.length,
  });
  assert.match(invalid.bodyHtml, /data-partial-support/, `${filename} error preview must retain the disclosure`);
}

const netcdfBytes = new Uint8Array(await readFile(new URL('sample.nc', examples)));
const netcdfHtml = renderNetcdf({
  filename: 'sample.nc', bytes: netcdfBytes, text: null, isBinary: true, size: netcdfBytes.length,
}).bodyHtml;
assert.match(netcdfHtml, /metadata, dimensions/i);
assert.match(netcdfHtml, /Variable payload values are omitted/i);
assert.match(netcdfHtml, /not decoded or plotted/i);

const summary = JSON.parse(await readFile(new URL('summary.json', examples), 'utf8'));
const byFile = new Map(summary.map((entry) => [entry.file, entry]));
for (const filename of partialFiles) {
  assert.equal(byFile.get(filename)?.partial, true, `${filename} must be partial in the generated catalog`);
}

console.log('partial support: catalog claims and HTML normal/error disclosures verified');
