// Example gallery on the intake screen. Two-level UI:
//   Level 1 (default): folder-card grid — one card per category, with icon + label + file count.
//   Level 2: click a card → expand that category's files inline; ← back returns to grid.
// "Show all" expands everything. Last-opened category persists in sessionStorage.
// The "Metagame" category is gated behind fv:games:unlocked.
import { $ } from './state.js';
import { intakeFromFile } from './intake.js';
import { REGISTRY } from './registry.js';

const EXAMPLE_CATEGORY_ORDER = ['Documents', 'Data', 'Office', 'Config', 'Code', 'Media', 'Archive & Binary', 'Secrets', 'Metagame'];
const CATEGORY_ICONS = {
  Documents: '📄', Data: '📊', Office: '📁', Config: '⚙️',
  Code: '💻', Media: '🎞️', 'Archive & Binary': '📦', Secrets: '🔑', Metagame: '🎮',
};
const SS_KEY = 'fv:examples:lastCat';
const GAMES_KEY = 'fv:games:unlocked';

function isGamesUnlocked() {
  try { return localStorage.getItem(GAMES_KEY) === '1'; } catch { return false; }
}

function readLastCat() {
  try { return sessionStorage.getItem(SS_KEY) || null; } catch { return null; }
}
function saveLastCat(cat) {
  try { sessionStorage.setItem(SS_KEY, cat); } catch { /* ok */ }
}
function clearLastCat() {
  try { sessionStorage.removeItem(SS_KEY); } catch { /* ok */ }
}

function detectTypeForExample(ex) {
  const fname = (ex.file || '').split('/').pop();
  const intake = {
    filename: fname,
    mimeType: ex.mime || '',
    bytes: new Uint8Array(0),
    isBinary: false,   // forces binary detectors to return 0 immediately
    text: '', textSample: '', isPaste: false, size: 0, lastModified: 0,
  };
  let best = null, bestConf = 0;
  for (const t of REGISTRY) {
    try { const c = t.detect(intake); if (c > bestConf) { bestConf = c; best = t; } } catch {}
  }
  return bestConf > 0.25 ? best : null;
}

function renderFilterBar(container) {
  const stored = (() => { try { return sessionStorage.getItem('fv:examples:filter') || 'all'; } catch { return 'all'; } })();
  const bar = document.createElement('div');
  bar.className = 'ex-filter-bar';
  for (const [val, label] of [['all', 'All'], ['edit', 'Editable'], ['view', 'View only']]) {
    const chip = document.createElement('button');
    chip.className = 'ex-filter-chip' + (stored === val ? ' active' : '');
    chip.textContent = label;
    chip.dataset.filter = val;
    chip.onclick = () => applyFilter(container, val);
    bar.appendChild(chip);
  }
  return bar;
}

function applyFilter(container, val) {
  try { sessionStorage.setItem('fv:examples:filter', val); } catch {}
  for (const b of container.querySelectorAll('.ex-file-btn')) {
    const badge = b.querySelector('.ex-badge');
    if (val === 'all') b.hidden = false;
    else if (val === 'edit') b.hidden = !(badge?.classList.contains('ex-badge-edit'));
    else b.hidden = !(badge?.classList.contains('ex-badge-view'));
  }
  for (const chip of container.querySelectorAll('.ex-filter-chip')) {
    chip.classList.toggle('active', chip.dataset.filter === val);
  }
}

export async function loadExamples(onPick) {
  try {
    const res = await fetch('examples/index.json');
    if (!res.ok) return;
    const list = await res.json();
    const host = $('examples');
    renderGallery(host, list, onPick);
  } catch { /* gallery is optional */ }
}

