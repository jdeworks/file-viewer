import { intakeFromFile } from './intake.js';
import { layoutTopbar } from './layout.js';
import { $, state, toast, escapeHtml } from './state.js';
import { detectCompanion, findFile, findFolder, saveFile, deleteFile, pickFolder, getToken, setToken, isEnabled as companionEnabled, setEnabled as setCompanionEnabled, getWatchedPaths, addWatchedPath, removeWatchedPath, watchFile } from './companion.js';
import { browseForFolder, joinPath } from './companion-browse.js';
export { renderCompanionSettings } from './companion-settings.js';

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

export async function resolveDroppedFolderRoot(files) {
  if (!companionAvailable || !companionEnabled() || !files || !files.length) return;
  const first = files[0];
  if (!first.webkitRelativePath) return;
  const relPath = first.webkitRelativePath;
  const matches = await findFolder(relPath, first.size, first.lastModified).catch(() => []);
  let root = null;
  if (matches.length === 1) {
    root = matches[0];
  } else if (matches.length > 1) {
    root = await promptFolderRootPicker(matches);
  }
  companionFolderRoot = root;
  if (root) {
    syncSaveBtn();
    const fileHandle = state.intake?.file;
    const currentAbsPath = absolutePathForFile(fileHandle);
    if (currentAbsPath && state.currentFolderPath) startWatching(currentAbsPath);
  }
}

export function absolutePathForFile(file) {
  if (!companionFolderRoot || !file?.webkitRelativePath) return null;
  const relParts = file.webkitRelativePath.split('/');
  const relFromRoot = relParts.slice(1).join('/');
  if (!relFromRoot) return null;
  return `${companionFolderRoot}/${relFromRoot}`;
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
      const fileHandle = state.intake.file;
      absPath = absolutePathForFile(fileHandle);
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
    if (state.currentFolderPath && companionFolderRoot) absPath = absolutePathForFile(state.intake.file);
    if (!absPath) absPath = companionLinkedPath;
    if (!absPath) {
      let matches;
      try { matches = await findFile(filename, size); } catch (err) { toast('Companion: could not search — ' + err.message); return; }
      if (!matches || matches.length === 0) { toast('File not found in watched folders.'); return; }
      absPath = matches.length === 1 ? matches[0] : await pickCompanionPath(matches);
      if (!absPath) return;
    }
    // Destructive — explicit confirm. The file stays open in the viewer and Download still works.
    if (!confirm(`Delete this file from disk?\n\n${absPath}\n\nThis permanently removes the original on disk. The file stays open here and the Download button still works.`)) return;
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

// Poll /ping every 30s so a companion that was closed (or started) mid-session is reflected in the
// UI without a manual "Test connection". Only runs while the companion is ENABLED — so a user who
// hasn't opted in still makes ZERO off-origin requests. Idempotent.
const HEALTH_INTERVAL_MS = 30000;
export function startHealthCheck() {
  if (_healthTimer) return;
  _healthTimer = setInterval(async () => {
    if (!companionEnabled()) return;            // disabled → no fetch (zero off-origin)
    let ok = false;
    try { ok = await detectCompanion(); } catch { ok = false; }
    if (ok === companionAvailable) return;       // unchanged
    companionAvailable = ok;
    document.body.classList.toggle('companion-active', ok);
    if (!ok) { stopWatching(); toast('Companion disconnected — is it still running on :7700?'); }
    else { showCompanionIndicator(); }
    syncSaveBtn();
  }, HEALTH_INTERVAL_MS);
}
export function stopHealthCheck() {
  if (_healthTimer) { clearInterval(_healthTimer); _healthTimer = null; }
}

export function detectCompanionOnStartup() {
  if (!companionEnabled()) return;
  detectCompanion().then((ok) => {
    companionAvailable = ok;
    if (ok) {
      document.body.classList.add('companion-active');
      showCompanionIndicator();
      syncSaveBtn();
    }
    startHealthCheck();   // keep watching liveness whether or not it's up right now
  });
}
