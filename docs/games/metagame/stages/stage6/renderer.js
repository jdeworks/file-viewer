// renderer.js — Stage 6 Protocol Codex controller: routes between the hub and the act-map run
// (combat / reward / rest / shop / event). Owns the transient combat instance (never persisted —
// a reload re-instantiates from the run's node). The act-4 boss, The Refused Connection, is fought
// with the player's REAL deck (boss-combat.js wires the negotiation as an acceptance hook); the
// stage-clear gate is unchanged: read the codex (epub) — without it every Signal deals 0 — then
// defeat the boss with the deck built across acts 1–3.

import { createCombat, playCard, endTurn, makeRng } from "./combat.js";
import { instantiateEnemy } from "./enemies.js";
import { relicsFor, relicById } from "./relics.js";
import { nodeById } from "./mapgen.js";
import {
  createRun, moveTo, enemyForCurrentNode, resolveCombat,
  takeReward, rest, removeCard, closeNode, buyCard, buyRemoval, buyUpgrade, buyRelic, awardRelic,
  prestigeCost, FINAL_BOSS_ACT, seatAtFinalBoss
} from "./run.js";
import { applyProtocolChapter9Unlock, getBossLockState } from "./boss.js";
import { wireBossCombat, autoNegotiate as runAutoNegotiate } from "./boss-combat.js";
import { combatView } from "./ui-combat.js";
import { hubView, mapView, deathView, wonView } from "./ui-map.js";
import { rewardView, restView, shopView, eventView } from "./ui-rewards.js";
import { ACTION_NAME, BTS_PATH, EPUB_PATH } from "./messages.js";

const REFUSED_CONNECTION = "the-refused-connection";

