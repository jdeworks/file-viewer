// Stages 5-7 of the meta-game. Each stage follows the same contract as stages.js:
// a grind goal + resource config + tiers + dialog arrays + mountBoss(arena, { stage, onDefeat })
// returning { destroy() }. Bosses cheat; defeat requires a simulated real app feature.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Stage 5 — The Time Lord (chess / save-scum). Defeat = edit his .sav file and load it 3×
   before he rewrites it every 6 seconds. HP: 3 loads. ── */
function mountTimeLord(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false;
  const SAV_LOCKED = 'turn = opponent\nscore = 99999\ncheat = 1';
  const SAV_WIN =    'turn = mine\nscore = 0\ncheat = 0';

  // Simple 4×6 chess-like board: Time Lord is winning (he has the queen + rooks, player has pawns)
  const BOARD = [
    ['♜','♛','♚','♜'],
    [' ',' ',' ',' '],
    [' ',' ',' ',' '],
    [' ',' ',' ',' '],
    ['♙','♙','♙','♙'],
    [' ',' ','♔',' '],
  ];
  const renderBoard = () =>
    '<table class="mg-chess">' +
    BOARD.map((row) => '<tr>' + row.map((c) => '<td>' + esc(c || ' ') + '</td>').join('') + '</tr>').join('') +
    '</table>';

  arena.innerHTML =
    '<div class="mg-boss mg-boss-timelord">' +
    '<div class="mg-boss-sprite">♚⌛♛</div>' +
    '<div class="mg-boss-name">' + esc(stage.bossName) + ' — Saves left: <span class="mg-tl-hp"></span></div>' +
    '<div class="mg-tl-board">' + renderBoard() + '</div>' +
    '<div class="mg-tl-label">save file: game.sav</div>' +
    '<div class="mg-ini-wrap"><textarea class="mg-ini mg-sav" spellcheck="false" aria-label="game.sav" rows="3"></textarea></div>' +
    '<div class="mg-boss-tool"><button class="mg-tl-load" type="button">Load Save</button></div>' +
    '<div class="mg-boss-msg" role="status">He controls the board. Edit game.sav and load it.</div>' +
    '</div>';

  const bossEl = arena.querySelector('.mg-boss');
  const savEl  = arena.querySelector('.mg-sav');
  const msgEl  = arena.querySelector('.mg-boss-msg');
  const hpEl   = arena.querySelector('.mg-tl-hp');
  savEl.value  = SAV_LOCKED;
  const paintHp = () => { hpEl.textContent = hp; };
  paintHp();

  function loadSave() {
    if (dead) return;
    const v = savEl.value.toLowerCase().replace(/\s/g, '');
    const ok = /turn=mine/.test(v) && /score=0/.test(v) && /cheat=0/.test(v);
    if (!ok) { msgEl.textContent = 'Save file still has his values — set turn=mine, score=0, cheat=0.'; return; }
    hp--;
    bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
    msgEl.textContent = 'Save loaded! His advantage crumbles. ' + hp + ' save(s) left.';
    paintHp();
    if (hp <= 0) defeat();
  }
  function defeat() {
    dead = true;
    clearInterval(rewrite);
    bossEl.classList.add('mg-boss-dead');
    msgEl.textContent = 'Timeline... corrupted. You save-scummed a TIME LORD?!';
    setTimeout(onDefeat, 750);
  }

  // Cheat: rewrites the .sav back to his values every 6 seconds.
  const rewrite = setInterval(() => {
    if (dead) return;
    savEl.value = SAV_LOCKED;
    msgEl.textContent = 'He REWROTE the save file! Edit it again, quickly.';
  }, stage.rewriteMs);

  arena.querySelector('.mg-tl-load').addEventListener('click', loadSave);
  return { destroy() { clearInterval(rewrite); } };
}

/* ── Stage 6 — The Phantom Server (network / offline cache). He regenerates HP from network
   calls. Cache him (go offline) to cut regen. Needs 2 caches total. HP: 30. ── */
