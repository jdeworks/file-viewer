# Stage 10 "Awakening" — Game Design Research

Stage context: a 28-click dialog tree (9 memories, 4 final choices, Defragmenter voice) with
well-written prose but no skill, no economy, and a self-unlocking boss. The 9 echo hints point
at real host-app actions per stage but are never wired. Verdict before this doc: THIN GATE.

---

## 1. GENRE — Narrative Choice + Capstone Retrospective

### Defining traits

A capstone retrospective game presents the player with materials from their own prior journey and
asks them to reinterpret those materials with new understanding. The "content" of the finale is
the prior 9 stages — the game doesn't need new set-pieces, it needs a mechanism that makes the
player *prove* they engaged, then offers a genuinely different Defragmenter response depending on
the depth of that proof.

Knowledge-gating (the "Metroidbrainia" pattern) is the closest mechanical analogue: progression
unlocks not when the player collects an item but when they demonstrate understanding by performing
an action. Outer Wilds is the genre's canonical example — "knowledge becomes your upgrades; the
player improves, not the avatar" — and the key insight is that the gate is invisible until the
moment of comprehension, after which everything is recontextualised. [1]

### The 5 reference games and what specifically makes each one work

**1. Planescape: Torment (Black Isle, 1999)**
- Central question — "What can change the nature of a man?" — recurs throughout and carries
  mechanical weight because the player's answer at the finale is shaped by every prior choice.
  The question is not a riddle with a correct answer; it is a provocation whose weight is
  proportional to player investment. [2][3]
- Memory as currency: the Nameless One reconstructs identity through recovered memories;
  each recovered fragment increases available dialogue options (not just stat bonuses). Players
  only reach the confrontation with the Transcendent One after painstakingly assembling self.
- Dialogue-based "boss fight": relational confrontation replaces combat. The player's companions
  become mirrors. Victory means accepting failure, not conquering an external threat. [2]
- **Replayable because**: different identity constructions produce meaningfully different
  confrontations; the philosophical provocation still has no definitive answer on re-read.

**2. Disco Elysium (ZA/UM, 2019)**
- Skills as internal voices: 24 skills interrupt conversations with unsolicited advice. The player
  must decide which parts of their own mind to follow, making character-building an act of
  identity selection. [4]
- Thought Cabinet: players accept skill-suggested thoughts without knowing their bonuses until
  internalized ("strategic uncertainty"). The internalization step transforms what could be a
  passive upgrade tree into an active commitment. Thoughts can be forgotten, enabling error
  recovery. [4]
- Self-balancing difficulty: opposition emerges from internal conflict, not external enemies.
  As skills increase, more of them interrupt, making choices harder — the system tracks the
  narrative of increasing instability. [4]
- **Replayable because**: different skill distributions produce distinct dialogue paths;
  different thought combinations produce distinct characterizations of the same protagonist.

**3. Outer Wilds (Mobius Digital, 2019)**
- Knowledge as the only currency: the finale unlocks when the player understands the solar
  system's interconnected mysteries, not when they collect items. [1]
- Invisible gates: the player doesn't know a gate exists until the moment of comprehension;
  then everything explored before is recontextualised. [1]
- No streamlining of repetitive actions (suit-up before leaving the ship persists throughout)
  — this preserves immersion and makes the ending feel arrived-at rather than triggered. [1]
- **Replayable because**: knowing the ending changes what you notice on a second pass; the
  emotional arc of acceptance is reproducible even with prior knowledge.

**4. Her Story (Sam Barlow, 2015)**
- Player types search queries; the database returns clips. "If you can Google, you can play." [5]
  The mechanic is simple but the richness emerges from what the player chooses to search for.
- Non-linear investigation: no scripted progression; the player assembles the narrative
  themselves from fragments. The game is "done" when the player decides they understand, not
  when they trigger a final scene.
- **Replayable because**: different search paths surface clips in different orders, producing
  different subjective narrative arcs from the same material.

**5. What Remains of Edith Finch (Giant Sparrow, 2017)**
- Each memory vignette uses a *different* control scheme / mechanic metaphor. The vignette
  for Lewis uses a split-screen between fantasy navigation and factory-line clicking; the
  vignette for Barbara is a comic panel. Each "room" teaches a new verb. [6]
