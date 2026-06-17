import { damageUnlockedBoss, getBossLockState, recordLockedBossAttempt } from "./boss.js";
import { bossArenaLocked, bossArenaUnlocked, dungeonMap } from "./content.js";
import { BTS_PATH, CIPHER_PATH, bellMessages } from "./messages.js";

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
    <header class="s2-hud">
      <div><strong>FLOOR <span data-field="floor"></span> - GLYPH DUNGEON</strong></div>
      <div>HP <span data-field="hp"></span>/<span data-field="maxHp"></span></div>
      <div>LVL <span data-field="level"></span></div>
      <div>ATK <span data-field="atk"></span></div>
      <div>DEF <span data-field="def"></span></div>
      <div>SPD <span data-field="spd"></span></div>
      <div>GLYPHS <span data-field="glyphs"></span></div>
    </header>
    <pre class="s2-grid" aria-label="ASCII dungeon map"></pre>
    <div class="s2-boss-panel">
      <div class="s2-boss-title">THE AMBIGUOUS EXPRESSION</div>
      <div data-field="bossStatus"></div>
      <div class="s2-hint" data-field="hint"></div>
    </div>
    <ol class="s2-log" aria-label="combat log"></ol>
    <div class="s2-controls">
      <button type="button" data-action="advance">clear floor</button>
      <button type="button" data-action="boss">challenge boss</button>
      <button type="button" data-action="search">open cipher.txt</button>
      <button type="button" data-action="wait">wait</button>
      <button type="button" data-action="retreat">retreat</button>
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;

  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const grid = root.querySelector(".s2-grid");
  const log = root.querySelector(".s2-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  function repaint() {
    const entity = state.run.entity;
    const lock = getBossLockState({ actions, state });
    fields.floor.textContent = String(state.run.floor);
    fields.hp.textContent = String(entity.hp);
    fields.maxHp.textContent = String(entity.maxHp);
    fields.level.textContent = String(entity.level);
    fields.atk.textContent = String(entity.atk);
    fields.def.textContent = String(entity.def);
    fields.spd.textContent = Number(entity.spd).toFixed(1);
    fields.glyphs.textContent = String(state.meta.glyphsBanked + entity.glyphsThisRun);
    fields.bossStatus.textContent = state.run.boss.defeated
      ? "defeated. BTS trace available."
      : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / north pillar ${lock.northPillar} / gap ${lock.projectileGapTiles}`;
    fields.hint.textContent = lock.hint;
    grid.textContent = (state.run.boss.reached ? (lock.unlocked ? bossArenaUnlocked : bossArenaLocked) : dungeonMap).join("\n");
    log.replaceChildren(...state.run.combatLog.slice(-4).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.run.boss.defeated;
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "advance") advanceFloor(state);
    if (action === "boss") challengeBoss();
    if (action === "search") openCipher(viewer);
    if (action === "wait") appendLog(state, "@ waits. punctuation moves.");
    if (action === "retreat") appendLog(state, "retreat accepted. glyphs remain banked.");
    if (action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();

  return {
    repaint,
    destroy() {
      root.remove();
    }
  };

  function challengeBoss() {
    state.run.boss.reached = true;
    const lock = getBossLockState({ actions, state });
    if (!lock.unlocked) {
      recordLockedBossAttempt(state);
      return;
    }
    state.run.boss.unlocked = true;
    let result = damageUnlockedBoss({ state, amount: 999 });
    if (!result.defeated) result = damageUnlockedBoss({ state, amount: 999 });
    if (result.defeated) {
      appendLog(state, bellMessages.defeated);
      completeOnce({
        stage: 2,
        defeated: true,
        reward: { glyphs: 25 },
        btsPath: BTS_PATH
      });
    }
  }

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

function advanceFloor(state) {
  state.run.active = true;
  state.meta.bestFloor = Math.max(Number(state.meta.bestFloor || 0), state.run.floor);
  state.meta.floorsCleared[state.run.floor] = true;
  state.run.entity.glyphsThisRun += 3;
  state.run.floor = Math.min(5, Number(state.run.floor || 1) + 1);
  appendLog(state, `floor ${state.run.floor - 1} parsed. +3 glyphs.`);
  if (state.run.floor === 5) appendLog(state, "boss syntax found beyond the stairs.");
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