function mountPhantomServer(arena, { stage, onDefeat }) {
  let hp = stage.hp, caches = 0, dead = false, offline = false, networkTimer = null, routeTimer = null;
  const MAX_HP = stage.hp;

  arena.innerHTML =
    '<div class="mg-boss mg-boss-phantom">' +
    '<div class="mg-boss-sprite">⬡⬡⬡</div>' +
    '<div class="mg-boss-name">' + esc(stage.bossName) + '</div>' +
    '<div class="mg-ph-hp">HP: <span class="mg-hp-n"></span><span class="mg-ph-regen"></span></div>' +
    '<div class="mg-ph-log" aria-label="network log"></div>' +
    '<div class="mg-boss-tool">' +
    '<button class="mg-ph-attack" type="button">Attack (-1 HP)</button>' +
    '<button class="mg-ph-cache" type="button">Cache Game (go offline)</button>' +
    '<button class="mg-ph-net" type="button" hidden>Network (re-route)</button>' +
    '</div>' +
    '<div class="mg-boss-msg" role="status">He regenerates while online. Cache him!</div>' +
    '</div>';

  const bossEl   = arena.querySelector('.mg-boss');
  const hpEl     = arena.querySelector('.mg-hp-n');
  const regenEl  = arena.querySelector('.mg-ph-regen');
  const logEl    = arena.querySelector('.mg-ph-log');
  const attackBtn = arena.querySelector('.mg-ph-attack');
  const cacheBtn  = arena.querySelector('.mg-ph-cache');
  const netBtn    = arena.querySelector('.mg-ph-net');
  const msgEl    = arena.querySelector('.mg-boss-msg');

  const paintHp = () => {
    hpEl.textContent = hp;
    regenEl.textContent = offline ? ' [CACHED — no regen]' : ' [online +3/tick]';
  };
  paintHp();

  const LOG_LINES = [
    'GET /boss/regen → 200 OK (+3 HP)',
    'POST /boss/shield → 204 No Content',
    'GET /boss/health-check → 200 OK (+3 HP)',
    'PUT /boss/armor/refresh → 200 OK (+3 HP)',
    'GET /boss/power-source → 200 OK',
  ];
  let logLine = 0;

  // Network regen: every 2s he heals 3 HP (capped at MAX_HP).
  networkTimer = setInterval(() => {
    if (dead) return;
    if (!offline) {
      hp = Math.min(MAX_HP, hp + 3);
      const line = document.createElement('div');
      line.className = 'mg-ph-log-line';
      line.textContent = LOG_LINES[logLine++ % LOG_LINES.length];
      logEl.appendChild(line);
      if (logEl.children.length > 5) logEl.removeChild(logEl.firstChild);
      paintHp();
    }
  }, stage.regenMs);

  function goOffline() {
    if (dead || offline) return;
    offline = true;
    caches++;
    cacheBtn.hidden = true;
    msgEl.textContent = 'CACHED! Regen stopped. Attack now! (' + caches + '/' + stage.needsCaches + ' caches used)';
    const logLine2 = document.createElement('div');
    logLine2.className = 'mg-ph-log-line mg-ph-log-cached';
    logLine2.textContent = '[OFFLINE] All network requests intercepted — 0 HP regen';
    logEl.appendChild(logLine2);
    paintHp();
    // After 15s he "switches routes" and can regen again if not yet defeated.
    if (caches < stage.needsCaches) {
      routeTimer = setTimeout(() => {
        if (dead) return;
        offline = false;
        netBtn.hidden = true;
        cacheBtn.hidden = false;
        msgEl.textContent = 'He switched routes — BACK ONLINE. Cache him again!';
        paintHp();
      }, 15000);
      netBtn.hidden = false;
      netBtn.disabled = false;
    }
  }

  function attack() {
    if (dead) return;
    hp--;
    bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
    paintHp();
    msgEl.textContent = 'Hit! HP: ' + hp;
    if (hp <= 0) defeat();
  }

  function defeat() {
    dead = true;
    clearInterval(networkTimer);
    clearTimeout(routeTimer);
    bossEl.classList.add('mg-boss-dead');
    msgEl.textContent = 'Request... timed out... 504 Gateway... [CONNECTION REFUSED]';
    setTimeout(onDefeat, 750);
  }

  attackBtn.addEventListener('click', attack);
  cacheBtn.addEventListener('click', goOffline);
  netBtn.addEventListener('click', () => {
    // Clicking the network button lets player simulate re-caching manually.
    goOffline();
  });

  return {
    destroy() {
      clearInterval(networkTimer);
      clearTimeout(routeTimer);
    },
  };
}

/* ── Stage 7 — The Duplicant (diff / compare). Two grids; find which is real by comparing them.
   Right guess → -1 boss HP; wrong → -1 player HP. 3 rounds. Player loses at 0 HP (retry). ── */
