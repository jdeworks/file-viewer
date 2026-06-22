import { intakeFromFile } from './intake.js';
import { layoutTopbar } from './layout.js';
import { $, state, toast, escapeHtml } from './state.js';
import { detectCompanion, findFile, findFolder, saveFile, deleteFile, getToken, setToken, isEnabled as companionEnabled, setEnabled as setCompanionEnabled, getWatchedPaths, addWatchedPath, removeWatchedPath, watchFile } from './companion.js';

let companionAvailable = false;
let companionLinkedPath = null;
let companionFolderRoot = null;
let loadIntakeCallback = null;
let _watchCleanup = null;

export function initCompanionUi({ loadIntake }) {
  loadIntakeCallback = loadIntake;
}

export function isCompanionAvailable() {
  return companionAvailable;
}

export function hasCompanionFolderRoot() {
  return !!companionFolderRoot;
}

export function resetCompanionFolderRoot() {
  companionFolderRoot = null;
}

function showCompanionIndicator() {
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
    showReloadBanner(absolutePath, event.kind);
  });
}

function stopWatching() {
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
        toast('File not found in watched folders. Check Companion settings.');
        return;
      }
      if (matches.length === 1) {
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
    if (!confirm(msg)) return;
    const bytes = isBinaryEdit
      ? await state.binaryEdit.getBytes()
      : (state.rawview ? new TextEncoder().encode(state.rawview.getValue()) : (state.intake.bytes || new TextEncoder().encode(state.intake.text || '')));
    try {
      await saveFile(absPath, bytes);
      if (!state.currentFolderPath) setCompanionLinked(absPath);
      if (isBinaryEdit) state.binaryEdit.dirty = false;
      if (state.sessionEdits.has(state.intake.filename)) {
        state.sessionIntakes.set(state.intake.filename, { ...state.sessionIntakes.get(state.intake.filename), text: state.rawview?.getValue?.() || state.sessionEdits.get(state.intake.filename) });
        state.sessionEdits.delete(state.intake.filename);
        state.treeApi?.setEdited?.(state.intake.filename, false);
      }
      state.downloadedSinceEdit = true;
      syncSaveBtn();
      toast('Saved to disk: ' + absPath);
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

function appendCompanionDownloadPanel(panel) {
  const info = document.createElement('div');
  info.className = 'companion-download';

  const title = document.createElement('div');
  title.className = 'companion-folders-label';
  title.textContent = 'Download Companion';

  const description = document.createElement('p');
  description.textContent = 'The Companion is a local app that lets this viewer save changed files back to disk.';

  const source = document.createElement('a');
  source.href = 'https://github.com/jdeworks/file-viewer/tree/dev/companion';
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  source.textContent = 'View companion source code';

  const checksum = document.createElement('p');
  checksum.textContent = 'Before running a binary, compare its SHA-256 checksum on the release page.';

  const download = document.createElement('a');
  download.href = 'https://github.com/jdeworks/file-viewer/releases';
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.textContent = 'Download from GitHub Releases';

  info.append(title, description, source, checksum, download);
  panel.appendChild(info);
}

export function renderCompanionSettings(container) {
  const old = container.querySelector('.companion-panel');
  if (old) old.remove();

  const panel = document.createElement('details');
  panel.className = 'set-group companion-panel';
  panel.open = true;

  const summary = document.createElement('summary');
  summary.innerHTML = `Companion <span class="companion-status-dot ${companionAvailable ? 'connected' : ''}">${companionAvailable ? '● connected' : '○ not found'}</span>`;
  panel.appendChild(summary);

  const enableRow = document.createElement('div');
  enableRow.className = 'set-row';
  const enableLabel = document.createElement('label');
  enableLabel.textContent = 'Enable companion';
  enableLabel.htmlFor = 'companionEnabledToggle';
  const enableToggle = document.createElement('input');
  enableToggle.type = 'checkbox';
  enableToggle.id = 'companionEnabledToggle';
  enableToggle.checked = companionEnabled();
  enableToggle.addEventListener('change', async () => {
    setCompanionEnabled(enableToggle.checked);
    if (enableToggle.checked) {
      const ok = await detectCompanion();
      companionAvailable = ok;
      document.body.classList.toggle('companion-active', ok);
      summary.innerHTML = `Companion <span class="companion-status-dot ${ok ? 'connected' : ''}">${ok ? '● connected' : '○ not found'}</span>`;
      syncSaveBtn();
      if (ok) showCompanionIndicator();
      else toast('Companion not found — is it running on :7700?');
      if (ok) refreshFolders();
      else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
    } else {
      companionAvailable = false;
      stopWatching();
      document.body.classList.remove('companion-active');
      summary.innerHTML = `Companion <span class="companion-status-dot">○ not found</span>`;
      syncSaveBtn();
    }
  });

  const testBtn = document.createElement('button');
  testBtn.className = 'btn small';
  testBtn.textContent = 'Test connection';
  testBtn.addEventListener('click', async () => {
    if (!companionEnabled()) { toast('Enable companion first.'); return; }
    testBtn.disabled = true;
    const ok = await detectCompanion();
    testBtn.disabled = false;
    companionAvailable = ok;
    document.body.classList.toggle('companion-active', ok);
    summary.innerHTML = `Companion <span class="companion-status-dot ${ok ? 'connected' : ''}">${ok ? '● connected' : '○ not found'}</span>`;
    syncSaveBtn();
    toast(ok ? 'Companion connected ✓' : 'Companion not found — is it running?');
  });

  const enableControls = document.createElement('div');
  enableControls.style.display = 'flex'; enableControls.style.gap = '8px'; enableControls.style.alignItems = 'center';
  enableControls.append(enableToggle, testBtn);
  enableRow.append(enableLabel, enableControls);
  panel.appendChild(enableRow);

  const tokenRow = document.createElement('div');
  tokenRow.className = 'set-row';
  const tokenLabel = document.createElement('label');
  tokenLabel.textContent = 'Token';
  const tokenWrap = document.createElement('div');
  tokenWrap.className = 'companion-token-wrap';
  const tokenEl = document.createElement('input');
  tokenEl.type = 'password';
  tokenEl.className = 'companion-token-input companion-token-reveal';
  tokenEl.placeholder = 'paste token here';
  tokenEl.value = getToken() || '';
  tokenEl.setAttribute('autocomplete', 'off');
  tokenEl.setAttribute('spellcheck', 'false');
  tokenEl.addEventListener('click', () => {
    tokenEl.type = tokenEl.type === 'password' ? 'text' : 'password';
  });
  tokenEl.addEventListener('change', () => setToken(tokenEl.value));
  tokenEl.addEventListener('input', () => setToken(tokenEl.value));
  tokenWrap.appendChild(tokenEl);
  tokenRow.append(tokenLabel, tokenWrap);
  panel.appendChild(tokenRow);

  const foldersLabel = document.createElement('div');
  foldersLabel.className = 'companion-folders-label';
  foldersLabel.textContent = 'Watched folders';
  panel.appendChild(foldersLabel);

  const foldersList = document.createElement('div');
  foldersList.className = 'companion-folders-list';
  panel.appendChild(foldersList);

  async function refreshFolders() {
    foldersList.innerHTML = '<span class="companion-folders-loading">Loading…</span>';
    try {
      const paths = await getWatchedPaths();
      foldersList.innerHTML = '';
      if (!paths || paths.length === 0) {
        foldersList.innerHTML = '<span class="companion-folders-empty">No watched folders.</span>';
      } else {
        for (const p of paths) {
          const row = document.createElement('div');
          row.className = 'companion-folder-row';
          const pathSpan = document.createElement('span');
          pathSpan.className = 'companion-folder-path';
          pathSpan.textContent = p;
          const removeBtn = document.createElement('button');
          removeBtn.className = 'companion-folder-remove';
          removeBtn.textContent = '✕';
          removeBtn.title = 'Remove folder';
          removeBtn.addEventListener('click', async () => {
            try { await removeWatchedPath(p); await refreshFolders(); }
            catch (err) { toast('Remove failed: ' + err.message); }
          });
          row.append(pathSpan, removeBtn);
          foldersList.appendChild(row);
        }
      }
    } catch {
      foldersList.innerHTML = '<span class="companion-folders-empty">Could not load (companion offline?).</span>';
    }
  }

  const addRow = document.createElement('div');
  addRow.className = 'companion-add-row';
  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.className = 'companion-add-input';
  addInput.placeholder = '/absolute/path';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn small';
  addBtn.textContent = '+ Add';
  addBtn.addEventListener('click', async () => {
    const p = addInput.value.trim();
    if (!p) return;
    try { await addWatchedPath(p); addInput.value = ''; await refreshFolders(); }
    catch (err) { toast('Add failed: ' + err.message); }
  });
  addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } });
  addRow.append(addInput, addBtn);
  panel.appendChild(addRow);

  appendCompanionDownloadPanel(panel);

  container.prepend(panel);

  if (companionAvailable) refreshFolders();
  else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
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
  });
}
