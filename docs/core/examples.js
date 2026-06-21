// Example gallery on the intake screen. Two-level UI:
//   Level 1 (default): folder-card grid — one card per category, with icon + label + file count.
//   Level 2: click a card → expand that category's files inline; ← back returns to grid.
// "Show all" expands everything. Last-opened category persists in sessionStorage.
// The "Metagame" category is gated behind fv:games:unlocked.
import { $ } from './state.js';
import { intakeFromFile } from './intake.js';
import { REGISTRY } from './registry-runtime.generated.js';
import { getTypeInfo, sampleDescription } from './type-info.js';
import { KNOWN_GROUP_ORDER, knownFileGroup, isKnownExample as isKnownExampleFor } from './examples-known.js';

const EXAMPLE_CATEGORY_ORDER = ['Documents', 'Ebook', 'Data', 'Office', 'Config', 'Code', 'Image', 'Media', '3D', 'Archive & Binary', 'Secrets', 'Binary', 'Emulator', 'Text', 'Other', 'Metagame'];

const SUPER_CATEGORIES = {
  'Documents':        'Files',
  'Ebook':            'Files',
  'Office':           'Files',
  'Text':             'Files',
  'Data':             'Code & Config',
  'Config':           'Code & Config',
  'Code':             'Code & Config',
  'Image':            'Media & 3D',
  'Media':            'Media & 3D',
  '3D':               'Media & 3D',
  'Archive & Binary': 'System',
  'Binary':           'System',
  'Emulator':         'System',
  'Secrets':          'System',
  'Metagame':         'Other',
  'Other':            'Other',
};
const SUPER_ORDER = ['Files', 'Code & Config', 'Media & 3D', 'System', 'Other'];
const SUPER_SS_KEY = 'fv:examples:supercat:';
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

