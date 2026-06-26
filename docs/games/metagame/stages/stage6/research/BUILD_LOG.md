# Stage 6 — Protocol Codex: overnight build log

One line per green increment (newest at bottom). See `buildplan.md` for the ordered backlog.

- A1 — Seeded the enemy-pick RNG: `enemyForNode`/`enemyForCurrentNode` no longer default to
  `Math.random` (mapgen throws on a missing rng; run.js derives a seeded default from
  `run.seed`+node). Added determinism test in `run.test.mjs`. Bundle regen + games smoke green.
- A2 — Deterministic jump-to-boss hook: `seatAtFinalBoss(run, deck?)` in run.js (seats act 4 /
  status boss, optional known-deck swap) + `window.__fvStage6.jumpToBoss(deck)` debug global in
  renderer.js (NOT a hub button; does not bypass the ch9 un-cheat). Unit test added. Smoke green.
- B1 — Closed the hub bypass: removed the `confront` button (ui-map hub) + `confront` action +
  the standalone `ui.screen==="boss"` route (renderer); dropped `"boss"` from `ui.screen` and
  normalize legacy saves → hub (state.js). Boss is now reachable ONLY as the act-4 boss node of a
  run. Rewrote the games smoke to reach the boss via `__fvStage6.jumpToBoss` + asserts NO confront
  on the hub. Unit test: act-4 boss IS The Refused Connection; acts 1–3 are other mini-bosses.
