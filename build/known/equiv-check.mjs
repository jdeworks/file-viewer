// Equivalence gate: prove the bundled known-registry returns the SAME plugin in the SAME order
// as the modular source, over real example files run through the real detection pipeline.
//
//   node build/known/equiv-check.mjs            (all example files)
//   node build/known/equiv-check.mjs --sample 30 (a families-spanning sample)
//
// For each file: build a faithful intake via the app's own intakeFromBytes(), compute the
// base-type ranking via pickType(), then compare matchKnown(intake, type) AND
// matchAllKnown(intake, ranking) from OLD docs/known/registry.js vs NEW registry.generated.js.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const examplesDir = resolve(repoRoot, 'docs/examples');

const { intakeFromBytes } = await import(resolve(repoRoot, 'docs/core/intake.js'));
const { pickType } = await import(resolve(repoRoot, 'docs/core/detect.js'));
const oldR = await import(resolve(repoRoot, 'docs/known/registry.js'));
const newR = await import(resolve(repoRoot, 'docs/known/registry.generated.js'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile()) out.push(p);
  }
  return out;
}

let files = walk(examplesDir);
const sampleIdx = process.argv.indexOf('--sample');
if (sampleIdx !== -1) {
  const n = Number(process.argv[sampleIdx + 1] || 30);
  // Spread across the alphabet so we span many families, not just A-prefixed names.
  files.sort();
  const step = Math.max(1, Math.floor(files.length / n));
  files = files.filter((_, i) => i % step === 0).slice(0, n);
}

let checked = 0, mismatchSingle = 0, mismatchAll = 0, matched = 0;
const mismatches = [];

for (const path of files) {
  let bytes;
  try { bytes = new Uint8Array(readFileSync(path)); } catch { continue; }
  // 8 MB cap mirrors the app's full-read ceiling; bigger example files are rare/irrelevant here.
  if (bytes.length > 8 * 1024 * 1024) continue;
  const filename = path.split('/').pop();
  let intake;
  try { intake = intakeFromBytes(bytes, filename); } catch { continue; }
  let ranking;
  try { ranking = pickType(intake).ranking; } catch { continue; }
  const baseType = ranking[0]?.type;

  const oldSingle = oldR.matchKnown(intake, baseType);
  const newSingle = newR.matchKnown(intake, baseType);
  const oldAll = oldR.matchAllKnown(intake, ranking).map((r) => r.known.id);
  const newAll = newR.matchAllKnown(intake, ranking).map((r) => r.known.id);

  checked++;
  const singleEq = (oldSingle?.id ?? null) === (newSingle?.id ?? null);
  const allEq = JSON.stringify(oldAll) === JSON.stringify(newAll);
  if (oldSingle) matched++;
  if (!singleEq) { mismatchSingle++; mismatches.push({ path: filename, kind: 'single', old: oldSingle?.id, new: newSingle?.id }); }
  if (!allEq) { mismatchAll++; mismatches.push({ path: filename, kind: 'all', old: oldAll, new: newAll }); }
}

console.log(`Files checked:        ${checked}`);
console.log(`Files with a match:   ${matched}`);
console.log(`matchKnown mismatches:    ${mismatchSingle}`);
console.log(`matchAllKnown mismatches: ${mismatchAll}`);
if (mismatches.length) {
  console.log('\nMISMATCHES:');
  for (const m of mismatches.slice(0, 50)) console.log(' ', JSON.stringify(m));
  process.exit(1);
}
console.log('\nEQUIVALENT: old registry.js and new registry.generated.js agree on every file.');
