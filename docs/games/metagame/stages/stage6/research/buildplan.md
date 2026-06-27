# Stage 6 — Protocol Codex: ACTIONABLE BUILD PLAN

Turns `research/research.md` into an ordered backlog of **green increments**. Each increment
introduces ONE mechanic/system, maps to concrete modules under
`docs/games/metagame/stages/stage6/`, carries a rough effort (S/M/L) and a one-line test
approach, and ends green (unit suite + `node tests/smoke-area.mjs games`, bundle regenerated).

**This supersedes** `../BUILD_PLAN.md` and the older `planning/*.md` where they conflict. The
engine audit verdict is **PARTIAL — keep the engine, close the bypass, make the boss fight your
real deck, then add depth + the per-act verb arc.** This plan is ordered so the **core loop +
un-cheat land first**, content depth second, the **expansion verbs** third, meta last.

## Grounding — what already exists (do not rebuild)

- `combat.js` — pure deterministic engine: piles, energy (frozen `START_ENERGY = 3`), block,
  statuses, `makeCtx` ctx API, `runHook` relic hooks, `endTurn` loop, seeded `makeRng`. KEEP.
- `cards.js` — 20 cards, `STARTING_DECK`, `REWARD_POOL`. Sequence hooks already present
  (`playedThisTurn`, `cardsPlayed`). Extend, don't replace.
- `enemies.js` — 5 trash + 2 elites + 3 mini-bosses, act-scaled. Extend.
- `mapgen.js` — seeded 4-act DAG, connectivity-guaranteed. **Has the determinism leak**
  (`enemyForNode(..., rng = Math.random)`).
- `run.js` — run state machine (move/reward/rest/shop/event/boss), prestige scaffold. **Also leaks**
  (`enemyForCurrentNode(..., rng = Math.random)`).
- `boss.js` + `content.js` + `ui-boss.js` — The Refused Connection as a **standalone 3-button
  puzzle** (`protocolCards` = SYN/ACK/Signal hard-coded) that **ignores the run deck** and is
  **reachable from the hub** via `data-action="confront"`. This is the bypass + the shallow boss.
- `renderer.js` — router over `run.status`; owns transient combat; delegates clicks. The
  `confront` action and the `ui.screen === "boss"` standalone path are the bypass to remove.
- `state.js` — v2 save (`meta` / `boss` / `run` / `ui.screen ∈ {hub,run,boss}`).
- Bundle: `node scripts/gen-metagame-bundles.mjs` → `stage.generated.js` (regen after EVERY source
  change; commit it). Smoke entry: `tests/areas/games.mjs` ~L678–708 (currently uses the bypass —
  must be rewritten in B1/B3).

---

## Priority table — DO FIRST (top-down)

| # | Increment | Why it's first | Effort | Prereq |
|---|-----------|----------------|--------|--------|
| **A1** | Kill the `Math.random` enemy-pick leak (seed `enemyForNode` / `enemyForCurrentNode`) | Correctness/replays + house rule; tiny, unblocks deterministic boss combat | **S** | — |
| **A2** | Deterministic **jump-to-act-4-boss** test/debug hook (NOT a hub button) | Lets smoke reach the boss without a 19-fight run, while the player path stays mandatory | **S** | — |
| **B1** | **Close the hub bypass** — boss only as the act-4 node | Uniqueness guard #1: run becomes mandatory | **M** | A2 |
| **B2** | **Boss fights your REAL DECK** — negotiation as a combat modifier | The audit's biggest gap; the deepened un-cheat | **L** | A1, B1 |

Start at **A1**, then **A2**, then **B1**, then **B2**. A1+A2 are independent and can be done in
one sitting. B1 and B2 together are "the core loop fix"; everything in Phases C/D is depth layered
on a now-mandatory, deck-driven loop.

---

## Guardrails (apply to EVERY increment)

- **Deterministic from seed.** No `Date.now`, no `Math.random` in the live path. New systems
  (delay queue, congestion decay, packet-loss jam) resolve from seeded combat state. Tests assert
  same-seed → same enemies/cards/outcome.
- **ASCII/text + a little colour only.** No canvas/WebGL. Intent telegraphs, energy pips, HP bars
  stay DOM/CSS.
