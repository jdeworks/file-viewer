// s1dev.test.mjs — unit tests for the Stage 1 dev-menu cheat helpers in s1dev.js.
// Pure functions only: no DOM, no timers. Run with: node --test s1dev.test.mjs
import assert from 'node:assert/strict';
import {
  cheatUnlockTabs,
  cheatBossReady,
  cheatGrantCores,
  cheatHireAllManagers,
} from '../s1dev.js';

// Minimal stage config stubs (enough for the cheat functions; no real economy needed).
const TIERS = [
  { id: 's1-mult' }, { id: 's1-box' }, { id: 's1-boost' },
  { id: 's1-cluster' }, { id: 's1-array' }, { id: 's1-neural' }, { id: 's1-quantum' },
];
const MANAGERS = [
  { id: 'm-box' }, { id: 'm-signal' }, { id: 'm-cluster' }, { id: 'm-array' },
];
const CFG = { tiers: TIERS, managers: MANAGERS, bossTicket: { m: 1, e: 54 } };

// ── cheatUnlockTabs ─────────────────────────────────────────────────────────────────────────────────

{
  const state = { tabsUnlocked: false, milestones: [] };
  cheatUnlockTabs(state);
  assert.equal(state.tabsUnlocked, true, 'unlock-tabs: sets tabsUnlocked');
  assert.equal(state.helpersUnlocked, true, 'unlock-tabs: sets helpersUnlocked');
  assert.ok(state.milestones.includes('score-unlock'), 'unlock-tabs: adds score-unlock milestone');
  assert.ok(state.milestones.includes('sound-unlock'), 'unlock-tabs: adds sound-unlock milestone');
}

{
  // Idempotent: calling twice does not duplicate milestones.
  const state = { tabsUnlocked: false, milestones: ['score-unlock'] };
  cheatUnlockTabs(state);
  cheatUnlockTabs(state);
  assert.equal(state.milestones.filter((m) => m === 'score-unlock').length, 1, 'unlock-tabs: idempotent — no duplicate milestones');
}

// ── cheatBossReady ──────────────────────────────────────────────────────────────────────────────────

{
  const state = { owned: {}, bits: { m: 1, e: 0 }, totalBits: { m: 1, e: 0 }, milestones: [] };
  cheatBossReady(state, CFG);

  assert.equal(state.tabsUnlocked, true, 'boss-ready: sets tabsUnlocked');
  for (const t of TIERS) {
    assert.ok((state.owned[t.id] || 0) >= 1, `boss-ready: owns ≥1 of tier ${t.id}`);
  }
  assert.deepEqual(state.bits, { m: 1, e: 54 }, 'boss-ready: bits = bossTicket');
  assert.ok(state.totalBits.e >= 54, 'boss-ready: totalBits ≥ bossTicket');
}

{
  // Should not lower existing high totalBits.
  const state = { owned: {}, bits: { m: 1, e: 0 }, totalBits: { m: 1, e: 60 }, milestones: [] };
  cheatBossReady(state, CFG);
  assert.equal(state.totalBits.e, 60, 'boss-ready: does not lower a higher totalBits');
}

{
  // Existing owned counts above 1 are not reset.
  const state = { owned: { 's1-mult': 10, 's1-box': 0 }, bits: { m: 0, e: 0 }, totalBits: { m: 0, e: 0 }, milestones: [] };
  cheatBossReady(state, CFG);
  assert.equal(state.owned['s1-mult'], 10, 'boss-ready: preserves counts already above 1');
  assert.equal(state.owned['s1-box'], 1,  'boss-ready: bumps zero-count tier to 1');
}

// ── cheatGrantCores ─────────────────────────────────────────────────────────────────────────────────

{
  const state = { cores: 0 };
  cheatGrantCores(state);
  assert.equal(state.cores, 10, 'grant-cores: adds 10 cores by default');
}

{
  const state = { cores: 5 };
  cheatGrantCores(state, 3);
  assert.equal(state.cores, 8, 'grant-cores: accumulates on existing cores');
}

{
  const state = {};
  cheatGrantCores(state);
  assert.equal(state.cores, 10, 'grant-cores: works on state with no prior cores field');
}

// ── cheatHireAllManagers ────────────────────────────────────────────────────────────────────────────

{
  const state = { managers: {} };
  cheatHireAllManagers(state, CFG);
  for (const m of MANAGERS) {
    assert.ok(state.managers[m.id], `all-managers: manager ${m.id} is now set`);
    assert.equal(state.managers[m.id].level, 1, `all-managers: ${m.id} hired at level 1`);
    assert.equal(state.managers[m.id].paused, false, `all-managers: ${m.id} not paused`);
  }
}

{
  // Does not downgrade a manager already at level 3.
  const state = { managers: { 'm-box': { level: 3, paused: false, lastFire: 0 } } };
  cheatHireAllManagers(state, CFG);
  assert.equal(state.managers['m-box'].level, 3, 'all-managers: preserves higher existing level');
}

{
  // Works when state.managers is missing.
  const state = {};
  cheatHireAllManagers(state, CFG);
  assert.ok(state.managers, 'all-managers: creates managers object when missing');
  assert.equal(state.managers['m-signal'].level, 1, 'all-managers: hires m-signal even with empty state');
}
