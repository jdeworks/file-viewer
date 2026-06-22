// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage1/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage1/index.js
import { stageByNumber } from "../../stages.js";

// ../../docs/games/metagame/stages/stage1/renderer.js
import { renderStage1, STAGE1 } from "../../stage1.js";

// ../../docs/games/metagame/stages/stage1/boss.js
import { mountDefragmenter } from "../../boss1.js";
function hasCheatDisabledAction(ctx = {}) {
  const actions = ctx.actions;
  if (!actions || typeof actions.hasAction !== "function") return false;
  return Boolean(actions.hasAction(1, "cheat_disabled"));
}
function mountStage1Boss(arena, ctx = {}) {
  const saveStage = () => {
    if (typeof ctx.save === "function") ctx.save();
  };
  const ctl = mountDefragmenter(arena, {
    stage: ctx.stageConfig,
    state: ctx.state,
    save: saveStage,
    actions: ctx.actions,
    onDefeat: () => {
      if (typeof ctx.onStageComplete === "function") {
        ctx.onStageComplete({ stage: 1, defeated: true });
      }
    },
    onRetreat: ctx.onRetreat
  });
  return {
    destroy() {
      if (ctl && typeof ctl.destroy === "function") ctl.destroy();
    }
  };
}

// ../../docs/games/metagame/stages/stage1/state.js
import { fromNumber, fromStore } from "../../bignum.js";
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
    tabsUnlocked: false
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
import { MESSAGES1 } from "../../messages1.js";
var stageMessages = MESSAGES1;
var actionMessages = {
  cheatDisabled: {
    id: "stage1.cheat_disabled",
    text: "the unfair routine has been removed."
  }
};
function announceCheatDisabled(ctx = {}) {
  const bell = ctx.bell;
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
import { ACHIEVEMENTS1 } from "../../achievements1.js";
var stageAchievements = ACHIEVEMENTS1;
var viewerToolAchievement = {
  id: "stage1.cheat_disabled",
  legacyId: "ach-boss-cheat-found",
  stage: 1,
  name: "protection disabled."
};
function grantCheatDisabledAchievement(ctx = {}) {
  const api = ctx.achievements;
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
  requiredFile: "docs/examples/Overwriter.frag"
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx = {}) {
  const host = ctx.host;
  if (!host) throw new Error("Stage 1 mount requires a host element.");
  const state = normalizeState(ctx.state || defaultState2(ctx), ctx);
  const stageConfig = ctx.stageConfig || stageByNumber(1);
  let bossCtl = null;
  let s1ctl = null;
  let destroyed = false;
  const save = () => {
    if (typeof ctx.save === "function") ctx.save();
  };
  const render = () => {
    if (destroyed) return;
    if (bossCtl && typeof bossCtl.destroy === "function") bossCtl.destroy();
    bossCtl = null;
    s1ctl = renderStage1({
      host,
      state,
      save,
      bell: ctx.bell,
      sfxEnabled: ctx.sfxEnabled,
      stage: () => stageConfig,
      onExit: ctx.onExit,
      onBoss: () => {
        s1ctl = null;
        host.innerHTML = '<div class="mg-wrap mg-stage1-boss-host"></div>';
        const arena = host.querySelector(".mg-stage1-boss-host");
        bossCtl = mountStage1Boss(arena, {
          ...ctx,
          state,
          save,
          stageConfig,
          onRetreat: render
        });
      },
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
