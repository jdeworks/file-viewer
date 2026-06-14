// Meta-game STAGES. Each stage = a grind goal + a unique boss set-piece that CHEATS and can only
// be beaten with one of the file-viewer's real features (the "defeat-feature"). Bosses are aligned
// to file types (see easter-egg-metagame design). Each stage is self-contained: intro/taunt/hint/
// victory dialog + a mountBoss(arena, { stage, onDefeat }) that owns its own arena, rules, and
// animation. Stages are built one at a time; this file grows as bosses land.
//
// A boss's mountBoss returns { destroy() } and calls onDefeat() when beaten.
//
// Stages 5-7 live in stages2.js; stages 8-10 in stages3.js.
import { STAGES2 } from './stages2.js';
import { STAGES3 } from './stages3.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── Stage 1 BigNum helper ─────────────────────────────────────────────────────────────────────
// Local inline stub so stages.js is importable before bignum.js (WP-S1-01) exists.
// BigNum shape: { m: number (1–9.999…), e: integer }  meaning m × 10^e.
// The real bignum.js is imported by s1economy.js and s1state.js; this stub is only used
// in Stage 1 unlock predicates (called at runtime, not at parse time).
function _gte(a, b) {
  if (!a || !b) return false;
  if (a.e !== b.e) return a.e > b.e;
  return a.m >= b.m;
}

// ── Stage 1 — The Defragmenter (idle-clicker / click-contest boss; WP-S1-11) ────────────────
// mountOverwriter is REPLACED by mountDefragmenter (boss1.js, WP-S1-11). The old function body
// is kept as a commented-out reference below. BOSS_AFTER is removed — entry is gated by
// canFightBoss() in the orchestrator (WP-S1-12). mountBoss is null until boss1.js lands.

// replaced by mountDefragmenter in WP-S1-11
/*
function mountOverwriter(arena, { stage, onDefeat }) {
  let locks = stage.locks;
  let dead = false;
  arena.innerHTML =
    '<div class="mg-boss mg-boss-overwriter">'
    + '<div class="mg-boss-sprite">▟◣◢▙</div>'
    + '<div class="mg-boss-name">' + esc(stage.bossName) + '</div>'
    + '<div class="mg-boss-locks" aria-label="locks"></div>'
    + '<div class="mg-boss-tool">'
    + '  <input class="mg-boss-file" placeholder="new file name…" aria-label="new file name">'
    + '  <label class="mg-boss-ow"><input type="checkbox" class="mg-boss-owchk"> overwrite</label>'
    + '  <button class="mg-boss-create" type="button">Create file</button>'
    + '</div>'
    + '<div class="mg-boss-msg" role="status"></div>'
    + '</div>';
  const bossEl = arena.querySelector('.mg-boss');
  const locksEl = arena.querySelector('.mg-boss-locks');
  const msgEl = arena.querySelector('.mg-boss-msg');
  const drawLocks = () => { locksEl.innerHTML = Array.from({ length: locks }, () => '<span class="mg-lock">🔒</span>').join(''); };
  drawLocks();
  function tryCreate() {
    if (dead) return;
    const name = arena.querySelector('.mg-boss-file').value.trim();
    const ow = arena.querySelector('.mg-boss-owchk').checked;
    if (name !== stage.lockName) { msgEl.textContent = 'Nothing happens — his lock has a specific name.'; return; }
    if (!ow) { msgEl.textContent = 'That file already exists. You must choose OVERWRITE.'; return; }
    if (locks <= 0) return;
    const els = locksEl.querySelectorAll('.mg-lock');
    const last = els[els.length - 1];
    if (last) last.classList.add('mg-lock-break');
    locks--;
    msgEl.textContent = 'You overwrote a lock!';
    setTimeout(() => { if (dead) return; drawLocks(); if (locks <= 0) defeat(); }, 320);
  }
  function defeat() {
    dead = true; clearInterval(relock);
    bossEl.classList.add('mg-boss-dead');
    msgEl.textContent = 'The Overwriter dissolves into null bytes.';
    setTimeout(onDefeat, 750);
  }
  const relock = setInterval(() => {
    if (dead || locks <= 0 || locks >= stage.locks) return;
    locks++; drawLocks();
    msgEl.textContent = 'He RE-LOCKED the path! Overwrite faster.';
  }, stage.relockMs);
  arena.querySelector('.mg-boss-create').addEventListener('click', tryCreate);
  arena.querySelector('.mg-boss-file').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryCreate(); });
  return { destroy() { clearInterval(relock); } };
}
*/

