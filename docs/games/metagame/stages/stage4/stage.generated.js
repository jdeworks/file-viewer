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

// ../../docs/games/metagame/stages/stage4/towers.js
var TOWER_TYPES = {
  // ── original six ──────────────────────────────────────────────────────────────────────────────
  pulse_node: { glyph: "[P]", cost: 80, range: 3, fireRate: 1, damage: 20, damageType: "kinetic", role: "baseline single-target — cheap kinetic DPS, weak vs armor", ability: "emp_burst" },
  scatter_array: { glyph: "[S]", cost: 150, range: 2, fireRate: 0.8, damage: 12, damageType: "kinetic", aoe: 2, role: "kinetic splash — clears swarms, falls off vs armor/shields", ability: "overcharge" },
  null_spike: { glyph: "[N]", cost: 200, range: 4, fireRate: 0.5, damage: 40, damageType: "null", ignoresArmor: true, role: "null cannon — ignores armor AND shields, slow cadence", ability: "null_wave" },
  attractor_field: { glyph: "[A]", cost: 120, range: 3, fireRate: 0, damage: 0, slow: 0.5, role: "support — slows everything in range (the original slow field)" },
  resonance_hub: { glyph: "[H]", cost: 250, range: 5, fireRate: 0, damage: 0, adjacencyBonus: 0.3, role: "support — +30% damage to each adjacent tower" },
  cycle_extractor: { glyph: "[E]", cost: 250, range: 0, fireRate: 0, damage: 0, incomePerWave: 25, role: "economy — pays Cycles every wave clear" },
  // ── expanded roster (depth pass): each has a clear role + synergy ──────────────────────────────
  // Crowd-control: stacks chill that ramps to a FULL FREEZE; arc chip damage also bleeds shields.
  frost_lattice: { glyph: "[F]", cost: 140, range: 3, fireRate: 1.2, damage: 8, damageType: "arc", onHit: [{ kind: "chill", stacks: 22, ms: 1600 }], role: "control — chill→freeze; pairs with high-burst single-target", ability: "emp_burst" },
  // Sustained thermal DoT: low hit, big burn — answers armor (thermal bypasses it) + fat HP pools.
  thermal_loop: { glyph: "[T]", cost: 160, range: 3, fireRate: 1, damage: 6, damageType: "thermal", onHit: [{ kind: "burn", dps: 14, ms: 2500 }], role: "anti-armor DoT — burn melts armored/tanky lines", ability: "overcharge" },
  // Arc chain: hits the 3 nearest enemies to its focus — the shield/swarm answer.
  chain_resonator: { glyph: "[C]", cost: 190, range: 4, fireRate: 0.9, damage: 16, damageType: "arc", chain: 3, role: "arc chain (3 targets) — shreds shields + clustered swarms", ability: "emp_burst" },
  // Anti-elite sniper: one huge null hit on the strongest target, long range, very slow cadence.
  long_recursor: { glyph: "[L]", cost: 260, range: 7, fireRate: 0.35, damage: 130, damageType: "null", defaultTarget: "strongest", role: "anti-elite sniper — one big null hit, ignores armor/shield", ability: "overcharge" },
  // Mortar: targets ANYWHERE on the board (range-independent) and splashes around its focus.
  glyph_mortar: { glyph: "[M]", cost: 220, range: 99, fireRate: 0.5, damage: 26, damageType: "thermal", aoe: 3, global: true, role: "global mortar — splash anywhere; reaches leaks the front missed", ability: "overcharge" },
  // Shred support: tiny damage, but strips armor so kinetic towers cut deep (MATCH enabler).
  shatter_drill: { glyph: "[D]", cost: 150, range: 3, fireRate: 1.5, damage: 4, damageType: "kinetic", onHit: [{ kind: "shred", armor: 0.25, ms: 2200 }], role: "support — shred armor so kinetic towers land full damage", ability: "null_wave" },
  // Gravity field: slows hard AND pulls enemies back along the path → clusters them for AoE/chain.
  gravity_well: { glyph: "[G]", cost: 200, range: 3, fireRate: 0, damage: 0, slow: 0.4, pull: 0.6, role: "support — slow + pull-back; clusters for scatter/mortar/chain" },
  // Economy v2: scaling per-wave income that grows as the campaign deepens (data-set later).
  bank_node: { glyph: "[B]", cost: 300, range: 0, fireRate: 0, damage: 0, incomePerWave: 40, role: "economy v2 — bigger per-wave payout than the extractor" }
};
var TARGET_PRESETS = ["first", "strongest", "last"];
var PRESET_LABELS = { first: "FIRST", strongest: "STRONG", last: "CYCLE" };
function toPreset(mode) {
  if (mode === "strongest") return "strongest";
  if (mode === "last" || mode === "weakest") return "last";
  return "first";
}
function presetLabel(mode) {
  return PRESET_LABELS[toPreset(mode)] || "FIRST";
}
var TOWER_ABILITIES = {
  emp_burst: { label: "EMP Burst", radius: 5, stunMs: 2e3, cooldownMs: 3e4 },
  null_wave: { label: "Null Wave", stripMs: 5e3, cooldownMs: 6e4 },
  overcharge: { label: "Overcharge", multiplier: 3, durationMs: 3e3, cooldownMs: 45e3 }
};
function towerUpgradeCost(type, fromLevel) {
  const def = TOWER_TYPES[type];
  if (!def) return Infinity;
  if (fromLevel === 1) return def.cost * 2;
  if (fromLevel === 2) return def.cost * 4;
  return Infinity;
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
function placeTower(state, { x, y, type = "pulse_node", targetMode }) {
  const def = TOWER_TYPES[type];
  if (!def) return { ok: false, reason: "type" };
  const cost = def.cost || 0;
  if (Number(state.cycles || 0) < cost) return { ok: false, reason: "cycles" };
  const mode = toPreset(targetMode || def.defaultTarget || "first");
  const tx = Math.trunc(Number(x));
  const ty = Math.trunc(Number(y));
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return { ok: false, reason: "position" };
  const tower = {
    // Position+type id, IDENTICAL to state.normalizeTower's scheme, so a tower's id survives a
    // save/reload round-trip and upgrade/sell lookups never break (Round-3 Issue 5). One tower per cell.
    id: `tower-${type}-${tx}-${ty}`,
    type,
    x: tx,
    y: ty,
    targetMode: mode
  };
  state.cycles -= cost;
  state.towers.push(tower);
  const coverage = getTowerCoverage(state);
  pushLog(state, `${type} placed at ${tower.x},${tower.y}. ${coverage.covered.length}/${coverage.total} recursion points covered.`);
  return { ok: true, tower, coverage };
}
function cycleTowerTarget(state, id) {
  const tower = (state?.towers || []).find((t) => t.id === id);
  if (!tower) return null;
  const i = TARGET_PRESETS.indexOf(toPreset(tower.targetMode || "first"));
  tower.targetMode = TARGET_PRESETS[(i + 1) % TARGET_PRESETS.length];
  pushLog(state, `${tower.type} now targets ${tower.targetMode.toUpperCase()}.`);
  return tower.targetMode;
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

// ../../docs/games/metagame/stages/stage4/lsystem.js
var GRID = 40;
var MARGIN = 2;
var LO = MARGIN;
var HI = GRID - 1 - MARGIN;
var AXIOM = "F";
var RULE = "F+F-F-F+F";
function waveGroupDepth(waveNum) {
  const n = Number(waveNum) || 1;
  if (n <= 10) return 1;
  if (n <= 20) return 2;
  return 3;
}
function mapPathDepth(mapDepth, waveNum) {
  const cap = Math.max(1, Math.min(3, Math.trunc(Number(mapDepth)) || 1));
  return Math.min(cap, waveGroupDepth(waveNum));
}
function buildPath(seed, depth = 1) {
  const d = Math.max(1, Math.min(3, Math.trunc(Number(depth)) || 1));
  const instructions = expand(d);
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  let x = 0, y = 0, dir = 0;
  const raw = [{ x, y }];
  for (const ch of instructions) {
    if (ch === "+") dir = dir + 1 & 3;
    else if (ch === "-") dir = dir + 3 & 3;
    else if (ch === "F") {
      x += DX[dir];
      y += DY[dir];
      raw.push({ x, y });
    }
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = HI - LO;
  const sx = maxX > minX ? span / (maxX - minX) : 0;
  const sy = maxY > minY ? span / (maxY - minY) : 0;
  const mapped = raw.map((p) => ({
    x: LO + Math.round((p.x - minX) * sx),
    y: LO + Math.round((p.y - minY) * sy)
  }));
  const visits = /* @__PURE__ */ new Map();
  const tiles = [];
  for (const p of mapped) {
    const k = `${p.x},${p.y}`;
    visits.set(k, (visits.get(k) || 0) + 1);
    const last = tiles[tiles.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) tiles.push({ x: p.x, y: p.y, branch: null });
  }
  const recurveTiles = /* @__PURE__ */ new Set();
  for (const [k, count] of visits) if (count > 1) recurveTiles.add(k);
  for (const t of tiles) if (recurveTiles.has(`${t.x},${t.y}`)) t.recurve = true;
  return { tiles, entry: tiles[0], exit: tiles[tiles.length - 1], recurveTiles };
}
function expand(depth) {
  let s = AXIOM;
  for (let i = 0; i < depth; i++) {
    let out = "";
    for (const ch of s) out += ch === "F" ? RULE : ch;
    s = out;
  }
  return s;
}

// ../../docs/games/metagame/stages/stage4/board.js
var EMPTY = ".";
var TOWER_CHAR = {
  pulse_node: "P",
  scatter_array: "S",
  null_spike: "N",
  attractor_field: "A",
  resonance_hub: "H",
  cycle_extractor: "E",
  frost_lattice: "F",
  thermal_loop: "T",
  chain_resonator: "C",
  long_recursor: "L",
  glyph_mortar: "M",
  shatter_drill: "D",
  gravity_well: "G",
  bank_node: "B"
};
var ENEMY_CHAR = {
  recursion: "o",
  pattern_crawler: "x",
  null_packet: "=",
  resonance_ghost: "%",
  fractal_host: "@",
  depth_crawler: "#",
  swarm_bit: ",",
  armored_loop: "8",
  shield_drone: "O",
  healer_node: "+",
  regenerator: "q",
  flicker_ghost: '"',
  burrower: "u"
};
var ENEMY_SHADE = {
  recursion: "e1",
  pattern_crawler: "e1",
  swarm_bit: "e1",
  null_packet: "e1",
  armored_loop: "e2",
  depth_crawler: "e2",
  fractal_host: "e2",
  regenerator: "e2",
  burrower: "e2",
  resonance_ghost: "e3",
  shield_drone: "e3",
  healer_node: "e3",
  flicker_ghost: "e3"
};
function boardText(state, pathTiles, width = 40, height = 40) {
  return charGrid(state, pathTiles, width, height).map((row) => row.join("")).join("\n");
}
function boardHTML(state, pathTiles, overlay = null, width = 40, height = 40) {
  const grid = charGrid(state, pathTiles, width, height);
  const cls = classGrid(state, pathTiles, width, height);
  const rings = overlay?.rings;
  const hits = overlay?.hits;
  const foot = overlay?.foot;
  const footValid = overlay?.footValid !== false;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    let out = "";
    let run = "";
    let runCls = null;
    const flush = () => {
      if (run) out += `<span class="${runCls}">${run}</span>`;
      run = "";
    };
    for (let x = 0; x < width; x += 1) {
      let c = cls[y][x];
      if (rings && rings.has(`${x},${y}`)) c += " s4c-range";
      if (hits && hits.has(`${x},${y}`)) c += " s4c-hit";
      if (foot && foot.x === x && foot.y === y) c += footValid ? " s4c-foot" : " s4c-foot-bad";
      if (c !== runCls) {
        flush();
        runCls = c;
      }
      run += esc(grid[y][x]);
    }
    flush();
    rows.push(out);
  }
  return rows.join("\n");
}
function segmentCells(tiles) {
  const cells = [];
  for (let i = 0; i < tiles.length - 1; i += 1) {
    const a = tiles[i];
    const b = tiles[i + 1];
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    const glyph = dy === 0 ? "-" : dx === 0 ? "|" : "+";
    let x = a.x;
    let y = a.y;
    while (x !== b.x || y !== b.y) {
      if (!(x === a.x && y === a.y)) cells.push({ x, y, glyph });
      if (x !== b.x) x += dx;
      if (y !== b.y) y += dy;
    }
  }
  return cells;
}
function charGrid(state, pathTiles, width, height) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => EMPTY));
  const put = (x, y, ch) => {
    if (y >= 0 && y < height && x >= 0 && x < width) grid[y][x] = ch;
  };
  const tiles = pathTiles || [];
  for (const c of segmentCells(tiles)) put(c.x, c.y, c.glyph);
  tiles.forEach((t, i) => {
    if (i === 0) return put(t.x, t.y, ">");
    if (i === tiles.length - 1) return put(t.x, t.y, "X");
    if (t.recurve) return put(t.x, t.y, "~");
    put(t.x, t.y, pathGlyph(tiles[i - 1], t, tiles[i + 1]));
  });
  for (const p of state?.recursion?.points || []) {
    if (grid[p.y]?.[p.x] === EMPTY) put(p.x, p.y, "R");
  }
  for (const t of state?.towers || []) put(t.x, t.y, TOWER_CHAR[t.type] || "?");
  for (const e of state?.enemies || []) put(e.x, e.y, ENEMY_CHAR[e.type] || "*");
  return grid;
}
function classGrid(state, pathTiles, width, height) {
  const cls = Array.from({ length: height }, () => Array.from({ length: width }, () => "s4c-empty"));
  const set = (x, y, c) => {
    if (y >= 0 && y < height && x >= 0 && x < width) cls[y][x] = c;
  };
  const tiles = pathTiles || [];
  const charAt = charGrid(state, pathTiles, width, height);
  for (const c of segmentCells(tiles)) set(c.x, c.y, "s4c-path");
  tiles.forEach((t, i) => {
    if (i === 0) return set(t.x, t.y, "s4c-entry");
    if (i === tiles.length - 1) return set(t.x, t.y, "s4c-exit");
    if (t.recurve) return set(t.x, t.y, "s4c-recurve");
    set(t.x, t.y, "s4c-path");
  });
  for (const p of state?.recursion?.points || []) {
    if (charAt[p.y]?.[p.x] === "R") set(p.x, p.y, "s4c-recur");
  }
  for (const t of state?.towers || []) set(t.x, t.y, `s4c-tower s4c-t-${towerDmgType(t.type)}`);
  for (const e of state?.enemies || []) set(e.x, e.y, `s4c-enemy s4c-${ENEMY_SHADE[e.type] || "e1"}`);
  return cls;
}
function towerDmgType(type) {
  const def = TOWER_TYPES[type];
  if (!def) return "support";
  return def.damageType || (def.ignoresArmor ? "null" : "support");
}
function esc(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === '"') return "&quot;";
  return ch;
}
function pathGlyph(prev, here, next) {
  if (!prev || !next) return "+";
  if (prev.y === here.y && next.y === here.y) return "-";
  if (prev.x === here.x && next.x === here.x) return "|";
  return "+";
}

