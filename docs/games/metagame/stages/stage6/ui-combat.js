// ui-combat.js — Stage 6 combat screen (Slay-the-Spire layout: one viewport, no scroll).
//
// Pure view over a combat.js snapshot; the renderer mounts it and handles clicks through delegation:
//   [data-inspect="<handIndex>"]  raise the card at that hand index to the inspect close-up (view-state)
//   [data-play="<handIndex>"]     PLAY the inspected card (renderer commits it to the engine)
//   [data-pile="draw|discard|exhaust"]  open that pile's card-list modal
//   [data-log]                    open the full combat log modal
//   [data-action="end-turn"]      end the player's turn (enemy acts)
// No listeners are attached here — the view is rebuilt on every state change; feedback is spawned by
// the renderer AFTER mount (combat-fx.js). Layout: top band = enemy vs player · middle band = arena
// strip (ticker + floating numbers land here) · bottom band = the hand dock (fan + energy + piles +
// end turn). The inspect close-up is renderer view-state (pendingCardIndex), never engine/persisted.

import { cardById } from "./cards.js";
import { currentIntent } from "./combat.js";
import { currentDemand } from "./boss-combat.js";
import { potionById } from "./potions.js";
import { cardFaceInner, cardTypeClass } from "./card-face.js";
import { isVeteranRun } from "./run.js";

const STATUS_LABEL = { strength: "STR", vulnerable: "VULN", weak: "WEAK" };
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

// idx is valid only if it points at a real hand card (a stale pending index after a rebuild → null).
function normalizePending(idx, combat) {
  return (idx == null || idx < 0 || idx >= combat.hand.length) ? null : idx;
}

// M3 — key telegraph: the untouchable challenge is decided DURING an elite fight, so surface its one
// quiet line at the top of that fight — only on a veteran run (acts 5-6/superboss reachable) and only
// while the key is still unearned. First-run 4-act fights show nothing (that key can't complete there).
function eliteTelegraph(combat, run) {
  if (combat.enemy?.tier !== "elite" || !isVeteranRun(run) || (run?.keys || []).includes("untouchable")) return "";
  return `<p class="s6db-telegraph">take ≤5 damage this fight to earn the untouchable key ⚷</p>`;
}

export function combatView(combat, run, opts = {}) {
  const el = document.createElement("div");
  el.className = "s6db-combat";
  const intent = currentIntent(combat);
  const pending = normalizePending(opts.pendingCardIndex, combat);
  // An EMPTY arena renders nothing visible (stage6 #6 — no dead box): the element stays in the flow
  // as the flexible spacer + float/banner landing zone, but its panel background/padding only appear
  // once it actually has content (ticker / jammed row / log chip).
  const arena = arenaStrip(combat);
  el.innerHTML = `
    ${bossBanner(combat)}
    ${eliteTelegraph(combat, run)}
    <div class="s6db-battlefield">
      ${enemyPanel(combat.enemy, intent, combat)}
      ${playerPanel(combat.player)}
    </div>
    <div class="s6db-arena${arena ? "" : " is-empty"}">${arena}</div>
    ${inspectOverlay(combat, pending)}
    <div class="s6db-dock">
      <div class="s6db-dock-left">
        ${energyBlock(combat)}
        ${potionBelt(run)}
      </div>
      <div class="s6db-hand" aria-label="hand"></div>
      <div class="s6db-dock-right">
        ${pileChips(combat, run)}
        <button type="button" class="s6db-endturn" data-action="end-turn">end turn ▸</button>
      </div>
    </div>`;

  const hand = el.querySelector(".s6db-hand");
  hand.replaceChildren(...combat.hand.map((id, i) => handCard(id, i, combat.hand.length, combat.player.energy, pending)));
  return el;
}

// The act-4 boss negotiation banner: only for a wired boss combat (combat.bossPhase set). Shows the
// active phase rule and — while ch9 is unread (locked) — a PROTOCOL MISMATCH warning + a codex button
// (reading Chapter 9 is the load-bearing un-cheat). Kept working inside the new layout.
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

