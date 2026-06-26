// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage3/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage3/messages.js
var ACTION_NAME = "diff_key_restored";
var REQUIRED_ACTION = "3.diff_key_restored";
var ACHIEVEMENT_ID = "stage3.diff_key_restored";
var ACHIEVEMENT_TEXT = "I found the difference.";
var BTS_PATH = "/docs/bts/memory_grid.bts";
var MEMORY_V1_PATH = "/docs/examples/metagame/stage3/memory_v1.log";
var MEMORY_V2_PATH = "/docs/examples/metagame/stage3/memory_v2.log";
var bellMessages = {
  start: "a memory is not a file until it survives being changed.",
  unlock: "the difference restored the missing key.",
  defeated: "the leak stopped widening."
};
var lockedHintLadder = [
  "the grid remembers less every time you ask it.",
  "two memory logs disagree. the disagreement matters.",
  "compare memory_v1.log and memory_v2.log. read the changed hunks in order.",
  "enter the restoration key formed by the diff pieces before fighting The Memory Leak."
];

// ../../docs/games/metagame/stages/stage3/content.js
function memoryV1Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v1`,
    "sector 01: retained visual boundary",
    "sector 02: restoration chunk <sec",
    "sector 03: child process @ still moving",
    "sector 04: restoration chunk ret",
    "sector 05: registers stable",
    "sector 06: restoration chunk key>",
    "sector 07: leak not yet visible"
  ].join("\n");
}
function memoryV2Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v2`,
    "sector 01: retained visual boundary",
    "sector 02: restoration chunk [missing]",
    "sector 03: child process @ still moving",
    "sector 04: restoration chunk [missing]",
    "sector 05: registers unstable",
    "sector 06: restoration chunk [missing]",
    "sector 07: leak expanding"
  ].join("\n");
}
function diffKeyFromState(state) {
  return state.memoryPair.pieces.join("");
}

