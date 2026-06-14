// Stage 1 — the bespoke "pixel reveal" onboarding mechanic, plus the commentary BELL that lives in
// every stage. Split out of metagame.js to keep that orchestrator under the LOC cap.
//
// Stage 1 has no shop / no score / no rate: a single "Compute" button sits at the bottom, fully
// covered by a 100-square grid. Tapping anywhere adds bits (×clickPower); each bit reveals one
// square in COLUMN-MAJOR order. At 100 the button is fully revealed and interactive; buying it
// resets bits to 0 and raises click power, so the reveal restarts (faster). The bell narrates it.

const BELL_KEY = 'fv:games:mg:bell';
const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

/* ── Commentary bell: persisted message log with unread count + grouped display. ── */
export function bellLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(BELL_KEY)) || {};
    return {
      messages: Array.isArray(s.messages) ? s.messages : [],
      seen: Array.isArray(s.seen) ? s.seen : [],
      readCount: Number(s.readCount) || 0,
    };
  } catch { return { messages: [], seen: [], readCount: 0 }; }
}
export function bellSave(state) { try { localStorage.setItem(BELL_KEY, JSON.stringify(state)); } catch { /* private mode */ } }

// Add a message. oneTime messages are added at most once ever (tracked in `seen`); repeatable ones
// bump a per-id count so the panel can show "text ×N". readCount is the total messages ever logged.
export function bellAdd(id, text, oneTime) {
  const state = bellLoad();
  if (oneTime && state.seen.includes(id)) return;
  if (oneTime) state.seen.push(id);
  const existing = state.messages.find((m) => m.id === id);
  if (existing) existing.count++;
  else state.messages.push({ id, text, count: 1, ts: Date.now() });
  state.readCount = state.messages.reduce((s, m) => s + m.count, 0);
  bellSave(state);
  updateBellDot();
}

// Total logged vs. how many the player has acknowledged (persisted as a plain number in localStorage).
const ACK_KEY = 'fv:games:mg:bell:ack';
const ackGet = () => { try { return Number(localStorage.getItem(ACK_KEY)) || 0; } catch { return 0; } };
const ackSet = (n) => { try { localStorage.setItem(ACK_KEY, String(n)); } catch { /* ignore */ } };

let bellRoot = null;   // the live bell DOM (per mount) so bellAdd can refresh the dot from anywhere.

export function updateBellDot() {
  if (!bellRoot) return;
  const state = bellLoad();
  const unread = state.readCount > ackGet();
  const dot = bellRoot.querySelector('.mg-bell-dot');
  if (dot) dot.hidden = !unread;
}

// Build the bell button + (closed) message panel, both absolutely positioned over the host.
export function mountBell(host) {
  const prev = host.querySelector(':scope > .mg-bell-wrap');   // idempotent: never leave two bells
  if (prev) prev.remove();
  const wrap = document.createElement('div');
  wrap.className = 'mg-bell-wrap';
  wrap.innerHTML =
    '<button class="mg-bell-btn" type="button" aria-label="Notifications">🔔<span class="mg-bell-dot" hidden></span></button>'
    + '<div class="mg-bell-panel" hidden></div>';
  host.appendChild(wrap);
  bellRoot = wrap;
  const btn = wrap.querySelector('.mg-bell-btn');
  const panel = wrap.querySelector('.mg-bell-panel');

  function renderPanel() {
    const state = bellLoad();
    if (!state.messages.length) { panel.innerHTML = '<div class="mg-bell-empty">nothing here</div>'; return; }
    panel.innerHTML = state.messages.map((m) =>
      '<div class="mg-bell-msg">' + escapeHtml(m.text) + (m.count > 1 ? ' <span class="mg-bell-x">×' + m.count + '</span>' : '') + '</div>'
    ).join('');
  }
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    if (open) { renderPanel(); ackSet(bellLoad().readCount); updateBellDot(); }
  });
  updateBellDot();
  return { el: wrap };
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ── Stage 1 render: full-screen tap area + a Compute button under a 100-square reveal grid. ── */
// ctx: { host, state, save, stage, clickPower, buyTier, onExit, attachChrome, onBits, onReset, onBoss }
//   attachChrome(host) re-attaches the back/fullscreen/debug header + bell after any innerHTML wipe.
//   After 5 purchases (and if the stage isn't already beaten) a "Confront" button appears so the
//   onboarding loop hands off to the stage-1 boss.
const BOSS_AFTER = 5;
export function renderStage1(ctx) {
  const { host, state, save, stage, clickPower, buyTier, onExit, attachChrome } = ctx;
  const t = (stage().tiers || [])[0];
  const bought = t ? (state.owned[t.id] || 0) : 0;
  const beaten = Array.isArray(state.defeated) && state.defeated.includes(1);
  const showBoss = !beaten && bought >= BOSS_AFTER;

  host.innerHTML =
    '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-tap" aria-label="tap to compute"></div>'
    + '<div class="mg-s1-stage">'
    + '  <button class="mg-s1-btn mg-compute" type="button">' + (t ? t.icon + ' ' + t.name : '⚙ Compute') + '</button>'
    + '  <div class="mg-s1-grid" aria-hidden="true"></div>'
    + '</div>'
    + '<button class="mg-faceboss mg-s1-boss" type="button"' + (showBoss ? '' : ' hidden') + '>⚔ Confront ' + (stage().bossName || 'the boss') + '</button>'
    + '</div>';
  const $ = (s) => host.querySelector(s);
  const tap = $('.mg-s1-tap');
  const btn = $('.mg-s1-btn');
  const grid = $('.mg-s1-grid');
  const bossBtn = $('.mg-s1-boss');
  if (bossBtn) bossBtn.addEventListener('click', () => ctx.onBoss && ctx.onBoss());

  // Build the 100 covering squares in COLUMN-MAJOR fill order: cell index i maps to (r,c) with
  // c = floor(i / ROWS), r = i % ROWS. We lay them out in a CSS grid that is row-major, so we give
  // each square an explicit grid-area to honour the visual position while keeping fill-order = i.
  let cells = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const c = Math.floor(i / GRID_ROWS), r = i % GRID_ROWS;
    const cell = document.createElement('div');
    cell.className = 'mg-s1-cell';
    cell.style.gridColumn = (c + 1);
    cell.style.gridRow = (r + 1);
    cell.dataset.i = String(i);
    grid.appendChild(cell);
    cells.push(cell);
  }

  function reveal() {
    const n = Math.min(Math.floor(state.bits), GRID_CELLS);
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle('mg-s1-on', i < n);
    const done = n >= GRID_CELLS;
    btn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);   // pointer-events pass-through once clear
  }

  function addBits() {
    state.bits += clickPower();
    ctx.onBits && ctx.onBits();
    reveal();
  }
  // Full-screen tap area: pointer (covers mouse + touch). The grid sits above the button but is
  // click-through (pointer-events:none on covered cells) until cleared.
  tap.addEventListener('pointerdown', addBits);

  btn.addEventListener('click', () => {
    if (state.bits < GRID_CELLS) return;     // not revealed yet → ignore (shouldn't fire; covered)
    if (t && buyTier(t.id)) {                // spends the tier cost (=100); raises click power
      state.bits = 0;                        // …then wipe whatever's left — everything goes
      save(state);
      ctx.onReset && ctx.onReset();
      renderStage1(ctx);                     // re-render fresh (all covered again)
    }
  });

  reveal();
  attachChrome(host);
}

export const STAGE1 = { GRID_CELLS, GRID_COLS, GRID_ROWS };
