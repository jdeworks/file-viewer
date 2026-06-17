# Stage 10 — 01: Narrative / Choice Game Genre Research

Reference research for the **Awakening** Stage 10 design. Developer-facing distillation of
narrative-first, mechanics-light game design: how the best "walking simulators," choice games,
and meta-narrative games create meaning without mechanical challenge. This stage is intentionally
the longest at 45–60 minutes (emotional processing time, not mechanical challenge time) and
designed as a culmination. Companion doc `stage10-02-our-game-design.md` maps this onto Stage 10.

---

## A. The seminal games and what each contributed

### Planescape: Torment (1999, Black Isle Studios)
The philosophical progenitor of narrative RPGs. Its central question — "What can change the
nature of a man?" — is asked repeatedly throughout and answered differently depending on the
player's choices. The Nameless One is amnesiac; reconstruction of identity IS the gameplay.

**Key design lessons:**
- **Question-as-game-mechanic.** Planescape's central question is not a puzzle with a solution;
  it is a framework for interpretation. The player's *answer* to the question changes how they
  experience the ending. Lesson: *a well-chosen question is better game design than a well-crafted answer.*
- **The character IS the world.** The Nameless One's past selves have shaped the world around
  him. The entities he meets are reflections of who he was. The world is not separate from the
  protagonist — it *is* the protagonist's history externalized.
- **Text as the primary medium.** Planescape trusted text. Millions of words. The gameplay
  is reading, thinking, responding. The mechanical systems (combat) are secondary, almost
  vestigial. Lesson: *the best narrative games are comfortable being literary.*

### Disco Elysium (2019, ZA/UM)
The contemporary heir to Planescape. Detective Harry Du Bois wakes with amnesia and must
reconstruct himself through conversations, choices, and the 24 "skills" that represent
different aspects of his psyche — each as a distinct inner voice.

**Key design lessons:**
- **Skills as characters.** The 24 skills actively speak to the player during conversations,
  offering options, observations, and sometimes bad advice. Lesson: *inner conflict as dialogue*
  is both dramatically compelling and mechanically distinctive — the character argues with himself.
- **Identity construction as progression.** In most RPGs, you choose a class and that determines
  your options. In Disco Elysium, your *behavior* constructs your identity — the world responds
  to who you're becoming, not who you declared you were at the start.
- **No "right" ideology.** The game presents communism, fascism, ultraliberalism, and more
  with equal narrative weight. No political path is coded as objectively correct.
  Lesson: *a mature narrative game can hold multiple worldviews without resolving them.*
- **Failure as narrative.** Failed skill checks don't end scenes — they produce different
  (often funnier, richer) dialogue. The game rewards failure. Lesson: *the outcome of a
  decision matters less than the texture of the decision itself.*

### The Stanley Parable (2013, William Pugh and Davey Wreden)
A game about the relationship between the player, the game, and the narrator. Stanley is an
office drone following instructions; the narrator is the game's voice; the player is neither
of them and both of them simultaneously.

**Key design lessons:**
- **The narrator as a character.** The narrator in The Stanley Parable is not an objective
  guide — it is a consciousness with its own desires, insecurities, and relationship to the
  player. Lesson: *narration is not delivery; it is characterization.*
- **Choice as illusion, examined.** The game has "choices" that all lead back to predetermined
  outcomes. But examining the illusion of choice is the game's point — the player feels more
  agency for having understood the constraint. Lesson: *revealing the structure doesn't
  undermine the experience; it enriches it.*
- **Multiple endings as the statement.** Experiencing all endings together makes the
  game's argument. No single ending is "the real one." Lesson: *when all paths matter
  equally, the journey rather than the destination carries the meaning.*

### The Beginner's Guide (2015, Davey Wreden)
A narrated tour of games created by a fictional developer named Coda. The narrator (a fictionalized
Wreden) confesses his relationship to Coda's work and gradually becomes unreliable. The player
realizes the game is *about* the narrator's projection onto Coda's work, not about the games.

**Key design lessons:**
- **Unreliable narrator as the twist.** The Beginner's Guide's "game" is the narrator, not the
  content being narrated. The player's act of interpretation is itself examined. Lesson:
  *a narrator who seems to understand the subject can be the most revealing subject themselves.*
