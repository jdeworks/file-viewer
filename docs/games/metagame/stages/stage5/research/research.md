# Stage 5 "Signal Racer" — Design Research

**Date:** 2026-06-26
**Scope:** Genre reference, core loop design, expansion arc, economy, caveats.
**Verdict on existing code:** THIN GATE — a static fake HUD with a bypass button. No real game exists.
The expansion arc and core loop below describe the game that must be BUILT, not extended.

---

## 1. GENRE — Rhythm / Audio-Reactive Racing

### What defines the genre

A rhythm-racing game synchronises the player's INPUT ACTIONS (lane switches, jumps, boosts,
dodges) with a musical or signal beat grid. The defining quality is that timing your move
ON-BEAT is rewarded more than simply making the correct move — correct + late is worse than
correct + on time. This creates a dual-axis of spatial problem-solving (which lane? which
move?) and temporal precision (when?). The genre clusters into two families:

- **Track-rider:** the player moves along a fixed rail; the world scrolls; obstacles arrive
  at the player in rhythm (Thumper, Bit.Trip Runner, Beat Racer).
- **Procedural racer:** a track is generated from audio amplitude/frequency; the player
  navigates while the track's topology echoes the song (AudioSurf, Riff Racer).

Signal Racer fits the track-rider family: a fixed 3-lane corridor scrolls toward the player,
obstacles placed at beat positions, with a signal / interference narrative framing.

### The 5 best reference games — concrete mechanics and replayability drivers

**1. Thumper (Drool, 2016) — "rhythm violence"**
- Two inputs only: a button + a stick direction. The entire game is built on the combinations
  and sequences those two inputs unlock as new mechanics are introduced per world.
- Each of the 9 worlds introduces exactly ONE new mechanic (lane-change, wall-thump, boss
  barriers, double-jump, punishing lasers). The player masters it through short tutorial
  stages, then a sub-boss that demands near-perfect execution of that mechanic alone, then
  the level boss combines it with everything prior.
- Replayability: S-rank runs require near-perfect chains; the failure state (instant crash +
  immediate re-entry) has almost zero downtime, so retry is frictionless.
- Key lesson: two inputs + one-mechanic-per-world = deep escalation without complexity inflation.
- Source: https://www.gamedeveloper.com/audio/q-a-the-rhythm-violence-of-i-thumper-i-
- Source: https://www.electrondance.com/thumper-aint-no-flow-game/
- Source: https://kotaku.com/thumper-is-the-best-kind-of-music-game-1787670750

**2. AudioSurf (Dylan Fitterer, 2008) — procedural synesthesia**
- Track shape, elevation, block colour, and block density are generated from the player's own
  audio file in real time (the analysis emits a deterministic .ash cache file, so the same
  song always produces the same track).
- Gameplay merges racing navigation with match-3 puzzle: collect same-colour blocks to score,
  avoid opposite-colour blocks (deduct score). Matching 3+ in a row = clear + multiplier.
- Replayability: personal music library = infinite track variety; leaderboards per song/mode
  create a persistent competitive layer; harder "Ninja" ship mode removes safe lanes.
