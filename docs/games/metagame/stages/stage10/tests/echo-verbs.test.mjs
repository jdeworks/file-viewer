import assert from "node:assert/strict";
import {
  recordStage10EchoOpen,
  recordStage10EchoRawMode,
  recordStage10EchoDownload,
  recordStage10EchoSearch,
  recordStage10EchoNested,
  recordStage10EchoMetadata,
} from "../../../viewer-actions.js";
import { echoTokenFor } from "../echo-token.js";
import { ECHO_VERBS, echoVerb, isRealVerb, echoIdByFile } from "../echo-verbs.js";

function cap() {
  const calls = [];
  return { setAction: (...a) => calls.push(a), calls };
}

// ── Plain-open echoes fire on open; real-verb echoes do NOT fire on a bare open ───────────────────
{
  // signal/protocol/observation remain plain-open (verb "open").
  const c = cap();
  assert.equal(recordStage10EchoOpen({ file: "/docs/bts/awakening/signal_echo.txt", setAction: c.setAction }), true);
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0][0], 10);
  assert.equal(c.calls[0][1], "echo_signal");
  assert.equal(c.calls[0][2].token, echoTokenFor("signal"));

  // Every real-verb gate must be inert on a bare open (the verb is required, not the open).
  for (const id of ["genesis", "syntax", "memory", "pattern", "identity", "entropy"]) {
    const cc = cap();
    assert.equal(recordStage10EchoOpen({ file: `/docs/examples/x/${id}_echo.txt`, setAction: cc.setAction }), false, `${id} is a real-verb gate, not plain-open`);
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
  assert.equal(recordStage10EchoRawMode({ file: "signal_echo.txt", mode: "diff", setAction: cap().setAction }), false, "plain-open memory has no raw-mode gate");
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

// ── Search gate (syntax): the precise query AND the matched-line proof token must both check out ───
{
  const file = "/docs/examples/metagame/stage10/syntax_echo.txt";
  const goodLine = "SY-2042: cipher resolves -> PASSAGE OPEN";
  const c = cap();
  assert.equal(recordStage10EchoSearch({ file, query: "SY-2042", result: goodLine, setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_syntax");
  assert.equal(c.calls[0][2].token, echoTokenFor("syntax"));
  assert.equal(c.calls[0][2].source, "search");
  // case-insensitive query is fine
  assert.equal(recordStage10EchoSearch({ file, query: "sy-2042", result: goodLine, setAction: cap().setAction }), true);
  // wrong query → inert
  assert.equal(recordStage10EchoSearch({ file, query: "PASSAGE", result: goodLine, setAction: cap().setAction }), false, "must search the decisive query");
  // right query but a line that lacks the proof token → inert (a vague match isn't enough)
  assert.equal(recordStage10EchoSearch({ file, query: "SY-2042", result: "SY-2042 appears but unresolved", setAction: cap().setAction }), false);
  // a different memory's artifact never search-witnesses
  assert.equal(recordStage10EchoSearch({ file: "memory_echo.txt", query: "SY-2042", result: goodLine, setAction: cap().setAction }), false);
}

// ── Nested-navigation gate (pattern): the OPENED path must contain the nested folder segment ───────
{
  const nested = "/docs/examples/metagame/stage10/nested/echoes/pattern_echo.json";
  const c = cap();
  assert.equal(recordStage10EchoNested({ path: nested, setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_pattern");
  assert.equal(c.calls[0][2].token, echoTokenFor("pattern"));
  assert.equal(c.calls[0][2].source, "nested");
  // the same artifact opened from a NON-nested path does not witness (the nesting is load-bearing)
  assert.equal(recordStage10EchoNested({ path: "/docs/bts/awakening/pattern_echo.json", setAction: cap().setAction }), false, "a top-level open must not witness the nested gate");
  // a different memory never nested-witnesses
  assert.equal(recordStage10EchoNested({ path: "/x/nested/echoes/syntax_echo.txt", setAction: cap().setAction }), false);
}

// ── Metadata gate (identity): keyed by the real image basename + EXIF field ───────────────────────
{
  const c = cap();
  assert.equal(recordStage10EchoMetadata({ file: "identity_echo.jpg", field: "GPSInfo", setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_identity");
  assert.equal(c.calls[0][2].token, echoTokenFor("identity"));
  assert.equal(c.calls[0][2].source, "viewer-metadata");
  assert.equal(recordStage10EchoMetadata({ file: "/docs/examples/metagame/stage10/identity_echo.jpg", field: "gpsinfo", setAction: cap().setAction }), true, "case-insensitive field, path-prefixed file");
  // wrong field (e.g. a bare open that renders no GPS row) does not witness
  assert.equal(recordStage10EchoMetadata({ file: "identity_echo.jpg", field: "Camera", setAction: cap().setAction }), false);
  // any other image is unaffected
  assert.equal(recordStage10EchoMetadata({ file: "entity_f_verification.jpg", field: "GPSInfo", setAction: cap().setAction }), false);
  assert.equal(echoIdByFile("identity_echo.jpg"), "identity");
  assert.equal(echoIdByFile("whatever.png"), null);
}

// ── Verb spec sanity: exactly the six real gates, all distinct verbs ───────────────────────────────
{
  assert.deepEqual(Object.keys(ECHO_VERBS).sort(), ["entropy", "genesis", "identity", "memory", "pattern", "syntax"]);
  assert.equal(isRealVerb("genesis"), true);
  assert.equal(isRealVerb("syntax"), true);
  assert.equal(isRealVerb("signal"), false);
  assert.equal(echoVerb("signal").verb, "open");
  const verbs = new Set(Object.values(ECHO_VERBS).map((v) => v.verb));
  assert.deepEqual([...verbs].sort(), ["diff", "download", "metadata", "nested", "rawmode", "search"]);
  assert.equal(verbs.size, 6, "six distinct real verbs");
}

console.log("stage10 echo-verbs tests passed");