export function renderStage6({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage6-protocol-codex";
  root.innerHTML = `
    <header class="s6db-top"><strong>PROTOCOL CODEX</strong></header>
    <div class="s6db-screen" data-screen></div>`;
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");

  let combat = null; // transient; not saved
  const completeOnce = once((result) => { if (typeof onStageComplete === "function") onStageComplete(result); });
  const lockState = () => getBossLockState({ actions, state });
  const mount = (node) => screen.replaceChildren(node);
  const commit = () => { if (typeof save === "function") save(); route(); };

  root.addEventListener("click", handleClick);
  route();

  // TEST/DEBUG hook (not a player affordance, not a hub button): seat a run directly at the
  // act-4 boss so the smoke harness can reach the negotiation in one hop instead of 19 fights.
  // It only fast-forwards position — it does NOT bypass the ch9 un-cheat or the real-deck fight.
  window.__fvStage6 = {
    jumpToBoss(deck) {
      if (!state.run) beginRun();
      seatAtFinalBoss(state.run, deck);
      state.ui.screen = "run";
      combat = null;
      commit();
      return state.run.currentNodeId;
    },
    // TEST/DEBUG: drive the in-run boss fight with a correct handshake strategy using the REAL
    // engine + acceptance. NOT a bypass — if ch9 is unread the boss is locked and this cannot win.
    autoNegotiate(maxTurns = 80) {
      const run = state.run;
      if (!run || run.status !== "boss") return { ok: false, reason: "not-at-boss" };
      if (!combat || combat.nodeId !== run.currentNodeId) combat = makeCombat(run);
      runAutoNegotiate(combat, maxTurns);
      const enemyHp = combat.enemy?.hp;
      const result = combat.result;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, enemyHp, bossDefeated: Boolean(state.boss.defeated), won: state.run?.status === "won" };
    }
  };

  return { repaint: route, destroy() { if (window.__fvStage6) delete window.__fvStage6; root.remove(); } };

  // ── routing ──────────────────────────────────────────────────────────────────────────────────
  function route() {
    const run = state.run;
    // The Refused Connection is reachable ONLY as the act-4 boss node of a run (see the
    // run.status === "boss" case below) — there is no standalone hub-reachable boss screen.
    if (state.ui.screen !== "run" || !run) { combat = null; return mount(hubView(state, lockState())); }
    switch (run.status) {
      // Every boss — including the act-4 finale — is now a real-deck fight (combatView).
      case "combat": case "boss": return mountCombat(run);
      case "reward": combat = null; return mount(rewardView(run));
      case "rest": combat = null; return mount(restView(run));
      case "shop": combat = null; return mount(shopView(run));
      case "event": combat = null; return mount(eventView(run));
      case "dead": combat = null; return mount(deathView(state, run));
      case "won": combat = null; return mount(wonView(state, run));
      case "map":
      default: combat = null; return mount(mapView(run));
    }
  }

  function mountCombat(run) {
    if (!combat || combat.nodeId !== run.currentNodeId) combat = makeCombat(run);
    if (combat.over) { finishCombat(run); return route(); }
    mount(combatView(combat, run));
  }

  // ── combat lifecycle ─────────────────────────────────────────────────────────────────────────
  function makeCombat(run) {
    const enemyId = enemyForCurrentNode(run, makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`)));
    const enemy = instantiateEnemy(enemyId, run.act);
    const c = createCombat({
      deck: run.deck,
      player: { hp: run.hp, maxHp: run.maxHp },
      enemy,
      seed: strHash(`${run.seed}:${run.currentNodeId}:combat`),
      relics: relicsFor(run.relics),
      congestion: run.act === 3 // THROUGHPUT: Act 3 fights run on the dynamic congestion window
    });
    c.nodeId = run.currentNodeId;
    // The act-4 finale: layer the negotiation onto the real fight. ch9 unread ⇒ locked ⇒ every
    // Signal deals 0 (the load-bearing un-cheat); reading the codex rebuilds this combat unlocked.
    if (enemyId === REFUSED_CONNECTION) wireBossCombat(c, { locked: !lockState().unlocked });
    return c;
  }

  function finishCombat(run) {
    const win = combat.result === "win";
    const node = nodeById(run.map, run.currentNodeId);
    const isFinalBoss = node?.type === "boss" && run.act >= FINAL_BOSS_ACT;
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    if (!win) state.meta.banked = (state.meta.banked || 0) + Math.floor((run.handshakes || 0) * 0.5);
    combat = null;
    if (win && isFinalBoss) finalBossDefeated(run);
  }

  // The act-4 boss fell to the real deck: mark the codex gate answered and complete the stage.
  function finalBossDefeated(run) {
    state.boss.defeated = true;
    state.boss.reached = true;
    state.meta.firstClearComplete = true;
    state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
    state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }

  function doPrestige() {
    const cost = prestigeCost(state.meta.protocolVersion || 0);
    if ((state.meta.banked || 0) < cost) return;
    state.meta.banked -= cost;
    state.meta.protocolVersion = (state.meta.protocolVersion || 0) + 1;
  }

  // ── run lifecycle ────────────────────────────────────────────────────────────────────────────
  function beginRun() {
    state.meta.runsStarted = (state.meta.runsStarted || 0) + 1;
    const seed = 1000 + state.meta.runsStarted * 7919 + (state.meta.protocolVersion || 0) * 131;
    state.run = createRun({ seed, version: state.meta.protocolVersion || 0, handshakes: 0 });
    state.ui.screen = "run";
    combat = null;
  }

  function resolveEvent(run, key) {
    if (key === "scan") run.handshakes += 12;
    else if (key === "defrag") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.30));
    else if (key === "rewrite") {
      run.hp = Math.max(1, run.hp - 8);
      const id = awardRelic(run, `event-${run.currentNodeId}`);
      run.notice = id ? `Relic acquired — ${relicById(id)?.name || id}` : "no protocol left to rewrite";
    }
    closeNode(run);
  }

  // ── click delegation ─────────────────────────────────────────────────────────────────────────
  function handleClick(event) {
    const run = state.run;
    if (handleTarget(event, run)) return commit();
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    if (!runAction(btn.dataset.action, run)) return;
    commit();
  }

  function handleTarget(event, run) {
    const play = event.target.closest("[data-play]");
    if (play && combat && !combat.over) { playCard(combat, Number(play.dataset.play)); if (combat.over) finishCombat(run); return true; }
    if (!run) return false;
    const node = event.target.closest("[data-node]");
    if (node) { moveTo(run, node.dataset.node); return true; }
    const take = event.target.closest("[data-take]");
    if (take) { takeReward(run, take.dataset.take === "skip" ? null : take.dataset.take); return true; }
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
      case "continue-run": state.ui.screen = "run"; return true;
      case "abandon": state.run = null; combat = null; state.ui.screen = "hub"; return true;
      case "prestige": doPrestige(); return true;
      case "to-hub": state.ui.screen = "hub"; return true;
      case "to-map": if (run) closeNode(run); return true;
      case "end-turn": if (combat && !combat.over) { endTurn(combat); if (combat.over) finishCombat(run); } return true;
      case "epub":
        openEpub({ viewer, actions, achievements, bell, state });
        // Reading ch9 mid-fight unlocks the negotiation: rebuild the boss combat so it is no longer locked.
        if (combat && combat.bossPhase && combat.bossLocked) combat = null;
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

function strHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}

function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
