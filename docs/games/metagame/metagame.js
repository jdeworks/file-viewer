// The meta-game orchestrator. A staged incremental: per stage you GRIND bits (click + automation)
// toward a goal, then face a unique BOSS that cheats and is beaten only with one of the app's real
// features. Phases: intro → grind → boss → victory → (next stage). Stage/boss content lives in
// stages.js; the dialog/hint box in dialog.js. Contract: mount(host, { onExit }) => { destroy() }.
import { playDialog } from './dialog.js';
import { STAGES, stageByNumber } from './stages.js';
import { renderStage1, mountBell, bellLoad, updateBellDot, checkMessages, removeStageMsgs } from './stage1.js';
import { MESSAGES1 } from './messages1.js';

const SAVE_KEY = 'fv:games:metagame';
const COMPLETE_KEY = 'fv:games:metagame:complete';

function fmt(n) {
  if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace(/\.0$/, '');
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  let u = -1, v = n;
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return v.toFixed(2) + units[u];
}
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } };
const save = (st) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch { /* private mode */ } };
// Arcade minigames feed a CROSS-STAGE bonus: each game's high score is claimable (the new points
// since last claim) as a one-off boost to the CURRENT stage's resource. Works in every stage.
const SCORE_GAMES = [{ id: 'snake', name: 'Snake' }, { id: '2048', name: '2048' }];
const BONUS_PER_POINT = 25;
const gameHigh = (id) => { try { return Number(localStorage.getItem('fv:games:hi:' + id) || 0); } catch { return 0; } };

// Pixel canvas: bits become green pixels filling from the bottom (the canvas IS the progress bar);
// owned machines are drawn as little sprites along the top. Buying spends bits → fewer raw pixels.
const COLS = 48, ROWS = 16, CELL = 5, CAP = COLS * ROWS;
const ASCII_GLYPHS = '01<>{}[]/\\|=+*';
function drawCanvas(canvas, bits, owned, tiers, color, theme) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const n = Math.min(Math.floor(bits), CAP);
  // ASCII theme (stage 3+): the same economy drawn as glyphs, not pixels — proves a stage can
  // change the whole VISUAL by config alone.
  if (theme === 'ascii') {
    ctx.font = (CELL + 2) + 'px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color || '#7ee787';
    for (let i = 0; i < n; i++) {
      const col = i % COLS, row = ROWS - 1 - Math.floor(i / COLS);
      if (row < 0) break;
      ctx.fillText(ASCII_GLYPHS[(i * 7) % ASCII_GLYPHS.length], col * CELL, row * CELL);
    }
    ctx.fillStyle = '#58a6ff';
    let xa = 0;
    for (const t of tiers) { const c = owned[t.id] || 0; for (let b = 0; b < Math.min(c, 8); b++) { ctx.fillText('#', xa, 0); xa += CELL; } if (c) xa += CELL; }
    return;
  }
  // Default: raw bit-pixels fill bottom-up.
  ctx.fillStyle = color || '#3fb950';
  for (let i = 0; i < n; i++) {
    const col = i % COLS, row = ROWS - 1 - Math.floor(i / COLS);
    if (row < 0) break;
    ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 1, CELL - 1);
  }
  // Owned machines: a small 2×2 block per machine type along the top.
  let x = 1;
  for (const t of tiers) {
    const c = owned[t.id] || 0;
    if (!c) continue;
    ctx.fillStyle = t.type === 'click' ? '#e3b341' : '#4c9aff';
    const blocks = Math.min(c, 6);
    for (let b = 0; b < blocks; b++) { ctx.fillRect(x, 1, CELL - 1, CELL - 1); ctx.fillRect(x, CELL + 1, CELL - 1, CELL - 1); x += CELL; }
    x += CELL;
  }
}

