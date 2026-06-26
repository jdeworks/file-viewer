// ui-combat.js — Stage 6 combat screen (pure view over a combat.js snapshot).
//
// Returns a detached element; the renderer mounts it and handles clicks through delegation:
//   [data-play="<handIndex>"]  play the card at that hand index
//   [data-action="end-turn"]   end the player's turn (enemy acts)
// No listeners are attached here — the view is rebuilt on every state change.

import { cardById } from "./cards.js";
import { currentIntent } from "./combat.js";
import { currentDemand } from "./boss-combat.js";

const STATUS_LABEL = {
  strength: "STR", vulnerable: "VULN", weak: "WEAK"
};
const TIER_BADGE = { elite: "☠ ELITE", boss: "☣ BOSS" };

const PHASE_NAME = { 1: "HANDSHAKE", 2: "ESTABLISHED", 3: "MAINTAIN" };
const DEMAND_TEXT = {
  "lead-syn": "lead this turn with SYN, or your Signals are refused.",
  "ack-first": "play an ACK before your Signals, or they are refused."
};

// The live handshake rule for the current phase/turn. Phase 3's demand mutates each turn (D4).
function phaseRuleText(combat) {
  const phase = combat.bossPhase || 1;
  const demand = currentDemand(combat);
  const mutating = phase === 3 ? "MUTATING — " : "";
  return `${PHASE_NAME[phase] || ""} — ${mutating}${DEMAND_TEXT[demand] || ""}`;
}

