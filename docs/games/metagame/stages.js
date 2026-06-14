// Meta-game STAGES. Each stage = a grind goal + a unique boss set-piece that CHEATS and can only
// be beaten with one of the file-viewer's real features (the "defeat-feature"). Bosses are aligned
// to file types (see easter-egg-metagame design). Each stage is self-contained: intro/taunt/hint/
// victory dialog + a mountBoss(arena, { stage, onDefeat }) that owns its own arena, rules, and
// animation. Stages are built one at a time; this file grows as bosses land.
//
// A boss's mountBoss returns { destroy() } and calls onDefeat() when beaten.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Stage 1 — The Overwriter (file type: new-file). Defeat = create a new file that OVERWRITES
   his lock. He re-locks the path on a timer, so it's a real fight once you know the trick. ── */
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
    dead = true;
    clearInterval(relock);
    bossEl.classList.add('mg-boss-dead');
    msgEl.textContent = 'The Overwriter dissolves into null bytes.';
    setTimeout(onDefeat, 750);
  }
  // Cheat: he re-locks the path on a timer (only after you've started breaking locks).
  const relock = setInterval(() => {
    if (dead || locks <= 0 || locks >= stage.locks) return;
    locks++; drawLocks();
    msgEl.textContent = 'He RE-LOCKED the path! Overwrite faster.';
  }, stage.relockMs);

  arena.querySelector('.mg-boss-create').addEventListener('click', tryCreate);
  arena.querySelector('.mg-boss-file').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryCreate(); });
  return { destroy() { clearInterval(relock); } };
}

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

export const STAGES = [
  {
    n: 1,
    title: 'The Overwriter',
    goal: 100,                         // bits to accrue before the boss can be faced
    // VISUAL/ECONOMY config (data-driven — reorder or extend a stage by editing only this).
    resource: { name: 'bits', color: '#3fb950' },     // raw pixels are green data bits (IT theme)
    // The upgrade ladder. `click` tiers raise pixels-per-click; `auto` tiers paint pixels/sec.
    // Each owned tier is "assembled" from spent pixels into a little machine on the canvas.
    tiers: [
      { id: 'click', name: 'Overclock', icon: '⚡', type: 'click', amount: 1, base: 10, mult: 1.5, desc: '+1 pixel per click' },
      { id: 'cron', name: 'Cron job', icon: '⏱', type: 'auto', rate: 0.5, base: 50, mult: 1.15, desc: 'paints 0.5 pixels/s' },
      { id: 'thread', name: 'Worker thread', icon: '🧵', type: 'auto', rate: 3, base: 500, mult: 1.15, desc: 'paints 3 pixels/s' },
      { id: 'factory', name: 'Pixel factory', icon: '🏭', type: 'auto', rate: 20, base: 5000, mult: 1.15, desc: 'paints 20 pixels/s' },
      { id: 'forge', name: 'Machine forge', icon: '⚙', type: 'auto', rate: 120, base: 60000, mult: 1.15, desc: 'builds machines: 120 pixels/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'You found the Foundry. Compute bits, automate, grow your throughput.' },
      { speaker: 'SYS', text: 'But the pipeline ahead is blocked. Something locked it. Reach 100 bits and confront it.' },
    ],
    bossName: 'The Overwriter',
    bossIntro: [
      { speaker: 'The Overwriter', text: 'This path is MINE. I sealed it with locks you cannot delete.' },
      { speaker: 'The Overwriter', text: 'Delete one and I rewrite it. You will grind here forever. Hahaha.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'You can\'t DELETE his locks. But a lock is just a file…' },
      { speaker: '??? (a friendly daemon)', text: 'This app can create a NEW file that OVERWRITES one that already exists.' },
      { speaker: '??? (a friendly daemon)', text: 'Create a new file named exactly "' + 'boss.lock' + '" and tick OVERWRITE. Do it faster than he re-locks.' },
    ],
    victory: [
      { speaker: 'The Overwriter', text: 'No— my locks— you OVERWROTE them all?!' },
      { speaker: 'SYS', text: 'You beat him with the app itself. That is the only way anything here is won. Onward.' },
    ],
    lockName: 'boss.lock',
    locks: 3,
    relockMs: 7000,
    mountBoss: mountOverwriter,
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
];

export function stageByNumber(n) { return STAGES[n - 1] || null; }
