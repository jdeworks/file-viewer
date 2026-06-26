// Archive listing: read the zip's central directory and show every entry with its size,
// packed size, and date. Non-encrypted entries use JSZip for fast extraction. Legacy
// ZipCrypto entries can be unlocked locally through libarchive; AES-encrypted ZIP entries
// are shown as unsupported instead of advertising a password field that cannot help.
import { readZip, fmtSize, encryptedNames, listCentralDirectory, extractEntry, extractEncryptedEntry, verifyZipCryptoPassword, verifyZipCryptoPasswordFull } from './ziplib.js';
import { intakeFromBytes } from '../../core/intake.js';
import { loadTemplate, fill, esc, fillEach } from '../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

const usize = (f) => (f._data ? f._data.uncompressedSize : f.uncompressedSize);
const csize = (f) => (f._data ? f._data.compressedSize : f.compressedSize);
const DEFAULT_GUESS_RATE = 50000;
const BRUTE_SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*_-+=.?',
};

const delayFrame = () => new Promise((resolve) => setTimeout(resolve, 0));
const PROGRESS_UPDATE_MS = 500;
const LOOP_YIELD_EVERY = 5000;

function formatCount(n) {
  if (typeof n === 'bigint') {
    if (n < 1000000n) return String(n);
    if (n < 1000000000n) return (Number(n) / 1000000).toFixed(1) + 'M';
    if (n < 1000000000000n) return (Number(n) / 1000000000).toFixed(1) + 'B';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return String(n);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  if (seconds < 1) return '<1s';
  if (seconds < 60) return Math.ceil(seconds) + 's';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'm';
  if (seconds < 86400) return Math.ceil(seconds / 3600) + 'h';
  if (seconds < 31536000) return Math.ceil(seconds / 86400) + 'd';
  return Math.ceil(seconds / 31536000) + 'y';
}

function bruteCount(charsetSize, minLen, maxLen) {
  if (!charsetSize || minLen < 1 || maxLen < minLen) return 0n;
  let total = 0n;
  const base = BigInt(charsetSize);
  let pow = 1n;
  for (let len = 1; len <= maxLen; len++) {
    pow *= base;
    if (len >= minLen) total += pow;
  }
  return total;
}

function* bruteCandidates(chars, minLen, maxLen) {
  for (let len = minLen; len <= maxLen; len++) {
    const idx = new Array(len).fill(0);
    while (true) {
      yield idx.map((i) => chars[i]).join('');
      let pos = len - 1;
      while (pos >= 0) {
        idx[pos]++;
        if (idx[pos] < chars.length) break;
        idx[pos] = 0;
        pos--;
      }
      if (pos < 0) break;
    }
  }
}

function encryptionSets(files) {
  const supported = new Set();
  const unsupported = new Set();
  for (const f of files) {
    if (!f.encrypted) continue;
    if (f.encryption === 'zipcrypto') supported.add(f.name);
    else unsupported.add(f.name);
  }
  return { supported, unsupported };
}

export async function render(intake, ctx = {}) {
  const [docTpl, rowTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(ROW)]);
  const cd = listCentralDirectory(intake.bytes);

  let z, encrypted, canOpen = false;
  try {
    z = await readZip(intake);
    encrypted = encryptedNames(intake.bytes);
    canOpen = true;
  } catch (e) {
    if (!cd || !cd.files.length) {
      return { bodyHtml: '<div class="json-error"><strong>Could not read archive</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false };
    }
    z = cd;
    encrypted = cd.encrypted;
  }

  const files = z.files || [];
  const fileMeta = cd?.files?.length ? cd.files : files;
  const byName = new Map(fileMeta.map((f) => [f.name, f]));
  const { supported, unsupported } = encryptionSets(fileMeta);
  const hasEncrypted = encrypted.size > 0;
  const hasSupportedEncrypted = supported.size > 0;
  const hasUnsupportedEncrypted = unsupported.size > 0;
  let zipPassword = null;
  let passwordWaiter = null;
  const testName = supported.values().next().value;
  const testEntry = byName.get(testName);

  async function openEntry(name, promptHost = null) {
    if (!name) return null;
    const meta = byName.get(name);
    if (unsupported.has(name)) return null;
    if (supported.has(name)) {
      const password = await ensurePassword(promptHost);
      if (password == null) return null;
      const bytes = await extractEncryptedEntry(intake, name, password);
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    if (canOpen) {
      const bytes = await extractEntry(z.zip, name);
      if (!bytes) return null;
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    // JSZip can reject a mixed encrypted archive as a whole. libarchive can still open the
    // clear entries without a passphrase, so keep those rows usable.
    if (meta && !meta.encrypted) {
      const bytes = await extractEncryptedEntry(intake, name, null);
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    return null;
  }

  async function ensurePassword(promptHost) {
    if (zipPassword != null) return zipPassword;
    if (passwordWaiter) return passwordWaiter;
    const host = promptHost || document.createElement('div');
    passwordWaiter = new Promise((resolve) => {
      const controller = new AbortController();
      let error = '';
      let status = '';
      let running = false;
      let stopRequested = false;
      let candidateText = '';
      let minLen = 1;
      let maxLen = 4;
      let setState = { lower: true, upper: false, digits: true, symbols: false };
      let openCandidates = false;
      let openBrute = false;
      let rate = DEFAULT_GUESS_RATE;
      let attempts = 0;
      let totalAttempts = 0n;
      let runStarted = 0;
      let runMode = 'manual';
      let nextProgressAt = 0;
      let lastProgressAt = 0;
      let lastProgressAttempts = 0;
      let currentRate = DEFAULT_GUESS_RATE;

      function finish(password) {
        controller.abort();
        resolve(password);
      }

      function selectedChars() {
        return Object.entries(setState).map(([key, enabled]) => enabled ? BRUTE_SETS[key] : '').join('');
      }

      function estimateText() {
        const chars = selectedChars();
        const count = bruteCount(chars.length, minLen, maxLen);
        const seconds = Number(count > 1000000000000000n ? 1000000000000000n : count) / Math.max(rate, 0.1);
        return formatCount(count) + ' candidates at ~' + rate.toFixed(rate < 10 ? 1 : 0) + '/s, about ' + formatDuration(seconds);
      }

      function readForm() {
        const candidates = host.querySelector('#zipCandidates');
        if (candidates) candidateText = candidates.value;
        const min = host.querySelector('#zipMinLen');
        const max = host.querySelector('#zipMaxLen');
        minLen = Math.max(1, Math.min(10, Number(min?.value || minLen) || 1));
        maxLen = Math.max(minLen, Math.min(10, Number(max?.value || maxLen) || minLen));
        for (const key of Object.keys(setState)) {
          const cb = host.querySelector('[data-zip-set="' + key + '"]');
          if (cb) setState[key] = cb.checked;
        }
        const candidatesPanel = host.querySelector('[data-zip-panel="candidates"]');
        const brutePanel = host.querySelector('[data-zip-panel="brute"]');
        if (candidatesPanel) openCandidates = candidatesPanel.open;
        if (brutePanel) openBrute = brutePanel.open;
      }

      function renderUnlock() {
        const charset = selectedChars();
        const disabled = running ? ' disabled' : '';
        const errorHtml = error ? '<div class="pw-error">' + esc(error) + '</div>' : '';
        const progressValue = totalAttempts > 0n
          ? Math.max(0, Math.min(100, Math.floor((attempts / Number(totalAttempts > 1000000000n ? 1000000000n : totalAttempts)) * 100)))
          : 0;
        const progressHtml = running ? `
          <div class="zip-progress-wrap">
            <div class="zip-spinner" aria-hidden="true"></div>
            <div class="zip-progress-meta">
              <progress class="zip-progress" value="${progressValue}" max="100"></progress>
              <div id="zipProgressCount">${formatCount(BigInt(attempts))}${totalAttempts ? ' / ' + formatCount(totalAttempts) : ''} attempts</div>
              <div id="zipProgressRate">${formatCount(Math.round(currentRate))}/s current, ${formatCount(Math.round(rate))}/s average</div>
            </div>
          </div>` : '';
        host.innerHTML = `
          <div class="zip-unlock">
            <div class="pw-icon">🔒</div>
            <div class="pw-title">Password protected</div>
            <div class="pw-sub">${esc(intake.filename || 'archive.zip')} has ${supported.size} ZipCrypto-protected entr${supported.size === 1 ? 'y' : 'ies'}.</div>
            <div class="pw-hint">Passwords are tried locally in this browser. AES-encrypted ZIP entries are not offered here.</div>
            ${errorHtml}
            <div class="pw-field">
              <input type="password" id="zipPwInput" class="pw-input" placeholder="Enter password" autocomplete="current-password"${disabled} />
            </div>
            <div class="pw-actions">
              <button type="button" class="pw-btn-primary" data-zip-act="manual"${disabled}>Unlock</button>
              <button type="button" class="pw-btn-secondary" data-zip-act="cancel"${disabled}>Cancel</button>
            </div>
            <details class="zip-guess" data-zip-panel="candidates"${openCandidates ? ' open' : ''}>
              <summary>Candidate list</summary>
              <textarea id="zipCandidates" class="zip-candidates" placeholder="one password per line"${disabled}>${esc(candidateText)}</textarea>
              <div class="zip-guess-row">
                <button type="button" class="pw-btn-secondary" data-zip-act="candidates"${disabled}>Try list</button>
                <span id="zipCandidateCount">${candidateText.split(/\r?\n/).filter((line) => line.trim()).length || 0} candidates</span>
              </div>
            </details>
            <details class="zip-guess" data-zip-panel="brute"${openBrute ? ' open' : ''}>
              <summary>Brute force</summary>
              <div class="zip-set-grid">
                ${Object.keys(BRUTE_SETS).map((key) => `<label><input type="checkbox" data-zip-set="${key}"${setState[key] ? ' checked' : ''}${disabled}> ${key}</label>`).join('')}
              </div>
              <div class="zip-guess-row">
                <label>Min <input id="zipMinLen" class="zip-len" type="number" min="1" max="10" value="${minLen}"${disabled}></label>
                <label>Max <input id="zipMaxLen" class="zip-len" type="number" min="1" max="10" value="${maxLen}"${disabled}></label>
              </div>
              <div class="zip-estimate">${charset ? estimateText() : 'Select at least one character set.'}</div>
              <div class="zip-guess-row">
                <button type="button" class="pw-btn-secondary" data-zip-act="brute"${disabled || !charset ? ' disabled' : ''}>Start brute force</button>
                <button type="button" class="pw-btn-secondary" data-zip-act="stop"${running ? '' : ' disabled'}>Stop</button>
              </div>
            </details>
            ${progressHtml}
            <div class="zip-guess-status" id="zipGuessStatus" ${status ? '' : 'hidden'}>${esc(status)}</div>
          </div>`;
        host.querySelector('#zipPwInput')?.focus();
      }

      function progressPercent() {
        if (totalAttempts <= 0n) return 0;
        const cappedTotal = Number(totalAttempts > 1000000000n ? 1000000000n : totalAttempts);
        return Math.max(0, Math.min(100, Math.floor((attempts / cappedTotal) * 100)));
      }

      function updateProgress({ force = false } = {}) {
        const now = performance.now();
        if (!force && now < nextProgressAt) return;
        nextProgressAt = now + PROGRESS_UPDATE_MS;
        if (lastProgressAt > 0 && now > lastProgressAt) {
          currentRate = (attempts - lastProgressAttempts) / ((now - lastProgressAt) / 1000);
        }
        lastProgressAt = now;
        lastProgressAttempts = attempts;
        const elapsed = Math.max(0.001, (now - runStarted) / 1000);
        rate = attempts / elapsed;
        const progress = host.querySelector('.zip-progress');
        if (progress) progress.value = progressPercent();
        const count = host.querySelector('#zipProgressCount');
        if (count) count.textContent = formatCount(BigInt(attempts)) + (totalAttempts ? ' / ' + formatCount(totalAttempts) : '') + ' attempts';
        const rateEl = host.querySelector('#zipProgressRate');
        if (rateEl) rateEl.textContent = formatCount(Math.round(currentRate)) + '/s current, ' + formatCount(Math.round(rate)) + '/s average';
        const statusEl = host.querySelector('#zipGuessStatus');
        if (statusEl) {
          statusEl.textContent = status;
          statusEl.hidden = !status;
        }
      }

      async function tryPassword(password) {
        if (testEntry && !(await verifyZipCryptoPasswordFull(intake.bytes, testEntry, password))) {
          throw new Error('zipcrypto verifier rejected password');
        }
        await extractEncryptedEntry(intake, testName, password);
        zipPassword = password;
        const elapsedMs = performance.now() - runStarted;
        rate = attempts / Math.max(0.001, elapsedMs / 1000);
        const elapsed = formatDuration(elapsedMs / 1000);
        const msg = 'ZIP password found: ' + password + ' (' + attempts + ' attempt' + (attempts === 1 ? '' : 's') + ', ' + elapsed + ')';
        ctx.toast?.(msg, 10000);
        console.log('[file-viewer] ZIP password found', {
          archive: intake.filename || 'archive.zip',
          entry: testName,
          mode: runMode,
          password,
          attempts,
          durationMs: Math.round(elapsedMs),
          attemptsPerSecond: Math.round(rate),
        });
        renderListing(host);
        finish(zipPassword);
      }

      async function runOne(password) {
        attempts++;
        try {
          if (testEntry && !verifyZipCryptoPassword(intake.bytes, testEntry, password)) {
            const elapsed = Math.max(0.001, (performance.now() - runStarted) / 1000);
            rate = attempts / elapsed;
            return false;
          }
          await tryPassword(password);
          return true;
        } catch {
          const elapsed = Math.max(0.001, (performance.now() - runStarted) / 1000);
          rate = attempts / elapsed;
          return false;
        }
      }

      async function runCandidates(list) {
        running = true;
        runMode = 'candidate-list';
        stopRequested = false;
        error = '';
        attempts = 0;
        totalAttempts = BigInt(list.length);
        runStarted = performance.now();
        nextProgressAt = 0;
        lastProgressAt = 0;
        lastProgressAttempts = 0;
        currentRate = rate;
        renderUnlock();
        for (const password of list) {
          if (stopRequested) break;
          status = 'Trying candidate ' + (attempts + 1) + '...';
          updateProgress();
          if (await runOne(password)) return;
          if (attempts % Math.min(10, LOOP_YIELD_EVERY) === 0) await delayFrame();
        }
        running = false;
        status = stopRequested ? 'Stopped after ' + attempts + ' attempts.' : 'No match after ' + attempts + ' attempts.';
        error = stopRequested ? '' : 'No candidate matched this ZIP password.';
        renderUnlock();
      }

      async function runBruteForce() {
        const chars = selectedChars();
        if (!chars) {
          error = 'Select at least one character set.';
          renderUnlock();
          return;
        }
        running = true;
        runMode = 'brute-force';
        stopRequested = false;
        error = '';
        attempts = 0;
        totalAttempts = bruteCount(chars.length, minLen, maxLen);
        runStarted = performance.now();
        nextProgressAt = 0;
        lastProgressAt = 0;
        lastProgressAttempts = 0;
        currentRate = rate;
        renderUnlock();
        for (const password of bruteCandidates(chars, minLen, maxLen)) {
          if (stopRequested) break;
          if (attempts % LOOP_YIELD_EVERY === 0) {
            const remaining = Number(totalAttempts > 1000000000000000n ? 1000000000000000n : totalAttempts) - attempts;
            status = 'Trying ' + password + ' (' + attempts + '/' + formatCount(totalAttempts) + '), about ' + formatDuration(remaining / Math.max(rate, 0.1)) + ' left.';
            updateProgress();
            await delayFrame();
          }
          attempts++;
          if (testEntry && !verifyZipCryptoPassword(intake.bytes, testEntry, password)) continue;
          try {
            await tryPassword(password);
            return;
          } catch {
            const elapsed = Math.max(0.001, (performance.now() - runStarted) / 1000);
            rate = attempts / elapsed;
          }
        }
        running = false;
        status = stopRequested ? 'Stopped after ' + attempts + ' attempts.' : 'No match after ' + attempts + ' attempts.';
        error = stopRequested ? '' : 'Brute force finished without finding the password.';
        renderUnlock();
      }

      host.addEventListener('click', (event) => {
        const action = event.target.closest?.('[data-zip-act]')?.getAttribute('data-zip-act');
        if (!action) return;
        readForm();
        if (action === 'cancel') {
          renderListing(host);
          finish(null);
        } else if (action === 'manual') {
          const input = host.querySelector('#zipPwInput');
          const password = input?.value || '';
          if (!password) return;
          running = true;
          runMode = 'manual';
          status = 'Checking password...';
          error = '';
          attempts = 0;
          totalAttempts = 1n;
          runStarted = performance.now();
          renderUnlock();
          runOne(password).then((ok) => {
            if (ok) return;
            running = false;
            status = '';
            error = 'Wrong password, or this ZIP uses an unsupported encrypted variant.';
            renderUnlock();
          });
        } else if (action === 'candidates') {
          openCandidates = true;
          const list = candidateText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
          if (!list.length) {
            error = 'Add at least one candidate password.';
            renderUnlock();
            return;
          }
          runCandidates(list);
        } else if (action === 'brute') {
          openBrute = true;
          runBruteForce();
        } else if (action === 'stop') {
          stopRequested = true;
        }
      }, { signal: controller.signal });
      host.addEventListener('input', (event) => {
        if (!event.target.closest?.('.zip-guess')) return;
        if (event.target.id === 'zipCandidates') {
          candidateText = event.target.value;
          const count = candidateText.split(/\r?\n/).filter((line) => line.trim()).length;
          const countEl = host.querySelector('#zipCandidateCount');
          if (countEl) countEl.textContent = count + ' candidates';
          return;
        }
        readForm();
        renderUnlock();
      }, { signal: controller.signal });
      host.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.target.id !== 'zipPwInput') return;
        event.preventDefault();
        host.querySelector('[data-zip-act="manual"]')?.click();
      }, { signal: controller.signal });

      renderUnlock();
    }).finally(() => {
      passwordWaiter = null;
    });
    const password = await passwordWaiter;
    return password;
  }

  function bannerHtml() {
    const parts = [];
    if (hasSupportedEncrypted) {
      parts.push(supported.size + ' password-protected entr' + (supported.size === 1 ? 'y can' : 'ies can') + ' be unlocked locally.');
    }
    if (hasUnsupportedEncrypted) {
      parts.push(unsupported.size + ' AES-encrypted entr' + (unsupported.size === 1 ? 'y is' : 'ies are') + ' not supported by this viewer.');
    }
    return parts.length ? '<div class="zip-locked">' + esc(parts.join(' ')) + '</div>' : '';
  }

  function renderRows() {
    return fillEach(rowTpl, files.slice().sort((a, b) => a.name.localeCompare(b.name)), (f) => {
      const meta = byName.get(f.name) || f;
      const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
      const locked = encrypted.has(f.name);
      const isUnsupported = unsupported.has(f.name);
      const lockTitle = isUnsupported
        ? 'AES-encrypted ZIP entry — not supported'
        : (supported.has(f.name) && zipPassword == null ? 'Password protected — click to unlock' : 'Password protected');
      const lock = locked ? ' <span class="z-lock" title="' + esc(lockTitle) + '">🔒</span>' : '';
      const open = !isUnsupported && (!locked || supported.has(f.name));
      const title = supported.has(f.name) && zipPassword == null ? 'Unlock and open this file' : 'Open this file';
      const nameCell = open
        ? '<td class="z-name z-open" data-fv-open="' + esc(f.name) + '" title="' + esc(title) + '">' + esc(f.name) + lock + '</td>'
        : '<td class="z-name">' + esc(f.name) + lock + '</td>';
      return { nameCell, usize: fmtSize(usize(meta)), csize: fmtSize(csize(meta)), date };
    });
  }

  function renderListing(host) {
    const hint = files.length ? '<div class="zip-hint">Click a file name to open it.</div>' : '';
    const meta = files.length + ' files · ' + (z.folders?.length || 0) + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
      + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');
    host.innerHTML = fill(docTpl, { banner: bannerHtml(), meta, hint, rows: renderRows() });
  }

  const archiveTree = {
    rootName: intake.filename || 'Archive',
    entries: files.map((f) => {
      const meta = byName.get(f.name) || f;
      return {
        name: f.name,
        size: usize(meta),
        encrypted: unsupported.has(f.name),
        dir: !!f.dir,
      };
    }),
  };

  if (hasEncrypted) {
    const host = document.createElement('div');
    host.className = 'zip-live-host';
    host.style.cssText = 'height:100%;display:flex;flex-direction:column;';
    renderListing(host);
    host.addEventListener('click', async (event) => {
      const cell = event.target.closest?.('[data-fv-open]');
      if (!cell || !host.contains(cell)) return;
      const name = cell.getAttribute('data-fv-open');
      try {
        const inner = await openEntry(name, host);
        if (!inner) {
          ctx.toast?.('Could not open ' + name);
          return;
        }
        await ctx.openIntake?.(inner, name);
      } catch {
        ctx.toast?.('Could not open ' + name);
      }
    });
    return { parentNode: host, hadUnsafe: false, openEntry: (name) => openEntry(name, host), archiveTree };
  }

  const rows = renderRows();
  const hint = canOpen ? '<div class="zip-hint">Click a file name to open it.</div>' : '';
  const meta = files.length + ' files · ' + (z.folders?.length || 0) + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
    + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');

  return { bodyHtml: fill(docTpl, { banner: '', meta, hint, rows }), hadUnsafe: false, openEntry, archiveTree: canOpen ? archiveTree : null };
}
