# Stage 5 — 01: Top-Down Mini Racer Genre Research

Reference research for the **Signal Racer** Stage 5 design. Developer-facing distillation
of the top-down racing genre's core mechanics: car physics, AI opponent design, track structure,
upgrade progression, and how competitive pacing is managed. Companion doc
`stage5-02-our-game-design.md` maps this onto our Stage 5 implementation.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Micro Machines** | 1991, Codemasters | Popularized the top-down racing genre. Tiny cars on household surfaces (kitchen table, pool table). Key contribution: the "drift to overtake" mechanic and the penalty for falling off-screen (eliminated). Lesson: *losing a visual connection to the car creates tension more effectively than HP loss*. |
| **Super Off Road** | 1989, Rare | Four-car simultaneous racing; upgrade economy between races (better tires, nitro, suspension). First major implementation of **between-race upgrades** that persist. |
| **Death Rally** | 1996, Remedy | Added **combat** to top-down racing — weapons, projectiles, car damage. Lesson: *aggression as a meta-layer above driving skill* changes who leads the race. |
| **Rock n' Roll Racing** | 1993, Blizzard | **Music-driven pacing** and personality-driven cars. Announced lap times, commentary, and music synced to gameplay. Lesson: *audio is the primary feedback loop in racing — players feel pace through sound*. |
| **Nitro** | 1990, Psygnosis | **Fuel management** adds a resource layer: going fast burns fuel faster; refueling at pit stops is a tactical timing decision. Lesson: *resource constraints within the race create decisions beyond pure driving skill*. |
| **PolyTrack** (modern) | 2024, Kodub | **Ghost-based asynchronous multiplayer.** Race against recorded best laps; no rubber-banding. Lesson: *transparent AI (showing exact ghost position) feels fairer than rubber-banding; players learn by watching ghosts*. |
| **Burnout (top-down inspirations)** | 2001+, Criterion | **Boost-from-risk mechanic.** Boost meter fills by driving dangerously (near misses, oncoming lane, drafting). Lesson: *rewarding risk creates a push-your-luck layer above clean driving*. |
| **Slipstream** / **Horizon Chase** | 2014, 2021 | **Retro arcade aesthetic with modern feel.** Smooth controls, clear visual language, tight circuits. Lesson: *pixel art + synthwave palette reads as "fast" to players — the aesthetic communicates speed before the car moves*. |

---

## B. Core mechanics taxonomy

### 1. Top-down car physics (simplified)

Top-down racing uses a **simplified kinematic model** — no full rigid-body simulation.

```js
// Simplified top-down car physics (per-frame update)
car.velocity += car.acceleration * dt;          // engine force
car.velocity *= (1 - car.friction * dt);        // friction
car.velocity = clamp(car.velocity, -maxSpeed * 0.3, maxSpeed);

// Steering: angular velocity scales with speed
const steerFactor = car.speed / maxSpeed;
car.angle += steerInput * car.turnRate * steerFactor * dt;

// Position update
car.x += Math.cos(car.angle) * car.velocity * dt;
car.y += Math.sin(car.angle) * car.velocity * dt;

// Drift: reduce sideways friction when speed is high + turning hard
if (speed > 0.7 * maxSpeed && Math.abs(steerInput) > 0.5) {
  car.lateralFriction = 0.3;  // low = more drift
} else {
  car.lateralFriction = 0.9;  // high = grip
}
```

**Simplified model advantages for browser games:**
- No Box2D dependency required
- Consistent across frame rates with `dt` normalization
- Tunable via friction, turnRate, and maxSpeed without physics expertise

### 2. Track design principles

**Track anatomy:**
- **Straights:** reward raw speed; allow drafting behind opponents
- **Corners:** differentiate skill levels; sharp corners require braking, gradual corners reward entry speed
- **Chicanes:** force steering rhythm; test precision
- **Shortcuts:** reward track knowledge; discoverable via exploration

**Track layout types:**
| Type | Character | Suitable for |
|------|-----------|-------------|
| Oval | Simple, fast, consistent | Early races, learning physics |
| Figure-8 | Intersection creates risk | Mid-game: collision events |
| Circuit (loop) | Multiple corner types, 2–3 km lap | Standard competitive racing |
| Technical | Many tight corners, short lap | Skill test for advanced races |
| Mixed | Alternates tight + open sections | Championship finale |

**Our Stage 5 tracks:** 8 circuits across 3 worlds (Grid, Signal, Interference). Each track is
a distinct circuit (no ovals). Tracks are hand-designed, not procedurally generated — procedural
tracks rarely produce good racing lines.

### 3. AI opponent design

