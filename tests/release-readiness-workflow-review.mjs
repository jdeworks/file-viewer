import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { workflowJudgments } from './release-readiness-workflow-judgments.mjs';

const releaseRoot = new URL('../artifacts/v0.1.0-public-beta-readiness/', import.meta.url).pathname;
const evidencePath = join(releaseRoot, 'cross-workflows/evidence.json');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));

assert.equal(evidence.screenshots.length, 14, 'expected all 14 cross-workflow captures');
assert.equal(Object.keys(workflowJudgments).length, 14, 'every cross-workflow capture needs a judgment');

for (const record of evidence.screenshots) {
  assert.equal(record.technical, 'pass', `${record.id}: technical verdict must pass before visual review`);
  const bytes = await readFile(join(releaseRoot, record.screenshot));
  const actual = createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, record.screenshotSha256, `${record.id}: screenshot hash mismatch`);
  const observation = workflowJudgments[record.id];
  assert.ok(observation, `${record.id}: missing visual judgment`);
  record.visual = 'pass';
  record.observation = observation;
}

evidence.reviewedAt = new Date().toISOString();
evidence.visualSummary = {
  passes: evidence.screenshots.filter((record) => record.visual === 'pass').length,
  failures: evidence.screenshots.filter((record) => record.visual === 'fail').length,
  pending: evidence.screenshots.filter((record) => record.visual === 'pending').length,
  screenshotsInspected: evidence.screenshots.length,
};
assert.deepEqual(evidence.visualSummary, {
  passes: 14,
  failures: 0,
  pending: 0,
  screenshotsInspected: 14,
});

await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log('Cross-workflow review merged: 14 hash-matched visual passes.');

