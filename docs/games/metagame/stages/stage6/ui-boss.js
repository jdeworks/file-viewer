// ui-boss.js — The Refused Connection: the 3-phase protocol negotiation (boss.js owns mechanics).
// This is the codex-gated finale, reachable from the hub or as the act-3 boss node.
// Renderer delegates clicks:
//   [data-action="boss"]      challenge / attempt to negotiate (unlock check)
//   [data-action="new-turn"]  start a fresh protocol turn
//   [data-card="<id>"]        play SYN / ACK / Signal
//   [data-action="bts"]       open trace.bts (after defeat)
//   [data-action="to-hub"]    leave back to the hub

import { phaseRules, protocolCards } from "./content.js";

export function bossView(state, lock, { fromRun = false } = {}) {
  const el = document.createElement("div");
  el.className = "s6db-boss";
  const boss = state.boss;
  el.innerHTML = `
    <header class="s6db-boss-hud">
      <strong>THE REFUSED CONNECTION</strong>
      <span>phase ${boss.phase}</span>
      <span>boss hp ${boss.defeated ? 0 : boss.hp}</span>
      <span class="s6db-boss-status">${esc(lock.status)}${lock.defeated ? " / answered" : ""}</span>
    </header>
    <div class="s6db-boss-layout">
      <section class="s6db-boss-stage">
        <p class="s6db-boss-hint">${esc(lock.hint)}</p>
        <div class="s6db-boss-turn">first ${esc(boss.turn?.firstCard || "none")} · ACK ${boss.turn?.playedAck ? "yes" : "no"}</div>
        <div class="s6db-card-row" aria-label="protocol cards"></div>
      </section>
      <section class="s6db-boss-rules" aria-label="Chapter 9 rules"></section>
    </div>
    <ol class="s6db-log" aria-label="protocol log"></ol>
    <div class="s6db-hub-actions">
      <button type="button" data-action="boss"${lock.defeated ? " disabled" : ""}>${lock.unlocked ? "negotiate" : "challenge"}</button>
      <button type="button" data-action="new-turn">new turn</button>
      <button type="button" data-action="epub">open the codex</button>
      ${boss.defeated ? `<button type="button" data-action="bts">open trace.bts</button>` : ""}
      ${fromRun ? "" : `<button type="button" data-action="to-hub" class="s6db-ghost">back to hub</button>`}
    </div>`;

  const rules = el.querySelector(".s6db-boss-rules");
  rules.replaceChildren(...phaseRules.map((rule) => {
    const item = document.createElement("article");
    item.innerHTML = `<strong>${esc(rule.title)}</strong><span>${esc(rule.rule)}</span>`;
    return item;
  }));

  const cards = el.querySelector(".s6db-card-row");
  cards.replaceChildren(...protocolCards.map((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `s6db-card s6db-card--${card.type.toLowerCase()}`;
    button.dataset.card = card.id;
    button.disabled = boss.defeated || !lock.unlocked;
    button.innerHTML = `<strong class="s6db-card-id">${esc(card.id)}</strong>
      <span class="s6db-card-type">${esc(card.type)}</span>
      <small class="s6db-card-text">${esc(card.text)}</small>`;
    return button;
  }));

  const log = el.querySelector(".s6db-log");
  log.replaceChildren(...(state.log || []).slice(-6).map((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    return li;
  }));
  return el;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