**Standard approaches:**
1. **Waypoint following:** AI navigates a list of path points around the track. Simple to implement;
   AI is predictable but functional.
2. **Rubber-banding:** AI speed modified based on distance from player. Keeps races close but
   feels artificial when noticed.
3. **Driver skill modulation:** AI uses a "driver skill" variable (0–1) that affects how well
   it takes corners. Lower skill = earlier brake point, wider corner exit.
4. **Behavioral scripting:** AI has phases (aggressive start, conservative mid, sprint end).

**Our approach: Hybrid waypoint + personality:**
- All AI follows waypoints (consistent base behavior)
- Three distinct AI personalities (see Stage 5 §C: The Carrier, The Noise, The Jammer)
- Rubber-banding disabled for top 2 positions; enabled only to prevent lapping stragglers
- Player can hear AI behavior changes via audio cues (Stage 5's file viewer feature)

### 4. Upgrade progression (between-race meta)

Between-race upgrades are the meta-layer that creates run-to-run progression:

**Stat axes:**
- **Speed** — top speed ceiling
- **Handling** — turn rate and corner exit stability
- **Boost** — boost capacity (amount storable) and regeneration rate
- **Signal Integrity** — Stage 5's specific stat (resistance to damage from wall/collision)

**Upgrade economy:**
Packets (the stage's primary resource) are earned by:
- Finishing position: 1st=100, 2nd=60, 3rd=30, 4th=0
- Signal Integrity bonus: +1 Packet per % of Integrity above 80% at race end
- Discovery bonus: first-time track = +25 Packets (exploration reward)

**Upgrade cost (per stat level):**
```js
upgradeCost(stat, level) = 50 * 1.4^level
// Level 1→2: 70    Level 3→4: 137    Level 5→6: 268    Level 8→9: 728
```

### 5. Boost mechanic

Boost is the primary active decision in arcade racing:
- **Boost reserves** (segments): 3 at base, upgradeable to 6
- **Boost consumption:** 1 segment per 1.5s of boost
- **Boost regeneration:** 1 segment per 8s without using boost; also regenerates on clean draft
  (following within 1 car-length of AI = "drafting," regenerates 1 segment per 3s)
- **Boost effect:** +40% speed for duration; cannot turn as sharply while boosting (tradeoff)

```js
// Boost system
if (boostInput && boostSegments > 0 && boostTimer <= 0) {
  boostActive = true;
  boostTimer = 1.5;           // segment lasts 1.5 seconds
  boostSegments--;
}
car.maxSpeed = boostActive ? baseMaxSpeed * 1.4 : baseMaxSpeed;
car.turnRate = boostActive ? baseTurnRate * 0.7 : baseTurnRate;  // harder to turn
```

### 6. Signal Integrity (our mechanic)

Signal Integrity replaces the standard HP/damage system. It measures the "cleanliness" of
the signal — how undistorted the entity's transmission has been during the race.

- **Starts at 100%** each race
- **Damaged by:** wall collisions (−5%), opponent collisions (−10%), going off-track (−3%/s)
- **Bonus at race end:** Integrity above 80% → +Packets (see §4)
- **Penalty at 0%:** Packets earned during race begin dropping off (a "packet loss" effect —
  counter decrements at 2 Packets/second until the race ends)
- **Not a game-ender:** reaching 0% Integrity doesn't eliminate the player; it's a performance
  tax that makes the bonus unobtainable

### 7. Championship structure

**Session structure (per Stage 5):**
- 8 circuits in 3 worlds
- Complete all circuits in a world to advance to the next
- Best-of-3 race results determine world advancement (must place top 2 in at least 2/3 races)
- Championship race = bonus race across the 3 best circuits (player's top performer + 2 hardest)
- Boss race = dedicated race vs The Jammer (see §8)

**Retry mechanic:** The player can retry a race unlimited times. Each retry:
- Costs 15 Packets (minor penalty — investment in improvement)
- The AI opponents' stats do NOT change on retry (learning curve, not difficulty reset)

---

## C. Standard formulas

### Race lap time estimation
```js
// Track lap time in seconds for a car at a given speed level
lapTime(track, car) = track.length / (car.maxSpeed * 0.75)
// 0.75 factor: average speed is ~75% of top speed due to cornering
// Example: 1000px track, speed level 5 (maxSpeed=300px/s): 1000/(300*0.75) = 4.4s per lap
// 5 laps = 22s — very fast; recommend track length 3000-5000px for 1-2min races
```

### AI waypoint following
```js
// Simple waypoint AI
function aiUpdate(car, waypoints) {
  const target = waypoints[car.waypointIndex];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = normalizeAngle(angleToTarget - car.angle);

  car.steerInput = clamp(angleDiff * car.driverSkill, -1, 1);
  car.throttle = 1 - Math.abs(angleDiff) * 0.5;  // slow into corners

  if (dist(car, target) < car.speed * 0.5) {
    car.waypointIndex = (car.waypointIndex + 1) % waypoints.length;
  }
}

// Driver skill (per personality):
// The Carrier: 0.8 (competent, consistent)
// The Noise:   0.6 ± 0.3 per frame (erratic — random perturbation)
// The Jammer:  0.9 (high skill, also actively tries to block player)
```

### Rubber-banding formula (limited version)
```js
// Only applies to The Noise (to prevent it from being lapped trivially)
function applyRubberBand(aiCar, playerCar, factor=0.3) {
  const distFromPlayer = racePosition(aiCar) - racePosition(playerCar);
  // distFromPlayer > 50m = apply catch-up: increase AI speed
  if (distFromPlayer > 50) {
    aiCar.maxSpeed *= 1 + (distFromPlayer / 500) * factor;
  }
}
// The Carrier and The Jammer have NO rubber-banding — they race cleanly
```

---

## D. Audio in racing games

Audio is the primary feedback system in racing — players perceive speed, danger, and
opportunity through sound before visual indicators process.

**Sound event taxonomy:**
| Event | Sound effect | Purpose |
|-------|-------------|---------|
| Engine idle | Low hum | Presence feedback |
| Acceleration | Rising pitch | Speed feedback |
| Top speed | Steady high pitch | Speed ceiling feedback |
| Corner entry | Tire squeal | Grip limit warning |
| Wall collision | Crunch + pitch drop | Damage feedback |
| Boost activation | Whoosh + pitch jump | Action confirmation |
| Drafting | Slight resonance change | Position awareness |
| Lap completion | Bell/chime | Progress milestone |
| Position change | Distinct tone (up/down) | Competitive feedback |

**Our Stage 5 audio:** The file viewer teaches audio playback in this stage. Hidden track files
include `transmission_hum.mp3` which contains a subtle encoded audio cue about The Jammer's
blocking behavior — players who open and listen can predict The Jammer's next move.

---

## E. UX patterns for top-down racing

- **Mini-map:** Always visible; shows track layout, player position, opponent positions
- **Position indicator:** "P1/P2/P3/P4" prominent in top corner; updates in real-time
- **Lap counter:** "Lap 3/5" with current lap time
- **Speed gauge:** Horizontal bar (not circular — circles take more space in top-down view)
- **Boost segments:** Visual bars or pip indicators near bottom of screen
- **Signal Integrity:** Vertical bar with color gradient (green→yellow→red)
- **Race results screen:** Position, time, Packets earned, Integrity bonus; retry / continue buttons

---

## F. Design pitfalls to avoid

1. **Unsticky waypoints.** AI misses a waypoint and cuts a corner, going off-track. Solution: make
   waypoints large (acceptance radius = 40+ pixels) and add "catch-up" direction correction.
2. **Rubber-band cliff.** Rubber-banding that kicks in too aggressively makes the player feel
   they can never truly win — AI always catches up. Our solution: no rubber-banding for top AI;
   only "anti-lapping" rubber-band for The Noise.
3. **Floaty controls.** Friction too low = car slides uncontrollably. For arcade feel, friction
   should be high (0.85–0.92 per frame at 60fps) and steer response should be immediate.
4. **Track width too narrow.** Narrow tracks cause constant wall collisions, draining Integrity.
   Track tiles should be at least 3× car width to allow overtaking.
5. **AI pileup at race start.** All AI starting in the same position → immediate collision.
   Solution: stagger starting positions (player P1, AI P2–P4 at 1–2 car-lengths behind).
6. **Packet progression stall.** If finishing 3rd and 4th earns 0 Packets, a struggling player
   can't upgrade. Solution: 4th place earns 15 Packets (reduced, not zero), and Integrity bonus
   provides a secondary income source independent of placement.

---

## G. How this maps to Stage 5: Signal Racer (pointer)

Stage 5 borrows **Micro Machines'** top-down kinematic simplicity, **Death Rally's** aggressive
AI personality (The Jammer), **Burnout's** boost-from-clean-driving mechanic (Signal Integrity
bonus), and **Slipstream's** synthwave aesthetic. Our key innovations: Signal Integrity as a
clean-driving metric, the audio file viewer integration for boss preparation, and the three
distinct AI personalities with defined behaviors. Full spec in `stage5-02-our-game-design.md`.
