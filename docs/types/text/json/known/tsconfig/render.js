// Enhanced tsconfig.json view: a readable table of compilerOptions with a short description of
// each known flag, plus the files/include/exclude and extends. Parent-pane (generated DOM).
import { parseJsonLike } from '../../jsonparse.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Short descriptions for the common compiler options (not exhaustive — unknown flags still show).
const DOCS = {
  target: 'JS language version to emit', module: 'Module system for emitted code',
  lib: 'Built-in API typings to include', moduleResolution: 'How module specifiers are resolved',
  strict: 'Enable all strict type-checking options', noImplicitAny: 'Error on implicit any types',
  strictNullChecks: 'null/undefined are not assignable unless declared', esModuleInterop: 'Interop helpers for CommonJS default imports',
  allowJs: 'Compile .js files too', checkJs: 'Type-check .js files', jsx: 'How to emit JSX',
  declaration: 'Emit .d.ts declaration files', sourceMap: 'Emit .map source maps',
  outDir: 'Output directory for emitted files', rootDir: 'Root of input files', baseUrl: 'Base directory for non-relative imports',
  paths: 'Module path aliasing', types: 'Which @types packages to include', skipLibCheck: 'Skip type-checking of .d.ts files',
  resolveJsonModule: 'Allow importing .json files', noEmit: 'Type-check only, emit nothing',
  isolatedModules: 'Ensure each file can be transpiled alone', forceConsistentCasingInFileNames: 'Enforce consistent path casing',
  incremental: 'Save .tsbuildinfo for faster rebuilds', composite: 'Enable project references',
  experimentalDecorators: 'Enable legacy decorators', emitDecoratorMetadata: 'Emit type metadata for decorators',
};

function fmtVal(v) {
  if (Array.isArray(v)) return v.map((x) => '<code>' + esc(x) + '</code>').join(' ');
  if (v && typeof v === 'object') return '<code>' + esc(JSON.stringify(v)) + '</code>';
  return '<code class="ts-' + (typeof v) + '">' + esc(String(v)) + '</code>';
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  let cfg;
  try { cfg = parseJsonLike(intake.text || '{}', '{}').data; }
  catch (e) { host.innerHTML = '<p class="pj-err">Invalid JSON: ' + esc(e.message) + '</p>'; return { parentNode: host }; }

  const opts = cfg.compilerOptions && typeof cfg.compilerOptions === 'object' ? cfg.compilerOptions : {};
  const rows = Object.keys(opts).map((k) =>
    '<tr><td class="ts-key">' + esc(k) + '</td><td class="ts-val">' + fmtVal(opts[k]) + '</td>'
    + '<td class="ts-doc">' + (DOCS[k] ? esc(DOCS[k]) : '') + '</td></tr>').join('');

  const extendsLink = cfg.extends ? '<p class="pj-meta">extends <code>' + esc(cfg.extends) + '</code></p>' : '';
  const lists = ['files', 'include', 'exclude', 'references']
    .filter((k) => Array.isArray(cfg[k]) && cfg[k].length)
    .map((k) => '<section class="pj-sec"><h3>' + esc(k) + ' <span class="pj-count">' + cfg[k].length + '</span></h3><ul class="ts-list">'
      + cfg[k].map((x) => '<li><code>' + esc(typeof x === 'object' ? JSON.stringify(x) : x) + '</code></li>').join('') + '</ul></section>').join('');

  host.innerHTML = '<header class="pj-head"><h2>TypeScript config</h2>'
    + '<p class="pj-meta">' + Object.keys(opts).length + ' compiler option' + (Object.keys(opts).length === 1 ? '' : 's')
    + ' · <a class="pj-link" href="https://www.typescriptlang.org/tsconfig" target="_blank" rel="noopener noreferrer">reference ↗</a></p>'
    + extendsLink + '</header>'
    + (rows ? '<table class="ts-table"><thead><tr><th>Option</th><th>Value</th><th>What it does</th></tr></thead><tbody>' + rows + '</tbody></table>' : '')
    + lists;
  return { parentNode: host };
}
