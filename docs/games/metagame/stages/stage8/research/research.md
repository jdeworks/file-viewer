# Stage 9 "Observer State" — Game Design Research

**Date:** 2026-06-26
**Branch:** worktree-metagame-bitfoundry
**Stage status entering this research:** THIN GATE — 4 clicks, no rendered mechanic, Math.random in
live path, hint-text-only rotating-gap puzzle, currentLevel/clarity in state but unused by gameplay.

---

## 1. GENRE: Reflex / Timing + Observer-Effect Puzzle

### What defines the genre

A **reflex-timing game** presents a repeating, periodic state (a gap in a rotating ring, a corridor
between moving hazards, a rhythm beat) and asks the player to press at the precise moment that state
is favorable. The core skill loop is:

- **Perceive** the periodic signal (rotation speed, gap width, pattern).
- **Anticipate** the alignment window slightly ahead of the gap's arrival (reaction time is ~250 ms;
  the player must act before the optimal moment, not at it).
- **Execute** a single, binary commitment (press or wait).
- **Receive immediate feedback** (success / bounce-back / death) with near-zero latency.

Instant respawn / retry is the mandatory corollary: any delay between failure and retry kills the
feedback loop.

An **observer-effect puzzle** adds a second constraint: the act of examining the state changes it.
In quantum mechanics, measuring a particle's position collapses its wave-function to a definite
state that differs from the superposition it was in before measurement. Game designers use this
metaphor to force a *decision about when to look*: look too early and you spend a shrinking window
acting on stale information; look too late and the state resamples under you.

The two genres combine into a single compound skill: **choose when to observe, then time the
press against what you just collapsed**. The offline/SW mechanic maps directly onto this — in
online mode sampling (observing) the seed resets it to Math.random, so every observation is
destructive; in offline/cached mode the seed is deterministic, so observation is free and learning
is possible.

### The 3-5 best games in this compound genre

**Tunnel Rush (browser, 2016 — Unblocked/Poki)**
A first-person tunnel where sliced rings (rings with one open wedge) and rotating half-barriers
rotate and approach. Core mechanics that make it fun:
- Obstacles follow *consistent* rotation speeds. Once the player recognises the rhythm, they can
  predict exactly when a gap aligns with their lane. This is learnable pattern, not pure luck.
- Difficulty escalates by adding shape variety and increasing speed (not just speed). New shapes
  introduce new reading-skills: horizontal bars need a horizontal dodge, diagonal slashes need
  diagonal timing. Each shape is a new verb.
- No power-ups, no shields — purity. Every run starts fresh. Failure is always the player's.
- Speed increases the longer you survive, compressing the reaction window. Players self-select
  their ceiling, not a difficulty dial.
