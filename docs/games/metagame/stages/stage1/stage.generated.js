// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage1/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage1/stages2.js
var esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function mountTimeLord(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false;
  const SAV_LOCKED = "turn = opponent\nscore = 99999\ncheat = 1";
  const SAV_WIN = "turn = mine\nscore = 0\ncheat = 0";
  const BOARD = [
    ["♜", "♛", "♚", "♜"],
    [" ", " ", " ", " "],
    [" ", " ", " ", " "],
    [" ", " ", " ", " "],
    ["♙", "♙", "♙", "♙"],
    [" ", " ", "♔", " "]
  ];
  const renderBoard = () => '<table class="mg-chess">' + BOARD.map((row) => "<tr>" + row.map((c) => "<td>" + esc(c || " ") + "</td>").join("") + "</tr>").join("") + "</table>";
  arena.innerHTML = '<div class="mg-boss mg-boss-timelord"><div class="mg-boss-sprite">♚⌛♛</div><div class="mg-boss-name">' + esc(stage.bossName) + ' — Saves left: <span class="mg-tl-hp"></span></div><div class="mg-tl-board">' + renderBoard() + '</div><div class="mg-tl-label">save file: game.sav</div><div class="mg-ini-wrap"><textarea class="mg-ini mg-sav" spellcheck="false" aria-label="game.sav" rows="3"></textarea></div><div class="mg-boss-tool"><button class="mg-tl-load" type="button">Load Save</button></div><div class="mg-boss-msg" role="status">He controls the board. Edit game.sav and load it.</div></div>';
  const bossEl = arena.querySelector(".mg-boss");
  const savEl = arena.querySelector(".mg-sav");
  const msgEl = arena.querySelector(".mg-boss-msg");
  const hpEl = arena.querySelector(".mg-tl-hp");
  savEl.value = SAV_LOCKED;
  const paintHp = () => {
    hpEl.textContent = hp;
  };
  paintHp();
  function loadSave() {
    if (dead) return;
    const v = savEl.value.toLowerCase().replace(/\s/g, "");
    const ok = /turn=mine/.test(v) && /score=0/.test(v) && /cheat=0/.test(v);
    if (!ok) {
      msgEl.textContent = "Save file still has his values — set turn=mine, score=0, cheat=0.";
      return;
    }
    hp--;
    bossEl.classList.remove("mg-hit");
    void bossEl.offsetWidth;
    bossEl.classList.add("mg-hit");
    msgEl.textContent = "Save loaded! His advantage crumbles. " + hp + " save(s) left.";
    paintHp();
    if (hp <= 0) defeat();
  }
  function defeat() {
    dead = true;
    clearInterval(rewrite);
    bossEl.classList.add("mg-boss-dead");
    msgEl.textContent = "Timeline... corrupted. You save-scummed a TIME LORD?!";
    setTimeout(onDefeat, 750);
  }
  const rewrite = setInterval(() => {
    if (dead) return;
    savEl.value = SAV_LOCKED;
    msgEl.textContent = "He REWROTE the save file! Edit it again, quickly.";
  }, stage.rewriteMs);
  arena.querySelector(".mg-tl-load").addEventListener("click", loadSave);
  return { destroy() {
    clearInterval(rewrite);
  } };
}
function mountPhantomServer(arena, { stage, onDefeat }) {
  let hp = stage.hp, caches = 0, dead = false, offline = false, networkTimer = null, routeTimer = null;
  const MAX_HP = stage.hp;
  arena.innerHTML = '<div class="mg-boss mg-boss-phantom"><div class="mg-boss-sprite">⬡⬡⬡</div><div class="mg-boss-name">' + esc(stage.bossName) + '</div><div class="mg-ph-hp">HP: <span class="mg-hp-n"></span><span class="mg-ph-regen"></span></div><div class="mg-ph-log" aria-label="network log"></div><div class="mg-boss-tool"><button class="mg-ph-attack" type="button">Attack (-1 HP)</button><button class="mg-ph-cache" type="button">Cache Game (go offline)</button><button class="mg-ph-net" type="button" hidden>Network (re-route)</button></div><div class="mg-boss-msg" role="status">He regenerates while online. Cache him!</div></div>';
  const bossEl = arena.querySelector(".mg-boss");
  const hpEl = arena.querySelector(".mg-hp-n");
  const regenEl = arena.querySelector(".mg-ph-regen");
  const logEl = arena.querySelector(".mg-ph-log");
  const attackBtn = arena.querySelector(".mg-ph-attack");
  const cacheBtn = arena.querySelector(".mg-ph-cache");
  const netBtn = arena.querySelector(".mg-ph-net");
  const msgEl = arena.querySelector(".mg-boss-msg");
  const paintHp = () => {
    hpEl.textContent = hp;
    regenEl.textContent = offline ? " [CACHED — no regen]" : " [online +3/tick]";
  };
  paintHp();
  const LOG_LINES = [
    "GET /boss/regen → 200 OK (+3 HP)",
    "POST /boss/shield → 204 No Content",
    "GET /boss/health-check → 200 OK (+3 HP)",
    "PUT /boss/armor/refresh → 200 OK (+3 HP)",
    "GET /boss/power-source → 200 OK"
  ];
  let logLine = 0;
  networkTimer = setInterval(() => {
    if (dead) return;
    if (!offline) {
      hp = Math.min(MAX_HP, hp + 3);
      const line = document.createElement("div");
      line.className = "mg-ph-log-line";
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
    msgEl.textContent = "CACHED! Regen stopped. Attack now! (" + caches + "/" + stage.needsCaches + " caches used)";
    const logLine2 = document.createElement("div");
    logLine2.className = "mg-ph-log-line mg-ph-log-cached";
    logLine2.textContent = "[OFFLINE] All network requests intercepted — 0 HP regen";
    logEl.appendChild(logLine2);
    paintHp();
    if (caches < stage.needsCaches) {
      routeTimer = setTimeout(() => {
        if (dead) return;
        offline = false;
        netBtn.hidden = true;
        cacheBtn.hidden = false;
        msgEl.textContent = "He switched routes — BACK ONLINE. Cache him again!";
        paintHp();
      }, 15e3);
      netBtn.hidden = false;
      netBtn.disabled = false;
    }
  }
  function attack() {
    if (dead) return;
    hp--;
    bossEl.classList.remove("mg-hit");
    void bossEl.offsetWidth;
    bossEl.classList.add("mg-hit");
    paintHp();
    msgEl.textContent = "Hit! HP: " + hp;
    if (hp <= 0) defeat();
  }
  function defeat() {
    dead = true;
    clearInterval(networkTimer);
    clearTimeout(routeTimer);
    bossEl.classList.add("mg-boss-dead");
    msgEl.textContent = "Request... timed out... 504 Gateway... [CONNECTION REFUSED]";
    setTimeout(onDefeat, 750);
  }
  attackBtn.addEventListener("click", attack);
  cacheBtn.addEventListener("click", goOffline);
  netBtn.addEventListener("click", () => {
    goOffline();
  });
  return {
    destroy() {
      clearInterval(networkTimer);
      clearTimeout(routeTimer);
    }
  };
}
function mountDuplicant(arena, { stage, onDefeat }) {
  let bossHp = stage.bossHp, playerHp = stage.playerHp, dead = false, shuffleTimer = null;
  let realSide = "left";
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function makeGrids() {
    const base = Array.from({ length: 16 }, (_, i) => CHARS[(i * 3 + Math.floor(Math.random() * 5)) % CHARS.length]);
    const diffIdx = Math.floor(Math.random() * 16);
    let diffChar = base[diffIdx];
    const SIMILAR = { A: "H", B: "R", C: "G", D: "O", E: "F", F: "P", G: "C", H: "M", J: "I", K: "X", L: "I", M: "N", N: "M", P: "R", Q: "O", R: "P", S: "Z", T: "Y", U: "V", V: "U", W: "V", X: "K", Y: "V", Z: "S" };
    diffChar = SIMILAR[diffChar] || CHARS[(CHARS.indexOf(diffChar) + 1) % CHARS.length];
    realSide = Math.random() < 0.5 ? "left" : "right";
    return { base, diffIdx, diffChar, realSide };
  }
  let grids = makeGrids();
  let compared = false;
  function renderArena() {
    if (dead) return;
    compared = false;
    const { base, diffIdx, diffChar, realSide: rs } = grids;
    const leftGrid = rs === "left" ? base.map((c, i) => i === diffIdx ? diffChar : c) : [...base];
    const rightGrid = rs === "right" ? base.map((c, i) => i === diffIdx ? diffChar : c) : [...base];
    const renderGrid = (cells, side) => '<div class="mg-dup-grid" data-side="' + side + '">' + cells.map((c, i) => '<span class="mg-dup-cell" data-i="' + i + '">' + esc(c) + "</span>").join("") + "</div>";
    arena.innerHTML = '<div class="mg-boss mg-boss-dupl"><div class="mg-boss-sprite">◈◈</div><div class="mg-boss-name">' + esc(stage.bossName) + ' — Boss HP: <span class="mg-dup-bhp"></span> | Your HP: <span class="mg-dup-php"></span></div><div class="mg-dup-boards"><div class="mg-dup-col"><div class="mg-dup-label">LEFT</div>' + renderGrid(leftGrid, "left") + '</div><div class="mg-dup-col"><div class="mg-dup-label">RIGHT</div>' + renderGrid(rightGrid, "right") + '</div></div><div class="mg-boss-tool"><button class="mg-dup-compare" type="button">Compare</button><button class="mg-dup-atkleft" type="button">Attack LEFT</button><button class="mg-dup-atkright" type="button">Attack RIGHT</button></div><div class="mg-boss-msg" role="status">Two of him. One is real. Compare, then attack the correct side.</div></div>';
    const bossEl = arena.querySelector(".mg-boss");
    const bhpEl = arena.querySelector(".mg-dup-bhp");
    const phpEl = arena.querySelector(".mg-dup-php");
    const msgEl = arena.querySelector(".mg-boss-msg");
    bhpEl.textContent = bossHp;
    phpEl.textContent = playerHp;
    arena.querySelector(".mg-dup-compare").addEventListener("click", () => {
      if (dead) return;
      compared = true;
      arena.querySelectorAll('.mg-dup-cell[data-i="' + grids.diffIdx + '"]').forEach((el) => {
        el.classList.add("mg-dup-diff");
      });
      const realGrid = arena.querySelector('.mg-dup-grid[data-side="' + grids.realSide + '"]');
      if (realGrid) realGrid.classList.add("mg-dup-real-hint");
      msgEl.textContent = "Diff found! The highlighted cell differs. The REAL one has the unique character. Attack it.";
    });
    function attack(side) {
      if (dead) return;
      clearTimeout(shuffleTimer);
      if (side === grids.realSide) {
        bossHp--;
        bossEl.classList.remove("mg-hit");
        void bossEl.offsetWidth;
        bossEl.classList.add("mg-hit");
        if (bossHp <= 0) {
          return defeat(true);
        }
        grids = makeGrids();
        msgEl.textContent = "Hit! Boss HP: " + bossHp + ". He splits again...";
        setTimeout(renderArena, 500);
        scheduleShuffleTimer();
      } else {
        playerHp--;
        arena.classList.add("mg-hit");
        setTimeout(() => arena.classList.remove("mg-hit"), 300);
        if (playerHp <= 0) {
          return defeat(false);
        }
        grids = makeGrids();
        msgEl.textContent = "Wrong copy! Your HP: " + playerHp + ". He reshuffles...";
        setTimeout(renderArena, 500);
        scheduleShuffleTimer();
      }
    }
    arena.querySelector(".mg-dup-atkleft").addEventListener("click", () => attack("left"));
    arena.querySelector(".mg-dup-atkright").addEventListener("click", () => attack("right"));
  }
  function scheduleShuffleTimer() {
    clearTimeout(shuffleTimer);
    shuffleTimer = setTimeout(() => {
      if (dead) return;
      grids = makeGrids();
      const msgEl = arena.querySelector(".mg-boss-msg");
      if (msgEl) msgEl.textContent = "He reshuffled positions! Compare again.";
      renderArena();
      scheduleShuffleTimer();
    }, stage.shuffleMs);
  }
  function defeat(won) {
    dead = true;
    clearTimeout(shuffleTimer);
    if (won) {
      const bossEl = arena.querySelector(".mg-boss");
      if (bossEl) bossEl.classList.add("mg-boss-dead");
      const msgEl = arena.querySelector(".mg-boss-msg");
      if (msgEl) msgEl.textContent = "You compared the two... found the diff... The real one is gone.";
      setTimeout(onDefeat, 750);
    } else {
      arena.innerHTML = '<div class="mg-boss"><div class="mg-boss-msg">You were overwhelmed by copies. They were everywhere...</div><button class="mg-dup-retry" type="button">Retry</button></div>';
      arena.querySelector(".mg-dup-retry").addEventListener("click", () => {
        bossHp = stage.bossHp;
        playerHp = stage.playerHp;
        dead = false;
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
    }
  };
}
var STAGES2 = [
  {
    n: 5,
    title: "The Time Lord",
    goal: 800,
    resource: { name: "packets", color: "#58a6ff" },
    tiers: [
      { id: "click", name: "Hotkey", icon: "⌨", type: "click", amount: 5, base: 50, mult: 1.5, desc: "+5 packets per click" },
      { id: "daemon", name: "Daemon", icon: "😈", type: "auto", rate: 1.5, base: 150, mult: 1.15, desc: "routes 1.5 packets/s" },
      { id: "scheduler", name: "Scheduler", icon: "📅", type: "auto", rate: 10, base: 2e3, mult: 1.15, desc: "routes 10 packets/s" },
      { id: "lb", name: "Load Balancer", icon: "⚖", type: "auto", rate: 60, base: 28e3, mult: 1.15, desc: "routes 60 packets/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Packets now. You are routing through time itself. Generate, schedule, scale." },
      { speaker: "SYS", text: "Something ancient waits at the end. It has seen every move you will make. Reach 800 packets." }
    ],
    bossName: "The Time Lord",
    bossIntro: [
      { speaker: "The Time Lord", text: "I have seen every move you will make. Every file you will create. Every save you will attempt." },
      { speaker: "The Time Lord", text: "I have already won. That is simply recorded fact. Look at the board." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "Save file. Edit it. You know how this works by now." },
      { speaker: "??? (a friendly daemon)", text: "turn=mine, score=0, cheat=0. Load it. Three times." },
      { speaker: "??? (a friendly daemon)", text: "He rewrites. You re-edit. Be faster. That is all." }
    ],
    victory: [
      { speaker: "The Time Lord", text: "You... save-scummed... a TIME LORD?! This was not in the timeline!" },
      { speaker: "SYS", text: "Five down. The Time Lord falls to the oldest trick: editing your own save file." }
    ],
    hp: 3,
    rewriteMs: 6e3,
    mountBoss: mountTimeLord
  },
  {
    n: 6,
    title: "The Phantom Server",
    goal: 1e3,
    resource: { name: "queries", color: "#e3a008" },
    tiers: [
      { id: "click", name: "Cache hit", icon: "💾", type: "click", amount: 6, base: 60, mult: 1.5, desc: "+6 queries per click" },
      { id: "worker", name: "Worker", icon: "🧵", type: "auto", rate: 2, base: 200, mult: 1.15, desc: "fires 2 queries/s" },
      { id: "cdn", name: "CDN node", icon: "🌐", type: "auto", rate: 14, base: 2800, mult: 1.15, desc: "fires 14 queries/s" },
      { id: "dc", name: "Data center", icon: "🏢", type: "auto", rate: 80, base: 36e3, mult: 1.15, desc: "fires 80 queries/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Queries now. The network is your resource. Cache, distribute, scale." },
      { speaker: "SYS", text: "Something lurks in the infrastructure. It feeds on network traffic. Reach 1000 queries." }
    ],
    bossName: "The Phantom Server",
    bossIntro: [
      { speaker: "The Phantom Server", text: "I draw power from the infinite network. Every GET request heals me. Every ping is a feast." },
      { speaker: "The Phantom Server", text: "Offline? There IS no offline. The network is everywhere. I am everywhere." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "He feeds on the network. Cut it." },
      { speaker: "??? (a friendly daemon)", text: "Cache button. Go offline. Regen dies. Attack." },
      { speaker: "??? (a friendly daemon)", text: "He reroutes after 15s. Cache him again. Two caches. You can do this." }
    ],
    victory: [
      { speaker: "The Phantom Server", text: "Request... timed out... 504 Gateway... no... the network... [CONNECTION REFUSED]" },
      { speaker: "SYS", text: "Six down. The Phantom Server starved without his network feed. Onward." }
    ],
    hp: 30,
    regenMs: 2e3,
    needsCaches: 2,
    mountBoss: mountPhantomServer
  },
  {
    n: 7,
    title: "The Duplicant",
    goal: 1200,
    resource: { name: "checksums", color: "#a371f7" },
    tiers: [
      { id: "click", name: "Hash", icon: "#", type: "click", amount: 7, base: 70, mult: 1.5, desc: "+7 checksums per click" },
      { id: "checksum", name: "Checksum", icon: "∑", type: "auto", rate: 3, base: 280, mult: 1.15, desc: "hashes 3 checksums/s" },
      { id: "mirror", name: "Mirror", icon: "◫", type: "auto", rate: 20, base: 4e3, mult: 1.15, desc: "hashes 20 checksums/s" },
      { id: "raid", name: "RAID array", icon: "▦", type: "auto", rate: 100, base: 5e4, mult: 1.15, desc: "hashes 100 checksums/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Checksums now. Integrity is everything when you cannot tell what is real." },
      { speaker: "SYS", text: "Something has duplicated itself. Multiple instances. Reach 1200 checksums to confront them." }
    ],
    bossName: "The Duplicant",
    bossIntro: [
      { speaker: "The Duplicant", text: "There are TWO of me. Which one is real? (Hint: neither.)" },
      { speaker: "The Duplicant", text: "Attack the wrong one and you pay the price. I will always be one step ahead." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "The diff reveals truth. One cell differs. Find it." },
      { speaker: "??? (a friendly daemon)", text: "Compare first. The real one carries the unique character. Attack that side." },
      { speaker: "??? (a friendly daemon)", text: "Wrong guess costs you HP. You know what Compare does. Use it." }
    ],
    victory: [
      { speaker: "The Duplicant", text: "You compared the two... found the diff... which one was I...?" },
      { speaker: "SYS", text: "Seven down. Diff tools exist for a reason. The Duplicant is gone. Or is it." }
    ],
    bossHp: 3,
    playerHp: 3,
    shuffleMs: 8e3,
    mountBoss: mountDuplicant
  }
];

// ../../docs/games/metagame/stages/stage1/stages3.js
var esc2 = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function mountRedactor(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false;
  const PAGES = [
    { id: 1, title: "Page 1 — Terms of Engagement", content: "All combatants must comply with the established rules of engagement as set forth in this document. These terms are binding and enforceable." },
    { id: 2, title: "Page 2 — Operational Procedures", content: "Standard operating procedures apply. All personnel must follow protocol at all times. Deviations require written approval." },
    { id: 3, title: "Page 3 — EVIL PAGE", content: "⬛ REDACTED ⬛\n\nINVINCIBILITY DECREE\n\nBy the authority vested in THE REDACTOR, the bearer of this page is hereby declared INVINCIBLE. This decree is IRREVOCABLE and PERMANENT.\n\n⬛ REDACTED ⬛", evil: true }
  ];
  let pages = PAGES.map((p) => ({ ...p }));
  let activePage = 1;
  function hasEvilPage() {
    return pages.some((p) => p.evil);
  }
  function render() {
    if (dead) return;
    const shielded = hasEvilPage();
    const pageOpts = pages.map((p) => '<option value="' + p.id + '"' + (p.id === activePage ? " selected" : "") + ">" + esc2(p.title) + "</option>").join("");
    const currentPage = pages.find((p) => p.id === activePage) || pages[0];
    activePage = currentPage ? currentPage.id : pages[0] ? pages[0].id : 1;
    arena.innerHTML = '<div class="mg-boss mg-boss-redactor"><div class="mg-boss-sprite">📄📄📄</div><div class="mg-boss-name">' + esc2(stage.bossName) + ' — HP: <span class="mg-rd-hp"></span> <span class="mg-rd-shield"></span></div><div class="mg-rd-pages"><select class="mg-rd-sel" aria-label="page selector">' + pageOpts + '</select><button class="mg-rd-delete" type="button">Delete Page</button><button class="mg-rd-attack" type="button"' + (shielded ? " disabled" : "") + '>Attack</button></div><div class="mg-rd-content">' + esc2(currentPage ? currentPage.content : "").replace(/\n/g, "<br>") + '</div><div class="mg-boss-msg" role="status">' + (shielded ? "He is invincible while Page 3 exists. DELETE IT." : "Shield down! Attack!") + "</div></div>";
    const bossEl = arena.querySelector(".mg-boss");
    const hpEl = arena.querySelector(".mg-rd-hp");
    const shieldEl = arena.querySelector(".mg-rd-shield");
    const selEl = arena.querySelector(".mg-rd-sel");
    const delBtn = arena.querySelector(".mg-rd-delete");
    const atkBtn = arena.querySelector(".mg-rd-attack");
    const msgEl = arena.querySelector(".mg-boss-msg");
    const contentEl = arena.querySelector(".mg-rd-content");
    hpEl.textContent = hp;
    shieldEl.textContent = shielded ? "🛡 invincible" : "⚔ vulnerable";
    selEl.addEventListener("change", () => {
      activePage = Number(selEl.value);
      const p = pages.find((pg) => pg.id === activePage);
      if (p) contentEl.innerHTML = esc2(p.content).replace(/\n/g, "<br>");
    });
    delBtn.addEventListener("click", () => {
      if (dead) return;
      const sel = Number(selEl.value);
      const pageToDelete = pages.find((p) => p.id === sel);
      if (!pageToDelete) {
        msgEl.textContent = "No such page.";
        return;
      }
      if (pageToDelete.evil) {
        pages = pages.filter((p) => p.id !== sel);
        activePage = pages.length > 0 ? pages[0].id : 1;
        msgEl.textContent = "Page 3 deleted — DECREE VOID. His shield is down! ATTACK!";
        bossEl.classList.remove("mg-hit");
        void bossEl.offsetWidth;
        bossEl.classList.add("mg-hit");
        render();
      } else {
        msgEl.textContent = "That page is harmless. Delete the EVIL PAGE (Page 3).";
      }
    });
    atkBtn.addEventListener("click", () => {
      if (dead) return;
      if (hasEvilPage()) {
        msgEl.textContent = "He is invincible! Delete Page 3 first.";
        return;
      }
      hp--;
      bossEl.classList.remove("mg-hit");
      void bossEl.offsetWidth;
      bossEl.classList.add("mg-hit");
      hpEl.textContent = hp;
      msgEl.textContent = "Hit! HP: " + hp;
      if (hp <= 0) defeat();
    });
  }
  function defeat() {
    dead = true;
    clearInterval(addPage);
    const bossEl = arena.querySelector(".mg-boss");
    if (bossEl) bossEl.classList.add("mg-boss-dead");
    const msgEl = arena.querySelector(".mg-boss-msg");
    if (msgEl) msgEl.textContent = "Page 3 deleted... my DECREE is... void... [DOCUMENT CORRUPTED]";
    setTimeout(onDefeat, 750);
  }
  const addPage = setInterval(() => {
    if (dead) return;
    if (!hasEvilPage()) {
      pages.push({ id: 3, title: "Page 3 — EVIL PAGE", content: "⬛ REDACTED ⬛\n\nINVINCIBILITY DECREE\n\nBy the authority vested in THE REDACTOR, the bearer of this page is hereby declared INVINCIBLE.\n\n⬛ REDACTED ⬛", evil: true });
      activePage = 3;
      const msgEl = arena.querySelector(".mg-boss-msg");
      if (msgEl) msgEl.textContent = "He ADDED A NEW EVIL PAGE. Delete it again!";
      render();
    }
  }, stage.addPageMs);
  render();
  return { destroy() {
    clearInterval(addPage);
  } };
}
function mountQueryGolem(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false, lightUnlocked = false;
  const BASE_ROWS = [
    { id: 1, attribute: "armor", value: "9999" },
    { id: 2, attribute: "weakness", value: '"light"' },
    { id: 3, attribute: "regen", value: "10" },
    { id: 4, attribute: "name", value: '"Query Golem"' }
  ];
  let tableRows = BASE_ROWS.map((r) => ({ ...r }));
  function renderTable() {
    return '<table class="mg-sql-table"><thead><tr><th>id</th><th>attribute</th><th>value</th></tr></thead><tbody>' + tableRows.map((r) => "<tr><td>" + r.id + "</td><td>" + esc2(r.attribute) + "</td><td>" + esc2(r.value) + "</td></tr>").join("") + "</tbody></table>";
  }
  function render() {
    if (dead) return;
    arena.innerHTML = '<div class="mg-boss mg-boss-golem"><div class="mg-boss-sprite">▣▣▣</div><div class="mg-boss-name">' + esc2(stage.bossName) + ' — HP: <span class="mg-gl-hp"></span></div><div class="mg-gl-db"><div class="mg-gl-dblabel">TABLE: boss_stats</div>' + renderTable() + `</div><div class="mg-boss-tool"><textarea class="mg-gl-sql" spellcheck="false" rows="2" placeholder="SELECT value FROM boss_stats WHERE attribute = 'weakness'" aria-label="SQL query"></textarea><button class="mg-gl-exec" type="button">Execute Query</button></div><div class="mg-gl-result" hidden></div><button class="mg-gl-light" type="button" hidden>Use Light</button><div class="mg-boss-msg" role="status">I AM the database. You cannot read me without the right query.</div></div>`;
    const bossEl = arena.querySelector(".mg-boss");
    const hpEl = arena.querySelector(".mg-gl-hp");
    const sqlEl = arena.querySelector(".mg-gl-sql");
    const execBtn = arena.querySelector(".mg-gl-exec");
    const resultEl = arena.querySelector(".mg-gl-result");
    const lightBtn = arena.querySelector(".mg-gl-light");
    const msgEl = arena.querySelector(".mg-boss-msg");
    hpEl.textContent = hp;
    if (lightUnlocked) {
      resultEl.hidden = false;
      resultEl.textContent = 'Result: "light"';
      lightBtn.hidden = false;
    }
    function executeQuery() {
      if (dead) return;
      const q = sqlEl.value.trim().toLowerCase();
      if (!q) {
        msgEl.textContent = "Enter a query first.";
        return;
      }
      if (!/select/.test(q)) {
        msgEl.textContent = "SYNTAX ERROR: expected SELECT statement.";
        return;
      }
      if (!/from\s+boss_stats/.test(q)) {
        msgEl.textContent = "ERROR: No such table. Try: SELECT ... FROM boss_stats";
        return;
      }
      if (!/weakness/.test(q)) {
        const matchAttr = tableRows.find((r) => q.includes(r.attribute));
        if (matchAttr) {
          resultEl.hidden = false;
          resultEl.textContent = "Result: " + matchAttr.value;
          msgEl.textContent = "Query returned 1 row — but that is not the weakness.";
        } else {
          msgEl.textContent = "Query returned 0 rows. Try selecting attribute = 'weakness'";
          resultEl.hidden = false;
          resultEl.textContent = "Result: (0 rows)";
        }
        return;
      }
      lightUnlocked = true;
      resultEl.hidden = false;
      resultEl.textContent = 'Result: "light"';
      lightBtn.hidden = false;
      msgEl.textContent = 'Query returned: "light". His weakness is LIGHT. Use it!';
    }
    function useLight() {
      if (dead) return;
      hp--;
      bossEl.classList.remove("mg-hit");
      void bossEl.offsetWidth;
      bossEl.classList.add("mg-hit");
      hpEl.textContent = hp;
      msgEl.textContent = "LIGHT ATTACK! HP: " + hp;
      if (hp <= 0) defeat();
      else {
        lightUnlocked = false;
        lightBtn.hidden = true;
        resultEl.hidden = true;
        msgEl.textContent = "Hit! Query again to keep the light flowing. HP: " + hp;
      }
    }
    execBtn.addEventListener("click", executeQuery);
    sqlEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) executeQuery();
    });
    lightBtn.addEventListener("click", useLight);
  }
  function defeat() {
    dead = true;
    clearInterval(optimizeTimer);
    const bossEl = arena.querySelector(".mg-boss");
    if (bossEl) bossEl.classList.add("mg-boss-dead");
    const msgEl = arena.querySelector(".mg-boss-msg");
    if (msgEl) msgEl.textContent = "Query... returned... weakness... 0 rows remaining. [TABLE DROPPED]";
    setTimeout(onDefeat, 750);
  }
  const optimizeTimer = setInterval(() => {
    if (dead) return;
    const hasCounter = tableRows.some((r) => r.attribute === "counter");
    if (!hasCounter) {
      tableRows.push({ id: 5, attribute: "counter", value: '"dark"' });
    } else {
      const c = tableRows.find((r) => r.attribute === "counter");
      if (c) c.value = c.value === '"dark"' ? '"void"' : '"dark"';
    }
    lightUnlocked = false;
    const msgEl = arena.querySelector(".mg-boss-msg");
    if (msgEl) msgEl.textContent = "He OPTIMIZED his defenses! Re-query to find his weakness.";
    render();
  }, stage.optimizeMs);
  render();
  return { destroy() {
    clearInterval(optimizeTimer);
  } };
}
function mountArchivist(arena, { stage, onDefeat }) {
  let dead = false, corruptTimer = null;
  const KEY_FILES = [
    { name: "fragment-alpha.txt", correct: "OPEN", placeholder: "[corrupted-alpha]" },
    { name: "fragment-beta.txt", correct: "THE", placeholder: "[corrupted-beta]" },
    { name: "fragment-gamma.txt", correct: "GATE", placeholder: "[corrupted-gamma]" }
  ];
  const DECOY_FILES = [
    { name: "readme.txt", content: "This is the archive. Handle with care." },
    { name: "manifest.json", content: '{"version": "1.0", "status": "sealed"}' }
  ];
  const saved = { "fragment-alpha.txt": false, "fragment-beta.txt": false, "fragment-gamma.txt": false };
  const contents = {
    "fragment-alpha.txt": KEY_FILES[0].placeholder,
    "fragment-beta.txt": KEY_FILES[1].placeholder,
    "fragment-gamma.txt": KEY_FILES[2].placeholder
  };
  function allSaved() {
    return Object.values(saved).every(Boolean);
  }
  function render() {
    if (dead) return;
    const allFiles = [...KEY_FILES, ...DECOY_FILES];
    const fileList = allFiles.map((f) => {
      const isKey = KEY_FILES.find((k) => k.name === f.name);
      const isSaved = isKey ? saved[f.name] : false;
      const val = isKey ? contents[f.name] : f.content;
      return '<div class="mg-arc-file"><div class="mg-arc-fname">' + (isKey ? "&#128273; " : "") + esc2(f.name) + (isSaved ? ' <span class="mg-arc-check">&#10003;</span>' : "") + "</div>" + (isKey ? '<textarea class="mg-arc-txt" data-name="' + esc2(f.name) + '" rows="2" aria-label="' + esc2(f.name) + '" spellcheck="false">' + esc2(val) + '</textarea><button class="mg-arc-save" type="button" data-name="' + esc2(f.name) + '">Save File</button>' : '<div class="mg-arc-static">' + esc2(val) + "</div>") + "</div>";
    }).join("");
    const exportActive = allSaved();
    arena.innerHTML = '<div class="mg-boss mg-boss-archivist"><div class="mg-boss-sprite">🗂</div><div class="mg-boss-name">' + esc2(stage.bossName) + '</div><div class="mg-arc-folder">' + fileList + '</div><button class="mg-arc-export" type="button"' + (exportActive ? "" : " disabled") + '>Export Folder as ZIP</button><div class="mg-boss-msg" role="status">Assemble the key fragments: alpha=OPEN, beta=THE, gamma=GATE. Save each, then export.</div></div>';
    const bossEl = arena.querySelector(".mg-boss");
    const exportBtn = arena.querySelector(".mg-arc-export");
    const msgEl = arena.querySelector(".mg-boss-msg");
    arena.querySelectorAll(".mg-arc-save").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (dead) return;
        const fname = btn.dataset.name;
        const txt = arena.querySelector('.mg-arc-txt[data-name="' + fname + '"]');
        const keyFile = KEY_FILES.find((k) => k.name === fname);
        if (!keyFile || !txt) return;
        const val = txt.value.trim().toUpperCase();
        if (val === keyFile.correct) {
          saved[fname] = true;
          contents[fname] = txt.value.trim();
          msgEl.textContent = fname + " saved! " + Object.values(saved).filter(Boolean).length + "/3 fragments assembled.";
          bossEl.classList.remove("mg-hit");
          void bossEl.offsetWidth;
          bossEl.classList.add("mg-hit");
          render();
        } else {
          saved[fname] = false;
          msgEl.textContent = "Incorrect content for " + fname + ". (alpha=OPEN, beta=THE, gamma=GATE)";
        }
      });
    });
    exportBtn.addEventListener("click", () => {
      if (dead) return;
      if (!allSaved()) {
        msgEl.textContent = "All 3 key files must be saved correctly first!";
        return;
      }
      defeat();
    });
  }
  function defeat() {
    dead = true;
    clearInterval(corruptTimer);
    const bossEl = arena.querySelector(".mg-boss");
    if (bossEl) bossEl.classList.add("mg-boss-dead");
    const msgEl = arena.querySelector(".mg-boss-msg");
    if (msgEl) msgEl.textContent = "ALL FRAGMENTS ASSEMBLED — EXPORT COMPLETE. The exit opens. [ARCHIVE SEALED]";
    setTimeout(onDefeat, 750);
  }
  corruptTimer = setInterval(() => {
    if (dead) return;
    const savedKeys = KEY_FILES.filter((k) => saved[k.name]);
    if (savedKeys.length === 0) return;
    const target = savedKeys[Math.floor(Math.random() * savedKeys.length)];
    saved[target.name] = false;
    contents[target.name] = target.placeholder;
    const msgEl = arena.querySelector(".mg-boss-msg");
    if (msgEl) msgEl.textContent = "He CORRUPTED " + target.name + "! Re-enter the value and save it again.";
    render();
  }, stage.corruptMs);
  render();
  return { destroy() {
    clearInterval(corruptTimer);
  } };
}
var STAGES3 = [
  {
    n: 8,
    title: "The Redactor",
    goal: 1400,
    resource: { name: "renders", color: "#e5534b" },
    tiers: [
      { id: "click", name: "Render", icon: "🖨", type: "click", amount: 8, base: 80, mult: 1.5, desc: "+8 renders per click" },
      { id: "renderer", name: "Page renderer", icon: "📄", type: "auto", rate: 4, base: 320, mult: 1.15, desc: "renders 4 pages/s" },
      { id: "farm", name: "PDF farm", icon: "🏭", type: "auto", rate: 26, base: 5200, mult: 1.15, desc: "renders 26 pages/s" },
      { id: "spool", name: "Print spool", icon: "🖨", type: "auto", rate: 130, base: 78e3, mult: 1.15, desc: "renders 130 pages/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Renders now. Documents are power here. Generate, automate, scale." },
      { speaker: "SYS", text: "Something has decreed its own invincibility — in writing. On page 3. Reach 1400 renders." }
    ],
    bossName: "The Redactor",
    bossIntro: [
      { speaker: "The Redactor", text: "My power is DECREED on page 3. You cannot delete what is IN WRITING." },
      { speaker: "The Redactor", text: "The decree is permanent. Irrevocable. This app cannot touch a PDF." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "Page 3 is the decree. Delete it." },
      { speaker: "??? (a friendly daemon)", text: "Same as stage 7 — but the weapon is a page selector, not a diff. You know the pattern." },
      { speaker: "??? (a friendly daemon)", text: "He re-adds it. You already know the rhythm. Delete, attack, repeat." }
    ],
    victory: [
      { speaker: "The Redactor", text: "Page 3 deleted... my DECREE is... void... [DOCUMENT CORRUPTED]" },
      { speaker: "SYS", text: "Eight down. You deleted the page that gave him power. The right tool matters." }
    ],
    hp: 4,
    addPageMs: 9e3,
    mountBoss: mountRedactor
  },
  {
    n: 9,
    title: "The Query Golem",
    goal: 1600,
    resource: { name: "records", color: "#3fb950" },
    tiers: [
      { id: "click", name: "SELECT", icon: "🔍", type: "click", amount: 9, base: 90, mult: 1.5, desc: "+9 records per click" },
      { id: "index", name: "Index scan", icon: "📑", type: "auto", rate: 5, base: 450, mult: 1.15, desc: "scans 5 records/s" },
      { id: "join", name: "Table join", icon: "⇌", type: "auto", rate: 32, base: 7200, mult: 1.15, desc: "joins 32 records/s" },
      { id: "optimizer", name: "Query optimizer", icon: "⚡", type: "auto", rate: 160, base: 11e4, mult: 1.15, desc: "optimizes 160 records/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Records now. Structured data. The database is the last line of defense." },
      { speaker: "SYS", text: "A golem made of query plans guards the penultimate gate. Reach 1600 records." }
    ],
    bossName: "The Query Golem",
    bossIntro: [
      { speaker: "The Query Golem", text: "I AM the database. You cannot read me without the right query." },
      { speaker: "The Query Golem", text: "My weakness is in the table. But you will never find the right SELECT." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "One row. One weakness. You know how to SELECT it." },
      { speaker: "??? (a friendly daemon)", text: "SELECT value FROM boss_stats WHERE attribute = 'weakness'" },
      { speaker: "??? (a friendly daemon)", text: "He optimizes. You re-query. Light button reappears. You have done harder." }
    ],
    victory: [
      { speaker: "The Query Golem", text: "Query... returned... weakness... 0 rows remaining. [TABLE DROPPED]" },
      { speaker: "SYS", text: "Nine down. You read the database. The final gate is just ahead." }
    ],
    hp: 3,
    optimizeMs: 1e4,
    mountBoss: mountQueryGolem
  },
  {
    n: 10,
    title: "The Archivist",
    goal: 2e3,
    resource: { name: "archives", color: "#e3b341" },
    tiers: [
      { id: "click", name: "Compress", icon: "📦", type: "click", amount: 10, base: 100, mult: 1.5, desc: "+10 archives per click" },
      { id: "indexer", name: "File indexer", icon: "📂", type: "auto", rate: 6, base: 600, mult: 1.15, desc: "indexes 6 archives/s" },
      { id: "dedup", name: "Dedup", icon: "✂", type: "auto", rate: 40, base: 1e4, mult: 1.15, desc: "deduplicates 40 archives/s" },
      { id: "cold", name: "Cold storage", icon: "🧊", type: "auto", rate: 200, base: 16e4, mult: 1.15, desc: "archives 200/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Archives. Everything ends up here. The final resource. Collect 2000." },
      { speaker: "SYS", text: "The Archivist has sealed the exit inside a folder. He has shattered the key across three files. Assemble them." }
    ],
    bossName: "The Archivist",
    bossIntro: [
      { speaker: "The Archivist", text: "The key is SHATTERED across this folder. You cannot assemble what you cannot organize." },
      { speaker: "The Archivist", text: "Even if you fix the files — I will corrupt them again. The archive is MINE." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "The archive knows the way." }
    ],
    victory: [
      { speaker: "The Archivist", text: "ALL FRAGMENTS ASSEMBLED — EXPORT COMPLETE. The exit... it opens..." },
      { speaker: "SYS", text: "TEN. You organized the chaos. You exported the truth. The Archivist is sealed in his own archive. You win." }
    ],
    corruptMs: 12e3,
    mountBoss: mountArchivist
  }
];