// ../../docs/games/metagame/stages/stage4/enemies.js
var ENEMY_TYPES = {
  // ── original six ──────────────────────────────────────────────────────────────────────────────
  recursion: { glyph: "[ ]", hp: 50, speed: 1, armor: 0, reward: 8, integrityDrain: 5 },
  pattern_crawler: { glyph: "/\\", hp: 30, speed: 2, armor: 0, reward: 6, integrityDrain: 4, fast: true },
  null_packet: { glyph: "<>", hp: 60, speed: 1, armor: 0.5, reward: 10, integrityDrain: 6 },
  resonance_ghost: { glyph: "<>", hp: 40, speed: 1.5, armor: 0, reward: 9, integrityDrain: 5, slowImmune: true },
  fractal_host: { glyph: "[[ ]]", hp: 120, speed: 0.8, armor: 0, reward: 16, integrityDrain: 8, spawnsOnDeath: { type: "recursion", count: 2 } },
  depth_crawler: { glyph: "[##]", hp: 200, speed: 1.2, armor: 0.3, reward: 24, integrityDrain: 10, elite: true },
  // ── expanded roster (depth pass): each leans on the damage-type / status / behavior systems ────
  // Tiny + fast, arrives in big counts — punishes single-target; answered by aoe/chain/freeze.
  swarm_bit: { glyph: "·", hp: 14, speed: 2.4, armor: 0, reward: 3, integrityDrain: 2, fast: true, swarm: true },
  // Heavy armor + kinetic RESISTANCE — kinetic bounces; answered by thermal/null/arc or shred.
  armored_loop: { glyph: "[#]", hp: 160, speed: 0.9, armor: 0.5, resist: { kinetic: 0.4 }, reward: 20, integrityDrain: 10 },
  // Carries a SHIELD pool soaked before hp — answered by arc (+50% vs shields) or null (bypass).
  shield_drone: { glyph: "(o)", hp: 70, speed: 1.1, armor: 0, shield: 140, reward: 16, integrityDrain: 7 },
  // Heals nearby enemies each tick (behaviors.js) — focus it down first or the line never falls.
  healer_node: { glyph: "<+>", hp: 110, speed: 0.8, armor: 0.1, reward: 18, integrityDrain: 7, heal: { amount: 22, radius: 5 } },
  // Self-regenerates HP — out-DPS it or apply BURN (thermal DoT beats regen); else it walls forever.
  regenerator: { glyph: "{~}", hp: 140, speed: 1, armor: 0.1, reward: 18, integrityDrain: 8, regen: 18 },
  // Phases out (untargetable) on a deterministic cadence; slow-immune + arc-resistant.
  flicker_ghost: { glyph: "<·>", hp: 80, speed: 1.4, armor: 0, slowImmune: true, resist: { arc: 0.3 }, reward: 14, integrityDrain: 6, flicker: { onMs: 1400, offMs: 900 } },
  // Burrows on a cadence → high armor while down (kinetic useless then); strike when it surfaces.
  burrower: { glyph: "vvv", hp: 130, speed: 1.2, armor: 0.1, reward: 16, integrityDrain: 8, burrow: { upMs: 1500, downMs: 1200, armor: 0.6 } }
};
function spawnEnemy(type, seed, idCounter) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.recursion;
  const enemy = {
    id: `e${idCounter}`,
    type: ENEMY_TYPES[type] ? type : "recursion",
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: Boolean(def.slowImmune)
  };
  if (def.resist) enemy.resist = { ...def.resist };
  if (def.shield) {
    enemy.shield = def.shield;
    enemy.shieldMax = def.shield;
  }
  return enemy;
}

// ../../docs/games/metagame/stages/stage4/damage.js
var DAMAGE_TYPES = ["kinetic", "thermal", "arc", "null", "pure"];
function resolveDamage(enemy, amount, type = "kinetic", opts = {}) {
  let dmg = Math.max(0, Number(amount) || 0);
  if (!enemy || dmg <= 0) return { hp: 0, shield: 0 };
  const dtype = DAMAGE_TYPES.includes(type) ? type : "kinetic";
  if (dtype !== "pure" && enemy.resist) dmg *= 1 - clampResist(enemy.resist[dtype]);
  if (dtype === "kinetic") {
    const armor = opts.armor != null ? Number(opts.armor) : enemy.armor || 0;
    dmg *= 1 - clamp01(armor);
  }
  let shieldHit = 0;
  if (dtype !== "null" && (enemy.shield || 0) > 0 && dmg > 0) {
    const mult = dtype === "arc" ? 1.5 : 1;
    const effective = dmg * mult;
    shieldHit = Math.min(enemy.shield, effective);
    enemy.shield = Math.max(0, enemy.shield - shieldHit);
    dmg = (effective - shieldHit) / mult;
  }
  enemy.hp -= dmg;
  return { hp: dmg, shield: shieldHit };
}
function clamp01(v) {
  const n = Number(v) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function clampResist(v) {
  const n = Number(v) || 0;
  return n > 1 ? 1 : n;
}

// ../../docs/games/metagame/stages/stage4/status.js
var FREEZE_THRESHOLD = 100;
var MOVEMENT_EFFECTS = /* @__PURE__ */ new Set(["slow", "chill", "freeze"]);
function applyStatus(enemy, kind, payload = {}) {
  if (!enemy) return false;
  if (enemy.slowImmune && MOVEMENT_EFFECTS.has(kind)) return false;
  const s = enemy.status || (enemy.status = {});
  const ms = Math.max(0, Number(payload.ms) || 0);
  switch (kind) {
    case "slow": {
      const factor = clamp012(payload.factor != null ? payload.factor : 0.5);
      const cur = s.slow;
      s.slow = { factor: cur ? Math.min(cur.factor, factor) : factor, ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case "chill": {
      const cur = s.chill || { stacks: 0, ms: 0 };
      cur.stacks += Math.max(0, Number(payload.stacks) || 0);
      cur.ms = Math.max(cur.ms, ms);
      s.chill = cur;
      if (cur.stacks >= FREEZE_THRESHOLD) {
        delete s.chill;
        applyStatus(enemy, "freeze", { ms: Math.max(ms, 1200) });
      }
      return true;
    }
    case "freeze":
    case "stun": {
      const cur = s[kind];
      s[kind] = { ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case "burn": {
      const dps = Math.max(0, Number(payload.dps) || 0);
      const cur = s.burn;
      s.burn = { dps: Math.max(cur?.dps || 0, dps), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case "shred": {
      const armor = clamp012(payload.armor || 0);
      const cur = s.shred;
      s.shred = { armor: Math.max(cur?.armor || 0, armor), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    case "mark": {
      const bonus = Math.max(0, Number(payload.bonus) || 0);
      const cur = s.mark;
      s.mark = { bonus: Math.max(cur?.bonus || 0, bonus), ms: Math.max(cur?.ms || 0, ms) };
      return true;
    }
    default:
      return false;
  }
}
function tickStatus(state, enemy, dt) {
  const s = enemy?.status;
  if (!s) return;
  const ms = Math.max(0, Number(dt) || 0);
  if (s.burn) resolveDamage(enemy, s.burn.dps * (ms / 1e3), "thermal");
  for (const key of Object.keys(s)) {
    s[key].ms -= ms;
    if (s[key].ms <= 0) delete s[key];
  }
}
function statusSpeedFactor(enemy) {
  const s = enemy?.status;
  if (!s) return 1;
  if (s.freeze || s.stun) return 0;
  let factor = 1;
  if (s.slow) factor *= s.slow.factor;
  if (s.chill) factor *= 1 - 0.4 * Math.min(1, s.chill.stacks / FREEZE_THRESHOLD);
  return factor;
}
function effectiveArmor(enemy) {
  const base = enemy?.armor || 0;
  const shred = enemy?.status?.shred?.armor || 0;
  return Math.max(0, base - shred);
}
function damageTakenMult(enemy) {
  return 1 + (enemy?.status?.mark?.bonus || 0);
}
function applyOnHit(enemy, def) {
  const onHit = def?.onHit;
  if (!Array.isArray(onHit)) return;
  for (const eff of onHit) if (eff && eff.kind) applyStatus(enemy, eff.kind, eff);
}
function clamp012(v) {
  const n = Number(v) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// ../../docs/games/metagame/stages/stage4/forks.js
var FORKS = {
  pulse_node: [
    { id: "emp_lance", label: "EMP Lance", desc: "×2 damage; EMP-stun ult", ability: "emp_burst", mods: { damage: 2 } },
    { id: "pulse_storm", label: "Pulse Storm", desc: "×1.8 fire rate, +range; overcharge ult", ability: "overcharge", mods: { fireRate: 1.8, range: 1.4 } }
  ],
  scatter_array: [
    { id: "shrapnel_array", label: "Shrapnel Array", desc: "×1.6 damage, wider splash", ability: "overcharge", mods: { damage: 1.6, aoe: 1.5 } },
    { id: "nova_array", label: "Nova Array", desc: "+damage; EMP-stun the whole splash", ability: "emp_burst", mods: { damage: 1.3, range: 1.3 } }
  ],
  null_spike: [
    { id: "void_lance", label: "Void Lance", desc: "×2 null damage", ability: "null_wave", mods: { damage: 2 } },
    { id: "null_battery", label: "Null Battery", desc: "×2.2 fire rate", ability: "overcharge", mods: { fireRate: 2.2 } }
  ],
  frost_lattice: [
    { id: "deep_freeze", label: "Deep Freeze", desc: "Chill ramps to freeze far faster", ability: "emp_burst", onHit: [{ kind: "chill", stacks: 42, ms: 1800 }] },
    { id: "glacier_field", label: "Glacier Field", desc: "Wide range; chill + hard slow", ability: "emp_burst", mods: { range: 1.6 }, onHit: [{ kind: "chill", stacks: 16, ms: 1600 }, { kind: "slow", factor: 0.5, ms: 1400 }] }
  ],
  thermal_loop: [
    { id: "pyre_loop", label: "Pyre Loop", desc: "Much hotter, longer burn", ability: "overcharge", onHit: [{ kind: "burn", dps: 30, ms: 3e3 }] },
    { id: "plasma_loop", label: "Plasma Loop", desc: "×1.8 hit damage + burn", ability: "overcharge", mods: { damage: 1.8 }, onHit: [{ kind: "burn", dps: 12, ms: 2200 }] }
  ],
  chain_resonator: [
    { id: "arc_cascade", label: "Arc Cascade", desc: "Chains to 5 targets", ability: "emp_burst", mods: { chain: 5 / 3 } },
    { id: "tesla_coil", label: "Tesla Coil", desc: "×1.7 damage, +range", ability: "overcharge", mods: { damage: 1.7, range: 1.4 } }
  ],
  long_recursor: [
    { id: "siege_recursor", label: "Siege Recursor", desc: "×1.8 damage (anti-boss)", ability: "overcharge", mods: { damage: 1.8 } },
    { id: "rapid_recursor", label: "Rapid Recursor", desc: "×2.5 fire rate", ability: "overcharge", mods: { fireRate: 2.5 } }
  ],
  glyph_mortar: [
    { id: "cluster_mortar", label: "Cluster Mortar", desc: "Bigger splash, +fire rate", ability: "overcharge", mods: { aoe: 1.6, fireRate: 1.5 } },
    { id: "incendiary_mortar", label: "Incendiary Mortar", desc: "Shells leave a burn", ability: "overcharge", mods: { damage: 1.3 }, onHit: [{ kind: "burn", dps: 16, ms: 2500 }] }
  ],
  shatter_drill: [
    { id: "rend_drill", label: "Rend Drill", desc: "Strips armor to the bone", ability: "null_wave", onHit: [{ kind: "shred", armor: 0.5, ms: 2600 }] },
    { id: "mark_drill", label: "Mark Drill", desc: "Shred + mark for +damage taken", ability: "null_wave", onHit: [{ kind: "shred", armor: 0.25, ms: 2200 }, { kind: "mark", bonus: 0.3, ms: 2200 }] }
  ],
  attractor_field: [
    { id: "tar_field", label: "Tar Field", desc: "Near-total slow", mods: { slow: 1.6 } },
    { id: "wide_field", label: "Wide Field", desc: "Much larger slow radius", mods: { range: 1.8 } }
  ],
  gravity_well: [
    { id: "singularity", label: "Singularity", desc: "Stronger pull (tight cluster)", mods: { pull: 2 } },
    { id: "event_field", label: "Event Field", desc: "Wider slow + pull radius", mods: { range: 1.8 } }
  ],
  resonance_hub: [
    { id: "overdrive_hub", label: "Overdrive Hub", desc: "Bigger adjacency buff", mods: { adjacencyBonus: 1.8 } },
    { id: "grid_hub", label: "Grid Hub", desc: "Buffs a much larger area", mods: { range: 1.6 } }
  ],
  cycle_extractor: [
    { id: "turbo_extractor", label: "Turbo Extractor", desc: "×1.8 per-wave income", mods: { incomePerWave: 1.8 } },
    { id: "burst_extractor", label: "Burst Extractor", desc: "×1.4 income, smaller footprint", mods: { incomePerWave: 1.4 } }
  ],
  bank_node: [
    { id: "reserve_bank", label: "Reserve Bank", desc: "×1.8 per-wave income", mods: { incomePerWave: 1.8 } },
    { id: "fast_bank", label: "Fast Bank", desc: "×1.5 income", mods: { incomePerWave: 1.5 } }
  ]
};
function forksFor(type) {
  return FORKS[type] || [];
}
function forkDef(tower) {
  if (!tower?.fork) return null;
  return (FORKS[tower.type] || []).find((f) => f.id === tower.fork) || null;
}
function forkAbility(tower) {
  return forkDef(tower)?.ability || null;
}
function forkStatMult(tower, key) {
  const m = forkDef(tower)?.mods?.[key];
  return Number.isFinite(m) ? m : 1;
}
function towerStat(tower, key) {
  const base = Number(TOWER_TYPES[tower?.type]?.[key]) || 0;
  return base * forkStatMult(tower, key);
}
function effectiveOnHit(tower, def) {
  return forkDef(tower)?.onHit || def?.onHit || null;
}
function chooseFork(state, towerId, forkId) {
  const tower = (state?.towers || []).find((t) => t.id === towerId);
  if (!tower) return { ok: false, reason: "not-found" };
  if ((tower.level || 1) < 3) return { ok: false, reason: "not-l3" };
  if (tower.fork) return { ok: false, reason: "already-forked" };
  const fork = (FORKS[tower.type] || []).find((f) => f.id === forkId);
  if (!fork) return { ok: false, reason: "invalid-fork" };
  tower.fork = fork.id;
  state.log = [...state.log || [], `${tower.type} forked → ${fork.label}.`].slice(-12);
  return { ok: true, fork: fork.id };
}

// ../../docs/games/metagame/stages/stage4/abilities.js
function abilityForTower(tower) {
  const def = TOWER_TYPES[tower?.type];
  if (!def) return null;
  return forkAbility(tower) || def.ability || null;
}
function overchargeMult(tower, now) {
  return (tower?.overchargeUntilMs || 0) > now ? tower.overchargeMultiplier || 1 : 1;
}
function fireAbilities(state, dist3) {
  const now = state.combatClockMs || 0;
  for (const tower of state.towers || []) {
    if ((tower.level || 1) < 3) continue;
    const abilityId = abilityForTower(tower);
    const ability = TOWER_ABILITIES[abilityId];
    if (!ability) continue;
    if (now < (tower.abilityNextMs || 0)) continue;
    const def = TOWER_TYPES[tower.type] || {};
    const cast = castAbility(state, tower, abilityId, ability, def, now, dist3);
    if (cast) tower.abilityNextMs = now + ability.cooldownMs;
  }
}
function castAbility(state, tower, id, ability, def, now, dist3) {
  if (id === "emp_burst") {
    const hit = (state.enemies || []).filter((e) => dist3(tower, e) <= ability.radius);
    if (!hit.length) return false;
    for (const e of hit) applyStatus(e, "stun", { ms: ability.stunMs });
    pushLog2(state, `${def.glyph || "[?]"} EMP Burst — ${hit.length} stunned.`);
    return true;
  }
  if (id === "null_wave") {
    const hit = (state.enemies || []).filter((e) => dist3(tower, e) <= (def.range || 0) && (e.armor || 0) > 0);
    if (!hit.length) return false;
    for (const e of hit) applyStatus(e, "shred", { armor: 1, ms: ability.stripMs });
    pushLog2(state, `${def.glyph || "[?]"} Null Wave — armor stripped from ${hit.length}.`);
    return true;
  }
  if (id === "overcharge") {
    const inRange = (state.enemies || []).some((e) => dist3(tower, e) <= (def.range || 0));
    if (!inRange) return false;
    tower.overchargeUntilMs = now + ability.durationMs;
    tower.overchargeMultiplier = ability.multiplier;
    pushLog2(state, `${def.glyph || "[?]"} Overcharge — damage ×${ability.multiplier}.`);
    return true;
  }
  return false;
}
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage4/behaviors.js
var defOf = (e) => ENEMY_TYPES[e?.type] || {};
function behaviorPass(state, dt) {
  const secs = (Number(dt) || 0) / 1e3;
  if (secs <= 0) return;
  const enemies = state.enemies || [];
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = defOf(e);
    if (d.regen) e.hp = Math.min(e.maxHp, e.hp + d.regen * secs);
  }
  for (const healer of enemies) {
    const d = defOf(healer);
    if (!d.heal || healer.hp <= 0) continue;
    for (const e of enemies) {
      if (e === healer || e.hp <= 0) continue;
      if (dist(healer, e) <= d.heal.radius) e.hp = Math.min(e.maxHp, e.hp + d.heal.amount * secs);
    }
  }
}
function isTargetable(enemy, now) {
  const f = defOf(enemy).flicker;
  if (!f) return true;
  const period = f.onMs + f.offMs;
  return period <= 0 ? true : now % period < f.onMs;
}
function burrowArmor(enemy, now) {
  const b = defOf(enemy).burrow;
  if (!b) return 0;
  const period = b.upMs + b.downMs;
  if (period <= 0) return 0;
  return now % period >= b.upMs ? b.armor : 0;
}
function dist(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

// ../../docs/games/metagame/stages/stage4/waves.js
var SPAWN_INTERVAL_MS = 700;
var WAVES = {
  1: { enemies: [{ type: "recursion", count: 6 }] },
  2: { enemies: [{ type: "recursion", count: 9 }] },
  3: { enemies: [{ type: "recursion", count: 12 }] },
  4: { enemies: [{ type: "recursion", count: 15 }] },
  5: { enemies: [{ type: "recursion", count: 18 }], note: "cover the corner tiles" },
  // Waves 6–10 (MATCH): fast pattern-crawlers expose sparse coverage; armored null-packets blunt
  // low-damage towers. The enemy types already exist (enemies.js) — this is composition only.
  6: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }], note: "pattern crawlers sprint through gaps" },
  7: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 8 }] },
  8: { enemies: [{ type: "recursion", count: 10 }, { type: "null_packet", count: 4 }], note: "null packets are armored" },
  9: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 2 }] },
  10: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "pattern_crawler", count: 6 }] },
  // Waves 11–15 (PORTFOLIO): fractal hosts split on death — punish thin coverage.
  11: { enemies: [{ type: "recursion", count: 10 }, { type: "fractal_host", count: 1 }], note: "fractal hosts split when they fall" },
  12: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 4 }, { type: "fractal_host", count: 1 }] },
  13: { enemies: [{ type: "recursion", count: 8 }, { type: "null_packet", count: 4 }, { type: "fractal_host", count: 2 }] },
  14: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "fractal_host", count: 2 }] },
  15: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "fractal_host", count: 3 }] },
  // Waves 16–20 (REPAIR): resonance ghosts are slow-immune; wave 20 fields three depth-crawler elites.
  16: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 4 }], note: "ghosts ignore the attractor field" },
  17: { enemies: [{ type: "recursion", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "pattern_crawler", count: 4 }] },
  18: { enemies: [{ type: "recursion", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 4 }] },
  19: { enemies: [{ type: "recursion", count: 8 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 2 }] },
  20: { enemies: [{ type: "recursion", count: 6 }, { type: "depth_crawler", count: 3 }], note: "three depth-crawler elites" },
  // Waves 21–30 (ANTICIPATE): everything mixed and scaling; wave 25 fields all six types.
  21: { enemies: [{ type: "recursion", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 4 }] },
  22: { enemies: [{ type: "resonance_ghost", count: 8 }, { type: "fractal_host", count: 3 }] },
  23: { enemies: [{ type: "null_packet", count: 8 }, { type: "pattern_crawler", count: 6 }, { type: "depth_crawler", count: 1 }] },
  24: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }] },
  25: { enemies: [{ type: "recursion", count: 6 }, { type: "pattern_crawler", count: 6 }, { type: "null_packet", count: 6 }, { type: "resonance_ghost", count: 6 }, { type: "fractal_host", count: 3 }, { type: "depth_crawler", count: 1 }], note: "every protocol at once" },
  26: { enemies: [{ type: "null_packet", count: 10 }, { type: "depth_crawler", count: 2 }] },
  27: { enemies: [{ type: "resonance_ghost", count: 10 }, { type: "fractal_host", count: 4 }] },
  28: { enemies: [{ type: "pattern_crawler", count: 12 }, { type: "null_packet", count: 8 }] },
  29: { enemies: [{ type: "recursion", count: 10 }, { type: "resonance_ghost", count: 8 }, { type: "depth_crawler", count: 2 }] },
  30: { enemies: [{ type: "depth_crawler", count: 3 }, { type: "fractal_host", count: 4 }, { type: "null_packet", count: 8 }], note: "the bastion's last stand before the loop" },
  // Wave 31 = The Infinite Loop. Not a spawn wave — fought via the confront path (boss.js).
  31: { isBoss: true, enemies: [] }
};
function waveComposition(waveNum, seed) {
  const n = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const authored = WAVES[n];
  if (authored) return { leftFraction: null, ...authored };
  return { enemies: [{ type: "recursion", count: 6 + n * 3 }], leftFraction: null };
}

