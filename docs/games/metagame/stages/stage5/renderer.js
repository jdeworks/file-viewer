// renderer.js — Stage 5 Protocol Codex controller: routes between the hub and the act-map run
// (combat / reward / rest / shop / event). Owns the transient combat instance (never persisted —
// a reload re-instantiates from the run's node). The terminal boss, The Refused Connection, is fought
// with the player's REAL deck (act 4 on a first run, act 6 thereafter). Reading the codex is an
// optional buff: unread, the boss carries more HP (UNCH9_HP_MULT), but the negotiation remains fair.

import { createCombat, playCard, endTurn, makeRng, applyPotionEffect, strHash, congestionForAct, currentIntent } from "./combat.js";
import { cardById } from "./cards.js";
import { instantiateEnemy } from "./enemies.js";
import { relicsFor } from "./relics.js";
import { potionById } from "./potions.js";
import { eventForNode, applyEventChoice } from "./events.js";
import { nodeById } from "./mapgen.js";
import {
  moveTo, enemyForCurrentNode, resolveCombat,
  takeReward, takePotion, usePotion, buyPotion, takeBossRelic, rest, removeCard, closeNode,
  buyCard, buyRemoval, buyUpgrade, buyRelic,
  prestigeCost, canPrestige, eligiblePrestigeUpgrades, seatAtFinalBoss, runScore,
  finalActOf, isVeteranRun
} from "./run.js";
import { banner } from "../../shared/feedback.js";
import { getBossLockState } from "./boss.js";
import { BTS_PATH } from "./messages.js";
import { wireBossCombat, autoNegotiate as runAutoNegotiate, BOSS_PHASE_HP, UNCH9_HP_MULT } from "./boss-combat.js";
import { SUPERBOSS_ID, wireSuperboss } from "./superboss.js";
import { installStage5TestHook, removeStage5TestHook } from "./testhook.js";
import { snapshotCombat, restoreCombat } from "./combat-persist.js";
import { createRun as createRunState } from "../../shared/run-state.js";
import { createAscension } from "../../shared/ascension.js";
import { ASCENSION_MODS } from "./ascension-mods.js";
import { combatView } from "./ui-combat.js";
import { applyCombatFx } from "./combat-fx.js";
import { openPileModal, openLogModal, openDeckModal, openPrestigeModal } from "./combat-modals.js";
import { installCombatHover } from "./combat-hover.js";
import { hubView, mapView, paintMapEdges, deathView, wonView } from "./ui-map.js";
import { rewardView, restView, shopView, eventView, bossRewardView } from "./ui-rewards.js";
import { openEpub, openBts, once } from "./renderer-open.js";
import { applyDev, devSkipToBoss } from "./s5dev.js";
import { beginProtocolRun, recordProtocolScore } from "./run-lifecycle.js";

const REFUSED_CONNECTION = "the-refused-connection";

