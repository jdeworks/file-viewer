// Example gallery on the intake screen. Two-level UI:
//   Level 1 (default): folder-card grid — one card per category, with icon + label + file count.
//   Level 2: click a card → expand that category's files inline; ← back returns to grid.
// "Show all" expands everything. Last-opened category persists in sessionStorage.
// The "Metagame" category is gated behind fv:games:unlocked.
import { $ } from './state.js';
import { intakeFromFile } from './intake.js';
import { REGISTRY } from './registry-runtime.generated.js';
import { getTypeInfo, sampleDescription } from './type-info.js';

const EXAMPLE_CATEGORY_ORDER = ['Documents', 'Ebook', 'Data', 'Office', 'Config', 'Code', 'Image', 'Media', '3D', 'Archive & Binary', 'Secrets', 'Binary', 'Emulator', 'Text', 'Other', 'Metagame'];
const CATEGORY_ICONS = {
  Documents: '📄', Data: '📊', Office: '📁', Config: '⚙️',
  Code: '💻', Image: '🖼️', Media: '🎞️', '3D': '◩', Ebook: '▤',
  'Archive & Binary': '📦', Secrets: '🔑', Binary: '⬡', Emulator: '▣',
  Text: '¶', Other: '📂', Metagame: '🎮',
};
const SS_KEY = 'fv:examples:lastCat';
const GAMES_KEY = 'fv:games:unlocked';
const FILTER_KEY = 'fv:examples:filters';
const ENHANCED_FILES = new Set([
  'package.json', 'tsconfig.json', 'Dockerfile', 'docker-compose.yml', 'Cargo.toml',
  'requirements.txt', 'go.mod', 'composer.json', 'Gemfile', 'CODEOWNERS',
  '.editorconfig', 'pom.xml', 'build.gradle', 'Pipfile', 'openapi.yaml',
  'sample.gitignore',
]);
const PARTIAL_FILES = new Set(['sample.djvu', 'sample.lrf']);

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

function categoriesFor(ex) {
  const raw = ex.categories || ex.groups || ex.category || 'Other';
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.filter(Boolean))];
}

function readFilters() {
  try {
    const filters = JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}');
    delete filters.cat;
    return filters;
  } catch { return {}; }
}
function saveFilters(filters) {
  try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch { /* ok */ }
}

function isBinaryExample(ex) {
  return !!ex.binary || /^(application\/(octet-stream|pdf|zip|x-7z-compressed|wasm|vnd|x-msdownload)|audio\/|font\/|image\/|model\/|video\/)/i.test(ex.mime || '');
}

function isEnhancedExample(ex) {
  return !!ex.enhanced || ENHANCED_FILES.has((ex.file || '').split('/').pop());
}

function isPartialExample(ex) {
  return !!ex.partial || PARTIAL_FILES.has((ex.file || '').split('/').pop());
}

function provenanceText(ex) {
  const bits = [];
  if (ex.license) bits.push('License: ' + ex.license);
  if (ex.attribution) bits.push('Credit: ' + ex.attribution);
  if (ex.source) bits.push('Source: ' + ex.source);
  return bits.join('\n');
}

function exampleInfo(ex) {
  const type = ex.type ? REGISTRY.find((t) => t.id === ex.type) || detectTypeForExample(ex) : detectTypeForExample(ex);
  return {
    type,
    typeLabel: type?.label || '',
    editable: !!type?.capabilities?.rawView,
    binary: isBinaryExample(ex),
    enhanced: isEnhancedExample(ex),
    partial: isPartialExample(ex),
  };
}

function renderFilterBar(container) {
  const filters = readFilters();
  const tools = document.createElement('div');
  tools.className = 'ex-tools';
  const search = document.createElement('input');
  search.className = 'ex-search';
  search.type = 'search';
  search.placeholder = 'Filter sample files...';
  search.value = filters.q || '';
  search.addEventListener('input', () => {
    const next = readFilters();
    next.q = search.value.trim();
    saveFilters(next);
    applyFilter(container);
  });
  tools.appendChild(search);

  const kindRow = document.createElement('div');
  kindRow.className = 'ex-chip-row';
  for (const [val, label] of [['all', 'All'], ['edit', 'Editable'], ['view', 'Preview only'], ['binary', 'Binary'], ['enhanced', 'Enhanced'], ['partial', 'Partial']]) {
    const chip = document.createElement('button');
    chip.className = 'ex-filter-chip';
    chip.textContent = label;
    chip.dataset.filter = val;
    chip.onclick = () => {
      const next = readFilters();
      next.kind = val === 'all' ? '' : val;
      saveFilters(next);
      applyFilter(container);
    };
    kindRow.appendChild(chip);
  }
  tools.appendChild(kindRow);

  return tools;
}

