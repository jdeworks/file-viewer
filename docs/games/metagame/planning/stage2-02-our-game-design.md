# Stage 2 design — Glyph Dungeon

Glyph Dungeon is a nine-floor ASCII roguelike split into the Warrens, Cisterns & Emberworks, and
Overflow. Movement, combat, runes, weapons, status interactions, banking, Heat, and permanent shop
upgrades form the run body.

The final encounter is a persistent three-phase fight. A challenge deals 45 damage and immediately
costs the player 20% of maximum HP (minimum 3). Boss damage survives player deaths and retreats, so
players may improve, heal, and return until all three pools are exhausted. This is the only final-boss
rule; there is no alternate clear or hidden prerequisite.

The core test contract is:

- the boss is unreachable before floor 9;
- every challenge damages both sides by the documented amounts;
- phase HP and damage survive normal save round-trips;
- repeated legal exchanges can finish the stage.
