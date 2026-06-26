// Status-effect substrate shared by the player and monsters (A5). An entity's effects live on
// `ent.statuses = { poison:{turns,power}, burn:{…}, bleed:{…}, slow:{turns}, stun:{turns}, frozen:… }`.
// Damage-over-time effects (poison/burn/bleed) are subtracted by tickStatuses(); control effects
// (slow/stun/frozen) are READ by the movement code. All of this is transient run state — saved
// verbatim in the entity, with NO determinism concern (statuses never feed terrain generation).

// Damage-over-time effect → per-turn damage comes from the effect's `power`.
export const DOT = { poison: true, burn: true, bleed: true };
// Control effects → skip / halve actions; read by the movement code, deal no damage.
export const CONTROL = { stun: true, frozen: true, slow: true };

const LABEL = { poison: "poison", burn: "burning", bleed: "bleeding" };

// Apply/refresh an effect. Refresh takes the LONGER remaining duration and the STRONGER power so
// re-application tops up rather than stacking without bound.
export function applyStatus(ent, type, turns, power = 1) {
  if (!ent || turns <= 0) return;
  ent.statuses = ent.statuses || {};
  const cur = ent.statuses[type];
  ent.statuses[type] = {
    turns: Math.max(turns, cur ? cur.turns : 0),
    power: Math.max(power, cur ? cur.power : 0)
  };
}

export function hasStatus(ent, type) {
  return Boolean(ent && ent.statuses && ent.statuses[type] && ent.statuses[type].turns > 0);
}

export function clearStatuses(ent) { if (ent) ent.statuses = {}; }

// Compact HUD/sprite suffix of the active effects, e.g. "☣2 ♨3" — empty when clean.
const ICON = { poison: "☣", burn: "♨", bleed: "✣", slow: "❄", stun: "✦", frozen: "❄" };
export function statusSummary(ent) {
  if (!ent || !ent.statuses) return "";
  return Object.keys(ent.statuses)
    .filter((t) => ent.statuses[t] && ent.statuses[t].turns > 0)
    .map((t) => `${ICON[t] || "•"}${ent.statuses[t].turns}`)
    .join(" ");
}

// Advance every effect on `ent` by one turn: subtract DoT damage, decrement durations, drop the
// expired. Returns total damage dealt so the caller can flag death / screen-flash. `isPlayer`
// shapes the log line and routes damage into events.damageTaken / events.died.
export function tickStatuses(ent, events, isPlayer) {
  if (!ent || !ent.statuses) return 0;
  let dmg = 0;
  const sources = [];
  for (const type of Object.keys(ent.statuses)) {
    const st = ent.statuses[type];
    if (!st || st.turns <= 0) { delete ent.statuses[type]; continue; }
    if (DOT[type]) { dmg += st.power; sources.push(LABEL[type] || type); }
    st.turns -= 1;
    if (st.turns <= 0) delete ent.statuses[type];
  }
  if (dmg > 0 && typeof ent.hp === "number") {
    ent.hp = Math.max(0, ent.hp - dmg);
    if (events) {
      if (isPlayer) { events.damageTaken = (events.damageTaken || 0) + dmg; if (ent.hp <= 0) events.died = true; }
      if (events.log) events.log.push(`${isPlayer ? "@" : (ent.name || "foe")} takes ${dmg} from ${sources.join(" + ")}.`);
    }
  }
  return dmg;
}

// A slowed entity acts every OTHER turn (deterministic toggle on the entity); a stunned/frozen one
// never acts while the effect lasts. Returns true when the entity should SKIP its action this turn.
export function skipsTurn(ent) {
  if (hasStatus(ent, "stun") || hasStatus(ent, "frozen")) return true;
  if (hasStatus(ent, "slow")) { ent._slowPhase = !ent._slowPhase; return ent._slowPhase; }
  return false;
}
