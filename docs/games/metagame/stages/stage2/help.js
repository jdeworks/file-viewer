// "How to play" overlay for the Glyph Dungeon — a quick rules card the player can pop open
// any time. Pure presentation; no state.

const SECTIONS = [
  ["Goal", "Descend 5 floors, then beat THE AMBIGUOUS EXPRESSION at the bottom."],
  ["Move", "Arrow keys, WASD, or the on-screen d-pad. One tile per press."],
  ["Fight", "Walk into a foe to attack (your ATK vs its HP). It hits back — watch your HP. Fast foes (race conditions) strike twice."],
  ["Foes", "s m n are light, L O heavy. Deeper floors add behaviours: y spitters shoot from afar, x segfaults blast on death, a ambushers hide as walls, u fork bombs spawn minions."],
  ["Elites", "Gilded, glowing foes (a prefix like armored/venomous) hit harder but drop a guaranteed weapon + glyph cache. Worth the risk."],
  ["Guardian", "Band floors post a pink Ω guardian by the stairs — huge HP and a trick (it forks minions or splits into shards). Beat it to pass."],
  ["Status", "Poison ☣ / burn ♨ / bleed ✣ tick HP over time even while you stand still — keep moving and heal."],
  ["Hazards", "≈ lava burns, * spores poison, ^ spikes bleed — step around them. A : chasm drops you straight to the next floor (a risky shortcut)."],
  ["Traps", "Invisible until you trip them: dart (damage), alarm (wakes the floor), blink (flings you), pit (drops you a floor). Once sprung they're marked — denser deeper."],
  ["Loot", "Step on / weapons to raise ATK and % glyph shards to earn glyphs. Kills drop glyphs and XP (level up = more HP & ATK)."],
  ["Secret rooms", "Bump a faint, off-colour wall to open a hidden room: a cache, an ambush, a teleport to the stairs, a shrine (trade HP for a buff), a vault (prime loot, elite guards) or a captive ally that fights for you."],
  ["Biomes", "Floors are grouped into bands — Warrens, Flooded Cisterns, Emberworks, the Overflow — each with its own look and rising danger."],
  ["Stairs", "Reach the > stairs to descend. Deeper = harder, better loot. A purple ≣ branch stair (some floors) drops you to a deadlier but much richer floor — your call."],
  ["Runs", "Dying or 'retreat' banks the run's glyphs and draws a fresh dungeon. Banked glyphs are permanent."],
  ["Runes", "Pink ♦ runes are one-shot tools: pick them up, then press 1/2/3 (or the buttons) — blink (escape), firebolt (scorch the nearest foe), freeze (lock foes around you)."],
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
