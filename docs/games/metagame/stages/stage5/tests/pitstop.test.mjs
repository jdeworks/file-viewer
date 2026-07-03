// pitstop.test.mjs — Stage 5: the between-round PIT STOP offer (UX audit M2). Deterministic pair of
// stat offers, seeded by run seed + round; never offers a maxed stat.
import assert from 'node:assert/strict';
import { pitStopOffer } from '../pitstop.js';

// ── deterministic: same (seed, round, shop) ⇒ same pair; different round ⇒ (generally) different ─────
{
  const a = pitStopOffer({ seed: 'signal-abc', roundIdx: 2, shop: {} });
  const b = pitStopOffer({ seed: 'signal-abc', roundIdx: 2, shop: {} });
  assert.deepEqual(a, b, 'same inputs → same offer');
  assert.equal(a.length, 2, 'two stats offered when three are available');
  assert.ok(a.every((id) => ['engine', 'hull', 'signal'].includes(id)), 'offers are real stats');
  assert.equal(new Set(a).size, 2, 'the two offers are distinct');
}

// the offer varies across rounds (not a constant pair for the whole run)
{
  const seed = 'signal-xyz';
  const pairs = new Set();
  for (let r = 0; r < 8; r += 1) pairs.add(pitStopOffer({ seed, roundIdx: r, shop: {} }).join(','));
  assert.ok(pairs.size >= 2, 'the offered pair changes across rounds');
}

// ── a maxed stat is never offered; two-left → exactly those; one-left → just it ──────────────────────
{
  const offer = pitStopOffer({ seed: 's', roundIdx: 0, shop: { engine: 7 } }); // engine maxed
  assert.ok(!offer.includes('engine'), 'a maxed stat is not offered');
  assert.deepEqual([...offer].sort(), ['hull', 'signal'], 'the two remaining stats are offered');
  assert.deepEqual(pitStopOffer({ seed: 's', roundIdx: 0, shop: { engine: 7, hull: 7 } }), ['signal'], 'one left → just it');
  assert.deepEqual(pitStopOffer({ seed: 's', roundIdx: 0, shop: { engine: 7, hull: 7, signal: 8 } }), [], 'all maxed → no offer');
}

console.log('stage5 pitstop tests passed');
