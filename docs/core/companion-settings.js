// Companion settings panel (rendered into the ⋯ settings sheet): enable toggle + connection test,
// session token, watched-folder CRUD (with a huge/system-path warning), an activity-log viewer, and
// the trust/download panel. Split out of companion-ui.js to keep each file under the LOC cap; the
// mutable companion state still lives in companion-ui.js and is read/written via its accessors.
import { toast } from './state.js';
import {
  detectCompanion, isEnabled as companionEnabled, setEnabled as setCompanionEnabled,
  getToken, setToken, getWatchedPaths, addWatchedPath, removeWatchedPath, pickFolder, getLogs, isMobileDevice,
} from './companion.js';
import { isCompanionAvailable, setCompanionAvailable, syncSaveBtn, stopWatching, showCompanionIndicator, updateConnButton } from './companion-ui.js';

// Heuristic guard: flag watched folders that are a whole drive / system root / very large tree.
// Watching one forces a recursive scan on every find/save and exposes a lot of files. Returns a
// short human phrase describing the risk, or null if the path looks fine. Handles both separators.
export function looksLikeRiskyPath(p) {
  const raw = (p || '').trim();
  if (raw === '/' || raw === '\\') return 'the filesystem root';
  const s = raw.replace(/\\/g, '/').replace(/\/+$/, '');
  const lower = s.toLowerCase();
  if (lower === '') return 'the filesystem root';
  if (/^[a-z]:$/.test(lower)) return 'an entire drive';                                  // C:
  const exact = new Set([
    '/home', '/users', '/usr', '/etc', '/var', '/bin', '/sbin', '/opt', '/lib', '/lib64',
    '/system', '/library', '/mnt', '/mnt/c', '/media', '/dev', '/proc', '/sys', '/root', '/boot',
    'c:/windows', 'c:/users', 'c:/program files', 'c:/program files (x86)', 'c:/programdata',
  ]);
  if (exact.has(lower)) return 'a system or very large folder';
  if (/^[a-z]:\/(windows|program files|program files \(x86\)|programdata)(\/|$)/.test(lower)) return 'a Windows system folder';
  return null;
}

// The companion is an opt-in LOCAL server — a meaningful change from the browser-only model — so
// the download is gated behind this informational panel: what it does, exactly what network access
// it opens, every endpoint and what flows through it, the source link, and a checksum reminder,
// and ONLY THEN the download link. (Transparency requirement; mirrors companion/README.md.)
const COMPANION_ENDPOINTS = [
  ['GET /ping', 'nothing sent; version + capabilities back'],
  ['GET /watched-paths', 'nothing sent; your configured folder paths back'],
  ['POST/DELETE /watched-paths', 'a folder path to add/remove'],
  ['GET /find-file', 'filename + size (no content); matching absolute paths back'],
  ['GET /find-folder', 'a relative path; matching root folders back'],
  ['GET /file', 'an absolute path; file bytes back'],
  ['POST /file', 'an absolute path + new bytes (save-back / create)'],
  ['DELETE /file', 'an absolute path (delete on disk)'],
  ['GET /files', 'a folder path; its directory listing back'],
  ['GET /watch', 'an absolute path; change/delete events streamed (SSE)'],
  ['GET /logs', 'optional filters; the companion’s own activity log back'],
  ['POST /path-picker', 'nothing; desktop app shows the native folder dialog, adds the choice'],
];

