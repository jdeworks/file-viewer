import { esc } from './template.js';

export { esc };

const STYLE_ID = 'fv-known-ui-style';

const CSS = `
.kf-source-details{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;background:var(--bg,#fff);margin:0 0 16px}
.kf-source-details summary{cursor:pointer;background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.kf-source{margin:0;max-height:70vh;overflow:auto;background:var(--bg,#fff);font-family:ui-monospace,monospace;font-size:12px;line-height:1.6}
.kf-src-line{display:grid;grid-template-columns:4.2em minmax(0,1fr);align-items:start}
.kf-src-line:target,.kf-src-line.kf-source-hit{background:#fff7cc}
.kf-src-ln{position:sticky;left:0;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#6e7781);text-align:right;padding:0 10px;border-right:1px solid var(--border,#e0e0e0);user-select:none}
.kf-src-code{white-space:pre-wrap;overflow-wrap:anywhere;padding:0 12px}
.kf-source-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.kf-source-link:hover{color:var(--accent,#2563eb)}
.kf-chip{display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;background:#e0e7ff;color:#1e3a8a;font-weight:700;line-height:1.45}
.kf-chip-info{background:#e0f2fe;color:#075985}
.kf-chip-ok{background:#dcfce7;color:#166534}
.kf-chip-warn{background:#fef3c7;color:#92400e}
.kf-chip-danger{background:#fee2e2;color:#991b1b}
.kf-chip-muted{background:var(--bg-2,#f1f5f9);color:var(--fg-2,#5a6678);border:1px solid var(--border,#cbd5e1)}
.kf-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;margin-left:0}
.kf-issues{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.kf-issues-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.kf-issues-list{margin:0;padding:0;list-style:none}
.kf-issues-list li{padding:7px 14px;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;font-size:12px}
.kf-issues-list li:last-child{border-bottom:none}
.kf-symbol{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:6px 10px;align-items:start;padding:8px 10px;border-bottom:1px solid var(--border,#eaecf0);font-size:12px}
.kf-symbol:last-child{border-bottom:none}
.kf-symbol-kind{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.kf-symbol-main{min-width:0}
.kf-symbol-name{font-weight:700}
.kf-symbol-signature{font-family:ui-monospace,monospace;word-break:break-word}
.kf-symbol-docs{margin-top:2px;color:var(--fg-2,#5a6678)}
.kf-symbol-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
`;