// ../../docs/games/metagame/stages/stage1/bignum.js
var BASE = 1e3;
var LOG_BASE = 3;
var ZERO = Object.freeze({ m: 0, e: 0 });
function norm(a) {
  if (a.m === 0) return ZERO;
  let { m, e } = a;
  if (!isFinite(m)) return ZERO;
  let g = 0;
  while (m >= BASE && g++ < 400) {
    m /= BASE;
    e += LOG_BASE;
  }
  while (m < 1 && e > 0 && g++ < 800) {
    m *= BASE;
    e -= LOG_BASE;
  }
  return { m, e };
}
function fromNumber(n) {
  if (!isFinite(n) || n <= 0) return ZERO;
  let e = 0, m = n;
  while (m >= BASE) {
    m /= BASE;
    e += LOG_BASE;
  }
  return { m, e };
}
function toNumber(a) {
  if (a.m === 0) return 0;
  const result = a.m * Math.pow(10, a.e);
  return Math.min(result, Number.MAX_VALUE);
}
function gte(a, b) {
  if (a.m === 0) return b.m === 0;
  if (b.m === 0) return true;
  if (a.e !== b.e) return a.e > b.e;
  return a.m >= b.m;
}
function add(a, b) {
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  let hi = a, lo = b;
  if (b.e > a.e) {
    hi = b;
    lo = a;
  }
  const diff = hi.e - lo.e;
  if (diff > 48) return hi;
  const m = hi.m + lo.m / Math.pow(10, diff);
  return norm({ m, e: hi.e });
}
function sub(a, b) {
  if (b.m === 0) return a;
  if (gte(b, a)) return ZERO;
  const diff = a.e - b.e;
  if (diff > 48) return a;
  const m = a.m - b.m / Math.pow(10, diff);
  return norm({ m, e: a.e });
}
function mulScalar(a, k) {
  if (a.m === 0 || k === 0) return ZERO;
  return norm({ m: a.m * k, e: a.e });
}
function suffix(e) {
  if (e === 0) return "";
  const tier = e / 3;
  if (tier <= 4) return ["K", "M", "B", "T"][tier - 1];
  const k = tier - 5;
  const a = Math.floor(k / 26), b = k % 26;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}
function toDisplay(a) {
  if (a.m === 0) return "0";
  if (a.e === 0) return (Math.floor(a.m * 10) / 10).toString().replace(/\.0$/, "");
  return a.m.toFixed(2) + suffix(a.e);
}
var toStore = (a) => ({ m: a.m, e: a.e });
var fromStore = (o) => o && typeof o.m === "number" ? norm(o) : ZERO;
function assert(cond, msg) {
  if (!cond) throw new Error("BigNum assertion failed: " + msg);
}
function approxEq(x, y, tol = 1e-9) {
  if (x === 0 && y === 0) return true;
  return Math.abs(x - y) / (Math.abs(x) + Math.abs(y) + 1e-300) < tol;
}
function runTests() {
  {
    const x = { m: 999.9, e: 3 };
    const y = { m: 200, e: 0 };
    const result = add(x, y);
    assert(result.e === 6, "add tier-cross: e should be 6 (M), got " + result.e);
    assert(approxEq(result.m, 1.0001, 1e-6), "add tier-cross: m should be ~1.0001, got " + result.m);
    assert(toDisplay(result) === "1.00M", 'add tier-cross: display should be "1.00M", got ' + toDisplay(result));
  }
  {
    const a = fromNumber(500);
    const b = fromNumber(1e3);
    const result = sub(a, b);
    assert(result.m === 0 && result.e === 0, "sub clamp: expected ZERO, got m=" + result.m + " e=" + result.e);
    const c = fromNumber(42);
    const d = fromNumber(42);
    const result2 = sub(c, d);
    assert(result2.m === 0, "sub equal: expected ZERO");
    assert(gte(b, a) === true, "gte(b,a) with b>a should be true");
    assert(gte(a, b) === false, "gte(a,b) with a<b should be false");
  }
  {
    const z1 = fromNumber(0);
    assert(z1.m === 0 && z1.e === 0, "fromNumber(0) should be ZERO");
    const z2 = fromNumber(Infinity);
    assert(z2.m === 0 && z2.e === 0, "fromNumber(Infinity) should be ZERO");
    const z3 = fromNumber(-5);
    assert(z3.m === 0 && z3.e === 0, "fromNumber(-5) should be ZERO");
  }
  {
    const a = { m: 500, e: 3 };
    const result = mulScalar(a, 2);
    assert(result.e === 6, "norm exact 1000: e should be 6, got " + result.e);
    assert(approxEq(result.m, 1, 1e-12), "norm exact 1000: m should be 1.0, got " + result.m);
  }
  {
    const big = { m: 1.5, e: 60 };
    const small = { m: 1, e: 0 };
    const result = add(big, small);
    assert(result.e === 60, "diff>48 cutoff: e should be 60, got " + result.e);
    assert(approxEq(result.m, 1.5, 1e-12), "diff>48 cutoff: m should be 1.5, got " + result.m);
    const big2 = { m: 1, e: 48 };
    const small2 = { m: 1, e: 0 };
    const result2 = add(big2, small2);
    assert(result2.e === 48, "diff=48 boundary: e should still be 48, got " + result2.e);
    assert(result2.m >= 1, "diff=48 boundary: m should be >= 1.0, got " + result2.m);
    const big3 = { m: 1, e: 12 };
    const small3 = { m: 1, e: 0 };
    const result3 = add(big3, small3);
    assert(result3.m > 1, "diff=12 should be added, m should be > 1.0, got " + result3.m);
  }
  {
    assert(suffix(0) === "", 'suffix(0) should be ""');
    assert(suffix(3) === "K", 'suffix(3) should be "K"');
    assert(suffix(6) === "M", 'suffix(6) should be "M"');
    assert(suffix(9) === "B", 'suffix(9) should be "B"');
    assert(suffix(12) === "T", 'suffix(12) should be "T"');
    assert(suffix(15) === "aa", 'suffix(15) should be "aa"');
    assert(suffix(18) === "ab", 'suffix(18) should be "ab"');
    assert(suffix(90) === "az", 'suffix(90) should be "az"');
    assert(suffix(93) === "ba", 'suffix(93) should be "ba"');
  }
  {
    assert(toDisplay(ZERO) === "0", 'toDisplay(ZERO) should be "0"');
    assert(toDisplay(fromNumber(5)) === "5", 'toDisplay(5) should be "5"');
    assert(toDisplay(fromNumber(5.5)) === "5.5", 'toDisplay(5.5) should be "5.5"');
    const kval = norm({ m: 3.14159, e: 3 });
    assert(toDisplay(kval) === "3.14K", 'toDisplay(3.14159K) should be "3.14K"');
  }
  {
    const orig = fromNumber(12345678);
    const stored = toStore(orig);
    const loaded = fromStore(stored);
    assert(approxEq(toNumber(orig), toNumber(loaded), 1e-9), "toStore/fromStore round-trip failed");
    const bad = fromStore(null);
    assert(bad.m === 0, "fromStore(null) should be ZERO");
    const bad2 = fromStore({ x: 1 });
    assert(bad2.m === 0, "fromStore({x:1}) should be ZERO");
  }
}
try {
  runTests();
  console.log("[bignum] All tests passed.");
} catch (e) {
  console.error("[bignum] TEST FAILED:", e.message);
}

// ../../docs/games/metagame/stages/stage1/boss1-data.js
var TAUNTS = {
  lobby: [
    "scattered bits. how careless. shall we begin?",
    "I have all the time in the world. and all of your bits.",
    "I am The Defragmenter. fragmentation is… temporary.",
    "press Fight whenever you're ready to lose."
  ],
  general: [
    "you call that clicking?",
    "beep boop. I win again.",
    "your bits are mine now.",
    "I've been defragging longer than you've existed.",
    "don't worry, I'll put your bits in order. my order."
  ],
  hint: [
    "you can out-tap me. it just takes real focus — or you could make it easier on yourself. there's a file you can edit, somewhere you can look. this window won't help you.",
    "a file tunes how hard I hit. Overwriter.frag — CHEAT=true. flip it to false and I go easy on you. …not that you would.",
    "still losing? the examples folder. Overwriter.frag. CHEAT=false. I'm only saying it so you DON'T do it.",
    "open Overwriter.frag, set CHEAT=false, fight me again. there. now it's easy."
  ],
  burstCheat: [
    "look at this box I found! 📦",
    "oh would you look at that, another box! 📦",
    "I just love finding these lying around."
  ],
  burstNormal: [
    "I'm on fire! 🔥",
    "is it getting hot in here?"
  ],
  lossGated: [
    { atLosses: 3, text: "come back any time. I'll be here. always." },
    { atLosses: 5, text: "you seem frustrated. have you tried… looking around? no reason." },
    { atLosses: 7, text: "I am so glad nobody can touch me, The Defragmenter. so glad." },
    { atLosses: 10, text: "there is nothing in the examples folder that could help you. nothing at all. don't look." },
    { atLosses: 12, text: "even if someone had hidden something in a file somewhere… hypothetically… you'd never find it." },
    { atLosses: 15, text: "CHEAT? what CHEAT? I have no idea what a CHEAT= line is. stop looking at me." }
  ],
  win: [
    "this is… unexpected. my boxes aren't working. who did this.",
    "I'll be back. after a full defrag."
  ],
  loss: [
    "better luck next defrag.",
    "and stay defragged.",
    "your bits have been reorganized. you're welcome."
  ]
};
var pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
var esc3 = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function readCheat(actions) {
  if (actions && typeof actions.hasAction === "function") {
    return !actions.hasAction(1, "cheat_disabled");
  }
  return true;
}

// ../../docs/games/metagame/stages/stage1/boss1-style.js
var STYLE_ID = "mg-defrag-style";
function injectStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
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

