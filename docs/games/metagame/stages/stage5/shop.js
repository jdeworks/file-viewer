// shop.js — Stage 5 Signal Racer: three packet-gated upgrades that bend the run's damage/timing/reward
// constants. Pure helpers; the renderer calls buyUpgrade between rounds and game-loop reads applyUpgrades.

export const UPGRADES = [
  { id: 'noiseFilter',      label: 'Noise Filter',      cost: 60,  desc: 'Reduces ░ hit damage from 2 to 1.' },
  { id: 'spectrumAnalyzer', label: 'Spectrum Analyzer', cost: 80,  desc: 'Widens the beat window by 1 extra tick.' },
  { id: 'signalAmplifier',  label: 'Signal Amplifier',  cost: 100, desc: 'Boost gate value: 5 → 8 packets.' },
];

const BASE = { noiseDamage: 2, beatWindowBonus: 0, gateValue: 5 };

export function applyUpgrades(shop = {}, base = BASE) {
  return {
    noiseDamage:     shop.noiseFilter      ? 1 : base.noiseDamage,
    beatWindowBonus: shop.spectrumAnalyzer ? base.beatWindowBonus + 1 : base.beatWindowBonus,
    gateValue:       shop.signalAmplifier  ? 8 : base.gateValue,
  };
}

// Attempt a purchase. Returns { bought, reason }. Mutates state.packets/state.shop only on success.
export function buyUpgrade(state, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return { bought: false, reason: 'unknown' };
  if (state.shop?.[id]) return { bought: false, reason: 'owned' };
  if (Number(state.packets || 0) < def.cost) return { bought: false, reason: 'insufficient' };
  state.packets = Number(state.packets) - def.cost;
  state.shop = { ...(state.shop || {}), [id]: true };
  return { bought: true, reason: 'ok', cost: def.cost };
}
