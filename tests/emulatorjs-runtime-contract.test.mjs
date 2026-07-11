import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXT_CORE } from '../docs/types/emulator/emulatorjs/detect.js';
import { EMULATORJS_RELEASE, getCoreForFile } from '../docs/types/emulator/emulatorjs/renderer.js';

const lock = JSON.parse(await readFile(new URL('../docs/vendor/emulatorjs/LOCK.json', import.meta.url), 'utf8'));
const source = await readFile(new URL('../docs/types/emulator/emulatorjs/renderer.js', import.meta.url), 'utf8');

assert.equal(EMULATORJS_RELEASE, lock.upstream.version);
assert.deepEqual(EXT_CORE, {
  '.nes': 'fceumm',
  '.sfc': 'snes9x', '.smc': 'snes9x',
  '.gb': 'gambatte', '.gbc': 'gambatte',
  '.gba': 'mgba',
  '.gen': 'genesis_plus_gx', '.smd': 'genesis_plus_gx',
  '.a26': 'stella2014',
});
for (const [extension, core] of Object.entries(EXT_CORE)) {
  assert.equal(getCoreForFile(`demo${extension}`), core, `${extension} renderer mapping`);
  assert.ok(lock.cores[core].extensions.includes(extension.slice(1)), `${extension} is declared in locked core metadata`);
  for (const path of [
    `data/cores/${core}-wasm.data`,
    `data/cores/${core}-legacy-wasm.data`,
    `data/cores/reports/${core}.json`,
  ]) assert.ok(lock.files[path], `${extension} dependency is locked: ${path}`);
}
assert.match(source, /EJS_threads\s*=\s*false/);
assert.match(source, /EJS_forceLegacyCores\s*=\s*false/);
assert.match(source, /EJS_disableAutoLang\s*=\s*false/);
assert.doesNotMatch(source, /EJS_language\s*=/, 'renderer must not request a localization file');
assert.match(source, /resolved\.origin !== location\.origin/);
assert.match(source, /Missing local EmulatorJS/);
assert.match(source, /installWakeLockGuard/);
assert.match(source, /callEvent\?\.\('exit'\)/);
assert.match(source, /gamepad\?\.terminate/);
assert.match(source, /URL\.revokeObjectURL/);

console.log('EmulatorJS runtime contract tests passed');
