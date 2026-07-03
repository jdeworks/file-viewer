# Stage 9 — Observer State (timing/rhythm) · genre bar: timing games (Super Hexagon / rhythm minigames: instant input, readable target, juicy verdicts)

The healthiest stage — fixed-size arena, hit/miss flash, reduced-motion care. The gaps
are input ergonomics and target readability, not structure.

Evidence: `stages/stage9/` renderer.js (357) · ring.js (70) · rings.js (90) ·
modes.js (267) · aids.js (46) · styles.css (115). Screenshots `s9-initial`, `s9-mid`,
`s9-miss-flash`, `phone/s9-initial`. Metrics: 878px desktop (734 visible) — mildly over;
phone 1537px.

## What exists

HUD (level/16, movement name+verb, clarity, seed) → 25×13 ASCII ring arena (rAF
repaint) + side column (OBSERVE, CROSS, aid shop, notes/offline buttons) → always-on
boss panel → log. 16 levels, 9 archetypes; arena flashes green/teal/red on
hit/perfect/miss.

## Why it fails

**UX**
- (P1) **A timing game with no keyboard.** There is no keydown handler in the stage
  (renderer.js — none); CROSS is a small button in the side column, ~300px from the
  ring the player is staring at. Eye on target, pointer parked on a distant button is
  exactly the split rhythm games avoid: Space/Enter must cross, and on touch the ARENA
  itself should be the button (tap anywhere on the ring = CROSS).
- (P2) Aid descriptions exist only in `title=` tooltips (`renderer.js:46`) — invisible
  on touch, invisible on desktop until hover; buying "Tachometer (30)" is a leap of
  faith. (EVAL-r3 flagged it; still true.)
- (P2) `OBSERVE (reset rotation)` mislabels the verb on unstable levels where its real
  effect is a reseed — the one place the un-cheat teaching happens, worded as a no-op.

**UI**
- (P1) **The target zone is invisible.** The ring rotates, the gap moves — but where is
  "crossing"? Nothing marks the crossing angle/moment on the arena (screenshot
  `s9-mid`: ring + empty center; no needle, no 12-o'clock marker, no gap-approach
  highlight). The player must infer that CROSS succeeds when the gap passes… where?
  Genre bar: the target moment is always marked (the receptor line in every rhythm
  game, the wall gap + your triangle in Super Hexagon).
- (P2) A "hold the beat" rhythm archetype (Cadence, `s9-mid`) shows NO beat: no pulse,
  no metronome, no press-window telegraphs. The archetype's verb exists only in the
  hint text.
- (P2) Ring glyphs (`─ │ +`) leave the diagonals ragged/dashed at 25×13 — the rotor
  reads as broken segments rather than a wheel; the gap is hard to track at speed.
  (Cell-rounding artifact of ring.js's 3° projection at this raster size.)
- (P3) Boss panel always rendered from level 1 (bottom third), competing with the
  arena (EVAL noted; still true — screenshot `s9-initial`).

**Fun**
- (P2) Crossing success has the flash (good) but no *tension build*: no near-miss
  readout ("late by 40ms"), no streak counter on screen (Cadence needs "2/3 in a row"
  visibly), no perfect-streak reward feel.

## Changes (ordered)

1. (P1, S) **Input:** Space/Enter → CROSS, `r` → OBSERVE (kbd hints on the buttons);
   tap/click on the arena `<pre>` = CROSS. The side button stays as the labeled
   fallback. Biggest feel-per-line fix in the stage.
2. (P1, S) **Mark the target.** A fixed crossing marker on the arena (e.g. `▼` above
   the 12-o'clock cell + a bright cell at the crossing angle); when the gap's leading
   edge is within N degrees, the marker brightens (the "get ready" read). Rings render
   already knows the angle — presentation only, determinism untouched.
3. (P2, S) **Denser ring raster.** Use block glyphs (`█▓` arc, space gap) and/or bump
   to 33×17 for the arc rows — the wheel reads solid, the gap pops. (Constant-time
   string build; still a `<pre>`.)
4. (P2, S) **Archetype overlays:** Cadence = a pulsing beat dot + `hits 2/3` chip;
   stealth already has the scanning eye (good); dark-zone/ghost get one-line "what's
   different" chips on entry (modeHint exists — surface it as a 2s banner, 00-F5).
5. (P2, S) Aid shop cards: name + cost + one-line description visible (no tooltips);
   offline-only aids labeled as such.
6. (P2, S) Verdict depth: miss shows `early/late ±ms` under the arena; streak chip for
   chain archetypes; perfect adds the existing brighter flash + `.mg-float` "+clarity".
7. (P3, S) Boss panel: collapsed "OBSERVER — level 16 · locked" chip until level 13;
   expands with a banner beat. Rename OBSERVE's label per level stability
   ("RE-OBSERVE (reseeds online)" when unstable).
8. (P3, S) Fit: with 00-F1 the 878px content tucks under 734 by moving the log into a
   2-line ticker; phone gets arena-first order (arena, CROSS zone, then shop).

## Keep

Fixed 25×13 arena architecture + rAF `textContent` repaint (cheap, deterministic);
the flash system + reduced-motion; archetype variety; clarity economy; the
online-random/offline-fixed un-cheat and its HUD seed field (make the unstable state
even louder — it's the lesson); no-modal layout.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

Near budget: 4 HUD values, one currency (clarity), 3 aids. The overload here is
*conceptual pacing*, not counters:

- (M1, S) **Aids appear when they help.** The aid shop renders from level 1, before
  clarity income exists; gate it to first-clarity-earned with an arrival line
  ("clarity can be spent — calibration available"). Single-Frame (offline-only) stays
  hidden until Offline Mode has been activated once (R4).
- (M2, S) **One-new-thing-per-level check.** 9 archetypes over 16 levels sometimes
  stack a new archetype AND a speed/tolerance jump; audit the level table so each
  level changes ONE dimension, and every archetype's first level runs at its gentlest
  parameters (movements.js data-only tuning).
- (M3, S) Seed field plain-languages itself: `stable` → nothing shown (suppress when
  normal, R4); unstable levels show the orange `live-random — unlearnable online`
  chip only. The un-cheat lesson gets louder by contrast.
- No mergers needed; no cuts proposed.
