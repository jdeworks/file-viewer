// economy.test.mjs — Stage 5: packet rewards.
import assert from 'node:assert/strict';
import { calcRoundPackets, estimateRoundPackets } from '../economy.js';
import { ROUNDS } from '../rounds.js';

// Perfect round 1: base 30 + accuracy 20 + survival 30 = 80.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 1, integrityRemaining: 100, gatesCollected: 0 }), 80);

// Survival only: base 30 + 0 + floor(10*0.3)=3 = 33.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 10, gatesCollected: 0 }), 33);

// Gates pay 5 by default, or any explicit gateValue from the vehicle-shop tuning.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 4 }), 30 + 20);
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 4, gateValue: 8 }), 30 + 32);
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 4, gateValue: 9 }), 30 + 36);

// packetMult folds in via the multiplier (Signal Amp): a 1.16× run rounds up.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 1, integrityRemaining: 100, gatesCollected: 0, multiplier: 1.16 }), Math.round(80 * 1.16));

// Minimum floor: even a failed-feeling round pays something.
assert.ok(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 0 }) >= 10);

// Later rounds have higher base.
assert.ok(calcRoundPackets({ roundId: 7, onBeatPct: 0, integrityRemaining: 0 }) > calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0 }));

// Per-round selector estimate (O5): a low–high band built from the SAME calcRoundPackets the round pays.
const round1 = ROUNDS[0];
const est1 = estimateRoundPackets(round1, {});
// round 1 (no gates): low = (30+10+10)*0.6 = 30; high = 30+20+30 = 80.
assert.deepEqual(est1, { low: 30, high: 80 });
assert.ok(est1.high > est1.low, 'estimate band must have headroom');

// A round WITH gates pays a higher ceiling than the same-base round without (gates only count on the high run).
const round7 = ROUNDS.find((r) => r.id === 7); // hasGates
const est7 = estimateRoundPackets(round7, {});
assert.equal(est7.low, 66);  // (90+10+10)*0.6
assert.equal(est7.high, 170); // 90+20+30 + 6 gates * 5

// Better shop tuning (Signal Amp) raises the high end via gateValue + packetMult — exposes the grind incentive.
const estUpgraded = estimateRoundPackets(round7, { gateValue: 9, packetMult: 1.16 });
assert.ok(estUpgraded.high > est7.high, 'upgrades should raise the estimate ceiling');

// Estimate must equal a real payout computed for the same representative inputs (single source of truth).
assert.equal(est1.high, calcRoundPackets({ roundId: 1, onBeatPct: 1, integrityRemaining: 100, gatesCollected: 0 }));

console.log('stage5 economy tests passed');
