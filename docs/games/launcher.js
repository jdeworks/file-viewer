// Games launcher: the lightweight startup hook for the easter-egg games. At init it only attaches
// a single keydown listener that watches for the Konami code (↑ ↑ ↓ ↓ ← → ← → B A). On match it
// unlocks the games (persisted) and opens the hub overlay. The hub + the games themselves are
// lazy-loaded only when first opened, so startup cost is one tiny listener.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const UNLOCK_KEY = 'fv:games:unlocked';

let hubApi = null;          // lazily-loaded hub controller
let toastFn = (m) => {};

function isUnlocked() {
  try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; }
}
function setUnlocked() {
  try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* private mode — still works this session */ }
}

async function openHub() {
  if (!hubApi) {
    const mod = await import('./hub.js');
    hubApi = mod.createHub({ onToast: toastFn });
  }
  hubApi.open();
}

function onKonami() {
  const first = !isUnlocked();
  setUnlocked();
  if (first) toastFn('🎮 Easter eggs unlocked! Opening the arcade…');
  openHub();
}

// Returns the games API (also used by the test seam + any future menu entry).
export function initGames({ onToast } = {}) {
  if (typeof onToast === 'function') toastFn = onToast;
  const buf = [];
  window.addEventListener('keydown', (e) => {
    // Ignore while typing in an input/textarea/editor so the sequence can't fire accidentally.
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (buf.length > KONAMI.length) buf.shift();
    if (buf.length === KONAMI.length && KONAMI.every((k, i) => k === buf[i])) { buf.length = 0; onKonami(); }
  });
  return { open: openHub, unlock: () => { setUnlocked(); }, isUnlocked };
}