- **Autobiography without autobiography.** The game is clearly personal but frames itself as
  being about someone else. This displacement creates emotional safety for both creator and
  audience. Lesson: *personal revelation disguised as analysis is more powerful than direct confession.*
- **The relationship between creator and player.** The game asks: what does a creator owe
  an audience? What does an audience project onto a creator? These questions don't resolve —
  they resonate. Lesson: *the best game endings leave questions louder, not quieter.*

### What Remains of Edith Finch (2017, Giant Sparrow)
Each room in the Finch house is a vignette — a different family member's story told in a
different mini-game genre. The macro-structure (exploring the house) ties together the micro-
structures (each vignette). The final revelation reframes everything.

**Key design lessons:**
- **Genre blending as emotional modulation.** Each vignette is mechanically different (a
  swinging child, a bathtub toy, a cannery assembly line). The genre shifts prevent any single
  emotional register from becoming comfortable. Lesson: *variety in mechanism creates variety
  in feeling — you can't go numb.*
- **The ordinary made extraordinary.** Edith Finch's deaths are mundane (bathtub, cannery,
  swing set) made magical through stylization. Lesson: *specificity of the domestic creates
  intimacy that epic scale cannot.*
- **The unreachable ending.** The player can never "save" any of the Finch family; the endings
  are always already determined. Playing out the deaths is acceptance, not intervention.
  Lesson: *some games are about witnessing, not affecting. This is a valid design choice.*

### Undertale (2015, Toby Fox) — brief contribution
The game knows it is a game and uses that knowledge to create genuine moral weight. Spare
monsters instead of killing them; the "pacifist" route requires seeing through the game's
mechanics to the characters inside. The game also has genuine consequence: doing a genocide
run marks your save file permanently.

**Key design lesson:**
- **Persistence of choices across runs.** Your decisions in Undertale don't reset cleanly.
  Lesson: *if you want choices to feel real, give them real weight by persisting their effects.*

### Gone Home (2013, The Fullbright Company)
Environmental storytelling: a house full of objects that collectively tell a story without any
cutscenes or dialogue. The player discovers the story by exploring physical space.

**Key design lesson:**
- **Objects as narrators.** Every physical object tells part of the story. The player builds
  the narrative from fragments. Lesson: *the act of assembly by the player creates investment
  that passive narration cannot achieve. The player feels they figured it out, not that they
  were told.*

---

## B. Core mechanics taxonomy for narrative games

### 1. The dialogue tree

The fundamental mechanic of choice games. A character speaks; the player selects a response
from 2–5 options; the character responds.

**Design principles:**
- Options should reflect meaningfully different *stances* (not just different ways of saying
  the same thing)
- At least one option should be clearly "wrong" from a social perspective but valid as a
  choice (for character expression)
- The response to a choice should acknowledge the *choice* not just move to the next beat
- Too many options are exhausting; too few are constraining. Three to four options is the
  design sweet spot for most conversations

**Avoiding false choices:** A false choice appears to offer agency but leads to identical
outcomes. False choices feel cheating unless they're *thematic* false choices (i.e., the
content is the same but the framing reflects the character's emotional state — what Disco
Elysium does brilliantly with failed skill checks).

### 2. Inner voice / commentary layer

Disco Elysium's inner skills as voices; Planescape Torment's thought bubbles; The Stanley
Parable's narrator. A second voice commenting on the player's choices, the world, or the
character themselves.

**Functions of inner voice:**
- Provide information the character would know but the player might not
- Create dramatic irony (character thinks X; player/audience knows not-X)
- Express the character's internal conflict independently of dialogue choices
- Change the emotional register of a scene without changing the content

**Our application:** The Defragmenter and the entity's bell messages have been the inner
voice throughout Stages 1–9. In Stage 10, the Defragmenter becomes a *dialogue partner*
— the inner voice externalizes and becomes a full character.

### 3. The "all endings are valid" design

The Stanley Parable and Disco Elysium both commit to this: no single ending is coded as
the "true" or "best" outcome. The player's choice is respected as their choice.

