# Stage 7 — Identity Arbiter: Round-3 Self-Evaluation

**Evaluator:** Claude Sonnet 4.6 (read-only)
**Tests run:** `node --test docs/games/metagame/stages/stage7/tests/*.test.mjs`
**Result:** 5/5 pass (accusation, artifact, boss, evidence-board, substages)

---

## Scores

| # | Dimension | Score | Verdict |
|---|-----------|-------|---------|
| 1 | Genre fidelity | 6/10 | Obra Dinn triad mechanic excellent; SS1–SS4 verbs don't require genuine reasoning |
| 2 | Fun / engagement | 6/10 | Cases 2 & 3 are the fun; boss fires automatically, SS2/SS3 are trivial clicks |
| 3 | Theme fit | 8/10 | Sci-fi dossier aesthetic is consistent and strong throughout all 7 sub-stages |
| 4 | Depth & length | 7/10 | 50–75 min realistic; Cases 2+3 exceed the plan's 5-sub-stage scope in a good way |
| 5 | Difficulty curve & onboarding | 5/10 | SS2 (3-field diff, answer visually obvious), SS3 (same-cycle ACTIVE/DORMANT) are near-instant |
| 6 | Polish / UX / readability | 6/10 | Board/card layout clean; emoji in board-render.js violates house style; no sub-stage transition UI |
| 7 | Determinism & correctness | 8/10 | No Date.now/Math.random; idempotent board; correct version migration; sidecar is a legacy workaround |
| 8 | Replayability | 3/10 | New Game+ seed (G4) unbuilt; no play-count variant; content is fully static on repeat |
| 9 | Technical health | 8/10 | renderer.js at 298/300 soft cap; all else well under; test-hook correctly gates real-app actions |
| 10 | Un-cheat discoverability | 5/10 | Case 3 search query hardcoded in the button label; EXIF boss fires on open, not on metadata-tab nav |

**Simple average: 6.2 / 10**

---

## Critical Finding: Boss Un-Cheat Fires at File-Open Time

This is the single most important issue in the build. The design requires the player to navigate to the image metadata pane and see the GPS coordinates. The implementation fires the game event automatically when "open Entity F photo" is clicked.

**Trace** (all three files are load-bearing):

1. `renderer.js:81` — `openInViewer(ENTITY_F_IMAGE_PATH, buildEntityFPhotoOpenOptions())`
2. `renderer.js:267–276` — `buildEntityFPhotoOpenOptions()` returns `{ mime: "image/png", metadataField: "GPSInfo", entity: "F", metadataSidecar: "...", metadataRows: [...] }`
3. `viewer-open.js:43` — `if (opened) recordMetagameViewerOpen({ path: target, opts })`
4. `viewer-actions.js:271–278` — `recordMetagameViewerOpen` calls `recordStage7MetadataInspection({ field: opts.metadataField, entity: opts.entity })`
5. `viewer-actions.js:184–198` — `shouldSetStage7ExifContradiction` matches on filename `entity_f_verification.png`, field `gpsinfo`, entity `F` — all three pass from the opts → `setAction(7, 'exif_contradiction_found')` fires

The boss unlocks before the player has navigated anywhere. The substage-7 hint says "Open Entity F's photo, inspect its embedded metadata" but the game doesn't enforce inspection.

The root cause: build plan items **A1 (JPEG fixture), A2 (exif.js GPS IFD patch), and A3 (metadata.js GPS row + event dispatch) were not implemented.** The sidecar mechanism was retained from the previous round's architecture.

---

## Top Issues

### ISSUE 1 — Boss un-cheat fires at file-open, not on metadata-pane navigation
**Severity: CRITICAL**
**Files:** `renderer.js:267–276`, `viewer-actions.js:184–198`, `viewer-open.js:43`

The player clicks "open Entity F photo" and `exif_contradiction_found` fires immediately via `recordMetagameViewerOpen`. No navigation to the metadata tab is required. The game's hint tells the player to "inspect metadata" but this is aspirational — the boss is already unlocked by the time they could do so.

**Fix:** Implement build plan A1–A3:
- Replace `entity_f_verification.png` (68-byte stub) with a real JPEG (`entity_f_verification.jpg`) containing a GPS EXIF IFD block.
- Patch `exif.js` to follow the GPS IFD pointer (`0x8825`) and decode `GPSLatitude` / `GPSLongitude` as RATIONAL triples.
- Patch `metadata.js` to render a "GPS" row and call `maybeFireStage7GpsEvent(intake)` from within the metadata renderer (fired when the GPS row is rendered, not when the file is opened).
- Remove `metadataField`, `metadataSidecar`, `metadataRows` from `buildEntityFPhotoOpenOptions()`; change `mime` to `image/jpeg`.
- Update `messages.js:ENTITY_F_IMAGE_PATH` to `.jpg`.
- Update `artifact.test.mjs` to assert JPEG magic bytes.

---

