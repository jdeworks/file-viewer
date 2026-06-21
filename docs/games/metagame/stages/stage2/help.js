// "How to play" overlay for the Glyph Dungeon — a quick rules card the player can pop open
// any time. Pure presentation; no state.

const SECTIONS = [
  ["Goal", "Descend 5 floors, then beat THE AMBIGUOUS EXPRESSION at the bottom."],
  ["Move", "Arrow keys, WASD, or the on-screen d-pad. One tile per press."],
  ["Fight", "Walk into a foe to attack (your ATK vs its HP). It hits back — watch your HP. Fast foes (race conditions) strike twice."],
  ["Foes", "s m n r are light; L O are heavy. Deeper floors spawn tougher ones."],
  ["Loot", "Step on / weapons to raise ATK and % glyph shards to earn glyphs. Kills drop glyphs and XP (level up = more HP & ATK)."],
  ["Stairs", "Reach the > stairs to descend. Deeper = harder, better loot."],
  ["Runs", "Dying or 'retreat' banks the run's glyphs and draws a fresh dungeon. Banked glyphs are permanent."],
  ["Shop", "Spend banked glyphs on permanent upgrades — they apply on your next run."],
  ["Boss", "It starts LOCKED. Open cipher.txt and read it to find the PASSAGE — that opens the boss. Then 'challenge boss'."]
];

export function buildHelpPanel({ onClose }) {
  const box = document.createElement("div");
  box.className = "s2-help";
  box.innerHTML = `
    <div class="s2-help-head">HOW TO PLAY
      <button type="button" data-help="close" class="s2-help-x" aria-label="close help">&#10005;</button>
    </div>
    <dl class="s2-help-list">
      ${SECTIONS.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}
    </dl>`;
  box.querySelector('[data-help="close"]').addEventListener("click", () => onClose());
  return { el: box };
}