// Known/enhanced files (real-world Config/Code filenames) appear ONLY in the
// dedicated known-files section — never duplicated into the type categories.
function isKnownExample(ex) {
  return isKnownExampleFor(ex, categoriesFor);
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
  // Hide super-sections whose grids have no visible cards
  for (const section of container.querySelectorAll('.ex-super-section')) {
    const grid = section.querySelector('.ex-folder-grid');
    if (!grid) continue;
    const hasVisible = !!grid.querySelector('.ex-folder-card:not([hidden])');
    section.hidden = !hasVisible;
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

  // Known/enhanced files are excluded from the type-category groups; they live
  // only in the dedicated known-files section at the bottom.
  const groups = new Map();
  for (const ex of visible) {
    if (isKnownExample(ex)) continue;
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
      if (ex.source && ex.license) {
        const qb = document.createElement('span');
        qb.className = 'ex-badge ex-badge-sourced';
        qb.title = 'Real-world sourced sample' + (ex.license ? ' (' + ex.license + ')' : '');
        qb.textContent = '✓';
        b.appendChild(qb);
      } else if (info.partial) {
        const qb = document.createElement('span');
        qb.className = 'ex-badge ex-badge-partial';
        qb.title = 'Partial support — may not render fully';
        qb.textContent = '⚠';
        b.appendChild(qb);
      }
      b.dataset.sourced = (ex.source && ex.license) ? '1' : '0';
      frag.appendChild(b);
    }
    return frag;
  }

  function renderKnownFiles() {
    const knownExamples = visible.filter(isKnownExample);
    if (knownExamples.length === 0) return null;

    const groupMap = new Map();
    for (const ex of knownExamples) {
      const g = knownFileGroup(ex.file.split('/').pop());
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g).push(ex);
    }
    const orderedGroups = [...groupMap.keys()].sort((a, b) => {
      const ia = KNOWN_GROUP_ORDER.indexOf(a), ib = KNOWN_GROUP_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    const section = document.createElement('details');
    section.className = 'ex-known-section';
    section.open = false;

    const summary = document.createElement('summary');
    summary.className = 'ex-known-summary';
    summary.innerHTML = `Known files <span class="ex-known-count">${knownExamples.length}</span>`;
    section.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'ex-known-body';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'ex-known-search';
    searchInput.placeholder = 'Search by name (e.g. package.json, Dockerfile, requirements.txt)…';
    searchInput.setAttribute('aria-label', 'Search known files');

    const groupsEl = document.createElement('div');
    groupsEl.className = 'ex-known-groups';

    for (const g of orderedGroups) {
      const items = groupMap.get(g) || [];
      const groupEl = document.createElement('div');
      groupEl.className = 'ex-known-group';

      const labelEl = document.createElement('div');
      labelEl.className = 'ex-known-group-label';
      labelEl.textContent = g;
      groupEl.appendChild(labelEl);

      const itemsEl = document.createElement('div');
      itemsEl.className = 'ex-known-group-items';

      for (const ex of items) {
        const fname = ex.file.split('/').pop();
        const btn = document.createElement('button');
        btn.className = 'ex-known-btn';
        btn.textContent = fname;
        btn.title = ex.description || fname;
        btn.dataset.search = fname.toLowerCase();
        btn.onclick = async () => {
          const r = await fetch('examples/' + ex.file);
          const buf = new Uint8Array(await r.arrayBuffer());
          await onPick(await intakeFromFile(new File([buf], fname, { type: ex.mime || '' })));
        };
        itemsEl.appendChild(btn);
      }

      groupEl.appendChild(itemsEl);
      groupsEl.appendChild(groupEl);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      for (const groupEl of groupsEl.querySelectorAll('.ex-known-group')) {
        let anyVisible = false;
        for (const btn of groupEl.querySelectorAll('.ex-known-btn')) {
          const show = !q || btn.dataset.search.includes(q);
          btn.hidden = !show;
          if (show) anyVisible = true;
        }
        groupEl.hidden = !anyVisible;
      }
    });

    body.appendChild(searchInput);
    body.appendChild(groupsEl);
    section.appendChild(body);
    return section;
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

  function readSuperOpen(superCat) {
    try { return sessionStorage.getItem(SUPER_SS_KEY + superCat) !== '0'; } catch { return true; }
  }
  function saveSuperOpen(superCat, open) {
    try { sessionStorage.setItem(SUPER_SS_KEY + superCat, open ? '1' : '0'); } catch { /* ok */ }
  }

  function showGrid() {
    host.textContent = '';

    // (a) search + quick-filter chips — above the file-type groups.
    host.appendChild(renderFilterBar(host));

    // (b) file-type category groups, grouped by super-category.
    // Group categories by super-category
    const superGroups = new Map(); // superCat -> [cat, ...]
    for (const cat of cats) {
      const superCat = SUPER_CATEGORIES[cat] || 'Other';
      if (!superGroups.has(superCat)) superGroups.set(superCat, []);
      superGroups.get(superCat).push(cat);
    }
    const supers = SUPER_ORDER.filter((s) => superGroups.has(s));

    for (const superCat of supers) {
      const catList = superGroups.get(superCat) || [];
      const isOpen = readSuperOpen(superCat);

      const section = document.createElement('div');
      section.className = 'ex-super-section';

      const header = document.createElement('button');
      header.className = 'ex-super-header';
      header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const totalCount = catList.reduce((n, cat) => n + (groups.get(cat) || []).length, 0);
      header.innerHTML =
        `<span class="ex-super-arrow">${isOpen ? '▾' : '▸'}</span>`
        + `<span class="ex-super-label">${superCat}</span>`
        + `<span class="ex-super-count">${catList.length} ${catList.length === 1 ? 'category' : 'categories'}, ${totalCount} files</span>`;

      const grid = document.createElement('div');
      grid.className = 'ex-folder-grid';
      if (!isOpen) grid.hidden = true;

      header.onclick = () => {
        const nowOpen = grid.hidden;
        grid.hidden = !nowOpen;
        header.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        header.querySelector('.ex-super-arrow').textContent = nowOpen ? '▾' : '▸';
        saveSuperOpen(superCat, nowOpen);
      };

      for (const cat of catList) {
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

      section.appendChild(header);
      section.appendChild(grid);
      host.appendChild(section);
    }

    applyFilter(host);

    // (c) known-files section, then (d) the "show all files" button — bottom.
    const knownSection = renderKnownFiles();
    if (knownSection) host.appendChild(knownSection);

    const showall = document.createElement('button');
    showall.className = 'ex-showall-btn';
    showall.textContent = 'Show all files';
    showall.onclick = () => showAll();
    host.appendChild(showall);

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
