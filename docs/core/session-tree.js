import { intakeFromFile, intakeFromText, sourceTextOf, withSourceText } from './intake.js';
import { buildTree, renderTree } from './filetree.js';
import { $, state } from './state.js';
import { setTree, flushFolderEdit } from './folder.js';
import { addFileRoot } from './sidebar-roots.js';

let loadIntakeCallback = null;

export function initSessionTree({ loadIntake }) {
  loadIntakeCallback = loadIntake;
}

export function updateSessionTree(intake, { skipSidebarRoot = false } = {}) {
  if (state.skipNextFileSidebarRoot) {
    state.skipNextFileSidebarRoot = false;
    return;
  }
  if (!skipSidebarRoot) addFileRoot(intake);
  if (state.sidebarRoots?.length) return;
  if (state.treeEntries && !state.sessionTree) return;

  const alreadyTracked = state.sessionIntakes.has(intake.filename);
  state.sessionIntakes.set(intake.filename, intake);

  if (state.sessionIntakes.size < 2) return;

  if (state.sessionTree && alreadyTracked) {
    state.treeApi?.setActive?.(intake.filename);
    state.treeApi?.setEdited?.(intake.filename, state.sessionEdits.has(intake.filename));
    return;
  }

  const entries = [...state.sessionIntakes.entries()].map(([name, si]) => ({
    file: new File([si.bytes || (si.text != null ? si.text : '')], name),
    path: name,
  }));
  state.treeEntries = entries;
  state.sessionTree = true;
  state.folderMoves = new Map();

  if (state.treeApi) state.treeApi.stop();
  state.treeApi = renderTree($('ftBody'), buildTree(entries), { onOpen: (node) => {
    flushSessionEdit();
    const edited = state.sessionEdits.get(node.path);
    const base = state.sessionIntakes.get(node.path);
    const si = edited != null && base ? withSourceText(base, edited) : base;
    if (!si) return;
    state._skipDiscardGuard = true;
    loadIntakeCallback(si);
  } });
  $('ftRoot').textContent = 'Session';
  $('ftRoot').title = 'Session files';
  $('repoBtn').hidden = true;
  $('ftExportBtn').hidden = true;
  $('ftSearch').hidden = true;
  $('treeBtn').hidden = false;
  setTree(true);
  state.treeApi.setActive(intake.filename);
  for (const path of state.sessionEdits.keys()) state.treeApi.setEdited(path, true);
}

export function flushSessionEdit() {
  if (state.currentFolderPath || !state.rawview?.isDirty()) return false;
  const filename = state.intake?.filename;
  if (!filename || !state.sessionIntakes.has(filename)) return false;
  const text = state.rawview.getValue();
  state.sessionEdits.set(filename, text);
  state.sessionIntakes.set(filename, withSourceText(state.sessionIntakes.get(filename), text));
  state.treeApi?.setEdited?.(filename, true);
  return true;
}

export async function createNewFile() {
  const name = prompt('New file name (include an extension, e.g. notes.md, script.js, data.json):', 'untitled.txt');
  if (name == null) return;
  const filename = (name.trim() || 'untitled.txt');
  let nextIntake = null;
  if (state.type && !$('workspace').hidden) {
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : sourceTextOf(state.intake);
    const prevIntake = state.intake;
    nextIntake = intakeFromText('', filename);
    const prevFile = new File([prevIntake.bytes], prevName, { type: prevIntake.mimeType || 'text/plain' });
    const newFile = new File([nextIntake.bytes], filename, { type: 'text/plain' });
    const entries = [
      { file: prevFile, path: prevName, intake: prevIntake },
      { file: newFile, path: filename, intake: nextIntake },
    ];
    state.sessionTree = false; state.sessionIntakes = new Map(); state.sessionEdits = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderMoves = new Map();
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => {
      const stashed = state.folderEdits.get(node.path);
      const base = node.intake || intakeFromText('', node.path.split('/').pop());
      const intake = stashed != null ? withSourceText(base, stashed) : base;
      state._skipDiscardGuard = true;
      loadIntakeCallback(intake).then(() => { state.currentFolderPath = node.path; });
    } });
    $('ftRoot').textContent = 'New files';
    $('ftRoot').title = 'New files';
    $('repoBtn').hidden = true;
    $('ftExportBtn').hidden = true;
    $('ftSearch').hidden = true;
    $('treeBtn').hidden = false;
    setTree(true);
    state._skipDiscardGuard = true;
  }
  await loadIntakeCallback(nextIntake || intakeFromText('', filename));
  if (state.treeEntries) {
    state.currentFolderPath = filename;
    state.treeApi?.setActive?.(filename);
  }
  requestAnimationFrame(() => state.rawview?.focus?.());
}

export async function onTreeFileDrop(node) {
  if (!node) return;
  if (state.type && !$('workspace').hidden && !state.treeEntries) {
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : sourceTextOf(state.intake);
    const prevIntake = state.intake;
    const prevFileObj = new File([prevIntake.bytes], prevName, { type: prevIntake.mimeType || 'text/plain' });
    const entries = [
      { file: prevFileObj, path: prevName, intake: prevIntake },
      { ...node, file: node.file, path: node.path },
    ];
    state.sessionTree = false; state.sessionIntakes = new Map(); state.sessionEdits = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderMoves = new Map();
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (n) => {
      const stashed = state.folderEdits.get(n.path);
      const getIntake = (n.intake ? Promise.resolve(n.intake) : intakeFromFile(n.file)).then((originalIntake) => (
        stashed != null ? withSourceText(originalIntake, stashed) : originalIntake
      ));
      getIntake.then((i) => { state._skipDiscardGuard = true; loadIntakeCallback(i).then(() => { state.currentFolderPath = n.path; }); });
    } });
    $('ftRoot').textContent = 'Files';
    $('ftRoot').title = 'Files';
    $('repoBtn').hidden = true;
    $('ftExportBtn').hidden = true;
    $('ftSearch').hidden = true;
    $('treeBtn').hidden = false;
    setTree(true);
    state._skipDiscardGuard = true;
  }
  const stashed = state.folderEdits?.get(node.path);
  const originalIntake = node.intake || await intakeFromFile(node.file);
  const intake = stashed != null ? withSourceText(originalIntake, stashed) : originalIntake;
  state._skipDiscardGuard = true;
  await loadIntakeCallback(intake);
  if (state.treeEntries) {
    state.currentFolderPath = node.path;
    state.treeApi?.setActive?.(node.path);
  }
}
