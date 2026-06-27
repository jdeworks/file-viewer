import assert from "node:assert/strict";
import { recordStage10EchoOpen, recordStage10EchoRawMode, recordStage10EchoDownload } from "../../../viewer-actions.js";
import { echoTokenFor } from "../echo-token.js";
import { ECHO_VERBS, echoVerb, isRealVerb } from "../echo-verbs.js";

function cap() {
  const calls = [];
  return { setAction: (...a) => calls.push(a), calls };
}

// ── Plain-open echoes fire on open; real-verb echoes do NOT fire on a bare open ───────────────────
{
  const c = cap();
  assert.equal(recordStage10EchoOpen({ file: "/docs/bts/awakening/syntax_echo.txt", setAction: c.setAction }), true);
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0][0], 10);
  assert.equal(c.calls[0][1], "echo_syntax");
  assert.equal(c.calls[0][2].token, echoTokenFor("syntax"));

  for (const id of ["genesis", "memory", "entropy"]) {
    const cc = cap();
    assert.equal(recordStage10EchoOpen({ file: `/docs/bts/awakening/${id}_echo.txt`, setAction: cc.setAction }), false, `${id} is a real-verb gate, not plain-open`);
    assert.equal(cc.calls.length, 0);
  }
}

// ── Raw-mode gate: genesis → Original, memory → Diff (incl. move-aware); wrong mode/memory is inert ─
{
  const c = cap();
  assert.equal(recordStage10EchoRawMode({ file: "awakening/genesis_echo.txt", mode: "original", setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_genesis");
  assert.equal(c.calls[0][2].token, echoTokenFor("genesis"));
  assert.equal(c.calls[0][2].mode, "original");

  assert.equal(recordStage10EchoRawMode({ file: "genesis_echo.txt", mode: "diff", setAction: cap().setAction }), false, "genesis needs Original, not Diff");
  assert.equal(recordStage10EchoRawMode({ file: "memory_echo.txt", mode: "diff", setAction: cap().setAction }), true);
  assert.equal(recordStage10EchoRawMode({ file: "memory_echo.txt", mode: "movediff", setAction: cap().setAction }), true, "move-aware diff counts");
  assert.equal(recordStage10EchoRawMode({ file: "memory_echo.txt", mode: "current", setAction: cap().setAction }), false);
  assert.equal(recordStage10EchoRawMode({ file: "syntax_echo.txt", mode: "diff", setAction: cap().setAction }), false, "plain-open memory has no raw-mode gate");
  assert.equal(recordStage10EchoRawMode({ file: "entropy_echo.txt", mode: "diff", setAction: cap().setAction }), false, "download memory has no raw-mode gate");
}

// ── Download gate: entropy only ───────────────────────────────────────────────────────────────────
{
  const c = cap();
  assert.equal(recordStage10EchoDownload({ file: "awakening/entropy_echo.txt", setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_entropy");
  assert.equal(c.calls[0][2].token, echoTokenFor("entropy"));
  assert.equal(recordStage10EchoDownload({ file: "genesis_echo.txt", setAction: cap().setAction }), false);
  assert.equal(recordStage10EchoDownload({ file: "syntax_echo.txt", setAction: cap().setAction }), false);
  assert.equal(recordStage10EchoDownload({ file: "nope.txt", setAction: cap().setAction }), false);
}

// ── Verb spec sanity: exactly the three real gates, all distinct verbs ─────────────────────────────
{
  assert.deepEqual(Object.keys(ECHO_VERBS).sort(), ["entropy", "genesis", "memory"]);
  assert.equal(isRealVerb("genesis"), true);
  assert.equal(isRealVerb("pattern"), false);
  assert.equal(echoVerb("pattern").verb, "open");
  const verbs = new Set(Object.values(ECHO_VERBS).map((v) => v.verb));
  assert.equal(verbs.size, 3, "three distinct real verbs (rawmode, diff, download)");
}

console.log("stage10 echo-verbs tests passed");
