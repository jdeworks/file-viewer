// hud.js — Stage 8 Observer State: side-HUD sub-panel painters (boss panel, Cadence streak,
// Tachometer, aid shop), split out of renderer.js to stay under the repo's LOC cap. Pure
// DOM-mutation functions parameterized on exactly what they need — no hidden closure state, so they
// stay easy to reason about independent of renderer.js's own local variables.

import { AIDS } from "./aids.js";
import { crossAttempt } from "./game.js";
import { banner } from "../../shared/feedback.js";

// Boss panel (#7): a one-line locked chip until BOSS_REVEAL_LEVEL, then it expands with a banner
// beat. `bossRevealedRef` is a small mutable holder ({ value: boolean }) owned by renderer.js so the
// "reveal" banner only ever fires once per mount (matches the original in-closure boolean exactly).
export function paintBossPanel({ fields, arenaWrap, lock, state, bossLevel, revealLevel, bossRevealedRef }) {
  const reveal = state.currentLevel >= revealLevel || state.boss.defeated;
  fields.bossPanel.classList.toggle("s8-boss--chip", !reveal);
  fields.bossChip.textContent = `OBSERVER — level ${bossLevel} · ${state.boss.defeated ? "defeated" : "locked"}`;
  if (reveal && !bossRevealedRef.value) { bossRevealedRef.value = true; banner(arenaWrap, "THE OBSERVER STIRS"); }
  if (state.boss.defeated) fields.boss.textContent = "defeated. BTS trace available.";
  else if (state.currentLevel < bossLevel) fields.boss.textContent = `clear levels to reach the Observer (level ${bossLevel}).`;
  else fields.boss.textContent = `${lock.unlocked ? "UNLOCKED — cross on the learned timing" : "reachable — read the live gap, or go offline to learn it"} / ${lock.seedMode}`;
}

// Cadence streak chip (#4/#6): visible on rhythm levels, showing the live on-beat chain progress.
export function paintStreak({ fields, cfg, rhythmChain }) {
  const isRhythm = cfg.mode === "rhythm";
  fields.streak.hidden = !isRhythm;
  if (isRhythm) fields.streak.textContent = `hits ${rhythmChain}/${Math.max(2, cfg.chain || 3)}`;
}

// Tachometer (owned aid): live numeric gap angle + rotation speed in the HUD. `.angle` (single-ring
// modes) is the raw gap angle, unaffected by shipAngle/ref; the `.distance` fallback (modes with no
// single angle, e.g. dual) IS ref-dependent, so shipAngle must be threaded through (2026-07-11 ship-
// steering fix) or this paid aid would silently report distance-from-the-old-fixed-top.
export function paintTach({ fields, state, cfg, seed, elapsedMs, level, shipAngle }) {
  const owned = Boolean(state.aids && state.aids.tachometer);
  fields.tachWrap.hidden = !owned;
  if (!owned) return;
  const r = crossAttempt({ seed, elapsedMs, level, shipAngle });
  const ang = Number.isFinite(r.angle) ? `${Math.round(r.angle)}deg` : `${Math.round(r.distance)}deg off`;
  fields.tach.textContent = `${ang} @ ${Math.round(cfg.speed || cfg.speedInner || cfg.oscBase || 0)}deg/s`;
}

// Aid shop disclosure (M1) + per-aid affordability (#5). The shop appears only once clarity income
// exists (with a one-time arrival banner); the offline-only peek card waits for Offline Mode.
export function paintAids({ root, fields, arenaWrap, state, offline, shouldRevealAids, shouldRevealPeek }) {
  const reveal = shouldRevealAids(state);
  if (reveal && !state.aidsRevealed) { state.aidsRevealed = true; banner(arenaWrap, "clarity can be spent — calibration available"); }
  fields.aids.hidden = !reveal;
  const showPeek = shouldRevealPeek(offline);
  for (const aid of AIDS) {
    const btn = root.querySelector(`[data-aid="${aid.id}"]`);
    if (!btn) continue;
    if (aid.offlineOnly) btn.hidden = !showPeek;
    const ownedTach = aid.id === "tachometer" && state.aids && state.aids.tachometer;
    const peekLocked = aid.id === "peek" && !offline;
    btn.disabled = ownedTach || peekLocked || Number(state.clarity || 0) < aid.cost;
    btn.classList.toggle("s8-aid-owned", Boolean(ownedTach));
  }
}
