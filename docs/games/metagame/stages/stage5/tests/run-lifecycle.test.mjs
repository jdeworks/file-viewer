import assert from "node:assert/strict";
import { beginProtocolRun, currentDailyKey, recordProtocolScore } from "../run-lifecycle.js";

function makeState(over = {}) {
  return {
    meta: {
      runsStarted: 0, runsCleared: 0, protocolVersion: 0, permanentUpgrades: [],
      bestScore: 0, dailyBest: {}, ...over,
    },
    ui: { screen: "hub" },
    run: null,
  };
}

{
  const state = makeState();
  const run = beginProtocolRun({ state, mode: "daily", dailyKeyOverride: "2030-02-03" });
  assert.equal(run.dailyKey, "2030-02-03", "daily key can be pinned deterministically");
  assert.equal(run.finalAct, 4, "a first-ever run ends at the act-4 story boss");
  assert.equal(state.ui.screen, "run");
  const again = makeState();
  beginProtocolRun({ state: again, mode: "daily", dailyKeyOverride: "2030-02-03" });
  assert.equal(again.run.seed, run.seed, "the same daily key reproduces the same seed");
}

{
  const state = makeState({ runsCleared: 1, protocolVersion: 2, permanentUpgrades: [0] });
  const run = beginProtocolRun({ state, ascensionLevel: 4, mode: "custom", seedText: "  replay me  " });
  assert.equal(run.dailyKey, "replay me", "custom seed text is trimmed");
  assert.equal(run.finalAct, 6, "veteran runs retain all six acts");
  assert.equal(run.version, 2);
  assert.equal(run.ascension, 4);
  assert.match(run.deck[0], /\+$/, "permanent starting-card upgrade is folded into the new run");
}

{
  const meta = { bestScore: 0, dailyBest: {} };
  const score = recordProtocolScore(meta, {
    status: "won", finalAct: 4, act: 4, handshakes: 25, hp: 30,
    ascension: 0, mode: "custom", dailyKey: "replay me",
  });
  assert.equal(score, 255);
  assert.equal(meta.bestScore, score);
  assert.equal(meta.dailyBest["replay me"], score);
  assert.equal(meta.lastMode, "custom");
}

assert.equal(currentDailyKey("pinned"), "pinned");
console.log("stage5 run lifecycle tests passed");
