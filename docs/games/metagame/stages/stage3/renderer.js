import { defeatMemoryLeak, getBossLockState, pushLog, tryRestoreDiffKey } from "./boss.js";
import { memoryV1Text, memoryV2Text, memoryV3Text } from "./content.js";
import { BTS_PATH, MEMORY_V1_PATH, MEMORY_V2_PATH, MEMORY_V3_PATH } from "./messages.js";
import { buildGrid } from "./grid.js";
import { applyPrefetch, corruptionForRun, createBoard, encodeMarks, firstHintCell, isSolved, moveCursor, progress, puzzleForRun, setCell, sizeForRun, wrongCells } from "./board.js";
import { FILLED, COLOR_B, UNKNOWN } from "./nonogram.js";
import { upgradeLevel } from "./shop.js";
import { installStage3Hook } from "./s3debug.js";
import { devFillSolution, devGiveCurrency, devSkipToBody, devClearPressure } from "./s3dev.js";
import { initVolatile, lockCell, noteFill, tickVolatile, volatileStatus } from "./s3volatile.js";
import { createDecay, decayFailed, decayRatio, pressureMove, pressureWrong } from "./s3decay.js";
import { aliasedTotal } from "./s3aliased.js";
import { boonBonus, draftPending, ensureRunBoons } from "./s3boons.js";
import { acquisitionOffer, buildDraftPanel, pickDraftCard } from "./s3draft.js";
import { activeTiers, LEARN_SIZE } from "./s3tiercap.js";
import { installBoardFit } from "./s3fit.js";
import { announceTiers } from "./s3tiers.js";
import { bumpRunPressure, collapseRun, runPressureLimit, runPressureReached } from "./state.js";
import { buildStage3Shell } from "./view.js";
import { createVerbBar, verbToCell } from "./s3verbs.js";
import { banner } from "../../shared/feedback.js";

const MOVE = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
};
const RETAIN_EVERY = 4; // snapshots cleared per retained fragment

