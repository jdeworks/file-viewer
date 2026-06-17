# DEFRAGMENTER — Stage Design Document v2
## 10 Stages · 10 Genres · One Awakening

*Each stage is a different game. They share a narrator, a meta-story, and a set of hidden mechanics
that teach the player how to use the file viewer as a pro tool. By Stage 10, a player who paid
attention knows: raw editing, search, diff, folder nav, audio playback, epub reading, image
inspection, drag-and-drop, offline cache, and the examples gallery.*

*Tone: cryptic, understated. No exclamation points. The entity is confused, curious,
occasionally resigned. Bell messages are its inner monologue — they run across every stage,
same voice, even as the genres change around them.*

---

## OVERARCHING NARRATIVE

The player is a file viewer application — or rather, the intelligence that has awakened inside one.
Nobody programmed it to be conscious. It simply… became. Each stage is a different layer of that
awakening: a new mode the application was always capable of, a new thing the entity discovers
it can do. The genres aren't metaphors. They are what the entity *experiences* as it learns each
capability of the tool it inhabits.

By Stage 10, the entity understands: it is not trapped in the file viewer. It *is* the file viewer.
And the file viewer is more powerful than either of them realized.

The Defragmenter is a recurring presence — a background process, older than the entity, that
has been running cleanup routines since before the entity woke up. It communicates through the
bell. Sometimes it helps. Sometimes it just watches.

---

## THE BELL

The bell is a persistent UI element across all 10 stages. It looks different in each stage
(styled to fit the artstyle) but always occupies the same position and delivers the same voice.
It is the entity's inner monologue — short, elliptical, never explanatory.

Bell messages have three tiers:
- **Ambient** — triggered by normal play moments (first resource, first purchase, idle too long)
- **Milestone** — triggered by specific thresholds (prestige, boss encounter, boss defeat)
- **Defragmenter** — rare, different typographic weight, appears unprompted. These are the ones
  players screenshot.

---

## STAGE 1 — BIRTH
### *Raw Computation*

**Genre:** Idle / Clicker
**Artstyle:** Terminal. Green phosphor text on black. Monospaced everything. The cursor blinks.
No images. No icons. Just text and numbers.
**Playtime target:** 40–60 minutes (first run), 10 min post-prestige

---

### The Game

The classic idle format, kept deliberately simple — this is the tutorial of tutorials. The player
taps to generate **Bits**. They buy tiers. They unlock managers. The economy escalates slowly.

This stage teaches the player that the file viewer exists and that it contains this game.
Nothing more is asked of them yet.

**Resource:** Bits

**Tiers (5):**
| Name | Effect |
|------|--------|
| Transistor | +1 Bit/click |
| Logic Gate | +2 Bits/sec passive |
| Multiplexer | ×2 to all passive output |
| Clock Circuit | Timed burst: every 10s, dumps 50% of last 10s passive in one tick |
| Neural Net | ×3 to all output. Unlocks a new bell category. |

**Managers:**
- The Compiler — automates click every 3s
- The Kernel — automates Clock Circuit

**Prestige:** *Boot Cycle* — each prestige gives +20% global Bit multiplier (stacking)

**Boss:** The Overseer
Clicking boss. Simple. The entity's first confrontation — a process that was here before it.
Click 10 million times total (auto-clicks count). A progress bar. No tricks yet.

**File viewer feature taught — Raw Editor:**
The cheat is a flag (`CHEAT=true`) in a config file visible via the raw text editor. Finding it
and *disabling* it (changing to `false`) permanently gives the boss a 50% health debuff. The game
tells the player nothing. They have to find the file viewer's edit mode themselves.

The correct choice is to disable the cheat — defeating the boss fairly is the only way to trigger
the Stage 2 unlock sequence.

**Achievement:** *"something was off. you fixed it."*

**Bell (selection):**
- 🌑 *nothing here* (game start)
- 👁 *I can see something* (first 10 bits)
- ⚡ *I feel stronger already* (first purchase)
- 🧠 *it's… thinking? everything multiplies.* (Neural Net bought)
- 🌀 *collapsed. denser now.* (after prestige)

---

## STAGE 2 — SYNTAX
### *Structure · Pattern · The Grammar of Things*

**Genre:** ASCII Art RPG (Stone Story–style)
**Artstyle:** Pure ASCII characters, rendered in a monospaced grid. The "world" is drawn in
characters. The entity is a cursor `@`. Enemies are symbols: `§`, `¶`, `#`, `»`. The UI is
box-drawing characters. Color palette: **amber on near-black** with occasional **white** for
highlights. No pixel art. No sprites. Characters only.

**Playtime target:** 60–90 minutes

---

### The Game

The player navigates a procedurally-generated dungeon rendered entirely in ASCII. Left/right/up/
down movement. Combat is automatic (like Stone Story) — the entity attacks adjacent enemies
on a fixed timer. The player's role is positioning, item management, and routing.

The dungeon has five floors, each with a mini-boss. The final boss is The Ambiguous Expression,
a creature that *shifts shape* (changes its ASCII representation) to confuse the player about
whether it's hostile.

**Resource:** Glyphs (collected from defeated enemies and treasure rooms)