function appendCompanionDownloadPanel(panel) {
  const info = document.createElement('div');
  info.className = 'companion-download';

  const title = document.createElement('div');
  title.className = 'companion-folders-label';
  title.textContent = 'Get the Companion';

  const description = document.createElement('p');
  description.textContent = 'The Companion is an optional local app that lets this viewer save (and delete) the files you open, back to disk. The viewer works fully without it.';

  // What network access it opens — the key disclosure.
  const net = document.createElement('p');
  net.className = 'companion-net';
  net.innerHTML = 'It runs a local server on <code>127.0.0.1:7700</code> only — never any external network. Requests are CORS-locked to localhost and this site, and every file action is restricted to folders you explicitly add. Mutating actions also require a per-session token.';

  // Endpoint table — exactly what flows through the companion.
  const tableLabel = document.createElement('p');
  tableLabel.className = 'companion-table-label';
  tableLabel.textContent = 'Every request it can make (inspect them in your Network tab):';
  const table = document.createElement('table');
  table.className = 'companion-endpoints';
  for (const [ep, flow] of COMPANION_ENDPOINTS) {
    const tr = document.createElement('tr');
    const tdEp = document.createElement('td');
    tdEp.innerHTML = `<code>${ep}</code>`;
    const tdFlow = document.createElement('td');
    tdFlow.textContent = flow;
    tr.append(tdEp, tdFlow);
    table.appendChild(tr);
  }

  const source = document.createElement('a');
  source.href = 'https://github.com/jdeworks/file-viewer/tree/dev/companion';
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  source.textContent = 'Review the companion source code →';

  const checksum = document.createElement('p');
  checksum.className = 'companion-checksum';
  checksum.textContent = 'Before running a downloaded binary, compare its SHA-256 against the checksum on the release page (or build from source above).';

  // Honest disclosure: builds are unsigned, so AV/SmartScreen may false-positive.
  const signing = document.createElement('p');
  signing.className = 'companion-checksum';
  signing.textContent = 'Builds are unsigned, so antivirus or SmartScreen may flag a fresh binary that opens a local port and touches files (e.g. "IDP.Generic") — a false positive, not malware. Building from source and trusting your own build is the most reliable path.';

  const download = document.createElement('a');
  download.className = 'companion-download-btn';
  download.href = 'https://github.com/jdeworks/file-viewer/releases';
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.textContent = 'Download from GitHub Releases';

  info.append(title, description, net, tableLabel, table, source, checksum, signing, download);
  panel.appendChild(info);
}

// Activity-log viewer — consumes GET /logs with level, free-text, and timestamp filters. Only ever
// fetches while the companion is enabled + available, so a disabled companion stays zero off-origin.
function appendLogsPanel(panel) {
  const wrap = document.createElement('details');
  wrap.className = 'companion-logs';
  const sum = document.createElement('summary');
  sum.textContent = 'Activity log';
  wrap.appendChild(sum);

  const controls = document.createElement('div');
  controls.className = 'companion-logs-controls';
  const levelSel = document.createElement('select');
  levelSel.className = 'companion-logs-level';
  [['info', 'All'], ['warn', 'Warnings +'], ['error', 'Errors only']].forEach(([v, label]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = label; levelSel.appendChild(o);
  });
  const qInput = document.createElement('input');
  qInput.type = 'text'; qInput.placeholder = 'filter text…'; qInput.className = 'companion-logs-q';
  const sinceInput = document.createElement('input');
  sinceInput.type = 'datetime-local'; sinceInput.className = 'companion-logs-since';
  sinceInput.title = 'Only entries at or after this time';
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn small'; refreshBtn.textContent = 'Refresh';
  controls.append(levelSel, qInput, sinceInput, refreshBtn);

  const listEl = document.createElement('div');
  listEl.className = 'companion-logs-list';

  async function load() {
    if (!companionEnabled() || !isCompanionAvailable()) {
      listEl.innerHTML = '<div class="companion-logs-empty">Companion offline — start it to see activity.</div>';
      return;
    }
    listEl.innerHTML = '<div class="companion-logs-empty">Loading…</div>';
    let since;
    if (sinceInput.value) { const d = new Date(sinceInput.value); if (!isNaN(d.getTime())) since = d.toISOString(); }
    let entries;
    try {
      entries = await getLogs({ level: levelSel.value, q: qInput.value.trim() || undefined, since, limit: 500 });
    } catch {
      listEl.innerHTML = '<div class="companion-logs-empty">Could not load logs.</div>';
      return;
    }
    if (!entries || !entries.length) {
      listEl.innerHTML = '<div class="companion-logs-empty">No matching log entries.</div>';
      return;
    }
    listEl.innerHTML = '';
    for (const e of entries.slice().reverse()) {   // newest first
      const row = document.createElement('div');
      row.className = 'companion-logs-row companion-logs-' + (e.level || 'info');
      const ts = document.createElement('span');
      ts.className = 'companion-logs-ts';
      ts.textContent = (e.ts || '').replace('T', ' ').replace(/(\.\d+)?Z$/, '');
      const lv = document.createElement('span');
      lv.className = 'companion-logs-lv';
      lv.textContent = (e.level || '').toUpperCase();
      const msg = document.createElement('span');
      msg.className = 'companion-logs-msg';
      msg.textContent = e.msg || '';
      row.append(ts, lv, msg);
      listEl.appendChild(row);
    }
  }
  refreshBtn.addEventListener('click', load);
  levelSel.addEventListener('change', load);
  sinceInput.addEventListener('change', load);
  qInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); load(); } });
  wrap.addEventListener('toggle', () => { if (wrap.open) load(); });

  wrap.append(controls, listEl);
  panel.appendChild(wrap);
}

