# Stage 1 — Bit Foundry: Research & Expansion Design

> **Status:** Historical design reference, not an active backlog. The current
> implementation is authoritative; unfinished work is tracked only in
> [`TASKS.md`](../../../../../../TASKS.md).

---

## 1. GENRE — What Defines Incremental / Idle Games

### Core Definition

An incremental game's distinguishing trait is *unfolding* — regular introduction of new mechanics
that continuously reshape how the player engages with the same core resource. The canonical
design analysis from The Paper Pilot's "Guide to Incrementals" frames it this way: what makes
the genre compelling is not numbers going up per se, but the *anticipation of the next paradigm
shift* — new systems that make old systems feel differently relevant.

The four pillars that define incremental games:

- **Compounding resources.** Spending on production that produces more production. Growth is
  exponential by design; early milestones arrive fast; later ones require waiting but the wait
  feels earned.
- **Automation as progression.** The loop begins manual (click to earn), transitions to
  semi-automated (timed buttons you trigger), then fully automated (managers fire cycles without
  the player). The player's role evolves from laborer to optimizer to architect.
- **Prestige / reset as horizontal depth.** Voluntary resets that erase most progress in exchange
  for a permanent multiplier. The player runs the same content faster and faster until a new
  mechanic unlocks — the new mechanic is the real reward, not the multiplier itself. Antimatter
  Dimensions makes this explicit: each of its five reset layers (Infinity, Eternity, Reality,
  Celestials, Doom) introduces not just better numbers but a genuinely different mode of play.
- **Optimization as identity.** The genre's intrinsic appeal is the optimization problem. Players
  are not narrative protagonists; they are efficiency engineers. Every new mechanic is a new
  constraint to optimize against.

### The 5 Best Games and What Makes Them Work

**1. Cookie Clicker (Orteil, 2013 — ongoing)**
The genre's defining artifact. Its most instructive mechanic is the Grandmapocalypse: buying the
"One Mind" upgrade does not just unlock a number multiplier — it transforms the aesthetic of the
entire game (wrinklers spawn, golden cookies become wrath cookies, background changes), and
makes previously-bought grandmas interact with the player in a new adversarial way. The key
lesson: a tier upgrade that also *changes the rules of the stage* is memorable; a tier upgrade
that only adds a rate bonus is not. Cookie Clicker also introduced the "golden cookie" — a
timed, positional click bonus — as a verb that requires active attention inside an otherwise
idle game. The tension between "let it run" and "there is a golden cookie right now" is the
engine of the 40-minute to multi-hour session.

**2. Antimatter Dimensions (Hevipelle, 2016 — ongoing)**
The clearest example of "new verb per prestige layer." Each layer does not merely accelerate
production; it introduces a new resource and a new decision space. Infinity resets erase AM
progress for Infinity Points that buy qualitatively different upgrades. Eternity resets erase
Infinity progress for Eternity Points that introduce a parallel economy. The game is designed so
that at each layer the player feels genuinely ignorant — they must re-learn the optimization
problem. This is the model for Stage 1's expansion arc (see Section 3).

**3. Universal Paperclips (Frank Lantz, 2017)**
The genre's clearest example of complete paradigm shift: three distinct phases of gameplay
within one session (manual clicker → automated manufacturer → galaxy-spanning optimizer) with
no continuity of verb between them. Each phase's ending invalidates the prior phase's strategy.
Lesson: the player should feel that the thing they just mastered is now obsolete, replaced by
something bigger. For Stage 1 this means each new prestige mechanic should feel like a different
game sitting inside the same shell.

**4. Melvor Idle (Malcs, 2021 — ongoing)**
The best example of *retention via variety within a session*. Rather than a single exponential
loop, Melvor runs parallel skill trees (combat, thieving, farming, cooking) that interact. You
can't just optimize one skill — they gate each other. The 2025 Pantheon Rework adds seasonal
deity cycles that change optimal strategy monthly, meaning returning players face new puzzles,
not just bigger numbers. Lesson: multiple interlocking systems, where each system is a lever
that affects other systems, is the mechanism of long-term retention.