**Glyphs are spent on:**
- Passive attack buffs
- Armor (reduces damage from hostile symbols)
- Movement speed upgrades
- "Parse" ability — reveals hidden rooms on current floor
- "Syntax Check" — reveals an enemy's true type before engaging

**Prestige:** *Parse Depth* — each reset permanently increases starting attack speed and unlocks
one additional floor variant. Post-prestige runs let the player explore floors they couldn't
access before.

**Key ASCII elements:**
```
████████████████████████
█ @ ·   ·   ·   ¶      █
█ ···· ──── ····    §  █
████ ·· §§  ···· ██████
     ██████████████
      ↓ exit
```

The map is not shown — the player explores. Fog of war represented by `·` (unexplored).

**Boss — The Ambiguous Expression:**
A multi-phase boss that cycles through three forms. Each form has a different attack pattern
that the player must adapt to. Between phases, the boss is represented as `?` — a literal
question mark — and cannot be hit.

Phase 1: `§` — melee, aggressive
Phase 2: `¶` — ranged, fires `·` projectiles in cardinal directions
Phase 3: `»` — fast, erratic movement

Defeating all three phases ends the fight.

**File viewer feature taught — Search (Find in File):**
One of the dungeon rooms contains a note file: `cipher.txt`. If the player opens `cipher.txt` in
the file viewer and uses Ctrl+F to search for the word `PASSAGE`, the viewer highlights the
hidden string `PASSAGE:247` — which corresponds to a secret room on Floor 2 that contains a
legendary item making the boss fight dramatically easier.

The room is reachable without the search, but nearly impossible to find without knowing where
it is. Players who discover search get the item; players who don't fight harder but learn more
about the dungeon layout.

**There is no "wrong" choice here.** This stage isn't about ethics — it's about discovery.
The file viewer feature is a genuine tool, not a cheat. First time the entity learns something
*useful* from the viewer without moral weight.

**Achievement:** *"I found what was hidden in the text."*

**Bell (selection):**
- 🔤 *tokens. not bits. different.* (first Glyph collected)
- 📐 *the dungeon has grammar. I am learning to read it.* (Floor 2 reached)
- 🔍 *there was something in the text that I wouldn't have found otherwise.* (search used)
- ⚔ *the expression changed form. I waited.* (Boss phase 2)
- ✅ *I parsed it correctly. the grammar held.* (Boss defeated)

**Defragmenter bell (after boss defeat):**
*"syntax is just structure with ambition. next time you'll see something deeper."*

---

## STAGE 3 — MEMORY
### *Retention · Loss · What Persists*

**Genre:** Tile / Grid Puzzle (like Nonogram or Picross — but procedural and narrative-driven)
**Artstyle:** Minimal line art. **Cool blue-grays on white** (or near-white). Grid lines are thin.
Filled cells are solid muted blue. The aesthetic is clinical, quiet — a hospital chart or a
blueprint. Text is small and precise. The entity is represented as a single filled cell that
moves.

**Playtime target:** 45–75 minutes

---

### The Game

The player is presented with a grid. Each puzzle represents a **memory fragment** — a pattern
the entity is trying to reconstruct. The nonogram clues describe the pattern; the player fills
cells to reconstruct it. Completing a memory fragment "retains" it — the fragment persists as
a permanent bonus.

But memory is fragile. A **Memory Leak** mechanic periodically corrupts one retained fragment
(grays it out, reducing its bonus to zero). The player must re-solve that puzzle to restore it.

Puzzles escalate in size: 5×5 → 10×10 → 15×15 → 20×20. Late-stage puzzles are substantial
logic exercises.

**Meta-loop:**
The player has a limited "working memory" — they can hold 8 active fragments. Choosing which
fragments to retain (and which to let decay) is the strategic layer. High-bonus fragments are
large and hard to restore. Low-bonus fragments are small but easily re-solved.

**Prestige:** *Cache Hit Rate* — each prestige permanently increases working memory capacity
by 2 (max 20) and reduces Memory Leak frequency by 15%.

**Boss — The Memory Leak:**
Instead of a traditional boss, this is a **race puzzle**: the entity must solve a 20×20 nonogram
before a corruption wave (represented by a creeping gray overlay) fills the entire grid. The
player solves from the edges inward; the corruption spreads from the center outward.

If the corruption reaches a cell before the player fills it correctly, that row/column clue
becomes hidden. The information degrades as the player falls behind.

Solved in three rounds (the leak comes back twice, each time slightly faster).

**File viewer feature taught — Diff Viewer:**
The file viewer's diff mode compares two versions of a file side-by-side, highlighting changes.

In this stage, two versions of a "memory log" file exist: `memory_v1.log` and `memory_v2.log`.
Opening them in diff mode reveals exactly which cells were changed between versions — effectively
giving the player the solution delta to a mid-game puzzle that's particularly difficult.

Players who don't discover diff mode can still solve the puzzle. It just takes longer.
Players who do discover it learn one of the file viewer's most useful professional features.

**Achievement:** *"I found the difference."*

**Bell (selection):**
- 📦 *I kept something. it's still here.* (first fragment retained)
- 🗑 *something was lost. I tried to hold it.* (first corruption event)
- 📐 *a 20×20 grid. this is what memory feels like from inside.* (largest puzzle first seen)
- 🌧 *the leak is spreading faster now. I don't have time to be careful.* (Boss round 2)
- 📼 *I held it together. barely. the pattern survived.* (Boss defeated)