export function ensureKnownUiStyle(root = document) {
  const doc = root.ownerDocument || root;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

export function chip(text, tone = 'info', title = '') {
  const el = document.createElement('span');
  el.className = `kf-chip kf-chip-${tone}`;
  el.textContent = text;
  if (title) el.title = title;
  return el;
}

export function severityChip(level, vocabulary = {}) {
  const raw = String(level || 'info');
  const key = raw.toLowerCase();
  const mapped = vocabulary[key] || vocabulary[raw] || {};
  const label = mapped.label || raw;
  const tone = mapped.tone || severityTone(key);
  const title = mapped.title || mapped.description || '';
  return chip(label, tone, title);
}

export function sourceButton(label, line, title = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kf-source-link';
  btn.dataset.sourceLine = String(line || 1);
  btn.textContent = label;
  if (title) btn.title = title;
  return btn;
}

export function issueList(items, { title = 'Issues' } = {}) {
  if (!items?.length) return null;
  const wrap = document.createElement('section');
  wrap.className = 'kf-issues';
  const hd = document.createElement('div');
  hd.className = 'kf-issues-hd';
  hd.textContent = `${title} (${items.length})`;
  wrap.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'kf-issues-list';
  for (const item of items) {
    const li = document.createElement('li');
    li.appendChild(severityChip(item.label || item.severity || 'note', item.tone ? { [item.label || item.severity || 'note']: { tone: item.tone } } : {}));
    const msg = document.createElement('span');
    msg.textContent = item.message || '';
    li.appendChild(msg);
    if (item.line) li.appendChild(sourceButton(`line ${item.line}`, item.line, 'Open source at this line'));
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

export function symbolRow({
  kind = 'symbol',
  name = '',
  signature = '',
  docs = '',
  line = 1,
  tags = [],
  title = '',
} = {}) {
  const row = document.createElement('div');
  row.className = 'kf-symbol';
  if (title) row.title = title;
  const kindEl = document.createElement('div');
  kindEl.className = 'kf-symbol-kind';
  kindEl.appendChild(chip(kind, 'muted', title));
  if (line) kindEl.appendChild(sourceButton(`line ${line}`, line, 'Open source at this symbol'));
  row.appendChild(kindEl);

  const main = document.createElement('div');
  main.className = 'kf-symbol-main';
  const nameEl = document.createElement('div');
  nameEl.className = signature ? 'kf-symbol-signature' : 'kf-symbol-name';
  nameEl.textContent = signature || name;
  main.appendChild(nameEl);
  if (signature && name) {
    const nameNote = document.createElement('div');
    nameNote.className = 'kf-note';
    nameNote.textContent = name;
    main.appendChild(nameNote);
  }
  if (docs) {
    const docsEl = document.createElement('div');
    docsEl.className = 'kf-symbol-docs';
    docsEl.textContent = docs;
    main.appendChild(docsEl);
  }
  if (tags?.length) {
    const tagWrap = document.createElement('div');
    tagWrap.className = 'kf-symbol-tags';
    for (const tag of tags) {
      if (typeof tag === 'string') tagWrap.appendChild(chip(tag, 'info'));
      else tagWrap.appendChild(chip(tag.label || tag.text || '', tag.tone || 'info', tag.title || ''));
    }
    main.appendChild(tagWrap);
  }
  row.appendChild(main);
  return row;
}

export function sourcePreview(text, {
  title = 'Source',
  collapsed = true,
  numbered = true,
  highlighter = null,
  idPrefix = 'kf-line',
} = {}) {
  const details = document.createElement('details');
  details.className = 'kf-source-details';
  details.dataset.sourcePreview = idPrefix;
  details.open = !collapsed;
  const summary = document.createElement('summary');
  summary.textContent = title;
  details.appendChild(summary);
  const pre = document.createElement('pre');
  pre.className = 'kf-source';
  const lines = String(text || '').split(/\r?\n/);
  pre.innerHTML = lines.map((line, idx) => {
    const lineNo = idx + 1;
    const code = highlighter ? highlighter(line, lineNo) : esc(line);
    if (!numbered) return `<span id="${idPrefix}-${lineNo}" class="kf-src-code">${code}</span>`;
    return `<div class="kf-src-line" id="${idPrefix}-${lineNo}" data-line="${lineNo}"><span class="kf-src-ln">${lineNo}</span><span class="kf-src-code">${code}</span></div>`;
  }).join(numbered ? '' : '\n');
  details.appendChild(pre);
  return details;
}

export function wireSourceLinks(root, { idPrefix = 'kf-line', previewSelector = '.kf-source-details' } = {}) {
  root.addEventListener('click', (event) => {
    const link = event.target.closest?.('[data-source-line]');
    if (!link || !root.contains(link)) return;
    const line = Number(link.dataset.sourceLine || 1);
    const details = root.querySelector(previewSelector);
    if (details) details.open = true;
    const row = root.ownerDocument.getElementById(`${idPrefix}-${line}`);
    if (!row || !root.contains(row)) return;
    row.classList.add('kf-source-hit');
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => row.classList.remove('kf-source-hit'), 1500);
  });
}

export function secretReason(key, value = '') {
  const k = String(key || '').toLowerCase();
  const v = String(value || '');
  if (/(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth)/i.test(k)) {
    return `masked because "${key}" looks sensitive`;
  }
  if (/^[A-Za-z0-9+/]{32,}={0,2}$/.test(v) || /(bearer|basic)\s+[A-Za-z0-9._~+/=-]+/i.test(v)) {
    return 'masked because the value resembles a credential';
  }
  return '';
}

export function maskedValue(key, value) {
  const reason = secretReason(key, value);
  if (!reason) return { text: String(value ?? ''), masked: false, reason };
  return { text: '********', masked: true, reason };
}

function severityTone(severity = '') {
  const s = String(severity).toLowerCase();
  if (/(critical|high|error|danger)/.test(s)) return 'danger';
  if (/(medium|warn|warning)/.test(s)) return 'warn';
  if (/(ok|pass|safe|info)/.test(s)) return 'ok';
  return 'info';
}