// ../../docs/games/metagame/stages/stage3/boss.js
function hasDiffKeyRestored(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(3, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasDiffKeyRestored(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    corruptionRate: unlocked ? "normal" : "accelerated",
    columnClues: unlocked ? "restored" : "missing",
    defeatPossible: unlocked,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function tryRestoreDiffKey({ state, actions, achievements, bell, input }) {
  const expected = diffKeyFromState(state);
  const normalized = String(input || "").trim();
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (normalized !== expected) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "wrong restoration key. the leak keeps the columns hidden.");
    return { ok: false, expected };
  }
  state.boss.unlocked = true;
  actions?.setAction?.(3, ACTION_NAME, {
    source: "stage-boss",
    files: ["memory_v1.log", "memory_v2.log"],
    diffActionSeen: true,
    keyId: state.memoryPair.runId
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 3,
    title: ACHIEVEMENT_TEXT,
    detail: { keyId: state.memoryPair.runId }
  });
  bell?.showBell?.("stage3.diff_key_restored", bellMessages.unlock, { stage: 3 });
  pushLog(state, bellMessages.unlock);
  return { ok: true, expected };
}
function defeatMemoryLeak(state) {
  if (!state.boss.unlocked || state.boss.defeated) return false;
  state.boss.defeated = true;
  state.registers += 120;
  state.retained = Math.max(state.retained, 1);
  pushLog(state, bellMessages.defeated);
  return true;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage3/rng.js
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const next = mulberry32(xmur3(String(seed))());
  const float = () => next();
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { float, int, pick, chance, shuffle };
}

// ../../docs/games/metagame/stages/stage3/nonogram.js
var UNKNOWN = -1;
var EMPTY = 0;
var FILLED = 1;
function runLengths(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === FILLED) run += 1;
    else if (run > 0) {
      out.push(run);
      run = 0;
    }
  }
  if (run > 0) out.push(run);
  return out;
}
var ARR_CACHE = /* @__PURE__ */ new Map();
function arrangements(n, clues) {
  const key = n + ":" + clues.join(",");
  const hit = ARR_CACHE.get(key);
  if (hit) return hit;
  const out = [];
  function rec(pos, ci, mask) {
    if (ci === clues.length) {
      out.push(mask >>> 0);
      return;
    }
    const b = clues[ci];
    let need = 0;
    for (let k = ci + 1; k < clues.length; k += 1) need += clues[k] + 1;
    for (let s = pos; s + b + need <= n; s += 1) {
      let m = mask;
      for (let i = s; i < s + b; i += 1) m |= 1 << i;
      rec(s + b + 1, ci + 1, m);
    }
  }
  if (clues.length === 0) out.push(0);
  else rec(0, 0, 0);
  ARR_CACHE.set(key, out);
  return out;
}
function consistent(mask, cells) {
  for (let i = 0; i < cells.length; i += 1) {
    const bit = mask >> i & 1;
    if (cells[i] === FILLED && !bit) return false;
    if (cells[i] === EMPTY && bit) return false;
  }
  return true;
}
function lineSolve(cells, clues) {
  const masks = arrangements(cells.length, clues);
  let and = ~0;
  let or = 0;
  let any = false;
  for (const m of masks) {
    if (!consistent(m, cells)) continue;
    and &= m;
    or |= m;
    any = true;
  }
  if (!any) return null;
  const out = cells.slice();
  let changed = false;
  for (let i = 0; i < cells.length; i += 1) {
    if (and >> i & 1 && out[i] !== FILLED) {
      out[i] = FILLED;
      changed = true;
    } else if (!(or >> i & 1) && out[i] !== EMPTY) {
      out[i] = EMPTY;
      changed = true;
    }
  }
  return { out, changed };
}
function solve(rowClues, colClues) {
  const H = rowClues.length;
  const W = colClues.length;
  const grid = Array.from({ length: H }, () => new Array(W).fill(UNKNOWN));
  let changed = true;
  let passes = 0;
  while (changed) {
    changed = false;
    passes += 1;
    if (passes > 2e3) break;
    for (let r = 0; r < H; r += 1) {
      const res = lineSolve(grid[r], rowClues[r]);
      if (!res) return null;
      if (res.changed) {
        grid[r] = res.out;
        changed = true;
      }
    }
    for (let c = 0; c < W; c += 1) {
      const col = grid.map((row) => row[c]);
      const res = lineSolve(col, colClues[c]);
      if (!res) return null;
      if (res.changed) {
        for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r];
        changed = true;
      }
    }
  }
  const solved = grid.every((row) => row.every((v) => v !== UNKNOWN));
  return { grid, solved, passes };
}
function cluesOf(sol, width, height) {
  const rowClues = sol.map(runLengths);
  const colClues = [];
  for (let c = 0; c < width; c += 1) colClues.push(runLengths(sol.map((row) => row[c])));
  return { rowClues, colClues };
}
function attempt(seed, width, height, density, maxTries) {
  const minFill = Math.max(1, Math.round(width * height * 0.18));
  for (let n = 0; n < maxTries; n += 1) {
    const rng = makeRng(`${seed}:${n}`);
    const sol = Array.from({ length: height }, () => Array.from({ length: width }, () => rng.float() < density ? FILLED : EMPTY));
    let filled = 0;
    for (const row of sol) for (const v of row) filled += v;
    if (filled < minFill) continue;
    const { rowClues, colClues } = cluesOf(sol, width, height);
    const res = solve(rowClues, colClues);
    if (res && res.solved) {
      return { width, height, solution: sol, rowClues, colClues, seed: `${seed}:${n}`, difficulty: res.passes };
    }
  }
  return null;
}
function fallback(width, height) {
  const sol = Array.from({ length: height }, (_, r) => Array.from({ length: width }, () => r % 2 === 0 ? FILLED : EMPTY));
  const { rowClues, colClues } = cluesOf(sol, width, height);
  return { width, height, solution: sol, rowClues, colClues, seed: "fallback", difficulty: 1, isFallback: true };
}
function makePuzzle(seed, { width = 5, height = 5 } = {}) {
  for (const density of [0.55, 0.5, 0.45, 0.4, 0.35, 0.3]) {
    const p = attempt(`${seed}:d${Math.round(density * 100)}`, width, height, density, 250);
    if (p) return p;
  }
  return fallback(width, height);
}

