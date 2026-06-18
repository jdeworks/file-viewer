import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTRY } from '../docs/core/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'docs/core/registry.js');
const outRegistry = path.join(root, 'docs/core/registry-runtime.generated.js');
const chunkPrefix = path.join(root, 'docs/core/registry-detect.generated.');
const maxChunkLines = 360;

function relFromCore(typeDir, file) {
  return path.relative(path.join(root, 'docs/core'), path.join(typeDir, file)).replaceAll(path.sep, '/');
}

async function registryEntries() {
  const source = await fs.readFile(registryPath, 'utf8');
  const imports = new Map();
  for (const m of source.matchAll(/^import\s+(\w+)\s+from\s+'([^']+)';$/gm)) imports.set(m[1], m[2]);
  const array = source.match(/export const REGISTRY = \[([\s\S]*?)\];/);
  if (!array) throw new Error('Could not find REGISTRY array');
  return array[1].split(',').map((s) => s.trim()).filter(Boolean).map((name) => {
    const importPath = imports.get(name);
    if (!importPath) throw new Error(`Missing import for ${name}`);
    const indexPath = path.resolve(path.dirname(registryPath), importPath);
    return { name, indexPath, typeDir: path.dirname(indexPath) };
  });
}

function cleanDetectSource(source) {
  return source
    .replace(/^import\s+[^;]+;\n?/gm, '')
    .replace(/^export\s+\{[^}]+\};\n?/gm, '')
    .replace(/^export\s+(const|let|class)\s+/gm, '$1 ')
    .replace(/export\s+function\s+detect\s*\(/, 'function detect(')
    .trim();
}

function detectorName(id) {
  return 'detect_' + id.replace(/[^a-zA-Z0-9_$]/g, '_');
}

function urlExpr(typeDir, file) {
  return `new URL('${relFromCore(typeDir, file)}', import.meta.url)`;
}

