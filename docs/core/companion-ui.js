import { intakeFromFile } from './intake.js';
import { layoutTopbar } from './layout.js';
import { $, state, toast, escapeHtml } from './state.js';
import { detectCompanion, findFile, findFolder, saveFile, deleteFile, pickFolder, getToken, setToken, isEnabled as companionEnabled, setEnabled as setCompanionEnabled, getWatchedPaths, addWatchedPath, removeWatchedPath, watchFile } from './companion.js';
import { browseForFolder, joinPath } from './companion-browse.js';
import { setupFolderRefresh, onFolderRootResolved, onFolderRootCleared, refreshFolderFromDisk } from './companion-folder.js';
export { renderCompanionSettings } from './companion-settings.js';
export { refreshFolderFromDisk } from './companion-folder.js';

let companionAvailable = false;
let companionLinkedPath = null;
let companionFolderRoot = null;
let loadIntakeCallback = null;
let _watchCleanup = null;
let _healthTimer = null;
// Paths we just wrote ourselves → suppress the "changed on disk" banner for our OWN save (the
// watcher fires a modify event for it). Map of absolute path → expiry timestamp (ms).
const _selfSaved = new Map();
const SELF_SAVE_WINDOW_MS = 4000;

function markSelfSaved(absPath) {
  _selfSaved.set(absPath, Date.now() + SELF_SAVE_WINDOW_MS);
}
function wasSelfSaved(absPath) {
  const expiry = _selfSaved.get(absPath);
  if (expiry == null) return false;
  if (Date.now() > expiry) { _selfSaved.delete(absPath); return false; }
  _selfSaved.delete(absPath); // one banner suppressed per save
  return true;
}

export function initCompanionUi({ loadIntake }) {
  loadIntakeCallback = loadIntake;
  setupFolderRefresh({ getFolderRoot: () => companionFolderRoot });
}

export function isCompanionAvailable() {
  return companionAvailable;
}

// Lets the settings module (companion-settings.js) update availability after a manual
// enable/test/toggle without owning the module-level state.
export function setCompanionAvailable(v) {
  companionAvailable = v;
}

export function hasCompanionFolderRoot() {
  return !!companionFolderRoot;
}

export function resetCompanionFolderRoot() {
  companionFolderRoot = null;
  onFolderRootCleared();
}

export function showCompanionIndicator() {
  toast('Companion connected — save files back to disk with 💾', 3500);
}