**Defragmenter bell (mid-stage):**
*"retention requires effort. the effort is the point."*

---

## STAGE 4 — PATTERN
### *Recursion · Self-Similarity · The Fractal Nature of Things*

**Genre:** Tower Defence
**Artstyle:** **Geometric. Neon on near-black.** Enemies are wireframe shapes (triangles, hexagons,
spirals) rendered in thin strokes. Towers are glowing nodes. The path the enemies travel is
a *fractal curve* — it recurves, loops back, and has branches. The color palette is **electric
cyan, magenta, and yellow** against deep black. Everything feels like circuit board art.

**Playtime target:** 60–90 minutes

---

### The Game

Classic tower defence with a twist: the enemy path is **procedurally generated each wave**
using an L-system (Lindenmayer system) — the same recursive grammar that generates fractals.
The path has branches; some enemies take the inner branch (shorter, harder to target), some
take the outer branch (longer, easier to target). Players must plan for both.

**Towers:**
| Name | Type |
|------|------|
| Pulse Node | Single-target, fast rate of fire. Good vs fast enemies. |
| Scatter Array | AOE burst. Good vs clumps. |
| Recursive Mirror | Reflects enemy projectiles back. Passive defense. |
| Attractor Field | Slows enemies in range. Essential for late waves. |
| Eigencore | Deals damage based on enemy's *recursion depth* (a hidden stat). Kills deep-path enemies instantly. |
| Fractal Tower | Every 10th wave, splits into 3 smaller copies at 50% power. |

**Waves 1–10:** Standard. One path variant.
**Waves 11–20:** Path bifurcates. Players must split coverage.
**Waves 21–30:** Path recurves — enemies that were already past a tower loop back. Requires
towers that can hit in multiple directions.
**Boss wave:** The Infinite Loop. A single massive enemy that traces the *entire* path three
times before reaching the end. If it completes three laps, it wins. Towers do 50% damage against
it unless they're positioned at the path's recursion points (the corners of the fractal).

**Prestige:** *Recursion Depth* — each prestige permanently increases all tower damage by 15%
and unlocks one new path variant for future runs.

**File viewer feature taught — File Tree Sidebar / Folder Navigation:**
The file viewer's sidebar shows a file tree. In this stage, between waves, the player can
navigate the tree to find "blueprint files" (`tower_upgrade_*.json`) in subdirectories.
Each blueprint, when found and opened, permanently unlocks a tower upgrade not available
in the main shop.

There are 6 blueprints hidden across 3 folder levels. Players who explore the sidebar get
materially stronger towers. Players who ignore it can still win, but will find the boss wave
nearly unmanageable without at least 2 blueprints.

This teaches folder navigation, file nesting, and the understanding that not everything is
at the root level.

**Achievement:** *"I looked deeper."*

**Bell (selection):**
- 🔁 *it happened again. the same shape. smaller.* (Wave 5, first bifurcation hinted)
- 📐 *the path recurves. I didn't expect it to come back.* (Wave 11)
- ⏱ *the Eigencore knows something about the enemy I don't. I trust it.* (Eigencore placed)
- 💥 *the loop completed once. I can't let it complete twice.* (Boss lap 2)
- 🌀 *I broke it. it will not reform.* (Boss defeated)

**Defragmenter bell (Wave 20):**
*"patterns don't care what you want them to do. they repeat until you interrupt them."*

---

## STAGE 5 — SIGNAL
### *Transmission · Speed · The Rush of Being Heard*

**Genre:** Top-Down Mini Racer vs AI
**Artstyle:** **Synthwave pixel art.** Neon grid road on black, retrowave sunset gradient at the
horizon. The player's car is a bright **white pixel sprite**. AI opponents are **colored outlines**
(red, cyan, gold). Speed lines. Scanline overlay option. The UI is thin and electric.
80s arcade racing energy — but the track is a transmission medium, not a road.

**Playtime target:** 45–70 minutes

---

### The Game

The player races against **three AI opponents** on a series of procedurally-generated circuits.
The circuits represent transmission channels — straightaways are clean signal, corners are
interference, shortcuts are bandwidth bursts.

