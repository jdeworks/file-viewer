import { getBossLockState, raceTheJammer } from './boss.js';
import { createGameLoop } from './game-loop.js';
import { createEngine } from './engine.js';
import { createCanvasRace } from './canvas-race.js';
import { ROUNDS, roundByIdx, isBossRound, FINAL_ROUND_ID } from './rounds.js';
import { buyUpgrade, applyUpgrades } from './shop.js';
import { estimateRoundPackets } from './economy.js';
import { roundLogLine, roundIntro } from './content.js';
import { calibrationProgressStr } from './calibration.js';
import { BTS_PATH, TRANSMISSION_HUM_PATH } from './messages.js';
import { createAscension } from '../../shared/ascension.js';
import { createRun } from '../../shared/run-state.js';
import { ASCENSION_MODS, BASE_ASCENSION_CONFIG } from './ascension-mods.js';
import { ascensionPanelEls, roundEstEl } from './panels.js';
import { installDebugHook } from './debug-hook.js';
import { applyDev } from './s5dev.js';
import { createSteer } from './steer.js';
import { disclosure } from './disclosure.js';
import { pitStopOffer } from './pitstop.js';
import { buildResultOverlay } from './overlay.js';
import { createRaceFx } from './race-fx.js';

const BOSS_IDX = ROUNDS.length - 1;
const CK_SCHEMA = 2; // resume-checkpoint schema tag: bumped for the 2.5D canvas rebuild so pre-rebuild
                     // (ASCII-era) checkpoints are rejected cleanly instead of desyncing on resume.