export function renderCompanionSettings(container) {
  const old = container.querySelector('.companion-panel');
  if (old) old.remove();

  const panel = document.createElement('details');
  panel.className = 'set-group companion-panel';
  panel.open = true;

  const summary = document.createElement('summary');
  summary.innerHTML = `Companion <span class="companion-status-dot ${isCompanionAvailable() ? 'connected' : ''}">${isCompanionAvailable() ? '● connected' : '○ not found'}</span>`;
  panel.appendChild(summary);

  // Desktop-only: on mobile, show a brief note instead of the controls (the companion can't run).
  if (isMobileDevice()) {
    const note = document.createElement('p');
    note.className = 'companion-net';
    note.textContent = 'The Companion is a desktop-only feature (it runs a local app on your computer). It is not available on phones or tablets.';
    panel.appendChild(note);
    container.prepend(panel);
    return;
  }

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
      setCompanionAvailable(ok);
      document.body.classList.toggle('companion-active', ok);
      summary.innerHTML = `Companion <span class="companion-status-dot ${ok ? 'connected' : ''}">${ok ? '● connected' : '○ not found'}</span>`;
      syncSaveBtn();
      updateConnButton(ok);
      if (ok) showCompanionIndicator();
      else toast('Companion not found — is it running on :7700?');
      if (ok) refreshFolders();
      else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
    } else {
      setCompanionAvailable(false);
      stopWatching();
      document.body.classList.remove('companion-active');
      summary.innerHTML = `Companion <span class="companion-status-dot">○ not found</span>`;
      syncSaveBtn();
      updateConnButton(false);   // hides the topbar indicator (companion now disabled)
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
    setCompanionAvailable(ok);
    document.body.classList.toggle('companion-active', ok);
    summary.innerHTML = `Companion <span class="companion-status-dot ${ok ? 'connected' : ''}">${ok ? '● connected' : '○ not found'}</span>`;
    syncSaveBtn();
    updateConnButton(ok);
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
    // Warn before watching a whole drive / system folder (item 6): the recursive scan it forces on
    // every find/save can be slow and exposes a lot of files.
    const risk = looksLikeRiskyPath(p);
    if (risk && !confirm(`"${p}" looks like ${risk}.\n\nWatching it makes the companion scan it recursively on every file lookup and save, which can be slow and exposes a large number of files. Add it anyway?`)) return;
    try { await addWatchedPath(p); addInput.value = ''; await refreshFolders(); }
    catch (err) { toast('Add failed: ' + err.message); }
  });
  addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } });
  // Native folder picker — works only with the desktop (Tauri) companion; falls back to the typed
  // field on the standalone server.
  const pickBtn = document.createElement('button');
  pickBtn.className = 'btn small';
  pickBtn.textContent = '📁 Pick…';
  pickBtn.title = 'Choose a folder with the native dialog (desktop companion)';
  pickBtn.addEventListener('click', async () => {
    pickBtn.disabled = true;
    try {
      const res = await pickFolder();
      if (res === null) { toast('Native picker needs the desktop companion app — type a path instead.'); return; }
      if (res.ok) {
        await refreshFolders();   // res.ok === false means the user cancelled
        // The native dialog already added it server-side, so warn (don't block) if it's risky.
        const risk = looksLikeRiskyPath(res.chosen || '');
        if (risk) toast(`Heads up: that folder looks like ${risk} — watching it may be slow.`, 5000);
      }
    } catch (err) { toast('Pick failed: ' + err.message); }
    finally { pickBtn.disabled = false; }
  });
  addRow.append(addInput, addBtn, pickBtn);
  panel.appendChild(addRow);

  appendLogsPanel(panel);
  appendCompanionDownloadPanel(panel);

  container.prepend(panel);

  if (isCompanionAvailable()) refreshFolders();
  else foldersList.innerHTML = '<span class="companion-folders-empty">Start the Companion app to manage folders.</span>';
}
