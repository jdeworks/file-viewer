// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage3/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage3/messages.js
var ACTION_NAME = "diff_key_restored";
var REQUIRED_ACTION = "3.diff_key_restored";
var ACHIEVEMENT_ID = "stage3.diff_key_restored";
var ACHIEVEMENT_TEXT = "I found the difference.";
var BTS_PATH = "/docs/bts/memory_grid.bts";
var MEMORY_V1_PATH = "/docs/examples/metagame/stage3/memory_v1.log";
var MEMORY_V2_PATH = "/docs/examples/metagame/stage3/memory_v2.log";
var bellMessages = {
  start: "a memory is not a file until it survives being changed.",
  unlock: "the difference restored the missing key.",
  defeated: "the leak stopped widening."
};
var lockedHintLadder = [
  "the grid remembers less every time you ask it.",
  "two memory logs disagree. the disagreement matters.",
  "compare memory_v1.log and memory_v2.log. read the changed hunks in order.",
  "enter the restoration key formed by the diff pieces before fighting The Memory Leak."
];

// ../../docs/games/metagame/stages/stage3/content.js
function memoryV1Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v1`,
    "sector 01: retained visual boundary",
    "sector 02: restoration chunk <sec",
    "sector 03: child process @ still moving",
    "sector 04: restoration chunk ret",
    "sector 05: registers stable",
    "sector 06: restoration chunk key>",
    "sector 07: leak not yet visible"
  ].join("\n");
}
function memoryV2Text(state) {
  const id = state.memoryPair.runId;
  return [
    `MEMORY SNAPSHOT ${id} / v2`,
    "sector 01: retained visual boundary",
    "sector 02: restoration chunk [missing]",
    "sector 03: child process @ still moving",
    "sector 04: restoration chunk [missing]",
    "sector 05: registers unstable",
    "sector 06: restoration chunk [missing]",
    "sector 07: leak expanding"
  ].join("\n");
}
function diffKeyFromState(state) {
  return state.memoryPair.pieces.join("");
}

// ../../docs/games/metagame/stages/stage3/boss.js
function hasDiffKeyRestored(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(3, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasDiffKeyRestored(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    corruptionRate: unlocked ? "normal" : "accelerated",
    columnClues: unlocked ? "restored" : "missing",
    defeatPossible: unlocked,
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function tryRestoreDiffKey({ state, actions, achievements, bell, input }) {
  const expected = diffKeyFromState(state);
  const normalized = String(input || "").trim();
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (normalized !== expected) {
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    pushLog(state, "wrong restoration key. the leak keeps the columns hidden.");
    return { ok: false, expected };
  }
  state.boss.unlocked = true;
  actions?.setAction?.(3, ACTION_NAME, {
    source: "stage-boss",
    files: ["memory_v1.log", "memory_v2.log"],
    diffActionSeen: true,
    keyId: state.memoryPair.runId
  });
  achievements?.unlockAchievement?.(ACHIEVEMENT_ID, {
    stage: 3,
    title: ACHIEVEMENT_TEXT,
    detail: { keyId: state.memoryPair.runId }
  });
  bell?.showBell?.("stage3.diff_key_restored", bellMessages.unlock, { stage: 3 });
  pushLog(state, bellMessages.unlock);
  return { ok: true, expected };
}
function defeatMemoryLeak(state) {
  if (!state.boss.unlocked || state.boss.defeated) return false;
  state.boss.defeated = true;
  state.registers += 120;
  state.retained = Math.max(state.retained, 1);
  pushLog(state, bellMessages.defeated);
  return true;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage3/renderer.js
function renderStage3(ctx) {
  const { host, state, actions, achievements, bell, bts, viewer, save, onStageComplete } = ctx;
  const root = document.createElement("section");
  root.className = "stage3-memory-grid";
  root.innerHTML = `
    <header class="s3-hud">
      <strong>MEMORY GRID</strong>
      <span>REGISTERS <span data-field="registers"></span></span>
      <span>RETAINED <span data-field="retained"></span>/8</span>
      <span>KEY ID <span data-field="keyId"></span></span>
    </header>
    <div class="s3-layout">
      <aside class="s3-library"></aside>
      <main>
        <pre class="s3-grid" aria-label="memory nonogram preview"></pre>
        <section class="s3-boss">
          <div class="s3-boss-title">THE MEMORY LEAK</div>
          <div data-field="bossStatus"></div>
          <div class="s3-hint" data-field="hint"></div>
          <label class="s3-key-label">restoration key <input class="s3-key" spellcheck="false"></label>
        </section>
      </main>
    </div>
    <ol class="s3-log"></ol>
    <div class="s3-controls">
      <button type="button" data-action="v1">open memory_v1.log</button>
      <button type="button" data-action="v2">open memory_v2.log</button>
      <button type="button" data-action="restore">restore key</button>
      <button type="button" data-action="boss">solve leak</button>
      <button type="button" data-action="bts" hidden>open memory_grid.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s3-log");
  const keyInput = root.querySelector(".s3-key");
  const completeOnce = once((result) => onStageComplete?.(result));
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.registers.textContent = String(state.registers);
    fields.retained.textContent = String(state.retained);
    fields.keyId.textContent = state.memoryPair.runId;
    fields.bossStatus.textContent = `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / columns ${lock.columnClues} / corruption ${lock.corruptionRate}`;
    fields.hint.textContent = lock.hint;
    root.querySelector(".s3-grid").textContent = memoryGrid(lock.unlocked);
    root.querySelector(".s3-library").innerHTML = fragmentLibrary(state);
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
    if (button.dataset.action === "v1") viewer?.openFile?.(MEMORY_V1_PATH, { text: memoryV1Text(state), source: "stage3" });
    if (button.dataset.action === "v2") viewer?.openFile?.(MEMORY_V2_PATH, { text: memoryV2Text(state), source: "stage3" });
    if (button.dataset.action === "restore") tryRestoreDiffKey({ state, actions, achievements, bell, input: keyInput.value });
    if (button.dataset.action === "boss" && defeatMemoryLeak(state)) {
      completeOnce({ stage: 3, defeated: true, btsPath: BTS_PATH });
    }
    if (button.dataset.action === "bts") bts?.open?.(3);
    save?.();
    repaint();
  });
  repaint();
  return { repaint, destroy() {
    root.remove();
  } };
}
function memoryGrid(unlocked) {
  const cols = unlocked ? "2 1 3 1 2" : "? ? ? ? ?";
  return [
    `columns: ${cols}`,
    "rows:    1 3 1 3 1",
    "",
    unlocked ? ". # . # ." : ". ? . ? .",
    unlocked ? "# # # . ." : "? ? ? . .",
    unlocked ? ". # . . #" : ". ? . . ?",
    unlocked ? ". . # # #" : ". . ? ? ?",
    unlocked ? "# . . # ." : "? . . ? ."
  ].join("\n");
}
function fragmentLibrary(state) {
  const retained = Number(state.retained || 0);
  return Array.from({ length: 4 }, (_, i) => {
    const active = i < retained;
    return `<div class="s3-fragment${active ? " retained" : ""}">fragment ${i + 1}: ${active ? "retained" : "unstable"}</div>`;
  }).join("");
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage3/state.js
var DEFAULT_PIECES = ["<sec", "ret", "key>"];
function defaultState(context = {}) {
  const seed = String(context.seed || context.now || Date.now()).replace(/\D/g, "").slice(-4) || "2470";
  return {
    version: 1,
    registers: 0,
    retained: 0,
    solvedFragments: [],
    memoryPair: {
      runId: `mem-${seed}`,
      pieces: [...DEFAULT_PIECES],
      key: DEFAULT_PIECES.join("")
    },
    boss: {
      reached: false,
      attempts: 0,
      lockHintStep: 0,
      unlocked: false,
      defeated: false
    },
    log: ["memory grid mounted.", "columns missing from current log."]
  };
}
function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === "object" ? state : {};
  target.version = 1;
  target.registers = Number.isFinite(target.registers) ? target.registers : fresh.registers;
  target.retained = Number.isFinite(target.retained) ? target.retained : fresh.retained;
  target.solvedFragments = Array.isArray(target.solvedFragments) ? target.solvedFragments : [];
  target.memoryPair = mergePlain(fresh.memoryPair, target.memoryPair);
  target.memoryPair.pieces = Array.isArray(target.memoryPair.pieces) && target.memoryPair.pieces.length ? target.memoryPair.pieces.map(String) : [...fresh.memoryPair.pieces];
  target.memoryPair.key = String(target.memoryPair.key || target.memoryPair.pieces.join(""));
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage3/index.js
var stageMeta = {
  id: 3,
  slug: "memory-grid",
  name: "Memory Grid",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state, ctx);
  ensureStyles();
  if (hasDiffKeyRestored(ctx.actions)) state.boss.unlocked = true;
  return renderStage3({ ...ctx, state });
}
function ensureStyles() {
  const id = "stage3-memory-grid-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  defaultState2 as defaultState,
  defeatMemoryLeak,
  getBossLockState,
  mountStage,
  stageMeta,
  tryRestoreDiffKey
};