- Key lesson: making the game DATA driven from the player's own audio makes every session
  personal — this is the model for how Signal Racer treats the transmission_hum.mp3 file
  (the player actively participates in "loading" the level's counter-signal).
- Source: https://en.wikipedia.org/wiki/Audiosurf
- Source: https://grokipedia.com/page/Audiosurf

**3. Bit.Trip Runner (Gaijin Games, 2010) — momentum + layered audio**
- Auto-runner: Commander Video runs forward automatically; three timed inputs (jump, slide,
  kick) must fire in response to on-screen obstacles placed precisely on musical beats.
- The game introduces new obstacle types one at a time across 50+ levels. Each world (Impetus,
  Tenacity, Triumph) adds one verb to the obstacle vocabulary while keeping prior ones active.
- Layered audio reward: hitting every obstacle correctly builds new instrument layers into the
  track. Missing one strips a layer. The audio IS the score counter — a rich sound = high run.
- Replayability: "gold run" achievements, the audio-as-score framing, and the gradual tempo
  escalation per level keep short sessions punchy enough to replay for mastery.
- Source: https://en.wikipedia.org/wiki/Bit.Trip_Runner
- Source: https://game-wisdom.com/analysis/bit-trip-runner2

**4. Riff Racer / Drive Any Track (We R Games, 2016) — arcade racer + audio track gen**
- Generates a full 3D race track geometry from the player's music file using "MEGA"
  (Musical Environment Gaming Algorithm); loop-the-loops and boost pads align with song
  structure transitions (verse-to-chorus, drops).
- Focus is on racing feel (drift, boost, airtime) rather than pure note-hitting; audio is
  the track SHAPE, not a note chart.
- XP + vehicle unlock economy gives medium-term progression over many song runs.
- Key lesson for us: "moments in a song" (drops, transitions) can map to gameplay EVENTS
  (boost gates, interference bursts) without requiring actual audio analysis — they can be
  pre-authored as beat-table entries.
- Source: https://mcvuk.com/development-news/the-develop-post-mortem-riff-racer/
- Source: https://goombastomp.com/riff-racer-fluent-rhythmical-delight/

**5. Beat Racer (mobile, lane-collector variant)**
- 3-lane or tube-around-you corridor; gems spawn to the rhythm; player slides to collect
  them while obstacles spawn on alternate beat positions.
- Simplest possible rhythm racing loop: collect beats on-lane, dodge obstacles off-lane.
  Pure reflex test against a fixed beat grid.
- Mobile constraints enforce a minimal input surface (one touch = lane switch); this makes
  the escalation carry entirely through obstacle pattern complexity, not new controls.
- Key lesson: a single input (lane switch) is sufficient for deep escalation if the OBSTACLE
  PATTERN itself introduces new spatial logic per difficulty tier.
- Source: https://skich.app/games/beat-racer

---

## 2. OUR CORE LOOP

### Narrative frame

You are a data packet racing through a 3-lane signal corridor. The Jammer — a hostile
interference signal — occupies the same channel and is ahead of you in the race. Its
suppression wave corrupts your telemetry, slowing you and degrading your signal integrity.
You cannot win while the suppression wave is active. Winning requires calibrating a
counter-wave — which requires listening to the full 14-second loop of `transmission_hum.mp3`
in the real media player — then racing The Jammer with the counter-wave active.

### The moment-to-moment game

The game is a top-down ASCII track-rider. The track scrolls upward (the car moves through
the field); the player's car is a fixed character at the bottom of the visible corridor.
The track has 3 columns (lanes). Characters in the lane grid encode obstacle types:

```
  LANE A  LANE B  LANE C
  ------  ------  ------
    .       ░       .      <- static noise block in lane B
    .       .       .
   [>]      .       .      <- player car in lane A
```

Controls: Left/Right to switch lane. One action per beat window (the beat is shown as a
pulsing glyph in the HUD; actions between pulses incur an "off-beat" timing penalty).
Every BEAT WINDOW = one tick. Obstacles scroll one row per tick.

**State that matters (per tick):**
- Current lane (A/B/C)
- Beat window open/closed (derived from tick count and beat table — never from real audio)
- Integrity (100 → 0; each collision costs integrity; zero = run failed)
- On-beat count / total actions (the "accuracy" score, feeds packet reward)
- Packets earned this round (accumulate toward metagame economy)

**Why it is fun:**
- The lane switch is one key press, but the beat window makes it a timing judgment.
- Integrity as health means you can play aggressively (take some hits, go faster) or
  conservatively (dodge everything, maybe slower packets-per-second).
- The ASCII rendering means the obstacle field is always readable at a glance.
- The fixed seed ensures the same run is reproducible — practice pays off.

### The boss un-cheat (retained, strengthened)

Before the boss race is reachable, the player must calibrate the counter-wave. This
requires opening `transmission_hum.mp3` in the host app's real media player and playing it
for 14 continuous seconds without seeking or pausing. The "simulate full loop" bypass button
is REMOVED. The calibration.js hooks into the media player's playback tick events — it
cannot be faked from inside the game. Once calibrated, the counter-wave overlay appears on
the race corridor; the jammer's suppression glyphs transform into navigable signal gaps; the
boss race becomes winnable (not auto-won — the player still runs the boss circuit).

---

## 3. THE EXPANSION ARC — New Verb per Round

### Model: Stage 2 "Glyph Dungeon"

Stage 2 adds one new verb per biome band:
- Warrens (floors 1-3): avoid terrain. Basic movement.
- Cisterns (floors 4-6): break line-of-sight with walls to dodge ranged monsters.
- Emberworks (floors 7-9): manage spreading fire — fire is not a monster, it is a state that
  propagates and must be anticipated several moves ahead.
- Overflow: manage darkness — light mechanic adds a new resource constraint.

Each biome's verb is orthogonal to the previous. Going deeper always means a NEW thing to
think about, never just more enemies or bigger numbers.

### Signal Racer rounds (ordered; each round is one short circuit = one full run through a
beat-pattern table, ~3-5 minutes first attempt, faster on retry)

