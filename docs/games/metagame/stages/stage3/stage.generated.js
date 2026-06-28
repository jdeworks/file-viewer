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
var MEMORY_V3_PATH = "/docs/examples/metagame/stage3/memory_v3.log";
var bellMessages = {
  start: "a memory is not a file until it survives being changed.",
  unlock: "the difference restored the missing key.",
  defeated: "the leak stopped widening."
};
var bodyHint = "the leak is still spreading. keep restoring snapshots until corruption peaks (8).";
var lockedHintLadder = [
  "the grid remembers less every time you ask it.",
  "THREE snapshots disagree. one chunk corrupts between each pair.",
  "diff v1↔v2: the chunk lost there is the FIRST key piece. diff v2↔v3: the chunk lost there is the SECOND. the chunk still intact in v3 is the THIRD.",
  "compare memory_v1.log, memory_v2.log and memory_v3.log — read the three chunks in corruption order, then enter the restoration key."
];

// ../../docs/games/metagame/stages/stage3/content.js
var DISPLAY_SECTORS = ["02", "04", "06"];
function pieces(state) {
  return Array.isArray(state?.memoryPair?.pieces) ? state.memoryPair.pieces : ["", "", ""];
}
function slots(state) {
  const s = state?.memoryPair?.slots;
  return Array.isArray(s) && s.length === 3 ? s.map(Number) : [0, 1, 2];
}
function presentIn(chunkIndex, v) {
  if (v === 1) return true;
  if (v === 2) return chunkIndex !== 0;
  return chunkIndex === 2;
}
function memoryText(state, v, label, leakLine) {
  const id = state.memoryPair.runId;
  const p = pieces(state);
  const sl = slots(state);
  const body = [
    `MEMORY SNAPSHOT ${id} / v${v} (${label})`,
    "sector 01: retained visual boundary"
  ];
  DISPLAY_SECTORS.forEach((sec, i) => {
    const chunkIndex = sl[i];
    const value = presentIn(chunkIndex, v) ? p[chunkIndex] : "[missing]";
    body.push(`sector ${sec}: restoration chunk ${value}`);
  });
  body.push("sector 07: child process @ still moving");
  body.push(leakLine);
  return body.join("\n");
}
function memoryV1Text(state) {
  return memoryText(state, 1, "backup", "sector 08: leak not yet visible");
}
function memoryV2Text(state) {
  return memoryText(state, 2, "ageing", "sector 08: leak expanding");
}
function memoryV3Text(state) {
  return memoryText(state, 3, "corrupted", "sector 08: leak critical");
}
function diffKeyFromState(state) {
  return pieces(state).join("");
}