// ../../docs/games/metagame/stages/stage4/maps.js
var MAPS = [
  {
    id: "outer-shell",
    name: "Outer Shell",
    glyph: "◇",
    theme: "the thin perimeter where the recursion first leaks in",
    waveCount: 5,
    depth: 1,
    startCycles: 240,
    startIntegrity: 100,
    subBosses: { 5: "shell-warden" }
  },
  {
    id: "recursion-halls",
    name: "Recursion Halls",
    glyph: "◆",
    theme: "corridors that repeat the corridor you just left",
    waveCount: 10,
    depth: 1,
    startCycles: 280,
    startIntegrity: 100,
    subBosses: { 5: "echo-sentinel", 10: "hall-keeper" }
  },
  {
    id: "fractal-atrium",
    name: "Fractal Atrium",
    glyph: "✦",
    theme: "an open court that folds back on itself at the edges",
    waveCount: 15,
    depth: 2,
    startCycles: 340,
    startIntegrity: 110,
    subBosses: { 8: "mirror-prefect", 15: "atrium-regent" }
  },
  {
    id: "depth-cascade",
    name: "Depth Cascade",
    glyph: "❈",
    theme: "a stairwell that descends faster than you climb it",
    waveCount: 25,
    depth: 2,
    startCycles: 420,
    startIntegrity: 120,
    subBosses: { 10: "cascade-anchor", 18: "descent-marshal", 25: "cascade-sovereign" }
  },
  {
    id: "infinite-approach",
    name: "Infinite Approach",
    glyph: "∞",
    theme: "the last span before the loop — it never quite arrives",
    waveCount: 35,
    depth: 3,
    startCycles: 520,
    startIntegrity: 140,
    subBosses: { 10: "approach-vanguard", 20: "event-horizon", 30: "penultimate-knot", 35: "final-bastion" }
  }
];
var MAP_COUNT = MAPS.length;
function mapByIndex(index) {
  const i = Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(index)) || 0));
  return MAPS[i];
}
function mapPathSeed(pointSetId, mapIndex) {
  return `${pointSetId || "x"}-m${Math.max(0, Math.trunc(Number(mapIndex)) || 0)}`;
}
function subBossIdForWave(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  return map.subBosses?.[Math.trunc(Number(waveNum)) || 0] || null;
}

// ../../docs/games/metagame/stages/stage4/wavegen.js
var COUNT_DIV = {
  swarm_bit: 0.4,
  fractal_host: 6,
  depth_crawler: 10,
  armored_loop: 3,
  shield_drone: 2.5,
  healer_node: 6,
  regenerator: 3,
  flicker_ghost: 2.5,
  burrower: 3
};
var UNLOCKS = [
  ["recursion"],
  ["recursion", "pattern_crawler", "swarm_bit"],
  ["recursion", "pattern_crawler", "null_packet", "swarm_bit", "armored_loop", "shield_drone"],
  ["recursion", "pattern_crawler", "null_packet", "resonance_ghost", "fractal_host", "swarm_bit", "armored_loop", "shield_drone", "healer_node", "regenerator"],
  ["recursion", "pattern_crawler", "null_packet", "resonance_ghost", "fractal_host", "depth_crawler", "swarm_bit", "armored_loop", "shield_drone", "healer_node", "regenerator", "flicker_ghost", "burrower"]
];
function mapEnemyPool(mapIndex) {
  const i = Math.max(0, Math.min(UNLOCKS.length - 1, Math.trunc(Number(mapIndex)) || 0));
  return UNLOCKS[i];
}
function mapWaveComposition(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  const w = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const subBoss = subBossIdForWave(mapIndex, w);
  const pool = mapEnemyPool(mapIndex);
  const ramp = 6 + Math.floor(w * (1.5 + 0.35 * mapIndex)) + mapIndex * 3;
  const budget = subBoss ? Math.max(4, Math.round(ramp * 0.55)) : ramp;
  const weights = pool.map((type) => typeWeight(type, w, map.waveCount, mapIndex));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  const enemies = [];
  let assigned = 0;
  pool.forEach((type, idx) => {
    const heavyDiv = COUNT_DIV[type] || 1;
    let count = Math.round(budget * weights[idx] / total / heavyDiv);
    if (idx === pool.length - 1) count = Math.max(count, 0);
    if (count > 0) {
      enemies.push({ type, count });
      assigned += count;
    }
  });
  if (!subBoss && assigned === 0) enemies.push({ type: "recursion", count: Math.max(3, Math.round(budget / 2)) });
  const comp = { enemies, subBoss: subBoss || null, leftFraction: null, hpScale: waveHpScale(w, mapIndex) };
  if (subBoss) comp.note = "a guardian holds the line";
  return comp;
}
function waveHpScale(waveNum, mapIndex) {
  const w = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const mi = Math.max(0, Math.trunc(Number(mapIndex)) || 0);
  return 1 + 0.03 * (w - 1) + 0.08 * mi;
}
function typeWeight(type, w, waveCount, mapIndex) {
  const p = Math.min(1, w / Math.max(1, waveCount));
  switch (type) {
    case "recursion":
      return 6 - 3 * p;
    // always present, fades a bit late
    case "pattern_crawler":
      return 1 + 4 * p;
    // ramps up
    case "null_packet":
      return 1 + 3 * p;
    case "resonance_ghost":
      return p > 0.25 ? 1 + 3 * p : 0.2;
    case "fractal_host":
      return p > 0.4 ? 1 + 2 * p : 0.1;
    case "depth_crawler":
      return p > 0.6 ? 1 + 2 * p : 0.05;
    // expanded roster — each phases in as a wave progresses
    case "swarm_bit":
      return 2 + 4 * p;
    // cheap filler, always plentiful
    case "armored_loop":
      return p > 0.3 ? 1 + 2 * p : 0.1;
    case "shield_drone":
      return p > 0.3 ? 1 + 2 * p : 0.1;
    case "healer_node":
      return p > 0.4 ? 0.6 + p : 0.05;
    case "regenerator":
      return p > 0.4 ? 1 + 1.5 * p : 0.05;
    case "flicker_ghost":
      return p > 0.5 ? 1 + 2 * p : 0.05;
    case "burrower":
      return p > 0.5 ? 1 + 1.5 * p : 0.05;
    default:
      return 1;
  }
}

