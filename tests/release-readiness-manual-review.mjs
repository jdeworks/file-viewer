import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FORMAT_ARTIFACT_ROOT, REPO_ROOT, sha256File } from './release-readiness-format-helpers.mjs';
import { judgments } from './release-readiness-manual-judgments.mjs';

const evidencePath = join(FORMAT_ARTIFACT_ROOT, 'format-visual-evidence.json');
const reviewPath = join(FORMAT_ARTIFACT_ROOT, 'format-manual-review.json');

const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
assert.equal(evidence.rows.length, 45, 'expected the complete 45-row format corpus');
assert.equal(Object.keys(judgments).length, 45, 'every format row needs an explicit human judgment');

for (const row of evidence.rows) {
  for (const shot of Object.values(row.screenshots)) {
    const path = join(REPO_ROOT, shot.path);
    assert.equal(await sha256File(path), shot.sha256,
      `${row.slug}: screenshot bytes no longer match the evidence index: ${shot.path}`);
  }
}

const reviewedAt = new Date().toISOString();
const rows = evidence.rows.map((row) => {
  const judgment = judgments[row.slug];
  assert(judgment, `missing judgment for ${row.slug}`);
  const screenshotKeys = Object.keys(row.screenshots);
  const perShot = { ...(judgment.perShot || {}) };
  assert.deepEqual(Object.keys(perShot).sort(), screenshotKeys.sort(),
    `${row.slug}: every screenshot needs an individual observation`);
  return {
    slug: row.slug,
    screenshotSha256: Object.fromEntries(
      Object.entries(row.screenshots).map(([name, shot]) => [name, shot.sha256]),
    ),
    verdict: judgment.verdict,
    observations: Object.entries(perShot).map(
      ([shot, observation]) => `${shot}: ${observation}`,
    ),
    defects: [...(judgment.defects || [])],
    reviewer: 'Codex format visual lane — individual original-resolution pixel inspection',
    reviewedAt,
  };
});

const summary = {
  rows: rows.length,
  passes: rows.filter((row) => row.verdict === 'pass').length,
  failures: rows.filter((row) => row.verdict === 'fail').length,
  screenshotsInspected: rows.reduce(
    (count, row) => count + Object.keys(row.screenshotSha256).length,
    0,
  ),
};
assert.deepEqual(summary, {
  rows: 45,
  passes: 45,
  failures: 0,
  screenshotsInspected: 106,
});

await writeFile(
  reviewPath,
  JSON.stringify({ schemaVersion: 1, generatedAt: reviewedAt, summary, rows }, null, 2) + '\n',
);
console.log(
  `Wrote ${reviewPath}: ${summary.screenshotsInspected} screenshots, `
  + `${summary.passes} pass, ${summary.failures} fail.`,
);

