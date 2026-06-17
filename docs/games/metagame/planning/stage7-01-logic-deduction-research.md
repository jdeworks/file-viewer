# Stage 7 — 01: Logic Deduction / Document Verification Genre Research

Reference research for the **Identity Arbiter** Stage 7 design. Developer-facing distillation
of logic deduction / document verification games: information asymmetry, constraint elimination,
evidence evaluation, and the design of "lateral information" puzzles where clues are distributed
across the game. Companion doc `stage7-02-our-game-design.md` maps this onto Stage 7.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Papers, Please** | 2013, Lucas Pope | **Document verification as gameplay.** Player inspects documents for discrepancies. Conflicting details = deny entry; matching details = approve. Time pressure + escalating rule complexity. Lesson: *bureaucratic process can be emotionally engaging when the stakes are human and the rules keep changing*. |
| **Return of the Obra Dinn** | 2018, Lucas Pope | **Lateral information deduction.** Clues are distributed across the entire game; the solution to any one puzzle requires aggregating information from multiple scenes. "Trio confirmation" — 3 correct answers confirmed simultaneously prevents guessing. Lesson: *commitment system forces real deduction instead of trial and error*. |
| **Disco Elysium** | 2019, ZA/UM | **Dialogue-based evidence.** Evidence comes from conversations; player skills affect which options are available. Lesson: *evidence can be verbal, not just visual — what someone says and how they say it is data*. |
| **The Forgotten City** | 2021, Modern Storyteller | **Iterative information accumulation.** Each loop reveals more; the player builds a "total picture" across runs. Lesson: *knowledge persists even when the run resets; growing expertise creates confident deduction*. |
| **Paradise Killer** | 2020, Kaizen Game Works | **Open-world investigation.** Player gathers evidence freely; the "trial" moment is a player-constructed argument. No one answer is forced — the player chooses who to blame and defends the choice. Lesson: *"who did it" can have legitimate multiple valid answers based on evidence weighting*. |
| **Orwell** | 2016, Osmotic Studios | **Document aggregation as gameplay.** Player reads files (text-based), highlights relevant information (names, relationships, dates), and builds a profile from fragments. Lesson: *the act of reading and annotating documents is itself engaging as a mechanic*. |
| **Obra Dinn / Papers, Please synthesis** | — | Lucas Pope's two key games together define a design space: Papers, Please is *fast, rule-based, time-pressured*; Obra Dinn is *slow, inference-based, unhurried*. Our Stage 7 sits between them: rule-based verification but with Obra Dinn's inference depth. |

---

## B. Core mechanics taxonomy

### 1. Information sources and evidence types

Evidence in deduction games falls into categories:
- **Direct:** "This document says X"
- **Contradicting:** "Document A says X; Document B says not-X — one is false"
- **Corroborating:** "Document A and Record B both say X — X is more likely true"
- **Circumstantial:** "Entity X was present during event Y; entity Z claims they weren't present"
- **Absence:** "This entity has no record of event Z, when all entities of type R should"

**Our Stage 7 uses all five types.** Each entity presenting credentials includes some of
each type; the player must weigh them.

### 2. The verification action system (Papers, Please model)

