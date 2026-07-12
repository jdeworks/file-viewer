// ui-combat.js — Stage 4 Fractal Bastion: the tower-defense combat board.
//
// Used for BOTH a campaign map (mode 'map') and the boss arena (mode 'boss'). The controls + HUD are
// DOCKED in a sticky command bar ABOVE the board (UX audit #1) so the verbs and the board share one
// viewport; the board is COLOUR-CLASSED spans (board.boardHTML, audit #2); selecting a shop tower enters
// a placement PREVIEW (footprint + range ring, audit #3); tapping a placed tower opens a stats POPOVER
// (combat-popover). Feedback is diffed each frame (combat-fx, audit #5). On a fresh player's map 1 the
// damage-type / status / targeting UI is suppressed (M1); it discloses from map 2 with an arrival banner.

import { buildPath, mapPathDepth } from './lsystem.js';
import { boardHTML, boardText } from './board.js';
import { startWave as engineStartWave, tick, waveComplete, queueWave } from './engine.js';
import { cycleTowerTarget, getBossLockState, placeTower, pushLog, fightInfiniteLoop } from './boss.js';
import { upgradeTower, sellTower } from './upgrades.js';
import { chooseFork } from './forks.js';
import { snapshotWave } from './state.js';
import { mapByIndex, mapPathSeed, subBossIdForWave } from './maps.js';
import { subBossDef } from './subboss.js';
import { refundTowersOnPath, preWaveHint, placementPreview, rangeRing, wavePreviewLine } from './combat-helpers.js';
import { shopRows, rosterRows } from './combat-rows.js';
import { cellFromTextRect } from './combat-board-map.js';
import { combatDisclosed } from './run4.js';
import { openTowerPopover, closeTowerPopover, popoverTowerId } from './combat-popover.js';
import { createCombatFx, playFx, fxBanner } from './combat-fx.js';
import { installBoardFit } from './s4fit.js';
import { createFrameLoop } from '../../shared/frame-loop.js';

const PLACEABLE = [
  'pulse_node', 'scatter_array', 'null_spike', 'attractor_field',
  'frost_lattice', 'thermal_loop', 'chain_resonator', 'long_recursor',
  'glyph_mortar', 'shatter_drill', 'gravity_well', 'resonance_hub', 'cycle_extractor', 'bank_node',
];
const PERSIST_THROTTLE_MS = 1000;
const CALL_EARLY_BONUS = 20;
const SPEEDS = [1, 2, 3];