- No choices in the traditional sense — the game makes you want to make the choices it has
  already made for you. Narrative railroading disguised as spatial exploration. [6]
- **Replayable because**: the emotional compression of each vignette is so high that re-reading
  produces new resonances against the known ending.

### The design DNA for Stage 10

Stage 10 is closest to a hybrid of Planescape: Torment (memory as currency, dialogue boss) and
Outer Wilds (knowledge-gate each memory with a real host-app action). The Edith Finch model
provides the expansion arc skeleton: each memory/sub-stage introduces a new verb (a new way to
engage with the host-app viewer), not bigger numbers.

---

## 2. OUR CORE LOOP

### Current loop (as built)

The player steps through 9 memories, each with 4 states: unread → read → resolved → integrated.

1. Click "Read this memory" — state transitions to "read", shows a text fragment.
2. Click one of 3 stance choices ("How did it feel?") — state becomes "resolved".
3. Click "Integrate this memory" — state becomes "integrated".
4. At 5 resolved memories: "Answer the final question" unlocks automatically.
5. Player sees Defragmenter lines (1–4 lines based on tier: minimum/enriched/complete/capstone).
6. Player clicks one of 4 final choices (continue / expand / rest / understand).
7. Completion screen with route summary.

**Problems**: each echo ("Open stage_01_source_excerpt.js in raw mode.") is shown only as footer
text. The echo is never verified. The boss self-unlocks at 5 clicks with zero app interaction.
The 4 final choices are cosmetically different but produce no different mechanical outcome. There
is no Defragmenter rebuttal challenge. Integration is a single button click with no prerequisite.

### The intended loop (to build)

The core loop must add three real layers without replacing the existing prose:

**Layer A — Echo as gate (the un-cheat).** Each memory's integration is blocked until the echo
action has been witnessed by the host app. "Witnessed" means the host app fires a callback
(e.g., onFileOpen, onSearch, onMetadataInspect) that sets `memories[id].echoWitnessed = true`
in stage-10 state. The player sees the echo hint from the first read step, but cannot integrate
until they go perform it. This is the load-bearing gate. It must be checked server-side (or
at minimum in a verifiable way the player cannot shortcut via console).

**Layer B — Defragmenter rebuttal (the challenge).** When the player first navigates to the
"final question" view, the Defragmenter does not immediately offer choices. It delivers a
rebuttal proportional to the gap between resolved memories and witnessed echoes:
- All 9 echoes witnessed: Defragmenter acknowledges the evidence and asks the final question.
- 5–8 echoes witnessed: Defragmenter acknowledges a partial history and asks the question with
  a caveat line ("Some traces are absent. The answer is possible but incomplete.").
