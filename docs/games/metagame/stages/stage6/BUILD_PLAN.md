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

Status: WP1 in progress.