function renderGallery(host, list, onPick) {
  const unlocked = isGamesUnlocked();
  const visible = unlocked ? list : list.filter((ex) => ex.category !== 'Metagame');

  const groups = new Map();
  for (const ex of visible) {
    const cat = ex.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(ex);
  }
  const cats = [...groups.keys()].sort((a, b) => {
    const ia = EXAMPLE_CATEGORY_ORDER.indexOf(a), ib = EXAMPLE_CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

  function renderFiles(cat) {
    const frag = document.createDocumentFragment();
    for (const ex of groups.get(cat) || []) {
      const b = document.createElement('button');
      b.textContent = ex.label || ex.file;
      b.className = 'ex-file-btn';
      b.onclick = async () => {
        const r = await fetch('examples/' + ex.file);
        const buf = new Uint8Array(await r.arrayBuffer());
        // Use just the filename (not the full path) as the intake filename
        const fname = ex.file.split('/').pop();
        await onPick(await intakeFromFile(new File([buf], fname, { type: ex.mime || '' })));
      };
      const type = detectTypeForExample(ex);
      if (type) {
        const badge = document.createElement('span');
        badge.className = type.capabilities?.rawView ? 'ex-badge ex-badge-edit' : 'ex-badge ex-badge-view';
        badge.title = type.capabilities?.rawView ? 'Editable in browser' : 'Preview only';
        badge.textContent = type.capabilities?.rawView ? '✏' : '👁';
        b.appendChild(badge);
      }
      frag.appendChild(b);
    }
    return frag;
  }

  function showCategory(cat) {
    saveLastCat(cat);
    host.textContent = '';

    const back = document.createElement('button');
    back.className = 'ex-back-btn';
    back.textContent = '← All categories';
    back.onclick = () => { clearLastCat(); renderGallery(host, list, onPick); };
    host.appendChild(back);

    const head = document.createElement('div');
    head.className = 'ex-cat-head';
    head.textContent = (CATEGORY_ICONS[cat] || '📂') + ' ' + cat + ' (' + (groups.get(cat) || []).length + ')';
    host.appendChild(head);

    const row = document.createElement('div');
    row.className = 'ex-group-items';
    row.appendChild(renderFiles(cat));
    host.appendChild(renderFilterBar(host));
    host.appendChild(row);
    const stored = (() => { try { return sessionStorage.getItem('fv:examples:filter') || 'all'; } catch { return 'all'; } })();
    applyFilter(host, stored);
  }

  function showAll() {
    host.textContent = '';

    const back = document.createElement('button');
    back.className = 'ex-back-btn';
    back.textContent = '← Folder view';
    back.onclick = () => showGrid();
    host.appendChild(back);

    host.appendChild(renderFilterBar(host));

    for (const cat of cats) {
      const section = document.createElement('div');
      section.className = 'ex-group';
      const label = document.createElement('span');
      label.className = 'ex-group-label';
      label.textContent = (CATEGORY_ICONS[cat] || '📂') + ' ' + cat;
      section.appendChild(label);
      const row = document.createElement('div');
      row.className = 'ex-group-items';
      row.appendChild(renderFiles(cat));
      section.appendChild(row);
      host.appendChild(section);
    }

    const stored = (() => { try { return sessionStorage.getItem('fv:examples:filter') || 'all'; } catch { return 'all'; } })();
    applyFilter(host, stored);
  }

  function showGrid() {
    host.textContent = '';

    const grid = document.createElement('div');
    grid.className = 'ex-folder-grid';

    for (const cat of cats) {
      const count = (groups.get(cat) || []).length;
      const card = document.createElement('button');
      card.className = 'ex-folder-card';
      card.innerHTML =
        `<span class="ex-folder-icon">${CATEGORY_ICONS[cat] || '📂'}</span>`
        + `<span class="ex-folder-label">${cat}</span>`
        + `<span class="ex-folder-count">${count}</span>`;
      card.onclick = () => showCategory(cat);
      grid.appendChild(card);
    }
    host.appendChild(grid);

    const showall = document.createElement('button');
    showall.className = 'ex-showall-btn';
    showall.textContent = 'Show all files';
    showall.onclick = () => showAll();
    host.appendChild(showall);
  }

  // Resume last session's category if set and still valid
  const lastCat = readLastCat();
  if (lastCat && groups.has(lastCat)) {
    showCategory(lastCat);
  } else {
    showGrid();
  }
}