**5. Evolve Idle (Pmotschman, 2019)**
Emphasizes resource interdependency: over-investing in one resource causes downstream
crafting chains to collapse. Every purchase decision has a second-order consequence. The
ecological interdependency system is structurally similar to Stage 1's builder chain
(Signal Booster assembles Bit Boxes, Core Cluster assembles Boosters), but Evolve makes
the dependency *bidirectional and fragile*, introducing negative feedback that Stage 1 does
not currently have. The manager "running cost drains bits" mechanic in Stage 1 is a mild
version of this.

### Sources
- "Guide to Incrementals / Defining the Genre" — The Paper Pilot (https://paperpilot.dev/garden/guide-to-incrementals/defining-the-genre)
- "What Is an Incremental Game?" — Missions Zanx (https://missionszanx.com/guides/what-is-an-incremental-game-complete-guide-to-incremental-games-mechanics-and-progression-systems)
- "Idle vs Incremental vs Tycoon" — André Guerrero / Medium (https://medium.com/tindalos-games/idle-vs-incremental-vs-tycoon-understanding-the-core-mechanics-f12d62f4b9f7)
- Grandmapocalypse design — Cookie Clicker Wiki (https://cookieclicker.wiki.gg/wiki/Grandmapocalypse)
- Antimatter Dimensions prestige layers — AD Wiki (https://antimatterdimensions.wiki.gg/wiki/Prestige)
- "Best Incremental Games 2026" — GameSpot (https://www.gamespot.com/gallery/best-idle-games/2900-5676/)
- "Progression and Scaling in Incremental Games" — Missions Zanx (https://missionszanx.com/guides/progression-and-scaling-in-incremental-games)

---

## 2. OUR CORE LOOP — Stage 1 As Built

Stage 1 is a fully implemented BigNum idle-clicker. The existing loop is:

**Moment-to-moment (the verb set as shipped):**

1. **Tap.** The player taps a large reveal area to earn bits. ClickPower = (1 + s1-mult owned)
   x globalPull x achievMult, plus a Quantum Tap bonus (% of Bit Box bits/sec per tap). Tapping
   is never pointless — even in late idle, Quantum Tap scales tap value with passive income.

2. **Buy.** 7 tiers unlock in sequence (Multiplier, Bit Box, Signal Booster, Core Cluster,
   Processing Array, Neural Net, Quantum Tap). Each has a geometric cost curve. Buy-count
   selector (x1 / x10 / x100 / x1000 / MAX) lets the player skip micro-management.

3. **Time.** Timed tiers (Bit Box, Signal Booster, Core Cluster) fire on a cycle and pay a
   large batch payout. The player manually starts each cycle; managers automate this.

4. **Automate.** Hiring a manager puts a timed tier on auto-fire. Managers have a running cost
   (bits/sec), creating the genre's classic trap: over-hire until net rate goes negative, then
   must manually tap back to solvency. This is the game's first genuine risk-reward decision.

5. **Build.** Signal Booster is a builder: each cycle assembles new Bit Box units. Core Cluster
   assembles Signal Boosters. This builder chain means the player's buying decisions compound:
   owning builders means later tiers grow without further spending.

6. **Multiply.** Neural Net is a global multiplier on timed payouts. Each level raises the
   formula ceiling multiplicatively, not additively. This is the first upgrade that changes the
   math rather than adding to a sum.

7. **Synergize.** Quantum Tap fuses the active (clicking) and idle (Bit Box bits/sec) economies.
   At max level it adds +200% of passive bits/sec to each tap. Active play in the late game is
   now actually valuable, not just a fallback for when managers are offline.

8. **Prestige (Gravitational Pull).** After totalBits >= 1e18, a reset becomes available that
   pushes a multiplier factor onto pullFactors[]. Every subsequent run is faster. The gain
   formula is: gain = 2 + (log10(totalBits / 1e18))^1.92, starting at x2.0 and rising. Each
   factor compounding via globalPull = product of all pullFactors.

9. **Boss fight.** Paying a 1e54-bit ticket enters the arena. The Defragmenter is a 20-second
   click contest. With CHEAT=true active, the boss adds 1.5x per burst and fires auto-taps at
   a slightly faster floor than the player — mechanically unwinnable. The discovery is editing
   Overwriter.frag in the real Monaco editor (the host app) to set CHEAT=false. The flag is
   latched permanently once disabled.

**Why the existing loop is fun:**

- The 7-tier unlock sequence is paced so each tier introduces a qualitatively different behavior
  (see Section 3), not just a higher rate. A first-time player never feels they are doing the
  same thing twice in a row.
- The manager trap (negative net rate) is the stage's main skill-test. It teaches the player that
  there IS a failure state and recovery is possible by hand.
- The un-cheat mechanic is genuinely discovery-driven. The Defragmenter's taunts are escalating
  hints, not walkthroughs. Editing Overwriter.frag feels like finding a secret, not solving a
  puzzle.
- The Gravitational Pull formula rewards early prestigers (push the reset button the moment it
  unlocks for a modest gain) and patient runners (the gain grows with total bits), creating
  meaningful tension around the timing of the reset.

---

## 3. THE EXPANSION ARC (PRIMARY DELIVERABLE)

The existing 7 tiers already each introduce a new verb (see table below). The expansion arc
defines what NEW mechanic unlocks at each PRESTIGE DEPTH — so that "doing prestige N" means
encountering a genuinely different system, not just a faster version of the same loop.

The model from Stage 2 Glyph Dungeon: each biome band introduces a new verb (avoid terrain ->
break line-of-sight -> manage spreading fire -> manage darkness). Applied here: each prestige
depth should introduce a new decision the player has never faced before.

### 3A. Existing sub-stage progression (the first-run arc)

Each of the 7 tiers already introduces a new verb. This is the baseline the expansion builds on:

| Sub-stage | Tier | NEW VERB introduced |
|-----------|------|---------------------|
| 1 | Multiplier | Spend (first purchase decision) |
| 2 | Bit Box | Time (start a cycle, wait, collect) |
| 3 | Signal Booster | Build (purchases make other tiers grow) + Cross-boost |
| 4 | Core Cluster | Meta-build (a builder builds builders) |
| 5 | Processing Array | Idle (passive income without any action) |
| 6 | Neural Net | Multiply (change the formula, not the addend) |
| 7 | Quantum Tap | Synergize (merge active and passive economies) |

### 3B. Prestige expansion arc: ordered NEW mechanics per prestige depth

Each prestige depth unlocks one new panel or sub-system that introduces a NEW verb. The verb
is the thing that makes depth N feel different from depth N-1 even though the tiers are identical.

---

**Prestige 0 → 1: Unlock PIPELINE (new verb: ROUTE)**

After the first prestige, a "Signal Router" panel unlocks in the Managers tab. It exposes a
small ASCII connection diagram showing the timed tiers as nodes. The player can draw up to 2
directed wires (arrows) between nodes: "on completion of A, auto-queue B." A wired connection
costs a one-time bit payment and auto-queues the target immediately after the source completes,
no manager required. Managers still make individual tiers *faster*; pipelines chain them
*sequentially*.

The new decision: is a pipeline cheaper than managers for the same throughput? Do I chain
Bit Box -> Signal Booster -> Core Cluster for a cascading waterfall? Or does that leave idle
gaps? The player must think about sequencing, not just rates.

Implementation fit: state.pipeline = [[src, dst], ...], a simple adjacency list. The tick loop
checks completions and auto-queues the downstream node. No new rendering infrastructure beyond
an ASCII arrow diagram. Deterministic (no randomness).

---

**Prestige 1 → 2: Unlock FLUX (new verb: RIDE vs. DRAIN)**

After the second prestige, a "Flux Meter" appears as a narrow bar in the stats panel. Every
bit produced by timed tiers adds 0.01 flux per bit (passive rate does not contribute). Flux
caps at 100. At 100%, flux auto-releases: all timed payouts for the next 5 seconds pay 3x.
But the release also briefly (2 seconds) pauses all managers (they "overheat").

Alternatively, the player can manually drain flux at any point: spend 50% of current flux for
a smaller controlled 1.5x burst lasting 2 seconds, without pausing managers.

The new decision: do you ride to full flux for maximum burst, accepting the manager pause risk?
Or drain early for lower but consistent bonuses? The manager pause penalty is the trap — players
who over-rely on managers suffer more from a full flux release. Players with few managers but
heavy Quantum Tap clicking benefit from full releases.

Implementation fit: state.flux = number (0-100), state.fluxReleasing = bool. The tick loop
accumulates flux from timedPayout calls and handles release logic. No new UI infrastructure.
The flux meter is a CSS width bar. Deterministic accumulation — no randomness, flux rate is
a pure function of production.

---

**Prestige 2 → 3: Unlock ENTROPY (new verb: MAINTAIN)**

After the third prestige, every owned tier count begins decaying: once per minute (60-second
tick), the tier with the lowest owned count that has no manager loses 1 unit. If all tiers have
managers, no decay occurs. Decay stops if owned count reaches 1 (a tier can never decay below
its first unit).

This is the first mechanic that makes idle NOT the safe state. Previously, the player could
buy managers and walk away indefinitely. With entropy, unmanaged tiers degrade. The cost of
managers now has an explicit counter-benefit: not just "makes it faster" but "prevents decay."

The new decision: which tiers can I afford to manage? Entropy prioritizes cheap tiers (lowest
owned) — so the player must either maintain cheap tiers (lots of managers) or race the cheap
tiers past a threshold where decay is meaningful. A secondary decision: is it ever worth letting
a tier decay to 1 and rebuilding it (resetting the builder chain for a cleaner foundation)?

Implementation fit: state.lastDecayTick = epochMs, decay logic in the main tick loop. A subtle
red flash on a decaying tier's row in the shop is sufficient UI feedback. The 60-second cycle
is coarse enough that the player always has warning. Deterministic — no randomness.

---

**Prestige 3 → 4: Unlock DEFRAG ECHOES (new verb: VIGILANCE)**

After the fourth prestige, every 4-5 minutes (seeded interval per run, deterministic from
state.pullFactors.length as the seed), a "Defrag Echo" spawns silently. It does not announce
itself — instead, the player's net rate display begins a slow drift downward, and a faint ASCII
artifact (a character corruption: one character in the stats panel is replaced by a block
character, cycling slowly) indicates something is wrong.

If the player clicks the corrupted character within 90 seconds, the echo is banished: a brief
celebration line in the bell ("caught one."), no penalty. If the echo goes unaddressed for 90
seconds, it persists and silently diverts 20% of passive income to itself (lost bits, not
buffered) until clicked away. A second unaddressed echo in the same run doubles the diversion
to 40% for both.

The new decision: do you pay attention? This mechanic rewards players who watch the screen
(active session) and gently penalizes those who walk away for extended periods. It cannot be
fully automated (by design — a manager cannot "click" the echo). But it also does not punish
idle play harshly: 20% diversion is noticeable but not catastrophic, and the player can recover
by clicking. It creates exactly the "golden cookie" tension from Cookie Clicker: the game
rewards presence without requiring it.

Implementation fit: the echo is a character position index in the stats panel, stored as
state.echoIndex. The tick loop checks whether the echo is active and whether 90s has elapsed.
The "corrupted character" is a CSS class toggle on one specific character span. Fully
deterministic seed: echoTimerMs = 240000 + ((state.pullFactors.length * 17) % 60000), so
each prestige run gets a slightly different interval. No Math.random in the live path.

---

**Prestige 4 → 5: Unlock RESONANCE (new verb: DISCOVER)**

After the fifth prestige, hidden tier-ratio bonuses become active. The system checks whether the
ratio of owned counts between specific tier pairs falls within a "resonance window." If so, a
hidden multiplier applies to both tiers' output — but this is not documented anywhere in the UI.
The player discovers it by experimentation.

Resonance windows (three pairs, hard-coded):
- Signal Booster : Bit Box = between 1:2 and 1:4 owned ratio -> +30% to both tiers' payout
- Core Cluster : Signal Booster = between 1:2 and 1:3 -> +20% to both
- Neural Net : Quantum Tap = between 2:1 and 4:1 -> +25% to both

The ONLY feedback the player gets: a faint "~" character appears next to the tier name in the
shop when that tier is in resonance. No tooltip, no explanation. The bell may deliver one cryptic
hint after the fifth prestige: "some combinations hum. some don't." (~= hint at resonance).

The new decision: now that you know the ratios matter, do you optimize for ratio or for raw
count? Buying more Bit Boxes to get into the 1:2-1:4 window for Signal Booster resonance means
spending on a tier you already have plenty of, purely to hit a target ratio. This is a different
kind of optimization problem — diminishing returns on count, but non-zero returns on ratio.

Implementation fit: the resonance check is a pure function of state.owned — three ratio
comparisons, three CSS class toggles. No new state needed beyond the toggle flags. All
thresholds are hard-coded constants. Fully deterministic.

---

### Summary table: expansion arc

| Prestige depth | New mechanic | New verb | Core decision |
|---------------|--------------|----------|---------------|
| 0 (first run) | 7-tier unlock progression | Tap, Time, Build, Automate, Multiply, Synergize | Learn the hierarchy |
| 0 -> 1 | Signal Router (Pipeline) | ROUTE | Chain sequences vs. parallel managers |
| 1 -> 2 | Flux Meter (Burst system) | RIDE vs. DRAIN | Max burst (accept manager pause) vs. controlled drain |
| 2 -> 3 | Entropy (Tier decay) | MAINTAIN | Which tiers to manage to prevent decay |
| 3 -> 4 | Defrag Echoes (Vigilance) | SPOT & CLICK | Stay present to catch echoes vs. walk away |
| 4 -> 5 | Resonance (Hidden ratios) | DISCOVER | Optimize for count vs. optimize for ratio |

Each mechanic is deliberately irreversible as a permanent addition: once a prestige depth is
reached, the mechanic stays active for all subsequent runs. Flux exists from prestige 2 onward.
Entropy exists from prestige 3 onward. Defrag Echoes from prestige 4 onward. Resonance from
prestige 5 onward. The game at prestige 5 is running all five parallel systems simultaneously —
a genuinely complex optimization space that a first-run player would find overwhelming.

---

## 4. FUN & RETENTION

### Economy / meta-loop

The existing Gravitational Pull prestige gives compounding speed boosts. The expansion arc adds
a second dimension: each prestige also unlocks a new mechanic. This means the meta-loop reward
is DUAL: you get faster AND you get new. Neither alone sustains 40-120 minutes; together they do.

- **Faster** (existing) satisfies the desire for visible progress acceleration.
- **New mechanic** (expansion) satisfies the desire for a fresh optimization problem.

The prestige formula (gain = 2 + (log10(ratio))^1.92) ensures early prestiges are cheap and
fast (x2 pull at the threshold) and late prestiges are large but costly — matching the classic
"pull is worth waiting for" asymmetry.

### Risk-reward decisions that sustain engagement

Stage 1 already has two risk-reward decisions (manager running costs; boss ticket cost). The
expansion adds three more:

- Flux: ride vs. drain — timing risk
- Entropy: manager budget — prioritization risk
- Defrag Echoes: vigilance vs. idle — attention risk

Each new risk-reward layer engages a different play style. A maximizer who always drains flux
and catches every echo will outperform a pure-idler by 30-50% in a given run, but the game is
not punishing enough that the idle player fails to complete it. This is the correct balance for
a hidden easter egg: rewarding engagement, not requiring it.

### What sustains 40-120 minutes

- Minutes 0-10: intro reveal and first-run discovery of the 7-tier arc.
- Minutes 10-25: Bit Box + Signal Booster + manager system. The trap (negative net rate) is
  usually encountered here. Recovery and re-hiring is the session's main skill moment.
- Minutes 25-50: Late tiers (Neural Net, Quantum Tap) + prestige unlock. The first prestige is
  the session's emotional peak — a willingness to erase everything for a bigger number is the
  genre's defining moment.
- Minutes 50-80: Post-prestige runs with Pull bonus. Same content but faster. The player has
  internalized the loop and is now optimizing it. Second and third prestiges unlock Pipeline and
  Flux.
- Minutes 80-120: Boss approach. Late tiers unlocked fast via pull. Player still losing to the
  Defragmenter (cheat active). Discovery of Overwriter.frag is the puzzle climax.

The session arc is: learn -> optimize -> reset -> discover -> fight. Five distinct phases in a
single game that runs inside a file-viewer modal.

---

## 5. CAVEATS — Stage 1 Specific

### Determinism

Stage 1 uses `Date.now()` only for:
- `state.runStartedAt` (speed achievement timestamps — display only, never production-affecting)
- `state.timedStates[id].startedAt` (timed cycle start — also display only, determines elapsed)
- Boss burst schedule in `boss1.js`: `seed = Date.now() % 1000` — this IS in the live path but
  is intentionally per-fight-varied so each fight attempt is unpredictable. This is deliberate and
  acceptable because the boss fight is a 20-second reactive session, not an idle accumulation.

For the expansion arc, all new mechanics MUST be deterministic from state:
- Flux accumulation: pure function of timedPayout calls.
- Entropy decay: triggered by a clock tick with a fixed interval (60s).
- Defrag Echo timing: seeded from state.pullFactors.length, no Math.random.
- Resonance: pure function of state.owned ratios.
- Pipeline: pure adjacency graph in state.pipeline.

The echo mechanic (Prestige 3->4) uses a deterministic seed: the interval is a function of
pullFactors.length so each prestige run gets a fixed echo schedule. Never Math.random.

### Performance

Each new expansion mechanic must add at most one new check to the 100ms tick loop:
- Pipeline: one adjacency check per timed completion event (event-driven, not tick-driven).
- Flux: one accumulation step (O(n tiers), already iterating).
- Entropy: one decay check per minute (60-tick counter, single comparison).
- Echoes: one boolean check per tick (O(1)).
- Resonance: three ratio comparisons per shop render (triggered on buy, not on tick).

Total tick cost is negligible. No DOM queries in the tick loop — state-only updates.

### Uniqueness preservation

All five expansion mechanics are unique to Stage 1's "IT infrastructure" theme:
- Pipeline: signal routing through a network (fits the IT narrative)
- Flux: electrical surge and heat management (fits hardware)
- Entropy: hardware degradation without maintenance (fits sysadmin)
- Defrag Echoes: the boss's ghost haunting the running system (fits The Defragmenter's lore)
- Resonance: tuned hardware ratios for optimal throughput (fits overclocker culture)

None of these mechanics appear in Stages 2-10 as designed. They are specific to the
"Bit Foundry" IT theme and do not require the un-cheat boss mechanic to be rebuilt.

### The un-cheat boss remains load-bearing

The Defragmenter boss fight is permanently gated by CHEAT='true' in Overwriter.frag. The
expansion mechanics (Pipeline, Flux, Entropy, Echoes, Resonance) all sit in the grind
phase — before the boss fight. None of them affect or bypass the boss gating. The un-cheat
discovery (editing Overwriter.frag in Monaco) remains the ONLY path to winning the boss fight.
Disabling the cheat is a permanent one-time action; re-enabling is blocked by design.

The expansion arc does not create any new "bypass" paths. The player must still:
1. Reach prestige depth via normal grind
2. Accumulate bossTicket (1e54 bits)
3. Discover and edit Overwriter.frag
4. Win the fair click contest

---

*Sources listed in Section 1.*