function mountDuplicant(arena, { stage, onDefeat }) {
  let bossHp = stage.bossHp, playerHp = stage.playerHp, dead = false, shuffleTimer = null;
  let realSide = 'left'; // 'left' or 'right'

  // 4×4 grids of text characters; one cell differs between real and clone.
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  function makeGrids() {
    // Build a base grid of random chars
    const base = Array.from({ length: 16 }, (_, i) => CHARS[(i * 3 + Math.floor(Math.random() * 5)) % CHARS.length]);
    // Pick a random cell and a subtle alternate char for the real grid
    const diffIdx = Math.floor(Math.random() * 16);
    let diffChar = base[diffIdx];
    // Subtle difference: pick a visually similar char
    const SIMILAR = { A: 'H', B: 'R', C: 'G', D: 'O', E: 'F', F: 'P', G: 'C', H: 'M', J: 'I', K: 'X', L: 'I', M: 'N', N: 'M', P: 'R', Q: 'O', R: 'P', S: 'Z', T: 'Y', U: 'V', V: 'U', W: 'V', X: 'K', Y: 'V', Z: 'S' };
    diffChar = SIMILAR[diffChar] || CHARS[(CHARS.indexOf(diffChar) + 1) % CHARS.length];
    realSide = Math.random() < 0.5 ? 'left' : 'right';
    return { base, diffIdx, diffChar, realSide };
  }

  let grids = makeGrids();
  let compared = false;

  function renderArena() {
    if (dead) return;
    compared = false;
    const { base, diffIdx, diffChar, realSide: rs } = grids;
    // Left grid = real if realSide==='left', else clone; right is the opposite.
    const leftGrid  = rs === 'left'  ? base.map((c, i) => i === diffIdx ? diffChar : c) : [...base];
    const rightGrid = rs === 'right' ? base.map((c, i) => i === diffIdx ? diffChar : c) : [...base];

    const renderGrid = (cells, side) =>
      '<div class="mg-dup-grid" data-side="' + side + '">' +
      cells.map((c, i) => '<span class="mg-dup-cell" data-i="' + i + '">' + esc(c) + '</span>').join('') +
      '</div>';

    arena.innerHTML =
      '<div class="mg-boss mg-boss-dupl">' +
      '<div class="mg-boss-sprite">◈◈</div>' +
      '<div class="mg-boss-name">' + esc(stage.bossName) + ' — Boss HP: <span class="mg-dup-bhp"></span> | Your HP: <span class="mg-dup-php"></span></div>' +
      '<div class="mg-dup-boards">' +
      '<div class="mg-dup-col"><div class="mg-dup-label">LEFT</div>' + renderGrid(leftGrid, 'left') + '</div>' +
      '<div class="mg-dup-col"><div class="mg-dup-label">RIGHT</div>' + renderGrid(rightGrid, 'right') + '</div>' +
      '</div>' +
      '<div class="mg-boss-tool">' +
      '<button class="mg-dup-compare" type="button">Compare</button>' +
      '<button class="mg-dup-atkleft" type="button">Attack LEFT</button>' +
      '<button class="mg-dup-atkright" type="button">Attack RIGHT</button>' +
      '</div>' +
      '<div class="mg-boss-msg" role="status">Two of him. One is real. Compare, then attack the correct side.</div>' +
      '</div>';

    const bossEl = arena.querySelector('.mg-boss');
    const bhpEl  = arena.querySelector('.mg-dup-bhp');
    const phpEl  = arena.querySelector('.mg-dup-php');
    const msgEl  = arena.querySelector('.mg-boss-msg');
    bhpEl.textContent = bossHp;
    phpEl.textContent = playerHp;

    arena.querySelector('.mg-dup-compare').addEventListener('click', () => {
      if (dead) return;
      compared = true;
      // Highlight the differing cell in both grids.
      arena.querySelectorAll('.mg-dup-cell[data-i="' + grids.diffIdx + '"]').forEach((el) => {
        el.classList.add('mg-dup-diff');
      });
      // Also subtly mark which grid is real.
      const realGrid = arena.querySelector('.mg-dup-grid[data-side="' + grids.realSide + '"]');
      if (realGrid) realGrid.classList.add('mg-dup-real-hint');
      msgEl.textContent = 'Diff found! The highlighted cell differs. The REAL one has the unique character. Attack it.';
    });

    function attack(side) {
      if (dead) return;
      clearTimeout(shuffleTimer);
      if (side === grids.realSide) {
        // Correct!
        bossHp--;
        bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
        if (bossHp <= 0) { return defeat(true); }
        grids = makeGrids();
        msgEl.textContent = 'Hit! Boss HP: ' + bossHp + '. He splits again...';
        setTimeout(renderArena, 500);
        scheduleShuffleTimer();
      } else {
        // Wrong guess!
        playerHp--;
        arena.classList.add('mg-hit'); setTimeout(() => arena.classList.remove('mg-hit'), 300);
        if (playerHp <= 0) { return defeat(false); }
        grids = makeGrids();
        msgEl.textContent = 'Wrong copy! Your HP: ' + playerHp + '. He reshuffles...';
        setTimeout(renderArena, 500);
        scheduleShuffleTimer();
      }
    }

    arena.querySelector('.mg-dup-atkleft').addEventListener('click', () => attack('left'));
    arena.querySelector('.mg-dup-atkright').addEventListener('click', () => attack('right'));
  }

  function scheduleShuffleTimer() {
    clearTimeout(shuffleTimer);
    shuffleTimer = setTimeout(() => {
      if (dead) return;
      grids = makeGrids();
      const msgEl = arena.querySelector('.mg-boss-msg');
      if (msgEl) msgEl.textContent = 'He reshuffled positions! Compare again.';
      renderArena();
      scheduleShuffleTimer();
    }, stage.shuffleMs);
  }

  function defeat(won) {
    dead = true;
    clearTimeout(shuffleTimer);
    if (won) {
      const bossEl = arena.querySelector('.mg-boss');
      if (bossEl) bossEl.classList.add('mg-boss-dead');
      const msgEl = arena.querySelector('.mg-boss-msg');
      if (msgEl) msgEl.textContent = 'You compared the two... found the diff... The real one is gone.';
      setTimeout(onDefeat, 750);
    } else {
      // Player lost — show retry.
      arena.innerHTML =
        '<div class="mg-boss">' +
        '<div class="mg-boss-msg">You were overwhelmed by copies. They were everywhere...</div>' +
        '<button class="mg-dup-retry" type="button">Retry</button>' +
        '</div>';
      arena.querySelector('.mg-dup-retry').addEventListener('click', () => {
        // Reset and remount.
        bossHp = stage.bossHp; playerHp = stage.playerHp; dead = false;
        grids = makeGrids();
        renderArena();
        scheduleShuffleTimer();
      });
    }
  }

  renderArena();
  scheduleShuffleTimer();

  return {
    destroy() {
      clearTimeout(shuffleTimer);
    },
  };
}