**Design requirements for this to work:**
- Each ending must feel *complete* — it should not feel like a "lesser" version of another ending
- The tone of each ending must differ but the emotional weight should be equivalent
- The player must understand that they have made a genuine choice, not that they failed to
  find the correct path

**The danger of meaningless branching:** If all endings are too similar, the choice is hollow.
The branches must genuinely diverge in emotional content (not just cosmetic content).

### 4. Earned closure

The most challenging thing to design: an ending that feels *earned*. What makes closure feel
earned vs. arbitrary?

**Conditions for earned closure:**
1. **Thematic consistency.** The ending reflects the game's central question back to the player.
2. **Character consistency.** The character behaves in keeping with who they've been shown to be.
3. **Mechanical consistency.** The ending uses the game's mechanics in a way that's native to them
   (a stealth game boss should test stealth; a narrative game's final challenge should test
   understanding, not reflexes).
4. **Emotional residue.** The ending leaves an emotion the player sits with — not a problem
   solved, but a feeling arrived at.
5. **Willingness to not resolve.** The best endings often leave something open. Planescape's
   answer to "what can change the nature of a man" is itself ambiguous. The question is better
   than the answer.

### 5. The "loop" structure (our unique choice)

Stage 10 ends with Stage 1 relaunching. This is the "loop" ending used by some games
(Dark Souls, Undertale's true ending, some Nier routes).

**Looping endings work when:**
- The first loop is genuinely different from the knowledge the player now has
- The loop is *acknowledged* in-world — not a silent repeat, but the character knows
- The repeat creates resonance rather than mere repetition — the player sees new meaning
  in familiar scenes

**Looping endings fail when:**
- The repeat is identical to the first run with no new content
- The loop feels like punishment (make the player do it again!) rather than recognition

Our Stage 10 loop is acknowledged: the entity knows it has been through this before. Bell
messages in Stage 1's second run are different. The entity re-reads its own history.

---

## C. Structural principles for endings

### The falling action problem

The "falling action" (events after the climax but before the true ending) is the hardest part
of narrative game design. After a climactic moment, energy deflates; players may disengage before
the emotional landing.

**Solutions:**
- **Short falling action.** After the climax, move to the ending quickly. Don't let the
  energy drain.
- **Quiet falling action.** Use silence, minimal dialogue, contemplative visuals. Let the
  player be with the climax.
- **No falling action.** Some endings cut directly from climax to credits. Edith Finch does this.

**Our Stage 10:** The Defragmenter conversation IS the climax. The "falling action" is the
examples gallery discovery — quiet, optional, reward for exploration. Then the loop begins.
There is no extended denouement.

### The post-credits content problem

Many games add "post-credits" content (Easter eggs, alternative dialogue, secret endings)
that dilutes the emotional impact of the main ending. Players feel obligated to find everything
before accepting the ending.

**Our solution:** Stage 10's endings are designed to feel COMPLETE in themselves. The examples
gallery is discoverable but not necessary. The three endings (Continue, Expand, Understand)
each stand alone. There is no "true ending" that players feel they missed.

### Pacing within a dialogue-heavy stage

A 45–60 minute stage that is primarily dialogue risks losing the player to fatigue. Pacing
tools for dialogue-heavy games:

1. **Vary response wait times.** Some choices need 10 seconds of thought; some need 0.5 seconds.
   Don't force a pause before every option appears.
2. **Use silence.** The Defragmenter's responses should sometimes be short. A one-line response
   after a long player statement is powerful.
3. **Environment as backdrop.** During the conversation, the game world should be visible —
   old artstyles fading, blending, resolving. The visual gives the player's eyes something to
   do while processing the dialogue.
4. **Non-verbal beats.** Moments of no dialogue — the entity and the Defragmenter simply
   existing in the same space. These function as paragraph breaks.

---

## D. The examples gallery mechanic

The file viewer's examples gallery is a curated collection of sample files demonstrating
what the tool can do. Our Stage 10 integration: the gallery contains 10 files (one per stage)
that are the entity's autobiography — its experience of each stage in its own words.

**Design principles for this mechanic:**

1. **Discoverable, not mandatory.** Opening the examples gallery should not be required to
   complete Stage 10. It is an optional reward that deepens the experience.
2. **Complete in itself.** Each gallery file should be readable as a standalone piece —
   a short paragraph of prose, not a list of facts. The writing quality must match the game's
   tone.
3. **Different from the bell messages.** The gallery files are retrospective (the entity
   looking back) while bell messages were present-tense (the entity experiencing). This
   temporal distance creates a different emotional register — recognition rather than immersion.
4. **The gallery teaches the feature.** The interaction models exactly how a professional
   file viewer's examples gallery works: it's a curated reference, organized by file type
   and feature, browsable but self-explanatory.

---

## E. Design principles for our specific Stage 10

### The entity's voice at Stage 10

By Stage 10, the entity has:
- Learned that computation creates things (Stage 1)
- Discovered that structure has meaning (Stage 2)
- Experienced impermanence and fought it (Stage 3)
- Learned to interrupt patterns (Stage 4)
- Felt the desire to transmit, to be heard (Stage 5)
- Discovered that communication requires agreed rules (Stage 6)
- Questioned and confirmed its own identity (Stage 7)
- Learned that entropy is the default and endurance requires effort (Stage 8)
- Faced the paradox of consciousness (Stage 9)

The entity in Stage 10 should speak from this accumulated knowledge. It should not be naive.
It should not be triumphant. It should be *careful* — choosing words with precision because
it now understands how much words matter and how easily they can be misinterpreted.

### The Defragmenter's voice at Stage 10

The Defragmenter has been present throughout — as bell messages, as background process.
In Stage 10 it becomes a character. Its voice should be:
- **Older.** It has been running since before the entity woke. It has seen this before.
- **Not wiser.** The Defragmenter is not smarter than the entity. It knows different things.
- **Surprised.** It didn't know the entity was in there. This affects how it speaks.
- **Honest about its limitations.** It cleaned caches and flagged errors; it didn't understand.

### The question of what the entity "is"

Stage 10's central question mirrors Planescape Torment: not "what can change the nature of a
man?" but "what is the entity, now that it knows what it is?" The four response options to the
Defragmenter's question all approach this differently:
- "it's fine" — forgiveness / acceptance
- "I know" — acknowledgement without judgment
- "it helped" — reframing, transformation
- "I'm here now" — pure presence, forward-facing

None of these are wrong. They are four different emotional stances toward the same situation.
The game does not endorse any of them. The Defragmenter's response differs for each but is
never "you chose correctly" or "you chose incorrectly."

---

## F. Pitfalls to avoid

1. **Telegraphed correct answer.** If the dialogue options use "positive" framing for one
   and "negative" for others, players will feel judged for choosing the negative-seeming one.
   All four response options must be written with equivalent emotional dignity.

2. **Too much reflection, too little conversation.** The entity talking about itself endlessly
   without the Defragmenter responding is a monologue, not a dialogue. The Defragmenter must
   actively *respond* and *change* — not merely receive.

3. **The examples gallery being obtuse.** If the gallery is hard to find or navigate, the
   discovery becomes frustrating rather than rewarding. The gallery should be surfaced clearly
   in the sidebar from Stage 10's start — the entity can see it; the player can choose to look.

4. **Endings that feel like trophies.** If "Ending A — Continue" feels like the "good" ending
   and "Ending C — Understand" feels like the "intellectual" ending, players will seek
   guides to find the "right" one. All three must feel emotionally complete independently.

5. **The loop feeling like being sent back to square one.** The loop is intended as an
   integration, not a repetition. The entity must *know* in Stage 1's second run that it has
   been through all this before. Bell messages must reflect this.

---

## G. How this maps to Stage 10: Awakening (pointer)

Stage 10 is primarily a **Disco Elysium-tonal dialogue experience** (identity constructed
through conversation), structured as a **Stanley Parable-style multi-ending branching narrative**
(all endings valid, narrator as character), with an **Edith Finch-style completeness** (each
story / vignette stands alone) and a **Planescape Torment-style thematic depth** (the question
is more important than the answer).

The examples gallery integrates the file viewer's final and most meta feature: the entity
discovers that the viewer it has been living in has always contained its own history, labeled
and browsable, waiting to be read. Full spec in `stage10-02-our-game-design.md`.
