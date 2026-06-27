# Stage 8 — Entropy Field: Game Design Research

_Research brief for the expansion + real-game design of Stage 8._
_Companion docs: `planning/stage8-01-survival-resource-research.md` (genre deep-dive),
`planning/stage8-02-our-game-design.md` (566-line implementation spec)._

---

## 1. GENRE — Survival Resource Management / Decay Simulation

### What the genre is

A survival resource management game imposes **persistent depletion**: every resource in the
system trends toward exhaustion unless the player actively counters it. The core loop is
not "build toward a goal" but "maintain a system against its own tendency to fall apart."
Decay simulation is a sub-genre that makes the depletion mechanism explicit and structural —
resources do not just run out, they rot, cascade, and pull adjacent systems down with them.

The genre's distinguishing traits:

- **Rate-vs-total tension.** Players must track not just how much they have but how fast it is
  changing. A large stockpile draining fast is more dangerous than a small stockpile holding
  steady. Games that hide rates (only show totals) feel opaque; the best games show both.
- **Cascade failure.** The failure of one sub-system stresses adjacent sub-systems. A single
  broken node can cause a progressive collapse that exceeds what any individual failure would
  justify. This is both the primary threat and the primary dramatic engine.
- **Bounded rationality under scarcity.** The player can never repair everything, feed everyone,
  or maintain all infrastructure simultaneously. Decisions are always about trade-offs under
  time pressure. This is what makes every cycle feel meaningful rather than mechanical.
- **Preparation / reaction alternation.** The best survival games create a rhythm: a planning
  window (safe, deliberate) followed by an event window (reactive, stressful). Neither alone
  is engaging for long.
- **Knowledge as meta-progression.** The game's "difficulty" is substantially about learning
  what to prioritize. A player on their third run has fundamentally better judgment than on
  their first — even with the same in-run resources.

### The 3-5 best games and what specifically makes them work

**Don't Starve (2013, Klei Entertainment)**
Three interlocked meters — Health, Hunger, Sanity — each depleting from different causes and
interacting with each other. Low Sanity causes hallucinations that threaten Health; eating
bad food restores Hunger but damages Sanity. The *interdependence* across meters is what
separates Don't Starve from simpler survival games: you cannot optimize for one meter without
creating risk on another. The day/night cycle (roughly 10 real minutes) imposes a forced
decision rhythm that prevents turtling. The most elegant design choice: **Sanity changes what
the player perceives** — the world looks different at low Sanity (shadow creatures appear,
audio degrades). The mechanical state IS the aesthetic experience. Players feel entropy
before they read it. Permadeath with full knowledge retention means every death teaches
permanently, making death feel productive rather than punishing.

