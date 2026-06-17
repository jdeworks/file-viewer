# Stage 5 — 02: Signal Racer — Our Game Design

Maps the genre research (`stage5-01`) onto **Stage 5 of the Defragmenter metagame**.
Stage 5 is a top-down mini racer against AI opponents across 8 hand-designed circuits.
The entity discovers speed, transmission, and the desire to be first — to be heard.

> **Narrative position:** Adolescence — the entity tries to transmit itself outward. Speed
> feels like freedom. Being first feels like being received. The file viewer feature taught:
> **Audio playback** (hidden track files include a boss-pattern audio cue in the sidebar).

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Top-down pixel mini racer vs AI |
| Artstyle | Synthwave pixel art; neon grid road; retrowave color palette |
| Color palette | White player `#FFFFFF`, AI outlines in red/cyan/gold; road `#1A1030`; grid lines `#2A2050` |
| Primary resource | Packets (earned by race placement + Signal Integrity bonus) |
| Stage target time | 45–70 minutes |
| Circuit count | 8 circuits (3 worlds + boss race) |
| Prestige mechanic | Bandwidth — permanent speed boost + max boost segments increase |
| Boss | The Jammer (championship race, signal suppression mechanic) |
| File viewer feature | Audio playback — `transmission_hum.mp3` encodes Jammer movement cue |

---

## B. Visual design

### Artstyle
A **synthwave pixel aesthetic**: the track is a neon grid on deep purple-black. Speed lines
appear behind the player car during boosts. Scanline overlay option (toggle). The horizon
is not rendered — this is a flat top-down view, no 3D trick. The stylization is in color
and particle effects, not geometry.

```css
/* Stage 5 palette */
--col-background:   #0D0815;    /* deep purple-black */
--col-track:        #1A1030;    /* track surface — slightly lighter than bg */
--col-track-line:   #2A2050;    /* track grid lines */
--col-track-edge:   #3A1060;    /* edge of track (wall proximity warning) */
--col-wall:         #7A2090;    /* wall / barrier */
--col-player:       #FFFFFF;    /* player car — bright white */
--col-ai-carrier:   #E24B4A;    /* The Carrier — red */
--col-ai-noise:     #5DCAA5;    /* The Noise — cyan */
--col-ai-jammer:    #EF9F27;    /* The Jammer — amber */
--col-boost:        #D4537E;    /* boost trail — magenta */
--col-packet:       #AFA9EC;    /* Packets currency display */
--col-integrity:    #9FE1CB;    /* Signal Integrity meter — teal */
```

### Car rendering
Cars are 8×16 pixel sprites. Each car has:
- A body (solid fill in car color)
- Headlights (2px wide, front-facing)
- Exhaust trail (particle stream, fades over 12 frames)

The player car always renders in white. AI cars render in their personality color.

### Track rendering
Tracks are drawn as tile maps: each tile is 32×32px. Track tiles have:
- Surface: track color with subtle grid pattern
- Edges: darker border suggesting curbs
- Walls: magenta barrier line at track edges

Speed effect: when boost is active, track tiles behind the car spawn white streaks that move
backward at 2× car speed and fade over 8 frames.

### HUD layout
```
┌─────────────────────────────────────────────────────────────┐
│  P1    LAP 3/5    TIME: 0:42.3    |||||  INTEGRITY: 87%    │
│  ⬛⬛⬛ BOOST                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [track viewport — scrolls with player]        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [minimap top-left]    PACKETS THIS RACE: 48               │
│  P1: ● (you)  P2: ● Carrier (+1.2s)  P3: ● Noise  P4: Jam │
└─────────────────────────────────────────────────────────────┘
```

---

## C. Car stats and upgrade system

