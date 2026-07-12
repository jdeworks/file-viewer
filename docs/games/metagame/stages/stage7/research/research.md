> **SUPERSEDED (2026-07-12).** Old computer-forensics / EXIF-boss design. Stage 7 is now the human
> detective case "The Meridian Estate Affair" (EXIF boss → in-case document contradiction). Kept for
> history only; see the stage `README.md` and `research/case-fixtures/README.md`.

# Stage 7 — Identity Arbiter: Design Research

**Audit verdict on current build:** THIN GATE (worst). A 2-click investigation: open Entity F photo,
click "inspect GPSInfo," commit Entity A. The un-cheat is doubly broken — PNG EXIF is not parsed by
the host app, and an in-game button bypasses the real app entirely. B/C/D/E are pre-eliminated in
state; only A/F remain meaningful. There is no real game.

**Design decision recommended here:** HYBRID — keep the "Identity Arbiter" identity-deduction
theme (richer than raw diff), graft The Duplicant's side-by-side diff mechanic in as one sub-stage
verb, and build a genuine 5-sub-stage investigation that funnels to a fixed JPEG EXIF boss. This
preserves the original locked-design intent (compare two entities to find the impostor) while
adding the genre depth the stage currently lacks.

---

## 1. GENRE — Deduction / Identity Verification

### What defines the genre

Deduction games share three structural properties:

- **Distributed evidence.** Information is spread across multiple sources (documents, scenes,
  metadata). No single clue solves the puzzle; the player must synthesise.
- **Contradiction as the core action.** Progress comes from spotting an inconsistency, not from
  collecting enough items. The "Aha!" is a logical collision, not a threshold.
- **Commitment under uncertainty.** The player must make a judgment call — accuse, stamp, commit —
  before certainty is possible. The game rewards calibrated confidence, not perfect knowledge.

Spot-the-difference is a degenerate form of the same loop: two nearly-identical states, find the
delta. It feels satisfying because the contradiction is *visible* rather than inferred, but it has
less depth because a single perceptual pass can brute-force it. The best games in the genre use
spot-the-difference as one *layer* inside a richer deduction structure.

### The 5 best games in the genre — concrete fun mechanics

