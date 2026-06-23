// boss1.js — Stage 1 boss: THE DEFRAGMENTER (WP-S1-11).
//
// A 20-second click-contest. The player taps a giant button; the boss "shadows" each tap with a
// constant +1.10 edge, an auto-tick floor (so a fast tapper can't simply out-rate it), and a set
// of pre-scheduled BURSTS. The bursts only have real teeth when the shared metagame action
// `1.cheat_disabled` is missing.
//
// The boss reads the cheat ONCE at fight start (§10A.5). Disabling it mid-fight does not change an
// in-progress fight — the player must disable it in the lobby, then start a fresh fight.
//
// Exports a single mount function. The orchestrator (metagame.js) calls it as:
//   mountDefragmenter(arena, { stage, onDefeat, state, save, checkMessages, bellLoad, bellAdd })
// state/save/checkMessages/bellLoad/bellAdd are optional in this WP (WP-S1-12 wires the full ctx);
// the boss degrades gracefully (no-op bell/save) when they are absent.

import { toDisplay, gte, sub, mulScalar } from './bignum.js';

const FIGHT_MS = 20000;
const SHADOW_WEIGHT = 1.10;
const BURST_MS = 800;
const DEFAULT_TICKET = { m: 1, e: 9 };   // fallback if the stage config has no bossTicket

const TAUNTS = {
  // Shown in the LOBBY (before/after a fight) — intimidation, not the during-fight jabs.
  lobby: [
    'scattered bits. how careless. shall we begin?',
    'I have all the time in the world. and all of your bits.',
    'I am The Defragmenter. fragmentation is… temporary.',
    'press Fight whenever you\'re ready to lose.',
  ],
  // Shown only DURING the fight.
  general: [
    'you call that clicking?',
    'beep boop. I win again.',
    'your bits are mine now.',
    "I've been defragging longer than you've existed.",
    "don't worry, I'll put your bits in order. my order.",
  ],
  // The win-mechanic hint, escalating with losses (shown in the lobby). The boss cheats; you can't
  // out-tap it — you disable the cheat by editing Overwriter.frag (CHEAT=true → false) in the viewer.
  hint: [
    // First visit (0 losses): establish the MECHANIC — you can't out-tap a cheater; the fix is
    // editable, not in this window. No file named yet.
    'I don\'t fight fair — and you can\'t out-tap a cheater. the rules of this fight are written down somewhere you can edit. this window won\'t help you.',  // 0 losses
    // After the first loss: name the file and the flag outright (kept faintly coy).
    'a file decides how I cheat. Overwriter.frag — CHEAT=true. flip it to false and come back. …not that you would.',  // 1
    'still losing? the examples folder. Overwriter.frag. CHEAT=false. I\'m only saying it so you DON\'T do it.',  // 2
    'open Overwriter.frag, set CHEAT=false, fight me again. there. now stop losing.',  // 3+
  ],
  burstCheat: [
    'look at this box I found! 📦',
    'oh would you look at that, another box! 📦',
    'I just love finding these lying around.',
  ],
  burstNormal: [
    "I'm on fire! 🔥",
    'is it getting hot in here?',
  ],
  lossGated: [
    { atLosses: 3,  text: "come back any time. I'll be here. always." },
    { atLosses: 5,  text: 'you seem frustrated. have you tried… looking around? no reason.' },
    { atLosses: 7,  text: 'I am so glad nobody can touch me, The Defragmenter. so glad.' },
    { atLosses: 10, text: 'there is nothing in the examples folder that could help you. nothing at all. don\'t look.' },
    { atLosses: 12, text: 'even if someone had hidden something in a file somewhere… hypothetically… you\'d never find it.' },
    { atLosses: 15, text: 'CHEAT? what CHEAT? I have no idea what a CHEAT= line is. stop looking at me.' },
  ],
  win: [
    'this is… unexpected. my boxes aren\'t working. who did this.',
    "I'll be back. after a full defrag.",
  ],
  loss: [
    'better luck next defrag.',
    'and stay defragged.',
    'your bits have been reorganized. you\'re welcome.',
  ],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function readCheat(actions) {
  if (actions && typeof actions.hasAction === 'function') {
    return !actions.hasAction(1, 'cheat_disabled');
  }
  return true;
}

// Deterministic-within-a-fight, varied-per-attempt burst schedule (§10B.4).
function makeBurstSchedule(cheatActive) {
  const seed = Date.now() % 1000;
  let s = seed + 0x9e3779b9;
  function rand() {
    s |= 0; s = s + 0x9e3779b9 | 0;
    let t = Math.imul(s ^ s >>> 16, 0x21f0aaad);
    t = Math.imul(t ^ t >>> 15, 0x735a2d97);
    return ((t ^ t >>> 15) >>> 0) / 4294967296;
  }
  const N = cheatActive ? (rand() < 0.5 ? 3 : 4) : (rand() < 0.5 ? 2 : 3);
  const bursts = [];
  for (let i = 0; i < N; i++) {
    let start, tries = 0;
    do {
      start = Math.floor(rand() * (FIGHT_MS - 2000)) + 1000;
      tries++;
    } while (tries < 20 && bursts.some((b) => Math.abs(b.start - start) < BURST_MS));
    bursts.push({ start, end: start + BURST_MS, fired: 0 });
  }
  return bursts.sort((a, b) => a.start - b.start);
}

const STYLE_ID = 'mg-defrag-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.mg-defrag-arena { text-align:center; padding:18px 14px; border:1px solid var(--border); border-radius:12px;
  background:var(--bg-2); transition:box-shadow .15s, border-color .15s; }
