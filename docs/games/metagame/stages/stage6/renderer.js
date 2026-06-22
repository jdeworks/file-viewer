// renderer.js — Stage 6 Protocol Codex controller: routes between the hub, the act-map run
// (combat / reward / rest / shop / event), and The Refused Connection negotiation. Owns the
// transient combat instance (never persisted — a reload re-instantiates from the run's node).
// The stage-clear gate is unchanged: read the codex (epub), then defeat The Refused Connection.

import { createCombat, playCard, endTurn, makeRng } from "./combat.js";
import { instantiateEnemy } from "./enemies.js";
import { relicsFor, relicById } from "./relics.js";
import { nodeById } from "./mapgen.js";
import {
  createRun, moveTo, enemyForCurrentNode, resolveCombat,
  takeReward, rest, removeCard, closeNode, buyCard, awardRelic
} from "./run.js";
import {
  applyProtocolChapter9Unlock, getBossLockState, recordLockedBossAttempt,
  playProtocolCard, startProtocolTurn
} from "./boss.js";
import { combatView } from "./ui-combat.js";
import { hubView, mapView, deathView, wonView } from "./ui-map.js";
import { rewardView, restView, shopView, eventView } from "./ui-rewards.js";
import { bossView } from "./ui-boss.js";
import { ACTION_NAME, BTS_PATH, EPUB_PATH } from "./messages.js";

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

  return { repaint: route, destroy() { root.remove(); } };

  // ── routing ──────────────────────────────────────────────────────────────────────────────────
  function route() {
    const run = state.run;
    if (state.ui.screen === "boss") return mount(bossView(state, lockState(), { fromRun: false }));
    if (state.ui.screen !== "run" || !run) { combat = null; return mount(hubView(state, lockState())); }
    switch (run.status) {
      case "combat": return mountCombat(run);
      case "boss": return run.act >= 3
        ? mount(bossView(state, lockState(), { fromRun: true }))
        : mountCombat(run);
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
    const node = nodeById(run.map, run.currentNodeId);
    const enemyId = enemyForCurrentNode(run, makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`)));
    const enemy = instantiateEnemy(enemyId, run.act);
    if (node?.type === "boss") { enemy.hp = Math.round(enemy.hp * 1.7); enemy.name += " ⟂"; }
    const c = createCombat({
      deck: run.deck,
      player: { hp: run.hp, maxHp: run.maxHp },
      enemy,
      seed: strHash(`${run.seed}:${run.currentNodeId}:combat`),
      relics: relicsFor(run.relics)
    });
    c.nodeId = run.currentNodeId;
    return c;
  }

  function finishCombat(run) {
    const win = combat.result === "win";
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    combat = null;
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

  // ── final boss negotiation ───────────────────────────────────────────────────────────────────
  function challengeBoss() {
    state.boss.reached = true;
    if (!lockState().unlocked) { recordLockedBossAttempt(state); return; }
    applyProtocolChapter9Unlock({ state, achievements, bell });
  }

  function playBossCard(cardId) {
    playProtocolCard({ state, card: cardId });
    if (state.boss.defeated) onBossDefeated();
  }

  function onBossDefeated() {
    state.meta.firstClearComplete = true;
    const run = state.run;
    if (run && run.status === "boss") {
      resolveCombat(run, { win: true, hpRemaining: run.hp });
      state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
      state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    }
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
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
    const card = event.target.closest("[data-card]");
    if (card) { playBossCard(card.dataset.card); return true; }
    if (!run) return false;
    const node = event.target.closest("[data-node]");
    if (node) { moveTo(run, node.dataset.node); return true; }
    const take = event.target.closest("[data-take]");
    if (take) { takeReward(run, take.dataset.take === "skip" ? null : take.dataset.take); return true; }
    const remove = event.target.closest("[data-remove]");
    if (remove) { removeCard(run, Number(remove.dataset.remove)); rest(run, "remove"); return true; }
    const restEl = event.target.closest("[data-rest]");
    if (restEl) { rest(run, restEl.dataset.rest); return true; }
    const buy = event.target.closest("[data-buy]");
    if (buy) { buyCard(run, buy.dataset.buy, Number(buy.dataset.price)); return true; }
    const ev = event.target.closest("[data-event]");
    if (ev) { resolveEvent(run, ev.dataset.event); return true; }
    return false;
  }

  function runAction(action, run) {
    switch (action) {
      case "begin-run": case "new-run": beginRun(); return true;
      case "continue-run": state.ui.screen = "run"; return true;
      case "abandon": state.run = null; combat = null; state.ui.screen = "hub"; return true;
      case "confront": state.ui.screen = "boss"; return true;
      case "to-hub": state.ui.screen = "hub"; return true;
      case "to-map": if (run) closeNode(run); return true;
      case "end-turn": if (combat && !combat.over) { endTurn(combat); if (combat.over) finishCombat(run); } return true;
      case "boss": challengeBoss(); return true;
      case "new-turn": startProtocolTurn(state); return true;
      case "epub": openEpub({ viewer, actions, achievements, bell, state }); return true;
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
