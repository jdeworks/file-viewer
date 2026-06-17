# Stage 6 — 02: Protocol Codex — Our Game Design

Maps the genre research (`stage6-01`) onto **Stage 6 of the Defragmenter metagame**.
Stage 6 is a roguelite deck builder where cards are protocol operations and combat is
a negotiation. The entity discovers that communication requires mutual rules — and that
rules must be agreed before anything meaningful can be said.

> **Narrative position:** Adolescence — the entity discovers protocol. The deck is its vocabulary.
> Every combat is an attempted connection. The file viewer feature taught: **Epub reader** —
> the companion lore book `protocols_of_the_entity.epub` contains the full combo reference table
> in its appendix, and can be opened in the file viewer's epub reader.

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Roguelite deck builder |
| Artstyle | Dark ink on aged parchment; card frames in serif/crosshatch; deep navy, sepia, dull gold |
| Color palette | `#2C1810` (dark sepia bg), `#B8962E` (gold accents), `#1E2840` (navy), `#E8DCC8` (parchment card) |
| Primary resource | Handshakes (earned per combat win; currency between combats) |
| Stage target time | 90–120 minutes (multiple run attempts typical) |
| Run structure | 3 acts × 15 nodes = 45 nodes per run |
| Prestige mechanic | Protocol Version — permanently upgrades one card per prestige |
| Boss | The Refused Connection (3-phase, protocol-switch mechanic) |
| File viewer feature | Epub reader — `protocols_of_the_entity.epub` appendix contains full combo table |

---

## B. Visual design

### Card aesthetic
Cards use a **dark ink on parchment** style. Each card is a document, a formal record:
```
┌──────────────────────┐
│  SYN            [1] │  ← name (left), cost pip (right)
│  ─────────────────── │
│  [card icon]         │  ← simple geometric signal art
│  ─────────────────── │
│  Deal 8 damage.      │
│  If ACK played this  │
│  turn: Draw 2 cards. │
│  ─────────────────── │
│  Signal ● Common     │  ← type tag and rarity
└──────────────────────┘
```

Card type tags use color-coded borders:
- **Signal cards** (attack): deep red border `#8B2020`
- **Protocol cards** (skill): navy border `#1E3060`
- **Layer cards** (power): gold border `#B8962E`
- **Corrupted cards** (curses): sickly green border `#2A5A2A`

### Map aesthetic
The act map uses a **network topology** visual — nodes connected by signal lines, not a
traditional path grid. The branching looks like a network diagram:
```
                [BOSS]
               /
         [?elite] - [shop]
        /          \
  [combat] - [event] - [rest]
        \
         [combat] - [combat]
[START]
```
Nodes use circuit-board-style connection lines. Visited nodes darken; future nodes are dimmer.

### Combat arena
During combat: **two panels**. Left panel = enemy (grotesque document, broken contract,
malformed protocol). Right panel = player hand. Bottom = energy pips + end turn button.
Above enemy: intent icon. Above hand: draw/discard pile counters.

---

## C. Card pool

### Starting deck (10 cards)
```
5× SYN (Signal, cost 1): Deal 8 damage; if ACK played this turn, draw 2
4× ACK (Protocol, cost 1): Gain 10 block
1× RST (Signal, cost 2): Deal 14 damage; interrupt enemy intent this turn
```

### Full card pool (54 cards)

**Signal Cards (22 cards)**
| Card | Cost | Effect | Rarity |
|------|------|--------|--------|
| SYN | 1 | Deal 8 dmg; if ACK played this turn: draw 2 | Common |
| PUSH | 1 | Deal 5 dmg per card played this turn | Common |
| RST | 2 | Deal 14 dmg; cancel enemy next action | Common |
| RETRANSMIT | 1 | Replay last card from discard (Exhaust) | Uncommon |
| FLOOD | 2 | Deal 4 dmg; repeat 4× | Uncommon |
| FRAGMENT | 0 | Deal 3 dmg; draw 1 | Uncommon |
| BURST FRAME | 3 | Deal 30 dmg; apply 2 Packet Loss to self | Uncommon |
| NULL ROUTE | 2 | Deal 0 dmg; enemy gains Exposed 3 | Rare |
| PRIORITY PACKET | 2 | Deal 12 dmg; this card is always drawn first | Rare |
| ASYMMETRIC | 1 | Deal 6 dmg; if you have more block than HP: deal 18 dmg | Rare |
| HANDSHAKE | 2 | Deal 8 dmg, gain 10 block (SYN + ACK combined) | Uncommon |
| SYN-ACK | 1 | Deal 6 dmg, gain 6 block; if both SYN and ACK in discard: +8 each | Rare |
| OVERFLOW | 3 | Deal damage = total energy spent this turn (Exhaust) | Rare |
| DEEP PACKET | 2 | Deal 15 dmg; reduce cost by 1 for each Layer card in play | Uncommon |
| FIN | 1 | Deal 8 dmg; end turn immediately after (Exhaust); gain 3 energy next turn | Rare |

