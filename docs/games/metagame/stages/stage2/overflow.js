// Overflow-act (darkness) monster behaviours. Split out of monsters.js so the core AI file stays
// under the LOC cap. Each is called once per monster act from monsterTurn, mutating the foe in place
// BEFORE the normal chase/bite resolution. Runtime-only state (no rng) — the real-time clocks drive
// these, so determinism isn't required (anything they change is saved with the world).

import { isDarkAct, torchLit } from "./darkness.js";

const GROW_CAP = 10;       // light-eater: max stacks (so it can't runaway-scale forever)
const GROW_HP = 5;         // +maxHp per stack while feeding on the dark
const GROW_ATK = 1;        // +atk per stack

// Light eater (glyph 'e'): in true darkness (Overflow act, no torch) it FEEDS — gaining HP and ATK
// each turn. Strike a torch and the glare starves it: it withers a stack at a time. So the player's
// torch is both a sight tool AND a weapon against it (the light-vs-stealth tension made flesh).
export function lightEaterTick(world, m, events) {
  const feeding = isDarkAct(world.floor) && !torchLit(world);
  if (feeding) {
    if ((m._grow || 0) < GROW_CAP) {
      m._grow = (m._grow || 0) + 1;
      m.maxHp += GROW_HP;
      m.hp += GROW_HP;
      m.atk += GROW_ATK;
      if (m._grow === GROW_CAP && events && events.log) events.log.push(`${m.name} has gorged on the dark.`);
    }
  } else if ((m._grow || 0) > 0) {
    m._grow -= 1;
    m.maxHp = Math.max(1, m.maxHp - GROW_HP);
    m.hp = Math.min(m.hp, m.maxHp);
    m.atk = Math.max(2, m.atk - GROW_ATK);
  }
}

// Mirror (glyph 'M'): copies the player. Its ATK tracks 85% of yours, so out-levelling your own
// damage makes the mirror deadlier — you can't simply out-stat it; you have to fight it.
export function mirrorTick(m, player) {
  const copied = Math.round(Number(player.atk || 0) * 0.85);
  if (copied > m.atk) m.atk = copied;
}
