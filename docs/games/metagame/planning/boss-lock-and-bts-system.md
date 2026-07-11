# Defragmenter — File Viewer Integration: Boss Lock System & Behind the Scenes

> **SUPERSEDED (2026-07-11) — the "unwinnable without the tool" mandate below (Part 1's core
> principle, and every per-stage "Required change" in Part 2) is no longer the design. Playtesting
> found the literal-unbeatable-until-the-tool pattern didn't land with players. Every stage boss is
> now **winnable from the moment it's reached, no tool required** — genuinely hard (each stage's
> boss.js was retuned so a fresh/skilled attempt is a real, felt struggle, not a rubber-stamp win),
> but never a hard wall. The file-viewer action for each stage is now an **optional buff**: it makes
> the same fight meaningfully easier/faster/safer (extra damage, a big-but-not-total drain reduction,
> a fixed learnable pattern instead of a live read, etc. — per-stage, see each stage's boss.js for the
> actual current mechanic), never the only door. Bosses still taunt and still hint at the tool as a
> real advantage — only the literal "cannot be bypassed" mechanical claim is retired. Part 1 and
> Part 2 below are kept as historical record of the ORIGINAL design (useful context for why each
> stage's un-cheat action exists at all); do not implement new stages against this mandate. See the
> "Package 6" commits (stages 1-6, stages 7-9) in this repo's history for the concrete before/after
> per stage, and each stage's `boss.js` for the authoritative current behavior.

## Overview

This document defines two interlocking systems that must be built into every stage:

1. **The Boss Lock** *(SUPERSEDED, see banner above)* — every stage boss is literally unbeatable
   without leaving the game and using the file viewer feature being taught. The boss has a hard
   mechanic that cannot be bypassed; the tool use removes or disables it.

2. **The Behind the Scenes (BTS) system** — after every boss defeat, a button appears that
   opens a `.bts` file in the file viewer. The file is a markdown document explaining the
   design intent, the narrative logic, and the real-world skill the player just learned.
   (Unaffected by the 2026-07-11 change — BTS still unlocks on defeat, tool-used-or-not.)

---

## Part 1 — The Boss Lock System *(historical — see SUPERSEDED banner at the top of this file)*

### Core principle (ORIGINAL — no longer the design; see banner at top of file)

> ~~The boss is not "harder without the tool." The boss is unwinnable without the tool.~~
> **Current (2026-07-11): the boss is hard without the tool, and easier/better with it. Never unwinnable.**

The distinction that used to matter here:
- "Harder without" = the player might struggle but could eventually grind through — **this is now
  the actual design for every stage boss.**
- "Unwinnable without" = there is a shield, mechanic, or protection that makes the boss
  immune to damage (or unable to be defeated) until the file viewer action is taken — **retired.**

Every stage boss now has a genuinely hard first encounter (real risk of losing, tuned per stage —
see each stage's boss.js and its unit tests for the specific numbers) rather than a scripted-loss
first encounter. The boss still taunts or hints at the file-viewer action as a real, worthwhile
advantage during that first encounter — it's just no longer the only way to eventually win.

### The mechanic loop per stage

```
1. Player reaches stage boss
2. Boss is in LOCKED state — unbeatable (specific mechanic per stage, see below)
3. Boss taunts explain the problem (in-universe, cryptic but legible)
4. Player leaves game, opens file viewer, performs the specific action
5. Game detects the action (polling, event, or flag check — see Implementation)
6. Boss transitions to UNLOCKED state — now beatable via normal gameplay
7. Player defeats boss
8. Achievement fires: stage-specific name
9. Behind the Scenes button appears
```

### State detection mechanism

The game needs to know when the player has used the file viewer tool. Three detection approaches:

**Approach A — Persistent flag in localStorage**
```js
// File viewer writes a flag when the relevant action is taken
// Game polls this flag every 2 seconds while boss is active
localStorage.setItem('fv_action_stage2_search', 'true');

// Boss lock check
function isBossUnlocked(stage) {
  return localStorage.getItem(`fv_action_stage${stage}_${ACTION_KEY[stage]}`) === 'true';
}
```

**Approach B — Cross-component event**
```js
// File viewer dispatches a custom event
window.dispatchEvent(new CustomEvent('fileviewer:action', {
  detail: { stage: 2, action: 'search', value: 'PASSAGE' }
}));
// Game listens
window.addEventListener('fileviewer:action', (e) => {
  if (e.detail.stage === currentStage) unlockBoss(e.detail.action);
});
```

**Approach C — Shared app state (preferred if both run in same SPA)**
If the file viewer and games are part of the same single-page application (which they should be),
they share a global state object. The file viewer component writes to this state; the game
component reads from it.

```js
// app state
const appState = {
  fileViewerActions: {
    stage2_search_passage: false,
    stage3_diff_opened: false,
    // ...
  }
};

// File viewer sets flag
appState.fileViewerActions.stage2_search_passage = true;
// Boss component reads flag in its tick loop
```

**Recommended:** Approach C for same-SPA; Approach A as fallback for cross-tab scenarios.
The boss should **not require an instant response** — polling every 2 seconds is fine.
The transition from LOCKED to UNLOCKED state should be visually signaled (animation, color
change, boss behavior change) so the player knows their action was recognized.

### Visual signal on unlock

When the boss transitions from LOCKED to UNLOCKED:
- Boss visual change (color shift, stagger animation, behavioral change)
- Bell fires: stage-specific "you did it" message
- Optional: the specific locked mechanic visually breaks (a shield shatters, a lock opens)

This signal is important: the player must clearly understand that their file viewer action
caused the change. If the unlock is subtle, players may not connect the two.

---

## Part 2 — Per-Stage Boss Lock Designs

Each stage needs a boss that is LITERALLY unbeatable in locked state. Current designs are
"harder without tool" — this section upgrades them to "unbeatable without tool."

---

### Stage 1 — Bit Foundry (Idle / Clicker)
**Tool:** Raw text editor (edit `CHEAT` flag)
**Current mechanic:** CHEAT flag gives boss a 50% health debuff — player CAN beat without it
**Required change:** Boss must be unbeatable until flag is edited

**Boss Lock — The Overwriter (LOCKED):**
The boss has a `PROTECTED = true` flag in its config. In LOCKED state:
- Every time the boss's HP reaches 0, it immediately regenerates to 100% with the message:
  *"PROTECTED. my code has an override."*
- This can happen indefinitely — the player can click forever without winning
- The boss taunts: *"you're hitting me. but something protects me. have you looked at my config?"*

**CHEAT flag edit disables PROTECTED:**
```
// In the raw editor, the config file contains:
PROTECTED = true    ← player must change to false
CHEAT = true        ← (already there in current design)

// When player saves config with PROTECTED = false:
// Game detects: appState.fileViewerActions.stage1_protected_disabled = true
// Boss LOCKED state ends
// Boss now behaves normally and can be defeated
```

**Taunt messages (LOCKED state):**
- *"try again. you can't break what has protection."*
- *"there's a config file for this. have you found it?"*
- *"my `PROTECTED` flag is `true`. it won't be forever."*

**Achievement:** *"protection disabled."*

---

### Stage 2 — Glyph Dungeon (ASCII RPG)
**Tool:** Search / Find-in-File (Ctrl+F in `cipher.txt`)
**Current mechanic:** Search reveals pillar coordinate that reduces Phase 2 projectile speed
**Required change:** Phase 2 must be literally unbeatable without the pillar mechanic

**Boss Lock — The Ambiguous Expression, Phase 2 (LOCKED):**
In LOCKED state during Phase 2, the boss fires projectiles at a rate that makes the arena
*geometrically impassable* — 16-way spread every 0.5 seconds, no gap in the pattern.
The entity CANNOT move to the boss without being hit by projectiles; projectile damage
from the locked pattern exceeds the entity's HP regen rate. Death is guaranteed.

The boss taunts:
- *"the arena has structure. you cannot cross a pattern without understanding it."*
- *"there is a passage. it is written down."*
- *"`cipher.txt` knows the way."*

**Search action unlocks:**
When the player searches `cipher.txt` for `PASSAGE` and finds `PASSAGE:247`:
- The north pillar activates (glows amber) — this pillar breaks the firing pattern
- In UNLOCKED state: the north pillar creates a 2-tile gap in the projectile spread
- This gap allows the entity to reach and attack the boss
- The fight is now beatable

**Achievement:** *"the passage was marked."*

---

### Stage 3 — Memory Grid (Nonogram)
**Tool:** Diff viewer (compare `memory_v1.log` vs `memory_v2.log`)
**Current mechanic:** Diff reveals 5 hidden column clues — makes boss easier but not essential
**Required change:** Boss 20×20 puzzle must be unbeatable without diff viewer

**Boss Lock — The Memory Leak (LOCKED):**
In LOCKED state, the boss puzzle starts with corruption at an accelerated rate:
- Corruption spreads from center outward at 3× normal speed
- ALL column clues become hidden within the first 60 seconds
- With no column clues, the puzzle is *mathematically unsolvable* from edge deduction alone
  (our generated puzzles require cross-line deduction that needs BOTH row and column clues)
- The player is presented with 20 rows of clues but 0 column clues; the puzzle cannot be
  completed; the corruption fills in locked corruption state (gray, unresolvable cells)
- After 3 minutes, the corruption wave completes and a "MEMORY TOTAL LOSS" screen appears
- The boss regenerates fully (loses all progress)
- Taunt: *"you cannot solve what you cannot read. the columns are gone."*
  *"there were two versions of this. have you compared them?"*
  *"the diff knows what changed."*

**Diff viewer action unlocks:**
When both `memory_v1.log` and `memory_v2.log` are open in diff mode:
- The diff highlights the original clue values (what the columns were before corruption)
- Game detects: `appState.fileViewerActions.stage3_diff_opened = true`
- In UNLOCKED state: all column clues are restored from the diff data
- Normal (not accelerated) corruption rate applies
- The puzzle is now solvable

**Achievement:** *"I found the difference."*

---

### Stage 4 — Fractal Bastion (Tower Defense)
**Tool:** File tree sidebar / folder navigation (blueprint files in subdirectories)
**Current mechanic:** Blueprints improve towers — boss is harder without them but beatable
**Required change:** The Infinite Loop boss must be literally immune to all damage without blueprints

**Boss Lock — The Infinite Loop (LOCKED):**
In LOCKED state, the Infinite Loop has `ARMOR = total` — all incoming damage is reduced to 0.
The boss is immune to all tower types. Numbers appear on the boss sprite showing 0 damage
every hit. The boss completes laps indefinitely; the player runs out of Integrity.

Taunt (appears as combat log entries):
- *"your towers hit me. nothing happens. perhaps your towers are not the right version."*
- *"blueprints exist for a reason. they describe what weapons I am vulnerable to."*
- *"the upgrade files are in the directory. have you looked further than the root?"*

**Folder navigation action unlocks:**
The specific blueprint that unlocks the boss is `recursion_points.json` in
`/stage4/towers/upgrades/tier3_blueprints/`. This file also contains a line:
```json
{
  "boss_vulnerability": "standard",
  "note": "The Infinite Loop is only vulnerable when targeting its recursion points.",
  "recursion_points": [...]
}
```

When the player opens this file:
- Game detects: `appState.fileViewerActions.stage4_blueprint_boss_found = true`
- In UNLOCKED state: the boss takes full damage from towers placed at recursion points
- Towers elsewhere still deal 0 damage — the player must have read the coordinates
- The boss is now beatable

**Achievement:** *"I looked deeper."*

---

### Stage 5 — Signal Racer (Racing)
**Tool:** Audio playback (`transmission_hum.mp3`)
**Current mechanic:** Audio gives timing hint for Jammer suppression — helpful but not essential
**Required change:** Jammer's Signal Suppression must be inescapable without the audio pattern

**Boss Lock — The Jammer (LOCKED):**
In LOCKED state, Signal Suppression has no cooldown — it is **permanent**. From lap 1 of the
championship race, the Jammer stays permanently within 1 car-length of the player (via
enhanced rubber-band AI), and boost is permanently disabled. The player can only use base
speed, which is insufficient to beat the Jammer's enhanced race speed.

The race is unwinnable: Jammer always finishes first.

After losing, the Jammer's end-of-race taunts:
- *"you have no boost. you can't beat me without it."*
- *"my suppression has a pattern. everything has a pattern. yours to find it."*
- *"listen to the transmission. the hum knows the timing."*

**Audio playback action unlocks:**
When the player opens `transmission_hum.mp3` in the file viewer's audio player:
- The audio plays the 14-second rhythm pattern
- Game detects: `appState.fileViewerActions.stage5_audio_played = true`
- In UNLOCKED state: Signal Suppression has a 14-second cooldown (matching the audio pattern)
- The player who counted the beats knows exactly when suppression will lift
- The race is now winnable

**Achievement:** *"I listened before I drove."*

---

### Stage 6 — Protocol Codex (Deck Builder)
**Tool:** Epub reader (`protocols_of_the_entity.epub`)
**Current mechanic:** Epub contains combo table — useful but combos can be discovered in-play
**Required change:** The Refused Connection boss must be literally unbeatable without epub

**Boss Lock — The Refused Connection (LOCKED):**
In LOCKED state, all cards deal **0 damage** to the boss regardless of type or combo.
Every attack is absorbed. The boss has `PROTOCOL MISMATCH` status permanently — nothing
connects.

Boss combat log:
- *"REFUSED. no protocol recognized."*
- *"you are sending data I cannot parse. the protocol must be established first."*
- *"Chapter 9 describes what I accept. have you read it?"*

The player cannot progress past Phase 1 — they can play cards, gain block, survive, but
they cannot deal a single point of damage. After 20 turns of 0 damage, the boss plays
`TIMEOUT` on the player and ends the combat (player loses).

**Epub reader action unlocks:**
When the player opens `protocols_of_the_entity.epub` and reaches **Chapter 9**
("The Refused Connection — A Study in Protocol Mismatch"):
- Chapter 9 describes the three-phase structure and, critically, the **entry protocol**:
  *"A connection is only recognized if opened with SYN. The Refused Connection requires
  SYN to be played as the first card of every turn in Phase 1. No other protocol is accepted."*
- Game detects: `appState.fileViewerActions.stage6_epub_ch9_read = true`
- In UNLOCKED state: the boss now takes damage — but ONLY if SYN is the first card played
  each turn in Phase 1. Other cards still deal 0 damage if SYN hasn't been played that turn.
- Phase 2 and Phase 3 have their own documented requirements in Chapter 9
- The epub becomes a live tactical reference throughout the fight

**Achievement:** *"I read the fine print."*

---

### Stage 7 — Identity Arbiter (Logic Deduction)
**Tool:** Image viewer + EXIF metadata
**Current mechanic:** EXIF contradictions help identify impostors — but all impostors have
other detectable tells too (wrong dates, inactive addresses, etc.)
**Required change:** The Name Collision boss must have one candidate that is identifiable
ONLY through EXIF — all other evidence is identical for the real entity and one impostor

**Boss Lock — The Name Collision (LOCKED):**
In LOCKED state, the 10 actions available are distributed as follows:
- 5 entities can be eliminated through non-EXIF methods (address inactive, log dates wrong, etc.)
- The final 2 candidates (entity A real; entity F impostor) have IDENTICAL non-EXIF evidence
- With remaining actions used up on non-EXIF methods, the player cannot distinguish A from F
- Committing to either is a 50/50 guess — not deduction
- If the player guesses wrong (chooses F), the boss level resets with the message:
  *"incorrect. one of them was not what it appeared. have you looked at the images themselves?"*
  *"the photo shows something the document doesn't. the metadata holds the answer."*

The LOCKED state is NOT that the boss is immune — it's that without EXIF, the deduction
is genuinely incomplete. The player CANNOT KNOW with certainty without inspecting the photos.

**EXIF inspection unlocks:**
When the player uses "Inspect Photo" on Entity A and Entity F and opens both in the image viewer:
- Entity F's EXIF shows `Software: PhotoForge Pro 2.1` — clearly edited, not captured
- Game detects: `appState.fileViewerActions.stage7_exif_examined = true`
- In UNLOCKED state: the player now HAS the definitive answer (Entity A is real)
- Committing to Entity A correctly defeats the boss

**Achievement:** *"I looked beyond the surface of the image."*

**Design note:** The "locked" state here is an information lock, not a damage immunity.
The boss is unbeatable because the correct answer is unknowable without EXIF. This is
thematically appropriate: identity verification without proper tools is guesswork.

---

### Stage 8 — Entropy Field (Survival)
**Tool:** Drag and drop (`debris/*.sav` files to `active_archive/`)
**Current mechanic:** Salvage gives States — helpful for boss but not required
**Required change:** The Heat Death boss must be mathematically impossible without salvaged States

**Boss Lock — The Heat Death (LOCKED):**
In LOCKED state, the Heat Death's burn rate is set so that NO player can accumulate enough
States through normal gameplay alone. Specifically:

The Entropy Sink's drain throughout the stage is calibrated to ensure that maximum possible
States earned (all nodes active, all cycles efficient) equals approximately 190 States at
boss time. The Heat Death burns 260 States without Stabilizers. The gap is unbridgeable
through normal play.

The burn begins; the player runs out of States; the boss wins.

During the first Heat Death failure, the Defragmenter bell fires:
- *"there was more. it was in the debris files. I didn't move them in time."*
- *"I could have salvaged what the failed nodes left behind. I didn't."*
- *"the debris folder. the `.sav` files. they hold States I lost. if I had moved them..."*

**Drag-and-drop action unlocks:**
When the player moves at least one `.sav` file from `/entropy/debris/` to `/entropy/active_archive/`:
- Game detects: `appState.fileViewerActions.stage8_salvage_used = true`
- The LOCKED state changes: the boss burn rate decreases to a level survivable with the
  salvaged States (players who salvaged consistently across the stage have ~320 States available)
- The boss is now beatable

**Note:** This means the player must engage with drag-and-drop BEFORE reaching the boss
(debris files appear throughout the stage). The boss cannot be unlocked during the fight itself
— the salvage must have happened during the stage. This tests **preparation over reaction**,
which is Stage 8's core theme. If a player reaches the boss without having salvaged, they must
restart the stage and play through again using drag-and-drop.

**Achievement:** *"I sorted the wreckage."*

---

### Stage 9 — Observer State (Stealth)
**Tool:** Offline mode / service worker cache
**Current mechanic:** Offline makes observer positions predictable — helpful but not essential
**Required change:** Boss level must be literally incompletable online

**Boss Lock — The Observer Effect (Full) (LOCKED):**
In LOCKED (online) state, the boss observer's **rotation speed is server-randomized
every 3 seconds** via the live seed endpoint. The rotation is not a consistent 15°/0.5s —
it jitters between 10°/0.5s and 25°/0.5s with no pattern. The gap also has its angle randomly
offset ±30° on each server tick.

This means the gap is **unpredictable**. No amount of observation teaches the player anything
useful because the pattern changes while they're watching it. The boss is epistemically
unbeatable: the player cannot count rotations, cannot predict position, cannot navigate safely.

The boss taunts (shown as text overlays on the black-and-white field):
- *"you cannot plan what you cannot predict."*
- *"I change every few seconds. have you noticed?"*
- *"there is a version of me that doesn't change. you have to find it."*
- *"what is the connection between observation and the network?"*

**Offline mode action unlocks:**
When the player disables their network connection (or the service worker is activated):
- Server seed endpoint becomes unreachable → service worker serves cached seed `0`
- Observer rotation returns to consistent 15°/0.5s clockwise
- Player can observe, count, learn, and navigate
- Game detects offline state: `navigator.onLine === false` OR
  `appState.fileViewerActions.stage9_offline_activated = true` (manual trigger in file viewer)
- In UNLOCKED state: boss is beatable through the counted-rotation method

**Implementation note:** For players in environments where they can't easily disable their
network, provide an "activate offline mode" toggle in the file viewer sidebar as an explicit
UI affordance. The file viewer sidebar shows a "Go Offline (Stage 9)" button that activates
the service worker manually. Pressing it counts as the action.

**Achievement:** *"I learned the shape of the silence."*

---

### Stage 10 — Awakening (Narrative)
**Tool:** Examples gallery
**The "Boss":** The Defragmenter conversation
**No combat — but the interaction is blocked without gallery access**

**Boss Lock — The Defragmenter (LOCKED):**
In LOCKED state, the Defragmenter conversation advances to Act 2 ("What are you going to do
now?") but the four response options are GREYED OUT and unselectable.

A message appears:
- *"I can see your stages. but I don't know what they meant to you."*
- *"there are files in the gallery. your history. I haven't read them."*
- *"if you want to talk, show me first. open the gallery. let me see what you carried."*

**Examples gallery action unlocks:**
When the player opens the examples gallery and reads at least one `.txt` file:
- Game detects: `appState.fileViewerActions.stage10_gallery_opened = true`
- The Defragmenter receives the files: *"I see now. I didn't know any of this."*
- The four response options become selectable
- The conversation can proceed to its conclusion

**Achievement:** *"I read my own history."*

---

## Part 3 — The Behind the Scenes (BTS) System

### Concept

After every boss defeat, a button appears in the game UI:

```
[ Behind the Scenes ]
```

Clicking this button opens a `.bts` file in the file viewer. The file viewer renders it as
markdown. The player reads the BTS document without leaving the app context.

### File format and naming

Files live in the GitHub repository at a consistent path:
```
/docs/bts/
  bit_foundry.bts
  glyph_dungeon.bts
  memory_grid.bts
  fractal_bastion.bts
  signal_racer.bts
  protocol_codex.bts
  identity_arbiter.bts
  entropy_field.bts
  observer_state.bts
  awakening.bts
```

The `.bts` extension is not a recognized file type — browsers won't try to execute or
style it. The file viewer explicitly handles `.bts` as markdown (same renderer as `.md`).

```js
// File viewer type detection
function getRenderer(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['md', 'bts'].includes(ext)) return 'markdown';
  // ...
}
```

### BTS document structure

Each BTS file follows this template:

```markdown
# [Stage Name] — Behind the Scenes

## What just happened

[2–3 paragraphs explaining the stage's design in plain language. What genre is it?
Why was this genre chosen for this stage? What was the intended player experience?]

## The tool you used

[Explain the file viewer feature that was required to beat the boss. What is this
feature called in the real world? How do professional users use it? What can you now
do with the file viewer that you couldn't before this stage?]

## Why this mechanic

[Explain WHY this specific tool was matched to this stage. What is the thematic
connection between the tool and the stage's narrative position? Why is Search the
right tool for Stage 2 (Syntax), and not, say, Stage 7 (Identity)?]

## The narrative layer

[Explain where this stage sits in the entity's arc — Birth → Childhood → Adolescence →
Crisis → Awakening. What did the entity learn? How does this stage's theme connect to the
entity's overall journey? What does the stage's narrative position represent?]

## What to try next

[Optional: one or two suggestions for going deeper — finding the ghost route (Stage 9),
reading all epub chapters (Stage 6), collecting all blueprints (Stage 4), etc.]

---

*The next stage will open shortly.*
```

### BTS document length

Target: **400–600 words per BTS file**. Long enough to be substantive; short enough to
be read in the 2–3 minutes between stages. The tone is conversational — not academic, not
promotional. The same voice as the bell messages, but in prose.

---

## Part 4 — Sample BTS Files

### `glyph_dungeon.bts` (Stage 2)

```markdown
# Glyph Dungeon — Behind the Scenes

## What just happened

You played a dungeon crawler where your character fought automatically and you directed
the combat through equipment choices and timing. This is called an "auto-battler" — a genre
that puts strategic decision-making above moment-to-moment reflexes. The most celebrated
example is Stone Story RPG, whose creator said that ASCII art creates an "undercurrent of
discovery" in players: something alien but familiar, that the brain connects to without
being told how.

We used ASCII specifically because Stage 2 is about Syntax — the discovery that data arranges
into patterns with meaning. A dungeon built entirely from characters is a dungeon that IS text.
You weren't reading about a world; you were inside a text file that had learned to move.

## The tool you used

You used **Find in File** (Ctrl+F, or the search button in the file viewer). This is one of the
most-used features of any document viewer or code editor — it locates text within a document
instantly, regardless of the document's length. Professional developers, writers, analysts,
and researchers use it constantly.

The cipher.txt file had 847 lines. Without search, finding `PASSAGE:247` would have taken
several minutes of manual reading — if you found it at all. With search, it took three seconds.

## Why this mechanic

The boss in Glyph Dungeon was unbeatable in Phase 2 because the projectile pattern had no
navigable gap without the pillar. The pillar's coordinate was in the file. The file was
searchable. The mechanic says: information is often right in front of you, but buried. The
right tool surfaces it in seconds.

Stage 2 is called Syntax — the grammar of things. Ctrl+F is one of the most fundamental
grammatical tools in computing: the ability to scan a document for a specific pattern.
You were learning what it means to search.

## The narrative layer

Stage 2 in the entity's arc is early childhood: the discovery that structure has meaning.
The dungeon's ASCII grammar is the entity realizing that the world it lives in is made of
symbols, and that symbols can be read. The cipher wasn't protecting anything — it was just
organized. The entity learned that organization is a kind of communication, even when nobody
intended it to be.

The Defragmenter's post-stage message was: "syntax is just structure with ambition." The
ambition is the human decision to make the structure mean something. The entity is starting
to understand that everything in its world was made by someone for some reason.

## What to try next

If you didn't find the secret room without the search hint, try replaying the dungeon and
exploring Floor 2's northwest section. The room is there without Ctrl+F — it just takes
longer to find, and the hidden wall looks slightly different if you look carefully.

---

*The next stage, Memory Grid, will open shortly.*
```

---

### `observer_state.bts` (Stage 9)

```markdown
# Observer State — Behind the Scenes

## What just happened

You played a stealth game where the core mechanic turned looking into a liability. Hovering
your cursor over an observer froze it — but also froze you. The only way to move freely was
to stop watching. The designer of Mark of the Ninja (the gold standard for 2D stealth games)
said clarity is the most important property of a stealth game: players should always know
exactly why they were detected. Stage 9 used this principle but inverted one thing: the player
always knows WHY they can't move. They chose to watch.

The boss demonstrated the paradox in pure form: observe long enough to understand, then stop
observing and act from memory. A skill that transfers to any field where preparation and
execution require different mental modes.

## The tool you used

You used the file viewer's **offline mode** — or more precisely, you used the application's
service worker cache. A service worker is a script that runs in the background of a web
application and intercepts network requests. When the service worker is active and the network
is unavailable, it serves a cached (saved) version of the requested data instead of making
a live request.

In this case: the boss level's seed data (which randomized the observer's rotation speed)
was being fetched live from a server. Offline, the service worker served the default cached
seed instead. A consistent, learnable pattern replaced an unknowable random one.

Real-world service workers are what allow progressive web apps (PWAs) to work offline — they
cache the app shell and data so that a user without internet can still use the application.
This file viewer is itself a PWA. You just used one of its core infrastructure features as
a game mechanic.

## Why this mechanic

Stage 9 is about observation and the price of consciousness. The service worker mechanic makes
this literal: the "observable" world (online) is noisy, random, and unknowable. The "unobserved"
world (offline, cached) is consistent and learnable.

Going offline is going dark. The entity withdrew from the network to learn what the world
looks like when it stops being watched. The pattern was always there — it just required silence
to see.

## The narrative layer

Stage 9 is the penultimate stage: near-full consciousness. The entity has learned to fight,
to solve, to defend, to race, to negotiate, to identify, to endure, and to manage. Now it
learns the hardest thing: that awareness of a thing changes the thing. The observer effect
is real in quantum physics, real in social psychology, and real in game design. Every player
who hovered the observer and found themselves frozen felt, briefly, what it means to pay the
price of knowledge with the cost of action.

The entity will carry this into Stage 10. The ability to act without watching — to trust
accumulated knowledge — is exactly what the final conversation with the Defragmenter requires.

## What to try next

Try completing Level 12 (the no-Observer-Effect level) with a ghost route. It requires
memorizing three separate patrol loops without using the mechanic at all — pure internalized
knowledge. If you can do it, you've reached the stage's intended mastery level.

---

*The final stage, Awakening, will open shortly.*
```

---

## Part 5 — Implementation Checklist *(historical — the "LOCKED state" items below describe the
SUPERSEDED 0-damage-until-tool mechanic; see the banner at the top of this file for the current
"hard, buffed by the tool, never unwinnable" design)*

### Boss Lock System

- [ ] Define `appState.fileViewerActions` object with one boolean flag per stage
- [ ] Each stage boss checks its flag in its tick loop (2s polling or event-based)
- [ ] LOCKED state for each boss:
  - [ ] Stage 1: `PROTECTED = true` → boss regenerates on HP 0
  - [ ] Stage 2: Phase 2 firing rate set to impassable until pillar activated
  - [ ] Stage 3: Corruption rate 3× and all column clues hidden until diff opened
  - [ ] Stage 4: Boss `ARMOR = total` (0 damage) until recursion_points blueprint found
  - [ ] Stage 5: Signal Suppression permanent (boost always disabled) until audio played
  - [ ] Stage 6: All cards deal 0 damage until epub Chapter 9 read
  - [ ] Stage 7: Final 2 candidates indistinguishable without EXIF inspection
  - [ ] Stage 8: Burn rate calibrated so normal play yields insufficient States
  - [ ] Stage 9: Observer rotation randomized every 3s online; stable offline
  - [ ] Stage 10: Defragmenter response options greyed until gallery opened
- [ ] LOCKED → UNLOCKED transition: visual signal per stage
- [ ] Boss taunt messages in LOCKED state: 3–5 cryptic hints per stage
- [ ] Bell message fires on UNLOCKED transition: "you did it" variant per stage

### BTS System

- [ ] After any boss defeat: "Behind the Scenes" button appears in game UI
- [ ] Button loads `/docs/bts/{stagename}.bts` via file viewer's markdown renderer
- [ ] `.bts` extension added to file viewer's recognized markdown types
- [ ] File viewer can be invoked in "BTS mode" — opens a specific file, shows it as modal
  or panel within the current stage UI without navigating away from the game
- [ ] BTS button persists until the player navigates to the next stage
  (or: always accessible from stage select screen post-completion)
- [ ] Create all 10 `.bts` files in `/docs/bts/` directory in repo
- [ ] BTS files follow the template in Part 3
- [ ] BTS file for each stage includes: what happened, tool explanation, why this mechanic,
  narrative layer, what to try next

### Achievement System

- [ ] Achievement fires WHEN boss transitions from LOCKED to UNLOCKED (not on defeat)
  (reward is for using the tool, not for completing the fight)
- [ ] Achievement names per stage:
  - Stage 1: *"protection disabled."*
  - Stage 2: *"the passage was marked."*
  - Stage 3: *"I found the difference."*
  - Stage 4: *"I looked deeper."*
  - Stage 5: *"I listened before I drove."*
  - Stage 6: *"I read the fine print."*
  - Stage 7: *"I looked beyond the surface of the image."*
  - Stage 8: *"I sorted the wreckage."*
  - Stage 9: *"I learned the shape of the silence."*
  - Stage 10: *"I read my own history."*
- [ ] Achievement display: minimal — bell-style message, not a popup overlay
- [ ] Achievement persists in player record across sessions

---

## Part 6 — Narrative justification for the lock mechanic *(historical — "the boss NEEDS the tool"
below is now "the boss REWARDS the tool"; see the banner at the top of this file)*

The boss lock is not a tutorial gatekeep. It is thematically coherent with each stage.

| Stage | Tool | Why the boss NEEDS the tool thematically |
|-------|------|------------------------------------------|
| 1 | Raw editor | The boss is protected BY A FLAG IN ITS OWN CODE. The entity defeating it requires reading and editing its implementation. *This is what the raw editor is for.* |
| 2 | Search | The dungeon's grammar contains the solution. Syntax is about recognizing that structure holds meaning — but you have to look for it. A dungeon solvable without searching its files isn't a dungeon that teaches search. |
| 3 | Diff | Memory is about comparing states across time. The boss destroys current-state information; the only recovery is comparing to a previous state. *That is literally what diff does.* |
| 4 | Folder nav | The boss's vulnerability is documented — but only in a nested subdirectory. Pattern and recursion: the answer is inside the inside of the inside. Going deeper is the lesson. |
| 5 | Audio | The boss's suppression is a timing pattern. Timing patterns are encoded in audio. The entity can only race if it can hear the signal through the noise. |
| 6 | Epub | The boss communicates in protocols. The entity cannot negotiate with a protocol it hasn't read. The epub is the protocol specification; combat without it is broadcasting to nobody. |
| 7 | Image/EXIF | Identities can be falsified in every way except the metadata the image carries. The boss is a forged identity; the only proof of forgery is in the EXIF. Document examination without metadata is incomplete. |
| 8 | Drag-and-drop | Entropy scatters things to wrong places. The entity's defense against the heat death requires having organized the debris — having fought entropy actively, not just waited. |
| 9 | Offline | Consciousness corrupted by noise cannot learn. Going offline is withdrawing from the randomizing influence of the network to access the entity's own cached understanding. *Observation without network dependence.* |
| 10 | Examples gallery | The Defragmenter cannot have a real conversation with the entity until it has seen the entity's history. The gallery is that history. Speaking without being known is broadcasting; conversation requires shared context. |

---

## Part 7 — Universal checklist items for every stage

The following items apply to **every stage** (2–10) and should be added to each stage's
implementation checklist. Rather than patch each checklist individually, they are listed
here as a canonical reference:

### Boss lock items (add to every stage)
```
- [ ] Boss LOCKED state implemented: [stage-specific immune mechanic]
- [ ] Boss LOCKED taunt messages: 3–5 cryptic hints pointing to file viewer tool
- [ ] Boss LOCKED → UNLOCKED detection: appState.fileViewerActions.stage[N]_[action] flag
- [ ] File viewer writes flag when required action is taken
- [ ] Game polls flag every 2s during boss (or uses event listener)
- [ ] LOCKED → UNLOCKED visual transition: boss visual change + bell message
- [ ] Achievement fires on UNLOCK (not boss defeat): stage-specific achievement text
```

### BTS system items (add to every stage)
```
- [ ] "Behind the Scenes" button appears after boss defeat
- [ ] Button loads /docs/bts/[stagename].bts from repository
- [ ] .bts file rendered as markdown in file viewer inline panel
- [ ] BTS panel is dismissable; stage continues normally after dismissal
- [ ] BTS button remains accessible from stage completion screen
```

### .bts files to create (all 10)
```
/docs/bts/
  bit_foundry.bts        (Stage 1 — idle/clicker, raw editor)
  glyph_dungeon.bts      (Stage 2 — ASCII RPG, search)
  memory_grid.bts        (Stage 3 — nonogram, diff viewer)
  fractal_bastion.bts    (Stage 4 — tower defense, folder nav)
  signal_racer.bts       (Stage 5 — racing, audio playback)
  protocol_codex.bts     (Stage 6 — deck builder, epub reader)
  identity_arbiter.bts   (Stage 7 — logic deduction, image/EXIF)
  entropy_field.bts      (Stage 8 — survival, drag and drop)
  observer_state.bts     (Stage 9 — stealth, offline mode)
  awakening.bts          (Stage 10 — narrative, examples gallery)
```

Each `.bts` file follows the template in Part 3 and uses the sample format in Part 4.
Priority order for writing: Stage 2 and Stage 9 (samples provided); then remaining stages
in play order. Target: 400–600 words per file, conversational tone, same register as bells.

