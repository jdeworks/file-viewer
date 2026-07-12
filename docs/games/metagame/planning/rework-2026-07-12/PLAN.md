# Metagame rework plan — S5 2.5D racer, S7 human detective case, S4 upgrade fix (2026-07-12, rev 2)

Rev 2 after plan-review: per-frame rendering fix (B4), full S7 migration surface (C2/C3),
fixture rework (C1), honest parallelization/lane story. Reviewer findings incorporated throughout.

## Goal

1. **Stage 5 (Signal Racer)**: real canvas 2.5D pseudo-3D racer (OutRun-style segment road,
   perspective + curves), no flashing side FX, rivals visible, always a reachable open lane.
2. **Stage 7 (Identity Arbiter)**: fully human detective case (human suspects, paper evidence),
   boss decided by an in-document contradiction — EXIF/metadata mechanic removed.
3. **Stage 4**: tower levels grant +25%/+50% damage; real-economy tests prove maps 1–4.

## Requirements

- Zero off-origin; procedural drawing only; loops on `shared/frame-loop.js` (30fps cap).
- S5 keeps all mechanics (3 lanes, obstacles, pickups, gates, rivals, speed, pit stops, shop,
  ascension, touch, boss). S7 keeps the deduction engine + boss-never-from-start law.
- Saves must not crash; S7 action rename ships as a `save.js` MIGRATIONS step (v6→v7).
- LOC caps; bundles via `gen-metagame-bundles.mjs`; fixtures churn asset-manifest → regen, never
  hand-edit. All stage suites + `node tests/smoke-area.mjs games` green per package.

## Assumptions (user-visible ones flagged at sign-off)

- S5 logic stays discrete (±1 lane per tick, rows at discrete z); the canvas interpolates visually.
- 30fps frame cap stays; racer smoothness comes from per-FRAME interpolated drawing (B4).
- **S7 in-progress case state resets on migration** (completion/achievements preserved) — user-
  facing data loss, surfaced in the sign-off summary.
- Cross-lane touches are REQUIRED for C (see Lanes below) and are done knowingly, not silently.

## Lanes / coordination (reviewer finding)

C touches files outside this lane's registered paths: `docs/types/image/metadata.js` (image lane —
removing the stage-7 EXIF hook), `docs/bts/identity_arbiter.bts`, `docs/examples/metagame/stage7/`
fixtures, and metagame-root shared files (`viewer-actions.js`, `achievements.js`, `save.js`,
`stage-manifest.js`, `stages/stage9/crossstage.js`), plus `tests/areas/games.mjs` +
`tests/metagame-viewer-actions.test.mjs`. B also edits `tests/areas/games.mjs`.
→ **Parallelization is limited to A ∥ B (stage-dir code only). All shared/cross-lane files, both
games.mjs sections, fixtures, bundles and commits are done centrally by the orchestrator. C runs
after B lands.** The `docs/types/image/metadata.js` edit is minimal (delete the stage-7 hook call)
and flagged in the commit message for the image lane.

## Plan

### Package A — Stage 4 (parallel with B; stage4 dir + its tests only)
A1. `forks.js` `towerStat()`: level factor on DAMAGE only — L1 ×1.0, L2 ×1.25, L3 ×1.5
    (`undefined` level → L1, so legacy objects and forks.test.mjs survive). Composes with fork
    mult and engine damageMult (verified engine.js:223).
