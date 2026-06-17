// Metadata drawer: a small table of the active file's facts (name/type/size/mime/modified) plus any
// per-type extracted metadata (EXIF, ID3, PDF info, …). Extracted from app.js; reads shared state.
import { state, $, escapeHtml, formatBytes } from './state.js';

const SENSITIVE_KEY_RE = /(SECRET|PASSWORD|TOKEN|KEY|PRIVATE)/i;

function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    SENSITIVE_KEY_RE.test(key) ? 'redacted' : sanitizeObject(entry),
  ]));
}

function displayValue(value, key = '') {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value);
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) && /\b(keys|count|counts|total|totals)\b/i.test(key)) {
    return value;
  }
  if (SENSITIVE_KEY_RE.test(key)) return 'redacted';
  if (Array.isArray(value)) {
    if (!value.length) return 'none';
    if (value.every((v) => v == null || ['string', 'number', 'boolean'].includes(typeof v))) {
      return value.map((v) => displayValue(v)).join(', ');
    }
    return value.length.toLocaleString();
  }
  if (typeof value === 'object') return JSON.stringify(sanitizeObject(value));
  return String(value);
}

function labelFromKey(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMetadata(result) {
  if (!result) return [];
  const source = Array.isArray(result) ? result : Array.isArray(result.fields) ? result.fields : result;
  if (Array.isArray(source)) {
    return source
      .map((r) => Array.isArray(r) ? { label: r[0], value: r[1] } : r)
      .filter((r) => r && r.label != null)
      .map((r) => ({ label: String(r.label), value: displayValue(r.value, r.label) }));
  }
  if (typeof source === 'object') {
    return Object.entries(source)
      .filter(([, value]) => value !== undefined && typeof value !== 'function')
      .map(([key, value]) => ({ label: labelFromKey(key), value: displayValue(value, key) }));
  }
  return [{ label: 'Metadata', value: displayValue(source) }];
}

async function appendExtractedRows(rows, loader, intake) {
  if (!loader) return;
  const m = await loader();
  const extract = m.extract || m.extractMetadata;
  if (!extract) return;
  const result = await extract(intake);
  for (const r of normalizeMetadata(result)) rows.push([r.label, r.value]);
}

export async function buildMetadata() {
  const body = $('metaBody');
  const i = state.intake;
  const rows = [
    ['Name', i.filename],
    ['Type', state.type.label],
    ['Size', formatBytes(i.size)],
    ['MIME', i.mimeType || '—'],
    ['Modified', i.lastModified ? new Date(i.lastModified).toLocaleString() : '—'],
  ];
  if (state.type.loadMetadata) {
    try { await appendExtractedRows(rows, state.type.loadMetadata, i); } catch {}
  }
  if (state.known && !state.forceBase && state.known.loadMetadata) {
    try { await appendExtractedRows(rows, state.known.loadMetadata, i); } catch {}
  }
  body.innerHTML = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div'); row.className = 'meta-row';
    row.innerHTML = `<span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(String(v))}</span>`;
    body.appendChild(row);
  }
  const note = document.createElement('p'); note.className = 'muted'; note.style.marginTop = '12px';
  note.style.fontSize = '12px';
  note.textContent = 'Note: browsers expose only the file’s modified time, never its OS creation time. “Created” dates come only from inside the file (e.g. PDF/EXIF).';
  body.appendChild(note);
}