// ../../docs/games/metagame/stages/stage3/boss.js
function hasDiffKeyRestored(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(3, ACTION_NAME));
}
function bodyComplete(state) {
  return Boolean(state?.boss?.corruption8Reached);
}
function getBossLockState({ actions, state }) {
  const keyRestored = hasDiffKeyRestored(actions) || Boolean(state?.boss?.unlocked);
  const bodyReady = bodyComplete(state);
  const unlocked = keyRestored && bodyReady;
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    bodyReady,
    keyRestored,
    defeated: Boolean(state?.boss?.defeated),
    corruptionRate: unlocked ? "normal" : "accelerated",
    columnClues: unlocked ? "restored" : "missing",
    defeatPossible: unlocked,
    hint: !bodyReady ? bodyHint : keyRestored ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function tryRestoreDiffKey({ state, actions, achievements, bell, input }) {
  const expected = diffKeyFromState(state);
  const normalized = String(input || "").trim();
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!bodyComplete(state)) {
    pushLog(state, bodyHint);
    return { ok: false, locked: true, expected };
  }
  if (normalized !== expected) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "wrong restoration key. the leak keeps the columns hidden.");
    return { ok: false, expected };
  }
  state.boss.unlocked = true;
  actions?.setAction?.(3, ACTION_NAME, {
    source: "stage-boss",
    files: ["memory_v1.log", "memory_v2.log", "memory_v3.log"],
    diffActionSeen: true,
    threeWay: true,
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
  if (!state.boss.unlocked || !bodyComplete(state) || state.boss.defeated) return false;
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
var COLOR_B = 2;
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
  const key2 = n + ":" + clues.join(",");
  const hit = ARR_CACHE.get(key2);
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
  ARR_CACHE.set(key2, out);
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
function attempt(seed, width, height, density, maxTries, want) {
  const minFill = Math.max(1, Math.round(width * height * 0.18));
  let best = null;
  let found = 0;
  for (let n = 0; n < maxTries && found < want; n += 1) {
    const rng = makeRng(`${seed}:${n}`);
    const sol = Array.from({ length: height }, () => Array.from({ length: width }, () => rng.float() < density ? FILLED : EMPTY));
    let filled = 0;
    for (const row of sol) for (const v of row) filled += v;
    if (filled < minFill) continue;
    const { rowClues, colClues } = cluesOf(sol, width, height);
    const res = solve(rowClues, colClues);
    if (res && res.solved) {
      found += 1;
      if (!best || res.passes > best.difficulty) best = { width, height, solution: sol, rowClues, colClues, seed: `${seed}:${n}`, difficulty: res.passes };
    }
  }
  return best;
}
function fallback(width, height) {
  const sol = Array.from({ length: height }, (_, r) => Array.from({ length: width }, () => r % 2 === 0 ? FILLED : EMPTY));
  const { rowClues, colClues } = cluesOf(sol, width, height);
  return { width, height, solution: sol, rowClues, colClues, seed: "fallback", difficulty: 1, isFallback: true };
}
function makePuzzle(seed, { width = 5, height = 5, hard = 0 } = {}) {
  const want = 1 + Math.min(8, Math.max(0, hard)) * 5;
  for (const density of [0.55, 0.5, 0.45, 0.4, 0.35, 0.3]) {
    const p = attempt(`${seed}:d${Math.round(density * 100)}`, width, height, density, 300, want);
    if (p) return p;
  }
  return fallback(width, height);
}

// ../../docs/games/metagame/stages/stage3/s3twocolor.js
var TWOCOLOR_AT = 6;
var TWOCOLOR_MAX = 9;
function colorRuns(line) {
  const out = [];
  let len = 0;
  let col = 0;
  for (const v of line) {
    if (v === EMPTY) {
      if (len) out.push({ len, color: col });
      len = 0;
      col = 0;
    } else if (v === col) {
      len += 1;
    } else {
      if (len) out.push({ len, color: col });
      col = v;
      len = 1;
    }
  }
  if (len) out.push({ len, color: col });
  return out;
}
function minSpan(clues, ci) {
  let need = clues[ci].len;
  for (let k = ci + 1; k < clues.length; k += 1) {
    need += (clues[k].color === clues[k - 1].color ? 1 : 0) + clues[k].len;
  }
  return need;
}
var ARR_CACHE2 = /* @__PURE__ */ new Map();
function colorArrangements(n, clues) {
  const key2 = n + ":" + clues.map((c) => c.len + "." + c.color).join(",");
  const hit = ARR_CACHE2.get(key2);
  if (hit) return hit;
  const out = [];
  function rec(pos, ci, acc) {
    if (ci === clues.length) {
      out.push(acc.slice());
      return;
    }
    const { len, color } = clues[ci];
    const need = minSpan(clues, ci);
    for (let s = pos; s + need <= n; s += 1) {
      const next = acc.slice();
      for (let i = s; i < s + len; i += 1) next[i] = color;
      const gap = ci + 1 < clues.length && clues[ci + 1].color === color ? 1 : 0;
      rec(s + len + gap, ci + 1, next);
    }
  }
  rec(0, 0, new Int8Array(n));
  ARR_CACHE2.set(key2, out);
  return out;
}
function colorLineSolve(cells, clues) {
  const n = cells.length;
  const arrs = colorArrangements(n, clues);
  const poss = Array.from({ length: n }, () => /* @__PURE__ */ new Set());
  let any = false;
  for (const arr of arrs) {
    let okc = true;
    for (let i = 0; i < n; i += 1) {
      if (cells[i] !== UNKNOWN && cells[i] !== arr[i]) {
        okc = false;
        break;
      }
    }
    if (!okc) continue;
    any = true;
    for (let i = 0; i < n; i += 1) poss[i].add(arr[i]);
  }
  if (!any) return null;
  const out = cells.slice();
  let changed = false;
  for (let i = 0; i < n; i += 1) {
    if (poss[i].size === 1) {
      const v = [...poss[i]][0];
      if (out[i] !== v) {
        out[i] = v;
        changed = true;
      }
    }
  }
  return { out, changed };
}
function colorSolve(rowClues, colClues) {
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
      const res = colorLineSolve(grid[r], rowClues[r]);
      if (!res) return null;
      if (res.changed) {
        grid[r] = res.out;
        changed = true;
      }
    }
    for (let c = 0; c < W; c += 1) {
      const col = grid.map((row) => row[c]);
      const res = colorLineSolve(col, colClues[c]);
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
function cluesOf2(sol, width) {
  const rowClues = sol.map(colorRuns);
  const colClues = [];
  for (let c = 0; c < width; c += 1) colClues.push(colorRuns(sol.map((row) => row[c])));
  return { rowClues, colClues };
}
function fallback2(width, height) {
  const sol = Array.from({ length: height }, (_, r) => new Array(width).fill(r % 2 === 0 ? FILLED : COLOR_B));
  const { rowClues, colClues } = cluesOf2(sol, width);
  return { width, height, solution: sol, rowClues, colClues, seed: "tc-fallback", difficulty: 1, twoColor: true, isFallback: true };
}
function attempt2(seed, width, height, density, maxTries) {
  for (let n = 0; n < maxTries; n += 1) {
    const rng = makeRng(`${seed}:${n}`);
    const sol = Array.from({ length: height }, () => Array.from({ length: width }, () => {
      if (rng.float() >= density) return EMPTY;
      return rng.float() < 0.5 ? FILLED : COLOR_B;
    }));
    let filled = 0;
    let hasA = false;
    let hasB = false;
    for (const row of sol) for (const v of row) {
      if (v) filled += 1;
      if (v === FILLED) hasA = true;
      if (v === COLOR_B) hasB = true;
    }
    if (!hasA || !hasB || filled < Math.round(width * height * 0.2)) continue;
    const { rowClues, colClues } = cluesOf2(sol, width);
    const res = colorSolve(rowClues, colClues);
    if (res && res.solved) return { width, height, solution: sol, rowClues, colClues, seed: `${seed}:${n}`, difficulty: res.passes, twoColor: true };
  }
  return null;
}
function makeTwoColorPuzzle(seed, { width = 7, height = 7 } = {}) {
  const w = Math.min(TWOCOLOR_MAX, width);
  const h = Math.min(TWOCOLOR_MAX, height);
  for (const density of [0.6, 0.55, 0.5, 0.45, 0.4]) {
    const p = attempt2(`${seed}:d${Math.round(density * 100)}`, w, h, density, 240);
    if (p) return p;
  }
  return fallback2(w, h);
}

// ../../docs/games/metagame/stages/stage3/s3aliased.js
var ALIASED_AT = 3;
var ALIAS_GLYPH = "?";
function aliasCount(corruption) {
  return Math.max(0, Math.min(4, Number(corruption || 0) - (ALIASED_AT - 1)));
}
function solveWithHidden(rowClues, colClues, hiddenRows, hiddenCols) {
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
      if (hiddenRows.has(r)) continue;
      const res = lineSolve(grid[r], rowClues[r]);
      if (!res) return false;
      if (res.changed) {
        grid[r] = res.out;
        changed = true;
      }
    }
    for (let c = 0; c < W; c += 1) {
      if (hiddenCols.has(c)) continue;
      const col = grid.map((row) => row[c]);
      const res = lineSolve(col, colClues[c]);
      if (!res) return false;
      if (res.changed) {
        for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r];
        changed = true;
      }
    }
  }
  return grid.every((row) => row.every((v) => v !== UNKNOWN));
}
function aliasedLines(puzzle, corruption, seed) {
  const target = aliasCount(corruption);
  if (target <= 0) return { rows: [], cols: [] };
  const candidates = [];
  for (let r = 0; r < puzzle.height; r += 1) candidates.push({ kind: "r", i: r });
  for (let c = 0; c < puzzle.width; c += 1) candidates.push({ kind: "c", i: c });
  const order = makeRng(`s3-alias:${seed}`).shuffle(candidates);
  const hiddenRows = /* @__PURE__ */ new Set();
  const hiddenCols = /* @__PURE__ */ new Set();
  let count = 0;
  for (const cand of order) {
    if (count >= target) break;
    const set = cand.kind === "r" ? hiddenRows : hiddenCols;
    set.add(cand.i);
    if (solveWithHidden(puzzle.rowClues, puzzle.colClues, hiddenRows, hiddenCols)) count += 1;
    else set.delete(cand.i);
  }
  return { rows: [...hiddenRows].sort((a, b) => a - b), cols: [...hiddenCols].sort((a, b) => a - b) };
}
function attachAliased(puzzle, corruption, seed) {
  if (!puzzle || puzzle.twoColor || Number(corruption || 0) < ALIASED_AT) return puzzle;
  const aliased = aliasedLines(puzzle, corruption, seed);
  if (aliased.rows.length || aliased.cols.length) puzzle.aliased = aliased;
  return puzzle;
}
function aliasedTotal(puzzle) {
  const a = puzzle && puzzle.aliased;
  return a ? a.rows.length + a.cols.length : 0;
}

