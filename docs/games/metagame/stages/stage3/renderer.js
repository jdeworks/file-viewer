import { defeatMemoryLeak, getBossLockState, pushLog, tryRestoreDiffKey } from "./boss.js";
import { memoryV1Text, memoryV2Text } from "./content.js";
import { BTS_PATH, MEMORY_V1_PATH, MEMORY_V2_PATH } from "./messages.js";
import { buildGrid } from "./grid.js";
import { applyPrefetch, corruptionForRun, createBoard, encodeMarks, firstHintCell, isSolved, moveCursor, progress, puzzleForRun, setCell, sizeForRun, wrongCells } from "./board.js";
import { FILLED, UNKNOWN } from "./nonogram.js";
import { buildShopPanel, upgradeLevel } from "./shop.js";
import { installStage3Hook } from "./s3debug.js";
import { initVolatile, lockCell, noteFill, tickVolatile, volatileStatus } from "./s3volatile.js";

const MOVE = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
};
const RETAIN_EVERY = 4; // snapshots cleared per retained fragment

export function renderStage3(ctx) {
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
      <div class="s3-grid-col">
        <div class="s3-grid-host"></div>
        <div class="s3-toolbar">
          <button type="button" data-action="shop">defrag shop</button>
          <button type="button" data-action="hint" data-field="hintBtn" hidden></button>
          <button type="button" data-action="check" data-field="checkBtn" hidden></button>
        </div>
      </div>
      <aside class="s3-side">
        <div class="s3-help">arrows / WASD move · space fill · x mark · l lock volatile · click fills, right-click marks</div>
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
  let overlay = null; // open shop panel, or null
  const setText = (el, v) => { const s = String(v); if (el.textContent !== s) el.textContent = s; };
  const setHidden = (el, h) => { if (el.hidden !== h) el.hidden = h; };
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

  loadBoard();
  paintHud();

  // Draw the current run's snapshot (regenerated from the seed) and restore any saved marks. A FRESH
  // snapshot (no saved marks) gets the Prefetch Cache pre-fills.
  function loadBoard() {
    const fresh = !state.run.marks;
    const puzzle = puzzleForRun(state.run, state.shopUpgrades);
    board = createBoard(puzzle, state.run.marks);
    board.hintsUsed = 0;
    board.checksUsed = 0;
    board.mistakes = 0;
    if (fresh && upgradeLevel(state, "prefetch")) { applyPrefetch(board, upgradeLevel(state, "prefetch")); state.run.marks = encodeMarks(board.marks); }
    // Volatile cells (corruption ≥ 2): a seeded subset of fills decays after a few moves unless locked.
    initVolatile(board, corruptionForRun(state.run), `${state.run.seed}:${state.run.index}`);
    grid = buildGrid(puzzle, { onCell: (x, y, mark) => { board.cursor = { x, y }; applyCell(x, y, mark); } });
    gridHost.replaceChildren(grid.el);
    grid.update(board);
  }

  function applyCell(x, y, mark) {
    if (board.solved) return;
    const reverted = tickVolatile(board, isSolved); // advance the move clock; decay overdue volatiles
    if (setCell(board, x, y, mark)) board.mistakes = (board.mistakes || 0) + 1; // a wrong fill
    if (!mark && board.marks[y][x] === FILLED) noteFill(board, x, y); // start this cell's decay timer
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (reverted.length) { grid.flashWrong(reverted); pushLog(state, `${reverted.length} volatile cell${reverted.length === 1 ? "" : "s"} decayed — lock fills with l.`); }
    if (board.solved) onSolved();
    else { save?.(); paintHud(); }
  }

  // Lock the volatile cell under the cursor so it stops decaying (the working-memory verb).
  function lockUnderCursor() {
    if (!board.volatile || board.solved) return;
    if (lockCell(board, board.cursor.x, board.cursor.y)) { grid.update(board); save?.(); paintHud(); }
  }

  // A solved snapshot: bank registers (size² + a small no-mistake-ish base), retain a fragment every
  // few clears, then draw the next, deeper snapshot.
  function onSolved() {
    const size = board.puzzle.width;
    const mult = 1 + 0.25 * upgradeLevel(state, "throughput"); // Throughput upgrade
    const corrBonus = 1 + 0.18 * corruptionForRun(state.run);  // harder/deeper snapshots pay more
    // Rebalanced for the tightened ~13-solve body: a higher flat base keeps the Defrag shop reachable
    // in a shorter run, and the steeper corruption bonus rewards the climb to the boss gate.
    const reward = Math.round((size * size + 12) * mult * corrBonus);
    state.registers += reward;
    state.run.solvedCount += 1;
    state.run.index += 1;
    state.run.marks = null;
    // Boss gate (boss-never-from-start): corruption peaking at 8 is reached ONLY here, through play.
    if (corruptionForRun(state.run) >= 8) state.boss.corruption8Reached = true;
    pushLog(state, `snapshot restored. +${reward} registers.`);
    if (state.run.solvedCount % RETAIN_EVERY === 0) { state.retained += 1; pushLog(state, "a fragment crystallized. +1 retained."); }
    // Achievements (#18).
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
    const size = sizeForRun(state.run, state.shopUpgrades);
    setText(fields.size, `${size}×${size} · corruption ${corruptionForRun(state.run)} · ${rating(board.puzzle.difficulty)}`);
    const pr = progress(board.puzzle, board.marks);
    const vol = volatileStatus(board);
    const volNote = vol ? ` · volatile ${vol.locked}/${vol.total} locked — fills decay in ${vol.window} moves (press l)` : "";
    setText(fields.objective, board.solved
      ? "snapshot restored — drawing the next…"
      : `restore the memory snapshot — ${pr.have}/${pr.need} cells lit${volNote}.`);
    setText(fields.bossStatus, `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`);
    setText(fields.hint, lock.hint);
    setHidden(btsBtn, !state.boss.defeated);
    // Oracle / Parity assist buttons (shown once the upgrade is owned; count = remaining this snapshot).
    const oracle = upgradeLevel(state, "oracle");
    const parity = upgradeLevel(state, "parity");
    setHidden(fields.hintBtn, oracle <= 0);
    setHidden(fields.checkBtn, parity <= 0);
    if (oracle > 0) { const left = oracle - (board.hintsUsed || 0); setText(fields.hintBtn, `hint (${left})`); fields.hintBtn.disabled = left <= 0 || board.solved; }
    if (parity > 0) { const left = parity - (board.checksUsed || 0); setText(fields.checkBtn, `check (${left})`); fields.checkBtn.disabled = left <= 0 || board.solved; }
    const sig = state.log.slice(-6).join("\n");
    if (sig !== lastLog) {
      lastLog = sig;
      log.replaceChildren(...state.log.slice(-6).map((line) => { const li = document.createElement("li"); li.textContent = line; return li; }));
    }
  }

  // Oracle hint: reveal one correct cell, costing one of this snapshot's hints.
  function useHint() {
    if (board.solved || (board.hintsUsed || 0) >= upgradeLevel(state, "oracle")) return;
    const cell = firstHintCell(board);
    if (!cell) return;
    board.hintsUsed = (board.hintsUsed || 0) + 1;
    board.cursor = { ...cell };
    pushLog(state, "oracle reveals a cell.");
    applyCell(cell.x, cell.y, false);
  }

  // Parity check: flag any wrong fills (cells you filled that should be empty), costing one check.
  function useCheck() {
    if (board.solved || (board.checksUsed || 0) >= upgradeLevel(state, "parity")) return;
    board.checksUsed = (board.checksUsed || 0) + 1;
    const wrong = wrongCells(board);
    if (wrong.length) { grid.flashWrong(wrong); pushLog(state, `parity check: ${wrong.length} wrong cell${wrong.length === 1 ? "" : "s"} flagged.`); }
    else pushLog(state, "parity check: no errors.");
    save?.();
    paintHud();
  }

  // Defrag shop overlay — buying upgrades spends registers; closing repaints (next snapshot reflects
  // prefetch/overclock). The current board isn't retroactively changed.
  function toggleShop() {
    if (overlay) { overlay.remove(); overlay = null; paintHud(); return; }
    const panel = buildShopPanel({ state, save, onClose: () => { if (overlay) { overlay.remove(); overlay = null; } paintHud(); } });
    overlay = panel.el;
    root.querySelector(".s3-grid-col").appendChild(panel.el);
  }

  const onKey = (event) => {
    if (!root.isConnected || overlay) return;
    const tag = (event.target && event.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return; // leave the key field alone
    if (Object.prototype.hasOwnProperty.call(MOVE, event.key)) {
      event.preventDefault();
      const [dx, dy] = MOVE[event.key];
      moveCursor(board, dx, dy);
      grid.update(board);
      return;
    }
    if (event.key === " " || event.key === "f" || event.key === "F") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, false); return; }
    if (event.key === "x" || event.key === "X") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, true); return; }
    if (event.key === "l" || event.key === "L") { event.preventDefault(); lockUnderCursor(); }
  };
  window.addEventListener("keydown", onKey);

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "shop") { toggleShop(); return; }
    if (action === "hint") { useHint(); return; }
    if (action === "check") { useCheck(); return; }
    if (action === "v1") viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: "stage3" });
    if (action === "v2") viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: "stage3" });
    if (action === "restore") tryRestoreDiffKey({ state, actions, achievements, bell, input: keyInput.value });
    if (action === "boss" && defeatMemoryLeak(state)) completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    if (action === "bts") bts?.open?.(3);
    save?.();
    paintHud();
  });

  // ── Deterministic test/debug surface (window.__fvStage3) ──────────────────────────────────────
  // solveCurrent fills the current snapshot to its solution via the SAME onSolved path a player hits
  // (so registers/solvedCount/corruption all advance), then draws the next. Returns false when there
  // is nothing to solve.
  function solveCurrent() {
    if (!board || board.solved) return false;
    for (let y = 0; y < board.puzzle.height; y += 1) {
      for (let x = 0; x < board.puzzle.width; x += 1) {
        board.marks[y][x] = board.puzzle.solution[y][x] === FILLED ? FILLED : UNKNOWN;
      }
    }
    board.solved = isSolved(board.puzzle, board.marks);
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (board.solved) onSolved();
    return true;
  }
  function tryRestoreKey(key) {
    const result = tryRestoreDiffKey({ state, actions, achievements, bell, input: key });
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
  const uninstallHook = installStage3Hook({ state, solveCurrent, tryRestoreKey, bossSolver });

  return {
    repaint: paintHud,
    destroy() { window.removeEventListener("keydown", onKey); uninstallHook(); root.remove(); }
  };
}

// Difficulty rating (#16) from the solver-pass count (the Leiden metric): ★ to ★★★★.
function rating(passes) {
  const n = Math.max(1, Math.min(4, Math.ceil((Number(passes) || 1) / 2)));
  return "★".repeat(n) + "☆".repeat(4 - n);
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
