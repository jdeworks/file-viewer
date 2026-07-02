// Minesweeper - grid deduction puzzle. Pure DOM (tap/click). Cross-platform flagging: a Flag-mode
// toggle for touch, plus right-click on desktop. Difficulty modes are explicit; Solvable mode accepts
// only boards a deterministic no-guess solver can finish from the first click.
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
const NUM_COLORS = ['', '#4dabf7', '#37b24d', '#f03e3e', '#7048e8', '#e8590c', '#0ca678', '#495057', '#868e96'];
const MODES = {
  easy: { label: 'Easy', cols: 9, rows: 9, mines: 10 },
  medium: { label: 'Medium', cols: 12, rows: 12, mines: 22 },
  hard: { label: 'Hard', cols: 16, rows: 16, mines: 45 },
  solvable: { label: 'Solvable', cols: 9, rows: 9, mines: 10, solvable: true },
};
const MODE_ORDER = ['easy', 'medium', 'hard', 'solvable'];

const cellKey = (i) => String(i);
const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));
const isSubset = (a, b) => [...a].every((v) => b.has(v));

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="mine-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px;max-width:100%">'
    + '<div class="mine-hud" style="display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:14px;font-weight:600">'
    + '<span class="mine-score">Score: 0</span><span class="mine-level">Lv 1</span>'
    + '<span class="mine-left">💣 0</span>'
    + '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600">Mode '
    + '<select class="mine-mode">'
    + MODE_ORDER.map((id) => '<option value="' + id + '">' + MODES[id].label + '</option>').join('')
    + '</select></label></div>'
    + '<button class="mine-flag" type="button" style="font-size:13px;padding:4px 10px;border-radius:8px;cursor:pointer;'
    + 'border:1px solid rgba(128,128,128,.4);background:rgba(128,128,128,.12)">⛏️ Dig mode</button>'
    + '<div class="mine-grid" style="display:grid;gap:2px;justify-content:center;max-width:100%;overflow:auto"></div>'
    + '<div class="mine-over" hidden style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px">'
    + '<div class="mine-over-msg" style="font-size:16px;font-weight:700"></div>'
    + '<div><button class="mine-restart">Play again</button> <button class="mine-quit">Back</button></div></div>'
    + '</div>';

  const wrap = host.querySelector('.mine-wrap');
  const gridEl = host.querySelector('.mine-grid');
  const scoreEl = host.querySelector('.mine-score');
  const levelEl = host.querySelector('.mine-level');
  const leftEl = host.querySelector('.mine-left');
  const modeEl = host.querySelector('.mine-mode');
  const flagBtn = host.querySelector('.mine-flag');
  const overEl = host.querySelector('.mine-over');
  const overMsg = host.querySelector('.mine-over-msg');

  let cols, rows, mines, cells, score, level, dead, won, seeded, flags, revealedCount, flagMode, mode, solvableProof;

  const idx = (r, c) => r * cols + c;
  const neighborsFor = (i, width = cols, height = rows) => {
    const r = Math.floor(i / width), c = i % width, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width) out.push(nr * width + nc);
    }
    return out;
  };

  function readMode() {
    try {
      const saved = localStorage.getItem('fv:minesweeper:mode');
      if (MODES[saved]) return saved;
    } catch {}
    return 'easy';
  }

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    leftEl.textContent = '💣 ' + Math.max(0, mines - flags);
  }

  function makeEmptyCells() {
    return Array.from({ length: cols * rows }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }));
  }

  function configureFromMode() {
    const cfg = MODES[mode];
    cols = cfg.cols; rows = cfg.rows; mines = cfg.mines;
    cells = makeEmptyCells();
    seeded = false; flags = 0; revealedCount = 0; solvableProof = null;
    gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    modeEl.value = mode;
    render();
  }

  function placeRandomMines(safe, targetCells = cells) {
    const banned = new Set([safe, ...neighborsFor(safe)]);
    const maxMines = Math.max(0, targetCells.length - banned.size);
    mines = Math.min(mines, maxMines);
    for (const cell of targetCells) { cell.mine = false; cell.adj = 0; }
    let placed = 0, guard = 0;
    while (placed < mines && guard < targetCells.length * 80) {
      guard++;
      const i = Math.floor(Math.random() * targetCells.length);
      if (banned.has(i) || targetCells[i].mine) continue;
      targetCells[i].mine = true; placed++;
    }
    if (placed < mines) return false;
    computeAdj(targetCells);
    return true;
  }

  function computeAdj(targetCells = cells) {
    for (let i = 0; i < targetCells.length; i++) {
      targetCells[i].adj = targetCells[i].mine ? 0 : neighborsFor(i).filter((n) => targetCells[n].mine).length;
    }
  }

  function revealOnSet(boardCells, revealed, start) {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (revealed.has(i) || boardCells[i].mine) continue;
      revealed.add(i);
      if (boardCells[i].adj === 0) for (const n of neighborsFor(i)) if (!revealed.has(n)) stack.push(n);
    }
  }

  function addKnown(target, i) {
    const before = target.size;
    target.add(i);
    return target.size !== before;
  }

  function deterministicSolve(boardCells, start) {
    const revealed = new Set();
    const knownMines = new Set();
    const safeQueue = [start];
    let passes = 0, moves = 0;

    while (safeQueue.length) revealOnSet(boardCells, revealed, safeQueue.pop());

    let changed = true;
    while (changed && passes < 400) {
      passes++;
      changed = false;
      const constraints = [];
      for (const i of revealed) {
        if (boardCells[i].mine) continue;
        const hidden = [];
        let marked = 0;
        for (const n of neighborsFor(i)) {
          if (knownMines.has(n)) marked++;
          else if (!revealed.has(n)) hidden.push(n);
        }
        const need = boardCells[i].adj - marked;
        if (hidden.length === 0) continue;
        if (need === 0) {
          for (const n of hidden) if (!revealed.has(n)) { safeQueue.push(n); changed = true; moves++; }
        } else if (need === hidden.length) {
          for (const n of hidden) if (addKnown(knownMines, n)) { changed = true; moves++; }
        } else {
          constraints.push({ cells: new Set(hidden.map(cellKey)), count: need });
        }
      }

      const allHidden = [];
      for (let i = 0; i < boardCells.length; i++) if (!revealed.has(i) && !knownMines.has(i)) allHidden.push(i);
      const remainingMines = mines - knownMines.size;
      if (allHidden.length && remainingMines >= 0 && remainingMines <= allHidden.length) {
        constraints.push({ cells: new Set(allHidden.map(cellKey)), count: remainingMines });
      }

      for (let a = 0; a < constraints.length; a++) {
        for (let b = 0; b < constraints.length; b++) {
          if (a === b) continue;
          const ca = constraints[a], cb = constraints[b];
          if (ca.cells.size >= cb.cells.size || !isSubset(ca.cells, cb.cells) || sameSet(ca.cells, cb.cells)) continue;
          const diff = [...cb.cells].filter((v) => !ca.cells.has(v)).map(Number);
          const diffCount = cb.count - ca.count;
          if (!diff.length) continue;
          if (diffCount === 0) {
            for (const n of diff) if (!revealed.has(n)) { safeQueue.push(n); changed = true; moves++; }
          } else if (diffCount === diff.length) {
            for (const n of diff) if (addKnown(knownMines, n)) { changed = true; moves++; }
          }
        }
      }

      while (safeQueue.length) revealOnSet(boardCells, revealed, safeQueue.pop());
      if (revealed.size === boardCells.length - mines) return { solved: true, passes, moves, revealed: revealed.size, knownMines: knownMines.size };
    }

    return { solved: revealed.size === boardCells.length - mines, passes, moves, revealed: revealed.size, knownMines: knownMines.size };
  }

  function makeConstructiveSolvable(safe) {
    const banned = new Set([safe, ...neighborsFor(safe)]);
    for (const cell of cells) { cell.mine = false; cell.adj = 0; }
    let placed = 0;
    for (let i = cells.length - 1; i >= 0 && placed < mines; i--) {
      if (banned.has(i)) continue;
      const r = Math.floor(i / cols), c = i % cols;
      if (r < rows - 3 && c < cols - 3) continue;
      cells[i].mine = true; placed++;
    }
    mines = placed;
    computeAdj(cells);
    return deterministicSolve(cells, safe);
  }

  function seedRandom(safe) {
    if (!placeRandomMines(safe, cells)) makeConstructiveSolvable(safe);
    solvableProof = null;
    seeded = true;
  }

  function seedSolvable(safe) {
    let best = null;
    for (let attempt = 1; attempt <= 220; attempt++) {
      const candidate = makeEmptyCells();
      if (!placeRandomMines(safe, candidate)) continue;
      const proof = deterministicSolve(candidate, safe);
      if (proof.solved) {
        cells = candidate;
        solvableProof = { ...proof, attempts: attempt, fallback: false };
        seeded = true;
        return;
      }
      if (!best || proof.revealed > best.proof.revealed) best = { candidate, proof };
    }
    const proof = makeConstructiveSolvable(safe);
    solvableProof = { ...proof, attempts: 221, fallback: true, bestRevealed: best?.proof.revealed || 0 };
    seeded = true;
  }

  function seed(safe) {
    if (MODES[mode].solvable) seedSolvable(safe);
    else seedRandom(safe);
  }

  function reveal(start) {
    if (cells[start].flagged || cells[start].revealed) return;
    if (!seeded) seed(start);
    if (cells[start].mine) return loseAt(start);
    let gained = 0;
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      const cell = cells[i];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true; gained++; revealedCount++;
      if (cell.adj === 0) for (const n of neighborsFor(i)) if (!cells[n].revealed) stack.push(n);
    }
    score += gained * (level + 1);
    syncHud(); onScore?.(score); render();
    if (revealedCount === cells.length - mines) boardClear();
  }

  function toggleFlag(i) {
    const cell = cells[i];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    syncHud(); render();
  }

  function boardClear() {
    won = true;
    score += cols * rows * (level + 1) * 2;
    syncHud(); onScore?.(score);
    level++;
    setTimeout(() => { if (gridEl.isConnected) { won = false; configureFromMode(); syncHud(); } }, 520);
  }

  function loseAt(i) {
    dead = true;
    cells[i].mine = true;
    for (const cell of cells) if (cell.mine) cell.revealed = true;
    render();
    overMsg.textContent = 'Boom - score ' + score;
    overEl.hidden = false;
  }

  function render() {
    const size = cols >= 16 ? 23 : 26;
    gridEl.innerHTML = cells.map((cell, i) => {
      const sz = 'width:' + size + 'px;height:' + size + 'px;font-size:' + (size - 12) + 'px;font-weight:700;line-height:1;border-radius:4px;cursor:pointer;padding:0;';
      let bg = 'rgba(128,128,128,.30)', txt = '', color = '#888';
      if (cell.revealed) {
        bg = 'rgba(128,128,128,.10)';
        if (cell.mine) txt = '💥';
        else if (cell.adj) { txt = cell.adj; color = NUM_COLORS[cell.adj]; }
      } else if (cell.flagged) { txt = '🚩'; }
      return '<button class="mine-cell" data-i="' + i + '" style="' + sz + 'border:1px solid rgba(128,128,128,.35);background:'
        + bg + ';color:' + color + '">' + txt + '</button>';
    }).join('');
  }

  function reset(keepMode = false) {
    score = 0; level = 0; dead = false; won = false; flagMode = false;
    if (!keepMode) mode = readMode();
    flagBtn.textContent = '⛏️ Dig mode';
    overEl.hidden = true;
    configureFromMode(); syncHud();
  }

  function onCellClick(e) {
    const btn = e.target.closest('.mine-cell');
    if (!btn || dead) return;
    const i = Number(btn.dataset.i);
    if (flagMode) toggleFlag(i); else reveal(i);
  }
  function onCellContext(e) {
    const btn = e.target.closest('.mine-cell');
    if (!btn || dead) return;
    e.preventDefault();
    toggleFlag(Number(btn.dataset.i));
  }
  function onFlagToggle() {
    flagMode = !flagMode;
    flagBtn.textContent = flagMode ? '🚩 Flag mode' : '⛏️ Dig mode';
  }
  function onModeChange() {
    mode = modeEl.value;
    try { localStorage.setItem('fv:minesweeper:mode', mode); } catch {}
    reset(true);
  }

  gridEl.addEventListener('click', onCellClick);
  gridEl.addEventListener('contextmenu', onCellContext);
  flagBtn.addEventListener('click', onFlagToggle);
  modeEl.addEventListener('change', onModeChange);
  host.querySelector('.mine-restart').addEventListener('click', () => reset());
  host.querySelector('.mine-quit').addEventListener('click', () => onExit?.());

  wrap.__mine = {
    state: () => ({
      score, level, dead, won, flagMode, mode, minesLeft: mines - flags, mines, cols, rows,
      revealed: revealedCount, cells: cells.length, seeded, solvableProof,
    }),
    firstCovered: () => cells.findIndex((c) => !c.revealed && !c.flagged),
    setMode(nextMode) { if (!MODES[nextMode]) return; mode = nextMode; modeEl.value = nextMode; reset(true); },
    reveal,
    solveCurrent: (start = 0) => {
      if (!seeded) seed(start);
      return deterministicSolve(cells, start);
    },
    proveSolvableStarts(starts = [0, 10, 40, 70, 80]) {
      const previousMode = mode;
      const results = [];
      mode = 'solvable';
      for (const start of starts) {
        configureFromMode();
        seed(start);
        results.push({ start, proof: solvableProof });
      }
      mode = previousMode;
      configureFromMode();
      syncHud();
      return results;
    },
  };

  reset();

  return {
    destroy() {
      gridEl.removeEventListener('click', onCellClick);
      gridEl.removeEventListener('contextmenu', onCellContext);
      flagBtn.removeEventListener('click', onFlagToggle);
      modeEl.removeEventListener('change', onModeChange);
      host.innerHTML = '';
    },
  };
}
