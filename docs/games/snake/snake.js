// Snake — the first easter-egg game. Self-contained canvas grid game with keyboard (arrows / WASD)
// and touch-swipe controls, score + high-score callback, and a game-over/restart overlay.
//
// Options (persisted, above the board):
//   • Walls — randomly placed but CONNECTED wall segments (short grid-aligned bars, classic-snake
//     style), not scattered single cells. Generation guarantees the open area stays fully
//     reachable (flood-fill check with the board's wrap-around adjacency), so walls can never seal
//     off a region. Hitting a wall ends the game; food is worth 2× score (the tail still grows 1).
//   • Boosters — power-ups that act on the snake itself: faster, slower, longer, and shorter.
//     "shorter" trims the tail with NO score loss, so a smaller, safer snake can out-score a long
//     one. Speed boosters are timed; length boosters are instant.
//   • Size — Small / Medium / Large field; the cell size scales so the board stays ~constant px.
//
// All new styling is inline so this file stays the only thing touched (snake CSS lives in the
// metagame-owned games.css). Wall generation + reachability live in ./snake-walls.js.
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
import { generateWalls, allReachable } from './snake-walls.js';

const TICK_MS = 110;        // base movement cadence
const FAST_MS = 65;         // "faster" booster cadence
const SLOW_MS = 175;        // "slower" booster cadence
const BOARD_PX = 360;       // target canvas size in px; cell scales with grid so the board stays ~constant
const SIZES = { small: 13, medium: 20, large: 28 };   // cells per side per field size
const DEFAULT_SIZE = 'medium';
const SPEED_TICKS = 60;     // duration of a speed booster, in ticks
const FX_TICKS = 22;        // how long a one-shot booster label lingers in the HUD
const GROW = 3;             // segments added by "longer"
const SHRINK = 3;           // segments removed by "shorter" (snake never drops below length 2)
const BOOST_TTL = 60;       // ticks a booster stays on the board before vanishing
const BOOST_CHANCE = 0.03;  // per-tick spawn chance when no booster is present
const BOOST_TYPES = ['faster', 'slower', 'longer', 'shorter'];
const BOOST_COLORS = { faster: '#fab005', slower: '#4dabf7', longer: '#9775fa', shorter: '#f06595' };
const BOOST_SYM = { faster: '»', slower: '«', longer: '+', shorter: '–' };
const BOOST_FX = { faster: '⚡ faster', slower: '🐌 slower', longer: '＋ longer', shorter: '－ shorter' };
const LS = { walls: 'fv:snake:walls', boost: 'fv:snake:boost', size: 'fv:snake:size' };

