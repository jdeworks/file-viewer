// 2048 — the second arcade easter-egg game. A 4×4 sliding-tile puzzle: merge equal tiles to reach
// 2048. Keyboard (arrows / WASD) + touch-swipe. Self-contained DOM grid (no canvas needed); score
// feeds the arcade high-score economy via onScore. Contract: mount(host, { onScore, onExit }).
const SIZE = 4;

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="g2048-wrap">'
    + '<div class="g2048-hud"><span class="g2048-score">Score: 0</span>'
    + '<span class="g2048-hint">Arrows / WASD · Swipe</span></div>'
    + '<div class="g2048-board"></div>'
    + '<div class="g2048-over" hidden><div class="g2048-over-box"><div class="g2048-over-msg"></div>'
    + '<button class="g2048-restart">Play again</button> <button class="g2048-quit">Back</button></div></div>'
    + '</div>';
  const boardEl = host.querySelector('.g2048-board');
  const scoreEl = host.querySelector('.g2048-score');
  const overEl  = host.querySelector('.g2048-over');
  const overMsg = host.querySelector('.g2048-over-msg');

  // Build the permanent 16 background cells once.
  for (let i = 0; i < SIZE * SIZE; i++) {
    const bg = document.createElement('div');
    bg.className = 'g2048-bg-cell';
    boardEl.appendChild(bg);
  }

  // Tile identity: each tile is { id, r, c, value }. tileEls maps id → DOM element.
  let tiles = [], nextId = 1, score = 0, dead = false;
  const tileEls = new Map();

  function gridValue(r, c) {
    return tiles.find((t) => t.r === r && t.c === c)?.value || 0;
  }
  function empties() {
    const occ = new Set(tiles.map((t) => t.r + ',' + t.c));
    const out = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
      if (!occ.has(r + ',' + c)) out.push([r, c]);
    return out;
  }
  function addTile() {
    const e = empties();
    if (!e.length) return;
    const [r, c] = e[Math.floor(Math.random() * e.length)];
    tiles.push({ id: nextId++, r, c, value: Math.random() < 0.9 ? 2 : 4 });
  }

  // Collapse a row of tile-objects leftward. Returns { result, gained, moved }.
  // Merges keep the first tile's id; the second tile's id goes into toRemove.
  function collapseRow(row) {
    const nums = row.filter((t) => t.value);
    const out = [];
    let gained = 0, i = 0;
    while (i < nums.length) {
      if (i + 1 < nums.length && nums[i].value === nums[i + 1].value) {
        const nv = nums[i].value * 2;
        gained += nv;
        out.push({ id: nums[i].id, value: nv, mergedFrom: nums[i + 1].id });
        i += 2;
      } else {
        out.push({ id: nums[i].id, value: nums[i].value });
        i++;
      }
    }
    while (out.length < SIZE) out.push({ id: null, value: 0 });
    const moved = out.some((t, idx) => t.id !== (row[idx]?.id ?? null));
    return { result: out, gained, moved };
  }

  // rotateCW works on any 2-D array (values or tile-objects — just rearranges refs).
  const rotateCW = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse());

  function move(dir) {
    if (dead) return;

    // Build SIZE×SIZE grid of tile-objects (null-id sentinel for empties).
    let g = Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => tiles.find((t) => t.r === r && t.c === c) || { id: null, value: 0 })
    );

    for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g);

    let anyMoved = false, gained = 0;
    const toRemove = new Set();
    g = g.map((row) => {
      const { result, gained: g2, moved } = collapseRow(row);
      if (moved) anyMoved = true;
      gained += g2;
      result.forEach((s) => { if (s.mergedFrom) toRemove.add(s.mergedFrom); });
      return result;
    });

    for (let i = 0; i < dir; i++) g = rotateCW(g);

    if (!anyMoved) return;

    // FLIP — snapshot bounding rects before the DOM updates.
    const oldRects = {};
    tiles.forEach((t) => {
      const el = tileEls.get(t.id);
      if (el) oldRects[t.id] = el.getBoundingClientRect();
    });

    // Remove merged tiles from the data model.
    tiles = tiles.filter((t) => !toRemove.has(t.id));

    // Apply new positions / values from the collapsed grid.
    g.forEach((row, r) => row.forEach((slot, c) => {
      if (!slot.id) return;
      const t = tiles.find((t2) => t2.id === slot.id);
      if (t) { t.r = r; t.c = c; t.value = slot.value; }
    }));

    score += gained;
    addTile();

    scoreEl.textContent = 'Score: ' + score;
    onScore?.(score);
    draw(oldRects);
    if (!canMove()) gameOver();
  }

  function draw(oldRects = {}) {
    // Remove DOM elements for tiles that no longer exist.
    for (const [id, el] of tileEls) {
      if (!tiles.find((t) => t.id === id)) { el.remove(); tileEls.delete(id); }
    }

    tiles.forEach((t) => {
      let el = tileEls.get(t.id);
      const isNew = !el;
      if (!el) {
        el = document.createElement('div');
        boardEl.appendChild(el);
        tileEls.set(t.id, el);
      }

      el.className = 'g2048-cell g2048-v' + t.value + (isNew ? ' g2048-new' : '');
      el.textContent = t.value;
      el.style.gridRow    = (t.r + 1) + '';
      el.style.gridColumn = (t.c + 1) + '';

      // FLIP: animate from old position to new position.
      const oldRect = oldRects[t.id];
      if (oldRect && !isNew) {
        const newRect = el.getBoundingClientRect();
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top  - newRect.top;
        if (dx !== 0 || dy !== 0) {
          el.style.transition = 'none';
          el.style.transform  = `translate(${dx}px,${dy}px)`;
          el.offsetHeight; // force reflow
          el.style.transition = 'transform 0.12s ease';
          el.style.transform  = '';
        }
      }
    });
  }

  function canMove() {
    if (empties().length) return true;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const v = gridValue(r, c);
      if (c + 1 < SIZE && v === gridValue(r, c + 1)) return true;
      if (r + 1 < SIZE && v === gridValue(r + 1, c)) return true;
    }
    return false;
  }
  function gameOver() { dead = true; overMsg.textContent = 'Game over — score ' + score; overEl.hidden = false; }

  function reset() {
    tiles = []; nextId = 1; score = 0; dead = false;
    tileEls.forEach((el) => el.remove()); tileEls.clear();
    overEl.hidden = true;
    scoreEl.textContent = 'Score: 0';
    addTile(); addTile();
    draw();
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 };
    if (!(k in map)) return;
    e.preventDefault();
    move(map[k]);
  }
  let tStart = null;
  function onTouchStart(e) { e.preventDefault(); const t = e.touches[0]; tStart = { x: t.clientX, y: t.clientY }; }
  function onTouchEnd(e) {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { tStart = null; return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 2 : 0); else move(dy > 0 ? 3 : 1);
    tStart = null;
  }

  window.addEventListener('keydown', onKey);
  host.addEventListener('touchstart', onTouchStart, { passive: false });
  host.addEventListener('touchend', onTouchEnd, { passive: true });
  host.querySelector('.g2048-restart').addEventListener('click', reset);
  host.querySelector('.g2048-quit').addEventListener('click', () => onExit?.());

  reset();
  return {
    destroy() {
      window.removeEventListener('keydown', onKey);
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchend', onTouchEnd);
      host.innerHTML = '';
    },
    _move: move,   // test seam
  };
}
