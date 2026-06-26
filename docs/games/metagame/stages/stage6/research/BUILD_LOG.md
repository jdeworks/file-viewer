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
- C1 — Card upgrades (rest = heal / upgrade / remove): new card-upgrades.js with a sharpened "<ID>+"
  form for all 20 cards (registered via cards.js `registerCard` so cardById resolves them). Upgrades
  keep their base id, and the boss handshake + combo checks (`ctx.playedThisTurn`, acceptance) are now
  base-aware so SYN+/ACK+ still satisfy the negotiation. run.js `rest(choice,payload)` + `upgradeDeckCard`
  (in-place, one-of, failed upgrade doesn't spend the site); ui-rewards restView shows the upgraded face;
  renderer handles `data-upgrade`. Unit tests: heal XOR upgrade, in-place upgrade, SYN+ deals 11 vs 8.
- C2a — Shop economy core: escalating deck-removal (`removalCost`=25+25·purchases, `buyRemoval` with a
  1-card deck floor) + skipping a reward card now pays 5 handshakes (keeps decks lean). shopView gains a
  "Purge a card" sink (rising price); renderer handles `data-buy-remove`. Unit: price climbs 25→50→75,
  deducts deterministically, too-poor rejected, skip pays +5.
- C2b — Shop upgrade + relic sinks: `buyUpgrade` (40 ✋, in-place, no spend if not upgradable) +
  `buyRelic` (65 ✋, grants a distinct relic until the 5-relic pool is exhausted → sold-out, no spend).
  shopView surfaces "Sharpen a card" (upgraded face) and "Acquire a relic"; renderer handles
  `data-buy-upgrade` / `data-buy-relic`. Unit: upgrade deducts + rejects re-upgrade/poor; relic buys
  5 distinct then sold-out spends nothing.
- C3 — Build-definer + cursed relics (pool 5→10): Full Duplex (draw on the 3rd card → reward wide
  turns), Checksum Offload (Protocol plays deal 3 → defensive deck becomes a kill plan), Cipher Cascade
  (Layer plays gain block); cursed Memory Leak (+2 Strength but +2 Weak) and Overcommit Buffer (+1
  energy/turn but Vulnerable each turn) — both tagged `cursed`. All use existing hooks; the act-verb
  (delay/throughput) relics wait for D2/D3. relics.test: build-definers fire on the right primitive,
  cursed downsides apply. (Made the C2b relic-exhaustion test pool-size-agnostic via RELICS.length.)
- C4 — Authored map composition: replaced per-node random `pickType` with `composeAct` — every act is
  GUARANTEED an elite (in a later middle layer), a shop, and an event, plus the existing all-rest
  pre-boss layer and all-combat start; everything else is combat (≥4 reps/act). Fully seeded. New
  mapgen.test.mjs asserts the invariants across 7 seeds + determinism.
- C5a — Split cards.js by archetype: cards-signal.js (SYN-Flood), cards-protocol.js (Stateful Stack),
  cards-layer.js (Layered Cipher); cards.js is now a thin aggregator (CARDS = concat, cardById,
  registerCard, REWARD_POOL, STARTING_DECK). card-upgrades.js unchanged (resolves via the registry).
  New cards.test.mjs: archetypes represented, ids unique, every card has a registered "+" upgrade.
  (Pool still 20; C5b expands to ≥36.)
- C5b — Expanded the pool to 36 cards (17 Signal / 12 Protocol / 7 Layer): +6 Signal (SCAN, JITTER,
  PIPELINE, SPOOF, DDOS, REPLAY), +5 Protocol (BACKLOG, NAGLE, FIREWALL, CONGESTION_CTL, SACK),
  +5 Layer (ENCRYPT, HANDSHAKE_LAYER, DEEP_PACKET, SESSION_KEY, ONION) — all using existing
  primitives, each with a card-upgrades SPEC. cards.test now asserts ≥36 + per-archetype depth.
  **Phase C COMPLETE** (deck-building now matters: upgrades, economy sinks, build-defining relics,
  authored maps, three real archetypes). Next: Phase D (one new verb/act) — D1 sequence.