function promptFolderRootPicker(matches) {
  return new Promise((resolve) => {
    const modal = document.createElement('dialog');
    modal.innerHTML = `
      <h3 style="margin-top:0">Multiple matching folders found</h3>
      <p>Which folder on disk matches the dropped folder?</p>
      <ul style="list-style:none;padding:0;margin:0 0 12px">
        ${matches.map((m, i) => `<li style="margin:4px 0"><button data-idx="${i}" style="width:100%;text-align:left;padding:6px 10px;cursor:pointer">${escapeHtml(m)}</button></li>`).join('')}
      </ul>
      <button class="cancel-btn">Cancel</button>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target.dataset.idx !== undefined) {
        resolve(matches[parseInt(e.target.dataset.idx)]);
        modal.close();
        modal.remove();
      } else if (e.target.classList.contains('cancel-btn')) {
        resolve(null);
        modal.close();
        modal.remove();
      }
    });
    document.body.appendChild(modal);
    modal.showModal();
  });
}

// `entries` is the dropped/picked folder as [{ file, path }] — `path` is the file's path RELATIVE
// to the dropped folder (e.g. "test/folder 2/x.txt"), set for BOTH the entries API (drag-drop) and
// the webkitdirectory picker. We must use it, NOT file.webkitRelativePath, which is EMPTY for
// drag-dropped folders — that was why a dragged folder never resolved a root (no Save/Delete).
export async function resolveDroppedFolderRoot(entries) {
  if (!companionAvailable || !companionEnabled() || !entries || !entries.length) return;
  const first = entries[0];
  const relPath = first.path || first.file?.webkitRelativePath;
  if (!relPath) return;
  const matches = await findFolder(relPath, first.file?.size ?? 0, first.file?.lastModified ?? 0).catch(() => []);
  let root = null;
  if (matches.length === 1) {
    root = matches[0];
  } else if (matches.length > 1) {
    root = await promptFolderRootPicker(matches);
  }
  companionFolderRoot = root;
  if (root) {
    syncSaveBtn();
    onFolderRootResolved();   // reveal the ⟳ Refresh / auto controls + start the folder watch
    const currentAbsPath = absolutePathForFile(state.currentFolderPath);
    if (currentAbsPath && state.currentFolderPath) startWatching(currentAbsPath);
  }
}

// Map a folder file's RELATIVE tree path (state.currentFolderPath / node.path, e.g.
// "test/folder 2/x.txt") to its absolute disk path. The first segment is the dropped folder's own
// name (already part of companionFolderRoot), so drop it. Build with the ROOT's own separator so
// Windows paths stay all-backslash — otherwise the mixed-separator result won't match the watcher's
// native event paths (breaking the change-on-disk banner).
export function absolutePathForFile(relPath) {
  if (!companionFolderRoot || !relPath) return null;
  const relFromRoot = relPath.split('/').slice(1);
  if (!relFromRoot.length) return null;
  const sep = (companionFolderRoot.includes('\\') && !companionFolderRoot.includes('/')) ? '\\' : '/';
  const base = companionFolderRoot.endsWith(sep) ? companionFolderRoot.slice(0, -1) : companionFolderRoot;
  return base + sep + relFromRoot.join(sep);
}

// On opening a single file, silently associate it with its on-disk path when exactly one watched
// file matches (name + size) — searching watched folders recursively, so files in SUBFOLDERS link
// too. This lights up both Save-to-existing and the Delete button without needing a manual save
// first. Zero matches (e.g. a built-in example not on disk) or several → stay unlinked: Delete
// stays hidden and Save will prompt. Fire-and-forget; safe if the user opens another file meanwhile.
export async function tryAutoLink() {
  if (!companionAvailable || !companionEnabled() || !state.intake) return;
  if (state.currentFolderPath || companionLinkedPath) return;  // folder-tree files link via the root
  const { filename, size } = state.intake;
  let matches;
  try { matches = await findFile(filename, size); } catch { return; }
  if (matches && matches.length === 1 && state.intake && state.intake.filename === filename) {
    setCompanionLinked(matches[0]);
    syncSaveBtn();   // reveal the Delete button now that a concrete on-disk file is linked
  }
}

export function setCompanionLinked(absPath) {
  companionLinkedPath = absPath;
  const el = $('companionLinked');
  if (!el) return;
  if (absPath) {
    el.textContent = '📁 ' + absPath;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
  if (absPath && companionAvailable) startWatching(absPath);
  else stopWatching();
}

export function startWatching(absolutePath) {
  stopWatching();
  _watchCleanup = watchFile(absolutePath, (event) => {
    // Don't prompt "changed on disk" for the write WE just made (our save fires a modify event).
    if (event.kind !== 'remove' && wasSelfSaved(absolutePath)) return;
    showReloadBanner(absolutePath, event.kind);
  });
}

export function stopWatching() {
  if (_watchCleanup) { _watchCleanup(); _watchCleanup = null; }
  document.querySelector('.companion-reload-banner')?.remove();
}

async function reloadFromDisk(absolutePath) {
  try {
    const res = await fetch(`http://127.0.0.1:7700/file?path=${encodeURIComponent(absolutePath)}`);
    if (!res.ok) { toast('Reload failed: ' + res.status); return; }
    const blob = await res.blob();
    const file = new File([blob], absolutePath.split('/').pop() || 'file', { type: blob.type });
    const intake = await intakeFromFile(file);
    const savedFolderPath = state.currentFolderPath;
    state._skipDiscardGuard = true;
    await loadIntakeCallback(intake);
    if (savedFolderPath) {
      state.currentFolderPath = savedFolderPath;
      state.treeApi?.setActive?.(savedFolderPath);
      if (companionFolderRoot) startWatching(absolutePath);
    } else {
      setCompanionLinked(absolutePath);
    }
    toast('Reloaded from disk');
  } catch (err) {
    toast('Reload error: ' + err.message);
  }
}

function showReloadBanner(absolutePath, kind) {
  document.querySelector('.companion-reload-banner')?.remove();

  const banner = document.createElement('div');
  banner.className = 'companion-reload-banner';
  const msg = document.createElement('span');
  msg.textContent = kind === 'remove' ? 'File deleted on disk' : 'File changed on disk';
  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'reload-btn';
  reloadBtn.textContent = 'Reload';
  reloadBtn.addEventListener('click', () => { banner.remove(); reloadFromDisk(absolutePath); });
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'dismiss-btn';
  dismissBtn.textContent = '✕';
  dismissBtn.title = 'Dismiss';
  dismissBtn.addEventListener('click', () => banner.remove());
  banner.append(msg, reloadBtn, dismissBtn);
  document.body.prepend(banner);
}

export function syncSaveBtn() {
  const btn = $('saveBtn');
  if (!btn) return;
  const isFolderFile = !!(state.currentFolderPath && state.treeEntries && !state.sessionTree);
  const folderSaveReady = isFolderFile ? !!companionFolderRoot : true;
  const canSaveBinaryEdit = !!(state.binaryEdit?.dirty && typeof state.binaryEdit.getBytes === 'function');
  const show = companionAvailable && !!state.intake && (!state.intake.isBinary || canSaveBinaryEdit) && folderSaveReady;
  btn.hidden = !show;
  // The delete button shows only when a CONCRETE on-disk file is linked (single-file link or a
  // folder file with a resolved root) — so a not-yet-linked file can't be deleted by accident.
  const delBtn = $('deleteBtn');
  if (delBtn) {
    const linked = !!companionLinkedPath || (isFolderFile && !!companionFolderRoot);
    delBtn.hidden = !(companionAvailable && !!state.intake && linked);
  }
  if (show || (delBtn && !delBtn.hidden)) layoutTopbar();
}

export async function onSaveClick() {
  if (!companionAvailable || !state.intake) return;
  const { filename, size } = state.intake;
  $('saveBtn').disabled = true;
  try {
    let absPath = null;
    let isCreate = false;

    if (state.currentFolderPath && companionFolderRoot) {
      absPath = absolutePathForFile(state.currentFolderPath);
    }

    if (!absPath) {
      absPath = companionLinkedPath;
    }
    if (!absPath) {
      let matches;
      try {
        matches = await findFile(filename, size);
      } catch (err) {
        toast('Companion: could not search — ' + err.message);
        return;
      }
      if (!matches || matches.length === 0) {
        // Not on disk yet → offer to CREATE it in a watched folder the user browses to.
        if (!confirm(`Couldn't find "${filename}" in your watched folders.\n\nDo you want to create it as a new file? You'll choose which watched folder to put it in.`)) return;
        const dir = await browseForFolder({ title: `Choose a folder to create "${filename}" in:` });
        if (!dir) return;
        absPath = joinPath(dir, filename);
        isCreate = true;
      } else if (matches.length === 1) {
        absPath = matches[0];
      } else {
        absPath = await pickCompanionPath(matches);
        if (!absPath) return;
      }
    }

    const isBinaryEdit = !!(state.binaryEdit?.dirty && typeof state.binaryEdit.getBytes === 'function');
    const msg = isBinaryEdit
      ? `Overwrite image on disk?\n\n${absPath}\n\nThis replaces the original file with the edited image bytes.`
      : `Save to:\n${absPath}?`;
    // For a freshly-chosen create target the user already confirmed + picked the folder — don't
    // double-prompt.
    if (!isCreate && !confirm(msg)) return;
    const bytes = isBinaryEdit
      ? await state.binaryEdit.getBytes()
      : (state.rawview ? new TextEncoder().encode(state.rawview.getValue()) : (state.intake.bytes || new TextEncoder().encode(state.intake.text || '')));
    try {
      await saveFile(absPath, bytes);
      markSelfSaved(absPath);            // suppress our own "changed on disk" banner
      if (!state.currentFolderPath) setCompanionLinked(absPath);
      if (isBinaryEdit) state.binaryEdit.dirty = false;
      if (state.sessionEdits.has(state.intake.filename)) {
        state.sessionIntakes.set(state.intake.filename, { ...state.sessionIntakes.get(state.intake.filename), text: state.rawview?.getValue?.() || state.sessionEdits.get(state.intake.filename) });
        state.sessionEdits.delete(state.intake.filename);
        state.treeApi?.setEdited?.(state.intake.filename, false);
      }
      // A folder-tree file's edit is stashed in folderEdits keyed by its path — clear it so the
      // saved file no longer counts as unsaved work (hasUnsavedWork checks folderEdits.size).
      if (state.currentFolderPath && state.folderEdits.has(state.currentFolderPath)) {
        state.folderEdits.delete(state.currentFolderPath);
        state.treeApi?.setEdited?.(state.currentFolderPath, false);
      }
      // Adopt the saved content as the editor's clean baseline so isDirty() → false and a page
      // reload / re-open won't falsely warn about unsaved changes.
      state.rawview?.markClean?.();
      state.downloadedSinceEdit = true;
      syncSaveBtn();
      toast((isCreate ? 'Created on disk: ' : 'Saved to disk: ') + absPath);
    } catch (err) {
      toast('Save failed: ' + err.message);
    }
  } finally {
    $('saveBtn').disabled = false;
  }
}

export async function onDeleteClick() {
  if (!companionAvailable || !state.intake) return;
  const { filename, size } = state.intake;
  const btn = $('deleteBtn');
  if (btn) btn.disabled = true;
  try {
    let absPath = null;
    if (state.currentFolderPath && companionFolderRoot) absPath = absolutePathForFile(state.currentFolderPath);
    if (!absPath) absPath = companionLinkedPath;
    if (!absPath) {
      let matches;
      try { matches = await findFile(filename, size); } catch (err) { toast('Companion: could not search — ' + err.message); return; }
      if (!matches || matches.length === 0) { toast('File not found in watched folders.'); return; }
      absPath = matches.length === 1 ? matches[0] : await pickCompanionPath(matches);
      if (!absPath) return;
    }
    // Destructive — explicit confirm. The file stays open in the viewer and Download still works.
    if (!confirm(`Delete "${filename}" from disk?\n\n${absPath}\n\nThis permanently deletes the file and cannot be undone. (It stays open here, so you can still re-download this copy.)`)) return;
    try {
      await deleteFile(absPath);
      setCompanionLinked(null);   // no longer on disk → drop the link + stop watching
      syncSaveBtn();
      toast('Deleted from disk: ' + absPath);
    } catch (err) {
      toast('Delete failed: ' + err.message);
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Delete a file OR folder straight from the tree row — no need to open it first. Resolves the disk
// path from the relative tree path, confirms (permanent + irreversible wording), deletes via the
// companion, then re-syncs the tree from disk.
export async function deleteTreePath({ path, isFolder, name }) {
  if (!companionAvailable || !companionFolderRoot) { toast('Companion folder not linked.'); return; }
  const absPath = absolutePathForFile(path);
  if (!absPath) { toast('Could not resolve that path on disk.'); return; }
  const msg = isFolder
    ? `Delete the folder "${name}" and everything inside it from disk?\n\n${absPath}\n\nThis permanently deletes the folder and all its contents and cannot be undone.`
    : `Delete "${name}" from disk?\n\n${absPath}\n\nThis permanently deletes the file and cannot be undone.`;
  if (!confirm(msg)) return;
  try {
    await deleteFile(absPath);
    if (companionLinkedPath === absPath) setCompanionLinked(null);
    toast((isFolder ? 'Folder deleted: ' : 'Deleted: ') + absPath);
    refreshFolderFromDisk({ silent: true });   // reflect the removal in the sidebar
  } catch (err) {
    toast('Delete failed: ' + err.message);
  }
}

function pickCompanionPath(paths) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;';
    const card = document.createElement('div');
    card.className = 'companion-picker';
    const title = document.createElement('div');
    title.className = 'companion-picker-title';
    title.textContent = 'Multiple matches — choose a file to save:';
    card.appendChild(title);
    for (const p of paths) {
      const btn = document.createElement('button');
      btn.className = 'companion-picker-item';
      btn.textContent = p;
      btn.addEventListener('click', () => { overlay.remove(); resolve(p); });
      card.appendChild(btn);
    }
    const cancel = document.createElement('button');
    cancel.className = 'companion-picker-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { overlay.remove(); resolve(null); });
    card.appendChild(cancel);
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
    document.body.appendChild(overlay);
  });
}

// Poll /ping so a companion closed/started mid-session is reflected without a manual "Test
// connection". To avoid spamming the console with ERR_CONNECTION_REFUSED forever while it's down,
// we back OFF when disconnected (5s → 10s → 30s → 60s) and poll steadily (30s) while connected.
// Only fetches while ENABLED — a user who hasn't opted in still makes ZERO off-origin requests.
const POLL_CONNECTED_MS = 30000;
const BACKOFF_MS = [5000, 10000, 30000, 60000];
let _backoffIdx = 0;

function scheduleHealth(ms) {
  clearTimeout(_healthTimer);
  _healthTimer = setTimeout(healthTick, ms);
}

async function healthTick() {
  _healthTimer = null;
  if (!companionEnabled()) { scheduleHealth(BACKOFF_MS[BACKOFF_MS.length - 1]); return; } // no fetch
  let ok = false;
  try { ok = await detectCompanion(); } catch { ok = false; }
  if (ok !== companionAvailable) {
    companionAvailable = ok;
    document.body.classList.toggle('companion-active', ok);
    if (!ok) { stopWatching(); toast('Companion disconnected — is it still running on :7700?'); }
    else { showCompanionIndicator(); }
    syncSaveBtn();
  }
  updateConnButton(ok);
  if (ok) { _backoffIdx = 0; scheduleHealth(POLL_CONNECTED_MS); }
  else { scheduleHealth(BACKOFF_MS[Math.min(_backoffIdx++, BACKOFF_MS.length - 1)]); }
}

export function startHealthCheck() {
  if (_healthTimer) return;
  _backoffIdx = 0;
  scheduleHealth(companionAvailable ? POLL_CONNECTED_MS : BACKOFF_MS[0]);
}
export function stopHealthCheck() {
  clearTimeout(_healthTimer);
  _healthTimer = null;
}

// Topbar connection indicator: a green dot when the companion is reachable, a red ❗ when it's
// enabled but not reachable (click → retry + guidance to start it). Hidden entirely when the
// companion isn't enabled, so non-users see nothing.
export function updateConnButton(connected) {
  const btn = $('companionStatusBtn');
  if (!btn) return;
  if (!companionEnabled()) { btn.hidden = true; return; }
  btn.hidden = false;
  btn.classList.toggle('conn-up', connected);
  btn.classList.toggle('conn-down', !connected);
  btn.textContent = connected ? '●' : '❗';
  btn.title = connected
    ? 'Companion connected (127.0.0.1:7700)'
    : 'Companion not reachable — click to retry / how to start it';
}

export async function onConnButtonClick() {
  if (!companionEnabled()) return;
  const ok = await detectCompanion();   // retry immediately
  companionAvailable = ok;
  document.body.classList.toggle('companion-active', ok);
  updateConnButton(ok);
  syncSaveBtn();
  if (ok) { _backoffIdx = 0; showCompanionIndicator(); }
  else {
    toast('Companion not reachable. Start it on your PC — the tray app or companion.exe (e.g. in your fv-companion folder) — and it will connect automatically. See ⋯ Settings → Companion to get it.', 9000);
  }
}

export function detectCompanionOnStartup() {
  if (!companionEnabled()) return;
  detectCompanion().then((ok) => {
    companionAvailable = ok;
    document.body.classList.toggle('companion-active', ok);
    if (ok) { showCompanionIndicator(); syncSaveBtn(); }
    updateConnButton(ok);
    startHealthCheck();   // keep watching liveness whether or not it's up right now
  });
}