[Source: Tunnel Rush at Zen Arcades](https://zenarcades.com/tunnel-rush-unblocked/)
[Source: Tunnel Rush at SEELE AI Gaming](https://www.seeles.ai/games/action/tunnel-rush-fast-paced-3d-tunnel-racing-game)

**Geometry Dash (RobTop, 2013)**
A side-scrolling rhythm platformer where each obstacle is synchronised to a music track. Core
mechanics:
- *Music synchronisation*: players are not reacting visually — they learn the level as a piece of
  music. This shifts the skill from reaction time (limited by neurology) to anticipation (learnable
  with repetition). Higher Hz displays do reduce the error margin, but the ceiling is learned, not
  reflexed.
- *Millisecond tolerance windows* with immediate feedback (hit wall → back to start) keep the
  loop tight. Levels are 40 seconds to 3 minutes; the time-to-retry is never the level length,
  it's the distance to where you died.
- *Pattern recognition escalation*: each difficulty tier introduces a new movement mode (ship,
  ball, UFO, wave) rather than just tighter gaps. New mode = new rules = new learning arc.
[Source: Geometry Dash design analysis — mograph.com](https://mograph.com/renders/geometry-dash-a-rhythm-fueled-challenge-that-defines-precision-gaming/)
[Source: Geometry Dash Wikipedia](https://en.wikipedia.org/wiki/Geometry_Dash)

**Super Meat Boy (Team Meat, 2010)**
A precision platformer where each level is completable in under 30 seconds at mastery. Core
mechanics:
- *Instantaneous respawn* after death. No animation, no confirm dialog, no score. Failure cost is
  zero. This makes 50 attempts on one room feel like one extended learning session, not 50
  punishments.
- *Ghost replay on completion*: every run the player has died on is shown as a ghost. Players read
  their own history of failure to find the line that works. This is the "echo" mechanic — your
  past attempts become legible data.
- *Short mastery arc per level*: once the pattern is memorised, the run feels like muscle memory.
  Mastery is the reward, not a score.
[Source: Super Meat Boy on Grokipedia](https://grokipedia.com/page/Super_Meat_Boy)

**Observe (2024, Steam)**
A puzzle game where "your vision is the only tool at your disposal — watch as the world around
you reacts to being observed." Puzzle rooms contain lasers, mirrors, conveyor belts, duplicators
that *react to where the player is looking*. The escalation mechanic:
- Actions in completed rooms are *replayed* as the player enters future rooms. Players must think
  ahead: what will my past self do here, and can future-me use that?
- This is the temporal echo of Super Meat Boy's ghost, made into a *positive* mechanic rather than
  an informational one: your replayed self is a collaborator.
- The core skill is *choosing which observable sequence to create*, not just reacting to what is.
[Source: Observe on Thinky Games](https://thinkygames.com/games/observe/)
[Source: Observe on Steam](https://store.steampowered.com/app/2738190/Observe/)

**Frogger / Crossy Road**
The prototypical gap-crossing timing game. Hazards move in lanes at fixed speeds; the player reads
gaps in traffic and commits to crossing a lane. Core mechanic:
- Multiple simultaneous lanes creates *multi-track timing*: the player does not just time one gap
  but a sequence of gaps across lanes that must all be clear during a traversal.
- Holding still is punished (Crossy Road's scrolling camera erases the character). Commitment is
  mandatory; hesitation is death.
- Escalation via lane density and speed, not route complexity.
[Source: Evolution of crossing games — GRFCG](https://grfcg.in/the-evolution-of-crossing-games-from-frogger-to-chicken-road-2-38/)

---

## 2. OUR CORE LOOP (what to build)

### The game that does not yet exist

The current stage9 code has state (`currentLevel: 12`, `clarity: 84`) and a boss path but NO
rendered mechanics — the boss diagram is static ASCII text, the gap is only mentioned in hint
text, and `getBossSeed` calls `Math.random` in the live path (both prohibited: no real game,
determinism violation). The entire stage is a shell waiting for a game.

### The moment-to-moment loop

**Arena:** a terminal-style ASCII circle (~15 chars radius) rotates clockwise around centre `O`.
A gap of 3 chars is cut from the ring. The player `@` stands at `START` (bottom of the vertical
lane). `EXIT` is at the top. The crossing lane is the vertical axis through the centre.

```
           EXIT
            |
  ─────────────────────
   ──── . . . . ────
    ───              ──     <- ring with gap at ~0deg (12-o-clock = aligned)
   ─────────────────────
            |
           [ @ ]
          START

  [ OBSERVE ]  [ CROSS ]
```

The ring rotates at a deterministic rate derived from the current `seed` and `level`. The **gap
angle** at any `tick` is:
```
angle(t) = (seedBaseAngle + rotSpeed * t) % 360
```
When `angle(t)` is within the tolerance window (e.g. 330..30 deg = a ±30 deg window that shrinks
per cycle), pressing `CROSS` succeeds. Outside that window, the player bounces back to START.

**The observer connection:**
- **ONLINE (live seed, Math.random):** every time the player presses `OBSERVE` to sample the
  current angle, the seed is redrawn from `Math.random`. The ring's base angle jumps to a new
  random value. Observing *destroys* predictability — exactly the quantum measurement collapse.
  No amount of watching or timing helps because watching is what breaks it.
- **OFFLINE (SW cached seed = 0):** `seedBaseAngle` and `rotSpeed` are constants derived from
  seed 0. Pressing `OBSERVE` reads the current angle without disturbing it. The player can now
  *learn* the rotation and cross with confidence.

**The "aha" moment:** the player eventually realises that trying harder online makes it worse (each
sample resets the ring). Going offline is not a cheat — it is the only way to stop being the
thing that breaks the system.

### Why this is fun

- Timing games are universally satisfying because the feedback loop (press → succeed/fail) is the
  fastest possible reward cycle (< 1 second per attempt).
- The observer-effect metaphor is intellectually novel: players who get it feel smart, not lucky.
- The offline un-cheat is *diegetically consistent* with the theme — "stop watching and it
  stabilises" maps cleanly to "go offline and the SW serves a fixed seed".
- Zero learning curve to start (one button, watch the gap, press when aligned), deep ceiling
  (the later bands require holding multiple rhythms, making inferences from occluded state).

---

## 3. THE EXPANSION ARC — ordered new mechanics per band

### Model: Stage 2 Glyph Dungeon

Each Stage 2 biome band introduces a strictly new verb, not bigger numbers:
- Warrens (floors 1-3): move + avoid terrain.
- Cisterns (floors 4-6): break line-of-sight from ranged attackers.
- Emberworks (floors 7-9): manage spreading fire (a new timer / area mechanic).
- Overflow (floors 10+): manage darkness (FOV shrinks; new information budget).

Stage 9 must follow exactly this model. Deeper always means "a new thing to think about."

### The six bands of Observer State

---

**BAND 1 — "Signal" (levels 1-3)**
**NEW VERB: WATCH AND TIME (basic timing)**

Single ring. One gap. Constant rotation clockwise at 30 deg/s. Full ring visible. Tolerance
window: ±30 deg. The player's only task: press CROSS when the gap is near 12 o'clock.

This is the tutorial. No observer effect yet; the seed is fixed (level 1 always uses the same
starting angle). The player learns: ring rotates, gap cycles, timing window exists.

---

**BAND 2 — "Interference" (levels 4-6)**
**NEW VERB: HOLD MULTIPLE RHYTHMS**

Two concentric rings, each at a different speed (inner: 45 deg/s, outer: 30 deg/s). Both gaps
must be simultaneously aligned with the crossing lane for the cross to succeed. The aligned window
is the AND of both gaps — it is shorter and occurs less frequently.

New skill: track two independent periodicities, recognise when they converge. This is the same
cognitive load as Crossy Road's multi-lane timing but visualised on a single axis. The online
observer-effect is already present: sampling (observing) resamples both rings independently,
making convergence prediction impossible without the fixed seed.

---

**BAND 3 — "Collapse" (levels 7-9)**
**NEW VERB: CHOOSE WHEN TO OBSERVE**

One ring, but the display is uncertain: characters are replaced with `?` while the ring rotates
normally. The player must press OBSERVE (not CROSS) to *collapse* the display: the actual
characters appear for 1.5 seconds, then return to `?`. The player must time the CROSS within
that reveal window before the certainty expires.

New skill: a two-step decision — WHEN to observe (the reveal window you'll be working in) and
WHEN to cross (within the revealed window). The cost of observing too early is that certainty
expires before the gap arrives. The cost of observing too late is that the gap has already passed.

This is the most direct translation of the quantum observer effect into mechanics. Online, pressing
OBSERVE also resamples the seed, so the revealed position is a new random angle — the very act
of looking breaks what you learn. Offline, OBSERVE shows the real current angle without
disturbing the trajectory.

---

**BAND 4 — "Persistence" (levels 10-12)**
**NEW VERB: MAP ACROSS RUNS (run-to-run learning)**

The ring now has TWO gaps, but one is real (safe crossing) and one is a phantom (bounce-back,
marked with `x` in the ring character). Which slot is safe is determined by seed and not displayed
upfront. The first attempt is a 50/50 guess. But the result is logged: "gap at ~45 deg was safe"
or "gap at ~200 deg was phantom."

On the NEXT attempt, the player knows which gap to aim for. Over 3 attempts per level, the player
builds a map of this seed's safe gap. The new skill: *run-to-run memory*, using failure not as
punishment but as information that accumulates toward a correct crossing.

This also means the online mode is now doubly unlearnable: not only does each OBSERVE resample
the angles, but even knowing "the safe gap was at 200 deg last time" is useless because the seed
has changed and safe/phantom have potentially swapped. The offline seed 0 ensures the same gap
assignment every run — only the timing varies.

---

**BAND 5 — "Echo" (levels 13-15)**
**NEW VERB: READ YOUR OWN HISTORY**

The last two complete crossing attempts (successful or failed) are drawn as faint ghost rings
(`·` characters) overlaid on the current ring. Each ghost shows: where the gap was when the
player pressed, what the result was.

New skill: read your own mistake. Did you press too early (ghost gap was 20 deg before 12 o-clock)?
Or too late (ghost gap was 20 deg past)? The ghosts are calibration instruments, not noise. A
player who reads them can correct ±20 deg of timing error between runs without any additional
information.

This is Super Meat Boy's ghost replay mechanic, adapted for a one-axis timing game. The
information density of the echo is exact enough to make it genuinely useful, but requires the
player to mentally project "where was the gap when I pressed" — a slightly higher cognitive load
than just watching the gap.

---

**BAND 6 — "Blind Crossing" (levels 16+ / boss)**
**NEW VERB: INFER OCCLUDED STATE**

One quarter of the ring (a 90 deg arc containing the gap for part of every rotation) is replaced
by `█` characters — it is dark, unobservable. The player cannot directly see the gap when it
enters this zone. They must calculate: "the gap was at 120 deg 1.4 seconds ago, rotating at
30 deg/s, so now it is at 120 + (1.4 × 30) = 162 deg — it will exit the dark zone at 180 deg
in (180-162)/30 = 0.6 seconds."

This is a pure inference exercise. It is tractable if and only if:
1. The speed is deterministic (known, not jittered by new seeds).
2. The last known position was reliable (not corrupted by a resampled observation).

Both conditions are met only with the offline/SW cached seed. Online, every sample resets the
base angle, so the last known position is meaningless for extrapolation — you cannot project from
a landmark that keeps moving when you look at it.

**This is where the un-cheat becomes load-bearing.** Without the SW cache, level 16 is provably
impossible, not merely hard. The player cannot guess well enough; the gap is always somewhere
random behind the dark zone. With seed 0 and the ring running at 30 deg/s, the inference is a
straightforward two-step mental calculation that a player who has learned through bands 1-5 can
perform. Going offline is not a bypass — it is the required tool.

**Boss crossing:** the boss attempt is at level 18 (the "clarity 100" threshold). The ring runs
at 45 deg/s with a 60 deg dark zone and a ±15 deg tolerance window. The player must:
1. Activate offline mode (read service-worker-notes.txt → activate SW cache → seed fixed to 0).
2. Observe the ring base angle at start.
3. Track the gap through the dark zone using mental arithmetic or counting at the known speed.
4. Press CROSS when the inferred angle crosses ~355..15 deg.

---

### Summary table

| Band | Levels | New verb                        | What changes from previous band                        |
|------|--------|---------------------------------|-------------------------------------------------------|
| 1    | 1-3    | Watch and time                  | Nothing yet — baseline established                    |
| 2    | 4-6    | Hold multiple rhythms           | Second ring at different speed; AND-window timing     |
| 3    | 7-9    | Choose when to observe          | Two-step decision; reveal window expires; OBSERVE key |
| 4    | 10-12  | Map across runs                 | Safe/phantom gap; failure is information; run memory  |
| 5    | 13-15  | Read own history (ghost echoes) | Past attempts drawn as overlay; calibration from self |
| 6    | 16+    | Infer occluded state            | Dark zone hides gap; arithmetic extrapolation needed  |

---

## 4. FUN AND RETENTION (40 min to 2 hr arc)

### Economy and meta-loop

- **Clarity** is the score (0-100, then bonus above 100). Each successful crossing at band N adds
  `N * 5` clarity. Clean crossing (no bounce on the level) adds `+2` clarity bonus.
- At clarity 100, the boss level (18) unlocks. The boss is not harder than a normal band 6 level —
  it just requires the full un-cheat precondition (offline mode). This is the carrot: players who
  have learned inference in band 6 will beat the boss on the first attempt IF they think to go
  offline. Players who have not learnt will keep bouncing without understanding why.
- Clarity persists across sessions (state.clarity already exists). No reset on death.

### Risk-reward decisions

- **OBSERVE vs. CROSS trade-off (Bands 3-6):** every OBSERVE press has a cost. Online: destroys
  current seed. Band 3: starts an expiring certainty window. Band 5: echoes consume display space.
  Band 6: an OBSERVE press in the dark zone reveals the gap position but does so AT a cost of the
  certainty countdown — pressing at the wrong moment reveals nothing useful.
- **Skip attempts:** at any level, pressing CROSS immediately (no observation) is a valid strategy
  for fast bands where the speed is so well-known that blind-fire has >50% hit rate. This is a
  skill test, not a patience test.
- **Clarity floor:** you cannot lose clarity (only fail to gain it). This eliminates loss aversion
  and makes attempting the boss freely accessible once level 15 is cleared.

### What sustains 40min-2hr

1. Band transitions: each of the 6 bands reads as a new game in the same frame. Players who feel
   "done" with band 2 discover band 3 is a completely different decision problem.
2. The aha-moment arc: bands 1-2 feel like a timing game; band 3 reveals the observer-effect
   theme explicitly (the OBSERVE key is destructive online); band 6 delivers the intellectual
   payoff ("I need to go offline, not because I'm cheating but because the physics of the system
   demand it").
3. Instant retry: each level attempt is 3-15 seconds. No waiting, no loading, no penalty screens.
   The throughput of attempts is high enough that reaching band 5 from band 4 takes dozens of
   short loops, not one long grind.
4. Legible progress: the clarity counter rises visibly, the band name changes (Signal /
   Interference / Collapse / Persistence / Echo / Blind Crossing), and the ring visual complexity
   increases. The player can always see where they are and how far they have come.

---

## 5. CAVEATS — determinism, perf, uniqueness

### Determinism (critical — Math.random is banned in the live path)

The existing `getBossSeed` in `boss.js` calls `Math.random()` directly in the live path — this
must be replaced. The correct model:

- **Live path (online):** `getBossSeed` still calls `Math.random()` but this is the *content* of
  the game mechanic (the destructive observation), NOT the seeding of the game engine. The ring
  animation tick itself must be deterministic, driven by `performance.now()` - `t0` (elapsed ms)
  and the current seed value. The seed value is what changes (legitimately) when the player
  observes online.
- **The animation loop** must use: `angle(t) = (baseAngle + rotSpeed * elapsed) % 360` where
  `baseAngle` and `rotSpeed` are derived from seed via a deterministic transform (e.g., Mulberry32
  or the existing `rng.js` LCG from stage3). `Math.random` must NEVER appear in the angle
  calculation.
- **The offline seed (0)** produces a specific `baseAngle` and `rotSpeed` every time. The ring is
  always in the same position at t=0. This is the requirement for inference in band 6.

### Performance

The ring animation is a ~15-char ASCII string redrawn via `setInterval` at 100ms (10 fps).
This is fast enough to show rotation convincingly and trivially cheap on a static-hosting page.
No canvas, no WebGL. DOM text node `.textContent` updates at 10fps are imperceptible in CPU cost.

### Uniqueness within the metagame

- Stage 2 (Glyph Dungeon): grid-movement roguelike, turn-based, spatial.
- Stage 3 (Nonogram): logical deduction, no time pressure.
- Stage 5 (Calibration): ???
- Stage 7: ???
- Stage 9 (Observer State): real-time timing + epistemological puzzle about observation cost.

Stage 9 is the ONLY stage with real-time animation and a timing press mechanic. It is also the
only stage where the un-cheat is motivated by the stage's own thematic content (quantum observer
effect = go offline to freeze the seed). No other stage has this double layer of coherence
between theme, mechanic, and un-cheat.

### The "not bypassable" test for the boss un-cheat

Can a player beat the boss (level 18, band 6) without going offline?

No. Band 6 requires inferring the gap position behind a 60 deg dark zone. The gap's base angle
resets to `Math.random` every time the player observes online. Even if the player guesses the
speed correctly (30 deg/s), they cannot extrapolate from a base angle that changes on each look.
The variance from a pure random base angle means the correct press time varies by up to ±5 seconds
across attempts. No human can time within ±15 deg of a 45 deg/s ring with 5 seconds of base-angle
uncertainty. The offline seed = 0 eliminates base-angle uncertainty entirely, reducing the
required precision to sub-second anticipation — achievable.

---

## Sources

- [Tunnel Rush at Zen Arcades](https://zenarcades.com/tunnel-rush-unblocked/)
- [Tunnel Rush at SEELE AI Gaming](https://www.seeles.ai/games/action/tunnel-rush-fast-paced-3d-tunnel-racing-game)
- [Geometry Dash design analysis at mograph.com](https://mograph.com/renders/geometry-dash-a-rhythm-fueled-challenge-that-defines-precision-gaming/)
- [Geometry Dash Wikipedia](https://en.wikipedia.org/wiki/Geometry_Dash)
- [Super Meat Boy on Grokipedia](https://grokipedia.com/page/Super_Meat_Boy)
- [Observe puzzle game on Thinky Games](https://thinkygames.com/games/observe/)
- [Observe on Steam](https://store.steampowered.com/app/2738190/Observe/)
- [Evolution of crossing games (Frogger / Crossy Road) — GRFCG](https://grfcg.in/the-evolution-of-crossing-games-from-frogger-to-chicken-road-2-38/)
- [Geometry Dash: Complete Case Study on Rhythm — geometrydash.co.uk](https://geometrydash.co.uk/what-is-geometry-dash/)
- [Recreate Flappy Bird's flight mechanic — Raspberry Pi / Wireframe #29](https://www.raspberrypi.com/news/recreate-flappy-birds-flight-mechanic-wireframe-29/)
- [Replayability, Part 2: Game Mechanics — Game Developer](https://www.gamedeveloper.com/design/replayability-part-2-game-mechanics)
- [Game Design Principles — gamedesignskills.com](https://gamedesignskills.com/game-design/concepts/)
- [Service Workers and Offline Caching — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Caching strategies overview — Chrome for Developers / Workbox](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [Service worker caching and HTTP caching — web.dev](https://web.dev/articles/service-worker-caching-and-http-caching)
