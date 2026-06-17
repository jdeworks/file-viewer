import assert from 'node:assert/strict';
import {
  defaultState,
  normalizeState,
  parseCheatConfig,
  shouldDisableCheat,
  stageMeta,
} from '../../../docs/games/metagame/stages/stage1/index.js';

const enabled = ['CHEAT=true', 'CHEAT=1', 'CHEAT=yes', 'CHEAT=on', "CHEAT='true'", ' cheat = "YES" '];
for (const source of enabled) {
  const parsed = parseCheatConfig(source);
  assert.equal(parsed.cheatActive, true, `${source} keeps cheat active`);
  assert.equal(shouldDisableCheat(source), false, `${source} does not disable`);
}

const disabled = ['', 'no cheat here', 'CHEAT=', 'CHEAT=false', 'CHEAT=0', 'CHEAT=no', 'CHEAT=off', "CHEAT='off'"];
for (const source of disabled) {
  const parsed = parseCheatConfig(source);
  assert.equal(parsed.disabled, true, `${source || '<empty>'} disables cheat`);
  assert.equal(shouldDisableCheat(source), true, `${source || '<empty>'} should disable`);
}

{
  const state = defaultState({ now: 123 });
  assert.deepEqual(state.bits, { m: 0, e: 0 });
  assert.deepEqual(state.totalBits, { m: 0, e: 0 });
  assert.equal(state.runStartedAt, 123);
  assert.equal(state.tabsUnlocked, false);
  assert.equal('version' in state, false);
  assert.equal('stage' in state, false);
  assert.equal('defeated' in state, false);
  assert.equal('achievements' in state, false);
}

{
  const state = normalizeState({
    version: 2,
    stage: 1,
    defeated: [1],
    achievements: ['legacy'],
    bits: 25,
    totalBits: 200,
    owned: { 's1-cursor': 2, 's1-mult': 1 },
  }, { now: 456 });
  assert.deepEqual(state.bits, { m: 25, e: 0 });
  assert.deepEqual(state.totalBits, { m: 200, e: 0 });
  assert.equal(state.owned['s1-mult'], 3);
  assert.equal('s1-cursor' in state.owned, false);
  assert.equal('version' in state, false);
  assert.equal('stage' in state, false);
  assert.equal('defeated' in state, false);
  assert.equal('achievements' in state, false);
}

assert.equal(stageMeta.requiredAction, '1.cheat_disabled');
assert.equal(stageMeta.bossName, 'The Defragmenter');

console.log('stage1 canonical tests passed');
