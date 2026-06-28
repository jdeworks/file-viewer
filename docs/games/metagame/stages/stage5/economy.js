// economy.js — Stage 5 Signal Racer: packet rewards per round. Pure; makes a clean run (high on-beat
// accuracy + surviving integrity + collected boost gates) pay more, so replay/shop has a point.

const BASE_PACKETS = { 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 90, 8: 95, 9: 100 };

export function calcRoundPackets({ roundId, onBeatPct = 0, integrityRemaining = 0, gatesCollected = 0, gateValue = 5, multiplier = 1 }) {
  const base = BASE_PACKETS[roundId] ?? 30;
  const accuracy = Math.floor(clamp01(onBeatPct) * 20);            // 0–20 accuracy bonus
  const survival = Math.floor(Math.max(0, integrityRemaining) * 0.3); // 0–30+ survival bonus (chassis raises the cap)
  // gateValue comes from the vehicle shop's Signal Amp tuning (applyUpgrades); all callers pass it.
  const gv = Number(gateValue) || 5;
  const gates = Math.max(0, gatesCollected) * gv;
  const subtotal = base + accuracy + survival + gates;
  const mult = Number.isFinite(Number(multiplier)) && multiplier > 0 ? Number(multiplier) : 1;
  return Math.max(10, Math.round(subtotal * mult));
}

// A rough pre-pick reward band for the round selector. Uses the SAME calcRoundPackets the live round
// pays out, with representative LOW (last place, scrappy run) and HIGH (1st place, clean run) inputs,
// plus the player's current shop tuning so the band reflects upgrades. Pure; no game-state change.
export function estimateRoundPackets(round, tuning = {}) {
  const gateValue = Number(tuning.gateValue) || 5;
  const packetMult = Number(tuning.packetMult) > 0 ? Number(tuning.packetMult) : 1;
  const repGates = round && round.hasGates ? 6 : 0; // representative gate haul on a strong run
  const roundId = round ? round.id : 1;
  const low = calcRoundPackets({
    roundId, onBeatPct: 0.5, integrityRemaining: 35,
    gatesCollected: 0, gateValue, multiplier: 0.6 * packetMult, // 0.6 = last-place position floor
  });
  const high = calcRoundPackets({
    roundId, onBeatPct: 1, integrityRemaining: 100,
    gatesCollected: repGates, gateValue, multiplier: packetMult, // 1.0 = 1st-place position
  });
  return { low, high };
}

function clamp01(value) {
  const n = Number(value) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
