// renderer-open.js — Stage 5 host-app openers + a tiny once() latch, split out of renderer.js to
// keep it under the 500-LOC cap. openEpub is the load-bearing un-cheat trigger: it records the ch9
// read action + unlocks the negotiation, then opens the epub in the real viewer.

import { applyProtocolChapter9Unlock } from "./boss.js";
import { ACTION_NAME, BTS_PATH, EPUB_PATH } from "./messages.js";

export function openEpub({ viewer, actions, achievements, bell, state }) {
  actions?.setAction?.(5, ACTION_NAME, { source: "stage5-codex", file: EPUB_PATH, chapter: 9 });
  applyProtocolChapter9Unlock({ state, achievements, bell });
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(EPUB_PATH, { source: "stage5" });
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(EPUB_PATH, { source: "stage5" });
}

export function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(5);
  else if (bts && typeof bts.openBts === "function") bts.openBts(5);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

// Wrap fn so it runs at most once (stage-completion callback guard).
export function once(fn) {
  let called = false;
  return (value) => { if (called) return; called = true; fn(value); };
}