### ISSUE 2 — Entity F fixture is a 68-byte PNG stub
**Severity: CRITICAL (same fix as Issue 1)**
**Files:** `messages.js:7`, `docs/examples/metagame/stage7/entity_f_verification.png`

The image viewer opens a nearly-empty PNG. The sidecar (`entity_metadata.json`) provides authored fake GPS metadata rows. This means the player sees staged data, not data actually in an image. The "cracking the case with a real tool" moment (the boss's design intent) is hollow: there is no real EXIF to crack.

---

### ISSUE 3 — SS4 and Case 2/3 source opens fire immediately on button click
**Severity: HIGH**
**Files:** `viewer-actions.js:201–226`, `viewer-open.js:28–44`

Opening `entity_anchor_0043.txt`, `route_table.csv`, `system_spec.json`, etc. fires their corresponding actions via `recordMetagameViewerOpen` at the moment `openViewerFile` completes. The player does not need to read the file content. In SS4, clicking "open exhibit" fires `anchor_chain_examined` before the player could read the decommission record. In Case 2, opening `route_table.csv` fires `route_table_examined` (minting `fact:route`, which is the load-bearing card) without requiring the player to find the `R-0091,INACTIVE` line.

The sole exception is Case 3's search: `recordStage7Search` checks that the search result actually contains `REVOKED`, which requires the ledger to have a matching line — a genuine file-content check.

**Fix (ranked):** Pragmatic short-term: add a "you viewed: [file content excerpt]" step before the action fires, or require the player to click a "confirm this record" button AFTER the file is shown. Ideal: wire the action to a content-engagement event (scroll, selection, or search) rather than file-open.

---

### ISSUE 4 — Case 3 search query is pre-filled in the button label
**Severity: MODERATE**
**Files:** `board-render.js:59`, `renderer.js:141–146`

The `data-action="search-source"` button is labeled: `search session_ledger.csv for "S-7741"`. The query is hard-coded (`CASE3_SEARCH_QUERY`). The player does not need to deduce WHAT to search for; they click a button that already knows the answer. Discovery is eliminated.

**Fix:** Show `Entity N → Session: S-7741 (active)` as the planted clue card on the board (already visible in the Case 3 fields for N). Remove the query from the button label — change it to `search session_ledger.csv`. The player must identify that N's session token is the search target from the dossier. The `searchSource()` call must obtain the query from the player's input or from a pinned field card rather than a hard-coded constant.

---

### ISSUE 5 — SS2 (Duplicate Test) and SS3 (Timeline Audit) are near-instant
**Severity: MODERATE**
**Files:** `content.js:10–20` (metadataRows), `content.js:64–76` (entityFEventLog), `renderer.js:173–210`

**SS2:** Entity A has `GPSInfo: "Layer-0 coordinates"`; Entity F has `GPSInfo: "52.3N, 4.8E / outside known layers"`. Only 3 fields per column. The difference is immediately obvious from the value text alone — no reasoning required, just visual scanning.

**SS3:** The impossible entry is `0043 DORMANT` immediately following `0043 ACTIVE` in the same cycle. Two events at the same cycle number are visually obvious in a monospace list. The "mark impossible" button on ev6 is discoverable in ~5 seconds.

**Fix:** Expand SS2 to 5–6 fields with more plausible distractors (e.g., `Software`, `DateTimeOriginal`, `Orientation`, `Make` all matching; only `GPSInfo` diverging). For SS3, add 3–4 more events and use a subtler contradiction (e.g., claiming a state transition that violates the boot FSM rather than a same-cycle duplicate).

---

### ISSUE 6 — renderer.js at 298 lines (2 below soft cap)
**Severity: LOW**
**File:** `renderer.js`

Any minor addition to `renderBoss()` or the click dispatcher will breach the 300-line soft cap. The original build plan's Phase F called for `substage5.js` to contain the boss panel. This would also create a dedicated test surface for the boss panel.

**Fix:** Extract `renderBoss(lock)` and its helper `buildEntityFPhotoOpenOptions()` into `substage5.js` (~80 LOC). Renderer.js imports and delegates.

---

### ISSUE 7 — Emoji in board-render.js violates house style
**Severity: MINOR**
**Files:** `board-render.js:59` (`🔍`), `board-render.js:79` (`📌`)

Project convention: no emojis in files. Both lines render visible UI text.

**Fix:** Replace `"🔍 "` with `"[SEARCH] "` (or `"search "`) and `"📌 "` with `"[PIN] "` (or just prepend `"● "` for a pinned indicator).

---

### ISSUE 8 — Committing wrong entity (including F) has minimal drama
**Severity: LOW**
**Files:** `boss.js:87–91`, `renderer.js:241–249`

After the EXIF contradiction reveals F is the impostor, the commit row shows all 6 candidates. Committing F returns `{ ok: false, reason: "wrong-entity" }` with one log line: "F is not the real credential holder." The climactic moment of accusing the impostor (when the player might try F) deserves a more emphatic rejection — a bell message, a log line that explains why, or a hint toward A.

**Fix:** In `commitIdentity`, when `selected === 'F'` and boss is unlocked, push a specific log line: "Entity F is already contradicted — the GPS places it outside every known layer. Commit to the entity that survives all five investigations." (Or similar.) No state reset; just richer feedback.

---

## Top Opportunities

### OPP 1 — Implement A1–A3 (JPEG + exif.js GPS + metadata.js row) [HIGHEST PRIORITY]
The research.md was correct and complete on this path. A minimal authored JPEG with a real GPS EXIF IFD, the `exif.js` `readGpsIfd` extension (~30 LOC), and the `maybeFireStage7GpsEvent` hook in `metadata.js` (~15 LOC) together transform the boss from a 1-click auto-fire into a genuine "I used the real tool to crack the case" moment. This is the defining experience of the stage; everything else is setup.

### OPP 2 — Remove the hardcoded Case 3 search query from the button
Allow the player to discover the session token from Entity N's dossier card (`S-7741 (active)`) and enter it themselves, or at minimum hide the query from the button label. This restores the investigative act of identifying what to search for — the difference between "the game tells me to search for S-7741" and "I notice N claims S-7741 is active; I should check the ledger for that token."

### OPP 3 — Split renderBoss into substage5.js (Phase F)
Keeps renderer.js below 300 lines, creates a dedicated module for the boss panel, and matches the original build plan's architecture. Pairs with the A1–A3 work (the sidecar fields are removed from `buildEntityFPhotoOpenOptions` as part of that fix, which shrinks renderer.js too).

### OPP 4 — New Game+ seed variant (build plan G4)
After `firstClearComplete`, bump `meta.playCount` and use it (not `Date.now()`) to select a subtly harder SS2 diff (semantic value change rather than length change) and harder SS3 contradiction. This is 2–3 LOC in `state.js` plus a content selector in `content.js`. Low effort, measurable replayability uplift.

### OPP 5 — Richer Case-transition narration
When Case 1 closes (SS4 → SS5) the log pushes one line: "A second roster claims the name. Open the system files..." A brief bell message or a styled "CASE 1 CLOSED — FOUR IMPOSTORS ELIMINATED" header in the Case 2 panel would make the escalation feel like a story beat, not just a substage index increment.

---

## Global Law Compliance

| Law | Status | Notes |
|-----|--------|-------|
| Boss only after full stage body | PASS | `boss.js:77`: `substage < 7` → `not-yet-boss`; must pass SS1→SS2→SS3→SS4→Case2→Case3 |
| Un-cheat uses real app feature, not trivially bypassable | FAIL (boss) / PASS (Case3 search) | EXIF boss fires at open time (see Issue 1). Case 3 search calls `searchViewerFile` and requires `REVOKED` in the result (genuine file search). Case 2 route-table fires on open (Issue 3). |
| Zero off-origin at runtime | PASS | All fixtures are same-origin under `/docs/examples/metagame/stage7/`. |
| Deterministic seeded RNG | PASS | No `Date.now()` or `Math.random()` in any stage7 file (confirmed by grep). |
| Modular files, 500-hard / 300-soft LOC cap | PASS (warning) | `renderer.js`: 298/300 soft. All others well under. `stage.generated.js` at 1270 is excluded (generated). |

---

## Overall Verdict

**Weighted score: 6.2 / 10**

Stage 7 in round 3 is structurally the best-designed stage in the metagame. The Obra Dinn rule-of-three accusation mechanic (Cases 2 and 3), the evidence board with pinnable cards and established facts, the carried Case-1 continuity, and the two-red-herring Case 3 are all genuinely meaty investigative design. The 7-sub-stage arc substantially exceeds the original build plan's scope in a way that earns its estimated 50–75 min playtime.

What drags the score down is a single structural flaw that undermines the stage's identity: **the boss un-cheat fires at file-open time, not on genuine metadata inspection.** This was the central lesson of the previous evaluation (research.md correctly diagnosed it), and the fix (JPEG + exif.js + metadata.js) was fully specified in the build plan as items A1–A3. Those items were not built. The sidecar mechanism that was the old design's workaround is still in place.

The secondary weakness is that SS2 and SS3 are trivially fast (< 15 seconds each), and all source opens in Cases 2 and 3 fire their actions at open time rather than on content engagement.

The stage is solidly playable as-is; Cases 2 and 3 are the fun. But the boss is a 1-click auto-fire, which means the climactic "use the real app to crack the case" moment — the reason Stage 7 exists in the metagame — does not land.

**Single most important round-4 action:** Implement build plan items A1–A3: author a minimal JPEG (`entity_f_verification.jpg`) with a real GPS EXIF IFD block, patch `exif.js` to parse GPS IFD (tag `0x8825`) with a `readRational` helper, and add `maybeFireStage7GpsEvent` to `metadata.js` so the `exif_contradiction_found` action fires from the metadata renderer (when the GPS row renders) rather than from `recordMetagameViewerOpen` (at file-open time).
