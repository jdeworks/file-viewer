// renderer.js — Stage 6 Protocol Codex controller: routes between the hub and the act-map run
// (combat / reward / rest / shop / event). Owns the transient combat instance (never persisted —
// a reload re-instantiates from the run's node). The act-4 boss, The Refused Connection, is fought
// with the player's REAL deck (boss-combat.js wires the negotiation as an acceptance hook); the
// stage-clear gate is unchanged: read the codex (epub) — without it every Signal deals 0 — then
// defeat the boss with the deck built across acts 1–3.

import { createCombat, playCard, endTurn, makeRng, applyPotionEffect, strHash, congestionForAct } from "./combat.js";
import { cardById } from "./cards.js";
import { instantiateEnemy } from "./enemies.js";
import { relicsFor } from "./relics.js";
import { potionById } from "./potions.js";
import { eventForNode, applyEventChoice } from "./events.js";
import { nodeById } from "./mapgen.js";
import {
  createRun, moveTo, enemyForCurrentNode, resolveCombat,
  takeReward, takePotion, usePotion, buyPotion, takeBossRelic, rest, removeCard, closeNode,
  buyCard, buyRemoval, buyUpgrade, buyRelic,
  prestigeCost, FINAL_BOSS_ACT, seatAtFinalBoss, runScore
} from "./run.js";
import { applyProtocolChapter9Unlock, getBossLockState } from "./boss.js";
import { wireBossCombat, autoNegotiate as runAutoNegotiate } from "./boss-combat.js";
import { SUPERBOSS_ID, wireSuperboss } from "./superboss.js";
import { installStage6TestHook, removeStage6TestHook } from "./testhook.js";
import { snapshotCombat, restoreCombat } from "./combat-persist.js";
import { createRun as createRunState } from "../../shared/run-state.js";
import { createAscension } from "../../shared/ascension.js";
import { ASCENSION_MODS } from "./ascension-mods.js";
import { combatView } from "./ui-combat.js";
import { applyCombatFx } from "./combat-fx.js";
import { openPileModal, openLogModal } from "./combat-modals.js";
import { hubView, mapView, deathView, wonView } from "./ui-map.js";
import { rewardView, restView, shopView, eventView, bossRewardView } from "./ui-rewards.js";
import { ACTION_NAME, BTS_PATH, EPUB_PATH } from "./messages.js";
import { applyDev, devSkipToBoss } from "./s6dev.js";

const REFUSED_CONNECTION = "the-refused-connection";