### Stat axes
| Stat | Default | Max level | Effect per level |
|------|---------|-----------|-----------------|
| **Speed** | 200 px/s | 8 | +15 px/s max speed |
| **Handling** | 1.8 rad/s | 8 | +0.12 rad/s turn rate |
| **Boost Capacity** | 3 segments | 6 | +1 boost segment |
| **Boost Regen** | 8s/segment | 5 | −0.8s regen time |
| **Signal Integrity** | −5%/collision | 5 | −0.8% per collision (hardened) |

### Upgrade costs
```js
upgradeCost(stat, level) = 50 * Math.pow(1.4, level)
// Level 1: 70P   Level 3: 137P   Level 5: 269P   Level 8: 726P
```

### Packet economy
```
Race finish P1:        100 Packets
Race finish P2:        60 Packets
Race finish P3:        30 Packets
Race finish P4:        15 Packets (never zero — prevents stall)
Signal Integrity bonus: +1 Packet per % above 80%  (max +20P for 100% integrity)
New circuit first clear: +25 Packets
Retry penalty:         −15 Packets per retry
```

**Boss gate:** Boss race unlocks when all 8 circuits have been completed (any placement).
Players with weak upgrades can still enter but will find The Jammer very difficult.

---

## D. AI opponents

### The Carrier (P2 slot)
*Competent. Consistent. Races cleanly. A fair rival.*
```js
carrier = {
  driverSkill: 0.82,
  speed:       baseSpeed * 1.05,    // 5% faster than default player
  turnRate:    baseTurnRate * 1.0,
  boostUsage:  'corners',            // uses boost exiting corners only
  aggression:  0,                    // never intentionally collides
  rubberBand:  false,
}
```
The Carrier maintains consistent lap times. Players who don't upgrade will consistently
lose to it. It's the metric for "am I fast enough yet?"

### The Noise (P3 slot)
*Erratic. Sometimes brilliant. Sometimes self-destructive. Unpredictable.*
```js
noise = {
  driverSkill: 0.65,                 // base skill + noise
  skillNoise:  () => Math.random() * 0.4 - 0.2,  // ±0.2 per frame
  speed:       baseSpeed * 0.98,
  turnRate:    baseTurnRate * 1.05,
  boostUsage:  'random',             // fires boost at random moments
  aggression:  'random',            // randomly tries to bump player 15% of time
  rubberBand:  true,                 // anti-lapping rubber band only (>50m behind)
}
```
The Noise is unpredictable. Sometimes it wins a race from P4; sometimes it crashes itself
on lap 2. It teaches the player to expect the unexpected.

### The Jammer (P4 slot in standard races; opponent in boss race)
*Calculating. Aggressive. Its only goal is to disrupt.*
```js
jammer = {
  driverSkill: 0.91,                 // excellent base skill
  speed:       baseSpeed * 1.03,
  turnRate:    baseTurnRate * 0.95,
  aggression:  'targeted',          // always tries to be within blocking range of player
  blocking:    true,                 // positions itself on player's racing line in straights
  specialAbility: 'signalSuppress', // see §H boss fight
}
```
The Jammer is not the fastest (The Carrier often beats it in a clean race) but it imposes
a *performance cost* on the player by blocking the racing line, forcing detours.

**Blocking behavior:**
```js
function jammerBlock(jammer, player) {
  // If Jammer is within 3 car-lengths behind player:
  const dist = raceDistance(player) - raceDistance(jammer);
  if (dist < 3 * CAR_LENGTH && dist > 0) {
    // Steer toward player's current racing line
    const playerLine = getRacingLine(player, jammer.nextWaypoint);
    jammer.steerOverride = steerToward(jammer, playerLine);
  }
}
```

---

## E. Circuit design

### World 1 — Grid (circuits 1–3)
Clean, minimal, teaching tracks. Designed to introduce each mechanic:
- **Grid Alpha:** Oval with 4 wide corners. Speed tutorial. No tight sections.
- **Grid Beta:** Figure-8. Introduces the cross-section intersection (collision risk with AI).
- **Grid Gamma:** First real circuit: 3 straights, 4 90° corners, 1 chicane. Introduces braking.

