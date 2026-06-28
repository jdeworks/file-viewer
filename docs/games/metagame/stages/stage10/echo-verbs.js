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
  // Syntax (stage 2, the cipher): ask the precise question — SEARCH the file for the decisive token.
  // `query` is what the player searches for; `token` must appear in the matched line to prove it found
  // the real answer (a vague glance never surfaces it). Witnessed by recordStage10EchoSearch.
  syntax: { verb: "search", query: "SY-2042", token: "PASSAGE OPEN", label: "Search", hint: "search the file for SY-2042 to surface the answer" },
  // Memory (stage 3, before/after): compare current vs original with the Diff view.
  memory: { verb: "diff", mode: "diff", label: "Diff", hint: "switch the raw pane to the Diff (⇄) view" },
  // Pattern (stage 4, recursion): the answer was deeper than the root — open the artifact through the
  // repeating NESTED folder path. `path` is the folder segment the opened path must contain (so a
  // top-level open never witnesses). Witnessed by recordStage10EchoNested.
  pattern: { verb: "nested", path: "stage10/nested/echoes", label: "Nested path", hint: "open it through the nested folder path (deeper than the root)" },
  // Identity (stage 7, surfaces lie): read the buried EXIF — open the METADATA drawer on a real image.
  // `file` is the artifact basename; `field` is the EXIF row that must render. Witnessed by
  // recordStage10EchoMetadata from the image metadata renderer (not a bare open).
  identity: { verb: "metadata", file: "identity_echo.jpg", field: "GPSInfo", label: "Metadata", hint: "open the metadata drawer to read the embedded GPS EXIF" },
  // Entropy (stage 8, salvage): download the fragment to keep it.
  entropy: { verb: "download", label: "Download", hint: "download it (salvage the fragment to disk)" },

  // TODO round-5: the last real-feature gates, each paying off its origin stage —
  //   signal  → audio PLAYBACK (real .mp3 exists at stage10/signal_echo.mp3; needs a media-renderer
  //             hook + a way to drive ~Ns of continuous playback in the games smoke without flaking)
  //   protocol→ EPUB render (real .epub exists; needs an epub chapter-nav hook + smoke driving)
  //   observation → RECENTS re-open (the app has NO recents panel yet; needs that feature first)
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

// Map an opened artifact's basename back to the memory whose verb spec names it (spec.file). Used by
// the metadata gate (identity → identity_echo.jpg), where the artifact is a real image, not a
// <id>_echo-named text file that stage10EchoMemoryId could parse.
export function echoIdByFile(name) {
  const base = String(name || "").split(/[\\/]/).pop();
  for (const [id, spec] of Object.entries(ECHO_VERBS)) {
    if (spec.file && spec.file === base) return id;
  }
  return null;
}
