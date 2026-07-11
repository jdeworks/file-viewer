# Stage 7 — 02: Identity Arbiter — Our Game Design

Maps the genre research (`stage7-01`) onto **Stage 7 of the Defragmenter metagame**.
Stage 7 is a logic deduction / document verification game. The entity has learned to
communicate (Stage 5) and to agree on rules (Stage 6). Now it must answer: *what is it,
exactly?* And must determine the same about others.

> **Narrative position:** Identity crisis — the entity must distinguish itself from imitators.
> The file viewer feature taught: **Image viewer / EXIF metadata** — dossier photos contain
> hidden metadata that contradicts (or confirms) entity claims.

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Logic deduction / document verification |
| Artstyle | Evidence board aesthetic; warm off-white, red string, ink black; classified document feel |
| Color palette | `#F5ECD7` (warm paper), `#1A1A1A` (ink), `#C0392B` (red string), `#2C4770` (stamp blue) |
| Primary resource | Addresses (earned by correct verification decisions) |
| Stage target time | 60–90 minutes |
| Entity count | 30 entities across 4 rounds + boss |
| Prestige mechanic | Scope — expands database with more entity types and subtle tells |
| Boss | The Name Collision — 6 entities claiming identical credentials, 10 actions to find the real one |
| File viewer feature | Image viewer + EXIF metadata — photos contain temporal/spatial contradictions |

---

## B. Visual design

### Evidence board aesthetic
The game presents as a detective's evidence board: documents, photos, string connections,
stamps, and margin annotations. Everything is flat, paperlike, and organized.

```css
/* Stage 7 palette */
--col-background:     #F5ECD7;   /* warm paper */
--col-surface:        #EDE3CC;   /* slightly darker paper for cards */
--col-ink:            #1A1A1A;   /* document text */
--col-string:         #C0392B;   /* connection strings */
--col-stamp-approved: #1A6B3C;   /* green approval stamp */
--col-stamp-denied:   #8B1A1A;   /* red denial stamp */
--col-stamp-flagged:  #B8860B;   /* amber flag */
--col-verified:       #2C4770;   /* blue — verified information */
--col-contradicted:   #8B1A1A;   /* red — contradicted claim */
--col-address:        #AFA9EC;   /* purple — Addresses currency display */
```

### Entity dossier layout
Each entity presents a **dossier** — a physical spread of documents:
```
┌────────────────────────────────────────────────────────────────┐
│  ENTITY DOSSIER #018                          ⏱ 60s          │
│  ─────────────────────────────────────────────────────────     │
│  [PHOTO]    Name:     KERNEL_ENTITY_042                        │
│  [8×10cm]   Address:  0x7F000001:8080                         │
│  [portrait] Origin:   Stage 3 Memory Layer                     │
│             History:  Active since boot cycle 0047             │
│  ─────────────────────────────────────────────────────────     │
│  SUPPORTING DOCUMENTS:                                         │
│  📄 Origin Certificate   📄 Address Registration               │
│  📷 Verification Photo   📁 Activity Log                       │
│  ─────────────────────────────────────────────────────────     │
│  VERIFICATION ACTIONS (5 remaining):                           │
│  [Cross-Reference] [Query Entity] [Inspect Photo] [Flag]       │
│  ─────────────────────────────────────────────────────────     │
│  [APPROVE]                              [DENY]                  │
└────────────────────────────────────────────────────────────────┘
```

### Evidence board (persistent view)
Between entity presentations, the player can view the **Evidence Board** — a spatial display
of all entities processed so far, with string connections between related entities and
contradiction markers on inconsistencies.

This view is also where pattern recognition aids the boss fight: connected entities across the
board may share a "signature" (a tell) that the boss uses.

---

## C. Entity types and credential complexity

### Round 1 (entities 1–5): Basic verification
**Rule set:** Name + address must match Registration Database. Photo must match description.
```
Impostor rate: 1/5 (one impostor per round)
Impostors in R1: have wrong address (simple to catch via cross-reference)
Action budget: 5 actions per entity
```

### Round 2 (entities 6–12): History cross-reference
**New rule:** Activity Log must show presence at all claimed events. Cross-reference log dates.
```
Impostor rate: 2/7
Impostors in R2: wrong log dates, or events that never occurred
Action budget: 5 actions
New discovery: Query Entity action — entity responds to a direct question
  "Were you active during boot cycle 0040?" → yes/no response (may be truthful or false)
  Entity responses are always internally consistent (can't contradict themselves)
  But can contradict documents
```