**Round 1 — AVOID (verb: lane switch)**
- 3 lanes. Static obstacle blocks (░ noise glyph) placed in random lane positions drawn from
  seed. Beat window is FORGIVING (wide window, long tick).
- Player learns: switch lane to not die. That is all.
- No timing pressure. No combo. No gates. Crash = integrity damage.
- Completion: survive to the finish line with integrity > 0.
- New glyph introduced: ░ (static block, always solid, always avoidable by moving away).

**Round 2 — TIME IT (verb: on-beat action)**
- Obstacles now come in BURSTS: 3-tick burst of noise, then 2-tick clear, then burst, etc.
  The beat HUD glyph pulses with the burst rhythm.
- A lane switch during a burst still works but costs 2 integrity (wrong-beat penalty).
  A lane switch during the clear window costs 0.
- Player learns: the beat is not decoration — WAIT for the gap, then move.
- New glyph: ▒ (burst-sync block — same solid obstacle, but its arrival is periodic, so
  the player can see the pattern and time around it).
- On-beat accuracy now displayed as a percentage in the HUD; high % = bonus packets at end.

**Round 3 — READ THE PATTERN (verb: anticipate, not just react)**
- Obstacle sequences become 4-tick patterns: e.g. [░ in A, clear, ░ in A, ░ in B].
  The same 4-tick pattern loops for the whole round, visible 3 rows ahead of the car.
- The beat window tightens (narrower window = less time to act after seeing the obstacle).
- New glyph: ▓ (dense interference block — costs 5 integrity if hit instead of 2). Player
  must distinguish ░ (affordable hit) from ▓ (avoid at all costs) and plan ahead.
- Player learns: read ahead, not just current row; prioritise dodging ▓ over ░ when the
  beat window forces a choice.

**Round 4 — COUNTER-PHASE LANE (verb: lane-as-state, not just position)**
- One of the 3 lanes is now designated the COUNTER-PHASE lane (marked with ~ glyph in the
  lane header). While in the counter-phase lane during a burst tick, the player is shielded
  — the burst noise passes through without integrity damage.
- But: the counter-phase lane SHIFTS every 8 ticks (A → B → C → A). The shift is telegraphed
  2 ticks ahead by a flicker in the lane header.
- Player learns: the correct lane is now a MOVING STATE to track, not just the obstacle-free
  lane. Sometimes the right move is to take a small hit to stay in phase.
- New concept: a lane can have a property (phase alignment) that makes it better even when
  not empty. This is the seed of the counter-wave idea the boss fight will use.

**Round 5 — BOOST GATES (verb: risk / reward decision)**
- Boost gates appear (glyph: >>) in one lane per beat window. Hitting a boost gate ON-BEAT
  while in that lane earns +5 packets and a 1-tick speed burst (obstacles shift faster for
  1 tick, then return to base speed).
- Missing a boost gate (wrong lane or off-beat) does nothing (no penalty — this is a reward-
  only mechanic, not a punishing one; the cost is opportunity cost).
- Player learns: the game is no longer purely defensive. Actively hunting gates is faster
  economically but requires route planning that may conflict with obstacle avoidance.
- This round deliberately creates tension between "safe dodge route" and "gate harvest route"
  — the player must choose their play style.
- New glyph: >> (boost gate).

**Round 6 — SPLIT CHANNEL (verb: committed routing across a fork)**
- The track splits into two sub-channels (HI and LO) for 8-tick segments, then merges.
  HI: more boost gates and more ▓ blocks (high risk, high reward).
  LO: fewer gates, only ░ blocks, but counter-phase lane shift is more predictable (safe).
- The channel choice is made at the fork glyph (Y character in the track). Once chosen,
  the player is locked into that channel until the merge.
- Player learns: committing to a route is a new decision layer. Unlike previous rounds where
  the player reacted tick-by-tick, the fork requires a 8-tick-ahead evaluation of which
  channel suits their current integrity and packet score.
