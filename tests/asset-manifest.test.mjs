import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { contentVersion } from '../scripts/gen-asset-manifest.mjs';

const dir = await mkdtemp(join(tmpdir(), 'file-viewer-asset-manifest-'));
const fullPath = join(dir, 'fixture.bin');

try {
  async function versionFor(contents) {
    await writeFile(fullPath, contents);
    const { size } = await stat(fullPath);
    return contentVersion([{ path: 'fixture.bin', fullPath, size }]);
  }

  const first = await versionFor(Buffer.from([0x00, 0x01, 0x02, 0x03]));
  const second = await versionFor(Buffer.from([0x00, 0x01, 0xff, 0x03]));

  assert.notEqual(second, first, 'same-size asset byte changes must change the content version');
  console.log('asset manifest version changes when same-size asset bytes change');
} finally {
  await rm(dir, { recursive: true, force: true });
}