// ../../docs/games/metagame/stages/stage3/board.js
var CH = { [FILLED]: "#", [EMPTY]: "x", [UNKNOWN]: "." };
var FROM_CH = { "#": FILLED, x: EMPTY, ".": UNKNOWN };
function sizeForRun(run) {
  return Math.max(5, Math.min(12, 5 + Math.floor(Number(run.solvedCount || 0) / 2)));
}
function puzzleForRun(run) {
  const size = sizeForRun(run);
  return makePuzzle(`${run.seed}:${run.index}`, { width: size, height: size });
}
function encodeMarks(marks) {
  return marks.map((row) => row.map((v) => CH[v] || ".").join(""));
}
function decodeMarks(rows, width, height) {
  if (!Array.isArray(rows) || rows.length !== height) return null;
  const out = [];
  for (let y = 0; y < height; y += 1) {
    const s = String(rows[y] || "");
    if (s.length !== width) return null;
    out.push([...s].map((c) => FROM_CH[c] === void 0 ? UNKNOWN : FROM_CH[c]));
  }
  return out;
}
function createBoard(puzzle, savedMarks) {
  const marks = decodeMarks(savedMarks, puzzle.width, puzzle.height) || Array.from({ length: puzzle.height }, () => new Array(puzzle.width).fill(UNKNOWN));
  return { puzzle, marks, cursor: { x: 0, y: 0 }, solved: isSolved(puzzle, marks) };
}
function isSolved(puzzle, marks) {
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (puzzle.solution[y][x] === FILLED !== (marks[y][x] === FILLED)) return false;
    }
  }
  return true;
}
function setCell(board, x, y, mark) {
  if (board.solved) return false;
  const cur = board.marks[y][x];
  const target = mark ? EMPTY : FILLED;
  board.marks[y][x] = cur === target ? UNKNOWN : target;
  board.solved = isSolved(board.puzzle, board.marks);
  const wrong = !mark && board.marks[y][x] === FILLED && board.puzzle.solution[y][x] !== FILLED;
  return wrong;
}
function moveCursor(board, dx, dy) {
  board.cursor.x = Math.max(0, Math.min(board.puzzle.width - 1, board.cursor.x + dx));
  board.cursor.y = Math.max(0, Math.min(board.puzzle.height - 1, board.cursor.y + dy));
}
function lineDone(puzzle, marks, kind, i) {
  if (kind === "row") {
    for (let x = 0; x < puzzle.width; x += 1) if (puzzle.solution[i][x] === FILLED !== (marks[i][x] === FILLED)) return false;
    return true;
  }
  for (let y = 0; y < puzzle.height; y += 1) if (puzzle.solution[y][i] === FILLED !== (marks[y][i] === FILLED)) return false;
  return true;
}
function progress(puzzle, marks) {
  let need = 0;
  let have = 0;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (puzzle.solution[y][x] === FILLED) {
        need += 1;
        if (marks[y][x] === FILLED) have += 1;
      }
    }
  }
  return { have, need };
}

// ../../docs/games/metagame/stages/stage3/grid.js
var GLYPH = { [FILLED]: "#", [EMPTY]: "✕", [UNKNOWN]: "·" };
var CLASS = { [FILLED]: "s3-fill", [EMPTY]: "s3-mark", [UNKNOWN]: "s3-blank" };
function buildGrid(puzzle, handlers) {
  const { rowClues, colClues, width, height } = puzzle;
  const rowDisp = rowClues.map((c) => c.length ? c : [0]);
  const colDisp = colClues.map((c) => c.length ? c : [0]);
  const maxRow = Math.max(1, ...rowDisp.map((c) => c.length));
  const maxCol = Math.max(1, ...colDisp.map((c) => c.length));
  const wrap = document.createElement("div");
  wrap.className = "s3-board";
  wrap.style.gridTemplateColumns = `repeat(${maxRow}, var(--s3-clue)) repeat(${width}, var(--s3-cell))`;
  wrap.style.gridTemplateRows = `repeat(${maxCol}, var(--s3-clue)) repeat(${height}, var(--s3-cell))`;
  const place = (el, col, row) => {
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    wrap.append(el);
  };
  const colClueEls = colDisp.map(() => []);
  colDisp.forEach((clues, c) => clues.forEach((n, k) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    el.textContent = String(n);
    place(el, maxRow + c + 1, maxCol - clues.length + k + 1);
    colClueEls[c].push(el);
  }));
  const rowClueEls = rowDisp.map(() => []);
  rowDisp.forEach((clues, r) => clues.forEach((n, k) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    el.textContent = String(n);
    place(el, maxRow - clues.length + k + 1, maxCol + r + 1);
    rowClueEls[r].push(el);
  }));
  const cells = Array.from({ length: height }, () => new Array(width));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const el = document.createElement("span");
      el.className = "s3-cell s3-blank";
      el.dataset.x = String(x);
      el.dataset.y = String(y);
      el.textContent = "·";
      place(el, maxRow + x + 1, maxCol + y + 1);
      cells[y][x] = { el, state: UNKNOWN };
    }
  }
  wrap.addEventListener("mousedown", (e) => {
    const t = e.target.closest(".s3-cell");
    if (!t || t.dataset.x === void 0) return;
    e.preventDefault();
    handlers.onCell(Number(t.dataset.x), Number(t.dataset.y), e.button === 2 || e.shiftKey);
  });
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());
  let lastCursor = null;
  const doneRow = new Array(height).fill(null);
  const doneCol = new Array(width).fill(null);
  function update(board) {
    const marks = board.marks;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cell = cells[y][x];
        const v = marks[y][x];
        if (cell.state !== v) {
          cell.state = v;
          cell.el.textContent = GLYPH[v];
          cell.el.className = "s3-cell " + CLASS[v];
        }
      }
    }
    const cur = `${board.cursor.x},${board.cursor.y}`;
    if (cur !== lastCursor) {
      if (lastCursor) {
        const [px, py] = lastCursor.split(",").map(Number);
        cells[py][px].el.classList.remove("s3-cursor");
      }
      cells[board.cursor.y][board.cursor.x].el.classList.add("s3-cursor");
      lastCursor = cur;
    }
    for (let r = 0; r < height; r += 1) {
      const d = lineDone(puzzle, marks, "row", r);
      if (d !== doneRow[r]) {
        doneRow[r] = d;
        rowClueEls[r].forEach((e) => e.classList.toggle("s3-done", d));
      }
    }
    for (let c = 0; c < width; c += 1) {
      const d = lineDone(puzzle, marks, "col", c);
      if (d !== doneCol[c]) {
        doneCol[c] = d;
        colClueEls[c].forEach((e) => e.classList.toggle("s3-done", d));
      }
    }
  }
  return { el: wrap, update };
}