**Papers, Please (Lucas Pope, 2013)**
- **Why it works:** Every person in the queue is a multi-field document. Each day adds one new
  rule (new country, new seal, new required form). The player must hold an expanding ruleset in
  working memory while racing a clock. Failure has a *cost* (fine → family can't eat) that makes
  every wrong stamp hurt without losing the run. The contradiction is almost always present but
  hidden in the gap between two documents the player must physically align.
- **Key mechanic:** The "inspect" verb — dragging one document over another to line up fields.
  Discrepancy lights up. This is the entire game distilled.
- **Retention:** New rule = new way to be wrong. The game never stops teaching; you never master it.
- Source: [Critical Analysis: Papers, Please](https://dylanmatthias.net/critical-analysis-papers-please/) |
  [Papers, Please Authority vs Moral (ResearchGate)](https://www.researchgate.net/publication/335925458_Game_analysis_Papers_Please_-_Authority_vs_Moral)

**Return of the Obra Dinn (Lucas Pope, 2018)**
- **Why it works:** 60 crew members, 60 fates, all derived from frozen death-scenes and sparse
  audio. No hand-holding; the game trusts the player to reason. The "groups of three" confirmation
  mechanic prevents brute-force: the game only confirms when three *complete* (person + fate +
  killer) entries are correct simultaneously. A wrong entry somewhere in the group stays silent.
  This forces genuine deduction rather than elimination-by-exclusion.
- **Key mechanic:** "Lateral information" — clues about person X often come from scenes about person
  Y. The player must build a social graph in their head (or on paper) and propagate deductions.
  Solving one fate unlocks three others non-linearly.
- **Retention:** The solution space shrinks every time three lock in, creating momentum. Early fates
  are easy (obvious visual clues); later ones require cross-referencing everything previously solved.
- Source: [Design Innovation: Obra Dinn (KokuTech)](https://www.kokutech.com/blog/gamedev/design-patterns/unique-mechanics/return-of-the-obra-dinn) |
  [The Mechanic of Intuition (CVGS)](https://criticalvideogamestudies.com/return-of-the-obra-dinn-the-mechanic-of-intuition/) |
  [Rule of Three (Film Stories)](https://filmstories.co.uk/features/exploring-return-of-the-obra-dinns-rule-of-three/)

**The Case of the Golden Idol (Color Gray Games, 2022)**
- **Why it works:** Mad-Libs fill-in-the-blanks. You examine a crime scene, collect words into a
  bank, then drag words into accusation sentences. The word bank is constrained so the answer space
  is finite — but the sentences force you to articulate *why*, not just *who*. The "Aha!" is
  satisfying because you constructed the explanation, not just pointed at a suspect.
- **Key mechanic:** Each chapter has its own custom puzzle layer on top of the shared word-bank
  system (extra identification puzzles, scene-specific sub-questions). Mid-game scenarios layer in
  environmental puzzles and inherited information chains where earlier chapter names reappear.
- **Retention:** The constrained word bank prevents total free-form guessing but doesn't give away
  anything. Multiple solution paths to the same correct answer reward lateral thinking.
- Source: [Pursuing the "Aha!" Moment (Game Developer)](https://www.gamedeveloper.com/design/case-of-the-golden-idol) |
  [How they made it (Thinky Games)](https://thinkygames.com/features/how-the-case-of-the-golden-idol-developers-made-one-of-the-decades-best-detective-games-twice/)

**Orwell: Keeping an Eye On You (Osmotic Studios, 2016)**
- **Why it works:** You play a surveillance analyst uploading "datachunks" to a government dossier.
  Not every piece of evidence belongs — you must judge relevance and context before uploading.
  The core tension: uploading the wrong chunk harms an innocent person; uploading too little misses
  the threat. Identity verification is the mechanic: is this social-media post about THIS person or
  a different person with the same name?
- **Key mechanic:** Cross-referencing identity fragments across disparate sources (chat logs, news,
  social media, phone records). The game actively punishes naive collation — it rewards source
  criticism.
- **Retention:** Episodic pacing with one new information source type per episode. Each episode
  teaches a new way to be deceived.
- Source: [Orwell Wikipedia](https://en.wikipedia.org/wiki/Orwell_(video_game)) |
  [Orwell Review (GameCritix)](https://gamecritix.co.uk/orwell-keeping-an-eye-on-you-review/)

**Danganronpa: Trigger Happy Havoc (Spike Chunsoft, 2010/2014)**
- **Why it works:** The Non-Stop Debate fires testimony statements as scrolling text. The player
  shoots a "Truth Bullet" at a specific *phrase* to contradict it — not at a person, at a claim.
  The game forces precision: which exact words are wrong? Each Class Trial introduces an additional
  minigame layer (Hangman's Gambit, Bullet Time Battle) that tests a different cognitive mode
  (word reconstruction, rhythm, precision timing). By V3, seven distinct minigame types existed.
- **Key mechanic:** The Truth Bullet as a verb — evidence *applied to a specific claim*. You don't
  just "present evidence"; you nominate both the evidence and the exact statement it refutes.
- **Retention:** New minigame per case. The investigation loop stays the same; the trial loop gets
  a new mechanic every time.
- Source: [Danganronpa Class Trials (Fandom)](https://danganronpa.fandom.com/wiki/Class_Trials) |
  [V3 Class Trials (Fandom)](https://danganronpa.fandom.com/wiki/Class_Trials/Danganronpa_V3)

---

## 2. OUR CORE LOOP — Identity Arbiter moment-to-moment

### The problem with the current build

The current state encodes `evidence.eliminated: ["B","C","D","E"]` at initialisation. The player
opens the stage to find only A and F unresolved, with no work to do for B/C/D/E. One button opens
Entity F's photo; one button "inspects GPSInfo" (in-game bypass, not real app); one button commits
A. Total interaction: three clicks. This is not a game.

The "inspect GPSInfo" in-game button is the un-cheat bypass — it fires `inspectContradictoryExif`
without the player ever opening the real image viewer. Even if that button were removed, the EXIF
reader only handles JPEG (`0xFF 0xD8` SOI check) and does not parse the GPSInfo IFD (tag `0x8825`).
Entity F's file is a PNG. The real app would show no EXIF at all.

### The proposed loop (hybrid Duplicant + Identity Arbiter)

The stage is a 5-sub-stage investigation. The player is the Identity Arbiter — one entity
(`CORE_ENTITY_001`) has been impersonated. Six dossiers claim the name. Eliminate them one by one
using progressively deeper investigative techniques until only the impostor and the real entity
remain, then use the host app's real EXIF reader to deliver the verdict.

**Thematic wrapper:** All text is written as system output — entity records in a dossier system,
boot cycle logs, credential chains, image metadata — keeping the sci-fi/IT aesthetic of the game.

**Un-cheat (boss) fix:**
- Entity F's image fixture changes from PNG to JPEG with a real GPSInfo EXIF block authored in.
- `docs/types/image/exif.js` adds GPSInfo IFD parsing (tag `0x8825`, rational coordinates).
- `docs/types/image/metadata.js` surfaces the GPS row in the metadata pane.
- The stage listens to `fv:games:action` with `action: "7.exif_contradiction_found"` fired from
  the host app's metadata pane when it renders the GPS row for Entity F's JPEG.
- The in-game "inspect GPSInfo" button is **removed entirely**. No bypass.
- The "open Entity F photo" button stays — it is the *bridge* that takes the player into the real
  host app. The player must then navigate to the metadata pane themselves and spot the GPS anomaly.
- Result: the un-cheat is a real, load-bearing, non-bypassable use of the host app feature.

---

## 3. EXPANSION ARC — per-sub-stage new verb (THE KEY DELIVERABLE)

The model: Stage 2 Glyph Dungeon biome bands each add a new verb (avoid terrain → break
line-of-sight → manage spreading fire → manage darkness). Depth = new thing to think about, not
bigger numbers.

Stage 7 has **5 sub-stages** (cases), each introducing exactly one new investigative verb. The
player cannot unlock the next sub-stage until they correctly apply the current verb.

---

### Sub-stage 1 — "CREDENTIAL SCAN"
**New verb: FLAG a suspicious field in a dossier.**

The player sees all 6 entity cards with their text claims. Entities B, C, D, E each have one
obviously wrong field — a claim that contradicts a stated system fact visible elsewhere on screen
(e.g. "Route active since cycle 0043" when the HUD shows current cycle is 0041; "activity log
event: LAYER_MERGE" which the sidebar identifies as an impossible event type). The player clicks
the suspicious field on each card to flag it as contradicted.

**What is new:** This is the first time the player interacts with a field (not just a card). They
must read, compare to ambient facts, and *nominate the specific field* — not just mark the entity.
This trains the "aim at the claim" habit (Danganronpa's core move) that every subsequent sub-stage
requires.

**What is NOT required yet:** The player does not need to explain *why* the field is wrong — just
flag it. Reasoning comes later.

**Completion condition:** All four red-herring entities (B, C, D, E) have their contradictory
field flagged. Sub-stage 2 unlocks.

**State delta:** `evidence.eliminated` populates incrementally (not pre-seeded). `evidence.flags`
tracks which fields have been flagged and on which entity.

---

### Sub-stage 2 — "THE DUPLICATE TEST" (The Duplicant mechanic)
**New verb: DIFF two documents side-by-side to find the tampered field.**

A/F remain. The stage presents both dossiers in a split-panel view. Fields appear in identical
order and nearly-identical text. The player must spot the single field that differs. In round 1
the tampered field is visually distinct (different length). In round 2 (replayability / New Game+)
the difference is semantic (same field, plausible but wrong value).

**What is new:** The player must not just compare card-to-card sequentially but hold both texts in
view simultaneously — a perceptual diff. This is the original Duplicant mechanic (locked design
item #7: "spot-the-difference clones, defeat = Compare the two boards"). Here it is embedded as
one sub-stage verb rather than the entire stage, because the host app's Compare feature is reserved
for the *real* app feature un-cheat (it fires a game event when invoked). Alternatively the
sub-stage can *suggest* the player use the host app's two-file Compare on A/F fixture files, making
this the *first* host-app touch point (softer than the boss). Design preference: keep the boss
as the only mandatory host-app touch; sub-stage 2 is in-game side-by-side.

**Completion condition:** Player correctly identifies the differing field (`GPSInfo` value on F
differs from A). This partially contradicts F but does not eliminate them — a coordinate can be a
data entry error. The player logs it but must keep investigating.

**State delta:** `evidence.partialContra` gains F.GPSInfo; the log records "Entity F's GPSInfo
diverges from Entity A. Insufficient to rule out data-entry error."

---

### Sub-stage 3 — "TIMELINE AUDIT"
**New verb: SEQUENCE events to find the impossible one.**

A condensed event log appears. 8–10 timestamped events (boot cycles) are listed for Entity F.
The player must drag them into chronological order (or click "mark as impossible" on one). One
event is a logical impossibility: it claims Entity F was active in two mutually exclusive states
at the same cycle.

**What is new:** The player has been reading static fields; now they must *reason about time*.
Chronological ordering is a new cognitive mode — not scanning text for a mismatch but reconstructing
a sequence and finding the violation. The first time the player encounters that a *set of* facts
can be consistent individually but impossible collectively.

**Completion condition:** Player identifies the impossible event. Log: "Entity F's activity log
contains a temporal contradiction at cycle 0043 — simultaneous ACTIVE/DORMANT states."

**State delta:** `evidence.temporalContradiction` = true. F is now "implausible" but not yet
eliminated — a skeptical system might treat this as a logging error.

---

### Sub-stage 4 — "REFERENCE CHASE"
**New verb: FOLLOW a citation to an external exhibit.**

Entity F's credential record references an authority entry: `CREDENTIAL_CHAIN → ENTITY_ANCHOR_0043`.
That anchor is listed as a clickable exhibit link in the dossier. When the player clicks it, it
opens a short text exhibit (a small `.txt` fixture file in `docs/examples/metagame/stage7/`) in
the host app's text viewer — a lightweight, non-boss touch of the real app. The exhibit shows that
`ENTITY_ANCHOR_0043` was decommissioned at cycle 0043 and its credentials revoked. Entity F's
chain is broken.

**What is new:** The evidence is not on screen — it requires following a pointer to a *different
file*. This is the first time the player must leave the stage UI to find a clue. It also
foreshadows the boss (which also requires leaving the stage UI into the host app). The exhibit
opens via `viewer.openFile(path)` — a real host-app open, but not the boss un-cheat.

**Completion condition:** Player opens the exhibit and the stage registers the file-open event
(stage subscribes to `fv:file:opened` for the specific path). Log: "Entity F's credential chain
references a decommissioned anchor. Chain is invalid."

**State delta:** `evidence.chainBroken` = true. F is now heavily implicated but the system notes:
"Documentary evidence is insufficient without a primary source."

---

### Sub-stage 5 (BOSS) — "EXIF ARBITER"
**New verb: INSPECT host-app image metadata to find a geospatial contradiction.**

The boss panel appears. Log: "Identity requires primary source verification. Entity F presents a
verification image. Inspect its embedded metadata." The player clicks "open Entity F photo" (the
existing button, kept). This opens `entity_f_verification.jpg` (JPEG) in the real host app.

The player navigates to the image's metadata pane (the Metadata tab in the image viewer). The
host app's EXIF reader — now patched to parse GPSInfo (tag `0x8825`) — displays:

```
GPS       52.3°N, 4.8°E (outside known entity layers)
```

This fires `fv:games:action` with `{ stage: 7, action: "exif_contradiction_found", field: "GPSInfo",
entity: "F" }`. The stage receives it via `subscribeToActions` and sets `boss.unlocked = true`.
The bell chimes. The log: "Entity F's image GPS is outside every known entity layer. F is
eliminated." The player then commits to Entity A. Boss defeated.

**What is new:** The player has so far worked entirely within the stage's rendered UI (text
dossiers, a split panel, an event log, a text exhibit). Now for the first time they must navigate
the *host app's real feature* — the image viewer's metadata pane — without any in-game scaffold.
The game tells them *what to find* (GPS coordinates) and *where to look* (the photo), but the
*how* is the real app's own UI. This is the authentic "cheat with a real app feature" moment.
It is not bypassable because the boss flag is set only by the host-app event.

**Completion condition:** `fv:games:action` received with `action: "exif_contradiction_found"`,
then player clicks commit A.

---

### Sub-stage arc summary table

| Sub-stage | Name              | New Verb          | Cognitive mode             | Host app? |
|-----------|-------------------|-------------------|----------------------------|-----------|
| 1         | Credential Scan   | FLAG a field      | Read + compare to context  | No        |
| 2         | Duplicate Test    | DIFF two docs     | Perceptual simultaneous     | No (opt.) |
| 3         | Timeline Audit    | SEQUENCE events   | Temporal reasoning          | No        |
| 4         | Reference Chase   | FOLLOW a citation | Pointer-chasing / navigation| Soft (text)|
| 5 (boss)  | EXIF Arbiter      | INSPECT metadata  | Feature literacy            | Yes (load-bearing) |

Each sub-stage is unlocked only after the previous one completes correctly. The game can be left
and resumed (state is persisted). There is no time pressure by default; the stage is designed
for ~40–80 min total.

---

## 4. FUN AND RETENTION

### Economy

The stage grants **150 addresses** on first clear (existing). During the investigation, correct
field flags and sub-stage completions each grant small incremental awards (10–25 addresses) so the
player gets positive feedback before the boss. An optional "precision bonus" (all flags first-try,
no wrong commits) adds 50 extra.

### Risk-reward decisions

Two meaningful decisions:
1. **How much evidence before committing?** After sub-stage 3 Entity F is heavily implicated.
   The player *could* try to commit A early (sub-stage 2 already eliminated F's GPS match). But
   the boss gate prevents committing until the EXIF is inspected. This forces the player to follow
   the chain. (Alternative: allow early commit attempts to fail with escalating hints, building
   tension.)
2. **Which field to flag in sub-stage 1?** The four red herrings each have exactly one wrong field,
   but multiple fields *look* suspicious. Flagging the wrong field plays an "insufficient evidence"
   message and deducts a small penalty — not a reset, just a minor setback.

### Sustaining engagement over 40–80 min

- **Novelty gate:** Each sub-stage is a different cognitive experience. The player never does the
  same thing twice.
- **Narrative pacing:** The log accumulates a story — each sub-stage adds a line that builds toward
  the verdict. By sub-stage 5 the player has built a dossier in their head.
- **Determinism-from-seed:** All entity data and event sequences are derived from the stage's seeded
  RNG (same seed = same content every run). New Game+ uses a different seed, giving a fresh set of
  field values and a subtler Duplicate Test diff — replayability without procedural bloat.
- **The boss as payoff:** After four sub-stages of in-game deduction, opening the real host app
  and seeing a GPS coordinate feels like "cracking the case open with a real tool." The feature
  literacy reward is the emotional climax of the stage.

---

## 5. CAVEATS — determinism, performance, uniqueness

### Determinism

- `state.js` `defaultState()` must NOT call `Date.now()` or `Math.random()`. All entity
  data lives in `content.js` as static literals (already the case). The sub-stage 2 diff is
  always the same field (`GPSInfo`) — it is not randomised.
- If a New Game+ seed variant is added, derive from a simple integer counter in state
  (`state.meta.playCount`), never from wall-clock time.

### Performance

- All five sub-stages render in the same DOM section; there is no full remount between sub-stages.
  The `repaint()` function hides/shows sections with CSS classes (`data-substage` attribute on
  root).
- The only heavy asset is the JPEG fixture (`entity_f_verification.jpg`). This is a small
  authored image (< 50 KB); it is already referenced as a static fixture in
  `docs/examples/metagame/stage7/`. Keep it small — no photo-realistic image needed, a
  monochrome schematic works.
- The `exif.js` patch for GPSInfo adds ~20 lines to a hand-rolled parser. No new vendor dependency.
  The rational-number GPS IFD (lat/lon as ratios of two longs) needs a `readRational` helper.

### Uniqueness / house style

- All entity names remain abstract (`Entity A` through `Entity F`), not human names. The sci-fi
  dossier aesthetic matches stages 1–4 (IT/system theme).
- ASCII/text-first rendering: the dossier cards are `<article>` text blocks, the split-panel diff
  is plain text columns, the event log is an `<ol>`. No canvas, no images inside the stage UI
  itself. Images only appear in the *host app* viewer (by design — that is the un-cheat surface).
- The "Reference Chase" exhibit (sub-stage 4) opens a real `.txt` file in the host app's text
  viewer. This is intentionally a light, non-boss host-app touch that acclimatises the player to
  leaving the game frame before the mandatory EXIF boss touch.
- **Remove the "inspect GPSInfo" in-game button entirely.** If any in-game affordance pointing at
  the EXIF must exist, it must be a *hint* (text in the log or bell) not an action button that
  performs the check internally.
- The in-game bypass (`data-action="gps"` in `renderer.js` line 123) must be deleted. The
  `inspectContradictoryExif` export remains for host-app trigger path only.

### The JPEG EXIF patch in detail

`docs/types/image/exif.js` currently reads tags: Make, Model, Orientation, DateTimeOriginal,
DateTime, PixelX, PixelY. It follows the Exif sub-IFD pointer (`0x8769`) but not the GPS IFD
pointer (`0x8825`). The patch:

```js
// In readIfd(), add alongside the existing sub-IFD pointer:
if (tag === 0x8825) { readGpsIfd(base + u32(e + 8)); return; }
```

`readGpsIfd` reads lat/lon as RATIONAL (type 5) — two LONG values (numerator, denominator) per
coordinate component. Parse to decimal degrees and store as `out.gpsLat` / `out.gpsLon` /
`out.gpsLatRef` / `out.gpsLonRef`. In `metadata.js`, add a "GPS" row when `ex.gpsLat` is present.
The stage listens for when this row is rendered for Entity F's image and fires the game event.
(Implementation: the host-app image renderer emits `fv:games:action` when it detects a stage-7
image with a GPS row — wired in the image renderer, not in `exif.js` itself.)

---

## Sources

- [Critical Analysis: Papers, Please — Dylan Matthias](https://dylanmatthias.net/critical-analysis-papers-please/)
- [Game Analysis: Papers Please — Authority vs Moral (ResearchGate)](https://www.researchgate.net/publication/335925458_Game_analysis_Papers_Please_-_Authority_vs_Moral)
- [A Conceptual Model for the Analysis of Investigation Elements in Games (arXiv)](https://arxiv.org/html/2403.10272v1)
- [Return of the Obra Dinn: The Mechanic of Intuition (CVGS)](https://criticalvideogamestudies.com/return-of-the-obra-dinn-the-mechanic-of-intuition/)
- [Design Innovation: Obra Dinn's Unique Mechanics (KokuTech)](https://www.kokutech.com/blog/gamedev/design-patterns/unique-mechanics/return-of-the-obra-dinn)
- [Exploring Obra Dinn's Rule of Three (Film Stories)](https://filmstories.co.uk/features/exploring-return-of-the-obra-dinns-rule-of-three/)
- [Confirmation in Return of Obra Dinn (Intermittent Mechanism, 2024)](https://intermittentmechanism.blog/2024/05/21/confirmation-in-the-return-of-obra-dinn/)
- [Obra Dinn and Lateral Information (Atomic Bob-Omb)](https://atomicbobomb.home.blog/2020/03/21/return-of-the-obra-dinn-lateral-information/)
- [Pursuing the "Aha!" Moment with Golden Idol (Game Developer)](https://www.gamedeveloper.com/design/case-of-the-golden-idol)
- [How Golden Idol developers made one of the decade's best detective games (Thinky Games)](https://thinkygames.com/features/how-the-case-of-the-golden-idol-developers-made-one-of-the-decades-best-detective-games-twice/)
- [The Case of the Golden Idol — Review (EE Blog)](https://theescapeeffect.com/blog/the-case-of-the-golden-idol-review-a-brilliant-web-of-deduction)
- [Orwell (Video Game) — Wikipedia](https://en.wikipedia.org/wiki/Orwell_(video_game))
- [Orwell: Keeping an Eye On You — Review (GameCritix)](https://gamecritix.co.uk/orwell-keeping-an-eye-on-you-review/)
- [Danganronpa Class Trials — Fandom Wiki](https://danganronpa.fandom.com/wiki/Class_Trials)
- [Danganronpa V3 Class Trials — Fandom Wiki](https://danganronpa.fandom.com/wiki/Class_Trials/Danganronpa_V3)
- [What Makes a Great Detective Game? — GMTK (Mark Brown)](https://gmtk.substack.com/p/what-makes-a-great-detective-game)
- [These 5 Deduction Games Make You Feel Like A Genius Detective (Boss Rush)](https://bossrush.net/2025/02/07/these-5-deduction-based-games-make-you-feel-like-a-genius-detective/)
