# Stage 4 — Fractal Bastion (tower defense) · genre bar: classic TD (Kingdom Rush / Defense Grid conventions)

Evidence: `stages/stage4/` ui-combat.js (278) · board.js (51) · combat-rows.js (58) ·
ui-campaign.js (98) · styles.css (263). Screenshots `s4-map-select`, `s4-combat-idle`,
`s4-combat-wave`, `phone/s4-combat-idle`. Metrics: combat 801px desktop / 1475px phone.

## What exists

Map-select (5-map campaign list, clean grid rows) → combat: 40×40 ASCII board in a
`<pre>` (11px mono, `max-height:60vh; overflow:auto`), right panel with tower shop +
roster, log + wave controls (start/call-early/speed 1-3×) below. Click-to-place uses a
DOM-Range hit test (scroll-safe — the old mobile bug IS fixed). Armory meta-shop.

## Why it fails

**UX**
- (P0) **The primary verbs are below the fold.** `start wave`, speed toggle and the log
  live under the board (`ui-combat.js:54-61`); combat content is 801px in a 734px window
  — during a wave you scroll to change speed and cannot see the board while doing it.
- (P1) **No range preview.** Nowhere does the UI show a tower's reach — not on placement
  hover, not on selection (no such code exists in ui-combat.js/board.js). Placement — the
  only skill expression in a TD — is blind guessing. genre-defining affordance, missing.
- (P1) **The shop sells names, not weapons.** Roster buttons are `[P] pulse_node (80)`
  (screenshot `s4-combat-wave`) — no damage/range/rate/type anywhere before buying.
  With 14 towers + forks, choice is uninformed.
- (P2) 40 rows never fit the 60vh box → the board itself scrolls vertically on smaller
  windows/phone; a TD where part of the maze is off-screen (phone shot: board taller
  than viewport even at 16px).

**UI**
- (P0) **The path is invisible.** The whole board renders in ONE color
  (`.s4-board { color: var(--s4-fg) }`, styles.css:37-49; board.js emits plain chars).
  In screenshot `s4-combat-wave` the L-system path literally cannot be distinguished
  from empty cells at a glance — dots, path glyphs, `R` recursion points and `o`
  enemies are all the same dim teal. The board is the game; right now it's noise.
- (P2) Cells are ~7.6×11.5px on desktop — sub-fingertip, sub-glance. With 00-F1/F3
  (height contract + 1100px panel) a 40×40 board can render at ~16px/0.9 line-height
  and still fit; today's size is a consequence of the 720px box.

**Fun**
- (P1) **Nothing reacts.** Enemies take hits, die, leak through, towers fire — and the
  only change is a character quietly swapping between frames. No hit flash, no death
  pop, no integrity-loss alarm, no wave-complete beat (log lines only). A TD's
  satisfaction IS watching your gauntlet shred a wave; that read is absent.
- (P2) Wave composition is a mystery until it spawns (wavegen knows; UI never previews
  "next: 12× swarm, 3× armored" — one line would create planning tension).

## Changes (ordered)

1. (P0, S) **Dock the controls.** Wave controls + integrity/cycles HUD pinned above the
   board; log becomes a 2-line ticker under the HUD (internal scroll). Everything in one
   viewport under 00-F1.
2. (P0, M) **Color the board.** board.js emits class-wrapped spans (path/`towers by
   type`/enemies/recursion points/projectile ticks); `<pre>` keeps layout, spans carry
   color. Path = visibly distinct road; enemies red-family with per-type glyph+shade;
   towers colored by damage type. (~40×40 spans per frame is fine — S9 repaints a pre
   every rAF already.)
3. (P1, M) **Range + placement preview.** Selecting a shop tower enters placement mode:
   hovered/tapped cell highlights its footprint + range ring (span classes again);
   invalid cells red. Selected placed tower shows its range persistently + a stats
   popover (dmg/rate/range/type, fork options, sell).
4. (P1, S) **Stats on the shop rows.** `[P] pulse_node · 80c · dmg 6 · rng 4 · 1.4/s`
   two-line rows; fork tags show what changes.
5. (P2, M) **Feedback kit wiring** (00-F5): enemy hit flash class, death `.mg-float`
   score pip, integrity hit = board edge flash + HUD shake, wave banner ("WAVE 12/20"),
   boss telegraph banner. Reduced-motion: colors only.
6. (P2, S) **Wave preview line** from wavegen ("next: 12 swarm · 3 armored · 1 healer")
   next to call-early — makes call-early a real decision instead of a blind bonus.
7. (P3, S) Fit-to-zone font sizing (compute from host height; min 12px + pan on phone).

## Keep

Map-select campaign screen (clean, readable, good lock states); the Range-based tap
mapping fix; speed controls + call-early (right verbs, wrong shelf); armory rows;
the dark terminal aesthetic (right for the fiction — it needs *contrast*, not a
restyle); blueprint un-cheat flow untouched.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

Current load: 14 towers + tier-3 forks + per-tower targeting modes + 5 damage types +
resistances + 6 status effects + abilities + cycles + Glory/armory + 5-map campaign.
The progressive tower unlock (5/8/11/14) already exists — the *information* systems
don't follow it.

- (M1, S) **Map 1 is vanilla TD.** On map 1: damage types/resistances/status effects
  exist in the engine but the UI shows plain numbers only (no type tags, no resist
  lines); targeting is AUTO with no toggle shown. Type/resist/status UI + targeting
  toggles arrive with map 2 via an arrival banner ("enemies now shield against pulse —
  check tower types"), forks with map 3's first tier-3. Engine untouched; display
  gating only (R4/R5).
- (M2, S) **Armory appears after map 1 clear.** First entry lands on map-select with
  map 1 preselected and one START button (R1); Glory + armory unlock as the map-1
  victory reward moment ("Glory earned — the armory opens").
- (M3, S) **One decision per interruption.** Wave-end currently just flows; put the
  call-early bonus + wave preview into one compact between-wave strip (single glance,
  single optional click) instead of asking the player to monitor controls below the
  board mid-wave (pairs with UI pass #1/#6).
- OPTION (user call): reduce targeting modes to 3 presets (first/strong/cycle) from
  the current per-tower cycle list, if playtest shows the mode cycling is bookkeeping
  rather than decisions. Cheap to revert.