Sources: [Survival Game Design Principles (gamedesignskills.com)](https://gamedesignskills.com/game-design/survival/),
[How Survival Games Teach Resource Management (gamerant.com)](https://gamerant.com/best-survival-games-teaching-resource-management/)

**Oxygen Not Included (2019, Klei Entertainment)**
A closed-system colony sim where resources form **flow networks**: oxygen is produced,
transported, and consumed; CO2 accumulates; heat builds. The genius is making the player
design infrastructure (pipe layouts, power grids) whose spatial arrangement determines
system behavior. There is no antagonist AI — the player is their own enemy: "for every
action, a reaction." Heating water to purify it raises ambient temperature, preventing crops
from growing. The emergent crises from this self-made interdependency create the most
compelling cascade narratives in the genre: a power shortage causes the water pump to fail,
which stops irrigation, which kills food crops, which causes starvation. No single designed
enemy produced any of this. The "race against entropy" pacing is also distinctive: starting
resources are abundant, depletion is gradual, and the player must establish sustainable
systems before initial stockpiles run out. The deadline is self-imposed and invisible until
it is urgent.

Sources: [The Genius Design of Oxygen Not Included (gideonsgaming.com)](https://gideonsgaming.com/the-genius-design-of-oxygen-not-included-a-review/),
[ONI Game Mechanics wiki](https://oxygennotincluded.wiki.gg/wiki/Game_Mechanics)

**Frostpunk (2018, 11 Bit Studios)**
Dual-axis management: physical resources (coal, food, steel) and social resources (Hope,
Discontent). Both axes have fail states; they interact: harsh decisions produce more coal but
reduce Hope. The **moral ratchet** — enacted laws cannot be revoked — means early decisions
compound into late-game constraints, giving choices lasting weight. Countdown-event pressure
("temperature drops to -100C in 12 days") creates a specific kind of tension: preparing for
a *known future state*, distinct from ONI's gradual invisible depletion. Resource pipeline
visibility (rates always displayed alongside totals) is the UX lesson the whole genre learned.
Frostpunk 2 (2024) pushed further: individual buildings became districts (nodes), each
producing resources and requiring supplies. The district/node model simplifies cognitive load
while deepening strategic thinking — the node-as-unit approach rather than building-as-unit
directly informs Stage 8's design.

Sources: [Why Frostpunk's Game Design Is So Good (retrostylegames.com)](https://retrostylegames.com/blog/frostpunk-game-design/),
[Frostpunk Analysis: Emotional Narrative Engagement (gamedeveloper.com)](https://www.gamedeveloper.com/design/frostpunk-an-analysis-of-emotional-narrative-engagement)

**Into the Breach (2018, Subset Games)**
Not a survival resource game in the traditional sense, but the most important design reference
for **failure that teaches rather than punishes**. The core mechanic: the player always knows
enemy attack locations before acting. This makes failure feel like a puzzle unsolved rather
than a trap sprung. The true fail state is losing the Power Grid (cities destroyed), not losing
mechs — players must "unlearn" protecting their units and learn to protect the world. The grid
is shared across all islands, meaning losses compound. New threats per island change the
decision space without inflating numbers. The lesson for Stage 8: **the boss should test
preparation, not reflexes.** The Heat Death is Into the Breach's Power Grid at maximum
pressure: a finite buffer that accumulated decisions have either filled or not.

Sources: [Reimagining Failure in Strategy Game Design: Into the Breach (gamedeveloper.com)](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-),
[Core Gameplay Mechanics of Into the Breach (winenfood.com)](https://winenfood.com/explaining-the-into-the-breach-game-mechanics/)

**Rimworld (2018, Ludeon Studios) — for cascade failure as dramatic engine**
The most important reference for cascade failure design. Rimworld's genius is that its
disaster events are calibrated to colony wealth, preventing catastrophic punishment during
recovery phases. The expectations system adjusts colonist mood requirements downward after
disasters. Most critically, the "deus ex machina safety valve" (the Man in Black: one
guaranteed rescue in truly hopeless situations) preserves stakes while offering redemption.
The design lesson: **allow dramatic spirals but build in recovery possibility.** A cascade
that cannot be recovered from is just unfairness; a cascade that CAN be recovered from, with
effort, is the genre's highest-stakes drama.

Sources: [The Art of the Spiral: Failure Cascades in Simulation Games (gamedeveloper.com)](https://www.gamedeveloper.com/design/the-art-of-the-spiral-failure-cascades-in-simulation-games),
[8 Survival Strategy Games Rewarding Smart Planning (techtimes.com)](https://www.techtimes.com/articles/314815/20260225/8-survival-strategy-games-that-reward-smart-planning-over-fast-reflexes.htm)

---

## 2. OUR CORE LOOP

### Situation assessment

The existing code (state.js, renderer.js, boss.js, content.js) is a thin stub. The "game"
as currently built:

- Starts with 3 pre-made debris files (cycle 14, nodes already failed)
- Presents a static node map with 4 nodes, 2 already failed
- Win condition: archive 2 starter debris files → challenge Heat Death → instant win
- No cycle engine, no repair system, no cascade, no events
- This is trivially won in under 30 seconds

The **566-line design spec** in `planning/stage8-02-our-game-design.md` is the real game.
It is not built. What follows is the complete design for what must be implemented.

### The moment-to-moment loop

Each **cycle** (roughly 60-90 seconds of player time) runs four phases:

**Phase 1: Announcement (auto, ~5 seconds)**
- Random event for this cycle revealed
- Telegraph for upcoming cascade appears ("instability detected in sector 3")
- Bell fires if something notable changed

**Phase 2: Preparation (player-controlled, no time limit)**
This is the beating heart of the game. The player:
1. Reads node health bars and decay countdowns on the 14-node map
2. Allocates Repair Units to degrading nodes (limited budget; cannot repair all)
3. Applies Stabilizers to freeze particularly critical nodes
4. Toggles High-Load Mode on Production nodes (burst income, faster decay)
5. Moves debris files from `/entropy/debris/` to `/entropy/active_archive/` via drag-and-drop
6. Purchases from the Upgrade Terminal (Repair Unit batches, Stabilizers)

**Phase 3: Advance (player presses "Advance Cycle")**
- Decay applied to all nodes; cascade stress added from failed-node neighbors
- Random event resolves
- Failed nodes create `.sav` debris files in sidebar with 2-cycle decay timers
- States income credited from active node outputs minus Entropy Sink drain

**Phase 4: Summary (auto, ~3 seconds)**
- States earned this cycle
- Nodes that degraded or failed (highlighted)
- Entropy level and glitch intensity updated
- Debris files expiring next cycle flagged in red

### Why this loop works

The preparation phase creates the genre's "bounded rationality" decision: the player has
fewer Repair Units than degrading nodes need. This is the central tension — not "survive the
battle" but "which of these systems do I let weaken to save the others?" The cascade mechanic
makes the topology of the node map matter: a low-output node adjacent to the Core Kernel is
worth repairing over a higher-output isolated frontier node, because its failure stresses the
core. This is a richer decision than "repair most damaged."

The boss (The Heat Death) tests decisions made 15+ cycles earlier. Unlike every other
Defragmenter boss (which test current skill), Heat Death tests the cumulative quality of
preparation: did the player salvage debris throughout? Did they buy Stabilizers as insurance?
The boss is completely unwinnable without having used drag-and-drop salvage throughout the
run — the gap between "never salvaged" (~190 States available) and "needed to survive"
(260 States minimum) is unbridgeable. The un-cheat is load-bearing, not cosmetic.

### The un-cheat (boss gate)

**Feature used:** host-app drag-and-drop (internal drag within the file tree sidebar).

**Mechanism:** when nodes fail, they drop `.sav` debris files into `/entropy/debris/`. Each
file holds trapped States from the failed node (8–88 States depending on tier). Files have
a 2-cycle decay timer — if not dragged to `/entropy/active_archive/` they are permanently
lost. The boss (Heat Death) requires 260 States minimum to survive 10 cycles of burn. Normal
play without salvage yields ~190 States. The ~70-State gap is only bridgeable through
consistent debris salvage across the run.

**Not bypassable because:** the action must happen DURING the stage, across multiple cycles,
not at the boss. A player who arrives at Heat Death without having salvaged cannot unlock it
in the same run — they must restart and engage with drag-and-drop throughout. The first failure
triggers specific bell messages pointing explicitly to the debris folder: "there was more. it
was in the debris files. I didn't move them in time."

---

## 3. THE EXPANSION ARC (MOST IMPORTANT)

The model: Stage 2 "Glyph Dungeon" — each biome band introduces one genuinely new verb
(avoid terrain → break line-of-sight → manage spreading fire → manage darkness). The player
is always doing something new at deeper levels, not just the same thing harder.

Stage 8 divides into **six cycle bands plus boss.** Each band introduces exactly one new
decision type. The bands are labeled by their cycle range in the full 35-cycle game.

---

### Band 1 — Cycles 1–5: "Bootstrap" — New Verb: ALLOCATE

**What exists:** Core Kernel (C1) only, plus one Production node. Both start at 100% health.
Repair Units are generous relative to decay. No cascade yet (cannot cascade with one node).

**New thing to learn:** the cycle structure itself. The player sees health ticking down and
learns that Repair Units restore it. The budget is loose enough that the player can repair
everything — this is intentional. Band 1 teaches the verb without making it hard.

**Decision shape:** "How many Repair Units to spend on C1 vs. P1 vs. save for later?"
The "save for later" option has no obvious benefit yet, so most players repair everything.
That's fine. The lesson is: repair units are a per-cycle budget; health ticks down; advance
cycles to earn States.

**Why this is a distinct verb:** ALLOCATE (a finite budget across multiple targets) is
qualitatively different from "buy more" or "build faster." It is the first time the player
faces a binding constraint with no obviously correct answer.

---

### Band 2 — Cycles 6–10: "The Network Wakes" — New Verb: PRIORITIZE (with topology)

**What changes:** Mid-zone nodes (M1, M2) activate. With 4 active nodes, decay outpaces
the repair budget. The cascade mechanic fires for the first time: a Production node (P1
or P2) fails, and its Mid-zone neighbor gains +30% decay rate.

**New thing to learn:** the NODE MAP IS A GRAPH, not a list. Repairing a low-output node
(P1, 0.5 States/cycle) may matter MORE than repairing a high-output node if P1 is adjacent
to M1 (which feeds C1). The topology changes which repairs are correct.

**Decision shape:** "M1 is degrading faster than P1 but P1's failure will stress M1 — do I
repair P1 preemptively to protect M1, or is that too expensive given M1's higher output?"

**Why this is a distinct verb:** PRIORITIZE with cascade-topology awareness is fundamentally
different from Band 1's simple allocation. The player must think one step ahead through the
network graph, not just respond to current health bars. This is the moment where the map
stops being decoration and becomes the game.

---

### Band 3 — Cycles 11–16: "Frontier Online" — New Verb: RISK-TOGGLE

**What changes:** Frontier nodes F1/F2 unlock. They produce 10 States/cycle — triple any
other node — but decay at 2.5× the base rate and cascade hard to the Mid-zone. Additionally,
High-Load Mode is introduced for all Production nodes: toggle it on for +50% output AND
+50% decay simultaneously.

**New thing to learn:** a **binary mode switch** on individual nodes creates an asymmetric
trade-off that is NOT about static allocation. The right answer depends on current node
health (High-Load on a 90% health node is much safer than on a 40% health node), on how
many Repair Units are available, and on whether the Frontier cascade would destroy the
Mid-zone if it fires.

**Decision shape:** "Should I enable High-Load on F1 to accelerate income and buy Stabilizers
faster — knowing that if I don't repair it in 3 cycles it will cascade into M3 and M4?"

**Why this is a distinct verb:** RISK-TOGGLE is not allocation (which target to spend on)
or prioritization (which node matters in the graph). It is a **temporal bet**: spend nothing
now, earn faster, pay repair cost later. The correct decision changes based on current game
state in a way that cannot be pre-solved. This is the genre's risk/reward decision in its
purest form, made explicit as a toggle with clear asymmetric consequences.

---

### Band 4 — Cycles 17–22: "The Debris Field" — New Verb: SALVAGE

**What changes:** With Frontier nodes in play, failures become frequent. Debris files start
appearing in `/entropy/debris/` in the sidebar — 2-cycle decay timers, States locked inside.
The player must notice the sidebar, understand the file, and drag it to `/entropy/active_archive/`
before it vanishes.

**New thing to learn:** SALVAGE runs on a **parallel temporal track** separate from the
cycle structure. The cycle clock is the main game; debris timers are an overlaid clock that
ticks independently. Missing a cycle phase has no permanent consequence; missing a debris
file is permanent.

**Decision shape:** "I'm mid-allocation in Phase 2 when I notice a debris file is about to
expire. Do I interrupt my repair plan to salvage now, or finish the repair and risk losing
the file this cycle?"

**Why this is a distinct verb:** SALVAGE is qualitatively different from everything prior.
The player is performing an action in a different interface layer (the sidebar/file tree,
not the node map). The drag-and-drop gesture is physical, not numerical. And salvage
operates on a separate time axis from cycle advance — it can be done at any moment, but
procrastination is permanently punished. This band is the feature teacher: it builds the
habit that makes the boss survivable.

**Note:** this is also the discovery moment. The bell fires: "there was something left in
the wreckage. it won't last long." Achievement fires on first successful drag-and-drop.

---

### Band 5 — Cycles 23–28: "Entropy Thresholds" — New Verb: SUPPRESS

**What changes:** Entropy level (a weighted sum of failed/degrading nodes) now crosses
60%, triggering the "Pattern Failure" cascade event class: two adjacent Mid-zone nodes
simultaneously lose 15 health. Above 80%, "Total Cascade" fires: all currently degrading
nodes lose 30 additional health in one cycle. These event thresholds create **step changes**
in system behavior.

**New thing to learn:** the player was previously managing individual nodes; now they must
manage a **system-level statistic**. Keeping entropy below 60% requires repairing even
failed nodes (not just degrading ones) to lower the percentage. A failed node contributes
10 entropy points; restoring it to Degrading costs resources but saves the threshold trigger.
This changes the repair calculus: sometimes it is worth repairing a low-value failed node
purely to suppress entropy.

**Decision shape:** "Entropy is at 58%. Repairing M2 (failed, low value) costs 14 Repair
Units to restore to degrading (saving 6 entropy points). That pulls us below 60% and
prevents Pattern Failure. But those 14 units were for F1. Do I protect the threshold
or the high-output Frontier node?"

**Why this is a distinct verb:** SUPPRESS is different from PRIORITIZE (Band 2) even
though both involve node repair decisions. In Band 2, repair priorities follow node value
and graph topology. In Band 5, repair decisions are driven by the system-level entropy %
— an aggregated statistic that individual node health feeds into. The player must now track
two simultaneous frames: "which node needs repair" AND "what does repairing it do to the
entropy percentage." This is a second-order decision on top of first-order allocation.

---

### Band 6 — Cycles 29–34: "Triage" — New Verb: SACRIFICE

**What changes:** The Entropy Sink drain has grown to 3+ States/cycle (scaling with cycles).
Repair Unit budgets cannot sustain all 14 nodes. The player mathematically cannot maintain
the full map. Stabilizers become the primary lever for protecting the Core zone while the
Production and Frontier zones decline.

**New thing to learn:** **deliberate zone abandonment**. In all prior bands, the player was
working to save everything, triaging by priority. Now the correct strategy is to decide
early which zone to sacrifice entirely — let Production nodes fail in sequence, use the
debris salvage, and concentrate all Repair Units on the Core Kernel and Mid-zone that
sustain the minimum viable States income.

**Decision shape:** "I cannot repair F1, F2, and the P-nodes this cycle. I'm going to let
the Frontier fail. I will stabilize M3 and M4 to prevent the cascade from reaching C2.
I will accept -10 States/cycle in exchange for a stable core that generates 16 States/cycle
reliably. The debris from F1/F2 failures is worth salvaging."

**Why this is a distinct verb:** SACRIFICE contradicts every prior instinct in the game.
Band 2 taught PRIORITIZE (save the most important); Band 6 teaches SACRIFICE (deliberately
let go of what you cannot save so it does not drag down what you can). This is the hardest
decision type to internalize because it requires accepting permanent loss for strategic gain.
It also creates the strongest emotional resonance with the theme: entropy wins some of the
time, and the response to that is not heroic resistance but intelligent triage.

**Architecture shift:** the player's node map visually changes — the Frontier/Production
zones go dark (failed, static texture), the Core zone remains lit and maintained. The
player's territory has contracted. This is visually communicated in the glitch aesthetics:
those zones enter maximum-glitch visual corruption while the Core holds clean.

---

### Boss — Heat Death: Anti-Verb: ENDURE

**What changes:** The Heat Death fires. All nodes fail simultaneously. No repair possible.
The Entropy Sink spikes to 50 States/cycle (escalating each cycle: 17, 19, 21... 35).
Ten cycles must be survived on reserves alone.

**New thing to learn:** nothing. This is the **culmination, not an introduction**. The
boss tests every prior decision:
- Did ALLOCATE keep nodes alive long enough to accumulate States?
- Did PRIORITIZE preserve the Core zone output across the mid-game?
- Did RISK-TOGGLE generate enough burst income to buy Stabilizers?
- Did SALVAGE recover the debris States that close the gap to 260?
- Did SUPPRESS prevent catastrophic cascades from draining the buffer?
- Did SACRIFICE correctly identify which zone to abandon early?

The only in-boss lever is Stabilizer timing (each pauses the burn for 2 cycles). This is
an **anti-verb**: not action but restraint. The player who optimally manages Band 2–6 has
exactly enough to endure. The player who over-invested in any one strategy at the expense
of another does not.

**The emotional payload:** the entity has learned that the universe is indifferent. You
cannot defeat entropy; you can only outlast a specific manifestation of it. "I held. the
universe didn't care. I did."

---

### Expansion arc summary (ordered)

| Band | Cycles | New Verb | Decision Type | Prior Verbs Required |
|------|--------|----------|---------------|----------------------|
| 1 | 1–5 | ALLOCATE | Split finite budget | — |
| 2 | 6–10 | PRIORITIZE | Topology-aware repair | Allocate |
| 3 | 11–16 | RISK-TOGGLE | Temporal bet on mode switch | Allocate + Prioritize |
| 4 | 17–22 | SALVAGE | Parallel temporal track (drag-and-drop) | All prior |
| 5 | 23–28 | SUPPRESS | Second-order threshold management | All prior |
| 6 | 29–34 | SACRIFICE | Deliberate zone abandonment | All prior |
| Boss | 35+ | ENDURE (anti-verb) | Culmination, no new mechanics | All prior |

---

## 4. FUN & RETENTION

### Economy meta-loop

The core in-run economy is **States → Repair Units / Stabilizers → node health → more States**.
This loop is legible (rates always displayed) and has genuine non-linearities: repairing a
node from 40% to 80% health is more cost-efficient than 0% to 40% (lower cascade risk and
higher output per unit spent). Players who internalize this prioritize partial repairs over
full repairs of fewer nodes — a counterintuitive insight that rewards mastery.

The Microstate Count prestige system adds a meta-loop: each prestige grants a permanent
upgrade (starting Repair Units, starting Stabilizer, reduced base decay). Nodes also start
at progressively higher health per prestige (60% → 65% → ...). This means a second or third
run is meaningfully easier early, letting the player engage with later bands sooner. The
replayability curve: first run = learn Bands 1–3; second run = survive to Band 5; third
run = optimize the full arc.

### Risk-reward decisions that sustain engagement

1. **High-Load Mode gamble.** Enabling it on a Frontier node is a 3-cycle commitment:
   repair budget must cover the accelerated decay or you lose a 10 States/cycle producer.
   Getting it right feels brilliant; getting it wrong is a memorable cascade story.

2. **Debris timing tension.** A debris file worth 48 States expiring this cycle while the
   player is mid-allocation creates genuine urgency. The drag-and-drop is simple but the
   choice of WHEN to stop planning and do it is not.

3. **The entropy threshold bet.** Sitting at 59% entropy and choosing not to repair the
   low-value failed node (to save Repair Units for the Frontier) is a bet that entropy will
   not tick above 60% this cycle. It often pays off. When it does not, the Pattern Failure
   cascade is a direct, legible consequence of the bet.

4. **Stabilizer timing at Heat Death.** 4 Stabilizers × 2 cycles paused = save 124 States.
   Use them in cycles 1–4 (lower burn rate, saves 68 States) vs. 7–10 (higher burn rate,
   saves 128 States). The player who planned far enough ahead to buy stabilizers now faces
   a final optimization puzzle.

### What sustains 40–90 minutes

- **Cascades are stories.** When P2 fails and stresses M1 which then fails and stresses C2
  which drops to Degrading in one cycle, the player has a narrative: "I should have caught P2
  three cycles ago." The spiral is legible, causal, and memorable.
- **Band introductions reset engagement.** Each new verb (Bands 1–6) is a small tutorial
  embedded in the game itself. The player who just learned RISK-TOGGLE has a new frame
  for all their prior decisions. Engagement spikes at each band entry.
- **The boss is a verdict.** Heat Death does not feel like a boss fight — it feels like
  receiving the results of an exam taken over 30 cycles. The dramatic question ("do I have
  enough?") was seeded in Band 4 (first debris salvage). The suspense is long-form.
- **Glitch aesthetics are feedback.** As entropy rises, the screen corrupts. Players
  experiencing visual degradation instinctively want to fix it. The aesthetic is aversive
  in exactly the right way — it creates urgency without requiring any UI alert.

---

## 5. CAVEATS

### Determinism (critical)

The existing spec calls for "random" events with a 30% per-cycle probability and random
cascade targets. These MUST be seeded from a deterministic RNG initialized from a
fixed seed (stage number + cycle number + stable player state hash). `Math.random()` and
`Date.now()` must never appear in the live path. The existing codebase pattern uses
deterministic seeds across all stages; use the same approach.

The 14-node map is fixed (same topology every run); only event targeting and event
thresholds involve randomness. This keeps the game learnable (the map can be memorized)
while preserving replayability (cascade events are not predictable without the seed).

### Performance

The cycle engine ticks on "Advance Cycle" (explicit player action), not on a timer. There
is no continuous animation loop during gameplay except the glitch CSS animation at high
entropy. The node map is a fixed SVG or div-based layout; health bar widths are DOM updates
on each cycle advance. No canvas rendering needed. This is trivially within browser
performance budgets for a 14-node static graph.

The glitch animation (`glitch-shift`, `animation: 3s infinite`) is a CSS keyframe only —
CPU cost is near zero. The color banding and static line effects can be implemented as
CSS pseudo-elements.

### Uniqueness to this stage

Two design choices are specific to Stage 8 and must not migrate elsewhere:

1. **The boss tests past decisions, not present ones.** All other Defragmenter bosses
   test current skill. Heat Death tests accumulated preparation. Do not dilute this by
   adding a "last-minute salvage" escape hatch — the whole point is that the window closed
   cycles ago.

2. **Drag-and-drop as a diegetic file operation.** The sidebar debris files are INSIDE
   the game's fiction (the `/entropy/debris/` path), not a meta-UI element. The player
   is "organizing files" in a file-viewer within a game that runs in a file-viewer. The
   recursiveness is intentional and should be preserved in any refactor. Do not replace
   drag-and-drop with a button-only flow — the physical gesture is the feature showcase.

### The thin gate problem

The existing code is trivially winnable. The build priority is:
1. Implement the cycle engine (per-cycle decay, States income, Entropy Sink)
2. Implement the 14-node map renderer with health bars and state indicators
3. Implement Repair Units and the preparation phase
4. Implement cascade stress (adjacent failed nodes → decay rate modifier)
5. Gate debris file creation on ACTUAL node failures (remove starter debris from defaultState)
6. Implement the entropy % calculation and glitch visual response
7. Implement cascade events with one-cycle telegraphing
8. Implement the Upgrade Terminal
9. Implement High-Load Mode toggle
10. Implement Stabilizer inventory and freeze mechanic
11. Recalibrate boss gate: totalStatesEarned ≥ 5,000 cumulative (not 72)
12. Implement Heat Death 10-cycle burn with escalating rate

The `defaultState()` function currently hardcodes cycle 14 with pre-built debris. Replace
with cycle 1, all nodes at 100% health, no debris, standard Repair Unit starting budget.

### File structure

Current files in `stage8/`: index.js, state.js, renderer.js, boss.js, content.js,
messages.js, styles.css, stage.generated.js. All under the 300 LOC soft cap goal.
The cycle engine, node state machine, and event system will likely require:
- `engine.js` — cycle advance logic, node decay, cascade, entropy calculation
- `nodes.js` — the 14-node map definition and topology
- `events.js` — random event pool and cascade event definitions
- `renderer.js` — expand significantly (node map SVG, health bars, glitch CSS triggers)
The existing split is appropriate; add files rather than growing existing ones past 300 LOC.

---

## Sources

- [The Art of the Spiral: Failure Cascades in Simulation Games — Game Developer](https://www.gamedeveloper.com/design/the-art-of-the-spiral-failure-cascades-in-simulation-games)
- [Reimagining Failure in Strategy Game Design: Into the Breach — Game Developer](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-)
- [Frostpunk: An Analysis of Emotional Narrative Engagement — Game Developer](https://www.gamedeveloper.com/design/frostpunk-an-analysis-of-emotional-narrative-engagement)
- [Why Frostpunk Game Design Is So Good — Retro Style Games](https://retrostylegames.com/blog/frostpunk-game-design/)
- [The Genius Design of Oxygen Not Included — Gideon's Gaming](https://gideonsgaming.com/the-genius-design-of-oxygen-not-included-a-review/)
- [How Survival Games Teach Resource Management — Game Rant](https://gamerant.com/best-survival-games-teaching-resource-management/)
- [Survival Game Design Principles — Game Design Skills](https://gamedesignskills.com/game-design/survival/)
- [8 Survival Strategy Games That Reward Smart Planning — TechTimes](https://www.techtimes.com/articles/314815/20260225/8-survival-strategy-games-that-reward-smart-planning-over-fast-reflexes.htm)
- [Core Gameplay Mechanics of Into the Breach — winenfood.com](https://winenfood.com/explaining-the-into-the-breach-game-mechanics/)
- [Against the Storm Beginner's Guide 2026 — Switchblade Gaming](https://www.switchbladegaming.com/strategy-games/against-the-storm/beginners-guide-21/)
- [Oxygen Not Included Game Mechanics wiki](https://oxygennotincluded.wiki.gg/wiki/Game_Mechanics)
- Existing planning docs: `planning/stage8-01-survival-resource-research.md`, `planning/stage8-02-our-game-design.md`