/* ── Completion screen: shown after all 10 stages are beaten, and on every subsequent open. ── */
function showCompletion(host, { onNewGame, onExit } = {}) {
  host.innerHTML =
    '<div class="mg-wrap mg-complete">'
    + '<pre class="mg-complete-art">'
    + ' █████╗ ██╗     ██╗      \n'
    + '██╔══██╗██║     ██║      \n'
    + '███████║██║     ██║      \n'
    + '██╔══██║██║     ██║      \n'
    + '██║  ██║███████╗███████╗ \n'
    + '╚═╝  ╚═╝╚══════╝╚══════╝ \n'
    + 'STAGES COMPLETE'
    + '</pre>'
    + '<div class="mg-complete-msg">'
    + '<p><strong>SYS:</strong> You reached the end of the Foundry.</p>'
    + '<p>All bosses defeated. All features weaponized.</p>'
    + '<p>The system is yours.</p>'
    + '</div>'
    + '<div class="mg-complete-stats">10 / 10 stages beaten</div>'
    + '<div class="mg-complete-actions">'
    + '<button class="mg-complete-new" type="button">New Game</button>'
    + '<button class="mg-back" type="button">Back to arcade</button>'
    + '</div>'
    + '</div>';
  host.querySelector('.mg-complete-new').addEventListener('click', () => {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(COMPLETE_KEY); } catch { /* private mode */ }
    if (onNewGame) onNewGame(); else location.reload();
  });
  host.querySelector('.mg-back').addEventListener('click', () => { if (onExit) onExit(); });
}