// ../../docs/games/metagame/stages/stage4/subboss.js
var SUB_BOSSES = {
  // Map 0
  "shell-warden": { name: "Shell Warden", glyph: "Ω", hp: 600, speed: 0.7, armor: 0.2, reward: 80, drain: 20, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE (spawn copies) at half integrity" },
  // Map 1
  "echo-sentinel": { name: "Echo Sentinel", glyph: "Ψ", hp: 800, speed: 0.9, armor: 0.1, reward: 90, drain: 20, trigger: 0.5, ability: "haste", telegraph: "will HASTE itself when wounded" },
  "hall-keeper": { name: "Hall Keeper", glyph: "Φ", hp: 1200, speed: 0.7, armor: 0.3, reward: 120, drain: 25, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 2
  "mirror-prefect": { name: "Mirror Prefect", glyph: "Δ", hp: 1800, speed: 0.8, armor: 0.2, reward: 150, drain: 25, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD (armor surge) when wounded" },
  "atrium-regent": { name: "Atrium Regent", glyph: "Θ", hp: 2600, speed: 0.7, armor: 0.3, reward: 200, drain: 30, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 3
  "cascade-anchor": { name: "Cascade Anchor", glyph: "Λ", hp: 3e3, speed: 0.7, armor: 0.3, reward: 220, drain: 30, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD when wounded" },
  "descent-marshal": { name: "Descent Marshal", glyph: "Ξ", hp: 4200, speed: 0.8, armor: 0.25, reward: 280, drain: 35, trigger: 0.5, ability: "haste", telegraph: "will HASTE when wounded" },
  "cascade-sovereign": { name: "Cascade Sovereign", glyph: "Σ", hp: 5600, speed: 0.7, armor: 0.35, reward: 360, drain: 40, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  // Map 4
  "approach-vanguard": { name: "Approach Vanguard", glyph: "Π", hp: 6e3, speed: 0.8, armor: 0.3, reward: 380, drain: 40, trigger: 0.5, ability: "shield", telegraph: "will raise a SHIELD when wounded" },
  "event-horizon": { name: "Event Horizon", glyph: "◉", hp: 8e3, speed: 0.7, armor: 0.35, reward: 460, drain: 45, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" },
  "penultimate-knot": { name: "Penultimate Knot", glyph: "╬", hp: 1e4, speed: 0.7, armor: 0.4, reward: 560, drain: 50, trigger: 0.5, ability: "haste", telegraph: "will HASTE when wounded" },
  "final-bastion": { name: "Final Bastion", glyph: "█", hp: 14e3, speed: 0.6, armor: 0.4, reward: 720, drain: 60, trigger: 0.5, ability: "recurse", telegraph: "will RECURSE at half integrity" }
};
function subBossDef(id) {
  return SUB_BOSSES[id] || null;
}
function spawnSubBoss(id, idCounter) {
  const def = SUB_BOSSES[id];
  if (!def) return null;
  return {
    id: `sb${idCounter}`,
    type: "subboss",
    subBoss: id,
    hp: def.hp,
    maxHp: def.hp,
    x: 0,
    y: 0,
    pathIndex: 0,
    speed: def.speed,
    armor: def.armor,
    slowImmune: false,
    abilityFired: false
  };
}

// ../../docs/games/metagame/stages/stage4/upgrades.js
function sellTower(state, towerId) {
  const idx = (state.towers || []).findIndex((t) => t.id === towerId);
  if (idx < 0) return { ok: false, reason: "not-found" };
  const tower = state.towers[idx];
  const base = TOWER_TYPES[tower.type]?.cost || 0;
  const invested = base * Math.pow(2, (tower.level || 1) - 1);
  const refund = Math.floor(invested * 0.7);
  state.cycles = (state.cycles || 0) + refund;
  state.towers.splice(idx, 1);
  return { ok: true, refund };
}
function upgradeTower(state, towerId) {
  const tower = (state.towers || []).find((t) => t.id === towerId);
  if (!tower) return { ok: false, reason: "not-found" };
  const level = tower.level || 1;
  if (level >= 3) return { ok: false, reason: "max-level" };
  const cost = towerUpgradeCost(tower.type, level);
  if ((state.cycles || 0) < cost) return { ok: false, reason: "poor", cost };
  state.cycles -= cost;
  tower.level = level + 1;
  return { ok: true, level: tower.level, cost };
}
function applyExtractorIncome(state) {
  let income = 0;
  for (const tower of state.towers || []) {
    const def = TOWER_TYPES[tower.type];
    if (def?.incomePerWave) income += towerStat(tower, "incomePerWave");
  }
  state.cycles = (state.cycles || 0) + income;
  return income;
}

// ../../docs/games/metagame/stages/stage4/engine.js
function enemyDef(enemy) {
  if (enemy?.subBoss) {
    const sb = subBossDef(enemy.subBoss);
    if (sb) return { glyph: sb.glyph, reward: sb.reward, integrityDrain: sb.drain };
  }
  return ENEMY_TYPES[enemy?.type] || ENEMY_TYPES.recursion;
}
function startWave(state, waveNum, pathTiles) {
  const comp = state.campaign ? mapWaveComposition(state.campaign.mapIndex || 0, waveNum) : waveComposition(waveNum, state.recursion?.pointSetId || "x");
  const queue = [];
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) queue.push(grp.type);
  if (comp.subBoss) queue.push(`subboss:${comp.subBoss}`);
  state.waveNumber = waveNum;
  state.waveActive = true;
  state.waveFailed = false;
  state.waveHpScale = comp.hpScale || 1;
  state.enemies = [];
  state.spawnQueue = queue;
  state.spawnTimerMs = SPAWN_INTERVAL_MS;
  state.combatClockMs = 0;
  state.enemyNextId = 1;
  for (const t of state.towers) {
    t.lastFiredMs = -Infinity;
    t.abilityNextMs = 0;
  }
  if (comp.subBoss) {
    const sb = subBossDef(comp.subBoss);
    if (sb) pushLog3(state, `${sb.glyph} ${sb.name} approaches — it ${sb.telegraph}.`);
  }
  return state;
}
function queueWave(state, waveNum) {
  const comp = state.campaign ? mapWaveComposition(state.campaign.mapIndex || 0, waveNum) : waveComposition(waveNum, state.recursion?.pointSetId || "x");
  for (const grp of comp.enemies) for (let i = 0; i < grp.count; i++) state.spawnQueue.push(grp.type);
  if (comp.subBoss) {
    state.spawnQueue.push(`subboss:${comp.subBoss}`);
    const sb = subBossDef(comp.subBoss);
    if (sb) pushLog3(state, `${sb.glyph} ${sb.name} approaches — it ${sb.telegraph}.`);
  }
  return state;
}
function tick(state, deltaMs, pathTiles) {
  if (!state.waveActive || !Array.isArray(pathTiles) || pathTiles.length < 2) return state;
  const dt = Math.max(0, Number(deltaMs) || 0);
  const exitIndex = pathTiles.length - 1;
  state.combatClockMs = (state.combatClockMs || 0) + dt;
  spawnDueEnemies(state, dt, pathTiles);
  applyFields(state, dt);
  statusPass(state, dt);
  behaviorPass(state, dt);
  moveEnemies(state, dt, pathTiles, exitIndex);
  fireTowers(state, pathTiles);
  fireAbilities(state, dist2);
  reap(state, pathTiles);
  return state;
}
function resolveDeath(state, enemy, pathTiles) {
  const def = enemyDef(enemy);
  state.cycles = (state.cycles || 0) + (def.reward || 0);
  if (def.spawnsOnDeath) {
    for (let i = 0; i < def.spawnsOnDeath.count; i++) {
      const child = spawnEnemy(def.spawnsOnDeath.type, state.recursion?.pointSetId || "x", state.enemyNextId++);
      child.pathIndex = enemy.pathIndex;
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog3(state, `${def.glyph} fractures into ${def.spawnsOnDeath.count}.`);
  }
  return def.reward || 0;
}
function waveComplete(state) {
  if (!state.waveActive) return false;
  if ((state.spawnQueue?.length || 0) > 0 || state.enemies.length > 0) return false;
  state.waveActive = false;
  applyExtractorIncome(state);
  return true;
}
function spawnDueEnemies(state, dt, pathTiles) {
  state.spawnTimerMs = (state.spawnTimerMs || 0) + dt;
  while ((state.spawnQueue?.length || 0) > 0 && state.spawnTimerMs >= SPAWN_INTERVAL_MS) {
    state.spawnTimerMs -= SPAWN_INTERVAL_MS;
    const type = state.spawnQueue.shift();
    const isSub = String(type).startsWith("subboss:");
    const e = isSub ? spawnSubBoss(type.slice("subboss:".length), state.enemyNextId++) : spawnEnemy(type, state.recursion?.pointSetId || "x", state.enemyNextId++);
    if (!e) continue;
    if (!isSub) scaleEnemyHp(e, state.waveHpScale || 1);
    placeOnPath(e, pathTiles);
    state.enemies.push(e);
  }
}
function applyFields(state, dt) {
  const back = (Number(dt) || 0) / 1e3;
  for (const t of state.towers) {
    const def = TOWER_TYPES[t.type];
    if (!def?.slow && !def?.pull) continue;
    const range = towerStat(t, "range");
    const slow = towerStat(t, "slow");
    const pull = towerStat(t, "pull");
    for (const e of state.enemies) {
      if (dist2(t, e) > range) continue;
      if (slow) applyStatus(e, "slow", { factor: Math.max(0, 1 - slow), ms: 250 });
      if (pull && !e.slowImmune) e.pathIndex = Math.max(0, e.pathIndex - pull * back);
    }
  }
}
function statusPass(state, dt) {
  for (const e of state.enemies) tickStatus(state, e, dt);
}
function moveEnemies(state, dt, pathTiles, exitIndex) {
  const survivors = [];
  for (const e of state.enemies) {
    const eff = e.speed * statusSpeedFactor(e);
    e.pathIndex += eff * (dt / 1e3);
    if (e.pathIndex >= exitIndex) {
      const def = enemyDef(e);
      state.integrity = Math.max(0, (state.integrity || 0) - (def.integrityDrain || 0));
      if (state.integrity <= 0) state.waveFailed = true;
      pushLog3(state, `${def.glyph} reached the core.`);
      continue;
    }
    placeOnPath(e, pathTiles);
    survivors.push(e);
  }
  state.enemies = survivors;
}
function fireTowers(state, pathTiles) {
  const now = state.combatClockMs;
  for (const tower of state.towers) {
    const def = TOWER_TYPES[tower.type];
    if (!def || !def.fireRate || !def.damage) continue;
    const fireRate = towerStat(tower, "fireRate") || def.fireRate;
    if (now - (tower.lastFiredMs ?? -Infinity) < 1e3 / fireRate) continue;
    const range = towerStat(tower, "range");
    const candidates = state.enemies.filter((e) => isTargetable(e, now) && (def.global || dist2(tower, e) <= range));
    if (!candidates.length) continue;
    tower.lastFiredMs = now;
    const bonus = 1 + hubsCovering(state, tower);
    const eff = { aoe: towerStat(tower, "aoe"), chain: Math.round(towerStat(tower, "chain")), global: def.global };
    for (const e of pickTargets(state, tower, eff, candidates)) applyDamage(state, tower, def, e, bonus, pathTiles);
  }
}
function pickTargets(state, tower, eff, candidates) {
  if (eff.global && eff.aoe) {
    const focus = selectTarget(candidates, tower);
    return state.enemies.filter((e) => dist2(e, focus) <= eff.aoe);
  }
  if (eff.aoe) return candidates;
  if (eff.chain) {
    const focus = selectTarget(candidates, tower);
    return [...candidates].sort((a, b) => dist2(focus, a) - dist2(focus, b) || b.pathIndex - a.pathIndex).slice(0, eff.chain);
  }
  return [selectTarget(candidates, tower)];
}
function applyDamage(state, tower, def, enemy, bonus, pathTiles) {
  let dmg = towerStat(tower, "damage") * bonus * (state.damageMult || 1);
  dmg *= overchargeMult(tower, state.combatClockMs || 0);
  const tile = pathTiles[Math.floor(enemy.pathIndex)];
  if (tile?.recurve) dmg *= 2;
  dmg *= damageTakenMult(enemy);
  const type = def.damageType || (def.ignoresArmor ? "null" : "kinetic");
  const armor = Math.min(0.95, effectiveArmor(enemy) + burrowArmor(enemy, state.combatClockMs || 0));
  resolveDamage(enemy, dmg, type, { armor });
  applyOnHit(enemy, { onHit: effectiveOnHit(tower, def) });
  if (enemy.subBoss && !enemy.abilityFired) maybeFireSubBossAbility(state, enemy, pathTiles);
}
function maybeFireSubBossAbility(state, enemy, pathTiles) {
  const sb = subBossDef(enemy.subBoss);
  if (!sb || enemy.hp > enemy.maxHp * sb.trigger) return;
  enemy.abilityFired = true;
  if (sb.ability === "recurse") {
    for (let i = 0; i < 3; i++) {
      const child = spawnEnemy("recursion", state.recursion?.pointSetId || "x", state.enemyNextId++);
      child.pathIndex = Math.max(0, enemy.pathIndex - (i + 1));
      placeOnPath(child, pathTiles);
      state.enemies.push(child);
    }
    pushLog3(state, `${sb.glyph} ${sb.name} RECURSES — copies pour out.`);
  } else if (sb.ability === "haste") {
    enemy.speed *= 1.6;
    pushLog3(state, `${sb.glyph} ${sb.name} HASTES — it surges forward.`);
  } else if (sb.ability === "shield") {
    enemy.armor = Math.min(0.9, (enemy.armor || 0) + 0.3);
    pushLog3(state, `${sb.glyph} ${sb.name} raises a SHIELD.`);
  }
}
function reap(state, pathTiles) {
  const survivors = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) resolveDeath(state, e, pathTiles);
    else survivors.push(e);
  }
  state.enemies = survivors;
}
function hubsCovering(state, tower) {
  let bonus = 0;
  for (const t of state.towers) {
    if (t === tower) continue;
    const def = TOWER_TYPES[t.type];
    if (def?.adjacencyBonus && dist2(t, tower) <= towerStat(t, "range")) bonus += towerStat(t, "adjacencyBonus");
  }
  return bonus;
}
var TARGET_COMPARATORS = {
  first: (a, b) => a.pathIndex > b.pathIndex,
  last: (a, b) => a.pathIndex < b.pathIndex,
  strongest: (a, b) => a.hp > b.hp || a.hp === b.hp && a.pathIndex > b.pathIndex,
  weakest: (a, b) => a.hp < b.hp || a.hp === b.hp && a.pathIndex > b.pathIndex,
  closest: (a, b, tower) => {
    const da = dist2(tower, a);
    const db = dist2(tower, b);
    return da < db || da === db && a.pathIndex > b.pathIndex;
  }
};
function selectTarget(enemies, tower) {
  if (!Array.isArray(enemies) || !enemies.length) return null;
  const cmp = TARGET_COMPARATORS[tower?.targetMode] || TARGET_COMPARATORS.first;
  return enemies.reduce((best, e) => cmp(e, best, tower) ? e : best, enemies[0]);
}
function scaleEnemyHp(e, scale) {
  if (!e || scale === 1) return;
  e.hp = Math.round(e.hp * scale);
  e.maxHp = Math.round(e.maxHp * scale);
  if (e.shield) {
    e.shield = Math.round(e.shield * scale);
    e.shieldMax = Math.round(e.shieldMax * scale);
  }
}
function placeOnPath(enemy, pathTiles) {
  const tile = pathTiles[Math.min(pathTiles.length - 1, Math.max(0, Math.floor(enemy.pathIndex)))];
  if (tile) {
    enemy.x = tile.x;
    enemy.y = tile.y;
  }
}
function dist2(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}
function pushLog3(state, line) {
  state.log = [...state.log || [], line].slice(-12);
}

// ../../docs/games/metagame/stages/stage4/armory.js
var ARMORY_UPGRADES = [
  { id: "reinforced-core", label: "Reinforced Core", desc: "+25 starting integrity per level", baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: "capital-reserves", label: "Capital Reserves", desc: "+60 starting cycles per level", baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: "overclocked-emitters", label: "Overclocked Emitters", desc: "+8% tower damage per level", baseCost: 40, costScale: 1.8, maxLevel: 5 },
  { id: "glory-dividend", label: "Glory Dividend", desc: "+1 Glory per wave cleared", baseCost: 50, costScale: 2, maxLevel: 3 }
];
function armoryUpgradeById(id) {
  return ARMORY_UPGRADES.find((u) => u.id === id) || null;
}
function armoryLevel(campaign, id) {
  return Math.max(0, Math.trunc(Number(campaign?.armory?.[id]) || 0));
}
function armoryCost(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return Infinity;
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costScale, lvl));
}
function canBuyArmory(campaign, id) {
  const cost = armoryCost(campaign, id);
  return Number.isFinite(cost) && Number(campaign?.glory || 0) >= cost;
}
function buyArmory(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return { ok: false, reason: "unknown" };
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return { ok: false, reason: "maxed" };
  const cost = armoryCost(campaign, id);
  if (Number(campaign.glory || 0) < cost) return { ok: false, reason: "poor", cost };
  campaign.glory = Number(campaign.glory || 0) - cost;
  if (!campaign.armory || typeof campaign.armory !== "object") campaign.armory = {};
  campaign.armory[id] = lvl + 1;
  return { ok: true, level: lvl + 1, cost };
}
function armoryEffects(campaign) {
  return {
    integrityBonus: armoryLevel(campaign, "reinforced-core") * 25,
    cyclesBonus: armoryLevel(campaign, "capital-reserves") * 60,
    damageMult: 1 + armoryLevel(campaign, "overclocked-emitters") * 0.08,
    gloryPerWaveBonus: armoryLevel(campaign, "glory-dividend")
  };
}

// ../../docs/games/metagame/stages/stage4/run4.js
var GLORY_PER_WAVE_BASE = 2;
var GLORY_MAP_CLEAR_BASE = 12;
var WAVE_REGEN = 8;
var BOSS_ARENA_CYCLES = 600;
function createCampaign() {
  return {
    status: "map-select",
    // map-select | combat | armory | boss | won
    mapIndex: 0,
    // the active map while in combat / armory
    clearedMaps: [],
    // indices of cleared maps
    glory: 0,
    armory: {}
    // { upgradeId: level }
  };
}
function ensureCampaign(state) {
  const fresh = createCampaign();
  const c = state.campaign && typeof state.campaign === "object" ? state.campaign : {};
  c.status = ["map-select", "combat", "armory", "boss", "won"].includes(c.status) ? c.status : "map-select";
  c.mapIndex = clampIndex(c.mapIndex);
  c.clearedMaps = Array.isArray(c.clearedMaps) ? [...new Set(c.clearedMaps.map(clampIndex))].filter((i) => i >= 0).sort((a, b) => a - b) : [];
  c.glory = Number.isFinite(c.glory) ? Math.max(0, c.glory) : 0;
  c.armory = c.armory && typeof c.armory === "object" ? c.armory : {};
  state.campaign = c;
  return c;
}
function mapUnlocked(state, i) {
  const idx = clampIndex(i);
  if (idx === 0) return true;
  return (state.campaign?.clearedMaps || []).includes(idx - 1);
}
function mapCleared(state, i) {
  return (state.campaign?.clearedMaps || []).includes(clampIndex(i));
}
function allMapsCleared(state) {
  const cleared = state.campaign?.clearedMaps || [];
  return MAPS.every((_, i) => cleared.includes(i));
}
function bossUnlocked(state) {
  return allMapsCleared(state) && !state.boss?.defeated;
}
function selectMap(state, i) {
  const idx = clampIndex(i);
  if (!mapUnlocked(state, idx)) return { ok: false, reason: "locked" };
  const c = ensureCampaign(state);
  c.mapIndex = idx;
  c.status = "combat";
  resetCombatForMap(state, idx);
  return { ok: true, mapIndex: idx };
}
function resetCombatForMap(state, i) {
  const idx = clampIndex(i);
  const map = mapByIndex(idx);
  const fx = armoryEffects(state.campaign);
  state.cycles = map.startCycles + fx.cyclesBonus;
  state.integrity = map.startIntegrity + fx.integrityBonus;
  state.maxIntegrity = map.startIntegrity + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.waveFailed = false;
  state.towers = [];
  state.enemies = [];
  state.spawnQueue = [];
  return state;
}
function recordWaveCleared(state) {
  const c = ensureCampaign(state);
  const idx = c.mapIndex;
  const map = mapByIndex(idx);
  const fx = armoryEffects(c);
  const gloryGain = GLORY_PER_WAVE_BASE + idx + fx.gloryPerWaveBonus;
  c.glory = Number(c.glory || 0) + gloryGain;
  state.integrity = Math.min(state.maxIntegrity || map.startIntegrity, (state.integrity || 0) + WAVE_REGEN);
  const wasFinal = (state.waveNumber || 1) >= map.waveCount;
  if (wasFinal) {
    const mapGlory = markMapCleared(state, idx);
    return { gloryGain, mapCleared: true, mapGlory };
  }
  state.waveNumber = (state.waveNumber || 1) + 1;
  return { gloryGain, mapCleared: false };
}
function markMapCleared(state, idx) {
  const c = ensureCampaign(state);
  if (!c.clearedMaps.includes(idx)) c.clearedMaps.push(idx);
  c.clearedMaps.sort((a, b) => a - b);
  const mapGlory = GLORY_MAP_CLEAR_BASE * (idx + 1);
  c.glory = Number(c.glory || 0) + mapGlory;
  state.waveActive = false;
  c.status = "armory";
  return mapGlory;
}
function leaveArmory(state) {
  ensureCampaign(state).status = "map-select";
  return { ok: true };
}
function enterBoss(state) {
  if (!bossUnlocked(state)) return { ok: false, reason: "locked" };
  const c = ensureCampaign(state);
  c.status = "boss";
  resetBossArena(state);
  return { ok: true };
}
function resetBossArena(state) {
  const fx = armoryEffects(state.campaign);
  state.cycles = BOSS_ARENA_CYCLES + fx.cyclesBonus;
  state.integrity = 100 + fx.integrityBonus;
  state.maxIntegrity = 100 + fx.integrityBonus;
  state.damageMult = fx.damageMult;
  state.waveNumber = 1;
  state.waveActive = false;
  state.towers = [];
  state.enemies = [];
  return state;
}
function winCampaign(state) {
  ensureCampaign(state).status = "won";
  return { ok: true };
}
function seatAtBoss(state) {
  const c = ensureCampaign(state);
  c.clearedMaps = MAPS.map((_, i) => i);
  return enterBoss(state);
}
function debugClearMap(state) {
  const c = ensureCampaign(state);
  return { ok: true, mapGlory: markMapCleared(state, c.mapIndex) };
}
function campaignProgress(state) {
  return { cleared: (state.campaign?.clearedMaps || []).length, total: MAP_COUNT };
}
function isVeteran(state) {
  return (state?.campaign?.clearedMaps || []).length > 0;
}
function combatDisclosed(state, mapIndex) {
  const idx = clampIndex(mapIndex ?? state?.campaign?.mapIndex ?? 0);
  return isVeteran(state) || idx >= 1;
}
function clampIndex(i) {
  return Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(i)) || 0));
}