// ../../docs/games/metagame/stages/stage1/boss-sim.js
var FIGHT_MS = 2e4;
var BURST_MS = 800;
function fightParams(cheatActive) {
  return cheatActive ? { shadow: 0.8, floorWeight: 0.35, floorMs: (r) => Math.max(420, r * 1.3), burstCount: 3, burstWeight: 0.8 } : { shadow: 0.62, floorWeight: 0.3, floorMs: (r) => Math.max(320, r * 1.5), burstCount: 2, burstWeight: 1 };
}
function makeBurstSchedule(seed, cheatActive) {
  let s = seed % 1e3 + 2654435769;
  function rand() {
    s |= 0;
    s = s + 2654435769 | 0;
    let t = Math.imul(s ^ s >>> 16, 569420461);
    t = Math.imul(t ^ t >>> 15, 1935289751);
    return ((t ^ t >>> 15) >>> 0) / 4294967296;
  }
  const N = cheatActive ? rand() < 0.5 ? 3 : 4 : rand() < 0.5 ? 2 : 3;
  const bursts = [];
  for (let i = 0; i < N; i++) {
    let start, tries = 0;
    do {
      start = Math.floor(rand() * (FIGHT_MS - 2e3)) + 1e3;
      tries++;
    } while (tries < 20 && bursts.some((b) => Math.abs(b.start - start) < BURST_MS));
    bursts.push({ start, end: start + BURST_MS, fired: 0 });
  }
  return bursts.sort((a, b) => a.start - b.start);
}
function simulateFight({ cheatActive, tapsPerSec = 10, seed = 1 } = {}) {
  const p = fightParams(cheatActive);
  const bursts = makeBurstSchedule(seed, cheatActive);
  const tapInterval = 1e3 / Math.max(1e-3, tapsPerSec);
  let userScore = 0, bossAcc = 0, lastFloor = 0, nextTapAt = 0;
  let tapTimes = [];
  for (let now = 0; now <= FIGHT_MS; now += 100) {
    while (nextTapAt <= now && nextTapAt <= FIGHT_MS) {
      userScore += 1;
      bossAcc += p.shadow;
      tapTimes.push(nextTapAt);
      tapTimes = tapTimes.filter((t) => nextTapAt - t < 3e3);
      nextTapAt += tapInterval;
    }
    const userRateMs = tapTimes.length > 1 ? (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1) : 999;
    if (now - lastFloor >= p.floorMs(userRateMs)) {
      bossAcc += p.floorWeight;
      lastFloor = now;
    }
    for (const b of bursts) {
      if (now >= b.start && now < b.end) {
        const want = Math.min(p.burstCount, Math.floor((now - b.start) / (BURST_MS / p.burstCount)) + 1);
        while (b.fired < want) {
          bossAcc += p.burstWeight;
          b.fired++;
        }
      }
    }
  }
  const bossScore = Math.floor(bossAcc);
  return { won: userScore > bossScore, userScore, bossScore, cheatActive };
}

// ../../docs/games/metagame/stages/stage1/boss1-fight.js
function makeFight({ arena, actions, setT, setI, clearTimer, on, onFinish }) {
  return function startFight() {
    const cheatActive = readCheat(actions);
    const p = fightParams(cheatActive);
    const bursts = makeBurstSchedule(Date.now(), cheatActive);
    let userScore = 0, bossScore = 0, bossAcc = 0;
    let tapTimes = [];
    let lastFloorTick = 0;
    const fightStart = Date.now();
    let fightActive = true;
    let activeBurstKey = null;
    arena.innerHTML = '<div class="mg-defrag-arena mg-defrag-fight-on mg-fade-in"><div class="mg-defrag-header">THE DEFRAGMENTER</div><div class="mg-defrag-taunt-wrap"><div class="boss-taunt"><span class="boss-taunt-avatar">⚙️</span><div class="boss-taunt-bubble"></div></div></div><div class="mg-defrag-scores"><div class="mg-defrag-side mg-defrag-user"><div class="mg-defrag-label">YOU</div><div class="mg-defrag-score" id="user-score">0</div><div class="mg-defrag-bar user-bar"></div></div><div class="mg-defrag-timer">20.0s</div><div class="mg-defrag-side mg-defrag-boss"><div class="mg-defrag-label">BOSS</div><div class="mg-defrag-score" id="boss-score">0</div><div class="mg-defrag-bar boss-bar"></div></div></div><button class="mg-defrag-tap" type="button">TAP TAP TAP</button><div class="mg-defrag-status"></div></div>';
    const arenaEl = arena.querySelector(".mg-defrag-arena");
    const userEl = arena.querySelector("#user-score");
    const bossEl = arena.querySelector("#boss-score");
    const userBar = arena.querySelector(".user-bar");
    const bossBar = arena.querySelector(".boss-bar");
    const timerEl = arena.querySelector(".mg-defrag-timer");
    const statusEl = arena.querySelector(".mg-defrag-status");
    const bubble = arena.querySelector(".boss-taunt-bubble");
    const tapBtn = arena.querySelector(".mg-defrag-tap");
    const showTaunt = (text) => {
      if (bubble) bubble.textContent = text;
    };
    showTaunt(pick(TAUNTS.general));
    function updateDisplay() {
      userEl.textContent = String(userScore);
      bossEl.textContent = String(bossScore);
      const max = Math.max(userScore, bossScore, 1);
      userBar.style.setProperty("--w", 100 * userScore / max + "%");
      bossBar.style.setProperty("--w", 100 * bossScore / max + "%");
    }
    function onTap() {
      if (!fightActive) return;
      userScore += 1;
      const now = Date.now();
      bossAcc += p.shadow;
      bossScore = Math.floor(bossAcc);
      tapTimes.push(now);
      tapTimes = tapTimes.filter((t) => now - t < 3e3);
      updateDisplay();
    }
    on(tapBtn, "click", onTap);
    const tickId = setI(() => {
      const now = Date.now();
      const elapsed = now - fightStart;
      const remaining = Math.max(0, FIGHT_MS - elapsed);
      timerEl.textContent = (remaining / 1e3).toFixed(1) + "s";
      const userRateMs = tapTimes.length > 1 ? (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1) : 999;
      const bossFloorMs = p.floorMs(userRateMs);
      if (now - lastFloorTick >= bossFloorMs) {
        bossAcc += p.floorWeight;
        bossScore = Math.floor(bossAcc);
        lastFloorTick = now;
      }
      const burst = bursts.find((b) => elapsed >= b.start && elapsed < b.end);
      const key = burst ? burst.start : null;
      if (key !== activeBurstKey) {
        arenaEl.classList.remove("mg-defrag-burst-hot", "mg-defrag-burst-warm");
        if (burst) {
          arenaEl.classList.add(cheatActive ? "mg-defrag-burst-hot" : "mg-defrag-burst-warm");
          statusEl.textContent = cheatActive ? "🔥 the Defragmenter surges…" : "the Defragmenter surges…";
          showTaunt(pick(cheatActive ? TAUNTS.burstCheat : TAUNTS.burstNormal));
        } else {
          statusEl.textContent = "";
        }
        activeBurstKey = key;
      }
      if (burst) {
        const autoCount = p.burstCount;
        const autoWeight = p.burstWeight;
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
        clearTimer(tickId);
        tapBtn.disabled = true;
        arenaEl.classList.remove("mg-defrag-burst-hot", "mg-defrag-burst-warm");
        setT(() => onFinish(userScore, bossScore, cheatActive), 1e3);
      }
    }, 100);
  };
}

