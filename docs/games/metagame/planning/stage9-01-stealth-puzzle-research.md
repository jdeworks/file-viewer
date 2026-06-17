# Stage 9 — 01: Stealth / Reaction Puzzle Genre Research

Reference research for the **Observer State** Stage 9 design. Developer-facing distillation
of the stealth game genre with particular focus on: sight cone systems, patrol AI design,
information asymmetry as the core tension, binary vs. graduated detection, top-down vs.
side-view stealth, the "trial and error + pattern recognition" learning loop (Hotline Miami),
and clarity-first design principles (Mark of the Ninja). Companion doc
`stage9-02-our-game-design.md` maps this onto Stage 9.

---

## A. The seminal games and what each contributed

### Thief: The Dark Project (1998, Looking Glass Studios)
The ancestor of modern stealth games. Light and shadow as primary cover mechanic. The
protagonist (Garrett) navigates levels by avoiding pools of light; enemies detect through
sight AND sound. The "light gem" in the HUD shows the player's current visibility at a glance.

**Key design lessons:**
- **Dual detection systems (sight + sound).** Guards react to both visual exposure and audio
  cues (footstep volume varies by surface type — carpet is quiet, stone is loud). Adding a
  second detection axis doubles the strategic space: a player might cross a lit area by moving
  very slowly (sound-masking the visibility).
- **The light gem as immediate feedback.** A single gem that darkens/lightens tells the player
  their visibility state at all times. No confusion about "can they see me?" — the gem is the
  answer. This is information design perfection: single indicator, unambiguous state.
- **Environmental storytelling through guard behavior.** Guards react to open doors, bodies,
  missing objects. The world feels inhabited; every player action leaves a trace.

### Metal Gear Solid (1998, Konami)
First major stealth game to show the player the enemy's field of view directly (the "radar"),
giving the player the same information the enemy would have about its own sight range. This
transparency was revolutionary — it transformed stealth from guesswork into planning.