function jsValue(value, typeDir) {
  if (value instanceof URL) {
    return urlExpr(typeDir, path.basename(value.pathname));
  }
  if (Array.isArray(value)) return `[${value.map((v) => jsValue(v, typeDir)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}:${jsValue(v, typeDir)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hasFile(typeDir, file) {
  return fs.access(path.join(typeDir, file)).then(() => true, () => false);
}

async function descriptorLine(type, typeDir) {
  const detect = `DETECTORS[${JSON.stringify(type.id)}]`;
  const parts = [
    `id:${JSON.stringify(type.id)}`,
    `label:${JSON.stringify(type.label)}`,
    type.group ? `group:${JSON.stringify(type.group)}` : '',
    `detect:${detect}`,
    `capabilities:${jsValue(type.capabilities || {}, typeDir)}`,
    typeof type.syntaxLanguage === 'string' || type.syntaxLanguage === null ? `syntaxLanguage:${jsValue(type.syntaxLanguage ?? null, typeDir)}` : '',
    type.id === 'code' ? 'syntaxLanguage:(intake)=>languageFor(intake)' : '',
    type.displayLabel && typeof type.displayLabel !== 'function' ? `displayLabel:${jsValue(type.displayLabel, typeDir)}` : '',
    type.id === 'code' ? "displayLabel:(intake)=>languageLabelFor(intake)+' source code'" : '',
    type.preferredMode ? `preferredMode:${JSON.stringify(type.preferredMode)}` : '',
    type.loadRenderer ? `loadRenderer:()=>import('${relFromCore(typeDir, 'renderer.js')}')` : 'loadRenderer:null',
    type.loadMetadata ? `loadMetadata:()=>import('${relFromCore(typeDir, 'metadata.js')}')` : 'loadMetadata:null',
    type.loadExports && await hasFile(typeDir, 'exports.js') ? `loadExports:()=>import('${relFromCore(typeDir, 'exports.js')}')` : '',
    await hasFile(typeDir, 'jsondiff.js') ? `loadDiffRenderer:()=>import('${relFromCore(typeDir, 'jsondiff.js')}')` : '',
    await hasFile(typeDir, 'htmldiff.js') ? `loadDiffRenderer:()=>import('${relFromCore(typeDir, 'htmldiff.js')}')` : '',
    await hasFile(typeDir, 'xmldiff.js') ? `loadDiffRenderer:()=>import('${relFromCore(typeDir, 'xmldiff.js')}')` : '',
    `settingsUrl:${urlExpr(typeDir, 'settings.default.json')}`,
    type.settings ? `settings:${jsValue(type.settings, typeDir)}` : '',
    type.about ? `about:${jsValue(type.about, typeDir)}` : '',
  ].filter(Boolean);
  return `{${parts.join(',')}}`;
}

async function writeDetectorChunks(entries) {
  const chunks = [];
  let current = [];
  let currentLines = 20;
  for (const entry of entries) {
    const source = cleanDetectSource(await fs.readFile(path.join(entry.typeDir, 'detect.js'), 'utf8'));
    const lines = source.split('\n').length + 5;
    if (current.length && currentLines + lines > maxChunkLines) {
      chunks.push(current);
      current = [];
      currentLines = 20;
    }
    current.push({ ...entry, source });
    currentLines += lines;
  }
  if (current.length) chunks.push(current);

  const stale = await fs.readdir(path.join(root, 'docs/core'));
  await Promise.all(stale.filter((f) => /^registry-detect\.generated\.\d+\.js$/.test(f)).map((f) => fs.unlink(path.join(root, 'docs/core', f))));

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const needsCode = chunk.some((e) => e.source.includes('isCode('));
    const needsMedia = chunk.some((e) => e.source.includes('mediaInfo('));
    const needsRom = chunk.some((e) => e.source.includes('parseRom('));
    const imports = [
      needsCode ? "import { isCode } from '../types/text/code/langmap.js';" : '',
      needsMedia ? "import { mediaInfo } from '../types/media/medialib.js';" : '',
      needsRom ? "import { parseRom } from '../types/binary/gamerom/headers.js';" : '',
    ].filter(Boolean).join('\n');
    const blocks = chunk.map((e) => `const ${detectorName(e.type.id)}=(()=>{\n${e.source}\nreturn detect;\n})();`).join('\n\n');
    const names = chunk.map((e) => [e.type.id, detectorName(e.type.id)]);
    const text = `// Generated by scripts/gen-registry-runtime.mjs; do not edit.\n${imports}\nfunction hasExtension(intake,...exts){const name=(intake.filename||'').toLowerCase();return exts.some((e)=>name.endsWith('.'+e.toLowerCase().replace(/^\\./,'')));}\nfunction mimeMatches(intake,...needles){const m=(intake.mimeType||'').toLowerCase();return needles.some((n)=>m.includes(n));}\n\n${blocks}\n\nexport const DETECTORS={${names.map(([id, n]) => `${JSON.stringify(id)}:${n}`).join(',')}};\n`;
    await fs.writeFile(`${chunkPrefix}${i}.js`, text);
  }
  return chunks.length;
}

async function main() {
  const entries = await registryEntries();
  if (entries.length !== REGISTRY.length) throw new Error('Registry parse/import length mismatch');
  const typeRows = entries.map((entry, i) => ({ ...entry, type: REGISTRY[i] }));
  const chunkCount = await writeDetectorChunks(typeRows);
  const imports = [
    "import { languageFor, languageLabelFor } from '../types/text/code/langmap.js';",
    ...Array.from({ length: chunkCount }, (_, i) => `import { DETECTORS as D${i} } from './registry-detect.generated.${i}.js';`),
  ];
  const detectMap = `const DETECTORS=Object.assign({},${Array.from({ length: chunkCount }, (_, i) => `D${i}`).join(',')});`;
  const lines = [];
  for (const row of typeRows) lines.push(await descriptorLine(row.type, row.typeDir));
  const text = `// Generated by scripts/gen-registry-runtime.mjs; do not edit.\n${imports.join('\n')}\n${detectMap}\n\nexport const REGISTRY=[\n${lines.join(',\n')}\n];\nexport function getType(id){return REGISTRY.find((t)=>t.id===id)||null;}\nexport const FALLBACK_TYPE=getType('raw');\n`;
  await fs.writeFile(outRegistry, text);
  await import(pathToFileURL(outRegistry).href + '?v=' + Date.now());
  console.log(`registry-runtime.generated.js: ${REGISTRY.length} types, ${chunkCount} detector chunks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