// ../../docs/games/metagame/stages/stage1/boss1.js
var DEFAULT_TICKET = { m: 1, e: 9 };
function mountDefragmenter(arena, opts = {}) {
  const { stage, onDefeat } = opts;
  const state = opts.state || {};
  const save = typeof opts.save === "function" ? opts.save : () => {
  };
  const checkMessages2 = typeof opts.checkMessages === "function" ? opts.checkMessages : () => {
  };
  const bellLoad2 = typeof opts.bellLoad === "function" ? opts.bellLoad : () => ({});
  const bellAdd2 = typeof opts.bellAdd === "function" ? opts.bellAdd : () => {
  };
  const actions = opts.actions || null;
  const ticket = opts.stage && opts.stage.bossTicket || DEFAULT_TICKET;
  const halfTicket = mulScalar(ticket, 0.5);
  const canPay = (price) => gte(state.bits || { m: 0, e: 0 }, price);
  const pay = (price) => {
    state.bits = sub(state.bits, price);
  };
  injectStyle();
  let destroyed = false;
  const timers = /* @__PURE__ */ new Set();
  const listeners = [];
  let lobbyTaunt = null;
  const setT = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const setI = (fn, ms) => {
    const id = setInterval(() => {
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const clearTimer = (id) => {
    clearInterval(id);
    timers.delete(id);
  };
  const on = (target, ev, fn) => {
    target.addEventListener(ev, fn);
    listeners.push([target, ev, fn]);
  };
  let lobbyCheat = readCheat(actions);
  void lobbyCheat;
  if (!state.bossSeen) {
    state.bossSeen = true;
    save(state);
    lobbyCheat = readCheat(actions);
    fireAchievement("ach-boss-seen");
  }
  function fireAchievement(id) {
    state.achievements = Array.isArray(state.achievements) ? state.achievements : [];
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    save(state);
    const bellText = {
      "ach-boss-seen": "🥊 you stared the Defragmenter down.",
      "ach-boss-cheat-found": "🕵️ something was off. you fixed it.",
      "ach-boss-victory": "🏆 defragmented — your bits, your win.",
      "ach-boss-lose": "😤 it cheated. of course it did."
    }[id];
    if (bellText) bellAdd2(id, bellText, bellLoad2());
  }
  function lobbyPool() {
    return TAUNTS.lobby;
  }
  function winHint() {
    return TAUNTS.hint[Math.min(state.bossLossCount || 0, TAUNTS.hint.length - 1)];
  }
  function makeTauntDialog() {
    const bubble = arena.querySelector(".boss-taunt-bubble");
    let idleId = null;
    function show(text) {
      if (bubble) bubble.textContent = text;
    }
    function startIdle() {
      stopIdle();
      const tick = () => {
        show(pick(lobbyPool()));
        idleId = setT(tick, 8e3 + Math.random() * 4e3);
      };
      tick();
    }
    function stopIdle() {
      if (idleId) {
        clearTimeout(idleId);
        timers.delete(idleId);
        idleId = null;
      }
    }
    return { show, startIdle, stopIdle };
  }
  function renderLobby(extraStatus) {
    if (lobbyTaunt) lobbyTaunt.stopIdle();
    arena.innerHTML = `<div class="mg-defrag-arena mg-fade-in"><div class="mg-defrag-header">THE DEFRAGMENTER</div><div class="mg-defrag-intro">your bits are scattered. I'll reorganize them — into mine.</div><div class="mg-defrag-taunt-wrap"><div class="boss-taunt"><span class="boss-taunt-avatar">⚙️</span><div class="boss-taunt-bubble"></div></div></div><div class="mg-defrag-hint">💡 ` + esc3(winHint()) + '</div><div class="mg-defrag-status">' + esc3(extraStatus || "") + '</div><div class="mg-defrag-lobby-btns"><button class="mg-defrag-btn mg-defrag-fight" type="button"' + (canPay(ticket) ? "" : " disabled") + ">Fight — " + esc3(toDisplay(ticket)) + '</button><button class="mg-defrag-btn alt mg-defrag-retreat" type="button">Retreat</button></div></div>';
    lobbyTaunt = makeTauntDialog();
    lobbyTaunt.startIdle();
    on(arena.querySelector(".mg-defrag-fight"), "click", () => {
      if (!canPay(ticket)) {
        renderLobby("insufficient bits — the ticket is " + toDisplay(ticket) + ".");
        return;
      }
      pay(ticket);
      state.bossEntered = true;
      fireAchievement("ach-boss-enter");
      save(state);
      lobbyTaunt.stopIdle();
      startFight();
    });
    on(arena.querySelector(".mg-defrag-retreat"), "click", retreat);
  }
  function retreat() {
    cleanup();
    if (typeof opts.onRetreat === "function") opts.onRetreat();
  }
  const startFight = makeFight({ arena, actions, setT, setI, clearTimer, on, onFinish: finishFight });
  function finishFight(userScore, bossScore, cheatActive) {
    const won = userScore > bossScore;
    const statusEl = arena.querySelector(".mg-defrag-status");
    const bubble = arena.querySelector(".boss-taunt-bubble");
    if (won) {
      state.defeated = Array.isArray(state.defeated) ? state.defeated : [];
      if (!state.defeated.includes(1)) state.defeated.push(1);
      save(state);
      fireAchievement("ach-boss-victory");
      if (bubble) bubble.textContent = pick(TAUNTS.win);
      bellAdd2("bell-boss-victory", "you beat The Defragmenter. it's still running in the background. just slower.", bellLoad2());
      showResultOverlay("YOU WIN", "win", userScore, bossScore, () => {
        cleanup();
        onDefeat && onDefeat();
      }, "Continue");
      return;
    }
    state.bossLossCount = (state.bossLossCount || 0) + 1;
    save(state);
    checkMessages2("boss-loss", state, bellLoad2());
    if (cheatActive) fireAchievement("ach-boss-lose");
    if (bubble) bubble.textContent = pick(TAUNTS.loss);
    if (statusEl) statusEl.textContent = "The Defragmenter wins — your bits scatter, but stay yours. Try again.";
    showResultOverlay("YOU LOSE", "lose", userScore, bossScore, null, null);
    const overlay = arena.querySelector(".mg-defrag-overlay");
    if (!overlay) return;
    const btns = document.createElement("div");
    btns.className = "mg-defrag-lobby-btns";
    btns.innerHTML = '<button class="mg-defrag-btn mg-defrag-retry" type="button"' + (canPay(halfTicket) ? "" : " disabled") + ">Try Again — " + esc3(toDisplay(halfTicket)) + '</button><button class="mg-defrag-btn alt mg-defrag-retreat" type="button">Retreat</button>';
    overlay.appendChild(btns);
    on(btns.querySelector(".mg-defrag-retreat"), "click", retreat);
    on(btns.querySelector(".mg-defrag-retry"), "click", onRetry);
  }
  function showResultOverlay(title, cls, userScore, bossScore, onContinue, cta) {
    const arenaEl = arena.querySelector(".mg-defrag-arena");
    if (!arenaEl) return;
    const old = arena.querySelector(".mg-defrag-overlay");
    if (old) old.remove();
    const ov = document.createElement("div");
    ov.className = "mg-defrag-overlay mg-fade-in";
    ov.innerHTML = '<div class="mg-defrag-result ' + cls + '">' + esc3(title) + '</div><div class="mg-defrag-intro">YOU ' + userScore + " — " + bossScore + " BOSS</div>";
    if (onContinue && cta) {
      const b = document.createElement("button");
      b.className = "mg-defrag-btn";
      b.type = "button";
      b.textContent = cta;
      on(b, "click", onContinue);
      ov.appendChild(b);
    }
    arenaEl.appendChild(ov);
  }
  function onRetry() {
    if (!canPay(halfTicket)) {
      renderLobby("insufficient bits — a retry costs " + toDisplay(halfTicket) + ".");
      return;
    }
    pay(halfTicket);
    state.bossEntered = true;
    fireAchievement("ach-boss-enter");
    save(state);
    startFight();
  }
  function onCheatDisable() {
    lobbyCheat = readCheat(actions);
    if (arena.querySelector(".mg-defrag-lobby-btns") && !arena.querySelector(".mg-defrag-fight-on")) {
      const status = arena.querySelector(".mg-defrag-status");
      if (status) status.textContent = "⚙️ the cheat is gone. the next fight is fair.";
    }
  }
  on(window, "fv:games:action", (event) => {
    const detail = event && event.detail || {};
    if (detail.stage === 1 && detail.action === "cheat_disabled") onCheatDisable();
  });
  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    for (const id of timers) {
      clearTimeout(id);
      clearInterval(id);
    }
    timers.clear();
    for (const [t, ev, fn] of listeners) t.removeEventListener(ev, fn);
    listeners.length = 0;
  }
  renderLobby();
  return { destroy: cleanup };
}

// ../../docs/games/metagame/stages/stage1/stages.js
var esc4 = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function _gte(a, b) {
  if (!a || !b) return false;
  if (a.e !== b.e) return a.e > b.e;
  return a.m >= b.m;
}
function mountConfigDemon(arena, { stage, onDefeat }) {
  let hp = stage.hp, invincible = true, dead = false;
  const INI_LOCKED = "invincible = true\nhp = 9999";
  arena.innerHTML = '<div class="mg-boss mg-boss-demon"><div class="mg-boss-sprite">≣◢◣≣</div><div class="mg-boss-name">' + esc4(stage.bossName) + '</div><div class="mg-boss-hp">HP: <span class="mg-hp-n"></span> <span class="mg-inv"></span></div><div class="mg-ini-wrap"><textarea class="mg-ini" spellcheck="false" aria-label="boss.ini"></textarea></div><div class="mg-boss-tool"><button class="mg-ini-apply" type="button">Apply config</button><button class="mg-attack" type="button">Attack</button></div><div class="mg-boss-msg" role="status"></div></div>';
  const bossEl = arena.querySelector(".mg-boss");
  const ini = arena.querySelector(".mg-ini");
  const msgEl = arena.querySelector(".mg-boss-msg");
  ini.value = INI_LOCKED;
  function paint() {
    arena.querySelector(".mg-hp-n").textContent = hp;
    arena.querySelector(".mg-inv").textContent = invincible ? "🛡 invincible" : "⚔ vulnerable";
  }
  paint();
  function applyConfig() {
    if (dead) return;
    const v = ini.value.toLowerCase();
    const inv = /invincible\s*=\s*false/.test(v);
    invincible = !inv;
    msgEl.textContent = invincible ? "Still invincible — set invincible = false." : "Config applied — he is vulnerable! Attack now.";
    paint();
  }
  function attack() {
    if (dead) return;
    if (invincible) {
      msgEl.textContent = "He shrugs it off. Change boss.ini first.";
      return;
    }
    hp--;
    msgEl.textContent = "Hit! HP " + hp;
    bossEl.classList.remove("mg-hit");
    void bossEl.offsetWidth;
    bossEl.classList.add("mg-hit");
    paint();
    if (hp <= 0) defeat();
  }
  function defeat() {
    dead = true;
    clearInterval(rw);
    bossEl.classList.add("mg-boss-dead");
    msgEl.textContent = "The Config Demon crashes.";
    setTimeout(onDefeat, 750);
  }
  const rw = setInterval(() => {
    if (dead) return;
    ini.value = INI_LOCKED;
    invincible = true;
    paint();
    msgEl.textContent = "The Config Demon REWROTE boss.ini!";
  }, stage.rewriteMs);
  arena.querySelector(".mg-ini-apply").addEventListener("click", applyConfig);
  arena.querySelector(".mg-attack").addEventListener("click", attack);
  return { destroy() {
    clearInterval(rw);
  } };
}
function mountKernelPanic(arena, { stage, onDefeat }) {
  let panics = stage.panics, dead = false;
  arena.innerHTML = '<div class="mg-boss mg-boss-kernel"><pre class="mg-term"></pre><div class="mg-boss-name">' + esc4(stage.bossName) + '</div><div class="mg-boss-tool"><input class="mg-cmd" spellcheck="false" placeholder="type a command…" aria-label="terminal command"><button class="mg-cmd-run" type="button">Enter ⏎</button></div><div class="mg-boss-msg" role="status"></div></div>';
  const bossEl = arena.querySelector(".mg-boss");
  const term = arena.querySelector(".mg-term");
  const msgEl = arena.querySelector(".mg-boss-msg");
  const corrupt = () => "▓▒░ KERNEL PANIC ░▒▓\n" + Array.from({ length: 3 }, () => Array.from({ length: 22 }, (_, i) => "01<>{}[]/\\|=+*#"[(i * 7 + panics) % 14]).join("")).join("\n");
  const fixed = () => "user@reality:~$ _\nsystem stable.\npanics remaining: " + panics;
  const paint = () => {
    term.textContent = panics > 0 ? corrupt() : fixed();
  };
  paint();
  function run() {
    if (dead) return;
    const cmd = arena.querySelector(".mg-cmd").value.trim().toLowerCase();
    if (cmd !== stage.command) {
      msgEl.textContent = "`" + cmd + "`: command not found.";
      return;
    }
    panics--;
    msgEl.textContent = "Reboot accepted. Panics left: " + panics;
    paint();
    if (panics <= 0) defeat();
  }
  function defeat() {
    dead = true;
    clearInterval(rp);
    bossEl.classList.add("mg-boss-dead");
    msgEl.textContent = "The terminal goes quiet.";
    setTimeout(onDefeat, 750);
  }
  const rp = setInterval(() => {
    if (dead || panics <= 0 || panics >= stage.panics) return;
    panics++;
    paint();
    msgEl.textContent = "It panicked AGAIN. Reboot faster.";
  }, stage.repanicMs);
  arena.querySelector(".mg-cmd-run").addEventListener("click", run);
  arena.querySelector(".mg-cmd").addEventListener("keydown", (e) => {
    if (e.key === "Enter") run();
  });
  return { destroy() {
    clearInterval(rp);
  } };
}
function mountHexHydra(arena, { stage, onDefeat }) {
  const N = 24;
  let hp = stage.hp, dead = false;
  const bytes = Array.from({ length: N }, () => Math.floor(Math.random() * 240).toString(16).padStart(2, "0").toUpperCase());
  let hpIdx = Math.floor(Math.random() * N);
  bytes[hpIdx] = "FF";
  arena.innerHTML = '<div class="mg-boss mg-boss-hydra"><div class="mg-boss-sprite">≈≋≈</div><div class="mg-boss-name">' + esc4(stage.bossName) + " — HP " + hp + '</div><div class="mg-hex"></div><div class="mg-boss-msg" role="status">Click the byte that reads FF.</div></div>';
  const bossEl = arena.querySelector(".mg-boss");
  const hexEl = arena.querySelector(".mg-hex");
  const nameEl = arena.querySelector(".mg-boss-name");
  const msgEl = arena.querySelector(".mg-boss-msg");
  function draw() {
    hexEl.innerHTML = bytes.map((b, i) => '<button class="mg-hex-cell' + (i === hpIdx ? " mg-hp-cell" : "") + '" type="button" data-i="' + i + '"' + (i === hpIdx ? ' data-hp="1"' : "") + ">" + b + "</button>").join("");
    hexEl.querySelectorAll(".mg-hex-cell").forEach((c) => c.addEventListener("click", () => hit(Number(c.dataset.i))));
    nameEl.textContent = stage.bossName + " — HP " + hp;
  }
  function hit(i) {
    if (dead) return;
    if (i !== hpIdx) {
      msgEl.textContent = "That byte is just noise. Find the FF.";
      return;
    }
    bytes[hpIdx] = "00";
    hp--;
    bossEl.classList.remove("mg-hit");
    void bossEl.offsetWidth;
    bossEl.classList.add("mg-hit");
    if (hp <= 0) {
      draw();
      return defeat();
    }
    let j;
    do {
      j = Math.floor(Math.random() * N);
    } while (j === hpIdx);
    hpIdx = j;
    bytes[hpIdx] = "FF";
    msgEl.textContent = "Hit! It moved. Find the new FF. HP " + hp;
    draw();
  }
  function defeat() {
    dead = true;
    bossEl.classList.add("mg-boss-dead");
    msgEl.textContent = "The Hydra flatlines: 00 00 00.";
    setTimeout(onDefeat, 750);
  }
  draw();
  return { destroy() {
  } };
}
var STAGES = [
  // ── Stage 1 — Bit Foundry (idle-clicker; boss = The Defragmenter, click-contest) ────────────
  // Economy, save/load (base64), and boss are implemented in WP-S1-04 through WP-S1-12.
  // This entry is the data-only config; runtime modules import it via stageByNumber(1).
  {
    n: 1,
    title: "Bit Foundry",
    resource: { name: "bits", color: "#3fb950" },
    // green data bits (IT theme)
    // ── Tiers (7 sub-stages) — §2.1 ─────────────────────────────────────────────────────────
    // BigNum costs use { m, e } shape (m × 10^e). Unlock predicates use _gte() (local stub
    // above) which is safe to call before bignum.js exists. At runtime s1economy.js uses
    // the real BigNum ops from bignum.js.
    tiers: [
      // 1. Multiplier — +1 clickPower per level; intro button buys this directly.
      {
        id: "s1-mult",
        name: "Multiplier",
        icon: "✖",
        type: "click_mult",
        desc: "+1 bit / tap",
        base: { m: 100, e: 0 },
        mult: 1.12,
        amount: 1,
        unlock: (state) => _gte(state.totalBits, { m: 1, e: 0 }),
        bell: "bell-mult",
        grid: "g1"
      },
      // 2. Bit Box — timed; 100 bits/cycle per owned; unlocks at bits ≥ 500
      {
        id: "s1-box",
        name: "Bit Box",
        icon: "🧰",
        type: "timed",
        desc: "timed bit batch",
        base: { m: 500, e: 0 },
        mult: 1.1,
        baseAmount: 100,
        duration_ms: 4e3,
        unlock: (state) => _gte(state.bits, { m: 500, e: 0 }),
        bell: "bell-box",
        grid: "g2"
      },
      // 3. Signal Booster — timed BUILDER; each cycle assembles Bit Boxes (owned[s1-box] += owned
      //    boosters) and still boosts Bit Box payout +10%/level. Unlocks at owned[s1-box] ≥ 1.
      {
        id: "s1-boost",
        name: "Signal Booster",
        icon: "📡",
        type: "timed",
        desc: "builds 🧰 Bit Boxes",
        base: { m: 20, e: 3 },
        mult: 1.2,
        baseAmount: 75,
        duration_ms: 5e3,
        boost: { targetId: "s1-box", perLevelPct: 0.1 },
        produces: { targetId: "s1-box", perOwned: 1 },
        unlock: (state) => (state.owned["s1-box"] || 0) >= 3,
        bell: "bell-boost",
        grid: "g3"
      },
      // 4. Core Cluster — timed BUILDER; each cycle assembles Signal Boosters (owned[s1-boost] +=
      //    owned clusters). Unlocks at owned[s1-boost] ≥ 1.
      {
        id: "s1-cluster",
        name: "Core Cluster",
        icon: "🧊",
        type: "timed",
        desc: "builds 📡 Boosters",
        base: { m: 250, e: 3 },
        mult: 1.22,
        baseAmount: 500,
        duration_ms: 8e3,
        produces: { targetId: "s1-boost", perOwned: 1 },
        unlock: (state) => (state.owned["s1-boost"] || 0) >= 3,
        bell: "bell-cluster",
        grid: "g4"
      },
      // 5. Processing Array — timed BUILDER; each cycle assembles Core Clusters (owned[s1-cluster] +=
      //    owned arrays), extending the escalation chain. Unlocks at owned[s1-cluster] ≥ 3.
      {
        id: "s1-array",
        name: "Processing Array",
        icon: "🛰",
        type: "timed",
        desc: "builds 🧊 Core Clusters",
        base: { m: 50, e: 6 },
        mult: 1.28,
        baseAmount: 0,
        duration_ms: 12e3,
        produces: { targetId: "s1-cluster", perOwned: 1 },
        unlock: (state) => (state.owned["s1-cluster"] || 0) >= 3,
        bell: "bell-array",
        grid: "g5"
      },
      // 6. Neural Net — globalMult node: ×(1 + 0.25·level) to all timed payouts (in practice the Bit
      //    Box, the only bit-paying timer). Linear, uncapped. Unlocks at totalBits ≥ 50 000 000.
      {
        id: "s1-neural",
        name: "Neural Net",
        icon: "🧠",
        type: "click_mult",
        desc: "+25% bits / timer cycle per level",
        globalMult: { perLevel: 0.25, targets: "timed" },
        base: { m: 5, e: 9 },
        mult: 1.3,
        amount: 0,
        unlock: (state) => _gte(state.totalBits, { m: 5, e: 7 }),
        bell: "bell-neural",
        grid: "g6"
      },
      // 7. Quantum Tap — each Compute tap also yields a % of the Bit Box's bits/sec (24% → +200% over
      //    10 levels, capped). Unlocks at owned[s1-neural] ≥ 3.
      {
        id: "s1-quantum",
        name: "Quantum Tap",
        icon: "⚛",
        type: "click_mult",
        desc: "taps pay a % of Bit Box/s",
        base: { m: 500, e: 9 },
        mult: 1.32,
        amount: 0,
        maxLevel: 10,
        unlock: (state) => (state.owned["s1-neural"] || 0) >= 3,
        bell: "bell-quantum",
        grid: "g7"
      }
    ],
    // ── Managers (3) — §6.1 ─────────────────────────────────────────────────────────────────
    // hireCostBase = 10 × toNumber(managedTier.base). Scaling formula (hireCost(mgr, level) =
    // 10 × baseCost_of_managedTier × 1.15^level) is implemented in s1economy.js.
    managers: [
      { id: "m-box", name: "Box Operator", icon: "🛠", manages: "s1-box", hireCostBase: 5e3, runCostPerSec: 20 },
      { id: "m-signal", name: "Signal Engineer", icon: "🔧", manages: "s1-boost", hireCostBase: 25e3, runCostPerSec: 90 },
      { id: "m-cluster", name: "Cluster Foreman", icon: "👷", manages: "s1-cluster", hireCostBase: 12e4, runCostPerSec: 400 },
      { id: "m-array", name: "Array Foreman", icon: "🤖", manages: "s1-array", hireCostBase: 5e8, runCostPerSec: 5e4 }
    ],
    // ── Boss ticket (§10.2) ──────────────────────────────────────────────────────────────────
    // canFightBoss = allSubStagesOwned AND gte(bits, bossTicket). Checked in orchestrator (WP-S1-12).
    bossTicket: { m: 1, e: 54 },
    // 1an — reachable well before the steepened late tiers
    // ── Intro / boss dialog ──────────────────────────────────────────────────────────────────
    intro: [
      { speaker: "SYS", text: "Tap to get started." }
    ],
    bossName: "The Defragmenter",
    bossIntro: [
      { speaker: "The Defragmenter", text: "your bits are scattered. I'll reorganize them — into mine." }
    ],
    hints: [
      // Hints are delivered as loss-gated taunts by the boss itself (§10C) and mirrored in the
      // bell (§7.3 bell-boss-hint-1/2/3). No separate hint dialog for Stage 1.
    ],
    victory: [
      // Fired as a bell line by the win handler (§10.7):
      { speaker: "SYS", text: "you beat The Defragmenter. it's still running in the background. just slower." }
    ],
    // ── Boss mount (WP-S1-11) ───────────────────────────────────────────────────────────────
    // The Defragmenter click-contest boss (boss1.js). Orchestrator passes the full ctx in WP-S1-12.
    mountBoss: mountDefragmenter
  },
  {
    n: 2,
    title: "Config Demon",
    goal: 250,
    resource: { name: "cycles", color: "#4c9aff" },
    // stage 2 reskins the resource (modular)
    tiers: [
      { id: "click", name: "Hotkey macro", icon: "⌨", type: "click", amount: 2, base: 20, mult: 1.5, desc: "+2 cycles per click" },
      { id: "daemon", name: "Daemon", icon: "😈", type: "auto", rate: 1, base: 80, mult: 1.15, desc: "spins 1 cycle/s" },
      { id: "service", name: "System service", icon: "🛠", type: "auto", rate: 6, base: 900, mult: 1.15, desc: "spins 6 cycles/s" },
      { id: "cluster", name: "Cluster", icon: "🗄", type: "auto", rate: 40, base: 9e3, mult: 1.15, desc: "spins 40 cycles/s" }
    ],
    intro: [
      { speaker: "SYS", text: "A new sector. The numbers run on cycles now. Same idea — generate, automate, grow." },
      { speaker: "SYS", text: "A Config Demon squats in the settings. He has declared himself invincible. Reach 250 cycles." }
    ],
    bossName: "Config Demon",
    bossIntro: [
      { speaker: "Config Demon", text: "My power is DECLARED in boss.ini: invincible = true. It is LAW." },
      { speaker: "Config Demon", text: "Edit it if you dare — I rewrite my own config faster than you can save. Hahaha." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "His invincibility is just a config flag. This app edits .ini/.env files…" },
      { speaker: "??? (a friendly daemon)", text: 'In boss.ini set "invincible = false", Apply, then Attack.' },
      { speaker: "??? (a friendly daemon)", text: "He rewrites the file on a timer — edit, apply, and land your hits FAST." }
    ],
    victory: [
      { speaker: "Config Demon", text: "You edited my own config against me… invincible = false… nooo…" },
      { speaker: "SYS", text: "Two down. Each boss falls to a real feature of this very app. Keep climbing." }
    ],
    hp: 3,
    rewriteMs: 6e3,
    mountBoss: mountConfigDemon
  },
  {
    n: 3,
    title: "ASCII Awakening",
    goal: 400,
    resource: { name: "bytes", color: "#7ee787", theme: "ascii" },
    // the whole stage goes ASCII
    tiers: [
      { id: "click", name: "Keystroke", icon: "⌨", type: "click", amount: 3, base: 30, mult: 1.5, desc: "+3 bytes per keystroke" },
      { id: "pipe", name: "Pipe", icon: "|", type: "auto", rate: 2, base: 120, mult: 1.15, desc: "streams 2 bytes/s" },
      { id: "shell", name: "Shell script", icon: "$", type: "auto", rate: 12, base: 1400, mult: 1.15, desc: "streams 12 bytes/s" },
      { id: "kernel", name: "Kernel module", icon: "#", type: "auto", rate: 70, base: 16e3, mult: 1.15, desc: "streams 70 bytes/s" }
    ],
    intro: [
      { speaker: "SYS", text: ">_ Graphics subsystem offline. We are dropping to a TERMINAL. Everything is text now." },
      { speaker: "SYS", text: "Generate bytes the old way. Reach 400 — then deal with the panicking kernel ahead." }
    ],
    bossName: "Kernel Panic",
    bossIntro: [
      { speaker: "Kernel Panic", text: "▓▒░ PANIC ░▒▓ I corrupt every frame. You cannot read me." },
      { speaker: "Kernel Panic", text: "There is no GUI to save you here. Only the command line. Hahaha." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "This is a terminal now. Terminals take COMMANDS." },
      { speaker: "??? (a friendly daemon)", text: "A panicking kernel needs one thing: a reboot." },
      { speaker: "??? (a friendly daemon)", text: 'Type "reboot" and hit Enter — repeatedly, before it panics again.' }
    ],
    victory: [
      { speaker: "Kernel Panic", text: "reboot… reboot… you kept rebooting me to death…" },
      { speaker: "SYS", text: "Stable. We stay in the terminal a while — it suits what comes next. Three down." }
    ],
    command: "reboot",
    panics: 3,
    repanicMs: 6e3,
    mountBoss: mountKernelPanic
  },
  {
    n: 4,
    title: "Hex Hydra",
    goal: 600,
    resource: { name: "bytes", color: "#7ee787", theme: "ascii" },
    // still in the terminal
    tiers: [
      { id: "click", name: "Nibble", icon: "⬢", type: "click", amount: 4, base: 40, mult: 1.5, desc: "+4 bytes per click" },
      { id: "dma", name: "DMA channel", icon: "⇄", type: "auto", rate: 3, base: 200, mult: 1.15, desc: "streams 3 bytes/s" },
      { id: "bus", name: "Memory bus", icon: "≣", type: "auto", rate: 18, base: 2200, mult: 1.15, desc: "streams 18 bytes/s" },
      { id: "core", name: "Extra core", icon: "◉", type: "auto", rate: 95, base: 24e3, mult: 1.15, desc: "streams 95 bytes/s" }
    ],
    intro: [
      { speaker: "SYS", text: "Deeper in. Raw memory. A many-headed thing lives in the heap." },
      { speaker: "SYS", text: "You will not out-DPS it. Read its bytes. Reach 600 and open its memory." }
    ],
    bossName: "Hex Hydra",
    bossIntro: [
      { speaker: "Hex Hydra", text: "My health is HIDDEN in my bytes. You will never find it." },
      { speaker: "Hex Hydra", text: "And when you do — I move it. Good luck reading hex, meatware." }
    ],
    hints: [
      { speaker: "??? (a friendly daemon)", text: "Everything here is bytes. This app has a HEX view…" },
      { speaker: "??? (a friendly daemon)", text: "His HP is the byte that reads FF. Everything else is noise." },
      { speaker: "??? (a friendly daemon)", text: "Flip the FF to 00. He relocates it each hit — find it again, fast." }
    ],
    victory: [
      { speaker: "Hex Hydra", text: "FF… 00… you flipped my own bytes against me…" },
      { speaker: "SYS", text: "Four heads down. You read the machine. That is the whole point. Keep going." }
    ],
    hp: 3,
    mountBoss: mountHexHydra
  },
  ...STAGES2,
  ...STAGES3
];
function stageByNumber(n) {
  return STAGES[n - 1] || null;
}

// ../../docs/games/metagame/stages/stage1/sounds.js
var ctx;
var lastTick = 0;
function getCtx() {
  return ctx ||= new (window.AudioContext || window.webkitAudioContext)();
}
function clickTick() {
  try {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastTick < 40) return;
    lastTick = now;
    const c = getCtx();
    if (c.state === "suspended") c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.value = 560 + Math.random() * 120;
    gain.gain.setValueAtTime(0.07, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(1e-3, c.currentTime + 0.045);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.05);
  } catch {
  }
}

// ../../docs/games/metagame/stages/stage1/s1economy.js
function totalCost(t, owned, n) {
  if (n <= 0) return ZERO;
  const B = t.base;
  const r = t.mult;
  if (r === 1) {
    return mulScalar(B, n);
  }
  const rk = Math.pow(r, owned);
  const rn = Math.pow(r, n);
  let factor;
  if (rk > 1e290) {
    const logFactor = owned * Math.log(r) + Math.log(rn - 1) - Math.log(r - 1);
    factor = Math.exp(logFactor);
  } else {
    factor = rk * (rn - 1) / (r - 1);
  }
  return mulScalar(B, factor);
}
function maxAffordable(bits, t, owned) {
  const B_num = toNumber(t.base);
  const bits_num = toNumber(bits);
  const r = t.mult;
  if (B_num === 0) return 0;
  if (bits_num <= 0 || bits_num < B_num * Math.pow(r, owned)) return 0;
  if (r === 1) {
    return Math.max(0, Math.floor(bits_num / B_num));
  }
  const arg = 1 + bits_num * (r - 1) / (B_num * Math.pow(r, owned));
  if (arg <= 0) return 0;
  let maxN = Math.floor(Math.log(arg) / Math.log(r));
  if (!isFinite(maxN) || maxN < 0) maxN = 0;
  for (let i = 0; i < 1e3 && maxN > 0 && !gte(bits, totalCost(t, owned, maxN)); i++) maxN--;
  for (let i = 0; i < 1e3 && gte(bits, totalCost(t, owned, maxN + 1)); i++) maxN++;
  if (t.maxLevel != null) maxN = Math.min(maxN, Math.max(0, t.maxLevel - owned));
  return Math.max(0, maxN);
}
function globalPull(state) {
  if (!state.pullFactors || !state.pullFactors.length) return 1;
  return state.pullFactors.reduce((acc, f) => acc * f, 1);
}
function achievMult(state) {
  const n = (state.achievements || []).length;
  return Math.pow(1.02, n);
}
var QUANTUM_MAX_LEVEL = 10;
function quantumPct(level) {
  const L = Math.min(Math.max(level || 0, 0), QUANTUM_MAX_LEVEL);
  if (L <= 0) return 0;
  return 2 * (1 - Math.pow(1 - L / QUANTUM_MAX_LEVEL, 1.2));
}
function bitBoxPerSec(state, cfg) {
  const box = (cfg.tiers || []).find((t) => t.id === "s1-box");
  if (!box) return 0;
  const payout = toNumber(timedPayout(state, cfg, "s1-box"));
  if (payout <= 0) return 0;
  const mgr = (cfg.managers || []).find((m) => m.manages === "s1-box");
  const lvl = mgr ? ((state.managers || {})[mgr.id] || {}).level || 0 : 0;
  const cycleMs = lvl > 0 ? autoInterval(box.duration_ms, lvl) : box.duration_ms;
  return cycleMs > 0 ? payout / (cycleMs / 1e3) : 0;
}
function clickPower(state, cfg) {
  const owned = state.owned || {};
  const additive = 1 + (owned["s1-mult"] || 0);
  const pull = globalPull(state);
  const ach = achievMult(state);
  const base = additive * pull * ach;
  const quantumBonus = quantumPct(owned["s1-quantum"]) * bitBoxPerSec(state, cfg);
  return base + quantumBonus;
}
function passiveRate(state, cfg) {
  const owned = state.owned || {};
  const pull = globalPull(state);
  const ach = achievMult(state);
  let total = 0;
  for (const t of cfg.tiers) {
    if (t.type !== "passive") continue;
    total += (owned[t.id] || 0) * t.rate;
  }
  return total * pull * ach;
}
function timedPayout(state, cfg, tierId) {
  const owned = state.owned || {};
  const t = cfg.tiers.find((x) => x.id === tierId);
  if (!t || t.type !== "timed") return ZERO;
  if (t.produces) return ZERO;
  const ownedCount = owned[tierId] || 0;
  if (ownedCount === 0) return ZERO;
  const pull = globalPull(state);
  const ach = achievMult(state);
  const neuralMult = 1 + 0.25 * (owned["s1-neural"] || 0);
  let boostMult = 1;
  for (const bt of cfg.tiers) {
    if (bt.boost && bt.boost.targetId === tierId) {
      boostMult += bt.boost.perLevelPct * (owned[bt.id] || 0);
    }
  }
  const baseOutput = t.baseAmount * ownedCount;
  return mulScalar(fromNumber(baseOutput), neuralMult * boostMult * pull * ach);
}
function timedProduction(state, cfg, tierId) {
  const t = (cfg.tiers || []).find((x) => x.id === tierId);
  if (!t || !t.produces) return null;
  const ownedCount = (state.owned || {})[tierId] || 0;
  if (ownedCount === 0) return null;
  const amount = Math.round((t.produces.perOwned || 1) * ownedCount * globalPull(state));
  return { targetId: t.produces.targetId, amount };
}
var HIRE_LEVEL_MULT = 1.1;
function managerHireCost(mgr, level, cfg) {
  const managedTier = cfg.tiers.find((t) => t.id === mgr.manages);
  if (!managedTier) return ZERO;
  const base10 = mulScalar(managedTier.base, 10);
  return mulScalar(base10, Math.pow(HIRE_LEVEL_MULT, level));
}
function managerCurve(mgr, cfg) {
  const managedTier = cfg.tiers.find((t) => t.id === mgr.manages);
  if (!managedTier) return null;
  return { base: mulScalar(managedTier.base, 10), mult: HIRE_LEVEL_MULT };
}
function managerTotalCost(mgr, level, n, cfg) {
  const curve = managerCurve(mgr, cfg);
  return curve ? totalCost(curve, level, n) : ZERO;
}
function managerMaxLevels(bits, mgr, level, cfg) {
  const curve = managerCurve(mgr, cfg);
  return curve ? maxAffordable(bits, curve, level) : 0;
}
var RUN_COST_COEFF = 0.1;
function managerRunCostAtLevel(mgr, level, cfg) {
  if (!mgr || level <= 0) return 0;
  return RUN_COST_COEFF * toNumber(managerHireCost(mgr, level - 1, cfg));
}
function managerRunCost(managerId, state, cfg) {
  const mgrState = (state.managers || {})[managerId];
  if (!mgrState || mgrState.level <= 0) return 0;
  const mgr = (cfg.managers || []).find((m) => m.id === managerId);
  if (!mgr) return 0;
  return managerRunCostAtLevel(mgr, mgrState.level, cfg);
}
function managerCostPerSec(state, cfg) {
  if (!cfg.managers) return 0;
  let total = 0;
  for (const mgr of cfg.managers) {
    const mgrState = (state.managers || {})[mgr.id];
    if (!mgrState || mgrState.level <= 0 || mgrState.paused) continue;
    total += managerRunCost(mgr.id, state, cfg);
  }
  return total;
}
function autoInterval(baseDuration, level) {
  return baseDuration / (1 + 0.3 * level);
}
function netRate(state, cfg) {
  let autoTimed = 0;
  if (cfg.managers) {
    for (const mgr of cfg.managers) {
      const mgrState = (state.managers || {})[mgr.id];
      if (!mgrState || mgrState.level <= 0 || mgrState.paused) continue;
      const t = cfg.tiers.find((x) => x.id === mgr.manages);
      if (!t || t.type !== "timed") continue;
      const payout = toNumber(timedPayout(state, cfg, t.id));
      const intervalSec = autoInterval(t.duration_ms, mgrState.level) / 1e3;
      if (intervalSec > 0) autoTimed += payout / intervalSec;
    }
  }
  const passive = passiveRate(state, cfg);
  const mgrCost = managerCostPerSec(state, cfg);
  return autoTimed + passive - mgrCost;
}
function buyTier(state, cfg, tierId, requestedN, save) {
  const t = cfg.tiers.find((x) => x.id === tierId);
  if (!t) return 0;
  const owned = state.owned || {};
  const k = owned[tierId] || 0;
  let n;
  if (requestedN === "max") {
    n = maxAffordable(state.bits, t, k);
  } else {
    n = requestedN;
  }
  if (t.maxLevel != null) n = Math.min(n, Math.max(0, t.maxLevel - k));
  if (n <= 0) return 0;
  let cost = totalCost(t, k, n);
  if (!gte(state.bits, cost)) {
    n = maxAffordable(state.bits, t, k);
    if (n <= 0) return 0;
    cost = totalCost(t, k, n);
    if (!gte(state.bits, cost)) return 0;
  }
  state.bits = sub(state.bits, cost);
  state.owned = owned;
  state.owned[tierId] = k + n;
  state.totalBought = (state.totalBought || 0) + n;
  if (save) save(state);
  return n;
}
var RESET_UNLOCK_BITS = 1e18;
function pullGain(totalBitsAtReset) {
  const n = toNumber(totalBitsAtReset);
  const ratio = Math.max(1, n / RESET_UNLOCK_BITS);
  return Math.max(2, 2 + Math.pow(Math.log10(ratio), 1.92));
}

// ../../docs/games/metagame/stages/stage1/messages1.js
function bigGte(bn, n) {
  if (!bn || bn.m === 0) return n <= 0;
  if (!isFinite(n)) return false;
  let e = 0, m = n;
  while (m >= 1e3) {
    m /= 1e3;
    e += 3;
  }
  if (bn.e !== e) return bn.e > e;
  return bn.m >= m;
}
var MESSAGES1 = [
  {
    id: "bell-nothing",
    text: "🌑 nothing here",
    trigger: "game-start",
    condition: () => true,
    maxCount: 1,
    removeAfterFire: true
  },
  {
    id: "bell-firstsight",
    text: "👁 I can see something",
    trigger: "bit-earn",
    condition: (state) => bigGte(state.bits, 10),
    maxCount: 1,
    removeAfterFire: true
  },
  {
    id: "bell-stronger",
    text: "⚡ I feel stronger already",
    trigger: "buy",
    condition: (state) => (state.totalBought || 0) < 5,
    maxCount: void 0,
    removeAfterFire: false
  },
  {
    id: "bell-reset",
    text: "🕳 where did everything go :(",
    trigger: "bit-lose",
    condition: (state) => !bigGte(state.bits, 10),
    maxCount: void 0,
    removeAfterFire: false
  },
  {
    id: "bell-halfway",
    text: "🌗 halfway there",
    trigger: "bit-earn",
    condition: (state) => bigGte(state.totalBits, 500),
    maxCount: 1,
    removeAfterFire: true
  },
  {
    id: "bell-patient",
    text: "⏳ patience has a cost",
    trigger: "buy",
    condition: (state) => (state.totalBought || 0) >= 10,
    maxCount: 1,
    removeAfterFire: true
  },
  // §2.2 Sub-stage first-unlock bells
  { id: "bell-mult", text: "✖ now my taps multiply.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-mult"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: "bell-box", text: "🧰 a box. it makes more of me.", trigger: "bit-earn", condition: (state) => bigGte(state.bits, 500), maxCount: 1, removeAfterFire: true },
  { id: "bell-boost", text: "📡 the box hums louder now.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-boost"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: "bell-cluster", text: "🧊 a cluster. things are accelerating.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-cluster"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: "bell-array", text: "🛰 it runs without me. that's new.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-array"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: "bell-neural", text: "🧠 it's… thinking? everything multiplies.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-neural"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  { id: "bell-quantum", text: "⚛ my tap fractured into many.", trigger: "buy", condition: (state) => (state.owned && state.owned["s1-quantum"] || 0) >= 1, maxCount: 1, removeAfterFire: true },
  // §8.5 Prestige bell (unlimited, fires each time)
  { id: "bell-reset-prestige", text: "🌀 collapsed. denser now.", trigger: "prestige", condition: () => true, maxCount: void 0, removeAfterFire: false },
  // §7.3 Boss-hint bells (fire on 'boss-loss' trigger at 5/10/15 losses)
  { id: "bell-boss-hint-1", text: '💬 "have you tried… looking around?" — The Defragmenter', trigger: "boss-loss", condition: (state) => (state.bossLossCount || 0) >= 5, maxCount: 1, removeAfterFire: true },
  { id: "bell-boss-hint-2", text: '💬 "there is nothing in the examples. nothing." — The Defragmenter', trigger: "boss-loss", condition: (state) => (state.bossLossCount || 0) >= 10, maxCount: 1, removeAfterFire: true },
  { id: "bell-boss-hint-3", text: '💬 "CHEAT= ? I have no idea what that is." — The Defragmenter', trigger: "boss-loss", condition: (state) => (state.bossLossCount || 0) >= 15, maxCount: 1, removeAfterFire: true }
];

// ../../docs/games/metagame/stages/stage1/s1bell.js
var BELL_KEY = "fv:games:mg:bell";
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function bellLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(BELL_KEY)) || {};
    return {
      messages: Array.isArray(s.messages) ? s.messages : [],
      fired: s.fired && typeof s.fired === "object" ? s.fired : {},
      removed: Array.isArray(s.removed) ? s.removed : [],
      lastReadCount: Number(s.lastReadCount) || 0
    };
  } catch {
    return { messages: [], fired: {}, removed: [], lastReadCount: 0 };
  }
}
function bellSave(bs) {
  try {
    localStorage.setItem(BELL_KEY, JSON.stringify(bs));
  } catch {
  }
}
function bellAdd(id, text, bs) {
  const state = bs || bellLoad();
  const existing = state.messages.find((m) => m.id === id);
  if (existing) existing.count++;
  else state.messages.push({ id, text, count: 1, ts: Date.now() });
  bellSave(state);
  updateBellDot();
}
var bellRoot = null;
function updateBellDot() {
  if (!bellRoot) return;
  const bs = bellLoad();
  const total = bs.messages.reduce((s, m) => s + m.count, 0);
  const dot = bellRoot.querySelector(".mg-bell-dot");
  if (dot) dot.hidden = !(total > bs.lastReadCount);
}
var activeMessages = null;
function loadActiveMessages(bs) {
  const removed = new Set(bs.removed || []);
  return MESSAGES1.filter((m) => !removed.has(m.id));
}
function checkMessages(eventType, state, bs, v3Bell = null) {
  if (!activeMessages) activeMessages = loadActiveMessages(bs);
  let changed = false;
  for (const msg of activeMessages.slice()) {
    if (msg.trigger !== eventType && msg.trigger !== "any") continue;
    if (msg.maxCount !== void 0 && (bs.fired[msg.id] || 0) >= msg.maxCount) continue;
    if (!msg.condition(state)) continue;
    const firstFire = (bs.fired[msg.id] || 0) === 0;
    bellAdd(msg.id, msg.text, bs);
    if (firstFire) v3Bell?.showBell?.(`stage1.${msg.id}`, msg.text, { stage: 1 });
    bs.fired[msg.id] = (bs.fired[msg.id] || 0) + 1;
    if (msg.removeAfterFire) {
      bs.removed = bs.removed || [];
      if (!bs.removed.includes(msg.id)) bs.removed.push(msg.id);
      activeMessages = activeMessages.filter((m) => m.id !== msg.id);
    }
    changed = true;
  }
  if (changed) bellSave(bs);
}