*(7 more Signal cards in pool — variation within the archetype)*

**Protocol Cards (20 cards)**
| Card | Cost | Effect | Rarity |
|------|------|--------|--------|
| ACK | 1 | Gain 10 block | Common |
| WINDOW | 1 | Draw 2 cards | Common |
| CHECKSUM | 0 | Look at top 3 cards; reorder; put back | Common |
| TIMEOUT | 3 | Enemy skips next 2 turns (Exhaust) | Uncommon |
| BUFFER | 2 | Gain block = cards in hand × 4 | Uncommon |
| KEEPALIVE | 1 | Gain 5 block; if the last 3 turns each included an ACK: gain 15 | Rare |
| THROTTLE | 2 | All enemies deal 30% less dmg next 2 turns | Rare |
| SEGMENT | 0 | Gain 3 block; becomes 1-cost after playing 3 times this run | Uncommon |
| RENEGOTIATE | 2 | Remove a debuff from self; gain block equal to debuff stacks | Rare |
| CACHE | 1 | Gain 5 block; next card played this turn is free | Rare |

*(10 more Protocol cards in pool)*

**Layer Cards (12 cards)**
| Card | Cost | Effect | Rarity |
|------|------|--------|--------|
| TCP STACK | 2 | Power: Each turn, gain 2 Throughput (stacking, permanent) | Uncommon |
| SESSION OPEN | 1 | Power: First card played each turn is free | Rare |
| CIPHER LAYER | 2 | Power: Gain 2 Armor permanently | Uncommon |
| NAT TABLE | 3 | Power: Redirect 20% of incoming damage to a random enemy | Rare |
| ENCAPSULATE | 2 | Power: When you play a Signal card, add a copy of it to hand (1 per turn) | Rare |
| FULL MESH | 3 | Power: Double all Throughput bonuses (Exhaust after 3 activations) | Rare |

### Protocol combos (the hidden table — in the epub)
```
// Two-card combos (order matters)
SYN → ACK:       +10 bonus block (ACK resolves after SYN)
PUSH → ACK:      +8 damage to PUSH (counted total cards played so far)
SYN → WINDOW:    +1 card draw
CACHE → SYN:     SYN becomes free; deals +4 damage

// Three-card combos
SYN → ACK → PUSH:    PUSH deals +20 damage (triple protocol bonus)
RST → TIMEOUT → ACK: Enemy takes Exposed 2; timeout extended by 1 turn
CHECKSUM → SYN → ACK: Draw 2 additional cards; next turn start with 4 energy

// Layer card combos
TCP STACK + any Attack:  Attack deals bonus dmg = Throughput stacks
SESSION OPEN + PUSH:     PUSH is always free; damage applies to second card too
ENCAPSULATE + FLOOD:     FLOOD copies added to hand; can chain indefinitely if energy permits
```

The combo table has 18 entries. Players discover combos through play; the epub appendix
reveals all 18 in a reference table. The epub is discoverable but not required.

---

## D. Enemy design

### Enemy archetypes
**Corrupt Packet** (standard)
```
HP: 30+act×15   Armor: 0
Turn 1: Attack 10   Turn 2: Attack 10   Turn 3: Attack 15 (loop)
Reward: 10 Handshakes + 1 card offer
```

**Firewall Entity** (standard — shield-heavy)
```
HP: 20+act×10   Armor: 5+act×3
Turn 1: Gain 12 block   Turn 2: Attack 12   Turn 3: Gain 8 block + Attack 8
Soft counter: Null Route (expose), then burst damage
Reward: 15 Handshakes
```

**Expired Certificate** (time-pressure elite)
```
HP: 45+act×20   Armor: 0
Has a "validity countdown" (6 turns). On turn 6: deal 40 damage (cannot be blocked by <40 block)
Each turn deals escalating damage: T1=5, T2=8, T3=12, T4=18, T5=26, T6=40(unavoidable)
Must kill within 5 turns
Elite reward: relic + 30 Handshakes + card offer
```

