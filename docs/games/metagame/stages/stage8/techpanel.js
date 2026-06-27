// techpanel.js — Stage 8 Entropy Field: the tech-tree panel paint (DOM out from state in). Pure
// render; renderer.js owns the click delegation ([data-tech] → buyTech). Split out of paint.js so the
// paint files stay small (CLAUDE.md ≤300 LOC).

import { techStatus } from "./tech.js";

const BRANCH_LABEL = { repair: "REPAIR", thermal: "THERMAL", salvage: "SALVAGE", topology: "TOPOLOGY" };
const REASON_HINT = {
  requires: "needs prerequisite",
  "needs-archive": "archive by hand first",
  insight: "more Insight",
  scrap: "more Scrap"
};

export function paintTech(el, state) {
  if (!el) return;
  const techs = techStatus(state);
  const branches = ["repair", "thermal", "salvage", "topology"];
  el.replaceChildren(...branches.map((branch) => {
    const col = document.createElement("div");
    col.className = "s8-tech-branch";
    const head = document.createElement("h4");
    head.textContent = BRANCH_LABEL[branch] || branch;
    col.append(head);
    for (const t of techs.filter((x) => x.branch === branch)) col.append(techRow(t));
    return col;
  }));
}

function techRow(t) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "s8-tech-item";
  btn.dataset.tech = t.id;
  if (t.owned) btn.classList.add("is-owned");
  btn.disabled = t.owned || !t.canBuy;
  const status = t.owned ? "✓ owned" : `${t.insight}◈ ${t.scrap}⛭`;
  const blocked = !t.owned && !t.canBuy && t.reason ? ` · ${REASON_HINT[t.reason] || t.reason}` : "";
  btn.innerHTML = `<span class="s8-tech-name">${t.label}</span>` +
    `<span class="s8-tech-cost">${status}${blocked}</span>` +
    `<span class="s8-tech-desc">${t.desc}</span>`;
  return btn;
}