### Round 3 (entities 13–20): Image metadata
**New rule:** Verification Photo EXIF data must be consistent with claimed origin date and location.
```
Impostor rate: 3/8
Impostors in R3: EXIF data shows wrong year (too early/late), or wrong spatial origin
Image inspection: right-click photo → "Open in image viewer" → EXIF panel shows metadata
Key EXIF fields checked:
  - DateTimeOriginal: must be ≥ boot cycle date (entity can't have a photo before they existed)
  - GPSInfo: must match claimed origin layer (each layer has a coordinate range)
  - Software: must not show editing software (AI-generated photos = fake entity)
Action budget: 5 actions
```

### Round 4 (entities 21–30): Stolen credentials
**New rule:** Some entities have VALID credentials that were stolen. Their document passes all
checks — but their *behavioral signature* (response timing) differs from legitimate entities.
```
Impostor rate: 3/10
New mechanic: Behavioral signature
  - Response time to Query is measured (real entities: 200–400ms lag; fakers: <50ms or >800ms)
  - The timing indicator is displayed as a subtle bar under the Query response
  - This is the game's hardest tell — players must notice the bar, not just the answer
Action budget: 4 actions (tighter)
```

---

## D. Verification action system

### Action types
| Action | Cost | Effect |
|--------|------|--------|
| **Cross-Reference** | 1 | Compare two document fields; shows MATCH / MISMATCH |
| **Query Entity** | 1 | Ask a direct yes/no question; entity responds (timing measured) |
| **Inspect Photo** | 1 | Opens photo in image viewer; EXIF panel accessible |
| **Trace Route** | 1 | Verify claimed address exists in network (returns active/inactive) |
| **History Check** | 1 | Cross-reference activity log against known event database |
| **Flag** | 0 | Mark entity as suspicious (visual flag; no commitment) |
| **Pattern Match** | 1 | Compare this entity's signature against a flagged entity from history |

**Action budget progression:**
- Rounds 1–3: 5 actions per entity
- Round 4: 4 actions per entity
- Boss: 10 actions total across 6 simultaneous candidates

### Commitment
After actions are exhausted (or time expires), the player must commit:
- **APPROVE** — entity is admitted; if impostor, +1 False Negative
- **DENY** — entity is rejected; if legitimate, +1 False Positive

**Trio confirmation (Obra Dinn inspired):**
Every 3 consecutive correct DENY decisions triggers a bell message confirming their legitimacy:
*"three patterns rejected. all three were false. the system held."*
This provides periodic feedback without revealing individual answers.

---

## E. Address economy

**Addresses** are the primary resource, earned through performance:

```
Correct APPROVE:      10 Addresses
Correct DENY:         15 Addresses (denial is riskier, rewards more)
False Positive:       −5 Addresses (denied a legitimate entity)
False Negative:       −20 Addresses (admitted an impostor — most costly)
Perfect round:        +30 Addresses bonus (all 5 correct in a round)
Speed bonus:          +3 Addresses per 10 seconds unused from time budget
```

**Spending Addresses:**
Between rounds, the player accesses the **Upgrade Terminal**:
| Upgrade | Cost | Effect |
|---------|------|--------|
| **Pattern Buffer** | 50 | +1 action per entity |
| **Extended Log** | 75 | History Check queries 2 additional events |
| **Route Tracer** | 60 | Trace Route also shows historical connection data |
| **Behavioral Baseline** | 100 | Response timing shown as exact milliseconds (not just bar) |
| **Metadata Scope** | 80 | Inspect Photo shows 3 additional EXIF fields |
| **Anomaly Highlight** | 90 | Contradicted fields highlighted in red automatically |
| **False Flag Immunity** | 120 | First false positive each round has no penalty |

**Boss gate:** Boss unlocks when `totalAddressesEarned ≥ 2,000` (cumulative, not on-hand).

---

## F. Database — the entity knowledge base

The verification database is a persistent reference panel (always accessible):