// ../../docs/games/metagame/stages/stage3/board.js
var CH = { [FILLED]: "#", [COLOR_B]: "@", [EMPTY]: "x", [UNKNOWN]: "." };
var FROM_CH = { "#": FILLED, "@": COLOR_B, x: EMPTY, ".": UNKNOWN };
var fillColor = (v) => v === FILLED ? FILLED : v === COLOR_B ? COLOR_B : EMPTY;
var BODY_SOLVES = 20;
function sizeForRun(run, shop) {
  const cap = 12 + Number((shop || {}).overclock || 0);
  const ramp = 5 + Math.floor(Number(run.solvedCount || 0) * 7 / BODY_SOLVES);
  return Math.max(5, Math.min(cap, ramp));
}
function corruptionForRun(run) {
  return Math.min(8, Math.floor(Number(run.solvedCount || 0) * 8 / BODY_SOLVES));
}
function puzzleForRun(run, shop) {
  const size = sizeForRun(run, shop);
  const corruption = corruptionForRun(run);
  if (corruption >= TWOCOLOR_AT) return makeTwoColorPuzzle(`${run.seed}:${run.index}:tc`, { width: size, height: size });
  const puzzle = makePuzzle(`${run.seed}:${run.index}`, { width: size, height: size, hard: corruption });
  if (corruption >= ALIASED_AT) attachAliased(puzzle, corruption, `${run.seed}:${run.index}`);
  return puzzle;
}
function applyPrefetch(board, count) {
  if (!count) return board;
  let done = 0;
  for (let y = 0; y < board.puzzle.height && done < count; y += 1) {
    for (let x = 0; x < board.puzzle.width && done < count; x += 1) {
      const sol = board.puzzle.solution[y][x];
      if (sol !== EMPTY && board.marks[y][x] !== sol) {
        board.marks[y][x] = sol;
        done += 1;
      }
    }
  }
  board.solved = isSolved(board.puzzle, board.marks);
  return board;
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
      if (fillColor(puzzle.solution[y][x]) !== fillColor(marks[y][x])) return false;
    }
  }
  return true;
}
function setCell(board, x, y, mark, color = FILLED) {
  if (board.solved) return false;
  const cur = board.marks[y][x];
  const target = mark ? EMPTY : color;
  board.marks[y][x] = cur === target ? UNKNOWN : target;
  board.solved = isSolved(board.puzzle, board.marks);
  const placed = fillColor(board.marks[y][x]);
  const wrong = !mark && placed !== EMPTY && placed !== fillColor(board.puzzle.solution[y][x]);
  return wrong;
}
function moveCursor(board, dx, dy) {
  board.cursor.x = Math.max(0, Math.min(board.puzzle.width - 1, board.cursor.x + dx));
  board.cursor.y = Math.max(0, Math.min(board.puzzle.height - 1, board.cursor.y + dy));
}
function lineDone(puzzle, marks, kind, i) {
  if (kind === "row") {
    for (let x = 0; x < puzzle.width; x += 1) if (fillColor(puzzle.solution[i][x]) !== fillColor(marks[i][x])) return false;
    return true;
  }
  for (let y = 0; y < puzzle.height; y += 1) if (fillColor(puzzle.solution[y][i]) !== fillColor(marks[y][i])) return false;
  return true;
}
function firstHintCell(board) {
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      const sol = board.puzzle.solution[y][x];
      if (sol !== EMPTY && fillColor(board.marks[y][x]) !== sol) return { x, y, color: sol };
    }
  }
  return null;
}
function wrongCells(board) {
  const out = [];
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      const placed = fillColor(board.marks[y][x]);
      if (placed !== EMPTY && placed !== fillColor(board.puzzle.solution[y][x])) out.push({ x, y });
    }
  }
  return out;
}
function progress(puzzle, marks) {
  let need = 0;
  let have = 0;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      if (puzzle.solution[y][x] !== EMPTY) {
        need += 1;
        if (fillColor(marks[y][x]) === puzzle.solution[y][x]) have += 1;
      }
    }
  }
  return { have, need };
}