- **Modular ≤300 LOC soft / 500 hard.** Split `cards.js` by archetype and `enemies.js`/`relics.js`
  as the pools grow.
- **Effects stay declarative `effect(ctx)` functions.** Only TWO new engine primitives are
  sanctioned: the Act-2 **pending/delay queue** and the Act-3 **dynamic energy cap + congestion
  decay**. Resist a bespoke system per card.
- **Green to commit.** Unit suite under `tests/*.test.mjs` + `node tests/smoke-area.mjs games`,
  then `node scripts/gen-metagame-bundles.mjs` and `git add` the regenerated `stage.generated.js`.

---

## Phase A — Foundations & determinism (prerequisites)

### A1 — Seed the enemy-pick RNG (close the determinism leak) · **S**
- **Edit** `mapgen.js`: change `enemyForNode(node, act, rng)` to **require** a seeded `rng` (drop
  the `Math.random` default). **Edit** `run.js`: `enemyForCurrentNode(run, rng)` likewise — drop
  the default and make callers pass `makeRng(hashSeed(seed, nodeId))`. `renderer.js` already passes
  a seeded rng in `makeCombat`; audit every other call site.
- **Test:** `tests/run.test.mjs` — same seed ⇒ identical enemy id at the same node across two
  `createRun`s; grep the stage dir for `Math.random` and assert none in the live path.

### A2 — Deterministic jump-to-act-4-boss hook (test/debug only) · **S**
- **Add** a non-UI affordance the smoke harness can call to seat a run at the act-4 boss node with a
  known deck (e.g. `renderer.js` exposes `window.__fv.stage6?.jumpToBoss(deck)` only when a test
  flag/`?debug` is set; or a `run.js` helper `seatAtFinalBoss(run)`). **It must NOT be a hub
  button** — the player path stays "full run only".
- **Test:** smoke calls the hook to reach the boss in B3 without playing 19 fights; unit asserts the
  helper lands `run.act === 4`, `run.status === "boss"`.

---

## Phase B — Close the bypass + boss = your real deck (THE CORE LOOP + UN-CHEAT)

### B1 — Make the run mandatory; boss only at the act-4 node · **M**
- **Edit** `ui-map.js` (`hubView`): remove the `data-action="confront"` button.
- **Edit** `renderer.js`: remove the `"confront"` action and the standalone `state.ui.screen ===
  "boss"` route; the boss is reached **only** via `run.status === "boss" && run.act === FINAL_BOSS_ACT`.
- **Edit** `state.js`: drop `"boss"` from the allowed `ui.screen` set (now `{hub, run}`); normalize
  legacy saves.
- **Test:** smoke asserts NO `[data-action="confront"]` on the hub; unit asserts the only path to
  `the-refused-connection` is the act-4 boss node after clearing acts 1–3.

### B2 — Boss negotiation becomes a real-deck combat modifier · **L** · *highest-impact build task*
- **New** `boss-combat.js` (≤300 LOC): port `boss.js`'s phase predicates (Phase 1 = SYN first,
  Phase 2 = ACK precede, Phase 3 = ACK each turn or take ongoing damage) into a combat-time
  **acceptance predicate** `accepts(combat, card) → bool`, plus phase advance on boss HP thresholds.
  **Reuse** `boss.js` fns so its unit test stays green; do not fork the logic.
- **Edit** `combat.js`: add an optional `combat.acceptance` hook consulted inside `dealToEnemy`
  (or `playCard`) — when a played card is a `Signal` and `acceptance` returns false, **deal 0**
  ("PROTOCOL MISMATCH"); Protocol/Layer cards resolve normally so the player satisfies the handshake
  with their real Protocol cards while Signals carry damage. Add `enemies.js` entry
  `the-refused-connection` with the 3-phase HP block (`PHASE_HP` from boss.js).
- **Edit** `renderer.js` `mountCombat`: act-4 boss node builds a normal `createCombat` (real
  `run.deck`, relics) **with** `acceptance` wired from `boss-combat.js`; retire the
  `protocolCards`/`ui-boss.js` 3-button screen for the in-run fight (keep `boss.js` API for the
  unit test).
- **Test:** `tests/boss-combat.test.mjs` — with the correct per-phase sequence the real deck kills
  all 3 phases; wrong order ⇒ Signals deal 0; deterministic from seed.