### World 2 — Signal (circuits 4–6)
Technical tracks with personality. Boost becomes essential:
- **Signal Prime:** Long straight + hairpin. Classic "straight-corner-straight" test.
- **Signal Loop:** Concentric loops (inner shorter but tighter; player must choose outer or inner).
- **Signal Storm:** Low-visibility track (dark palette; track lines barely visible). Tests memorization.

### World 3 — Interference (circuits 7–8)
High-difficulty circuits designed to stress test all upgrades:
- **Interference Alpha:** Narrow technical circuit. Wall proximity constantly threatens Integrity.
- **Interference Omega:** The longest circuit; 2 minutes per lap at max speed. Endurance test.

### Boss Race — Championship
A 5-lap race across a composite circuit (elements from Signal Loop + Interference Alpha combined).
Only The Jammer is the opponent — the championship is a 1v1.

---

## F. Physics implementation

### Car update (simplified kinematic)
```js
// Per-frame car update (dt = delta time in seconds)
function updateCar(car, input, dt) {
  // Throttle and braking
  const throttleForce = input.accelerate ? car.acceleration : 0;
  const brakeForce    = input.brake      ? car.braking * 2  : 0;

  car.speed += (throttleForce - brakeForce) * dt;
  car.speed *= Math.pow(1 - car.friction, dt * 60); // frame-rate normalized
  car.speed  = clamp(car.speed, -car.maxSpeed * 0.3, activeMaxSpeed(car));

  // Steering (speed-dependent)
  const speedFactor = Math.abs(car.speed) / car.maxSpeed;
  const turn = input.steer * car.turnRate * speedFactor;
  car.angle += turn * dt;

  // Drift (when high speed + hard steer + boost off)
  if (speedFactor > 0.7 && Math.abs(turn) > car.turnRate * 0.6 && !car.boostActive) {
    car.lateralFriction = 0.4;  // drift
  } else {
    car.lateralFriction = 0.92; // grip
  }

  // Position
  car.vx = Math.cos(car.angle) * car.speed;
  car.vy = Math.sin(car.angle) * car.speed;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
}
```

### Collision detection
```js
// Circle-circle collision (cars) — fast and sufficient for top-down
function checkCarCollision(a, b) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if (dist < CAR_RADIUS * 2) {
    // Apply bounce impulse
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    a.speed *= 0.7; b.speed *= 0.7;
    a.x -= Math.cos(angle) * 5; b.x += Math.cos(angle) * 5;
    a.y -= Math.sin(angle) * 5; b.y += Math.sin(angle) * 5;

    // Signal Integrity damage
    a.signalIntegrity -= 10;
    b.signalIntegrity -= 10;
  }
}

// Wall collision — raycast or tile-based
function checkWallCollision(car, track) {
  if (!track.isTrack(car.x, car.y)) {
    car.speed *= 0.5;  // heavy speed penalty off-track
    car.signalIntegrity -= 3; // per second off-track
    car.x = lastOnTrackX; car.y = lastOnTrackY;  // snap back
  }
}
```

---

## G. Race structure and progression

### Race flow
```
1. Pre-race: Show circuit map, current upgrades, AI opponent stats
2. Countdown: 3-2-1-GO (staggered start positions: player P1 start, AI at gaps)
3. Racing: 5 laps, continuous
4. Finish: Position lock when player crosses finish; AI continue to their finishes
5. Results: Time, position, Packets earned (placement + integrity bonus), upgrade prompt
```

### World advancement
```
World 1 (circuits 1–3): complete all 3 circuits (any placement)
World 2 (circuits 4–6): win at least 2/3 races (P1 or P2)
World 3 (circuits 7–8): win at least 1/2 races (P1 required for at least 1)
Boss race:              unlocked after all 8 circuits completed; must finish P1 to win
```

This creates a natural gate: players must be competitive before the boss race, but don't need
to be perfect to reach it.