.mg-defrag-header { font:700 22px/1.1 ui-monospace, monospace; letter-spacing:2px; color:#e0742f; margin-bottom:10px; }
.mg-defrag-intro { font-size:13px; color:var(--fg-2); margin-bottom:12px; }
.mg-defrag-hint { font-size:12px; color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent);
  border:1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius:8px; padding:7px 10px; margin:8px 0; }
.mg-defrag-taunt-wrap { min-height:64px; margin:8px 0; }
.boss-taunt { display:flex; align-items:flex-start; gap:8px; justify-content:center; text-align:left; }
.boss-taunt-avatar { font-size:26px; line-height:1; flex:0 0 auto; animation:mg-defrag-gear 4s linear infinite; }
@keyframes mg-defrag-gear { to { transform:rotate(360deg); } }
.boss-taunt-bubble { position:relative; background:var(--bg); border:1px solid var(--border); border-radius:10px;
  padding:8px 12px; font-size:13px; color:var(--fg); max-width:300px; min-height:1.2em; }
.mg-defrag-scores { display:flex; align-items:center; justify-content:center; gap:14px; margin:14px 0; }
.mg-defrag-side { flex:1 1 0; min-width:80px; }
.mg-defrag-label { font-size:11px; letter-spacing:2px; color:var(--fg-2); }
.mg-defrag-score { font:700 40px/1 ui-monospace, monospace; transition:color .12s; }
.mg-defrag-boss .mg-defrag-score { color:#e0742f; }
.mg-defrag-bar { height:8px; border-radius:4px; background:var(--border); margin-top:6px; overflow:hidden; }
.mg-defrag-bar::after { content:''; display:block; height:100%; width:var(--w,0%); background:currentColor; transition:width .1s linear; }
.user-bar { color:#3fb950; } .boss-bar { color:#e0742f; }
.mg-defrag-timer { font:700 22px/1 ui-monospace, monospace; flex:0 0 auto; min-width:64px; }
.mg-defrag-tap { display:block; width:100%; margin:6px 0; padding:26px 0; font:700 22px/1 ui-monospace, monospace;
  letter-spacing:3px; color:var(--accent-fg); background:var(--accent); border:0; border-radius:12px; cursor:pointer;
  user-select:none; -webkit-user-select:none; touch-action:manipulation; }
.mg-defrag-tap:active { transform:scale(.98); }
.mg-defrag-tap:disabled { opacity:.5; cursor:default; }
.mg-defrag-status { font-size:13px; color:var(--fg-2); min-height:1.4em; margin-top:6px; }
.mg-defrag-burst-hot { border-color:#e0742f; box-shadow:0 0 0 2px #e0742f88, 0 0 22px #e0742f55; }
.mg-defrag-burst-hot .mg-defrag-boss .mg-defrag-score { color:#ff7a18; animation:mg-defrag-pulse .25s ease infinite alternate; }
.mg-defrag-burst-warm { border-color:#e8c339; box-shadow:0 0 0 2px #e8c33988; }
.mg-defrag-burst-warm .mg-defrag-boss .mg-defrag-score { color:#e8c339; }
@keyframes mg-defrag-pulse { from { transform:scale(1); } to { transform:scale(1.12); } }
.mg-defrag-lobby-btns { display:flex; gap:8px; justify-content:center; margin-top:10px; flex-wrap:wrap; }
.mg-defrag-btn { background:var(--accent); color:var(--accent-fg); border:0; border-radius:8px; padding:9px 18px;
  cursor:pointer; font-size:14px; }
.mg-defrag-btn.alt { background:var(--bg); color:var(--fg); border:1px solid var(--border); }
.mg-defrag-btn:disabled { opacity:.5; cursor:default; }
.mg-defrag-overlay { margin-top:10px; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--bg); }
.mg-defrag-result { font:700 28px/1 ui-monospace, monospace; letter-spacing:2px; margin-bottom:8px; }
.mg-defrag-result.win { color:#3fb950; } .mg-defrag-result.lose { color:#e03131; }
.mg-defrag-arena.mg-fade-in { animation:mg-defrag-fade .4s ease; }
@keyframes mg-defrag-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;
  document.head.appendChild(el);
}

export function mountDefragmenter(arena, opts = {}) {
  const { stage, onDefeat } = opts;
  // state/save/bell helpers are optional in this WP; provide safe fallbacks.
  const state = opts.state || {};
  const save = typeof opts.save === 'function' ? opts.save : () => {};
  const checkMessages = typeof opts.checkMessages === 'function' ? opts.checkMessages : () => {};
  const bellLoad = typeof opts.bellLoad === 'function' ? opts.bellLoad : () => ({});
  const bellAdd = typeof opts.bellAdd === 'function' ? opts.bellAdd : () => {};
  const actions = opts.actions || null;

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
  const on = (target, ev, fn) => { target.addEventListener(ev, fn); listeners.push([target, ev, fn]); };

  // Live cheat flag for the LOBBY display only (fight reads its own locked copy at start, §10A.5).
  let lobbyCheat = readCheat(actions);

  // ── §10A.4 — "boss seen" seeding (first mount only) ────────────────────────────────────────
  if (!state.bossSeen) {
    state.bossSeen = true;
    save(state);
    lobbyCheat = readCheat(actions);
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
      'ach-boss-cheat-found': '🕵️ something was off. you fixed it.',
      'ach-boss-victory': '🏆 defragmented — your bits, your win.',
      'ach-boss-lose': '😤 it cheated. of course it did.',
    }[id];
    if (bellText) bellAdd(id, bellText, bellLoad());
  }

  // ── Taunt dialog component (lobby idle cycler + arena event-driven) ─────────────────────────
  // Lobby idle cycler shows only lobby intimidation lines — the during-fight jabs ("you call that
  // clicking?") stay in the fight. The win-mechanic hint is shown separately (winHint).
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

  // ── FIGHT ──────────────────────────────────────────────────────────────────────────────────
  function startFight() {
    const cheatActive = readCheat(actions);              // §10A.5 — locked once, here.
    const bursts = makeBurstSchedule(cheatActive);
    let userScore = 0, bossScore = 0, bossAcc = 0;
    let tapTimes = [];
    let lastFloorTick = 0;
    const fightStart = Date.now();
    let fightActive = true;
    let activeBurstKey = null;   // tracks which burst is currently "on" for taunt/visual edges.

    arena.innerHTML =
      '<div class="mg-defrag-arena mg-defrag-fight-on mg-fade-in">'
      + '<div class="mg-defrag-header">THE DEFRAGMENTER</div>'
      + '<div class="mg-defrag-taunt-wrap"><div class="boss-taunt">'
      + '<span class="boss-taunt-avatar">⚙️</span>'
      + '<div class="boss-taunt-bubble"></div></div></div>'
      + '<div class="mg-defrag-scores">'
      + '<div class="mg-defrag-side mg-defrag-user"><div class="mg-defrag-label">YOU</div>'
      + '<div class="mg-defrag-score" id="user-score">0</div><div class="mg-defrag-bar user-bar"></div></div>'
      + '<div class="mg-defrag-timer">20.0s</div>'
      + '<div class="mg-defrag-side mg-defrag-boss"><div class="mg-defrag-label">BOSS</div>'
      + '<div class="mg-defrag-score" id="boss-score">0</div><div class="mg-defrag-bar boss-bar"></div></div>'
      + '</div>'
      + '<button class="mg-defrag-tap" type="button">TAP TAP TAP</button>'
      + '<div class="mg-defrag-status"></div></div>';

    const arenaEl = arena.querySelector('.mg-defrag-arena');
    const userEl = arena.querySelector('#user-score');
    const bossEl = arena.querySelector('#boss-score');
    const userBar = arena.querySelector('.user-bar');
    const bossBar = arena.querySelector('.boss-bar');
    const timerEl = arena.querySelector('.mg-defrag-timer');
    const statusEl = arena.querySelector('.mg-defrag-status');
    const bubble = arena.querySelector('.boss-taunt-bubble');
    const tapBtn = arena.querySelector('.mg-defrag-tap');

    const showTaunt = (text) => { if (bubble) bubble.textContent = text; };
    showTaunt(pick(TAUNTS.general));   // fight-start taunt (§10C.4)

    function updateDisplay() {
      userEl.textContent = String(userScore);
      bossEl.textContent = String(bossScore);
      const max = Math.max(userScore, bossScore, 1);
      userBar.style.setProperty('--w', (100 * userScore / max) + '%');
      bossBar.style.setProperty('--w', (100 * bossScore / max) + '%');
    }

    function onTap() {
      if (!fightActive) return;
      userScore += 1;
      const now = Date.now();
      const elapsed = now - fightStart;
      const inBurst = bursts.some((b) => elapsed >= b.start && elapsed < b.end);
      if (inBurst && cheatActive) bossAcc += 1.5; else bossAcc += SHADOW_WEIGHT;
      bossScore = Math.floor(bossAcc);
      tapTimes.push(now);
      tapTimes = tapTimes.filter((t) => now - t < 3000);
      updateDisplay();
    }
    on(tapBtn, 'click', onTap);

    // 100 ms tick: timer, auto-tick floor, burst auto-fires + visuals, repaint.
    const tickId = setI(() => {
      const now = Date.now();
      const elapsed = now - fightStart;
      const remaining = Math.max(0, FIGHT_MS - elapsed);
      timerEl.textContent = (remaining / 1000).toFixed(1) + 's';

      // Auto-tick floor (§10B.3): boss keeps a baseline pulse slightly faster than the user.
      const userRateMs = tapTimes.length > 1
        ? (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1)
        : 999;
      const bossFloorMs = Math.min(500, userRateMs * 0.95);
      if (now - lastFloorTick >= bossFloorMs) {
        bossAcc += 1.0;
        bossScore = Math.floor(bossAcc);
        lastFloorTick = now;
      }

      // Burst handling (§10B.4): visual edge + evenly spaced boss auto-fires.
      const burst = bursts.find((b) => elapsed >= b.start && elapsed < b.end);
      const key = burst ? burst.start : null;
      if (key !== activeBurstKey) {
        // Burst boundary changed.
        arenaEl.classList.remove('mg-defrag-burst-hot', 'mg-defrag-burst-warm');
        if (burst) {
          arenaEl.classList.add(cheatActive ? 'mg-defrag-burst-hot' : 'mg-defrag-burst-warm');
          statusEl.textContent = cheatActive ? '🔥 the Defragmenter surges…' : 'the Defragmenter surges…';
          showTaunt(pick(cheatActive ? TAUNTS.burstCheat : TAUNTS.burstNormal));
        } else {
          statusEl.textContent = '';
        }
        activeBurstKey = key;
      }
      if (burst) {
        // Evenly spaced auto-fires across the 800 ms window.
        const autoCount = cheatActive ? 4 : 2;
        const autoWeight = cheatActive ? 1.5 : 1.0;
        const want = Math.min(autoCount, Math.floor((elapsed - burst.start) / (BURST_MS / autoCount)) + 1);
        while (burst.fired < want) {
          bossAcc += autoWeight;
          burst.fired++;
        }
        bossScore = Math.floor(bossAcc);
      }

      updateDisplay();

      if (remaining <= 0) {
        fightActive = false;
        clearInterval(tickId); timers.delete(tickId);
        tapBtn.disabled = true;
        arenaEl.classList.remove('mg-defrag-burst-hot', 'mg-defrag-burst-warm');
        // Freeze, 1 s pause, then reveal (§10B.6).
        setT(() => finishFight(userScore, bossScore, cheatActive), 1000);
      }
    }, 100);
  }

  // ── WIN / LOSE (§10.7) ───────────────────────────────────────────────────────────────────
  function finishFight(userScore, bossScore, cheatActive) {
    const won = userScore > bossScore;
    const arenaEl = arena.querySelector('.mg-defrag-arena');
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
    if (cheatActive) fireAchievement('ach-boss-lose');
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

  // ── cheat-disable event listener (lobby UI only; never mid-fight) ──────────────────────────
  function onCheatDisable() {
    lobbyCheat = readCheat(actions);
    // Only refresh the lobby status if we're currently showing the lobby (not an active fight).
    if (arena.querySelector('.mg-defrag-lobby-btns') && !arena.querySelector('.mg-defrag-fight-on')) {
      const status = arena.querySelector('.mg-defrag-status');
      if (status) status.textContent = '⚙️ the cheat is gone. the next fight is fair.';
    }
  }
  on(window, 'fv:games:action', (event) => {
    const detail = event && event.detail || {};
    if (detail.stage === 1 && detail.action === 'cheat_disabled') onCheatDisable();
  });

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
