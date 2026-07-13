// combat-fx.js — Stage 5 combat feedback (UX audit stage5 #4 / F5). The renderer rebuilds the whole
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
//   fx = { enemyDamage?, blockGain?, playerDamage?, banner?, fly?, playerAttack?, enemyAction? }
export function applyCombatFx(node, fx) {
  if (!node || !fx) return;
  const enemy = node.querySelector(".s5db-enemy");
  const player = node.querySelector(".s5db-player");
  const arena = node.querySelector(".s5db-arena");
  if (fx.banner && arena) banner(arena, fx.banner);
  if (fx.fly && arena) flyCard(fx.fly, arena);
  if (fx.enemyDamage && enemy) { flash(enemy, "bad"); floatNum(enemy, `-${fx.enemyDamage}`, "bad"); }
  if (fx.blockGain && player) flash(player, "good");
  // Avatar choreography (stage5 #4): the player lunges when a card lands; the enemy lunges on an
  // attack turn and braces on a guard turn. One-shot CSS class the browser plays then we strip.
  if (fx.playerAttack) avatarAnim(player, "s5db-anim-lunge-l");   // player (right panel) lunges left at the enemy
  if (fx.enemyAction === "attack") avatarAnim(enemy, "s5db-anim-lunge-r"); // enemy (left panel) lunges right at you
  else if (fx.enemyAction === "guard") avatarAnim(enemy, "s5db-anim-guard");
  if (fx.playerDamage && player) {
    flash(player, "bad");
    floatNum(player, `-${fx.playerDamage}`, "bad");
    shake(node.querySelector(".s5db-battlefield"));
  }
}

// Add a one-shot animation class to a fighter's avatar, removed when the animation ends (or after a
// fallback timeout). Reduced-motion is respected by the keyframes themselves (they no-op under the CSS
// media query), so no JS gate is needed here.
function avatarAnim(fighter, cls) {
  const avatar = fighter?.querySelector(".s5db-fighter-avatar");
  if (!avatar) return;
  avatar.classList.add(cls);
  const done = () => avatar.classList.remove(cls);
  avatar.addEventListener("animationend", done, { once: true });
  setTimeout(done, 600);
}

// The played card animates from where it sat toward the arena strip, then dissolves (~220ms). The
// clone is a body-level fixed node so the rebuild underneath it doesn't disturb it. Reduced-motion:
// skipped entirely (the damage float already conveys the play instantly).
function flyCard({ rect, faceHTML }, arena) {
  if (!rect || reduce() || typeof document === "undefined") return;
  const clone = document.createElement("div");
  clone.className = "s5db-fly s5db-card";
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
