// Metadata drawer: a small table of the active file's facts (name/type/size/mime/modified) plus any
// per-type extracted metadata (EXIF, ID3, PDF info, …). Extracted from app.js; reads shared state.
import { state, $, escapeHtml, formatBytes } from './state.js';
import { getTypeInfo, getTypeFeatures } from './type-info.js';
import { genericMetadata } from './generic-metadata.js';
import { META_SECTIONS } from './metadata-helpers.js';

const SENSITIVE_KEY_RE = /(SECRET|PASSWORD|TOKEN|KEY|PRIVATE)/i;
const ADVANCED_LABELS = new Set(['MIME', 'Modified', 'Extension', 'Content kind', 'Loaded bytes', 'Byte order mark']);
const SECURITY_LABELS = new Set(['Filename risk', 'Filename warnings', 'Archive entry risk', 'Archive entry warnings']);
const TEXT_FACT_LABELS = new Set(['Line endings', 'Line break count', 'Lines', 'Blank lines', 'Longest line', 'Trailing newline']);
const BUILT_IN_SECTIONS = new Set(Object.values(META_SECTIONS));

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
  if (!Array.isArray(result) && result && typeof result === 'object' && Array.isArray(result.sections)) {
    const rows = [];
    if (Array.isArray(result.fields)) rows.push(...normalizeMetadata(result.fields));
    for (const section of result.sections) {
      const title = section.title || section.label || section.name;
      const fields = section.fields || section.rows || [];
      rows.push(...normalizeMetadata(fields).map((row) => ({
        ...row,
        section: row.section || title,
        sectionOpen: row.sectionOpen ?? section.open,
      })));
    }
    return rows;
  }
  const source = Array.isArray(result) ? result : Array.isArray(result.fields) ? result.fields : result;
  if (Array.isArray(source)) {
    return source
      .map((r) => Array.isArray(r) ? { label: r[0], value: r[1] } : r)
      .filter((r) => r && r.label != null)
      .map((r) => ({
        label: String(r.label),
        value: displayValue(r.value, r.label),
        ...(r.section ? { section: String(r.section) } : {}),
        ...(r.sectionOpen != null ? { sectionOpen: !!r.sectionOpen } : {}),
        ...(r.dedupeKey ? { dedupeKey: String(r.dedupeKey).toLowerCase() } : {}),
        ...(Number.isFinite(r.priority) ? { priority: Number(r.priority) } : {}),
      }));
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
  for (const r of normalizeMetadata(result)) rows.push(r);
}

function appendTextRow(body, key, value, className = '') {
  const row = document.createElement('div');
  row.className = 'meta-row' + (className ? ' ' + className : '');
  row.innerHTML = `<span class="k">${escapeHtml(key)}</span><span class="v">${escapeHtml(String(value))}</span>`;
  body.appendChild(row);
}

function showTypeInfoModal(info, known) {
  const dialog = document.createElement('dialog');
  dialog.className = 'type-info-dialog';

  // Header
  const header = document.createElement('div');
  header.className = 'type-info-dialog-header';
  const heading = document.createElement('h2');
  heading.textContent = info.name;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'type-info-dialog-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => dialog.close());
  header.append(heading, closeBtn);
  dialog.appendChild(header);

  // Body
  const bodyEl = document.createElement('div');
  bodyEl.className = 'type-info-dialog-body';

  const desc = document.createElement('p');
  desc.textContent = info.description.charAt(0).toUpperCase() + info.description.slice(1);
  bodyEl.appendChild(desc);

  // Links
  const linksRow = document.createElement('div');
  linksRow.className = 'type-info-dialog-links';
  const fmtLink = document.createElement('a');
  fmtLink.href = info.href;
  fmtLink.target = '_blank';
  fmtLink.rel = 'noopener noreferrer';
  fmtLink.textContent = info.name + ' ↗';
  linksRow.appendChild(fmtLink);
  if (info.fileExamplesHref) {
    const exLink = document.createElement('a');
    exLink.href = info.fileExamplesHref;
    exLink.target = '_blank';
    exLink.rel = 'noopener noreferrer';
    exLink.textContent = 'File Examples ↗';
    linksRow.appendChild(exLink);
  }
  bodyEl.appendChild(linksRow);

  // "What you can do here" — available features for this type/file (capability-driven).
  const feats = getTypeFeatures(state.type, known);
  if (feats.length) {
    const featSection = document.createElement('div');
    featSection.className = 'type-info-features';
    featSection.style.marginTop = '14px';
    const featHead = document.createElement('h3');
    featHead.textContent = 'What you can do here';
    featSection.appendChild(featHead);
    const ul = document.createElement('ul');
    ul.className = 'type-info-feature-list';
    ul.style.cssText = 'margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.55;';
    for (const [label, detail] of feats) {
      const li = document.createElement('li');
      li.style.marginBottom = '3px';
      const strong = document.createElement('strong');
      strong.textContent = label;
      li.append(strong, document.createTextNode(' — ' + detail));
      ul.appendChild(li);
    }
    featSection.appendChild(ul);
    bodyEl.appendChild(featSection);
  }

  // Plugin details
  if (known && known.about) {
    const section = document.createElement('div');
    section.className = 'type-info-used-for';
    const sectionHead = document.createElement('h3');
    sectionHead.textContent = 'Plugin details';
    section.appendChild(sectionHead);
    if (known.about.description) {
      const pluginDesc = document.createElement('p');
      pluginDesc.style.marginBottom = '8px';
      pluginDesc.textContent = known.about.description;
      section.appendChild(pluginDesc);
    }
    if (Array.isArray(known.about.usedFor)) {
      for (const item of known.about.usedFor) {
        const card = document.createElement('div');
        card.className = 'type-info-used-card';
        if (item.label) {
          const label = document.createElement('strong');
          label.textContent = item.label;
          card.appendChild(label);
        }
        if (item.description) {
          const itemDesc = document.createElement('p');
          itemDesc.textContent = item.description;
          card.appendChild(itemDesc);
        }
        if (item.href) {
          const itemLink = document.createElement('a');
          itemLink.href = item.href;
          itemLink.target = '_blank';
          itemLink.rel = 'noopener noreferrer';
          itemLink.textContent = 'Learn more ↗';
          card.appendChild(itemLink);
        }
        section.appendChild(card);
      }
    }
    bodyEl.appendChild(section);
  }

  dialog.appendChild(bodyEl);

  // Close on backdrop click
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());

  document.body.appendChild(dialog);
  dialog.showModal();
}

