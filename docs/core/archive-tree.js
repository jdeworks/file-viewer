import { buildTree, renderTree } from './filetree.js';
import { flushFolderEdit, setTree } from './folder.js';
import { withSourceText } from './intake.js';
import { $, isMobile, state, toast } from './state.js';
import { addArchiveRoot, captureActiveSidebarRoot } from './sidebar-roots.js';

export function mountArchiveTree(archive, openEntry, loadIntake, archiveIntake) {
  state.skipNextFileSidebarRoot = true;
  captureActiveSidebarRoot();
  const entries = (archive.entries || [])
    .filter((entry) => entry?.name && !entry.dir)
    .map((entry) => ({
      path: entry.name,
      originalPath: entry.name,
      encrypted: !!entry.encrypted,
      file: {
        name: entry.name.split('/').pop() || entry.name,
        size: Number(entry.size) || 0,
      },
    }));
  if (!entries.length) return;

  state.treeEntries = entries;
  state.folderEdits = new Map();
  state.folderMoves = new Map();
  state.binaryEdits = new Map();
  state.archiveIntake = archiveIntake || null;
  state.currentFolderPath = null;
  state.sessionTree = false;
  state.archiveTree = true;

  const rootName = archive.rootName || 'Archive';
  $('ftNotice').hidden = true;
  $('ftRoot').textContent = rootName;
  $('ftRoot').title = 'Archive: ' + rootName;
  $('treeBtn').hidden = false;
  $('repoBtn').hidden = true;
  $('ftExportBtn').hidden = !archiveIntake;
  $('ftExportBtn').title = 'Download archive with your edits applied';
  $('ftSearch').hidden = false;
  $('ftSearchInput').value = '';
  $('ftSearchCount').textContent = '';

  let archiveRoot = null;

  async function openArchiveNode(nodeOrPath, {
    skipFolderFlush = false, sidebarNavigationToken = null,
  } = {}) {
    const node = typeof nodeOrPath === 'string'
      ? entries.find((entry) => entry.path === nodeOrPath)
      : nodeOrPath;
    if (!node) {
      toast('Could not open ' + nodeOrPath);
      return false;
    }
    if (node.encrypted || !openEntry) {
      toast('Password-protected archive entries cannot be opened yet.');
      return false;
    }
    try {
      if (!skipFolderFlush) flushFolderEdit();
      // Flush any pending binary edit (e.g. image edit) before switching entries.
      if (!skipFolderFlush && state.currentFolderPath && state.binaryEdit?.dirty) {
        (state.binaryEdits = state.binaryEdits || new Map()).set(state.currentFolderPath, state.binaryEdit);
      }
      const stashed = state.folderEdits.get(node.path);
      const originalIntake = node.intake || await openEntry(node.path);
      if (originalIntake && !node.intake) node.intake = originalIntake;
      const intake = stashed != null && originalIntake
        ? withSourceText(originalIntake, stashed)
        : originalIntake;
      if (!intake) {
        toast('Could not open ' + node.path);
        return false;
      }
      state._skipDiscardGuard = true;
      state._skipSidebarRoot = true;
      const loaded = await loadIntake(intake, { sidebarNavigationToken });
      if (loaded === false) return false;
      state.currentFolderPath = node.path;
      archiveRoot.currentFolderPath = node.path;
      state.treeApi?.setActive?.(node.path);
      if (isMobile()) setTree(false);
      return true;
    } catch {
      toast('Could not open ' + node.path);
      return false;
    }
  }

  state.archiveOpenNode = openArchiveNode;
  state.archiveDeletes = new Set();
  state.treeApi = renderTree($('ftBody'), buildTree(entries), {
    onOpen: openArchiveNode,
    onMove: null,
  });
  archiveRoot = addArchiveRoot({
    label: rootName,
    entries,
    openNode: (entry, path, options) => openArchiveNode(path || entry.path, options),
    archiveIntake,
    alreadyCaptured: true,
  });
  archiveRoot.archiveOpenNode = openArchiveNode;
  state.archiveOpenNode = openArchiveNode;
  if (archiveIntake) mountDeletePanel(entries);
  setTree(true);
}

// Per-entry delete checklist for archive repack. Lives in the sidebar below the tree; checked
// entries are dropped when the archive is repacked + downloaded (#ftExportBtn). Additive — the
// original archive download is never removed.
function mountDeletePanel(entries) {
  const host = $('ftBody');
  if (!host) return;
  document.querySelector('.arc-del-panel')?.remove();   // drop any stale panel from a prior archive
  const panel = document.createElement('div');
  panel.className = 'arc-del-panel';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'arc-del-toggle';
  toggle.textContent = '🗑 Delete entries…';
  toggle.setAttribute('aria-expanded', 'false');

  const list = document.createElement('div');
  list.className = 'arc-del-list';
  list.hidden = true;

  for (const entry of entries) {
    const row = document.createElement('label');
    row.className = 'arc-del-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'arc-del-cb';
    cb.dataset.path = entry.path;
    cb.addEventListener('change', () => {
      if (cb.checked) state.archiveDeletes.add(entry.path);
      else state.archiveDeletes.delete(entry.path);
      state.folderExported = false;   // a deletion is unsaved work until exported
      row.classList.toggle('arc-del-marked', cb.checked);
      const n = state.archiveDeletes.size;
      toggle.textContent = n ? `🗑 ${n} marked for deletion` : '🗑 Delete entries…';
    });
    const name = document.createElement('span');
    name.className = 'arc-del-name';
    name.textContent = entry.path;
    row.append(cb, name);
    list.append(row);
  }

  toggle.addEventListener('click', () => {
    list.hidden = !list.hidden;
    toggle.setAttribute('aria-expanded', String(!list.hidden));
  });

  panel.append(toggle, list);
  host.parentNode?.insertBefore(panel, host.nextSibling);
}

export function clearArchiveTree({ keepRoot = false } = {}) {
  if (!state.archiveTree) return;
  state.treeApi?.stop?.();
  if (!keepRoot) state.treeEntries = null;
  state.archiveTree = false;
  state.archiveOpenNode = null;
  state.archiveIntake = null;
  state.binaryEdits = null;
  state.archiveDeletes = null;
  document.querySelector('.arc-del-panel')?.remove();
  if (!keepRoot) setTree(false);
}
