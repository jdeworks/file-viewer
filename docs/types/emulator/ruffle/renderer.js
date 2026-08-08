// Ruffle Flash player renderer.
// Uses the parentNode pattern: returns { parentNode: HTMLElement, revoke() }.

const RUFFLE_JS = new URL('../../../vendor/ruffle/ruffle.js', import.meta.url).href;

// Load ruffle.js as a real <script> tag (WASM + dynamic imports require it).
let ruffleScriptPromise = null;
function ensureRuffleLoaded() {
  if (ruffleScriptPromise) return ruffleScriptPromise;
  ruffleScriptPromise = new Promise((resolve, reject) => {
    // Set publicPath before the script runs so Ruffle finds its WASM chunks.
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = {
      ...(window.RufflePlayer.config || {}),
      publicPath: new URL('../../../vendor/ruffle/', import.meta.url).href,
      // The viewer creates its player explicitly. Ruffle's browser Flash-plugin polyfills are
      // unnecessary here and permanently replace navigator.plugins and related native APIs.
      polyfills: false,
    };

    // Check if already loaded via a previous tag insertion.
    if (window.RufflePlayer && typeof window.RufflePlayer.newest === 'function') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = RUFFLE_JS;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load ruffle.js from ' + RUFFLE_JS));
    document.head.appendChild(script);
  });
  return ruffleScriptPromise;
}

function warn(msg) {
  const el = document.createElement('div');
  el.style.cssText = [
    'display:flex', 'align-items:center', 'gap:8px',
    'padding:10px 14px', 'border-radius:6px', 'margin-bottom:16px',
    'background:rgba(255,180,0,0.12)', 'border:1px solid rgba(255,180,0,0.35)',
    'color:var(--fg,#ccc)', 'font-size:13px', 'line-height:1.5',
  ].join(';');
  el.textContent = msg;
  return el;
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex', 'flex-direction:column', 'align-items:stretch',
    'min-height:200px', 'padding:24px', 'box-sizing:border-box',
    'background:var(--bg-1,#1e1e1e)', 'color:var(--fg,#ccc)',
    'font-family:var(--font-ui,sans-serif)',
  ].join(';');

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
  heading.innerHTML = '<span style="font-size:20px;">&#9888;</span> Flash Player (Ruffle)';
  dialog.appendChild(heading);

  const body = document.createElement('p');
  body.style.cssText = 'margin:0;font-size:13px;line-height:1.6;opacity:0.85;';
  body.textContent =
    'Only open .swf files from trusted sources. Flash content can run JavaScript ' +
    'and access browser APIs. Never open .swf files from unknown websites.';
  dialog.appendChild(body);

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

  const btnLoad = document.createElement('button');
  btnLoad.textContent = 'I understand — Load Flash content';
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

  // Player reference for cleanup.
  let player = null;

  // Called when user confirms they want to load Flash content.
  async function loadFlash() {
    dialog.remove();

    const status = document.createElement('div');
    status.style.cssText = 'text-align:center;padding:24px;opacity:0.7;font-size:13px;';
    status.textContent = 'Loading Ruffle…';
    wrap.appendChild(status);

    try {
      await ensureRuffleLoaded();
    } catch (e) {
      status.textContent = 'Could not load Ruffle: ' + e.message;
      return;
    }

    const ruffle = window.RufflePlayer.newest();
    if (!ruffle) {
      status.textContent = 'Ruffle loaded but newest() returned null — browser may be unsupported.';
      return;
    }

    status.remove();

    // Reset wrap to flex-column fill for the player.
    wrap.style.cssText = [
      'display:flex', 'flex-direction:column', 'flex:1',
      'min-height:400px', 'padding:0', 'box-sizing:border-box',
      'background:#000',
    ].join(';');

    player = ruffle.createPlayer();
    player.style.cssText = 'width:100%;height:100%;display:block;flex:1;min-height:400px;';
    wrap.appendChild(player);

    try {
      await player.load({ data: intake.bytes.buffer });
    } catch (e) {
      const errMsg = document.createElement('div');
      errMsg.style.cssText = 'padding:16px;color:var(--fg,#ccc);font-size:13px;background:var(--bg-1,#1e1e1e);';
      errMsg.textContent = 'Error loading SWF: ' + e.message;
      player.remove();
      wrap.appendChild(errMsg);
    }
  }

  btnLoad.addEventListener('click', loadFlash);

  btnCancel.addEventListener('click', () => {
    dialog.remove();

    const msg = document.createElement('div');
    msg.style.cssText = [
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:12px',
      'padding:32px', 'text-align:center', 'opacity:0.8', 'font-size:13px',
    ].join(';');

    const text = document.createElement('div');
    text.textContent = 'Flash content not loaded.';
    msg.appendChild(text);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load anyway';
    loadBtn.style.cssText = [
      'padding:7px 14px', 'border-radius:5px', 'border:none', 'cursor:pointer',
      'background:var(--accent,#4a8fff)', 'color:#fff', 'font-size:13px',
    ].join(';');
    loadBtn.addEventListener('click', () => {
      msg.remove();
      loadFlash();
    });
    msg.appendChild(loadBtn);

    wrap.appendChild(msg);
  });

  return {
    parentNode: wrap,
    revoke() {
      try { player?.pause?.(); } catch (_) {}
    },
  };
}