export function renderStage5({ host, state, actions, achievements, bell, bts, viewer, save, orchestrator, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage5-protocol-codex";
  root.innerHTML = `
    <header class="s5db-top"><strong>PROTOCOL CODEX</strong></header>
    <div class="s5db-screen" data-screen></div>`;
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");

  // Combat persistence (kills the reload-retry exploit): the active fight is checkpointed into the
  // run-state 'combat' slot (stageState[5].combat — a distinct slot from stage5's own state.run) so a
  // reload RESUMES the same mid-fight state instead of re-rolling a fresh encounter. debounceMs:0 so
  // every checkpoint is flushed into the save object before commit()'s save() serializes it.
  const combatRun = orchestrator?.save
    ? createRunState({ save: orchestrator.save, stageId: 5, slot: "combat", debounceMs: 0 })
    : null;

  // Ascension ladder STATE (selected level + cleared high-water mark) owned by the shared module; its
  // CONTENT (the 15 rules) lives in ascension-mods.js and is applied inside createRun. Persisted at
  // save.stageState[5].ascension + the global summary (save.global.maxAscension / ascensionCleared).
  const ascension = orchestrator?.save
    ? createAscension({ save: orchestrator.save, stageId: 5, modifiers: ASCENSION_MODS })
    : null;
  const ascInfo = () => ascension
    ? { level: ascension.level(), maxUnlocked: ascension.maxUnlocked(), maxCleared: ascension.maxCleared(), maxLevel: ascension.maxLevel, floor: state.meta.protocolVersion || 0 }
    : null;

  let combat = null; // live engine instance; its full state is checkpointed into combatRun
  // Combat VIEW-state (never persisted, never engine state): the inspected hand card (stage5 #2) and
  // the one-shot feedback descriptor applied after the next combat re-mount (stage5 #4, combat-fx.js).
  let pendingCardIndex = null;
  let pendingFx = null;
  let pendingBanner = null; // one-shot arrival banner (M1 disclosure / acts-5-6 unlock); flushed in mount()
  // Daily-seed clock: read ONCE per run at creation (a SEED, never consulted inside the combat loop,
  // so it honors the no-live-entropy rule). Overridable for deterministic tests via the test hook.
  let dailyKeyOverride = null;
  const completeOnce = once((result) => { if (typeof onStageComplete === "function") onStageComplete(result); });
  const lockState = () => getBossLockState({ actions, state });
  const mount = (node) => {
    screen.replaceChildren(node);
    if (pendingBanner) { banner(screen, pendingBanner); pendingBanner = null; }
    return node;
  };
  const commit = () => { if (typeof save === "function") save(); route(); };

  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKey);
  installCombatHover(root, () => combat); // card hover: tooltip + synergy highlight (view-only)
  route();

  // TEST/DEBUG hook (not a player affordance, not a hub button). It only fast-forwards position +
  // replays correct play through the REAL engine — it never bypasses the ch9 un-cheat. Extracted to
  // testhook.js; it closes over the mutable `combat` via accessors.
  installStage5TestHook({
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
    jumpToBoss() {
      // Cross-game boss navigation always targets the full six-act finale. Start from a fresh
      // veteran run so a stale checkpoint, completed run, or first-run act-4 cap cannot intercept it.
      state.meta.runsCleared = Math.max(1, Number(state.meta.runsCleared || 0));
      state.run = null;
      state.boss.reached = true;
      state.boss.defeated = false;
      state.boss.phase = 1;
      beginRun();
      devSkipToBoss(state.run);
      state.ui.screen = "run";
      combat = null;
      if (combatRun) combatRun.reset();
      if (typeof save === "function") save();
      route();
      return Boolean(root.querySelector(".s5db-combat"));
    },
    destroy() { if (combatRun) combatRun.destroy(); removeStage5TestHook(); root.remove(); }
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
      default: {
        combat = null;
        const node = mount(mapView(run));
        paintMapEdges(node, run); // #5: draw the act DAG's adjacency under the node chips (post-mount)
        return node;
      }
    }
  }

  function mountCombat(run) {
    if (!combat || combat.nodeId !== run.currentNodeId) combat = loadOrMakeCombat(run);
    if (combat.over) { finishCombat(run); return route(); }
    const node = combatView(combat, run, { pendingCardIndex });
    mount(node);
    // Feedback (stage5 #4) is spawned AFTER mount so it attaches to the fresh DOM. One-shot.
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
    const enemyDamage = Math.max(0, enemyBefore - combat.enemy.hp);
    pendingFx = {
      enemyDamage,
      blockGain: Math.max(0, combat.player.block - blockBefore),
      playerAttack: enemyDamage > 0, // lunge the player avatar when the card actually hit
      fly: rect ? { rect, faceHTML } : null
    };
    if (combat.over) finishCombat(state.run); else checkpointCombat(combat, state.run);
    return true;
  }

  // Keyboard: 1–9 selects/inspects a hand card; Enter plays the inspected card; Esc cancels (stage5 #1/#2).
  function handleKey(event) {
    if (!combat || combat.over || state.ui.screen !== "run") return;
    if (event.key >= "1" && event.key <= "9") {
      const idx = Number(event.key) - 1;
      if (idx < combat.hand.length) { pendingCardIndex = idx; route(); event.preventDefault(); }
    } else if (event.key === "Enter" && pendingCardIndex != null) {
      const src = root.querySelector(".s5db-inspect .s5db-card");
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
    // Terminal finale: layer the negotiation onto the real fight. Chapter 9 reveals the accepted
    // sequence and removes the unread HP surcharge without replacing the player's real deck.
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
    const isFinalBoss = node?.type === "boss" && run.act >= finalActOf(run);
    // A resolved fight must NOT resume on reload: clear the checkpoint slot (also bumps runs[6]).
    if (combatRun) combatRun.reset();
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    if (!win) state.meta.banked = (state.meta.banked || 0) + Math.floor((run.handshakes || 0) * 0.5);
    // M1: a first finished run (a death here) reveals the stat tiles on the hub.
    if (run.status === "dead") state.meta.disclosed.stats = true;
    combat = null;
    pendingCardIndex = null; // combat over — drop any raised card / pending feedback so it can't leak
    pendingFx = null;
    if (win && isFinalBoss) finalBossDefeated(run);
    // A run that just resolved (death, or the final-boss win) banks its self-competition score.
    if (run.status === "dead" || run.status === "won") recordProtocolScore(state.meta, run);
  }

  // The act-6 boss fell to the real deck: mark the codex gate answered. With all 3 keys the run
  // diverts to the hidden superboss FIRST — stage completion is deferred to finishSuperboss (which
  // completes the stage on win OR loss, so the superboss is never a progression trap — the gate was
  // the negotiation, already passed here).
  function finalBossDefeated(run) {
    state.boss.defeated = true;
    state.boss.reached = true;
    state.meta.firstClearComplete = true;
    // M1: the first WIN reveals the ascension picker + seed controls (announced once). Stats too.
    state.meta.disclosed.stats = true;
    if (!state.meta.disclosed.meta) { state.meta.disclosed.meta = true; pendingBanner = "difficulty ladder unlocked ⚑"; }
    state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
    // Record the ascension clear at the rule level this run actually played under (unlocks the next rung).
    if (ascension) ascension.recordClear(run.ascension || 0);
    state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    if (run.status === "superboss") return; // defer completion until the true-ending fight resolves
    completeOnce({ stage: 5, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
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
    recordProtocolScore(state.meta, run);
    completeOnce({ stage: 5, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }

  // First time a veteran run advances into act 5 (unlocked by the first win): announce the extended
  // archive once. A 4-act first run never reaches act 5, so this can't fire there.
  function maybeRevealActs(run) {
    if (!run || run.act < 5 || !isVeteranRun(run) || state.meta.disclosed.actsRevealed) return;
    state.meta.disclosed.actsRevealed = true;
    pendingBanner = "the archive descends further — acts 5 and 6 unlocked";
  }

  // Prestige is a two-step action (UX audit follow-up: previously fired instantly with no reward
  // choice). "reinforce protocol" opens a picker of the player's still-upgradable starting-deck
  // slots (see run.js eligiblePrestigeUpgrades — sourced from the STATIC STARTING_DECK, never the
  // run's live deck); picking one, or explicitly skipping, spends the cost and bumps the version.
  function doPrestige() {
    if (!canPrestige(state.meta)) return;
    openPrestigeModal({
      eligibleIndices: eligiblePrestigeUpgrades(state.meta.permanentUpgrades || []),
      onPick: (index) => applyPrestige(index),
      onSkip: () => applyPrestige(null)
    });
  }

  function applyPrestige(index) {
    if (!canPrestige(state.meta)) return; // defensive re-check (mirrors buy*/rest guards elsewhere)
    state.meta.banked -= prestigeCost(state.meta.protocolVersion || 0);
    state.meta.protocolVersion = (state.meta.protocolVersion || 0) + 1;
    if (index != null) state.meta.permanentUpgrades = [...(state.meta.permanentUpgrades || []), index];
    commit();
  }

  // ── run lifecycle ────────────────────────────────────────────────────────────────────────────
  function beginRun(opts = {}) {
    beginProtocolRun({
      state,
      ascensionLevel: ascension ? ascension.level() : 0,
      dailyKeyOverride,
      ...opts,
    });
    if (combatRun) combatRun.reset(); // drop any stale combat snapshot from a previous run
    combat = null;
    pendingCardIndex = null;
    pendingFx = null;
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
    // Inspect cancel (stage5 #2): a click anywhere that is NOT a card (hand card or the raised close-up,
    // both [data-inspect]) while a card is raised drops the selection. Deferred (cancelled) so a click
    // that ALSO triggers another action (e.g. end turn) still runs; a bare cancel re-renders at the end.
    let cancelled = false;
    if (pendingCardIndex != null && !event.target.closest("[data-inspect]")) {
      pendingCardIndex = null; cancelled = true;
    }
    // Card click: FIRST click selects (raises the close-up); clicking the SAME card again PLAYS it;
    // clicking outside deselects (handled above). No separate play button.
    const inspect = event.target.closest("[data-inspect]");
    if (inspect && combat && !combat.over) {
      const i = Number(inspect.dataset.inspect);
      if (pendingCardIndex === i) {
        // Second click on the selected card → play it (fly from the raised close-up). If unaffordable,
        // doPlay is a no-op and the card stays raised.
        if (doPlay(i, root.querySelector(".s5db-inspect .s5db-card"))) return commit();
        return route();
      }
      pendingCardIndex = i;
      return route();
    }
    // Pile / deck / log modals (transient; no save). Deck view works in combat AND on the map.
    const pile = event.target.closest("[data-pile]");
    if (pile && combat) return openPileModal(combat, pile.dataset.pile);
    if (event.target.closest("[data-deck]") && run) return openDeckModal(run.deck);
    if (event.target.closest("[data-log]") && combat) return openLogModal(combat);

    if (handleTarget(event, run)) return commit();
    const btn = event.target.closest("button[data-action]");
    if (btn && runAction(btn.dataset.action, run)) return commit();
    if (cancelled) route();
  }

  function handleTarget(event, run) {
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
    if (bossRelic) { takeBossRelic(run, bossRelic.dataset.bossRelic === "skip" ? null : bossRelic.dataset.bossRelic); maybeRevealActs(run); return true; }
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
        const input = root.querySelector(".s5db-seed-input");
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
          // Classify the enemy's telegraphed intent BEFORE endTurn (its intentIndex advances inside),
          // so the avatar can lunge on an attack vs brace on a guard (stage5 #4 turn animation).
          const intent = currentIntent(combat);
          const enemyAction = intent?.attack || intent?.mirror || intent?.pierce ? "attack" : intent?.block ? "guard" : "buff";
          endTurn(combat);
          // Enemy-turn feedback (stage5 #4): a banner + damage floats in the same language as play.
          pendingFx = { banner: "ENEMY TURN", playerDamage: Math.max(0, hpBefore - combat.player.hp), enemyAction };
          if (combat.over) finishCombat(run); else checkpointCombat(combat, run);
        }
        return true;
      case "epub":
        openEpub({ viewer, actions, achievements, bell, state });
        // 2026-07-11 playtest fix: ch9 is a buff now, not a gate — reading it mid-fight should not
        // wipe progress you already fought for. Rescale the CURRENT fight's HP pool down in place
        // (removing the unread-cost multiplier) instead of discarding the combat and restarting.
        if (combat && combat.bossPhase && combat.bossLocked) {
          const newMult = (combat.bossHpMult || UNCH9_HP_MULT) / UNCH9_HP_MULT;
          const frac = combat.enemy.maxHp > 0 ? combat.enemy.hp / combat.enemy.maxHp : 1;
          combat.bossLocked = false;
          combat.bossHpMult = newMult;
          combat.enemy.maxHp = Math.round((BOSS_PHASE_HP[combat.bossPhase] || BOSS_PHASE_HP[1]) * newMult);
          combat.enemy.hp = Math.min(combat.enemy.maxHp, Math.max(1, Math.round(combat.enemy.maxHp * frac)));
          checkpointCombat(combat, run);
        }
        return true;
      case "bts": openBts({ bts, viewer }); return true;
      default: return false;
    }
  }
}

export { openEpub } from "./renderer-open.js";
