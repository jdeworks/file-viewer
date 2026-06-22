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
