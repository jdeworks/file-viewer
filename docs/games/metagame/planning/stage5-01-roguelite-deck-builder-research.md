# Stage 5 — 01: Roguelite Deck Builder Genre Research

Reference research for the **Protocol Codex** Stage 5 design. Developer-facing distillation
of the roguelite deck-builder genre: energy systems, card design principles, run structure,
relic/artifact systems, deck size management, and boss fight design. Companion doc
`stage5-02-our-game-design.md` maps this onto our Stage 5 implementation.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Slay the Spire** | 2017–2019, MegaCrit | **Created the genre template.** Energy-based hand management, branching map with combat/event/shop/boss nodes, card reward after each fight, relics as permanent run modifiers, end-of-act boss. Key principles: small decks are better (cycling matters), synergy over raw power, and the run's identity should be set by act 1. |
| **Monster Train** | 2020, Shiny Shoe | **Spatial layer + multi-clan synergy.** Units placed on train floors add spatial positioning to card effects. Two-clan synergy combinations exponentially expand viable strategies. Lesson: *a second strategic axis (positioning, unit placement) layered onto card play creates vastly more interesting decisions*. |
| **Inscryption** | 2021, Daniel Mullins | **Narrative within the run.** The meta-fiction (you're playing cards with a figure in a dark room) integrates with the mechanics — losing costs a "life" that is physically taken from you in the fiction. Lesson: *roguelite runs can have narrative texture without sacrificing mechanical integrity*. |
| **Balatro** | 2024, LocalThunk | **Radical simplification + multiplier cascade.** Uses a poker hand base but all rules can be modified. Jokers multiply each other's effects. Lesson: *a very small number of well-tuned rules can produce effectively infinite variance*. |
| **Hearthstone Mercenaries** | 2021, Blizzard | **Speed-vs-strategy tradeoff.** Fast cards vs. powerful but slow cards creates tempo vs. control axis. Also: **equipment slots** as persistent run items that modify specific mercenaries. |
| **Across the Obelisk** | 2021, Dreamsite | **Co-op deck building + character-specific decks.** Four characters each have dedicated card pools that must synergize. Forces cooperative deck construction. Lesson: when characters have distinct roles, multi-card combos feel earned rather than lucky. |

---

## B. Core mechanics taxonomy

### 1. Energy system

Energy is the fundamental constraint in deck-builder combat:

```
Energy: resets to max at start of each turn (Slay the Spire default: 3)
Cards cost 1–4 energy; expensive cards have bigger effects
Playing within energy budget is the core turn decision
Energy modifiers: relics/cards that grant extra energy, or cost reductions
```

**Our Stage 5:** starts at **2 energy** (tighter than StS; forces harder choices early).
Specific protocol card combos (SYN+ACK, PUSH+ACK) can generate bonus energy within the turn.

### 2. Deck construction loop

```
Start:   Base deck (10 cards: 5 SYN, 4 ACK, 1 RST)
Combat:  Draw 5 cards; play within energy budget; discard; draw until deck empty → shuffle discard
Reward:  After each combat, choose 1 of 3 cards to add to deck
Shop:    Spend gold to buy cards, remove cards (critical — removal is power), buy relics
```

**Key principle: Deck size control.** Adding every card weakens decks (more cards = less cycling
= more turns between drawing key cards). Removing cards is the most powerful action available.

```js
// Probability of drawing a specific card in your opening hand:
P = hand_size / deck_size
// Hand 5, Deck 10: P = 0.5 — every card is likely
// Hand 5, Deck 20: P = 0.25 — unreliable, combo pieces miss
// Target deck size: 12–18 cards for reliable combos
```

### 3. Card types and mechanics

**Standard types:**
- **Attack:** deals damage. Usually costs 1–2 energy.
- **Skill:** non-damage effect (block, draw, buff). Cheaper; enables combos.
- **Power:** permanent effect for the rest of combat. Expensive; game-changing.

**Our Protocol Cards** use these same types but rename and re-theme:
- **Signal Cards** (= Attack): SYN, PUSH, RETRANSMIT
- **Protocol Cards** (= Skill): ACK, WINDOW, CHECKSUM, TIMEOUT
- **Layer Cards** (= Power): TCP STACK, SESSION, CIPHER

### 4. Status effects (Keywords)

Standard keyword system. Effects apply per-turn or as one-shot:

| Status | Effect | Our theme equivalent |
|--------|--------|---------------------|
| Strength | +damage per attack | **Throughput** |
| Dexterity | +block per skill | **Latency** (−latency = better) |
| Vulnerable | take 50% more damage | **Exposed** |
| Weak | deal 25% less damage | **Packet Loss** |
| Poison | lose HP per turn | **Memory Leak** |
| Artifact | negate one debuff | **Firewall** |
| Thorns | deal damage when hit | **RST Echo** |
| Intangible | reduce all damage to 1 | **Null Routing** |

### 5. Map structure (branching path)

StS-style map: branching path from floor 1 to act boss. Node types:
- **?** (elite monster) — high risk, best rewards (relics, extra cards, bonus gold)
- **!** (standard monster) — normal combat, card reward
- **R** (rest site) — heal HP **or** upgrade one card (never both; always a sacrifice)
- **$** (shop) — buy cards, relics, potions; sell cards; remove cards
- **?** (event) — random narrative event with risk/reward choice
- **B** (boss) — end of act; guaranteed relic on win

**Our Stage 5 map:** 3 acts × 15 nodes each = 45 nodes per run. Acts map to:
- Act 1 — Local Network (standard encounters, easy enemies)
- Act 2 — Wide Area Network (elite encounters introduced; more complex enemy patterns)
- Act 3 — Unknown Protocol (boss act; enemies use player's own cards against them)

### 6. Relic system

Relics are permanent passive effects that modify the entire run:

**Design principles:**
- Each relic must change how you build the deck (not just a stat boost)
- Some relics are negative ("cursed") — compensate with strong effects
- Boss relics are the most impactful and always change the run's strategy

**Our relics map to protocol concepts:**
- *The Timestamp* — Exhausted cards deal bonus damage equal to current turn number
- *Parity Bit* — When hand size is odd, gain +1 energy
- *The Root Certificate* — First card played each combat is free
- *ACK Flood* — Playing 5+ ACK cards in one turn deals 20 direct damage
- *Corrupted Packet* (curse) — One random card in hand is discarded at turn start

### 7. Boss fight design in roguelites

Boss fights break from standard encounter patterns by:
1. **Telegraphing intentions:** boss shows its next action (like StS's intent system)
2. **Phase transitions:** boss changes behavior at HP thresholds
3. **Unique mechanics:** boss introduces a mechanic found nowhere else in the run
4. **Scaling threat:** boss has high total HP but often low per-turn damage, creating a DPS race

**Our Stage 5 boss:** The Refused Connection — three-phase boss that changes protocol mid-fight,
requiring the player to adapt which card types are effective. See our design doc §G.

### 8. Deck-builder run length considerations

For a 45–120 minute stage:
```
Act 1 encounters: 5–6 combats × 2–3 min each = 15–20 min
Act 2 encounters: 5–6 combats × 3–4 min each = 18–24 min  
Act 3 encounters: 4–5 combats × 3–5 min each = 15–25 min
Map navigation + shops + events: 10–15 min total
Total: 60–85 minutes (first-run average)

Post-death runs: 35–50 min (player knows card pool, builds faster)
"Perfect" run: 25–35 min (optimized deck, knows encounters)
```

Our target: 90–120 min for full completion (including multiple runs to beat the boss).
Stage 5 is intentionally the *longest* single-genre game in the Defragmenter series.

---

## C. Standard formulas

### Damage calculation
```js
// Standard attack damage
damage = card.baseDamage + player.throughput + bonusEffects;
if (enemy.exposed) damage = Math.floor(damage * 1.5);
if (player.packetLoss) damage = Math.floor(damage * 0.75);
finalDamage = Math.max(0, damage - enemy.armor); // armor reduces flat
```

### Block calculation
```js
block = card.baseBlock + player.latencyBonus;
// Block absorbs incoming damage that turn; resets to 0 at turn start (StS rule)
```

### Card cost reduction
```js
effectiveCost(card) = Math.max(0, card.baseCost + costModifiers);
// Cost modifiers: relics, status effects, and combo reductions (SYN+ACK combo: −1 to ACK)
```

### Gold and shop pricing
```js
// Gold per encounter
goldFromEncounter(encounter) = { standard: 10+rand(0,10), elite: 25+rand(0,15), boss: 100 }
// Shop prices (typical ranges)
cardPrice = rand(50, 150)   // card rarity × 30 + rand
relicPrice = rand(150, 300)
cardRemoval = 75 (first), +25 each subsequent removal
```

---

## D. Card design principles

### The "one thing" rule
Each card should do **one thing well**. Cards that do two things usually do both poorly and
create confusion about when to play them. Exceptions: Exhaust cards (one-time effect that
removes the card from the run is a second mechanic, but the tradeoff is clear).

### Exhaust mechanic
Some cards **Exhaust** (are removed from the run after playing). These can have effects too
powerful for a normal card because they won't cycle back. Exhaust cards solve specific problems:
burst damage, one-time setup, crisis response.

### Card synergy design
Design cards in **pairs or triplets** where one card enables another:
- **Enabler:** creates a condition (marks, buffs, status)
- **Payoff:** has bonus effect if condition exists
Example: SYN (enabler: "next ACK gets +10 block") + ACK (payoff: "gain 10 block; if SYN was
played this turn, +10 additional block")

### Upgrade system
Each card has an upgraded version. Upgrades follow predictable patterns:
- Attack: +damage (+2 to +5)
- Skill: +block or reduced cost
- Power: reduced cost or added secondary effect
Cards are upgraded at rest sites (sacrifice healing for upgrade). The player always chooses
one card to upgrade — never all.

---

## E. UX patterns for deck-builders

- **End-of-turn button**: prominent; accidentally pressing it wastes turns. Center screen, large.
- **Intent display**: enemy's next action shown with icon (sword=attack, shield=defend, etc.)
- **Card queue order**: cards "float" to show play order when held; right-click to inspect
- **Mana crystal display**: visual pips representing current/max energy; depletes as cards are played
- **Discard pile / draw pile counters**: always visible (key information for cycling decks)
- **Card preview on hover**: full card text displayed on mouse-over; essential for long card text

---

## F. Design pitfalls to avoid

1. **Dead draws.** Some cards are useless in specific situations (block when enemy isn't attacking;
   attack vs. enemy that's already dead). Limit situational cards; prefer flexible cards.
2. **Infinite scaling.** Some relic combos create run-away power (StS infinite loops). 
   Our solution: "Exhaust after 3 uses" clauses on the most powerful relics.
3. **Act 1 strategy lock-in.** If act 1 card rewards are bad, the run is unwinnable regardless
   of later choices. Solution: ensure every act-1 reward pool includes at least one card
   that fits multiple archetypes.
4. **Boss unpredictability.** If the boss's damage spikes are random, preparation is impossible.
   Solution: telegraph every boss action one turn in advance (intent system).
5. **Too many cards.** Adding cards faster than the player can evaluate them creates decision
   fatigue. Solution: 3-card draft reward; display each card with clear role tag (Signal/Protocol/Layer).
6. **No incentive to skip cards.** If players add every offered card, decks become bloated.
   Solution: skip cards reward 25 gold (not implemented in all games; we add this).

---

## G. How this maps to Stage 5: Protocol Codex (pointer)

Stage 5 takes **Slay the Spire's** run structure and energy system, **Inscryption's** narrative
integration (the cards ARE the entity's protocol language), and **Balatro's** multiplier cascade
philosophy (protocol card combos cascade into large effects). Our unique addition is protocol-named
card mechanics that reflect the stage's communication theme, with the changing finale handshake
explained directly in combat. Full spec in `stage5-02-our-game-design.md`.