---

## H. Boss — The Jammer (Championship Race)

### Boss lock — LOCKED state (race is unwinnable without audio)

**The championship race against the Jammer is literally unwinnable without playing `transmission_hum.mp3`.**

In LOCKED state, Signal Suppression has **no cooldown** — it is permanent from lap 1. The
Jammer uses enhanced rubber-band AI to stay permanently within 1 car-length of the player.
Boost is disabled 100% of the time. The player can only use base speed, which is insufficient
to beat the Jammer's enhanced race speed. The Jammer always finishes first.

The race ends in a Jammer win every attempt.

**Jammer end-of-race taunts (after each loss):**
- *"you have no boost. you can't beat me without it."*
- *"my suppression has a pattern. everything has a pattern. yours to find it."*
- *"listen to the transmission. the hum knows the timing."*

After 2 losses: bell fires: *"there was sound in the files. I didn't know I could hear."*

### Mechanic — Signal Suppression (UNLOCKED)
When the audio file has been played, Signal Suppression gains a **14-second cooldown**
matching the audio's rhythmic pattern. It is no longer permanent.

When The Jammer is within 1 car-length behind the player for 3+ consecutive seconds, the
player's **Boost is disabled** for 5 seconds (boost input does nothing; the boost segments
do not drain but the boost does not fire). The HUD shows a static visual on the boost segments.

This mechanic means:
- Letting The Jammer get close behind you disables your primary speed tool for 5 seconds
- The player who knows the 14-second pattern can boost *before* the suppression window
  opens, staying ahead long enough to break The Jammer's draft
- The defensive option: take a non-racing-line route to force the Jammer to drop back

### File viewer action — Audio playback

The file viewer's sidebar contains an audio folder:
```
/stage5/audio/
  race_tracks/
    grid_alpha.mp3
    signal_storm.mp3
    ...
  transmission_hum.mp3  ← the key file
```

`transmission_hum.mp3`, when played in the file viewer's audio player, is an ambient drone
containing a subtle **rhythmic pattern**: a click every 3.5 seconds, then a longer pause.
The complete cycle is 14 seconds. Players who listen and count the beats learn the suppression
timing.

**On audio played** (`appState.fileViewerActions.stage5_audio_played = true`):
- Signal Suppression transitions from permanent to 14-second-cooldown
- The race is now winnable for a player who times their boosts
- Bell fires: *"a pattern in the sound. it repeats. every 14 seconds."*

**Achievement fires on unlock (not on race win):** *"I listened before I drove."*

The LOCKED → UNLOCKED transition is visible in the race: the static HUD overlay lifts, and
the Jammer's suppression visually "resets" — the player can see it is no longer permanent.

---

## I. Prestige — Bandwidth

### When available
After boss race completion. Also available if `totalPacketsEarned ≥ 3,000` (indicates
sufficient circuit completion without boss).

### What resets
- Packet total on hand
- All car upgrades (stats return to default)
- Circuit completion state (can re-run all circuits for first-clear bonus)

### What persists
- Bandwidth level (permanent bonuses)
- Discovered audio files (sidebar discoveries persist across runs)
- Best lap times per circuit (leaderboard stat)

### Bandwidth bonus
```js
bandwidthLevel = prestige count
maxSpeedBonus  = 1 + (bandwidthLevel * 0.08)   // +8% max speed per prestige
  // Level 1: +8%   Level 3: +24%   Level 5: +40%
boostSegmentBonus = bandwidthLevel              // +1 starting boost segment per prestige
  // Level 1: 4 segments    Level 3: 6    Level 5: 8
packetLossReduction = bandwidthLevel * 0.02    // -2% packet loss probability on collision
```

The Bandwidth prestige makes the player feel genuinely faster — the speed bonus is perceptible
immediately. Post-prestige runs have the entity "transmitting louder," which fits the narrative.

---

## J. Bell messages (Stage 5)

