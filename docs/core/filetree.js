// Folder tree sidebar (VS Code-ish, aligned to the jdeworks code-editor theme). Builds a
// tree from a flat file list (webkitdirectory or drag-dropped folder), renders it with a
// cheap per-file type guess (filename only — no reading bytes), and opens a file on click.
import { LANGS, FILENAMES } from '../types/code/langmap.js';

// Type guess from filename alone -> { id, dot color }. Cheap; the real detector runs on open.
const TYPE_DOT = {
  markdown: '#519aff', pdf: '#e5534b', csv: '#3fb950', xlsx: '#3fb950', docx: '#4c9aff',
  pptx: '#e3a008', json: '#e3b341', image: '#a371f7', code: '#56b6c2', text: '#8b949e',
};
const EXT_TYPE = {
  md: 'markdown', markdown: 'markdown', mdown: 'markdown', mkd: 'markdown',
  pdf: 'pdf', csv: 'csv', tsv: 'csv',
  xlsx: 'xlsx', xls: 'xlsx', xlsm: 'xlsx', xlsb: 'xlsx', ods: 'xlsx',
  docx: 'docx', dotx: 'docx', pptx: 'pptx', ppsx: 'pptx', pptm: 'pptx',
  json: 'json', jsonc: 'json', geojson: 'json', json5: 'json',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', avif: 'image', ico: 'image', svg: 'image',
};
export function quickType(filename) {
  const base = (filename || '').toLowerCase().split('/').pop();
  if (FILENAMES[base]) return 'code';
  const ext = base.includes('.') ? base.split('.').pop() : '';
  if (EXT_TYPE[ext]) return EXT_TYPE[ext];
  if (LANGS[ext]) return 'code';
  return 'text';
}
const dotColor = (id) => TYPE_DOT[id] || TYPE_DOT.text;

function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

// entries: [{ file, path }]. Returns a nested tree.
export function buildTree(entries) {
  const root = { name: '', dir: true, children: new Map() };
  for (const e of entries) {
    const parts = e.path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1;
      const name = parts[i];
      if (last) {
        node.children.set(name, { name, dir: false, file: e.file, path: e.path });
      } else {
        if (!node.children.has(name)) node.children.set(name, { name, dir: true, children: new Map() });
        node = node.children.get(name);
      }
    }
  }
  return root;
}

function sortedChildren(node) {
  return [...node.children.values()].sort((a, b) =>
    (a.dir === b.dir) ? a.name.localeCompare(b.name) : (a.dir ? -1 : 1));
}

// Render into `host`. onOpen(node) fires on a file click. Returns { setActive(path) }.
export function renderTree(host, root, { onOpen }) {
  host.innerHTML = '';
  let activeRow = null;

  function makeNode(node, depth) {
    const pad = 8 + depth * 14;
    if (node.dir) {
      const wrap = document.createElement('div');
      const row = document.createElement('div');
      row.className = 'ft-row ft-folder';
      row.style.paddingLeft = pad + 'px';
      row.innerHTML = '<span class="ft-arrow">▾</span><span class="ft-name">' + escapeHtml(node.name) + '</span>';
      const kids = document.createElement('div');
      kids.className = 'ft-children';
      for (const c of sortedChildren(node)) kids.appendChild(makeNode(c, depth + 1));
      row.addEventListener('click', () => {
        const collapsed = wrap.classList.toggle('collapsed');
        row.querySelector('.ft-arrow').textContent = collapsed ? '▸' : '▾';
      });
      wrap.append(row, kids);
      return wrap;
    }
    const row = document.createElement('div');
    row.className = 'ft-row ft-file';
    row.style.paddingLeft = pad + 'px';
    row.dataset.path = node.path;
    row.tabIndex = 0;                          // focusable so arrow-key nav can target it
    const id = quickType(node.name);
    row.innerHTML = '<span class="ft-dot" style="background:' + dotColor(id) + '"></span>'
      + '<span class="ft-name">' + escapeHtml(node.name) + '</span>'
      + '<span class="ft-size">' + fmtSize(node.file.size) + '</span>';
    row.addEventListener('click', () => { setActive(node.path); onOpen(node); });
    return row;
  }

  // Marquee: when the active file name overflows its column, rotate it one char every
  // 100ms so the whole name reads out; restored to normal when another file is selected.
  let mq = null;
  function stopMarquee() {
    if (!mq) return;
    clearInterval(mq.timer);
    mq.el.textContent = mq.name;
    mq.el.classList.remove('ft-ticker');
    mq = null;
  }
  function startMarquee(row) {
    stopMarquee();
    const el = row && row.querySelector('.ft-name');
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;   // fits — nothing to scroll
    const name = el.textContent;
    el.classList.add('ft-ticker');
    let s = name + '   ';                       // gap before the name wraps around
    mq = { el, name, timer: setInterval(() => { s = s.slice(1) + s[0]; el.textContent = s; }, 100) };
  }

  function setActive(path) {
    if (activeRow) activeRow.classList.remove('active');
    activeRow = host.querySelector('.ft-file[data-path="' + cssEscape(path) + '"]');
    if (activeRow) { activeRow.classList.add('active'); startMarquee(activeRow); }
    else stopMarquee();
  }

  // Top-level children of root (skip the empty root node itself).
  for (const c of sortedChildren(root)) host.appendChild(makeNode(c, 0));
  // refresh() re-evaluates the marquee (e.g. after the sidebar is resized).
  return { setActive, refresh: () => startMarquee(activeRow), stop: stopMarquee };
}

function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cssEscape(s) { return s.replace(/["\\]/g, '\\$&'); }
