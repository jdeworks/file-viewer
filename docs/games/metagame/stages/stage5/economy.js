// economy.js — Stage 5 Signal Racer: packet rewards per round. Pure; makes a clean run (high on-beat
// accuracy + surviving integrity + collected boost gates) pay more, so replay/shop has a point.

const BASE_PACKETS = { 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 90, 8: 95, 9: 100 };

export function calcRoundPackets({ roundId, onBeatPct = 0, integrityRemaining = 0, gatesCollected = 0, upgrades = {}, multiplier = 1 }) {
  const base = BASE_PACKETS[roundId] ?? 30;
  const accuracy = Math.floor(clamp01(onBeatPct) * 20);            // 0–20 accuracy bonus
  const survival = Math.floor(Math.max(0, integrityRemaining) * 0.3); // 0–30 survival bonus
  const gateValue = upgrades.signalAmplifier ? 8 : 5;
  const gates = Math.max(0, gatesCollected) * gateValue;
  const subtotal = base + accuracy + survival + gates;
  const mult = Number.isFinite(Number(multiplier)) && multiplier > 0 ? Number(multiplier) : 1;
  return Math.max(10, Math.round(subtotal * mult));
}

function clamp01(value) {
  const n = Number(value) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
