// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage4/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage4/messages.js
var ACTION_NAME = "recursion_blueprint_read";
var REQUIRED_ACTION = "4.recursion_blueprint_read";
var ACHIEVEMENT_ID = "stage4.recursion_blueprint_read";
var ACHIEVEMENT_TEXT = "I looked deeper.";
var BTS_PATH = "/docs/bts/fractal_bastion.bts";
var RECURSION_BLUEPRINT_PATH = "/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json";
var bellMessages = {
  start: "the path repeats at every scale.",
  unlock: "the recursion points are no longer guesses.",
  // Shown once the blueprint is read but no tower yet covers a recursion point — teaches the
  // second step of the two-step gate so the ladder doesn't dead-end on a congratulation.
  needsCoverage: "the points are mapped, but nothing holds them. place a tower so its range covers a marked recursion point, then fight.",
  covered: "a tower anchors the repeating point.",
  defeated: "the loop reached its own beginning and stopped."
};
var lockedHintLadder = [
  "the bastion folds damage away before it arrives.",
  "the weak points are not on the surface of the tower list.",
  "follow the tower upgrade folders all the way down.",
  "open towers/upgrades/tier3_blueprints/recursion_points.json before fighting The Infinite Loop."
];

// ../../docs/games/metagame/stages/stage4/content.js
function recursionBlueprintContent(state) {
  return `${JSON.stringify(recursionBlueprintData(state), null, 2)}
`;
}
function recursionBlueprintData(state) {
  return {
    blueprint_id: "recursion_points",
    name: "Recursion Point Targeting",
    file: RECURSION_BLUEPRINT_PATH,
    status: "UNLOCKED",
    boss_vulnerability: {
      boss: "The Infinite Loop",
      rule: "Towers placed within radius of any persisted recursion point can damage the boss.",
      point_set_id: state.recursion.pointSetId
    },
    note: "These coordinates are generated for this run and persisted in stage state. Do not target copied coordinates from another run.",
    recursion_points: state.recursion.points.map((point) => ({ ...point }))
  };
}
function isRecursionBlueprintPath(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  return normalized === RECURSION_BLUEPRINT_PATH || normalized.endsWith("/stage4/towers/upgrades/tier3_blueprints/recursion_points.json");
}

// ../../docs/games/metagame/stages/stage4/boss.js
function hasRecursionBlueprint(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(4, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasRecursionBlueprint(actions);
  const boss = state?.boss || {};
  const coverage = getTowerCoverage(state);
  const hintIndex = Math.min(Math.max(Number(boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(boss.defeated),
    coveredPoints: coverage.covered.length,
    totalPoints: coverage.total,
    vulnerability: unlocked ? "mapped" : "unread",
    defeatPossible: unlocked && coverage.covered.length > 0,
    hint: !unlocked ? lockedHintLadder[hintIndex] : coverage.covered.length > 0 ? bellMessages.unlock : bellMessages.needsCoverage
  };
}
function applyRecursionBlueprintOpen({ state, actions, achievements, bell, path }) {
  if (!isRecursionBlueprintPath(path)) return false;
  actions?.setAction?.(4, ACTION_NAME, {
    source: "file-tree",
    file: "recursion_points.json",
    path: "/stage4/towers/upgrades/tier3_blueprints/recursion_points.json",
    pointSetId: state.recursion.pointSetId
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 4,
    title: ACHIEVEMENT_TEXT,
    action: "4.recursion_blueprint_read",
    pointSetId: state.recursion.pointSetId
  });
  notifyBell(bell, "stage4.recursion_blueprint_read", bellMessages.unlock);
  pushLog(state, bellMessages.unlock);
  return true;
}
function placeTower(state, { x, y, type = "pulse_node" }) {
  const cost = type === "scatter_array" ? 150 : 80;
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: "cycles" };
  const tower = {
    id: `tower-${state.towers.length + 1}`,
    type,
    x: Math.trunc(Number(x)),
    y: Math.trunc(Number(y))
  };
  if (!Number.isFinite(tower.x) || !Number.isFinite(tower.y)) return { ok: false, reason: "position" };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
}
function getTowerCoverage(state) {
  const points = state?.recursion?.points || [];
  const towers = state?.towers || [];
  const covered = points.filter((point) => towers.some((tower) => distance(tower, point) <= Number(point.radius || 2)));
  return {
    total: points.length,
    covered,
    uncovered: points.filter((point) => !covered.includes(point))
  };
}
function fightInfiniteLoop({ state, actions }) {
  const lock = getBossLockState({ actions, state });
  state.boss.reached = true;
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (!lock.unlocked) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "the loop regenerates before damage resolves.");
    return { defeated: false, locked: true, damage: 0 };
  }
  if (!lock.coveredPoints) {
    pushLog(state, "the blueprint is read, but no tower touches a recursion point.");
    return { defeated: false, locked: false, damage: 0 };
  }
  const damage = lock.coveredPoints * 120;
  state.boss.hp = Math.max(0, Number(state.boss.hp || 300) - damage);
  if (state.boss.hp === 0) {
    state.boss.defeated = true;
    pushLog(state, bellMessages.defeated);
  } else {
    pushLog(state, `recursion damage landed: ${damage}.`);
  }
  return { defeated: state.boss.defeated, locked: false, damage };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}
