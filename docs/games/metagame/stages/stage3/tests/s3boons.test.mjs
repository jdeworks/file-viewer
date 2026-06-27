import assert from 'node:assert/strict';
import { defaultState } from '../state.js';
import { BOONS, DRAFT_AT, boonBonus, draftOffer, draftPending, pickBoon, ensureRunBoons } from '../s3boons.js';

// A fresh run starts with a draft pending (milestone at solvedCount 0), no boons yet.
{
  const state = defaultState({ now: 1 });
  ensureRunBoons(state);
  assert.equal(state.run.boons.length, 0);
  assert.equal(draftPending(state), true);
  const offer = draftOffer(state);
  assert.equal(offer.length, 3, 'offer is three boons');
  assert.equal(new Set(offer.map((b) => b.id)).size, 3, 'offer has no dupes');
}

// The offer is deterministic for a given run seed + draft index.
{
  const a = draftOffer(defaultState({ now: 1 })).map((b) => b.id);
  const b = draftOffer(defaultState({ now: 1 })).map((b) => b.id);
  assert.deepEqual(a, b, 'draftOffer is deterministic');
}

// Picking a boon consumes the draft, records it, and clears pending until the next milestone.
{
  const state = defaultState({ now: 1 });
  const id = draftOffer(state)[0].id;
  assert.equal(pickBoon(state, id), true);
  assert.deepEqual(state.run.boons, [id]);
  assert.equal(state.run.draftsTaken, 1);
  assert.equal(draftPending(state), false, 'no draft pending until the next milestone');
  // A second pick at the same milestone is refused.
  const other = BOONS.find((b) => b.id !== id).id;
  assert.equal(pickBoon(state, other), false);
}

// Reaching a later milestone re-opens a draft; bonuses sum across chosen boons.
{
  const state = defaultState({ now: 2 });
  // Pick a boon at solve 0.
  pickBoon(state, draftOffer(state)[0].id);
  // Advance to the second milestone.
  state.run.solvedCount = DRAFT_AT[1];
  assert.equal(draftPending(state), true);
  const second = draftOffer(state).find((b) => !state.run.boons.includes(b.id));
  assert(second, 'a fresh boon is offered');
  pickBoon(state, second.id);
  assert.equal(state.run.boons.length, 2);
  // boonBonus sums the chosen boons' effects.
  let prefetch = 0;
  for (const id of state.run.boons) prefetch += (BOONS.find((b) => b.id === id).effect.prefetch || 0);
  assert.equal(boonBonus(state, 'prefetch'), prefetch);
}

// A picked boon cannot be re-offered (uniqueness within a run).
{
  const state = defaultState({ now: 3 });
  const first = draftOffer(state)[0].id;
  pickBoon(state, first);
  state.run.solvedCount = DRAFT_AT[1];
  assert(!draftOffer(state).some((b) => b.id === first), 'a taken boon is never re-offered');
}

console.log('\nSTAGE 3 BOONS PASSED');