**Key design lessons:**
- **Radar as information equity.** Showing the player a top-down overhead with guard positions
  and sight cones was controversial (doesn't real stealth require not knowing?). In practice,
  it made stealth *strategic* rather than *frustrating*. Players could plan routes around
  visible information.
- **Alert state escalation.** Guards have three states: Normal → Caution → Alert. Each state
  changes behavior (faster patrol speed, more coverage area, more guards active). Returning
  from Alert to Normal takes time — encouraging the player to let situations defuse rather than
  attempt to outrun the alert state.
- **Distraction as a core tool.** Throwing a ration or shooting a wall creates a sound event
  that draws guards toward a location, temporarily clearing a path. Manipulation of guard
  attention as a primary mechanic (not just avoidance).

### Splinter Cell series (2002+, Ubisoft)
Multi-layered detection with the most sophisticated sight cone implementation in the genre.
From Splinter Cell: Blacklist (GDC analysis by Martin Walsh): enemy vision consists of multiple
geometric primitives — a forward box (best vision), a "coffin shape" for peripheral vision —
not a simple cone. Guards also react to the environment (open doors, bodies, missing objects).

**Key design lessons:**
- **Sight cones are not actual cones.** Real detection geometry that feels accurate requires a
  wider model than a triangular fan — peripheral vision is wide but not sharp, central vision
  is narrow but penetrating. In 2D top-down implementations, a simplified wedge + a wider
  low-sensitivity arc captures this feel.
- **Three-choice approach.** Splinter Cell offers three playstyle paths: Ghost (avoid all),
  Panther (silent takedowns), Assault (combat). Different scores per style. This creates build
  diversity — the same level is designed for three different games.
- **Information gathering before acting.** The snakecam, binoculars, and sonar goggles all
  let the player gather guard positions before committing to an action. The planning phase
  is as important as the execution phase.

### Mark of the Ninja (2012, Klei Entertainment)
The most important 2D stealth game. Nels Anderson's design philosophy: "Clarity is not to
be understated." Five "heresies" that broke with 3D stealth conventions:

1. **Binary visibility.** In shadow = invisible. In light = visible. No gradient.
   The character sprite itself changes appearance (glowing outline in light, dark silhouette in shadow).
   No meter needed — the player's own character is the meter.
2. **Sound rings.** Every sound the player makes produces an animated expanding ring showing
   exactly how far the sound travels in the game world. Guards who have the ring reach them
   react. Complete information, perfect clarity.
3. **Checkpoints between every meaningful encounter.** Stealth + permadeath = frustration.
   Stealth + checkpoints = learning. The player always dies near where they were trying, not
   at the beginning of the level.
4. **Limited motor skill reliance.** Stealth kills use a timing window with forgiveness.
   Missing the perfect timing still completes the kill, just more noisily. The skill is in
   *deciding to kill*, not in precise button execution.
5. **Fog of war.** Areas outside the player's immediate sight are fogged. Guards are shown
   with a red outline at their last known position if the player has seen them but lost sight.
   The fog creates tension (unknown) while the red outlines give actionable information.

**Synthesis lesson:** Mark of the Ninja is the gold standard for "fair stealth." The player
always knows *exactly* why they were detected — because the game shows exactly what the
enemy can see and hear. There are no bullshit detections. This is the correct model.

### Hotline Miami (2012, Dennaton Games)
Not a pure stealth game, but its design loop — **trial and error + pattern recognition →
perfect execution** — is deeply relevant to Stage 9. Every level is:
1. Enter the level → immediately die
2. Observe enemy positions in the death camera
3. Form a plan based on new information
4. Attempt execution → may die again
5. Repeat until the level is solved "perfectly"

The respawn is instant. The learning loop is fast. The "aha" moment when a plan succeeds
is enormously satisfying precisely because the player designed the plan themselves.

**Key design lessons:**
- **Death as information delivery.** Dying in Hotline Miami gives the player a top-down view
  of where they died and who killed them. They can identify the enemy they missed. Death is not
  punishment — it is the game's way of teaching.
- **Fast respawn as psychological framing.** The instant "press R to restart" removes the
  punishment felt from death. Players feel curiosity ("what if I tried differently?") rather
  than frustration ("I have to redo everything").
- **Choreography as success state.** A successful run through Hotline Miami feels like a
  dance — fluid, fast, perfectly timed. The satisfaction is aesthetic, not merely mechanical.
  Players seek beauty in their solutions.
- **Mandatory learning through failure.** The game *assumes* the player will die multiple times.
  The design is built around this. First attempt is always exploratory; success comes later.

### Invisible, Inc. (2015, Klei Entertainment)
Turn-based stealth. Guards have patrol patterns visible to the player; the player moves one
tile at a time; detection is geometrically calculated per turn. Added the "Overwatch" mechanic:
guards in alert state can fire at any unit that enters their sight during the enemy turn.

**Key design lessons:**
- **Turn-based removes reaction pressure.** All tension in stealth games is either spatial
  (where am I vs. where is the guard?) or temporal (will I cross the sight cone in time?).
  Turn-based eliminates temporal tension and concentrates entirely on spatial reasoning.
  This creates a purer puzzle.
- **Guard state modeling for planning.** Players can see guard patrol routes and plan multiple
  turns ahead. The game rewards careful thought over quick reflexes. Lesson: *when the player
  can predict guard behavior, stealth becomes a planning game, not a reaction game.*

### Quantum (puzzle stealth exploration)
A less well-known genre subfield: stealth as *physics puzzle*. Some indie stealth games use
quantum mechanics metaphors (observation collapses state) as their central mechanic. The
closest analogue to our Observer Effect mechanic in Stage 9.

**Example:** In quantum-stealth games, the act of observing an enemy (looking at them) changes
their behavior. This is the Heisenberg uncertainty principle in game form: measurement affects
the measured system. Our Stage 9 inverts this — observation also freezes the *observer*.

---

## B. Core mechanics taxonomy

### 1. Sight cone geometry

The three main implementations:

**Simple triangle:**
```js
// Triangle from enemy position, angle, and length
function inSightCone(enemy, target) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist > enemy.sightRange) return false;
  const angle = Math.atan2(dy, dx);
  const angleDiff = Math.abs(normalizeAngle(angle - enemy.facing));
  return angleDiff < enemy.sightAngle / 2;
}
```

**Wedge + peripheral arc (Splinter Cell model):**
```js
function detectionLevel(enemy, target) {
  const angleDiff = getAngleDiff(enemy, target);
  const dist = getDist(enemy, target);
  if (angleDiff < FORWARD_ANGLE && dist < FORWARD_RANGE) return 1.0;  // full detection
  if (angleDiff < PERIPHERAL_ANGLE && dist < PERIPHERAL_RANGE) return 0.3;  // slow detect
  return 0;
}
```

**Binary shadow (Mark of the Ninja):**
```js
// Each tile is either lit or shadowed (pre-computed from light sources)
// Shadowed tile = fully invisible regardless of distance or angle
function isVisible(enemy, target) {
  if (target.tileLight === 'shadow') return false;
  return angleDiff(enemy, target) < FORWARD_ANGLE;
}
```

Our Stage 9 uses a **simplified wedge** (forward detection cone, top-down) with **binary
visibility from shadow** — tiles not in any observer's sight cone render as pitch black.
The black/white artstyle makes this visually explicit.

### 2. Guard state machine

```js
// Standard guard states with transitions
const STATES = { PATROL: 0, SUSPICIOUS: 1, ALERT: 2 };

function updateGuardState(guard, playerInCone, soundHeard) {
  switch (guard.state) {
    case STATES.PATROL:
      if (playerInCone) guard.state = STATES.ALERT;    // direct sight = immediate alert
      if (soundHeard)   guard.state = STATES.SUSPICIOUS;
      break;
    case STATES.SUSPICIOUS:
      guard.suspicionTimer -= dt;
      if (guard.suspicionTimer <= 0) guard.state = STATES.PATROL;   // returns to patrol
      if (playerInCone) guard.state = STATES.ALERT;
      break;
    case STATES.ALERT:
      guard.alertTimer -= dt;
      if (guard.alertTimer <= 0) guard.state = STATES.SUSPICIOUS;   // steps down to suspicious
      if (guard.alertTimer <= 0 && !playerInCone) guard.state = STATES.PATROL; // full clear
      break;
  }
}
```

### 3. Patrol route design

**Waypoint patrol:** guard moves from point A to point B to point C, loops.
**Timing variation:** add randomized pause at each waypoint (1–3 seconds) to prevent
precise timing exploitation.

For our Stage 9: **each level has a distinct patrol pattern per observer.** The pattern is
consistent but not immediately legible — the player must observe several loops to deduce it.

### 4. The Observer Effect mechanic (our innovation)

Standard stealth gives the player information without cost. Our Stage 9 introduces a *cost*
to observation: **hovering the cursor over an observer freezes both the observer AND the
entity (player).**

This creates the core tension:
- *To plan, you must observe* (look at the observer)
- *To act, you must stop observing* (move the cursor away)
- *You cannot do both simultaneously*

```js
// Observer Effect mechanic
function update(cursor) {
  const hoveredObserver = getObserverUnderCursor(cursor);

  if (hoveredObserver) {
    hoveredObserver.frozen = true;    // observer stops patrolling
    entity.frozen = true;             // entity also stops moving
  } else {
    allObservers.forEach(o => o.frozen = false);
    entity.frozen = false;
  }
}
```

This is a **novel mechanic with no genre precedent.** It reframes stealth as a *choice between
knowing and acting* — the normal stealth game grants both; ours makes them mutually exclusive.

### 5. Ghost route design

Mark of the Ninja's design: every level has optional "ghost routes" — paths that let the
player pass without any observer interaction at all. Finding and executing these routes is
a higher-skill achievement.

Our Stage 9: each level's ghost route is discoverable by reading patrol patterns without
using the Observer Effect at all — purely through patient observation of timing. Players
who find ghost routes earn permanent upgrades (Clarity levels).

### 6. Detection types

| Type | Trigger | Response |
|------|---------|---------|
| **Sight detection** | Entity enters observer sight cone | Instant level reset |
| **Peripheral awareness** | Entity at far edge of cone; moving | Suspicion buildup over 2s |
| **Sound detection** | Entity moves adjacent to observer | Suspicion buildup over 1s |
| **Body discovery** | Entity passes through a frozen observer's last seen position | Alert state |

For Stage 9's artstyle (stark black and white), we use only sight detection and its
peripheral variant. No sound mechanics (they would require audio indication in a primarily
visual game). The focus is purely on spatial geometry and timing.

---

## C. Level design principles for stealth

### The safe observation position
Every good stealth level begins with a **safe observation position** — a place where the player
can watch guard patterns without being detected. The player needs to:
1. See at least one complete patrol loop
2. Identify the guard's pattern
3. Plan their path before committing to movement

**Our Stage 9:** the entity always starts at an observation position (entry point with no
immediate observers in sight). The level's structure gives the player time to observe before
committing.

### Choke points and safe corridors
Level design creates alternating zones:
- **Danger zone:** inside an observer's cone at some point in its rotation
- **Safe corridor:** path that never enters any observer's cone

The player's challenge is to identify the safe corridors and thread through them, or to time
their crossing of danger zones to when the cone is rotated away.

**Observer Effect implication:** a player who *knows* the safe corridor (from observation)
can move through it without ever using the Observer Effect — they've replaced the mechanic
with knowledge.

### Escalating density
```
Act 1 (levels 1–4):   1–2 observers, simple patrol loops, wide safe corridors
Act 2 (levels 5–8):   2–3 observers, overlapping sight cones, coordination required
Act 3 (levels 9–12):  3–4 observers, reactive observers (one's movement triggers another)
Boss:                   1 massive observer covering 90% of the room; narrow rotating safe path
```

---

## D. Standard formulas

### Detection radius and angle
```js
// Sight cone parameters per observer type
OBSERVER_TYPES = {
  standard: { range: 5, angle: 90,  patrolSpeed: 1.0 },
  narrow:   { range: 8, angle: 45,  patrolSpeed: 0.8 },  // long-range but narrow
  wide:     { range: 3, angle: 120, patrolSpeed: 1.2 },  // close-range, wide sweep
}
```

### Reset timing (Hotline Miami lesson)
```js
// Time from death/detection to restart should be under 0.5 seconds total
// Detection flash: 0.2s
// Death animation: none (instant cut to black)
// Level reset: 0.1s
// Total: 0.3s  ← players don't feel punished; they feel like trying again
```

### Ghost route timing window
```js
// A "ghost route" window: the moment when all observers are turned away simultaneously
// For a 2-observer level, the window is:
window = (observerA.turnAwayDuration AND observerB.turnAwayDuration) overlap
// If each observer turns away for 4 seconds, and they desync by 2 seconds:
// Window = 2 seconds (during which both are turned away)
// Design guideline: ghost window ≥ time to cross safe corridor at normal speed
```

---

## E. UX patterns for top-down 2D stealth

- **Always-visible sight cones.** Render observer sight cones as translucent overlays on the
  field, visible even through walls (it's the player's "planning layer"). Mark of the Ninja
  confirmed: showing cones doesn't make stealth trivial, it makes it strategic.
- **Patrol path indicators.** Optional: show dotted lines indicating where each observer will
  move. Useful in tutorial levels; can be toggled off for harder modes.
- **Death camera.** On detection: freeze frame, highlight the observer that detected, show its
  sight cone position at that moment. Then instant reset. Players understand *why* they failed.
- **Sound rings** (if sound detection is added): expanding circular animation showing sound range.
  Not needed in Stage 9 (sight-only), but useful if we add noise-making mechanics later.
- **Observer freeze indicator.** When Observer Effect is active, show a visual "frozen" state on
  the observer (ice crystal overlay, blue tint, paused animation). Makes the mechanic legible.
- **Entity freeze indicator.** Matching visual on the entity when Observer Effect is active —
  the player must notice that they also stopped moving.

---

## F. Design pitfalls to avoid

1. **Invisible walls or unexplained detections.** Players will stop playing if they're detected
   and don't know why. Every detection must be explainable and replicable. Mark of the Ninja's
   binary visibility rule exists to prevent this.
2. **Checkpoints too far apart.** If a level takes 3 minutes of careful navigation and the
   player dies at the end, having to restart from the beginning is enraging. Checkpoint every
   30–60 seconds of progress at minimum.
3. **Observer patterns that are too random.** If observer patrol has random variation, the
   player can't learn the pattern. Randomness is the enemy of stealth — stealth is about
   prediction. Our observers must have perfectly repeatable, learnable patterns.
4. **The Observer Effect making impossible situations.** If the only solution requires observing
   AND moving simultaneously (the mechanic explicitly prevents), the level is broken. Every
   puzzle must be solvable without simultaneous observation and movement.
5. **Stealth broken by cursor positioning.** If the freeze requires hovering the cursor over
   the observer sprite but the sprite is small, precise cursor positioning becomes the challenge
   instead of stealth decision-making. Observer sprites must be large enough to hover easily.
6. **Too many observers to read at once.** Players can track 2 observers simultaneously;
   3 is hard; 4+ is overwhelming. Stage 9 caps at 4 observers in any single room/frame.

---

## G. The Observer Effect — philosophical design note

The Observer Effect mechanic embeds the stage's theme (Stage 9 — Consciousness, Observation,
the Paradox of Watching Yourself) directly into gameplay. In quantum physics, the observer
effect describes how the act of measuring a system necessarily disturbs it. In our game:

