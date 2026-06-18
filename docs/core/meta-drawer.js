// Metadata drawer: a small table of the active file's facts (name/type/size/mime/modified) plus any
// per-type extracted metadata (EXIF, ID3, PDF info, …). Extracted from app.js; reads shared state.
import { state, $, escapeHtml, formatBytes } from './state.js';
import { getTypeInfo } from './type-info.js';
import { genericMetadata } from './generic-metadata.js';

const SENSITIVE_KEY_RE = /(SECRET|PASSWORD|TOKEN|KEY|PRIVATE)/i;
const ADVANCED_LABELS = new Set(['MIME', 'Modified', 'Extension', 'Content kind', 'Loaded bytes', 'Byte order mark']);
const TEXT_FACT_LABELS = new Set(['Line endings', 'Line break count', 'Lines', 'Blank lines', 'Longest line', 'Trailing newline']);

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

function appendTextRow(body, key, value, className = '') {
  const row = document.createElement('div');
  row.className = 'meta-row' + (className ? ' ' + className : '');
  row.innerHTML = `<span class="k">${escapeHtml(key)}</span><span class="v">${escapeHtml(String(value))}</span>`;
  body.appendChild(row);
}

function appendTypeInfo(body, basics) {
  const info = getTypeInfo(state.type, state.known && !state.forceBase ? state.known : null);
  appendTextRow(body, 'Used for', info.description);
  const row = document.createElement('div');
  row.className = 'meta-row';
  const key = document.createElement('span');
  key.className = 'k';
  key.textContent = 'Format info';
  const value = document.createElement('span');
  value.className = 'v';
  const link = document.createElement('a');
  link.href = info.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = info.name + ' ↗';
  value.appendChild(link);
  row.append(key, value);
  body.appendChild(row);
  for (const [k, v] of basics) appendTextRow(body, k, v);
}

function appendSection(body, title, rows, open = false) {
  if (!rows.length) return;
  const section = document.createElement('details');
  section.className = 'meta-section';
  section.open = open;
  const summary = document.createElement('summary');
  summary.textContent = title;
  section.appendChild(summary);
  const inner = document.createElement('div');
  inner.className = 'meta-section-body';
  section.appendChild(inner);
  for (const [k, v] of rows) appendTextRow(inner, k, v);
  body.appendChild(section);
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const [label, value] of rows) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([label, value]);
  }
  return out;
}

function displayTypeLabel() {
  if (typeof state.type?.displayLabel === 'function') return state.type.displayLabel(state.intake);
  if (state.type?.displayLabel) return String(state.type.displayLabel);
  try {
    return state.type?.label || 'File';
  } catch {
    return state.type?.label || 'File';
  }
}

export async function buildMetadata() {
  const body = $('metaBody');
  const i = state.intake;
  const basics = [
    ['Name', i.filename],
    ['Type', displayTypeLabel()],
    ['Size', formatBytes(i.size)],
  ];
  const rows = [
    ['MIME', i.mimeType || '—'],
    ['Modified', i.lastModified ? new Date(i.lastModified).toLocaleString() : '—'],
    ...genericMetadata(i),
  ];
  if (state.type.loadMetadata) {
    try { await appendExtractedRows(rows, state.type.loadMetadata, i); } catch {}
  }
  if (state.known && !state.forceBase && state.known.loadMetadata) {
    try { await appendExtractedRows(rows, state.known.loadMetadata, i); } catch {}
  }
  body.innerHTML = '';
  appendTypeInfo(body, basics);
  const unique = dedupeRows(rows);
  appendSection(body, 'Type-specific details', unique.filter(([k]) => !ADVANCED_LABELS.has(k) && !TEXT_FACT_LABELS.has(k)), true);
  appendSection(body, 'Text structure', unique.filter(([k]) => TEXT_FACT_LABELS.has(k)), false);
  appendSection(body, 'Advanced file facts', unique.filter(([k]) => ADVANCED_LABELS.has(k)), false);
  const note = document.createElement('p'); note.className = 'muted'; note.style.marginTop = '12px';
  note.style.fontSize = '12px';
  note.textContent = 'Note: browsers expose only the file’s modified time, never its OS creation time. “Created” dates come only from inside the file (e.g. PDF/EXIF).';
  body.appendChild(note);
}
