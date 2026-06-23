import { damageUnlockedBoss, getBossLockState, recordLockedBossAttempt } from "./boss.js";
import { bossArenaLocked, bossArenaUnlocked } from "./content.js";
import { attachGrid, buildFloor, monsterTurn, step } from "./engine.js";
import { rollEntity } from "./data.js";
import { buildShopPanel } from "./shop.js";
import { buildHelpPanel } from "./help.js";
import { createView, renderHpBar } from "./view.js";
import { BTS_PATH, CIPHER_PATH, bellMessages } from "./messages.js";

const MAX_FLOOR = 5;

const MOVE_KEYS = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right"
};

export function renderStage2({
  host,
  state,
  actions,
  bts,
  viewer,
  save,
  onStageComplete
}) {
  const root = document.createElement("section");
  root.className = "stage2-glyph-dungeon";
  root.innerHTML = `
    <div class="s2-board">
    <header class="s2-hud">
      <div><strong>FLOOR <span data-field="floor"></span>/${MAX_FLOOR}</strong></div>
      <div>HP <span class="s2-hp-bar" data-field="hpbar"></span> <span data-field="hp"></span>/<span data-field="maxHp"></span></div>
      <div>LVL <span data-field="level"></span> (<span data-field="xp"></span>xp)</div>
      <div>ATK <span data-field="atk"></span></div>
      <div>DEF <span data-field="def"></span></div>
      <div>GLYPHS <span data-field="glyphs"></span></div>
    </header>
    <div class="s2-objective" data-field="objective"></div>
    <div class="s2-play">
      <div class="s2-stage">
        <div class="s2-screen"></div>
        <div class="s2-legend">
          <span class="s2-c-player">@</span> you
          <span class="s2-c-foe">s</span> foe
          <span class="s2-c-item">/</span> weapon
          <span class="s2-c-glyph">%</span> glyph
          <span class="s2-c-exit">&gt;</span> stairs
        </div>
      </div>
      <div class="s2-controls">
        <button type="button" data-action="help">how to play</button>
        <button type="button" data-action="shop">glyph shop</button>
        <button type="button" data-action="retreat">retreat (new run)</button>
        <button type="button" data-action="search" hidden>open cipher.txt</button>
        <button type="button" data-action="boss" hidden>challenge boss</button>
        <button type="button" data-action="bts" hidden>open trace.bts</button>
        <div class="s2-dpad" aria-label="move (touch)">
          <button type="button" data-move="up" aria-label="move up">&#9650;</button>
          <button type="button" data-move="left" aria-label="move left">&#9664;</button>
          <button type="button" data-move="down" aria-label="move down">&#9660;</button>
          <button type="button" data-move="right" aria-label="move right">&#9654;</button>
        </div>
      </div>
    </div>
    <ol class="s2-log" aria-label="combat log"></ol>
    </div>
    <div class="s2-bossmeta" hidden>
      <span data-field="bossStatus"></span><span class="s2-hint" data-field="hint"></span>
    </div>
  `;

  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const view = createView(root.querySelector(".s2-screen"));
  const log = root.querySelector(".s2-log");
  let flashTimer = null;
  let overlay = null; // { el } for the open shop/help panel, or null
  let monsterClocks = []; // the 5 real-time monster-movement intervals

  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  ensureWorld(state);

  // HUD + log + boss panel — everything outside the dungeon screen.
  function paintHud() {
    const entity = state.run.entity;
    const lock = getBossLockState({ actions, state });
    fields.floor.textContent = String(state.run.floor);
    fields.hp.textContent = String(entity.hp);
    fields.maxHp.textContent = String(entity.maxHp);
    renderHpBar(fields.hpbar, entity.hp, entity.maxHp, 10);
    fields.level.textContent = String(entity.level);
    fields.xp.textContent = String(entity.xp || 0);
    fields.atk.textContent = String(entity.atk);
    fields.def.textContent = String(entity.def);
    fields.glyphs.textContent = `${state.meta.glyphsBanked} +${entity.glyphsThisRun}`;
    fields.bossStatus.textContent = state.run.boss.defeated
      ? "defeated. BTS trace available."
      : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`;
    fields.hint.textContent = lock.hint;
    fields.objective.textContent = state.run.boss.reached
      ? (lock.unlocked ? "the passage is open. challenge the boss." : "blocked. find PASSAGE in cipher.txt to open the way.")
      : `reach the stairs > (floor ${state.run.floor}/${MAX_FLOOR}). fight foes, grab weapons & glyphs.`;
    log.replaceChildren(...state.run.combatLog.slice(-4).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    // The cipher.txt + challenge-boss actions only appear once you've reached the final floor
    // (boss.reached); the trace.bts link only after the boss falls.
    const atBoss = state.run.boss.reached && !state.run.boss.defeated;
    root.querySelector('[data-action="search"]').hidden = !atBoss;
    root.querySelector('[data-action="boss"]').hidden = !atBoss;
    root.querySelector('[data-action="bts"]').hidden = !state.run.boss.defeated;
  }

  // The dungeon screen — boss arena art, or the camera-following exploration view.
  function paintWorld() {
    if (state.run.boss.reached) {
      const lock = getBossLockState({ actions, state });
      view.paintArena(lock.unlocked ? bossArenaUnlocked : bossArenaLocked);
    } else {
      view.paintExplore(state.run.world);
    }
  }

  function repaint() { paintHud(); paintWorld(); }

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }

  // ── Movement / combat ──────────────────────────────────────────────────────────────────────
  function move(dir) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return; // exploration only
    const world = state.run.world;
    const events = step(world, state.run.entity, dir);
    // Monsters move on their own real-time clocks (see startMonsterClocks), NOT on the player's
    // step — so a moving player can outrun them. step() still resolves the bumped foe's counter.
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    if (events.descend) {
      descend(state);
      persistAndPaint();
      return;
    }
    // Normal walk / bump-attack — animate the sprite layer, repaint only the HUD.
    if (typeof save === "function") save();
    view.applyMove(state.run.world, events);
    paintHud();
  }

  function flashDamage(fatal) {
    const flash = view.flashEl;
    flash.textContent = damageNoise(fatal);
    flash.classList.remove("s2-flash-on");
    void flash.offsetWidth; // restart the animation even on rapid hits
    flash.classList.add("s2-flash-on");
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flash.classList.remove("s2-flash-on"), fatal ? 520 : 240);
  }

  function closeOverlay() {
    if (overlay) { overlay.el.remove(); overlay = null; }
  }

  // Open the shop or help panel (toggling off if the same one is already open).
  function toggleOverlay(kind) {
    const wasKind = overlay && overlay.kind;
    closeOverlay();
    if (wasKind === kind) { repaint(); return; }
    const onClose = () => { closeOverlay(); repaint(); };
    const panel = kind === "shop"
      ? buildShopPanel({ state, save, onClose })
      : buildHelpPanel({ onClose });
    overlay = { el: panel.el, kind };
    root.querySelector(".s2-screen").appendChild(panel.el);
  }

  const onKey = (event) => {
    if (!root.isConnected) return;
    const tag = (event.target && event.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target?.isContentEditable) return;
    const dir = MOVE_KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    move(dir);
  };
  window.addEventListener("keydown", onKey);

  root.addEventListener("click", (event) => {
    const moveBtn = event.target.closest("button[data-move]");
    if (moveBtn) { move(moveBtn.dataset.move); return; }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "shop") { toggleOverlay("shop"); return; }
    if (action === "help") { toggleOverlay("help"); return; }
    if (action === "boss") challengeBoss();
    if (action === "search") openCipher(viewer);
    if (action === "retreat") { appendLog(state, "retreat accepted. glyphs banked, fresh run drawn."); resetRun(state, { banked: true }); }
    if (action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();
  startMonsterClocks();

  // Dev-menu cheats for this stage (see index.js stageMeta.devControls). Map = the full-map overlay.
  function dev(id) {
    const e = state.run.entity;
    if (id === "heal") e.hp = e.maxHp;
    else if (id === "atk") e.atk += 5;
    else if (id === "lvl") { e.level += 1; e.maxHp += 5; e.atk += 1; e.hp = e.maxHp; }
    else if (id === "glyphs") e.glyphsThisRun = Number(e.glyphsThisRun || 0) + 1000;
    else if (id === "map") { view.toggleFullMap(state.run.world); return; }
    if (typeof save === "function") save();
    paintHud();
  }

  return {
    repaint,
    dev,
    destroy() {
      window.removeEventListener("keydown", onKey);
      if (flashTimer) clearTimeout(flashTimer);
      stopMonsterClocks();
      view.destroy();
      root.remove();
    }
  };

  // Five shared real-time clocks (0.4–0.8s); each ticks one bucket of monsters so they advance
  // without the player. A monster's bucket is fixed at generation. Paused while a panel is open
  // or once the boss is reached.
  function tickBucket(bucket) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    if (!world || !world.grid) return;
    const events = { moved: false, log: [], damageTaken: 0, died: false };
    monsterTurn(world, state.run.entity, events, (m) => m.bucket === bucket);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    view.tickMonsters(world);
    paintHud();
  }

  function startMonsterClocks() {
    stopMonsterClocks();
    monsterClocks = [400, 500, 600, 700, 800].map((ms, b) => setInterval(() => tickBucket(b), ms));
  }

  function stopMonsterClocks() {
    for (const id of monsterClocks) clearInterval(id);
    monsterClocks = [];
  }

  function challengeBoss() {
    state.run.boss.reached = true;
    const lock = getBossLockState({ actions, state });
    if (!lock.unlocked) {
      recordLockedBossAttempt(state);
      return;
    }
    state.run.boss.unlocked = true;
    // A decisive blow: keep striking through every phase until the boss falls. Each 999-hit only
    // zeroes the current phase (advancing 1→2→3), so a single strike isn't enough — loop until
    // defeated, bounded well above the 3 phases as a safety guard.
    let result = damageUnlockedBoss({ state, amount: 999 });
    for (let i = 0; i < 5 && !result.defeated; i++) {
      result = damageUnlockedBoss({ state, amount: 999 });
    }
    if (result.defeated) {
      appendLog(state, bellMessages.defeated);
      completeOnce({ stage: 2, defeated: true, reward: { glyphs: 25 }, btsPath: BTS_PATH });
    }
  }
}

// ── Floor / run lifecycle ─────────────────────────────────────────────────────────────────────
function ensureWorld(state) {
  const run = state.run;
  if (!run.seed) run.seed = `s2-run${state.meta.runCount || 0}`;
  if (!run.world || run.world.floor !== run.floor || !Array.isArray(run.world.monsters)) {
    run.world = buildFloor(run.seed, run.floor);
  } else if (!run.world.grid) {
    // Loaded from a save: the grid is non-enumerable so it wasn't serialised. Regenerate the
    // deterministic terrain (entities kept their saved positions) and re-attach it in memory.
    attachGrid(run.world, run.seed, run.world.floor);
  }
}

function descend(state) {
  const run = state.run;
  run.entity.glyphsThisRun += 3;
  run.active = true;
  state.meta.bestFloor = Math.max(Number(state.meta.bestFloor || 0), run.floor);
  state.meta.floorsCleared[run.floor] = true;
  if (run.floor >= MAX_FLOOR) {
    run.boss.reached = true;
    appendLog(state, "the stairs end at the boss syntax. it waits.");
    return;
  }
  run.floor += 1;
  run.world = buildFloor(run.seed, run.floor);
  appendLog(state, `floor ${run.floor - 1} parsed. descending. +3 glyphs.`);
}

// Bank the run's glyphs, roll a fresh entity from purchased upgrades, and draw a new dungeon.
function resetRun(state, { banked, death }) {
  const run = state.run;
  if (banked) {
    state.meta.glyphsBanked = Number(state.meta.glyphsBanked || 0) + Number(run.entity.glyphsThisRun || 0);
  }
  if (death) state.meta.deaths = Number(state.meta.deaths || 0) + 1;
  state.meta.runCount = Number(state.meta.runCount || 0) + 1;
  run.seed = `s2-run${state.meta.runCount}`;
  run.entity = rollEntity(state.meta.shopUpgrades);
  run.floor = 1;
  run.active = false;
  run.boss.reached = false;
  run.world = buildFloor(run.seed, 1);
}

// ── Rendering helpers ─────────────────────────────────────────────────────────────────────────
const NOISE_CHARS = "╳✕X#▓░*/\\";
function damageNoise(fatal) {
  const rows = fatal ? 7 : 4;
  const cols = fatal ? 34 : 26;
  const lines = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < cols; x += 1) {
      line += Math.random() < 0.7 ? NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)] : " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function appendLog(state, line) {
  state.run.combatLog = [...state.run.combatLog, line].slice(-6);
}

function openCipher(viewer) {
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(CIPHER_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(CIPHER_PATH);
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(2);
  else if (bts && typeof bts.openBts === "function") bts.openBts(2);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
