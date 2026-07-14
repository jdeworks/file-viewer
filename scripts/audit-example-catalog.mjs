#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { intakeFromBytes } from '../docs/core/intake.js';
import { REGISTRY } from '../docs/core/registry.js';
import { KNOWN } from '../docs/known/registry.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = resolve(ROOT, 'docs/examples');
const INDEX = resolve(EXAMPLES, 'index.json');
const FIX = process.argv.includes('--fix');

function rankingFor(intake, enableEmulators = false) {
  const ranking = REGISTRY.map((type) => {
    let score = 0;
    try { score = Math.max(0, Math.min(1, type.detect(intake) || 0)); } catch { /* fail closed */ }
    return { type, score };
  }).sort((a, b) => b.score - a.score);
  if (enableEmulators) {
    const emulator = ranking.find((row) => row.type.id === 'emulatorjs' && row.score > 0);
    if (emulator) return [emulator, ...ranking.filter((row) => row !== emulator)];
  }
  if (!ranking[0]?.score) {
    const raw = ranking.find((row) => row.type.id === 'raw');
    if (raw) return [raw, ...ranking.filter((row) => row !== raw)];
  }
  return ranking;
}

function firstKnown(intake, ranking) {
  const type = ranking[0]?.type;
  if (!type) return null;
  for (const known of KNOWN) {
    try { if (known.match(intake, type)) return known; } catch { /* fail closed */ }
  }
  return null;
}

const examples = JSON.parse(await readFile(INDEX, 'utf8'));
const seen = new Set();
const errors = [];
let normalized = 0;
let enhanced = 0;
let sourced = 0;

for (const example of examples) {
  if (!example.file || seen.has(example.file)) {
    errors.push(`${example.file || '<missing file>'}: catalog filename is missing or duplicated`);
    continue;
  }
  seen.add(example.file);
  const path = resolve(EXAMPLES, example.file);
  try { await access(path); } catch { errors.push(`${example.file}: indexed file is missing`); continue; }

  const provenanceFields = ['source', 'license', 'attribution'].filter((key) => !!example[key]);
  if (provenanceFields.length && provenanceFields.length !== 3) {
    errors.push(`${example.file}: external/derived provenance requires source, license, and attribution`);
  }
  if (provenanceFields.length === 3) sourced += 1;

  const bytes = new Uint8Array(await readFile(path));
  const intake = intakeFromBytes(bytes, example.file, example.mime || '');
  const ranking = rankingFor(intake, example.type === 'emulatorjs');
  const detectedType = ranking[0]?.type?.id || 'raw';
  if (example.type && example.type !== detectedType) {
    errors.push(`${example.file}: declared type ${example.type}, detector selected ${detectedType}`);
  }

  if (example.enhanced || example.knownFile) {
    const actual = firstKnown(intake, ranking)?.id || null;
    if (FIX) {
      if (actual) {
        if (example.knownFile !== actual || example.enhanced !== true) normalized += 1;
        example.knownFile = actual;
        example.enhanced = true;
      } else {
        if (example.knownFile != null || example.enhanced != null) normalized += 1;
        delete example.knownFile;
        delete example.enhanced;
      }
    } else if (!actual) {
      errors.push(`${example.file}: marked enhanced but no enhanced view is selected`);
    } else if (example.knownFile !== actual) {
      errors.push(`${example.file}: catalog says ${String(example.knownFile)}, viewer selects ${actual}`);
    }
    if (actual) enhanced += 1;
  }
}

if (FIX && normalized) await writeFile(INDEX, JSON.stringify(examples, null, 2) + '\n', 'utf8');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`example catalog audit: ${examples.length} files, ${enhanced} enhanced, ${sourced} sourced/derived, ${normalized} normalized`);
}
