# Stage 6 — Protocol Codex: full-build implementation plan

Building the full roguelite deck-builder from `planning/stage6-02-our-game-design.md` (90–120 min:
3 acts × 15 nodes, 30+ card pool, relics, elites, rest/shop, prestige). Multi-session.

**Invariant: every commit stays green.** Build new pure modules with their own unit tests first
(additive, old renderer keeps working); swap the renderer/state/smoke only once the new loop runs.

## Contracts to preserve (do not break)
- Root element class `stage6-protocol-codex`; `[data-action="epub"]` opens the epub and sets action
  `6.protocol_ch9_read` + achievement `stage6.protocol_ch9_read` (the boss-unlock cheat gate).
- `[data-action="bts"]` opens trace.bts after defeat; `onStageComplete({stage:6, defeated:true, …})`.
- Boss "The Refused Connection" stays a 3-phase protocol negotiation (SYN-first / ACK-precede /
  ACK-each-turn), locked until the epub is read; keep `boss.js` handshake fns + their unit test green.

## File layout (≤300 LOC soft / 500 hard each)
- `combat.js` — pure engine: piles (draw/hand/discard/exhaust), energy, block, statuses, play/endTurn,
  enemy-intent resolution, seeded RNG. ✅ WP1
- `cards.js` — card pool: id, type, cost, rarity, exhaust, `effect(ctx)`, text. ✅ WP1 (core set) → WP3 (full)
- `enemies.js` — archetypes + intent scripts + per-act HP/armor scaling. ✅ WP1 (2) → WP3 (all + elites)
- `relics.js` — relic defs + hooks (onCombatStart/onCardPlay/onTurnEnd…). WP3
- `mapgen.js` — seeded 3-act × 15-node branching map; node types (combat/elite/rest/shop/event/boss). WP2
- `run.js` — run controller: node progression, rewards (pick 1/3), rest, shop, prestige, run-vs-meta
  persistence. WP2
- `ui-combat.js`, `ui-map.js`, `ui-rewards.js`, `renderer.js` (mount+route) — split UI. WP4
- `state.js` — run state (deck, relics, hp, map, node) + meta (handshakes, prestige version, unlocks). WP4

## Work packages
- **WP1 — combat core (THIS pass):** engine + card ctx API + ~8 core cards + 2 enemies + unit tests.
- **WP2 — run & map:** mapgen + run controller + rewards/rest/shop + prestige scaffold + tests.
- **WP3 — content:** full 30+ card pool, 4 archetypes + 2 elites + Defragmenter cameo, relics, copy.
- **WP4 — UI + integration:** combat/map/reward renderers, state rework, boss-as-final-encounter,
  epub gate, smoke rewrite.
- **WP5 — balance & polish:** numbers tuning to ~90–120 min, parchment/navy visual pass, prestige.

## Status (update each session)
- ✅ **WP1** done + committed (`fe7346fe`): combat.js, cards.js (core set + REWARD_POOL + STARTING_DECK),
  enemies.js (corrupt-packet, firewall-entity), tests/combat.test.mjs.
- ✅ **WP2** done + committed (`8e8a8673`): mapgen.js (3-act DAG, connectivity-guaranteed), run.js
  (run state machine: navigation, rewards pick-1/3, rest, shop, act progression, death), tests/run.test.mjs.
- ✅ **WP3a** done + committed (`2f9be75f`): 20-card pool, strength/permanent-status + clearSelfDebuffs,
  3rd enemy (Null Pointer).
- ✅ **WP3b** done + committed (`e12bb654`): relics.js (5 relics) + engine hooks (onCombatStart /
  onPlayerTurnStart / onCardPlay).
- ⏭ **WP3c (optional, fold into WP4/WP5)**: 2 elites (Expired Certificate countdown, Man-in-the-Middle
  copy) — both need small engine features (unavoidable hit / copy-last-card); Defragmenter cameo event.
- ✅ **WP4 (PLAYABLE MILESTONE)** done: state.js v2 (meta + active run + ui.screen; combat transient),
  ui-combat.js / ui-map.js (hub + map + end-screens) / ui-rewards.js (reward/rest/shop/event) /
  ui-boss.js (The Refused Connection negotiation), renderer.js rewritten as a router/controller over
  run.status with a transient combat instance and delegated clicks. Hub → begin run → act map →
  combat (combat.js) → reward/rest/shop/event → act boss → next act. The Refused Connection stays the
  codex-gated finale (boss.js): confrontable from the hub OR as the act-3 boss node; defeating it (after
  reading the epub) clears the stage. Old `.s6-*` boss-only UI replaced by `.s6db-*`. Smoke rewritten:
  hub renders → begin-run shows routable map → to-hub → epub gate → confront → negotiate → clear.
  All 5 unit suites + games smoke green. Verified the full map→combat→resolve→reward loop end-to-end.
  KNOWN (defer to WP5): combat balance is generous (starter deck clears act-1 trash at full HP).
- ✅ **WP3c** done: engine gained `pierce` (unblockable hits) + `mirror` (damage × cards played this
  turn). Elites Expired Certificate (block-stall → 24 unblockable expiry) + Man-in-the-Middle (mirror
  reflects your wide turns) added; elite nodes now pick from the elite pool. Defragmenter event gained a
  relic-gamble option (+relic, −8 HP). combat.test covers pierce + mirror. Elites are genuinely lethal
  (verified: Expired Certificate can kill; MitM punishes spam) — they carry the early difficulty while
  regular combats stay easy (full balance pass still pending below).
- ⏭ **WP5**: balance to ~90–120 min, deeper parchment/navy visual pass, prestige (Protocol Version:
  bank handshakes between runs → permanent unlocks/relic pool; `meta.banked`/`protocolVersion` already
  tracked, no spend path yet), relic acquisition from elites/boss rewards (relics defined, not yet awarded).

Engine contract (proven, build against it): cards = `{id,type,cost,rarity,exhaust?,text,effect(ctx)}`;
ctx API = deal/block/draw/gainEnergy/applyEnemy/applySelf/skipEnemyNext/playedThisTurn(id) +
getters cardsPlayed/energySpent/handSize/blockNow/hp/discardPile. Enemies = base stats + looping
intent script `{label,attack?,hits?,block?,applyPlayer?,applySelf?}`, scaled by act via instantiateEnemy.
