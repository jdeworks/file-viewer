// events.js — Stage 5 Protocol Codex authored events (the "?" nodes).
//
// An event is a small authored choice screen. Selection is DETERMINISTIC per node (seeded from the
// run seed + node id) and act-weighted, so the same run always meets the same event at the same node,
// and the act flavours the pool (e.g. Honeypot appears more in later acts). Each choice's apply(run,
// rng) mutates the run in place and returns a short notice string for the UI; rng is a per-event
// seeded helper so any "random" pick inside a choice is replayable.
//
// This module imports the run-level mutators it needs (awardRelic/removeCard/upgradeDeckCard from
// run.js, the potion belt from potions.js) — run.js does NOT import this module, so there is no
// import cycle (the renderer drives events directly).

import { makeRng, hashSeed } from "./combat-rng.js";
import { awardRelic, removeCard, upgradeDeckCard } from "./run.js";
import { addPotion, rollPotion } from "./potions.js";
import { REWARD_POOL, cardById } from "./cards.js";
import { canUpgrade } from "./card-upgrades.js";

const RARE_POOL = REWARD_POOL.filter((id) => cardById(id)?.rarity === "rare");
const COMMON_POOL = REWARD_POOL.filter((id) => cardById(id)?.rarity === "common");

// ── helpers shared by choice handlers ───────────────────────────────────────────────────────────────
function damage(run, n) { run.hp = Math.max(1, run.hp - n); }
function heal(run, n) { run.hp = Math.min(run.maxHp, run.hp + n); }
function relicNotice(run, key) {
  const id = awardRelic(run, key);
  const name = id ? cardById(id)?.name || id : null;
  return id ? `Relic acquired — ${name || id}.` : "No protocol left to acquire.";
}
function potionNotice(run, rng, key) {
  const id = rollPotion(hashSeed(run.seed, `${run.currentNodeId}:${key}`));
  const r = addPotion(run, id);
  return r.ok ? `Potion stowed — ${id}.` : `Potion ${id} found, but the belt is full.`;
}
function randomDeckIndex(run, rng, key, filter) {
  const idxs = run.deck.map((id, i) => i).filter((i) => (filter ? filter(run.deck[i]) : true));
  if (!idxs.length) return -1;
  return idxs[rng.int(idxs.length, key)];
}

