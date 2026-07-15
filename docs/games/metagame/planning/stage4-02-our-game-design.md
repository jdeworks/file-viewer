# Stage 4 design — Fractal Bastion

Fractal Bastion is a five-map tower-defense campaign. Maps add longer wave sets, path reshaping,
damage types, statuses, targeting, tier-three forks, Glory, and Armory progression.

Clearing all maps exposes The Infinite Loop. Its three recursion points are visibly stamped on the
boss board. Towers use the normal placement and range rules to cover them, and each covered point
deals exactly 100 damage on confrontation. Covering all three defeats the 300-HP boss.

The core test contract is:

- the boss remains inaccessible until all five maps are cleared;
- point positions are visible in the arena and survive persistence;
- damage is `coveredPoints × 100` with no modifier;
- ordinary tower placement can cover all three points and finish the stage.