export function mount(host, { onExit } = {}) {
  const s = load();
  const state = {
    bits: s.bits || 0,
    owned: s.owned || {},
    claimed: (s.claimed && typeof s.claimed === 'object') ? s.claimed : (s.snakeClaimed ? { snake: gameHigh('snake') } : {}),
    stage: s.stage || 1,
    defeated: Array.isArray(s.defeated) ? s.defeated : [],
    introStages: Array.isArray(s.introStages) ? s.introStages : (s.introSeen ? [1] : []),   // per-stage intro seen
    buyMult: s.buyMult || 1,            // 1 | 10 | 100 | 'max'
  };
  let timer = null, bossCtl = null, dlgCtl = null;

  // If the player already finished all 10 stages, go straight to the completion screen.
  const isComplete = () => { try { return localStorage.getItem(COMPLETE_KEY) === '1'; } catch { return false; } };

  const stage = () => stageByNumber(Math.min(state.stage, STAGES.length));
  const tiers = () => stage().tiers || [];
  const ownedOf = (id) => state.owned[id] || 0;
  const stageBeaten = () => state.defeated.includes(stage()?.n);
  const costOf = (t, count) => Math.ceil(t.base * Math.pow(t.mult, count));
  const clickPower = () => 1 + tiers().filter((t) => t.type === 'click').reduce((a, t) => a + ownedOf(t.id) * (t.amount || 1), 0);
  const totalRate = () => tiers().filter((t) => t.type === 'auto').reduce((sum, t) => sum + (t.rate || 0) * ownedOf(t.id), 0);
  // Buy up to the active multiplier (or as many as affordable for 'max').
  function buyTier(id) {
    const t = tiers().find((x) => x.id === id); if (!t) return;
    const limit = state.buyMult === 'max' ? Infinity : state.buyMult;
    let bought = 0;
    while (bought < limit) { const c = costOf(t, ownedOf(id) + bought); if (state.bits < c) break; state.bits -= c; bought++; }
    if (bought) { state.owned[id] = ownedOf(id) + bought; save(state); }
    return bought;
  }

  function clearTransient() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bossCtl) { bossCtl.destroy && bossCtl.destroy(); bossCtl = null; }
    if (dlgCtl) { dlgCtl.destroy && dlgCtl.destroy(); dlgCtl = null; }
  }

  /* ── Phase: intro (per stage) ── */
  function enterStage() {
    if (isComplete()) {
      showCompletion(host, { onNewGame: () => { mount(host, { onExit }); }, onExit });
      attachDbg();
      return;
    }
    // Stage 1 skips the dialog intro entirely — the empty pixel screen IS the onboarding (the bell
    // narrates it). Every later stage still plays its intro once.
    if (stage().n === 1 || state.introStages.includes(stage().n)) renderStageGrind(); else startIntro();
  }
  // Stage 1 has a bespoke render (pixel-reveal); every other stage uses the shared grind economy.
  function renderStageGrind() {
    if (stage().n === 1) renderS1(); else renderGrind();
  }
  function renderS1() {
    clearTransient();
    renderStage1({
      host, state, save, stage,
      clickPower, buyTier,
      onExit,
      onBoss: () => startBoss(),
      attachChrome: (h) => attachChrome(h, { debug: true }),
    });
  }
  function startIntro() {
    clearTransient();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"></div>';
    const st = stage();
    dlgCtl = playDialog(host.querySelector('.mg-stage-host'), st.intro, {
      cta: 'Begin', onDone: () => { if (!state.introStages.includes(st.n)) state.introStages.push(st.n); save(state); renderStageGrind(); },
    });
    attachDbg();
  }

  /* ── Phase: grind (the visual pixel economy) ── */
  function renderGrind() {
    clearTransient();
    const st = stage();
    const color = (st.resource && st.resource.color) || '#3fb950';
    const resName = (st.resource && st.resource.name) || 'bits';
    const ascii = st.resource && st.resource.theme === 'ascii';
    host.innerHTML =
      '<div class="mg-wrap' + (ascii ? ' mg-ascii' : '') + '">'
      + '<div class="mg-stage-banner">Stage ' + st.n + ' · <strong>' + st.title + '</strong></div>'
      + '<canvas class="mg-canvas" width="' + (COLS * CELL + 2) + '" height="' + (ROWS * CELL + 2) + '"></canvas>'
      + '<div class="mg-head"><div class="mg-bits"></div><div class="mg-rate"></div></div>'
      + '<div class="mg-progress"><div class="mg-progress-bar"></div></div>'
      + '<button class="mg-compute" type="button">⚙ Compute<span class="mg-click"></span></button>'
      + '<div class="mg-mult" hidden>Buy: ' + [1, 10, 100, 'max'].map((m) => '<button class="mg-mult-b" data-m="' + m + '">×' + m + '</button>').join('') + '</div>'
      + '<button class="mg-faceboss" type="button" hidden>⚔ Confront ' + st.bossName + '</button>'
      + '<div class="mg-bonus" hidden></div>'
      + '<div class="mg-shop"></div>'
      + '<button class="mg-back" type="button">‹ Back to arcade</button>'
      + '</div>';
    const $ = (s2) => host.querySelector(s2);
    const canvas = $('.mg-canvas');
    const shopEl = $('.mg-shop');
    shopEl.innerHTML = tiers().map((t) =>
      '<button class="mg-buy" data-id="' + t.id + '"><span class="mg-buy-name">' + t.icon + ' ' + t.name
      + ' <span class="mg-owned">×' + ownedOf(t.id) + '</span></span>'
      + '<span class="mg-buy-blurb">' + t.desc + '</span>'
      + '<span class="mg-buy-cost"></span></button>').join('');
    shopEl.querySelectorAll('.mg-buy').forEach((b) => b.addEventListener('click', () => { if (buyTier(b.dataset.id)) paint(); }));
    $('.mg-compute').addEventListener('click', () => { state.bits += clickPower(); paint(); });
    $('.mg-faceboss').addEventListener('click', () => startBoss());
    $('.mg-back').addEventListener('click', () => onExit && onExit());
    $('.mg-mult').querySelectorAll('.mg-mult-b').forEach((b) => b.addEventListener('click', () => {
      state.buyMult = b.dataset.m === 'max' ? 'max' : Number(b.dataset.m); save(state); paint();
    }));

    function paint() {
      $('.mg-bits').textContent = fmt(state.bits) + ' ' + resName;
      $('.mg-rate').textContent = fmt(totalRate()) + '/s';
      $('.mg-click').textContent = ' +' + fmt(clickPower());
      drawCanvas(canvas, state.bits, state.owned, tiers(), color, st.resource && st.resource.theme);
      canvas.dataset.pixels = String(Math.min(Math.floor(state.bits), CAP));
      const goal = st.goal, beaten = stageBeaten();
      $('.mg-progress-bar').style.width = Math.min(100, (state.bits / goal) * 100) + '%';
      $('.mg-faceboss').hidden = beaten || state.bits < goal;
      // Buy-multiplier overlay appears once numbers get big.
      $('.mg-mult').hidden = state.bits < 1000;
      for (const b of $('.mg-mult').querySelectorAll('.mg-mult-b')) b.classList.toggle('mg-mult-on', String(state.buyMult) === b.dataset.m);
      for (const b of shopEl.querySelectorAll('.mg-buy')) {
        const t = tiers().find((x) => x.id === b.dataset.id); const c = costOf(t, ownedOf(t.id));
        b.querySelector('.mg-buy-cost').textContent = fmt(c);
        b.querySelector('.mg-owned').textContent = '×' + ownedOf(t.id);
        b.classList.toggle('mg-afford', state.bits >= c);
      }
      // Cross-stage arcade bonus: claim each game's new high-score points into this stage's resource.
      const bonusEl = $('.mg-bonus');
      const rows = SCORE_GAMES.map((g) => { const hi = gameHigh(g.id); const gain = (hi - (state.claimed[g.id] || 0)) * BONUS_PER_POINT; return { g, hi, gain }; }).filter((r) => r.gain > 0);
      if (rows.length) {
        bonusEl.hidden = false;
        bonusEl.innerHTML = '<div class="mg-bonus-title">Arcade bonus · works every stage</div>'
          + rows.map((r) => '<button class="mg-claim" type="button" data-g="' + r.g.id + '" data-hi="' + r.hi + '">Claim ' + r.g.name + ' (' + r.hi + ') → +' + fmt(r.gain) + ' ' + resName + '</button>').join('');
        bonusEl.querySelectorAll('.mg-claim').forEach((b) => { b.onclick = () => { const id = b.dataset.g, hi = Number(b.dataset.hi); state.bits += (hi - (state.claimed[id] || 0)) * BONUS_PER_POINT; state.claimed[id] = hi; save(state); paint(); }; });
      } else bonusEl.hidden = true;
    }
    paint();
    attachChrome(host, { debug: true });
    let acc = 0;
    timer = setInterval(() => { state.bits += totalRate() / 10; paint(); if (++acc >= 10) { acc = 0; save(state); } }, 100);
  }

  /* ── Phase: boss ── */
  function startBoss() {
    clearTransient();
    const st = stage();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"><div class="mg-arena"></div>'
      + '<div class="mg-boss-bar"><button class="mg-hint-btn" type="button">💡 Hint</button>'
      + '<button class="mg-flee" type="button">Retreat</button></div></div>';
    const stageHost = host.querySelector('.mg-stage-host');
    const arena = host.querySelector('.mg-arena');
    host.querySelector('.mg-flee').addEventListener('click', () => renderStageGrind());
    let hintIdx = 0;
    host.querySelector('.mg-hint-btn').addEventListener('click', () => {
      const line = st.hints[Math.min(hintIdx, st.hints.length - 1)];
      hintIdx++;
      if (dlgCtl) dlgCtl.destroy();
      dlgCtl = playDialog(stageHost, [line], { cta: 'Got it', onDone: () => { dlgCtl = null; } });
    });
    // Boss taunt, then the arena goes live.
    // mountBoss may be null while the boss module is pending (e.g. Stage 1 before WP-S1-11).
    dlgCtl = playDialog(stageHost, st.bossIntro, {
      cta: 'Fight', onDone: () => {
        dlgCtl = null;
        if (!st.mountBoss) { arena.innerHTML = '<div class="mg-boss-pending">boss coming soon</div>'; return; }
        bossCtl = st.mountBoss(arena, { stage: st, onDefeat: onBossDefeat });
      },
    });
    attachDbg();
  }
  function onBossDefeat() {
    const st = stage();
    if (!state.defeated.includes(st.n)) state.defeated.push(st.n);
    state.bits += st.goal * 5;                 // spoils
    save(state);
    clearTransient();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"></div>';
    attachDbg();
    const isFinalStage = st.n === STAGES.length;
    dlgCtl = playDialog(host.querySelector('.mg-stage-host'), st.victory, {
      cta: isFinalStage ? 'The End' : 'Continue',
      onDone: () => {
        if (isFinalStage) {
          try { localStorage.setItem(COMPLETE_KEY, '1'); } catch { /* private mode */ }
          clearTransient();
          showCompletion(host, {
            onNewGame: () => { mount(host, { onExit }); },
            onExit,
          });
          attachDbg();
        } else {
          const prevStage = state.stage;
          if (state.stage < STAGES.length) state.stage++;
          save(state);
          // Clean up stage-specific messages when leaving a stage (no-op if already removed).
          if (prevStage === 1) removeStageMsgs(MESSAGES1);
          enterStage();
        }
      },
    });
  }

  /* ── Debug panel — absolutely positioned (overlays, never pushes layout) + hidden by default.
     A subtle ⚙ toggle in the grind header opens it. ── */
  const dbg = document.createElement('div');
  dbg.className = 'mg-debug';
  dbg.hidden = true;
  const stageOpts = Array.from({ length: STAGES.length }, (_, i) =>
    '<option value="' + (i + 1) + '">' + (i + 1) + '</option>').join('');
  dbg.innerHTML =
    '<span class="mg-debug-label">&#x1f527; Debug</span>'
    + '<label>Stage <select class="mg-dbg-stage">' + stageOpts + '</select></label>'
    + '<label>Phase <select class="mg-dbg-phase">'
    + '<option value="intro">intro</option><option value="grind">grind</option>'
    + '<option value="boss">boss</option><option value="victory">victory</option>'
    + '</select></label>'
    + '<button class="mg-dbg-jump" type="button">Jump</button>'
    + '<button class="mg-dbg-reset" type="button">Reset Save</button>';
  // The grind-phase toggle button (subtle ⚙). Lives next to Back/Fullscreen, shown only in grind.
  const dbgToggle = document.createElement('button');
  dbgToggle.type = 'button';
  dbgToggle.className = 'mg-dbg-toggle';
  dbgToggle.title = 'Debug';
  dbgToggle.textContent = '⚙';
  dbgToggle.addEventListener('click', (e) => { e.stopPropagation(); dbg.hidden = !dbg.hidden; });

  // Chrome = the persistent overlay furniture (debug + bell). Re-attached after every innerHTML wipe.
  // opts.debug shows the grind-only debug toggle; the bell rides along in every phase.
  function attachChrome(h = host, { debug = false } = {}) {
    h.appendChild(dbg);
    if (debug) { dbgToggle.hidden = false; h.appendChild(dbgToggle); } else { dbgToggle.hidden = true; }
    mountBell(h);
    updateBellDot();
  }
  // Back-compat alias for the rest of the orchestrator (boss/victory/completion phases: no toggle).
  const attachDbg = () => attachChrome(host, { debug: false });

  dbg.querySelector('.mg-dbg-jump').addEventListener('click', () => {
    const targetStage = Number(dbg.querySelector('.mg-dbg-stage').value);
    const targetPhase = dbg.querySelector('.mg-dbg-phase').value;
    const st = stageByNumber(Math.min(targetStage, STAGES.length));
    clearTransient();
    state.stage = targetStage;
    if (targetPhase === 'intro') {
      state.introStages = state.introStages.filter((n) => n !== st.n);
      state.bits = 0;
      save(state);
      startIntro();
    } else if (targetPhase === 'grind') {
      // Mark intro seen so the grind view is shown directly (stage 1 routes to its pixel reveal).
      if (!state.introStages.includes(st.n)) state.introStages.push(st.n);
      state.bits = 0;
      save(state);
      renderStageGrind();
    } else if (targetPhase === 'boss') {
      if (!state.introStages.includes(st.n)) state.introStages.push(st.n);
      state.bits = st.goal;     // meets threshold; startBoss() checks nothing else
      save(state);
      startBoss();
    } else if (targetPhase === 'victory') {
      if (!state.introStages.includes(st.n)) state.introStages.push(st.n);
      if (!state.defeated.includes(st.n)) state.defeated.push(st.n);
      state.bits = st.goal * 6;
      save(state);
      host.innerHTML = '<div class="mg-wrap mg-stage-host"></div>';
      attachDbg();
      const isFinal = st.n === STAGES.length;
      dlgCtl = playDialog(host.querySelector('.mg-stage-host'), st.victory, {
        cta: isFinal ? 'The End' : 'Continue',
        onDone: () => {
          if (isFinal) {
            try { localStorage.setItem(COMPLETE_KEY, '1'); } catch { /* private mode */ }
            clearTransient();
            showCompletion(host, { onNewGame: () => { mount(host, { onExit }); }, onExit });
            attachDbg();
          } else {
            if (state.stage < STAGES.length) state.stage++;
            save(state);
            enterStage();
          }
        },
      });
    }
  });
  dbg.querySelector('.mg-dbg-reset').addEventListener('click', () => {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(COMPLETE_KEY); } catch { /* ignore */ }
    location.reload();
  });

  // Fire 'game-start' messages on every mount (bell-nothing fires once on first open, giving the
  // red dot immediately before the player has done anything).
  checkMessages('game-start', state, bellLoad());

  enterStage();   // each render path attaches its own chrome (debug panel + bell)

  return {
    destroy() { clearTransient(); save(state); host.innerHTML = ''; },
    _state: state,
    _debug: { startBoss, renderGrind, renderStageGrind, renderS1 },   // test seam
  };
}