export function mountCombat({ host, state, controller, mode = 'map' }) {
  const isBoss = mode === 'boss';
  const mapIndex = state.campaign?.mapIndex ?? 0;
  const map = mapByIndex(mapIndex);
  const disclosed = isBoss || combatDisclosed(state, mapIndex);

  const root = document.createElement('section');
  root.className = 'stage4-combat';
  root.innerHTML = `
    <div class="s4-cmdbar">
      <div class="s4-cmd-hud">
        <strong>${isBoss ? 'THE INFINITE LOOP' : `${map.glyph} ${map.name.toUpperCase()}`}</strong>
        <span class="s4-stat">CYCLES <b data-field="cycles"></b></span>
        <span class="s4-stat">INTEGRITY <b data-field="integrity"></b></span>
        <span class="s4-stat">${isBoss ? 'POINTS' : 'WAVE'} <b data-field="progress"></b></span>
      </div>
      <div class="s4-cmd-actions">
        ${isBoss ? '' : `
          <span class="s4-next" data-field="next"></span>
          <button type="button" data-action="start-wave">▶ start wave</button>
          <button type="button" data-action="call-early" hidden>call next (+${CALL_EARLY_BONUS})</button>
          <button type="button" data-action="speed">speed 1×</button>`}
        ${isBoss ? '<button type="button" data-action="confront">confront The Infinite Loop</button>' : ''}
        <button type="button" data-action="blueprint">recursion_points.json</button>
        <button type="button" data-action="leave" class="s4-leave">${isBoss ? 'retreat' : '← maps'}</button>
      </div>
      <button type="button" class="s4-ticker" data-field="ticker" title="show full log"></button>
    </div>
    <ol class="s4-log-full" data-field="logfull" hidden></ol>
    <div class="s4-stage">
      <div class="s4-board-wrap">
        <pre class="s4-board" aria-label="fractal bastion board"></pre>
      </div>
      <section class="s4-panel">
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
        <div class="s4-roster" data-field="roster"></div>
      </section>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const board = root.querySelector('.s4-board');
  const boardWrap = root.querySelector('.s4-board-wrap');
  const cmdbar = root.querySelector('.s4-cmdbar');
  // Board legibility (playtest: cells were "sub-fingertip, sub-glance" at a fixed 12px) — scale the
  // board's font-size to fill the available board-wrap space, same "largest that fits" approach as
  // stage3's s3fit.js, adapted for a fixed 40×40 monospace char grid instead of a CSS Grid.
  const boardFit = installBoardFit(root, boardWrap);
  let selected = null;        // selected SHOP tower type (placement mode) — null until the player picks
  let selectedTowerId = null; // a selected PLACED tower (range ring + popover)
  let hoverCell = null;       // cell under the pointer (desktop) / last tapped (touch preview)
  let pendingCell = null;     // touch two-step: first tap previews, second tap on the same cell confirms
  let touchMode = false;      // set when the last pointer interaction was touch (→ tap-once-preview)
  let speed = 1;
  let frameLoop = null; // shared capped-rAF driver — non-null only while a wave runs
  let lastPersistMs = -Infinity;
  let alive = true;
  const fx = createCombatFx();
  let lastHits = null;
  let lastFired = null; // tower muzzle-flash cells (mirrors lastHits — see combat-fx.js)

  const pathSeed = isBoss ? (state.recursion?.pointSetId || 'x') : mapPathSeed(state.recursion?.pointSetId, mapIndex);
  let pathDepth = isBoss ? 3 : mapPathDepth(map.depth, state.waveNumber || 1);
  let path = buildPath(pathSeed, pathDepth);
  if (!Number.isFinite(state.wavePeak)) state.wavePeak = state.waveNumber || 1;

  // One-time disclosure arrival banner (M1): the moment the advanced systems first appear.
  if (disclosed && !state.campaign.disclosureSeen) {
    state.campaign.disclosureSeen = true;
    setTimeout(() => alive && fxBanner(boardWrap, 'enemies now resist by type — check tower damage types'), 30);
  }

  function maybeReshape() {
    if (isBoss) return false;
    const want = mapPathDepth(map.depth, state.waveNumber || 1);
    if (want === pathDepth) return false;
    pathDepth = want;
    path = buildPath(pathSeed, pathDepth);
    const { count } = refundTowersOnPath(state, path.tiles);
    pushLog(state, `⟲ the recursion folds — the path reshapes to depth ${pathDepth}.`
      + (count ? ` ${count} tower(s) caught on the new route were refunded.` : ''));
    return true;
  }

  function checkpointWave(overrides) { controller.checkpointWave?.({ ...snapshotWave(state), ...overrides }); }
  function endWaveSnapshot() { controller.endWaveSnapshot?.(); }

  // ── render ───────────────────────────────────────────────────────────────
  function currentOverlay() {
    const overlay = {};
    if (lastHits && lastHits.size) overlay.hits = lastHits;
    if (lastFired && lastFired.size) overlay.fired = lastFired;
    if (selectedTowerId) {
      const t = (state.towers || []).find((x) => x.id === selectedTowerId);
      if (t) overlay.rings = rangeRing(t.type, { x: t.x, y: t.y });
    } else if (selected && hoverCell) {
      const pv = placementPreview(state, path.tiles, selected, hoverCell);
      overlay.rings = pv.rings; overlay.foot = pv.foot; overlay.footValid = pv.valid;
    }
    return overlay;
  }

  function paintBoard() { if (alive) board.innerHTML = boardHTML(state, path.tiles, currentOverlay()); }

  function repaint() {
    if (!alive) return;
    const lock = getBossLockState({ actions: controller.actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = `${state.integrity}/${state.maxIntegrity || state.integrity}`;
    fields.progress.textContent = isBoss
      ? `${lock.coveredPoints}/${lock.totalPoints}`
      : `${Math.min(state.waveNumber || 1, map.waveCount)}/${map.waveCount}`;
    fields.hint.textContent = isBoss ? lock.hint
      : (state.waveActive
        ? 'hold the line — call the next wave early for bonus cycles'
        : preWaveHint(mapIndex, state.waveNumber || 1));
    fields.shop.replaceChildren(...shopRows({ placeable: PLACEABLE, isBoss, mapIndex, selected, disclosed, cycles: state.cycles }));
    fields.roster.replaceChildren(...rosterRows(state, disclosed));
    if (!isBoss) {
      fields.next.textContent = state.waveActive ? '' : `next: ${wavePreviewLine(mapIndex, state.waveNumber || 1)}`;
      root.querySelector('[data-action="call-early"]').hidden = !state.waveActive || (state.wavePeak || 1) >= map.waveCount;
      root.querySelector('[data-action="start-wave"]').hidden = state.waveActive;
      root.querySelector('[data-action="speed"]').textContent = `speed ${speed}×`;
    }
    const lines = (state.log || []).slice(-2);
    fields.ticker.textContent = lines.join('  ·  ') || 'the path repeats before it explains itself.';
    if (!fields.logfull.hidden) fields.logfull.replaceChildren(...(state.log || []).slice(-12).map((l) => li(l)));
    paintBoard();
    syncPopover();
  }

  function li(text) { const el = document.createElement('li'); el.textContent = text; return el; }

  function syncPopover() {
    if (!selectedTowerId) return;
    const t = (state.towers || []).find((x) => x.id === selectedTowerId);
    if (!t) { selectedTowerId = null; closeTowerPopover(); return; }
    if (popoverTowerId() === t.id) openTowerPopover({ root: boardWrap, state, tower: t, disclosed }); // refresh in place
  }

  // ── wave loop (map mode) ─────────────────────────────────────────────────
  function startWaveAction() {
    if (isBoss || state.waveActive || (state.waveNumber || 1) > map.waveCount) return;
    maybeReshape();
    engineStartWave(state, state.waveNumber, path.tiles);
    state.wavePeak = state.waveNumber;
    lastPersistMs = -Infinity;
    fx.reset();
    fxBanner(boardWrap, `WAVE ${state.waveNumber}/${map.waveCount}`);
    const sbId = subBossIdForWave(mapIndex, state.waveNumber || 1);
    if (sbId) { const d = subBossDef(sbId); if (d) setTimeout(() => alive && fxBanner(boardWrap, `⚠ ${d.name} — ${d.telegraph}`), 700); }
    checkpointWave(); controller.persist?.();
    runLoop();
  }

  function callEarly() {
    if (isBoss || !state.waveActive || (state.wavePeak || 1) >= map.waveCount) return;
    state.wavePeak = (state.wavePeak || state.waveNumber) + 1;
    queueWave(state, state.wavePeak);
    state.cycles = (state.cycles || 0) + CALL_EARLY_BONUS;
    pushLog(state, `wave ${state.wavePeak} called early (+${CALL_EARLY_BONUS} cycles).`);
    checkpointWave(); repaint();
  }

  function setSpeed(n) {
    speed = SPEEDS.includes(Number(n)) ? Number(n) : SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    repaint();
    return speed;
  }

  function runLoop() {
    stopLoop();
    let last = null;
    const stepFn = (ts) => {
      const dt = (last == null ? 16 : Math.min(100, ts - last)) * speed;
      last = ts;
      tick(state, dt, path.tiles);
      const deltas = fx.observe(state);
      lastHits = deltas.hitCells;
      lastFired = deltas.firedCells;
      playFx(deltas, { board, bar: cmdbar, floatHost: boardWrap });
      checkpointWave();
      if (settleWave()) { stopLoop(); return; }
      if ((state.combatClockMs || 0) - lastPersistMs >= PERSIST_THROTTLE_MS) { lastPersistMs = state.combatClockMs; controller.persist?.(); }
      paintCombatFrame();
    };
    frameLoop = createFrameLoop({ onFrame: stepFn }); // fps 30 default, pauses while hidden
    frameLoop.start();
  }
  function stopLoop() { if (frameLoop) { frameLoop.stop(); frameLoop = null; } }

  // Per-frame paint split (CPU budget, 2026-07-12): inside the frame loop only the BOARD is redrawn
  // each frame; the panels (shop/roster/ticker/buttons/hint) rerun the full repaint() only when a
  // cheap signature of their mid-wave-mutable inputs changes (kills granting cycles, integrity hits,
  // tower count, log lines, wave peak/active). Event-driven call sites keep calling repaint() directly.
  let paintSig = null;
  function paintCombatFrame() {
    const sig = `${state.cycles}|${state.integrity}|${state.towers.length}|${(state.log || []).length}|${state.wavePeak}|${state.waveActive}`;
    if (sig !== paintSig) { paintSig = sig; repaint(); return; }
    paintBoard();
    syncPopover();
  }

  function settleWave() {
    if (state.waveFailed) {
      stopLoop(); pushLog(state, 'integrity collapsed — the bastion folds.'); endWaveSnapshot();
      controller.onWaveFailed?.(); repaint(); controller.persist?.(); return true;
    }
    if (waveComplete(state)) {
      const cleared = creditWaves();
      endWaveSnapshot(); controller.persist?.();
      if (cleared) { stopLoop(); controller.rerender(); return true; }
      maybeReshape();
      lastHits = null;
      lastFired = null;
      repaint();
      return true;
    }
    return false;
  }

  function creditWaves() {
    const target = Math.max(state.wavePeak || state.waveNumber, state.waveNumber);
    let cleared = false;
    while ((state.waveNumber || 1) <= target && !cleared) {
      const r = controller.recordWaveCleared();
      if (r.mapCleared) cleared = true;
    }
    if (!cleared) state.wavePeak = state.waveNumber;
    return cleared;
  }

  // ── boss ─────────────────────────────────────────────────────────────────
  function confront() {
    if (!isBoss) return null;
    const result = fightInfiniteLoop({ state, actions: controller.actions });
    if (result.defeated) { controller.onBossWin(); return result; }
    repaint(); controller.persist?.();
    return result;
  }

  // ── placement / selection ──────────────────────────────────────────────────
  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint(); controller.persist?.();
    return r;
  }
  function cycleTarget(id) { const m = cycleTowerTarget(state, id); repaint(); controller.persist?.(); return m; }
  function upgrade(id) { const r = upgradeTower(state, id); repaint(); controller.persist?.(); return r; }
  function sell(id) { const r = sellTower(state, id); if (selectedTowerId === id) { selectedTowerId = null; closeTowerPopover(); } repaint(); controller.persist?.(); return r; }
  function pickFork(id, forkId) { const r = chooseFork(state, id, forkId); repaint(); controller.persist?.(); return r; }
  function setWave(n) { state.waveNumber = Math.max(1, Math.trunc(n) || 1); state.wavePeak = state.waveNumber; repaint(); }

  // Pointer placement: desktop click places immediately on a valid cell; touch previews first, then a
  // second tap on the SAME cell confirms. Placing on a placed tower selects it (opens the popover).
  function boardTap(event, cell) {
    const onTower = (state.towers || []).find((t) => t.x === cell.x && t.y === cell.y);
    if (onTower) {
      selected = null; pendingCell = null; hoverCell = null; selectedTowerId = onTower.id;
      openTowerPopover({ root: boardWrap, anchor: pointerAnchor(event), state, tower: onTower, disclosed, onClose: () => { selectedTowerId = null; paintBoard(); } });
      repaint(); return;
    }
    selectedTowerId = null; closeTowerPopover();
    if (!selected) { hoverCell = cell; paintBoard(); return; }
    const pv = placementPreview(state, path.tiles, selected, cell);
    if (touchMode && (!pendingCell || pendingCell.x !== cell.x || pendingCell.y !== cell.y)) {
      pendingCell = cell; hoverCell = cell; paintBoard(); return; // first tap → preview
    }
    pendingCell = null;
    if (!pv.valid) { hoverCell = cell; paintBoard(); return; }
    place(cell.x, cell.y);
  }

  function pointerAnchor(event) {
    const r = board.getBoundingClientRect();
    return { left: event?.clientX ?? r.left, bottom: event?.clientY ?? r.top, top: event?.clientY ?? r.top };
  }

  // ── events ───────────────────────────────────────────────────────────────
  root.addEventListener('pointerdown', (event) => { touchMode = event.pointerType === 'touch'; }, true);
  root.addEventListener('click', (event) => {
    const upBtn = event.target.closest('button[data-upgrade-id]');
    if (upBtn) { upgrade(upBtn.dataset.upgradeId); return; }
    const sellBtn = event.target.closest('button[data-sell-id]');
    if (sellBtn) { sell(sellBtn.dataset.sellId); return; }
    const forkBtn = event.target.closest('button[data-fork-id]');
    if (forkBtn) { pickFork(forkBtn.dataset.forkId, forkBtn.dataset.forkChoice); return; }
    const rosterBtn = event.target.closest('button[data-tower-id]');
    if (rosterBtn) { cycleTarget(rosterBtn.dataset.towerId); return; }
    const towerBtn = event.target.closest('button[data-tower]');
    if (towerBtn) { selected = selected === towerBtn.dataset.tower ? null : towerBtn.dataset.tower; selectedTowerId = null; pendingCell = null; closeTowerPopover(); repaint(); return; }
    if (event.target.closest('.s4-ticker')) { fields.logfull.hidden = !fields.logfull.hidden; repaint(); return; }
    const cell = boardCell(event);
    if (cell) { boardTap(event, cell); return; }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    switch (button.dataset.action) {
      case 'start-wave': startWaveAction(); break;
      case 'call-early': callEarly(); break;
      case 'speed': setSpeed(); break;
      case 'confront': confront(); break;
      case 'leave': stopLoop(); closeTowerPopover(); controller.leaveCombat?.(); break;
      case 'blueprint': controller.openBlueprint?.(); break;
      default: break;
    }
  });

  // Desktop hover preview (placement mode only) — no state mutation, just the overlay.
  board.addEventListener('mousemove', (event) => {
    if (touchMode || !selected || selectedTowerId) return;
    const cell = boardCell(event);
    if (cell && (!hoverCell || hoverCell.x !== cell.x || hoverCell.y !== cell.y)) { hoverCell = cell; paintBoard(); }
  });
  board.addEventListener('mouseleave', () => { if (hoverCell) { hoverCell = null; paintBoard(); } });

  // Map a pointer event to a board cell via a Range over the RENDERED text (scroll/transform-safe).
  function boardCell(event) {
    if (!event.target.closest('.s4-board')) return null;
    const lines = boardText(state, path.tiles).split('\n');
    const cols = (lines[0] || '').length || 40;
    const rows = lines.length || 40;
    const range = document.createRange();
    range.selectNodeContents(board);
    const textRect = range.getBoundingClientRect();
    return cellFromTextRect({ clientX: event.clientX, clientY: event.clientY, textRect, cols, rows });
  }

  if (!isBoss && state.waveActive && (state.waveNumber || 1) <= map.waveCount) runLoop();

  repaint();
  return {
    repaint,
    destroy() { alive = false; stopLoop(); closeTowerPopover(); boardFit.destroy(); root.remove(); },
    hook: {
      advance(ms = 30000, dt = 100) {
        let t = 0;
        while (t < ms && state.waveActive) { tick(state, dt * speed, path.tiles); lastHits = fx.observe(state).hitCells; checkpointWave(); if (settleWave()) break; t += dt; }
        if (alive) repaint();
      },
      startWave: startWaveAction, callEarly, setSpeed, place, cycleTarget, upgrade, sell, pickFork, setWave, confront,
      reshape: maybeReshape, pathInfo: () => ({ depth: pathDepth, tiles: path.tiles }),
    },
  };
}
