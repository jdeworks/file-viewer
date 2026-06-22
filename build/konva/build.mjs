#!/usr/bin/env node
// Vendor the Konva UMD bundle into docs/vendor/konva/konva.min.js.
//
//   cd build/konva && npm install && node build.mjs
//
// Konva ships a self-contained UMD build (sets window.Konva), so we copy it
// verbatim — no esbuild needed — and the page loads it lazily via
// loadGlobal(vendor('konva/konva.min.js'), 'Konva'). Same-origin, no CDN.
// Re-run after bumping the konva version in package.json, then commit the
// regenerated docs/vendor/konva/konva.min.js.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const src = resolve(here, 'node_modules/konva/konva.min.js');
const version = JSON.parse(readFileSync(resolve(here, 'node_modules/konva/package.json'), 'utf8')).version;
const outDir = resolve(repoRoot, 'docs/vendor/konva');
const out = resolve(outDir, 'konva.min.js');

mkdirSync(outDir, { recursive: true });
const banner = `/* VENDORED — DO NOT EDIT BY HAND. Konva ${version} (MIT). */\n`;
writeFileSync(out, banner + readFileSync(src, 'utf8'));
console.log(`docs/vendor/konva/konva.min.js  <-  konva@${version}`);