### B3 — Make chapter 9 load-bearing inside the real fight (un-cheat preserved) · **M**
- **Wire** `getBossLockState`/`hasProtocolChapter9` into `boss-combat.js`: if ch9 is **unread**,
  `acceptance` returns false for **every** Signal ⇒ permanent `PROTOCOL MISMATCH`, boss takes 0,
  fight unwinnable. The epub read (`6.protocol_ch9_read` action + `stage6.protocol_ch9_read`
  achievement via `applyProtocolChapter9Unlock`) is unchanged and remains the ONLY key.
- **Rewrite** the smoke flow (`tests/areas/games.mjs` ~L678–708): begin run → (A2 jump-to-boss) →
  attack while locked, assert boss HP unchanged → `data-action="epub"` read → replay the correct
  per-phase sequence with real cards → assert `defeated.includes(6)` + `unlockedStages.includes(7)`.
- **Test:** unit — locked ⇒ 0 damage across all phases; unlocked + correct sequence ⇒ win. Smoke as
  above (no `confront`).

> After B3 the core loop is whole: a **mandatory** seeded run that ends in a **deck-driven**,
> **ch9-gated** boss. Phases C/D add the depth that makes deck-building and the verb arc matter.

---

## Phase C — Depth that makes the deck matter (economy, upgrades, relics, authored map)

### C1 — Card upgrades (rest = heal OR upgrade) · **L**
- **New** `card-upgrades.js`: an `upgraded` form per card (Attack +dmg, Protocol +block/−cost, Layer
  −cost or second effect) — upgrades should sharpen the **act's verb**, not just inflate numbers.
- **Edit** `run.js` `rest()`: support `choice === "upgrade"` mutually exclusive with `heal`; track
  upgraded card ids on the deck. **Edit** `ui-rewards.js` `restView` to offer the choice.
- **Test:** `tests/run.test.mjs` — rest heals XOR upgrades; upgraded id resolves the stronger effect
  in combat.

### C2 — Real economy sinks at the shop · **M**
- **Edit** `run.js`: add `buyRemoval(run, index, cost)` with an **escalating** price (deck-thinning
  is the strongest action), `buyRelic`, `buyUpgrade`; tune `HANDSHAKE_REWARD` so handshakes are a
  real currency and **skipping a card pays handshakes** (keep decks thin, target 12–18).
- **Edit** `ui-rewards.js` `shopView` to surface card / removal / relic / upgrade buys with prices.
- **Test:** unit — removal price climbs per purchase; insufficient handshakes rejected; spend
  deducts deterministically.

### C3 — Real relics (build-definers + 1–2 cursed), one per act verb · **M**
- **Edit** `relics.js`: replace stat-sticks with relics that **change how you build** — and one or
  two **cursed** (strong + real downside). Tag one relic to each act's verb (sequence / delay /
  throughput) so it lands in that act. **Edit** `run.js` `grantRelic`/boss-clear grant to pull the
  act-appropriate relic.
- **Test:** `tests/relics.test.mjs` — new hooks fire on the right primitive; cursed downside applies.

### C4 — Authored map composition (replace random node rolls) · **M**
- **Edit** `mapgen.js` `pickType`: per act guarantee a shop, ≥1 elite, a **pre-boss rest**, and an
  event; tune combat/elite density so each act's **verb gets enough reps before its mini-boss**.
  Stay fully seeded/deterministic.
- **Test:** `tests/mapgen.test.mjs` (new) — each act satisfies the composition invariants for a
  range of seeds; same seed ⇒ same map.

### C5 — Three archetypes, ~36–40 cards (split `cards.js`) · **L**
- **Split** `cards.js` → `cards-signal.js` (SYN-Flood aggro/tempo), `cards-protocol.js` (Stateful
  Stack block-control, `ASYMMETRIC` payoffs), `cards-layer.js` (Layered Cipher power-scaling); a
  thin `cards.js` re-exports `CARDS`/`cardById`/`REWARD_POOL`/`STARTING_DECK`. Each file ≤300 LOC.
- **Test:** unit — pool size ≥36; each archetype represented; every card has an `upgraded` form (C1).

---

## Phase D — The expansion arc (ONE new verb per act — never bigger numbers)