// ../../docs/games/metagame/stages/stage3/grid.js
var GLYPH = { [FILLED]: "#", [COLOR_B]: "@", [EMPTY]: "✕", [UNKNOWN]: "·" };
var CLASS = { [FILLED]: "s3-fill", [COLOR_B]: "s3-fill-b", [EMPTY]: "s3-mark", [UNKNOWN]: "s3-blank" };
var marksFilled = (marks, x, y) => marks[y][x] === FILLED || marks[y][x] === COLOR_B;
var clueLen = (c) => typeof c === "object" ? c.len : c;
var clueColor = (c) => typeof c === "object" ? c.color : 0;
function buildGrid(puzzle, handlers) {
  const { rowClues, colClues, width, height } = puzzle;
  const aliasRows = new Set(puzzle.aliased && puzzle.aliased.rows || []);
  const aliasCols = new Set(puzzle.aliased && puzzle.aliased.cols || []);
  const rowDisp = rowClues.map((c, r) => aliasRows.has(r) ? [ALIAS_GLYPH] : c.length ? c : [0]);
  const colDisp = colClues.map((c, k) => aliasCols.has(k) ? [ALIAS_GLYPH] : c.length ? c : [0]);
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
  const clueEl = (n) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    if (n === ALIAS_GLYPH) {
      el.textContent = ALIAS_GLYPH;
      el.classList.add("s3-clue-alias");
      return el;
    }
    el.textContent = String(clueLen(n));
    const col = clueColor(n);
    if (col === FILLED) el.classList.add("s3-clue-a");
    else if (col === COLOR_B) el.classList.add("s3-clue-b");
    return el;
  };
  const colClueEls = colDisp.map(() => []);
  colDisp.forEach((clues, c) => clues.forEach((n, k) => {
    const el = clueEl(n);
    place(el, maxRow + c + 1, maxCol - clues.length + k + 1);
    colClueEls[c].push(el);
  }));
  const rowClueEls = rowDisp.map(() => []);
  rowDisp.forEach((clues, r) => clues.forEach((n, k) => {
    const el = clueEl(n);
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
    const x = Number(t.dataset.x), y = Number(t.dataset.y);
    const modified = e.button === 2 || e.shiftKey || e.altKey;
    if (!modified && handlers.onTap) {
      handlers.onTap(x, y);
      return;
    }
    handlers.onCell(x, y, e.button === 2 || e.shiftKey, e.altKey);
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
    if (cur !== lastCursor && lastCursor) {
      const [px, py] = lastCursor.split(",").map(Number);
      cells[py][px].el.classList.remove("s3-cursor");
    }
    lastCursor = cur;
    cells[board.cursor.y][board.cursor.x].el.classList.add("s3-cursor");
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
    decorateVolatile(board);
  }
  function decorateVolatile(board) {
    if (!board.volatile) return;
    for (const k of board.volatile) {
      const [x, y] = k.split(",").map(Number);
      const el = cells[y][x].el;
      const filled = marksFilled(board.marks, x, y);
      const locked = board.locked && board.locked.has(k);
      el.classList.toggle("s3-locked", filled && locked);
      el.classList.toggle("s3-volatile", filled && !locked);
    }
  }
  function flashWrong(list, ms = 1400) {
    for (const { x, y } of list) {
      const el = cells[y][x].el;
      el.classList.add("s3-wrong");
      setTimeout(() => el.classList.remove("s3-wrong"), ms);
    }
  }
  return { el: wrap, update, flashWrong };
}

// ../../docs/games/metagame/stages/stage3/s3modal.js
function buildPaginatedModal(opts) {
  const { title, accentClass, note, bank, count, page, wire, onClose } = opts;
  const backdrop = document.createElement("div");
  backdrop.className = "s3-modal-backdrop";
  const panel = document.createElement("div");
  panel.className = "s3-modal" + (accentClass ? " " + accentClass : "");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  backdrop.appendChild(panel);
  let idx = 0;
  const close = () => onClose?.();
  const api = {
    refresh: () => paint(),
    close,
    goto: (i) => {
      idx = i;
      paint();
    }
  };
  function paint() {
    const total = count();
    if (idx > total - 1) idx = Math.max(0, total - 1);
    if (idx < 0) idx = 0;
    const bankHtml = bank ? bank() : "";
    const body = total ? page(idx) : `<div class="s3-modal-empty">nothing available.</div>`;
    panel.innerHTML = `
      <div class="s3-modal-head">${title}
        ${bankHtml ? `<span class="s3-modal-bank">${bankHtml}</span>` : ""}
        <button type="button" class="s3-modal-x" data-modal="close" aria-label="close">&#10005;</button>
      </div>
      ${note ? `<div class="s3-modal-note">${note}</div>` : ""}
      <div class="s3-modal-page">${body}</div>
      <div class="s3-modal-nav">
        <button type="button" class="s3-modal-btn s3-modal-prev" data-modal="prev" ${idx <= 0 ? "disabled" : ""} aria-label="previous">&#8249; Prev</button>
        <span class="s3-modal-count" aria-live="polite">${total ? idx + 1 : 0} / ${total}</span>
        <button type="button" class="s3-modal-btn s3-modal-next" data-modal="next" ${idx >= total - 1 ? "disabled" : ""} aria-label="next">Next &#8250;</button>
      </div>`;
    panel.querySelector('[data-modal="close"]').addEventListener("click", close);
    panel.querySelector('[data-modal="prev"]').addEventListener("click", () => {
      if (idx > 0) {
        idx -= 1;
        paint();
      }
    });
    panel.querySelector('[data-modal="next"]').addEventListener("click", () => {
      if (idx < count() - 1) {
        idx += 1;
        paint();
      }
    });
    if (total) wire?.(panel.querySelector(".s3-modal-page"), idx, api);
  }
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  paint();
  return { el: backdrop, api };
}

// ../../docs/games/metagame/stages/stage3/shop.js
var SHOP_UPGRADES = [
  { id: "prefetch", name: "Prefetch Cache", desc: "+1 correct cell pre-filled each snapshot", max: 6 },
  { id: "throughput", name: "Throughput", desc: "+25% registers per solve", max: 5 },
  { id: "oracle", name: "Oracle", desc: "+1 hint (reveal a correct cell) per snapshot", max: 4 },
  { id: "parity", name: "Parity Unit", desc: "+1 integrity check (flag wrong fills) per snapshot", max: 3 },
  { id: "overclock", name: "Overclock", desc: "+1 to the maximum grid size (deeper, richer snapshots)", max: 3 },
  // Paid in RETAINED fragments (not registers) — gives the slow fragment currency a real sink.
  { id: "engram", name: "Engram Bank", desc: "+1 Oracle hint per snapshot — paid in retained fragments", max: 4, currency: "retained" }
];
var BASE = { prefetch: 40, throughput: 80, oracle: 60, parity: 70, overclock: 150 };
var GROWTH = { prefetch: 1.7, throughput: 1.9, oracle: 1.8, parity: 1.8, overclock: 2 };
var RETAINED_BASE = { engram: 2 };
var ACTIVE = /* @__PURE__ */ new Set(["prefetch", "throughput", "overclock", "oracle", "parity", "engram"]);
function upgradeCurrency(id) {
  return (SHOP_UPGRADES.find((u) => u.id === id) || {}).currency === "retained" ? "retained" : "registers";
}
function upgradeCost(id, level) {
  if (upgradeCurrency(id) === "retained") return (RETAINED_BASE[id] || 2) + level;
  return Math.round((BASE[id] || 50) * (GROWTH[id] || 1.8) ** level);
}
function upgradeLevel(state, id) {
  return Number((state.shopUpgrades || {})[id] || 0);
}
function shopUpgradeList() {
  return SHOP_UPGRADES.filter((u) => ACTIVE.has(u.id));
}
function shopPageHtml(state, up) {
  const lvl = upgradeLevel(state, up.id);
  const maxed = lvl >= up.max;
  const cost = upgradeCost(up.id, lvl);
  const retained = upgradeCurrency(up.id) === "retained";
  const bank = Number((retained ? state.retained : state.registers) || 0);
  const afford = !maxed && bank >= cost;
  const unit = retained ? "frag" : "reg";
  return `<div class="s3-item">
    <div class="s3-item-name"><strong>${up.name}</strong> <span class="s3-shop-lv">Lv ${lvl}/${up.max}</span></div>
    <div class="s3-item-desc">${up.desc}</div>
    <div class="s3-item-cost">cost: ${maxed ? "—" : cost + " " + unit}</div>
    <button type="button" class="s3-item-action" data-buy="${up.id}" ${maxed || !afford ? "disabled" : ""}>${maxed ? "MAXED" : afford ? `buy · ${cost} ${unit}` : `need ${cost} ${unit}`}</button>
  </div>`;
}
function buyUpgrade(state, save, id) {
  const up = SHOP_UPGRADES.find((u) => u.id === id);
  if (!up) return false;
  state.shopUpgrades = state.shopUpgrades || {};
  const lvl = Number(state.shopUpgrades[id] || 0);
  if (lvl >= up.max) return false;
  const cost = upgradeCost(id, lvl);
  const retained = upgradeCurrency(id) === "retained";
  const bank = Number((retained ? state.retained : state.registers) || 0);
  if (bank < cost) return false;
  if (retained) state.retained = bank - cost;
  else state.registers = bank - cost;
  state.shopUpgrades[id] = lvl + 1;
  save?.();
  return true;
}
function buildShopPanel({ state, save, onClose }) {
  const ups = shopUpgradeList();
  return buildPaginatedModal({
    title: "DEFRAG SHOP",
    accentClass: "s3-modal-shop",
    note: "spend registers on permanent upgrades — they apply to every snapshot.",
    bank: () => `${Number(state.registers || 0)} reg · ${Number(state.retained || 0)} frag`,
    count: () => ups.length,
    page: (i) => shopPageHtml(state, ups[i]),
    wire: (pageEl, i, modal) => {
      const btn = pageEl.querySelector("[data-buy]");
      btn?.addEventListener("click", () => {
        buyUpgrade(state, save, ups[i].id);
        modal.refresh();
      });
    },
    onClose
  });
}

// ../../docs/games/metagame/stages/stage3/s3debug.js
function installStage3Hook(api) {
  window.__fvStage3 = {
    state: () => api.state,
    solveCurrent: () => api.solveCurrent(),
    bodySolver: () => {
      let guard = 0;
      let aliasSeen = 0;
      while (!api.state.boss.corruption8Reached && guard < 300) {
        guard += 1;
        if (typeof api.aliasedNow === "function") aliasSeen = Math.max(aliasSeen, Number(api.aliasedNow() || 0));
        if (!api.solveCurrent()) break;
      }
      return {
        reached: Boolean(api.state.boss.corruption8Reached),
        corruption: corruptionForRun(api.state.run),
        solved: api.state.run.solvedCount,
        aliasSeen
      };
    },
    deriveKey: () => diffKeyFromState(api.state),
    tryRestoreKey: (key2) => api.tryRestoreKey(key2),
    bossSolver: () => api.bossSolver(),
    draftPending: () => typeof api.draftPending === "function" ? api.draftPending() : false,
    draftOffer: () => typeof api.draftOffer === "function" ? api.draftOffer() : [],
    draft: (id) => typeof api.draft === "function" ? api.draft(id) : false
  };
  return () => {
    if (window.__fvStage3) delete window.__fvStage3;
  };
}

// ../../docs/games/metagame/stages/stage3/s3dev.js
function devFillSolution(board) {
  const { puzzle, marks } = board;
  for (let y = 0; y < puzzle.height; y += 1) {
    for (let x = 0; x < puzzle.width; x += 1) {
      const sol = puzzle.solution[y][x];
      marks[y][x] = sol > 0 ? sol : -1;
    }
  }
}
function devGiveCurrency(state) {
  state.registers = Number(state.registers || 0) + 500;
  state.retained = Number(state.retained || 0) + 3;
}
function devSkipToBody(state) {
  state.run.solvedCount = BODY_SOLVES;
  state.run.index = BODY_SOLVES;
  state.boss.corruption8Reached = true;
  state.run.marks = null;
}
function devClearPressure(state) {
  state.run.pressure = 0;
}

// ../../docs/games/metagame/stages/stage3/s3volatile.js
var VOLATILE_AT = 2;
var key = (x, y) => `${x},${y}`;
var isFill = (v) => v !== UNKNOWN && v !== EMPTY;
function decayWindow(corruption) {
  return Math.max(3, 8 - Number(corruption || 0));
}
function volatileCount(corruption, filled) {
  const want = 2 + (Number(corruption || 0) - VOLATILE_AT);
  return Math.max(0, Math.min(filled - 1, want));
}
function pass1Forced(puzzle) {
  const forced = /* @__PURE__ */ new Set();
  if (!puzzle || puzzle.twoColor || !Array.isArray(puzzle.rowClues)) return forced;
  const H = puzzle.height;
  const W = puzzle.width;
  const grid = Array.from({ length: H }, () => new Array(W).fill(UNKNOWN));
  for (let r = 0; r < H; r += 1) {
    const res = lineSolve(grid[r], puzzle.rowClues[r]);
    if (res && res.changed) grid[r] = res.out;
  }
  for (let c = 0; c < W; c += 1) {
    const col = grid.map((row) => row[c]);
    const res = lineSolve(col, puzzle.colClues[c]);
    if (res && res.changed) for (let r = 0; r < H; r += 1) grid[r][c] = res.out[r];
  }
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (grid[y][x] === FILLED) forced.add(key(x, y));
  return forced;
}
function initVolatile(board, corruption, seed) {
  if (Number(corruption || 0) < VOLATILE_AT) return board;
  const filledCells = [];
  for (let y = 0; y < board.puzzle.height; y += 1) {
    for (let x = 0; x < board.puzzle.width; x += 1) {
      if (board.puzzle.solution[y][x] !== EMPTY) filledCells.push(key(x, y));
    }
  }
  const n = volatileCount(corruption, filledCells.length);
  if (n <= 0) return board;
  const forced = pass1Forced(board.puzzle);
  const interesting = filledCells.filter((k) => !forced.has(k));
  const candidates = interesting.length >= n ? interesting : filledCells;
  const picked = makeRng(`s3-volatile:${seed}`).shuffle(candidates).slice(0, n);
  board.volatile = new Set(picked);
  board.locked = /* @__PURE__ */ new Set();
  board.volFilledAt = /* @__PURE__ */ new Map();
  board.ticks = 0;
  board.decayWindow = decayWindow(corruption);
  for (const k of board.volatile) {
    const [x, y] = k.split(",").map(Number);
    if (isFill(board.marks[y][x])) board.locked.add(k);
  }
  return board;
}
function noteFill(board, x, y) {
  if (!board.volatile) return;
  const k = key(x, y);
  if (board.volatile.has(k) && !board.locked.has(k)) board.volFilledAt.set(k, board.ticks);
}
function lockCell(board, x, y) {
  if (!board.volatile) return false;
  const k = key(x, y);
  if (!board.volatile.has(k) || board.locked.has(k)) return false;
  if (!isFill(board.marks[y][x])) return false;
  board.locked.add(k);
  board.volFilledAt.delete(k);
  return true;
}
function tickVolatile(board, isSolvedFn) {
  if (!board.volatile) return [];
  board.ticks += 1;
  const reverted = [];
  for (const [k, at] of board.volFilledAt) {
    if (board.locked.has(k)) {
      board.volFilledAt.delete(k);
      continue;
    }
    if (board.ticks - at >= board.decayWindow) {
      const [x, y] = k.split(",").map(Number);
      if (isFill(board.marks[y][x])) {
        board.marks[y][x] = UNKNOWN;
        reverted.push({ x, y });
      }
      board.volFilledAt.delete(k);
    }
  }
  if (reverted.length && typeof isSolvedFn === "function") board.solved = isSolvedFn(board.puzzle, board.marks);
  return reverted;
}
function volatileStatus(board) {
  if (!board.volatile) return null;
  let atRisk = 0;
  for (const k of board.volatile) if (!board.locked.has(k) && board.volFilledAt.has(k)) atRisk += 1;
  return { total: board.volatile.size, locked: board.locked.size, atRisk, window: board.decayWindow };
}

// ../../docs/games/metagame/stages/stage3/s3decay.js
var DECAY_AT = 4;
var PER_MOVE = 1;
var PER_WRONG = 5;
function needOf(puzzle) {
  let need = 0;
  for (const row of puzzle.solution) for (const v of row) if (v) need += 1;
  return need;
}
function decayThreshold(puzzle) {
  return needOf(puzzle) * 2 + puzzle.width * 6;
}
function decayPenalty(puzzle) {
  return Math.round((puzzle.width * puzzle.width + 12) * 0.5);
}
function createDecay(puzzle, corruption) {
  const active = Number(corruption || 0) >= DECAY_AT;
  return { active, meter: 0, threshold: decayThreshold(puzzle), penalty: decayPenalty(puzzle) };
}
function pressureMove(decay) {
  if (decay && decay.active) decay.meter += PER_MOVE;
}
function pressureWrong(decay) {
  if (decay && decay.active) decay.meter += PER_WRONG;
}
function decayFailed(decay) {
  return Boolean(decay && decay.active && decay.meter >= decay.threshold);
}
function decayRatio(decay) {
  if (!decay || !decay.active || !decay.threshold) return 0;
  return Math.max(0, Math.min(1, decay.meter / decay.threshold));
}

// ../../docs/games/metagame/stages/stage3/s3boons.js
var DRAFT_AT = [0, 5, 10];
var BOONS = [
  { id: "cache", label: "Cache Primer", desc: "+2 cells pre-filled each snapshot (this run)", effect: { prefetch: 2 } },
  { id: "oracle_echo", label: "Oracle Echo", desc: "+1 hint per snapshot (this run)", effect: { oracle: 1 } },
  { id: "parity_echo", label: "Parity Echo", desc: "+1 integrity check per snapshot (this run)", effect: { parity: 1 } },
  { id: "overread", label: "Overclocked Read", desc: "+50% registers per solve (this run)", effect: { throughput: 2 } },
  { id: "stabilizer", label: "Stabilizer Field", desc: "volatile cells survive +2 moves (this run)", effect: { volatile: 2 } },
  { id: "pressure_valve", label: "Pressure Valve", desc: "+40% instability headroom (this run)", effect: { decayPct: 0.4 } }
];
var BY_ID = new Map(BOONS.map((b) => [b.id, b]));
function ensureRunBoons(state) {
  if (!state || !state.run) return;
  if (!Array.isArray(state.run.boons)) state.run.boons = [];
  if (!Number.isFinite(state.run.draftsTaken)) state.run.draftsTaken = 0;
}
function milestonesReached(state) {
  const solved = Number(state.run.solvedCount || 0);
  return DRAFT_AT.filter((m) => solved >= m).length;
}
function draftPending(state) {
  ensureRunBoons(state);
  return state.run.draftsTaken < milestonesReached(state);
}
function draftOffer(state) {
  ensureRunBoons(state);
  const taken = new Set(state.run.boons);
  const pool = BOONS.filter((b) => !taken.has(b.id));
  if (!pool.length) return [];
  const rng = makeRng(`${state.run.seed}:draft:${state.run.draftsTaken}`);
  return rng.shuffle(pool).slice(0, Math.min(3, pool.length));
}
function pickBoon(state, id) {
  ensureRunBoons(state);
  if (!draftPending(state)) return false;
  if (!BY_ID.has(id) || state.run.boons.includes(id)) return false;
  if (!draftOffer(state).some((b) => b.id === id)) return false;
  state.run.boons.push(id);
  state.run.draftsTaken += 1;
  return true;
}
function boonBonus(state, key2) {
  if (!state || !state.run || !Array.isArray(state.run.boons)) return 0;
  let total = 0;
  for (const id of state.run.boons) {
    const b = BY_ID.get(id);
    if (b && b.effect && typeof b.effect[key2] === "number") total += b.effect[key2];
  }
  return total;
}
function boonPageHtml(boon) {
  return `<div class="s3-item">
    <div class="s3-item-name"><strong>${boon.label}</strong></div>
    <div class="s3-item-desc">${boon.desc}</div>
    <button type="button" class="s3-item-action" data-pick="${boon.id}">draft this boon</button>
  </div>`;
}
function buildDraftPanel({ state, save, onClose }) {
  const offer = draftOffer(state);
  const remaining = Math.max(0, milestonesReached(state) - state.run.draftsTaken);
  return buildPaginatedModal({
    title: "BOON DRAFT",
    accentClass: "s3-modal-draft",
    note: "run-scoped boons — they apply to this run's snapshots only.",
    bank: () => `pick 1 · ${remaining} draft${remaining === 1 ? "" : "s"} pending`,
    count: () => offer.length,
    page: (i) => boonPageHtml(offer[i]),
    wire: (pageEl, i, modal) => {
      const btn = pageEl.querySelector("[data-pick]");
      btn?.addEventListener("click", () => {
        if (pickBoon(state, offer[i].id)) {
          save?.();
          modal.close();
        }
      });
    },
    onClose
  });
}

// ../../docs/games/metagame/stages/stage3/s3tiers.js
var TIER_MESSAGES = [
  {
    id: "volatile",
    at: VOLATILE_AT,
    msg: "CACHE PRESSURE: volatile memory cells activated — a filled cell now fades after a few moves unless you LOCK it (press l)."
  },
  {
    id: "aliased",
    at: ALIASED_AT,
    msg: "MEMORY ALIAS: some clues are now obscured as “?” — deduce those lines from the crossing clues."
  },
  {
    id: "decay",
    at: DECAY_AT,
    msg: "DECAY CLOCK: an instability meter now climbs as you work — wrong fills spike it; cross it and the snapshot collapses."
  },
  {
    id: "twocolor",
    at: TWOCOLOR_AT,
    msg: "HOT / COLD MEMORY: snapshots split into two colours — fill A (space/1) and B (g/2); same-colour blocks need a gap, different colours may touch."
  }
];
function announceTiers(state, corruption) {
  const run = state.run || (state.run = {});
  const seen = Array.isArray(run.tiers) ? run.tiers : run.tiers = [];
  const fired = [];
  for (const tier of TIER_MESSAGES) {
    if (Number(corruption || 0) >= tier.at && !seen.includes(tier.id)) {
      seen.push(tier.id);
      pushLog(state, tier.msg);
      fired.push(tier.id);
    }
  }
  return fired;
}

// ../../docs/games/metagame/stages/stage3/state.js
var STATE_VERSION = 3;
function makePieces(runCount) {
  const rng = makeRng(`s3-pieces:${runCount}`);
  const tok = () => Math.floor(rng.float() * 46655).toString(36).padStart(3, "0");
  return [tok(), tok(), tok()];
}
function makeSlots(runCount) {
  const rng = makeRng(`s3-slots:${runCount}`);
  let slots2 = rng.shuffle([0, 1, 2]);
  for (let i = 0; i < 8 && slots2[0] === 0 && slots2[1] === 1 && slots2[2] === 2; i += 1) {
    slots2 = rng.shuffle([0, 1, 2]);
  }
  return slots2;
}
function normalizeSlots(slots2) {
  if (!Array.isArray(slots2) || slots2.length !== 3) return null;
  const nums = slots2.map((n) => Number(n));
  const set = new Set(nums);
  if (set.size !== 3 || [0, 1, 2].some((i) => !set.has(i))) return null;
  return nums;
}
function defaultState() {
  return freshFrom({ registers: 0, retained: 0, shopUpgrades: {}, runCount: 0 });
}
function freshFrom(meta) {
  const runCount = Number(meta.runCount || 0);
  const pieces2 = makePieces(runCount);
  const slots2 = makeSlots(runCount);
  return {
    version: STATE_VERSION,
    registers: Number(meta.registers || 0),
    retained: Number(meta.retained || 0),
    shopUpgrades: meta.shopUpgrades && typeof meta.shopUpgrades === "object" ? meta.shopUpgrades : {},
    runCount,
    run: { seed: `s3-run${runCount}`, index: 0, solvedCount: 0, marks: null, boons: [], draftsTaken: 0, tiers: [], pressure: 0 },
    memoryPair: { runId: `mem-${runCount}`, pieces: pieces2, slots: slots2, key: pieces2.join("") },
    boss: { reached: false, attempts: 0, lockHintStep: 0, unlocked: false, defeated: false, corruption8Reached: false },
    log: ["memory grid online.", "solve snapshots to retain fragments."]
  };
}
function normalizeState(state) {
  if (!state || typeof state !== "object" || Number(state.version) !== STATE_VERSION) {
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
  state.memoryPair.pieces = Array.isArray(state.memoryPair.pieces) && state.memoryPair.pieces.length ? state.memoryPair.pieces.map(String) : makePieces(state.runCount);
  state.memoryPair.slots = normalizeSlots(state.memoryPair.slots) || makeSlots(state.runCount);
  state.memoryPair.key = String(state.memoryPair.key || state.memoryPair.pieces.join(""));
  state.boss = { ...fresh.boss, ...state.boss || {} };
  state.log = Array.isArray(state.log) ? state.log : [...fresh.log];
  return state;
}
var RUN_PRESSURE_BASE = 20;
var RUN_PRESSURE_PER_CORRUPTION = 2;
function runPressureLimit(corruption, valveHeadroom = 0) {
  const base = RUN_PRESSURE_BASE + Math.max(0, Number(corruption || 0)) * RUN_PRESSURE_PER_CORRUPTION;
  return Math.round(base * (1 + Math.max(0, Number(valveHeadroom || 0))));
}
function bumpRunPressure(state) {
  if (!state || !state.run) return 0;
  state.run.pressure = Number(state.run.pressure || 0) + 1;
  return state.run.pressure;
}
function runPressureReached(state, corruption, valveHeadroom = 0) {
  return Number(state?.run?.pressure || 0) >= runPressureLimit(corruption, valveHeadroom);
}
function collapseRun(state) {
  const fresh = freshFrom({
    registers: state.registers,
    retained: state.retained,
    shopUpgrades: state.shopUpgrades,
    runCount: Number(state.runCount || 0) + 1
  });
  Object.assign(state, fresh);
  return state;
}

// ../../docs/games/metagame/stages/stage3/view.js
function buildStage3Shell() {
  const root = document.createElement("section");
  root.className = "stage3-memory-grid";
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>RETAINED <span data-field="retained"></span></span>
      <span>SNAPSHOT <span data-field="snap"></span></span>
      <span class="s3-pressure" data-field="pressure"></span>
      <span data-field="size"></span>
    </header>
    <div class="s3-objective" data-field="objective"></div>
    <div class="s3-play">
      <div class="s3-grid-col">
        <div class="s3-grid-host"></div>
        <div class="s3-toolbar">
          <button type="button" data-action="shop">defrag shop</button>
          <button type="button" data-action="draft" data-field="draftBtn" hidden></button>
          <button type="button" data-action="hint" data-field="hintBtn" hidden></button>
          <button type="button" data-action="check" data-field="checkBtn" hidden></button>
        </div>
      </div>
      <aside class="s3-side">
        <div class="s3-help">arrows / WASD move · space/1 fill A · 2 fill B (alt-click) · x mark · l lock volatile · click fills, right-click marks · on touch: pick a verb above then tap a cell</div>
        <section class="s3-boss">
          <div class="s3-boss-title">THE MEMORY LEAK</div>
          <div data-field="bossStatus"></div>
          <div class="s3-hint" data-field="hint"></div>
          <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
          <div class="s3-controls">
            <button type="button" data-action="v1">open memory_v1.log</button>
            <button type="button" data-action="v2">open memory_v2.log</button>
            <button type="button" data-action="v3">open memory_v3.log</button>
            <button type="button" data-action="restore">restore key</button>
            <button type="button" data-action="boss">solve leak</button>
            <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
          </div>
        </section>
      </aside>
    </div>
    <ol class="s3-log"></ol>
  `;
  return root;
}

// ../../docs/games/metagame/stages/stage3/s3verbs.js
import { createTouchControls } from "../../touch-controls.js";
function verbToCell(verb) {
  if (verb === "lock") return { lock: true };
  if (verb === "mark") return { mark: true, color: FILLED };
  if (verb === "fillB") return { mark: false, color: COLOR_B };
  return { mark: false, color: FILLED };
}
function createVerbBar({ onSelect } = {}) {
  return createTouchControls({
    className: "s3-verbs",
    ariaLabel: "tap verb",
    toggle: true,
    onAction: onSelect,
    buttons: [
      { id: "fillA", label: "Fill A", ariaLabel: "tap to fill colour A" },
      { id: "fillB", label: "Fill B", ariaLabel: "tap to fill colour B" },
      { id: "mark", label: "Mark", ariaLabel: "tap to mark empty" },
      { id: "lock", label: "Lock", ariaLabel: "tap to lock volatile cell" }
    ]
  });
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
  const root = buildStage3Shell();
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s3-log");
  const keyInput = root.querySelector(".s3-key");
  const gridHost = root.querySelector(".s3-grid-host");
  const btsBtn = root.querySelector('[data-action="bts"]');
  const verbBar = createVerbBar();
  root.querySelector(".s3-toolbar").before(verbBar.el);
  let overlay = null;
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
  const awarded = state.achievements = state.achievements || {};
  function award(id, title) {
    if (awarded[id]) return;
    awarded[id] = true;
    achievements?.unlockAchievement?.(`stage3.${id}`, { stage: 3, title });
    pushLog(state, `achievement — ${title}`);
  }
  ensureRunBoons(state);
  const oracleCap = () => upgradeLevel(state, "oracle") + boonBonus(state, "oracle") + upgradeLevel(state, "engram");
  const parityCap = () => upgradeLevel(state, "parity") + boonBonus(state, "parity");
  const valveHeadroom = () => boonBonus(state, "decayPct");
  const pressureLimit = () => runPressureLimit(corruptionForRun(state.run), valveHeadroom());
  loadBoard();
  paintHud();
  function loadBoard() {
    const fresh = !state.run.marks;
    announceTiers(state, corruptionForRun(state.run));
    const puzzle = puzzleForRun(state.run, state.shopUpgrades);
    board = createBoard(puzzle, state.run.marks);
    board.hintsUsed = 0;
    board.checksUsed = 0;
    board.mistakes = 0;
    const prefetch = upgradeLevel(state, "prefetch") + boonBonus(state, "prefetch");
    if (fresh && prefetch) {
      applyPrefetch(board, prefetch);
      state.run.marks = encodeMarks(board.marks);
    }
    initVolatile(board, corruptionForRun(state.run), `${state.run.seed}:${state.run.index}`);
    if (board.volatile) board.decayWindow += boonBonus(state, "volatile");
    board.decay = createDecay(puzzle, corruptionForRun(state.run));
    if (board.decay.active) board.decay.threshold = Math.round(board.decay.threshold * (1 + boonBonus(state, "decayPct")));
    grid = buildGrid(puzzle, {
      onCell: (x, y, mark, colorB) => {
        board.cursor = { x, y };
        applyCell(x, y, mark, colorB ? COLOR_B : FILLED);
      },
      onTap: (x, y) => tapCell(x, y)
    });
    gridHost.replaceChildren(grid.el);
    grid.update(board);
  }
  function tapCell(x, y) {
    board.cursor = { x, y };
    const op = verbToCell(verbBar.getActive());
    if (op.lock) {
      lockUnderCursor();
      return;
    }
    applyCell(x, y, op.mark, op.color);
  }
  function applyCell(x, y, mark, color = FILLED) {
    if (board.solved) return;
    const reverted = tickVolatile(board, isSolved);
    const wrong = setCell(board, x, y, mark, color);
    if (wrong) board.mistakes = (board.mistakes || 0) + 1;
    if (!mark && board.marks[y][x] !== UNKNOWN) noteFill(board, x, y);
    pressureMove(board.decay);
    if (wrong) {
      pressureWrong(board.decay);
      bumpRunPressure(state);
      if (runPressureReached(state, corruptionForRun(state.run), valveHeadroom())) {
        collapse();
        return;
      }
    }
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (reverted.length) {
      grid.flashWrong(reverted);
      pushLog(state, `${reverted.length} volatile cell${reverted.length === 1 ? "" : "s"} decayed — lock fills with l.`);
    }
    if (!board.solved && decayFailed(board.decay)) {
      failSnapshot();
      return;
    }
    if (board.solved) onSolved();
    else {
      save?.();
      paintHud();
    }
  }
  function failSnapshot() {
    const penalty = board.decay.penalty;
    state.registers = Math.max(0, Number(state.registers || 0) - penalty);
    state.run.marks = null;
    pushLog(state, `memory destabilized — snapshot collapsed. -${penalty} registers. restoring a fresh copy.`);
    save?.();
    loadBoard();
    paintHud();
  }
  function collapse() {
    collapseRun(state);
    pushLog(state, "MEMORY DESTABILIZED — too many corrupt writes; the run collapsed and a clean copy rebuilt. Your registers, retained fragments, Defrag upgrades and achievements all carried over.");
    save?.();
    loadBoard();
    paintHud();
  }
  function lockUnderCursor() {
    if (!board.volatile || board.solved) return;
    if (lockCell(board, board.cursor.x, board.cursor.y)) {
      grid.update(board);
      save?.();
      paintHud();
    }
  }
  function onSolved() {
    const size = board.puzzle.width;
    const mult = 1 + 0.25 * (upgradeLevel(state, "throughput") + boonBonus(state, "throughput"));
    const corrBonus = 1 + 0.18 * corruptionForRun(state.run);
    const reward = Math.round((size * size + 12) * mult * corrBonus);
    state.registers += reward;
    state.run.solvedCount += 1;
    state.run.index += 1;
    state.run.marks = null;
    if (corruptionForRun(state.run) >= 8) state.boss.corruption8Reached = true;
    pushLog(state, `snapshot restored. +${reward} registers.`);
    if (state.run.solvedCount % RETAIN_EVERY === 0) {
      state.retained += 1;
      pushLog(state, "a fragment crystallized. +1 retained.");
    }
    award("first_restore", "Restored your first snapshot");
    if ((board.mistakes || 0) === 0) award("flawless", "Flawless restore — no wrong cells");
    if (corruptionForRun(state.run) >= 4) award("deep_defrag", "Reached corruption 4");
    if (size >= 10) award("wide_recall", "Cleared a 10×10 snapshot");
    if (state.retained >= 5) award("retainer", "Retained 5 fragments");
    save?.();
    loadBoard();
    paintHud();
  }
  function paintHud() {
    const lock = getBossLockState({ actions, state });
    setText(fields.registers, state.registers);
    setText(fields.retained, state.retained);
    setText(fields.snap, `#${state.run.index + 1}`);
    const size = board.puzzle.width;
    const mode = board.puzzle.twoColor ? " · 2-colour" : "";
    const aliased = aliasedTotal(board.puzzle);
    const aliasMode = aliased ? ` · ${aliased} aliased` : "";
    setText(fields.size, `${size}×${size} · corruption ${corruptionForRun(state.run)}${mode}${aliasMode} · ${rating(board.puzzle.difficulty)}`);
    const plimit = pressureLimit();
    const pnow = Number(state.run.pressure || 0);
    setText(fields.pressure, `STABILITY ${Math.max(0, plimit - pnow)}/${plimit}`);
    const pratio = plimit ? pnow / plimit : 0;
    fields.pressure.classList.toggle("s3-pressure-warn", pratio >= 0.5 && pratio < 0.8);
    fields.pressure.classList.toggle("s3-pressure-crit", pratio >= 0.8);
    fields.pressure.title = "Run stability — wrong fills across the whole run lower it. Hit zero and the run softly collapses and restarts fresh; your registers, retained, upgrades and achievements all carry over.";
    const pr = progress(board.puzzle, board.marks);
    const vol = volatileStatus(board);
    const volNote = vol ? ` · volatile ${vol.locked}/${vol.total} locked — fills decay in ${vol.window} moves (press l)` : "";
    const decayNote = board.decay?.active ? ` · instability ${Math.round(decayRatio(board.decay) * 100)}%` : "";
    const aliasNote = aliased ? ` · ${aliased} “?” clue${aliased === 1 ? "" : "s"} aliased — deduce from crossing lines` : "";
    setText(fields.objective, board.solved ? "snapshot restored — drawing the next…" : `restore the memory snapshot — ${pr.have}/${pr.need} cells lit${volNote}${decayNote}${aliasNote}.`);
    setText(fields.bossStatus, `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`);
    setText(fields.hint, lock.hint);
    setHidden(btsBtn, !state.boss.defeated);
    const oracle = oracleCap();
    const parity = parityCap();
    setHidden(fields.hintBtn, oracle <= 0);
    setHidden(fields.checkBtn, parity <= 0);
    if (oracle > 0) {
      const left = oracle - (board.hintsUsed || 0);
      setText(fields.hintBtn, `hint (${left})`);
      fields.hintBtn.disabled = left <= 0 || board.solved;
    }
    if (parity > 0) {
      const left = parity - (board.checksUsed || 0);
      setText(fields.checkBtn, `check (${left})`);
      fields.checkBtn.disabled = left <= 0 || board.solved;
    }
    verbBar.setEnabled("fillB", Boolean(board.puzzle.twoColor));
    verbBar.setEnabled("lock", Boolean(board.volatile));
    const active = verbBar.getActive();
    if (active === "fillB" && !board.puzzle.twoColor || active === "lock" && !board.volatile) verbBar.setActive("fillA");
    const pending = draftPending(state);
    setHidden(fields.draftBtn, !pending && state.run.boons.length === 0);
    setText(fields.draftBtn, pending ? "boon draft •" : "boons");
    fields.draftBtn.classList.toggle("s3-pending", pending);
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
  function useHint() {
    if (board.solved || (board.hintsUsed || 0) >= oracleCap()) return;
    const cell = firstHintCell(board);
    if (!cell) return;
    board.hintsUsed = (board.hintsUsed || 0) + 1;
    board.cursor = { x: cell.x, y: cell.y };
    pushLog(state, "oracle reveals a cell.");
    applyCell(cell.x, cell.y, false, cell.color || FILLED);
  }
  function useCheck() {
    if (board.solved || (board.checksUsed || 0) >= parityCap()) return;
    board.checksUsed = (board.checksUsed || 0) + 1;
    const wrong = wrongCells(board);
    if (wrong.length) {
      grid.flashWrong(wrong);
      pushLog(state, `parity check: ${wrong.length} wrong cell${wrong.length === 1 ? "" : "s"} flagged.`);
    } else pushLog(state, "parity check: no errors.");
    save?.();
    paintHud();
  }
  function toggleShop() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      paintHud();
      return;
    }
    const panel = buildShopPanel({ state, save, onClose: () => {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      paintHud();
    } });
    overlay = panel.el;
    root.appendChild(panel.el);
  }
  function toggleDraft() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      paintHud();
      return;
    }
    const panel = buildDraftPanel({ state, save, onClose: () => {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      paintHud();
    } });
    overlay = panel.el;
    root.appendChild(panel.el);
  }
  const onKey = (event) => {
    if (!root.isConnected || overlay) return;
    const tag = event.target && event.target.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return;
    if (Object.prototype.hasOwnProperty.call(MOVE, event.key)) {
      event.preventDefault();
      const [dx, dy] = MOVE[event.key];
      moveCursor(board, dx, dy);
      grid.update(board);
      return;
    }
    if (event.key === " " || event.key === "f" || event.key === "F" || event.key === "1") {
      event.preventDefault();
      applyCell(board.cursor.x, board.cursor.y, false, FILLED);
      return;
    }
    if (event.key === "g" || event.key === "G" || event.key === "2") {
      event.preventDefault();
      applyCell(board.cursor.x, board.cursor.y, false, COLOR_B);
      return;
    }
    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      applyCell(board.cursor.x, board.cursor.y, true);
      return;
    }
    if (event.key === "l" || event.key === "L") {
      event.preventDefault();
      lockUnderCursor();
    }
  };
  window.addEventListener("keydown", onKey);
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "shop") {
      toggleShop();
      return;
    }
    if (action === "draft") {
      toggleDraft();
      return;
    }
    if (action === "hint") {
      useHint();
      return;
    }
    if (action === "check") {
      useCheck();
      return;
    }
    if (action === "v1") viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: "stage3" });
    if (action === "v2") viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: "stage3" });
    if (action === "v3") viewer?.openFile?.(MEMORY_V3_PATH, { text: memoryV3Text(state), source: "stage3" });
    if (action === "restore") tryRestoreDiffKey({ state, actions, achievements, bell, input: keyInput.value });
    if (action === "boss" && defeatMemoryLeak(state)) completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    if (action === "bts") bts?.open?.(3);
    save?.();
    paintHud();
  });
  function solveCurrent() {
    if (!board || board.solved) return false;
    for (let y = 0; y < board.puzzle.height; y += 1) {
      for (let x = 0; x < board.puzzle.width; x += 1) {
        const sol = board.puzzle.solution[y][x];
        board.marks[y][x] = sol ? sol : UNKNOWN;
      }
    }
    board.solved = isSolved(board.puzzle, board.marks);
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (board.solved) onSolved();
    return true;
  }
  function tryRestoreKey(key2) {
    const result = tryRestoreDiffKey({ state, actions, achievements, bell, input: key2 });
    save?.();
    paintHud();
    return result;
  }
  function bossSolver() {
    const won = defeatMemoryLeak(state);
    if (won) completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    save?.();
    paintHud();
    return won;
  }
  function draft(id) {
    const offer = draftOffer(state).map((b) => b.id);
    const ok = pickBoon(state, id != null ? id : offer[0]);
    if (ok) {
      save?.();
      paintHud();
    }
    return ok;
  }
  const uninstallHook = installStage3Hook({
    state,
    solveCurrent,
    tryRestoreKey,
    bossSolver,
    aliasedNow: () => aliasedTotal(board?.puzzle),
    draftPending: () => draftPending(state),
    draftOffer: () => draftOffer(state).map((b) => b.id),
    draft
  });
  function dev(id) {
    if (id === "show-solution") {
      if (!board || board.solved) return;
      devFillSolution(board);
      board.solved = isSolved(board.puzzle, board.marks);
      state.run.marks = encodeMarks(board.marks);
      grid.update(board);
      if (board.solved) onSolved();
      return;
    }
    if (id === "give-currency") {
      devGiveCurrency(state);
      save?.();
      paintHud();
      return;
    }
    if (id === "skip-to-boss") {
      devSkipToBody(state);
      save?.();
      loadBoard();
      paintHud();
      return;
    }
    if (id === "clear-pressure") {
      devClearPressure(state);
      save?.();
      paintHud();
      return;
    }
  }
  return {
    repaint: paintHud,
    dev,
    destroy() {
      window.removeEventListener("keydown", onKey);
      uninstallHook();
      verbBar.destroy();
      root.remove();
    }
  };
}
function rating(passes) {
  const n = Math.max(1, Math.min(4, Math.ceil((Number(passes) || 1) / 2)));
  return "★".repeat(n) + "☆".repeat(4 - n);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage3/index.js
var stageMeta = {
  id: 3,
  slug: "memory-grid",
  name: "Memory Grid",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "show-solution", label: "Show Solution" },
    { id: "give-currency", label: "+500 reg / +3 frag" },
    { id: "skip-to-boss", label: "Skip to Boss Gate" },
    { id: "clear-pressure", label: "Clear Run Pressure" }
  ]
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasDiffKeyRestored(ctx.actions)) state.boss.unlocked = true;
  const view = renderStage3({ ...ctx, state });
  return {
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
    repaint() {
      if (view && typeof view.repaint === "function") view.repaint();
    },
    destroy() {
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
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
