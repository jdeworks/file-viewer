# Stage 5 — Signal Racer (lane racer) · genre bar: arcade lane-runner (feel of speed, track focus)

Evidence: `stages/stage5/` renderer.js (311) · render-track.js (55) · steer.js (32) ·
panels.js (54) · styles.css (167). Screenshots `s5-select`, `s5-racing`, `s5-racing-2`,
`phone/s5-racing`. Metrics: racing 1305px desktop / 2077px phone (visible 734/842).

## What exists

One permanent screen for select/playing/result: HUD chips → 2-col layout (ASCII track
`<pre>` left, rounds+shop+ascension lists right) → THE JAMMER boss panel → log →
controls. Track = 3 lanes × ~10 look-ahead rows, ~110px wide at 15px mono. Player row
`[>]` at the bottom, obstacles scroll toward it. Beat-pulse border exists; touch
steering pad exists (shown while playing, ≤760px/coarse).

## Why it fails

**UX**
- (P0, phone) **Track and steering pad don't share a viewport.** The pad mounts before
  `.s5-controls` at the bottom of 2077px of content; the track sits at ~y900–1370
  (screenshot `phone/s5-racing`). You physically cannot watch the road and steer. The
  round-4 "touch steering" fix added the control but not the layout — on a phone the
  stage is still effectively unplayable.
- (P1) **Nothing changes when the race starts.** Round list, vehicle shop, ascension
  ladder, boss panel and log all stay on screen while `mode==='playing'` (disabled, but
  present — `renderer.js` only hides two HUD chips). A real-time game needs a mode
  switch: menus gone, road big, HUD minimal. Today the race looks *exactly* like the
  menu with a moving asterisk.

**UI**
- (P0) **The race is ~2% of the screen.** The playfield is a ~110px-wide strip in the
  top-left corner of a ~360px-tall bordered box that is otherwise empty purple
  (screenshot `s5-racing` — the box stretches to match the right column's height while
  the track content is 10 rows). The dominant visual during a race is dead space and
  disabled menus. Lanes are 3 chars wide; obstacles are single dim glyphs.
- (P2) Legend (`+ $ U O E …`) is a separate `<pre>` below the fold; glyph meanings are
  unlearnable in-race when they matter.

**Fun**
- (P1) **No sensation of speed.** The road has no motion texture — no lane dashes
  streaming past, no side markers, no speed lines; between frames only the obstacle rows
  step down (compare `s5-racing` vs `s5-racing-2`: near-identical stills). Beat pulse on
  the border is the only life. Near-misses, collisions and pickups have no visual event
  (integrity number just drops).
- (P2) The boss panel narrates suppression state as static text; the "pursuit" reads
  identical to round 1.

## Changes (ordered)

1. (P0/P1, M) **Race mode takeover.** On `mode='playing'`: aside + boss panel + log
   collapse (CSS class on root, no DOM surgery); the track centers and scales up
   (lanes 5–7 chars wide, font ~22-26px desktop under 00-F1/F3 — the strip becomes a
   road); HUD reduces to ROUND · POS · INTEGRITY · progress bar. `mode='select'/'result'`
   restores the full screen. Result = overlay card (placement, packets, par) with
   continue/retry — a podium beat instead of a log line.
2. (P0, S — phone) **Dock the pad under the track**: in race mode the steering pad
   renders inside the track column, directly below the road (thumb zone), not in
   `.s5-controls`; with #1 the two always share the 842px viewport. Also map tap on the
   left/right half of the road = lane switch (bigger target than any pad).
3. (P1, S) **Speed texture.** Lane separators become streaming dashes (offset cycles per
   tick), side gutters get `≡` marks moving at 2× row step; speed-up rounds increase
   dash density. Pure render-track change, deterministic, reduced-motion: static.
4. (P2, S) **Event feedback** (00-F5): collision = track shake + integrity flash;
   near-miss = lane flicker; pickup = `.mg-float` glyph pop; boost = existing beat glow
   strengthened. Boss pursuit: jammer glyph rendered IN the top rows closing distance,
   suppression = screen-edge static.
5. (P2, S) In-race glyph legend: one 12px line directly under the road (only the 4 glyphs
   present in the current round — rounds already know their composition).
6. (P3, S) Round list rows get archetype icons + last-result chips; shop moves behind a
   tab in select mode (shorter select screen, 1284px → fits).

## Keep

The 9-round structure + archetype labels on rounds; beat-pulse (extend, don't replace);
HUD chip set; steering key mapping + `loop.handleKey` seam (the pad reuses it — correct
design); calibration progress string; ascension ladder UI pattern; the un-cheat and
suppression double-gate untouched.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

This is the "menus to get half a game" exemplar: first contact is 9 round buttons,
**seven** upgrade tracks (Engine/Chassis/Cooling/Nav/Traction/Signal Amp/Noise Filter),
a 14-glyph legend, the boss panel, and an empty 780px track box (`s5-select-full`) —
for a game whose play surface is 3 lanes.

- (M1, M) **7 upgrade tracks → 3 stats.** Merge into ENGINE (speed/overclock:
  engine+cooling), HULL (integrity/collisions: chassis+traction), SIGNAL
  (packets/calibration/rivals: nav+amp+filter). Map existing levels onto the 3 lines
  (sum of purchased levels, prices rebased) so saves migrate. Three visible stats a
  racer understands at a glance; same total depth (R3).
- (M2, M) **Kill the shop menu — pit-stop offers.** After each round: "PIT STOP — pick
  1 of 2" (two of the 3 tracks offered, price shown, skippable). The upgrade decision
  arrives in flow; the side column stops hosting a store (R2). Packets stay the only
  currency.
- (M3, S) **First contact = round 1.** Fresh entry shows the track (attract-mode: the
  road idling with drifting static — kills the empty void), ONE button (`START ROUND 1
  — AVOID`), and integrity/packets. The full round list appears after round 1; per-round
  packet estimates after first clear; legend goes behind ❓ and gets taught by first-
  pickup toasts (R5). JAMMER panel → locked chip until round 6 cleared (R6).
- (M4, S) **Powerup diet on early rounds:** rounds 1–2 spawn only boost gates +
  repair (2 glyph types); the other pickups phase in with their archetypes (display +
  spawn-table gating; deterministic seeds unaffected per-round).
- OPTION (user call): drop the Noise Filter/Signal Amp *effects* into one "SIGNAL"
  effect curve rather than keeping 3 hidden sub-effects under the merged stat —
  simpler to explain, slightly changes tuning; decide at implementation.
