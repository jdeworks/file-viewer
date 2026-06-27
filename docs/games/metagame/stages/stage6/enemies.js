// enemies.js — Stage 6 Protocol Codex enemy archetypes.
//
// Each archetype declares base stats and a looping intent SCRIPT (telegraphed one step ahead in the
// UI). instantiateEnemy(id, act) returns a fresh combat-ready enemy scaled by act (1..4).
// Intent shape: { label, attack?, hits?, block?, pierce?, mirror?, applyPlayer?: {status, value}, applySelf?: {…} }.
//
// Tiers: "standard" trash (scales with act), "elite" (lethal mid-act spikes), "boss" (per-act
// mini-bosses with fixed HP — they do NOT scale by act, since each owns a single act).

export const ENEMIES = {
  // ── Standard trash ──────────────────────────────────────────────────────────────────────────────
  "corrupt-packet": {
    id: "corrupt-packet",
    name: "Corrupt Packet",
    tier: "standard",
    hp: 46, hpPerAct: 22, armor: 0, armorPerAct: 0,
    script: [
      { label: "Attack 10", attack: 10 },
      { label: "Attack 15", attack: 15 },
      { label: "Attack 22", attack: 22 }
    ]
  },
  "firewall-entity": {
    id: "firewall-entity",
    name: "Firewall Entity",
    tier: "standard",
    hp: 38, hpPerAct: 16, armor: 4, armorPerAct: 4,
    script: [
      { label: "Block 14", block: 14 },
      { label: "Attack 16", attack: 16 },
      { label: "Block 10 + Attack 12", block: 10, attack: 12 }
    ]
  },
  "null-pointer": {
    id: "null-pointer",
    name: "Null Pointer",
    tier: "standard",
    hp: 32, hpPerAct: 18, armor: 0, armorPerAct: 0,
    script: [
      { label: "Attack 9 + Weak", attack: 9, applyPlayer: { status: "weak", value: 1 } },
      { label: "Attack 9, twice", attack: 9, hits: 2 },
      { label: "Attack 20", attack: 20 }
    ]
  },
  // Appears act 2+: an escalating spike that punishes slow kills.
  "race-condition": {
    id: "race-condition",
    name: "Race Condition",
    tier: "standard",
    hp: 50, hpPerAct: 20, armor: 0, armorPerAct: 0,
    script: [
      { label: "Attack 8, twice", attack: 8, hits: 2 },
      { label: "Attack 11 + Vulnerable", attack: 11, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Data race — Attack 26", attack: 26 }
    ]
  },
  // Appears act 2+: a Round-Trip Timer whose retransmit storm GROWS each uninterrupted round —
  // interrupt it (skipEnemyNext, e.g. RST) to reset the ramp. Telegraphed two steps ahead in the UI.
  "round-trip-timer": {
    id: "round-trip-timer",
    name: "Round-Trip Timer",
    tier: "standard",
    hp: 52, hpPerAct: 18, armor: 0, armorPerAct: 0,
    script: [
      { label: "Measuring RTT — block 8", block: 8 },
      { label: "Probe — Attack 6", attack: 6 },
      { label: "Retransmit storm — Attack 8 (+6 each uninterrupted round)", attack: 8, ramp: 6 }
    ]
  },
  // Appears act 3+: armored bruiser, long fights, sustained pressure.
  "packet-storm": {
    id: "packet-storm",
    name: "Packet Storm",
    tier: "standard",
    hp: 64, hpPerAct: 22, armor: 2, armorPerAct: 2,
    script: [
      { label: "Attack 14", attack: 14 },
      { label: "Block 12 + Attack 10", block: 12, attack: 10 },
      { label: "Flood — Attack 7, three times", attack: 7, hits: 3 }
    ]
  },
  // Appears act 3: punishes WIDE turns — its Collapse deals damage scaling with the energy you spent.
  "congestion-collapse": {
    id: "congestion-collapse",
    name: "Congestion Collapse",
    tier: "standard",
    hp: 58, hpPerAct: 16, armor: 0, armorPerAct: 0,
    script: [
      { label: "Buffer — Block 10", block: 10 },
      { label: "Collapse — 3 × energy you spent", congest: 3 },
      { label: "Attack 12", attack: 12 }
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
  },
  // ── Per-act mini-bosses (fixed HP; carry their act's combat finale) ───────────────────────────────
  "kernel-panic": {
    id: "kernel-panic",
    name: "Kernel Panic",
    tier: "boss",
    hp: 150, hpPerAct: 0, armor: 2, armorPerAct: 0,
    script: [
      { label: "Attack 14", attack: 14 },
      { label: "Block 14 + Attack 8", block: 14, attack: 8 },
      { label: "Attack 9, twice", attack: 9, hits: 2 },
      { label: "Halt — Attack 30", attack: 30 }
    ]
  },
  "buffer-overflow": {
    id: "buffer-overflow",
    name: "Buffer Overflow",
    tier: "boss",
    hp: 205, hpPerAct: 0, armor: 4, armorPerAct: 0,
    script: [
      { label: "Overflow — Attack 9, three times", attack: 9, hits: 3 },
      { label: "Block 18", block: 18 },
      { label: "Smash — Attack 14 + Weak", attack: 14, applyPlayer: { status: "weak", value: 1 } },
      { label: "Stack smash — Attack 34", attack: 34 }
    ]
  },
  "deadlock": {
    id: "deadlock",
    name: "Deadlock",
    tier: "boss",
    hp: 260, hpPerAct: 0, armor: 6, armorPerAct: 0,
    script: [
      { label: "Attack 20", attack: 20 },
      { label: "Mirror your traffic — 5 × cards played", mirror: 5 },
      { label: "Block 26", block: 26 },
      { label: "Attack 16 + Vulnerable", attack: 16, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Deadlock — Attack 32", attack: 32 }
    ]
  },
  // ── The act-4 finale: fought with the REAL deck; negotiation = an acceptance hook (boss-combat.js).
  // HP here is the PHASE-1 pool; phase advance refills to BOSS_PHASE_HP[2]/[3]. Pressure is modest —
  // the challenge is satisfying the handshake (lead SYN / play ACK), not a raw damage race.
  "the-refused-connection": {
    id: "the-refused-connection",
    name: "The Refused Connection",
    tier: "boss",
    // A connection, not a process — it cannot be CORRUPTED, so a corruption build can't sidestep the
    // handshake; damage must come through accepted Signals. Reinforces the negotiation un-cheat.
    immuneCorruption: true,
    hp: 60, hpPerAct: 0, armor: 0, armorPerAct: 0,
    script: [
      { label: "Backpressure — Attack 8", attack: 8 },
      { label: "Re-handshake — Block 12", block: 12 },
      { label: "Reset — Attack 6, twice", attack: 6, hits: 2 },
      { label: "Silence — Block 10 + Attack 7", block: 10, attack: 7 }
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
    immuneCorruption: Boolean(def.immuneCorruption),
    hp: def.hp + def.hpPerAct * scale,
    armor: def.armor + def.armorPerAct * scale,
    script: def.script.map((intent) => ({ ...intent }))
  };
}
