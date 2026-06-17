import { intakeFromFile, intakeFromText } from './intake.js';
import { buildTree, renderTree } from './filetree.js';
import { $, state } from './state.js';
import { setTree, flushFolderEdit } from './folder.js';

let loadIntakeCallback = null;

export function initSessionTree({ loadIntake }) {
  loadIntakeCallback = loadIntake;
}

export function updateSessionTree(intake) {
  if (state.treeEntries && !state.sessionTree) return;

  const alreadyTracked = state.sessionIntakes.has(intake.filename);
  state.sessionIntakes.set(intake.filename, intake);

  if (state.sessionIntakes.size < 2) return;

  if (state.sessionTree && alreadyTracked) {
    state.treeApi?.setActive?.(intake.filename);
    return;
  }

  const entries = [...state.sessionIntakes.entries()].map(([name, si]) => ({
    file: new File([si.bytes || (si.text != null ? si.text : '')], name),
    path: name,
  }));
  state.treeEntries = entries;
  state.sessionTree = true;

  if (state.treeApi) state.treeApi.stop();
  state.treeApi = renderTree($('ftBody'), buildTree(entries), { onOpen: (node) => {
    const si = state.sessionIntakes.get(node.path);
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
}

export async function createNewFile() {
  const name = prompt('New file name (include an extension, e.g. notes.md, script.js, data.json):', 'untitled.txt');
  if (name == null) return;
  const filename = (name.trim() || 'untitled.txt');
  if (state.type && !$('workspace').hidden) {
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : (state.intake.text || '');
    const prevFile = new File([prevText], prevName, { type: 'text/plain' });
    const newFile = new File([''], filename, { type: 'text/plain' });
    const entries = [{ file: prevFile, path: prevName }, { file: newFile, path: filename }];
    state.sessionTree = false; state.sessionIntakes = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => {
      const stashed = state.folderEdits.get(node.path);
      const intake = stashed != null
        ? intakeFromText(stashed, node.path.split('/').pop())
        : intakeFromText('', node.path.split('/').pop());
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
  await loadIntakeCallback(intakeFromText('', filename));
  if (state.treeEntries) {
    state.currentFolderPath = filename;
    state.treeApi?.setActive?.(filename);
  }
}

export async function onTreeFileDrop(node) {
  if (!node) return;
  if (state.type && !$('workspace').hidden && !state.treeEntries) {
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : (state.intake.text || '');
    const prevFileObj = new File([prevText], prevName, { type: 'text/plain' });
    const entries = [{ file: prevFileObj, path: prevName }, { file: node.file, path: node.path }];
    state.sessionTree = false; state.sessionIntakes = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (n) => {
      const stashed = state.folderEdits.get(n.path);
      const getIntake = stashed != null
        ? Promise.resolve(intakeFromText(stashed, n.path.split('/').pop()))
        : intakeFromFile(n.file);
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
  const intake = stashed != null
    ? intakeFromText(stashed, node.path.split('/').pop())
    : await intakeFromFile(node.file);
  state._skipDiscardGuard = true;
  await loadIntakeCallback(intake);
  if (state.treeEntries) {
    state.currentFolderPath = node.path;
    state.treeApi?.setActive?.(node.path);
  }
}