function appendTypeInfo(body, basics) {
  const info = getTypeInfo(state.type, state.known && !state.forceBase ? state.known : null, state.intake);
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
  if (info.fileExamplesHref) {
    value.appendChild(document.createTextNode(' · '));
    const guide = document.createElement('a');
    guide.href = info.fileExamplesHref;
    guide.target = '_blank';
    guide.rel = 'noopener noreferrer';
    guide.textContent = 'File Examples ↗';
    value.appendChild(guide);
  }
  row.append(key, value);
  body.appendChild(row);
  for (const [k, v] of basics) appendTextRow(body, k, v);

  const infoBtn = document.createElement('button');
  infoBtn.type = 'button';
  infoBtn.className = 'meta-info-btn';
  infoBtn.title = 'About this format';
  infoBtn.textContent = 'ⓘ About';
  infoBtn.addEventListener('click', () => showTypeInfoModal(info, state.known));
  body.appendChild(infoBtn);
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

export function dedupeMetadataRows(rows) {
  const explicit = new Map();
  rows.forEach((row) => {
    if (!row.dedupeKey) return;
    const prev = explicit.get(row.dedupeKey);
    if (!prev || (row.priority || 0) > (prev.priority || 0)) explicit.set(row.dedupeKey, { row, priority: row.priority || 0 });
  });
  const seenLabels = new Set();
  const seenExplicit = new Set();
  const out = [];
  for (const row of rows) {
    if (row.dedupeKey) {
      if (explicit.get(row.dedupeKey)?.row !== row) continue;
      if (seenExplicit.has(row.dedupeKey)) continue;
      seenExplicit.add(row.dedupeKey);
    }
    const key = `${row.section || ''}\u0000${row.label.toLowerCase()}`;
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    out.push(row);
  }
  return out;
}

function row(label, value, section = '') {
  return { label, value, section };
}

function rowFromMetadata(entry) {
  return Array.isArray(entry) ? row(entry[0], entry[1]) : entry;
}

function fallbackSection(label) {
  if (ADVANCED_LABELS.has(label)) return META_SECTIONS.advanced;
  if (SECURITY_LABELS.has(label)) return META_SECTIONS.security;
  if (TEXT_FACT_LABELS.has(label)) return META_SECTIONS.text;
  return META_SECTIONS.type;
}

function rowsForSection(rows, sectionTitle) {
  return rows
    .filter((r) => (r.section || fallbackSection(r.label)) === sectionTitle)
    .map((r) => [r.label, r.value]);
}

function explicitSections(rows) {
  const out = [];
  for (const r of rows) {
    if (!r.section || BUILT_IN_SECTIONS.has(r.section)) continue;
    if (out.some((s) => s.title === r.section)) continue;
    out.push({ title: r.section, open: r.sectionOpen !== false });
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
  // Clear synchronously up-front: the extractor rows below are awaited, so leaving the
  // previous file's rows in place would briefly show stale metadata (and lets a fast
  // reader observe the wrong file's data). Empty now → repopulated after extraction.
  body.innerHTML = '';
  const i = state.intake;
  const basics = [
    ['Name', i.filename],
    ['Type', displayTypeLabel()],
    ['Size', formatBytes(i.size)],
  ];
  const rows = [
    row('MIME', i.mimeType || '—', META_SECTIONS.advanced),
    row('Modified', i.lastModified ? new Date(i.lastModified).toLocaleString() : '—', META_SECTIONS.advanced),
    ...genericMetadata(i).map(rowFromMetadata),
  ];
  if (state.type.loadMetadata) {
    try { await appendExtractedRows(rows, state.type.loadMetadata, i); } catch {}
  }
  if (state.known && !state.forceBase && state.known.loadMetadata) {
    try { await appendExtractedRows(rows, state.known.loadMetadata, i); } catch {}
  }
  appendTypeInfo(body, basics);
  const unique = dedupeMetadataRows(rows);
  appendSection(body, META_SECTIONS.type, rowsForSection(unique, META_SECTIONS.type), true);
  appendSection(body, META_SECTIONS.security, rowsForSection(unique, META_SECTIONS.security), true);
  for (const section of explicitSections(unique)) {
    appendSection(body, section.title, rowsForSection(unique, section.title), section.open);
  }
  appendSection(body, META_SECTIONS.text, rowsForSection(unique, META_SECTIONS.text), false);
  appendSection(body, META_SECTIONS.advanced, rowsForSection(unique, META_SECTIONS.advanced), false);
  const note = document.createElement('p'); note.className = 'muted'; note.style.marginTop = '12px';
  note.style.fontSize = '12px';
  note.textContent = 'Note: browsers expose only the file’s modified time, never its OS creation time. “Created” dates come only from inside the file (e.g. PDF/EXIF).';
  body.appendChild(note);
}
