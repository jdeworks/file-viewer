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

export const STAGES = [
  {
    n: 1,
    title: 'The Overwriter',
    goal: 100,                         // bits to accrue before the boss can be faced
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
];

export function stageByNumber(n) { return STAGES[n - 1] || null; }
