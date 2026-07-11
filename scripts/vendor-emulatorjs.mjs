#!/usr/bin/env node
// Install the exact EmulatorJS 4.2.3 subset used by File Viewer from its official release asset.
// Usage: node scripts/vendor-emulatorjs.mjs /path/to/4.2.3.7z
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = resolve(repo, 'docs/vendor/emulatorjs');
const archive = process.argv[2] && resolve(process.argv[2]);
if (!archive) throw new Error('usage: node scripts/vendor-emulatorjs.mjs /path/to/4.2.3.7z');

const upstream = {
  version: '4.2.3',
  tag: 'v4.2.3',
  commit: 'e150dc0491ae747028919fb82d6598954976ede6',
  releaseAsset: '4.2.3.7z',
  releaseAssetUrl: 'https://github.com/EmulatorJS/EmulatorJS/releases/download/v4.2.3/4.2.3.7z',
  releaseAssetSha256: '07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b',
};
const cores = {
  fceumm: { extensions: ['nes'], sourceCommit: 'd9d7e141274d07186b6a871ca2919b6f13cfb2f9', license: 'GPL-2.0' },
  gambatte: { extensions: ['gb', 'gbc'], sourceCommit: '811b1f7a56c16f8588caada36d7a3f9a56cb16d4', license: 'GPL-2.0' },
  genesis_plus_gx: { extensions: ['gen', 'smd'], sourceCommit: 'def3a7c0e413ef35a7d9d4430e5c9c9a5698b4fe', license: 'LicenseRef-Genesis-Plus-GX' },
  mgba: { extensions: ['gba'], sourceCommit: '57678d6180e7020798809703283e02d2bba18b63', license: 'MPL-2.0' },
  snes9x: { extensions: ['sfc', 'smc'], sourceCommit: '6ca2343e5f3b0acbea49ca958251e3a0af58a81d', license: 'LicenseRef-Snes9x' },
  stella2014: { extensions: ['a26'], sourceCommit: '1f578c36382bb5a86a0fe245973fa557f369738b', license: 'GPL-2.0' },
};

const members = [
  'LICENSE', 'README.md', 'data/loader.js', 'data/emulator.min.js', 'data/emulator.min.css',
  'data/compression/README.md', 'data/compression/extract7z.js', 'data/compression/extractzip.js',
  'data/compression/libunrar.js', 'data/compression/libunrar.wasm',
  'data/cores/README.md', 'data/cores/core-README.md', 'data/cores/cores.json',
  ...Object.keys(cores).flatMap((core) => [
    `data/cores/${core}-wasm.data`, `data/cores/${core}-legacy-wasm.data`,
    `data/cores/reports/${core}.json`,
  ]),
];

const licenses = [
  ['licenses/fceumm-GPL-2.0.txt', 'https://raw.githubusercontent.com/EmulatorJS/libretro-fceumm/d9d7e141274d07186b6a871ca2919b6f13cfb2f9/Copying', 'a6996dcf0c334281f734560926e079b2dbbd5b78e81c0ca00a413ec01e1cd2fb'],
  ['licenses/gambatte-GPL-2.0.txt', 'https://raw.githubusercontent.com/EmulatorJS/gambatte-libretro/811b1f7a56c16f8588caada36d7a3f9a56cb16d4/COPYING', 'ab15fd526bd8dd18a9e77ebc139656bf4d33e97fc7238cd11bf60e2b9b8666c6'],
  ['licenses/genesis-plus-gx-license.txt', 'https://raw.githubusercontent.com/EmulatorJS/Genesis-Plus-GX/def3a7c0e413ef35a7d9d4430e5c9c9a5698b4fe/LICENSE.txt', 'c38ff8ea57f501f63a8e4a9e22a67be12eb006345ce2059f0419b69d8f7734cd'],
  ['licenses/mgba-MPL-2.0.txt', 'https://raw.githubusercontent.com/EmulatorJS/mgba/57678d6180e7020798809703283e02d2bba18b63/LICENSE', 'fab3dd6bdab226f1c08630b1dd917e11fcb4ec5e1e020e2c16f83a0a13863e85'],
  ['licenses/snes9x-license.txt', 'https://raw.githubusercontent.com/EmulatorJS/snes9x/6ca2343e5f3b0acbea49ca958251e3a0af58a81d/LICENSE', '70efeee282d82a6e9d26aeed5466d08c632369858371dc6a4644c8dcedc2be78'],
  ['licenses/stella2014-GPL-2.0.txt', 'https://raw.githubusercontent.com/EmulatorJS/stella2014-libretro/1f578c36382bb5a86a0fe245973fa557f369738b/stella/license.txt', '310782e1abd43c4de6217c513e328bddf999d39302d67c6e05b10a59959827af'],
  ['licenses/libunrar-license.txt', 'https://raw.githubusercontent.com/tnikolai2/libunrar-js/294e362691041b70bef818628e7dfb012b2474aa/license.txt', '6ecc1687808b7d66b24f874755abfed7464d9751ed0001cd4e8e5d9bf397ff8a'],
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(await readFile(archive)), upstream.releaseAssetSha256, 'release archive hash mismatch');

const stage = await mkdtemp(resolve(tmpdir(), 'file-viewer-emulatorjs-stage-'));
const backup = `${target}.backup-${process.pid}`;
let replaced = false;
try {
  const extraction = spawnSync('bsdtar', ['-xf', archive, '-C', stage, ...members], { encoding: 'utf8' });
  if (extraction.status !== 0) throw new Error(`bsdtar failed: ${extraction.stderr || extraction.stdout}`);
  await mkdir(resolve(stage, 'licenses'), { recursive: true });
  for (const [path, url, expectedHash] of licenses) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`license download failed ${response.status}: ${url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(sha256(bytes), expectedHash, `license hash mismatch: ${path}`);
    await writeFile(resolve(stage, path), bytes);
  }
  await copyFile(resolve(target, 'SOURCES.md'), resolve(stage, 'SOURCES.md'));

  const paths = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else paths.push(relative(stage, path).replaceAll('\\', '/'));
    }
  }
  await walk(stage);
  const files = {};
  for (const path of paths.sort()) {
    const bytes = await readFile(resolve(stage, path));
    files[path] = { sha256: sha256(bytes), size: (await stat(resolve(stage, path))).size };
  }
  const lock = {
    schemaVersion: 1,
    upstream,
    policies: { threads: false, automaticLanguage: false, biosOrFirmwareIncluded: false },
    cores,
    files,
  };
  await writeFile(resolve(stage, 'LOCK.json'), `${JSON.stringify(lock, null, 2)}\n`);

  await rename(target, backup);
  await rename(stage, target);
  replaced = true;
  const verify = spawnSync(process.execPath, [resolve(repo, 'scripts/verify-emulatorjs-vendor.mjs')], { encoding: 'utf8' });
  if (verify.status !== 0) throw new Error(`installed tree failed verification: ${verify.stderr || verify.stdout}`);
  await rm(backup, { recursive: true, force: true });
  console.log(verify.stdout.trim());
} catch (error) {
  if (replaced) {
    await rm(target, { recursive: true, force: true });
    await rename(backup, target);
  }
  await rm(stage, { recursive: true, force: true });
  throw error;
}