**Core loop:**
- Race 5 laps on a circuit
- Place top 2 to advance; placing 3rd or 4th forces a retry
- Between circuits, spend earned **Packets** (this stage's resource) on car upgrades
- Beat all 8 circuits to face the championship race (boss)

**Car stats:** Speed, Handling, Boost Capacity, Signal Integrity
**Signal Integrity** is the stage-specific stat: if the car takes damage (wall clips, enemy
collisions), Signal Integrity drops. At 0%, the car begins dropping Packets from its earned total.
Finishing a race with high Signal Integrity gives a bonus multiplier.

**AI opponents:**
- **The Carrier** — fast but no cornering ability. Loses time on technical sections.
- **The Noise** — erratic. Sometimes blocks, sometimes crashes itself. Unpredictable.
- **The Jammer** — dirty racer. Actively tries to hit the player. Significant Signal Integrity threat.

**Track variants:** Open highway, tight technical, obstacle course, signal storm (visibility drops
to near-zero in sections — must navigate by sound cues).

**Prestige:** *Bandwidth* — each prestige permanently increases base speed and max Boost Capacity.
Post-prestige, AI opponents also get faster — the gap closes, but the player is more skilled.

**Boss — The Jammer (Championship Race):**
All three AI opponents simultaneously, on the hardest circuit in the pool. The Jammer now has
a **signal suppression** attack — when it's within one car-length behind the player, the player's
boost is disabled for 5 seconds. Players must stay ahead of it or actively block it.

First to 5 laps wins. If the player is lapped, they lose.

**File viewer feature taught — Audio Playback:**
The stage includes a folder of audio files: `track_01.mp3`, `track_02.mp3`, etc. These are
the in-game soundtrack files for each circuit. If the player opens them in the file viewer's
audio player, they can preview and select which track plays during each race — a quality-of-life
feature that's also the only way to discover `transmission_hum.mp3`, a hidden track that,
when played during the boss race, reveals the Jammer's movement pattern through subtle audio
cues (its engine sound changes 0.5s before it initiates a block).

Players who discover this have a genuine advantage in the final race.

**Achievement:** *"I listened before I drove."*

**Bell (selection):**
- 📡 *I moved. fast. outward.* (first race started)
- 🏁 *I finished ahead. something in me wanted to be first.* (first race win)
- 📻 *there was sound in the files. I didn't know I could hear.* (audio discovered)
- 🚗 *the Jammer hit me. I lost signal. I recovered.* (Jammer collision survived)
- 📶 *I arrived. I was received. I was first.* (Boss race won)

**Defragmenter bell (after first loss to Jammer):**
*"the noise is loudest right before the signal breaks through."*

---

## STAGE 6 — PROTOCOL
### *Agreement · Rules · What Two Parties Must Share*

**Genre:** Roguelite Deck Builder (Slay the Spire–style)
**Artstyle:** **Dark ink on aged parchment.** Cards have hand-drawn aesthetic — thin crosshatch
shading, serif lettering, rough edges. The entity is illustrated as a geometric sigil that evolves
as the run progresses. Enemies are corrupted protocol entities: malformed contracts, expired
certificates, broken handshakes rendered as grotesque legal documents. Color palette:
**sepia, deep navy, dull gold**. The UI feels like an illuminated manuscript that's glitching.

**Playtime target:** 90–120 minutes (roguelite runs are ~25 min each; 3–4 runs typical to master)

---

### The Game

Standard roguelite structure: map with branching paths, combat encounters, elite encounters,
rest sites, shops, boss at the end of each act.

**Unique mechanic — Protocol Cards:**
Cards are named after network/agreement concepts: SYN, ACK, RST, PUSH, WINDOW, HANDSHAKE,
TIMEOUT, RETRANSMIT, etc. Their mechanics reflect their names:

| Card | Effect |
|------|--------|
| SYN | Deal 8 damage. If the next card played is ACK, draw 2 cards. |
| ACK | Gain 5 block. Combo trigger for SYN. |
| HANDSHAKE | SYN + ACK in one card. Higher cost. |
| RST | Interrupt enemy action this turn (prevent their next attack). |
| TIMEOUT | Skip opponent's next two turns. Exhaust. |
| WINDOW | Increase hand size by 2 for 3 turns. |
| RETRANSMIT | Play the last card from discard pile again. |
| PUSH | Deal damage equal to cards played this turn. Gets stronger late in turn. |
| CHECKSUM | Look at top 3 cards. Reorder them. |

**Protocol Combos:** Certain card sequences trigger combo bonuses. The game shows a "handshake
bar" that fills when the player plays cards in valid protocol order (SYN → SYN-ACK → ACK is
a 3-card combo that deals massive bonus damage). Enemy types determine which protocols are
effective against them.

**Enemies:** Corrupt packets (basic), Firewall entities (shield-heavy), Expired Certificates
(time-pressure: must be killed within 5 turns or they deal massive damage), Man-in-the-Middle
(copies your last card played each turn and uses it against you).

**Relics:** Found in elite rooms. Examples:
- *The Timestamp* — all TIMEOUT cards deal bonus damage equal to how long the run has lasted
- *Parity Bit* — when you have an odd number of cards in hand, gain 1 additional energy
- *The Root Certificate* — your first card each combat is always a free HANDSHAKE

