# Stage 8 — 01: Survival Resource Management Genre Research

Reference research for the **Entropy Field** Stage 8 design. Developer-facing distillation
of the survival resource management genre across its key variants: multi-meter depletion games
(Don't Starve), closed-system optimization games (Oxygen Not Included), harsh environment
rationing games (The Long Dark), and society-survival games (Frostpunk). Each contributes
distinct mechanics that Stage 8 draws from and transforms for its "entropy as game rule" theme.
Companion doc `stage8-02-our-game-design.md` maps this onto Stage 8.

---

## A. The seminal games and what each contributed

### Don't Starve (2013, Klei Entertainment)
The archetype of the multi-resource depletion survival game. Three core meters — **Health,
Hunger, and Sanity** — each deplete at different rates from different causes, and interact with
each other. Hunger drains continuously; eating bad food restores Hunger but damages Sanity;
low Sanity causes hallucinations that threaten Health. The three meters form an interlinked
system where a player optimizing for one without watching the others fails.

**Key design lessons:**
- **Multi-meter interdependence.** No meter can be ignored for long; optimizing one at the
  expense of another creates the "cascading failure" experience. The player is always juggling.
- **Day/night cycle as forced decision rhythm.** Each game day (~10 real minutes) imposes a
  structure: gather during day, survive during night. This pacing prevents turtling.
- **Knowledge as meta-progression.** There is no in-run progression. The player's growing
  *knowledge* of what to do is the progression. Every death teaches. Lesson: *knowledge
  persistence (across deaths, across runs) is itself a reward loop.*
- **Sanity as second-order feedback.** Don't Starve's sanity meter doesn't just track a
  resource — it changes what the player *perceives*. The world becomes visually different
  at low sanity (shadow creatures appear, sounds change). This ties mechanical state to
  aesthetic experience in a deeply elegant way.
- **Permadeath with knowledge retention.** Dying sends the player back to day 1 with no items
  but full knowledge. The game is about learning the world, not accumulating power.

### Oxygen Not Included (2019, Klei Entertainment)
A closed-system colony management game. Unlike Don't Starve's open world, ONI takes place in
a sealed asteroid — nothing enters or leaves except energy. Resources form **flow networks**:
oxygen must be produced, transported, and consumed; CO₂ accumulates and must be processed;
heat builds up in enclosed spaces and must be dissipated. The "thermodynamics" layer is literal.

**Key design lessons:**
- **Closed-loop thinking.** Every process has outputs as well as inputs. A player who only
  manages inputs (what the colony consumes) fails when outputs accumulate unexpectedly (CO₂
  building up, waste products, heat). Lesson: *both sides of a resource equation matter.*
- **Flow network design.** Resources move through pipes, vents, and power grids. The player
  designs infrastructure — the spatial arrangement of nodes and their connections determines
  system behavior. Lesson: *spatial layout is part of the resource management puzzle.*
- **Emergent crises from interdependency.** A power shortage causes the water pump to fail,
  which stops irrigation, which kills food crops, which causes starvation. No single point of
  failure — cascades originate from the least-expected node.
- **"Race against entropy" pacing.** Starting resources are abundant; they deplete over time
  as the colony grows; sustainable systems must be established before depletion. Every run is a
  race to build self-sufficiency before the initial stockpiles run out.

### The Long Dark (2014–ongoing, Hinterland Studio)
A first-person wilderness survival game focused entirely on resource scarcity, condition
degradation, and risk/reward decisions. The Long Dark abstracts away combat (wolves are a
threat but not a mechanic to "beat") and focuses purely on *depletion and conservation*.

**Key design lessons:**
- **Condition degradation on items.** Clothing degrades with use; food spoils; tools break.
  The player must manage *the condition of their resources*, not just the quantity. This adds
  a time dimension to resource management — a 90% full fuel can is worth more than a 10% one.
- **Risk/reward geography.** More dangerous areas (exposed to blizzards, wolf territories)
  contain better loot. The player constantly evaluates whether the resource gain is worth
  the exposure risk. Lesson: *resource maps that spatially encode risk/reward create richer
  decisions than flat resource distribution.*
- **Preparation as gameplay.** In The Long Dark, the most important decisions are made before
  you move. Packing the right items, choosing the right route, timing the departure around
  weather windows — the planning phase is as engaging as the execution phase.
- **Weather as an active antagonist.** Blizzards reduce visibility, increase calorie burn,
  and make navigation impossible. Weather changes the game state without requiring any enemy
  AI. Lesson: *environmental forces are the most "honest" form of difficulty — the player
  can see them coming and make decisions, unlike scripted enemy ambushes.*

### Frostpunk (2018, 11 Bit Studios)
A society-survival game where the player manages a city's physical resources (coal, steel, food)
and its population's psychological state (Hope vs. Discontent). The dual-resource system —
physical and social — creates a tension that Don't Starve doesn't have: the player must manage
not just *what's available* but *how people feel about what's available*.

**Key design lessons:**
- **Dual resource axes: physical and social.** Coal keeps people warm; Hope keeps them
  governed. Running low on either is a fail state. But they interact: harsh decisions (child
  labor, extended shifts) produce more coal but reduce Hope. Players must balance physical
  efficiency against social cost.
- **The "moral ratchet."** Laws enacted can't be revoked. The player's choices progressively
  narrow future options — early decisions compound into late-game constraints. Lesson: *if
  decisions have lasting consequences, players feel their choices have weight.*
- **Weather events as countdown timers.** Frostpunk's "endless frost" events introduce a known
  deadline: "the temperature will drop to −100°C in 12 days." Players must prepare *for a
  known future state*. This is a different kind of pressure than ONI's gradual depletion —
  it's a sprint to prepare for something specific.
- **Resource pipeline visibility.** Frostpunk displays coal stockpile, food stockpile, and
  worker counts at all times. Players always know their current rates and can project forward.
  Lesson: *transparency about rates (not just current totals) is essential for planning games.*

### This War of Mine (2014, 11 Bit Studios)
Survival management set during a siege. Resources are finite (the city has no external supply).
The morality system ties resource acquisition to human cost — raiding other survivors for food
imposes a psychological penalty on your characters.

**Key design lessons:**
- **Finite world (no respawn).** Once a location is scavenged, it doesn't refill. This creates
  a "shrinking map" of opportunity as the game progresses. Lesson: *finite resource worlds make
  every acquisition feel meaningful and every waste costly.*
- **Morale as a depletion resource.** Characters become depressed from hunger, cold, and moral
  transgressions. Depressed characters stop working, which accelerates resource depletion. The
  morale spiral is a real failure mode. Our Stage 8's "integrity" of the entity mirrors this.
- **Preparation vs. reaction split.** Day = safe (scavengers rest, craft, fortify). Night =
  dangerous (scavenging, attacks). This forces planning before the danger window and creates
  a natural pacing rhythm.

### Frostpunk 2 (2024, 11 Bit Studios) — newer insight
Expands the node-map philosophy: districts replace individual buildings. Each district is a
node that produces resources and requires supplies. The player manages flows between districts.
This node-as-unit approach — rather than individual buildings as units — simplifies cognitive
load while deepening strategic thinking. Our Stage 8 takes this district/node model directly.

---

## B. Core mechanics taxonomy

### 1. Resource depletion models

Three distinct depletion models appear across the genre:

**Continuous depletion** (Don't Starve Hunger):
```js
resource -= depletionRate * dt;   // drains every second
// UI: bar that visibly empties; player always knows current value
// Tension: passive urgency even when nothing is happening
```

**Event-triggered depletion** (The Long Dark's food spoilage):
```js
if (item.condition > 0) item.condition -= conditionDecay * dt;
// Decay rate varies by environment (warm room = faster food spoil)
// Tension: ticking clock on held inventory
```

**Cascade failure** (ONI's CO₂ buildup):
```js
// CO₂ produced = respiration rate * duplicant count
// CO₂ scrubbed = scrubber capacity * power available
// If produced > scrubbed: CO₂ builds up → suffocation → colony fails
// Tension: no immediate feedback; failure is slow until it's sudden
```

Our Stage 8 uses **event-triggered node decay** (most similar to The Long Dark's condition
model but applied to "nodes" rather than items):
```js
// Each node has a condition 0–100
// Condition decays at a base rate per cycle
// When condition hits 0: node fails → triggers adjacent node stress → potential cascade
```

### 2. Resource flow networks (ONI model)

A resource flow network consists of **nodes** (producers, consumers, storage) and **edges**
(connections along which resources flow):

```
PRODUCER node → [pipe] → STORAGE node → [pipe] → CONSUMER node
```

Properties:
- Producers generate resources per cycle (e.g., +5 States/cycle)
- Consumers require resources per cycle (e.g., −2 States/cycle to stay active)
- Storage buffers excess and compensates for shortfalls
- Edges have a **throughput capacity** — they can only carry so much per cycle

When a consumer node doesn't receive enough resources, it degrades. When a producer node
fails, all downstream consumers starve.

### 3. Node health and cascade failure

The node-health model is distinct from flat resource management:

```js
// Node states
ACTIVE    → producing/consuming normally; health 50–100
DEGRADING → producing/consuming at 50% rate; health 20–49
FAILED    → no production; actively generating negative effects; health 0–19

// Cascade mechanics
function tickNode(node, dt) {
  node.health -= node.decayRate * dt;
  if (node.health <= 0 && node.state !== FAILED) {
    node.state = FAILED;
    triggerCascade(node);   // stress adjacent nodes
  }
}

function triggerCascade(failedNode) {
  const adjacent = getAdjacentNodes(failedNode);
  for (const n of adjacent) {
    n.decayRate *= 1.3;     // adjacent nodes decay 30% faster on neighbor failure
  }
}
```

### 4. Repair and restoration

All survival resource games have a "repair" or "restoration" action that counters depletion:

- Don't Starve: eating food (instant), crafting armor (immediate but costly)
- The Long Dark: repairing clothing (time cost), harvesting and processing food (time cost)
- ONI: constructing more capacity (time + resources cost)
- Frostpunk: assigning engineers to buildings (opportunity cost — engineers can't work elsewhere)

**Repair resource (Repair Units) design considerations:**
- Repair should cost *something* (not be free) — otherwise there's no strategic depth
- Repair should be *possible to deplete* — otherwise the player never faces hard choices
- Repair should *scale in cost* with how deep the damage has gone — riskier to let things fail

### 5. Scarcity-driven decision making

The Long Dark's design principle: **every decision is about risk/reward under scarcity.**
The game creates decision moments through three mechanisms:

1. **Bounded rationality:** player cannot do everything; must prioritize
2. **Temporal pressure:** some decisions have deadlines (before blizzard, before starving)
3. **Uncertainty:** outcomes are probabilistic (will this route be safe?)

Our Stage 8 maps these to:
1. **Limited Repair Units per cycle** (bounded rationality)
2. **Heat Death events** (temporal pressure — a countdown to mandatory crisis)
3. **Random event dice rolls** (uncertainty — cascade events are unexpected)

### 6. Preparation vs. reaction modes

The most interesting survival games alternate between preparation and reaction:

**Preparation phase:** player allocates resources, plans for known future threats
**Reaction phase:** unexpected event occurs; player responds with available resources

Frostpunk does this explicitly (day cycles between building and managing). Don't Starve does
it implicitly (day = gather, night = react to darkness danger).

Our Stage 8 formalizes this as **Cycles** — each cycle has a preparation moment (allocate
repair units) and a reaction moment (handle random events).

### 7. Heat Death as an endgame mechanic

In thermodynamics, heat death is the state of maximum entropy — no usable energy, no
meaningful processes can occur. In game terms, this maps to:
- All nodes failed simultaneously
- No repair resources available
- No output to generate repair
- The system has collapsed

The Heat Death boss fight in Stage 8 *deliberately achieves this state* — all repair is
blocked, all nodes fail simultaneously — and tests whether the player accumulated enough
buffer (held States in reserve) to survive through a "dead system" phase. This is a
preparation test, not a skill test.

---

## C. Standard formulas

### Node decay rate
```js
baseDecayRate = 1.0;    // 1 health point per cycle (out of 100 max health)
// Modifiers:
// - High-load nodes: decayRate *= 1.5  (produces more but degrades faster)
// - Adjacent failed node: decayRate *= 1.3  (cascade stress)
// - Repaired this cycle: decayRate *= 0.5 for 3 cycles  (stabilized)
// - Stabilizer applied: decay = 0 for 3 cycles  (frozen temporarily)
```

### Repair cost formula
```js
// Repairing a node costs Repair Units based on current condition
function repairCost(node) {
  const damage = 100 - node.health;
  return Math.ceil(damage * 0.15);  // 15 units to fully repair a 100-damage node
}
// Partial repair: player spends some units, health improves proportionally
// unitsCost = targetHealthGain * 0.15
```

### States income from active nodes
```js
statesPerCycle(node) = node.baseOutput * (node.health / 100) * tierMultiplier[node.tier];
// node.tier: 1=0.5 States/cycle  2=1.5  3=4.0  4=10.0
// At full health: full output. At 50% health: 50% output.
// At failed (0 health): 0 output + negative effects (entropy events)
```

### Heat Death boss survival check
```js
function canSurviveHeatDeath(player, duration = 10) {
  const burnRate = calculateEntropiBurnRate();   // how fast States drain during Heat Death
  const statesNeeded = burnRate * duration;
  const stabilizers = player.inventory.stabilizers;
  const pausedCycles = stabilizers * 2;          // each stabilizer pauses burn for 2 cycles
  const effectiveDuration = duration - pausedCycles;
  return player.states >= burnRate * effectiveDuration;
}
```

---

## D. Node-map design (structural)

A node map is a spatial graph where each node occupies a position and edges represent
resource connections. Design principles:

**Adjacency matters:** cascade failures spread via edges. Isolated high-value nodes are
safer but produce less (no synergy bonuses). Clustered nodes are riskier but more productive.

**Map structure:**
- 12–16 nodes total (manageable cognitive load)
- 3–4 tiers of node value
- Each node has 1–3 adjacent connections
- 2–3 "critical path" nodes whose failure triggers immediate negative events

**Zone types:**
- **Core zone:** low output, low decay, high stability — safe anchor
- **Production zone:** high output, moderate decay — primary income
- **Frontier zone:** highest output, fastest decay, cascades to adjacent nodes — high risk

**Spatial layout insight from ONI:** players naturally try to keep critical resources
(oxygen production) near the center, away from danger. Our node map should reflect this
instinct — core zone at center, frontier at edges.

---

## E. UX patterns for survival resource management

- **Rate displays (not just totals):** show "+4 States/cycle" alongside "States: 247 total"
  — without rate information, players can't project forward or plan
- **Color-coded node health:** green (50–100%), amber (20–49%), red (0–19%), gray (failed)
- **Decay countdown timers:** small countdown above each degrading node showing "fails in 3 cycles"
- **Event notification queue:** events appear as toasts, not screen-blocking popups
- **Resource flow visualization:** optional overlay showing States moving along edges between nodes
- **Cycle summary:** end-of-cycle report showing what happened, what changed, what's at risk
- **Undo within cycle:** any allocation decision made during the preparation phase can be
  undone before the cycle advances (NOT undo of the cycle itself — only pre-cycle decisions)

---

## F. Design pitfalls to avoid

1. **Death spiral with no recovery path.** If node failures cascade faster than the player can
   repair, and repair requires output from nodes that are failing, the player is stuck in an
   unwinnable state. Solution: always guarantee at least one un-cascadable node (the core zone
   cannot cascade regardless of neighbors).

2. **Repair that's always optimal.** If repairing every degrading node is always the right
   call, there's no decision. Solution: repair costs should make full maintenance of all nodes
   simultaneously impossible — the player must choose which nodes to prioritize.

3. **Events without telegraphing.** Random events that kill nodes with no warning feel unfair.
   Solution: every major event is telegraphed one cycle in advance ("instability detected in
   sector 3") so the player can prepare.

4. **Too many simultaneous demands.** If 5 nodes all need repair in the same cycle and the
   player has resources for 3, the decision becomes overwhelming rather than strategic. Cap
   simultaneous degrading nodes at 3 by design; stagger decay timers.

5. **The preparation boss test without sufficient warning.** The Heat Death boss tests whether
   the player saved States over many cycles. If the player didn't know the boss required a
   reserve, they arrive empty. Solution: the Defragmenter bell fires 5 cycles before the Heat
   Death arrives: *"a cascade is coming. I don't know how large. I am saving what I can."*

6. **Drag-and-drop that's unclear.** If the file viewer drag-and-drop mechanic isn't visually
   clear (what can be dragged, where it can be dropped), players won't discover it. Solution:
   debris files have a distinct visual marker (dashed border, grab icon), and valid drop targets
   glow when a file is being dragged.

---

## G. How this maps to Stage 8: Entropy Field (pointer)

Stage 8 borrows **Don't Starve's** multi-resource interdependency and cascade failure model,
**ONI's** closed-system node-flow network, **The Long Dark's** item condition degradation
(applied to nodes), **Frostpunk's** dual-axis management (States = physical resource, node
integrity = the social/operational equivalent), and **Frostpunk's** countdown-event pressure.

Our unique contribution: **drag-and-drop salvage as the file viewer integration** — debris
files in the sidebar represent salvageable States locked in failed nodes. Moving them to the
active archive restores them before they decay permanently. The mechanic is diegetically
perfect: in a game about entropy, the remedy is organization.

Full spec in `stage8-02-our-game-design.md`.
