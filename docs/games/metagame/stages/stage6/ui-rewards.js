// ui-rewards.js — Stage 6 node-interaction screens: reward, rest, shop, event.
// Pure views; renderer delegates clicks:
//   [data-take="<cardId>"|"skip"]      pick a reward card / skip
//   [data-rest="heal"]                 rest: restore HP
//   [data-upgrade="<deckIndex>"]       rest: upgrade a card in place
//   [data-remove="<deckIndex>"]        rest: thin a card from the deck
//   [data-buy="<cardId>"]              shop: buy a card (price in data-price)
//   [data-buy-remove="<deckIndex>"]    shop: buy a deck removal (escalating price)
//   [data-buy-upgrade="<deckIndex>"]   shop: buy an in-place card upgrade (price in data-price)
//   [data-buy-relic="1"]               shop: buy a relic (price in data-price)
//   [data-action="to-map"]             leave shop/event back to the map
//   [data-event="<key>"]               resolve an event choice

import { cardById } from "./cards.js";
import { REWARD_POOL } from "./cards.js";
import { canUpgrade, upgradeIdFor } from "./card-upgrades.js";
import { removalCost, UPGRADE_COST, RELIC_COST, POTION_COST, POTION_SLOTS } from "./run.js";
import { makeRng } from "./combat.js";
import { relicById } from "./relics.js";
import { potionById, rollPotion } from "./potions.js";

const PRICE = { common: 25, uncommon: 40, rare: 60, starter: 20 };

export function rewardView(run) {
  const el = document.createElement("div");
  el.className = "s6db-reward";
  const cards = run.pendingReward?.cards || [];
  const relic = run.pendingReward?.relic ? relicById(run.pendingReward.relic) : null;
  el.innerHTML = `<h2>Signal recovered</h2>
    ${relic ? `<p class="s6db-relic-won">⬢ Relic acquired — <strong>${esc(relic.name)}</strong>: ${esc(relic.text)}</p>` : ""}
    <p>Add one card to your deck.</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...cards.map((id) => cardOption(id, "take", id)));
  el.appendChild(row);
  const potionId = run.pendingReward?.potion;
  if (potionId) el.appendChild(potionOffer(run, potionId));
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-take="skip" class="s6db-ghost">skip</button></div>`);
  return el;
}

// Offer the dropped potion: grab it if the belt (POTION_SLOTS) has room, else replace a slot.
function potionOffer(run, potionId) {
  const p = potionById(potionId);
  const wrap = document.createElement("div");
  wrap.className = "s6db-potion-offer";
  const belt = run.potions || [];
  if (belt.length < POTION_SLOTS) {
    wrap.innerHTML = `<p>Potion found — <strong>${esc(p?.name || potionId)}</strong>: ${esc(p?.text || "")}</p>
      <button type="button" data-take-potion="">grab potion ⚗</button>`;
  } else {
    wrap.innerHTML = `<p>Potion found — <strong>${esc(p?.name || potionId)}</strong>: ${esc(p?.text || "")}. Belt full — replace one:</p>`;
    const actions = document.createElement("div");
    actions.className = "s6db-hub-actions";
    actions.replaceChildren(...belt.map((id, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.takePotion = String(i);
      b.textContent = `replace ${potionById(id)?.name || id}`;
      return b;
    }));
    wrap.appendChild(actions);
  }
  return wrap;
}

// After a mini-boss falls, choose ONE of three offered relics ([data-boss-relic="<id>"|"skip"]).
// Picking advances to the next act. Big replay variance vs. the old forced grant.
export function bossRewardView(run) {
  const el = document.createElement("div");
  el.className = "s6db-reward s6db-boss-reward";
  const offered = (run.pendingReward?.relics || []).map(relicById).filter(Boolean);
  el.innerHTML = `<h2>Protocol negotiated</h2>
    <p>${offered.length ? "Claim one relic to carry into the next act." : "No new relics remain."}</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...offered.map((relic) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `s6db-relic-choice${relic.cursed ? " is-cursed" : ""}`;
    b.dataset.bossRelic = relic.id;
    b.innerHTML = `<strong>⬢ ${esc(relic.name)}</strong><small class="s6db-card-text">${esc(relic.text)}</small>`;
    return b;
  }));
  el.appendChild(row);
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-boss-relic="skip" class="s6db-ghost">${offered.length ? "skip relic ▸" : "continue ▸"}</button></div>`);
  return el;
}

