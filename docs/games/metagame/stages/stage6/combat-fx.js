// combat-fx.js — Stage 6 combat feedback (UX audit stage6 #4 / F5). The renderer rebuilds the whole
// combat DOM on every state change, so feedback is applied AFTER the fresh node is mounted: the play/
// end-turn handlers capture a small `fx` descriptor (deltas + the played card's on-screen rect), and
// mountCombat calls applyCombatFx(newNode, fx) once the new DOM exists. Everything routes through the
// shared kit (docs/games/metagame/shared/feedback.js) — flash / floatNum / shake / banner — which is
// itself prefers-reduced-motion-aware; the only extra motion here (the flying card clone) is gated on
// reduced-motion below.

import { flash, shake, floatNum, banner } from "../../shared/feedback.js";

const reduce = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Apply a captured fx descriptor to a freshly-mounted combat node.
//   fx = { enemyDamage?, blockGain?, playerDamage?, banner?, fly?:{ rect, faceHTML } }
export function applyCombatFx(node, fx) {
  if (!node || !fx) return;
  const enemy = node.querySelector(".s6db-enemy");
  const player = node.querySelector(".s6db-player");
  const arena = node.querySelector(".s6db-arena");
  if (fx.banner && arena) banner(arena, fx.banner);
  if (fx.fly && arena) flyCard(fx.fly, arena);
  if (fx.enemyDamage && enemy) { flash(enemy, "bad"); floatNum(enemy, `-${fx.enemyDamage}`, "bad"); }
  if (fx.blockGain && player) flash(player, "good");
  if (fx.playerDamage && player) {
    flash(player, "bad");
    floatNum(player, `-${fx.playerDamage}`, "bad");
    shake(node.querySelector(".s6db-battlefield"));
  }
}

// The played card animates from where it sat toward the arena strip, then dissolves (~220ms). The
// clone is a body-level fixed node so the rebuild underneath it doesn't disturb it. Reduced-motion:
// skipped entirely (the damage float already conveys the play instantly).
function flyCard({ rect, faceHTML }, arena) {
  if (!rect || reduce() || typeof document === "undefined") return;
  const clone = document.createElement("div");
  clone.className = "s6db-fly s6db-card";
  clone.innerHTML = faceHTML || "";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  document.body.appendChild(clone);
  const a = arena.getBoundingClientRect();
  const dx = (a.left + a.width / 2) - (rect.left + rect.width / 2);
  const dy = (a.top + a.height / 2) - (rect.top + rect.height / 2);
  requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    clone.style.opacity = "0";
  });
  setTimeout(() => clone.remove(), 240);
}
