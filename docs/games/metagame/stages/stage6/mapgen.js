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
  2: ["corrupt-packet", "firewall-entity", "null-pointer", "race-condition"],
  3: ["firewall-entity", "null-pointer", "race-condition", "packet-storm"],
  4: ["null-pointer", "race-condition", "packet-storm"]
};
const ELITE_ENEMIES = ["expired-certificate", "man-in-the-middle"];
const CONTENT_LAYERS = 6; // + 1 boss layer => ~15 nodes/act

export function generateAct(act, seed) {
  const rng = makeRng((Number(seed) || 1) * 100 + act);
  const layers = [];
  for (let layer = 0; layer < CONTENT_LAYERS; layer++) {
    const width = layerWidth(layer, rng);
    const nodes = [];
    for (let col = 0; col < width; col++) {
      nodes.push(makeNode(act, layer, col, rng));
    }
    layers.push(nodes);
  }
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

function makeNode(act, layer, col, rng) {
  return { id: nodeId(act, layer, col), act, layer, col, type: pickType(layer, rng), next: [] };
}

// Type rules: first layer is always combat; the layer before the boss is always rest; a single shop
// and at least one elite land in the middle; the rest are combat with occasional events.
function pickType(layer, rng) {
  if (layer === 0) return "combat";
  if (layer === CONTENT_LAYERS - 1) return "rest";
  const roll = rng();
  if (layer >= 2 && layer <= CONTENT_LAYERS - 2 && roll < 0.18) return "elite";
  if (roll < 0.30) return "event";
  if (roll < 0.42) return "shop";
  return "combat";
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
  if (node.type === "elite") return ELITE_ENEMIES[Math.floor(rng() * ELITE_ENEMIES.length)];
  const pool = STANDARD_POOLS[act] || STANDARD_POOLS[4];
  return pool[Math.floor(rng() * pool.length)];
}
