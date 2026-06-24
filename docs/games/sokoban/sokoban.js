// Sokoban — push every box onto a goal. Self-contained canvas game; keyboard (arrows/WASD), swipe,
// and an on-screen d-pad so it plays on phone and desktop. Levels are embedded ASCII (no assets) and
// ESCALATE in difficulty. Scoring RAMPS: each solve pays 100 × (levels solved) + a move-efficiency
// bonus, so later solves are worth disproportionately more. Contract:
// mount(host, { onScore, onExit }) => { destroy() }.
import { swipe, dpad } from '../controls.js';
import { SETS, DEFAULT_SET, getSet } from './sets.js';
import { parseLevel } from './solve.js';

const key = (x, y) => x + ',' + y;
const SET_KEY = 'fv:sokoban:set';                           // persisted chosen level set
const solveValue = (n) => 100 * n;                          // n = total levels solved so far (1-based)
const MOVE_MS = 500;                                        // auto-solve playback: normal cadence
const MOVE_FAST = 100;                                      // fast-forward cadence for non-push moves
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

export function mount(host, { onScore, onExit } = {}) {
  let setId;
  try { setId = localStorage.getItem(SET_KEY) || DEFAULT_SET; } catch { setId = DEFAULT_SET; }
  if (!getSet(setId)) setId = DEFAULT_SET;
  let SET = getSet(setId); setId = SET.id;
  const setOptions = SETS.map((s) => '<option value="' + s.id + '">' + s.name + ' (' + s.levels.length + ')</option>').join('');

  host.innerHTML =
    '<div class="sokoban-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + (SETS.length > 1
      ? '<div class="sokoban-setrow" style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600">'
        + 'Set <select class="sokoban-set" style="font-size:13px;cursor:pointer">' + setOptions + '</select></div>'
      : '')
    + '<div class="sokoban-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="sokoban-score">Score: 0</span><span class="sokoban-level">Level 1</span>'
    + '<span class="sokoban-moves">Moves: 0</span></div>'
    + '<div style="position:relative">'
    + '<canvas class="sokoban-canvas" width="320" height="320" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#12151c;touch-action:none"></canvas>'
    + '<div class="sokoban-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(8,10,15,.8);color:#fff;border-radius:8px">'
    + '<div class="sokoban-over-msg" style="font-size:17px;font-weight:700;text-align:center;padding:0 12px"></div>'
    + '<button class="sokoban-restart">Play again</button></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="sokoban-undo">↶ Undo</button>'
    + '<button class="sokoban-reset">⟲ Reset</button><button class="sokoban-solve">💡 Solve</button>'
    + '<button class="sokoban-ff">▶ Normal</button>'
    + '<button class="sokoban-next" hidden>Next →</button><button class="sokoban-quit">Back</button></div>'
    + '<div class="sokoban-status" style="font-size:12px;opacity:.75;min-height:1.1em">Arrows / WASD · swipe or d-pad on touch</div></div>';

  const wrap = host.querySelector('.sokoban-wrap');
  const canvas = host.querySelector('.sokoban-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.sokoban-score');
  const levelEl = host.querySelector('.sokoban-level');
  const movesEl = host.querySelector('.sokoban-moves');
  const overEl = host.querySelector('.sokoban-over');
  const overMsg = host.querySelector('.sokoban-over-msg');
  const statusEl = host.querySelector('.sokoban-status');
  const undoBtn = host.querySelector('.sokoban-undo');
  const solveBtn = host.querySelector('.sokoban-solve');
  const nextBtn = host.querySelector('.sokoban-next');
  const ffBtn = host.querySelector('.sokoban-ff');
  const setSel = host.querySelector('.sokoban-set');
  if (setSel) setSel.value = setId;

  let lvl, lvlIndex, solved, score, moves, history, cell, busy, done, solving, solveTimer;
  let ffMode = false;   // fast-forward: non-push moves play fast, pushes stay at normal speed

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Level ' + (lvlIndex + 1);
    movesEl.textContent = 'Moves: ' + moves;
  }

  function loadLevel(i) {
    lvlIndex = i % SET.levels.length;
    lvl = parseLevel(SET.levels[lvlIndex]);
    moves = 0; history = []; busy = false;
    nextBtn.hidden = true;
    cell = Math.max(16, Math.min(36, Math.floor(Math.min(320 / lvl.w, 320 / lvl.h))));
    canvas.width = lvl.w * cell; canvas.height = lvl.h * cell;
    syncHud(); draw();
  }

  function reset() {
    stopSolve();
    solved = 0; score = 0; done = false;
    overEl.hidden = true;
    loadLevel(0);
  }
  function resetLevel() { stopSolve(); loadLevel(lvlIndex); }
  function chooseSet(id) {                                   // switch active set → restart from its level 1
    const next = getSet(id);
    if (next === SET) return;
    SET = next; setId = SET.id;
    try { localStorage.setItem(SET_KEY, setId); } catch { /* private mode */ }
    if (setSel) setSel.value = setId;
    statusEl.textContent = 'Arrows / WASD · swipe or d-pad on touch';
    reset();
  }

  function snapshot() { history.push({ px: lvl.player.x, py: lvl.player.y, boxes: [...lvl.boxes] }); }
  function undo() {
    if (solving) return;
    const s = history.pop();
    if (!s) return;
    lvl.player = { x: s.px, y: s.py };
    lvl.boxes = new Set(s.boxes);
    moves = Math.max(0, moves - 1);
    syncHud(); draw();
  }

  function won() { return [...lvl.boxes].every((k) => lvl.goals.has(k)); }

  function doMove(dx, dy) {
    const nx = lvl.player.x + dx, ny = lvl.player.y + dy;
    const nk = key(nx, ny);
    if (lvl.walls.has(nk)) return false;
    if (lvl.boxes.has(nk)) {
      const bx = nx + dx, by = ny + dy, bk = key(bx, by);
      if (lvl.walls.has(bk) || lvl.boxes.has(bk)) return false;   // box blocked
      snapshot();
      lvl.boxes.delete(nk); lvl.boxes.add(bk);
    } else {
      snapshot();
    }
    lvl.player = { x: nx, y: ny };
    moves++; syncHud(); draw();
    if (won()) { if (solving) finishSolve(); else levelSolved(); }
    return true;
  }
  function move(dx, dy) { if (busy || solving) return; doMove(dx, dy); }

  // "Solve" demo: reset the level, then auto-play the precomputed shortest solution (no runtime
  // search) one move every MOVE_MS. It's a hint — it does NOT score; when done it offers "Next →".
  function stopSolve() { if (solveTimer) { clearTimeout(solveTimer); solveTimer = null; } solving = false; undoBtn.disabled = false; solveBtn.disabled = false; }
  function toggleFF() { ffMode = !ffMode; ffBtn.textContent = ffMode ? '⏩ Fast' : '▶ Normal'; }
  function finishSolve() {
    stopSolve();
    nextBtn.hidden = lvlIndex + 1 >= SET.levels.length;   // offer Next unless this was the last level
    statusEl.textContent = nextBtn.hidden ? 'Solved! (demo) — last level' : 'Solved! (demo) — Next → or Reset';
  }
  function solveLevel() {
    if (solving) return;
    resetLevel();
    const plan = SET.solutions[lvlIndex] || '';
    if (!plan) { statusEl.textContent = 'No stored solution'; return; }
    statusEl.textContent = 'Solving…';
    solving = true; undoBtn.disabled = true; solveBtn.disabled = true;
    let i = 0;
    const stepOnce = () => {
      if (!solving) return;
      if (i >= plan.length) return finishSolve();
      const [dx, dy] = DIRS[plan[i++]];
      const pushed = lvl.boxes.has(key(lvl.player.x + dx, lvl.player.y + dy));   // box ahead → this is a push
      doMove(dx, dy);
      if (!solving) return;                                  // win → finishSolve already ran
      solveTimer = setTimeout(stepOnce, ffMode && !pushed ? MOVE_FAST : MOVE_MS);
    };
    solveTimer = setTimeout(stepOnce, MOVE_MS);              // initial beat
  }
  function nextStage() { nextBtn.hidden = true; if (lvlIndex + 1 < SET.levels.length) loadLevel(lvlIndex + 1); }

  function levelSolved() {
    busy = true;
    solved++;
    const eff = Math.max(0, 60 - moves);                      // efficiency bonus
    score += solveValue(solved) + eff * solved;               // RAMP: solve value × levels solved
    syncHud(); onScore?.(score);
    if (lvlIndex + 1 >= SET.levels.length) {                  // finished the set — END (no infinite re-clear)
      done = true;
      overMsg.textContent = 'All ' + SET.levels.length + ' ' + SET.name + ' levels cleared! Score ' + score;
      overEl.hidden = false;
      return;
    }
    setTimeout(() => { if (canvas.isConnected && !done) loadLevel(lvlIndex + 1); }, 480);
  }

  function draw() {
    ctx.fillStyle = '#12151c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < lvl.h; y++) for (let x = 0; x < lvl.w; x++) {
      const k = key(x, y), px = x * cell, py = y * cell;
      if (lvl.walls.has(k)) { ctx.fillStyle = '#3a4150'; ctx.fillRect(px, py, cell, cell); }
      if (lvl.goals.has(k)) { ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2, Math.max(2, cell * 0.14), 0, Math.PI * 2); ctx.fill(); }
    }
    for (const k of lvl.boxes) {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = lvl.goals.has(k) ? '#69db7c' : '#c08457';
      ctx.fillRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
    }
    ctx.fillStyle = '#4dabf7';
    ctx.beginPath(); ctx.arc(lvl.player.x * cell + cell / 2, lvl.player.y * cell + cell / 2, cell * 0.34, 0, Math.PI * 2); ctx.fill();
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') move(0, -1);
    else if (k === 'arrowdown' || k === 's') move(0, 1);
    else if (k === 'arrowleft' || k === 'a') move(-1, 0);
    else if (k === 'arrowright' || k === 'd') move(1, 0);
    else if (k === 'z') undo();
    else return;
    e.preventDefault();
  }

  const detachSwipe = swipe(canvas, (dir) => {
    if (dir === 'up') move(0, -1); else if (dir === 'down') move(0, 1);
    else if (dir === 'left') move(-1, 0); else if (dir === 'right') move(1, 0);
  });
  const pad = dpad(wrap, [
    { id: 'u', label: '▲' }, { id: 'l', label: '◀' }, { id: 'd', label: '▼' }, { id: 'r', label: '▶' },
  ], (id) => {
    if (id === 'u') move(0, -1); else if (id === 'd') move(0, 1);
    else if (id === 'l') move(-1, 0); else if (id === 'r') move(1, 0);
  });

  window.addEventListener('keydown', onKey);
  if (setSel) setSel.addEventListener('change', () => chooseSet(setSel.value));
  host.querySelector('.sokoban-undo').addEventListener('click', undo);
  host.querySelector('.sokoban-reset').addEventListener('click', resetLevel);
  host.querySelector('.sokoban-solve').addEventListener('click', solveLevel);
  host.querySelector('.sokoban-ff').addEventListener('click', toggleFF);
  host.querySelector('.sokoban-next').addEventListener('click', nextStage);
  host.querySelector('.sokoban-restart').addEventListener('click', reset);
  host.querySelector('.sokoban-quit').addEventListener('click', () => onExit?.());

  wrap.__sokoban = {
    state: () => ({ score, moves, solved, levelIndex: lvlIndex, done, total: SET.levels.length, solving, ffMode,
      setId: SET.id, setCount: SETS.length,
      undoDisabled: undoBtn.disabled, nextShown: !nextBtn.hidden,
      boxes: lvl.boxes.size, onGoal: [...lvl.boxes].filter((k) => lvl.goals.has(k)).length }),
    solveValueAt: (n) => solveValue(n),
    solution: () => SET.solutions[lvlIndex],
    chooseSet,
  };

  reset();

  return {
    destroy() {
      stopSolve();
      window.removeEventListener('keydown', onKey);
      detachSwipe(); pad.destroy();
      host.innerHTML = '';
    },
  };
}