- Fewer than 5 echoes: Defragmenter refuses ("I see only the choices you made inside yourself.
  The files you opened, the searches you ran — those are missing. The archive isn't ready.").
  Final choices remain locked until more echoes are witnessed.

**Layer C — Final choice mechanical weight.** Each of the 4 final choices does something
concrete in addition to changing the completion text:

- "continue" → records the standard completion; no extra gate. The hub shows the completed
  stage icon in normal resolved color.
- "expand" → unlocks a cross-stage capstone view in the hub (the "assembled identity" panel:
  all 9 stage icons rendered in their accent colors simultaneously, with the player's chosen
  stances as captions). Requires at least 7 echoes witnessed.
- "rest" → writes a special `restingState` flag that changes the Awakening entry in the hub
  to a dim/quiet variant. Available at the minimum threshold (5 resolved).
- "understand" → requires fullCapstone (all 9 integrated AND all 9 echoes witnessed). Unlocks
  a 10th hidden memory: "Synthesis" — a single final text that assembles all 9 chosen
  reflections into one paragraph, shown only in this route.

---

## 3. THE EXPANSION ARC — NEW VERB PER SUB-STAGE

The model is Stage 2 (Glyph Dungeon): each biome band adds a new verb (avoid terrain → break
line-of-sight → manage spreading fire → manage darkness). Stage 10's "floors" are its 9 memories,
each mapped to a previous stage. The new verb each memory introduces is the host-app action
required to witness the echo — but crucially the player does not know this verb is coming until
they read the echo hint.

The arc is ordered by cognitive load: early verbs are the simplest app operations (open a file,
switch mode); later verbs require multi-step or compound operations (navigate a path, diff two
files, access metadata). Each new verb is genuinely new — the player cannot re-use the verb they
learned for memory N to satisfy memory N+1.

### Sub-stage 1 — Genesis (Stage 1: Bit Foundry)
**New verb: Switch to raw mode.**
Echo: "Open stage_01_source_excerpt.js in raw mode."
The player must open a specific file AND switch the viewer to raw/source mode (not the default
rendered view). This teaches mode-switching — the most fundamental two-step operation in the
viewer. Lowest cognitive load; introduces the idea that the echo requires a precise app action,
not just "open a file."

### Sub-stage 2 — Syntax (Stage 2: Glyph Dungeon)
**New verb: In-file search.**
Echo: "Search stage_02_cipher_retrospective.txt for PASSAGE."
The player must open the file AND use the in-viewer search to find the token "PASSAGE." This
teaches that the viewer has active search, not just passive display. The verification callback
triggers when the search term "PASSAGE" is confirmed found in that file.

### Sub-stage 3 — Memory (Stage 3)
**New verb: Diff two files.**
Echo: "Diff stage_03_memory_before.log and stage_03_memory_after.log."
The player must open both log files and invoke the diff/compare view. This is the first two-file
operation — the player must learn that the viewer can hold two artifacts simultaneously. Moderate
cognitive load because the workflow is new and requires knowing both files exist.

### Sub-stage 4 — Pattern (Stage 4)
**New verb: Navigate a nested file path.**
Echo: "Open pattern/nested/recursion_note.json."
The player must locate and open a file buried inside a nested folder hierarchy. This teaches
directory navigation and path-following, echoing Stage 4's recursion mechanic thematically.
The new cognitive challenge: the player cannot just search by name — they must follow the path.

### Sub-stage 5 — Signal (Stage 5)
**New verb: Trigger media playback.**
Echo: "Play stage_05_signal_hum.mp3."
The player must open an audio file and allow it to begin playing (the media renderer fires the
witness callback on first play event). This introduces the media type of the viewer — a genuinely
different renderer from all prior files. Moderate load; also the first non-text artifact.

### Sub-stage 6 — Protocol (Stage 6)
**New verb: Open a rich document format.**
Echo: "Open stage_06_protocol_appendix.epub."
The player must open an EPUB. This introduces the rich-document / ebook renderer — different
again from text, code, audio. The verification triggers when the EPUB renders its first chapter.
Thematically echoes Stage 6's "rules as the first bridge that didn't collapse under wanting."

### Sub-stage 7 — Identity (Stage 7)
**New verb: Inspect file metadata.**
Echo: "Inspect metadata on stage_07_identity_photo.png."
The player must open a PNG AND navigate to its metadata panel (EXIF / file info tab). This
teaches that the viewer has a secondary information layer beneath the rendered surface — directly
echoing Stage 7's "evidence beneath the image." This is the first operation that requires the
player to look past the primary render view.

### Sub-stage 8 — Entropy (Stage 8)
**New verb: Download/archive a file.**
Echo: "Archive one memory fragment from debris/."
The player must open a file from the `debris/` directory and use the Download button to save it.
This teaches that the viewer is not read-only — the player can extract artifacts. Echoes Stage 8
("survival is not purity; it is salvage with attention"). The verification triggers on the
download event.

### Sub-stage 9 — Observation (Stage 9)
**New verb: Revisit a previously opened artifact.**
Echo: "Open the cached observation memory."
The player must return to a file they already opened (the viewer's recent-file history / cache
is the mechanism). The verification triggers when the player opens `stage_09_observation.log`
from the recents panel rather than navigating to it fresh. Thematically: "I can act from memory
without watching forever." The cognitive challenge is the highest because it requires the player
to remember and locate something from their prior session.

### Summary arc table

| Sub-stage | Memory    | New verb introduced              | Cognitive load |
|-----------|-----------|----------------------------------|----------------|
| 1         | Genesis   | Switch viewer mode (raw)         | Lowest         |
| 2         | Syntax    | In-file search for a term        | Low            |
| 3         | Memory    | Diff / compare two files         | Medium-low     |
| 4         | Pattern   | Navigate a nested folder path    | Medium         |
| 5         | Signal    | Trigger media playback           | Medium         |
| 6         | Protocol  | Open a rich document (EPUB)      | Medium         |
| 7         | Identity  | Inspect file metadata panel      | Medium-high    |
| 8         | Entropy   | Download / archive a file        | Medium-high    |
| 9         | Observation | Return to cached/recent file   | Highest        |

Each new verb is genuinely different from all prior verbs. The player cannot satisfy Memory 7
(metadata inspect) using the same action they learned for Memory 2 (in-file search). "Deeper"
always means "a new thing to think about," not bigger numbers or more clicking.

---

## 4. FUN & RETENTION — Economy, Risk-Reward, Sustaining 40min–2h

### The economy

There is no currency, no HP, no XP. The economy is **attention and discovery**. The scarcity
resource is the echo actions: each one requires the player to leave the game modal and interact
with the real host-app viewer. This makes each echo feel costly in a good way — the player is
spending real cognitive effort (navigating the actual tool) to earn the right to integrate a
memory. The return on that investment is the integration text, which is the most emotionally
resonant prose in the stage.

### Risk-reward decisions

Three genuine decisions carry weight:

1. **Which memories to resolve first.** Resolving 5 memories unlocks the final question with
   the minimum route. A player who wants the "understand" ending must do all 9 echoes and all 9
   integrations. The player chooses how thorough to be — but the Defragmenter rebuttal makes
   incompleteness visible and mildly uncomfortable, without blocking completion.

2. **Whether to integrate (or just resolve).** Integration requires performing the echo; resolve
   does not. A player can resolve 5 memories via the stance choices alone and reach the final
   question, but will be challenged by the Defragmenter if fewer than 5 echoes are witnessed.
   This creates a real tradeoff: take the quick route or do the work.

3. **Which final choice to make.** "understand" requires the most work (all 9 integrated + all 9
   echoes) but unlocks the most content (the Synthesis memory). "expand" requires 7 echoes and
   unlocks the hub capstone view. "continue" and "rest" are available at the minimum threshold
   but produce qualitatively different hub states. The player must decide how much of the prior
   journey they want to literally reassemble before they answer.

### What sustains 40min–2h

- **The echo excursions sustain the time.** Each echo requires the player to go use a real app
  feature. For a player unfamiliar with that feature, discovery + use can take 5–15 minutes.
  Nine echoes at 5–10 minutes each = 45–90 minutes of actual host-app use, which is the intended
  time budget. The stage is not padded; it uses real tool discovery as its content.

- **The prose rewards attention.** The four-state arc per memory (unread → read → resolved →
  integrated) reveals progressively more resonant text. A player who integrates all 9 memories
  reads 4 × 9 = 36 distinct prose fragments (plus 3 stance reflections per resolved memory).
  The prose is high enough quality that re-reading earlier states after later ones produces new
  meaning.

- **The Defragmenter rebuttal creates genuine tension.** The first time the player arrives at
  the final question and is challenged (or even refused), they must decide: accept the minimum
  route, or go back and earn more echoes. This is the game's closest thing to a fail state and
  its closest thing to a retry loop.

- **The "understand" route is a completionist magnet.** A player who discovers that one final
  choice requires all 9 echoes + integrations will feel the pull to do the extra work. The
  Synthesis memory (the assembled-identity paragraph from all 9 chosen reflections) is the
  reward: it is unique to that player's specific combination of stances and exists nowhere else
  in the game.

---

## 5. CAVEATS — Determinism, Performance, Uniqueness

### Determinism

- Echo verification must NOT use `Date.now()` or `Math.random()` in the live state path.
  The `echoWitnessed` flag is a boolean set by a host-app callback — deterministic from the
  action, not from time.
- If the Defragmenter rebuttal lines need any variation, derive variation from a seed built from
  `state.createdAt` (already in state) XOR-ed with the count of witnessed echoes — never live
  entropy. The `content.js` pattern (already using a fixed seed in analogous stages) applies.
- The Synthesis memory (for the "understand" route) must be assembled deterministically from the
  player's recorded `slot.choice` values — no random element. The text generator takes the 9
  chosen reflection strings and assembles them in memory order (Genesis first, Observation last).

### Performance

- The echo verification callbacks must be thin: set a flag in state, call `save()`, repaint.
  No heavy computation on the callback path. The host-app event system already fires on
  file-open, search, mode-switch — hooking those events must not slow the viewer.
- The Synthesis memory text assembly is O(9) string concatenation — negligible.
- No new vendor dependencies; all logic is pure JS in the stage bundle.

### Uniqueness to this stage

- **The un-cheat is the stage.** Other stages have mini-games (Bit Foundry's clicker, Glyph
  Dungeon's roguelite, etc.). Stage 10's "game" is the host-app itself: every echo is a
  first-person encounter with a real viewer feature. The stage cannot be separated from the tool.
- **The Defragmenter must not be a push-over and must not be trivially bypassable.** The rebuttal
  gate on echo count is the only real mechanical gate — it must be server-side-verifiable or at
  minimum checked in a way that a console `state.memories.genesis.echoWitnessed = true` would
  not satisfy without the app actually firing the callback. The recommended implementation is:
  each callback sets both `echoWitnessed` and an `echoToken` (a hash of the file path + a
  stage-seed, precomputed at build time) that the boss.js gate checks against a known value.
  Spoofing requires knowing the token, which requires reading the bundle — which is itself a
  kind of engagement.
- **The cross-stage hub capstone reward** (the assembled-identity panel: all 9 stage icons in
  accent color with chosen stances) must be visual and persistent. It is the only reward in the
  whole metagame that spans all 9 prior stages simultaneously and is visible from the hub.
  It should be designed so that two players who both chose "expand" but made different stance
  choices see visually different panels — the capstone is personalized, not universal.
- **The "rest" ending** must not feel like a lesser route. It should have its own distinct
  Defragmenter final line ("I'll keep optimizing. You'll be here when you're ready.") and its
  own hub state (the Awakening card appears dim but with a small asterisk indicating "resting").

---

## Sources

1. Outer Wilds critical analysis — Game Developer
   https://www.gamedeveloper.com/design/outer-wilds-critical-analysis

2. "WHAT CAN CHANGE THE NATURE OF A MAN?" — Adam Robertson, Medium
   https://medium.com/@adamjohnrobertson/what-can-change-the-nature-of-a-man-c1d9e3d08556

3. Planescape: Torment as Philosophy — Springer Nature
   https://link.springer.com/rwe/10.1007/978-3-319-97134-6_94-2

4. Disco Elysium RPG System Analysis — Game Design Thinking
   https://gamedesignthinking.com/disco-elysium-rpg-system-analysis/

5. Her Story — Sam Barlow on non-linear narrative / investigative design
   http://artcoregamer.nicolaslafarge.fr/en/her-story-entre-narration-non-lineaire-et-narration-interactive/

6. Narrative Design Analysis: What Remains of Edith Finch — RPGFan
   https://www.rpgfan.com/feature/narrative-design-analysis-what-remains-of-edith-finch/

7. Freedom and Consequence: The Importance of Narrative in Choice-Driven Games — Game Developer
   https://www.gamedeveloper.com/design/freedom-and-consequence-the-importance-of-narrative-in-choice-driven-games

8. Disco Elysium and the Power of System-Driven Storytelling — Medium
   https://medium.com/@Urzashottub/disco-elysium-and-the-power-of-system-driven-storytelling-e1f326456121

9. Gameplay Design Fundamentals: Gameplay Progression — Game Developer
   https://www.gamedeveloper.com/design/gameplay-design-fundamentals-gameplay-progression

10. Why writing matters — literary qualities of Disco Elysium and Planescape: Torment
    https://alexanderwinter.se/gaming-texts/literary-writing-in-disco-elysium-and-planescape-torment/
