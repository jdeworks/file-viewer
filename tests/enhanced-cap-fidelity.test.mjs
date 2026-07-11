import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeCollectionCap } from '../docs/core/collection-cap.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPE_ROOT = path.join(ROOT, 'docs/types/text');

// Frozen at baseline 503d6243. Stable identity is path + assigned variable + numeric cap; line
// numbers are deliberately excluded. A changed denominator must be reviewed and classified here.
const LEDGER = [
  ['known/brewfile/renderer.js', 'displayTaps', 8, 'repair'],
  ['known/brewfile/renderer.js', 'displayFormulas', 30, 'truthful'],
  ['known/brewfile/renderer.js', 'displayCasks', 20, 'truthful'],
  ['known/brewfile/renderer.js', 'displayMas', 10, 'repair'],
  ['known/brewfile/renderer.js', 'displayVscode', 10, 'repair'],
  ['known/claude-md/renderer.js', 'firstContent', 6, 'repair'],
  ['known/editorconfig/renderer.js', 'globSections', 10, 'repair'],
  ['known/isabelle-thy/renderer.js', 'sortedMethods', 8, 'repair'],
  ['known/mailmap/renderer.js', 'entries', 30, 'repair'],
  ['known/nftables-rules/renderer.js', 'samples', 3, 'truthful'],
  ['known/org-mode/renderer.js', 'outlineHeadings', 30, 'truthful'],
  ['known/podfile/renderer.js', 'shown', 20, 'truthful'],
  ['known/podfile-lock/renderer.js', 'shownPods', 25, 'truthful'],
  ['known/podfile-lock/renderer.js', 'shownDeps', 15, 'truthful'],
  ['known/polybar-conf/renderer.js', 'colorEntries', 8, 'repair'],
  ['known/proguard-rules/renderer.js', 'keepSlice', 50, 'truthful'],
  ['known/steam-acf/renderer.js', 'shown', 5, 'truthful'],
  ['json/known/app-json/renderer.js', 'buildpacks', 8, 'repair'],
  ['json/known/app-json/renderer.js', 'addons', 10, 'repair'],
  ['json/known/commitlint/renderer.js', 'shownRules', 20, 'truthful'],
  ['json/known/eslint/renderer.js', 'shownRules', 20, 'truthful'],
  ['json/known/rush/renderer.js', 'displayProjects', 15, 'truthful'],
  ['json/known/stylelint/renderer.js', 'shownRules', 20, 'truthful'],
  ['json/known/turbo/renderer.js', 'taskNames', 10, 'truthful'],
  ['yaml/known/citation-cff/renderer.js', 'shownAuthors', 3, 'truthful'],
  ['yaml/known/clang-tidy/renderer.js', 'categories', 10, 'repair'],
  ['yaml/known/dashy-config/renderer.js', 'shownSections', 10, 'truthful'],
  ['yaml/known/filebeat/renderer.js', 'displayPaths', 4, 'truthful'],
  ['yaml/known/hadolint/renderer.js', 'ignored', 15, 'repair'],
  ['yaml/known/hadolint/renderer.js', 'trustedRegistries', 8, 'repair'],
  ['yaml/known/heartbeat/renderer.js', 'displayTargets', 4, 'truthful'],
  ['yaml/known/hydra-config/renderer.js', 'configEntries', 30, 'repair'],
  ['yaml/known/moon/renderer.js', 'taskEntries', 15, 'truthful'],
  ['yaml/known/moonrepo/renderer.js', 'projectGlobs', 8, 'repair'],
  ['yaml/known/pubspec/renderer.js', 'shown20', 20, 'truthful'],
  ['yaml/known/pubspec/renderer.js', 'shown10dev', 10, 'truthful'],
  ['yaml/known/pubspec/renderer.js', 'shown10assets', 10, 'truthful'],
  ['yaml/known/scrutiny-config/renderer.js', 'urls', 6, 'truthful'],
  ['yaml/known/semaphore-ci/renderer.js', 'blocks', 8, 'repair'],
  ['yaml/known/semaphore-ci/renderer.js', 'jobs', 3, 'truthful'],
  ['yaml/known/yamllint/renderer.js', 'displayRules', 15, 'truthful'],
  ['toml/known/pyproject/renderer.js', 'ruffKeys', 6, 'repair'],
  ['toml/known/pyproject/renderer.js', 'blackKeys', 4, 'repair'],
  ['toml/known/pyproject/renderer.js', 'isortKeys', 4, 'repair'],
  ['xml/known/log4j2/renderer.js', 'pattern', 60, 'character'],
  ['xml/known/logback/renderer.js', 'pattern', 60, 'character'],
  ['xml/known/nuspec/renderer.js', 'shownDeps', 8, 'truthful'],
];