// ../../docs/games/metagame/stages/stage3/renderer.js
var MOVE = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  W: [0, -1],
  S: [0, 1],
  A: [-1, 0],
  D: [1, 0]
};
var RETAIN_EVERY = 4;
function renderStage3(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage3-memory-grid";
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>RETAINED <span data-field="retained"></span></span>
      <span>SNAPSHOT <span data-field="snap"></span></span>
      <span data-field="size"></span>
    </header>
    <div class="s3-objective" data-field="objective"></div>
    <div class="s3-play">
      <div class="s3-grid-host"></div>
      <aside class="s3-side">
        <div class="s3-help">arrows / WASD move · space fill · x mark · click fills, right-click marks</div>
        <section class="s3-boss">
          <div class="s3-boss-title">THE MEMORY LEAK</div>
          <div data-field="bossStatus"></div>
          <div class="s3-hint" data-field="hint"></div>
          <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
          <div class="s3-controls">
            <button type="button" data-action="v1">open memory_v1.log</button>
            <button type="button" data-action="v2">open memory_v2.log</button>
            <button type="button" data-action="restore">restore key</button>
            <button type="button" data-action="boss">solve leak</button>
            <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
          </div>
        </section>
      </aside>
    </div>
    <ol class="s3-log"></ol>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s3-log");
  const keyInput = root.querySelector(".s3-key");
  const gridHost = root.querySelector(".s3-grid-host");
  const btsBtn = root.querySelector('[data-action="bts"]');
  const setText = (el, v) => {
    const s = String(v);
    if (el.textContent !== s) el.textContent = s;
  };
  const setHidden = (el, h) => {
    if (el.hidden !== h) el.hidden = h;
  };
  const completeOnce = once((result) => onStageComplete?.(result));
  let lastLog = "";
  let board = null;
  let grid = null;
  loadBoard();
  paintHud();
  function loadBoard() {
    const puzzle = puzzleForRun(state.run);
    board = createBoard(puzzle, state.run.marks);
    grid = buildGrid(puzzle, { onCell: (x, y, mark) => {
      board.cursor = { x, y };
      applyCell(x, y, mark);
    } });
    gridHost.replaceChildren(grid.el);
    grid.update(board);
  }
  function applyCell(x, y, mark) {
    if (board.solved) return;
    setCell(board, x, y, mark);
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (board.solved) onSolved();
    else {
      save?.();
      paintHud();
    }
  }
  function onSolved() {
    const size = board.puzzle.width;
    const reward = size * size + 5;
    state.registers += reward;
    state.run.solvedCount += 1;
    state.run.index += 1;
    state.run.marks = null;
    pushLog(state, `snapshot restored. +${reward} registers.`);
    if (state.run.solvedCount % RETAIN_EVERY === 0) {
      state.retained += 1;
      pushLog(state, "a fragment crystallized. +1 retained.");
    }
    save?.();
    loadBoard();
    paintHud();
  }
  function paintHud() {
    const lock = getBossLockState({ actions, state });
    setText(fields.registers, state.registers);
    setText(fields.retained, state.retained);
    setText(fields.snap, `#${state.run.index + 1}`);
    const size = sizeForRun(state.run);
    setText(fields.size, `${size}×${size}`);
    const pr = progress(board.puzzle, board.marks);
    setText(fields.objective, board.solved ? "snapshot restored — drawing the next…" : `restore the memory snapshot — ${pr.have}/${pr.need} cells lit. clear snapshots to retain fragments.`);
    setText(fields.bossStatus, `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`);
    setText(fields.hint, lock.hint);
    setHidden(btsBtn, !state.boss.defeated);
    const sig = state.log.slice(-6).join("\n");
    if (sig !== lastLog) {
      lastLog = sig;
      log.replaceChildren(...state.log.slice(-6).map((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        return li;
      }));
    }
  }
  const onKey = (event) => {
    if (!root.isConnected) return;
    const tag = event.target && event.target.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return;
    if (Object.prototype.hasOwnProperty.call(MOVE, event.key)) {
      event.preventDefault();
      const [dx, dy] = MOVE[event.key];
      moveCursor(board, dx, dy);
      grid.update(board);
      return;
    }
    if (event.key === " " || event.key === "f" || event.key === "F") {
      event.preventDefault();
      applyCell(board.cursor.x, board.cursor.y, false);
      return;
    }
    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      applyCell(board.cursor.x, board.cursor.y, true);
    }
  };
  window.addEventListener("keydown", onKey);
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "v1") viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: "stage3" });
    if (action === "v2") viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: "stage3" });
    if (action === "restore") tryRestoreDiffKey({ state, actions, achievements, bell, input: keyInput.value });
    if (action === "boss" && defeatMemoryLeak(state)) completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    if (action === "bts") bts?.open?.(3);
    save?.();
    paintHud();
  });
  return {
    repaint: paintHud,
    destroy() {
      window.removeEventListener("keydown", onKey);
      root.remove();
    }
  };
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage3/state.js
var DEFAULT_PIECES = ["<sec", "ret", "key>"];
function defaultState() {
  return freshFrom({ registers: 0, retained: 0, shopUpgrades: {}, runCount: 0 });
}
function freshFrom(meta) {
  const runCount = Number(meta.runCount || 0);
  return {
    version: 2,
    registers: Number(meta.registers || 0),
    retained: Number(meta.retained || 0),
    shopUpgrades: meta.shopUpgrades && typeof meta.shopUpgrades === "object" ? meta.shopUpgrades : {},
    runCount,
    run: { seed: `s3-run${runCount}`, index: 0, solvedCount: 0, marks: null },
    memoryPair: { runId: `mem-${runCount}`, pieces: [...DEFAULT_PIECES], key: DEFAULT_PIECES.join("") },
    boss: { reached: false, attempts: 0, lockHintStep: 0, unlocked: false, defeated: false },
    log: ["memory grid online.", "solve snapshots to retain fragments."]
  };
}
function normalizeState(state) {
  if (!state || typeof state !== "object" || Number(state.version) !== 2) {
    return freshFrom({
      registers: Number(state?.registers || 0),
      retained: Number(state?.retained || 0),
      shopUpgrades: state?.shopUpgrades || {},
      runCount: Number(state?.runCount || 0)
    });
  }
  const fresh = freshFrom(state);
  state.registers = Number.isFinite(state.registers) ? state.registers : 0;
  state.retained = Number.isFinite(state.retained) ? state.retained : 0;
  state.shopUpgrades = state.shopUpgrades && typeof state.shopUpgrades === "object" ? state.shopUpgrades : {};
  state.runCount = Number.isFinite(state.runCount) ? state.runCount : 0;
  state.run = { ...fresh.run, ...state.run && typeof state.run === "object" ? state.run : {} };
  state.memoryPair = { ...fresh.memoryPair, ...state.memoryPair || {} };
  state.memoryPair.pieces = Array.isArray(state.memoryPair.pieces) && state.memoryPair.pieces.length ? state.memoryPair.pieces.map(String) : [...DEFAULT_PIECES];
  state.memoryPair.key = String(state.memoryPair.key || state.memoryPair.pieces.join(""));
  state.boss = { ...fresh.boss, ...state.boss || {} };
  state.log = Array.isArray(state.log) ? state.log : [...fresh.log];
  return state;
}

// ../../docs/games/metagame/stages/stage3/index.js
var stageMeta = {
  id: 3,
  slug: "memory-grid",
  name: "Memory Grid",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasDiffKeyRestored(ctx.actions)) state.boss.unlocked = true;
  return renderStage3({ ...ctx, state });
}
function ensureStyles() {
  const id = "stage3-memory-grid-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  defaultState2 as defaultState,
  defeatMemoryLeak,
  getBossLockState,
  mountStage,
  stageMeta,
  tryRestoreDiffKey
};