const rand = (n) => Math.floor(Math.random() * n);
function lsGet(k) { try { return localStorage.getItem(k) === '1'; } catch { return false; } }
function lsSet(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ok */ } }
function lsGetStr(k, def) { try { return localStorage.getItem(k) || def; } catch { return def; } }
function lsSetStr(k, v) { try { localStorage.setItem(k, v); } catch { /* ok */ } }

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="snake-wrap">'
    + '<div class="snake-hud"><span class="snake-score">Score: 0</span>'
    + '<span class="snake-fx" style="font-weight:600"></span>'
    + '<span class="snake-hint">Arrows / WASD · Swipe on touch</span></div>'
    + '<div class="snake-opts" style="display:flex;gap:14px;margin:2px 0 6px;font-size:13px;opacity:.85;flex-wrap:wrap;align-items:center">'
    + '<label style="display:inline-flex;gap:5px;align-items:center;cursor:pointer">'
    + '<input type="checkbox" class="snake-opt-walls">Walls <span style="opacity:.7">(2× score)</span></label>'
    + '<label style="display:inline-flex;gap:5px;align-items:center;cursor:pointer">'
    + '<input type="checkbox" class="snake-opt-boost">Boosters</label>'
    + '<label style="display:inline-flex;gap:5px;align-items:center;cursor:pointer">Size'
    + '<select class="snake-opt-size" style="font-size:13px;cursor:pointer">'
    + '<option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>'
    + '</select></label>'
    + '</div>'
    + '<div class="snake-board"><canvas class="snake-canvas" width="' + BOARD_PX + '" height="' + BOARD_PX + '"></canvas>'
    + '<div class="snake-over" hidden><div class="snake-over-box"><div class="snake-over-msg"></div>'
    + '<button class="snake-restart">Play again</button> <button class="snake-quit">Back</button></div></div>'
    + '</div></div>';

  const wrap = host.querySelector('.snake-wrap');
  const canvas = host.querySelector('.snake-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.snake-score');
  const fxEl = host.querySelector('.snake-fx');
  const overEl = host.querySelector('.snake-over');
  const overMsg = host.querySelector('.snake-over-msg');
  const wallsBox = host.querySelector('.snake-opt-walls');
  const boostBox = host.querySelector('.snake-opt-boost');
  const sizeSel = host.querySelector('.snake-opt-size');

  let snake, dir, nextDir, food, score, timer, dead;
  let walls, booster, boosterTtl, pendingGrow, curMs, speedExpire, fxExpire, ticks;
  let grid, cell, spawnY;                              // set by applySize()
  let wallsOn = lsGet(LS.walls);
  let boostOn = lsGet(LS.boost);
  let sizeKey = lsGetStr(LS.size, DEFAULT_SIZE);
  if (!SIZES[sizeKey]) sizeKey = DEFAULT_SIZE;
  wallsBox.checked = wallsOn;
  boostBox.checked = boostOn;
  sizeSel.value = sizeKey;

  // Field size → grid + cell; cell scales so the board stays ~BOARD_PX px regardless of grid.
  function applySize() {
    grid = SIZES[sizeKey];
    cell = Math.round(BOARD_PX / grid);
    spawnY = Math.floor(grid / 2);
    canvas.width = grid * cell;
    canvas.height = grid * cell;
  }

  function occupied(p) {
    return snake.some((s) => s.x === p.x && s.y === p.y)
      || walls.some((w) => w.x === p.x && w.y === p.y)
      || (food && food.x === p.x && food.y === p.y)
      || (booster && booster.x === p.x && booster.y === p.y);
  }
  function freeCell() { let p; do { p = { x: rand(grid), y: rand(grid) }; } while (occupied(p)); return p; }

  function genWalls() {
    const count = Math.max(2, Math.round(grid * grid / 90));   // density scales with field area
    walls = wallsOn ? generateWalls(grid, spawnY, count) : [];
  }

  // Speed is the setInterval cadence; changing it means clearing + re-arming the timer.
  function setSpeed(ms) { if (ms === curMs) return; curMs = ms; if (timer) clearInterval(timer); timer = setInterval(tick, ms); }

  function reset() {
    applySize();
    const hx = Math.floor(grid / 2);
    snake = [{ x: hx, y: spawnY }, { x: hx - 1, y: spawnY }, { x: hx - 2, y: spawnY }];
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; dead = false;
    walls = []; booster = null; boosterTtl = 0; pendingGrow = 0;
    speedExpire = 0; fxExpire = 0; ticks = 0;
    genWalls();
    food = freeCell();
    scoreEl.textContent = 'Score: 0';
    fxEl.textContent = '';
    overEl.hidden = true;
    host.querySelector('.snake-board').classList.remove('snake-dead');
    curMs = null;
    if (timer) clearInterval(timer);
    setSpeed(TICK_MS);
    draw();
  }

  function setDir(x, y) {
    if (x === -dir.x && y === -dir.y) return;   // no 180° reversals (would instantly self-collide)
    nextDir = { x, y };
  }

  function applyBooster(type) {
    if (type === 'faster') { setSpeed(FAST_MS); speedExpire = ticks + SPEED_TICKS; fxExpire = speedExpire; }
    else if (type === 'slower') { setSpeed(SLOW_MS); speedExpire = ticks + SPEED_TICKS; fxExpire = speedExpire; }
    else if (type === 'longer') { pendingGrow += GROW; fxExpire = ticks + FX_TICKS; }
    else if (type === 'shorter') {
      const remove = Math.min(SHRINK, snake.length - 2);   // never below length 2; no score change
      if (remove > 0) snake.splice(snake.length - remove, remove);
      fxExpire = ticks + FX_TICKS;
    }
    fxEl.textContent = BOOST_FX[type];
  }

  function tick() {
    if (dead) return;
    ticks++;
    if (speedExpire && ticks >= speedExpire) { setSpeed(TICK_MS); speedExpire = 0; }   // revert speed boost
    if (fxExpire && ticks >= fxExpire) { fxEl.textContent = ''; fxExpire = 0; }

    dir = nextDir;
    const head = { x: (snake[0].x + dir.x + grid) % grid, y: (snake[0].y + dir.y + grid) % grid };
    if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
    if (walls.some((w) => w.x === head.x && w.y === head.y)) return gameOver();

    snake.unshift(head);

    if (booster && head.x === booster.x && head.y === booster.y) { applyBooster(booster.type); booster = null; }

    if (food && head.x === food.x && head.y === food.y) {
      score += wallsOn ? 2 : 1;                  // Walls mode doubles score; the tail still grows by 1
      scoreEl.textContent = 'Score: ' + score;
      onScore?.(score);
      food = freeCell();
    } else if (pendingGrow > 0) {
      pendingGrow--;                             // "longer" booster: skip the tail pop to grow
    } else {
      snake.pop();
    }

    if (booster) { if (--boosterTtl <= 0) booster = null; }
    else if (boostOn && Math.random() < BOOST_CHANCE) {
      booster = { ...freeCell(), type: BOOST_TYPES[rand(BOOST_TYPES.length)] };
      boosterTtl = BOOST_TTL;
    }

    draw();
  }

  function gameOver() {
    dead = true;
    clearInterval(timer); timer = null;
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
    host.querySelector('.snake-board').classList.add('snake-dead');
  }

  function draw() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = dark ? '#161616' : '#f4f6f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // walls
    ctx.fillStyle = dark ? '#5c5f66' : '#adb5bd';
    for (const w of walls) ctx.fillRect(w.x * cell, w.y * cell, cell, cell);
    // food (a byte)
    ctx.fillStyle = '#e0533d';
    ctx.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
    // booster
    if (booster) {
      ctx.fillStyle = BOOST_COLORS[booster.type];
      ctx.fillRect(booster.x * cell + 2, booster.y * cell + 2, cell - 4, cell - 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(BOOST_SYM[booster.type], booster.x * cell + cell / 2, booster.y * cell + cell / 2 + 0.5);
    }
    // snake
    for (let i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? '#2f9e44' : '#40c057';
      ctx.fillRect(snake[i].x * cell + 1, snake[i].y * cell + 1, cell - 2, cell - 2);
    }
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDir(0, -1);
    else if (k === 'arrowdown' || k === 's') setDir(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDir(1, 0);
    else return;
    e.preventDefault();
  }

  // Touch swipe (mobile): record on touchstart, resolve direction on touchend (20px threshold).
  let tStart = null;
  function onTouchStart(e) { const t = e.touches[0]; tStart = { x: t.clientX, y: t.clientY }; e.preventDefault(); }
  function onTouchEnd(e) {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    tStart = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;  // below threshold — ignore
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  }

  wallsBox.addEventListener('change', () => { wallsOn = wallsBox.checked; lsSet(LS.walls, wallsOn); reset(); });
  boostBox.addEventListener('change', () => { boostOn = boostBox.checked; lsSet(LS.boost, boostOn); reset(); });
  sizeSel.addEventListener('change', () => { sizeKey = SIZES[sizeSel.value] ? sizeSel.value : DEFAULT_SIZE; lsSetStr(LS.size, sizeKey); reset(); });

  window.addEventListener('keydown', onKey);
  host.addEventListener('touchstart', onTouchStart, { passive: false });
  host.addEventListener('touchend', onTouchEnd, { passive: true });
  host.querySelector('.snake-restart').addEventListener('click', () => reset());
  host.querySelector('.snake-quit').addEventListener('click', () => onExit?.());

  // Test/debug hook: lets smoke tests assert the field size and that walls stay connected + reachable.
  wrap.__snake = {
    info: () => ({ grid, cell, size: sizeKey, wallsOn, wallCount: walls.length, reachable: allReachable(grid, walls) }),
    walls: () => walls.map((w) => ({ x: w.x, y: w.y })),
  };

  reset();

  return {
    destroy() {
      if (timer) clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchend', onTouchEnd);
      host.innerHTML = '';
    },
  };
}
