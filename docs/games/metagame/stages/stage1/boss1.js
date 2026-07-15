// boss1.js — Stage 1 boss: THE DEFRAGMENTER (WP-S1-11).
//
// A 20-second click-contest. The player taps a giant button; the boss "shadows" each tap with a
// constant edge, an auto-tick floor, and pre-scheduled BURSTS.
//
// This module owns the LOBBY, win/lose resolution, retry, achievements, and lifecycle. The taunt
// corpus + helpers live in boss1-data.js, the arena stylesheet in boss1-style.js, and the live fight
// loop in boss1-fight.js. The orchestrator (metagame.js) calls:
//   mountDefragmenter(arena, { stage, onDefeat, state, save, checkMessages, bellLoad, bellAdd })
// state/save/bell helpers are optional; the boss degrades gracefully (no-op) when they are absent.

import { toDisplay, gte, sub, mulScalar } from './bignum.js';
import { TAUNTS, pick, esc } from './boss1-data.js';
import { injectStyle } from './boss1-style.js';
import { makeFight } from './boss1-fight.js';

const DEFAULT_TICKET = { m: 1, e: 9 };   // fallback if the stage config has no bossTicket

export function mountDefragmenter(arena, opts = {}) {
  const { stage, onDefeat } = opts;
  // state/save/bell helpers are optional in this WP; provide safe fallbacks.
  const state = opts.state || {};
  const save = typeof opts.save === 'function' ? opts.save : () => {};
  const checkMessages = typeof opts.checkMessages === 'function' ? opts.checkMessages : () => {};
  const bellLoad = typeof opts.bellLoad === 'function' ? opts.bellLoad : () => ({});
  const bellAdd = typeof opts.bellAdd === 'function' ? opts.bellAdd : () => {};

  // Fight costs the ticket; a retry costs half. Use the real stage ticket (now 1an).
  const ticket = (opts.stage && opts.stage.bossTicket) || DEFAULT_TICKET;
  const halfTicket = mulScalar(ticket, 0.5);
  const canPay = (price) => gte(state.bits || { m: 0, e: 0 }, price);
  const pay = (price) => { state.bits = sub(state.bits, price); };

  injectStyle();

  let destroyed = false;
  const timers = new Set();
  const listeners = [];
  let lobbyTaunt = null; // current lobby idle-taunt cycler; stopped before each re-render
  const setT = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms); timers.add(id); return id; };
  const setI = (fn, ms) => { const id = setInterval(() => { if (!destroyed) fn(); }, ms); timers.add(id); return id; };
  const clearTimer = (id) => { clearInterval(id); timers.delete(id); };
  const on = (target, ev, fn) => { target.addEventListener(ev, fn); listeners.push([target, ev, fn]); };

  // ── §10A.4 — "boss seen" seeding (first mount only) ────────────────────────────────────────
  if (!state.bossSeen) {
    state.bossSeen = true;
    save(state);
    fireAchievement('ach-boss-seen');
  }

  // Fire an achievement: push id + bell line (the WP-S1-06 runtime checkAchievements isn't wired
  // yet, so the boss fires its own ids directly — idempotent via the achievements array).
  function fireAchievement(id) {
    state.achievements = Array.isArray(state.achievements) ? state.achievements : [];
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    save(state);
    const bellText = {
      'ach-boss-seen': '🥊 you stared the Defragmenter down.',
      'ach-boss-victory': '🏆 defragmented — your bits, your win.',
      'ach-boss-lose': '😤 close one. steady the rhythm and try again.',
    }[id];
    if (bellText) bellAdd(id, bellText, bellLoad());
  }

  // ── Taunt dialog component (lobby idle cycler) ──────────────────────────────────────────────
  // Lobby idle cycler shows only lobby intimidation lines — the during-fight jabs stay in the fight.
  function lobbyPool() { return TAUNTS.lobby; }
  function winHint() { return TAUNTS.hint[Math.min(state.bossLossCount || 0, TAUNTS.hint.length - 1)]; }
  function makeTauntDialog() {
    const bubble = arena.querySelector('.boss-taunt-bubble');
    let idleId = null;
    function show(text) { if (bubble) bubble.textContent = text; }
    function startIdle() {
      stopIdle();
      const tick = () => {
        show(pick(lobbyPool()));
        idleId = setT(tick, 8000 + Math.random() * 4000);
      };
      tick();
    }
    function stopIdle() { if (idleId) { clearTimeout(idleId); timers.delete(idleId); idleId = null; } }
    return { show, startIdle, stopIdle };
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────────────────────
  function renderLobby(extraStatus) {
    // Stop the previous lobby idle cycler — renderLobby is called repeatedly (insufficient bits,
    // returning from a loss, retries) and each makeTauntDialog().startIdle() schedules a
    // self-perpetuating setTimeout chain. Without stopping the old one they accumulate (a timer
    // leak that keeps poking detached DOM forever).
    if (lobbyTaunt) lobbyTaunt.stopIdle();
    arena.innerHTML =
      '<div class="mg-defrag-arena mg-fade-in">'
      + '<div class="mg-defrag-header">THE DEFRAGMENTER</div>'
      + '<div class="mg-defrag-intro">your bits are scattered. I\'ll reorganize them — into mine.</div>'
      + '<div class="mg-defrag-taunt-wrap"><div class="boss-taunt">'
      + '<span class="boss-taunt-avatar">⚙️</span>'
      + '<div class="boss-taunt-bubble"></div></div></div>'
      + '<div class="mg-defrag-hint">💡 ' + esc(winHint()) + '</div>'
      + '<div class="mg-defrag-status">' + esc(extraStatus || '') + '</div>'
      + '<div class="mg-defrag-lobby-btns">'
      + '<button class="mg-defrag-btn mg-defrag-fight" type="button"' + (canPay(ticket) ? '' : ' disabled') + '>Fight — ' + esc(toDisplay(ticket)) + '</button>'
      + '<button class="mg-defrag-btn alt mg-defrag-retreat" type="button">Retreat</button>'
      + '</div></div>';
    lobbyTaunt = makeTauntDialog();
    lobbyTaunt.startIdle();
    on(arena.querySelector('.mg-defrag-fight'), 'click', () => {
      if (!canPay(ticket)) { renderLobby('insufficient bits — the ticket is ' + toDisplay(ticket) + '.'); return; }
      pay(ticket);
      state.bossEntered = true;
      fireAchievement('ach-boss-enter');
      save(state);
      lobbyTaunt.stopIdle();
      startFight();
    });
    on(arena.querySelector('.mg-defrag-retreat'), 'click', retreat);
  }

  function retreat() { cleanup(); if (typeof opts.onRetreat === 'function') opts.onRetreat(); }

  // ── FIGHT (live loop lives in boss1-fight.js; finishFight handles the outcome) ──────────────
  const startFight = makeFight({ arena, setT, setI, clearTimer, on, onFinish: finishFight });

  // ── WIN / LOSE (§10.7) ───────────────────────────────────────────────────────────────────
  function finishFight(userScore, bossScore) {
    const won = userScore > bossScore;
    const statusEl = arena.querySelector('.mg-defrag-status');
    const bubble = arena.querySelector('.boss-taunt-bubble');

    if (won) {
      state.defeated = Array.isArray(state.defeated) ? state.defeated : [];
      if (!state.defeated.includes(1)) state.defeated.push(1);
      save(state);
      fireAchievement('ach-boss-victory');
      if (bubble) bubble.textContent = pick(TAUNTS.win);
      bellAdd('bell-boss-victory', 'you beat The Defragmenter. it\'s still running in the background. just slower.', bellLoad());
      showResultOverlay('YOU WIN', 'win', userScore, bossScore, () => { cleanup(); onDefeat && onDefeat(); }, 'Continue');
      return;
    }

    // Loss.
    state.bossLossCount = (state.bossLossCount || 0) + 1;
    save(state);
    checkMessages('boss-loss', state, bellLoad());   // fires bell-boss-hint-* at 5/10/15 (§7.3)
    fireAchievement('ach-boss-lose');
    if (bubble) bubble.textContent = pick(TAUNTS.loss);
    if (statusEl) statusEl.textContent = 'The Defragmenter wins — your bits scatter, but stay yours. Try again.';

    showResultOverlay('YOU LOSE', 'lose', userScore, bossScore, null, null);
    // Retry is free + immediate (no cooldown) + Retreat.
    const overlay = arena.querySelector('.mg-defrag-overlay');
    if (!overlay) return;
    const btns = document.createElement('div');
    btns.className = 'mg-defrag-lobby-btns';
    btns.innerHTML =
      '<button class="mg-defrag-btn mg-defrag-retry" type="button"' + (canPay(halfTicket) ? '' : ' disabled') + '>Try Again — ' + esc(toDisplay(halfTicket)) + '</button>'
      + '<button class="mg-defrag-btn alt mg-defrag-retreat" type="button">Retreat</button>';
    overlay.appendChild(btns);
    on(btns.querySelector('.mg-defrag-retreat'), 'click', retreat);
    on(btns.querySelector('.mg-defrag-retry'), 'click', onRetry);
  }

  function showResultOverlay(title, cls, userScore, bossScore, onContinue, cta) {
    const arenaEl = arena.querySelector('.mg-defrag-arena');
    if (!arenaEl) return;
    const old = arena.querySelector('.mg-defrag-overlay');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.className = 'mg-defrag-overlay mg-fade-in';
    ov.innerHTML =
      '<div class="mg-defrag-result ' + cls + '">' + esc(title) + '</div>'
      + '<div class="mg-defrag-intro">YOU ' + userScore + ' — ' + bossScore + ' BOSS</div>';
    if (onContinue && cta) {
      const b = document.createElement('button');
      b.className = 'mg-defrag-btn';
      b.type = 'button';
      b.textContent = cta;
      on(b, 'click', onContinue);
      ov.appendChild(b);
    }
    arenaEl.appendChild(ov);
  }

  // Retry costs HALF the ticket (cheaper than a fresh fight, but not free).
  function onRetry() {
    if (!canPay(halfTicket)) { renderLobby('insufficient bits — a retry costs ' + toDisplay(halfTicket) + '.'); return; }
    pay(halfTicket);
    state.bossEntered = true;
    fireAchievement('ach-boss-enter');
    save(state);
    startFight();
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────────────────────
  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    for (const id of timers) { clearTimeout(id); clearInterval(id); }
    timers.clear();
    for (const [t, ev, fn] of listeners) t.removeEventListener(ev, fn);
    listeners.length = 0;
  }

  renderLobby();
  return { destroy: cleanup };
}