export function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete, orchestrator } = ctx;
  const ascension = createAscension({ save: orchestrator?.save || null, stageId: 5, modifiers: ASCENSION_MODS });
  const ascensionMods = () => ascension.applyModifiers(BASE_ASCENSION_CONFIG, ascension.level());
  const raceRun = createRun({ save: orchestrator?.save || null, stageId: 5, slot: 'race', debounceMs: 400 });
  const root = document.createElement('section');
  root.className = 'stage5-signal-racer';
  root.tabIndex = 0;
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span>ROUND <b data-field="round"></b></span>
      <span data-field="raceBox">RACE <b data-field="race"></b></span>
      <span data-field="posBox">POS <b data-field="position"></b></span>
      <span data-field="integrityBox">INTEGRITY <b data-field="integrity"></b></span>
      <span data-field="packetsBox">PACKETS <b data-field="packets"></b></span>
      <span data-field="calibBox">CALIBRATION <b data-field="calib"></b></span>
      <div class="s5-progress" data-field="progressBox"><i class="s5-progress-fill" data-field="progressFill"></i></div>
    </header>
    <div class="s5-layout">
      <div class="s5-track-col" data-field="trackCol">
        <div class="s5-jammer" data-field="jammer" hidden></div>
        <div class="s5-track-stage" data-field="stage"></div>
      </div>
      <aside class="s5-side">
        <div class="s5-primary" data-field="primary"></div>
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-ascension" data-field="ascension"></div>
      </aside>
    </div>
    <section class="s5-boss-panel" data-field="bossPanel">
      <strong>THE JAMMER</strong>
      <div data-field="bossState"></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <div class="s5-boss-chip" data-field="bossChip"></div>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="resume" hidden>resume race</button>
      <button type="button" data-action="audio" hidden>open transmission_hum.mp3</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
    <div class="s5-overlay" data-field="overlay"></div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s5-log');
  const completeOnce = once((result) => onStageComplete?.(result));

  let loop = null;
  let engine = null;
  let mode = 'select'; // 'select' | 'playing' | 'result'
  let resultCtx = null; // { roundIdx, summary, canRetry, resolved, note } while the result card is up

  // The 2.5D canvas racer. renderPrev/renderCur are the two most recent per-tick paint snapshots; the
  // engine's onRender interpolates between them each frame (see startRound). autoSolving suppresses the
  // per-tick HUD churn + canvas draws while the debug hook fast-forwards a whole round synchronously.
  const canvasRace = createCanvasRace(state.calibration.seed);
  fields.stage.append(canvasRace.el);
  let renderPrev = null;
  let renderCur = null;
  let autoSolving = false;

  // Touch steering docked DIRECTLY under the road (#2): the pad lives inside the track column so the
  // road and its controls always share the viewport. Same loop.handleKey() seam the arrow keys use.
  const steer = createSteer({ getMode: () => mode, getLoop: () => loop });
  fields.trackCol.append(steer.el);

  const fx = createRaceFx({ trackCol: fields.trackCol });

  function calibrated() { return getBossLockState({ actions, state }).unlocked; }
  function unlockedRounds() { return Math.min(BOSS_IDX, Number(state.run.clearedRounds || 0)); }

  function pendingResume() {
    const ck = raceRun.restore();
    if (!ck || typeof ck.lanes !== 'string' || !ck.lanes.length) return null;
    if (ck.schema !== CK_SCHEMA) return null; // reject pre-rebuild (ASCII-era) checkpoints cleanly
    if (ck.ascLevel !== ascension.level() || ck.seed !== state.calibration.seed) return null;
    const idx = Number(ck.roundIdx);
    if (!(idx >= 0) || idx > unlockedRounds() || isBossRound(idx)) return null;
    return { ...ck, roundIdx: idx };
  }

  function startRound(idx, opts = {}) {
    if (mode === 'playing') return;
    const roundIdx = Math.max(0, Math.min(BOSS_IDX, Number(idx) || 0));
    if (roundIdx > unlockedRounds()) return;                 // gated: clear the prior rounds first
    if (isBossRound(roundIdx) && state.run.clearedRounds < BOSS_IDX) return; // boss only after the run
    resultCtx = null; renderOverlay(); // starting a round clears any lingering result card (hook path too)
    const round = roundByIdx(roundIdx);
    const prevGhost = state.timeTrial?.[round.id] || null;
    pushLog(roundIntro(roundIdx));
    fx.reset();
    renderPrev = null;
    renderCur = null;
    canvasRace.setSeed(`${state.calibration.seed}:${round.id}`); // a distinct road per round
    loop = createGameLoop({
      state, seed: state.calibration.seed, roundIdx, calibrated: calibrated(),
      prevGhost, mods: ascensionMods(), resume: opts.resume || null,
      onPaint: paintArena,
      onEnd: handleEnd,
    });
    mode = 'playing';
    // Two cadences: onTick advances the LOGIC and rolls the snapshot pair; onRender draws the canvas
    // every capped frame, interpolating the sub-tick motion between the two snapshots (see engine.js).
    engine = createEngine({
      onTick: () => { renderPrev = renderCur; loop.step(); },
      onRender: (alpha) => { if (!autoSolving && mode === 'playing') canvasRace.renderFrame(renderPrev, renderCur, alpha); },
      getTickMs: () => loop.round.tickMs,
    });
    engine.start();
    canvasRace.resize();
    loop.paint();
    repaint();
  }

  function checkpointRace(view) {
    if (!loop || (view.tick % 24 !== 0)) return;
    raceRun.checkpoint({ ...loop.path(), schema: CK_SCHEMA, ascLevel: ascension.level(), seed: state.calibration.seed });
  }

  function handleEnd({ result, round, roundIdx, packets, medal, finishTick, parTick, ghostRecording, position, fieldSize }) {
    engine?.stop();
    engine = null;
    mode = 'result';
    raceRun.reset();
    const boss = isBossRound(roundIdx);
    if (result === 'clear') {
      const medalNote = medal ? ` [${medal} · ${finishTick} vs par ${parTick}]` : '';
      pushLog(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : '') + medalNote);
      if (ghostRecording) {
        const prev = state.timeTrial?.[round.id] || null;
        if (!prev || Number(ghostRecording.tick) < Number(prev.tick)) {
          state.timeTrial = { ...(state.timeTrial || {}), [round.id]: ghostRecording };
        }
      }
      if (!boss) {
        state.run.clearedRounds = Math.max(Number(state.run.clearedRounds || 0), roundIdx + 1);
      } else {
        const r = raceTheJammer({ state, actions });
        if (r.defeated) {
          ascension.recordClear(ascension.level());
          completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
        }
      }
    } else if (round.id === FINAL_ROUND_ID) {
      pushLog('the jammer held the throttle down. the counter-wave is not calibrated.');
    } else if (round.archetype === 'time-trial') {
      pushLog('the par ghost had the channel — run faster next time.');
    } else {
      pushLog('signal integrity collapsed. recalibrate and run it again.');
    }
    if (!boss) showResult({ result, round, roundIdx, packets, medal, finishTick, parTick, position, fieldSize });
    persistAndPaint();
  }

  // Build the podium/result card context (a body round only — the boss ends the stage).
  function showResult(info) {
    const { result, round, roundIdx, packets, medal, finishTick, parTick, position, fieldSize } = info;
    let title; let detail; const clear = result === 'clear';
    if (clear) {
      title = fieldSize > 1 ? `FINISH — P${position}/${fieldSize}` : 'ROUND CLEAR';
      detail = `+${packets} packets` + (medal ? ` · ${medal} (${finishTick} vs par ${parTick})` : '');
    } else if (round.archetype === 'time-trial') {
      title = 'MISSED PAR'; detail = 'beat the clock next time — survival alone is not a clear.';
    } else {
      title = 'SIGNAL LOST'; detail = 'integrity collapsed — take the offer and run it again.';
    }
    resultCtx = { roundIdx, resolved: false, note: '',
      summary: { title, detail, continueLabel: clear ? 'continue' : 'back to rounds' },
      canRetry: true };
    renderOverlay();
  }

  function renderOverlay() {
    fields.overlay.replaceChildren();
    root.classList.toggle('s5-has-overlay', Boolean(resultCtx));
    if (!resultCtx) return;
    const offers = resultCtx.resolved
      ? []
      : pitStopOffer({ seed: state.calibration.seed, roundIdx: resultCtx.roundIdx, shop: state.shop || {} });
    fields.overlay.append(buildResultOverlay({
      summary: resultCtx.summary, offers, shop: state.shop || {}, packets: state.packets,
      canRetry: resultCtx.canRetry, resolvedNote: resultCtx.note,
    }));
  }

  // Per-TICK paint: roll the snapshot pair the canvas interpolates between, then refresh the DOM HUD.
  // The canvas itself is drawn per FRAME by the engine's onRender, not here. During a synchronous
  // autoSolve burst (debug hook) we skip everything but the snapshot roll — no HUD/checkpoint churn.
  function paintArena(view) {
    renderCur = view;
    if (renderPrev === null) renderPrev = view;
    if (autoSolving) return;
    checkpointRace(view);
    paintJammer(view);
    fx.onPaint(view);
    updateHud(view);
  }

  function updateHud(view) {
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
    const pct = Math.round((view.progress || 0) * 100);
    fields.progressFill.style.width = `${pct}%`;
    const fork = view.hasFork ? ` · ${view.channel === 'hi' ? 'HI' : 'LO'}${view.inFork ? '◆' : ''}` : '';
    fields.race.textContent = view.archetype === 'circuit'
      ? `${view.archetype} · lap ${view.lap}/${view.laps}${fork}`
      : `${view.archetype} · ${pct}%${fork}`;
    fields.position.textContent = view.fieldSize > 1 ? `${view.position}/${view.fieldSize}` : '—';
  }

  // Boss pursuit (#4): a jammer chip rides above the road and closes as the race progresses; the boss
  // edge-static itself is drawn on the canvas from view.suppressionActive. Presentation only.
  function paintJammer(view) {
    const boss = view.archetype === 'boss';
    fields.jammer.hidden = !boss;
    if (!boss) return;
    const closing = Math.max(0, Math.min(1, view.progress || 0));
    fields.jammer.style.setProperty('--s5-close', String(closing));
    fields.jammer.textContent = `⟪ THE JAMMER ${'▓'.repeat(2 + Math.round(closing * 6))} ⟫`;
  }

  function repaint() {
    const disc = disclosure(state);
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    const r = roundByIdx(idx);
    const playing = mode === 'playing';
    root.classList.toggle('s5-mode-playing', playing);
    root.classList.toggle('s5-mode-result', mode === 'result');
    root.classList.toggle('s5-mode-select', mode === 'select');

    fields.round.textContent = `${r.id}/${FINAL_ROUND_ID} ${r.label}`;
    fields.raceBox.hidden = !playing;                 // HUD reduces to ROUND·POS·INTEGRITY·progress (#1)
    fields.posBox.hidden = !playing;
    fields.progressBox.hidden = !playing;
    fields.packetsBox.hidden = playing;
    fields.calibBox.hidden = playing || !disc.showCalibration;
    steer.el.hidden = !playing;

    if (!playing) {
      // SELECT/RESULT: a single static attract frame of the empty road instead of an empty void (#6/M3).
      canvasRace.setSeed(`${state.calibration.seed}:${r.id}`);
      canvasRace.resize();
      canvasRace.drawAttract(state.run.lane);
      fields.jammer.hidden = true;
      fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
      fields.race.textContent = r.archetype || 'sprint';
      fields.position.textContent = '—';
    }
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? 'LOCKED-IN' : calibrationProgressStr(state);

    // Boss presence is earned (R6): a one-line locked chip until round 6 is cleared, full panel after.
    fields.bossPanel.hidden = !disc.bossFull;
    fields.bossChip.hidden = disc.bossFull || playing;
    fields.bossChip.textContent = state.boss.defeated ? 'THE JAMMER — defeated' : 'THE JAMMER — locked (clear round 6 to reveal)';
    fields.bossState.textContent = state.boss.defeated
      ? 'defeated. BTS trace available.'
      : `${lock.jammerSuppression} / ${lock.unlocked ? 'beatable' : 'suppression dominant'}`;
    fields.hint.textContent = lock.hint;

    renderPrimary(disc);
    renderRoundButtons(disc);
    renderAscension();

    const controls = root.querySelector('.s5-controls');
    controls.hidden = playing || disc.attract;
    root.querySelector('[data-action="audio"]').hidden = !disc.showCalibration; // un-cheat surfaced with the boss
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    const resumeBtn = root.querySelector('[data-action="resume"]');
    const ck = playing ? null : pendingResume();
    resumeBtn.hidden = !ck;
    if (ck) resumeBtn.textContent = `resume race (round ${roundByIdx(ck.roundIdx).id}, lap-saved)`;

    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
  }

  // The single primary START button on the fresh screen (M3): one obvious click into round 1.
  function renderPrimary(disc) {
    if (disc.showRoundList) { fields.primary.replaceChildren(); return; }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.startRound = '0';
    btn.className = 's5-primary-btn';
    btn.disabled = mode === 'playing';
    btn.textContent = `START ROUND 1 — ${roundByIdx(0).label}`;
    fields.primary.replaceChildren(btn);
  }

  function renderRoundButtons(disc) {
    if (!disc.showRoundList) { fields.rounds.replaceChildren(); return; }
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    const tuning = applyUpgrades(state.shop || {});
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX : i > unlocked;
      btn.disabled = locked || mode === 'playing';
      const label = `${round.id}. ${round.label}${i < cleared ? ' ✓' : ''}${locked ? ' 🔒' : ''}`;
      if (disc.showEstimates && !locked) {
        const { low, high } = estimateRoundPackets(round, tuning);
        btn.append(label, roundEstEl(low, high));
      } else {
        btn.append(label);
      }
      if (boss) btn.classList.add('s5-boss-btn');
      return btn;
    }));
  }

  function renderAscension() {
    fields.ascension.replaceChildren(...ascensionPanelEls({
      ascension, defeated: state.boss.defeated, playing: mode === 'playing', mods: ASCENSION_MODS,
    }));
  }

  root.addEventListener('click', (event) => {
    const startBtn = event.target.closest('button[data-start-round]');
    if (startBtn) { startRound(Number(startBtn.dataset.startRound)); return; }
    const pitBtn = event.target.closest('button[data-pit]');
    if (pitBtn && resultCtx) {
      const res = buyUpgrade(state, pitBtn.dataset.pit);
      resultCtx.resolved = true;
      resultCtx.note = res.bought ? `upgraded ${pitBtn.dataset.pit.toUpperCase()} (−${res.cost}p)` : 'could not upgrade';
      save?.(); renderOverlay(); repaint(); return;
    }
    if (event.target.closest('button[data-pit-skip]') && resultCtx) {
      resultCtx.resolved = true; resultCtx.note = 'pit skipped'; renderOverlay(); return;
    }
    const overlayBtn = event.target.closest('button[data-overlay]');
    if (overlayBtn && resultCtx) {
      const idx = resultCtx.roundIdx;
      if (overlayBtn.dataset.overlay === 'retry') { resultCtx = null; renderOverlay(); startRound(idx); return; }
      resultCtx = null; mode = 'select'; renderOverlay(); persistAndPaint(); return;
    }
    const ascBtn = event.target.closest('button[data-ascend]');
    if (ascBtn) { ascension.setLevel(Number(ascBtn.dataset.ascend)); persistAndPaint(); return; }
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    if (action.dataset.action === 'resume') {
      const ck = pendingResume();
      if (ck) { startRound(ck.roundIdx, { resume: ck }); return; }
    }
    if (action.dataset.action === 'audio') {
      viewer?.openFile?.(TRANSMISSION_HUM_PATH, { mime: 'audio/mpeg', source: 'stage5' });
    }
    if (action.dataset.action === 'bts') bts?.open?.(5);
    persistAndPaint();
  });

  // Tap the left/right half of the road itself = lane switch (#2) — a bigger target than the pad.
  canvasRace.el.addEventListener('click', (event) => {
    if (mode !== 'playing' || !loop) return;
    const rect = canvasRace.el.getBoundingClientRect();
    loop.handleKey((event.clientX - rect.left) < rect.width / 2 ? 'ArrowLeft' : 'ArrowRight');
  });

  const onKey = (event) => {
    if (mode !== 'playing' || !loop) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      loop.handleKey(event.key);
    }
  };
  root.addEventListener('keydown', onKey);

  repaint();

  installDebugHook({
    state, startRound, getLoop: () => loop, getMode: () => mode, bossIdx: BOSS_IDX,
    actions, achievements, bell, persistAndPaint, calibrated, ascension, ascensionMods, raceRun,
    dismissResult: () => { resultCtx = null; renderOverlay(); repaint(); },
    // Run a synchronous full-round solve with per-frame canvas draws + per-tick HUD churn suppressed
    // (the round completes in one burst; drawing each intermediate frame would be pure waste).
    solve: (fn) => { autoSolving = true; try { return fn(); } finally { autoSolving = false; } },
  });

  function dev(id) { if (applyDev(id, state, actions)) persistAndPaint(); }

  return {
    repaint,
    dev,
    destroy() {
      engine?.stop();
      raceRun.destroy();
      steer.destroy();
      canvasRace.destroy();
      if (window.__fvStage5) delete window.__fvStage5;
      root.removeEventListener('keydown', onKey);
      root.remove();
    },
  };

  function pushLog(line) {
    state.log = [...(state.log || []), line].slice(-8);
  }

  function persistAndPaint() {
    save?.();
    repaint();
  }
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
