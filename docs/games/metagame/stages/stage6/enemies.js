// enemies.js — Stage 6 Protocol Codex enemy archetypes.
//
// Each archetype declares base stats and a looping intent SCRIPT (telegraphed one step ahead in the
// UI). instantiateEnemy(id, act) returns a fresh combat-ready enemy scaled by act (1..3).
// Intent shape: { label, attack?, hits?, block?, applyPlayer?: {status, value}, applySelf?: {…} }.

export const ENEMIES = {
  "corrupt-packet": {
    id: "corrupt-packet",
    name: "Corrupt Packet",
    tier: "standard",
    hp: 40, hpPerAct: 15, armor: 0, armorPerAct: 0,
    script: [
      { label: "Attack 10", attack: 10 },
      { label: "Attack 10", attack: 10 },
      { label: "Attack 15", attack: 15 }
    ]
  },
  "firewall-entity": {
    id: "firewall-entity",
    name: "Firewall Entity",
    tier: "standard",
    hp: 30, hpPerAct: 10, armor: 4, armorPerAct: 3,
    script: [
      { label: "Block 12", block: 12 },
      { label: "Attack 12", attack: 12 },
      { label: "Block 8 + Attack 8", block: 8, attack: 8 }
    ]
  },
  "null-pointer": {
    id: "null-pointer",
    name: "Null Pointer",
    tier: "standard",
    hp: 26, hpPerAct: 12, armor: 0, armorPerAct: 0,
    script: [
      { label: "Attack 7 + Weak", attack: 7, applyPlayer: { status: "weak", value: 1 } },
      { label: "Attack 6, twice", attack: 6, hits: 2 },
      { label: "Attack 14", attack: 14 }
    ]
  },
  // ── Elites (need engine features: pierce + mirror) ──────────────────────────────────────────────
  "expired-certificate": {
    // Stalls behind heavy block, then expires for a large UNBLOCKABLE hit — race it or heal.
    id: "expired-certificate",
    name: "Expired Certificate",
    tier: "elite",
    hp: 64, hpPerAct: 22, armor: 2, armorPerAct: 2,
    script: [
      { label: "Re-signing — block 14", block: 14 },
      { label: "Re-signing — block 14", block: 14 },
      { label: "Certificate expires — 24 unblockable", attack: 24, pierce: true }
    ]
  },
  "man-in-the-middle": {
    // Punishes wide turns: its Mirror reflects 6 damage per card you played that turn.
    id: "man-in-the-middle",
    name: "Man-in-the-Middle",
    tier: "elite",
    hp: 72, hpPerAct: 24, armor: 0, armorPerAct: 0,
    script: [
      { label: "Intercept — attack 9", attack: 9 },
      { label: "Mirror your traffic — 6 × cards played", mirror: 6 },
      { label: "Inject — attack 7, twice", attack: 7, hits: 2 }
    ]
  }
};

export function instantiateEnemy(id, act = 1) {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  const scale = Math.max(0, act - 1);
  return {
    id: def.id,
    name: def.name,
    tier: def.tier,
    hp: def.hp + def.hpPerAct * scale,
    armor: def.armor + def.armorPerAct * scale,
    script: def.script.map((intent) => ({ ...intent }))
  };
}
