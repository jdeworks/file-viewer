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
- B2a — Real-deck boss engine (additive, no UI switch yet): combat.js gains 3 inert optional hooks
  (`acceptance` gates Signal damage, `advancePhase` on enemy-zero, `onPlayerTurnEnd`); new
  boss-combat.js ports boss.js's phase rules into a combat-time `accepts()` predicate +
  `wireBossCombat()` (3 phases, ch9 `locked` flag, phase-3 ongoing damage) + `autoNegotiate()`
  test driver; enemies.js gains `the-refused-connection`. Unit test boss-combat.test.mjs:
  SYN-lead/ACK gating, phase advance, full real-deck win (deterministic), locked⇒unwinnable.
- B2b — Switched the in-run boss to the real-deck fight: renderer routes the act-4 boss through
  `mountCombat` (was the 3-button screen), `makeCombat` wires `wireBossCombat({locked:!ch9})`,
  `finishCombat`→`finalBossDefeated` completes the stage on a real win; removed the dead
  challengeBoss/playBossCard/onBossDefeated + `boss`/`new-turn` actions + data-card handler;
  reading the epub mid-fight rebuilds the combat unlocked. ui-combat.js gains a boss banner
  (phase rule + locked PROTOCOL MISMATCH + codex button) with styles. Deleted the retired
  ui-boss.js + content.js. Smoke rewritten to win via the real deck (`__fvStage6.autoNegotiate`).
- B3 — ch9 load-bearing inside the real fight (un-cheat proven): the lock was wired in B2; B3 adds
  the proof. Unit test: a correct handshake deals 0 to the boss in ALL three phases while locked.
  Smoke: after jumpToBoss (locked) an autoNegotiate(3) leaves boss HP at 60 and undefeated
  (PROTOCOL MISMATCH is load-bearing), THEN reading ch9 + autoNegotiate wins. (Caught + fixed an
  unbounded test loop: SYN draws 2 after an ACK, refilling the hand.)