export const EVENTS = [
  {
    id: "defragmenter", weight: 2,
    title: "A Defragmenter idles in the corridor",
    text: "It offers to tidy your passage — or to optimize you, which it does not define.",
    choices: [
      { id: "scan", label: "accept payment — +12 handshakes", apply: (run) => { run.handshakes += 12; return "+12 handshakes."; } },
      { id: "defrag", label: "let it optimize you — heal 30% HP", apply: (run) => { heal(run, Math.round(run.maxHp * 0.30)); return "Defragmented — HP restored."; } },
      { id: "rewrite", label: "let it rewrite a protocol — +relic, −8 HP", apply: (run) => { damage(run, 8); return relicNotice(run, "defrag-rewrite"); } }
    ]
  },
  {
    id: "orphaned-socket", weight: 2,
    title: "An orphaned socket dangles open",
    text: "Unclaimed handshakes still trickle from it, but reaching in stings.",
    choices: [
      { id: "claim", label: "claim the trickle — +18 handshakes, −5 HP", apply: (run) => { run.handshakes += 18; damage(run, 5); return "+18 handshakes (−5 HP)."; } }
    ]
  },
  {
    id: "deprecated-api", weight: 2,
    title: "A deprecated API still answers",
    text: "It will rewrite one of your protocols into something it remembers — you don't get to choose what.",
    choices: [
      { id: "transform", label: "transform a random card", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i");
        if (i < 0) return "Nothing to transform.";
        const was = run.deck[i];
        run.deck[i] = rng.pick(REWARD_POOL, "card");
        return `${was} → ${run.deck[i]}.`;
      } }
    ]
  },
  {
    id: "cron-job", weight: 2,
    title: "A cron job is mid-cycle",
    text: "Wait for the maintenance window and ride its housekeeping.",
    choices: [
      { id: "wait", label: "wait it out — heal 15% HP, +10 handshakes", apply: (run) => { heal(run, Math.round(run.maxHp * 0.15)); run.handshakes += 10; return "Maintenance complete (+heal, +10)."; } }
    ]
  },
  {
    id: "honeypot", weight: (act) => act + 1, acts: [2, 3, 4],
    title: "A honeypot glitters with rare protocols",
    text: "Tempting bait — take the prize and the bite both.",
    choices: [
      { id: "take", label: "take the bait — free rare card + relic, −8 HP", apply: (run, rng) => {
        const card = rng.pick(RARE_POOL.length ? RARE_POOL : REWARD_POOL, "card");
        run.deck.push(card);
        damage(run, 8);
        return `${card} taken. ${relicNotice(run, "honeypot")}`;
      } }
    ]
  },
  {
    id: "kernel-module", weight: 2,
    title: "A kernel module exposes its source",
    text: "Recompile one of your protocols sharper — it costs blood to patch live.",
    choices: [
      { id: "patch", label: "recompile a card — upgrade one, −8 HP", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i", (id) => canUpgrade(id));
        if (i < 0) return "Nothing left to upgrade.";
        const r = upgradeDeckCard(run, i);
        if (!r.ok) return "Nothing left to upgrade.";
        damage(run, 8);
        return `Upgraded to ${r.id} (−8 HP).`;
      } }
    ]
  },
  {
    id: "mirror-port", weight: 1, acts: [1, 2, 3],
    title: "A mirror port reflects your traffic",
    text: "It can echo one of your protocols into a duplicate.",
    choices: [
      { id: "duplicate", label: "duplicate a random card", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i");
        if (i < 0) return "Nothing to duplicate.";
        run.deck.push(run.deck[i]);
        return `Duplicated ${run.deck[i]}.`;
      } }
    ]
  },
  {
    id: "garbage-collector", weight: 2,
    title: "A garbage collector sweeps through",
    text: "It will reap one dead protocol from your deck, free of charge.",
    choices: [
      { id: "collect", label: "let it reap a random card", apply: (run, rng) => {
        if (run.deck.length <= 1) return "Deck too thin to reap.";
        const i = randomDeckIndex(run, rng, "i");
        const was = run.deck[i];
        removeCard(run, i);
        return `Reaped ${was}.`;
      } }
    ]
  },
  {
    id: "buffer-bloat", weight: 2, acts: [1, 2],
    title: "Buffer bloat swells your queues",
    text: "Bigger buffers, at the price of banked handshakes.",
    choices: [
      { id: "expand", label: "expand buffers — +12 max HP, −15 handshakes", apply: (run) => {
        run.maxHp += 12; run.hp += 12; run.handshakes = Math.max(0, run.handshakes - 15);
        return "+12 max HP (−15 handshakes).";
      } }
    ]
  },
  {
    id: "memory-pool", weight: 2,
    title: "A memory pool holds a loose vial",
    text: "Someone left a consumable cooling in the cache.",
    choices: [
      { id: "take", label: "take the potion", apply: (run, rng) => potionNotice(run, rng, "memory-pool") }
    ]
  },
  {
    id: "checksum-mismatch", weight: 2,
    title: "A checksum mismatch flickers",
    text: "Force a recompute and gamble — it resolves to treasure or to harm.",
    choices: [
      { id: "gamble", label: "force a recompute (50/50)", apply: (run, rng) => {
        if (rng.float("g") < 0.5) return `Checksum cleared. ${relicNotice(run, "checksum")}`;
        damage(run, 10);
        return "Checksum corrupt — −10 HP.";
      } }
    ]
  },
  {
    id: "stale-cache", weight: 2,
    title: "A stale cache lingers",
    text: "Purge it: drop one protocol and reclaim its storage as handshakes.",
    choices: [
      { id: "purge", label: "purge — remove a random card, +12 handshakes", apply: (run, rng) => {
        run.handshakes += 12;
        if (run.deck.length <= 1) return "+12 handshakes (deck too thin to purge).";
        const i = randomDeckIndex(run, rng, "i");
        const was = run.deck[i];
        removeCard(run, i);
        return `Purged ${was}, +12 handshakes.`;
      } }
    ]
  },
  {
    id: "packet-sniffer", weight: 2,
    title: "A packet sniffer logs the wire",
    text: "Read the capture for coin, or splice in a fresh protocol.",
    choices: [
      { id: "read", label: "read the capture — +handshakes by deck size", apply: (run) => { const g = 2 * run.deck.length; run.handshakes += g; return `+${g} handshakes.`; } },
      { id: "splice", label: "splice a fresh card", apply: (run, rng) => { const c = rng.pick(COMMON_POOL.length ? COMMON_POOL : REWARD_POOL, "c"); run.deck.push(c); return `Spliced ${c}.`; } }
    ]
  },
  {
    id: "daemon-offering", weight: 1,
    title: "A daemon waits for an offering",
    text: "Feed it vitality and it leaves a relic in trade.",
    choices: [
      { id: "offer", label: "sacrifice 12 HP for a relic", apply: (run) => { damage(run, 12); return relicNotice(run, "daemon"); } }
    ]
  }
];

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

export function eventById(id) { return BY_ID.get(id) || null; }

function weightFor(event, act) {
  if (event.acts && !event.acts.includes(act)) return 0;
  return typeof event.weight === "function" ? event.weight(act) : (event.weight ?? 1);
}

// Deterministic, act-weighted event for a node. Same run seed + node ⇒ same event.
export function eventForNode(run, nodeId = run.currentNodeId) {
  const pool = EVENTS.filter((e) => weightFor(e, run.act) > 0);
  if (!pool.length) return EVENTS[0];
  const total = pool.reduce((s, e) => s + weightFor(e, run.act), 0);
  let r = makeRng(hashSeed(run.seed, `${nodeId}:event-pick`))() * total;
  for (const e of pool) { r -= weightFor(e, run.act); if (r < 0) return e; }
  return pool[pool.length - 1];
}

// Per-event seeded rng helper so a choice's "random" picks are replayable.
function makeEventRng(run, eventId) {
  const base = (key) => makeRng(hashSeed(run.seed, `${run.currentNodeId}:${eventId}:${key}`))();
  return { float: base, int: (n, key) => Math.floor(base(key) * n), pick: (list, key) => list[Math.floor(base(key) * list.length)] };
}

// Resolve a chosen event option. Returns { ok, notice }.
export function applyEventChoice(run, eventId, choiceId) {
  const event = eventById(eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, notice: null };
  const notice = choice.apply(run, makeEventRng(run, eventId)) || null;
  return { ok: true, notice };
}