A2. Tests: extend `upgrades.test.mjs`/`forks.test.mjs` (stat grows with level); AUDIT every test
    asserting exact damage with L3 towers (`abilities.test.mjs:16,26,33` etc.) and update expected
    numbers deliberately (both-ends rule: verify the new number is right, don't just re-record).
A3. `winnable.test.mjs`: damageMult 3 → legit ceiling 1.4 (armory.js 5×8%). Net effect with A1 is
    ≈0.7× former damage — if the fortified board no longer clears, GROW THE FORTIFY BOARD (it is a
    free injected board; add towers/forks) rather than reinstating an illegal multiplier.
A4. `economy.test.mjs`: diversified cost-respecting bot (kinetic + thermal/null/arc from map 2)
    full-clears maps 1–4. Tune per-map `startCycles` minimally if a map genuinely cannot clear;
    keep runtime sane (dt=200, guard caps) so check.sh doesn't balloon.

### Package B — Stage 5 canvas 2.5D racer (parallel with A; stage5 dir + its tests only)
B1. `road.js` (pure): segments (len 200, half-width 2000, fov 100°, camH 1000, drawDist 120),
    `scale = cameraDepth/z` projection, curve accumulator (x+=dx; dx+=curve) with eased sections
    seeded from the round, `findSegment`, lane-offset→screen-x (lanes −2/3, 0, +2/3).
B2. `road-entities.js` (pure): map round content rows → z (row i → i·rowSpacingZ); rivals get
    continuous z from rival-pacing state; player z interpolates between ticks.
B3. `draw-road.js` + `draw-sprites.js`: trapezoid road, alternating rumble stripes, lane dashes,
    exponential fog, procedural parallax strips; procedural sprites (player/rival cars, obstacles,
    pickups, gate posts), painter's algorithm, integer coords, pre-allocated segment objects.
B4. **Per-frame rendering (reviewer fix)**: extend `engine.js` — keep `onTick` at tickMs cadence
    for LOGIC, add an `onRender(alpha)` fired EVERY capped frame (alpha = acc/tickMs) so the canvas
    draws at 30fps with positions interpolated between ticks. `renderer.js` swaps the `<pre>` for a
    `<canvas>`; canvas orchestration moves to a new `canvas-race.js` (renderer.js is at 437 LOC —
    split, don't grow). During debug-hook autoSolve, skip draws (reviewer perf note).
B5. FX cleanup: DELETE speed-texture gutters + beat-pulse/scaled-glyph flashing (`styles-race.css`)
    and `race-fx.js` flash/shake on-track effects; KEEP floatNum score popups (subtle, useful).
    Remove the glyph legend UI + `GLYPH_LEGEND` copy (renderer.js:54-57,93, content.js) — glyphs no
    longer exist. Keep the race-mode panel-collapse layout. `render-track.js` + its test deleted;
    attract screen = static canvas frame.
B6. Fairness: generator invariant + test reusing the DP reachability model from
    `winnable-human.test.mjs:23-53` (±1 lane/tick); coverage = default seed × ascension 0–4 × all
    rounds + a 50-seed property sample. Update `track.test.mjs` for generator changes.
B7. Tests: new `road.test.mjs`, `road-entities.test.mjs`, fairness test; `winnable-human`/
    `zero-damage` stay (verified renderer-agnostic); games.mjs stage5 section gets a MINIMAL
    ADDITIVE edit only (canvas present + non-blank — the section is already testhook-driven, no
    ASCII assertions exist; reviewer-verified). S5 resume checkpoints get a schema tag so old
    `ck.lanes` checkpoints from the ASCII era are rejected cleanly (renderer.js:101-108).
Validation: stage5 suite + games smoke + screenshots to the user.

### Package C — Stage 7 human case (after B; stage-dir code by agent, everything shared central)
C1. Case content: `content.js` + `messages.js` → "The Meridian Estate Affair" (5 named suspects,
    witness statements, torn letter, train timetable, ledger, described photograph). **Fixture
    rework (reviewer)**: replace `docs/examples/metagame/stage7/` files (route_table.csv etc.) with
    human case documents; re-theme the in-viewer search gate constants in `viewer-actions.js`
    (S-7741/REVOKED → a ledger entry, e.g. payee "M. Adler"→"VOID"); NEVER delete
    `entity_f_verification.png` (stage3 depends on the filename, viewer-actions.js:13); the jpg
    photo fixture is replaced by a described-photo document. Currency "Addresses" → "Leads".
C2. Boss gate: still an ACTION (registry.js shape `7.*`): new `7.alibi_contradiction_pinned`,
    fired by the evidence-board connect handler when the alibi statement + postmarked letter are
    pinned and linked. Update TOGETHER: `stage-manifest.js:31` requiredAction,
    `stages/stage9/crossstage.js:26` (reads the key from the GLOBAL actions store) + its fixtures
    (`stage9/tests/confront.test.mjs:114,127`), `achievements.js:12` mapping,
    `tests/metagame-viewer-actions.test.mjs:126`. Remove the EXIF hook call from
    `docs/types/image/metadata.js:4,39` (cross-lane, minimal, flagged).
C3. Migration in `save.js` MIGRATIONS ladder: v6→v7 maps `7.exif_contradiction_found` (action +
    achievement) → the new ids so completed players keep completion + stage 9 access; in-progress
    stage-7 case state resets to case start. Unit test with a captured v6 save fixture.
C4. Docs/tests: stage7 README + help modal; `docs/bts/identity_arbiter.bts:5` narration; SPEC-00/
    SPEC-01 superseded notes; games.mjs stage7 section rewritten (pin+connect unlocks boss; merely
    viewing does NOT — the current section drives meta-drawer.buildMetadata and must go).
Validation: stage7 + stage9 suites, viewer-actions test, games smoke, screenshot of the case board.

### Sequencing
1. Spawn A-agent and B-agent in parallel (stage-dir code + stage tests only; no shared files,
   no games.mjs, no generated files, no commits).
2. Central: integrate A → bundles/manifest regen → stage4 suite + games smoke → commit A.
3. Central: integrate B → games.mjs minimal edit → bundles → smoke → screenshots → commit B.
4. Spawn C-agent (stage7 dir only) → central shared-file surgery (C2 list), fixtures, migration,
   games.mjs stage7 rewrite → bundles/manifest → smoke → screenshot → commit C.

## Validation (overall)
`./scripts/check.sh --fast` before every commit; per-package games smoke; fairness test coverage
as B6; A2 both-ends test discipline; C3 migration fixture test.

## Risks
- Racer feel at 30fps: mitigated by per-frame interpolated draws (B4); if still steppy, present
  evidence before touching the cap.
- A1+A3 may destabilize other exact-damage tests → A2 audit is explicit.
- C is the largest package (fixtures + 6 shared files + stage9 + image-lane hook) — treated as
  such; C-agent scope is stage7-dir only, all shared surgery central.
- games.mjs is load-bearing: B edits it minimally; C's stage7 rewrite runs the games area alone
  before the full gate.
- Old S5 checkpoints/S7 saves: schema tag (B7) + versioned migration (C3), both unit-tested.

## Open Questions
None blocking. Flagged at sign-off: S7 in-progress case reset; the minimal cross-lane
image-metadata edit; economy tuning may adjust maps.js startCycles for maps 1–4.
