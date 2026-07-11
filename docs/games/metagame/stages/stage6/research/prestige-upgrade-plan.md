# Stage 6 (Protocol Codex): finish the Prestige reward loop

**Status:** SHIPPED (2026-07-11). All 5 open questions resolved (see §6); implemented per §4, tested
per §5 (all cases pass, incl. a Puppeteer smoke pass through the actual hub → modal → next-run
flow, not just unit tests). One implementation-time deviation not anticipated in the original
draft: `cardOption`'s `dataset[attr] = value` throws for a hyphenated `attr` string ("prestige-
upgrade") — DOMStringMap rejects a literal hyphen-then-lowercase-letter property name (see
combat-modals.js). Fixed by using the camelCase form ("prestigeUpgrade"); the resulting HTML
attribute is unaffected (still `data-prestige-upgrade`). Note: this same pattern already existed
at two OTHER call sites before this work (`ui-rewards.js`'s shop `"buy-upgrade"`/`"buy-remove"`
attrs) and was NOT touched here (out of scope) — those are very likely hitting the identical
uncaught exception whenever a player opens a shop node with cards in their deck, which would break
shopView() entirely. Flagged to the user as a separate pre-existing bug, not fixed in this pass.
**Trigger:** user noticed a run currently earns no lasting reward on end; investigation found this
was already designed (`../../../planning/stage6-02-our-game-design.md` §H, "Prestige — Protocol
Version") and partially built, but the flagship mechanic was never implemented, and what did ship
is barely visible.

## 1. Ground truth (what exists today)

- **Currency loop works.** A death banks 50% of unspent handshakes (`renderer.js:258`); a boss win
  banks 100% (`renderer.js:283`). `doPrestige()` (`renderer.js:311-316`) spends
  `prestigeCost(version) = (version+1)*40` (`run.js:58`) banked handshakes to increment
  `state.meta.protocolVersion`.
- **Prestige reward is a flat stand-in, not the spec'd mechanic.** `createRun()` (`run.js:81-134`)
  reads `version` and grants `+5 max HP` per version (`PRESTIGE_HP_PER_VERSION`, `run.js:37,82`)
  and one random relic per version via `grantRelic(run, 'prestige-i')` (`run.js:132`). It also
  raises the ascension floor (`effectiveAscension`, `run.js:73-79,83`) — a difficulty tax alongside
  the reward. There is **no card upgrade, no bonus starting handshakes, no larger reward offers**.
  `deck: [...STARTING_DECK]` (`run.js:101`) is a hardcoded constant read on every `createRun` call
  regardless of `version` — the starting deck is bit-for-bit identical at v0 and v20.
- **The spec'd mechanic** (design doc §H): on prestige, the player picks one card from the deck
  they just finished the run with, and it's permanently upgraded — appearing pre-upgraded in every
  future run's starting deck. Doc also specs `bonusHandshakes = version*25` and
  `cardOfferBonus = floor(version/2)`. The design doc itself
  (`../../../planning/stage6-02-our-game-design.md:471`) still lists this unchecked — **corrected**;
  the v1 draft mis-cited this as `BUILD_PLAN.md:471`, but that file is only 86 lines and doesn't
  contain this checklist.
- **Legibility bug, independent of the above — TWO separate gates, not one.** `deathView`
  (`ui-map.js:242-259`) shows "Banked total"; `wonView` (`ui-map.js:261-280`) does not, despite a
  win banking the *larger* deposit (100% vs. 50%). Separately, in `hubView` (`ui-map.js:27-65`)
  the stat/meta numbers (banked total, Protocol Version, runs cleared, best score,
  Refused-Connection status — all inside one `<dl class="s6db-meta-grid">`, `ui-map.js:46-52`) are
  gated on `state.meta.disclosed.stats`, which flips true after a player's first finished run
  (death or win; `renderer.js:260,278`). **But the "reinforce protocol" button itself is gated by a
  THIRD, independent condition**: `prestigeReady = (m.banked||0) >= prestigeCost(m.protocolVersion)
  * 0.75` (`ui-map.js:33`, applied at `ui-map.js:54`) — un-gating `d.stats` alone does not make the
  button appear; a player still needs to have banked ≥30 handshakes (75% of the v0 cost) first,
  which in practice still requires having finished at least one run. **Fixing "a brand-new player
  can't see the system exists" requires touching all three:** the `d.stats` gate, `prestigeReady`,
  and the fact that banked-total/version/prestige-button currently share one `<dl>` block with the
  runs-cleared/best-score/lock-status stats that *should* stay disclosure-gated.
- **Reusable building block already exists:** the rest-site card-upgrade picker
  (`ui-rewards.js:108-118`, `restView`) filters `run.deck` by `canUpgrade(id)`
  (`card-upgrades.js:127-129`) and renders each candidate via `cardOption(upgradeIdFor(id), ...)`
  showing the *upgraded* face. The prestige picker should reuse this exact pattern, not invent a
  new one.
- **Note for scope discussion:** the shipped stand-in already stacks +5 max HP and +1 random relic
  per version (`run.js:37,82,132`) on top of the ascension-floor tax, none of which is in the
  design doc at all. Adding the card upgrade on top makes FOUR things happen per prestige (HP,
  relic, harder rules, card upgrade) where the doc specs one (card upgrade) plus two economy
  multipliers we're deferring. See open question 4 below — whether to keep/tune/retire the ad hoc
  HP+relic bonuses is a real design call, not just an implementation detail.

## 2. Scope for this pass

**In scope:**
1. Win-screen + hub legibility fix (small, ships first, no design risk).
2. The permanent card-upgrade mechanic (design doc's flagship reward): choose one card from the
   just-finished run's deck to upgrade permanently; it appears upgraded in the starting deck of
   every future run.

**Deferred (flag but do not build this pass — separate decision):**
- `bonusHandshakes = version*25` and `cardOfferBonus = floor(version/2)` from the doc. These stack
  with the difficulty-floor increase differently than a card upgrade does (a permanent upgrade to
  a *fixed* number of starting cards is self-limiting — it can't run away; a per-version economy
  multiplier compounds indefinitely against an ever-rising ascension floor and needs its own
  balance pass). Recommend a follow-up plan once the card-upgrade loop is played and felt.
- "Changing the starting hand" in the sense of swapping *which* cards are in `STARTING_DECK`
  (deck composition, not tier) — this is a genuinely separate axis (pool-widening rather than
  direct power) that nothing in the codebase or design docs currently proposes. Worth a separate
  design conversation if wanted later; not bundled here.

## 3. Design decisions (need a nod before implementation, defaults chosen but flagged)

1. **Which card is eligible to pick?** The design doc says "one card from the current run's deck."
   Recommend: only cards with `canUpgrade(id) === true` (same rule the rest-site upgrade already
   uses) AND not already carrying a permanent upgrade from a prior prestige (see #2) — otherwise a
   player could stack multiple prestige upgrades onto the same starting SYN, which trivializes the
   "one card per version" framing in the doc ("after 3 prestiges, 3 cards permanently upgraded").
2. **Representation, and — settled, not left implicit — which array the picker sources from.**
   `state.meta.permanentUpgrades` is an array of **`STARTING_DECK` indices** (e.g. `[2, 6]` = the
   3rd SYN and the 2nd ACK are permanently upgraded). `createRun` maps
   `STARTING_DECK.map((id, i) => permanentUpgrades.includes(i) ? upgradeIdFor(id) : id)`.
   **The prestige picker's candidate list is always built from the static `STARTING_DECK` constant
   and `permanentUpgrades`, NEVER from the run's live, mutable `run.deck`.** This is a hard
   requirement, not a preference, for two reasons the v1 draft left implicit and the plan review
   correctly flagged as the plan's highest technical risk:
   - `run.deck` is mutated by `removeCard`/shop purge (`run.js:253-257`, called from
     `rest`/`buyRemoval`), which `splice`s entries out — any index-based correspondence to
     `run.deck` shifts and breaks the moment a starting card is removed mid-run. `STARTING_DECK` is
     a constant and never mutates, so indices into it stay stable across the run's entire life.
   - If eligibility were instead tested against the run's *current* deck contents at that slot,
     a starting card the player already rest/shop-upgraded in-run (`run.js:228-251`,
     `ui-rewards.js:94-126,159-173`) would show as `"SYN+"`, and `canUpgrade("SYN+")` is `false`
     (`card-upgrades.js:118-129` — already-upgraded ids aren't upgradable again) — silently making
     the exact cards a player most wants to lock in permanently ineligible. Sourcing from the
     static `STARTING_DECK` avoids this: a starting slot's eligibility is `canUpgrade(base id) &&
     !permanentUpgrades.includes(i)`, independent of whatever that slot became during the run.
   - **Trade-off accepted:** this makes the picker "choose one of your 10 starting cards to
     upgrade" rather than literally "choose from the deck you just finished with," a small
     deviation from the doc's exact wording — but it's the only version that (a) has a stable
     addressing scheme, (b) doesn't punish in-run upgrading, and (c) keeps prestige power bounded
     to a fixed 10-slot budget instead of scaling with a given run's draft luck (mirrors how relic
     rewards are already decoupled from draft luck). The picker is bounded to ≤10 choices.
3. **Where does the picker happen?** `doPrestige()` (`renderer.js:311-316`) currently fires
   instantly from a hub button click. Recommend a new run-status-like flow: prestige becomes a
   two-step action — clicking "reinforce protocol" opens a **new modal/view** (reuse
   `combat-modals.js`'s modal pattern or a lightweight new `ui-map.js` view) listing the eligible
   starting cards via `cardOption(upgradeIdFor(id), 'prestige-upgrade', String(index))`, spends the
   cost and increments `protocolVersion` only once a card is chosen (or offers a "skip, keep
   version anyway" ghost button matching the reward-skip convention in `ui-rewards.js`).
4. **Backward compatibility for existing saves.** `state.meta.protocolVersion` may already be > 0
   on real saves with no upgrade recorded for those past prestiges (since the mechanic never
   existed). Recommend: do **not** retroactively grant upgrades for past versions — only versions
   prestiged *after* this ships prompt for a card. Add `permanentUpgrades: []` to `defaultState()`
   (`state.js`) — `normalizeState`'s `mergePlain(fresh.meta, target.meta)` (`state.js:64`) already
   shallow-merges any missing top-level `meta` key from the fresh default, so no dedicated backfill
   call is needed (the v1 draft over-specified this; `disclosed` needs its own extra `mergePlain`
   only because it's a *nested* object one level deeper, which `permanentUpgrades` — a flat array —
   is not).
5. **Hub gating: three things need fixing together, not one.** (Escalated from ground-truth
   correction above.) `d.stats` gates the `<dl>` block with banked/version/runs-cleared/etc;
   `prestigeReady` (a *separate* ≥75%-of-cost banked-amount check) independently gates the button.
   Recommend: (a) split the single `<dl class="s6db-meta-grid">` into two blocks — a
   `runsStarted > 0`-gated one for banked total + Protocol Version + the prestige button (visible
   from a player's very first run attempt, before it even ends), and a `d.stats`-gated one for
   runs-cleared/best-score/lock-status (unchanged, those stay first-finish-gated); (b) change
   `prestigeReady` to no longer hide the button below 75% banked — show it always once
   `runsStarted > 0`, `disabled` until the cost is met (mirrors how the button already renders
   `disabled` below full cost at `ui-map.js:55`, just widening when it's visible at all vs. merely
   enabled). This is what actually fixes "a brand-new player can't see the system exists," which
   just un-gating `d.stats` alone (the v1 draft's proposal) would not have.

## 4. Implementation outline

1. **`state.js`** — add `meta.permanentUpgrades: []` to `defaultState()` (no extra backfill call
   needed — see decision 4).
2. **`run.js`** — keep this module's existing contract ("run-scoped state resets on death; meta is
   held by the caller") intact rather than widening it to take direct `meta` mutations:
   - `createRun()`: accept `permanentUpgrades` alongside `version`/`ascension`; after building
     `deck: [...STARTING_DECK]`, map permanent-upgrade indices onto it via `upgradeIdFor`.
   - New **pure** helper `eligiblePrestigeUpgrades(permanentUpgrades)` → the `STARTING_DECK`
     indices not yet upgraded and still `canUpgrade`, for the picker UI to consume. Read-only, no
     `meta` mutation — keeps `run.js` a pure state machine over run/map state as documented.
   - `canPrestige(meta)` (cost check, currently inline in `doPrestige`) also moves here as a pure
     predicate, matching `prestigeCost`'s existing home.
   - **`meta` mutation (spending the cost, bumping `protocolVersion`, recording the chosen index
     into `permanentUpgrades`) stays in `renderer.js`**, where `doPrestige` already lives and where
     `state.meta` is already the renderer's to mutate directly (see `finalBossDefeated`,
     `renderer.js:273-286`, for the existing precedent of `meta` mutations living in the renderer).
3. **`ui-map.js`** —
   - `wonView`: add the same "Banked total" `<dt>/<dd>` row `deathView` has (`ui-map.js:270-273`).
   - `hubView`: split the meta-grid and change the prestige-button visibility condition per
     decision 5 above.
   - New `prestigeUpgradeView(state)` (or a modal) listing eligible starting cards via
     `cardOption(upgradeIdFor(id), 'prestige-upgrade', String(i))`, reusing `ui-rewards.js`'s
     `cardOption` helper (currently module-private, no `export` — will need one).
4. **`renderer.js`** — replace `doPrestige()`'s direct one-shot mutation with: open the picker view
   on `data-action="prestige"` click (guarded by `canPrestige`); wire a new
   `data-action="prestige-upgrade"` (carrying the chosen `STARTING_DECK` index) that validates via
   `eligiblePrestigeUpgrades`, then mutates `state.meta` (spend cost, bump `protocolVersion`, push
   the index onto `permanentUpgrades`), saves, and routes back to hub.
5. **`combat-persist.js` / save shape** — confirm `permanentUpgrades` round-trips through whatever
   generic save serialization stage6 uses (likely automatic since `state.meta` is already
   persisted wholesale — verify, don't assume).

## 5. Testing plan

- `tests/mapgen.test.mjs` unaffected.
- New/extended unit tests in `tests/run.test.mjs`: `createRun` applies permanent upgrades to the
  correct `STARTING_DECK` indices; a card already permanently upgraded is excluded from
  `eligiblePrestigeUpgrades`; the eventual mutation is a no-op (returns a reason, doesn't spend) if
  the cost isn't met or the index isn't eligible.
- **Highest-priority new case (this is what the plan review flagged as the top untested risk):** a
  starting-deck card is rest- or shop-upgraded DURING a run (so `run.deck[i] === "SYN+"` for a
  `STARTING_DECK` slot), then the run ends and prestige is triggered — assert the picker still
  offers that slot (base `STARTING_DECK[i]` is still `"SYN"`, unaffected by the in-run copy), and
  that choosing it correctly upgrades the *next run's* starting deck without ever reading
  `run.deck`. This is the scenario that proves decision 2 was actually implemented against the
  static array, not the live one.
- Extend `tests/s6dev.test.mjs` or add a smoke case via `node tests/smoke-area.mjs games`
  confirming: win a run → win screen shows banked total → prestige button reachable on a
  first-ever run (before any finish) → prestige flow picks a card → next run's starting deck
  contains the upgraded id at the chosen slot.
- Backward-compat unit test: a save with `protocolVersion: 2` and no `permanentUpgrades` field
  normalizes to `permanentUpgrades: []` without crashing `createRun`.

## 6. Open questions — RESOLVED (user sign-off)

1. **Picker source:** static `STARTING_DECK` (not the run's live grown deck). Confirmed — the
   picker offers "one of your 10 starting cards," per decision 2's trade-off.
2. **Picker UI:** modal, reusing `combat-modals.js`. Confirmed.
3. **`bonusHandshakes`/`cardOfferBonus` doc lines:** mark `../../../planning/stage6-02-our-game-design.md`
   §H updated with an implementation note once this ships (default recommendation carried, not
   explicitly re-asked — low-stakes doc bookkeeping) — note which parts shipped (card upgrade, HP,
   relic) vs. remain deferred (the two economy multipliers), so the doc stops describing unbuilt
   behavior as if it's live.
4. **Ad hoc +5 max HP / +1 relic per prestige:** **KEEP AS-IS.** The card upgrade is purely
   additive on top of the existing HP/relic/difficulty-floor stack — four things happen per
   prestige (HP, relic, harder rules, card upgrade). No new balance tuning in this pass; revisit
   after the card-upgrade loop has been played if it feels too strong or too weak.
5. **Gating fix scope:** **FULL FIX.** Split the meta-grid so banked total, Protocol Version, and
   the prestige button are visible from a player's very first run attempt (before it even ends),
   shown-but-disabled below cost rather than hidden. Runs-cleared/best-score/lock-status stay
   gated behind `d.stats` (first finish) as today, per decision 5 in §3.
