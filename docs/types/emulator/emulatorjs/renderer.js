// EmulatorJS console ROM renderer.
// Uses the parentNode pattern: returns { parentNode: HTMLElement, revoke() }.

import { EXT_CORE } from './detect.js';

export const EMULATORJS_RELEASE = '4.2.3';
const DATA_PATH = './vendor/emulatorjs/data/';

const CORE_NAMES = {
  fceumm: 'NES / Famicom',
  snes9x: 'Super Nintendo (SNES)',
  gambatte: 'Game Boy / GBC',
  mgba: 'Game Boy Advance (GBA)',
  genesis_plus_gx: 'Sega Genesis / Mega Drive',
  stella2014: 'Atari 2600',
};

export function getCoreForFile(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return EXT_CORE[ext] || 'fceumm';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(s);
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// EmulatorJS 4.2.3 contains update/CDN failsafes and optional netplay code. File Viewer's runtime
// contract is stricter: every HTTP request must stay on this app's origin, and a missing locked
// file must fail with its local path instead of retrying a CDN.
export function installOffOriginGuard() {
  if (window.__ejsFetchGuard?.restore) return window.__ejsFetchGuard.restore;
  const nativeFetch = window.fetch;
  const guardedFetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    let resolved;
    try { resolved = new URL(url, document.baseURI); } catch { resolved = null; }
    // Upstream checks this URL only on localhost. Answer from the pinned lock without issuing a
    // request; GitHub Pages never enters this debug path, and tests remain error-free/off-origin.
    if (resolved?.href === 'https://cdn.emulatorjs.org/stable/data/version.json') {
      return new Response(JSON.stringify({ version: EMULATORJS_RELEASE, current_version: EMULATORJS_RELEASE }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (resolved && /^https?:$/.test(resolved.protocol) && resolved.origin !== location.origin) {
      throw new Error('Blocked off-origin EmulatorJS request: ' + resolved.href);
    }
    const response = await nativeFetch.call(window, input, init);
    const dataRoot = new URL(DATA_PATH, document.baseURI).pathname;
    if (resolved && resolved.origin === location.origin && resolved.pathname.startsWith(dataRoot) && !response.ok) {
      throw new Error(`Missing local EmulatorJS ${EMULATORJS_RELEASE} asset (${response.status}): ${resolved.pathname}`);
    }
    return response;
  };
  window.fetch = guardedFetch;
  const restore = () => {
    if (window.fetch === guardedFetch) window.fetch = nativeFetch;
    delete window.__ejsFetchGuard;
  };
  window.__ejsFetchGuard = { restore };
  return restore;
}

// RetroArch's Emscripten glue leaves a rejected Wake Lock request unobserved. Preserve working
// wake locks, but convert permission denial into a no-op sentinel so it cannot become a pageerror.
function installWakeLockGuard() {
  const own = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
  const native = navigator.wakeLock;
  if (!native?.request) return () => {};
  const guarded = Object.create(native);
  guarded.request = async (...args) => {
    try { return await native.request(...args); }
    catch { return { released: true, release: async () => {}, addEventListener: () => {} }; }
  };
  try { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: guarded }); }
  catch { return () => {}; }
  return () => {
    try {
      if (own) Object.defineProperty(navigator, 'wakeLock', own);
      else delete navigator.wakeLock;
    } catch {}
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
  let restoreFetch = null;
  let restoreWakeLock = null;
  let disposed = false;

  function clearEjsGlobals() {
    for (const key of [
      'EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_pathtodata', 'EJS_startOnLoaded',
      'EJS_gameName', 'EJS_threads', 'EJS_forceLegacyCores', 'EJS_disableAutoLang',
      'EJS_language', 'EJS_netplayServer', 'EJS_AdUrl', 'EJS_AdMode',
      'EJS_ready', 'EJS_onGameStart', 'EJS_emulator',
      'EJS_adBlocked', 'EJS_GameManager', 'EmulatorJS',
    ]) {
      try { delete window[key]; } catch { window[key] = undefined; }
    }
  }

  function teardownRuntime() {
    if (disposed) return;
    disposed = true;
    const emulator = window.EJS_emulator;
    try { emulator?.pause?.(true); } catch {}
    try { emulator?.gamepad?.terminate?.(); } catch {}
    try { emulator?.callEvent?.('exit'); } catch {}
    try { emulator?.gameManager?.toggleMainLoop?.(0); } catch {}
    try {
      const audio = emulator?.gameManager?.Module?.SDL2?.audioContext
        || emulator?.gameManager?.Module?.SDL?.audioContext;
      if (audio && audio.state !== 'closed') audio.close?.();
    } catch {}
    if (emulator) emulator.started = false;
    for (const node of document.querySelectorAll('script[src], link[href]')) {
      const ref = node.getAttribute('src') || node.getAttribute('href') || '';
      if (ref.includes('vendor/emulatorjs/')) node.remove();
    }
    restoreFetch?.();
    restoreFetch = null;
    restoreWakeLock?.();
    restoreWakeLock = null;
    clearEjsGlobals();
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
  }

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
    disposed = false;
    blobUrl = URL.createObjectURL(new Blob([intake.bytes], { type: 'application/octet-stream' }));

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
    window.EJS_pathtodata = DATA_PATH;
    window.EJS_startOnLoaded = true;
    window.EJS_gameName = intake.filename.replace(/\.[^.]+$/, '');
    window.EJS_threads = false;          // GitHub Pages does not provide COOP/COEP isolation.
    window.EJS_forceLegacyCores = false; // WebGL2 preferred; locked legacy variants remain fallback.
    // 4.2.3's loader condition is inverted relative to its option docs: false suppresses the
    // automatic system-locale fetch. Keep EJS_language unset so no localization asset is needed.
    delete window.EJS_language;
    window.EJS_disableAutoLang = false;
    window.EJS_netplayServer = null;
    window.EJS_AdUrl = null;
    window.EJS_AdMode = 0;
    window.EJS_ready = () => {
      if (!disposed) wrap.dataset.ejsReady = '1';
    };
    window.EJS_onGameStart = () => {
      if (!disposed) {
        wrap.dataset.ejsStarted = '1';
        wrap.dispatchEvent(new CustomEvent('fv-emulator-started'));
      }
    };

    restoreFetch = installOffOriginGuard();
    restoreWakeLock = installWakeLockGuard();

    try {
      await loadScript(DATA_PATH + 'loader.js');
      if (disposed) teardownRuntime();
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:16px;color:var(--fg,#ccc);font-size:13px;background:var(--bg-1,#1e1e1e);';
      errDiv.textContent = 'Failed to load EmulatorJS: ' + e.message;
      container.remove();
      wrap.appendChild(errDiv);
      teardownRuntime();
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
      teardownRuntime();
    },
  };
}
