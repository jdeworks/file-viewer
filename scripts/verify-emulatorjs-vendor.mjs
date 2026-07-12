#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(process.argv[2] || resolve(repo, 'docs/vendor/emulatorjs'));

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else out.push(relative(root, path).replaceAll('\\', '/'));
  }
  return out;
}

const lock = JSON.parse(await readFile(resolve(root, 'LOCK.json'), 'utf8'));
assert.equal(lock.schemaVersion, 1);
assert.equal(lock.upstream.version, '4.2.3');
assert.equal(lock.upstream.tag, 'v4.2.3');
assert.equal(lock.upstream.commit, 'e150dc0491ae747028919fb82d6598954976ede6');
assert.equal(lock.upstream.releaseAssetSha256, '07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b');

const actual = (await walk(root)).filter((path) => path !== 'LOCK.json').sort();
const expected = Object.keys(lock.files).sort();
assert.deepEqual(actual, expected, 'EmulatorJS vendor tree contains missing or extra files');

for (const path of expected) {
  const bytes = await readFile(resolve(root, path));
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, lock.files[path].sha256, `hash mismatch: ${path}`);
  assert.equal((await stat(resolve(root, path))).size, lock.files[path].size, `size mismatch: ${path}`);
  assert.ok(!/(^|\/)(bios|firmware)(\/|$)/i.test(path), `BIOS/firmware must not be vendored: ${path}`);
  assert.ok(!path.startsWith('data/localization/'), `translations are intentionally excluded: ${path}`);
}

const coreIds = ['fceumm', 'gambatte', 'genesis_plus_gx', 'mgba', 'snes9x', 'stella2014'];
assert.deepEqual(Object.keys(lock.cores).sort(), coreIds);
for (const core of coreIds) {
  for (const path of [
    `data/cores/${core}-wasm.data`,
    `data/cores/${core}-legacy-wasm.data`,
    `data/cores/reports/${core}.json`,
  ]) assert.ok(lock.files[path], `${core} dependency missing from lock: ${path}`);
}
for (const path of [
  'data/loader.js', 'data/emulator.min.js', 'data/emulator.min.css',
  'data/compression/extract7z.js', 'data/compression/extractzip.js',
  'data/compression/libunrar.js', 'data/compression/libunrar.wasm',
]) assert.ok(lock.files[path], `runtime dependency missing from lock: ${path}`);

console.log(`EmulatorJS vendor verified: ${expected.length} files, ${coreIds.length} complete cores`);
