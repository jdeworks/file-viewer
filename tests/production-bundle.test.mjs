import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const graph = JSON.parse(await readFile(new URL('../build/app/app-graph.generated.json', import.meta.url), 'utf8'));
const runtimeSource = await readFile(new URL('../docs/core/registry-runtime.generated.js', import.meta.url), 'utf8');
const companionSource = await readFile(new URL('../docs/core/companion-ui.js', import.meta.url), 'utf8');
const coreFiles = await readdir(new URL('../docs/core/', import.meta.url));

assert.equal(graph.schemaVersion, 1, 'production graph schema');
assert.equal(graph.entry, 'docs/core/app.js', 'production entry');
assert.equal(graph.output, 'docs/core/app.generated.js', 'production output');
assert.equal(graph.format, 'esm', 'production format');
assert.equal(graph.target, 'es2022', 'production target');
assert.equal(graph.minified, true, 'production output is minified');
assert.ok(graph.inlinedModules >= 25, `startup bundle should consolidate its static graph (got ${graph.inlinedModules})`);

// These ceilings deliberately leave headroom above the measured July 2026 graph while still
// catching an accidental eager import of Monaco, Companion, repository, editor, or compare code.
assert.ok(graph.bytes <= 180_000, `startup bundle exceeds 180 KB: ${graph.bytes}`);
assert.ok(graph.gzipBytes <= 60_000, `startup bundle exceeds 60 KB gzip: ${graph.gzipBytes}`);
assert.ok(graph.brotliBytes <= 55_000, `startup bundle exceeds 55 KB brotli: ${graph.brotliBytes}`);

const lazy = new Set(graph.dynamicImports);
for (const specifier of [
  './companion-ui.js',
  './companion-settings.js',
  './git.js',
  './repoview.js',
  './folder-search-index.js',
  './folder-export.js',
  './repack.js',
  './rawpane-markdown.js',
  './rawpane-editors.js',
  './rawpane-forms.js',
  './rawpane-toolbars.js',
  './sidebyside.js',
]) {
  assert.ok(lazy.has(specifier), `${specifier} must remain behind a lazy boundary`);
}
assert.match(companionSource, /import\(['"]\.\/companion-folder\.js['"]\)/, 'Companion folder integration remains nested behind the Companion boundary');

assert.match(runtimeSource, /from ['"]\.\/registry-detect\.generated\.js['"]/, 'runtime imports one consolidated detector bundle');
assert.doesNotMatch(runtimeSource, /registry-detect\.generated\.\d+\.js/, 'runtime does not import numbered detector chunks');
assert.deepEqual(
  coreFiles.filter((name) => /^registry-detect\.generated(?:\.\d+)?\.js$/.test(name)),
  ['registry-detect.generated.js'],
  'only one generated detector bundle is emitted',
);

console.log(`production bundle: ok (${graph.bytes} bytes, ${graph.gzipBytes} gzip, ${graph.dynamicImports.length} lazy imports)`);
