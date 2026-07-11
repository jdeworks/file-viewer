// "expand" route epilogue. A personalized grid of all nine stages with the player's specific stance
// and integration status — two players who both chose "expand" see different panels. Pure: reads
// only state.memories[id] (+ confront.stance for the headline flavor). No Date.now()/Math.random().
import { memories } from "./content.js";
import { stanceProfiles } from "./content-confront.js";

const RESOLVED = new Set(["resolved", "integrated"]);

export function assembleCapstoneData(state) {
  const tiles = memories.map((m) => {
    const slot = state?.memories?.[m.id];
    const resolved = RESOLVED.has(slot?.state);
    return {
      id: m.id,
      stage: m.stage,
      title: m.title,
      accent: m.accent,
      choice: resolved ? slot.choice : null,
      integrated: slot?.state === "integrated"
    };
  });
  const dominant = state?.confront?.stance?.dominant || null;
  const profile = dominant ? stanceProfiles[dominant] : null;
  return {
    tiles,
    integratedCount: tiles.filter((t) => t.integrated).length,
    resolvedCount: tiles.filter((t) => t.choice).length,
    stance: dominant,
    stanceLabel: profile?.label || null
  };
}
