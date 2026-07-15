import {
  damageBoss,
  getBossLockState,
  recordBossAttempt
} from "../boss.js";
import { defaultState } from "../state.js";

let failed = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"} ${message}`);
  if (!condition) failed += 1;
};

{
  const state = defaultState();
  const lock = getBossLockState({ state });
  ok(lock.defeatPossible === true, "boss is always defeatable once reached");
  ok(lock.phase === 1 && /counterattack|persists/i.test(lock.hint), "boss exposes the in-game risk rule");
}

{
  const state = defaultState();
  recordBossAttempt(state);
  recordBossAttempt(state);
  ok(state.run.boss.reached === true && state.run.boss.attempts === 2, "attempts are counted");
}

{
  const state = defaultState();
  state.run.boss.phase = 3;
  state.run.boss.hp = 20;
  const result = damageBoss({ state, amount: 20 });
  ok(result.defeated === true, "boss phase 3 can be defeated through normal damage");
  ok(state.meta.firstClearComplete === true, "defeat marks first clear in stage state");
  ok(state.meta.glyphsBanked === 25, "defeat grants 25 glyphs");
}

console.log(failed ? `\nSTAGE 2 BOSS FAILED (${failed})` : "\nSTAGE 2 BOSS PASSED");
if (failed) process.exit(1);
