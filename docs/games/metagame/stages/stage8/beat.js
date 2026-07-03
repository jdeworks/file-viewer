// beat.js — Stage 8 Entropy Field: the CYCLE BEAT + crisis drama (UX-audit #6, shared feedback kit).
// Advancing a cycle sweeps a highlight across the tiles in decay order (~250ms); a node failure flashes
// its tile + floats "-N STATES"; a storm arrival banners its zone + shakes the sector block; a cascade
// pulses the stressed edges. All reduced-motion-aware: the sweep/shake/pulse are skipped when the user
// prefers reduced motion (the floats + banner still appear, degraded to instant by the shared CSS).

import { flash, floatNum, shake, banner } from "../../shared/feedback.js";
import { decayOrder } from "./layout.js";

const SWEEP_MS = 250;

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Play the beat for one advanced cycle. `result` is advanceCycle's return; `map` is the .s8-map box,
// freshly repainted for the new cycle. `bannerLayer` hosts the phase banner (below the command bar).
export function playCycleBeat({ map, state, result, bannerLayer }) {
  const net = map?.querySelector?.(".s8-net");
  if (!net) return;
  const reduce = reducedMotion();
  if (!reduce) sweep(net, state);
  flashFailures(net, result);
  if (!reduce) pulseCascade(net);
  const surviving = result?.storm?.resolved && result.storm.survived;
  if (surviving && bannerLayer) banner(bannerLayer, `SECTOR ${result.storm.sector?.toUpperCase?.() || ""} ONLINE`);
}

// Announce + shake a storm as it is braced (called from the brace action, not the cycle tick).
export function playStormArrival({ map, bannerLayer, sector, label }) {
  if (bannerLayer) banner(bannerLayer, `⛆ ${label || "CASCADE STORM"}`);
  if (reducedMotion()) return;
  const block = map?.querySelector?.(`.s8-sector[data-sector="${sector}"]`);
  if (block) shake(block);
}

// Sweep a brief highlight across the tiles in decay order — a per-tile settle you can watch.
function sweep(net, state) {
  const order = decayOrder(state);
  const n = Math.max(1, order.length);
  order.forEach((id, i) => {
    const tile = net.querySelector(`[data-node-id="${id}"]`);
    if (!tile) return;
    tile.style.setProperty("--sweep-delay", `${Math.round((i / n) * SWEEP_MS)}ms`);
    tile.classList.remove("is-sweep");
    void tile.offsetWidth; // restart the animation
    tile.classList.add("is-sweep");
    setTimeout(() => tile.classList.remove("is-sweep"), SWEEP_MS + 260);
  });
}

// A failed node: flash its tile red + float the States now at risk (the debris value it shed).
function flashFailures(net, result) {
  for (const id of result?.newlyFailed || []) {
    const tile = net.querySelector(`[data-node-id="${id}"]`);
    if (!tile) continue;
    flash(tile, "bad");
    const debris = (result.newDebris || []).find((d) => d.node === id);
    floatNum(tile, `-${debris?.value ?? "?"} STATES`, "bad");
  }
}

// Cascade: pulse the currently-stressed edges (drawn is-stressed by map.js) in propagation order.
function pulseCascade(net) {
  const stressed = net.querySelectorAll("svg.s8-edges .s8-edge.is-stressed");
  stressed.forEach((line, i) => {
    line.style.setProperty("--pulse-delay", `${i * 60}ms`);
    line.classList.add("is-pulse");
    setTimeout(() => line.classList.remove("is-pulse"), 600 + i * 60);
  });
}