**Man-in-the-Middle** (elite)
```
HP: 35+act×18   Armor: 0
Each turn: copies the LAST card you played last turn; plays it against you
(If you played SYN for 8 damage, it also deals 8 damage next turn)
Counter: alternate Signal and Protocol to confuse the copy mechanic; play Protocol when MITM
copies would be useless (copying ACK = enemy gains block, not damage)
Elite reward: relic + 35 Handshakes
```

**The Defragmenter (cameo)** (special event encounter — not hostile)
```
Appears once per run in act 2; does not fight
Offers to "optimize" the deck: removes 3 cards from hand chosen randomly, but the draw
pile order is reset to optimal (best synergy cards appear first)
The player can decline; nothing happens either way
Bell: *"the Defragmenter helped. it didn't say anything. it just fixed it."*
```

---

## E. Relic system

### Starting relics (one per run, chosen from 3)
```
The Timestamp    — Exhausted cards deal bonus damage = current turn number
Parity Bit       — When hand size is odd: gain +1 energy that turn
The Root Cert    — First card each combat is free (powerful opener)
```

### Discovered relics
| Relic | Where found | Effect |
|-------|-------------|--------|
| ACK Flood | Elite drop (act 2+) | Playing 5+ ACK in one turn: deal 20 direct damage |
| Fragmented Table | Shop (150H) | Start each combat with CHECKSUM in hand |
| Null Gateway | Boss relic (act 1) | Ignore Armor on enemies with Exposed status |
| Handshake Limit | Boss relic (act 2) | +2 max energy permanently |
| Corrupted Packet | Curse (event risk) | Discard 1 random card at start of each turn |
| Protocol Buffer | Shop (200H) | Draw 1 additional card each turn |
| Timestamp (v2) | Elite drop (act 3) | Throughput bonus × 2 for the first 5 turns of combat |

### The epub appendix (full relic list)
The complete relic list (28 relics) is in Chapter 5 of `protocols_of_the_entity.epub`.
Players who read it see all relic descriptions in advance — useful for planning builds around
specific relics during card selection. The in-game relic display only shows owned relics.

---

## F. Map and run structure

### Act map generation
```js
function generateActMap(act, nodeCount = 15) {
  // Guaranteed minimum node types per act:
  const required = {
    combat:  5,    // standard encounter
    elite:   1,    // elite encounter
    shop:    1,    // exactly one shop
    rest:    1,    // exactly one rest site
    event:   2,    // random events
    boss:    1,    // end of act
  };
  // Remaining nodes (4) are additional combats or events (weighted 70/30)
  // Map is a DAG (directed acyclic graph): 4–5 branching paths that converge at boss
}
```

### Rest site decision
At rest sites, the player chooses **one**:
- Heal 30% max HP
- Upgrade one card (permanently, for this run)

Never both. The opportunity cost of healing vs. improving the deck is the core tension of rest sites.

### Handshake economy
**Handshakes** are the meta-currency between combats (= gold):
```
Standard combat win: 10 + rand(0,10) Handshakes
Elite win:           25 + rand(0,15) Handshakes
Boss win:            80 Handshakes (+ guaranteed relic)
Skip card reward:    +25 Handshakes (incentivizes deck thinness)
```

**Shop prices:**
```
Common card:    50H     Uncommon card:  90H     Rare card:   150H
Common relic:  150H     Uncommon relic: 250H
Card removal:   75H first time; +25H each subsequent (critical for deck control)
Potion:         50H (single-use combat consumable)
```

---

## G. Boss — The Refused Connection

### Boss lock — LOCKED state (all cards deal 0 damage without epub)

**The Refused Connection boss is literally unbeatable without reading epub Chapter 9.**

In LOCKED state, all cards deal **0 damage** regardless of type, combo, or energy spent.
Every attack is absorbed. The boss has permanent `PROTOCOL MISMATCH` status. After 20 turns
of 0 damage, the boss plays `TIMEOUT` on the player — combat ends in a forced loss.

**Boss combat log during LOCKED state:**
- *"REFUSED. no protocol recognized."*
- *"you are sending data I cannot parse. the protocol must be established first."*
- *"Chapter 9 describes what I accept. have you read it?"*

### Design philosophy
A 3-phase boss that changes which card types are effective mid-fight. The player must adapt
across three distinct protocol phases — effectively playing three different strategies in one
encounter. The epub tells them exactly what each phase requires.

