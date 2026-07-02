import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../docs/core/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplesPath = path.join(root, 'docs/examples/index.json');
const outPath = path.join(root, 'docs/examples/summary.json');

const ENHANCED_FILES = new Set([
  'package.json', 'tsconfig.json', 'Dockerfile', 'docker-compose.yml', 'Cargo.toml',
  'requirements.txt', 'go.mod', 'composer.json', 'Gemfile', 'CODEOWNERS',
  '.editorconfig', 'pom.xml', 'build.gradle', 'Pipfile', 'openapi.yaml',
  'sample.gitignore',
]);
const PARTIAL_FILES = new Set(['sample.djvu', 'sample.lrf']);

function categoriesFor(ex) {
  const raw = ex.categories || ex.groups || ex.category || 'Other';
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.filter(Boolean))];
}

function isBinaryExample(ex) {
  return !!ex.binary || /^(application\/(dicom|octet-stream|pdf|zip|x-7z-compressed|x-dmp|wasm|vnd|x-msdownload)|audio\/|font\/|image\/|model\/|video\/)/i.test(ex.mime || '');
}

function isEnhancedExample(ex) {
  return !!ex.enhanced || ENHANCED_FILES.has((ex.file || '').split('/').pop());
}

function isPartialExample(ex) {
  return !!ex.partial || PARTIAL_FILES.has((ex.file || '').split('/').pop());
}

function detectTypeForExample(ex) {
  const fname = (ex.file || '').split('/').pop();
  const intake = {
    filename: fname,
    mimeType: ex.mime || '',
    bytes: new Uint8Array(0),
    isBinary: false,
    text: '',
    textSample: '',
    isPaste: false,
    size: 0,
    lastModified: 0,
  };
  let best = null;
  let bestConf = 0;
  for (const type of REGISTRY) {
    try {
      const conf = type.detect(intake);
      if (conf > bestConf) {
        bestConf = conf;
        best = type;
      }
    } catch {
      // Example summary is best-effort; real file open still runs authoritative detection.
    }
  }
  return bestConf > 0.25 ? best : null;
}

const examples = JSON.parse(await readFile(examplesPath, 'utf8'));
const summary = examples.map((ex) => {
  const type = ex.type ? REGISTRY.find((entry) => entry.id === ex.type) || detectTypeForExample(ex) : detectTypeForExample(ex);
  const out = {
    label: ex.label || ex.file,
    file: ex.file,
    mime: ex.mime || '',
    categories: categoriesFor(ex),
    type: type?.id || '',
    typeLabel: type?.label || '',
    editable: !!type?.capabilities?.rawView,
    binary: isBinaryExample(ex),
    enhanced: isEnhancedExample(ex),
    partial: isPartialExample(ex),
  };
  if (ex.source && ex.license) out.sourced = true;
  if (Array.isArray(ex.tools) && ex.tools.length) out.tools = ex.tools;
  return out;
});

await writeFile(outPath, JSON.stringify(summary, null, 0) + '\n');
console.log(`examples/summary.json: ${summary.length} files`);
