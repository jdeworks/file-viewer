// Minesweeper — grid deduction puzzle. Pure DOM (tap/click). Cross-platform flagging: a Flag-mode
// toggle for touch, plus right-click on desktop. Difficulty ESCALATES: clearing a board advances to a
// larger, denser one. Scoring RAMPS: revealed cells and the board-clear bonus both scale with level,
// so deeper boards are worth disproportionately more. First click is always safe.
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
const NUM_COLORS = ['', '#4dabf7', '#37b24d', '#f03e3e', '#7048e8', '#e8590c', '#0ca678', '#495057', '#868e96'];
const board = (lvl) => ({
  cols: Math.min(14, 9 + lvl),
  rows: Math.min(16, 9 + lvl * 2),
  density: Math.min(0.23, 0.13 + lvl * 0.02),
});

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="mine-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px;max-width:100%">'
    + '<div class="mine-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="mine-score">Score: 0</span><span class="mine-level">Lv 1</span>'
    + '<span class="mine-left">💣 0</span></div>'
    + '<button class="mine-flag" type="button" style="font-size:13px;padding:4px 10px;border-radius:8px;cursor:pointer;'
    + 'border:1px solid rgba(128,128,128,.4);background:rgba(128,128,128,.12)">⛏️ Dig mode</button>'
    + '<div class="mine-grid" style="display:grid;gap:2px;justify-content:center"></div>'
    + '<div class="mine-over" hidden style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px">'
    + '<div class="mine-over-msg" style="font-size:16px;font-weight:700"></div>'
    + '<div><button class="mine-restart">Play again</button> <button class="mine-quit">Back</button></div></div>'
    + '</div>';

  const wrap = host.querySelector('.mine-wrap');
  const gridEl = host.querySelector('.mine-grid');
  const scoreEl = host.querySelector('.mine-score');
  const levelEl = host.querySelector('.mine-level');
  const leftEl = host.querySelector('.mine-left');
  const flagBtn = host.querySelector('.mine-flag');
  const overEl = host.querySelector('.mine-over');
  const overMsg = host.querySelector('.mine-over-msg');

  let cols, rows, mines, cells, score, level, dead, won, seeded, flags, revealedCount, flagMode;

  const idx = (r, c) => r * cols + c;
  const neighbors = (i) => {
    const r = Math.floor(i / cols), c = i % cols, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(idx(nr, nc));
    }
    return out;
  };

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    leftEl.textContent = '💣 ' + Math.max(0, mines - flags);
  }

  function buildBoard() {
    const b = board(level);
    cols = b.cols; rows = b.rows;
    mines = Math.round(cols * rows * b.density);
    cells = Array.from({ length: cols * rows }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }));
    seeded = false; flags = 0; revealedCount = 0;
    gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    render();
  }

  function seed(safe) {
    // First click is always safe AND opens an area: ban the clicked cell + all 8 neighbours from
    // holding a mine, so it has 0 adjacent mines and floods. Clamp + guard so it can never hang.
    const banned = new Set([safe, ...neighbors(safe)]);
    mines = Math.min(mines, Math.max(0, cells.length - banned.size));
    let placed = 0, guard = 0;
    while (placed < mines && guard < cells.length * 50) {
      guard++;
      const i = Math.floor(Math.random() * cells.length);
      if (banned.has(i) || cells[i].mine) continue;
      cells[i].mine = true; placed++;
    }
    for (let i = 0; i < cells.length; i++) if (!cells[i].mine) cells[i].adj = neighbors(i).filter((n) => cells[n].mine).length;
    seeded = true;
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
      if (cell.adj === 0) for (const n of neighbors(i)) if (!cells[n].revealed) stack.push(n);
    }
    score += gained * (level + 1);                          // RAMP: revealed cells × level
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
    score += cols * rows * (level + 1) * 2;                 // RAMP: board-clear bonus × level
    syncHud(); onScore?.(score);
    level++;
    setTimeout(() => { if (gridEl.isConnected) { won = false; buildBoard(); syncHud(); } }, 520);
  }

  function loseAt(i) {
    dead = true;
    cells[i].mine = true;
    for (const cell of cells) if (cell.mine) cell.revealed = true;
    render();
    overMsg.textContent = 'Boom — score ' + score;
    overEl.hidden = false;
  }

  function render() {
    gridEl.innerHTML = cells.map((cell, i) => {
      const sz = 'width:26px;height:26px;font-size:14px;font-weight:700;line-height:1;border-radius:4px;cursor:pointer;padding:0;';
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

  function reset() {
    score = 0; level = 0; dead = false; won = false; flagMode = false;
    flagBtn.textContent = '⛏️ Dig mode';
    overEl.hidden = true;
    buildBoard(); syncHud();
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

  gridEl.addEventListener('click', onCellClick);
  gridEl.addEventListener('contextmenu', onCellContext);
  flagBtn.addEventListener('click', onFlagToggle);
  host.querySelector('.mine-restart').addEventListener('click', reset);
  host.querySelector('.mine-quit').addEventListener('click', () => onExit?.());

  wrap.__mine = {
    state: () => ({ score, level, dead, won, flagMode, minesLeft: mines - flags, revealed: revealedCount, cells: cells.length }),
    firstCovered: () => cells.findIndex((c) => !c.revealed && !c.flagged),
  };

  reset();

  return {
    destroy() {
      gridEl.removeEventListener('click', onCellClick);
      gridEl.removeEventListener('contextmenu', onCellContext);
      flagBtn.removeEventListener('click', onFlagToggle);
      host.innerHTML = '';
    },
  };
}
