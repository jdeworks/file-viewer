// "understand" route epilogue. Weaves the player's nine chosen reflections (Genesis → Observation
// order) into one Synthesis memory, closed by a line keyed to the Phase C self-model stance.
// Pure + deterministic: output depends only on state.memories[id].choice + state.confront.stance.
import { memories } from "./content.js";
import { stanceProfiles } from "./content-confront.js";

const RESOLVED = new Set(["resolved", "integrated"]);

export function assembleSynthesis(state) {
  const parts = memories
    .map((m) => {
      const slot = state?.memories?.[m.id];
      const resolved = RESOLVED.has(slot?.state);
      const choice = resolved ? slot.choice : null;
      const reflection = choice ? (m.reflections?.[choice] || m.resolvedText) : null;
      return { id: m.id, stage: m.stage, title: m.title, choice, reflection };
    })
    .filter((p) => p.reflection);

  const dominant = state?.confront?.stance?.dominant || null;
  const profile = dominant ? stanceProfiles[dominant] : null;
  const closer = profile?.closer || null;

  const paragraphs = parts.map((p) => p.reflection);
  if (closer) paragraphs.push(closer);

  return {
    stance: dominant,
    stanceLabel: profile?.label || null,
    parts,
    closer,
    text: paragraphs.join("\n\n")
  };
}