/* ── Stage 2 — Config Demon (file type: .ini/.env). Defeat = edit boss.ini to set invincible=false
   and drop his hp, then attack — but he REWRITES the config on a timer, so you must be fast. ── */
function mountConfigDemon(arena, { stage, onDefeat }) {
  let hp = stage.hp, invincible = true, dead = false;
  const INI_LOCKED = 'invincible = true\nhp = 9999';
  arena.innerHTML =
    '<div class="mg-boss mg-boss-demon">'
    + '<div class="mg-boss-sprite">≣◢◣≣</div>'
    + '<div class="mg-boss-name">' + esc(stage.bossName) + '</div>'
    + '<div class="mg-boss-hp">HP: <span class="mg-hp-n"></span> <span class="mg-inv"></span></div>'
    + '<div class="mg-ini-wrap"><textarea class="mg-ini" spellcheck="false" aria-label="boss.ini"></textarea></div>'
    + '<div class="mg-boss-tool"><button class="mg-ini-apply" type="button">Apply config</button>'
    + '<button class="mg-attack" type="button">Attack</button></div>'
    + '<div class="mg-boss-msg" role="status"></div>'
    + '</div>';
  const bossEl = arena.querySelector('.mg-boss');
  const ini = arena.querySelector('.mg-ini');
  const msgEl = arena.querySelector('.mg-boss-msg');
  ini.value = INI_LOCKED;
  function paint() {
    arena.querySelector('.mg-hp-n').textContent = hp;
    arena.querySelector('.mg-inv').textContent = invincible ? '🛡 invincible' : '⚔ vulnerable';
  }
  paint();
  function applyConfig() {
    if (dead) return;
    const v = ini.value.toLowerCase();
    const inv = /invincible\s*=\s*false/.test(v);
    invincible = !inv;
    msgEl.textContent = invincible ? 'Still invincible — set invincible = false.' : 'Config applied — he is vulnerable! Attack now.';
    paint();
  }
  function attack() {
    if (dead) return;
    if (invincible) { msgEl.textContent = 'He shrugs it off. Change boss.ini first.'; return; }
    hp--; msgEl.textContent = 'Hit! HP ' + hp;
    bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
    paint();
    if (hp <= 0) defeat();
  }
  function defeat() { dead = true; clearInterval(rw); bossEl.classList.add('mg-boss-dead'); msgEl.textContent = 'The Config Demon crashes.'; setTimeout(onDefeat, 750); }
  // Cheat: he rewrites boss.ini back to locked on a timer.
  const rw = setInterval(() => {
    if (dead) return;
    ini.value = INI_LOCKED; invincible = true; paint();
    msgEl.textContent = 'The Config Demon REWROTE boss.ini!';
  }, stage.rewriteMs);
  arena.querySelector('.mg-ini-apply').addEventListener('click', applyConfig);
  arena.querySelector('.mg-attack').addEventListener('click', attack);
  return { destroy() { clearInterval(rw); } };
}

/* ── Stage 3 — ASCII Awakening (transition: the game downshifts to terminal/ASCII). Boss = Kernel
   Panic: a corrupted terminal you fix with the right command; it re-panics on a timer. ── */
