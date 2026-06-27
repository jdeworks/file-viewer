// economy.test.mjs — Stage 5: packet rewards.
import assert from 'node:assert/strict';
import { calcRoundPackets } from '../economy.js';

// Perfect round 1: base 30 + accuracy 20 + survival 30 = 80.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 1, integrityRemaining: 100, gatesCollected: 0 }), 80);

// Survival only: base 30 + 0 + floor(10*0.3)=3 = 33.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 10, gatesCollected: 0 }), 33);

// Gates pay 5 by default, 8 with the Signal Amplifier upgrade.
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 4 }), 30 + 20);
assert.equal(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 4, upgrades: { signalAmplifier: true } }), 30 + 32);

// Minimum floor: even a failed-feeling round pays something.
assert.ok(calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0, gatesCollected: 0 }) >= 10);

// Later rounds have higher base.
assert.ok(calcRoundPackets({ roundId: 7, onBeatPct: 0, integrityRemaining: 0 }) > calcRoundPackets({ roundId: 1, onBeatPct: 0, integrityRemaining: 0 }));

console.log('stage5 economy tests passed');