Papers, Please establishes the "action vocabulary" for document verification:
- **Inspect:** examine a specific field or document for detail
- **Cross-reference:** compare two documents for consistency
- **Query:** ask the entity directly (response is additional evidence)
- **Flag:** mark as suspicious (doesn't commit; just notes for later)
- **Approve/Deny:** final commitment action

Our Stage 7 uses a simplified version with an **action budget** — each entity presentation
gives the player a limited number of verification actions before they must commit.

### 3. Elimination deduction (Obra Dinn model)

The elimination model:
```
Total entities: N
Known attributes per entity: k
Possible assignments: N choose k (decreases as assignments are confirmed)

// Trio confirmation model (Obra Dinn)
function checkTrio(assignments) {
  const trio = assignments.filter(a => a.committed);
  if (trio.length === 3) {
    if (allCorrect(trio)) confirmAll(trio);
    else showConflict(trio);    // NOT revealed which is wrong — just "something's off"
  }
}
```

We adapt this: **every 3 committed DENY decisions are confirmed** if correct, but the game
doesn't reveal which specific one was right. This prevents brute-forcing.

### 4. Rule complexity escalation (Papers, Please model)

Papers, Please introduces one new rule per in-game day. By day 20, there are 12+ active rules.
The learning curve is deliberate:

```
Day 1:   Approve if all documents present and match
Day 2:   Check expiry dates
Day 3:   Check photo matches description
Day 5:   Cross-reference against wanted list
Day 8:   Check work permit region vs. declared destination
...
Day 20:  12 simultaneous rules, some contradicting
```

**Our escalation:**
```
Round 1 (entities 1-5):   Name + address check only
Round 2 (entities 6-12):  + history cross-reference
Round 3 (entities 13-20): + image metadata check
Round 4 (entities 21-30): + behavioral signature (response timing as evidence)
Boss round:               All rules + Name Collision (multiple identical credentials)
```

### 5. Image metadata as evidence (our unique mechanic)

Standard document verification games don't examine image metadata (they use visual inspection).
Our Stage 7 integrates the file viewer's image viewer capability for EXIF metadata inspection.

EXIF data fields relevant to verification:
- `DateTimeOriginal` — when the photo was taken
- `Make`/`Model` — device that took the photo
- `GPSLatitude`/`GPSLongitude` — where the photo was taken
- `Software` — editing software used (indicating post-processing)

An entity claiming to have been photographed in a specific year, at a specific location, can be
contradicted by EXIF data showing the photo was taken by a device not manufactured until 5 years
later, or at coordinates 3000 miles from the claimed location.

### 6. Social deduction vs. logic deduction

**Social deduction** (Among Us, Werewolf): evidence is social — voting, accusations, behavior.
Truth is probabilistic. The "solution" emerges from group consensus, not logic.

**Logic deduction** (Obra Dinn, Papers, Please): evidence is document-based or scene-based.
Truth is deterministic. The solution is singular and verifiable.

Our Stage 7 is **logic deduction** — there is always a correct answer determinable from evidence.
The game never requires "guessing" — all correct denials can be proven from available evidence if
the player uses all verification actions.

### 7. Scoring and accuracy tracking

The game tracks:
- **Correct approvals:** real entities correctly admitted
- **Correct denials:** impostors correctly rejected
- **False positives:** real entities incorrectly denied (costly — entities register complaints)
- **False negatives:** impostors incorrectly admitted (extremely costly — backdoor access events)

```js
accuracy = (correctApprovals + correctDenials) / totalEntities
score = accuracy * 100 - (falseNegatives * 20) - (falsePositives * 5)
// False negatives are penalized 4× more than false positives (security asymmetry)
```

---

## C. Standard formulas

### Difficulty curve — entity complexity
```js
// Entity complexity per round
complexity(round) = {
  falseAttributes: 1 + Math.floor(round / 3),   // more false fields per round
  impostorFraction: 0.2 + (round / 30),          // more impostors later (max 50%)
  actionBudget: 5 - Math.floor(round / 10),      // fewer actions allowed per entity later
  timeWindow: 60 - (round * 0.5),                // less time before entity "grows impatient"
}
```

### Evidence weight calculation
```js
// How much a single evidence item affects identity confidence
evidenceWeight(type) = {
  direct:         0.40,  // "document says X" — 40% weight toward confidence
  corroborating:  0.20,  // "another source also says X" — +20% (don't double count)
  contradicting:  0.60,  // "document says not-X" — strong against X hypothesis
  circumstantial: 0.10,
  absence:        0.15,
}
// identityConfidence = sum of evidence weights; >0.80 = safe to commit
```

---

## D. UX patterns for logic deduction games

- **Evidence board:** spatial display of gathered evidence with string connections between related items
- **Highlight + pin:** player highlights a document field; pins it to a comparison area
- **Timeline:** events in chronological order; inconsistencies visualized as gaps
- **Credential inspector:** zoom in on documents; hover for magnification of specific fields
- **Action log:** recent verification actions displayed (helps track what was already checked)
- **Confidence meter:** per-entity display showing current deduction confidence (optional; some games omit it to force commitment)

---

## E. Design pitfalls to avoid

1. **Always-solvable puzzles** are required — if a player uses all actions on an entity and
   cannot reach 80%+ confidence, the puzzle is broken. Every entity must have at least one
   definitive contradiction discoverable within the action budget.
2. **EXIF metadata must be wrong in a legible way.** "DateTimeOriginal is 2041" is legible.
   "GPS coordinates differ by 0.003 degrees" requires a calculator. Keep EXIF differences large
   and obvious: wrong decade, wrong continent, wrong device type.
3. **Time pressure that prevents deduction.** Time limits that prevent reading all evidence
   are frustrating. Our "patience countdown" only starts after 3 actions are taken — ensuring
   the player always has time for basic verification.
4. **Unavoidable false negatives.** If any real entity is impossible to approve without guessing,
   the player is penalized for good play. Never design an impossible-to-verify legitimate entity.
5. **Too many simultaneous rules.** 12 active rules at once is correct for a 2-hour game with
   daily pacing. For our 60–90 minute stage, cap at 6 active rule types simultaneously.

---

## F. How this maps to Stage 7: Identity Arbiter (pointer)

Stage 7 takes **Papers, Please's** document-verification mechanic and action budget, **Obra
Dinn's** lateral information deduction and trio-confirmation commitment system, and adds EXIF
image metadata as a novel evidence type (unique — no game uses this). The stage uses the file
viewer's image viewer as a diegetic tool: the player uses the image viewer not as a game UI
but as the actual game mechanic. Full spec in `stage7-02-our-game-design.md`.
