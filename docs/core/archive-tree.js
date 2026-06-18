import { buildTree, renderTree } from './filetree.js';
import { flushFolderEdit, setTree } from './folder.js';
import { intakeFromText } from './intake.js';
import { $, isMobile, state, toast } from './state.js';

export function mountArchiveTree(archive, openEntry, loadIntake) {
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

  state.treeApi?.stop?.();
  state.treeEntries = entries;
  state.folderEdits = new Map();
  state.folderMoves = new Map();
  state.currentFolderPath = null;
  state.sessionTree = false;
  state.archiveTree = true;

  const rootName = archive.rootName || 'Archive';
  $('ftNotice').hidden = true;
  $('ftRoot').textContent = rootName;
  $('ftRoot').title = 'Archive: ' + rootName;
  $('treeBtn').hidden = false;
  $('repoBtn').hidden = true;
  $('ftExportBtn').hidden = true;
  $('ftSearch').hidden = false;
  $('ftSearchInput').value = '';
  $('ftSearchCount').textContent = '';

  async function openArchiveNode(nodeOrPath) {
    const node = typeof nodeOrPath === 'string'
      ? entries.find((entry) => entry.path === nodeOrPath)
      : nodeOrPath;
    if (!node) {
      toast('Could not open ' + nodeOrPath);
      return;
    }
    if (node.encrypted || !openEntry) {
      toast('Password-protected archive entries cannot be opened yet.');
      return;
    }
    try {
      flushFolderEdit();
      const stashed = state.folderEdits.get(node.path);
      const intake = stashed != null
        ? intakeFromText(stashed, node.file.name)
        : await openEntry(node.path);
      if (!intake) {
        toast('Could not open ' + node.path);
        return;
      }
      state._skipDiscardGuard = true;
      await loadIntake(intake);
      state.currentFolderPath = node.path;
      state.treeApi?.setActive?.(node.path);
      if (isMobile()) setTree(false);
    } catch {
      toast('Could not open ' + node.path);
    }
  }

  state.archiveOpenNode = openArchiveNode;
  state.treeApi = renderTree($('ftBody'), buildTree(entries), {
    onOpen: openArchiveNode,
    onMove: null,
  });
  setTree(true);
}

export function clearArchiveTree() {
  if (!state.archiveTree) return;
  state.treeApi?.stop?.();
  state.treeEntries = null;
  state.archiveTree = false;
  state.archiveOpenNode = null;
  setTree(false);
}