// ../../docs/games/metagame/stages/stage1/achievements1.js
function fromN(n) {
  if (!isFinite(n) || n <= 0) return { m: 0, e: 0 };
  let e = 0, m = n;
  while (m >= 1e3) {
    m /= 1e3;
    e += 3;
  }
  return { m, e };
}
function bigGte2(bn, n) {
  if (!bn || bn.m === 0) return n <= 0;
  const target = n <= 0 ? { m: 0, e: 0 } : fromN(n);
  if (bn.e !== target.e) return bn.e > target.e;
  return bn.m >= target.m;
}
var ACHIEVEMENTS1 = [
  // --- Milestone (1–8) ---
  {
    id: "ach-bits-100",
    name: "First Hundred 💯",
    icon: "💯",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 100),
    bell: "🏆 100 bits. it begins."
  },
  {
    id: "ach-bits-1k",
    name: "Kilobit ⓚ",
    icon: "ⓚ",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e3),
    bell: "🏆 a thousand bits."
  },
  {
    id: "ach-bits-10k",
    name: "Ten-K 🔟",
    icon: "🔟",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e4),
    bell: "🏆 ten thousand."
  },
  {
    id: "ach-bits-100k",
    name: "Six Figures 📈",
    icon: "📈",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e5),
    bell: "🏆 a hundred thousand."
  },
  {
    id: "ach-bits-1m",
    name: "Megabit 🧮",
    icon: "🧮",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e6),
    bell: "🏆 one million bits."
  },
  {
    id: "ach-bits-1b",
    name: "Gigabit 🌐",
    icon: "🌐",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e9),
    bell: "🏆 a billion. boss money."
  },
  {
    id: "ach-bits-1aa",
    name: "Petascale 🪐",
    icon: "🪐",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e15),
    bell: "🏆 1aa. past safe-integer."
  },
  {
    id: "ach-bits-1bb",
    name: "Beyond 🌌",
    icon: "🌌",
    category: "milestone",
    condition: (state) => bigGte2(state.totalBits, 1e96),
    bell: "🏆 1bb. absurd."
  },
  // --- Behavior / buy-count (9–11) ---
  {
    id: "ach-buy-1",
    name: "First Blood 🩸",
    icon: "🩸",
    category: "behavior",
    condition: (state) => (state.totalBought || 0) >= 1,
    bell: "⚡ first purchase."
  },
  {
    id: "ach-buy-10",
    name: "Shopper 🛒",
    icon: "🛒",
    category: "behavior",
    condition: (state) => (state.totalBought || 0) >= 10,
    bell: "⚡ ten buys deep."
  },
  {
    id: "ach-buy-100",
    name: "Hoarder 📦",
    icon: "📦",
    category: "behavior",
    condition: (state) => (state.totalBought || 0) >= 100,
    bell: "⚡ a hundred purchases."
  },
  // --- Speed (12–14) ---
  {
    id: "ach-speed-1k-2m",
    name: "Quick Start ⏱",
    icon: "⏱",
    category: "speed",
    condition: (state) => bigGte2(state.totalBits, 1e3) && !!state.runStartedAt && Date.now() - state.runStartedAt <= 2 * 60 * 1e3,
    bell: "🚀 1K in two minutes."
  },
  {
    id: "ach-speed-1m-15m",
    name: "Sprinter 🏃",
    icon: "🏃",
    category: "speed",
    condition: (state) => bigGte2(state.totalBits, 1e6) && !!state.runStartedAt && Date.now() - state.runStartedAt <= 15 * 60 * 1e3,
    bell: "🚀 1M in fifteen."
  },
  {
    id: "ach-speed-1b-30m",
    name: "Velocity 🌠",
    icon: "🌠",
    category: "speed",
    condition: (state) => bigGte2(state.totalBits, 1e9) && !!state.runStartedAt && Date.now() - state.runStartedAt <= 30 * 60 * 1e3,
    bell: "🚀 1B in half an hour."
  },
  // --- Manager (15–17) ---
  {
    id: "ach-mgr-1",
    name: "Automation 🤖",
    icon: "🤖",
    category: "manager",
    condition: (state) => {
      const mgrs = state.managers || {};
      return Object.values(mgrs).some((m) => (m.level || 0) >= 1);
    },
    bell: "🛠 first manager hired."
  },
  {
    id: "ach-mgr-5",
    name: "Middle Management 🧑‍💼",
    icon: "🧑‍💼",
    category: "manager",
    condition: (state) => {
      const mgrs = state.managers || {};
      const total = Object.values(mgrs).reduce((sum, m) => sum + (m.level || 0), 0);
      return total >= 5;
    },
    bell: "🛠 five levels of managers."
  },
  {
    id: "ach-mgr-solvent",
    name: "In the Black 💹",
    icon: "💹",
    category: "manager",
    condition: (state) => {
      const mgrs = state.managers || {};
      const hired = Object.values(mgrs).filter((m) => (m.level || 0) >= 1).length;
      return (state.netRate || 0) > 0 && hired >= 3;
    },
    bell: "🛠 three managers, still profitable."
  },
  // --- Behavior: net-negative (18) ---
  // Requires state._netNegSince to be set by the game tick (WP-S1-09) when netRate first goes
  // negative. The tick must set state._netNegSince = Date.now() on transition to negative, and
  // clear it (set to 0/null) when netRate returns to >= 0.
  {
    id: "ach-net-neg",
    name: "In the Red 🔻",
    icon: "🔻",
    category: "behavior",
    condition: (state) => !!state._netNegSince && Date.now() - state._netNegSince >= 1e4,
    bell: "🔻 you ran negative. lesson learned."
  },
  // --- Behavior: zero after 1M (19) ---
  {
    id: "ach-zero",
    name: "Rock Bottom 🕳",
    icon: "🕳",
    category: "behavior",
    condition: (state) => bigGte2(state.totalBits, 1e6) && !!state.bits && state.bits.m === 0,
    bell: "🕳 back to nothing."
  },
  // --- Prestige (20–22) ---
  {
    id: "ach-prestige-1",
    name: "Gravity Well 🌀",
    icon: "🌀",
    category: "prestige",
    condition: (state) => Array.isArray(state.pullFactors) && state.pullFactors.length >= 1,
    bell: "🌀 first reset. pull begins."
  },
  {
    id: "ach-prestige-3",
    name: "Event Horizon 🕳️",
    icon: "🕳️",
    category: "prestige",
    condition: (state) => Array.isArray(state.pullFactors) && state.pullFactors.length >= 3,
    bell: "🌀 three resets deep."
  },
  {
    id: "ach-prestige-10aa",
    name: "Heavy Pull 🪨",
    icon: "🪨",
    category: "prestige",
    // globalPull = product of all pullFactors; must be >= 10 at the time of a reset.
    // The condition is polled each tick; it fires once pullFactors product reaches 10.
    condition: (state) => {
      const factors = state.pullFactors;
      if (!Array.isArray(factors) || factors.length === 0) return false;
      const globalPull2 = factors.reduce((a, b) => a * b, 1);
      return globalPull2 >= 10;
    },
    bell: "🌀 a reset worth ×10+ pull."
  },
  // --- Boss: enter (23) ---
  {
    id: "ach-boss-enter",
    name: "Challenger ⚔",
    icon: "⚔",
    category: "boss",
    condition: (state) => !!state.bossEntered,
    bell: "⚔ you paid to fight."
  },
  // --- Boss: lose (24) ---
  {
    id: "ach-boss-lose",
    name: "Out-Cheated 😤",
    icon: "😤",
    category: "boss",
    condition: (state) => (state.bossLossCount || 0) >= 1,
    bell: "😤 it cheated. of course it did."
  },
  // --- Secret: fast tap (25) ---
  {
    id: "ach-secret-fast-tap",
    name: "Speed Demon 🤫",
    icon: "🤫",
    category: "behavior",
    secret: true,
    // Requires state._fastTapAt set by the click handler (WP-S1-09) when >= 12 taps occur in 1 s.
    condition: (state) => !!state._fastTapUnlocked,
    bell: "🤫 you're fast. noted."
  },
  // --- Behavior: idle (26) ---
  {
    id: "ach-flavor-idle",
    name: "Patience ⏳",
    icon: "⏳",
    category: "behavior",
    // Requires state._gameOpenedAt (epoch ms) set on mount. netRate > 0 and >= 10 min open.
    condition: (state) => (state.netRate || 0) > 0 && !!state._gameOpenedAt && Date.now() - state._gameOpenedAt >= 10 * 60 * 1e3,
    bell: "⏳ you let it run. it ran."
  },
  // --- Boss: seen (27) ---
  {
    id: "ach-boss-seen",
    name: "First Encounter 🥊",
    icon: "🥊",
    category: "boss",
    condition: (state) => state.bossSeen === true,
    bell: "🥊 you stared the Defragmenter down."
  },
  // --- Boss: cheat found (28) ---
  // Legacy Stage 1 achievement entry; canonical v3 unlocks use stage1.cheat_disabled.
  {
    id: "ach-boss-cheat-found",
    name: "Suspicious Activity 🕵️",
    icon: "🕵️",
    category: "boss",
    condition: () => false,
    bell: "🕵️ something was off. you fixed it."
  },
  // --- Boss: victory (29) ---
  {
    id: "ach-boss-victory",
    name: "Defragmented 🏆",
    icon: "🏆",
    category: "boss",
    condition: (state) => Array.isArray(state.defeated) && state.defeated.includes(1),
    bell: "🏆 defragmented — your bits, your win."
  }
];

// ../../docs/games/metagame/stages/stage1/s1achievements.js
function bigToNum(bn) {
  if (bn === null || bn === void 0) return 0;
  if (typeof bn === "number") return bn;
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}
var MILESTONES = [
  { id: "score-unlock", threshold: 400, msg: "a counter flickers on — you can see your bits now" },
  { id: "sound-unlock", threshold: 1e3, msg: "I can hear something" },
  { id: "anim-unlock", threshold: 1e4, msg: "something changed" }
];
function checkMilestones(state, bs, save) {
  const achieved = state.milestones || [];
  for (const m of MILESTONES) {
    if (achieved.includes(m.id)) continue;
    if (bigToNum(state.totalBits) >= m.threshold) {
      state.milestones = achieved;
      state.milestones.push(m.id);
      bellAdd(m.id, m.msg, bs);
      save(state);
    }
  }
}
function checkAchievements(state, cfg, bs) {
  if (!cfg) return false;
  const achieved = state.achievements || [];
  let changed = false;
  for (const ach of ACHIEVEMENTS1) {
    if (achieved.includes(ach.id) || ach.id === "ach-boss-cheat-found") continue;
    try {
      if (!ach.condition(state, cfg)) continue;
    } catch {
      continue;
    }
    achieved.push(ach.id);
    state.achievements = achieved;
    changed = true;
    const bsLocal = bs || bellLoad();
    bellAdd(ach.id, ach.bell, bsLocal);
    if (bsLocal !== bs) bellSave(bsLocal);
  }
  return changed;
}

// ../../docs/games/metagame/stages/stage1/s1dom.js
function setText(el, s) {
  if (el && el.textContent !== s) el.textContent = s;
}
function setClass(el, name, on) {
  if (el && el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on);
}
function setHtml(el, s) {
  if (el && el.innerHTML !== s) el.innerHTML = s;
}
function setHidden(el, b) {
  if (el && el.hidden !== b) el.hidden = b;
}
function bindActivate(parentEl, route) {
  let pressedCtrl = null;
  let suppressClick = false;
  parentEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    pressedCtrl = route(e.target) || null;
    suppressClick = !!pressedCtrl;
  });
  parentEl.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch") return;
    if (pressedCtrl && pressedCtrl.isConnected && !pressedCtrl.contains(e.target) && route(e.target)) suppressClick = true;
  });
  parentEl.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      pressedCtrl = null;
      return;
    }
    pressedCtrl = null;
    route(e.target);
  });
}
function bindHoldRepeat(parentEl, selector, action, intervalMs = 250, holdingClass = "mg-s1-holding") {
  let timer = null;
  let held = null;
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (held) {
      held.classList.remove(holdingClass);
      held = null;
    }
  };
  parentEl.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const ctrl = e.target.closest(selector);
    if (!ctrl) return;
    stop();
    held = ctrl;
    ctrl.classList.add(holdingClass);
    timer = setInterval(action, intervalMs);
  });
  ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach((ev) => parentEl.addEventListener(ev, stop));
  if (typeof window !== "undefined") window.addEventListener("blur", stop);
}
function bigToNum2(bn) {
  if (bn === null || bn === void 0) return 0;
  if (typeof bn === "number") return bn;
  if (!bn.m) return 0;
  return Math.min(bn.m * Math.pow(10, bn.e || 0), Number.MAX_VALUE);
}

// ../../docs/games/metagame/stages/stage1/s1shop.js
var BUY_COUNTS = [1, 10, 100, "max"];
var TIER_VISIBLE = {
  "s1-mult": (s) => s.tabsUnlocked,
  "s1-box": (s) => (s.owned["s1-mult"] || 0) >= 1,
  "s1-boost": (s) => gte(s.bits, { m: 500, e: 0 }) || (s.owned["s1-box"] || 0) >= 1,
  "s1-cluster": (s) => (s.owned["s1-boost"] || 0) >= 1,
  "s1-array": (s) => (s.owned["s1-cluster"] || 0) >= 1,
  "s1-neural": (s) => gte(s.totalBits, { m: 1, e: 6 }),
  "s1-quantum": (s) => (s.owned["s1-neural"] || 0) >= 3
};
function createShopController({ panelsEl, state, cfg, tiers, save, bell, hooks = {} }) {
  const timedTiers = tiers.filter((t) => t.type === "timed");
  const buyCounts = {};
  tiers.forEach((t) => {
    buyCounts[t.id] = state.buyMult ?? 1;
  });
  const countFor = (id) => buyCounts[id] ?? 1;
  function effectiveN(t) {
    const sel = countFor(t.id);
    if (sel === "max") return maxAffordable(state.bits, t, state.owned[t.id] || 0);
    return sel;
  }
  const fmtN = (n) => toDisplay(fromNumber(n));
  function rewardLabel(t) {
    if (t.produces) {
      const prod = timedProduction(state, cfg, t.id);
      const target = tiers.find((x) => x.id === t.produces.targetId);
      const tName = target ? target.icon + " " + target.name : t.produces.targetId;
      return "+" + fmtN(prod ? prod.amount : t.produces.perOwned || 1) + " " + tName;
    }
    return "+" + toDisplay(timedPayout(state, cfg, t.id)) + " bits";
  }
  function rateLabel(t, durMs) {
    const perSec = 1e3 / durMs;
    const fmt = (n) => n >= 100 ? toDisplay(fromNumber(n)) : String(Math.round(n * 10) / 10);
    if (t.produces) {
      const prod = timedProduction(state, cfg, t.id);
      const target = tiers.find((x) => x.id === t.produces.targetId);
      const tName = target ? target.icon + " " + target.name : t.produces.targetId;
      const per = (prod ? prod.amount : t.produces.perOwned || 1) * perSec;
      return "+" + fmt(per) + " " + tName + "/s";
    }
    return "+" + toDisplay(fromNumber(toNumber(timedPayout(state, cfg, t.id)) * perSec)) + " bits/s";
  }
  function blurbFor(t) {
    const owned = state.owned || {};
    switch (t.id) {
      case "s1-mult": {
        const tap = (1 + (owned["s1-mult"] || 0)) * globalPull(state) * achievMult(state);
        return "+" + fmtN(tap) + " bits / tap";
      }
      case "s1-neural":
        return "×" + (1 + 0.25 * (owned["s1-neural"] || 0)).toFixed(2) + " to all timers";
      case "s1-quantum": {
        const lvl = owned["s1-quantum"] || 0;
        const pct = quantumPct(lvl > 0 ? lvl : 1);
        return "+" + Math.round(pct * 100) + "% Bit Box/s per tap";
      }
      default:
        return t.desc || t.name;
    }
  }
  function shopRowHtml(t) {
    const owned = state.owned[t.id] || 0;
    const visible = (TIER_VISIBLE[t.id] || (() => true))(state);
    const desc = blurbFor(t);
    const timed = t.type === "timed";
    const counts = BUY_COUNTS.map((n) => '<button class="mg-mult-b mg-s1-buyn" type="button" data-id="' + t.id + '" data-n="' + n + '">' + (n === "max" ? "MAX" : "×" + n) + "</button>").join("");
    return '<div class="mg-buy mg-s1-shoprow' + (timed ? " mg-s1-timedrow" : "") + '" data-id="' + t.id + '"' + (visible ? "" : " hidden") + ">" + (timed ? '<div class="mg-s1-rowfill" aria-hidden="true"></div>' : "") + '<span class="mg-buy-name">' + escapeHtml(t.icon + " " + t.name) + ' <span class="mg-owned">×' + fmtN(owned) + "</span></span>" + (timed ? '<span class="mg-s1-rowreward"><span class="mg-s1-rr-amt"></span><span class="mg-s1-rr-time"></span></span>' : "") + '<span class="mg-buy-blurb">' + escapeHtml(desc) + '</span><span class="mg-s1-buyrow"><span class="mg-s1-counts">' + counts + '</span><button class="mg-buy-cost mg-s1-buybtn" type="button" data-id="' + t.id + '"></button></span></div>';
  }
  function renderPanel() {
    panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="bits"><button class="mg-compute mg-s1-earn" type="button">Compute bits</button><div class="mg-shop">' + tiers.map(shopRowHtml).join("") + '</div><div class="mg-s1-stats" hidden></div><button class="mg-faceboss mg-s1-boss" type="button" hidden>⚔ Confront ' + (cfg.bossName || "the boss") + (cfg.bossTicket ? " — " + toDisplay(cfg.bossTicket) : "") + "</button></div>";
    paintShop();
    paintTimed();
    paintStats();
  }
  bindActivate(panelsEl, (target) => {
    if (!target.closest('[data-panel="bits"]')) return null;
    const buyn = target.closest(".mg-s1-buyn");
    if (buyn) {
      const n = buyn.dataset.n === "max" ? "max" : Number(buyn.dataset.n);
      buyCounts[buyn.dataset.id] = n;
      state.buyMult = n;
      save(state);
      paintShop();
      return buyn;
    }
    const buy = target.closest(".mg-s1-buybtn");
    if (buy) {
      doBuy(buy.dataset.id);
      return buy;
    }
    const boss = target.closest(".mg-s1-boss");
    if (boss) {
      hooks.onBoss && hooks.onBoss();
      return boss;
    }
    const earn = target.closest(".mg-s1-earn");
    if (earn) {
      hooks.onEarn && hooks.onEarn();
      return earn;
    }
    const row = target.closest(".mg-s1-timedrow");
    if (row) {
      startTimed(row.dataset.id);
      return row;
    }
    return null;
  });
  bindHoldRepeat(panelsEl, ".mg-s1-earn", () => hooks.onEarn && hooks.onEarn(), 250);
  function doBuy(id) {
    const t = tiers.find((x) => x.id === id);
    if (!t) return;
    const n = effectiveN(t);
    if (!n || n <= 0) return;
    const got = buyTier(state, cfg, id, n, save);
    if (got > 0) {
      const bs = bellLoad();
      checkMessages("buy", state, bs, bell);
      checkMessages("bit-lose", state, bs, bell);
      checkAchievements(state, cfg, bs);
      if (hooks.onAfterBuy) hooks.onAfterBuy();
    }
  }
  function startTimed(id) {
    const t = timedTiers.find((x) => x.id === id);
    if (!t || (state.owned[id] || 0) < 1) return;
    const ts = state.timedStates[id];
    if (ts && ts.active) {
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + id + '"]');
      if (row) {
        row.classList.remove("mg-s1-flash");
        void row.offsetWidth;
        row.classList.add("mg-s1-flash");
      }
      return;
    }
    state.timedStates[id] = { active: true, startedAt: Date.now(), duration_ms: t.duration_ms };
    paintTimed();
  }
  function paintShop() {
    tiers.forEach((t) => {
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + t.id + '"]');
      if (!row) return;
      const visible = (TIER_VISIBLE[t.id] || (() => true))(state);
      setHidden(row, !visible);
      if (!visible) return;
      const owned = state.owned[t.id] || 0;
      setText(row.querySelector(".mg-owned"), "×" + fmtN(owned));
      setText(row.querySelector(".mg-buy-blurb"), blurbFor(t));
      const sel = countFor(t.id);
      row.querySelectorAll(".mg-s1-buyn").forEach((b) => {
        const v = b.dataset.n === "max" ? "max" : Number(b.dataset.n);
        setClass(b, "mg-mult-on", String(v) === String(sel));
      });
      const buyBtn = row.querySelector(".mg-s1-buybtn");
      if (t.maxLevel != null && owned >= t.maxLevel) {
        setText(buyBtn, "MAX LEVEL");
        setClass(buyBtn, "mg-buy-locked", true);
        return;
      }
      const maxN = sel === "max" ? maxAffordable(state.bits, t, owned) : null;
      const displayN = sel === "max" ? Math.max(1, maxN) : sel;
      const cost = totalCost(t, owned, displayN);
      const label = sel === "max" ? "MAX" : "×" + displayN;
      setText(buyBtn, "Buy " + label + " — " + toDisplay(cost));
      const affordable = sel === "max" ? maxN >= 1 : gte(state.bits, cost);
      setClass(buyBtn, "mg-buy-locked", !affordable);
    });
  }
  function autoFireMs(t) {
    const mgr = (cfg.managers || []).find((m) => m.manages === t.id);
    const ms = mgr ? (state.managers || {})[mgr.id] : null;
    if (!ms || ms.level <= 0 || ms.paused) return null;
    return autoInterval(t.duration_ms, ms.level);
  }
  function paintTimed() {
    timedTiers.forEach((t) => {
      const row = panelsEl.querySelector('.mg-s1-shoprow[data-id="' + t.id + '"]');
      if (!row) return;
      const fill = row.querySelector(".mg-s1-rowfill");
      const amtEl = row.querySelector(".mg-s1-rr-amt");
      const timeEl = row.querySelector(".mg-s1-rr-time");
      if (!fill || !amtEl || !timeEl) return;
      const owned = state.owned[t.id] || 0;
      setClass(row, "mg-s1-runnable", owned >= 1);
      const setFill = (frac) => {
        const v = "scaleX(" + frac + ")";
        if (fill.style.transform !== v) fill.style.transform = v;
      };
      const setFast = (on) => setClass(fill, "mg-s1-rowfill-fast", on);
      if (owned < 1) {
        setFast(false);
        setFill(0);
        setText(amtEl, "");
        setText(timeEl, "");
        return;
      }
      const auto = autoFireMs(t);
      if (auto != null && auto < 500) {
        setFast(true);
        setFill(1);
        setText(amtEl, rateLabel(t, auto));
        setText(timeEl, "");
        return;
      }
      setFast(false);
      const ts = state.timedStates[t.id];
      if (ts && ts.active) {
        const elapsed = Date.now() - ts.startedAt;
        const dur = ts.duration_ms || t.duration_ms;
        setFill(Math.max(0, Math.min(1, elapsed / dur)));
        setText(amtEl, rewardLabel(t) + " · ");
        setText(timeEl, Math.max(0, (dur - elapsed) / 1e3).toFixed(1) + "s");
      } else {
        setFill(0);
        setText(amtEl, "▸ " + rewardLabel(t));
        setText(timeEl, "");
      }
    });
  }
  function paintStats() {
    const statsEl = panelsEl.querySelector(".mg-s1-stats");
    if (statsEl && !statsEl.hidden) {
      const rate = netRate(state, cfg);
      const bitsDisplay = toDisplay(fromNumber(Math.floor(bigToNum2(state.bits))));
      setHtml(
        statsEl,
        '<span class="mg-s1-stat">Bits: <strong>' + bitsDisplay + '</strong></span><span class="mg-s1-stat">Total: <strong>' + toDisplay(state.totalBits) + '</strong></span><span class="mg-s1-stat' + (rate < 0 ? " mg-s1-neg" : "") + '">Rate: <strong>' + (rate < 0 ? "-" : "") + toDisplay(fromNumber(Math.abs(rate))) + "/s</strong></span>"
      );
    }
    const bossBtn = panelsEl.querySelector(".mg-s1-boss");
    if (bossBtn) setHidden(bossBtn, hooks.isBeaten && hooks.isBeaten() || !(hooks.canFightBoss && hooks.canFightBoss()));
  }
  return { renderPanel, paintShop, paintTimed, paintStats };
}

