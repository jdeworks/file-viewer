import { defeatMemoryLeak, getBossLockState, pushLog, tryRestoreDiffKey } from "./boss.js";
import { memoryV1Text, memoryV2Text } from "./content.js";
import { BTS_PATH, MEMORY_V1_PATH, MEMORY_V2_PATH } from "./messages.js";
import { buildGrid } from "./grid.js";
import { createBoard, encodeMarks, moveCursor, progress, puzzleForRun, setCell, sizeForRun } from "./board.js";

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
  const setText = (el, v) => { const s = String(v); if (el.textContent !== s) el.textContent = s; };
  const setHidden = (el, h) => { if (el.hidden !== h) el.hidden = h; };
  const completeOnce = once((result) => onStageComplete?.(result));
  let lastLog = "";
  let board = null;
  let grid = null;

  loadBoard();
  paintHud();

  // Draw the current run's snapshot (regenerated from the seed) and restore any saved marks.
  function loadBoard() {
    const puzzle = puzzleForRun(state.run);
    board = createBoard(puzzle, state.run.marks);
    grid = buildGrid(puzzle, { onCell: (x, y, mark) => { board.cursor = { x, y }; applyCell(x, y, mark); } });
    gridHost.replaceChildren(grid.el);
    grid.update(board);
  }

  function applyCell(x, y, mark) {
    if (board.solved) return;
    setCell(board, x, y, mark);
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (board.solved) onSolved();
    else { save?.(); paintHud(); }
  }

  // A solved snapshot: bank registers (size² + a small no-mistake-ish base), retain a fragment every
  // few clears, then draw the next, deeper snapshot.
  function onSolved() {
    const size = board.puzzle.width;
    const reward = size * size + 5;
    state.registers += reward;
    state.run.solvedCount += 1;
    state.run.index += 1;
    state.run.marks = null;
    pushLog(state, `snapshot restored. +${reward} registers.`);
    if (state.run.solvedCount % RETAIN_EVERY === 0) { state.retained += 1; pushLog(state, "a fragment crystallized. +1 retained."); }
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
    setText(fields.objective, board.solved
      ? "snapshot restored — drawing the next…"
      : `restore the memory snapshot — ${pr.have}/${pr.need} cells lit. clear snapshots to retain fragments.`);
    setText(fields.bossStatus, `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`);
    setText(fields.hint, lock.hint);
    setHidden(btsBtn, !state.boss.defeated);
    const sig = state.log.slice(-6).join("\n");
    if (sig !== lastLog) {
      lastLog = sig;
      log.replaceChildren(...state.log.slice(-6).map((line) => { const li = document.createElement("li"); li.textContent = line; return li; }));
    }
  }

  const onKey = (event) => {
    if (!root.isConnected) return;
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
    if (event.key === "x" || event.key === "X") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, true); }
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
    destroy() { window.removeEventListener("keydown", onKey); root.remove(); }
  };
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
