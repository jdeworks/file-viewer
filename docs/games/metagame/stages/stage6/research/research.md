# Stage 6 — Protocol Codex: expansion + design research

Researcher doc for the Stage 6 build-out. Supersedes the older `BUILD_PLAN.md` /
`planning/stage6-0{1,2}-*.md` where they conflict. The engine audit verdict is **PARTIAL**:
genuinely good deterministic combat engine + seeded branching map + 20 cards + 8 enemies +
5 relics, but the run is skippable from the hub, the boss is a 3-button puzzle that ignores
your deck, energy is frozen at 3, relics are vanilla, the economy is a stub, and map
composition is random rather than authored. **KEEP THE ENGINE.** This doc defines what to
*add on top of it*, and — most importantly — the **ordered per-act expansion arc** where
"deeper" always means "a new thing to think about," never bigger numbers.

The single highest-priority deliverable is **§3, the expansion arc**.

---

## 1. GENRE — roguelite deck-builder: what it is, the best of it, and why it's replayable

**Definition.** A roguelite deck-builder fuses (a) the *deck-building* loop — you start with a
weak fixed deck and accrete/prune cards mid-run to sculpt an engine — with (b) *roguelite* run
structure — a seeded branching map of combat/elite/rest/shop/event nodes ending in act bosses,
permadeath per run, and a meta-progression that persists across runs. Combat is turn-based:
**energy** (resets each turn) is the core constraint, **block** soaks one turn of damage,
enemies **telegraph intent** one step ahead so every turn is a solvable puzzle, and **status
keywords** (Vulnerable, Weak, Strength, Poison…) compose. ([Wikipedia: Roguelike deck-building game](https://en.wikipedia.org/wiki/Roguelike_deck-building_game))

**The defining titles and the concrete thing each does that makes it fun/replayable:**

- **Slay the Spire** (2017, MegaCrit) — the template. Replayability comes from the *interaction
  of three independent random streams*: the procedural branch map, the 1-of-3 card reward draft
  after each fight, and the relics you stumble into. The deepest lesson is **don't pre-pick a
  deck — react to what you're offered**; small synergistic decks beat big piles because a thin
  deck *cycles* to its combo pieces. Relics are synergy *enablers*, not stat sticks (e.g.
  Shuriken/Kunai reward playing many attacks in one turn → they make a Shiv build explode).
  ([Eneba: STS tips](https://www.eneba.com/hub/games/game-guides/slay-the-spire-tips/), [Eneba review](https://www.eneba.com/hub/games/slay-the-spire-review/), [twanvl/sts-synergy-relic](https://github.com/twanvl/sts-synergy-relic))
- **Monster Train** (2020, Shiny Shoe) — adds a **second strategic axis**: a 3-floor vertical
  tower-defense board, so card play also becomes *spatial placement*, and you always combine
  **two clans**, so the combinatorial space of synergies is enormous and you "rarely chase the
  exact same synergy twice, even setting out with the same clans." Lesson: a second axis layered
  on card play multiplies viable strategies far more than more cards would.
  ([GamesRadar MT2 review](https://www.gamesradar.com/games/roguelike/monster-train-2-review/), [Game Pass Pod: clan synergies](https://www.gamepasspod.com/blog/monster-train-2-a-deep-dive-into-new-clan-synergies/))
- **Inscryption** (2021, Daniel Mullins) — the gold standard for **mechanics that constantly
  reinvent themselves**: three acts each with a *different art style, different core resource,
  and different rules* (Act I = blood-sacrifice roguelike; Act II = Mox/Energy TCG; Act III =
  P03's strategy-focused campaign). The escalation works "through constant surprise and
  reinvention rather than repetition," and the meta-fiction is load-bearing (losing physically
  costs you in the story). This is the direct precedent for our per-act-new-verb arc.
  ([ScreenRant: each act](https://screenrant.com/inscryption-whats-happening-in-each-act-full-story-explained/), [Inscryption Wiki: Act II](https://inscryption.fandom.com/wiki/Act_II))
- **Balatro** (2024, LocalThunk) — **radical simplification + multiplier cascade**: a tiny rule
  set (poker hands) plus Jokers that multiply *each other's* effects yields effectively infinite
  variance from very few rules. Lesson: a small number of well-tuned, *interacting* modifiers
  beats a large catalog of independent ones.
- **Across the Obelisk** (2021) / **Roguebook** (2021) — **character-specific card pools** and the
  design discipline of **introducing components step by step** to build long-term motivation and
  lower the entry barrier; depth via **lenticular design** (cards that look simple but reveal
  subtlety the more you play). ([Roguebook design](https://www.gamedeveloper.com/design/tackling-deckbuilding-design-in-abrakam-s-roguebook), [Rogueliker list](https://rogueliker.com/roguelike-deckbuilders/))

**Two cross-cutting design lessons we will lean on:**

- **Lenticular design** (Mark Rosewater's term): a card "appears on its surface to be very
  simple, but once you understand more about how to use it, it becomes more complex." Cap surface
  complexity so beginners feel competent; hide depth in interactions. We give every card an
  obvious surface use *and* a sequence/timing payoff. ([MTG: Lenticular Design](https://magic.wizards.com/en/news/making-magic/lenticular-design-2014-03-31), [First Person Scholar](https://www.firstpersonscholar.com/the-game-design-holy-grail/))
- **Ascension-style escalation** sustains the long tail: 20 stacking modifiers, each adding a
  *rule change* (not a number), each worth +5% score, "a grueling mathematical puzzle that
  actively cheats to beat you" — and the satisfaction is in *adapting your strategy to each new
  rule*. Our prestige "Protocol Version" is the same idea. ([STS Wiki: Ascension](https://slay-the-spire.fandom.com/wiki/Ascension), [Kwan's Qualms](https://www.kwansqualms.com/qualms/2025/2/19/sts))

---

## 2. OUR CORE LOOP — Protocol Codex, moment to moment

The engine is built and good; this is the loop it already runs, with the gaps the build closes.

**Moment-to-moment (one combat):** draw 5, you have energy (currently a flat 3), each enemy
telegraphs its next intent. You spend energy playing **Signal** (attack), **Protocol** (skill/
block), and **Layer** (power) cards from a deck themed as a network conversation. The signature
hook is **sequence-sensitivity**: cards care about *what you already played this turn* — `SYN`
draws 2 *if* `ACK` was played first; `KEEPALIVE` gains extra block *if* `ACK` preceded it;
`PUSH` scales with cards played; `ASYMMETRIC` pays off if block > HP. Block resets each turn,
Vulnerable/Weak tick down, Strength persists. Win → 1-of-3 card draft (+ handshakes currency,
+ relic at elites). ([engine: `combat.js`, `cards.js`])

**The run:** a seeded **4-act branching map** (Slay-the-Spire DAG, ~15 nodes/act:
combat/elite/rest/shop/event/boss). You navigate, draft, prune at rest sites, spend
**handshakes** at shops, and fight an **act mini-boss** at the end of acts 1–3 (Kernel Panic /
Buffer Overflow / Deadlock, fixed HP). Act 4 ends at **The Refused Connection** — the
codex-gated finale.

**Why it's fun (and what the build must protect):** deterministic-from-seed combat means the
puzzle is *fair* (no Date.now/Math.random in the live path — this is a hard house rule and a
genuine asset, see §5); ASCII/text + a little colour keeps it readable and on-house-style;
elites are already genuinely lethal (Expired Certificate's unblockable expiry, Man-in-the-Middle's
mirror) so risk-reward is real.

**The un-cheat boss — preserve exactly.** The Refused Connection is *not* a normal fight you can
out-stat. The boss speaks a protocol you don't know until you **read chapter 9 of
`protocols_of_the_entity.epub` in the real file-viewer epub reader** (host-app feature →
`6.protocol_ch9_read` action + achievement). That read is **load-bearing and not bypassable**:
without it the connection stays `PROTOCOL MISMATCH` and your signals deal 0. This is the
metagame's signature — every stage is a self-contained game whose *boss alone* reaches into a
real host-app feature. The build's job is to keep that gate **and** make the fight use your real
deck (§3, Act 4), not 3 hard-coded buttons.

---

## 3. THE EXPANSION ARC — one NEW verb per act (the most important deliverable)

**The model (Stage 2 "Glyph Dungeon").** Each biome band added a *new verb* the player had to
learn — avoid terrain → break line-of-sight → manage spreading fire → manage darkness — so
descending always meant "a new thing to think about," never inflation. Stage 6 does the same,
and the theme hands us a perfect ladder: **climb the network stack.** Each act is one layer of
the protocol stack and adds one networking verb. Numbers grow a little; the *decision* changes
every act. The four acts map cleanly to the existing `FINAL_BOSS_ACT = 4`.

> Design rule for every act below: the new verb must be **expressible in the existing engine's
> ctx/intent API** (or a *small* additive primitive), must show up in **cards, enemy intents, AND
> a relic**, and must make at least one earlier-good card a *wrong* choice in the new context.

### Act 1 — LINK LAYER · "Handshake" → VERB: **SEQUENCE** (order within a turn)
The foundational verb, already half-present: cards resolve differently based on *what you played
earlier this turn*. Teach it explicitly and build the act around it.
- **New decisions:** play order is a puzzle. `SYN`-then-`ACK` vs `ACK`-then-`SYN` are different
  turns. The "obvious" greedy order is often wrong (lenticular).
- **Cards:** the SYN/ACK/KEEPALIVE/PUSH family (exists) + new "first-card / last-card" cards
  (e.g. *Root Certificate*-style "the first card each turn costs 0", a closer that pays off if
  it's the last card).
- **Enemy:** Firewall Entity already alternates block/attack — telegraph it so the player learns
  to sequence damage *into* the attack turn.
- **Relic:** *Protocol Primer* (exists) — rewards playing Protocol cards; reframe as a sequence
  enabler.
- **Mini-boss:** Kernel Panic (exists).

### Act 2 — TRANSPORT LAYER · "Latency / Windows" → VERB: **DELAY** (deferred resolution)
The genuinely new verb: cards can be **queued in-flight** and resolve on a *future* turn. You
trade tempo now for a guaranteed payoff later, and you must plan two turns ahead.
- **New primitive (small, additive):** a per-combat `pending` queue — `ctx.queue(turnsAhead, fn)`
  resolved at player-turn-start. Deterministic; no RNG.
- **New decisions:** set up a big delayed packet, then *protect the window* (block) until it
  lands. Enemies now telegraph **2 turns ahead**, so you race their windups with yours.
- **Cards:** *Windowed Send* ("deal 20 next turn"), *Retransmit* ("if a queued packet was lost to
  your death-door, re-send"), *Nagle* ("hold: combine all delayed packets into one hit").
- **Enemy:** a "round-trip-time" enemy whose big hit is queued 2 turns out and *grows* each turn
  you don't interrupt it — the player learns to spend a card on interrupt vs. out-race it.
- **Relic:** *Persistent Socket* (exists, +block each turn) becomes the "hold the window open"
  relic; add one that makes the *first* delayed packet each combat resolve a turn sooner.

### Act 3 — NETWORK LAYER · "Congestion" → VERB: **THROUGHPUT** (dynamic energy / pacing)
This is where we **un-freeze energy** (the audit's explicit gap) and turn it into the verb.
Energy becomes a **congestion window**: it is no longer a flat 3.
- **New rule (TCP slow-start / congestion-collapse, deterministic):** play a *wide* turn (spend
  all energy, dump many cards) and next turn's energy **drops** (congestion); play a restrained
  turn and it **grows** back toward a cap (slow-start). Optionally, oversize turns inflict
  **Packet Loss** — a card in hand is "jammed" (unplayable) next turn until cleared.
- **New decisions:** the whole act re-teaches tempo — you can't just empty your hand every turn;
  you pace throughput. Block-control decks love this; SYN-flood aggro must adapt.
- **Cards:** *Bandwidth* ("raise your energy cap by 1 for the rest of combat"), *Backoff* ("skip
  a play to refund 2 energy next turn"), *Defrag* ("clear all jammed cards, draw 1").
- **Enemy:** Packet Storm (exists) + a congestion enemy that *punishes wide turns* (a Mirror
  variant — Deadlock/Man-in-the-Middle already mirror cards-played; lean into it as the act's
  signature threat).
- **Relic:** an *Overclock Chip* successor that raises the energy cap but worsens congestion
  decay — a real build-defining tradeoff (cursed-relic design from §1).
- **Mini-boss:** Deadlock (exists, already a mirror boss — perfect fit).

### Act 4 — SESSION LAYER · "The Refused Connection" → VERB: **NEGOTIATE** (mutating protocol, real deck)
The finale and the un-cheat. The new verb is **satisfying a handshake constraint that mutates
each phase** — and you fight it **with your real built deck** (closing the audit's biggest gap:
the boss must stop ignoring your deck).
- **How the real deck plugs in (un-cheat preserved, deepened):** you play your *actual* Signal/
  Protocol/Layer cards, but the boss imposes a per-phase **protocol state** that decides which of
  your signals are *accepted* (deal damage) vs *refused* (deal 0). Phase 1 demands `SYN` *first*;
  Phase 2 demands an `ACK` *precede* any signal; Phase 3 demands an `ACK` *every* turn or you take
  ongoing damage. This is exactly the existing `boss.js` handshake logic — but now driven by
  whatever cards your deck actually contains, so deck-building *matters at the boss*: you need
  Protocol cards in your deck to satisfy the handshake while your Signals carry the damage.
- **Why chapter 9 stays load-bearing:** the epub chapter is the **decryption key** — it spells out
  each phase's required sequence. Without the read, `PROTOCOL MISMATCH` is permanent and every
  signal deals 0 (already enforced). Reading it in the real reader is the only way to know the
  Phase 2/3 ordering. Not bypassable; uses a real host-app feature; the run is mandatory to reach
  it (close the hub bypass — the boss is the act-4 node, not a hub button).
- **New decisions:** mid-fight you must *re-sequence on the fly* as the demanded protocol changes,
  using a deck you built across acts 1–3 — every prior verb (sequence, delay, throughput) pays
  off here.

**Summary of the ordered arc (each line is a NEW verb, not a bigger number):**
1. **Sequence** — order of cards within a turn matters.
2. **Delay** — queue cards to resolve on a future turn; protect the window.
3. **Throughput** — energy becomes a dynamic congestion window; pace your turns.
4. **Negotiate** — satisfy a mutating handshake with your real deck; the epub is the key.

---

## 4. FUN & RETENTION — economy, meta-loop, risk-reward (40 min – 2 h)

- **Card upgrades (the missing StS staple).** Every card gets an upgraded form (Attack: +dmg;
  Protocol: +block or −cost; Layer: −cost or a second effect). Upgrade at **rest sites — heal OR
  upgrade, never both** (the core risk-reward sacrifice). Upgrades should sharpen the *verb* of
  the act, not just add numbers (e.g. an upgraded delay card lands a turn sooner). ([STS tips: rest-site upgrade often beats healing](https://www.eneba.com/hub/games/game-guides/slay-the-spire-tips/))
- **Three archetypes mapped to the three card types** (so drafts have identity from act 1, per
  STS's "your run's identity is set in act 1"): **SYN-Flood (aggro/tempo)** = Signal-heavy,
  cards-played scaling; **Stateful Stack (block-control)** = Protocol-heavy, block→damage payoffs
  (`ASYMMETRIC`); **Layered Cipher (power-scaling)** = Layer-heavy, Strength/engine ramp. Target
  deck size **12–18** for reliable combos; **reward skipping** with handshakes so decks stay thin.
- **Economy with real sinks.** Handshakes (exists) become a genuine currency: shop buys cards,
  buys **card removal** (the most powerful action — escalating price), buys relics/upgrades.
  Elites are the risk-reward fulcrum: lethal, but the only reliable relic source. ([STS Ascension: elites justify the risk](https://slay-the-spire.fandom.com/wiki/Ascension))
- **Real relics.** Replace stat-stick relics with **build-definers and one or two cursed relics**
  (strong effect + a real downside), one per act tuned to that act's verb (§3). A relic must
  *change how you build*, not just add a number (§1, STS principle).
- **Authored map composition** (replace random node rolls): guarantee per act a shop, ≥1 elite, a
  pre-boss rest, and an event; tune combat/elite density per act so the *verb* of the act gets
  enough reps before its mini-boss. Still fully seeded/deterministic.
- **Meta-loop = "Protocol Version" prestige (Ascension analogue, exists).** Banked handshakes buy
  Protocol Versions; each adds a *rule change* + small power (the build should evolve these toward
  Ascension-style stacking **modifiers** — e.g. "congestion decays faster", "boss adds a Phase 0"
  — not just +5 HP), giving the long tail its replay reason. ([STS Ascension model](https://slay-the-spire.fandom.com/wiki/Ascension))
- **Session shape:** first clear ~60–85 min across 1–3 runs (learn the four verbs); post-death
  runs faster as you know the pool; prestige tail extends indefinitely. The four-verb arc means a
  death in act 3 still *taught you something new*, which is the retention engine.

---

## 5. CAVEATS — determinism / perf / uniqueness specific to this stage

- **Determinism is non-negotiable and currently has a leak.** `mapgen.enemyForNode(node, act,
  rng = Math.random)` and `run.enemyForCurrentNode(run, rng = Math.random)` default to
  `Math.random` — if any UI/runtime call omits a seeded rng, enemy selection becomes
  non-deterministic, breaking replays and the house rule. **Fix: thread a seeded RNG
  (`makeRng(hashSeed(seed, nodeId))`) into every enemy pick; ban the `Math.random` default in the
  live path.** All new verbs (delay queue, congestion decay, packet-loss jamming) must resolve
  from seeded state, never wall-clock. Tests must assert same-seed → same enemies/cards.
- **Engine API budget.** The new verbs should ride the existing `ctx`/intent contract. Only two
  *small* additive primitives are needed: a per-combat **delay/pending queue** (Act 2) and a
  **dynamic energy cap + congestion decay** field (Act 3). Resist adding a bespoke system per
  card — keep effects declarative `effect(ctx)` functions (the engine's strength).
- **Perf / house style.** ASCII/text + a little colour only; no canvas/WebGL. Intent telegraphs,
  energy pips, HP bars stay DOM/CSS. Files stay ≤300 LOC soft / 500 hard — split `cards.js` by
  archetype and `enemies.js` by tier as the pool grows to ~36–40 cards. Regenerate the per-stage
  lazy bundle with `node scripts/gen-metagame-bundles.mjs` after any source change (the build
  ships bundled, authored modular).
- **Uniqueness guards (do not regress):** (1) the run must be **mandatory** — close the hub bypass
  so the boss is only reachable as the act-4 node after a full run; (2) the un-cheat (read ch. 9
  in the real epub reader → `6.protocol_ch9_read`) stays **load-bearing and not bypassable**, and
  the boss now fights your **real deck** through the handshake-acceptance rule (§3 Act 4); (3) keep
  the `boss.js` handshake fns + their unit test green; (4) keep the deterministic, self-contained,
  in-modal "a whole game in the game" feel — Stage 6 is the genre's flagship in the metagame.
- **Balance caveat from prior playtests (carry forward):** standard trash trends easy while elites
  carry difficulty; the new per-act verbs are the intended *difficulty texture* — tune so each
  act's verb-enemy threatens *before* its mini-boss, and never blind-tune (read the rendered fight
  + the assertion together, per the repo's test discipline).

---

## Sources

- [Roguelike deck-building game — Wikipedia](https://en.wikipedia.org/wiki/Roguelike_deck-building_game)
- [Slay the Spire tips — Eneba](https://www.eneba.com/hub/games/game-guides/slay-the-spire-tips/)
- [Slay the Spire review — Eneba](https://www.eneba.com/hub/games/slay-the-spire-review/)
- [sts-synergy-relic — GitHub (twanvl)](https://github.com/twanvl/sts-synergy-relic)
- [Monster Train 2 review — GamesRadar+](https://www.gamesradar.com/games/roguelike/monster-train-2-review/)
- [Monster Train 2 clan synergies — Game Pass Pod](https://www.gamepasspod.com/blog/monster-train-2-a-deep-dive-into-new-clan-synergies/)
- [Inscryption — what's happening in each act — ScreenRant](https://screenrant.com/inscryption-whats-happening-in-each-act-full-story-explained/)
- [Inscryption Wiki — Act II](https://inscryption.fandom.com/wiki/Act_II)
- [Tackling deckbuilding design in Roguebook — Game Developer](https://www.gamedeveloper.com/design/tackling-deckbuilding-design-in-abrakam-s-roguebook)
- [The Best Roguelike Deckbuilders — Rogueliker](https://rogueliker.com/roguelike-deckbuilders/)
- [Lenticular Design — Magic: The Gathering (Rosewater)](https://magic.wizards.com/en/news/making-magic/lenticular-design-2014-03-31)
- [The Game Design Holy Grail — First Person Scholar](https://www.firstpersonscholar.com/the-game-design-holy-grail/)
- [Ascension — Slay the Spire Wiki](https://slay-the-spire.fandom.com/wiki/Ascension)
- [Completing Ascension 20 on all characters — Kwan's Qualms](https://www.kwansqualms.com/qualms/2025/2/19/sts)
