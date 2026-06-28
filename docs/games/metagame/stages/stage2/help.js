// "How to play" overlay for the Glyph Dungeon — a quick rules card the player can pop open
// any time. Pure presentation; no state.

const SECTIONS = [
  ["Goal", "Descend 9 floors across three acts — the Warrens, the Cisterns &amp; Emberworks, then the Overflow — and beat THE AMBIGUOUS EXPRESSION at the bottom. Each act ends with a Ω guardian on the stairs."],
  ["Move", "Arrow keys, WASD, or the on-screen d-pad. One tile per press."],
  ["Fight", "Walk into a foe to attack (your ATK vs its HP). It hits back — watch your HP. Fast foes (race conditions) strike twice."],
  ["Foes", "s m n are light, L O heavy. Deeper floors add behaviours: y spitters shoot from afar, x segfaults blast on death, a ambushers hide as walls, u fork bombs spawn minions."],
  ["Overflow foes", "Act III adds three dark-dwellers: e light eater — feeds on darkness and grows; torchlight starves it. M mirror — copies most of YOUR attack power back at you; don't out-gear yourself into a beating. ψ null phantom — fast and leaves NO ghost trail, but a lit torch pins (slows) it."],
  ["Elites", "Gilded, glowing foes (a prefix like armored/venomous) hit harder but drop a guaranteed weapon + glyph cache. Worth the risk."],
  ["Guardian", "Each act caps in a pink Ω guardian by the stairs — huge HP and a trick that escalates with the act: it forks/splits (Act I), explodes &amp; splits (Act II), or feeds on the dark &amp; leaves no ghost (Act III). Beat it to pass."],
  ["Factions", "Foes come in two rival camps (red vs orange). When they're not chasing you they fight each other — lead a pack past a rival and let them thin each other out."],
  ["Status", "Poison ☣ / burn ♨ / bleed ✣ tick HP over time even while you stand still — keep moving and heal. ❄ frozen/slowed and ✦ stunned keep a foe from acting."],
  ["Hazards", "≈ lava burns, * spores poison, ^ spikes bleed — step around them. A : chasm drops you straight to the next floor (a risky shortcut). In the Overflow, ○ void rifts snuff your torch and leave you reeling in the dark."],
  ["Ice (Cisterns)", "The flooded Cisterns (floors 4-6) are dotted with ~ wet cells. A freeze rune glazes nearby wet cells into ice. Anything that steps on ice SLIDES one more cell in its heading — slide a chasing foe into a : chasm for an instant kill, or into a wall to stun it. You slide too, so memorise the ice."],
  ["Traps", "Invisible until you trip them: dart (damage), alarm (wakes the floor), blink (flings you), pit (drops you a floor). Once sprung they're marked — denser deeper."],
  ["Loot", "Step on / weapons to raise ATK and % glyph shards to earn glyphs. Kills drop glyphs and XP (level up = more HP & ATK)."],
  ["Affixes", "Some weapons carry an on-hit affix — vampiric (lifesteal), cleaving (hit adjacent foes), burning, knockback, double-strike, frost or acid. The one you pick up last is active; deeper weapons roll affixes more often."],
  ["Secret rooms", "Bump a faint, off-colour wall to open a hidden room: a cache, an ambush, a teleport to the stairs, a shrine (trade HP for a buff), a vault (prime loot, elite guards) or a captive ally that fights for you."],
  ["Biomes", "Floors are grouped into bands — Warrens, Flooded Cisterns, Emberworks, the Overflow — each with its own look and rising danger."],
  ["Darkness", "From the Overflow act (floor 7+) your sight collapses to a tight ring around @. Foes beyond it are hidden — but a dim ? ghost marks the last tile you saw each one on, so spatial memory is the skill. Light a † torch to flood a wide ring."],
  ["Torches", "† torches are the Overflow's key tool (found from floor 5, common from floor 7). A lit torch widens your sight for a stretch of steps — but its glare draws foes from much farther, so light is a tradeoff, not a freebie. Save some for the boss approach; a void rift will snuff one instantly."],
  ["Stairs", "Reach the > stairs to descend. Deeper = harder, better loot. A purple ≣ branch stair (some floors) drops you to a deadlier but much richer floor — your call."],
  ["Runs", "Dying or 'retreat' banks the run's glyphs and draws a fresh dungeon. Banked glyphs are permanent."],
  ["Runes", "♦ runes are one-shot tools: pick them up, then press 1-5 (or the buttons). 1 blink (escape), 2 firebolt (scorch the nearest foe), 3 freeze (lock foes around you + glaze wet cells to ice), 4 † torch (light the dark), 5 acid flask (corrode foes so your next hit lands amplified)."],
  ["Combos", "Systems chain: firebolt a * spore field to roast a pack; freeze then SHATTER a frozen foe (or acid-corrode first for an even bigger crack); freeze a wet cell into ice and slide a chaser into a chasm."],
  ["Fire", "A firebolt lights its target's tile, and flames spread through * spore fields — chain a firebolt into a spore cluster to roast a whole pack (but mind your own footing)."],
  ["Shop", "Spend banked glyphs on permanent upgrades — they apply on your next run."],
  ["Heat", "In the shop you can toggle opt-in difficulty modifiers (more monsters, no potions, elite storm). Each active one multiplies the glyphs you bank — risk for reward."],
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
