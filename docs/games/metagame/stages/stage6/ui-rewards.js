// ui-rewards.js — Stage 6 node-interaction screens: reward, rest, shop, event.
// Pure views; renderer delegates clicks:
//   [data-take="<cardId>"|"skip"]      pick a reward card / skip
//   [data-rest="heal"]                 rest: restore HP
//   [data-upgrade="<deckIndex>"]       rest: upgrade a card in place
//   [data-remove="<deckIndex>"]        rest: thin a card from the deck
//   [data-buy="<cardId>"]              shop: buy a card (price in data-price)
//   [data-action="to-map"]             leave shop/event back to the map
//   [data-event="<key>"]               resolve an event choice

import { cardById } from "./cards.js";
import { REWARD_POOL } from "./cards.js";
import { canUpgrade, upgradeIdFor } from "./card-upgrades.js";
import { makeRng } from "./combat.js";
import { relicById } from "./relics.js";

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
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-take="skip" class="s6db-ghost">skip</button></div>`);
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
  el.insertAdjacentHTML("beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-action="to-map">leave ▸</button></div>`);
  return el;
}

export function eventView(run) {
  const el = document.createElement("div");
  el.className = "s6db-event";
  el.innerHTML = `
    <h2>A Defragmenter idles in the corridor</h2>
    <p>It offers to tidy your passage — or to optimize you, which it does not define.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-event="scan">accept payment — +12 handshakes ▸</button>
      <button type="button" data-event="defrag">let it optimize you — heal 30% HP ▸</button>
      <button type="button" data-event="rewrite">let it rewrite a protocol — +relic, −8 HP ▸</button>
      <button type="button" data-action="to-map" class="s6db-ghost">walk past</button>
    </div>`;
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
