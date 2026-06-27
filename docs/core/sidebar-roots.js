import { buildTree, renderTree } from './filetree.js';
import { intakeFromText } from './intake.js';
import { $, state, toast } from './state.js';

let loadIntake = null;
let nextId = 1;

function setSidebar(open) {
  $('fileTree').hidden = !open;
  $('ftResize').hidden = !open || window.matchMedia('(max-width: 760px)').matches;
}

export function initSidebarRoots({ loadIntake: loader }) {
  loadIntake = loader;
}

function roots() {
  if (!state.sidebarRoots) state.sidebarRoots = [];
  return state.sidebarRoots;
}

function uniqueLabel(label) {
  const base = label || 'Files';
  const used = new Set(roots().map((root) => root.label));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(base + ' ' + i)) i++;
  return base + ' ' + i;
}

function fileFromIntake(intake) {
  return new File([intake.bytes || (intake.text != null ? intake.text : '')], intake.filename || 'untitled', {
    type: intake.mimeType || '',
    lastModified: intake.lastModified || Date.now(),
  });
}

export function captureActiveSidebarRoot() {
  const root = roots().find((item) => item.id === state.activeSidebarRootId);
  if (!root) return false;
  let capturedDirtyFileRoot = false;
  if (root.kind === 'file' && state.rawview?.isDirty?.()) {
    const entry = (root.treeEntries || [])[0];
    const path = entry?.path || root.label;
    const text = state.rawview.getValue();
    const intake = intakeFromText(text, path.split('/').pop() || root.label);
    root.treeEntries = [{
      ...(entry || {}),
      path,
      file: fileFromIntake(intake),
      intake,
    }];
    root.folderEdits = new Map([[path, text]]);
    root.folderExported = false;
    capturedDirtyFileRoot = true;
  }
  if (!capturedDirtyFileRoot) {
    root.treeEntries = state.treeEntries || root.treeEntries || [];
    root.folderEdits = state.folderEdits || new Map();
  }
  root.folderMoves = state.folderMoves || new Map();
  root.binaryEdits = state.binaryEdits || null;
  root.archiveDeletes = state.archiveDeletes || null;
  root.currentFolderPath = state.currentFolderPath || null;
  root.folderExported = capturedDirtyFileRoot ? false : !!state.folderExported;
  return capturedDirtyFileRoot;
}

export function activateSidebarRoot(root, { skipCapture = false } = {}) {
  if (!root) return;
  if (!skipCapture) captureActiveSidebarRoot();
  state.activeSidebarRootId = root.id;
  state.treeEntries = root.treeEntries || [];
  state.folderEdits = root.folderEdits || new Map();
  state.folderMoves = root.folderMoves || new Map();
  state.binaryEdits = root.binaryEdits || null;
  state.archiveDeletes = root.archiveDeletes || null;
  state.archiveIntake = root.archiveIntake || null;
  state.archiveOpenNode = root.archiveOpenNode || null;
  state.currentFolderPath = root.currentFolderPath || null;
  state.sessionTree = root.kind === 'file';
  state.archiveTree = root.kind === 'archive';
  state.folderExported = !!root.folderExported;
  $('ftRoot').textContent = root.label;
  $('ftRoot').title = root.title || root.label;
  $('repoBtn').hidden = !root.git;
  $('ftExportBtn').hidden = root.kind === 'file' || !!root.git || !!root.readOnly || (root.kind === 'archive' && !root.archiveIntake);
  $('ftExportBtn').title = root.kind === 'archive'
    ? 'Download archive with your edits applied'
    : 'Download folder with your edits applied';
  $('ftSearch').hidden = !!root.git || root.kind === 'file';
  $('ftSearchInput').value = '';
  $('ftSearchCount').textContent = '';
}

