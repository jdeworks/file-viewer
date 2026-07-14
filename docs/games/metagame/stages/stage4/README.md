# Stage 4 — Fractal Bastion

**Genre:** tower-defense campaign. **Theme:** the bastion repeats at every scale, a
fortress folded inside itself, and you must hold the line as the recursion deepens.

## How to play

- A **five-map campaign**: maps grow in length (5, 10, 15, 25, 35 waves). Clear a map
  to advance.
- **Place towers** on the board so their range covers the enemy path, then let the
  wave run; towers fire automatically. Later maps reshape at wave-group boundaries;
  any tower caught by the new route is fully refunded.
- Select a placed tower to **upgrade, fork, retarget, or sell** it. The next-wave
  line previews the incoming enemy mix before you commit.
- Between maps, spend **Glory** in the **Armory** on upgrades and new tower types.
- You may confront the boss **only after all five maps are cleared** — no shortcut
  from the start.

## Controls

- **Click or tap** to place a tower onto a build spot; select towers to inspect or
  upgrade.
- **Click** map-select and Armory buttons to choose maps, buy, and start waves.

## The boss — The Infinite Loop

After the 90 campaign waves, the boss is a separate coverage confrontation rather
than one more path-following trash wave. Hits land only when a tower covers one of
its fixed recursion points.

> **Viewer-path hint:** follow the tower-upgrade folders *all the way down* in the
> viewer — the answer is nested deep, in a `recursion_points.json` blueprint. Open
> that real file, then place a tower so its range **covers a marked recursion point**.
> Blind blanket coverage can chip it eventually; reading the blueprint reveals the
> exact coordinates and raises each covered-point hit from 100 to 150 damage.
