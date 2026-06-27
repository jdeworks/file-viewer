// Single source of truth for Stage 10 echo VERBS — the DISTINCT real app action that witnesses each
// memory's echo. This is the core of Stage 10's "the host app IS the game" design: a finale that
// explicitly exercises the specific viewer skills the player learned across stages 1–9, rather than
// collapsing all nine echoes into identical text-file opens.
//
// Imported by BOTH the stage renderer (to hint the verb) and viewer-actions.js (to fire the echo
// only when the genuine verb actually happens). Pure constant data — no per-save state — so the two
// inlined copies (stage bundle + external viewer-actions) stay deterministic and in lock-step.
//
// A memory listed here is witnessed ONLY by its verb; a plain viewer-open does nothing for it. A
// memory NOT listed falls back to verb "open" (witnessed by opening its artifact in the viewer).

export const ECHO_VERBS = {
  // Genesis (stage 1, the first source): read the raw, as-loaded original in the raw pane.
  genesis: { verb: "rawmode", mode: "original", label: "Raw · Original", hint: "switch the raw pane to the Original (⟲) view" },
  // Memory (stage 3, before/after): compare current vs original with the Diff view.
  memory: { verb: "diff", mode: "diff", label: "Diff", hint: "switch the raw pane to the Diff (⇄) view" },
  // Entropy (stage 8, salvage): download the fragment to keep it.
  entropy: { verb: "download", label: "Download", hint: "download it (salvage the fragment to disk)" },

  // TODO round-5: real-feature gates for the remaining echoes, each paying off its origin stage —
  //   syntax  → in-file SEARCH (needs the artifact loadable by searchViewerFile / a rawview-text path)
  //   pattern → NESTED navigation (open a file under a nested folder path)
  //   signal  → audio PLAYBACK (needs a real .mp3 artifact + a binary BTS open path)
  //   protocol→ EPUB render (needs a real .epub artifact)
  //   identity→ METADATA inspection (needs a real image artifact; reuse stage 7's metadata hook)
  //   observation → RECENTS re-open (needs a recents-panel open carrying source: 'recents')
  // Until then these witness on a plain viewer-open (verb: "open").
};

export function echoVerb(id) {
  return ECHO_VERBS[id] || { verb: "open" };
}

// True when an echo is a real DISTINCT feature gate (not a plain open).
export function isRealVerb(id) {
  return Boolean(ECHO_VERBS[id]);
}

// Does an observed raw-pane mode satisfy a memory's required mode? Diff accepts the move-aware diff
// too; an explicit rawmode (e.g. "original") must match exactly.
export function rawModeMatches(spec, mode) {
  if (!spec) return false;
  if (spec.verb === "diff") return mode === "diff" || mode === "movediff";
  if (spec.verb === "rawmode") return mode === spec.mode;
  return false;
}