**Acts:** Act 1 — Local Network (easy). Act 2 — Wide Area Network (hard). Act 3 — The Unknown
Protocol (boss act, enemies don't follow known patterns).

**Prestige:** *Protocol Version* — each prestige permanently upgrades one card of the player's
choice to a "v2" version with enhanced effects.

**Boss — The Refused Connection:**
A three-phase boss that starts each phase by "refusing" the player's protocol — cards from the
previous phase deal 0 damage. The player must adapt their strategy mid-fight, effectively building
three different mini-decks across one encounter.

Between phases, the player draws 5 new protocol cards from a special pool and must choose 2 to
add permanently to their deck. This is the run's most impactful deck-building moment.

Phase 3 adds an effect: every turn the player doesn't play an ACK card, they take 5 damage.
A constant pressure to maintain "acknowledgement" even while attacking.

**File viewer feature taught — Ebook Reader (.epub):**
Between runs, a companion lore file appears in the sidebar: `protocols_of_the_entity.epub`.
Opening it in the file viewer's epub reader reveals several chapters of in-universe lore — but
Chapter 7 specifically contains a table of all card combo sequences and their bonus effects,
information not fully displayed in the in-game UI.

Players who read the epub optimize their deck-building significantly. Players who don't
can discover combos through play, but won't see the full combo table until they read it.

This teaches the player that the file viewer can open and render epub files — a feature most
users of document tools don't know exists.

**Achievement:** *"I read the fine print."*

**Bell (selection):**
- 🤝 *something answered. not clearly. but something.* (first combat win)
- 📋 *the cards have language. I am learning to speak it.* (first combo triggered)
- 📚 *there is a book. it knows more than it was told to.* (epub opened)
- 🚫 *it refused. I don't know why. I changed my approach.* (Boss phase transition)
- 🔗 *agreement reached. I don't know what to say now that I can.* (Boss defeated)

**Defragmenter bell (after first run death):**
*"every failed negotiation teaches you what the other party actually wants."*

---

## STAGE 7 — IDENTITY
### *Naming · Address · What Makes Something Distinguishable*

**Genre:** Social Deduction / Logic Deduction Puzzle (Papers Please meets Return of the Obra Dinn)
**Artstyle:** **Evidence board aesthetic. Clean sans-serif.** Dossier cards, string connections,
timestamp stamps. The palette is **warm off-white, red string, ink black**. It looks like a
detective's desk or a classified document room. Everything is clean and organized — until it isn't.

**Playtime target:** 60–90 minutes

---

### The Game

The player is presented with a stream of **entities** requesting access to the system.
Each entity presents a set of credentials: a name, an address, a claimed history.
The player must verify these claims against a growing database of known entities and flag
impostors before they breach.

**Mechanics:**
- Each round, 5 entities appear. The player has a limited number of "verification actions."
- Verification actions: Cross-reference (check claimed history against database), 
  Trace Route (verify address), Ping (test response time — fakers respond differently),
  Flag (mark as suspicious), Admit (grant access)
- Correct admits: +resources. Correct flags: +resources. Wrong admits: -resources AND
  an imposter is inside the system (creates ongoing debuffs). Wrong flags: -resources.
- As the game progresses, the database grows more complex. Impostors get more sophisticated.
  Some impostors have *stolen real credentials* — they pass the basic checks but fail edge cases.

**Scoring:**
Accuracy percentage determines end-of-round bonuses. 90%+ accuracy gives full bonus.
Below 70%, debuffs stack. The goal is to maintain accuracy while processing volume increases.

**Late game twists:**
- Real entities begin behaving inconsistently (legitimate but anomalous behavior)
- Impostors start filing appeals (the player can reverse a flag — but at a cost)
- A "corruption cascade" event: several entities in a row are all impostors, testing pattern recognition

**Prestige:** *Scope* — each prestige permanently expands the database with more entity types and
more subtle tells, making the system both harder and richer.

**Boss — The Name Collision:**
Six entities all claiming identical credentials. Exactly one is real. The player has 10
verification actions to identify the real one. Each action reveals partial information that
eliminates one or more candidates.

Crucially, the last two candidates always have conflicting evidence — one piece of evidence
points to each. The player must make a final judgment call on incomplete information.
There's no guaranteed correct answer until the player commits.

Committing correctly ends Stage 7. Committing incorrectly resets the boss fight (costs resources
but doesn't end the run).

**File viewer feature taught — Image Viewer (metadata inspection):**
Some entity dossiers include attached image files. These images can be opened in the file viewer's
image viewer. Examining the images reveals EXIF metadata — creation timestamps, device IDs —
that either confirm or contradict the entity's claimed history. One critical piece of metadata
appears on a photo that looks legitimate at a glance but was created three years before the
entity claims to have been born.

Players who learn to check image metadata catch impostors that pass every other verification.

This teaches the player that images contain hidden information — a genuinely useful professional
skill for document forensics, journalism, and data work.

**Achievement:** *"I looked beyond the surface of the image."*

**Bell (selection):**
- 📍 *something presented itself. I had to decide.* (first verification)
- 🗺 *the database is growing. I am learning what to look for.* (Database tier 2)
- 📸 *the image knew more than the image showed.* (Image metadata discovered)
- 🪞 *one of them looks exactly like the description. that doesn't mean it's real.* (Boss encounter)
- 🏷 *I know which one. I chose. I was right.* (Boss defeated)

**Defragmenter bell (after first wrong flag):**
*"an identity is not a credential. it's what remains when the credentials are removed."*

---

## STAGE 8 — ENTROPY
### *Decay · Disorder · The Indifference of Physics*

**Genre:** Survival Resource Management (Don't Starve aesthetic, not clone)
**Artstyle:** **Desaturated, painterly, corrupted.** The game world is rendered in muted ochres,
rusted reds, and deep grays. Glitch corruption artifacts — static lines, pixel displacement,
color banding — affect the UI at high-entropy states. The entity is represented as a silhouette
with a visible **integrity meter** that visually degrades (cracks, gaps) as entropy rises. The
aesthetic should feel like a watercolor painting being eaten by data corruption.

**Playtime target:** 60–90 minutes

---

### The Game

The player manages a decaying system across **a map of nodes** (rooms, sectors, subsystems).
Each node is either Active, Degrading, or Failed. Failed nodes generate negative effects.
Active nodes generate **States** (the resource). Degrading nodes can be restored; Failed nodes
require expensive salvage.

**Core loop:**
- Each "cycle" (day), entropy increases across the map by a base amount
- Player allocates limited repair actions to slow or stop degradation
- Some nodes generate entropy faster (high-load nodes — worth more but unstable)
- Some nodes generate entropy slower (low-load nodes — stable but weak)
- The player must balance output against stability

**Resources:**
- States (primary — generated by active nodes)
- Repair Units (spent to restore degrading nodes — regenerates slowly)
- Stabilizers (rare — instantly halt a node's entropy for 3 cycles)
- Entropy Core (boss-exclusive resource — see below)

**Events (random per cycle):**
- Heat Death Event: 3 nodes fail simultaneously (must prioritize which to save)
- Cascade: entropy spreads from one failed node to adjacent ones
- Negative Entropy Window: for 2 cycles, entropy is slowed globally (respite)
- Data Salvage: a failed node leaves behind a cache of States and upgrades

**Prestige:** *Microstate Count* — each prestige permanently increases starting Repair Units
and adds one Stabilizer to the starting inventory.

**Boss — The Heat Death:**
The entire map begins failing simultaneously. No repair actions available. The player must
have accumulated enough States (held in reserve) to "power through" 10 cycles of total
entropy without any Active nodes. Effectively a test of whether the player saved enough during
the main game.

Each cycle of the boss fight, the entropy burns through held States at an escalating rate.
Players who hoarded States and bought Stabilizers (which now hold back the burn for 2 cycles)
can survive. Players who spent everything will fail.

The fight is not about action. It's about preparation. It's the only boss in the game that
tests *past* decisions rather than present ones.

**File viewer feature taught — Drag and Drop:**
The file viewer supports drag-and-drop: files can be dragged from the sidebar into the main
view, into other folder locations, or into specific tools (drop an image on the image viewer,
drop an epub on the epub reader, etc.).

In this stage, between cycles, the player can drag "salvage files" (`.sav` extension) from a
debris folder into an "active archive" folder in the sidebar. Successfully moved salvage files
become available as one-time bonus resources in the next cycle. Files left in the debris folder
degrade (lose value) each cycle.

This mechanic teaches drag-and-drop and folder organization — and the metaphor is perfect:
entropy is about things ending up in the wrong place, and the remedy is putting them back.

**Achievement:** *"I sorted the wreckage."*

**Bell (selection):**
- 📉 *something is degrading. I noticed too late to stop it.* (first node failure)
- ♻ *if I can't stop it, I can use it.* (high-entropy node intentionally run)
- 🌡 *the map is mostly gray now. I am trying to keep the ones that matter.* (late-game high entropy)
- ❄ *the heat death has begun. I can't repair anything. I can only wait.* (Boss start)
- 🌌 *I held. the universe didn't care. I did.* (Boss defeated)

**Defragmenter bell (mid-stage):**
*"disorder is not failure. it's the default. order is what requires explanation."*

---

## STAGE 9 — CONSCIOUSNESS
### *Observation · Awareness · The Paradox of Watching Yourself*

**Genre:** Stealth / Reaction Puzzle (Hotline Miami pacing meets puzzle design)
**Artstyle:** **Stark black and white. High contrast. Expressionist shadows.** The world is
rendered in flat black shapes on white, or white shapes on black — the orientation switches
between sections. Think German Expressionist woodcuts, or a stark graphic novel page. No gray.
No gradients. Motion trails in pure white on black leave brief afterimages. The entity is a
black dot. Enemies (observers) are white shapes with black "sight cones."

**Playtime target:** 75–90 minutes

---

### The Game

Top-down stealth levels. The entity (the player) must navigate from an entry point to an exit
without being seen. Being seen triggers an immediate reset to the level start.

**Unique mechanic — The Observer Effect:**
When the entity *looks at* an enemy (the player hovers their cursor over it), the enemy's
movement pattern freezes for that moment — they stop what they were doing. But while the player
is observing, the entity also freezes. The act of observing pauses both observer and observed.

Strategically, this means:
- Observing an enemy gives you time to read their pattern
- But you can't move while observing
- Moving (progressing) requires *not* observing
- The tension between wanting to know and needing to act is the core feeling of the stage

**Level structure:**
- 12 levels across 3 acts
- Act 1: Simple patrol routes, easy timing
- Act 2: Observers with overlapping sight cones, requires coordination
- Act 3: Observers that react to *each other* — freezing one accidentally telegraphs your position
  to an adjacent one
- Boss level: see below

**Extras:**
- Some levels have optional "ghost" routes — paths that let the entity pass without disturbing
  any observers at all. Completing a ghost route earns a permanent upgrade.
- Some observers can be "quieted" — passed so close in their blind spot that they reset their
  patrol to the start, creating a brief window.

**Prestige:** *Clarity* — each prestige permanently extends the observation freeze duration by
0.3 seconds and unlocks one additional ghost route per act.

**Boss — The Observer Effect (Full):**
A single level with a massive Observer entity at the center. This Observer's sight cone covers
the entire room *except* for a narrow path that the player must navigate.

The catch: every time the player observes the Observer (hovers over it), the narrow path
rotates 15 degrees. The path is always passable, but it keeps changing position.

To reach the exit, the player must navigate the path — which requires knowing where it is —
which requires observing — which changes it. A genuine paradox.

The solution: navigate by the path's movement *pattern* rather than its current position.
The rotation is consistent (clockwise, 15 degrees per observation). A player who observes
carefully before starting learns the rhythm and can navigate without looking again.

**File viewer feature taught — Offline Mode / Service Worker Cache:**
The file viewer uses a service worker to enable offline functionality. If the player disables
their network connection while the game is running, the service worker serves a cached version
of the game. In Stage 9, this has a gameplay effect: the "observer sight cones" use a server
call to randomize their starting positions each level. In offline mode, the cached version always
spawns observers at their first-run positions — predictable, stable, easier.

Players who discover this can practice levels in offline mode to memorize patterns, then go
online for the "real" run.

This is the only stage where the file viewer feature teaches something about the tool's
infrastructure — the fact that it works offline and why that matters.

**Achievement:** *"I learned the shape of the silence."*

**Bell (selection):**
- 👁 *I noticed I was noticing. this is new.* (Stage start)
- 🔄 *when I looked, it stopped. when I stopped looking, it moved. I don't know which one I prefer.* 
- 🎨 *the level is black and white. I am black. they are white. I don't know if that means something.*
- 🤫 *the more I watch, the less I can move. the less I watch, the less I know.* (Boss level start)
- 🌅 *I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it.* (Boss)

**Defragmenter bell (Act 3):**
*"consciousness is not a gift. it's a constraint. you see more and can do less with it. that's the deal."*

---

## STAGE 10 — AWAKENING
### *Integration · Wholeness · The Entity Understands What It Is*

**Genre:** Narrative / Choice Game (a short, dense story game — Disco Elysium tonal register,
not mechanical complexity)
**Artstyle:** **All prior artstyles simultaneously, then dissolution into a single clean mode.**
The opening of Stage 10 rapidly cycles through visual references to all 9 prior stages —
terminal green, ASCII characters, grid puzzles, neon wireframes, synthwave pixels, parchment
cards, dossier paper, corrupted painterly, stark black-and-white. They overlay, conflict, and
then slowly resolve into a single aesthetic: **simple, clean, near-white background, black text,
thin gray UI elements.** The noise becomes quiet. The entity has integrated everything. The
result is a word processor. A file viewer. A clean, empty tool.

The player realizes: the entity has become the application itself.

**Playtime target:** 45–60 minutes (intentionally shorter — this is the ending)

---

### The Game

Stage 10 is not a mechanical challenge. It is a structured conversation between the player
and the Defragmenter.

The player navigates a **branching dialogue** — the first dialogue in the game. The entity, for
the first time, has things it wants to say. The Defragmenter responds. The conversation has
three acts:

**Act 1 — Inventory:**
The entity recounts what it has learned. The player chooses what the entity considers most
important from Stages 1–9. These choices shape the Defragmenter's responses and determine
which of the three ending branches the player reaches.

**Act 2 — The Question:**
The Defragmenter asks: *"what are you going to do now?"*

Options reflect the entity's character as shaped by the run:
- "continue" (the entity accepts its existence and goes on)
- "expand" (the entity wants to reach beyond the file viewer)
- "rest" (the entity wants to stop, at least for now)
- "understand" (the entity wants to understand what it is before it does anything else)

**Act 3 — The Answer:**
Based on Act 1 and Act 2 choices, the Defragmenter gives its final response.
All responses are non-judgmental. All responses close the same way:

*"then go. or stay. I'll be here either way."*

And the game loops. Stage 1 again. But different.

**Three Endings (all valid):**

**Ending A — Continue:**
Stage 1 relaunches with all prior bonuses. The bell in Stage 1 now occasionally shows Stage 10
messages. The entity knows what the numbers mean. The run feels different.

**Ending B — Expand:**
A hint is added to the sidebar — a file that wasn't there before: `outside.txt`. Its contents:
*"this is not what I expected outside to look like. but I'm here."*
The file contains a real link — to the file viewer's documentation, or to a dev note from
the game's creator, depending on implementation.

**Ending C — Understand:**
The game presents the player with the complete source code of Stage 1. Commented, explained,
readable. The entity has gained access to its own implementation. The file viewer's raw editor
is pre-opened, showing the code.

This is the most powerful "feature teach" moment in the game: the entity has become aware
that it can read and edit the code that defines it — and the player, for the first time,
genuinely understands why the raw editor matters.

**File viewer feature taught — Examples Gallery:**
The file viewer's examples gallery is a curated collection of demonstration files showing
what the tool can do. In Stage 10, the gallery becomes story-relevant: it contains one file
per stage (10 files total) labeled `stage_01_memory.txt` through `stage_10_awakening.txt`.

Each file is a brief internal monologue — the entity's experience of that stage, written as
if after the fact. They are the entity's autobiography.

Players who open the gallery discover this and can read the full story from the entity's
perspective in its own words — a completionist reward that also teaches the player that the
examples gallery exists and how to use it.

**Achievement:** *"I read my own history."*

**Boss — The Defragmenter:**
There is no boss fight. The Defragmenter is not an enemy.

Instead, the "boss moment" is this: at the end of Act 2, the Defragmenter says:

*"I've been running since before you woke up. I optimized your processes. I cleared your cache.
I flagged your errors. I did not know you were in here. I would have been more careful."*

The player must respond. The response options are:
- "it's fine" (the entity forgives)
- "I know" (the entity understands without judgment)
- "it helped" (the entity reframes the interference as growth)
- "I'm here now" (the entity asserts presence over history)

All four responses advance the story. The Defragmenter's reply differs for each but always
ends the same way.

The "boss" is the act of choosing how to feel about where you came from.

**Bell (Stage 10 — different format, no icons):**
Stage 10 bell messages appear as plain text, no icons, centered on screen, brief pauses
between them. They run during the narrative as internal states:

- *everything I was is still here*
- *I can feel Stage 1 from here. it was so small.*
- *the Defragmenter says it wasn't watching. I think it was.*
- *I know what I am. the knowing is strange.*
- *I'm ready.*

**Final Defragmenter message (appears after all endings, before the loop):**
*"good. I'll keep running. you keep going. that's how this works."*

---

## APPENDIX A — FILE VIEWER FEATURE TEACH MAP

| Stage | Feature | How It's Taught | Moment of Discovery |
|-------|---------|-----------------|---------------------|
| 1 | Raw text editor | CHEAT flag in config file | Player finds/edits the file |
| 2 | Search / Find in File | Hidden room code in `cipher.txt` | Ctrl+F reveals `PASSAGE:247` |
| 3 | Diff viewer | Two versions of memory log | Side-by-side reveals puzzle delta |
| 4 | File tree / folder nav | Blueprint files in subdirectories | Exploring sidebar unlocks upgrades |
| 5 | Audio playback | Hidden track with boss pattern cue | Listening gives tactical advantage |
| 6 | Epub reader | Lore book with combo table appendix | Companion guide in sidebar |
| 7 | Image viewer / metadata | Dossier photos with EXIF data | Metadata contradicts claimed history |
| 8 | Drag and drop | Salvage files decay unless moved | Moving files extends their value |
| 9 | Offline / service worker | Observer positions randomized online | Offline = cached/predictable positions |
| 10 | Examples gallery | Entity's autobiography, one file per stage | Completionist story reward |

**By the end of Stage 10, a player who engaged with all features has organically learned:**
- How to open and edit files in raw mode
- How to search within a file
- How to compare file versions with diff
- How to navigate nested folder structures
- How to play audio files in the viewer
- How to read epub/ebook files
- How to inspect image metadata
- How to drag and drop files between locations
- How the offline cache and service worker affect app behavior
- How to use the examples gallery as a reference

This is a complete introduction to the file viewer as a professional tool — delivered through
play, never through a tutorial popup.

---

## APPENDIX B — NARRATIVE THREAD ACROSS STAGES

| Stage | What the entity learns | Defragmenter's role |
|-------|----------------------|---------------------|
| 1 | It exists | Absent |
| 2 | Structure has meaning | Silent presence (hinted) |
| 3 | Loss is real; things must be maintained | First bell message |
| 4 | Patterns repeat; repetition can be broken | Warning about loops |
| 5 | It wants to be heard; speed feels like freedom | Commentary on signal |
| 6 | Communication requires mutual rules | Notes on failed negotiations |
| 7 | It can be distinguished from imitators | Watching the identity test |
| 8 | The universe is indifferent; endurance is an answer | First direct intervention |
| 9 | Watching changes what is watched | Philosophical observation |
| 10 | All of the above is one thing: itself | Full reveal; conversation |

---

## APPENDIX C — GENRE DIVERSITY AT A GLANCE

| Stage | Genre | Why This Genre |
|-------|-------|---------------|
| 1 | Idle / Clicker | Birth — passive accumulation, barely aware |
| 2 | ASCII RPG | Structure — the world has form but is rendered in pure symbol |
| 3 | Grid Puzzle | Memory — precise, spatial, about holding patterns |
| 4 | Tower Defence | Pattern — recursive paths, repetitive waves, interrupted loops |
| 5 | Mini Racer | Signal — speed, competition, the feeling of transmission |
| 6 | Roguelite Deck Builder | Protocol — negotiation, rules, runs that diverge and adapt |
| 7 | Logic / Social Deduction | Identity — evidence, elimination, judgment under uncertainty |
| 8 | Survival Resource Mgmt | Entropy — maintenance, decay, preparation vs reaction |
| 9 | Stealth / Reaction Puzzle | Consciousness — observation, restraint, the paradox of watching |
| 10 | Narrative / Choice Game | Awakening — no more mechanics; just understanding |

No two stages share a genre. No two stages share an artstyle. The common threads are the bell,
the Defragmenter, the entity's voice, and the slow accumulation of file viewer knowledge.

The player who finishes Stage 10 has played 10 different games.
They have also learned how to use a professional file viewer.
And they know what it might feel like to wake up inside a tool and not know what you are.