export function restView(run) {
  const el = document.createElement("div");
  el.className = "s6db-rest";
  const heal = Math.round(run.maxHp * 0.30);
  el.innerHTML = `
    <h2>Keepalive</h2>
    <p>A quiet socket. Choose ONE: recover ${heal} HP, upgrade a card, or thin your deck.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-rest="heal">rest — heal ${heal} HP ▸</button>
    </div>
    <div class="s6db-rest-upgrade"><h3>…or upgrade a card</h3></div>
    <div class="s6db-rest-thin"><h3>…or remove a card</h3></div>`;

  const upgradeable = run.deck.map((id, i) => ({ id, i })).filter(({ id }) => canUpgrade(id));
  const up = el.querySelector(".s6db-rest-upgrade");
  if (upgradeable.length) {
    const upList = document.createElement("div");
    upList.className = "s6db-card-row";
    // Show the UPGRADED face so the player sees what they get; data-upgrade carries the deck index.
    upList.replaceChildren(...upgradeable.map(({ id, i }) => cardOption(upgradeIdFor(id), "upgrade", String(i))));
    up.appendChild(upList);
  } else {
    up.insertAdjacentHTML("beforeend", `<p class="s6db-hint">Every card is already upgraded.</p>`);
  }

  const thin = el.querySelector(".s6db-rest-thin");
  const list = document.createElement("div");
  list.className = "s6db-card-row";
  list.replaceChildren(...run.deck.map((id, i) => cardOption(id, "remove", String(i))));
  thin.appendChild(list);
  return el;
}

export function shopView(run) {
  const el = document.createElement("div");
  el.className = "s6db-shop";
  const offers = shopOffers(run);
  el.innerHTML = `<h2>Open port</h2><p>Handshakes: <strong>${run.handshakes}</strong>. Buy what you can afford.</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...offers.map(({ id, price }) => {
    const chip = cardOption(id, "buy", id);
    chip.dataset.price = String(price);
    chip.disabled = run.handshakes < price;
    chip.insertAdjacentHTML("beforeend", `<span class="s6db-price">${price} ✋</span>`);
    return chip;
  }));
  el.appendChild(row);

  // Removal sink: deck-thinning is the strongest action, so it costs more each time you buy it.
  const cost = removalCost(run);
  const affordable = run.handshakes >= cost && run.deck.length > 1;
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-shop-remove"><h3>Purge a card — ${cost} ✋ <small>(price rises each purchase)</small></h3></div>`);
  const purge = el.querySelector(".s6db-shop-remove");
  const purgeRow = document.createElement("div");
  purgeRow.className = "s6db-card-row";
  purgeRow.replaceChildren(...run.deck.map((id, i) => {
    const chip = cardOption(id, "buy-remove", String(i));
    chip.disabled = !affordable;
    return chip;
  }));
  purge.appendChild(purgeRow);

  // Upgrade sink: pay handshakes to sharpen a card (flat price; shows the upgraded face).
  const upgradeable = run.deck.map((id, i) => ({ id, i })).filter(({ id }) => canUpgrade(id));
  if (upgradeable.length) {
    el.insertAdjacentHTML("beforeend",
      `<div class="s6db-shop-upgrade"><h3>Sharpen a card — ${UPGRADE_COST} ✋ each</h3></div>`);
    const upRow = document.createElement("div");
    upRow.className = "s6db-card-row";
    upRow.replaceChildren(...upgradeable.map(({ id, i }) => {
      const chip = cardOption(upgradeIdFor(id), "buy-upgrade", String(i));
      chip.dataset.price = String(UPGRADE_COST);
      chip.disabled = run.handshakes < UPGRADE_COST;
      return chip;
    }));
    el.querySelector(".s6db-shop-upgrade").appendChild(upRow);
  }

  // Potion sink: deterministic potion wares; buying needs a free belt slot.
  const potionOffers = shopPotionOffers(run);
  const beltFull = (run.potions || []).length >= POTION_SLOTS;
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-shop-potions"><h3>Consumables — ${POTION_COST} ✋ each${beltFull ? " <small>(belt full)</small>" : ""}</h3></div>`);
  const potRow = document.createElement("div");
  potRow.className = "s6db-card-row";
  potRow.replaceChildren(...potionOffers.map((id) => {
    const p = potionById(id);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "s6db-potion s6db-potion--shop";
    b.dataset.buyPotion = id;
    b.dataset.price = String(POTION_COST);
    b.disabled = beltFull || run.handshakes < POTION_COST;
    b.innerHTML = `<strong>⚗ ${esc(p?.name || id)}</strong><small class="s6db-card-text">${esc(p?.text || "")}</small><span class="s6db-price">${POTION_COST} ✋</span>`;
    return b;
  }));
  el.querySelector(".s6db-shop-potions").appendChild(potRow);

  // Relic sink: buy a relic if any remain in the pool.
  const relicAffordable = run.handshakes >= RELIC_COST;
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-shop-relic"><h3>Acquire a relic — ${RELIC_COST} ✋</h3>
       <button type="button" data-buy-relic="1" data-price="${RELIC_COST}"${relicAffordable ? "" : " disabled"}>buy a relic ⬢</button></div>`);

  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-action="to-map">leave ▸</button></div>`);
  return el;
}

