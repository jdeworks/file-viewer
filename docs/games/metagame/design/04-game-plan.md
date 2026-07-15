# Metagame implementation plan

This document records the shipped five-stage structure. The game is a local-only overlay whose
progression, controls, hints, and boss solutions all remain inside that overlay. Normal file intake,
editing, rendering, and navigation are independent product features and are not progression inputs.

## Shared platform

- `metagame.js` owns stage selection, mounting, completion, and the developer menu.
- `save.js` owns the v9 save. It stores campaign and per-stage state only.
- `stage-manifest.js` and `registry.js` describe the five stages and their generated bundles.
- Stage modules receive game state, persistence, completion, bell, and orchestrator services.
- Runtime requests stay same-origin and all stage assets are included in the offline manifest.

## Stage contracts

1. **Bit Foundry** — build the full production chain, buy the boss ticket, and win the always-fair
   Defragmenter tap duel.
2. **Glyph Dungeon** — descend nine floors, then defeat a persistent three-phase boss through normal
   45-damage exchanges and counterattacks.
3. **Memory Grid** — solve the corruption ladder through level 8, which directly exposes the Memory
   Leak encounter.
4. **Fractal Bastion** — clear the five-map campaign, cover the three visible recursion points, and
   deal 100 damage per covered point.
5. **Protocol Codex** — build a deck through the run, satisfy the finale's changing handshake at its
   base phase HP, and optionally pursue the three-key superboss.

## Persistence and migration

Schema v9 intentionally starts older metagame saves fresh. Loading or resetting also removes legacy
standalone action keys. The current save has no generic cross-surface action or trace fields.

## Validation contract

- Every stage can be completed using only its own rendered controls and rules.
- Opening an ordinary sample in the file viewer leaves the serialized metagame save unchanged.
- Developer boss jumps reset stale stage state but do not synthesize progression flags.
- Generated stage, app, image, registry, catalog, and offline artifacts must match their sources.
- `./scripts/check.sh --fast` is the routine implementation gate.