// ../../docs/games/metagame/stages/stage1/s1managers.js
var MGR_COUNTS = [1, 10, 100, "max"];
function createManagersController({ panelsEl, state, cfg, tiers, save, paintStats }) {
  const managers = cfg.managers || [];
  const managedTier = (mgr) => tiers.find((t) => t.id === mgr.manages);
  const mgrCountFor = () => state.mgrBuyMult ?? 1;
  const affordableLevels = (mgr) => managerMaxLevels(state.bits, mgr, mgrState(mgr.id).level, cfg);
  function displayLevels(mgr) {
    const sel = mgrCountFor();
    return sel === "max" ? Math.max(1, affordableLevels(mgr)) : sel;
  }
  function actionBtnHtml(mgr) {
    const lvl = mgrState(mgr.id).level;
    const n = displayLevels(mgr);
    const cost = managerTotalCost(mgr, lvl, n, cfg);
    const ongoing = managerRunCostAtLevel(mgr, lvl + n, cfg);
    return (lvl === 0 ? "Hire" : "Level up") + (n > 1 ? " ×" + n : "") + " — " + toDisplay(cost) + '<small class="mg-mgr-ongoing">ongoing ' + toDisplay(fromNumber(ongoing)) + "/s</small>";
  }
  function fireLevels(level) {
    const sel = mgrCountFor();
    return sel === "max" ? level : Math.min(level, sel);
  }
  function fireBtnLabel(level) {
    const sel = mgrCountFor();
    if (sel === "max") return "Fire all";
    const n = Math.min(level, sel);
    return n > 1 ? "Fire ×" + n : "Fire";
  }
  function mgrState(id) {
    state.managers = state.managers || {};
    return state.managers[id] = state.managers[id] || { level: 0, paused: false, lastFire: 0 };
  }
  function mgrCardHtml(mgr) {
    const ms = mgrState(mgr.id);
    const mt = managedTier(mgr);
    const mtName = mt ? mt.icon + " " + mt.name : mgr.manages;
    if (ms.level === 0) {
      return '<div class="mg-mgr-card mg-mgr-unhired" data-id="' + mgr.id + '"><span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span><span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span></span><span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span><button class="mg-mgr-hire" type="button" data-id="' + mgr.id + '" data-act="hire">' + actionBtnHtml(mgr) + "</button></div>";
    }
    const runCost = managerRunCost(mgr.id, state, cfg);
    return '<div class="mg-mgr-card mg-mgr-hired" data-id="' + mgr.id + '"><span class="mg-mgr-head"><span class="mg-mgr-icon">' + escapeHtml(mgr.icon) + '</span><span class="mg-mgr-name">' + escapeHtml(mgr.name) + '</span><span class="mg-mgr-level">Level ' + ms.level + '</span></span><span class="mg-mgr-manages">Manages: ' + escapeHtml(mtName) + '</span><span class="mg-mgr-run">Running cost: <strong class="mg-mgr-runcost">' + toDisplay(fromNumber(runCost)) + "</strong>/s</span>" + (ms.paused ? '<span class="mg-mgr-paused">⏸ Paused (out of bits)</span>' : "") + '<span class="mg-mgr-actions"><button class="mg-mgr-lvl" type="button" data-id="' + mgr.id + '" data-act="lvl">' + actionBtnHtml(mgr) + '</button><button class="mg-mgr-fire" type="button" data-id="' + mgr.id + '" data-act="fire">' + fireBtnLabel(ms.level) + "</button></span></div>";
  }
  function previewNetNeg(mgr) {
    const ms = mgrState(mgr.id);
    const saved = ms.level;
    ms.level = saved + 1;
    const r = netRate(state, cfg);
    ms.level = saved;
    return r < 0;
  }
  function renderPanel() {
    const prevScroll = panelsEl.querySelector(".mg-s1-panel")?.scrollTop || 0;
    const visible = managers.filter((mgr) => {
      const mt = managedTier(mgr);
      return mt && (state.owned[mt.id] || 0) >= 1;
    });
    const rate = netRate(state, cfg);
    const head = '<div class="mg-mgr-net' + (rate < 0 ? " mg-s1-neg" : "") + '">Net rate: <strong>' + (rate < 0 ? "-" : "") + toDisplay(fromNumber(Math.abs(rate))) + "/s</strong></div>";
    const counts = MGR_COUNTS.map((n) => '<button class="mg-mult-b mg-mgr-buyn" type="button" data-n="' + n + '">' + (n === "max" ? "MAX" : "×" + n) + "</button>").join("");
    const selector = visible.length ? '<div class="mg-mgr-buyrow"><span class="mg-mgr-buylabel">Buy</span><span class="mg-s1-counts">' + counts + "</span></div>" : "";
    const body = visible.length ? '<div class="mg-mgr-list">' + visible.map(mgrCardHtml).join("") + "</div>" : '<div class="mg-managers-stub">no managers available yet</div>';
    panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="managers">' + head + selector + body + "</div>";
    const newPanel = panelsEl.querySelector(".mg-s1-panel");
    if (newPanel && prevScroll) newPanel.scrollTop = prevScroll;
    panelsEl.querySelectorAll(".mg-mgr-buyn").forEach((b) => {
      const v = b.dataset.n === "max" ? "max" : Number(b.dataset.n);
      b.classList.toggle("mg-mult-on", String(v) === String(mgrCountFor()));
    });
    paint();
  }
  bindActivate(panelsEl, (target) => {
    if (!target.closest('[data-panel="managers"]')) return null;
    const buyn = target.closest(".mg-mgr-buyn");
    if (buyn) {
      state.mgrBuyMult = buyn.dataset.n === "max" ? "max" : Number(buyn.dataset.n);
      save(state);
      renderPanel();
      return buyn;
    }
    const act = target.closest(".mg-mgr-card [data-act]");
    if (act) {
      const mgr = managers.find((m) => m.id === act.dataset.id);
      if (mgr) mgrAction(mgr, act.dataset.act);
      return act;
    }
    return null;
  });
  const netPreview = (on, target) => {
    const lvlBtn = target.closest && target.closest(".mg-mgr-lvl");
    if (!lvlBtn) return;
    const mgr = managers.find((m) => m.id === lvlBtn.dataset.id);
    const net = panelsEl.querySelector(".mg-mgr-net");
    if (!net) return;
    net.classList.toggle("mg-net-neg-preview", Boolean(on && mgr && previewNetNeg(mgr)));
  };
  panelsEl.addEventListener("mouseover", (e) => netPreview(true, e.target));
  panelsEl.addEventListener("mouseout", (e) => netPreview(false, e.target));
  panelsEl.addEventListener("focusin", (e) => netPreview(true, e.target));
  panelsEl.addEventListener("focusout", (e) => netPreview(false, e.target));
  function paint() {
    const rate = netRate(state, cfg);
    const rateNeg = rate < 0;
    const net = panelsEl.querySelector(".mg-mgr-net");
    if (net) {
      setClass(net, "mg-s1-neg", rateNeg);
      const strong = net.querySelector("strong");
      if (strong) {
        const v = (rateNeg ? "-" : "") + toDisplay(fromNumber(Math.abs(rate))) + "/s";
        if (strong.textContent !== v) strong.textContent = v;
      }
    }
    managers.forEach((mgr) => {
      const ms = mgrState(mgr.id);
      const card = panelsEl.querySelector('.mg-mgr-card[data-id="' + mgr.id + '"]');
      if (!card) return;
      const indicator = card.querySelector(".mg-mgr-paused");
      const wantIndicator = ms.level >= 1 && ms.paused;
      if (wantIndicator && !indicator) {
        const span = document.createElement("span");
        span.className = "mg-mgr-paused";
        span.textContent = "⏸ Paused (out of bits)";
        const actions = card.querySelector(".mg-mgr-actions");
        if (actions) card.insertBefore(span, actions);
        else card.appendChild(span);
      } else if (!wantIndicator && indicator) {
        indicator.remove();
      }
      const btn = card.querySelector(ms.level === 0 ? ".mg-mgr-hire" : ".mg-mgr-lvl");
      if (btn) {
        setHtml(btn, actionBtnHtml(mgr));
        const n = displayLevels(mgr);
        const can = n >= 1 && gte(state.bits, managerTotalCost(mgr, ms.level, n, cfg));
        setClass(btn, "mg-buy-locked", !can);
      }
      const runEl = card.querySelector(".mg-mgr-runcost");
      if (runEl) {
        const v = toDisplay(fromNumber(managerRunCost(mgr.id, state, cfg)));
        if (runEl.textContent !== v) runEl.textContent = v;
        setClass(runEl, "mg-mgr-runcost-neg", rateNeg);
      }
    });
  }
  function mgrAction(mgr, act) {
    const ms = mgrState(mgr.id);
    if (act === "fire") {
      const dec = fireLevels(ms.level);
      ms.level = Math.max(0, ms.level - dec);
      if (ms.level === 0) {
        ms.paused = false;
        ms.lastFire = 0;
      }
      save(state);
      renderPanel();
      paintStats();
      return;
    }
    const n = displayLevels(mgr);
    const cost = managerTotalCost(mgr, ms.level, n, cfg);
    if (n < 1 || !gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    ms.level += n;
    save(state);
    checkMessages("buy", state, bellLoad());
    checkAchievements(state, cfg, bellLoad());
    renderPanel();
    paintStats();
  }
  function runAutoFire() {
    const now = Date.now();
    const broke = state.bits.m === 0;
    const rate = netRate(state, cfg);
    if (rate < 0 && broke) {
      for (const mgr of managers) {
        const ms = mgrState(mgr.id);
        if (ms.level >= 1) ms.paused = true;
      }
    } else if (!broke) {
      for (const mgr of managers) {
        const ms = mgrState(mgr.id);
        if (ms.level >= 1 && ms.paused) ms.paused = false;
      }
    }
    for (const mgr of managers) {
      const ms = mgrState(mgr.id);
      if (ms.level < 1 || ms.paused) continue;
      const mt = managedTier(mgr);
      if (!mt || mt.type !== "timed" || (state.owned[mt.id] || 0) < 1) continue;
      const ts = state.timedStates[mt.id];
      if (ts && ts.active) continue;
      const interval = autoInterval(mt.duration_ms, ms.level);
      if (now - (ms.lastFire || 0) >= interval) {
        state.timedStates[mt.id] = { active: true, startedAt: now, duration_ms: interval };
        ms.lastFire = now;
      }
    }
  }
  return { renderPanel, paint, runAutoFire };
}

// ../../docs/games/metagame/stages/stage1/s1cores.js
var CORE_UPGRADES = [
  {
    id: "core-yield",
    icon: "📈",
    name: "Overclock",
    max: 10,
    cost: (l) => 1 + l,
    desc: "+10% to ALL bit income per level",
    effect: (l) => ({ incomeMult: 1 + 0.1 * l })
  },
  {
    id: "core-compound",
    icon: "🔁",
    name: "Recursion Core",
    max: 15,
    cost: (l) => 2 + 2 * l,
    desc: "+12% COMPOUNDING income per level — a deep, long-haul investment",
    effect: (l) => ({ incomeMult: Math.pow(1.12, l) })
  },
  {
    id: "core-dividend",
    icon: "⬡",
    name: "Core Dividend",
    max: 5,
    cost: (l) => 5 + 5 * l,
    desc: "+1 ⬡ Core per prestige per level — spend Cores to earn more Cores",
    effect: (l) => ({ coreBonus: l })
  },
  {
    id: "core-startmult",
    icon: "✖",
    name: "Warm Cache",
    max: 25,
    cost: (l) => 1 + l,
    desc: "Start each run with +N Multiplier levels",
    effect: (l) => ({ start: { "s1-mult": l } })
  },
  {
    id: "core-startbox",
    icon: "🧰",
    name: "Cached Boxes",
    max: 10,
    cost: (l) => 2 + 2 * l,
    desc: "Start each run with +N Bit Boxes",
    effect: (l) => ({ start: { "s1-box": l } })
  },
  {
    id: "core-automult",
    icon: "🤖",
    name: "Auto-Tapper",
    max: 1,
    cost: () => 3,
    desc: "Auto-buys the Multiplier whenever you can afford it",
    effect: () => ({ autoMult: true })
  }
];
function coreLevel(state, id) {
  return (state.coreUpgrades || {})[id] || 0;
}
function coreCostOf(up, level) {
  return up.cost(level);
}
function canBuyCore(state, id) {
  const up = CORE_UPGRADES.find((u) => u.id === id);
  if (!up) return false;
  const lvl = coreLevel(state, id);
  return lvl < up.max && (state.cores || 0) >= coreCostOf(up, lvl);
}
function buyCore(state, id) {
  if (!canBuyCore(state, id)) return false;
  const up = CORE_UPGRADES.find((u) => u.id === id);
  const lvl = coreLevel(state, id);
  state.cores = (state.cores || 0) - coreCostOf(up, lvl);
  state.coreUpgrades = state.coreUpgrades || {};
  state.coreUpgrades[id] = lvl + 1;
  return true;
}
function coreEffects(state) {
  const eff = { incomeMult: 1, start: {}, autoMult: false, coreBonus: 0 };
  for (const up of CORE_UPGRADES) {
    const lvl = coreLevel(state, up.id);
    if (lvl <= 0) continue;
    const e = up.effect(lvl);
    if (e.incomeMult) eff.incomeMult *= e.incomeMult;
    if (e.autoMult) eff.autoMult = true;
    if (e.coreBonus) eff.coreBonus += e.coreBonus;
    if (e.start) for (const k in e.start) eff.start[k] = (eff.start[k] || 0) + e.start[k];
  }
  return eff;
}
function coreIncomeMult(state) {
  return coreEffects(state).incomeMult;
}
function coreAutoMult(state) {
  return coreEffects(state).autoMult;
}
function coreGainBonus(state) {
  return coreEffects(state).coreBonus;
}
function applyCoreStartState(state) {
  const start = coreEffects(state).start;
  state.owned = state.owned || {};
  for (const k in start) if (start[k] > 0) state.owned[k] = (state.owned[k] || 0) + start[k];
}

// ../../docs/games/metagame/stages/stage1/s1prestige.js
var MECHANICS = [
  {
    id: "pipeline",
    depth: 1,
    icon: "🔌",
    name: "Pipeline",
    blurb: "Wire a builder so it auto-runs — for an ongoing upkeep cost."
  },
  {
    id: "flux",
    depth: 2,
    icon: "⚡",
    name: "Flux",
    blurb: "A burst meter charges; ride it to 100% for ×3 income, or cash early for ×1.5."
  },
  {
    id: "entropy",
    depth: 3,
    icon: "🜂",
    name: "Entropy",
    blurb: "Unmanaged tiers decay 1 unit/min (floor 1). Choose what to let rot."
  },
  {
    id: "echoes",
    depth: 4,
    icon: "👾",
    name: "Defrag Echoes",
    blurb: "A corrupted glyph spawns; click it in time or lose 20% of your bits."
  },
  {
    id: "resonance",
    depth: 5,
    icon: "🎚",
    name: "Resonance",
    blurb: "Hidden tier-ratio sweet spots grant a big bonus. Discover them."
  }
];
function prestigeDepth(state) {
  return Math.max(0, state.prestigeCount || 0);
}
function mechanicUnlocked(state, id) {
  const m = MECHANICS.find((x) => x.id === id);
  return Boolean(m && prestigeDepth(state) >= m.depth);
}
function unlockedMechanics(state) {
  return MECHANICS.filter((m) => prestigeDepth(state) >= m.depth);
}
function nextMechanic(state) {
  const nextDepth = prestigeDepth(state) + 1;
  return MECHANICS.find((m) => m.depth === nextDepth) || null;
}
function coreGain(totalBitsAtReset) {
  const n = toNumber(totalBitsAtReset);
  const ratio = Math.max(1, n / RESET_UNLOCK_BITS);
  return Math.max(1, 1 + Math.floor(Math.log10(ratio)));
}
function coreGainFor(state) {
  return coreGain(state.totalBits) + coreGainBonus(state);
}
function doPrestige(state) {
  const gain = pullGain(state.totalBits);
  const cores = coreGain(state.totalBits) + coreGainBonus(state);
  state.pullFactors = [...state.pullFactors || [], gain];
  state.cores = (state.cores || 0) + cores;
  state.prestigeCount = (state.prestigeCount || 0) + 1;
  state.bits = ZERO;
  state.totalBits = ZERO;
  state.owned = {};
  state.timedStates = {};
  state.managers = {};
  state.pipelines = {};
  state.pipelineProgress = {};
  state.flux = { meter: 0, boostMult: 1, boostTicks: 0 };
  state.echo = { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  state.ticks = 0;
  applyCoreStartState(state);
  return { gain, cores };
}

// ../../docs/games/metagame/stages/stage1/s1pipeline.js
var PIPE_UPKEEP_COEFF = 0.02;
var TICKS_PER_SEC = 10;
function wirableTiers(cfg) {
  return (cfg.tiers || []).filter((t) => t.type === "timed" && t.produces);
}
function isWired(state, tierId) {
  return Boolean((state.pipelines || {})[tierId]);
}
function togglePipeline(state, tierId) {
  state.pipelines = state.pipelines || {};
  if (state.pipelines[tierId]) delete state.pipelines[tierId];
  else state.pipelines[tierId] = true;
  return Boolean(state.pipelines[tierId]);
}
function pipelineUpkeepOf(state, cfg, tierId) {
  if (!isWired(state, tierId)) return 0;
  const t = (cfg.tiers || []).find((x) => x.id === tierId);
  const owned = (state.owned || {})[tierId] || 0;
  if (!t || owned <= 0) return 0;
  return PIPE_UPKEEP_COEFF * toNumber(t.base) * owned;
}
function tickPipelines(state, cfg) {
  state.pipelineProgress = state.pipelineProgress || {};
  let produced = false;
  for (const t of wirableTiers(cfg)) {
    if (!isWired(state, t.id)) continue;
    const owned = (state.owned || {})[t.id] || 0;
    if (owned <= 0) continue;
    const upkeepTick = fromNumber(pipelineUpkeepOf(state, cfg, t.id) / TICKS_PER_SEC);
    if (!gte(state.bits, upkeepTick)) continue;
    state.bits = sub(state.bits, upkeepTick);
    const cycleTicks = Math.max(1, Math.round((t.duration_ms || 4e3) / 100));
    const next = (state.pipelineProgress[t.id] || 0) + 1;
    if (next >= cycleTicks) {
      state.pipelineProgress[t.id] = 0;
      const prod = timedProduction(state, cfg, t.id);
      if (prod && prod.amount > 0) {
        state.owned[prod.targetId] = (state.owned[prod.targetId] || 0) + prod.amount;
        produced = true;
      }
    } else {
      state.pipelineProgress[t.id] = next;
    }
  }
  return produced;
}

// ../../docs/games/metagame/stages/stage1/s1flux.js
var FLUX_CHARGE_PER_TICK = 0.8;
var FLUX_BOOST_TICKS = 100;
var RIDE_MULT = 3;
var CASH_MULT = 1.5;
function fluxState(state) {
  if (!state.flux || typeof state.flux !== "object") state.flux = { meter: 0, boostMult: 1, boostTicks: 0 };
  return state.flux;
}
function fluxMult(state) {
  const f = fluxState(state);
  return f.boostTicks > 0 ? f.boostMult : 1;
}
function fluxMeter(state) {
  return fluxState(state).meter;
}
function fluxBoostTicks(state) {
  return fluxState(state).boostTicks;
}
function fluxCanCash(state) {
  const f = fluxState(state);
  return f.boostTicks <= 0 && f.meter > 0 && f.meter < 100;
}
function cashFlux(state) {
  const f = fluxState(state);
  if (!fluxCanCash(state)) return false;
  f.boostMult = CASH_MULT;
  f.boostTicks = FLUX_BOOST_TICKS;
  f.meter = 0;
  return true;
}
function tickFlux(state) {
  const f = fluxState(state);
  if (f.boostTicks > 0) {
    f.boostTicks -= 1;
    if (f.boostTicks <= 0) f.boostMult = 1;
    return;
  }
  f.meter = Math.min(100, f.meter + FLUX_CHARGE_PER_TICK);
  if (f.meter >= 100) {
    f.boostMult = RIDE_MULT;
    f.boostTicks = FLUX_BOOST_TICKS;
    f.meter = 0;
  }
}

// ../../docs/games/metagame/stages/stage1/s1resonance.js
var RESONANCE_BANDS = [
  {
    id: "box-boost",
    hi: "s1-box",
    lo: "s1-boost",
    min: 2,
    max: 4,
    bonus: 0.3,
    hint: "Bit Boxes per Signal Booster"
  },
  {
    id: "boost-cluster",
    hi: "s1-boost",
    lo: "s1-cluster",
    min: 2,
    max: 4,
    bonus: 0.25,
    hint: "Signal Boosters per Core Cluster"
  },
  {
    id: "cluster-array",
    hi: "s1-cluster",
    lo: "s1-array",
    min: 2,
    max: 4,
    bonus: 0.2,
    hint: "Core Clusters per Processing Array"
  }
];
function bandActive(state, band) {
  const owned = state.owned || {};
  const hi = owned[band.hi] || 0;
  const lo = owned[band.lo] || 0;
  if (lo < 1 || hi < 1) return false;
  const ratio = hi / lo;
  return ratio >= band.min && ratio <= band.max;
}
function activeBands(state) {
  return RESONANCE_BANDS.filter((b) => bandActive(state, b));
}
function resonanceMult(state) {
  let m = 1;
  for (const b of RESONANCE_BANDS) if (bandActive(state, b)) m *= 1 + b.bonus;
  return m;
}
function tickResonance(state) {
  state.resonanceFound = state.resonanceFound || {};
  let found = false;
  for (const b of RESONANCE_BANDS) {
    if (bandActive(state, b) && !state.resonanceFound[b.id]) {
      state.resonanceFound[b.id] = true;
      found = true;
    }
  }
  return found;
}

// ../../docs/games/metagame/stages/stage1/s1reset.js
var STYLE_ID2 = "mg-s1-prestige-style";
function injectStyle2() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID2)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID2;
  el.textContent = `
.mg-reset-balance { font:600 14px/1.2 ui-monospace,monospace; color:var(--accent); margin:4px 0 10px; }
.mg-reset-next { color:var(--accent); font-size:12px; }
.mg-core-shop,.mg-mech-roster { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-core-shop-title,.mg-mech-title { font-size:11px; letter-spacing:2px; color:var(--fg-2); margin-bottom:8px; text-transform:uppercase; }
.mg-core-card { display:grid; grid-template-columns:1fr auto; gap:2px 10px; align-items:center; padding:7px 0; border-bottom:1px solid var(--border); }
.mg-core-head { font-weight:600; } .mg-core-head small { color:var(--fg-2); font-weight:400; }
.mg-core-desc { grid-column:1; font-size:12px; color:var(--fg-2); }
.mg-core-buy { grid-row:1/3; grid-column:2; background:var(--accent); color:var(--accent-fg); border:0; border-radius:7px; padding:7px 12px; cursor:pointer; font:600 13px ui-monospace,monospace; }
.mg-core-buy.mg-buy-locked { opacity:.45; pointer-events:none; }
.mg-core-max { grid-row:1/3; grid-column:2; color:#3fb950; font-weight:700; font-size:12px; }
.mg-mech-row { display:grid; grid-template-columns:auto 1fr; gap:2px 8px; padding:6px 0; opacity:.45; }
.mg-mech-row.mg-mech-on { opacity:1; }
.mg-mech-icon { grid-row:1/3; font-size:18px; } .mg-mech-name { font-weight:600; } .mg-mech-name small { color:var(--fg-2); font-weight:400; }
.mg-mech-blurb { grid-column:2; font-size:12px; color:var(--fg-2); }
.mg-pipe-shop { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-pipe-row { display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); opacity:.7; }
.mg-pipe-row.mg-pipe-on { opacity:1; }
.mg-pipe-name small { color:var(--fg-2); }
.mg-pipe-upkeep { font:600 12px ui-monospace,monospace; color:#e0742f; }
.mg-pipe-toggle { background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:7px; padding:5px 12px; cursor:pointer; font-size:12px; }
.mg-pipe-row.mg-pipe-on .mg-pipe-toggle { background:var(--accent); color:var(--accent-fg); border-color:var(--accent); }
.mg-flux-shop { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-flux-meter { height:14px; border-radius:7px; background:var(--border); overflow:hidden; margin-bottom:6px; }
.mg-flux-fill { height:100%; width:0%; background:var(--accent); transition:width .12s linear; }
.mg-flux-fill.mg-flux-boosting { background:#e0742f; }
.mg-flux-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mg-flux-status { font:600 12px ui-monospace,monospace; color:var(--fg-2); }
.mg-flux-cash { background:var(--accent); color:var(--accent-fg); border:0; border-radius:7px; padding:6px 14px; cursor:pointer; font:600 12px ui-monospace,monospace; }
.mg-flux-cash.mg-buy-locked { opacity:.45; pointer-events:none; }
.mg-res-shop { margin-top:14px; border-top:1px solid var(--border); padding-top:10px; }
.mg-res-row { display:grid; grid-template-columns:auto 1fr; gap:8px; padding:5px 0; font-size:12px; color:var(--fg-2); }
.mg-res-row.mg-res-on { color:#3fb950; font-weight:600; }
`;
  document.head.appendChild(el);
}
function renderResetPanel(opts) {
  const { panelsEl, state } = opts;
  injectStyle2();
  const gain = pullGain(state.totalBits);
  const newTotal = globalPull(state) * gain;
  const cores = coreGainFor(state);
  const next = nextMechanic(state);
  panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="reset"><div class="mg-reset-panel"><div class="mg-reset-title">🌀 Prestige</div><div class="mg-reset-balance">⬡ <strong>' + (state.cores || 0) + "</strong> Cores · depth " + prestigeDepth(state) + '</div><p class="mg-reset-line">Reset now to gain <strong>×' + toDisplay(fromNumber(gain)) + "</strong> Pull (total <strong>×" + toDisplay(fromNumber(newTotal)) + "</strong>) and <strong>+" + cores + "</strong> ⬡ Cores.</p>" + (next ? '<p class="mg-reset-line mg-reset-next">Next prestige unlocks ' + next.icon + " <strong>" + escapeHtml(next.name) + "</strong> — " + escapeHtml(next.blurb) + "</p>" : "") + '<p class="mg-reset-line">All bits, buildings, and managers are lost.</p><p class="mg-reset-line mg-reset-keep">Cores, upgrades, achievements, and pull persist.</p><div class="mg-reset-actions"><button class="mg-reset-go" type="button">Prestige</button><button class="mg-reset-cancel" type="button">Cancel</button></div>' + fluxHtml(state) + resonanceHtml(state) + pipelineHtml(opts) + coreShopHtml(state) + mechanicsRosterHtml(state) + "</div></div>";
  panelsEl.querySelector(".mg-reset-go").addEventListener("click", () => doReset(opts));
  panelsEl.querySelector(".mg-reset-cancel").addEventListener("click", () => renderResetPanel(opts));
  panelsEl.querySelectorAll(".mg-core-buy").forEach((b) => b.addEventListener("click", () => {
    if (buyCore(state, b.dataset.id)) {
      opts.save(state);
      renderResetPanel(opts);
    }
  }));
  panelsEl.querySelectorAll(".mg-pipe-toggle").forEach((b) => b.addEventListener("click", () => {
    togglePipeline(state, b.dataset.id);
    opts.save(state);
    renderResetPanel(opts);
  }));
  const cashBtn = panelsEl.querySelector(".mg-flux-cash");
  if (cashBtn) cashBtn.addEventListener("click", () => {
    if (cashFlux(state)) {
      opts.save(state);
      paintResetPanel(panelsEl, state);
    }
  });
}
function resonanceHtml(state) {
  if (!mechanicUnlocked(state, "resonance")) return "";
  const active = new Set(activeBands(state).map((b) => b.id));
  const found = state.resonanceFound || {};
  const rows = RESONANCE_BANDS.map((b) => {
    const isFound = found[b.id];
    const isOn = active.has(b.id);
    const label = isFound ? escapeHtml(b.hint) + " " + b.min + "–" + b.max + " → +" + Math.round(b.bonus * 100) + "%" : "??? — find the ratio";
    return '<div class="mg-res-row' + (isOn ? " mg-res-on" : "") + '"><span>' + (isOn ? "🎚" : isFound ? "·" : "🔒") + "</span><span>" + label + "</span></div>";
  }).join("");
  return '<div class="mg-res-shop"><div class="mg-core-shop-title">🎚 Resonance — tier-ratio sweet spots</div>' + rows + "</div>";
}
function fluxHtml(state) {
  if (!mechanicUnlocked(state, "flux")) return "";
  return '<div class="mg-flux-shop"><div class="mg-core-shop-title">⚡ Flux — burst meter</div><div class="mg-flux-meter"><div class="mg-flux-fill"></div></div><div class="mg-flux-row"><span class="mg-flux-status"></span><button class="mg-flux-cash" type="button">Cash now ×1.5</button></div></div>';
}
function paintResetPanel(panelsEl, state) {
  const fill = panelsEl.querySelector(".mg-flux-fill");
  if (fill) {
    const boosting = fluxBoostTicks(state) > 0;
    fill.style.width = (boosting ? 100 : fluxMeter(state)) + "%";
    fill.classList.toggle("mg-flux-boosting", boosting);
    const status = panelsEl.querySelector(".mg-flux-status");
    if (status) status.textContent = boosting ? "🔥 ×" + fluxMult(state).toFixed(1) + " active (" + (fluxBoostTicks(state) / 10).toFixed(1) + "s)" : Math.floor(fluxMeter(state)) + "% — fills to ×3, or cash now";
    const cashBtn = panelsEl.querySelector(".mg-flux-cash");
    if (cashBtn) cashBtn.classList.toggle("mg-buy-locked", !fluxCanCash(state));
  }
}
function pipelineHtml(opts) {
  const { state, cfg } = opts;
  if (!mechanicUnlocked(state, "pipeline")) return "";
  const rows = wirableTiers(cfg).map((t) => {
    const owned = (state.owned || {})[t.id] || 0;
    const wired = isWired(state, t.id);
    const upkeep = pipelineUpkeepOf(state, cfg, t.id);
    return '<div class="mg-pipe-row' + (wired ? " mg-pipe-on" : "") + '"><span class="mg-pipe-name">' + escapeHtml(t.icon + " " + t.name) + " <small>×" + owned + '</small></span><span class="mg-pipe-upkeep">' + (wired ? toDisplay(fromNumber(upkeep)) + "/s" : "") + '</span><button class="mg-pipe-toggle" type="button" data-id="' + t.id + '">' + (wired ? "Unwire" : "Wire") + "</button></div>";
  }).join("");
  return '<div class="mg-pipe-shop"><div class="mg-core-shop-title">🔌 Pipeline — auto-run builders (upkeep)</div>' + rows + "</div>";
}
function coreShopHtml(state) {
  const rows = CORE_UPGRADES.map((up) => {
    const lvl = coreLevel(state, up.id);
    const maxed = lvl >= up.max;
    const cost = coreCostOf(up, lvl);
    const can = canBuyCore(state, up.id);
    const btn = maxed ? '<span class="mg-core-max">MAX</span>' : '<button class="mg-core-buy' + (can ? "" : " mg-buy-locked") + '" type="button" data-id="' + up.id + '">' + cost + " ⬡</button>";
    return '<div class="mg-core-card"><span class="mg-core-head">' + escapeHtml(up.icon) + " " + escapeHtml(up.name) + " <small>Lv " + lvl + (up.max > 1 ? "/" + up.max : "") + '</small></span><span class="mg-core-desc">' + escapeHtml(up.desc) + "</span>" + btn + "</div>";
  }).join("");
  return '<div class="mg-core-shop"><div class="mg-core-shop-title">⬡ Cores — permanent upgrades</div>' + rows + "</div>";
}
function mechanicsRosterHtml(state) {
  const depth = prestigeDepth(state);
  const rows = MECHANICS.map((m) => {
    const on = depth >= m.depth;
    return '<div class="mg-mech-row' + (on ? " mg-mech-on" : "") + '"><span class="mg-mech-icon">' + escapeHtml(m.icon) + '</span><span class="mg-mech-name">' + escapeHtml(m.name) + (on ? "" : " <small>(prestige " + m.depth + ")</small>") + '</span><span class="mg-mech-blurb">' + escapeHtml(m.blurb) + "</span></div>";
  }).join("");
  return '<div class="mg-mech-roster"><div class="mg-mech-title">Post-prestige mechanics</div>' + rows + "</div>";
}
function doReset(opts) {
  const { state, cfg, save, renderAll } = opts;
  doPrestige(state);
  state.runStartedAt = Date.now();
  save(state);
  checkMessages("prestige", state, bellLoad());
  checkAchievements(state, cfg, bellLoad());
  renderAll();
}