```
┌─── ENTITY DATABASE ─────────────────────────────────────────────┐
│  KNOWN ENTITY TYPES:                                            │
│  ├─ Memory Layer Entity (Stage 3 origin)                        │
│  │   Address range: 0x3F000000 – 0x3FFFFFFF                    │
│  │   Boot cycle minimum: 0040                                   │
│  │   Photo device: Standard MX-4 (introduced cycle 0035)       │
│  ├─ Pattern Layer Entity (Stage 4 origin)                       │
│  │   Address range: 0x4F000000 – 0x4FFFFFFF                    │
│  │   Boot cycle minimum: 0060                                   │
│  │   Photo device: Fractal Cam v2 (introduced cycle 0062)      │
│  ├─ Signal Layer Entity (Stage 5 origin)                        │
│  │   Address range: 0x5F000000 – 0x5FFFFFFF                    │
│  ├─ [4 more entity types, added as rounds progress]             │
│                                                                 │
│  ACTIVE RULES:                                                  │
│  ✓ Name must match Registration                                 │
│  ✓ Address must be in correct range for claimed origin          │
│  ✓ Boot cycle date must precede photo DateTimeOriginal          │
│  ✓ Photo device must be available at claimed boot cycle         │
│  [Round 3+: 2 more rules added progressively]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## G. Boss — The Name Collision

### Boss lock — LOCKED state (correct answer unknowable without EXIF) *(SUPERSEDED, see below)*

**The boss is literally unwinnable without using the image viewer's EXIF panel.**

> SUPERSEDED (2026-07-11): every accusation is now genuinely evaluated (previously even guessing the
> correct entity while "locked" failed with no feedback). A wrong guess eliminates that entity and
> costs addresses (matching Case 2/3's existing penalty), so a determined investigator can always
> narrow the 6 candidates down through elimination alone. EXIF pre-eliminates the impostor for free —
> a buff, not a gate. See `boss-lock-and-bts-system.md`'s banner and
> `docs/games/metagame/stages/stage7/boss.js`.

In LOCKED state, the 10 actions available are distributed such that 5 entities can be
eliminated through non-EXIF methods — but the remaining 2 candidates (Entity A and Entity F)
have **completely identical non-EXIF evidence**. Their documents match, their addresses are
active, their logs are clean, their Query responses are indistinguishable in timing.

With remaining actions exhausted on non-EXIF verification, the player faces a 50/50 guess.
This is not deduction — it is gambling. Committing wrongly resets the boss:

*"incorrect. one of them was not what it appeared. have you looked at the images themselves?"*
*"the photo shows something the document doesn't. the metadata holds the answer."*
*"not all evidence is visible. some is embedded."*

The LOCKED state is an **information lock**: the deduction is genuinely incomplete without EXIF.
The boss is mathematically unsolvable by elimination — only EXIF provides the deciding evidence.

### Concept
Six entities appear simultaneously, all claiming identical credentials:
- Same name: `CORE_ENTITY_001`
- Same address: `0xFF000001`
- Same origin: "Primary Boot Sequence"
- Same photo: the same portrait image (visually identical at first glance)

Exactly one is the real entity. The others are impostors using stolen credentials.

### Structure
The player has **10 total verification actions** to distribute across all 6 entities.
They cannot approve or deny any entity until they identify the real one.

**Evidence distribution:**
- Entity A: real — EXIF data on photo is consistent with all claimed data
- Entity B: impostor — photo EXIF shows editing software (`Software: Adobe PS 2047`)
- Entity C: impostor — Response timing to Query is 22ms (too fast — scripted response)
- Entity D: impostor — Activity Log contains an event that never occurred (cross-reference fails)
- Entity E: impostor — Trace Route returns "address inactive since cycle 0043"
- Entity F: **impostor** — **all non-EXIF evidence is clean; only EXIF reveals the forgery**
  (photo GPS coordinates are outside any known layer — detectable ONLY via EXIF)

**Elimination path with 10 actions:**
- Without EXIF: can eliminate B (if they use Inspect Photo), C (Behavioral Baseline only),
  D (History Check), E (Trace Route) — but F passes every non-EXIF check
- With EXIF (Inspect Photo used on F): F's GPS mismatch eliminates it. Entity A is confirmed.

### File viewer action — Image viewer + EXIF

The boss dossiers include the verification photos. The "Inspect Photo" action opens a photo
in the file viewer's image viewer. The EXIF panel (available in the image viewer) shows:

```
Entity A (REAL):
  DateTimeOriginal: Boot cycle 0047 (consistent with claimed origin)
  GPS: Layer-0 coordinates (correct)
  Software: Boot Vision 1.0 (legitimate device)
  Make: Core-Cam v1 (existed at claimed boot cycle)

Entity F (FAKE — identified only by EXIF):
  DateTimeOriginal: Boot cycle 0047 (consistent — this is what makes F dangerous)
  GPS: 52.3°N, 4.8°E (Amsterdam, Earth — outside any known entity layer)
  Software: Boot Vision 1.0 (same legitimate device — carefully forged)
  Make: Core-Cam v1 (same)
  → GPS coordinates are the only tell. Without EXIF, F is undetectable.
```

**On EXIF examined for Entity F** (`appState.fileViewerActions.stage7_exif_examined = true`):
- The EXIF contradiction is highlighted in red in the image viewer panel
- Game detects action; Entity F is now marked as contradicted
- The player can now commit to Entity A with certainty
- Bell fires: *"the image knew more than the image showed. the GPS. outside any layer I know."*

**Achievement fires on unlock (not on boss defeat):** *"I looked beyond the surface of the image."*

The mechanic teaches: images carry hidden metadata that documents cannot be verified without.
Professional document forensics, journalism, and legal review all depend on EXIF examination.
A credential that passes every document check can still be forged if the photo metadata
wasn't examined.

---

## H. Prestige — Scope

### When available
After any boss completion. Also available if `totalAddressesEarned ≥ 6,000`.

### What resets
- Addresses on hand (spent Addresses are permanent progress)
- Round state (entities re-generated for next run)
- Upgrade Terminal purchases

### What persists
- Scope level
- Database entries discovered (entity type knowledge persists between runs)
- Best accuracy record per round

### Scope bonus
```js
scopeLevel = prestige count