function displayEntries() {
  const out = [];
  for (const root of roots()) {
    for (const entry of root.treeEntries || []) {
      const path = root.kind === 'file' ? root.label : root.label + '/' + entry.path;
      out.push({
        ...entry,
        path,
        sidebarRootId: root.id,
        sidebarInnerPath: entry.path,
        sidebarRoot: root.kind === 'file',
      });
    }
    // File-with-children: a 'file' root (a split GIF) that ALSO exposes child frames.
    // The self entry above stays clickable (opens the running GIF); each child below
    // is a frame PNG opened lazily via root.getChildIntake. buildTree() collapses the
    // matching label segment so the children render UNDER the (still-openable) file row.
    for (const child of root.childEntries || []) {
      out.push({
        name: child.name,
        file: { name: child.name.split('/').pop() || child.name, size: Number(child.size) || 0 },
        path: root.label + '/' + child.name,
        sidebarRootId: root.id,
        sidebarInnerPath: child.name,
        sidebarChild: true,
      });
    }
  }
  return out;
}

function rootForPath(path) {
  return roots().find((root) => path === root.label || path.startsWith(root.label + '/'));
}

export function removeActiveSidebarRoot() {
  const root = roots().find((item) => item.id === state.activeSidebarRootId);
  if (!root) return;
  const next = roots().filter((item) => item.id !== root.id);
  state.sidebarRoots = next;
  state.activeSidebarRootId = null;
  document.querySelector('.arc-del-panel')?.remove();
  renderSidebarRoots(next.at(-1) || null);
  toast('Removed from sidebar. Nothing was deleted from disk.');
}

export function renderSidebarRoots(activeRoot = null, activeInnerPath = null, { skipCapture = false } = {}) {
  const list = roots();
  if (!list.length) {
    state.treeApi?.stop?.();
    state.treeApi = null;
    state.treeEntries = null;
    state.activeSidebarRootId = null;
    $('ftRemoveRootBtn').hidden = true;
    setSidebar(false);
    return;
  }
  const active = activeRoot || list.find((root) => root.id === state.activeSidebarRootId) || list[list.length - 1];
  activateSidebarRoot(active, { skipCapture });
  state.treeApi?.stop?.();
  state.treeApi = renderTree($('ftBody'), buildTree(displayEntries()), {
    onOpen: async (node) => {
      const root = roots().find((item) => item.id === node.sidebarRootId);
      if (!root || !loadIntake) return;
      activateSidebarRoot(root);
      // A child frame of a file-with-children root (split GIF): open the frame PNG via the
      // provider, but leave the root a 'file' so its own row keeps opening the running GIF.
      if (node.sidebarChild && root.getChildIntake) {
        const intake = await root.getChildIntake(node.sidebarInnerPath);
        if (intake) {
          state._skipDiscardGuard = true;
          state._skipSidebarRoot = true;
          await loadIntake(intake);
        }
        renderSidebarRoots(root, node.sidebarInnerPath);
        return;
      }
      const innerPath = node.sidebarInnerPath || node.path.slice(root.label.length + 1);
      const entry = (root.treeEntries || []).find((item) => item.path === innerPath);
      if (!entry) return;
      root.currentFolderPath = innerPath;
      if (root.openNode) {
        await root.openNode(entry, innerPath);
      } else {
        const edited = root.folderEdits?.get(innerPath);
        state._skipDiscardGuard = true;
        state._skipSidebarRoot = true;
        await loadIntake(edited != null ? intakeFromText(edited, innerPath.split('/').pop()) : entry.intake);
      }
      state.currentFolderPath = root.kind === 'file' ? null : innerPath;
      root.currentFolderPath = state.currentFolderPath;
      renderSidebarRoots(root, innerPath);
    },
    onMove: (srcPath, destFolderPath) => {
      const root = rootForPath(srcPath);
      if (!root?.onMove) return;
      const src = srcPath.slice(root.label.length + 1);
      const dest = destFolderPath && destFolderPath.startsWith(root.label + '/')
        ? destFolderPath.slice(root.label.length + 1)
        : '';
      activateSidebarRoot(root);
      root.onMove(src, dest);
      root.treeEntries = state.treeEntries || root.treeEntries;
      renderSidebarRoots(root, state.currentFolderPath);
    },
    initialOpenDepth: Infinity,
  });
  const activePath = activeInnerPath || active.currentFolderPath || (active.treeEntries || [])[0]?.path;
  if (activePath) {
    let full;
    if (active.kind === 'file') {
      // A split-GIF child frame highlights at label/<frame>; the GIF itself at label.
      const isChild = (active.childEntries || []).some((c) => c.name === activePath);
      full = isChild ? active.label + '/' + activePath : active.label;
    } else {
      full = active.label + '/' + activePath;
    }
    state.treeApi.setActive(full);
  }
  for (const root of list) {
    for (const [path, text] of root.folderEdits || []) {
      if (text == null) continue;
      state.treeApi.setEdited(root.kind === 'file' ? root.label : root.label + '/' + path, true);
    }
  }
  for (const dest of state.folderMoves?.values?.() || []) {
    state.treeApi.setMoved(active.label + '/' + dest, dest);
  }
  $('treeBtn').hidden = false;
  $('ftRemoveRootBtn').hidden = false;
  $('ftExpandBtn').hidden = false;
  $('ftCollapseBtn').hidden = false;
  setSidebar(true);
}

