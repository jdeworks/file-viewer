// mapgen.js — Stage 6 Protocol Codex: seeded act-map generation.
//
// Each act is a layered DAG (Slay-the-Spire-style): START -> content layers -> BOSS. Every node has
// a type and forward edges to the next layer; the generator guarantees the act is fully connected
// (every node is reachable from START and every node can reach the BOSS). Deterministic per seed.

import { makeRng } from "./combat.js";

export const NODE_TYPES = ["combat", "elite", "rest", "shop", "event", "boss"];

// Standard trash pool widens and hardens by act, so later acts feel meaner than the opener.
const STANDARD_POOLS = {
  1: ["corrupt-packet", "firewall-entity", "null-pointer"],
  2: ["corrupt-packet", "firewall-entity", "null-pointer", "race-condition", "round-trip-timer"],
  3: ["firewall-entity", "null-pointer", "race-condition", "packet-storm", "round-trip-timer", "congestion-collapse"],
  4: ["null-pointer", "race-condition", "packet-storm", "round-trip-timer", "congestion-collapse"],
  // Act 5 PRESENTATION · CORRUPTION: cleansers + corruption-flavoured bruisers reward burst-DoT play.
  5: ["packet-storm", "race-condition", "heisenbug", "daemon-process"],
  // Act 6 APPLICATION · CHAIN: looping/echoing strikers reward interrupt timing + replay payoffs.
  6: ["heisenbug", "infinite-loop", "recursive-call", "packet-storm"]
};
// Elite pools are act-aware so a late-act elite (Segfault) never shows up in the opening acts.
const ELITE_POOLS = {
  default: ["expired-certificate", "man-in-the-middle"],
  6: ["man-in-the-middle", "segfault"]
};
const CONTENT_LAYERS = 6; // + 1 boss layer => ~15 nodes/act

export function generateAct(act, seed) {
  const rng = makeRng((Number(seed) || 1) * 100 + act);
  const layers = [];
  for (let layer = 0; layer < CONTENT_LAYERS; layer++) {
    const width = layerWidth(layer, rng);
    const nodes = [];
    for (let col = 0; col < width; col++) {
      // Default composition: start layer + middles are combat; the layer before the boss is a rest.
      nodes.push({ id: nodeId(act, layer, col), act, layer, col, type: defaultType(layer), next: [] });
    }
    layers.push(nodes);
  }
  composeAct(layers, rng); // guarantee an elite, a shop and an event (deterministic), rest is combat
  layers.push([{ id: nodeId(act, CONTENT_LAYERS, 0), act, layer: CONTENT_LAYERS, col: 0, type: "boss", next: [] }]);

  wireEdges(layers, rng);
  return { act, layers, startIds: layers[0].map((n) => n.id) };
}

export function generateRun(seed, acts = 3) {
  return { seed, acts: Array.from({ length: acts }, (_, i) => generateAct(i + 1, seed)) };
}

export function nodeById(run, id) {
  for (const act of run.acts) {
    for (const layer of act.layers) {
      const found = layer.find((n) => n.id === id);
      if (found) return found;
    }
  }
  return null;
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

function layerWidth(layer, rng) {
  if (layer === 0) return 2;
  return 2 + (rng() < 0.5 ? 1 : 0); // 2 or 3
}

function defaultType(layer) {
  // Start layer is combat; the layer before the boss is a guaranteed pre-boss rest; middles default
  // to combat (composeAct then carves in the required elite/shop/event).
  return layer === CONTENT_LAYERS - 1 ? "rest" : "combat";
}

// Authored composition (replaces per-node random rolls): each act is GUARANTEED to offer an elite,
// a shop and an event among its middle layers (1..CONTENT_LAYERS-2), with everything else combat so
// the act's verb gets plenty of reps before the mini-boss. Fully deterministic from the act rng.
function composeAct(layers, rng) {
  const mid = [];
  for (let l = 1; l <= CONTENT_LAYERS - 2; l++) mid.push(l);
  // Elite lands in a LATER middle layer so the act warms up first.
  const eliteIdx = 1 + Math.floor(rng() * (mid.length - 1));
  const eliteLayer = mid[eliteIdx];
  const pool = mid.filter((l) => l !== eliteLayer);
  const shopLayer = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  const eventLayer = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  setOne(layers[eliteLayer], "elite", rng);
  setOne(layers[shopLayer], "shop", rng);
  setOne(layers[eventLayer], "event", rng);
}

// Set one (seeded) column in a layer to `type`, leaving the rest as-is (combat).
function setOne(layerNodes, type, rng) {
  layerNodes[Math.floor(rng() * layerNodes.length)].type = type;
}

function wireEdges(layers, rng) {
  for (let i = 0; i < layers.length - 1; i++) {
    const here = layers[i];
    const next = layers[i + 1];
    // Each node connects to 1–2 nodes in the next layer.
    for (const node of here) {
      const a = next[Math.floor(rng() * next.length)];
      node.next = [a.id];
      if (next.length > 1 && rng() < 0.5) {
        const b = next[Math.floor(rng() * next.length)];
        if (b.id !== a.id) node.next.push(b.id);
      }
    }
    // Guarantee every next-layer node has at least one incoming edge.
    for (const target of next) {
      const hasIncoming = here.some((node) => node.next.includes(target.id));
      if (!hasIncoming) {
        const source = here[Math.floor(rng() * here.length)];
        source.next.push(target.id);
      }
    }
  }
}

function nodeId(act, layer, col) {
  return `a${act}-l${layer}-n${col}`;
}

// `rng` is REQUIRED — a seeded `makeRng(...)` from the caller. There is deliberately no
// `Math.random` fallback: enemy picks must be replayable from the run seed (no live entropy).
export function enemyForNode(node, act = 1, rng) {
  if (typeof rng !== "function") throw new TypeError("enemyForNode requires a seeded rng");
  if (node.type === "elite") {
    const elites = ELITE_POOLS[act] || ELITE_POOLS.default;
    return elites[Math.floor(rng() * elites.length)];
  }
  const pool = STANDARD_POOLS[act] || STANDARD_POOLS[6];
  return pool[Math.floor(rng() * pool.length)];
}