- New glyph: Y (fork), ^ (merge). The channel is a 4-row sub-track beside the main track.

**Round 7 — BOSS: COUNTER-WAVE RACE (verb: synthesis + un-cheat prerequisite)**
- The Jammer occupies the track ahead of the player (shown as an X glyph two rows ahead).
  All mechanics from rounds 1-6 are active simultaneously in a single combined circuit.
- The jammer's suppression field (dominant jammer wave shown in wave panel) makes every ▓
  block cost DOUBLE integrity, and counter-phase lane shifts TWICE as fast.
- If the counter-wave is NOT calibrated: suppression field persists; the boss is not beatable
  (player will run out of integrity before the finish line in any reasonable play).
- If the counter-wave IS calibrated (transmission_hum.mp3 listened to for 14s): the counter-
  wave overlay activates; ▓ blocks revert to ░ cost (double damage cancelled); counter-phase
  shift returns to 8-tick rate. The race is NOW winnable — not auto-won. Player must
  execute a clean combined circuit to cross the finish line before the jammer.
- Victory: state.boss.defeated = true; packets += 100; BTS file revealed.

### Summary table

| Round | New Verb | New Glyph(s) | Core decision |
|-------|----------|--------------|---------------|
| 1 | Avoid obstacle | ░ noise block | Which lane |
| 2 | Time your move on-beat | ▒ burst block | WHEN to move |
| 3 | Read the pattern ahead | ▓ dense block | Prioritise which hit to take |
| 4 | Track lane-as-state (counter-phase) | ~ lane marker | Move to shield, not just gap |
| 5 | Chase boost gates (risk/reward) | >> gate | Offensive vs. defensive routing |
| 6 | Commit to a channel at a fork | Y fork, ^ merge | 8-tick lookahead per segment |
| 7 | Synthesise all + use counter-wave | X jammer | Beat the boss while managing everything |

---

## 4. FUN & RETENTION

### Economy and meta-loop

The `packets` resource is the economy unit (existing). Packets are earned per round:

    packets = base_per_lap
            + floor(on_beat_pct * accuracy_bonus_max)
            + integrity_remaining_bonus
            + boost_gates_collected * gate_value

This means a perfect run earns significantly more than a survival run, creating a reason to
replay earlier rounds even after progressing. The three upgrades to add to the shop
(fed by packets from all stages):

- **Noise Filter** (reduces integrity damage per ░ hit from 2 to 1). Makes round 3 more
  forgiving; lets the player take small hits while learning patterns.
- **Spectrum Analyzer** (widens the beat window by 20%). Makes round 2 more accessible;
  critical upgrade for players who struggle with rhythm timing.
- **Signal Amplifier** (boosts gate value from 5 to 8 packets per gate). Makes the
  risk-reward calculus of round 5 and 6 more profitable; reward for skilled play.

These upgrades are STAGE-LOCAL (they apply only within stage 5's simulation context and are
purchased with the global packet pool) — consistent with other stages' upgrade model.

### Risk/reward decisions that sustain engagement

- **In every round:** the option to take a ░ hit intentionally to gain positional advantage
  (e.g. to stay in counter-phase lane while a burst fires) is a real trade-off. Integrity is
  a finite resource per run; spending it for positioning is a skill expression.
- **Rounds 5-6:** the boost gate hunting vs. obstacle dodging tension rewards high-accuracy
  play with exponentially more packets, giving skilled players a faster path through the
  metagame grind.
- **Boss round:** the counter-wave calibration gate ensures that the player has INTERACTED
  with the host app's media player before the boss is beatable — the unlock is real, not
  symbolic. The boss itself still requires execution.

### What sustains 40min to 2h

- 7 rounds × ~4 min each first attempt = ~28 min to reach boss, ~35-40 min with retries.
- Each round can be replayed for packet farming (improve on-beat % → more packets → buy
  upgrades → easier later rounds → cleaner boss run). Loop is tight.
- Replay incentive: the seed-deterministic patterns mean the SAME run can be practiced.
  A player who retries round 3 will face the SAME pattern and can measurably improve.
- Narrative hook: the log messages and wave panel tell a coherent signal-warfare story;
  each round's completion pushes a new log line that the player reads before advancing.

---

## 5. CAVEATS — Determinism, Performance, Uniqueness

### Determinism — remove Date.now from the live path