export function addFileRoot(intake) {
  if (!intake || state._skipSidebarRoot) return;
  const label = uniqueLabel(intake.filename || 'File');
  const root = {
    id: 'r' + nextId++,
    kind: 'file',
    label,
    title: 'Opened file: ' + label,
    treeEntries: [{
      path: label,
      file: fileFromIntake(intake),
      intake,
    }],
  };
  roots().push(root);
  renderSidebarRoots(root, label, { skipCapture: true });
}

// Make the ACTIVE single-file root (an open GIF) ACT LIKE a folder WITHOUT ceasing to be a
// file: its own sidebar row stays clickable (opens the running GIF) and gains an expand
// arrow that reveals `entries` ({ name, size }) — the frame PNGs — underneath it, each opened
// lazily via getIntake(innerPath). No new sidebar item, no folder-export. Returns false if the
// active root isn't a standalone file (e.g. it's inside a real folder/archive) so the caller
// can fall back. Used by the GIF viewer's "Split frames".
export function expandActiveFileRootToFolder({ entries, getIntake }) {
  const root = roots().find((item) => item.id === state.activeSidebarRootId);
  if (!root || root.kind !== 'file' || !entries?.length || !loadIntake) return false;
  root.childEntries = entries.map((e) => ({ name: e.name, size: Number(e.size) || 0 }));
  root.getChildIntake = (innerPath) => getIntake(innerPath);
  renderSidebarRoots(root, null, { skipCapture: true });
  return true;
}

export function addFolderRoot({ label, entries, git = false, openNode = null, alreadyCaptured = false }) {
  if (!alreadyCaptured) captureActiveSidebarRoot();
  const rootLabel = uniqueLabel(label || 'Folder');
  const prefix = rootLabel + '/';
  const normalizedEntries = (entries || []).map((entry) => {
    if (!entry.path?.startsWith(prefix)) return entry;
    const originalPath = entry.originalPath || entry.path;
    return {
      ...entry,
      path: entry.path.slice(prefix.length),
      originalPath: originalPath.startsWith(prefix) ? originalPath.slice(prefix.length) : originalPath,
    };
  });
  const root = {
    id: 'r' + nextId++,
    kind: 'folder',
    label: rootLabel,
    title: label || 'Folder',
    git,
    treeEntries: normalizedEntries,
    folderEdits: new Map(),
    folderMoves: new Map(),
    openNode,
  };
  roots().push(root);
  renderSidebarRoots(root, null, { skipCapture: alreadyCaptured });
  return root;
}

export function addArchiveRoot({ label, entries, openNode, archiveIntake, alreadyCaptured = false }) {
  if (!alreadyCaptured) captureActiveSidebarRoot();
  const root = {
    id: 'r' + nextId++,
    kind: 'archive',
    label: uniqueLabel(label || 'Archive'),
    title: 'Archive: ' + (label || 'Archive'),
    treeEntries: entries || [],
    folderEdits: new Map(),
    folderMoves: new Map(),
    binaryEdits: new Map(),
    archiveDeletes: new Set(),
    archiveIntake,
    openNode,
  };
  roots().push(root);
  renderSidebarRoots(root, null, { skipCapture: alreadyCaptured });
  return root;
}
