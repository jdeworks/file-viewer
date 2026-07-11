import assert from "node:assert/strict";
import {
  // NOTE (stage renumbering): this stage is now id 9, but recordStage10EchoRawMode/Download/Search/
  // Metadata keep their original names — general-lane files (docs/core/rawpane.js,
  // docs/core/viewer-open.js, docs/types/image/metadata.js) import them by exact name. Only the
  // functions used solely within viewer-actions.js were renamed (recordStage9EchoOpen/Nested). See
  // the equivalent note in viewer-actions.js.
  recordStage9EchoOpen,
  recordStage10EchoRawMode,
  recordStage10EchoDownload,
  recordStage10EchoSearch,
  recordStage9EchoNested,
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
  assert.equal(recordStage9EchoOpen({ file: "/docs/bts/awakening/signal_echo.txt", setAction: c.setAction }), true);
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0][0], 9);
  assert.equal(c.calls[0][1], "echo_signal");
  assert.equal(c.calls[0][2].token, echoTokenFor("signal"));

  // Every real-verb gate must be inert on a bare open (the verb is required, not the open).
  for (const id of ["genesis", "syntax", "memory", "pattern", "identity"]) {
    const cc = cap();
    assert.equal(recordStage9EchoOpen({ file: `/docs/examples/x/${id}_echo.txt`, setAction: cc.setAction }), false, `${id} is a real-verb gate, not plain-open`);
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
}

// NOTE: the "download" verb (recordStage10EchoDownload) has no test here — its one user, the
// Entropy Field memory, was removed in the 2026-07-11 stage renumbering (see echo-verbs.js). The
// function itself is kept as generic infrastructure for a future memory; nothing currently exercises
// it, so there is nothing real to assert against.

// ── Search gate (syntax): the precise query AND the matched-line proof token must both check out ───
{
  const file = "/docs/examples/metagame/stage9/syntax_echo.txt";
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
  const nested = "/docs/examples/metagame/stage9/nested/echoes/pattern_echo.json";
  const c = cap();
  assert.equal(recordStage9EchoNested({ path: nested, setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_pattern");
  assert.equal(c.calls[0][2].token, echoTokenFor("pattern"));
  assert.equal(c.calls[0][2].source, "nested");
  // the same artifact opened from a NON-nested path does not witness (the nesting is load-bearing)
  assert.equal(recordStage9EchoNested({ path: "/docs/bts/awakening/pattern_echo.json", setAction: cap().setAction }), false, "a top-level open must not witness the nested gate");
  // a different memory never nested-witnesses
  assert.equal(recordStage9EchoNested({ path: "/x/nested/echoes/syntax_echo.txt", setAction: cap().setAction }), false);
}

// ── Metadata gate (identity): keyed by the real image basename + EXIF field ───────────────────────
{
  const c = cap();
  assert.equal(recordStage10EchoMetadata({ file: "identity_echo.jpg", field: "GPSInfo", setAction: c.setAction }), true);
  assert.equal(c.calls[0][1], "echo_identity");
  assert.equal(c.calls[0][2].token, echoTokenFor("identity"));
  assert.equal(c.calls[0][2].source, "viewer-metadata");
  assert.equal(recordStage10EchoMetadata({ file: "/docs/examples/metagame/stage9/identity_echo.jpg", field: "gpsinfo", setAction: cap().setAction }), true, "case-insensitive field, path-prefixed file");
  // wrong field (e.g. a bare open that renders no GPS row) does not witness
  assert.equal(recordStage10EchoMetadata({ file: "identity_echo.jpg", field: "Camera", setAction: cap().setAction }), false);
  // any other image is unaffected
  assert.equal(recordStage10EchoMetadata({ file: "entity_f_verification.jpg", field: "GPSInfo", setAction: cap().setAction }), false);
  assert.equal(echoIdByFile("identity_echo.jpg"), "identity");
  assert.equal(echoIdByFile("whatever.png"), null);
}

// ── Verb spec sanity: exactly the five real gates, all distinct verbs ────────────────────────────
{
  assert.deepEqual(Object.keys(ECHO_VERBS).sort(), ["genesis", "identity", "memory", "pattern", "syntax"]);
  assert.equal(isRealVerb("genesis"), true);
  assert.equal(isRealVerb("syntax"), true);
  assert.equal(isRealVerb("signal"), false);
  assert.equal(echoVerb("signal").verb, "open");
  const verbs = new Set(Object.values(ECHO_VERBS).map((v) => v.verb));
  assert.deepEqual([...verbs].sort(), ["diff", "metadata", "nested", "rawmode", "search"]);
  assert.equal(verbs.size, 5, "five distinct real verbs");
}

console.log("stage9 echo-verbs tests passed");
