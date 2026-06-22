// ui-combat.js — Stage 6 combat screen (pure view over a combat.js snapshot).
//
// Returns a detached element; the renderer mounts it and handles clicks through delegation:
//   [data-play="<handIndex>"]  play the card at that hand index
//   [data-action="end-turn"]   end the player's turn (enemy acts)
// No listeners are attached here — the view is rebuilt on every state change.

import { cardById } from "./cards.js";
import { currentIntent } from "./combat.js";

const STATUS_LABEL = {
  strength: "STR", vulnerable: "VULN", weak: "WEAK"
};

export function combatView(combat, run) {
  const el = document.createElement("div");
  el.className = "s6db-combat";
  const intent = currentIntent(combat);
  el.innerHTML = `
    <div class="s6db-fighters">
      ${enemyPanel(combat.enemy, intent)}
      ${playerPanel(combat.player)}
    </div>
    <div class="s6db-energy" aria-label="energy">
      energy <strong>${combat.player.energy}</strong> / ${combat.player.maxEnergy}
      <span class="s6db-pile">draw ${combat.draw.length} · discard ${combat.discard.length}</span>
    </div>
    <div class="s6db-hand" aria-label="hand"></div>
    <div class="s6db-combat-controls">
      <button type="button" data-action="end-turn">end turn ▸</button>
    </div>
    <ol class="s6db-log" aria-label="combat log"></ol>
  `;

  const hand = el.querySelector(".s6db-hand");
  hand.replaceChildren(...combat.hand.map((id, i) => handCard(id, i, combat.player.energy)));

  const log = el.querySelector(".s6db-log");
  log.replaceChildren(...combat.log.slice(-5).map(toLi));
  return el;
}

function enemyPanel(enemy, intent) {
  return `
    <section class="s6db-fighter s6db-enemy">
      <div class="s6db-fighter-name">${esc(enemy.name)}</div>
      <div class="s6db-hp">HP ${enemy.hp} / ${enemy.maxHp}</div>
      ${bar(enemy.hp, enemy.maxHp, "enemy")}
      <div class="s6db-meta">
        ${enemy.block ? `<span class="s6db-block">block ${enemy.block}</span>` : ""}
        ${enemy.armor ? `<span class="s6db-armor">armor ${enemy.armor}</span>` : ""}
      </div>
      ${statusChips(enemy.statuses)}
      <div class="s6db-intent" title="${esc(intent?.label || "")}">intent: ${esc(intent?.label || "—")}</div>
    </section>`;
}

function playerPanel(player) {
  return `
    <section class="s6db-fighter s6db-player">
      <div class="s6db-fighter-name">You</div>
      <div class="s6db-hp">HP ${player.hp} / ${player.maxHp}</div>
      ${bar(player.hp, player.maxHp, "player")}
      <div class="s6db-meta">
        <span class="s6db-block">block ${player.block}</span>
      </div>
      ${statusChips(player.statuses)}
    </section>`;
}

function handCard(id, index, energy) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card s6db-card--${(card?.type || "").toLowerCase()}`;
  button.dataset.play = String(index);
  const affordable = card && card.cost <= energy;
  button.disabled = !affordable;
  button.innerHTML = `
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    <strong class="s6db-card-id">${esc(card?.id || id)}</strong>
    <span class="s6db-card-type">${esc(card?.type || "")}</span>
    <small class="s6db-card-text">${esc(card?.text || "")}</small>`;
  return button;
}

function statusChips(statuses) {
  const keys = Object.keys(statuses || {}).filter((k) => statuses[k]);
  if (!keys.length) return "";
  return `<div class="s6db-status">${keys
    .map((k) => `<span class="s6db-status-chip s6db-status-chip--${k}">${STATUS_LABEL[k] || k.toUpperCase()} ${statuses[k]}</span>`)
    .join("")}</div>`;
}

function bar(value, max, who) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return `<div class="s6db-bar s6db-bar--${who}"><span style="width:${pct}%"></span></div>`;
}

function toLi(line) {
  const li = document.createElement("li");
  li.textContent = line;
  return li;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
