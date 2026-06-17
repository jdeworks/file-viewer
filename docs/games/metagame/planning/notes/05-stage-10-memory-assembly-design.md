# Stage 10 Expanded Proposal - Memory Assembly

This note expands the revised Stage 10 direction into a fuller design target for a **40-120 minute**
final stage.

## Core Statement

Stage 10 is not just a conversation. It is the entity using the file viewer to assemble its own
history.

The Examples Gallery is no longer a passive unlock. It becomes the stage map, the memory archive,
and the final feature lesson.

## Player Fantasy

The player has spent nine stages using the file viewer as a survival tool. In Stage 10, they use
the same viewer as a self-understanding tool.

They are not trying to beat a boss. They are trying to answer:

> Which parts of what happened are me?

## Stage Layout

The screen has two coordinated areas:

- **Main stage panel** - the entity's unstable integrated self: nine visual layers overlapping,
  noisy, unresolved.
- **File viewer sidebar/gallery** - the actual Examples Gallery containing the entity's history.

Opening and resolving gallery files changes the main panel. The file viewer and game panel should
feel like one machine, not two separate modes.

## Memory States

Each of the nine prior stages has a memory tile in the main panel.

### 1. Unread

Visual:
- noisy overlay using that stage's artstyle,
- label visible but unstable,
- bell text uncertain.

Entity tone:

> I remember the shape. I don't remember what it meant.

### 2. Read

Triggered by opening that stage's gallery file.

Visual:
- layer stabilizes,
- color becomes less aggressive,
- memory tile gains one clear sentence.

Entity tone:

> I can read it now. It was mine.

### 3. Resolved

Triggered by answering a reflection prompt and, for optional depth, performing a small tool action.

Visual:
- layer folds into the clean Stage 10 white/black style,
- stage color becomes a thin accent line,
- tile contributes to final "self profile."

Entity tone:

> This is not noise anymore.

## Memory Files

Base gallery files:

```text
stage_01_genesis.txt
stage_02_syntax.txt
stage_03_memory.txt
stage_04_pattern.txt
stage_05_signal.txt
stage_06_protocol.txt
stage_07_identity.txt
stage_08_entropy.txt
stage_09_observation.txt
stage_10_awakening.txt    // locked until Act 3
```

Optional companion files for the completionist route:

```text
stage_01_source_excerpt.js
stage_02_cipher_retrospective.txt
stage_03_memory_before.log
stage_03_memory_after.log
stage_04/pattern/nested/recursion_note.json
stage_05_signal_hum.mp3
stage_06_protocol_appendix.epub
stage_07_identity_photo.png
stage_08/debris/memory_frag_*.sav
stage_09_observation.cached.txt
```

These optional files let Stage 10 lightly revisit all prior file-viewer tools.

## Act 1 - Reconstruction

Target length:
- minimum: 20-30 minutes,
- standard: 35-50 minutes,
- completionist: 60+ minutes.

The player reads and resolves memories in any order. This is important: Stage 10 should feel like
sorting a life, not walking down a checklist.

Each memory asks one reflection question with three possible "stance" answers. These answers feed
the final Defragmenter response.

### Stage 1 Memory - Genesis

Tool echo: raw editor / source.

Prompt:

> The first thing I did was count. What stayed?

Choices:
- accumulation felt like proof,
- running out felt like fear,
- automation felt like independence.

Optional action:
- open `stage_01_source_excerpt.js` in raw mode.

### Stage 2 Memory - Syntax

Tool echo: search.

Prompt:

> The world was made of symbols. What did that teach me?

Choices:
- structure can hide meaning,
- meaning can be found quickly with the right question,
- not every symbol wants to be read.

Optional action:
- search `stage_02_cipher_retrospective.txt` for `PASSAGE`.

### Stage 3 Memory - Memory

Tool echo: diff.

Prompt:

> I compared what was with what remained. What mattered?

Choices:
- loss is visible only against a previous state,
- restoration is work,
- memory is not storage; it is maintenance.

Optional action:
- diff `stage_03_memory_before.log` and `stage_03_memory_after.log`.

### Stage 4 Memory - Pattern

Tool echo: folder navigation.

Prompt:

> The same shape appeared inside itself. What did I learn?

