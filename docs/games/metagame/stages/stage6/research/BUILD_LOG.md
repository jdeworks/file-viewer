# Stage 6 — Protocol Codex: overnight build log

One line per green increment (newest at bottom). See `buildplan.md` for the ordered backlog.

- A1 — Seeded the enemy-pick RNG: `enemyForNode`/`enemyForCurrentNode` no longer default to
  `Math.random` (mapgen throws on a missing rng; run.js derives a seeded default from
  `run.seed`+node). Added determinism test in `run.test.mjs`. Bundle regen + games smoke green.
- A2 — Deterministic jump-to-boss hook: `seatAtFinalBoss(run, deck?)` in run.js (seats act 4 /
  status boss, optional known-deck swap) + `window.__fvStage6.jumpToBoss(deck)` debug global in
  renderer.js (NOT a hub button; does not bypass the ch9 un-cheat). Unit test added. Smoke green.