function mountKernelPanic(arena, { stage, onDefeat }) {
  let panics = stage.panics, dead = false;
  arena.innerHTML =
    '<div class="mg-boss mg-boss-kernel">'
    + '<pre class="mg-term"></pre>'
    + '<div class="mg-boss-name">' + esc(stage.bossName) + '</div>'
    + '<div class="mg-boss-tool"><input class="mg-cmd" spellcheck="false" placeholder="type a command…" aria-label="terminal command">'
    + '<button class="mg-cmd-run" type="button">Enter ⏎</button></div>'
    + '<div class="mg-boss-msg" role="status"></div>'
    + '</div>';
  const bossEl = arena.querySelector('.mg-boss');
  const term = arena.querySelector('.mg-term');
  const msgEl = arena.querySelector('.mg-boss-msg');
  const corrupt = () => '▓▒░ KERNEL PANIC ░▒▓\n' + Array.from({ length: 3 }, () => Array.from({ length: 22 }, (_, i) => '01<>{}[]/\\|=+*#'[(i * 7 + panics) % 14]).join('')).join('\n');
  const fixed = () => 'user@reality:~$ _\nsystem stable.\npanics remaining: ' + panics;
  const paint = () => { term.textContent = panics > 0 ? corrupt() : fixed(); };
  paint();
  function run() {
    if (dead) return;
    const cmd = arena.querySelector('.mg-cmd').value.trim().toLowerCase();
    if (cmd !== stage.command) { msgEl.textContent = '`' + cmd + '`: command not found.'; return; }
    panics--;
    msgEl.textContent = 'Reboot accepted. Panics left: ' + panics;
    paint();
    if (panics <= 0) defeat();
  }
  function defeat() { dead = true; clearInterval(rp); bossEl.classList.add('mg-boss-dead'); msgEl.textContent = 'The terminal goes quiet.'; setTimeout(onDefeat, 750); }
  const rp = setInterval(() => { if (dead || panics <= 0 || panics >= stage.panics) return; panics++; paint(); msgEl.textContent = 'It panicked AGAIN. Reboot faster.'; }, stage.repanicMs);
  arena.querySelector('.mg-cmd-run').addEventListener('click', run);
  arena.querySelector('.mg-cmd').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  return { destroy() { clearInterval(rp); } };
}

/* ── Stage 4 — Hex Hydra (binary/hex). Defeat = find his HP byte (reads FF) in the hex view and
   flip it to 00. He relocates the byte each hit (cheats). ── */
function mountHexHydra(arena, { stage, onDefeat }) {
  const N = 24;
  let hp = stage.hp, dead = false;
  const bytes = Array.from({ length: N }, () => (Math.floor(Math.random() * 240)).toString(16).padStart(2, '0').toUpperCase());
  let hpIdx = Math.floor(Math.random() * N);
  bytes[hpIdx] = 'FF';
  arena.innerHTML =
    '<div class="mg-boss mg-boss-hydra">'
    + '<div class="mg-boss-sprite">≈≋≈</div>'
    + '<div class="mg-boss-name">' + esc(stage.bossName) + ' — HP ' + hp + '</div>'
    + '<div class="mg-hex"></div>'
    + '<div class="mg-boss-msg" role="status">Click the byte that reads FF.</div>'
    + '</div>';
  const bossEl = arena.querySelector('.mg-boss');
  const hexEl = arena.querySelector('.mg-hex');
  const nameEl = arena.querySelector('.mg-boss-name');
  const msgEl = arena.querySelector('.mg-boss-msg');
  function draw() {
    hexEl.innerHTML = bytes.map((b, i) => '<button class="mg-hex-cell' + (i === hpIdx ? ' mg-hp-cell' : '') + '" type="button" data-i="' + i + '"' + (i === hpIdx ? ' data-hp="1"' : '') + '>' + b + '</button>').join('');
    hexEl.querySelectorAll('.mg-hex-cell').forEach((c) => c.addEventListener('click', () => hit(Number(c.dataset.i))));
    nameEl.textContent = stage.bossName + ' — HP ' + hp;
  }
  function hit(i) {
    if (dead) return;
    if (i !== hpIdx) { msgEl.textContent = 'That byte is just noise. Find the FF.'; return; }
    bytes[hpIdx] = '00'; hp--;
    bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
    if (hp <= 0) { draw(); return defeat(); }
    // Relocate the HP byte (cheat: it moves each phase).
    let j; do { j = Math.floor(Math.random() * N); } while (j === hpIdx);
    hpIdx = j; bytes[hpIdx] = 'FF';
    msgEl.textContent = 'Hit! It moved. Find the new FF. HP ' + hp;
    draw();
  }
  function defeat() { dead = true; bossEl.classList.add('mg-boss-dead'); msgEl.textContent = 'The Hydra flatlines: 00 00 00.'; setTimeout(onDefeat, 750); }
  draw();
  return { destroy() {} };
}