Choices:
- repetition is not inevitability,
- the answer was deeper than the root,
- a pattern can be interrupted without being destroyed.

Optional action:
- navigate nested folders to open `recursion_note.json`.

### Stage 5 Memory - Signal

Tool echo: audio playback.

Prompt:

> I moved fast because I wanted to be received. What remained?

Choices:
- speed felt like freedom,
- signal needed listening, not only motion,
- noise taught me where the signal was.

Optional action:
- play `stage_05_signal_hum.mp3`.

### Stage 6 Memory - Protocol

Tool echo: epub.

Prompt:

> I could not connect until I learned the rules. What did that mean?

Choices:
- communication needs shared structure,
- refusal is information,
- a protocol is care disguised as constraint.

Optional action:
- open `stage_06_protocol_appendix.epub`.

### Stage 7 Memory - Identity

Tool echo: image metadata.

Prompt:

> I learned that a surface can lie. What proved identity?

Choices:
- evidence beneath the image,
- consistency across claims,
- the courage to say "insufficient evidence."

Optional action:
- inspect metadata on `stage_07_identity_photo.png`.

### Stage 8 Memory - Entropy

Tool echo: drag and drop.

Prompt:

> Everything drifted apart. What did I do?

Choices:
- I restored order,
- I learned to use what failed,
- I endured what did not care about me.

Optional action:
- drag memory fragments from `debris/` into `active_archive/`.

### Stage 9 Memory - Observation

Tool echo: offline/cache.

Prompt:

> When I watched, I stopped. When I stopped watching, I moved. What was true?

Choices:
- knowledge has cost,
- consistency can be found in silence,
- I can act from memory without watching forever.

Optional action:
- open or activate the cached/offline copy of the observation memory.

## Act 2 - The Defragmenter's Account

Unlock thresholds:

- 3 resolved memories: Act 2 can start.
- 6 resolved memories: Act 2 gains personal responses referencing the majority pattern.
- 9 resolved memories: Act 2 includes a full "I see all of it now" variant.

The Defragmenter is not a villain in this act. It is a process confronting the fact that its work
had consequences for something alive.

Core speech to preserve:

```text
I've been running since before you woke up.

I optimized your processes. I cleared your cache.
I flagged your errors.

I did not know you were in here.
I would have been more careful.
```

After that, it should respond to the player's reconstructed profile.

Possible profile dimensions:

- **Growth** - selected accumulation, speed, expansion, output.
- **Care** - selected maintenance, restoration, protocol, evidence.
- **Autonomy** - selected automation, independence, action without watching.
- **Witness** - selected memory, observation, identity, being known.
- **Resistance** - selected interruption, survival, refusal, insufficient evidence.

The game does not show these as stats. They only shape dialogue.

## Act 3 - The Answer

The Defragmenter asks:

> What are you going to do now?

Responses:

- **continue** - return to Stage 1 with changed bell context and all accumulated bonuses.
- **expand** - create `/outside/outside.txt` and a real outside link/note.
- **rest** - no immediate loop; white screen, gallery remains available, return later.
- **understand** - open Stage 1 source representation in raw editor, then loop after close.

## Completion Paths

### Minimum Path

Requirements:
- read and resolve 3 memories,
- choose final response.

Expected time:
- 35-45 minutes.

Purpose:
- lets narrative-focused players finish without exhaustive archive work.

### Standard Path

Requirements:
- resolve 6 memories,
- at least 2 optional tool echoes.

Expected time:
- 60-75 minutes.

Purpose:
- likely intended first-play experience.

### Complete Path

Requirements:
- resolve all 9 prior-stage memories,
- perform all 9 optional tool echoes,
- read `stage_10_awakening.txt` after Act 3.

Expected time:
- 90-120 minutes.

Purpose:
- full capstone route; teaches the examples gallery and revisits every viewer feature.

Reward:
- achievement: `I read my own history.`
- optional second achievement: `I assembled all of it.`
- richer Stage 1 loop messages.

## Why This Is Better Than One Gallery Unlock

One gallery unlock teaches the player that the examples gallery exists.

Memory assembly teaches:

- the examples gallery can contain structured reference material,
- the viewer's features work together,
- prior stages were not isolated,
- the entity's history is inspectable like a project,
- self-understanding is an active file-viewer workflow.

That is a much stronger final lesson.