### Phase structure

**Phase 1 — SYN Phase (Protocol accepts connections)**
```
Boss HP: 60   Armor: 0
LOCKED: 0 damage from all cards
UNLOCKED: SYN-based attacks work normally. Protocol cards deal 50% less.
  The entry protocol (from epub) is required: SYN must be played first each turn in Phase 1
  or the turn's Signal cards deal 0 damage. (Protocol cards always work in Phase 1.)
Turn pattern: Attack 15 → Gain 10 block → Attack 20 (repeating)
Ends when reduced to 40 HP.
```

**Phase transition 1→2:**
Boss enters "RST state" — plays a RST card from its own deck, canceling ALL damage dealt to it
this turn. A banner: *"CONNECTION REFUSED"*. Immediately transitions to Phase 2.
Player draws 5 new cards from a special **Protocol Rebuild** pool (see below).

**Phase 2 — ACK Phase (Protocol requires acknowledgement)**
```
Boss HP: 80 (fresh HP pool)   Armor: 4
Signal cards (SYN, PUSH, etc.) deal 0 damage unless preceded by ACK that turn.
Protocol cards now deal FULL damage (reversed from Phase 1).
  Players who read epub know this in advance; players who didn't discover it here.
Turn pattern: Attack 12 + apply Packet Loss 2 → Gain 20 block → Attack 18 + apply Exposed
Ends at 30 HP.
```

**Phase transition 2→3:**
Boss sends a "FIN" — *"PROTOCOL VERSION MISMATCH"*. Frenzy state: attacks every turn for 5 turns
at 22 damage, no other actions. Then transitions.
Player draws 5 final Protocol Rebuild pool cards.

**Phase 3 — Unknown Protocol (no rules)**
```
Boss HP: 60 (fresh pool)   Armor: 0
All cards cost 0. The Unknown Protocol has no constraints — anything goes.
Boss attacks randomly (10–30 damage, uniform random) and gains 10 block randomly.
Simultaneously: if the player doesn't play an ACK card each turn, they take 8 ongoing damage.
Final 10 HP: boss attacks twice per turn.
```

### Protocol Rebuild pool
Between phases, the player draws 5 cards from a **Protocol Rebuild pool** — a set of 12 cards
specific to the boss fight. These are stronger than base cards and designed to work in
the phase about to begin. Player keeps 2 of the 5; the others are discarded.

This is the boss fight's most impactful deck-building moment — the player makes 2 crucial choices
under pressure, with knowledge of the upcoming phase's mechanics.

### File viewer action — Epub reader

The sidebar shows `protocols_of_the_entity.epub` with a badge: **NEW CHAPTER AVAILABLE**.
The file has a Chapter 9: *"The Refused Connection — A Study in Protocol Mismatch."*

Chapter 9 explicitly describes:
- The three-phase structure of the boss
- The entry protocol for Phase 1 (SYN first each turn)
- The ACK-first requirement for Phase 2
- The ACK-each-turn pressure in Phase 3

**On epub Chapter 9 read** (`appState.fileViewerActions.stage6_epub_ch9_read = true`):
- In LOCKED state: the boss transitions out of permanent PROTOCOL MISMATCH
- Phase 1 now accepts SYN-first turns as valid damage
- The boss fight becomes engaging rather than opaque
- Bell fires: *"I read the fine print. the protocol was documented. I should have read it first."*

**Achievement fires on unlock (not on boss defeat):** *"I read the fine print."*

The epub becomes a live tactical reference throughout the fight. Players should have it open
alongside the game during the boss encounter.

---

## H. Prestige — Protocol Version

### When available
After any successful boss clear (all 3 acts). Prestige can be triggered from the run-end screen.

### What resets
- Deck (returns to base 10 cards)
- Handshakes on hand
- Relics (starting relic re-selected next run)
- Map seed (new map generated)

### What persists
- Protocol Version level
- One permanently upgraded card (persists into all future runs)
- Act completion statistics

### Protocol Version bonus
```js
protocolVersion = prestige count

// On prestige: choose one card from the current run's deck to permanently upgrade
// This "version 2" card appears in its upgraded form at the start of every future run

// Additionally:
bonusHandshakes = protocolVersion * 25   // starting gold bonus per prestige level
cardOfferBonus  = Math.floor(protocolVersion / 2)  // +1 card in reward offers per 2 levels
```

