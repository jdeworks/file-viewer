// The SINGLE authority for applying an inbound echo action to Stage-10 state. Used by index.js's
// action subscription. Extracted (and exported) so the load-bearing gate is unit-testable:
//
//   • Anti-spoof: only a genuine viewer action carries the per-memory token (echo-token.js). A
//     forged/incomplete action — including a bare Phase B button click that merely OPENS the file
//     without performing the gated verb — has no valid token and is rejected here.
//   • Phase B (fragmentation) re-witness happens ONLY through this path, never on click. That closes
//     the round-3 bypass where clicking "Re-open echo →" advanced the fight unconditionally.
import { witnessEcho } from "./boss.js";
import { rewitnessFragmentation } from "./confront.js";
import { verifyEchoToken } from "./echo-token.js";
import { STAGE_ID } from "./messages.js";

export function onEchoAction({ state, detail, save = null }) {
  if (!detail || Number(detail.stage) !== STAGE_ID) return { ignored: true };
  const action = String(detail.action || "");
  if (!action.startsWith("echo_")) return { ignored: true };
  const memoryId = action.slice(5);
  // A real viewer action stamps the matching token; a spoof (no/wrong token) witnesses nothing.
  if (!verifyEchoToken(memoryId, detail.token)) return { spoofed: true, memoryId };
  const witnessed = witnessEcho({ state, memoryId }).ok;
  let rewitnessed = false;
  if (state?.confront?.phase === "fragmentation") {
    rewitnessed = rewitnessFragmentation({ state, memoryId, save }).ok;
  }
  return { memoryId, witnessed, rewitnessed };
}