// ../../docs/games/metagame/stages/stage4/state.js
function defaultState(context = {}) {
  const seed = stageSeed(context);
  return {
    version: 1,
    cycles: 240,
    wave: 4,
    // Full-TD fields (engine.js reads/writes these; see stage4 buildplan A3). Enemies are ephemeral
    // (regenerated per wave, never persisted). towerNextId replaces any Math.random id generation.
    integrity: 100,
    maxIntegrity: 100,
    // per-map cap (set by run4.resetCombatForMap; integrity regen never exceeds it)
    damageMult: 1,
    // Armory "Overclocked Emitters" multiplier (applied by engine.applyDamage)
    waveGroup: 1,
    waveActive: false,
    waveNumber: 1,
    enemies: [],
    towerNextId: 1,
    // The 5-map campaign state machine (run4.js): status, mapIndex, clearedMaps, glory, armory.
    campaign: createCampaign(),
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
  target.integrity = Number.isFinite(target.integrity) ? target.integrity : fresh.integrity;
  target.maxIntegrity = Number.isFinite(target.maxIntegrity) ? target.maxIntegrity : fresh.maxIntegrity;
  target.damageMult = Number.isFinite(target.damageMult) ? target.damageMult : fresh.damageMult;
  target.waveGroup = Number.isFinite(target.waveGroup) ? target.waveGroup : fresh.waveGroup;
  target.waveActive = Boolean(target.waveActive);
  target.waveNumber = Number.isFinite(target.waveNumber) ? target.waveNumber : fresh.waveNumber;
  target.enemies = [];
  target.towerNextId = Number.isFinite(target.towerNextId) ? target.towerNextId : fresh.towerNextId;
  target.recursion = mergePlain(fresh.recursion, target.recursion);
  target.recursion.pointSetId = String(target.recursion.pointSetId || fresh.recursion.pointSetId);
  target.recursion.points = normalizePoints(target.recursion.points, fresh.recursion.points);
  target.towers = Array.isArray(target.towers) ? target.towers.map(normalizeTower).filter(Boolean) : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  ensureCampaign(target);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}
function snapshotWave(state) {
  return {
    waveNumber: state.waveNumber,
    wavePeak: Number.isFinite(state.wavePeak) ? state.wavePeak : state.waveNumber,
    waveActive: Boolean(state.waveActive),
    waveFailed: Boolean(state.waveFailed),
    integrity: state.integrity,
    cycles: state.cycles,
    enemies: (state.enemies || []).map((enemy) => ({ ...enemy })),
    spawnQueue: [...state.spawnQueue || []],
    spawnTimerMs: Number(state.spawnTimerMs) || 0,
    combatClockMs: Number(state.combatClockMs) || 0,
    enemyNextId: Number.isFinite(state.enemyNextId) ? state.enemyNextId : 1
  };
}
function restoreWave(state, snap) {
  if (!snap || typeof snap !== "object") return state;
  if (Number.isFinite(snap.waveNumber)) state.waveNumber = snap.waveNumber;
  state.wavePeak = Number.isFinite(snap.wavePeak) ? snap.wavePeak : state.waveNumber;
  state.waveActive = Boolean(snap.waveActive);
  state.waveFailed = Boolean(snap.waveFailed);
  if (Number.isFinite(snap.integrity)) state.integrity = snap.integrity;
  if (Number.isFinite(snap.cycles)) state.cycles = snap.cycles;
  state.enemies = Array.isArray(snap.enemies) ? snap.enemies.map((enemy) => ({ ...enemy })) : [];
  state.spawnQueue = Array.isArray(snap.spawnQueue) ? [...snap.spawnQueue] : [];
  state.spawnTimerMs = Number(snap.spawnTimerMs) || 0;
  state.combatClockMs = Number(snap.combatClockMs) || 0;
  state.enemyNextId = Number.isFinite(snap.enemyNextId) ? snap.enemyNextId : 1;
  return state;
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
  const x = clampInt(tower.x, 0, 39);
  const y = clampInt(tower.y, 0, 39);
  const type = String(tower.type || "pulse_node");
  return {
    id: String(tower.id || `tower-${type}-${x}-${y}`),
    type,
    x,
    y,
    level: clampInt(tower.level || 1, 1, 3),
    // Migrate any legacy 5-mode value onto one of the 3 presets (surface reduction, 2026-07-03).
    targetMode: toPreset(tower.targetMode),
    fork: tower.fork ? String(tower.fork) : null,
    // chosen tier-3 fork (irrevocable; persisted)
    abilityReady: tower.abilityReady !== false,
    abilityUsed: Boolean(tower.abilityUsed)
  };
}
function stageSeed(context) {
  return String(context.seed || "fractal-bastion").replace(/\W/g, "").slice(-8) || "stage4";
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

// ../../docs/games/metagame/stages/stage4/combat-helpers.js
function towerRange(type) {
  const def = TOWER_TYPES[type];
  if (!def) return 0;
  if (def.global) return Infinity;
  return Number(def.range) || 0;
}
function placementPreview(state, pathTiles, type, cell, { size = 40 } = {}) {
  const foot = cell ? { x: Math.trunc(cell.x), y: Math.trunc(cell.y) } : null;
  const rings = rangeRing(type, foot, size);
  if (!foot) return { foot: null, rings, valid: false, reason: "none" };
  const onBoard = foot.x >= 0 && foot.y >= 0 && foot.x < size && foot.y < size;
  const occupied = (state?.towers || []).some((t) => t.x === foot.x && t.y === foot.y);
  const onPath = (pathTiles || []).some((t) => t.x === foot.x && t.y === foot.y);
  const cost = TOWER_TYPES[type]?.cost || 0;
  const afford = Number(state?.cycles || 0) >= cost;
  let reason = "ok";
  if (!onBoard) reason = "bounds";
  else if (occupied) reason = "occupied";
  else if (onPath) reason = "path";
  else if (!afford) reason = "cycles";
  return { foot, rings, valid: reason === "ok", reason };
}
function rangeRing(type, center, size = 40) {
  const rings = /* @__PURE__ */ new Set();
  const r = towerRange(type);
  if (!center || !Number.isFinite(r) || r <= 0) return rings;
  for (let y = Math.max(0, center.y - r); y <= Math.min(size - 1, center.y + r); y += 1) {
    for (let x = Math.max(0, center.x - r); x <= Math.min(size - 1, center.x + r); x += 1) {
      if (x === center.x && y === center.y) continue;
      if (Math.hypot(x - center.x, y - center.y) <= r) rings.add(`${x},${y}`);
    }
  }
  return rings;
}
function wavePreviewLine(mapIndex, waveNumber) {
  const w = Math.max(1, Math.trunc(Number(waveNumber)) || 1);
  const comp = mapWaveComposition(mapIndex, w);
  const parts = (comp.enemies || []).map((e) => `${e.count} ${shortEnemy(e.type)}`);
  return parts.length ? parts.join(" · ") : "—";
}
function shortEnemy(type) {
  return String(type).replace(/_(node|loop|packet|crawler|ghost|host|bit|drone)$/, "").replace(/_/g, " ");
}
var TOWER_UNLOCK_MAP = {
  pulse_node: 0,
  cycle_extractor: 0,
  scatter_array: 0,
  null_spike: 0,
  attractor_field: 0,
  frost_lattice: 1,
  thermal_loop: 1,
  shatter_drill: 1,
  chain_resonator: 2,
  resonance_hub: 2,
  gravity_well: 2,
  long_recursor: 3,
  glyph_mortar: 3,
  bank_node: 3
};
function availableTowers(placeable, mapIndex) {
  const idx = Math.max(0, Math.trunc(Number(mapIndex)) || 0);
  return placeable.filter((type) => (TOWER_UNLOCK_MAP[type] ?? 0) <= idx);
}
function sellValue(tower) {
  const base = TOWER_TYPES[tower?.type]?.cost || 0;
  return Math.floor(base * Math.pow(2, (tower?.level || 1) - 1) * 0.7);
}
function refundTowersOnPath(state, tiles) {
  const onPath = new Set((tiles || []).map((t) => `${t.x},${t.y}`));
  const kept = [];
  let count = 0;
  let refund = 0;
  for (const tower of state.towers || []) {
    if (!onPath.has(`${tower.x},${tower.y}`)) {
      kept.push(tower);
      continue;
    }
    const base = TOWER_TYPES[tower.type]?.cost || 0;
    refund += Math.floor(base * Math.pow(2, (tower.level || 1) - 1));
    count += 1;
  }
  if (count) {
    state.towers = kept;
    state.cycles = (state.cycles || 0) + refund;
  }
  return { count, refund };
}
function reshapesAfter(mapIndex, waveNumber) {
  const map = mapByIndex(mapIndex);
  const w = Math.max(1, Math.trunc(Number(waveNumber)) || 1);
  if (w >= map.waveCount) return false;
  return mapPathDepth(map.depth, w + 1) > mapPathDepth(map.depth, w);
}
function preWaveHint(mapIndex, waveNumber) {
  const w = Math.max(1, Math.trunc(Number(waveNumber)) || 1);
  const comp = mapWaveComposition(mapIndex, w);
  const parts = [];
  const sbId = subBossIdForWave(mapIndex, w);
  if (sbId) {
    const d = subBossDef(sbId);
    if (d) parts.push(`${d.glyph} ${d.name} — ${d.telegraph}`);
  }
  const summary = (comp.enemies || []).map((e) => `${e.count}×${e.type}`).join(", ");
  parts.push(summary ? `wave ${w} incoming: ${summary}` : `wave ${w} incoming`);
  if (reshapesAfter(mapIndex, w)) parts.push("⚠ the path reshapes after this wave — place for the fold to come");
  parts.push("place towers, then start the wave");
  return parts.join("  ·  ");
}

// ../../docs/games/metagame/stages/stage4/combat-rows.js
function towerStatLine(def, disclosed) {
  const parts = [];
  if (Number(def.damage) > 0) {
    parts.push(`dmg ${def.damage}`);
    parts.push(def.range >= 99 ? "global" : `rng ${def.range}`);
    if (Number(def.fireRate) > 0) parts.push(`${def.fireRate}/s`);
    if (disclosed && def.damageType) parts.push(def.damageType);
  } else if (def.incomePerWave) {
    parts.push(`+${def.incomePerWave}c / wave`);
  } else if (def.adjacencyBonus) {
    parts.push(`+${Math.round(def.adjacencyBonus * 100)}% adjacent · rng ${def.range}`);
  } else if (def.slow || def.pull) {
    const bits = [`rng ${def.range}`];
    if (def.slow) bits.unshift("slow");
    if (def.pull) bits.push("pull");
    parts.push(bits.join(" · "));
  } else {
    parts.push("support");
  }
  return parts.join(" · ");
}
function shopRows({ placeable, isBoss, mapIndex, selected, disclosed }) {
  const list = isBoss ? placeable : availableTowers(placeable, mapIndex);
  return list.map((type) => {
    const def = TOWER_TYPES[type];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tower = type;
    btn.className = `s4-shop-row${type === selected ? " is-selected" : ""}`;
    const head = document.createElement("span");
    head.className = "s4-shop-head";
    head.textContent = `${def.glyph} ${type} · ${def.cost}c`;
    const sub = document.createElement("span");
    sub.className = "s4-shop-sub";
    sub.textContent = towerStatLine(def, disclosed);
    btn.append(head, sub);
    return btn;
  });
}
function rosterRows(state, disclosed = true) {
  return (state.towers || []).map((tower) => {
    const wrap = document.createElement("div");
    wrap.className = "s4-roster-row";
    const def = TOWER_TYPES[tower.type] || {};
    const level = tower.level || 1;
    if (disclosed) {
      const tgt = document.createElement("button");
      tgt.type = "button";
      tgt.dataset.towerId = tower.id;
      tgt.textContent = `${def.glyph || "[?]"} L${level} ${tower.x},${tower.y} → ${presetLabel(tower.targetMode)}`;
      wrap.append(tgt);
    } else {
      const tag = document.createElement("span");
      tag.className = "s4-roster-name";
      tag.textContent = `${def.glyph || "[?]"} L${level} ${tower.x},${tower.y}`;
      wrap.append(tag);
    }
    if (level < 3) {
      const up = document.createElement("button");
      up.type = "button";
      up.dataset.upgradeId = tower.id;
      up.textContent = `upgrade (${towerUpgradeCost(tower.type, level)})`;
      wrap.append(up);
    } else if (!tower.fork && forksFor(tower.type).length) {
      for (const f of forksFor(tower.type)) {
        const fb = document.createElement("button");
        fb.type = "button";
        fb.className = "s4-fork-btn";
        fb.dataset.forkId = tower.id;
        fb.dataset.forkChoice = f.id;
        fb.textContent = `⑂ ${f.label}`;
        fb.title = f.desc;
        wrap.append(fb);
      }
    } else if (tower.fork) {
      const tag = document.createElement("span");
      tag.className = "s4-fork-tag";
      tag.textContent = `⑂ ${forkDef(tower)?.label || tower.fork}`;
      wrap.append(tag);
    }
    const sell = document.createElement("button");
    sell.type = "button";
    sell.className = "s4-sell-btn";
    sell.dataset.sellId = tower.id;
    sell.textContent = `sell (${sellValue(tower)})`;
    wrap.append(sell);
    return wrap;
  });
}

// ../../docs/games/metagame/stages/stage4/combat-board-map.js
function cellFromTextRect({ clientX, clientY, textRect, cols, rows }) {
  if (!textRect || cols <= 0 || rows <= 0) return null;
  if (!(textRect.width > 0) || !(textRect.height > 0)) return null;
  const cellW = textRect.width / cols;
  const cellH = textRect.height / rows;
  const x = Math.floor((clientX - textRect.left) / cellW);
  const y = Math.floor((clientY - textRect.top) / cellH);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  return { x, y };
}

// ../../docs/games/metagame/stages/stage4/combat-popover.js
var active = null;
function popoverTowerId() {
  return active?.towerId || null;
}
function closeTowerPopover() {
  if (!active) return;
  document.removeEventListener("click", active.onDocClick, true);
  document.removeEventListener("keydown", active.onKey, true);
  active.el.remove();
  active = null;
}
function openTowerPopover({ root, anchor, state, tower, disclosed = true, onClose }) {
  if (!tower) return null;
  const refreshing = active && active.towerId === tower.id;
  if (!refreshing) closeTowerPopover();
  const el = refreshing ? active.el : document.createElement("div");
  el.className = "s4-popover";
  el.setAttribute("role", "menu");
  el.setAttribute("aria-label", `${tower.type} actions`);
  el.innerHTML = popoverHTML(tower, disclosed);
  if (refreshing) return el;
  root.appendChild(el);
  position(el, anchor, root);
  const onDocClick = (event) => {
    if (el.contains(event.target)) return;
    if (event.target.closest?.(".s4-board")) return;
    closeTowerPopover();
    onClose?.();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTowerPopover();
      onClose?.();
    }
  };
  active = { el, towerId: tower.id, onDocClick, onKey };
  setTimeout(() => {
    if (active && active.el === el) {
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("keydown", onKey, true);
    }
  }, 0);
  return el;
}
function popoverHTML(tower, disclosed) {
  const def = TOWER_TYPES[tower.type] || {};
  const level = tower.level || 1;
  const stat = [];
  if (Number(def.damage) > 0) {
    stat.push(`dmg ${def.damage}`);
    stat.push(def.range >= 99 ? "global" : `rng ${def.range}`);
    if (Number(def.fireRate) > 0) stat.push(`${def.fireRate}/s`);
    if (disclosed && def.damageType) stat.push(def.damageType);
  } else {
    stat.push(def.role ? def.role.split("—")[0].trim() : "support");
  }
  let verbs = "";
  if (disclosed) {
    verbs += `<button type="button" class="s4-pop-btn" data-tower-id="${tower.id}">target ▸ ${presetLabel(tower.targetMode)}</button>`;
  }
  if (level < 3) {
    verbs += `<button type="button" class="s4-pop-btn" data-upgrade-id="${tower.id}">upgrade (${towerUpgradeCost(tower.type, level)}c)</button>`;
  } else if (!tower.fork && forksFor(tower.type).length) {
    for (const f of forksFor(tower.type)) {
      verbs += `<button type="button" class="s4-pop-btn s4-fork-btn" data-fork-id="${tower.id}" data-fork-choice="${f.id}" title="${escAttr(f.desc)}">⑂ ${f.label}</button>`;
    }
  } else if (tower.fork) {
    verbs += `<span class="s4-fork-tag">⑂ ${forkDef(tower)?.label || tower.fork}</span>`;
  }
  verbs += `<button type="button" class="s4-pop-btn s4-sell-btn" data-sell-id="${tower.id}">sell (${sellValue(tower)}c)</button>`;
  return `<div class="s4-pop-head"><b>${def.glyph || "[?]"} ${tower.type}</b> · L${level} @ ${tower.x},${tower.y}</div><div class="s4-pop-stat">${stat.join(" · ")}</div><div class="s4-pop-actions">${verbs}</div>`;
}
function position(el, anchor, root) {
  const r = root.getBoundingClientRect();
  const top = (anchor?.bottom ?? r.top) - r.top + 4;
  el.style.top = `${Math.max(4, top)}px`;
  const w = el.offsetWidth || 200;
  let left = (anchor?.left ?? r.left) - r.left;
  const max = root.clientWidth - w - 6;
  if (left > max) left = Math.max(4, max);
  el.style.left = `${Math.max(4, left)}px`;
}
function escAttr(s) {
  return String(s || "").replace(/"/g, "&quot;");
}

// ../../docs/games/metagame/stages/stage4/combat-fx.js
import { flash, shake, floatNum, banner } from "../../shared/feedback.js";
function createCombatFx() {
  let prevHp = /* @__PURE__ */ new Map();
  let prevCycles = null;
  let prevIntegrity = null;
  return {
    reset() {
      prevHp = /* @__PURE__ */ new Map();
      prevCycles = null;
      prevIntegrity = null;
    },
    // Diff the live state against the last frame. Returns { hitCells:Set<"x,y">, cyclesGained, integrityLost }.
    observe(state) {
      const hitCells = /* @__PURE__ */ new Set();
      const nextHp = /* @__PURE__ */ new Map();
      for (const e of state.enemies || []) {
        nextHp.set(e.id, e.hp);
        const was = prevHp.get(e.id);
        if (was != null && e.hp < was) hitCells.add(`${Math.round(e.x)},${Math.round(e.y)}`);
      }
      const cyclesGained = prevCycles == null ? 0 : Math.max(0, Number(state.cycles || 0) - prevCycles);
      const integrityLost = prevIntegrity != null && Number(state.integrity || 0) < prevIntegrity;
      prevHp = nextHp;
      prevCycles = Number(state.cycles || 0);
      prevIntegrity = Number(state.integrity || 0);
      return { hitCells, cyclesGained, integrityLost };
    }
  };
}
function playFx(deltas, refs) {
  if (!deltas || !refs) return;
  if (deltas.integrityLost) {
    flash(refs.board, "bad");
    shake(refs.bar);
  }
  if (deltas.cyclesGained > 0 && refs.floatHost) floatNum(refs.floatHost, `+${deltas.cyclesGained}`, "good");
}
function fxBanner(host, text) {
  return banner(host, text);
}

// ../../docs/games/metagame/stages/stage4/ui-combat.js
var PLACEABLE = [
  "pulse_node",
  "scatter_array",
  "null_spike",
  "attractor_field",
  "frost_lattice",
  "thermal_loop",
  "chain_resonator",
  "long_recursor",
  "glyph_mortar",
  "shatter_drill",
  "gravity_well",
  "resonance_hub",
  "cycle_extractor",
  "bank_node"
];
var PERSIST_THROTTLE_MS = 1e3;
var CALL_EARLY_BONUS = 20;
var SPEEDS = [1, 2, 3];
function mountCombat({ host, state, controller, mode = "map" }) {
  const isBoss = mode === "boss";
  const mapIndex = state.campaign?.mapIndex ?? 0;
  const map = mapByIndex(mapIndex);
  const disclosed = isBoss || combatDisclosed(state, mapIndex);
  const root = document.createElement("section");
  root.className = "stage4-combat";
  root.innerHTML = `
    <div class="s4-cmdbar">
      <div class="s4-cmd-hud">
        <strong>${isBoss ? "THE INFINITE LOOP" : `${map.glyph} ${map.name.toUpperCase()}`}</strong>
        <span class="s4-stat">CYCLES <b data-field="cycles"></b></span>
        <span class="s4-stat">INTEGRITY <b data-field="integrity"></b></span>
        <span class="s4-stat">${isBoss ? "POINTS" : "WAVE"} <b data-field="progress"></b></span>
      </div>
      <div class="s4-cmd-actions">
        ${isBoss ? "" : `
          <span class="s4-next" data-field="next"></span>
          <button type="button" data-action="start-wave">▶ start wave</button>
          <button type="button" data-action="call-early" hidden>call next (+${CALL_EARLY_BONUS})</button>
          <button type="button" data-action="speed">speed 1×</button>`}
        ${isBoss ? '<button type="button" data-action="confront">confront The Infinite Loop</button>' : ""}
        <button type="button" data-action="blueprint">recursion_points.json</button>
        <button type="button" data-action="leave" class="s4-leave">${isBoss ? "retreat" : "← maps"}</button>
      </div>
      <button type="button" class="s4-ticker" data-field="ticker" title="show full log"></button>
    </div>
    <ol class="s4-log-full" data-field="logfull" hidden></ol>
    <div class="s4-stage">
      <div class="s4-board-wrap">
        <pre class="s4-board" aria-label="fractal bastion board"></pre>
      </div>
      <section class="s4-panel">
        <div class="s4-hint" data-field="hint"></div>
        <div class="s4-shop" data-field="shop"></div>
        <div class="s4-roster" data-field="roster"></div>
      </section>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const board = root.querySelector(".s4-board");
  const boardWrap = root.querySelector(".s4-board-wrap");
  const cmdbar = root.querySelector(".s4-cmdbar");
  let selected = null;
  let selectedTowerId = null;
  let hoverCell = null;
  let pendingCell = null;
  let touchMode = false;
  let speed = 1;
  let raf = null;
  let lastPersistMs = -Infinity;
  let alive = true;
  const fx = createCombatFx();
  let lastHits = null;
  const pathSeed = isBoss ? state.recursion?.pointSetId || "x" : mapPathSeed(state.recursion?.pointSetId, mapIndex);
  let pathDepth = isBoss ? 3 : mapPathDepth(map.depth, state.waveNumber || 1);
  let path = buildPath(pathSeed, pathDepth);
  if (!Number.isFinite(state.wavePeak)) state.wavePeak = state.waveNumber || 1;
  if (disclosed && !state.campaign.disclosureSeen) {
    state.campaign.disclosureSeen = true;
    setTimeout(() => alive && fxBanner(boardWrap, "enemies now resist by type — check tower damage types"), 30);
  }
  function maybeReshape() {
    if (isBoss) return false;
    const want = mapPathDepth(map.depth, state.waveNumber || 1);
    if (want === pathDepth) return false;
    pathDepth = want;
    path = buildPath(pathSeed, pathDepth);
    const { count } = refundTowersOnPath(state, path.tiles);
    pushLog(state, `⟲ the recursion folds — the path reshapes to depth ${pathDepth}.` + (count ? ` ${count} tower(s) caught on the new route were refunded.` : ""));
    return true;
  }
  function checkpointWave(overrides) {
    controller.checkpointWave?.({ ...snapshotWave(state), ...overrides });
  }
  function endWaveSnapshot() {
    controller.endWaveSnapshot?.();
  }
  function currentOverlay() {
    const overlay = {};
    if (lastHits && lastHits.size) overlay.hits = lastHits;
    if (selectedTowerId) {
      const t = (state.towers || []).find((x) => x.id === selectedTowerId);
      if (t) overlay.rings = rangeRing(t.type, { x: t.x, y: t.y });
    } else if (selected && hoverCell) {
      const pv = placementPreview(state, path.tiles, selected, hoverCell);
      overlay.rings = pv.rings;
      overlay.foot = pv.foot;
      overlay.footValid = pv.valid;
    }
    return overlay;
  }
  function paintBoard() {
    if (alive) board.innerHTML = boardHTML(state, path.tiles, currentOverlay());
  }
  function repaint() {
    if (!alive) return;
    const lock = getBossLockState({ actions: controller.actions, state });
    fields.cycles.textContent = String(state.cycles);
    fields.integrity.textContent = `${state.integrity}/${state.maxIntegrity || state.integrity}`;
    fields.progress.textContent = isBoss ? `${lock.coveredPoints}/${lock.totalPoints}` : `${Math.min(state.waveNumber || 1, map.waveCount)}/${map.waveCount}`;
    fields.hint.textContent = isBoss ? lock.hint : state.waveActive ? "hold the line — call the next wave early for bonus cycles" : preWaveHint(mapIndex, state.waveNumber || 1);
    fields.shop.replaceChildren(...shopRows({ placeable: PLACEABLE, isBoss, mapIndex, selected, disclosed }));
    fields.roster.replaceChildren(...rosterRows(state, disclosed));
    if (!isBoss) {
      fields.next.textContent = state.waveActive ? "" : `next: ${wavePreviewLine(mapIndex, state.waveNumber || 1)}`;
      root.querySelector('[data-action="call-early"]').hidden = !state.waveActive || (state.wavePeak || 1) >= map.waveCount;
      root.querySelector('[data-action="start-wave"]').hidden = state.waveActive;
      root.querySelector('[data-action="speed"]').textContent = `speed ${speed}×`;
    }
    const lines = (state.log || []).slice(-2);
    fields.ticker.textContent = lines.join("  ·  ") || "the path repeats before it explains itself.";
    if (!fields.logfull.hidden) fields.logfull.replaceChildren(...(state.log || []).slice(-12).map((l) => li(l)));
    paintBoard();
    syncPopover();
  }
  function li(text) {
    const el = document.createElement("li");
    el.textContent = text;
    return el;
  }
  function syncPopover() {
    if (!selectedTowerId) return;
    const t = (state.towers || []).find((x) => x.id === selectedTowerId);
    if (!t) {
      selectedTowerId = null;
      closeTowerPopover();
      return;
    }
    if (popoverTowerId() === t.id) openTowerPopover({ root: boardWrap, state, tower: t, disclosed });
  }
  function startWaveAction() {
    if (isBoss || state.waveActive || (state.waveNumber || 1) > map.waveCount) return;
    maybeReshape();
    startWave(state, state.waveNumber, path.tiles);
    state.wavePeak = state.waveNumber;
    lastPersistMs = -Infinity;
    fx.reset();
    fxBanner(boardWrap, `WAVE ${state.waveNumber}/${map.waveCount}`);
    const sbId = subBossIdForWave(mapIndex, state.waveNumber || 1);
    if (sbId) {
      const d = subBossDef(sbId);
      if (d) setTimeout(() => alive && fxBanner(boardWrap, `⚠ ${d.name} — ${d.telegraph}`), 700);
    }
    checkpointWave();
    controller.persist?.();
    runLoop();
  }
  function callEarly() {
    if (isBoss || !state.waveActive || (state.wavePeak || 1) >= map.waveCount) return;
    state.wavePeak = (state.wavePeak || state.waveNumber) + 1;
    queueWave(state, state.wavePeak);
    state.cycles = (state.cycles || 0) + CALL_EARLY_BONUS;
    pushLog(state, `wave ${state.wavePeak} called early (+${CALL_EARLY_BONUS} cycles).`);
    checkpointWave();
    repaint();
  }
  function setSpeed(n) {
    speed = SPEEDS.includes(Number(n)) ? Number(n) : SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    repaint();
    return speed;
  }
  function runLoop() {
    stopLoop();
    let last = null;
    const stepFn = (ts) => {
      const dt = (last == null ? 16 : Math.min(100, ts - last)) * speed;
      last = ts;
      tick(state, dt, path.tiles);
      const deltas = fx.observe(state);
      lastHits = deltas.hitCells;
      playFx(deltas, { board, bar: cmdbar, floatHost: boardWrap });
      checkpointWave();
      if (settleWave()) {
        raf = null;
        return;
      }
      if ((state.combatClockMs || 0) - lastPersistMs >= PERSIST_THROTTLE_MS) {
        lastPersistMs = state.combatClockMs;
        controller.persist?.();
      }
      repaint();
      raf = requestAnimationFrame(stepFn);
    };
    raf = requestAnimationFrame(stepFn);
  }
  function stopLoop() {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  function settleWave() {
    if (state.waveFailed) {
      stopLoop();
      pushLog(state, "integrity collapsed — the bastion folds.");
      endWaveSnapshot();
      controller.onWaveFailed?.();
      repaint();
      controller.persist?.();
      return true;
    }
    if (waveComplete(state)) {
      const cleared = creditWaves();
      endWaveSnapshot();
      controller.persist?.();
      if (cleared) {
        stopLoop();
        controller.rerender();
        return true;
      }
      maybeReshape();
      lastHits = null;
      repaint();
      return true;
    }
    return false;
  }
  function creditWaves() {
    const target = Math.max(state.wavePeak || state.waveNumber, state.waveNumber);
    let cleared = false;
    while ((state.waveNumber || 1) <= target && !cleared) {
      const r = controller.recordWaveCleared();
      if (r.mapCleared) cleared = true;
    }
    if (!cleared) state.wavePeak = state.waveNumber;
    return cleared;
  }
  function confront() {
    if (!isBoss) return null;
    const result = fightInfiniteLoop({ state, actions: controller.actions });
    if (result.defeated) {
      controller.onBossWin();
      return result;
    }
    repaint();
    controller.persist?.();
    return result;
  }
  function place(x, y, type) {
    const r = placeTower(state, { x, y, type: type || selected });
    repaint();
    controller.persist?.();
    return r;
  }
  function cycleTarget(id) {
    const m = cycleTowerTarget(state, id);
    repaint();
    controller.persist?.();
    return m;
  }
  function upgrade(id) {
    const r = upgradeTower(state, id);
    repaint();
    controller.persist?.();
    return r;
  }
  function sell(id) {
    const r = sellTower(state, id);
    if (selectedTowerId === id) {
      selectedTowerId = null;
      closeTowerPopover();
    }
    repaint();
    controller.persist?.();
    return r;
  }
  function pickFork(id, forkId) {
    const r = chooseFork(state, id, forkId);
    repaint();
    controller.persist?.();
    return r;
  }
  function setWave(n) {
    state.waveNumber = Math.max(1, Math.trunc(n) || 1);
    state.wavePeak = state.waveNumber;
    repaint();
  }
  function boardTap(event, cell) {
    const onTower = (state.towers || []).find((t) => t.x === cell.x && t.y === cell.y);
    if (onTower) {
      selected = null;
      pendingCell = null;
      hoverCell = null;
      selectedTowerId = onTower.id;
      openTowerPopover({ root: boardWrap, anchor: pointerAnchor(event), state, tower: onTower, disclosed, onClose: () => {
        selectedTowerId = null;
        paintBoard();
      } });
      repaint();
      return;
    }
    selectedTowerId = null;
    closeTowerPopover();
    if (!selected) {
      hoverCell = cell;
      paintBoard();
      return;
    }
    const pv = placementPreview(state, path.tiles, selected, cell);
    if (touchMode && (!pendingCell || pendingCell.x !== cell.x || pendingCell.y !== cell.y)) {
      pendingCell = cell;
      hoverCell = cell;
      paintBoard();
      return;
    }
    pendingCell = null;
    if (!pv.valid) {
      hoverCell = cell;
      paintBoard();
      return;
    }
    place(cell.x, cell.y);
  }
  function pointerAnchor(event) {
    const r = board.getBoundingClientRect();
    return { left: event?.clientX ?? r.left, bottom: event?.clientY ?? r.top, top: event?.clientY ?? r.top };
  }
  root.addEventListener("pointerdown", (event) => {
    touchMode = event.pointerType === "touch";
  }, true);
  root.addEventListener("click", (event) => {
    const upBtn = event.target.closest("button[data-upgrade-id]");
    if (upBtn) {
      upgrade(upBtn.dataset.upgradeId);
      return;
    }
    const sellBtn = event.target.closest("button[data-sell-id]");
    if (sellBtn) {
      sell(sellBtn.dataset.sellId);
      return;
    }
    const forkBtn = event.target.closest("button[data-fork-id]");
    if (forkBtn) {
      pickFork(forkBtn.dataset.forkId, forkBtn.dataset.forkChoice);
      return;
    }
    const rosterBtn = event.target.closest("button[data-tower-id]");
    if (rosterBtn) {
      cycleTarget(rosterBtn.dataset.towerId);
      return;
    }
    const towerBtn = event.target.closest("button[data-tower]");
    if (towerBtn) {
      selected = selected === towerBtn.dataset.tower ? null : towerBtn.dataset.tower;
      selectedTowerId = null;
      pendingCell = null;
      closeTowerPopover();
      repaint();
      return;
    }
    if (event.target.closest(".s4-ticker")) {
      fields.logfull.hidden = !fields.logfull.hidden;
      repaint();
      return;
    }
    const cell = boardCell(event);
    if (cell) {
      boardTap(event, cell);
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "start-wave":
        startWaveAction();
        break;
      case "call-early":
        callEarly();
        break;
      case "speed":
        setSpeed();
        break;
      case "confront":
        confront();
        break;
      case "leave":
        stopLoop();
        closeTowerPopover();
        controller.leaveCombat?.();
        break;
      case "blueprint":
        controller.openBlueprint?.();
        break;
      default:
        break;
    }
  });
  board.addEventListener("mousemove", (event) => {
    if (touchMode || !selected || selectedTowerId) return;
    const cell = boardCell(event);
    if (cell && (!hoverCell || hoverCell.x !== cell.x || hoverCell.y !== cell.y)) {
      hoverCell = cell;
      paintBoard();
    }
  });
  board.addEventListener("mouseleave", () => {
    if (hoverCell) {
      hoverCell = null;
      paintBoard();
    }
  });
  function boardCell(event) {
    if (!event.target.closest(".s4-board")) return null;
    const lines = boardText(state, path.tiles).split("\n");
    const cols = (lines[0] || "").length || 40;
    const rows = lines.length || 40;
    const range = document.createRange();
    range.selectNodeContents(board);
    const textRect = range.getBoundingClientRect();
    return cellFromTextRect({ clientX: event.clientX, clientY: event.clientY, textRect, cols, rows });
  }
  if (!isBoss && state.waveActive && (state.waveNumber || 1) <= map.waveCount) runLoop();
  repaint();
  return {
    repaint,
    destroy() {
      alive = false;
      stopLoop();
      closeTowerPopover();
      root.remove();
    },
    hook: {
      advance(ms = 3e4, dt = 100) {
        let t = 0;
        while (t < ms && state.waveActive) {
          tick(state, dt * speed, path.tiles);
          lastHits = fx.observe(state).hitCells;
          checkpointWave();
          if (settleWave()) break;
          t += dt;
        }
        if (alive) repaint();
      },
      startWave: startWaveAction,
      callEarly,
      setSpeed,
      place,
      cycleTarget,
      upgrade,
      sell,
      pickFork,
      setWave,
      confront,
      reshape: maybeReshape,
      pathInfo: () => ({ depth: pathDepth, tiles: path.tiles })
    }
  };
}

// ../../docs/games/metagame/stages/stage4/ui-campaign.js
import { banner as banner2 } from "../../shared/feedback.js";
function renderMapSelect(host, controller) {
  const state = controller.state;
  const root = document.createElement("section");
  root.className = "stage4-mapselect";
  const won = state.campaign.status === "won" || state.boss?.defeated;
  const veteran = isVeteran(state) || won;
  function repaint() {
    const prog = campaignProgress(state);
    const bossReady = bossUnlocked(state);
    root.innerHTML = `
      <header class="s4-hud"><strong>FRACTAL BASTION${veteran ? " — CAMPAIGN" : ""}</strong>
        ${veteran ? `<span>GLORY ${state.campaign.glory}</span>` : ""}
        <span>MAPS ${prog.cleared}/${prog.total}</span>
      </header>
      <p class="s4-hint">${won ? "The Infinite Loop has stopped. The bastion holds." : veteran ? "Clear each map to unlock the next. The Infinite Loop opens only when all five are held." : "The recursion is leaking in. Hold the Outer Shell."}</p>
      <ol class="s4-maplist">
        ${MAPS.map((m, i) => mapRow(m, i)).join("")}
      </ol>
      <div class="s4-controls">
        <button type="button" data-action="boss" class="s4-boss-chip" ${bossReady ? "" : "disabled"}>${won ? "The Infinite Loop (cleared)" : bossReady ? "confront The Infinite Loop" : "The Infinite Loop — locked · clear all five maps"}</button>
        ${veteran && !won ? '<button type="button" data-action="armory">⚙ armory</button>' : ""}
        ${won ? '<button type="button" data-action="bts">open fractal_bastion.bts</button>' : ""}
      </div>`;
  }
  function mapRow(m, i) {
    const unlocked = mapUnlocked(state, i);
    const cleared = mapCleared(state, i);
    const status = cleared ? "CLEARED" : unlocked ? "OPEN" : "LOCKED";
    const primary = !veteran && unlocked && !cleared;
    const label = cleared ? "replay" : primary ? "▶ start" : "enter";
    return `<li class="s4-maprow ${cleared ? "is-cleared" : unlocked ? "is-open" : "is-locked"}">
      <span class="s4-mapglyph">${m.glyph}</span>
      <span class="s4-mapname">${m.name}</span>
      <span class="s4-mapwaves">${m.waveCount} waves</span>
      <span class="s4-maptheme">${m.theme}</span>
      <span class="s4-mapstatus">${status}</span>
      <button type="button" class="${primary ? "s4-primary" : ""}" data-select="${i}" ${unlocked ? "" : "disabled"}>${label}</button>
    </li>`;
  }
  root.addEventListener("click", (event) => {
    const sel = event.target.closest("button[data-select]");
    if (sel) {
      controller.selectMap(Number(sel.dataset.select));
      return;
    }
    const action = event.target.closest("button[data-action]");
    if (!action) return;
    if (action.dataset.action === "boss" && allMapsCleared(state)) controller.enterBoss();
    else if (action.dataset.action === "armory") controller.openArmory?.();
    else if (action.dataset.action === "bts") controller.openBts();
  });
  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() {
    root.remove();
  } };
}
function renderArmory(host, controller) {
  const state = controller.state;
  const root = document.createElement("section");
  root.className = "stage4-armory";
  const firstOpen = (state.campaign.clearedMaps || []).length === 1 && !state.campaign.armoryOpened;
  if (firstOpen) {
    state.campaign.armoryOpened = true;
    setTimeout(() => banner2(root, "Glory earned — the armory opens"), 30);
  }
  function repaint() {
    root.innerHTML = `
      <header class="s4-hud"><strong>⚙ THE ARMORY</strong><span>GLORY ${state.campaign.glory}</span></header>
      <p class="s4-hint">${firstOpen ? "You held the Outer Shell. " : ""}Spend Glory on permanent campaign upgrades, then advance.</p>
      <ol class="s4-armorylist">${ARMORY_UPGRADES.map((u) => armoryRow(u)).join("")}</ol>
      <div class="s4-controls"><button type="button" data-action="continue">continue →</button></div>`;
  }
  function armoryRow(u) {
    const lvl = armoryLevel(state.campaign, u.id);
    const cost = armoryCost(state.campaign, u.id);
    const maxed = lvl >= u.maxLevel;
    const afford = canBuyArmory(state.campaign, u.id);
    return `<li class="s4-armoryrow">
      <span class="s4-armoryname">${u.label} <em>Lv ${lvl}/${u.maxLevel}</em></span>
      <span class="s4-armorydesc">${u.desc}</span>
      <button type="button" data-buy="${u.id}" ${maxed || !afford ? "disabled" : ""}>${maxed ? "MAX" : `buy (${cost})`}</button>
    </li>`;
  }
  root.addEventListener("click", (event) => {
    const buy = event.target.closest("button[data-buy]");
    if (buy) {
      const r = controller.buyArmory(buy.dataset.buy);
      if (r?.ok) repaint();
      return;
    }
    if (event.target.closest('button[data-action="continue"]')) controller.leaveArmory();
  });
  repaint();
  host.replaceChildren(root);
  return { repaint, destroy() {
    root.remove();
  } };
}

// ../../docs/games/metagame/stages/stage4/s4dev.js
function devGiveGlory(state, amount = 500) {
  ensureCampaign(state);
  state.campaign.glory = (state.campaign.glory || 0) + amount;
  return { glory: state.campaign.glory };
}
function devSkipWave(state) {
  state.waveActive = false;
  state.waveFailed = false;
  state.enemies = [];
  state.spawnQueue = [];
  return recordWaveCleared(state);
}
function devSkipToBoss(state) {
  return seatAtBoss(state);
}
function devGodCore(state) {
  state.integrity = 99999;
  state.maxIntegrity = 99999;
  return { integrity: state.integrity };
}

// ../../docs/games/metagame/stages/stage4/renderer.js
function renderStage4(ctx) {
  const { host, state, actions, bts, viewer, save, onStageComplete, run } = ctx;
  ensureCampaign(state);
  ensureStyles();
  const root = document.createElement("section");
  root.className = "stage4-fractal-bastion";
  root.innerHTML = '<div class="s4-screen" data-screen></div>';
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");
  const completeOnce = once((result) => onStageComplete?.(result));
  let active2 = null;
  function persistNow() {
    run?.flush?.();
    save?.();
  }
  function checkpointWave(snap) {
    if (run?.checkpoint) run.checkpoint({ ...snap, runTag: run.seed });
  }
  function endWaveSnapshot() {
    checkpointWave({ ...snapshotWave(state), waveActive: false });
    run?.flush?.();
  }
  const controller = {
    state,
    actions,
    persist: persistNow,
    checkpointWave,
    endWaveSnapshot,
    openBlueprint() {
      viewer?.openFile?.(RECURSION_BLUEPRINT_PATH, { mime: "application/json", source: "stage4" });
    },
    openBts() {
      bts?.open?.(4);
    },
    selectMap(i) {
      const r = selectMap(state, i);
      if (r.ok) {
        persistNow();
        render();
      }
      return r;
    },
    recordWaveCleared() {
      const r = recordWaveCleared(state);
      save?.();
      return r;
    },
    leaveArmory() {
      leaveArmory(state);
      save?.();
      render();
    },
    openArmory() {
      ensureCampaign(state).status = "armory";
      persistNow();
      render();
    },
    leaveCombat() {
      ensureCampaign(state).status = "map-select";
      persistNow();
      render();
    },
    buyArmory(id) {
      const r = buyArmory(state.campaign, id);
      if (r.ok) {
        save?.();
        active2?.repaint?.();
      }
      return r;
    },
    enterBoss() {
      const r = enterBoss(state);
      if (r.ok) {
        run?.reset?.();
        persistNow();
        render();
      }
      return r;
    },
    onBossWin() {
      winCampaign(state);
      run?.reset?.();
      persistNow();
      render();
      completeOnce({ stage: 4, defeated: true, btsPath: BTS_PATH });
    },
    onWaveFailed() {
    },
    rerender() {
      render();
    },
    // debug-only (smoke); never a player affordance
    seatAtBoss() {
      seatAtBoss(state);
      persistNow();
      render();
    },
    debugClearMap() {
      debugClearMap(state);
      save?.();
      render();
    }
  };
  function destroyActive() {
    if (active2?.destroy) active2.destroy();
    active2 = null;
  }
  function render() {
    destroyActive();
    const status = state.campaign.status;
    if (status === "combat") active2 = mountCombat({ host: screen, state, controller, mode: "map" });
    else if (status === "boss") active2 = mountCombat({ host: screen, state, controller, mode: "boss" });
    else if (status === "armory") active2 = renderArmory(screen, controller);
    else active2 = renderMapSelect(screen, controller);
    refreshHook();
  }
  if (state.campaign.status === "combat" && run) {
    const snap = run.restore();
    if (snap && snap.runTag === run.seed && snap.waveActive && !state.boss?.defeated) restoreWave(state, snap);
  }
  function refreshHook() {
    window.__fvStage4 = {
      state: () => state,
      status: () => state.campaign.status,
      selectMap: (i) => controller.selectMap(i),
      startWave: () => active2?.hook?.startWave?.(),
      advance: (ms, dt) => active2?.hook?.advance?.(ms, dt),
      callEarly: () => active2?.hook?.callEarly?.(),
      setSpeed: (n) => active2?.hook?.setSpeed?.(n),
      place: (x, y, t) => active2?.hook?.place?.(x, y, t),
      setWave: (n) => active2?.hook?.setWave?.(n),
      cycleTarget: (id) => active2?.hook?.cycleTarget?.(id),
      upgrade: (id) => active2?.hook?.upgrade?.(id),
      pickFork: (id, forkId) => active2?.hook?.pickFork?.(id, forkId),
      confront: () => active2?.hook?.confront?.(),
      buyArmory: (id) => controller.buyArmory(id),
      leaveArmory: () => controller.leaveArmory(),
      enterBoss: () => controller.enterBoss(),
      seatAtBoss: () => controller.seatAtBoss(),
      debugClearMap: () => controller.debugClearMap(),
      bossUnlocked: () => bossUnlocked(state)
    };
  }
  function dev(id) {
    if (id === "give-glory") {
      devGiveGlory(state);
      persistNow();
      active2?.repaint?.();
      return;
    }
    if (id === "skip-wave") {
      devSkipWave(state);
      persistNow();
      render();
      return;
    }
    if (id === "skip-to-boss") {
      devSkipToBoss(state);
      persistNow();
      render();
      return;
    }
    if (id === "god-core") {
      devGodCore(state);
      persistNow();
      active2?.repaint?.();
      return;
    }
  }
  const onHide = () => {
    if (typeof document === "undefined" || document.visibilityState === "hidden") persistNow();
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onHide);
  if (typeof window !== "undefined") window.addEventListener("pagehide", persistNow);
  render();
  return {
    dev,
    repaint: () => active2?.repaint?.(),
    destroy() {
      destroyActive();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onHide);
      if (typeof window !== "undefined") window.removeEventListener("pagehide", persistNow);
      if (window.__fvStage4) delete window.__fvStage4;
      root.remove();
    }
  };
}
function ensureStyles() {
  injectSheet("stage4-fractal-bastion-styles", "./styles.css");
  injectSheet("stage4-fractal-bastion-board-styles", "./styles-board.css");
}
function injectSheet(id, rel) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL(rel, import.meta.url).href;
  document.head.append(link);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage4/index.js
import { createRun } from "../../shared/run-state.js";
var stageMeta = {
  id: 4,
  slug: "fractal-bastion",
  name: "Fractal Bastion",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "give-glory", label: "+500 Glory" },
    { id: "skip-wave", label: "Skip Wave" },
    { id: "skip-to-boss", label: "Skip to Boss" },
    { id: "god-core", label: "God Core (∞ integrity)" }
  ]
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles2();
  if (hasRecursionBlueprint(ctx.actions)) state.log = [...state.log, "recursion blueprint already read."].slice(-8);
  const saveData = ctx.orchestrator?.save;
  const run = saveData ? createRun({ save: saveData, stageId: 4, slot: "runwave", debounceMs: 0 }) : null;
  const view = renderStage4({ ...ctx, state, run });
  return {
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
    repaint: view.repaint,
    destroy() {
      if (run && typeof run.destroy === "function") run.destroy();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function ensureStyles2() {
  injectSheet2("stage4-fractal-bastion-styles", "./styles.css");
  injectSheet2("stage4-fractal-bastion-board-styles", "./styles-board.css");
}
function injectSheet2(id, rel) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL(rel, import.meta.url).href;
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