// The middle band: last two log lines as a ticker (empty log renders NOTHING — no dead box), a full-
// log chip, and the jammed (Packet Loss) row. Floating damage numbers + the ENEMY TURN banner land
// here (the arena is position:relative). Kept minimal so the band can flex-shrink on small viewports.
function arenaStrip(combat) {
  const lines = (combat.log || []).slice(-2);
  const ticker = lines.length ? `<div class="s6db-ticker">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>` : "";
  const logChip = (combat.log || []).length ? `<button type="button" class="s6db-chip" data-log>log ▾</button>` : "";
  return `${ticker}${jammedRow(combat)}${logChip ? `<div class="s6db-arena-tools">${logChip}</div>` : ""}`;
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
        <span class="s6db-fighter-avatar" aria-hidden="true">${enemy.glyph || "👾"}</span>
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

function playerPanel(player) {
  return `
    <section class="s6db-fighter s6db-player">
      <div class="s6db-fighter-top">
        <span class="s6db-fighter-avatar" aria-hidden="true">💻</span>
        <span class="s6db-fighter-name">You</span>
      </div>
      ${bar(player.hp, player.maxHp, "player")}
      <div class="s6db-hp">HP ${player.hp} / ${player.maxHp}</div>
      <div class="s6db-meta">
        <span class="s6db-block">🛡 ${player.block}</span>
      </div>
      ${statusChips(player.statuses)}
    </section>`;
}

// The potion belt: click a potion to consume it during combat ([data-potion="<beltIndex>"]).
function potionBelt(run) {
  const potions = run?.potions || [];
  if (!potions.length) return "";
  const chips = potions.map((id, i) => {
    const p = potionById(id);
    return `<button type="button" class="s6db-potion" data-potion="${i}" title="${esc(p?.text || "")}">⚗ ${esc(p?.name || id)}</button>`;
  }).join("");
  return `<div class="s6db-potions" aria-label="potion belt"><span class="s6db-potions-label">BELT:</span> ${chips}</div>`;
}

// THROUGHPUT: show Packet-Loss jammed cards (unplayable this turn; Defrag returns them).
function jammedRow(combat) {
  if (!combat.jammed || !combat.jammed.length) return "";
  const chips = combat.jammed.map((id) => `<span class="s6db-card--jammed" title="Packet Loss — jammed">⛔ ${esc(id)}</span>`).join("");
  return `<p class="s6db-jammed"><span class="s6db-jammed-label">JAMMED:</span> ${chips}</p>`;
}

// DELAY: telegraph the enemy's NEXT intent (2 turns ahead) so a growing RTT hit is learnable.
function nextIntentTelegraph(enemy, combat) {
  const script = enemy.script;
  if (!script || script.length < 2) return "";
  const next = script[(enemy.intentIndex + 1) % script.length];
  const d = describeIntent(next, combat);
  return `<div class="s6db-intent-next" title="${esc(next?.label || "")}">then ${d.icon} <strong>${esc(d.primary)}</strong></div>`;
}

// Energy crystal pips + count, plus the congestion-window readout (act 3+).
function energyBlock(combat) {
  const { energy, maxEnergy } = combat.player;
  const total = Math.max(maxEnergy, energy);
  let pips = "";
  for (let i = 0; i < total; i++) pips += `<span class="s6db-pip${i < energy ? " is-full" : ""}"></span>`;
  return `<div class="s6db-energy" aria-label="energy">
    <span class="s6db-pips" aria-hidden="true">${pips}</span>
    <span class="s6db-energy-num">${energy}/${maxEnergy}</span>
    ${combat.congestion && (combat.turn || 1) > 1 ? `<span class="s6db-window">⇄ ${combat.window}/${combat.windowCap}</span>` : ""}
  </div>`;
}

// Draw / discard / exhaust pile chips with live counts — click opens that pile's card-list modal.
// The DECK chip opens the whole run deck (data-deck) so the player can review their build mid-fight.
function pileChips(combat, run) {
  const chip = (kind, n, label) => `<button type="button" class="s6db-pilechip" data-pile="${kind}">${label} <b>${n}</b></button>`;
  const deckN = (run?.deck || []).length;
  return `<div class="s6db-pilechips">
    ${deckN ? `<button type="button" class="s6db-pilechip s6db-pilechip--deck" data-deck>deck <b>${deckN}</b></button>` : ""}
    ${chip("draw", combat.draw.length, "draw")}
    ${chip("discard", combat.discard.length, "disc")}
    ${combat.exhaust.length ? chip("exhaust", combat.exhaust.length, "exh") : ""}
  </div>`;
}

// A single fanned hand card. Geometry is fully derived from index/count (NO Math.random anywhere):
// rotation ramps −6°…+6° across the fan, with a slight downward arc at the edges. The values are set
// as inline CSS vars so the stylesheet's hover/focus rule can override the resting transform.
function handCard(id, index, count, energy, pending) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card ${cardTypeClass(card)}`;
  button.dataset.inspect = String(index);
  if (!(card && card.cost <= energy)) button.classList.add("is-unaffordable");
  if (pending === index) button.classList.add("is-pending");
  const mid = (count - 1) / 2;
  const t = count > 1 ? (index - mid) / mid : 0; // −1 … +1 across the fan
  button.style.setProperty("--rot", `${(t * 6).toFixed(2)}deg`);
  button.style.setProperty("--ty", `${(t * t * 8).toFixed(1)}px`); // gentle fan arc (kept small so edge cards don't dip out of the dock)
  button.style.setProperty("--z", String(index));
  button.innerHTML = cardFaceInner(id);
  return button;
}

// The raised inspect close-up (stage6 #2): the selected card enlarged above the hand. There is NO
// separate play button — clicking the raised card (or the hand card) AGAIN plays it, clicking outside
// deselects (renderer handleClick). `data-inspect` on the raised card routes the second click through
// the same select→play handler. Rendered from pendingCardIndex (view-state).
function inspectOverlay(combat, idx) {
  if (idx == null) return "";
  const id = combat.hand[idx];
  const card = cardById(id);
  const affordable = card && card.cost <= combat.player.energy;
  return `<div class="s6db-inspect" role="dialog" aria-label="inspect card">
    <div class="s6db-inspect-card s6db-card ${cardTypeClass(card)}" data-inspect="${idx}">${cardFaceInner(id)}</div>
    <p class="s6db-inspect-hint">${affordable ? "click again to play · Esc cancels" : "not enough energy"}</p>
  </div>`;
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

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