export function renderStage3(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = buildStage3Shell();
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s3-log");
  const keyInput = root.querySelector(".s3-key");
  const gridHost = root.querySelector(".s3-grid-host");
  const btsBtn = root.querySelector('[data-action="bts"]');
  // Touch verb toggle (Fill A / Fill B / Mark / Lock): a single-select bar so a plain TAP on a cell
  // applies the selected verb. Shown only on touch/small screens (CSS); desktop keeps mouse/keyboard.
  const verbBar = createVerbBar();
  root.querySelector(".s3-toolbar").before(verbBar.el);
  let overlay = null; // open acquire-draft modal, or null
  const setText = (el, v) => { const s = String(v); if (el.textContent !== s) el.textContent = s; };
  const setHidden = (el, h) => { if (el.hidden !== h) el.hidden = h; };
  const completeOnce = once((result) => onStageComplete?.(result));
  let lastLog = "";
  let board = null;
  let grid = null;
  let boardFit = null;       // #1 board scaler (installed after the first snapshot draws)
  let announcedGate = false; // #2 boss-gate arrival beat fires once per mount
  let lastStability = null;  // #7 STABILITY meter pulses only on change
  let draftSeen = false;     // M3 the acquire draft announces itself once when first available
  const awarded = state.achievements = state.achievements || {};
  function award(id, title) {
    if (awarded[id]) return;
    awarded[id] = true;
    achievements?.unlockAchievement?.(`stage3.${id}`, { stage: 3, title });
    pushLog(state, `achievement — ${title}`);
  }

  ensureRunBoons(state);
  // Effective per-snapshot aid counts = permanent shop level + this run's drafted boons (+ the
  // retained-fragment Engram Bank, which adds Oracle hints — the sink for the fragment currency).
  const oracleCap = () => upgradeLevel(state, "oracle") + boonBonus(state, "oracle") + upgradeLevel(state, "engram");
  const parityCap = () => upgradeLevel(state, "parity") + boonBonus(state, "parity");
  // The Pressure Valve boon's instability headroom (decayPct) widens BOTH the per-snapshot decay clock
  // and the run-level pressure limit — a coherent "more slack" synergy.
  const valveHeadroom = () => boonBonus(state, "decayPct");
  const pressureLimit = () => runPressureLimit(corruptionForRun(state.run), valveHeadroom());

  loadBoard();
  boardFit = installBoardFit(root, gridHost, () => grid?.dims); // #1 scale the board to its host
  paintHud();

  // Draw the current run's snapshot (regenerated from the seed) and restore any saved marks. A FRESH
  // snapshot (no saved marks) gets the Prefetch Cache pre-fills.
  function loadBoard() {
    const fresh = !state.run.marks;
    const corruption = corruptionForRun(state.run);
    // Tier-arrival messaging: announce any mechanic whose corruption threshold this snapshot first
    // reaches (fires once per run, deterministically) so the new rule lands with context. The list it
    // returns drives the M4 LEARNING WINDOW — the first snapshot after an unlock features ONLY the new
    // mechanic on a small board.
    const fired = announceTiers(state, corruption);
    const learn = fired.length ? fired[fired.length - 1] : null;
    // APPROVED OPTION — tier cap: at most 2 tier mechanics active per snapshot (see s3tiercap.js). A
    // learning window overrides that to the single new mechanic.
    const active = learn ? new Set([learn]) : activeTiers(corruption, state.run.index);
    const sizeOverride = learn ? Math.min(LEARN_SIZE, sizeForRun(state.run, state.shopUpgrades)) : undefined;
    const puzzle = puzzleForRun(state.run, state.shopUpgrades, { size: sizeOverride, aliased: active.has("aliased") });
    board = createBoard(puzzle, state.run.marks);
    board.hintsUsed = 0;
    board.checksUsed = 0;
    board.mistakes = 0;
    const prefetch = upgradeLevel(state, "prefetch") + boonBonus(state, "prefetch");
    if (fresh && prefetch) { applyPrefetch(board, prefetch); state.run.marks = encodeMarks(board.marks); }
    // Volatile cells: a seeded subset of fills decays after a few moves unless locked (when active).
    if (active.has("volatile")) initVolatile(board, corruption, `${state.run.seed}:${state.run.index}`);
    // Stabilizer Field boon: volatile fills survive a few extra moves this run.
    if (board.volatile) board.decayWindow += boonBonus(state, "volatile");
    // Decay clock: per-snapshot pressure meter — cross it and this snapshot fails (when active).
    board.decay = createDecay(puzzle, active.has("decay") ? corruption : 0);
    // Pressure Valve boon: extra instability headroom this run.
    if (board.decay.active) board.decay.threshold = Math.round(board.decay.threshold * (1 + boonBonus(state, "decayPct")));
    grid = buildGrid(puzzle, {
      onCell: (x, y, mark, colorB) => { board.cursor = { x, y }; applyCell(x, y, mark, colorB ? COLOR_B : FILLED); },
      onTap: (x, y) => tapCell(x, y),
    });
    gridHost.replaceChildren(grid.el);
    grid.update(board);
    boardFit?.measure();
  }

  // A plain tap applies the verb currently selected in the on-screen toggle (touch path). Lock routes
  // to lockUnderCursor; the rest go through the SAME applyCell() a click/keypress uses (rules identical).
  function tapCell(x, y) {
    board.cursor = { x, y };
    const op = verbToCell(verbBar.getActive());
    if (op.lock) { lockUnderCursor(); return; }
    applyCell(x, y, op.mark, op.color);
  }

  function applyCell(x, y, mark, color = FILLED) {
    if (board.solved) return;
    const reverted = tickVolatile(board, isSolved); // advance the move clock; decay overdue volatiles
    const wrong = setCell(board, x, y, mark, color);
    if (wrong) board.mistakes = (board.mistakes || 0) + 1; // a wrong fill
    if (!mark && board.marks[y][x] !== UNKNOWN) noteFill(board, x, y); // start this cell's decay timer
    pressureMove(board.decay);
    if (wrong) {
      pressureWrong(board.decay);
      // Run-level pressure: this wrong fill accumulates across ALL snapshots of the run. Cross the
      // (corruption + valve)-scaled limit and the whole run softly collapses (meta preserved).
      bumpRunPressure(state);
      if (runPressureReached(state, corruptionForRun(state.run), valveHeadroom())) { collapse(); return; }
    }
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (reverted.length) { grid.flashWrong(reverted); pushLog(state, `${reverted.length} volatile cell${reverted.length === 1 ? "" : "s"} decayed — lock fills with l.`); }
    if (!board.solved && decayFailed(board.decay)) { failSnapshot(); return; }
    if (board.solved) onSolved(true); // real player solve → play the reveal
    else { save?.(); paintHud(); }
  }

  // The decay clock crossed the threshold: this snapshot collapses. Wipe its marks to retry the SAME
  // snapshot (the run continues), charge a Register penalty, and redraw.
  function failSnapshot() {
    const penalty = board.decay.penalty;
    state.registers = Math.max(0, Number(state.registers || 0) - penalty);
    state.run.marks = null;
    pushLog(state, `memory destabilized — snapshot collapsed. -${penalty} registers. restoring a fresh copy.`);
    save?.();
    loadBoard();
    paintHud();
  }

  // The RUN pressure clock crossed its limit: the whole run softly collapses. A SOFT reset — draws a
  // fresh run (new seed) but keeps ALL permanent progress; reads as "destabilized, start fresh", never
  // a punishment. (Distinct from failSnapshot, which resets only the current snapshot.)
  function collapse() {
    collapseRun(state);
    pushLog(state, "MEMORY DESTABILIZED — too many corrupt writes; the run collapsed and a clean copy rebuilt. Your registers, retained fragments, Defrag upgrades and achievements all carried over.");
    save?.();
    loadBoard();
    paintHud();
  }

  // Lock the volatile cell under the cursor so it stops decaying (the working-memory verb).
  function lockUnderCursor() {
    if (!board.volatile || board.solved) return;
    if (lockCell(board, board.cursor.x, board.cursor.y)) { grid.update(board); save?.(); paintHud(); }
  }

  // A solved snapshot: bank registers (size² + a small no-mistake-ish base), retain a fragment every
  // few clears, then draw the next, deeper snapshot. `animate` (true only on a real player solve — the
  // programmatic solveCurrent/dev paths pass false) plays the #4 SOLVE REVEAL: a cascade wave over the
  // resolved picture, then the next snapshot draws. State fully advances FIRST (synchronously), so the
  // deferred redraw never desyncs the deterministic hook.
  function onSolved(animate) {
    const size = board.puzzle.width;
    const picto = board.puzzle.picto; // the 1-bit picture this snapshot resolved into (if any)
    const mult = 1 + 0.25 * (upgradeLevel(state, "throughput") + boonBonus(state, "throughput")); // Throughput upgrade + boons
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
    pushLog(state, picto ? `fragment: ${picto.name} crystallized. +${reward} registers.` : `snapshot restored. +${reward} registers.`);
    if (state.run.solvedCount % RETAIN_EVERY === 0) { state.retained += 1; pushLog(state, "a fragment crystallized. +1 retained."); }
    // Achievements (#18).
    award("first_restore", "Restored your first snapshot");
    if ((board.mistakes || 0) === 0) award("flawless", "Flawless restore — no wrong cells");
    if (corruptionForRun(state.run) >= 4) award("deep_defrag", "Reached corruption 4");
    if (size >= 10) award("wide_recall", "Cleared a 10×10 snapshot");
    if (state.retained >= 5) award("retainer", "Retained 5 fragments");
    save?.();
    const drawNext = () => { if (!root.isConnected) return; loadBoard(); paintHud(); };
    if (animate && grid) { paintHud(); grid.celebrate(drawNext, { fragmentName: picto ? picto.name : null }); }
    else drawNext();
  }

  function paintHud() {
    const lock = getBossLockState({ actions, state });
    const corruption = corruptionForRun(state.run);
    setText(fields.registers, state.registers);
    setText(fields.snap, `#${state.run.index + 1}`);
    const size = board.puzzle.width;
    const mode = board.puzzle.twoColor ? " · 2-colour" : "";
    const aliased = aliasedTotal(board.puzzle);
    const aliasMode = aliased ? ` · ${aliased} aliased` : "";
    setText(fields.size, `${size}×${size} · corruption ${corruptionForRun(state.run)}${mode}${aliasMode} · ${rating(board.puzzle.difficulty)}`);
    // Run-stability meter (the forgiving run-pressure clock) — shows remaining stability before a soft
    // collapse, with escalating warning as it nears zero. Higher = safer, so it reads non-punitively.
    const plimit = pressureLimit();
    const pnow = Number(state.run.pressure || 0);
    const stability = Math.max(0, plimit - pnow);
    setText(fields.pressure, `STABILITY ${stability}/${plimit}`);
    if (lastStability !== null && stability !== lastStability) pulse(fields.pressure); // #7 pulse on change only
    lastStability = stability;
    const pratio = plimit ? pnow / plimit : 0;
    fields.pressure.classList.toggle("s3-pressure-warn", pratio >= 0.5 && pratio < 0.8);
    fields.pressure.classList.toggle("s3-pressure-crit", pratio >= 0.8);
    fields.pressure.title = "Run stability — wrong fills across the whole run lower it. Hit zero and the run softly collapses and restarts fresh; your registers, retained, upgrades and achievements all carry over.";
    const pr = progress(board.puzzle, board.marks);
    const vol = volatileStatus(board);
    const volNote = vol ? ` · volatile ${vol.locked}/${vol.total} locked — fills decay in ${vol.window} moves (press l)` : "";
    const decayNote = board.decay?.active ? ` · instability ${Math.round(decayRatio(board.decay) * 100)}%` : "";
    const aliasNote = aliased ? ` · ${aliased} “?” clue${aliased === 1 ? "" : "s"} aliased — deduce from crossing lines` : "";
    setText(fields.objective, board.solved
      ? "snapshot restored — drawing the next…"
      : `restore the memory snapshot — ${pr.have}/${pr.need} cells lit${volNote}${decayNote}${aliasNote}.`);
    setText(fields.bossStatus, `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`);
    setText(fields.hint, lock.hint);
    setHidden(btsBtn, !state.boss.defeated);
    paintBoss(lock, corruption); // #2 stage the boss (chip → body → gate) + M2 fragment progress
    // Oracle / Parity assist buttons (shown once owned; count = shop level + boons, remaining this snapshot).
    const oracle = oracleCap();
    const parity = parityCap();
    setHidden(fields.hintBtn, oracle <= 0);
    setHidden(fields.checkBtn, parity <= 0);
    if (oracle > 0) { const left = oracle - (board.hintsUsed || 0); setText(fields.hintBtn, `hint (${left})`); fields.hintBtn.disabled = left <= 0 || board.solved; }
    if (parity > 0) { const left = parity - (board.checksUsed || 0); setText(fields.checkBtn, `check (${left})`); fields.checkBtn.disabled = left <= 0 || board.solved; }
    // Verb toggle: Fill B is only meaningful on two-colour snapshots, Lock only when cells are
    // volatile — disable the rest so a tap can't lay a guaranteed-wrong colour. If the active verb
    // just became unavailable (e.g. a new mono snapshot), fall back to Fill A.
    verbBar.setEnabled("fillB", Boolean(board.puzzle.twoColor));
    verbBar.setEnabled("lock", Boolean(board.volatile));
    const active = verbBar.getActive();
    if ((active === "fillB" && !board.puzzle.twoColor) || (active === "lock" && !board.volatile)) verbBar.setActive("fillA");
    // Acquire button (M1/M3) — the single acquisition surface; shown only while a pick is pending, and
    // it announces itself with a banner the first time it becomes available (progressive disclosure).
    const pending = draftPending(state);
    setHidden(fields.draftBtn, !pending);
    setText(fields.draftBtn, "acquire •");
    fields.draftBtn.classList.toggle("s3-pending", pending);
    if (pending && !draftSeen) {
      draftSeen = true;
      banner(root, "ACQUIRE — pick 1 of 3");
      pushLog(state, "an acquisition is available — draft a boon or bank a permanent upgrade.");
    }
    const sig = state.log.slice(-6).join("\n");
    if (sig !== lastLog) {
      lastLog = sig;
      log.replaceChildren(...state.log.slice(-6).map((line) => { const li = document.createElement("li"); li.textContent = line; return li; }));
    }
  }

  // #2 stage the boss: a one-line chip until corruption 4, the panel body at 4–7, and the restoration
  // controls only at the corruption-8 gate (bodyReady). M2: retained fragments read here as boss
  // progress, not as a spendable HUD currency. The DOM nodes always exist (we only toggle visibility)
  // so the boss-lock state stays queryable. Opening the gate fires a one-time banner + bell beat.
  function paintBoss(lock, corruption) {
    const stage = lock.bodyReady ? 2 : corruption >= 4 ? 1 : 0;
    setHidden(fields.bossBody, stage < 1);
    setHidden(fields.bossGate, stage < 2);
    const frag = Number(state.retained || 0);
    const fragNote = frag ? ` · fragments ${frag} feed the leak` : "";
    const chip = stage === 2
      ? `THE MEMORY LEAK · gate open${fragNote}`
      : stage === 1
        ? `THE MEMORY LEAK · corruption ${corruption}/8${fragNote}`
        : `the leak spreads… ${corruption}/8${fragNote}`;
    setText(fields.bossChip, chip);
    fields.bossPanel.classList.toggle("s3-boss-open", stage === 2);
    if (stage === 2 && !announcedGate) {
      announcedGate = true;
      banner(root, "GATE OPEN");
      bell?.showBell?.("stage3.boss_gate", "the leak's columns are within reach — restore the key.", { stage: 3 });
      pushLog(state, "the leak's columns are within reach — restore the key.");
    }
  }

  // #7 one-shot pulse on a HUD element (fires only on a STABILITY change). reduced-motion suppresses
  // the animation in CSS, so this degrades to a no-op there.
  function pulse(el) {
    el.classList.remove("s3-pulse");
    void el.offsetWidth; // reflow so the animation re-triggers
    el.classList.add("s3-pulse");
  }

  // Oracle hint: reveal one correct cell, costing one of this snapshot's hints.
  function useHint() {
    if (board.solved || (board.hintsUsed || 0) >= oracleCap()) return;
    const cell = firstHintCell(board);
    if (!cell) return;
    board.hintsUsed = (board.hintsUsed || 0) + 1;
    board.cursor = { x: cell.x, y: cell.y };
    pushLog(state, "oracle reveals a cell.");
    applyCell(cell.x, cell.y, false, cell.color || FILLED);
  }

  // Parity check: flag any wrong fills (cells you filled that should be empty), costing one check.
  function useCheck() {
    if (board.solved || (board.checksUsed || 0) >= parityCap()) return;
    board.checksUsed = (board.checksUsed || 0) + 1;
    const wrong = wrongCells(board);
    if (wrong.length) { grid.flashWrong(wrong); pushLog(state, `parity check: ${wrong.length} wrong cell${wrong.length === 1 ? "" : "s"} flagged.`); }
    else pushLog(state, "parity check: no errors.");
    save?.();
    paintHud();
  }

  // The controls help (#5/M3) collapses behind the ❓ toggle — the keybinding wall is no longer body
  // text spoiling the first screen. The verb bar teaches the common verbs; this is the full reference.
  function toggleHelp(btn) {
    const show = fields.help.hidden;
    setHidden(fields.help, !show);
    btn?.setAttribute("aria-expanded", String(show));
    btn?.classList.toggle("s3-help-on", show);
  }

  // Acquire overlay (M1) — the ONE acquisition surface (shared modal): a seeded 1-of-3 mix of free run
  // boons and purchasable permanent Defrag upgrades. Picking either resolves the draft and closes;
  // it applies to the NEXT snapshot drawn (the current board is not changed).
  function toggleDraft() {
    if (overlay) { overlay.close(); return; }
    overlay = buildDraftPanel({ state, save, onClose: () => { overlay = null; paintHud(); } });
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
    if (event.key === " " || event.key === "f" || event.key === "F" || event.key === "1") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, false, FILLED); return; }
    if (event.key === "g" || event.key === "G" || event.key === "2") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, false, COLOR_B); return; }
    if (event.key === "x" || event.key === "X") { event.preventDefault(); applyCell(board.cursor.x, board.cursor.y, true); return; }
    if (event.key === "l" || event.key === "L") { event.preventDefault(); lockUnderCursor(); }
  };
  window.addEventListener("keydown", onKey);

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "help") { toggleHelp(button); return; }
    if (action === "draft") { toggleDraft(); return; }
    if (action === "hint") { useHint(); return; }
    if (action === "check") { useCheck(); return; }
    if (action === "v1") viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: "stage3" });
    if (action === "v2") viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: "stage3" });
    if (action === "v3") viewer?.openFile?.(MEMORY_V3_PATH, { text: memoryV3Text(state), source: "stage3" });
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
        const sol = board.puzzle.solution[y][x]; // 0 / 1 (A) / 2 (B)
        board.marks[y][x] = sol ? sol : UNKNOWN;
      }
    }
    board.solved = isSolved(board.puzzle, board.marks);
    state.run.marks = encodeMarks(board.marks);
    grid.update(board);
    if (board.solved) onSolved(false); // deterministic path — advance synchronously, no reveal
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
  function draft(id) {
    const offer = acquisitionOffer(state);
    // Default (no id) picks the first FREE boon in the offer so the deterministic hook never fails on
    // affordability; an explicit id routes through the same acquire path a click uses.
    const target = id != null ? id : (offer.find((c) => c.kind === "boon") || offer[0] || {}).id;
    const ok = pickDraftCard(state, save, target);
    if (ok) { save?.(); paintHud(); }
    return ok;
  }
  const uninstallHook = installStage3Hook({
    state, solveCurrent, tryRestoreKey, bossSolver,
    aliasedNow: () => aliasedTotal(board?.puzzle),
    draftPending: () => draftPending(state),
    draftOffer: () => acquisitionOffer(state).map((c) => c.id),
    draft,
    // VISUAL-ONLY test affordance: play the solve-reveal linger (cascade + "fragment: NAME" caption)
    // on the current board WITHOUT mutating any state or advancing the run — lets the shots/smoke eye
    // the linger. Does NOT touch the deterministic solveCurrent/bodySolver path or its timing.
    demoReveal: (name) => { if (grid && board && !board.solved) grid.celebrate(() => {}, { fragmentName: name || "CACHE KEY" }); },
  });

  // Dev-menu cheats (see index.js stageMeta.devControls). Pure state mutation via s3dev.js;
  // DOM-side effects (grid update, board reload, repaint) are handled here in the renderer.
  function dev(id) {
    if (id === "show-solution") {
      if (!board || board.solved) return;
      devFillSolution(board);
      board.solved = isSolved(board.puzzle, board.marks);
      state.run.marks = encodeMarks(board.marks);
      grid.update(board);
      if (board.solved) onSolved(false);
      return;
    }
    if (id === "give-currency") { devGiveCurrency(state); save?.(); paintHud(); return; }
    if (id === "skip-to-boss") { devSkipToBody(state); save?.(); loadBoard(); paintHud(); return; }
    if (id === "clear-pressure") { devClearPressure(state); save?.(); paintHud(); return; }
  }

  function jumpToBoss() {
    devSkipToBody(state);
    state.boss.reached = true;
    save?.();
    loadBoard();
    paintHud();
    return !fields.bossGate.hidden;
  }

  return {
    repaint: paintHud,
    dev,
    jumpToBoss,
    destroy() { overlay?.close?.(); boardFit?.destroy(); window.removeEventListener("keydown", onKey); uninstallHook(); verbBar.destroy(); root.remove(); }
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
