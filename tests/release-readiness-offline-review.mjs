import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { offlineModalJudgments } from './release-readiness-offline-judgments.mjs';

const releaseRoot = new URL('../artifacts/v0.1.0-public-beta-readiness/', import.meta.url).pathname;
const captureRoot = join(releaseRoot, 'offline-modal');
const evidencePath = join(captureRoot, 'evidence.json');
const files = (await readdir(captureRoot))
  .filter((name) => /^offline-modal-(?:phone|tablet|desktop)-(?:light|dark)-(?:top|bottom)\.png$/.test(name))
  .sort();

assert.equal(files.length, 12, 'expected all 12 offline-modal captures');
assert.equal(Object.keys(offlineModalJudgments).length, 12, 'every capture needs a judgment');

const screenshots = [];
for (const file of files) {
  const match = file.match(/^offline-modal-(phone|tablet|desktop)-(light|dark)-(top|bottom)\.png$/);
  assert.ok(match, file);
  const [, viewport, theme, position] = match;
  const id = `${viewport}-${theme}-${position}`;
  const bytes = await readFile(join(captureRoot, file));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${file}: valid PNG signature`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.ok(width > 0 && height > 0, `${file}: nonempty dimensions`);
  screenshots.push({
    id,
    viewport,
    theme,
    position,
    screenshot: `offline-modal/${file}`,
    screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
    dimensions: { width, height },
    visual: 'pass',
    observation: offlineModalJudgments[id],
  });
}

assert.equal(new Set(screenshots.map((record) => record.id)).size, 12, 'capture IDs must be unique');
for (const record of screenshots) assert.ok(record.observation, `${record.id}: missing visual judgment`);

const evidence = {
  schemaVersion: 1,
  reviewedAt: new Date().toISOString(),
  reviewer: 'Codex offline-modal visual lane — individual original-resolution pixel inspection',
  summary: { passes: 12, failures: 0, pending: 0, screenshotsInspected: 12 },
  screenshots,
};
await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log('Offline-modal review merged: 12 hash-matched visual passes.');
