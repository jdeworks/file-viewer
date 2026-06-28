import { getBossLockState, raceTheJammer } from './boss.js';
import { createGameLoop } from './game-loop.js';
import { createEngine } from './engine.js';
import { renderTrackGrid } from './render-track.js';
import { ROUNDS, roundByIdx, isBossRound, FINAL_ROUND_ID } from './rounds.js';
import { buyUpgrade, applyUpgrades } from './shop.js';
import { estimateRoundPackets } from './economy.js';
import { roundLogLine, roundIntro, GLYPH_LEGEND } from './content.js';
import { calibrationProgressStr } from './calibration.js';
import { BTS_PATH, TRANSMISSION_HUM_PATH } from './messages.js';
import { createAscension } from '../../shared/ascension.js';
import { createRun } from '../../shared/run-state.js';
import { ASCENSION_MODS, BASE_ASCENSION_CONFIG } from './ascension-mods.js';
import { shopButtonEls, ascensionPanelEls, roundEstEl } from './panels.js';
import { installDebugHook } from './debug-hook.js';

const BOSS_IDX = ROUNDS.length - 1;

export function renderStage5(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete, orchestrator } = ctx;
  // Opt-in difficulty ladder (shared). Per-stage selection lives in state.ascension; cleared
  // high-water + the cross-stage summary live in orchestrator.save.global. Degrades to base if the
  // full save isn't threaded (e.g. a bare unit harness).
  const ascension = createAscension({ save: orchestrator?.save || null, stageId: 5, modifiers: ASCENSION_MODS });
  const ascensionMods = () => ascension.applyModifiers(BASE_ASCENSION_CONFIG, ascension.level());
  // Resumable race (shared run-state): the live input transcript checkpoints to the 'race' slot so a
  // reload can replay back to the same lap; reset when a round ends.
  const raceRun = createRun({ save: orchestrator?.save || null, stageId: 5, slot: 'race', debounceMs: 400 });
  const root = document.createElement('section');
  root.className = 'stage5-signal-racer';
  root.tabIndex = 0;
  root.innerHTML = `
    <header class="s5-hud">
      <strong>SIGNAL RACER</strong>
      <span>ROUND <span data-field="round"></span></span>
      <span data-field="raceBox">RACE <span data-field="race"></span></span>
      <span data-field="posBox">POS <span data-field="position"></span></span>
      <span>INTEGRITY <span data-field="integrity"></span></span>
      <span>PACKETS <span data-field="packets"></span></span>
      <span>CALIBRATION <span data-field="calib"></span></span>
    </header>
    <div class="s5-layout">
      <pre class="s5-track-grid" data-field="arena" aria-label="signal racer track"></pre>
      <aside class="s5-side">
        <div class="s5-rounds" data-field="rounds"></div>
        <div class="s5-shop" data-field="shop"></div>
        <div class="s5-ascension" data-field="ascension"></div>
        <pre class="s5-legend" data-field="legend"></pre>
      </aside>
    </div>
    <section class="s5-boss-panel">
      <strong>THE JAMMER</strong>
      <div data-field="bossState"></div>
      <div class="s5-hint" data-field="hint"></div>
    </section>
    <ol class="s5-log"></ol>
    <div class="s5-controls">
      <button type="button" data-action="resume" hidden>resume race</button>
      <button type="button" data-action="audio">open transmission_hum.mp3</button>
      <button type="button" data-action="bts" hidden>open signal_racer.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const log = root.querySelector('.s5-log');
  const completeOnce = once((result) => onStageComplete?.(result));

  let loop = null;
  let engine = null;
  let mode = 'select'; // 'select' | 'playing' | 'result'

  fields.legend.textContent = GLYPH_LEGEND.map(([g, t]) => `${g}  ${t}`).join('\n');

  function calibrated() {
    return getBossLockState({ actions, state }).unlocked;
  }

  function unlockedRounds() {
    return Math.min(BOSS_IDX, Number(state.run.clearedRounds || 0));
  }

  // A resume checkpoint for the current ascension/seed, or null (only a startable body round).
  function pendingResume() {
    const ck = raceRun.restore();
    if (!ck || typeof ck.lanes !== 'string' || !ck.lanes.length) return null;
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
    const round = roundByIdx(roundIdx);
    const prevGhost = state.timeTrial?.[round.id] || null;
    pushLog(roundIntro(roundIdx)); // one-line mechanic intro so a new verb isn't met cold
    loop = createGameLoop({
      state, seed: state.calibration.seed, roundIdx, calibrated: calibrated(),
      prevGhost, mods: ascensionMods(), resume: opts.resume || null,
      onPaint: paintArena,
      onEnd: handleEnd,
    });
    mode = 'playing';
    engine = createEngine({ onTick: () => loop.step(), getTickMs: () => loop.round.tickMs });
    engine.start();
    loop.paint();
    repaint();
  }

  function checkpointRace(view) {
    if (!loop || (view.tick % 24 !== 0)) return; // checkpoint the input transcript every few ticks
    raceRun.checkpoint({ ...loop.path(), ascLevel: ascension.level(), seed: state.calibration.seed });
  }

  function handleEnd({ result, round, roundIdx, packets, medal, finishTick, parTick, ghostRecording }) {
    engine?.stop();
    engine = null;
    mode = 'result';
    raceRun.reset(); // round over — clear the resume checkpoint
    if (result === 'clear') {
      const medalNote = medal ? ` [${medal} · ${finishTick} vs par ${parTick}]` : '';
      pushLog(roundLogLine(roundIdx) + (packets ? ` (+${packets} packets)` : '') + medalNote);
      if (ghostRecording) { // bank a time-trial run as the next replay ghost if it beats the best
        const prev = state.timeTrial?.[round.id] || null;
        if (!prev || Number(ghostRecording.tick) < Number(prev.tick)) {
          state.timeTrial = { ...(state.timeTrial || {}), [round.id]: ghostRecording };
        }
      }
      if (!isBossRound(roundIdx)) {
        state.run.clearedRounds = Math.max(Number(state.run.clearedRounds || 0), roundIdx + 1);
      } else {
        const r = raceTheJammer({ state, actions });
        if (r.defeated) {
          ascension.recordClear(ascension.level()); // bank the stage clear at this ascension level
          completeOnce({ stage: 5, defeated: true, btsPath: BTS_PATH });
        }
      }
    } else if (round.id === FINAL_ROUND_ID) {
      pushLog('the jammer held the throttle down. the counter-wave is not calibrated.');
    } else if (round.archetype === 'time-trial') {
      // The player survived to the finish but missed par — integrity was fine, the clock wasn't.
      pushLog('the par ghost had the channel — run faster next time.');
    } else {
      pushLog('signal integrity collapsed. recalibrate and run it again.');
    }
    persistAndPaint();
  }

  function paintArena(view) {
    checkpointRace(view);
    fields.arena.textContent = renderTrackGrid({
      table: view.table, tick: view.tick, lane: view.lane, lookAhead: view.lookAhead,
      wrap: view.archetype === 'circuit', rivals: view.rivals || [], channel: view.channel || 'lo',
    });
    // Beat-pulse: glow the arena while the beat window is open (state-driven, pure presentation).
    fields.arena.classList.toggle('s5-beat-open', Boolean(view.beatOpen));
    fields.integrity.textContent = `${Math.round(view.integrity)}%`;
    const pct = Math.round((view.progress || 0) * 100);
    const fork = view.hasFork ? ` · ${view.channel === 'hi' ? 'HI' : 'LO'}${view.inFork ? '◆' : ''}` : '';
    fields.race.textContent = view.archetype === 'circuit'
      ? `${view.archetype} · lap ${view.lap}/${view.laps}${fork}`
      : `${view.archetype} · ${pct}%${fork}`;
    fields.position.textContent = view.fieldSize > 1 ? `${view.position}/${view.fieldSize}` : '—';
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    const idx = Number(state.run.roundIdx || 0);
    const r = roundByIdx(idx);
    fields.round.textContent = `${r.id}/${FINAL_ROUND_ID} ${r.label}`;
    const playing = mode === 'playing';
    fields.raceBox.hidden = !playing;   // no live race in select/result mode — hide the race/pos chips
    fields.posBox.hidden = !playing;
    if (!playing) {
      fields.integrity.textContent = `${Math.round(state.run.integrity)}%`;
      fields.race.textContent = r.archetype || 'sprint';
      fields.position.textContent = '—';
      fields.arena.classList.remove('s5-beat-open'); // stop the beat glow once the round is over
    }
    fields.packets.textContent = String(state.packets);
    fields.calib.textContent = lock.unlocked ? 'LOCKED-IN' : calibrationProgressStr(state);
    fields.bossState.textContent = state.boss.defeated
      ? 'defeated. BTS trace available.'
      : `${lock.jammerSuppression} / ${lock.unlocked ? 'beatable' : 'suppression dominant'}`;
    fields.hint.textContent = lock.hint;
    renderRoundButtons();
    renderShop();
    renderAscension();
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    const resumeBtn = root.querySelector('[data-action="resume"]');
    const ck = mode === 'playing' ? null : pendingResume();
    resumeBtn.hidden = !ck;
    if (ck) resumeBtn.textContent = `resume race (round ${roundByIdx(ck.roundIdx).id}, lap-saved)`;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
  }

  function renderRoundButtons() {
    const unlocked = unlockedRounds();
    const cleared = Number(state.run.clearedRounds || 0);
    const tuning = applyUpgrades(state.shop || {}); // estimate band reflects the player's upgrades
    fields.rounds.replaceChildren(...ROUNDS.map((round, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.startRound = String(i);
      const boss = isBossRound(i);
      const locked = boss ? cleared < BOSS_IDX : i > unlocked;
      btn.disabled = locked || mode === 'playing';
      const { low, high } = estimateRoundPackets(round, tuning);
      btn.append(`${round.id}. ${round.label}${i < cleared ? ' ✓' : ''}${locked ? ' 🔒' : ''}`,
        roundEstEl(low, high));
      if (boss) btn.classList.add('s5-boss-btn');
      return btn;
    }));
  }

  function renderShop() {
    fields.shop.replaceChildren(...shopButtonEls({ shop: state.shop || {}, packets: state.packets, playing: mode === 'playing' }));
  }

  // Ascension ladder — opt-in replay depth, only once the stage has been beaten at least once.
  function renderAscension() {
    fields.ascension.replaceChildren(...ascensionPanelEls({
      ascension, defeated: state.boss.defeated, playing: mode === 'playing', mods: ASCENSION_MODS,
    }));
  }

  root.addEventListener('click', (event) => {
    const startBtn = event.target.closest('button[data-start-round]');
    if (startBtn) { startRound(Number(startBtn.dataset.startRound)); return; }
    const buyBtn = event.target.closest('button[data-buy]');
    if (buyBtn) { buyUpgrade(state, buyBtn.dataset.buy); persistAndPaint(); return; }
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
  });

  return {
    repaint,
    destroy() {
      engine?.stop();
      raceRun.destroy(); // flush + detach listeners
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
