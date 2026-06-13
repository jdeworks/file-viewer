// Games hub overlay. A self-contained full-screen modal (created on demand, not in index.html)
// that lists the unlocked games and hosts the chosen one. Each game mounts into a stage node and
// is torn down on back/close. High scores per game are persisted so the meta-game economy (later)
// can read them. Keeps zero coupling to the rest of the app beyond an onToast callback.
import { GAMES, getGame } from './registry.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function highScore(id) {
  try { return Number(localStorage.getItem('fv:games:hi:' + id) || 0); } catch { return 0; }
}
function setHighScore(id, n) {
  try { if (n > highScore(id)) localStorage.setItem('fv:games:hi:' + id, String(n)); } catch { /* ignore */ }
}

export function createHub({ onToast } = {}) {
  let root = null, stage = null, current = null;

  function buildGrid() {
    return '<div class="games-grid">' + GAMES.map((g) =>
      '<button class="games-card" data-game="' + esc(g.id) + '">'
      + '<span class="games-emoji">' + esc(g.emoji) + '</span>'
      + '<span class="games-title">' + esc(g.title) + '</span>'
      + '<span class="games-blurb">' + esc(g.blurb) + '</span>'
      + '<span class="games-hi" data-hi="' + esc(g.id) + '">' + (highScore(g.id) ? 'Best: ' + highScore(g.id) : '') + '</span>'
      + '</button>').join('') + '</div>';
  }

  function ensureRoot() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'games-overlay';
    root.hidden = true;
    root.innerHTML =
      '<div class="games-panel" role="dialog" aria-label="Easter-egg games">'
      + '<header class="games-head"><h2>🎮 Arcade</h2>'
      + '<button class="games-back" hidden>‹ Back</button>'
      + '<button class="games-close" aria-label="Close">✕</button></header>'
      + buildGrid()
      + '<div class="games-stage" hidden></div></div>';
    document.body.appendChild(root);
    stage = root.querySelector('.games-stage');

    root.querySelector('.games-close').addEventListener('click', close);
    root.querySelector('.games-back').addEventListener('click', exitGame);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });   // backdrop
    root.querySelectorAll('.games-card').forEach((b) =>
      b.addEventListener('click', () => launch(b.dataset.game)));
  }

  async function launch(id) {
    const game = getGame(id);
    if (!game) return;
    const mod = await game.load();
    const mount = mod.mount || mod.default;
    if (typeof mount !== 'function') { onToast?.('That game failed to load.'); return; }
    root.querySelector('.games-grid').hidden = true;
    stage.hidden = false;
    stage.innerHTML = '';
    root.querySelector('.games-back').hidden = false;
    current = mount(stage, {
      onScore: (n) => { setHighScore(id, n); const el = root.querySelector('[data-hi="' + id + '"]'); if (el) el.textContent = 'Best: ' + highScore(id); },
      onExit: exitGame,
    }) || null;
  }

  function exitGame() {
    current?.destroy?.();
    current = null;
    if (!stage) return;
    stage.hidden = true;
    stage.innerHTML = '';
    root.querySelector('.games-grid').hidden = false;
    root.querySelector('.games-back').hidden = true;
  }

  function open() {
    ensureRoot();
    root.hidden = false;
    document.addEventListener('keydown', onEsc, true);
  }
  function close() {
    exitGame();
    if (root) root.hidden = true;
    document.removeEventListener('keydown', onEsc, true);
  }
  function onEsc(e) {
    if (e.key !== 'Escape') return;
    if (current) { e.stopPropagation(); exitGame(); } else close();
  }

  return { open, close };
}