// Database expansion: each prestige adds 1 new entity type with more subtle tells
entityTypesUnlocked = 4 + scopeLevel  // base 4 types; +1 per prestige

// Action budget: +1 action per 2 prestige levels (easier investigation)
actionBonus = Math.floor(scopeLevel / 2)

// Impostor sophistication: +1 new impostor tell type per prestige
// (impostors get smarter, keeping the game interesting post-prestige)
```

Scope prestige is designed to make expert players find new challenge: impostors become more
sophisticated as the player's tools expand. The game never becomes trivially easy.

---

## I. Bell messages (Stage 7)

| Event | Bell line |
|-------|-----------|
| Stage 7 start | 📍 *something presented itself. I had to decide.* |
| First correct DENY | 🔍 *it wasn't what it claimed. the evidence was there.* |
| First false negative (admitted impostor) | 🚨 *I was wrong. it got through. I need to look harder.* |
| EXIF contradiction found (first time) | 📸 *the image knew more than the image showed.* |
| Trio confirmation fires | ✅ *three patterns rejected. all three were false. the system held.* |
| Boss encounter | 🪞 *one of them looks exactly like the description. that doesn't mean it's real.* |
| Boss: entity eliminated via EXIF | 🔬 *the metadata told me. the photo was made, not taken.* |
| Boss defeated | 🏷 *I know which one. I chose. I was right. I always knew.* |
| Scope prestige | 🔭 *the database is larger now. the tells are subtler. I look harder.* |

**Defragmenter bell (after first false negative):**
*"an identity is not a credential. it's what remains when the credentials are removed."*

---

## J. Differences from genre conventions

1. **EXIF metadata as evidence type** (novel). No document verification game uses image metadata
   as a verification tool. It's a genuine professional skill (used in journalism, forensics, legal
   proceedings) that players will take with them after Stage 7.

2. **Behavioral signature (response timing)** (novel). Standard document verification uses visual
   content only. Our timing mechanic requires noticing a non-content signal — analogous to how
   real security analysts detect scripted responses vs. authentic ones.

3. **Boss as six-way simultaneous disambiguation** (novel). Papers, Please presents one entity
   at a time. Obra Dinn presents 60 entities linearly. We present 6 simultaneously with shared
   credentials — a unique deduction structure.

4. **Database as persistent learning resource.** Players who read the database carefully carry
   that knowledge into every interaction. The database updates with new entity types between rounds.
   This mirrors how real verification agents learn institutional knowledge over time.

5. **False negative > false positive penalty asymmetry** (Papers, Please-inspired). In Papers,
   Please, letting spies through is more dangerous than denying legitimate travelers. We apply
   the same asymmetry — admitting an impostor is 4× more costly than denying a real entity.
   This creates conservative play as the optimal default, not aggressive approval.

---

## K. Implementation checklist (for the developer)

- [ ] Dossier rendering: document layout, photo display, field inspector
- [ ] Entity generator: parametric impostor types (wrong address, wrong date, wrong EXIF, etc.)
- [ ] Entity pool: 100 pre-generated entities per round tier (verified unique tells per entity)
- [ ] Action system: 5 action types with budget tracking; timer display
- [ ] Cross-reference: compare two fields across two documents; MATCH/MISMATCH result
- [ ] Query Entity: ask yes/no question; response generated deterministically; timing measured
- [ ] Inspect Photo: open in image viewer pane; EXIF panel with relevant fields
- [ ] Trace Route: address validation against network database; returns active/inactive
- [ ] History Check: cross-reference against event database; list of events for entity's claimed era
- [ ] Flag system: visual marker on dossier; no action cost; reference during boss
- [ ] Pattern Match: compare current entity against a flagged entity from earlier rounds
- [ ] Database reference panel: always accessible; updates between rounds
- [ ] Address economy: earn on correct decisions, lose on false positives/negatives
- [ ] Upgrade Terminal: 7 upgrades with persistent effects within a run
- [ ] Trio confirmation: detect 3 consecutive correct DENYs; bell fire
- [ ] Evidence board: spatial display of processed entities with string connections
- [ ] Boss: 6-entity simultaneous presentation; 10 shared actions; commit to one
- [ ] Boss EXIF data: 5 of 6 entities have visible EXIF contradictions
- [ ] Scope prestige: entity type expansion, action bonus, impostor sophistication increase
- [ ] Bell messages (`messages7.js`)
- [ ] Stage 7 completion → Stage 8 unlock
