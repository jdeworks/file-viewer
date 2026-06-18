import assert from 'node:assert/strict';
import { REGISTRY as FULL } from '../docs/core/registry.js';
import { REGISTRY as RUNTIME, FALLBACK_TYPE, getType } from '../docs/core/registry-runtime.generated.js';

const fullIds = FULL.map((t) => t.id);
const runtimeIds = RUNTIME.map((t) => t.id);
assert.deepEqual(runtimeIds, fullIds, 'runtime registry order must match source registry');
assert.equal(FALLBACK_TYPE?.id, 'raw', 'runtime fallback is raw');

for (let i = 0; i < FULL.length; i++) {
  const full = FULL[i];
  const runtime = RUNTIME[i];
  assert.equal(getType(full.id), runtime, `getType(${full.id}) returns runtime descriptor`);
  for (const key of ['id', 'label', 'group', 'preferredMode']) {
    assert.deepEqual(runtime[key], full[key], `${full.id}.${key}`);
  }
  assert.deepEqual(runtime.capabilities, full.capabilities, `${full.id}.capabilities`);
  assert.deepEqual(runtime.settings || {}, full.settings || {}, `${full.id}.settings`);
  assert.equal(typeof runtime.detect, 'function', `${full.id}.detect`);
  assert.equal(!!runtime.loadRenderer, !!full.loadRenderer, `${full.id}.loadRenderer presence`);
  assert.equal(!!runtime.loadMetadata, !!full.loadMetadata, `${full.id}.loadMetadata presence`);
  assert.equal(!!runtime.loadExports, !!full.loadExports, `${full.id}.loadExports presence`);
  assert.equal(!!runtime.loadDiffRenderer, !!full.loadDiffRenderer, `${full.id}.loadDiffRenderer presence`);
  const syntax = typeof full.syntaxLanguage === 'function' ? full.syntaxLanguage({ filename: 'main.py' }) : full.syntaxLanguage;
  const runtimeSyntax = typeof runtime.syntaxLanguage === 'function' ? runtime.syntaxLanguage({ filename: 'main.py' }) : runtime.syntaxLanguage;
  assert.equal(runtimeSyntax, syntax, `${full.id}.syntaxLanguage`);
  if (full.id === 'code') {
    assert.equal(runtime.displayLabel({ filename: 'main.py' }), full.displayLabel({ filename: 'main.py' }), 'code.displayLabel Python parity');
    assert.equal(runtime.displayLabel({ filename: 'main.c' }), full.displayLabel({ filename: 'main.c' }), 'code.displayLabel C parity');
    assert.equal(runtime.displayLabel({ filename: 'mesh.cpp' }), full.displayLabel({ filename: 'mesh.cpp' }), 'code.displayLabel C++ parity');
  }
}

function intake(filename, { mimeType = '', text = '', bytes = new Uint8Array(), isBinary = false } = {}) {
  return { filename, mimeType, text, textSample: text.slice(0, 2048), bytes, isBinary, size: bytes.length || text.length, lastModified: 0 };
}

function winner(registry, i) {
  let best = null;
  let bestScore = 0;
  for (const type of registry) {
    let score = 0;
    try { score = Math.max(0, Math.min(1, type.detect(i) || 0)); } catch {}
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return [best?.id || 'raw', bestScore];
}

const samples = [
  intake('README.md', { text: '# Hello\n\nWorld\n' }),
  intake('sample.json', { mimeType: 'application/json', text: '{"ok":true}' }),
  intake('main.py', { text: 'def hello():\n    return 1\n' }),
  intake('sample.png', { mimeType: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), isBinary: true }),
  intake('sample.pdf', { mimeType: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7'), isBinary: true }),
  intake('sample.zip', { mimeType: 'application/zip', bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]), isBinary: true }),
  intake('sample.glb', { bytes: new TextEncoder().encode('glTF'), isBinary: true }),
  intake('sample.mp3', { mimeType: 'audio/mpeg', isBinary: true }),
  intake('docker-compose.yml', { text: 'services:\n  web:\n    image: nginx\n' }),
  intake('toolchain.txt', { mimeType: 'text/plain', text: '# host toolchain manifest\nuid=1000 gid=1000\npython3=Python 3.13.13\n' }),
];

for (const sample of samples) {
  assert.deepEqual(winner(RUNTIME, sample), winner(FULL, sample), `winner parity for ${sample.filename}`);
}

assert.equal(winner(RUNTIME, samples.at(-1))[0], 'raw', '.txt with a comment-like heading stays Plain text');
assert.equal(winner(RUNTIME, intake('notes.txt', { text: '# Heading\n\n- item\n' }))[0], 'markdown', '.txt with stronger Markdown structure can still rank as Markdown');

console.log('registry runtime: ok');
