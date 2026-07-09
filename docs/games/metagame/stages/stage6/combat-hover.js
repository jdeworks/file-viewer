// combat-hover.js — Stage 6: the combat card HOVER affordance ("what connects to what"). Wired ONCE to
// the persistent renderer root (the combat DOM rebuilds every state change, so we delegate rather than
// re-attach per mount). Hovering a hand card shows a tooltip (full rules text + keyword glossary) and
// highlights the hand cards it synergizes with, plus the enemy when the card is an attack. Pure view —
// it reads the live combat via a getter and never touches engine/save state.

import { cardById } from "./cards.js";
import { relatedHandIndices, keywordsFor, isAttack, KEYWORDS } from "./combat-synergy.js";

export function installCombatHover(root, getCombat) {
  let tip = null;
  const ensureTip = () => {
    if (!tip) { tip = document.createElement("div"); tip.className = "s6db-tooltip"; tip.hidden = true; root.appendChild(tip); }
    return tip;
  };
  const clear = () => {
    if (tip) tip.hidden = true;
    root.querySelectorAll(".s6db-card--synergy").forEach((el) => el.classList.remove("s6db-card--synergy"));
    root.querySelector(".s6db-enemy--targeted")?.classList.remove("s6db-enemy--targeted");
  };

  root.addEventListener("mouseover", (event) => {
    const cardEl = event.target.closest(".s6db-hand .s6db-card[data-inspect]");
    const combat = getCombat();
    if (!cardEl || !combat || combat.over) return;
    const idx = Number(cardEl.dataset.inspect);
    const id = combat.hand[idx];
    if (id == null) return;
    clear();
    for (const i of relatedHandIndices(id, combat.hand)) {
      if (i === idx) continue;
      root.querySelector(`.s6db-hand .s6db-card[data-inspect="${i}"]`)?.classList.add("s6db-card--synergy");
    }
    if (isAttack(id)) root.querySelector(".s6db-enemy")?.classList.add("s6db-enemy--targeted");
    const card = cardById(id);
    const kw = keywordsFor(id).map((k) => `<b>${esc(k)}</b> — ${esc(KEYWORDS[k] || "")}`).join("<br>");
    const t = ensureTip();
    t.innerHTML = `<strong>${esc(card?.name || id)}</strong>`
      + `<span>${esc(card?.text || "")}</span>`
      + (kw ? `<em class="s6db-tooltip-keys">${kw}</em>` : "");
    const r = cardEl.getBoundingClientRect();
    t.style.left = `${Math.round(r.left + r.width / 2)}px`;
    t.style.top = `${Math.round(r.top - 8)}px`;
    t.hidden = false;
  });

  root.addEventListener("mouseout", (event) => {
    const to = event.relatedTarget;
    if (to && to.closest && to.closest(".s6db-hand .s6db-card")) return; // gliding between hand cards
    clear();
  });
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