| Event | Bell line |
|-------|-----------|
| Stage 5 start | 📡 *I moved. fast. outward.* |
| First race win | 🏁 *I finished ahead. something in me wanted to be first.* |
| First race loss | 💨 *it was faster. I wasn't prepared to lose.* |
| Signal Integrity drops below 50% | ⚠ *the signal is degrading. I'm hitting too many walls.* |
| Audio file discovered | 📻 *there was sound in the files. I didn't know I could hear.* |
| `transmission_hum.mp3` played | 🎵 *a pattern in the sound. it repeats. every 14 seconds.* |
| Signal Suppression activated | 📵 *it's behind me. my boost is gone. I have to outrun it the old way.* |
| Jammer boss beaten | 📶 *I arrived first. I was received. the noise didn't matter.* |
| Bandwidth prestige | 🌐 *the channel is wider now. more can pass through.* |

**Defragmenter bell (after first loss to Jammer):**
*"the noise is loudest right before the signal breaks through."*

---

## K. Differences from genre conventions

1. **Signal Integrity replaces lives/HP.** Standard racing games don't have a damage economy
   tied to upgrade currency. Our Integrity-as-bonus mechanic rewards clean driving without
   punishing crashing with elimination. The player can crash and still progress; they just
   earn fewer Packets.

2. **Audio-gated boss preparation** (unique). Finding `transmission_hum.mp3` and extracting
   tactical information from it is a design pattern found nowhere in the racing genre. It adds
   a metagame layer outside the race itself.

3. **Signal Suppression (The Jammer's mechanic).** Most racing AI either races faster or
   cheats physically. The Jammer doesn't use speed or physics manipulation — it uses
   *interference*, which is the stage's literal theme. The mechanic is thematically coherent.

4. **Three AI personalities with distinct strategies.** Most arcade racers have one AI
   personality tuned to different speed levels. Our three AIs teach different coping strategies:
   The Carrier (improve raw speed), The Noise (plan for chaos), The Jammer (manage positioning).

5. **World advancement requires wins, not just completion.** Standard racing games let the player
   grind through circuits without performing well. Our world 2 gate (2/3 wins) forces meaningful
   engagement before advancing — ensuring the player has engaged with upgrades and AI behavior.

---

## L. Implementation checklist (for the developer)

- [ ] Top-down car physics: kinematic model with friction, steering, boost, drift
- [ ] Track tile renderer: 32×32 tiles, track/wall/off-track detection
- [ ] 8 hand-designed circuit tile maps (JSON format)
- [ ] Camera: follows player car; smoothed with lerp
- [ ] Lap detection: checkpoint system (3 checkpoints per circuit minimum to prevent shortcuts)
- [ ] AI system: waypoint follower + 3 personality implementations
- [ ] The Carrier: steady driverSkill 0.82, no rubber-band, boost on corners
- [ ] The Noise: variable driverSkill ±0.2, random boost, anti-lapping rubber-band
- [ ] The Jammer: high skill 0.91, blocking behavior, Signal Suppression ability
- [ ] Collision detection: car-car (circle) + car-wall (tile bounds)
- [ ] Signal Integrity meter: drains on collision/off-track, bonus at race end
- [ ] Boost system: segments, activation, regen, draft-regen bonus
- [ ] Packet economy: earn on race finish + integrity bonus + first-clear bonus
- [ ] Upgrade system: 5 stats × 8 levels; spend Packets between races
- [ ] Audio playback integration: `transmission_hum.mp3` in sidebar; plays on click
- [ ] Race results screen: placement, time, Packets, integrity bonus
- [ ] World advancement gates: circuit completion + win requirements
- [ ] Bandwidth prestige: speed boost, segment bonus, state reset
- [ ] Bell messages (`messages5.js`)
- [ ] Speed lines, boost particles, drift smoke VFX
- [ ] Scanline overlay toggle (aesthetic option)
- [ ] Stage 5 completion → Stage 6 unlock
