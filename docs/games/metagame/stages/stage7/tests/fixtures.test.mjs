// fixtures.test.mjs — Stage 7 "The Meridian Estate Affair" case documents. The evidence files live under
// research/case-fixtures/ (authored in-lane; the orchestrator installs them to the viewer example root
// and wires the file→action map). This proves the DATA is coherent with the engine: the filenames the
// stage opens match the fixtures, the Case-3 SEARCH gate actually hits its VOID token, and the boss
// documents carry the contradiction the connect gate claims.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALIBI_STATEMENT_PATH,
  CASE2_SOURCE_PATHS,
  CASE3_SOURCE_PATHS,
  CASE3_SEARCH_PATH,
  CASE3_SEARCH_QUERY,
  ENTITY_ANCHOR_PATH,
  TORN_LETTER_PATH
} from "../messages.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, "../research/case-fixtures");
// The Case-3 search token lives centrally in viewer-actions.js (out of lane); it is documented in the
// fixtures README and asserted here so the fixture data cannot drift away from the search gate.
const SEARCH_TOKEN = "VOID";

const read = async (name) => readFile(resolve(fixtureDir, name), "utf8");

// 1. Every file the stage opens has a matching authored fixture (basename-for-basename).
const opened = [
  ENTITY_ANCHOR_PATH, ALIBI_STATEMENT_PATH, TORN_LETTER_PATH,
  ...Object.values(CASE2_SOURCE_PATHS), ...Object.values(CASE3_SOURCE_PATHS)
];
for (const p of opened) {
  const text = await read(basename(p));
  assert.ok(text.length > 40, `${basename(p)} should be a real, non-trivial document`);
}

// 2. Case-3 SEARCH gate: searching the ledger for the query returns a line that contains the VOID token.
{
  const ledger = await read(basename(CASE3_SEARCH_PATH));
  const hitLine = ledger.split(/\r?\n/).find((l) => l.includes(CASE3_SEARCH_QUERY));
  assert.ok(hitLine, `${basename(CASE3_SEARCH_PATH)} must contain a "${CASE3_SEARCH_QUERY}" line`);
  assert.ok(hitLine.toUpperCase().includes(SEARCH_TOKEN),
    `the "${CASE3_SEARCH_QUERY}" line must contain the "${SEARCH_TOKEN}" token that mints fact:session`);
  assert.ok(/Sennett/i.test(hitLine), "the void voucher is the annuity Mr. Sennett (N) claims honoured");
}

// 3. Case-2 decisive OPEN: the household register proves the estate-agent post is given up (refutes K).
{
  const reg = await read(basename(CASE2_SOURCE_PATHS.route_table_examined));
  assert.ok(/Peverell/i.test(reg) && /given up|CLOSED/i.test(reg), "the register shows Peverell's engagement closed");
  assert.ok(/NO ONE IN SERVICE|vacant/i.test(reg), "the estate-agent post is vacant — K holds no engagement");
}

// 4. The two red-herring clearances live in DIFFERENT Case-3 files.
{
  const customs = await read(basename(CASE3_SOURCE_PATHS.quorum_spec_examined));
  assert.ok(/natural (child|daughter)/i.test(customs) && /recognised/i.test(customs), "customs clears Q (natural daughter)");
  const memo = await read(basename(CASE3_SOURCE_PATHS.audit_examined));
  assert.ok(/principal legatee/i.test(memo) && /sanctioned|proper/i.test(memo), "the memo clears P (principal legatee)");
}

// 5. The boss documents carry the alibi-vs-postmark contradiction the connect gate asserts.
{
  const alibi = await read(basename(ALIBI_STATEMENT_PATH));
  assert.ok(/12th/i.test(alibi) && /(sea|sailed|packet)/i.test(alibi), "the alibi places her at sea on the 12th");
  const letter = await read(basename(TORN_LETTER_PATH));
  assert.ok(/Harwick/i.test(letter) && /14th/i.test(letter), "the letter is postmarked Harwick the 14th");
  assert.ok(/not (stirred|sail)|did not sail/i.test(letter), "the letter proves she never sailed — the contradiction");
}

// 6. SS4 anchor: the appointment record shows the claim rests on a rescinded paper.
{
  const anchor = await read(basename(ENTITY_ANCHOR_PATH));
  assert.ok(/RESCINDED|void/i.test(anchor), "the appointment is rescinded — Miss Marchmain's paper trail breaks");
}

console.log("stage7 fixtures tests passed");