### D1 — Act 1 LINK · **SEQUENCE** (teach order within a turn) · **M**
- **Add** first-card / last-card cards (e.g. *Root Certificate* "the first card each turn costs 0";
  a closer that pays off as the turn's last card). **Edit** `combat.js`: a first-card cost-reduction
  primitive (ctx-readable `isFirstCard`); telegraph Firewall Entity's block/attack so sequencing
  damage into its attack turn is learnable (`ui-combat.js`).
- **Test:** unit — first-card-free triggers only on the first play; greedy order is provably worse on
  a crafted hand (lenticular).

### D2 — Act 2 TRANSPORT · **DELAY** (deferred resolution) · **L** · *new primitive #1*
- **Edit** `combat.js`: add a per-combat `pending` queue + `ctx.queue(turnsAhead, fn)` resolved at
  `onPlayerTurnStart` (deterministic, no RNG). **Add** cards *Windowed Send* / *Retransmit* /
  *Nagle* (cards-signal/protocol). **Add** `enemies.js` RTT enemy whose queued hit **grows** until
  interrupted, telegraphed **2 turns ahead** (`ui-combat.js` renders a 2-step intent). **Add** a
  relic that lands the first delayed packet a turn sooner (`relics.js`).
- **Test:** unit — a queued effect resolves on the correct future turn, deterministically; interrupt
  cancels the growing RTT hit.

### D3 — Act 3 NETWORK · **THROUGHPUT** (un-freeze energy → congestion window) · **L** · *new primitive #2*
- **Edit** `combat.js`: replace flat `START_ENERGY`/`maxEnergy` with a dynamic **congestion
  window** — a wide turn (spend-all/dump-many) **shrinks** next turn's energy; a restrained turn
  **regrows** it toward a cap (slow-start). Optionally oversize turns inflict **Packet Loss** (a
  hand card "jammed"/unplayable next turn). All deterministic. **Add** cards *Bandwidth* /
  *Backoff* / *Defrag* (cards-layer/protocol). **Add** `enemies.js` congestion punisher (Mirror
  variant). **Add** `relics.js` Overclock successor (raise cap, worsen decay — cursed tradeoff).
  **Edit** `ui-combat.js` energy pips to show the dynamic window.
- **Test:** unit — wide turn ⇒ next energy drops; restraint ⇒ regrows toward cap; jam clears via
  Defrag; same seed ⇒ same window trajectory.

### D4 — Act 4 SESSION · **NEGOTIATE** (mutating handshake, deepened) · **M**
- **Edit** `boss-combat.js`: make each phase **mutate** the demanded protocol mid-fight so the player
  must **re-sequence on the fly** with the deck built across acts 1–3 (sequence/delay/throughput all
  pay off). Builds directly on B2/B3; mostly content + phase definitions, no new primitive.
- **Test:** unit — phase mutation changes which Signals are accepted; a deck lacking Protocol cards
  cannot satisfy the handshake (deck-building matters at the boss).

---

## Phase E — Meta, prestige, balance, ship

### E1 — Prestige = Ascension-style stacking RULE modifiers · **M**
- **New** `modifiers.js`: each Protocol Version adds a **rule change** (e.g. "congestion decays
  faster", "boss adds a Phase 0", "elites +1 per act") rather than just +HP. **Edit** `run.js`
  `createRun({version})` to apply the stacked modifiers; keep banked-handshake `prestigeCost`.
- **Test:** `tests/run.test.mjs` — version N applies N stacked modifiers deterministically.

### E2 — Balance pass + bundle + full smoke · **M**
- Tune so each act's **verb-enemy threatens before its mini-boss** and mini-boss HP isn't a slog
  with a starter-ish deck. **Read the rendered fight + the assertion together — never blind-tune.**
  Regenerate `stage.generated.js`; run the full `games` smoke end-to-end (mandatory run → ch9 →
  deck-driven boss).
- **Test:** `node tests/smoke-area.mjs games` green; all `tests/*.test.mjs` green.

---

## Per-increment definition of done

1. New/edited modules ≤300 LOC; effects declarative; deterministic from seed.
2. A unit test for the new mechanic + `node tests/smoke-area.mjs games` green.
3. `node scripts/gen-metagame-bundles.mjs` run and the regenerated `stage.generated.js` staged.
4. Commit the green increment (one mechanic per commit).
