import { damageUnlockedBoss, getBossLockState, recordLockedBossAttempt } from "./boss.js";
import { bossArenaLocked, bossArenaUnlocked } from "./content.js";
import { exitDistanceField, step, stepToExit, tickPlayerStatus } from "./engine.js";
import { monsterTurn, pressureSpawn } from "./monsters.js";
import { statusSummary } from "./status.js";
import { biomeForFloor } from "./biome.js";
import { useConsumable, CONSUMABLE_KEYS, CONSUMABLES } from "./consumables.js";
import { tickFire } from "./fire.js";
import { buildShopPanel } from "./shop.js";
import { buildHelpPanel } from "./help.js";
import { createView, renderHpBar } from "./view.js";
import { BTS_PATH, bellMessages } from "./messages.js";
import { MAX_FLOOR, ensureWorld, descend, resetRun, appendLog, damageNoise, openCipher, openBts, once, DIR_ARROW } from "./runloop.js";

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
      <div class="s2-status" data-field="status" hidden></div>
    </header>
    <div class="s2-objective" data-field="objective"></div>
    <div class="s2-play">
      <div class="s2-stage">
        <div class="s2-screen"></div>
        <div class="s2-legend">
          <span class="s2-c-player">@</span> you
          <span class="s2-c-foe">s</span> foe
          <span class="s2-c-item">/</span> weapon
          <span class="s2-c-potion">!</span> potion
          <span class="s2-c-glyph">%</span> glyph
          <span class="s2-c-exit">&gt;</span> stairs
          <span class="s2-c-lava">≈</span> hazard
        </div>
      </div>
      <div class="s2-controls">
        <div class="s2-compass" data-field="compass" hidden></div>
        <div class="s2-items" data-field="items"></div>
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
  // React-style write guards: paintHud runs on every monster-clock tick (~9/s), so only touch the
  // DOM for values that actually changed (the rest is a no-op). Same lesson as Bit Foundry.
  const setText = (el, v) => { const s = String(v); if (el.textContent !== s) el.textContent = s; };
  const setHidden = (el, h) => { if (el.hidden !== h) el.hidden = h; };
  const searchBtn = root.querySelector('[data-action="search"]');
  const bossBtn = root.querySelector('[data-action="boss"]');
  const btsBtn = root.querySelector('[data-action="bts"]');
  let lastHp = -1;
  let lastMaxHp = -1;
  let lastLogSig = "";
  let lastItemSig = "";
  let flashTimer = null;
  let overlay = null; // { el } for the open shop/help panel, or null
  let monsterClocks = []; // the 5 real-time monster-movement intervals
  let routeCache = null; // { world, field } — BFS-from-stairs distance field for the compass

  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  ensureWorld(state);

  // HUD + log — everything outside the dungeon screen. Every write is guarded (see setText).
  function paintHud() {
    const e = state.run.entity;
    const lock = getBossLockState({ actions, state });
    setText(fields.floor, state.run.floor);
    setText(fields.hp, e.hp);
    setText(fields.maxHp, e.maxHp);
    if (e.hp !== lastHp || e.maxHp !== lastMaxHp) {
      renderHpBar(fields.hpbar, e.hp, e.maxHp, 10); // rebuilds spans only on an actual HP change;
      lastHp = e.hp; lastMaxHp = e.maxHp;           // the low-HP pulse is a CSS class, not a redraw.
    }
    setText(fields.level, e.level);
    setText(fields.xp, e.xp || 0);
    setText(fields.atk, e.atk);
    setText(fields.def, e.def);
    setText(fields.glyphs, `${state.meta.glyphsBanked} +${e.glyphsThisRun}`);
    const status = statusSummary(e);
    setHidden(fields.status, !status);
    setText(fields.status, status);
    paintItems(e);
    setText(fields.bossStatus, state.run.boss.defeated
      ? "defeated. BTS trace available."
      : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`);
    setText(fields.hint, lock.hint);
    const biome = biomeForFloor(state.run.floor);
    if (root.dataset.biome !== biome.id) root.dataset.biome = biome.id;
    setText(fields.objective, state.run.boss.reached
      ? (lock.unlocked ? "the passage is open. challenge the boss." : "blocked. find PASSAGE in cipher.txt to open the way.")
      : `${biome.name} — reach the stairs > (floor ${state.run.floor}/${MAX_FLOOR}). fight foes, grab weapons & glyphs.`);
    updateCompass();
    const sig = state.run.combatLog.slice(-4).join("\n");
    if (sig !== lastLogSig) {
      lastLogSig = sig;
      log.replaceChildren(...state.run.combatLog.slice(-4).map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      }));
    }
    // The cipher.txt + challenge-boss actions only appear at the final floor; trace.bts after defeat.
    const atBoss = state.run.boss.reached && !state.run.boss.defeated;
    setHidden(searchBtn, !atBoss);
    setHidden(bossBtn, !atBoss);
    setHidden(btsBtn, !state.run.boss.defeated);
  }

  // Stairs compass — the actual shortest-route next step + path length to the exit, unlocked once by
  // the glyph-shop "Stairwell Sense" purchase. Routes via a BFS-from-stairs field (engine) that's
  // cheap to query each move; the field is flooded once per world and cached (re-flooded when the
  // grid mutates — a revealed hidden room — or a new world is drawn). Guarded writes.
  function updateCompass() {
    const owned = Number((state.meta.shopUpgrades || {}).compass || 0) > 0;
    const w = state.run.world;
    if (!owned || !w || !w.grid || state.run.boss.reached) { setHidden(fields.compass, true); return; }
    if (!routeCache || routeCache.world !== w) routeCache = { world: w, field: exitDistanceField(w) };
    const next = stepToExit(w, routeCache.field);
    setHidden(fields.compass, false);
    if (!next || next.steps === 0) { setText(fields.compass, "⇲ stairs — here"); return; }
    setText(fields.compass, `⇲ stairs ${DIR_ARROW[next.dir]} ${next.steps}`);
  }

  // Consumable inventory bar (B3) — one button per tool with its count + hotkey. Rebuilt only when
  // a count actually changes (guarded by a signature), then the counts re-bound for clicks.
  function paintItems(e) {
    const inv = e.inventory || {};
    const sig = CONSUMABLE_KEYS.map((k) => inv[k] || 0).join(",");
    if (sig === lastItemSig) return;
    lastItemSig = sig;
    const total = CONSUMABLE_KEYS.reduce((s, k) => s + (inv[k] || 0), 0);
    setHidden(fields.items, total === 0); // only show once you actually carry a rune
    fields.items.innerHTML = CONSUMABLE_KEYS.map((k, i) => {
      const n = inv[k] || 0;
      const def = CONSUMABLES[k];
      return `<button type="button" data-use="${k}" title="${def.desc}" ${n > 0 ? "" : "disabled"}>[${i + 1}] ${def.glyph} ${k} ×${n}</button>`;
    }).join("");
  }

  // Spend a consumable (key 1/2/3 or a button). A firebolt with no target fizzles without spending.
  function useItem(type) {
    if (overlay || state.run.boss.reached || state.run.boss.defeated) return;
    const world = state.run.world;
    const e = state.run.entity;
    if (!e.inventory || !(e.inventory[type] > 0)) return;
    const events = { moved: false, log: [], damageTaken: 0, died: false };
    const used = useConsumable(world, e, type, events);
    for (const line of events.log) appendLog(state, line);
    if (used) {
      if (typeof save === "function") save();
      view.paintExplore(world); // blink moves the camera / firebolt may clear a foe
    }
    paintHud();
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
      descend(state, { branch: events.branch });
      persistAndPaint();
      return;
    }
    // Walk / bump-attack / opened a hidden room — repaint the screen + HUD. A plain wall bump
    // changes nothing, so skip the screen repaint (paintHud is guarded and stays a no-op).
    if (events.reveal) routeCache = null; // a revealed hidden room carves new floor → re-flood
    const changed = events.moved || events.attack || events.reveal;
    if (changed) {
      if (typeof save === "function") save();
      view.applyMove(state.run.world, events);
    }
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
    if (event.key >= "1" && event.key <= "3") {
      const type = CONSUMABLE_KEYS[Number(event.key) - 1];
      if (type) { event.preventDefault(); useItem(type); }
      return;
    }
    const dir = MOVE_KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    move(dir);
  };
  window.addEventListener("keydown", onKey);

  root.addEventListener("click", (event) => {
    const moveBtn = event.target.closest("button[data-move]");
    if (moveBtn) { move(moveBtn.dataset.move); return; }
    const useBtn = event.target.closest("button[data-use]");
    if (useBtn) { useItem(useBtn.dataset.use); return; }
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
    else if (id === "items") { e.inventory = e.inventory || {}; for (const k of CONSUMABLE_KEYS) e.inventory[k] = Number(e.inventory[k] || 0) + 3; }
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
    // The fast clock also burns down the player's damage-over-time effects (poison/burn/bleed) so
    // they tick even while standing still.
    if (bucket === 0 && state.run.entity.statuses) {
      const ps = tickPlayerStatus(state.run.entity);
      for (const line of ps.log) events.log.push(line);
      events.damageTaken += ps.damageTaken;
      if (ps.died) events.died = true;
    }
    if (bucket === 2 && pressureSpawn(world)) appendLog(state, "something else stirs in the dark.");
    if (bucket === 3 && !events.died) tickFire(world, state.run.entity, events); // C1 spreading fire
    if (!events.died) monsterTurn(world, state.run.entity, events, (m) => m.bucket === bucket);
    for (const line of events.log) appendLog(state, line);
    if (events.damageTaken > 0) flashDamage(events.died);
    if (events.died) {
      appendLog(state, "@ was unparsed. run reset — banked glyphs survive.");
      resetRun(state, { banked: true, death: true });
      persistAndPaint();
      return;
    }
    // While fire is alive, do the fuller repaint so flames spread/age and burned foes clear; else
    // the cheap sprite-only monster tick.
    if (world.fires && world.fires.length) view.paintExplore(world);
    else view.tickMonsters(world);
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