export const STAGES2 = [
  {
    n: 5,
    title: 'The Time Lord',
    goal: 800,
    resource: { name: 'packets', color: '#58a6ff' },
    tiers: [
      { id: 'click', name: 'Hotkey', icon: '⌨', type: 'click', amount: 5, base: 50, mult: 1.5, desc: '+5 packets per click' },
      { id: 'daemon', name: 'Daemon', icon: '😈', type: 'auto', rate: 1.5, base: 150, mult: 1.15, desc: 'routes 1.5 packets/s' },
      { id: 'scheduler', name: 'Scheduler', icon: '📅', type: 'auto', rate: 10, base: 2000, mult: 1.15, desc: 'routes 10 packets/s' },
      { id: 'lb', name: 'Load Balancer', icon: '⚖', type: 'auto', rate: 60, base: 28000, mult: 1.15, desc: 'routes 60 packets/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Packets now. You are routing through time itself. Generate, schedule, scale.' },
      { speaker: 'SYS', text: 'Something ancient waits at the end. It has seen every move you will make. Reach 800 packets.' },
    ],
    bossName: 'The Time Lord',
    bossIntro: [
      { speaker: 'The Time Lord', text: 'I have seen every move you will make. Every file you will create. Every save you will attempt.' },
      { speaker: 'The Time Lord', text: 'I have already won. That is simply recorded fact. Look at the board.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'Save file. Edit it. You know how this works by now.' },
      { speaker: '??? (a friendly daemon)', text: 'turn=mine, score=0, cheat=0. Load it. Three times.' },
      { speaker: '??? (a friendly daemon)', text: 'He rewrites. You re-edit. Be faster. That is all.' },
    ],
    victory: [
      { speaker: 'The Time Lord', text: 'You... save-scummed... a TIME LORD?! This was not in the timeline!' },
      { speaker: 'SYS', text: 'Five down. The Time Lord falls to the oldest trick: editing your own save file.' },
    ],
    hp: 3,
    rewriteMs: 6000,
    mountBoss: mountTimeLord,
  },
  {
    n: 6,
    title: 'The Phantom Server',
    goal: 1000,
    resource: { name: 'queries', color: '#e3a008' },
    tiers: [
      { id: 'click', name: 'Cache hit', icon: '💾', type: 'click', amount: 6, base: 60, mult: 1.5, desc: '+6 queries per click' },
      { id: 'worker', name: 'Worker', icon: '🧵', type: 'auto', rate: 2, base: 200, mult: 1.15, desc: 'fires 2 queries/s' },
      { id: 'cdn', name: 'CDN node', icon: '🌐', type: 'auto', rate: 14, base: 2800, mult: 1.15, desc: 'fires 14 queries/s' },
      { id: 'dc', name: 'Data center', icon: '🏢', type: 'auto', rate: 80, base: 36000, mult: 1.15, desc: 'fires 80 queries/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Queries now. The network is your resource. Cache, distribute, scale.' },
      { speaker: 'SYS', text: 'Something lurks in the infrastructure. It feeds on network traffic. Reach 1000 queries.' },
    ],
    bossName: 'The Phantom Server',
    bossIntro: [
      { speaker: 'The Phantom Server', text: 'I draw power from the infinite network. Every GET request heals me. Every ping is a feast.' },
      { speaker: 'The Phantom Server', text: 'Offline? There IS no offline. The network is everywhere. I am everywhere.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'He feeds on the network. Cut it.' },
      { speaker: '??? (a friendly daemon)', text: 'Cache button. Go offline. Regen dies. Attack.' },
      { speaker: '??? (a friendly daemon)', text: 'He reroutes after 15s. Cache him again. Two caches. You can do this.' },
    ],
    victory: [
      { speaker: 'The Phantom Server', text: 'Request... timed out... 504 Gateway... no... the network... [CONNECTION REFUSED]' },
      { speaker: 'SYS', text: 'Six down. The Phantom Server starved without his network feed. Onward.' },
    ],
    hp: 30,
    regenMs: 2000,
    needsCaches: 2,
    mountBoss: mountPhantomServer,
  },
  {
    n: 7,
    title: 'The Duplicant',
    goal: 1200,
    resource: { name: 'checksums', color: '#a371f7' },
    tiers: [
      { id: 'click', name: 'Hash', icon: '#', type: 'click', amount: 7, base: 70, mult: 1.5, desc: '+7 checksums per click' },
      { id: 'checksum', name: 'Checksum', icon: '∑', type: 'auto', rate: 3, base: 280, mult: 1.15, desc: 'hashes 3 checksums/s' },
      { id: 'mirror', name: 'Mirror', icon: '◫', type: 'auto', rate: 20, base: 4000, mult: 1.15, desc: 'hashes 20 checksums/s' },
      { id: 'raid', name: 'RAID array', icon: '▦', type: 'auto', rate: 100, base: 50000, mult: 1.15, desc: 'hashes 100 checksums/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Checksums now. Integrity is everything when you cannot tell what is real.' },
      { speaker: 'SYS', text: 'Something has duplicated itself. Multiple instances. Reach 1200 checksums to confront them.' },
    ],
    bossName: 'The Duplicant',
    bossIntro: [
      { speaker: 'The Duplicant', text: 'There are TWO of me. Which one is real? (Hint: neither.)' },
      { speaker: 'The Duplicant', text: 'Attack the wrong one and you pay the price. I will always be one step ahead.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'The diff reveals truth. One cell differs. Find it.' },
      { speaker: '??? (a friendly daemon)', text: 'Compare first. The real one carries the unique character. Attack that side.' },
      { speaker: '??? (a friendly daemon)', text: 'Wrong guess costs you HP. You know what Compare does. Use it.' },
    ],
    victory: [
      { speaker: 'The Duplicant', text: 'You compared the two... found the diff... which one was I...?' },
      { speaker: 'SYS', text: 'Seven down. Diff tools exist for a reason. The Duplicant is gone. Or is it.' },
    ],
    bossHp: 3,
    playerHp: 3,
    shuffleMs: 8000,
    mountBoss: mountDuplicant,
  },
];
