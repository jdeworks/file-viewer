import assert from "node:assert/strict";
import { echoTokenFor, verifyEchoToken } from "../echo-token.js";
import { memories } from "../content.js";

// Deterministic + non-empty + distinct per memory.
{
  const seen = new Set();
  for (const m of memories) {
    const t = echoTokenFor(m.id);
    assert.equal(typeof t, "string");
    assert.ok(t.length > 1, `token for ${m.id} too short`);
    assert.equal(echoTokenFor(m.id), t, "deterministic");
    assert.ok(!seen.has(t), `token collision for ${m.id}`);
    seen.add(t);
  }
}

// verifyEchoToken: only the exact matching token passes; absent/wrong/cross-memory tokens fail.
{
  assert.equal(verifyEchoToken("genesis", echoTokenFor("genesis")), true);
  assert.equal(verifyEchoToken("genesis", echoTokenFor("syntax")), false, "another memory's token");
  assert.equal(verifyEchoToken("genesis", "bogus"), false);
  assert.equal(verifyEchoToken("genesis", ""), false);
  assert.equal(verifyEchoToken("genesis", undefined), false);
  assert.equal(verifyEchoToken("genesis", null), false);
  assert.equal(verifyEchoToken("nope", echoTokenFor("nope")), true, "verify is purely id↔token");
}

console.log("stage10 echo-token tests passed");