function notifyBell(bell, id, text) {
  if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 4 });
  else if (bell && typeof bell.push === "function") bell.push({ id, stage: 4, text });
}

// ../../docs/games/metagame/stages/stage4/renderer.js
function renderStage4(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage4-fractal-bastion";
  root.innerHTML = `
    <header class="s4-hud">
      <strong>FRACTAL BASTION</strong>
      <span>CYCLES <span data-field="cycles"></span></span>
      <span>WAVE <span data-field="wave"></span></span>
      <span>POINTS <span data-field="coverage"></span></span>
    </header>
    <div class="s4-layout">
      <pre class="s4-board" aria-label="fractal bastion board"></pre>
      <section class="s4-panel">
        <div class="s4-boss-title">THE INFINITE LOOP</div>
        <div data-field="bossStatus"></div>
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-points"></div>
      </section>
    </div>
    <ol class="s4-log"></ol>
    <div class="s4-controls">
      <button type="button" data-action="blueprint">open recursion_points.json</button>
      <button type="button" data-action="tower">place pulse at next point</button>
      <button type="button" data-action="boss">run boss wave</button>
      <button type="button" data-action="bts" hidden>open fractal_bastion.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s4-log");
  const completeOnce = once((result) => onStageComplete?.(result));
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.wave.textContent = String(state.wave);
    fields.coverage.textContent = `${lock.coveredPoints}/${lock.totalPoints}`;
    fields.bossStatus.textContent = `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / vulnerability ${lock.vulnerability} / hp ${state.boss.hp}`;
    fields.hint.textContent = lock.hint;
    root.querySelector(".s4-board").textContent = boardText(state);
    root.querySelector(".s4-points").replaceChildren(...pointRows(state));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "blueprint") {
      applyRecursionBlueprintOpen({ state, actions, achievements, bell, path: RECURSION_BLUEPRINT_PATH });
      viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, {
        text: recursionBlueprintContent(state),
        mime: "application/json",
        source: "stage4"
      });
    }
    if (button.dataset.action === "tower") {
      const point = getTowerCoverage(state).uncovered[0] || state.recursion.points[0];
      placeTower(state, { x: point.x, y: point.y, type: "pulse_node" });
    }
    if (button.dataset.action === "boss") {
      const result = fightInfiniteLoop({ state, actions });
      if (result.defeated) completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === "bts") bts?.open?.(4);
    save?.();
    repaint();
  });
  repaint();
  return { repaint, destroy() {
    root.remove();
  } };
}
function pointRows(state) {
  const coverage = getTowerCoverage(state);
  return state.recursion.points.map((point) => {
    const row = document.createElement("div");
    row.className = coverage.covered.includes(point) ? "covered" : "";
    row.textContent = `${point.id}: ${point.x},${point.y} r${point.radius}`;
    return row;
  });
}
function boardText(state) {
  const width = 24;
  const height = 12;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
  for (const point of state.recursion.points) {
    grid[point.y % height][point.x % width] = "R";
  }
  for (const tower of state.towers) {
    grid[tower.y % height][tower.x % width] = "T";
  }
  return grid.map((row) => row.join(" ")).join("\n");
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage4/state.js
function defaultState(context = {}) {
  const seed = stageSeed(context);
  return {
    version: 1,
    cycles: 240,
    wave: 4,
    recursion: {
      pointSetId: `fractal-${seed}`,
      points: generateRecursionPoints(seed)
    },
    towers: [],
    boss: {
      reached: false,
      hp: 300,
      attempts: 0,
      lockHintStep: 0,
      defeated: false
    },
    log: ["fractal bastion mounted.", "the path repeats before it explains itself."]
  };
}
function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.cycles = Number.isFinite(target.cycles) ? target.cycles : fresh.cycles;
  target.wave = Number.isFinite(target.wave) ? target.wave : fresh.wave;
  target.recursion = mergePlain(fresh.recursion, target.recursion);
  target.recursion.pointSetId = String(target.recursion.pointSetId || fresh.recursion.pointSetId);
  target.recursion.points = normalizePoints(target.recursion.points, fresh.recursion.points);
  target.towers = Array.isArray(target.towers) ? target.towers.map(normalizeTower).filter(Boolean) : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}
function generateRecursionPoints(seed) {
  let value = hashSeed(seed);
  const points = [];
  const lanes = [
    { minX: 7, maxX: 14, minY: 8, maxY: 13 },
    { minX: 18, maxX: 25, minY: 16, maxY: 22 },
    { minX: 27, maxX: 34, minY: 25, maxY: 31 }
  ];
  for (let index = 0; index < lanes.length; index += 1) {
    value = lcg(value);
    const lane = lanes[index];
    const x = lane.minX + value % (lane.maxX - lane.minX + 1);
    value = lcg(value);
    const y = lane.minY + value % (lane.maxY - lane.minY + 1);
    points.push({ id: `R${index + 1}`, x, y, radius: 2 });
  }
  return points;
}
function normalizePoints(points, fallback) {
  if (!Array.isArray(points) || !points.length) return fallback.map((point) => ({ ...point }));
  return points.map((point, index) => ({
    id: String(point.id || `R${index + 1}`),
    x: clampInt(point.x, 0, 39),
    y: clampInt(point.y, 0, 39),
    radius: clampInt(point.radius || 2, 1, 5)
  }));
}
function normalizeTower(tower) {
  if (!tower || typeof tower !== "object") return null;
  return {
    id: String(tower.id || `tower-${Math.random().toString(16).slice(2)}`),
    type: String(tower.type || "pulse_node"),
    x: clampInt(tower.x, 0, 39),
    y: clampInt(tower.y, 0, 39)
  };
}
function stageSeed(context) {
  return String(context.seed || context.now || Date.now()).replace(/\W/g, "").slice(-8) || "stage4";
}
function hashSeed(seed) {
  let hash = 2166136261;
  for (const ch of String(seed)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function lcg(value) {
  return Math.imul(value, 1664525) + 1013904223 >>> 0;
}
function clampInt(value, min, max) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage4/index.js
var stageMeta = {
  id: 4,
  slug: "fractal-bastion",
  name: "Fractal Bastion",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, "recursion blueprint already read."].slice(-8);
  return renderStage4({ ...ctx, state });
}
function ensureStyles() {
  const id = "stage4-fractal-bastion-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyRecursionBlueprintOpen,
  defaultState2 as defaultState,
  fightInfiniteLoop,
  getBossLockState,
  getTowerCoverage,
  hasRecursionBlueprint,
  mountStage,
  placeTower,
  recursionBlueprintContent,
  recursionBlueprintData,
  stageMeta
};