Current state.js line 4 uses `Date.now()` as a seed fallback:

    const seed = String(context.seed || context.now || Date.now()).replace(/\W/g, '').slice(-8) || 'stage5';

`Date.now` must NOT appear in the live path. Fix: require context.seed from the metagame
engine (which already supplies it deterministically); remove the Date.now fallback; if seed
is absent, use a hardcoded string literal ('stage5s5' or similar).

The round-pattern beat tables are derived from the seed using a pure seedable PRNG
(mulberry32 or a simple LCG). The PRNG is called once per round at mount time to generate
the full pattern table for that round; it is never called again during play. All obstacle
positions for all ticks are thus computed upfront, stored as an array, and indexed by tick
count. No random calls during the render loop.

### Determinism — beat timing

Beat windows are NOT derived from real-time audio analysis (we have no Web Audio API
access to the .mp3 playback). Beat timing is a DESIGNED table per round: e.g. round 2
uses a 5-tick burst/2-tick gap pattern; this is a constant, not sampled from audio.
The `transmission_hum.mp3` calibration is a UX GATE (did you listen?) not a signal
processor (we do not read its waveform). This distinction must be clear in the code.

### Performance

- The game loop uses requestAnimationFrame but ALL game logic runs on tick increments
  (tick = a fixed ms interval, e.g. 150ms per tick). rAF calls accumulate real delta time
  and fire game logic only when accumulated time >= tick interval. This decouples rendering
  from logic and ensures the game plays at the same speed regardless of frame rate.
- ASCII render: each tick redraws a 3×8 character grid (24 characters). Zero canvas API.
  DOM writes are batched (one innerHTML set per tick). Cost is negligible.
- Obstacle pattern tables (7 rounds × ~100 ticks each = ~700 entries) are computed once
  at mount and stored in state. No per-tick computation beyond a table lookup and
  integrity delta.

### Uniqueness

The framing (interference signals, counter-phase mechanics, jammer suppression field) is
native to this stage's signal-warfare narrative and does not collide with any other stage's
theme. The counter-phase lane mechanic (lane-as-state rather than lane-as-position) is
novel within the project's stage set. The un-cheat (listen to the audio file in the real
media player) reuses the media player host app feature in a way that is already implemented
and load-bearing — it cannot be cheated by a client-side simulation because
`applyCalibrationTick` checks that the file path matches `TRANSMISSION_HUM_PATH` exactly
and that the active flag (set by the real player) is true. Removing the bypass button
(the "simulate full loop" button in renderer.js) makes this genuinely non-bypassable.

---

## Sources

- [Thumper Q&A — rhythm violence approach (Game Developer)](https://www.gamedeveloper.com/audio/q-a-the-rhythm-violence-of-i-thumper-i-)
- [Thumper — level progression and tension design (Electron Dance)](https://www.electrondance.com/thumper-aint-no-flow-game/)
- [Thumper — is the best kind of music game (Kotaku)](https://kotaku.com/thumper-is-the-best-kind-of-music-game-1787670750)
- [Thumper Wikipedia](https://en.wikipedia.org/wiki/Thumper_(video_game))
- [AudioSurf — Grokipedia (track gen, match-3 mechanics)](https://grokipedia.com/page/Audiosurf)
- [AudioSurf — Wikipedia](https://en.wikipedia.org/wiki/Audiosurf)
- [Riff Racer post-mortem — MEGA system, moments-in-song design (MCV/DEVELOP)](https://mcvuk.com/development-news/the-develop-post-mortem-riff-racer/)
- [Riff Racer review — fluid rhythmical delight (Goomba Stomp)](https://goombastomp.com/riff-racer-fluent-rhythmical-delight/)
- [Bit.Trip Runner — Wikipedia](https://en.wikipedia.org/wiki/Bit.Trip_Runner)
- [Bit.Trip Runner 2 — speed running analysis (Game Wisdom)](https://game-wisdom.com/analysis/bit-trip-runner2)
- [Beat Racer — Skich](https://skich.app/games/beat-racer)
- [Rhythm game progression mechanics (Rhythm Quest devlog, Medium)](https://ddrkirbyisq.medium.com/rhythm-quest-devlog-13-music-and-level-design-682a92e57def)
- [Gameplay design fundamentals — progression (Game Developer)](https://www.gamedeveloper.com/design/gameplay-design-fundamentals-gameplay-progression)
