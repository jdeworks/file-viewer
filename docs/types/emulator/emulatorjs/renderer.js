// EmulatorJS console ROM renderer.
// Uses the parentNode pattern: returns { parentNode: HTMLElement, revoke() }.

import { EXT_CORE } from './detect.js';

const CORE_NAMES = {
  fceumm: 'NES / Famicom',
  snes9x: 'Super Nintendo (SNES)',
  gambatte: 'Game Boy / GBC',
  mgba: 'Game Boy Advance (GBA)',
  genesis_plus_gx: 'Sega Genesis / Mega Drive',
  stella2014: 'Atari 2600',
};

function getCoreForFile(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return EXT_CORE[ext] || 'fceumm';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// The vendored EmulatorJS core calls `checkForUpdates()` — an unconditional
// `fetch('https://cdn.emulatorjs.org/stable/data/version.json')` — whenever
// `location.hostname` is `localhost`/`127.0.0.1` (its own debug heuristic), regardless of any
// EJS_* config we set. That fires during local dev/testing (this repo's smoke tests run against
// a localhost server) and violates the zero-off-origin-at-runtime rule. There is no public
// EmulatorJS option to disable it, so block just that host at the fetch layer — same-origin and
// blob: requests the emulator needs (core wasm, ROM blob) are untouched.
function installOffOriginGuard() {
  if (window.__ejsFetchGuardInstalled) return;
  window.__ejsFetchGuardInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/^https?:\/\/(cdn|netplay)\.emulatorjs\.org\//i.test(url)) {
      return Promise.reject(new Error('Blocked off-origin request (zero off-origin runtime policy): ' + url));
    }
    return nativeFetch(input, init);
  };
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex', 'flex-direction:column', 'align-items:stretch',
    'min-height:200px', 'padding:24px', 'box-sizing:border-box',
    'background:var(--bg-1,#1e1e1e)', 'color:var(--fg,#ccc)',
    'font-family:var(--font-ui,sans-serif)',
  ].join(';');

  const coreName = getCoreForFile(intake.filename);
  const consoleName = CORE_NAMES[coreName] || 'Console';

  // --- Security warning dialog ---
  const dialog = document.createElement('div');
  dialog.style.cssText = [
    'display:flex', 'flex-direction:column', 'gap:16px',
    'max-width:540px', 'margin:auto',
    'padding:24px', 'border-radius:8px',
    'background:var(--bg-2,#252525)', 'border:1px solid var(--border,#444)',
  ].join(';');

  const heading = document.createElement('div');
  heading.style.cssText = 'font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;';
  heading.innerHTML = '<span style="font-size:20px;">&#9888;</span> Console Emulator (EmulatorJS)';
  dialog.appendChild(heading);

  const systemLine = document.createElement('div');
  systemLine.style.cssText = 'font-size:12px;opacity:0.6;margin-top:-8px;';
  systemLine.textContent = consoleName;
  dialog.appendChild(systemLine);

  const body = document.createElement('p');
  body.style.cssText = 'margin:0;font-size:13px;line-height:1.6;opacity:0.85;';
  body.textContent =
    'Only open ROM files from legally-owned cartridges or trusted sources. ' +
    'Running ROMs you don’t own may be illegal in your country.';
  dialog.appendChild(body);

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

  const btnLoad = document.createElement('button');
  btnLoad.textContent = 'I understand — Start emulator';
  btnLoad.style.cssText = [
    'padding:8px 16px', 'border-radius:5px', 'border:none', 'cursor:pointer',
    'background:var(--accent,#4a8fff)', 'color:#fff', 'font-size:13px', 'font-weight:500',
  ].join(';');

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancel';
  btnCancel.style.cssText = [
    'padding:8px 16px', 'border-radius:5px', 'cursor:pointer',
    'background:transparent', 'border:1px solid var(--border,#444)',
    'color:var(--fg,#ccc)', 'font-size:13px',
  ].join(';');

  buttons.appendChild(btnLoad);
  buttons.appendChild(btnCancel);
  dialog.appendChild(buttons);
  wrap.appendChild(dialog);

  // Blob URL for the ROM — created on demand, revoked on cleanup.
  let blobUrl = null;

  async function startEmulator() {
    // Guard against multiple simultaneous EmulatorJS instances.
    if (window.EJS_emulator) {
      dialog.remove();
      const conflictMsg = document.createElement('div');
      conflictMsg.style.cssText = [
        'display:flex', 'flex-direction:column', 'align-items:center', 'gap:12px',
        'padding:32px', 'text-align:center', 'opacity:0.8', 'font-size:13px',
      ].join(';');
      conflictMsg.textContent =
        'Only one emulator can run at a time — reload the page to start a new ROM.';
      wrap.appendChild(conflictMsg);
      return;
    }

    dialog.remove();

    // Create blob URL from ROM bytes.
    blobUrl = URL.createObjectURL(
      new Blob([intake.bytes.buffer], { type: 'application/octet-stream' })
    );

    // Reset wrap layout for the emulator.
    wrap.style.cssText = [
      'display:flex', 'flex-direction:column', 'flex:1',
      'min-height:400px', 'padding:0', 'box-sizing:border-box',
      'background:#000',
    ].join(';');

    // Create unique container for EmulatorJS.
    const containerId = 'ejs-' + Math.random().toString(36).slice(2, 9);
    const container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = 'width:100%;min-height:400px;flex:1;display:block;';
    wrap.appendChild(container);

    // Set all EJS globals before loading the script.
    window.EJS_player = '#' + containerId;
    window.EJS_core = coreName;
    window.EJS_gameUrl = blobUrl;
    window.EJS_pathtodata = './vendor/emulatorjs/data/';
    window.EJS_language = 'en-US';
    window.EJS_startOnLoaded = true;
    window.EJS_gameName = intake.filename.replace(/\.[^.]+$/, '');

    installOffOriginGuard();

    try {
      await loadScript('./vendor/emulatorjs/data/loader.js');
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:16px;color:var(--fg,#ccc);font-size:13px;background:var(--bg-1,#1e1e1e);';
      errDiv.textContent = 'Failed to load EmulatorJS: ' + e.message;
      container.remove();
      wrap.appendChild(errDiv);
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    }
  }

  btnLoad.addEventListener('click', startEmulator);

  btnCancel.addEventListener('click', () => {
    dialog.remove();

    const msg = document.createElement('div');
    msg.style.cssText = [
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:12px',
      'padding:32px', 'text-align:center', 'opacity:0.8', 'font-size:13px',
    ].join(';');

    const text = document.createElement('div');
    text.textContent = 'ROM not loaded.';
    msg.appendChild(text);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load anyway';
    loadBtn.style.cssText = [
      'padding:7px 14px', 'border-radius:5px', 'border:none', 'cursor:pointer',
      'background:var(--accent,#4a8fff)', 'color:#fff', 'font-size:13px',
    ].join(';');
    loadBtn.addEventListener('click', () => {
      msg.remove();
      startEmulator();
    });
    msg.appendChild(loadBtn);

    wrap.appendChild(msg);
  });

  return {
    parentNode: wrap,
    revoke() {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      try {
        if (window.EJS_emulator && typeof window.EJS_emulator.pause === 'function') {
          window.EJS_emulator.pause();
        }
      } catch (_) {}
    },
  };
}