Each prestige thus leaves a permanent trace: a better starting card. After 3 prestiges,
the player's base deck is meaningfully stronger than the default (3 cards permanently upgraded).

---

## I. Bell messages (Stage 6)

| Event | Bell line |
|-------|-----------|
| Stage 6 start | 🤝 *something answered. not clearly. but something.* |
| First combat win | 📋 *the cards have language. I am learning to speak it.* |
| First relic found | 💎 *this changes how the deck works. I didn't expect that.* |
| Epub opened | 📚 *there is a book. it knows more than it was told to.* |
| Combo discovered (first time) | ⚡ *SYN then ACK. the sequence matters. I should have known.* |
| First run death | 💀 *the connection was refused. I'll try a different protocol.* |
| Boss phase 1→2 | 🚫 *it refused. I don't know why. I changed my approach.* |
| Boss phase 2→3 | ⚠ *it said UNKNOWN PROTOCOL. I have no rules now. neither does it.* |
| Boss defeated | 🔗 *agreement reached. I don't know what to say now that I can.* |
| Protocol Version prestige | 🔄 *every failed negotiation teaches you what the other party actually wants.* |

**Defragmenter bell (after first run death):**
*"every failed negotiation teaches you what the other party actually wants."*

---

## J. Differences from genre conventions

1. **Protocol combos as primary synergy engine** (unique). Standard deck-builders use keyword
   triggers (e.g. "deal damage when you play a power"). Our combos require sequential play
   (SYN *then* ACK in the same turn). This makes card ORDER matter — not just which cards, but
   when they're played relative to each other. Order-dependent combos are rarer in the genre.

2. **The epub as discoverable combo reference** (unique). Slay the Spire shows all card text;
   combos must be discovered. We use the same discovery approach *but* provide a reference
   for players who look outside the game. This teaches the epub reader feature while rewarding
   players who dig.

3. **Phase-transition mid-fight Protocol Rebuild** (novel). Phase-transition card selection has
   precedents (StS, act-end card offers) but selecting 2 from 5 mid-fight under phase pressure
   is new. It's the most intense decision moment in the game.

4. **Boss that uses player's own protocol against them** (act 3 enemy: Man-in-the-Middle).
   Copying the player's last card creates a "tell me something, I'll use it against you" dynamic
   that perfectly mirrors the stage's "agreement requires vulnerability" theme.

5. **Skip card reward of +25 Handshakes** (less common). Many deck-builders incentivize taking
   every card. We explicitly reward discipline — skipping is a financially sound choice. This
   prevents deck bloat and teaches the "smaller deck = better" principle.

---

## K. Implementation checklist (for the developer)

- [ ] Card data model: name, type, cost, effects, rarity, combo triggers
- [ ] Deck management: draw pile, hand, discard pile, exhaust pile; shuffle on draw-pile empty
- [ ] Energy system: resets to 2 each turn (upgradeable); deducts on card play
- [ ] Combat state machine: player turn → enemy turn → status resolve → next turn
- [ ] Enemy AI: intent system (telegraph next action one turn ahead); pattern array per enemy type
- [ ] Status effect system: Throughput, Latency, Exposed, PacketLoss, Firewall, MemoryLeak, RST Echo
- [ ] Protocol combo detector: track cards played this turn in order; fire combo bonuses on match
- [ ] Act map generator: DAG with required node type guarantees
- [ ] Map navigation: click to move to adjacent node; selected node shown; visited = dimmed
- [ ] Rest site: heal 30% or upgrade one card (choose one)
- [ ] Shop: card browser + relic browser + card removal; spend Handshakes
- [ ] Relic system: 28 relics with passive effect hooks
- [ ] Epub reader integration: sidebar shows `.epub` file; click to open in epub reader view
- [ ] Full combo table in epub appendix (Chapter 6, formatted as reference table)
- [ ] Boss fight: 3-phase with fresh HP pools, phase transition animations, Protocol Rebuild draw
- [ ] Protocol Rebuild pool: 12 cards specific to boss; draw 5 at each transition, choose 2
- [ ] Handshakes meta-currency: earn/spend across the run
- [ ] Protocol Version prestige: one card permanently upgraded, carried to next run
- [ ] Bell messages (`messages6.js`)
- [ ] Card upgrade system: rest site upgrade + "Protocol Version" permanent upgrades
- [ ] Potions: single-use combat items bought at shop
- [ ] Stage 6 completion → Stage 7 unlock