export function combatView(combat, run) {
  const el = document.createElement("div");
  el.className = "s6db-combat";
  const intent = currentIntent(combat);
  el.innerHTML = `
    ${bossBanner(combat)}
    <div class="s6db-combat-head">
      <span class="s6db-turn">turn ${combat.turn}</span>
      <span class="s6db-pile">draw ${combat.draw.length} · discard ${combat.discard.length}${combat.exhaust.length ? ` · exhaust ${combat.exhaust.length}` : ""}</span>
    </div>
    <div class="s6db-fighters">
      ${enemyPanel(combat.enemy, intent, combat)}
      ${playerPanel(combat.player)}
    </div>
    <div class="s6db-energy" aria-label="energy">
      ${energyPips(combat.player.energy, combat.player.maxEnergy)}
      <span class="s6db-energy-num">${combat.player.energy} / ${combat.player.maxEnergy} energy</span>
      ${combat.congestion ? `<span class="s6db-window">⇄ congestion window ${combat.window} (cap ${combat.windowCap})</span>` : ""}
    </div>
    ${jammedRow(combat)}
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

// The act-4 boss negotiation banner: only rendered for a wired boss combat (combat.bossPhase set).
// Shows the active phase rule, and — while ch9 is unread (locked) — a PROTOCOL MISMATCH warning and
// a button to open the codex (reading Chapter 9 is the load-bearing un-cheat).
function bossBanner(combat) {
  if (!combat.bossPhase) return "";
  const locked = Boolean(combat.bossLocked);
  return `
    <div class="s6db-boss-banner${locked ? " is-locked" : ""}">
      <div class="s6db-boss-banner-head">
        <strong>THE REFUSED CONNECTION</strong>
        <span class="s6db-boss-phase">phase ${combat.bossPhase} / 3</span>
      </div>
      <p class="s6db-boss-rule">${esc(phaseRuleText(combat))}</p>
      ${locked
        ? `<p class="s6db-boss-mismatch">PROTOCOL MISMATCH — every Signal deals 0 until you read Chapter 9.</p>
           <button type="button" data-action="epub">open the codex</button>`
        : ""}
    </div>`;
}

// Classify an enemy intent so the UI can telegraph it with an icon, a kind colour, and the number
// that actually matters this turn (incoming damage, block gained, etc.).
function describeIntent(intent, combat) {
  if (!intent) return { kind: "unknown", icon: "…", primary: "—", detail: "" };
  if (intent.mirror) {
    const reflect = intent.mirror * (combat?.cardsPlayedThisTurn || 0);
    return { kind: "mirror", icon: "🪞", primary: `${intent.mirror}×`, detail: `mirror · ~${reflect} now` };
  }
  if (intent.attack) {
    const hits = intent.hits || 1;
    // DELAY: a ramp intent grows with the enemy's uninterrupted-turn count.
    const each = intent.attack + (intent.ramp ? intent.ramp * (combat?.enemy?.rttStacks || 0) : 0);
    const total = each * hits;
    return {
      kind: intent.pierce ? "pierce" : "attack",
      icon: intent.pierce ? "⚡" : "⚔",
      primary: String(total),
      detail: (hits > 1 ? `${each}×${hits}` : "") + (intent.ramp ? " ⏫ growing" : "") + (intent.pierce ? " unblockable" : "")
    };
  }
  if (intent.block) return { kind: "block", icon: "🛡", primary: String(intent.block), detail: "defend" };
  if (intent.applyPlayer) return { kind: "debuff", icon: "☣", primary: intent.applyPlayer.status, detail: "debuff" };
  if (intent.applySelf) return { kind: "buff", icon: "▲", primary: intent.applySelf.status, detail: "buff" };
  return { kind: "wait", icon: "…", primary: "—", detail: "" };
}

function enemyPanel(enemy, intent, combat) {
  const d = describeIntent(intent, combat);
  const tier = TIER_BADGE[enemy.tier];
  return `
    <section class="s6db-fighter s6db-enemy s6db-enemy--${enemy.tier || "standard"}">
      <div class="s6db-fighter-top">
        <span class="s6db-fighter-name">${esc(enemy.name)}</span>
        ${tier ? `<span class="s6db-tier s6db-tier--${enemy.tier}">${tier}</span>` : ""}
      </div>
      ${bar(enemy.hp, enemy.maxHp, "enemy")}
      <div class="s6db-hp">HP ${enemy.hp} / ${enemy.maxHp}</div>
      <div class="s6db-meta">
        ${enemy.block ? `<span class="s6db-block">🛡 ${enemy.block}</span>` : ""}
        ${enemy.armor ? `<span class="s6db-armor">armor ${enemy.armor}</span>` : ""}
      </div>
      ${statusChips(enemy.statuses)}
      <div class="s6db-intent s6db-intent--${d.kind}" title="${esc(intent?.label || "")}">
        <span class="s6db-intent-icon">${d.icon}</span>
        <span class="s6db-intent-num">${esc(d.primary)}</span>
        <span class="s6db-intent-detail">${esc(d.detail || intent?.label || "")}</span>
      </div>
      ${nextIntentTelegraph(enemy, combat)}
    </section>`;
}

// THROUGHPUT: show Packet-Loss jammed cards (unplayable this turn; Defrag returns them).
function jammedRow(combat) {
  if (!combat.jammed || !combat.jammed.length) return "";
  const chips = combat.jammed.map((id) => `<span class="s6db-card s6db-card--jammed" title="Packet Loss — jammed">⛔ ${esc(id)}</span>`).join("");
  return `<div class="s6db-jammed" aria-label="jammed (packet loss)"><span class="s6db-jammed-label">JAMMED:</span> ${chips}</div>`;
}

// DELAY: telegraph the enemy's NEXT intent (2 turns ahead) so a growing RTT hit is learnable.
function nextIntentTelegraph(enemy, combat) {
  const script = enemy.script;
  if (!script || script.length < 2) return "";
  const next = script[(enemy.intentIndex + 1) % script.length];
  const d = describeIntent(next, combat);
  return `<div class="s6db-intent-next" title="${esc(next?.label || "")}">then ${d.icon} <strong>${esc(d.primary)}</strong></div>`;
}

function playerPanel(player) {
  return `
    <section class="s6db-fighter s6db-player">
      <div class="s6db-fighter-top"><span class="s6db-fighter-name">You</span></div>
      ${bar(player.hp, player.maxHp, "player")}
      <div class="s6db-hp">HP ${player.hp} / ${player.maxHp}</div>
      <div class="s6db-meta">
        <span class="s6db-block">🛡 ${player.block}</span>
      </div>
      ${statusChips(player.statuses)}
    </section>`;
}

function energyPips(energy, maxEnergy) {
  const total = Math.max(maxEnergy, energy);
  let pips = "";
  for (let i = 0; i < total; i++) pips += `<span class="s6db-pip${i < energy ? " is-full" : ""}"></span>`;
  return `<span class="s6db-pips" aria-hidden="true">${pips}</span>`;
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