- Watching (hovering over) an observer disturbs its behavior (freezes it)
- But disturbing it also disturbs the watcher (freezes the entity)
- Knowledge and action are placed in explicit tension
- The paradox is: to act perfectly (without looking) requires the knowledge gained from looking

The resolution is not the resolution of the paradox — it is learning to act *without looking*,
using knowledge accumulated through previous observation. The game teaches the player to
internalize patterns so that looking becomes unnecessary. This is the stage's psychological arc.

---

## H. How this maps to Stage 9: Observer State (pointer)

Stage 9 borrows **Mark of the Ninja's** clarity principles (binary visibility, explicit sight
cones, instant respawn, checkpoint density), **Hotline Miami's** trial-and-error-as-learning
loop (die → observe → plan → execute), **Metal Gear Solid's** guard state machine (patrol →
suspicious → alert), and **Invisible, Inc.'s** insight that stealth becomes a planning game
when the player can predict guard behavior.

Our key innovation: the **Observer Effect mechanic** (hovering = mutual freeze) which has no
precedent in the genre and directly embeds the stage's philosophical theme into the core
mechanic. The artstyle (stark black and white, expressionist shadows) and the offline cache
file viewer integration (observers' starting positions are predictable offline) complete the
stage's design identity. Full spec in `stage9-02-our-game-design.md`.