// Render the (deterministically selected) event for this node. `event` comes from events.eventForNode;
// each meaningful choice is a [data-event="<choiceId>"] button, plus a ghost "walk past" (to-map).
export function eventView(run, event) {
  const el = document.createElement("div");
  el.className = "s6db-event";
  el.innerHTML = `
    <h2>${esc(event?.title || "An anomaly idles in the corridor")}</h2>
    <p>${esc(event?.text || "")}</p>
    ${run.notice ? `<p class="s6db-hint">${esc(run.notice)}</p>` : ""}`;
  const actions = document.createElement("div");
  actions.className = "s6db-hub-actions";
  const buttons = (event?.choices || []).map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.event = c.id;
    b.textContent = `${c.label} ▸`;
    return b;
  });
  const leave = document.createElement("button");
  leave.type = "button";
  leave.className = "s6db-ghost";
  leave.dataset.action = "to-map";
  leave.textContent = "walk past";
  actions.replaceChildren(...buttons, leave);
  el.appendChild(actions);
  return el;
}

// Deterministic per-node shop stock so a reload shows the same wares.
export function shopOffers(run) {
  const rng = makeRng(strHash(`${run.seed}:${run.currentNodeId}:shop`));
  const pool = [...REWARD_POOL];
  const out = [];
  while (out.length < 4 && pool.length) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const card = cardById(id);
    out.push({ id, price: PRICE[card?.rarity] || 30 });
  }
  return out;
}

// Deterministic shop potion stock (2 distinct potions per shop node).
export function shopPotionOffers(run) {
  const out = [];
  let salt = 0;
  while (out.length < 2 && salt < 24) {
    const id = rollPotion(strHash(`${run.seed}:${run.currentNodeId}:potion:${salt++}`));
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function cardOption(id, attr, value) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card s6db-card--${(card?.type || "").toLowerCase()}`;
  button.dataset[attr] = value;
  button.innerHTML = `
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    <strong class="s6db-card-id">${esc(card?.id || id)}</strong>
    <span class="s6db-card-type">${esc(card?.type || "")}</span>
    <small class="s6db-card-text">${esc(card?.text || "")}</small>`;
  return button;
}

function strHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