export const STAGES = [
  // ── Stage 1 — Bit Foundry (idle-clicker; boss = The Defragmenter, click-contest) ────────────
  // Economy, save/load (base64), and boss are implemented in WP-S1-04 through WP-S1-12.
  // This entry is the data-only config; runtime modules import it via stageByNumber(1).
  {
    n: 1,
    title: 'Bit Foundry',
    resource: { name: 'bits', color: '#3fb950' },     // green data bits (IT theme)

    // ── Tiers (8 sub-stages) — §2.1 ─────────────────────────────────────────────────────────
    // BigNum costs use { m, e } shape (m × 10^e). Unlock predicates use _gte() (local stub
    // above) which is safe to call before bignum.js exists. At runtime s1economy.js uses
    // the real BigNum ops from bignum.js.
    tiers: [
      // 1. Hand Cursor — free base tier; always unlocked; start owned:1
      {
        id: 's1-cursor', name: 'Hand Cursor', icon: '🖐', type: 'click_mult',
        base: { m: 0, e: 0 }, mult: 1, amount: 1,
        unlock: () => true,
        bell: null, grid: 'g0',
      },
      // 2. Multiplier — +1 clickPower per level; unlocks at totalBits ≥ 1
      {
        id: 's1-mult', name: 'Multiplier', icon: '✖', type: 'click_mult',
        base: { m: 100, e: 0 }, mult: 1.12, amount: 1,
        unlock: (state) => _gte(state.totalBits, { m: 1, e: 0 }),
        bell: 'bell-mult', grid: 'g1',
      },
      // 3. Bit Box — timed; 100 bits/cycle per owned; unlocks at bits ≥ 500
      {
        id: 's1-box', name: 'Bit Box', icon: '🧰', type: 'timed',
        base: { m: 500, e: 0 }, mult: 1.10, baseAmount: 100, duration_ms: 4000,
        unlock: (state) => _gte(state.bits, { m: 500, e: 0 }),
        bell: 'bell-box', grid: 'g2',
      },
      // 4. Signal Booster — timed; boosts Bit Box +10%/level; unlocks at owned[s1-box] ≥ 1
      {
        id: 's1-boost', name: 'Signal Booster', icon: '📡', type: 'timed',
        base: { m: 2.5, e: 3 }, mult: 1.10, baseAmount: 75, duration_ms: 5000,
        boost: { targetId: 's1-box', perLevelPct: 0.10 },
        unlock: (state) => (state.owned['s1-box'] || 0) >= 1,
        bell: 'bell-boost', grid: 'g3',
      },
      // 5. Core Cluster — timed; 500 bits/cycle per owned; unlocks at owned[s1-boost] ≥ 1
      {
        id: 's1-cluster', name: 'Core Cluster', icon: '🧊', type: 'timed',
        base: { m: 12, e: 3 }, mult: 1.08, baseAmount: 500, duration_ms: 8000,
        unlock: (state) => (state.owned['s1-boost'] || 0) >= 1,
        bell: 'bell-cluster', grid: 'g4',
      },
      // 6. Processing Array — passive; 0.5 bits/sec per owned; unlocks at owned[s1-cluster] ≥ 1
      {
        id: 's1-array', name: 'Processing Array', icon: '🛰', type: 'passive',
        base: { m: 60, e: 3 }, mult: 1.07, rate: 0.5,
        unlock: (state) => (state.owned['s1-cluster'] || 0) >= 1,
        bell: 'bell-array', grid: 'g5',
      },
      // 7. Neural Net — globalMult node: ×(1 + 0.25·level) to all timed payouts;
      //    unlocks at totalBits ≥ 1 000 000
      {
        id: 's1-neural', name: 'Neural Net', icon: '🧠', type: 'click_mult',
        globalMult: { perLevel: 0.25, targets: 'timed' },
        base: { m: 500, e: 3 }, mult: 1.06, amount: 0,
        unlock: (state) => _gte(state.totalBits, { m: 1, e: 6 }),
        bell: 'bell-neural', grid: 'g6',
      },
      // 8. Quantum Tap — multiplicative click mult: clickPower ×(1 + owned);
      //    unlocks at owned[s1-neural] ≥ 3
      {
        id: 's1-quantum', name: 'Quantum Tap', icon: '⚛', type: 'click_mult',
        base: { m: 5, e: 6 }, mult: 1.05, amount: 0, quantumMult: true,
        unlock: (state) => (state.owned['s1-neural'] || 0) >= 3,
        bell: 'bell-quantum', grid: 'g7',
      },
    ],

    // ── Managers (3) — §6.1 ─────────────────────────────────────────────────────────────────
    // hireCostBase = 10 × toNumber(managedTier.base). Scaling formula (hireCost(mgr, level) =
    // 10 × baseCost_of_managedTier × 1.15^level) is implemented in s1economy.js.
    managers: [
      { id: 'm-box',     name: 'Box Operator',    icon: '🛠', manages: 's1-box',     hireCostBase: 5000,   runCostPerSec: 20  },
      { id: 'm-signal',  name: 'Signal Engineer',  icon: '🔧', manages: 's1-boost',   hireCostBase: 25000,  runCostPerSec: 90  },
      { id: 'm-cluster', name: 'Cluster Foreman',  icon: '👷', manages: 's1-cluster', hireCostBase: 120000, runCostPerSec: 400 },
    ],

    // ── Boss ticket (§10.2) ──────────────────────────────────────────────────────────────────
    // canFightBoss = allSubStagesOwned AND gte(bits, bossTicket). Checked in orchestrator (WP-S1-12).
    bossTicket: { m: 1, e: 9 },   // 1 000 000 000 bits

    // ── Intro / boss dialog ──────────────────────────────────────────────────────────────────
    intro: [
      { speaker: 'SYS', text: 'Tap to get started.' },
    ],
    bossName: 'The Defragmenter',
    bossIntro: [
      { speaker: 'The Defragmenter', text: 'your bits are scattered. I\'ll reorganize them — into mine.' },
    ],
    hints: [
      // Hints are delivered as loss-gated taunts by the boss itself (§10C) and mirrored in the
      // bell (§7.3 bell-boss-hint-1/2/3). No separate hint dialog for Stage 1.
    ],
    victory: [
      // Fired as a bell line by the win handler (§10.7):
      { speaker: 'SYS', text: 'you beat The Defragmenter. it\'s still running in the background. just slower.' },
    ],

    // ── Boss mount (wired in WP-S1-11 when boss1.js exists) ─────────────────────────────────
    // mountBoss: mountDefragmenter  ← will be imported and set here in WP-S1-11.
    mountBoss: null,
  },
  {
    n: 2,
    title: 'Config Demon',
    goal: 250,
    resource: { name: 'cycles', color: '#4c9aff' },     // stage 2 reskins the resource (modular)
    tiers: [
      { id: 'click', name: 'Hotkey macro', icon: '⌨', type: 'click', amount: 2, base: 20, mult: 1.5, desc: '+2 cycles per click' },
      { id: 'daemon', name: 'Daemon', icon: '😈', type: 'auto', rate: 1, base: 80, mult: 1.15, desc: 'spins 1 cycle/s' },
      { id: 'service', name: 'System service', icon: '🛠', type: 'auto', rate: 6, base: 900, mult: 1.15, desc: 'spins 6 cycles/s' },
      { id: 'cluster', name: 'Cluster', icon: '🗄', type: 'auto', rate: 40, base: 9000, mult: 1.15, desc: 'spins 40 cycles/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'A new sector. The numbers run on cycles now. Same idea — generate, automate, grow.' },
      { speaker: 'SYS', text: 'A Config Demon squats in the settings. He has declared himself invincible. Reach 250 cycles.' },
    ],
    bossName: 'Config Demon',
    bossIntro: [
      { speaker: 'Config Demon', text: 'My power is DECLARED in boss.ini: invincible = true. It is LAW.' },
      { speaker: 'Config Demon', text: 'Edit it if you dare — I rewrite my own config faster than you can save. Hahaha.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'His invincibility is just a config flag. This app edits .ini/.env files…' },
      { speaker: '??? (a friendly daemon)', text: 'In boss.ini set "invincible = false", Apply, then Attack.' },
      { speaker: '??? (a friendly daemon)', text: 'He rewrites the file on a timer — edit, apply, and land your hits FAST.' },
    ],
    victory: [
      { speaker: 'Config Demon', text: 'You edited my own config against me… invincible = false… nooo…' },
      { speaker: 'SYS', text: 'Two down. Each boss falls to a real feature of this very app. Keep climbing.' },
    ],
    hp: 3,
    rewriteMs: 6000,
    mountBoss: mountConfigDemon,
  },
  {
    n: 3,
    title: 'ASCII Awakening',
    goal: 400,
    resource: { name: 'bytes', color: '#7ee787', theme: 'ascii' },     // the whole stage goes ASCII
    tiers: [
      { id: 'click', name: 'Keystroke', icon: '⌨', type: 'click', amount: 3, base: 30, mult: 1.5, desc: '+3 bytes per keystroke' },
      { id: 'pipe', name: 'Pipe', icon: '|', type: 'auto', rate: 2, base: 120, mult: 1.15, desc: 'streams 2 bytes/s' },
      { id: 'shell', name: 'Shell script', icon: '$', type: 'auto', rate: 12, base: 1400, mult: 1.15, desc: 'streams 12 bytes/s' },
      { id: 'kernel', name: 'Kernel module', icon: '#', type: 'auto', rate: 70, base: 16000, mult: 1.15, desc: 'streams 70 bytes/s' },
    ],
    intro: [
      { speaker: 'SYS', text: '>_ Graphics subsystem offline. We are dropping to a TERMINAL. Everything is text now.' },
      { speaker: 'SYS', text: 'Generate bytes the old way. Reach 400 — then deal with the panicking kernel ahead.' },
    ],
    bossName: 'Kernel Panic',
    bossIntro: [
      { speaker: 'Kernel Panic', text: '▓▒░ PANIC ░▒▓ I corrupt every frame. You cannot read me.' },
      { speaker: 'Kernel Panic', text: 'There is no GUI to save you here. Only the command line. Hahaha.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'This is a terminal now. Terminals take COMMANDS.' },
      { speaker: '??? (a friendly daemon)', text: 'A panicking kernel needs one thing: a reboot.' },
      { speaker: '??? (a friendly daemon)', text: 'Type "reboot" and hit Enter — repeatedly, before it panics again.' },
    ],
    victory: [
      { speaker: 'Kernel Panic', text: 'reboot… reboot… you kept rebooting me to death…' },
      { speaker: 'SYS', text: 'Stable. We stay in the terminal a while — it suits what comes next. Three down.' },
    ],
    command: 'reboot',
    panics: 3,
    repanicMs: 6000,
    mountBoss: mountKernelPanic,
  },
  {
    n: 4,
    title: 'Hex Hydra',
    goal: 600,
    resource: { name: 'bytes', color: '#7ee787', theme: 'ascii' },     // still in the terminal
    tiers: [
      { id: 'click', name: 'Nibble', icon: '⬢', type: 'click', amount: 4, base: 40, mult: 1.5, desc: '+4 bytes per click' },
      { id: 'dma', name: 'DMA channel', icon: '⇄', type: 'auto', rate: 3, base: 200, mult: 1.15, desc: 'streams 3 bytes/s' },
      { id: 'bus', name: 'Memory bus', icon: '≣', type: 'auto', rate: 18, base: 2200, mult: 1.15, desc: 'streams 18 bytes/s' },
      { id: 'core', name: 'Extra core', icon: '◉', type: 'auto', rate: 95, base: 24000, mult: 1.15, desc: 'streams 95 bytes/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Deeper in. Raw memory. A many-headed thing lives in the heap.' },
      { speaker: 'SYS', text: 'You will not out-DPS it. Read its bytes. Reach 600 and open its memory.' },
    ],
    bossName: 'Hex Hydra',
    bossIntro: [
      { speaker: 'Hex Hydra', text: 'My health is HIDDEN in my bytes. You will never find it.' },
      { speaker: 'Hex Hydra', text: 'And when you do — I move it. Good luck reading hex, meatware.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'Everything here is bytes. This app has a HEX view…' },
      { speaker: '??? (a friendly daemon)', text: 'His HP is the byte that reads FF. Everything else is noise.' },
      { speaker: '??? (a friendly daemon)', text: 'Flip the FF to 00. He relocates it each hit — find it again, fast.' },
    ],
    victory: [
      { speaker: 'Hex Hydra', text: 'FF… 00… you flipped my own bytes against me…' },
      { speaker: 'SYS', text: 'Four heads down. You read the machine. That is the whole point. Keep going.' },
    ],
    hp: 3,
    mountBoss: mountHexHydra,
  },
  ...STAGES2,
  ...STAGES3,
];

export function stageByNumber(n) { return STAGES[n - 1] || null; }
