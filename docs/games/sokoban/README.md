# Sokoban — level sets & licensing

Sokoban ships as a **family of level sets** behind an in-game picker. `sets.js` is metadata-only
(id, name, level count, lazy loaders); each set is a `sokoban-<id>-levels.js` / `-solutions.js` pair
(the base Microban set uses the unprefixed names). On open we load only the current set, then
background-prefetch the rest. Solutions are move strings (`U/D/L/R`) generated/optimized offline by
our solver lab and replay-verified by `tests/sokoban-levels.test.mjs`.

## Shipped sets

All shipped level sets are by authors who allow free redistribution with credit:

- **Microban I–IV** and **Sasquatch I–II** — David W. Skinner (freely distributable, credit required).
- **Minicosmos / Microcosmos / Nabokosmos / Picokosmos** — Aymeric du Peloux ("Cosmos" family).
- **Yoshio Murase** — auto-generated set (levels from sneezingtiger.com); solutions are our own solver's.
- **Unsolved Challenges** — Skinner (Sasquatch) levels we have not solved yet; playable, no stored
  solution (Solve degrades gracefully).

## Withheld sets (NOT in the repo) — pending author permission

Our solver lab also **solved many levels from other Sourcecode.se community sets**, but those levels
are their authors' copyrighted work and we do **not** have redistribution permission. The Sokoban
community norm (sokobano.de) is explicit: levels must not be republished without the author's consent.
So we keep them **out of the repo** and **out of the deploy**:

- They are generated into `docs/games/sokoban/_held/` (git-ignored; the asset-manifest generator skips
  any `_`-prefixed directory, so they are never precached or deployed).
- They are **not** registered in `sets.js`, so the running game never loads them.
- Regenerate them anytime for local work: `node scripts/presolve/import-external-sets.mjs --write`
  (reads `~/soko-extension/sokoban-solver-new/`). Ship-cleared sets go to this folder; withheld sets
  go to `_held/`.

Solved-and-withheld (counts = levels we have a verified solution for), all from Sourcecode.se:

| Set | Author | Solved levels |
|-----|--------|---------------|
| SokoMania | Thomas Reinke | 124 |
| SokoCreation | Howard Abed | 74 |
| SokoMind | Kevin B. Reilly / Gerald Holler | 43 |
| SokoLasse | Lars Nilsson | 24 |
| SokoChallenge | Kevin Cassol | 10 |
| Sokompact | François Marques | 10 |
| SokoDeal | Vipul Patel | 1 |

To publish any of these: obtain the author's permission (or find an explicitly free license), then add
a `ship: true` flag to that set in `scripts/presolve/import-external-sets.mjs`, re-run it, and register
the set in `sets.js`. Note that some withheld solutions also derive from public ksokoban.online
reference solutions — confirm those terms too. As a license-clean alternative, we can generate our own
original sets with the solver in `scripts/presolve/`.
