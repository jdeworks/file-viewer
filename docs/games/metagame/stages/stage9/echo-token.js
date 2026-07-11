// Per-memory ECHO TOKENS — anti-spoof for the load-bearing echo gate (and Phase B re-witness).
//
// Opening a memory's real artifact in the viewer fires echo_<id> (viewer-actions.recordStage9Echo-
// Open). To stop a trivial console spoof — `setAction(9, 'echo_genesis', {})` — from forging that
// signal, the REAL open stamps the memory's token into the action detail; the Stage-9 subscription
// (index.js) only witnesses when the carried token matches. The token travels WITH the real open via
// the existing action detail, so the genuine viewer-open path is unchanged.
//
// Pure + deterministic: a static function of the memory id only (no per-save seed — viewer-actions
// has no game state). Not a cryptographic secret (impossible client-side); it raises the bar from
// "trivial one-liner" to "must mirror the derivation", which is the realistic anti-spoof goal here.

export function echoTokenFor(id) {
  const key = `stage9-echo:${String(id)}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `e${(h >>> 0).toString(36)}`;
}

export function verifyEchoToken(id, token) {
  return typeof token === "string" && token.length > 0 && token === echoTokenFor(id);
}