function appendExternalExamplesLink(host) {
  const note = document.createElement('p');
  note.className = 'ex-more';
  note.innerHTML = 'Want to try more? <a href="https://www.fileexamples.com/" target="_blank" rel="noopener noreferrer">File Examples</a> has many more sample files. Most common formats should open here; executable or VM-oriented files are inspected, not run.';
  host.appendChild(note);
}

function matchesFilters(el, filters) {
  const q = (filters.q || '').toLowerCase();
  if (q && !(el.dataset.search || '').includes(q)) return false;
  const kind = filters.kind || '';
  if (kind === 'edit' && el.dataset.editable !== '1') return false;
  if (kind === 'view' && el.dataset.editable === '1') return false;
  if (kind === 'binary' && el.dataset.binary !== '1') return false;
  if (kind === 'enhanced' && el.dataset.enhanced !== '1') return false;
  if (kind === 'partial' && el.dataset.partial !== '1') return false;
  return true;
}

function applyFilter(container) {
  const filters = readFilters();
  for (const b of container.querySelectorAll('.ex-file-btn, .ex-folder-card')) {
    b.hidden = !matchesFilters(b, filters);
  }
  for (const chip of container.querySelectorAll('.ex-filter-chip')) {
    chip.classList.toggle('active', (filters.kind || 'all') === chip.dataset.filter);
  }
  for (const group of container.querySelectorAll('.ex-group')) {
    group.hidden = !group.querySelector('.ex-file-btn:not([hidden])');
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
  const visible = unlocked ? list : list.filter((ex) => !categoriesFor(ex).includes('Metagame'));

  const groups = new Map();
  for (const ex of visible) {
    for (const cat of categoriesFor(ex)) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(ex);
    }
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
      const info = exampleInfo(ex);
      const baseTip = ex.description || sampleDescription(ex, getTypeInfo(info.type));
      const tip = [baseTip, provenanceText(ex)].filter(Boolean).join('\n');
      const cats = categoriesFor(ex);
      b.dataset.categories = cats.join('|');
      b.dataset.search = [ex.label, ex.file, ex.mime, info.typeLabel, tip, ex.license, ex.attribution, cats.join(' ')].join(' ').toLowerCase();
      b.dataset.editable = info.editable ? '1' : '0';
      b.dataset.binary = info.binary ? '1' : '0';
      b.dataset.enhanced = info.enhanced ? '1' : '0';
      b.dataset.partial = info.partial ? '1' : '0';
      b.title = tip;
      b.setAttribute('aria-label', tip);
      b.onclick = async () => {
        const r = await fetch('examples/' + ex.file);
        const buf = new Uint8Array(await r.arrayBuffer());
        // Use just the filename (not the full path) as the intake filename
        const fname = ex.file.split('/').pop();
        await onPick(await intakeFromFile(new File([buf], fname, { type: ex.mime || '' })));
      };
      if (info.type) {
        const badge = document.createElement('span');
        badge.className = info.editable ? 'ex-badge ex-badge-edit' : 'ex-badge ex-badge-view';
        badge.title = info.editable ? 'Editable in browser' : 'Preview only';
        badge.textContent = info.editable ? '✏' : '👁';
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
    applyFilter(host);
    appendExternalExamplesLink(host);
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

    applyFilter(host);
    appendExternalExamplesLink(host);
  }

  function showGrid() {
    host.textContent = '';

    const grid = document.createElement('div');
    grid.className = 'ex-folder-grid';

    for (const cat of cats) {
      const count = (groups.get(cat) || []).length;
      const card = document.createElement('button');
      card.className = 'ex-folder-card';
      card.dataset.categories = cat;
      card.dataset.search = [cat, ...(groups.get(cat) || []).flatMap((ex) => [ex.label, ex.file, ex.mime])].join(' ').toLowerCase();
      card.dataset.editable = (groups.get(cat) || []).some((ex) => exampleInfo(ex).editable) ? '1' : '0';
      card.dataset.binary = (groups.get(cat) || []).some(isBinaryExample) ? '1' : '0';
      card.dataset.enhanced = (groups.get(cat) || []).some(isEnhancedExample) ? '1' : '0';
      card.dataset.partial = (groups.get(cat) || []).some(isPartialExample) ? '1' : '0';
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
    host.appendChild(renderFilterBar(host));
    applyFilter(host);
    appendExternalExamplesLink(host);
  }

  // Resume last session's category if set and still valid
  const lastCat = readLastCat();
  if (lastCat && groups.has(lastCat)) {
    showCategory(lastCat);
  } else {
    showGrid();
  }
}
