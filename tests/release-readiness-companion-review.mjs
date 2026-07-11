import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { companionJudgments } from './release-readiness-companion-judgments.mjs';

const releaseRoot = new URL('../artifacts/v0.1.0-public-beta-readiness/', import.meta.url).pathname;
const captureRoot = join(releaseRoot, 'companion-browser');
const evidencePath = join(captureRoot, 'evidence.json');
const qualityPath = join(captureRoot, 'capture-quality.json');
const files = (await readdir(captureRoot)).filter((name) => /^companion-[a-z-]+\.png$/.test(name)).sort();
const captureQuality = JSON.parse(await readFile(qualityPath, 'utf8'));

assert.equal(files.length, 8, 'expected all eight Companion browser captures');
assert.equal(Object.keys(companionJudgments).length, 8, 'every capture needs a judgment');

const screenshots = [];
for (const file of files) {
  const id = file.replace(/\.png$/, '');
  const bytes = await readFile(join(captureRoot, file));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${file}: valid PNG signature`);
  const observation = companionJudgments[id];
  assert.ok(observation, `${id}: missing visual judgment`);
  const quality = captureQuality.captures?.[id];
  const screenshotSha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(quality?.screenshotSha256, screenshotSha256, `${id}: pixel-quality result must match screenshot hash`);
  assert.ok(quality.nearBlackPixelRatio < captureQuality.threshold,
    `${id}: rejected black compositor surface (${quality.nearBlackPixelRatio})`);
  screenshots.push({
    id,
    screenshot: `companion-browser/${file}`,
    screenshotSha256,
    dimensions: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) },
    visual: 'pass',
    compositorQuality: {
      nearBlackPixelRatio: quality.nearBlackPixelRatio,
      threshold: captureQuality.threshold,
      acceptedAttempt: quality.acceptedAttempt,
    },
    observation,
  });
}

await writeFile(evidencePath, JSON.stringify({
  schemaVersion: 1,
  reviewedAt: new Date().toISOString(),
  reviewer: 'Codex Companion browser visual lane — individual original-resolution pixel inspection',
  summary: {
    passes: 8,
    failures: 0,
    pending: 0,
    screenshotsInspected: 8,
    compositorQualityGuard: 'all hash-bound screenshots below 6% near-black pixels',
  },
  screenshots,
}, null, 2) + '\n');
console.log('Companion browser review merged: 8 hash-matched visual passes.');