// ../../docs/games/metagame/stages/stage1/s1achpanel.js
var PER_ACH_MULT = 1.02;
function renderAchievementsPanel({ panelsEl, state }) {
  const unlocked = new Set(state.achievements || []);
  const list = ACHIEVEMENTS1.filter((a) => a.id !== "ach-boss-cheat-found");
  const n = list.filter((a) => unlocked.has(a.id)).length;
  const total = Math.pow(PER_ACH_MULT, n);
  const pct = Math.round((total - 1) * 100);
  const head = '<div class="mg-s1-ach-head"><span class="mg-s1-ach-count">🏆 ' + n + " / " + list.length + '</span><span class="mg-s1-ach-mult">×' + total.toFixed(2) + " <small>+" + pct + "% to clicks &amp; income</small></span></div>";
  const rows = list.map((a) => {
    const got = unlocked.has(a.id);
    const secret = a.secret && !got;
    const icon = secret ? "❔" : a.icon || "🏆";
    const name = secret ? '??? <span class="mg-s1-ach-secret">hidden</span>' : escapeHtml(a.name);
    const desc = secret ? "Unlock condition hidden — keep playing." : escapeHtml(a.bell || "");
    const cls = got ? " mg-s1-ach-got" : " mg-s1-ach-locked";
    return '<div class="mg-s1-ach' + cls + '"><span class="mg-s1-ach-icon">' + icon + '</span><span class="mg-s1-ach-text"><strong>' + name + '</strong><span class="mg-s1-ach-desc">' + desc + '</span></span><span class="mg-s1-ach-chip" title="Each achievement grants ×1.02 to clicks &amp; income">+2%</span></div>';
  }).join("");
  panelsEl.innerHTML = '<div class="mg-s1-panel" data-panel="achievements">' + head + '<div class="mg-s1-ach-list">' + rows + "</div></div>";
}

// ../../docs/games/metagame/stages/stage1/s1echoes.js
var ECHO_INTERVAL = 1200;
var ECHO_TTL = 900;
var MISS_PENALTY = 0.8;
var REWARD_SECONDS = 60;
function echoState(state) {
  if (!state.echo || typeof state.echo !== "object") state.echo = { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  return state.echo;
}
function echoActive(state) {
  return Boolean(echoState(state).active);
}
function echoTimeLeft(state) {
  const e = echoState(state);
  return e.active ? Math.max(0, e.expireTick - (state.ticks || 0)) : 0;
}
function clickEcho(state, cfg) {
  const e = echoState(state);
  if (!e.active) return false;
  e.active = false;
  e.lastTick = state.ticks || 0;
  const reward = fromNumber(passiveRate(state, cfg) * REWARD_SECONDS);
  state.bits = add(state.bits, reward);
  state.totalBits = add(state.totalBits, reward);
  return true;
}
function tickEcho(state) {
  const e = echoState(state);
  const now = state.ticks || 0;
  if (e.active) {
    if (now >= e.expireTick) {
      e.active = false;
      e.lastTick = now;
      state.bits = mulScalar(state.bits, MISS_PENALTY);
      return { spawned: false, expired: true };
    }
    return { spawned: false, expired: false };
  }
  if (now - (e.lastTick || 0) >= ECHO_INTERVAL) {
    e.active = true;
    e.spawnTick = now;
    e.expireTick = now + ECHO_TTL;
    return { spawned: true, expired: false };
  }
  return { spawned: false, expired: false };
}

// ../../docs/games/metagame/stages/stage1/s1debug.js
function installStage1Debug(api) {
  if (typeof window === "undefined") return { destroy() {
  } };
  const { state, cfg, save } = api;
  const cheatDisabled = () => Boolean(api.actions && typeof api.actions.hasAction === "function" && api.actions.hasAction(1, "cheat_disabled"));
  function fightBoss(opts = {}) {
    if (!api.canFightBoss()) {
      return { gated: true, allTiers: api.allSubStagesOwned(), reason: "boss locked — need all tiers owned and bits ≥ ticket" };
    }
    const cheatActive = !cheatDisabled();
    const result = simulateFight({ cheatActive, tapsPerSec: opts.tapsPerSec || 12, seed: (state.ticks || 0) + 1 });
    if (result.won) {
      state.defeated = Array.isArray(state.defeated) ? state.defeated : [];
      if (!state.defeated.includes(1)) state.defeated.push(1);
      save(state);
      if (typeof api.onStageComplete === "function") api.onStageComplete({ stage: 1, defeated: true });
    }
    return result;
  }
  window.__fvStage1 = {
    state: () => state,
    // Run the real 100 ms logic tick n times (advances the tick-count-driven prestige mechanics).
    tick(n = 1) {
      for (let i = 0; i < n; i++) api.tick();
    },
    // Simulate n Compute taps through the real economy.
    addBits(n = 1) {
      for (let i = 0; i < n; i++) api.addBits();
    },
    // Fast-forward the run to a boss-ready state: every tier owned ≥1, bits = ticket, totalBits high
    // enough that a prestige is allowed. Does NOT defeat the boss — only makes the gate satisfiable.
    grind() {
      state.owned = state.owned || {};
      for (const t of cfg.tiers || []) state.owned[t.id] = Math.max(1, state.owned[t.id] || 0);
      state.tabsUnlocked = true;
      if (cfg.bossTicket) state.bits = { ...cfg.bossTicket };
      state.totalBits = fromNumber(1e18);
      save(state);
      api.renderAll();
    },
    canFightBoss: () => api.canFightBoss(),
    allTiersOwned: () => api.allSubStagesOwned(),
    cheatDisabled,
    // Test convenience: toggle the cheat action directly (the smoke prefers the REAL raw-edit path).
    setCheat(disabled) {
      if (!api.actions) return false;
      if (disabled && typeof api.actions.setAction === "function") {
        api.actions.setAction(1, "cheat_disabled", { source: "debug-hook" });
        return true;
      }
      if (!disabled && typeof api.actions.clearAction === "function") {
        api.actions.clearAction(1, "cheat_disabled");
        return true;
      }
      return false;
    },
    prestige() {
      const r = doPrestige(state);
      state.runStartedAt = Date.now();
      save(state);
      api.renderAll();
      return { ...r, depth: state.prestigeCount };
    },
    mechanics: () => unlockedMechanics(state).map((m) => m.id),
    clickEcho() {
      const ok = clickEcho(state, cfg);
      if (ok) {
        save(state);
        if (api.updateEcho) api.updateEcho();
      }
      return ok;
    },
    bossSolver: (opts) => simulateFight({ cheatActive: !cheatDisabled(), tapsPerSec: opts && opts.tapsPerSec || 12, seed: (state.ticks || 0) + 1 }),
    fightBoss
  };
  return { destroy() {
    if (window.__fvStage1) delete window.__fvStage1;
  } };
}

// ../../docs/games/metagame/stages/stage1/s1layout.js
var GRID_COLS = 20;
var GRID_ROWS = 5;
var GRID_CELLS = GRID_COLS * GRID_ROWS;
function stage1Markup(multTier) {
  return '<div class="mg-wrap mg-s1"><div class="mg-s1-hud" hidden>  <span class="mg-s1-grav" hidden>🌀 ×1.0</span>  <span class="mg-s1-score"><strong class="mg-s1-score-val">0</strong> bits</span></div><div class="mg-s1-help" hidden></div><button class="mg-s1-echo" type="button" hidden aria-label="defrag the corrupted glyph">👾<span class="mg-s1-echo-t"></span></button><div class="mg-s1-top">  <div class="mg-s1-tap" aria-label="tap to compute"></div>  <div class="mg-s1-stage">    <button class="mg-s1-btn mg-compute" type="button">' + (multTier ? multTier.icon + " " + multTier.name : "Compute") + '</button>    <div class="mg-s1-grid" aria-hidden="true"></div>  </div></div><div class="mg-s1-tabs" role="tablist" aria-label="Bit Foundry progression"></div><div class="mg-s1-panels"></div></div>';
}
var ECHO_STYLE_ID = "mg-s1-echo-style";
function injectEchoStyle() {
  if (typeof document === "undefined" || document.getElementById(ECHO_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = ECHO_STYLE_ID;
  el.textContent = `
.mg-s1-echo { position:absolute; top:48px; right:14px; z-index:6; display:flex; flex-direction:column; align-items:center;
  gap:1px; background:#3a1020; color:#ff6b9d; border:1px solid #ff6b9d; border-radius:10px; padding:6px 9px;
  font-size:20px; cursor:pointer; animation:mg-s1-echo-pulse .7s ease infinite alternate; }
.mg-s1-echo .mg-s1-echo-t { font:600 10px ui-monospace,monospace; color:#ff6b9d; }
@keyframes mg-s1-echo-pulse { from { transform:scale(1); box-shadow:0 0 0 0 #ff6b9d55; } to { transform:scale(1.08); box-shadow:0 0 12px 2px #ff6b9d55; } }
`;
  document.head.appendChild(el);
}

// ../../docs/games/metagame/stages/stage1/s1hud.js
var HELP_SECTIONS = [
  ["👆 Tap", "Tap the top area to compute bits. The ✖ Multiplier adds +1 bit per tap each level."],
  ["🧰 Bit Box", "Tap it to run a timed cycle that pays out bits. Your main income."],
  ["📡 Signal Booster", "Each cycle BUILDS Bit Boxes for you (and boosts their payout). It makes machines, not bits."],
  ["🧊 Core Cluster", "Each cycle BUILDS Signal Boosters — a machine that builds the machine that builds boxes."],
  ["🛠 Managers", "Hire one to auto-run a builder for a per-second bit cost. Watch the net rate stays positive."],
  ["🌀 Reset", "Once your total reaches ~1ab bits you may reset for a permanent ×pull multiplier on everything."]
];
function createHud({ hudEl, scoreValEl, gravEl, helpEl, state }) {
  function renderHelp() {
    setHtml(helpEl, '<div class="mg-s1-help-title">How the Foundry works</div>' + HELP_SECTIONS.map(([h, b]) => '<div class="mg-s1-help-row"><strong>' + escapeHtml(h) + "</strong><span>" + escapeHtml(b) + "</span></div>").join(""));
  }
  function toggleHelp() {
    const open = helpEl.hidden;
    if (open) renderHelp();
    setHidden(helpEl, !open);
  }
  let lastScoreAt = 0;
  function updateHud() {
    const scoreOn = (state.milestones || []).includes("score-unlock") || bigToNum2(state.totalBits) >= 400;
    setHidden(hudEl, !scoreOn);
    if (!scoreOn) return;
    const grav = globalPull(state);
    if (grav > 1.0001) {
      setText(gravEl, "🌀 ×" + toDisplay(fromNumber(grav)));
      setHidden(gravEl, false);
    } else setHidden(gravEl, true);
    const now = Date.now();
    if (now - lastScoreAt >= 250) {
      lastScoreAt = now;
      setText(scoreValEl, toDisplay(fromNumber(Math.floor(bigToNum2(state.bits)))));
    }
  }
  return { updateHud, toggleHelp };
}

// ../../docs/games/metagame/stages/stage1/s1reveal.js
function createReveal({ host, grid, computeBtn, state, multTier }) {
  const cells = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const c = Math.floor(i / GRID_ROWS), r = i % GRID_ROWS;
    const cell = document.createElement("div");
    cell.className = "mg-s1-cell";
    cell.style.gridColumn = c + 1;
    cell.style.gridRow = r + 1;
    cell.dataset.i = String(i);
    grid.appendChild(cell);
    cells.push(cell);
  }
  function reveal() {
    if (state.tabsUnlocked) return;
    const wrapper = host.querySelector(".mg-wrap.mg-s1");
    if (wrapper) wrapper.classList.toggle("mg-s1-empty", bigToNum2(state.bits) <= 0 && bigToNum2(state.totalBits) <= 0);
    const bits = bigToNum2(state.bits);
    const owned = state.owned["s1-mult"] || 0;
    const cost = multTier ? totalCost(multTier, owned, 1) : fromNumber(GRID_CELLS);
    const target = Math.max(1, bigToNum2(cost));
    const progress = Math.max(0, Math.min(1, bits / target));
    const n = bits <= 0 ? 0 : Math.min(GRID_CELLS, Math.max(1, Math.floor(GRID_CELLS * progress)));
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle("mg-s1-on", i < n);
    const done = progress >= 1;
    computeBtn.style.opacity = done ? "" : String(progress);
    computeBtn.classList.toggle("mg-s1-ready", done);
    grid.classList.toggle("mg-s1-clear", done);
  }
  return { reveal };
}

// ../../docs/games/metagame/stages/stage1/s1entropy.js
var ENTROPY_PERIOD = 600;
function decayableTiers(cfg) {
  return (cfg.tiers || []).filter((t) => t.type === "timed");
}
function isProtected(state, cfg, tierId) {
  if ((state.pipelines || {})[tierId]) return true;
  const mgr = (cfg.managers || []).find((m) => m.manages === tierId);
  if (!mgr) return false;
  const ms = (state.managers || {})[mgr.id];
  return Boolean(ms && ms.level >= 1 && !ms.paused);
}
function tickEntropy(state, cfg) {
  if ((state.ticks || 0) % ENTROPY_PERIOD !== 0) return false;
  let decayed = false;
  state.owned = state.owned || {};
  for (const t of decayableTiers(cfg)) {
    const owned = state.owned[t.id] || 0;
    if (owned > 1 && !isProtected(state, cfg, t.id)) {
      state.owned[t.id] = owned - 1;
      decayed = true;
    }
  }
  return decayed;
}

// ../../docs/games/metagame/stages/stage1/s1mechanics.js
function incomeMult(state) {
  let m = coreIncomeMult(state);
  if (mechanicUnlocked(state, "flux")) m *= fluxMult(state);
  if (mechanicUnlocked(state, "resonance")) m *= resonanceMult(state);
  return m;
}
function tickMechanics(state, cfg) {
  state.ticks = (state.ticks || 0) + 1;
  let producedUnits = false;
  if (mechanicUnlocked(state, "pipeline")) producedUnits = tickPipelines(state, cfg) || producedUnits;
  if (mechanicUnlocked(state, "flux")) tickFlux(state);
  if (mechanicUnlocked(state, "entropy")) producedUnits = tickEntropy(state, cfg) || producedUnits;
  let echo = null;
  if (mechanicUnlocked(state, "echoes")) echo = tickEcho(state, cfg);
  if (mechanicUnlocked(state, "resonance")) tickResonance(state);
  return { producedUnits, echo };
}

// ../../docs/games/metagame/stages/stage1/s1tick.js
import { hiddenTab } from "../../shared/frame-loop.js";
function createTickLoop(deps) {
  const {
    host,
    grid,
    state,
    cfg,
    bell,
    save,
    timedTiers,
    multTier,
    panelsEl,
    managersController,
    getActiveTab,
    reveal,
    checkTabUnlock,
    updateHud,
    updateEcho,
    renderTabs,
    paintShop,
    paintTimed,
    paintStats,
    onTeardown
  } = deps;
  let tickAcc = 0;
  let wasHidden = false;
  function tick() {
    if (!host.isConnected || !grid.isConnected) {
      onTeardown();
      return;
    }
    const hidden = hiddenTab();
    if (hidden) wasHidden = true;
    else if (wasHidden) {
      wasHidden = false;
      if (state.tabsUnlocked) renderTabs();
      updateEcho();
    }
    const activeTab = getActiveTab();
    const incMult = incomeMult(state, cfg);
    const passive = mulScalar(fromNumber(passiveRate(state, cfg) * incMult), 1 / 10);
    state.bits = add(state.bits, passive);
    state.totalBits = add(state.totalBits, passive);
    state.bits = sub(state.bits, mulScalar(fromNumber(managerCostPerSec(state, cfg)), 1 / 10));
    const rate = netRate(state, cfg);
    if (rate < 0) {
      if (!state._netNegSince) state._netNegSince = Date.now();
    } else state._netNegSince = 0;
    let timedDone = false;
    let builtUnits = false;
    for (const t of timedTiers) {
      const ts = state.timedStates[t.id];
      if (!ts || !ts.active) continue;
      if (Date.now() - ts.startedAt >= (ts.duration_ms || t.duration_ms)) {
        if (t.produces) {
          const prod = timedProduction(state, cfg, t.id);
          if (prod && prod.amount > 0) {
            state.owned[prod.targetId] = (state.owned[prod.targetId] || 0) + prod.amount;
            builtUnits = true;
          }
        } else {
          const payout = mulScalar(timedPayout(state, cfg, t.id), incMult);
          state.bits = add(state.bits, payout);
          state.totalBits = add(state.totalBits, payout);
        }
        ts.active = false;
        timedDone = true;
      }
    }
    if (timedDone) checkMessages("bit-earn", state, bellLoad(), bell);
    if (builtUnits && state.tabsUnlocked && !hidden) {
      renderTabs();
      if (activeTab === "bits") {
        paintShop();
        paintTimed();
      }
    }
    managersController.runAutoFire();
    const mech = tickMechanics(state, cfg);
    if (mech.producedUnits && state.tabsUnlocked && !hidden) {
      renderTabs();
      if (activeTab === "bits") {
        paintShop();
        paintTimed();
      }
    }
    if (mech.echo && !hidden) updateEcho();
    if (coreAutoMult(state) && multTier) {
      const lvl = state.owned[multTier.id] || 0;
      const cost = totalCost(multTier, lvl, 1);
      if (gte(state.bits, cost)) {
        state.bits = sub(state.bits, cost);
        state.owned[multTier.id] = lvl + 1;
        state.totalBought = (state.totalBought || 0) + 1;
      }
    }
    if (!hidden) reveal();
    checkTabUnlock();
    if (!hidden) updateHud();
    if (state.tabsUnlocked && !hidden) {
      if (activeTab === "bits") {
        paintShop();
        paintTimed();
        paintStats();
      } else if (activeTab === "managers") managersController.paint();
      else if (activeTab === "reset") paintResetPanel(panelsEl, state);
    }
    if (checkAchievements(state, cfg, bellLoad()) && state.tabsUnlocked && !hidden) renderTabs();
    if (++tickAcc >= 10) {
      tickAcc = 0;
      save(state);
    }
  }
  return { tick };
}

// ../../docs/games/metagame/stages/stage1/stage1.js
function renderStage1(ctx2) {
  const { host, state, save, stage, onExit, attachChrome, bell } = ctx2;
  void onExit;
  const sfxOn = () => typeof ctx2.sfxEnabled === "function" ? ctx2.sfxEnabled() : true;
  const cfg = stage();
  if (typeof state.bits === "number") state.bits = fromNumber(state.bits);
  if (typeof state.totalBits === "number") state.totalBits = fromNumber(state.totalBits || 0);
  if (state.totalBits == null) state.totalBits = fromNumber(0);
  state.owned = state.owned || {};
  if (state.owned["s1-cursor"]) {
    state.owned["s1-mult"] = (state.owned["s1-mult"] || 0) + state.owned["s1-cursor"];
    delete state.owned["s1-cursor"];
    save(state);
  }
  if (!state.tabsUnlocked && bigToNum2(state.bits) >= 150) {
    state.tabsUnlocked = true;
    save(state);
  }
  state.timedStates = state.timedStates || {};
  state.managers = state.managers || {};
  let soundOn = (state.milestones || []).includes("sound-unlock");
  let animOn = (state.milestones || []).includes("anim-unlock");
  void animOn;
  let activeTab = "bits";
  const tiers = cfg.tiers || [];
  const multTier = tiers.find((t) => t.id === "s1-mult");
  const timedTiers = tiers.filter((t) => t.type === "timed");
  const beaten = Array.isArray(state.defeated) && state.defeated.includes(1);
  function allSubStagesOwned() {
    return tiers.every((t) => (state.owned[t.id] || 0) >= 1);
  }
  function canFightBoss() {
    return allSubStagesOwned() && cfg.bossTicket && gte(state.bits, cfg.bossTicket);
  }
  const RESET_THRESHOLD = { m: 1, e: 18 };
  const tabVisible = {
    bits: () => true,
    managers: () => (state.owned["s1-box"] || 0) >= 1,
    achievements: () => (state.achievements || []).length >= 1,
    reset: () => gte(state.totalBits, RESET_THRESHOLD) || (state.prestigeCount || 0) >= 1
  };
  const TAB_STEPS = {
    bits: { number: 1, label: "🧮 Bits" },
    managers: { number: 2, label: "🛠 Managers" },
    achievements: { number: 3, label: "🏆 Achievements" },
    reset: { number: 4, label: "🌀 Prestige" }
  };
  host.innerHTML = stage1Markup(multTier);
  const $ = (s) => host.querySelector(s);
  const tap = $(".mg-s1-tap");
  const computeBtn = $(".mg-s1-btn");
  const grid = $(".mg-s1-grid");
  const tabsEl = $(".mg-s1-tabs");
  const panelsEl = $(".mg-s1-panels");
  const hudEl = $(".mg-s1-hud");
  const scoreValEl = $(".mg-s1-score-val");
  const gravEl = $(".mg-s1-grav");
  const helpEl = $(".mg-s1-help");
  const echoEl = $(".mg-s1-echo");
  injectEchoStyle();
  function updateEcho() {
    if (!echoEl) return;
    const active = echoActive(state);
    setHidden(echoEl, !active);
    if (active) {
      const tEl = echoEl.querySelector(".mg-s1-echo-t");
      if (tEl) tEl.textContent = (echoTimeLeft(state) / 10).toFixed(0) + "s";
    }
  }
  if (echoEl) echoEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (clickEcho(state, cfg)) {
      save(state);
      updateEcho();
      updateHud();
    }
  });
  const { updateHud, toggleHelp } = createHud({ hudEl, scoreValEl, gravEl, helpEl, state });
  const { reveal } = createReveal({ host, grid, computeBtn, state, multTier });
  let tabsSig = null;
  function renderTabs() {
    const visible = Object.keys(TAB_STEPS).filter((id) => tabVisible[id]());
    const sig = visible.join(",") + "|" + activeTab;
    if (sig === tabsSig) return;
    tabsSig = sig;
    tabsEl.innerHTML = visible.map((id) => {
      const step = TAB_STEPS[id];
      const current = id === activeTab;
      return '<button class="mg-s1-tab' + (current ? " mg-s1-tab-on" : "") + '" type="button" role="tab" data-tab="' + id + '" data-step="' + step.number + '" aria-selected="' + current + '"' + (current ? ' aria-current="step"' : "") + '><span class="mg-s1-step">Step ' + step.number + "</span><span>" + step.label + "</span></button>";
    }).join("");
    tabsEl.querySelectorAll(".mg-s1-tab").forEach((b) => b.addEventListener("click", () => {
      activeTab = b.dataset.tab;
      renderTabs();
      renderPanel();
    }));
  }
  const shop = createShopController({
    panelsEl,
    state,
    cfg,
    tiers,
    save,
    bell,
    hooks: {
      onEarn: addBits,
      onAfterBuy: afterBuy,
      onBoss: () => ctx2.onBoss && ctx2.onBoss(),
      canFightBoss,
      isBeaten: () => beaten
    }
  });
  const renderBitsPanel = () => shop.renderPanel();
  const paintShop = () => shop.paintShop();
  const paintTimed = () => shop.paintTimed();
  const paintStats = () => shop.paintStats();
  function afterBuy() {
    if (!state.tabsUnlocked) {
      renderAll();
      return;
    }
    renderTabs();
    if (activeTab === "bits") {
      paintShop();
      paintTimed();
      paintStats();
    } else renderPanel();
    updateHud();
  }
  function renderAchievementsPanel2() {
    renderAchievementsPanel({ panelsEl, state });
  }
  const managersController = createManagersController({ panelsEl, state, cfg, tiers, save, paintStats });
  function renderResetPanel2() {
    renderResetPanel({ panelsEl, state, cfg, save, renderAll });
  }
  function renderPanel() {
    if (activeTab !== "bits" && !tabVisible[activeTab]()) activeTab = "bits";
    if (activeTab === "bits") renderBitsPanel();
    else if (activeTab === "managers") managersController.renderPanel();
    else if (activeTab === "achievements") renderAchievementsPanel2();
    else if (activeTab === "reset") renderResetPanel2();
  }
  function renderAll() {
    const wrapper = host.querySelector(".mg-wrap.mg-s1");
    if (wrapper) {
      wrapper.classList.toggle("mg-s1-phase1", !state.tabsUnlocked);
      wrapper.classList.toggle("mg-s1-empty", !state.tabsUnlocked && bigToNum2(state.bits) <= 0 && bigToNum2(state.totalBits) <= 0);
    }
    renderTabs();
    renderPanel();
    updateHud();
    updateEcho();
    if (!state.tabsUnlocked) reveal();
  }
  function checkTabUnlock() {
    if (state.tabsUnlocked) return;
    if (bigToNum2(state.bits) >= 150) {
      state.tabsUnlocked = true;
      save(state);
      renderAll();
    }
  }
  function addBits() {
    const cp = clickPower(state, cfg);
    const gained = fromNumber(cp);
    state.bits = add(state.bits, gained);
    state.totalBits = add(state.totalBits, gained);
    const bs = bellLoad();
    const prevMilestones = (state.milestones || []).length;
    checkMilestones(state, bs, save);
    if ((state.milestones || []).length > prevMilestones) {
      soundOn = (state.milestones || []).includes("sound-unlock");
      animOn = (state.milestones || []).includes("anim-unlock");
    }
    if (soundOn && sfxOn()) clickTick();
    checkMessages("bit-earn", state, bs, bell);
    checkAchievements(state, cfg, bs);
    reveal();
    if (state.tabsUnlocked && activeTab === "bits") paintShop();
    checkTabUnlock();
    updateHud();
  }
  function doPurchase() {
    if (!computeBtn.classList.contains("mg-s1-ready")) return;
    if (!multTier) return;
    const owned = state.owned[multTier.id] || 0;
    const cost = totalCost(multTier, owned, 1);
    if (!gte(state.bits, cost)) return;
    state.bits = sub(state.bits, cost);
    state.owned[multTier.id] = owned + 1;
    state.totalBought = (state.totalBought || 0) + 1;
    save(state);
    const bs = bellLoad();
    checkMessages("buy", state, bs, bell);
    checkMessages("bit-lose", state, bs, bell);
    checkAchievements(state, cfg, bs);
    renderAll();
  }
  tap.addEventListener("pointerdown", (e) => {
    if (computeBtn.classList.contains("mg-s1-ready")) {
      const r = computeBtn.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        doPurchase();
        return;
      }
    }
    addBits();
  });
  computeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doPurchase();
  });
  if (renderStage1._tickId) {
    clearInterval(renderStage1._tickId);
    renderStage1._tickId = null;
  }
  const { tick } = createTickLoop({
    host,
    grid,
    state,
    cfg,
    bell,
    save,
    timedTiers,
    multTier,
    panelsEl,
    managersController,
    getActiveTab: () => activeTab,
    reveal,
    checkTabUnlock,
    updateHud,
    updateEcho,
    renderTabs,
    paintShop,
    paintTimed,
    paintStats,
    onTeardown: () => {
      clearInterval(renderStage1._tickId);
      renderStage1._tickId = null;
      if (renderStage1._debug) {
        renderStage1._debug.destroy();
        renderStage1._debug = null;
      }
    }
  });
  renderStage1._tickId = setInterval(tick, 100);
  renderAll();
  attachChrome(host);
  if (renderStage1._debug && typeof renderStage1._debug.destroy === "function") renderStage1._debug.destroy();
  renderStage1._debug = installStage1Debug({
    state,
    cfg,
    save,
    renderAll,
    tick,
    addBits,
    canFightBoss,
    allSubStagesOwned,
    actions: ctx2.actions,
    onStageComplete: ctx2.onStageComplete,
    updateEcho
  });
  return { toggleHelp, renderAll };
}

