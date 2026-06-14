// Folder tree sidebar (VS Code-ish, aligned to the jdeworks code-editor theme). Builds a
// tree from a flat file list (webkitdirectory or drag-dropped folder), renders it with a
// cheap per-file type guess (filename only -- no reading bytes), and opens a file on click.
// Virtual-scroll: only rows in the current viewport (+OVERSCAN) are in the DOM, so an
// arbitrarily large file count never freezes the tab.
import { LANGS, FILENAMES } from '../types/text/code/langmap.js';

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

// Module-level reference to the file node currently being dragged from the tree.
let _dragNode = null;
export function getDraggedTreeNode() { return _dragNode; }
export const TREE_DRAG_TYPE = 'text/x-fv-tree-path';

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

const ROW_H = 28;
const OVERSCAN = 8;

// Collect all folder paths in the tree (for pre-populating openFolders).
function collectFolderPaths(node, prefix, out) {
  for (const c of sortedChildren(node)) {
    if (c.dir) {
      const fp = prefix ? prefix + '/' + c.name : c.name;
      out.add(fp);
      collectFolderPaths(c, fp, out);
    }
  }
}

// Render into `host`. onOpen(node) fires on a file click. Returns controller API.
export function renderTree(host, root, { onOpen }) {
  host.innerHTML = '';
  const inner = document.createElement('div');
  inner.className = 'ft-virtual-inner';
  inner.style.position = 'relative';
  inner.style.height = '0px';
  host.appendChild(inner);

  // Pre-populate all folder paths so the tree starts fully expanded.
  const openFolders = new Set();
  collectFolderPaths(root, '', openFolders);

  let items = [];          // flat array of { node, depth, isFolder, folderPath }
  let activeNode = null;
  let filterFn = null;
  const editedPaths = new Set();

  // Rebuild the flat items array from current expand/filter state.
  function buildFlat() {
    items = [];
    function walk(node, depth, parentPath) {
      for (const c of sortedChildren(node)) {
        const fp = parentPath ? parentPath + '/' + c.name : c.name;
        if (c.dir) {
          if (!filterFn) {
            items.push({ node: c, depth, isFolder: true, folderPath: fp });
            if (openFolders.has(fp)) walk(c, depth + 1, fp);
          } else {
            walk(c, depth + 1, fp);
          }
        } else {
          if (!filterFn || filterFn(c.path)) {
            items.push({ node: c, depth: filterFn ? 0 : depth, isFolder: false, folderPath: '' });
          }
        }
      }
    }
    walk(root, 0, '');
    inner.style.height = items.length * ROW_H + 'px';
    // Clear all rendered rows — items array changed so cached indices no longer match nodes.
    inner.innerHTML = '';
    paint();
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
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;   // fits -- nothing to scroll
    const name = el.textContent;
    el.classList.add('ft-ticker');
    let s = name + '   ';                       // gap before the name wraps around
    mq = { el, name, timer: setInterval(() => { s = s.slice(1) + s[0]; el.textContent = s; }, 100) };
  }

  function makeRow(item, idx) {
    const row = document.createElement('div');
    row.className = 'ft-row ' + (item.isFolder ? 'ft-folder' : 'ft-file');
    row.dataset.idx = idx;
    row.style.position = 'absolute';
    row.style.top = idx * ROW_H + 'px';
    row.style.height = ROW_H + 'px';
    row.style.width = '100%';
    const pad = 8 + item.depth * 14;
    row.style.paddingLeft = pad + 'px';

    if (item.isFolder) {
      row.innerHTML = '<span class="ft-arrow">' + (openFolders.has(item.folderPath) ? '▾' : '▸') + '</span>'
        + '<span class="ft-name">' + escapeHtml(item.node.name) + '</span>';
      row.tabIndex = -1;
      row.addEventListener('click', () => {
        if (openFolders.has(item.folderPath)) openFolders.delete(item.folderPath);
        else openFolders.add(item.folderPath);
        buildFlat();
      });
    } else {
      row.dataset.path = item.node.path;
      row.tabIndex = 0;
      row.draggable = true;
      const id = quickType(item.node.name);
      row.innerHTML = '<span class="ft-dot" style="background:' + dotColor(id) + '"></span>'
        + '<span class="ft-name">' + escapeHtml(item.node.name) + '</span>'
        + '<span class="ft-size">' + fmtSize(item.node.file.size) + '</span>';
      if (item.node === activeNode) row.classList.add('active');
      if (editedPaths.has(item.node.path)) row.classList.add('ft-edited');
      row.addEventListener('click', () => { setActive(item.node.path); onOpen(item.node); });
      row.addEventListener('dragstart', (e) => {
        _dragNode = item.node;
        e.dataTransfer.setData(TREE_DRAG_TYPE, item.node.path);
        e.dataTransfer.effectAllowed = 'copy';
      });
      row.addEventListener('dragend', () => { _dragNode = null; });
    }
    return row;
  }

  // Update visible rows: remove out-of-range, create missing in-range rows.
  function paint() {
    const scrollTop = host.scrollTop;
    const viewRows = Math.ceil(host.clientHeight / ROW_H) + 1;
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    const end = Math.min(items.length, start + viewRows + OVERSCAN * 2);

    // Remove rows outside [start, end).
    const existing = inner.querySelectorAll('[data-idx]');
    for (const el of existing) {
      const i = Number(el.dataset.idx);
      if (i < start || i >= end) el.remove();
    }

    // Build a set of already-rendered indices.
    const rendered = new Set();
    for (const el of inner.querySelectorAll('[data-idx]')) rendered.add(Number(el.dataset.idx));

    // Create rows for indices not yet in DOM.
    for (let i = start; i < end; i++) {
      if (!rendered.has(i)) inner.appendChild(makeRow(items[i], i));
    }
  }

  function setActive(path) {
    // Remove active from old active row if in DOM.
    const oldRow = inner.querySelector('.ft-row.active');
    if (oldRow) oldRow.classList.remove('active');
    stopMarquee();

    activeNode = items.find((it) => !it.isFolder && it.node.path === path)?.node || null;

    const newRow = inner.querySelector('[data-path="' + cssEscape(path) + '"]');
    if (newRow) { newRow.classList.add('active'); startMarquee(newRow); }

    // Scroll item into view if needed.
    const itemIdx = items.findIndex((it) => !it.isFolder && it.node.path === path);
    if (itemIdx >= 0) {
      const top = itemIdx * ROW_H;
      if (top < host.scrollTop) host.scrollTop = top;
      else if (top + ROW_H > host.scrollTop + host.clientHeight) host.scrollTop = top + ROW_H - host.clientHeight;
    }
  }

  function setEdited(path, on = true) {
    if (on) editedPaths.add(path); else editedPaths.delete(path);
    const row = inner.querySelector('[data-path="' + cssEscape(path) + '"]');
    if (row) row.classList.toggle('ft-edited', on !== false);
  }

  function filter(matchFn) {
    filterFn = matchFn;
    buildFlat();
    return items.length;   // all items are files when filterFn is set
  }

  function clearFilter() { filterFn = null; buildFlat(); }

  function navigate(dir) {
    const fileItems = items.filter((it) => !it.isFolder);
    if (!fileItems.length) return;
    const curIdx = activeNode ? fileItems.findIndex((it) => it.node === activeNode) : -1;
    const nextIdx = Math.max(0, Math.min(fileItems.length - 1, curIdx + dir));
    const next = fileItems[nextIdx];
    if (!next) return;
    setActive(next.node.path);
    onOpen(next.node);
  }

  function refresh() { startMarquee(inner.querySelector('.ft-row.active')); }
  function stop() { stopMarquee(); host.removeEventListener('scroll', onScroll); }

  function onScroll() { paint(); }
  host.addEventListener('scroll', onScroll, { passive: true });
  new ResizeObserver(paint).observe(host);

  buildFlat();

  return { setActive, setEdited, filter, clearFilter, navigate, refresh, stop };
}

function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cssEscape(s) { return s.replace(/["\\]/g, '\\$&'); }