export function renderStage6({ host, state, actions, achievements, bell, bts, viewer, save, orchestrator, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage6-protocol-codex";
  root.innerHTML = `
    <header class="s6db-top"><strong>PROTOCOL CODEX</strong></header>
    <div class="s6db-screen" data-screen></div>`;
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");

  // Combat persistence (kills the reload-retry exploit): the active fight is checkpointed into the
  // run-state 'combat' slot (stageState[6].combat — a distinct slot from stage6's own state.run) so a
  // reload RESUMES the same mid-fight state instead of re-rolling a fresh encounter. debounceMs:0 so
  // every checkpoint is flushed into the save object before commit()'s save() serializes it.
  const combatRun = orchestrator?.save
    ? createRunState({ save: orchestrator.save, stageId: 6, slot: "combat", debounceMs: 0 })
    : null;

  // Ascension ladder STATE (selected level + cleared high-water mark) owned by the shared module; its
  // CONTENT (the 15 rules) lives in ascension-mods.js and is applied inside createRun. Persisted at
  // save.stageState[6].ascension + the global summary (save.global.maxAscension / ascensionCleared).
  const ascension = orchestrator?.save
    ? createAscension({ save: orchestrator.save, stageId: 6, modifiers: ASCENSION_MODS })
    : null;
  const ascInfo = () => ascension
    ? { level: ascension.level(), maxUnlocked: ascension.maxUnlocked(), maxCleared: ascension.maxCleared(), maxLevel: ascension.maxLevel, floor: state.meta.protocolVersion || 0 }
    : null;

  let combat = null; // live engine instance; its full state is checkpointed into combatRun
  // Combat VIEW-state (never persisted, never engine state): the inspected hand card (stage6 #2) and
  // the one-shot feedback descriptor applied after the next combat re-mount (stage6 #4, combat-fx.js).
  let pendingCardIndex = null;
  let pendingFx = null;
  // Daily-seed clock: read ONCE per run at creation (a SEED, never consulted inside the combat loop,
  // so it honors the no-live-entropy rule). Overridable for deterministic tests via the test hook.
  let dailyKeyOverride = null;
  const completeOnce = once((result) => { if (typeof onStageComplete === "function") onStageComplete(result); });
  const lockState = () => getBossLockState({ actions, state });
  const mount = (node) => screen.replaceChildren(node);
  const commit = () => { if (typeof save === "function") save(); route(); };

  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKey);
  route();

  // TEST/DEBUG hook (not a player affordance, not a hub button). It only fast-forwards position +
  // replays correct play through the REAL engine — it never bypasses the ch9 un-cheat. Extracted to
  // testhook.js; it closes over the mutable `combat` via accessors.
  installStage6TestHook({
    state, combatRun, runScore, seatAtFinalBoss, runAutoNegotiate,
    playCard, endTurn, cardById, beginRun, commit, makeCombat, finishCombat,
    getCombat: () => combat, setCombat: (c) => { combat = c; },
    setDailyKeyOverride: (v) => { dailyKeyOverride = v; }
  });

  return {
    repaint: route,
    // Dev-menu cheats (see index.js stageMeta.devControls; wired by metagame.js → mounted.dev(id)).
    // skip-boss is dispatched inline here because it must null the live combat + reset combatRun.
    // energy mutates the transient combat.player only and is NOT persisted.
    dev(id) {
      if (id === "skip-boss") {
        if (!state.run) beginRun();
        devSkipToBoss(state.run);
        state.ui.screen = "run";
        combat = null;
        if (combatRun) combatRun.reset();
      } else {
        applyDev(id, state.run, combat?.player ?? null);
      }
      if (typeof save === "function") save();
      route();
    },
    destroy() { if (combatRun) combatRun.destroy(); removeStage6TestHook(); root.remove(); }
  };

  // ── routing ──────────────────────────────────────────────────────────────────────────────────
  function route() {
    const run = state.run;
    // The Refused Connection is reachable ONLY as the act-4 boss node of a run (see the
    // run.status === "boss" case below) — there is no standalone hub-reachable boss screen.
    if (state.ui.screen !== "run" || !run) { combat = null; return mount(hubView(state, lockState(), ascInfo())); }
    switch (run.status) {
      // Every boss — including the act-6 finale and the key-gated superboss — is a real-deck fight.
      case "combat": case "boss": case "superboss": return mountCombat(run);
      case "reward": combat = null; return mount(rewardView(run));
      case "boss-reward": combat = null; return mount(bossRewardView(run));
      case "rest": combat = null; return mount(restView(run));
      case "shop": combat = null; return mount(shopView(run));
      case "event": combat = null; return mount(eventView(run, eventForNode(run)));
      case "dead": combat = null; return mount(deathView(state, run));
      case "won": combat = null; return mount(wonView(state, run));
      case "map":
      default: combat = null; return mount(mapView(run));
    }
  }

  function mountCombat(run) {
    if (!combat || combat.nodeId !== run.currentNodeId) combat = loadOrMakeCombat(run);
    if (combat.over) { finishCombat(run); return route(); }
    const node = combatView(combat, run, { pendingCardIndex });
    mount(node);
    // Feedback (stage6 #4) is spawned AFTER mount so it attaches to the fresh DOM. One-shot.
    if (pendingFx) { applyCombatFx(node, pendingFx); pendingFx = null; }
  }

  // Play the inspected/selected hand card through the engine, capturing feedback deltas + the played
  // card's on-screen rect (for the fly animation) BEFORE the rebuild. `sourceEl` is the on-screen card
  // node the play flew from. Returns false (no-op) if the card is unaffordable or combat is over.
  function doPlay(idx, sourceEl) {
    if (!combat || combat.over) return false;
    const card = cardById(combat.hand[idx]);
    if (!card || card.cost > combat.player.energy) return false;
    const enemyBefore = combat.enemy.hp;
    const blockBefore = combat.player.block;
    const rect = sourceEl ? sourceEl.getBoundingClientRect() : null;
    const faceHTML = sourceEl ? sourceEl.innerHTML : "";
    playCard(combat, idx);
    pendingCardIndex = null;
    pendingFx = {
      enemyDamage: Math.max(0, enemyBefore - combat.enemy.hp),
      blockGain: Math.max(0, combat.player.block - blockBefore),
      fly: rect ? { rect, faceHTML } : null
    };
    if (combat.over) finishCombat(state.run); else checkpointCombat(combat, state.run);
    return true;
  }

  // Keyboard: 1–9 selects/inspects a hand card; Enter plays the inspected card; Esc cancels (stage6 #1/#2).
  function handleKey(event) {
    if (!combat || combat.over || state.ui.screen !== "run") return;
    if (event.key >= "1" && event.key <= "9") {
      const idx = Number(event.key) - 1;
      if (idx < combat.hand.length) { pendingCardIndex = idx; route(); event.preventDefault(); }
    } else if (event.key === "Enter" && pendingCardIndex != null) {
      const src = root.querySelector(".s6db-inspect .s6db-card");
      if (doPlay(pendingCardIndex, src)) { event.preventDefault(); commit(); }
    } else if (event.key === "Escape" && pendingCardIndex != null) {
      pendingCardIndex = null; route(); event.preventDefault();
    }
  }

  // Resume the persisted fight for this exact node/run if one was checkpointed; otherwise create a
  // fresh combat and checkpoint its opening state. The runSeed+nodeId guard prevents a stale snapshot
  // from a previous run (node ids repeat across runs) being resumed into a different run.
  function loadOrMakeCombat(run) {
    const snap = combatRun?.restore();
    if (snap && !snap.over && snap.runSeed === run.seed && snap.nodeId === run.currentNodeId) {
      const c = restoreCombat(snap, { relics: relicsFor(run.relics) });
      c.nodeId = run.currentNodeId;
      return c;
    }
    const c = makeCombat(run);
    checkpointCombat(c, run);
    return c;
  }

  // Persist the live fight after a meaningful action (play card / end turn). Tagged with the run seed
  // so resume only matches the same run.
  function checkpointCombat(c, run) {
    if (!combatRun || !c) return;
    combatRun.checkpoint({ ...snapshotCombat(c), runSeed: run.seed });
  }

  // ── combat lifecycle ─────────────────────────────────────────────────────────────────────────
  function makeCombat(run) {
    const enemyId = enemyForCurrentNode(run, makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`)));
    const enemy = instantiateEnemy(enemyId, run.act);
    // Ascension modifiers: scale non-boss enemies (the boss's HP is set by wireBossCombat below).
    if (enemy.tier !== "boss") {
      if (run.enemyHpMult && run.enemyHpMult !== 1) enemy.hp = Math.round(enemy.hp * run.enemyHpMult);
      if (run.enemyArmorBonus) enemy.armor = Number(enemy.armor || 0) + run.enemyArmorBonus;
    }
    // Ascension modifier: meaner/brutal elites carry extra HP.
    if (enemy.tier === "elite" && run.eliteHpBonus) enemy.hp += run.eliteHpBonus;
    const c = createCombat({
      deck: run.deck,
      player: { hp: run.hp, maxHp: run.maxHp },
      enemy,
      seed: strHash(`${run.seed}:${run.currentNodeId}:combat`),
      relics: relicsFor(run.relics),
      congestion: congestionForAct(run.act), // THROUGHPUT: window opens in act 3 and persists for acts 3-6 (carry verbs forward)
      windowCap: 5 + (run.windowCapMod || 0) // prestige tight-window modifier
    });
    c.nodeId = run.currentNodeId;
    // The act-4 finale: layer the negotiation onto the real fight. ch9 unread ⇒ locked ⇒ every
    // Signal deals 0 (the load-bearing un-cheat); reading the codex rebuilds this combat unlocked.
    if (enemyId === REFUSED_CONNECTION) wireBossCombat(c, { locked: !lockState().unlocked, hpMult: run.bossHpMult || 1, extraPhase: Boolean(run.bossExtraPhase) });
    // The key-gated superboss: a multi-phase real-deck fight (no lock, no un-cheat — pure bonus).
    else if (enemyId === SUPERBOSS_ID) wireSuperboss(c);
    return c;
  }

  function finishCombat(run) {
    // The key-gated superboss resolves on its own path (it has no map node).
    if (run.status === "superboss" || run.atSuperboss) return finishSuperboss(run);
    const win = combat.result === "win";
    const node = nodeById(run.map, run.currentNodeId);
    const isFinalBoss = node?.type === "boss" && run.act >= FINAL_BOSS_ACT;
    // A resolved fight must NOT resume on reload: clear the checkpoint slot (also bumps runs[6]).
    if (combatRun) combatRun.reset();
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    if (!win) state.meta.banked = (state.meta.banked || 0) + Math.floor((run.handshakes || 0) * 0.5);
    combat = null;
    pendingCardIndex = null; // combat over — drop any raised card / pending feedback so it can't leak
    pendingFx = null;
    if (win && isFinalBoss) finalBossDefeated(run);
    // A run that just resolved (death, or the final-boss win) banks its self-competition score.
    if (run.status === "dead" || run.status === "won") recordScore(run);
  }

  // The act-6 boss fell to the real deck: mark the codex gate answered. With all 3 keys the run
  // diverts to the hidden superboss FIRST — stage completion is deferred to finishSuperboss (which
  // completes the stage on win OR loss, so the superboss is never a progression trap — the gate was
  // the negotiation, already passed here).
  function finalBossDefeated(run) {
    state.boss.defeated = true;
    state.boss.reached = true;
    state.meta.firstClearComplete = true;
    state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
    // Record the ascension clear at the rule level this run actually played under (unlocks the next rung).
    if (ascension) ascension.recordClear(run.ascension || 0);
    state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    if (run.status === "superboss") return; // defer completion until the true-ending fight resolves
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }

  // Resolve the key-gated superboss (true ending). The negotiation gate was already satisfied, so
  // the stage completes either way; a win additionally flags the true ending. Pure bonus combat.
  function finishSuperboss(run) {
    const win = combat.result === "win";
    if (combatRun) combatRun.reset();
    run.hp = Math.max(0, combat.player.hp);
    combat = null;
    run.atSuperboss = false;
    run.superbossCleared = true;
    if (win && run.hp > 0) { run.status = "won"; run.trueEnding = true; }
    else run.status = "dead"; // fell to the kernel — but the connection had already accepted you
    recordScore(run);
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }

  function doPrestige() {
    const cost = prestigeCost(state.meta.protocolVersion || 0);
    if ((state.meta.banked || 0) < cost) return;
    state.meta.banked -= cost;
    state.meta.protocolVersion = (state.meta.protocolVersion || 0) + 1;
  }

  // ── run lifecycle ────────────────────────────────────────────────────────────────────────────
  function beginRun({ mode = "standard", seedText = null } = {}) {
    state.meta.runsStarted = (state.meta.runsStarted || 0) + 1;
    let seed, dailyKey = null;
    if (mode === "daily") {
      dailyKey = currentDailyKey();
      seed = strHash(`daily:${dailyKey}`); // deterministic from the date — same day = same run
    } else if (mode === "custom" && String(seedText || "").trim()) {
      dailyKey = String(seedText).trim().slice(0, 40);
      seed = strHash(`custom:${dailyKey}`); // deterministic from the typed seed
    } else {
      mode = "standard";
      seed = 1000 + state.meta.runsStarted * 7919 + (state.meta.protocolVersion || 0) * 131;
    }
    state.run = createRun({
      seed,
      version: state.meta.protocolVersion || 0,
      handshakes: 0,
      ascension: ascension ? ascension.level() : 0,
      mode,
      dailyKey
    });
    state.ui.screen = "run";
    if (combatRun) combatRun.reset(); // drop any stale combat snapshot from a previous run
    combat = null;
    pendingCardIndex = null;
    pendingFx = null;
  }

  // The daily seed key (YYYY-MM-DD). Read ONCE at run creation (a seed, not loop entropy); tests may
  // pin it via window.__fvStage6.setDailyKey to keep the seeded run reproducible.
  function currentDailyKey() {
    if (dailyKeyOverride) return dailyKeyOverride;
    try { return new Date().toISOString().slice(0, 10); } catch { return "1970-01-01"; }
  }

  // Record a finished run's self-competition score into meta (all-time best + per-seed best). Local
  // only; no off-origin. Called when a run resolves to dead/won.
  function recordScore(run) {
    if (!run) return;
    const score = runScore(run);
    state.meta.lastScore = score;
    state.meta.lastMode = run.mode || "standard";
    state.meta.lastSeedKey = run.dailyKey || null;
    if (score > (state.meta.bestScore || 0)) state.meta.bestScore = score;
    if (run.dailyKey) {
      if (!state.meta.dailyBest || typeof state.meta.dailyBest !== "object") state.meta.dailyBest = {};
      if (score > (state.meta.dailyBest[run.dailyKey] || 0)) state.meta.dailyBest[run.dailyKey] = score;
    }
  }

  // Resolve the player's choice for this node's (deterministically selected) event, then return to
  // the map. The notice is surfaced on the next screen.
  function resolveEvent(run, choiceId) {
    const event = eventForNode(run);
    const { notice } = applyEventChoice(run, event.id, choiceId);
    closeNode(run);
    if (notice) run.notice = notice;
  }

  // ── click delegation ─────────────────────────────────────────────────────────────────────────
  function handleClick(event) {
    const run = state.run;
    // Inspect cancel (stage6 #2): a click anywhere that is NOT a hand card or the PLAY button, while a
    // card is raised, drops the inspect. Deferred (cancelled) so a click that ALSO triggers another
    // action (e.g. end turn) still runs; a bare cancel re-renders at the end.
    let cancelled = false;
    if (pendingCardIndex != null && !event.target.closest("[data-inspect],[data-play]")) {
      pendingCardIndex = null; cancelled = true;
    }
    // Raise a hand card to the inspect close-up (view-state only — no save, no engine mutation).
    const inspect = event.target.closest("[data-inspect]");
    if (inspect && combat && !combat.over) {
      const i = Number(inspect.dataset.inspect);
      pendingCardIndex = pendingCardIndex === i ? null : i;
      return route();
    }
    // Pile / log modals (transient; no save).
    const pile = event.target.closest("[data-pile]");
    if (pile && combat) return openPileModal(combat, pile.dataset.pile);
    if (event.target.closest("[data-log]") && combat) return openLogModal(combat);

    if (handleTarget(event, run)) return commit();
    const btn = event.target.closest("button[data-action]");
    if (btn && runAction(btn.dataset.action, run)) return commit();
    if (cancelled) route();
  }

  function handleTarget(event, run) {
    const play = event.target.closest("[data-play]");
    if (play && combat && !combat.over) { doPlay(Number(play.dataset.play), root.querySelector(".s6db-inspect .s6db-card")); return true; }
    // Hub ascension picker (no run yet): choose the difficulty rung for the next run.
    const ascBtn = event.target.closest("[data-ascension]");
    if (ascBtn) { if (ascension) ascension.setLevel(Number(ascBtn.dataset.ascension)); return true; }
    const potion = event.target.closest("[data-potion]");
    if (potion && combat && !combat.over && run) {
      const used = usePotion(run, Number(potion.dataset.potion));
      if (used.ok) { applyPotionEffect(combat, potionById(used.id)); if (combat.over) finishCombat(run); else checkpointCombat(combat, run); }
      return true;
    }
    if (!run) return false;
    const takePot = event.target.closest("[data-take-potion]");
    if (takePot) { takePotion(run, takePot.dataset.takePotion === "" ? undefined : Number(takePot.dataset.takePotion)); return true; }
    const buyPot = event.target.closest("[data-buy-potion]");
    if (buyPot) { buyPotion(run, buyPot.dataset.buyPotion, Number(buyPot.dataset.price)); return true; }
    const node = event.target.closest("[data-node]");
    if (node) { moveTo(run, node.dataset.node); return true; }
    const take = event.target.closest("[data-take]");
    if (take) { takeReward(run, take.dataset.take === "skip" ? null : take.dataset.take); return true; }
    const bossRelic = event.target.closest("[data-boss-relic]");
    if (bossRelic) { takeBossRelic(run, bossRelic.dataset.bossRelic === "skip" ? null : bossRelic.dataset.bossRelic); return true; }
    const remove = event.target.closest("[data-remove]");
    if (remove) { removeCard(run, Number(remove.dataset.remove)); rest(run, "remove"); return true; }
    const upgrade = event.target.closest("[data-upgrade]");
    if (upgrade) { rest(run, "upgrade", Number(upgrade.dataset.upgrade)); return true; }
    const restEl = event.target.closest("[data-rest]");
    if (restEl) { rest(run, restEl.dataset.rest); return true; }
    const buy = event.target.closest("[data-buy]");
    if (buy) { buyCard(run, buy.dataset.buy, Number(buy.dataset.price)); return true; }
    const buyRemove = event.target.closest("[data-buy-remove]");
    if (buyRemove) { buyRemoval(run, Number(buyRemove.dataset.buyRemove)); return true; }
    const buyUp = event.target.closest("[data-buy-upgrade]");
    if (buyUp) { buyUpgrade(run, Number(buyUp.dataset.buyUpgrade), Number(buyUp.dataset.price)); return true; }
    const buyRel = event.target.closest("[data-buy-relic]");
    if (buyRel) { buyRelic(run, Number(buyRel.dataset.price)); return true; }
    const ev = event.target.closest("[data-event]");
    if (ev) { resolveEvent(run, ev.dataset.event); return true; }
    return false;
  }

  function runAction(action, run) {
    switch (action) {
      case "begin-run": case "new-run": beginRun(); return true;
      case "daily-run": beginRun({ mode: "daily" }); return true;
      case "custom-run": {
        const input = root.querySelector(".s6db-seed-input");
        const seedText = input ? input.value : "";
        if (!String(seedText || "").trim()) return false; // no seed typed → ignore
        beginRun({ mode: "custom", seedText });
        return true;
      }
      case "continue-run": state.ui.screen = "run"; return true;
      case "abandon": if (combatRun) combatRun.reset(); state.run = null; combat = null; state.ui.screen = "hub"; return true;
      case "prestige": doPrestige(); return true;
      case "to-hub": state.ui.screen = "hub"; return true;
      case "to-map": if (run) closeNode(run); return true;
      case "end-turn":
        if (combat && !combat.over) {
          pendingCardIndex = null;
          const hpBefore = combat.player.hp;
          endTurn(combat);
          // Enemy-turn feedback (stage6 #4): a banner + damage floats in the same language as play.
          pendingFx = { banner: "ENEMY TURN", playerDamage: Math.max(0, hpBefore - combat.player.hp) };
          if (combat.over) finishCombat(run); else checkpointCombat(combat, run);
        }
        return true;
      case "epub":
        openEpub({ viewer, actions, achievements, bell, state });
        // Reading ch9 mid-fight unlocks the negotiation: drop the locked snapshot and rebuild the boss
        // combat fresh (unlocked). This is an intentional restart of the boss fight, not the exploit.
        if (combat && combat.bossPhase && combat.bossLocked) { if (combatRun) combatRun.reset(); combat = null; }
        return true;
      case "bts": openBts({ bts, viewer }); return true;
      default: return false;
    }
  }
}

export function openEpub({ viewer, actions, achievements, bell, state }) {
  actions?.setAction?.(6, ACTION_NAME, { source: "stage6-codex", file: EPUB_PATH, chapter: 9 });
  applyProtocolChapter9Unlock({ state, achievements, bell });
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(EPUB_PATH, { source: "stage6" });
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(EPUB_PATH, { source: "stage6" });
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(6);
  else if (bts && typeof bts.openBts === "function") bts.openBts(6);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