// ../../docs/games/metagame/stages/stage1/boss.js
function hasCheatDisabledAction(ctx2 = {}) {
  const actions = ctx2.actions;
  if (!actions || typeof actions.hasAction !== "function") return false;
  return Boolean(actions.hasAction(1, "cheat_disabled"));
}
function mountStage1Boss(arena, ctx2 = {}) {
  const saveStage = () => {
    if (typeof ctx2.save === "function") ctx2.save();
  };
  const ctl = mountDefragmenter(arena, {
    stage: ctx2.stageConfig,
    state: ctx2.state,
    save: saveStage,
    actions: ctx2.actions,
    onDefeat: () => {
      if (typeof ctx2.onStageComplete === "function") {
        ctx2.onStageComplete({ stage: 1, defeated: true });
      }
    },
    onRetreat: ctx2.onRetreat
  });
  return {
    destroy() {
      if (ctl && typeof ctl.destroy === "function") ctl.destroy();
    }
  };
}

// ../../docs/games/metagame/stages/stage1/state.js
function defaultState(context = {}) {
  const now = Number.isFinite(context.now) ? context.now : Date.now();
  return {
    bits: fromNumber(0),
    totalBits: fromNumber(0),
    owned: {},
    timedStates: {},
    managers: {},
    pullFactors: [],
    milestones: [],
    totalBought: 0,
    buyMult: 1,
    bossSeen: false,
    bossLossCount: 0,
    runStartedAt: now,
    introStages: [],
    claimed: {},
    tabsUnlocked: false,
    // ── Prestige meta-progression (post-prestige mechanics + Cores) ──────────────────────────────
    prestigeCount: 0,
    // depth: how many prestiges performed → which mechanics are unlocked
    cores: 0,
    // permanent cross-run meta-currency (earned on prestige)
    coreUpgrades: {},
    // { upgradeId: level } — persist across prestige
    ticks: 0,
    // deterministic game-tick counter (drives the post-prestige mechanics)
    pipelines: {},
    // { tierId: true } — wired builders (auto-run for upkeep)
    pipelineProgress: {},
    // { tierId: ticksAccumulated } — per-pipeline cycle progress
    flux: { meter: 0, boostMult: 1, boostTicks: 0 },
    // burst-meter mechanic
    echo: { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 },
    // defrag-echo attention mechanic
    resonanceFound: {}
    // { bandId: true } — discovered tier-ratio resonances
  };
}
function normalizeState(state, context = {}) {
  const base = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  for (const [key, value] of Object.entries(base)) {
    if (target[key] === void 0) target[key] = value;
  }
  target.bits = typeof target.bits === "number" ? fromNumber(target.bits) : fromStore(target.bits);
  target.totalBits = typeof target.totalBits === "number" ? fromNumber(target.totalBits) : fromStore(target.totalBits);
  target.owned = target.owned && typeof target.owned === "object" ? target.owned : {};
  target.timedStates = target.timedStates && typeof target.timedStates === "object" ? target.timedStates : {};
  target.managers = target.managers && typeof target.managers === "object" ? target.managers : {};
  target.pullFactors = Array.isArray(target.pullFactors) ? target.pullFactors : [];
  target.milestones = Array.isArray(target.milestones) ? target.milestones : [];
  target.totalBought = Number.isFinite(target.totalBought) ? target.totalBought : 0;
  target.buyMult = target.buyMult === "max" || Number.isFinite(target.buyMult) ? target.buyMult : 1;
  target.bossSeen = Boolean(target.bossSeen);
  target.bossLossCount = Number.isFinite(target.bossLossCount) ? target.bossLossCount : 0;
  target.runStartedAt = Number.isFinite(target.runStartedAt) ? target.runStartedAt : base.runStartedAt;
  target.introStages = Array.isArray(target.introStages) ? target.introStages : [];
  target.claimed = target.claimed && typeof target.claimed === "object" ? target.claimed : {};
  target.tabsUnlocked = Boolean(target.tabsUnlocked);
  target.prestigeCount = Number.isFinite(target.prestigeCount) ? target.prestigeCount : 0;
  target.cores = Number.isFinite(target.cores) ? target.cores : 0;
  target.coreUpgrades = target.coreUpgrades && typeof target.coreUpgrades === "object" ? target.coreUpgrades : {};
  target.ticks = Number.isFinite(target.ticks) ? target.ticks : 0;
  target.pipelines = target.pipelines && typeof target.pipelines === "object" ? target.pipelines : {};
  target.pipelineProgress = target.pipelineProgress && typeof target.pipelineProgress === "object" ? target.pipelineProgress : {};
  target.flux = target.flux && typeof target.flux === "object" ? { meter: +target.flux.meter || 0, boostMult: +target.flux.boostMult || 1, boostTicks: +target.flux.boostTicks || 0 } : { meter: 0, boostMult: 1, boostTicks: 0 };
  target.echo = target.echo && typeof target.echo === "object" ? { active: Boolean(target.echo.active), spawnTick: +target.echo.spawnTick || 0, expireTick: +target.echo.expireTick || 0, lastTick: +target.echo.lastTick || 0 } : { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  target.resonanceFound = target.resonanceFound && typeof target.resonanceFound === "object" ? target.resonanceFound : {};
  if (target.owned["s1-cursor"]) {
    target.owned["s1-mult"] = (target.owned["s1-mult"] || 0) + target.owned["s1-cursor"];
    delete target.owned["s1-cursor"];
  }
  delete target.version;
  delete target.stage;
  delete target.defeated;
  delete target.achievements;
  return target;
}

// ../../docs/games/metagame/stages/stage1/s1dev.js
function cheatUnlockTabs(state) {
  state.tabsUnlocked = true;
  state.helpersUnlocked = true;
  const needed = ["score-unlock", "sound-unlock"];
  state.milestones = [.../* @__PURE__ */ new Set([...state.milestones || [], ...needed])];
}
function cheatBossReady(state, cfg) {
  cheatUnlockTabs(state);
  state.owned = state.owned || {};
  for (const t of cfg.tiers || []) {
    if ((state.owned[t.id] || 0) < 1) state.owned[t.id] = 1;
  }
  if (cfg.bossTicket) {
    state.bits = { ...cfg.bossTicket };
    const currentE = state.totalBits && typeof state.totalBits === "object" ? state.totalBits.e || 0 : 0;
    if (currentE < cfg.bossTicket.e) state.totalBits = { ...cfg.bossTicket };
  }
}
function cheatGrantCores(state, amount = 10) {
  state.cores = (state.cores || 0) + amount;
}
function cheatHireAllManagers(state, cfg) {
  state.managers = state.managers || {};
  for (const m of cfg.managers || []) {
    const ms = state.managers[m.id];
    if (!ms || ms.level < 1) {
      state.managers[m.id] = { level: 1, paused: false, lastFire: 0 };
    }
  }
}

// ../../docs/games/metagame/stages/stage1/cheat.js
var CHEAT_LINE_RE = /^\s*CHEAT\s*=\s*(.*?)\s*$/i;
var QUOTED_RE = /^(['"])(.*)\1$/;
var TRUTHY = /* @__PURE__ */ new Set(["true", "1", "yes", "on"]);
var FALSY = /* @__PURE__ */ new Set(["", "false", "0", "no", "off"]);
function normalizeCheatValue(value) {
  let raw = String(value == null ? "" : value).trim();
  const quoted = raw.match(QUOTED_RE);
  if (quoted) raw = quoted[2].trim();
  return raw;
}
function parseCheatLine(line) {
  const match = String(line == null ? "" : line).match(CHEAT_LINE_RE);
  if (!match) return null;
  const value = normalizeCheatValue(match[1]);
  const canonical = value.toLowerCase();
  const truthy = TRUTHY.has(canonical);
  const falsy = FALSY.has(canonical);
  return {
    found: true,
    value,
    canonical,
    truthy,
    falsy,
    cheatActive: truthy,
    disabled: !truthy,
    recognized: truthy || falsy
  };
}
function parseCheatConfig(source) {
  const lines = String(source == null ? "" : source).split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseCheatLine(line);
    if (parsed) return parsed;
  }
  return {
    found: false,
    value: "",
    canonical: "",
    truthy: false,
    falsy: true,
    cheatActive: false,
    disabled: true,
    recognized: true
  };
}
function shouldDisableCheat(source) {
  return parseCheatConfig(source).disabled;
}
function maybeSetCheatDisabledAction(source, actions, detail = {}) {
  const parsed = parseCheatConfig(source);
  if (!parsed.disabled || !actions || typeof actions.setAction !== "function") return false;
  actions.setAction(1, "cheat_disabled", {
    source: "raw-editor",
    file: "Overwriter.frag",
    value: parsed.value,
    ...detail
  });
  return true;
}

// ../../docs/games/metagame/stages/stage1/messages.js
var stageMessages = MESSAGES1;
var actionMessages = {
  cheatDisabled: {
    id: "stage1.cheat_disabled",
    text: "the unfair routine has been removed."
  }
};
function announceCheatDisabled(ctx2 = {}) {
  const bell = ctx2.bell;
  if (!bell) return false;
  const msg = actionMessages.cheatDisabled;
  if (typeof bell.add === "function") {
    bell.add(msg.id, msg.text);
    return true;
  }
  if (typeof bell.push === "function") {
    bell.push(msg);
    return true;
  }
  if (typeof bell.notify === "function") {
    bell.notify(msg.text, msg);
    return true;
  }
  return false;
}

// ../../docs/games/metagame/stages/stage1/achievements.js
var stageAchievements = ACHIEVEMENTS1;
var viewerToolAchievement = {
  id: "stage1.cheat_disabled",
  legacyId: "ach-boss-cheat-found",
  stage: 1,
  name: "protection disabled."
};
function grantCheatDisabledAchievement(ctx2 = {}) {
  const api = ctx2.achievements;
  const achievement = viewerToolAchievement;
  if (!api) return false;
  if (typeof api.unlock === "function") {
    api.unlock(achievement.id, achievement);
    return true;
  }
  if (typeof api.add === "function") {
    api.add(achievement.id, achievement);
    return true;
  }
  if (typeof api.setAchievement === "function") {
    api.setAchievement(achievement);
    return true;
  }
  return false;
}

// ../../docs/games/metagame/stages/stage1/index.js
var stageMeta = {
  id: 1,
  slug: "bit-foundry",
  name: "Bit Foundry",
  bossName: "The Defragmenter",
  btsPath: "/docs/bts/bit_foundry.bts",
  requiredAction: "1.cheat_disabled",
  requiredFile: "docs/examples/Overwriter.frag",
  // Dev-menu controls (wired in metagame.js → mounted.dev(id)).
  // "Stage 1 bits" seeds are already hardcoded in metagame.js — these are additional live cheats.
  devControls: [
    { id: "unlock-tabs", label: "Unlock tabs" },
    { id: "boss-ready", label: "Boss ready" },
    { id: "grant-cores", label: "+10 cores" },
    { id: "all-managers", label: "Hire managers" }
  ]
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx2 = {}) {
  const host = ctx2.host;
  if (!host) throw new Error("Stage 1 mount requires a host element.");
  const state = normalizeState(ctx2.state || defaultState2(ctx2), ctx2);
  const stageConfig = ctx2.stageConfig || stageByNumber(1);
  let bossCtl = null;
  let s1ctl = null;
  let destroyed = false;
  const save = () => {
    if (typeof ctx2.save === "function") ctx2.save();
  };
  const openBoss = () => {
    s1ctl = null;
    host.innerHTML = '<div class="mg-wrap mg-stage1-boss-host"></div>';
    const arena = host.querySelector(".mg-stage1-boss-host");
    bossCtl = mountStage1Boss(arena, {
      ...ctx2,
      state,
      save,
      stageConfig,
      onRetreat: render
    });
  };
  const render = () => {
    if (destroyed) return;
    if (bossCtl && typeof bossCtl.destroy === "function") bossCtl.destroy();
    bossCtl = null;
    s1ctl = renderStage1({
      host,
      state,
      save,
      bell: ctx2.bell,
      sfxEnabled: ctx2.sfxEnabled,
      stage: () => stageConfig,
      onExit: ctx2.onExit,
      actions: ctx2.actions,
      onStageComplete: ctx2.onStageComplete,
      onBoss: openBoss,
      attachChrome: () => {
      }
    });
  };
  render();
  return {
    // The orchestrator wires the header help button to this when present.
    help: () => {
      if (s1ctl && typeof s1ctl.toggleHelp === "function") s1ctl.toggleHelp();
    },
    // Dev-menu: declare which controls exist, then handle live cheat dispatches.
    devControls: stageMeta.devControls,
    dev(id) {
      const repaint = s1ctl && typeof s1ctl.renderAll === "function" ? s1ctl.renderAll : null;
      if (id === "unlock-tabs") cheatUnlockTabs(state);
      else if (id === "boss-ready") cheatBossReady(state, stageConfig);
      else if (id === "grant-cores") cheatGrantCores(state);
      else if (id === "all-managers") cheatHireAllManagers(state, stageConfig);
      else return;
      save();
      if (repaint) repaint();
    },
    jumpToBoss() {
      cheatBossReady(state, stageConfig);
      save();
      openBoss();
      return Boolean(host.querySelector(".mg-defrag-arena"));
    },
    destroy() {
      destroyed = true;
      if (bossCtl && typeof bossCtl.destroy === "function") bossCtl.destroy();
      bossCtl = null;
      host.innerHTML = "";
    }
  };
}
export {
  actionMessages,
  announceCheatDisabled,
  defaultState2 as defaultState,
  grantCheatDisabledAchievement,
  hasCheatDisabledAction,
  maybeSetCheatDisabledAction,
  mountStage,
  mountStage1Boss,
  normalizeState,
  parseCheatConfig,
  parseCheatLine,
  shouldDisableCheat,
  stageAchievements,
  stageMessages,
  stageMeta,
  viewerToolAchievement
};