const SUPPLEMENTAL = [
  ['json/known/tauri-conf/renderer.js', 'tauri-permissions', /permissions[\s\S]*?slice\(0,\s*8\)/],
  ['json/known/tauri-conf/renderer.js', 'tauri-windows', /windows\s*\.\s*slice\(0,\s*5\)/],
  ['known/claude-md/renderer.js', 'claude-headers', /headers\.slice\(0,\s*12\)/],
  ['known/org-mode/renderer.js', 'org-links', /links\.slice\(0,\s*30\)/],
  ['yaml/known/clang-tidy/renderer.js', 'clang-check-options', /checkOpts\s*\.\s*slice\(0,\s*10\)/],
  ['yaml/known/moonrepo/renderer.js', 'moonrepo-object-projects', /Object\.entries\(projects\)\.slice\(0,\s*8\)/],
  ['yaml/known/pubspec/renderer.js', 'pubspec-fonts', /fonts\s*\.\s*slice\(0,\s*10\)/],
  ['yaml/known/semaphore-ci/renderer.js', 'semaphore-global-secrets', /globalSecrets\.slice\(0,\s*6\)/],
  ['toml/known/pyproject/renderer.js', 'pyproject-authors', /authors[\s\S]*?slice\(0,\s*3\)/],
  ['toml/known/pyproject/renderer.js', 'pyproject-maintainers', /maintainers[\s\S]*?slice\(0,\s*2\)/],
  ['toml/known/pyproject/renderer.js', 'pyproject-pytest-markers', /pytest\.markers\.slice\(0,\s*3\)/],
];

function rendererFiles(root) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...rendererFiles(target));
    else if (entry.name === 'renderer.js' || entry.name === 'render.js') found.push(target);
  }
  return found;
}

function scanCandidates() {
  const roots = ['known', 'json/known', 'yaml/known', 'toml/known', 'xml/known'];
  const assignment = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=.*?\.slice\(0\s*,\s*([0-9]+)\)/;
  const found = [];
  for (const root of roots) {
    for (const file of rendererFiles(path.join(TYPE_ROOT, root))) {
      const source = fs.readFileSync(file, 'utf8');
      const relativeFile = path.relative(TYPE_ROOT, file).replaceAll(path.sep, '/');
      for (const line of source.split(/\r?\n/)) {
        const match = line.match(assignment);
        if (!match) continue;
        // The original scan reviewed and excluded two syntactic false positives before freezing:
        // both assignments produce a shortened string, not a displayed collection.
        if ((relativeFile === 'json/known/avro-schema/renderer.js' && match[1] === 'symbols')
          || (relativeFile === 'yaml/known/prometheus-rules/renderer.js' && match[1] === 'summary')) continue;
        const escapedName = match[1].replace(/[$]/g, '\\$&');
        // The original heuristic intentionally accepts a source-property total such as
        // `notify.urls.length` for local `urls`; those rows are truthful collection caps.
        const lengthUse = new RegExp(`\\b${escapedName}\\.length\\b`);
        if (!lengthUse.test(source)) continue;
        found.push([
          relativeFile,
          match[1],
          Number(match[2]),
        ]);
      }
    }
  }
  return found;
}

const key = ([file, variable, cap]) => `${file}:${variable}:${cap}`;
const expected = LEDGER.map(key).sort();
const actual = scanCandidates().map(key).sort();
assert.equal(LEDGER.length, 47, 'frozen ledger denominator');
assert.deepEqual(actual, expected, 'cap scanner additions/removals require explicit classification');
assert.deepEqual(
  Object.fromEntries(['repair', 'truthful', 'character'].map((kind) => [kind, LEDGER.filter((row) => row[3] === kind).length])),
  { repair: 19, truthful: 26, character: 2 },
  'reviewed classifications stay complete',
);

for (const [file, name, marker] of SUPPLEMENTAL) {
  const source = fs.readFileSync(path.join(TYPE_ROOT, file), 'utf8');
  assert.match(source, marker, `supplemental cap remains auditable: ${name}`);
}

for (const limit of [2, 3, 4, 5, 6, 8, 10, 12, 15, 30]) {
  for (const total of [limit - 1, limit, limit + 1]) {
    const source = Array.from({ length: total });
    const shown = source.slice(0, limit);
    const result = describeCollectionCap(source, shown);
    assert.equal(result.total, total, `source total at ${limit}/${total}`);
    assert.equal(result.shown, Math.min(limit, total), `shown count at ${limit}/${total}`);
    assert.equal(result.omitted, Math.max(0, total - limit), `omitted count at ${limit}/${total}`);
    assert.equal(result.label, `Showing ${Math.min(limit, total)} of ${total}`);
    assert.equal(result.remainder, total > limit ? '+1 more' : '');
    assert.equal(Object.isFrozen(result), true);
  }
}

console.log('enhanced cap fidelity ledger: 47 candidates + supplemental caps verified');
