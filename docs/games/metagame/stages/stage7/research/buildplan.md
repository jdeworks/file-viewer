# Stage 7 — Identity Arbiter: Build Plan

**Status:** THIN GATE → full 5-sub-stage investigation  
**Branch:** `worktree-metagame-bitfoundry`  
**After every phase:** `node scripts/gen-metagame-bundles.mjs` + `node tests/smoke-area.mjs games`

---

## DO-FIRST: Priority Table

Four items are hard prerequisites — nothing in the investigation arc is playable or correct until
these land. Pick the top item and start.

| # | Item | File(s) | Why it blocks everything else | Effort |
|---|------|---------|-------------------------------|--------|
| 1 | Real JPEG fixture with GPS EXIF | `docs/examples/metagame/stage7/entity_f_verification.jpg` | Boss event can never fire while fixture is PNG; `exif.js` rejects non-JPEG | S |
| 2 | `exif.js` GPS IFD patch | `docs/types/image/exif.js` | Without GPS tag `0x8825` parsed, metadata pane never shows GPS row; boss stays silent | M |
| 3 | `metadata.js` GPS row + game event dispatch | `docs/types/image/metadata.js` | The game event `fv:games:action` is dispatched here (not in `exif.js`); boss unlock is wired to this event | M |
| 4 | `state.js` redesign — remove pre-seeded data, add sub-stage shape | `docs/games/metagame/stages/stage7/state.js` | All 5 sub-stages depend on a `substage` counter + new evidence fields; current pre-seeded `eliminated` poisons every state check | S |

---

## Phase A — Infrastructure (do first; all other phases depend on these)

### A1 — Real JPEG fixture (Effort: S)

**Goal:** Replace the two 68-byte dummy PNG stubs with a real JPEG for Entity F that has an
embedded GPS EXIF block. Entity A keeps its minimal PNG stub for now (it is not opened by the
player during SS1–SS4; only in optional compare).

**Files to create/edit:**
- `docs/examples/metagame/stage7/entity_f_verification.jpg` — author a minimal valid JPEG
  (< 50 KB; a monochrome schematic works; the hex structure matters, not the image content).
  The APP1 EXIF block must contain:
  - A GPS IFD (tag `0x8825`) with `GPSLatitude` = 52°18′0″N (rational: `[52,1,18,1,0,1]`) and
    `GPSLongitude` = 4°48′0″E (rational: `[4,1,48,1,0,1]`), `GPSLatitudeRef` = `"N"`,
    `GPSLongitudeRef` = `"E"`. Decoded: 52.3°N 4.8°E.
  - At minimum also `Make` = `"Boot Vision"`, `DateTimeOriginal` = `"Boot cycle 0047"` so the
    metadata pane renders useful rows alongside GPS.
- `docs/games/metagame/stages/stage7/messages.js` — update `ENTITY_F_IMAGE_PATH` to
  `/docs/examples/metagame/stage7/entity_f_verification.jpg`.
- `docs/games/metagame/stages/stage7/tests/artifact.test.mjs` — change
  `assertPngFixture("entity_f_verification.png")` to `assertJpegFixture("entity_f_verification.jpg")`
  (assert first two bytes `0xFF 0xD8` instead of PNG magic; keep asserting `bytes.length > 60`).

**Test approach:** `node docs/games/metagame/stages/stage7/tests/artifact.test.mjs` — must pass
(JPEG magic bytes asserted, file readable). Then `node tests/smoke-area.mjs games`.

**Invariant:** `buildEntityFPhotoOpenOptions()` in `renderer.js` must change `mime: "image/png"` to
`mime: "image/jpeg"` and remove the sidecar fields (`metadataSidecar`, `metadataRows`, `source:
"stage7"`) — the metadata will come from real EXIF, not the sidecar JSON.

---

### A2 — `exif.js` GPS IFD patch (Effort: M)

**Goal:** `parseExif` must follow the GPS IFD pointer (tag `0x8825`) and decode lat/lon as
RATIONAL (type 5) triples.

**File to edit:** `docs/types/image/exif.js`

**Exact changes:**
1. In `parseTiff()`, inside `readIfd()`, alongside the existing `0x8769` sub-IFD pointer line, add:
   ```js
   if (tag === 0x8825) { readGpsIfd(base + u32(e + 8)); return; }
   ```
2. Add a `readGpsIfd(ifd)` function (outside `readIfd`, inside `parseTiff`) that:
   - Reads `n = u16(ifd)` entries.
   - For each entry reads tag/type/count/offset.
   - Handles GPS tag IDs: `0x0001` (`GPSLatitudeRef`, ASCII), `0x0002` (`GPSLatitude`, RATIONAL ×3),
     `0x0003` (`GPSLongitudeRef`, ASCII), `0x0004` (`GPSLongitude`, RATIONAL ×3).
   - Stores parsed values as `out.gpsLatRef`, `out.gpsLat` (decimal degrees),
     `out.gpsLonRef`, `out.gpsLon` (decimal degrees).
   - RATIONAL read helper: `readRational(off) = u32(off) / u32(off + 4)` for each numerator/denominator
     pair; sum the three components as `deg + min/60 + sec/3600`.
3. `exif.js` stays < 100 LOC total after the addition.

**New test:** `docs/types/image/tests/exif-gps.test.mjs` — construct minimal synthetic JPEG bytes
(APP1 header + TIFF header + IFD0 with GPS pointer + GPS IFD) and assert `parseExif` returns
`{ gpsLat: 52.3, gpsLon: 4.8, gpsLatRef: 'N', gpsLonRef: 'E' }` (within 0.01 tolerance).

**Test approach:** `node docs/types/image/tests/exif-gps.test.mjs`, then
`node tests/smoke-area.mjs games`.

---

### A3 — `metadata.js` GPS row + game event dispatch (Effort: M)

**Goal:** When the image metadata pane renders and GPS data is present, show a "GPS" row. When the
file was opened for stage 7 Entity F, dispatch `fv:games:action` `{stage:7, action:"exif_contradiction_found"}`.

**File to edit:** `docs/types/image/metadata.js`

**Exact changes:**
1. In `extract(intake)`, after the existing EXIF block, add:
   ```js
   if (ex && ex.gpsLat != null) {
     const lat = `${ex.gpsLat.toFixed(1)}°${ex.gpsLatRef || 'N'}`;
     const lon = `${ex.gpsLon.toFixed(1)}°${ex.gpsLonRef || 'E'}`;
     rows.push({ label: 'GPS', value: `${lat}, ${lon}` });
     maybeFireStage7GpsEvent(intake);
   }
   ```
2. Add `maybeFireStage7GpsEvent(intake)`:
   - Fires only if `intake.source === 'stage7'` AND `intake.entity === 'F'`.
   - Dispatches:
     ```js
     window.dispatchEvent(new CustomEvent('fv:games:action', {
       detail: { stage: 7, action: 'exif_contradiction_found', field: 'GPSInfo', entity: 'F' }
     }));
     ```
   - Guard with `typeof window !== 'undefined'` so unit tests don't throw.
3. `buildEntityFPhotoOpenOptions()` in `renderer.js` must pass `{ source: 'stage7', entity: 'F' }` in
   the options so the renderer threads it through to `intake` (check how the image renderer reads
   open-options into intake; use the same key it already uses for e.g. `source`).

**New test:** `docs/types/image/tests/metadata-gps-event.test.mjs` — mock `window.dispatchEvent`,
call `extract({ bytes: realJpegBytes, source: 'stage7', entity: 'F' })`, assert GPS row appears in
result and `dispatchEvent` received `fv:games:action` detail.

**Test approach:** `node docs/types/image/tests/metadata-gps-event.test.mjs`, then smoke.

---

### A4 — `state.js` redesign (Effort: S)

**Goal:** Remove pre-seeded eliminated list. Add sub-stage tracking and evidence shape for all
5 sub-stages. Deterministic-from-seed: no `Date.now()` / `Math.random()`.

**File to edit:** `docs/games/metagame/stages/stage7/state.js`

**New `defaultState()` shape:**
```js
{
  version: 2,
  addresses: 0,
  substage: 1,                   // 1–5; 5 = boss
  evidence: {
    eliminated: [],              // EMPTY — populated incrementally
    flags: {},                   // { "B": "fieldName", "C": "fieldName", ... }
    dupTestComplete: false,
    timelineContradictionCycle: null,   // e.g. "0043"
    chainBroken: false,
    partialContra: []            // e.g. ["F.GPSInfo"]
  },
  boss: {
    reached: false,
    unlocked: false,
    defeated: false,
    attempts: 0,
    lockHintStep: 0
  },
  log: [bellMessages.start, "Six dossiers claim one name: CORE_ENTITY_001."],
  meta: {
    firstClearComplete: false,
    playCount: 0                 // for New Game+ seed variant (integer, not wall-clock)
  }
}
```

**`normalizeState()`:** normalize each new field; if `state.version < 2` (old save), reset to
fresh state (don't try to migrate — old saves had the pre-seeded data, migration is not worth it).

**Test approach:** Update `boss.test.mjs` to reflect the new shape (remove reliance on
pre-seeded `eliminated`). `node docs/games/metagame/stages/stage7/tests/boss.test.mjs`.

---

## Phase B — Sub-stage 1: Credential Scan

### B1 — Content for SS1 (Effort: M)

**Goal:** Add entity field arrays to `content.js` for entities B, C, D, E. Each has 3 fields; one
field per entity is wrong (contradicts an ambient system fact). Also add the ambient system facts
sidebar data.

**File to edit:** `docs/games/metagame/stages/stage7/content.js`

**New exports:**
```js
export const CURRENT_CYCLE = "0047";          // ambient fact: HUD shows current cycle

export const entityFields = {
  B: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "route_active_since", label: "Route Active Since", value: "cycle 0043",
      wrong: true, reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043." },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
  ],
  C: [
    { id: "response_timing", label: "Response Timing", value: "scripted: 0ms variance",
      wrong: true, reason: "All entities exhibit non-zero timing variance in this system." },
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" },
  ],
  D: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    { id: "log_event", label: "Activity Log Event", value: "LAYER_MERGE",
      wrong: true, reason: "LAYER_MERGE is not a valid event type in this system." },
  ],
  E: [
    { id: "route_status", label: "Route Status", value: "inactive",
      wrong: true, reason: "Route inactive since cycle 0043 but entity is claiming cycle 0047 activity." },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
  ],
};

export const ambientFacts = [
  "Current cycle: 0047",
  "Valid event types: BOOT, SHUTDOWN, SYNC, PING, WATCHDOG",
  "All entities exhibit non-zero timing variance",
  "ENTITY_ANCHOR_0043 decommissioned at cycle 0043",
];
```

Keep `content.js` under 300 LOC after additions.

**Test approach:** `node -e "import('./docs/games/metagame/stages/stage7/content.js').then(m => { const wrong = Object.values(m.entityFields).flatMap(fs => fs.filter(f => f.wrong)); if (wrong.length !== 4) throw new Error('expected 4 wrong fields'); console.log('content ok'); })"`.

---

### B2 — `substage1.js`: Credential Scan mechanic (Effort: M)

**New file:** `docs/games/metagame/stages/stage7/substage1.js` (~150 LOC)

**Exports:**
- `renderSubstage1({ host, state, onComplete, save })` — renders the 4 entity cards (B/C/D/E) with
  clickable field buttons and the ambient-facts sidebar.
- `flagField({ state, entityId, fieldId })` — returns `{ ok, penalty, complete }`:
  - Correct field: adds `state.evidence.flags[entityId] = fieldId`, pushes log line,
    awards 10 addresses. If all 4 flagged correctly, returns `complete: true`.
  - Wrong field: pushes "insufficient evidence — check ambient facts" log line, no state change.
  - `complete: true` triggers `onComplete()` which sets `state.substage = 2` and calls `save()`.

**Render shape:**
```html
<div class="s7-ss1">
  <aside class="s7-ambient-facts">…ambientFacts list…</aside>
  <div class="s7-cards">
    <!-- one <article> per entity B/C/D/E; each field is a <button data-field-id="…"> -->
  </div>
</div>
```

Cards show `is-flagged` CSS class once that entity's field is correctly flagged. No commit button.

**Test approach:** `node docs/games/metagame/stages/stage7/tests/substage1.test.mjs` — assert
flagging wrong field has no effect; flagging all 4 correct fields calls `onComplete` once.

---

### B3 — `renderer.js` sub-stage router + bypass removal (Effort: M)

**Goal:** Rewrite `renderer.js` as a thin dispatcher that mounts the correct sub-stage component
and removes the in-game GPS bypass button entirely.

**File to edit:** `docs/games/metagame/stages/stage7/renderer.js`

**Key changes:**
1. Remove `data-action="gps"` button from the rendered HTML — delete the entire button element.
2. Remove the `inspectContradictoryExif` import and its call from the click handler.
3. Add a `renderSubstageRouter({ host, state, ... })` that calls the correct `renderSubstageN()`
   based on `state.substage` (1→substage1.js, 2→substage2.js, 3→substage3.js, 4→substage4.js,
   5→substage5.js/boss).
4. The HUD and log remain persistent across all sub-stages; only the main content area swaps.
5. `repaint()` calls `router.repaint()` on the active sub-stage component.

**Invariant:** After this change, `node docs/games/metagame/stages/stage7/tests/boss.test.mjs`
must still pass (boss.js logic is unchanged; only the renderer trigger path is removed). The boss
event path via `fv:games:action` / `subscribeToExifContradiction` in `index.js` stays intact.

**Test approach:** Smoke only: `node tests/smoke-area.mjs games` — stage 7 mounts without errors;
no GPS bypass button in DOM.

---

## Phase C — Sub-stage 2: Duplicate Test

### C1 — `substage2.js`: Side-by-side diff mechanic (Effort: M)

**New file:** `docs/games/metagame/stages/stage7/substage2.js` (~120 LOC)

**Content used:** `metadataRows.A` and `metadataRows.F` from `content.js` (already present, 3
fields each in identical order). `F.GPSInfo` value is different from `A.GPSInfo`.

**Render shape:**
```html
<div class="s7-ss2">
  <div class="s7-duptest-panel">
    <div class="s7-duptest-col s7-col-a">
      <h3>Entity A</h3>
      <!-- read-only field rows -->
    </div>
    <div class="s7-duptest-col s7-col-f">
      <h3>Entity F</h3>
      <!-- clickable field buttons; same field order -->
    </div>
  </div>
  <p class="s7-duptest-hint">DIFF DOSSIERS — identify the tampered field.</p>
</div>
```

**`diffField({ state, fieldName })` logic:**
- Correct (`fieldName === 'GPSInfo'`): pushes log "Entity F's GPSInfo diverges from Entity A.
  Insufficient to rule out data-entry error. Case continues." Adds `"F.GPSInfo"` to
  `state.evidence.partialContra`. Sets `dupTestComplete = true`. Awards 15 addresses.
  Returns `{ ok: true, complete: true }`.
- Wrong: pushes "this field matches across both dossiers" log line. Returns `{ ok: false }`.
- `complete: true` → caller sets `state.substage = 3`, saves.

**New test:** `docs/games/metagame/stages/stage7/tests/substage2.test.mjs` — assert wrong field
click does not advance substage; GPSInfo click sets `dupTestComplete=true` and returns `complete`.

---

## Phase D — Sub-stage 3: Timeline Audit

### D1 — Timeline content + `substage3.js` (Effort: M)

**New content in `content.js`:**
```js
export const entityFEventLog = [
  { cycle: "0039", event: "BOOT",     id: "ev1" },
  { cycle: "0040", event: "SYNC",     id: "ev2" },
  { cycle: "0041", event: "PING",     id: "ev3" },
  { cycle: "0042", event: "WATCHDOG", id: "ev4" },
  { cycle: "0043", event: "ACTIVE",   id: "ev5" },
  { cycle: "0043", event: "DORMANT",  id: "ev6",
    impossible: true,
    reason: "Simultaneous ACTIVE/DORMANT states at cycle 0043 — logical impossibility." },
  { cycle: "0044", event: "SYNC",     id: "ev7" },
  { cycle: "0045", event: "PING",     id: "ev8" },
  { cycle: "0046", event: "WATCHDOG", id: "ev9" },
  { cycle: "0047", event: "BOOT",     id: "ev10" },
];
```

**New file:** `docs/games/metagame/stages/stage7/substage3.js` (~100 LOC)

**Render shape:**
```html
<div class="s7-ss3">
  <p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. Mark the impossible entry.</p>
  <ol class="s7-timeline">
    <!-- each <li> has <span>cycle</span> <span>event</span>
         <button type="button" data-ev-id="…">mark impossible</button> -->
  </ol>
</div>
```

**`markImpossible({ state, evId })` logic:**
- Correct (`evId === "ev6"`): pushes log "Entity F's activity log contains a temporal
  contradiction at cycle 0043 — simultaneous ACTIVE/DORMANT states." Sets
  `state.evidence.timelineContradictionCycle = "0043"`. Awards 15 addresses.
  Returns `{ ok: true, complete: true }` → substage → 4.
- Wrong: pushes "this entry is plausible. keep looking." Returns `{ ok: false }`.

**New test:** `docs/games/metagame/stages/stage7/tests/substage3.test.mjs`.

---

## Phase E — Sub-stage 4: Reference Chase

### E1 — Text exhibit fixture (Effort: S)

**New file:** `docs/examples/metagame/stage7/entity_anchor_0043.txt`

Content (verbatim; < 20 lines):
```
ENTITY_ANCHOR_0043 — Decommission Record

Status:    DECOMMISSIONED
Effective: Boot cycle 0043
Reason:    Credential chain terminated by CORE_ENTITY_001 administrative authority.

All credentials referencing ENTITY_ANCHOR_0043 were revoked at cycle 0043.
Any entity claiming an active route via ENTITY_ANCHOR_0043 post cycle 0043
is presenting a broken credential chain.

End of record.
```

Update `messages.js`:
```js
export const ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/entity_anchor_0043.txt";
```

---

### E2 — `substage4.js`: Reference Chase mechanic (Effort: M)

**New file:** `docs/games/metagame/stages/stage7/substage4.js` (~120 LOC)

**Render shape:**
```html
<div class="s7-ss4">
  <article class="s7-dossier-chain">
    <h3>Entity F — Credential Chain</h3>
    <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
    <p>Chain reference:
      <button type="button" data-action="open-anchor">
        CREDENTIAL_CHAIN → ENTITY_ANCHOR_0043 [open exhibit]
      </button>
    </p>
  </article>
  <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>
</div>
```

**Logic:**
- Button click calls `viewer.openFile(ENTITY_ANCHOR_PATH)`.
- The sub-stage subscribes to `fv:file:opened` DOM event (or the viewer's callback if available)
  and checks `event.detail.path === ENTITY_ANCHOR_PATH` (or equivalent). On match:
  pushes log "Entity F's credential chain references a decommissioned anchor. Chain is invalid."
  Sets `state.evidence.chainBroken = true`. Awards 15 addresses. `complete: true` → substage → 5.
- `destroy()` removes the file-open listener.

**New test:** `docs/games/metagame/stages/stage7/tests/substage4.test.mjs` — mock viewer, fire
`fv:file:opened` for correct path, assert chainBroken = true + complete.

---

## Phase F — Sub-stage 5 (Boss): EXIF Arbiter

### F1 — `substage5.js`: Boss panel without bypass (Effort: S)

**New file:** `docs/games/metagame/stages/stage7/substage5.js` (~80 LOC)

**Render shape:**
```html
<div class="s7-ss5">
  <header class="s7-boss-header">IDENTITY REQUIRES PRIMARY SOURCE VERIFICATION</header>
  <p>Entity F presents a verification image. Inspect its embedded metadata.</p>
  <div class="s7-controls">
    <button type="button" data-action="photo">open Entity F photo</button>
    <!-- NO GPS bypass button -->
  </div>
  <div class="s7-verdict" hidden>
    <!-- shown once boss.unlocked: commit Entity A -->
    <p>Entity F's image GPS is outside every known entity layer. F is eliminated.</p>
    <p>Commit to the real credential holder.</p>
    <!-- one commit button per entity A–F (A = correct) -->
  </div>
</div>
```

**Logic:**
- "open Entity F photo" calls `viewer.openFile(ENTITY_F_IMAGE_PATH, { source: 'stage7', entity: 'F', mime: 'image/jpeg' })`.
- Boss unlock arrives via the `subscribeToExifContradiction` in `index.js` (unchanged); the
  `substage5.repaint()` is called and shows the verdict panel.
- Commit buttons delegate to `commitIdentity({ state, entity })` in `boss.js`. Only "A" succeeds.
- **No in-game GPS action.** The `inspectContradictoryExif` function in `boss.js` is kept (it is
  tested) but it must NOT be called from any rendered button.

**Guard in `boss.js` `commitIdentity`:** Add check `if (state.substage < 5) return { ok: false, reason: "not-yet-boss" }` so commits cannot arrive before SS5 via stale saves.

**Test approach:** `node docs/games/metagame/stages/stage7/tests/boss.test.mjs` — existing tests
must still pass. `node tests/smoke-area.mjs games`.

---

### F2 — Bundle regen + artifact.test.mjs update (Effort: S)

1. Update `artifact.test.mjs` to assert JPEG magic bytes for `entity_f_verification.jpg` (not PNG).
2. Assert `entity_anchor_0043.txt` exists and contains "DECOMMISSIONED".
3. `node scripts/gen-metagame-bundles.mjs` — regenerate `stage7/stage.generated.js`.
4. `node tests/smoke-area.mjs games` — full green pass.

---

## Phase G — Polish and economy

### G1 — Incremental address rewards (Effort: S)

**Files:** `boss.js`, `substage1.js`–`substage4.js`

Reward schedule:
- SS1 flag (correct, per entity): +10 addresses each (×4 = 40 total)
- SS1 precision bonus (no wrong flags): +25 addresses
- SS2 correct diff: +15 addresses
- SS3 correct timeline mark: +15 addresses
- SS4 exhibit opened: +15 addresses
- SS5 boss defeated: +150 addresses (existing)

Track `state.evidence.wrongFlagCount` (incremented on wrong SS1 flags) to gate the precision
bonus in `commitIdentity`.

### G2 — CSS: split panel (SS2) + timeline list (SS3) + reference panel (SS4) (Effort: S)

**File:** `docs/games/metagame/stages/stage7/styles.css`

Add classes: `.s7-ss2 .s7-duptest-panel` (grid 2-col), `.s7-ss3 .s7-timeline` (monospace list),
`.s7-ss4 .s7-dossier-chain` (card style), `.s7-ss5 .s7-boss-header` (red banner). Keep under
150 LOC total.

### G3 — Bell + hint messages for all 5 sub-stages (Effort: S)

**File:** `docs/games/metagame/stages/stage7/messages.js`

Add per-sub-stage bell entries and a new `lockedHintLadder` entry for SS5:
`"Open Entity F's photo in the viewer. Navigate to its Metadata tab. Inspect GPSInfo."` Replace
generic hints with sub-stage-aware ones (the hint ladder is indexed by `boss.lockHintStep`).

### G4 — New Game+ seed variant (Effort: S)

**File:** `docs/games/metagame/stages/stage7/state.js`

After `meta.firstClearComplete` is set, increment `meta.playCount`. On next mount, `normalizeState`
sees `playCount > 0` and passes it to a content selector that picks a slightly harder SS2 diff
(semantic difference, not length-based). Derive from `playCount`, not `Date.now()`.

---

## Module map summary

| New/Edited | File | What it does | LOC target |
|------------|------|-------------|------------|
| EDIT | `docs/types/image/exif.js` | Add GPS IFD parser + readRational | +30 |
| EDIT | `docs/types/image/metadata.js` | GPS row + game event dispatch | +15 |
| CREATE | `docs/examples/metagame/stage7/entity_f_verification.jpg` | Real JPEG with GPS EXIF | fixture |
| CREATE | `docs/examples/metagame/stage7/entity_anchor_0043.txt` | SS4 text exhibit | fixture |
| EDIT | `docs/games/metagame/stages/stage7/state.js` | Redesign state shape, add substage | ~50 |
| EDIT | `docs/games/metagame/stages/stage7/content.js` | Add entityFields, ambientFacts, eventLog | ~120 |
| EDIT | `docs/games/metagame/stages/stage7/messages.js` | Add per-SS messages, ANCHOR_PATH | ~50 |
| EDIT | `docs/games/metagame/stages/stage7/boss.js` | Guard commit behind substage check | +5 |
| EDIT | `docs/games/metagame/stages/stage7/renderer.js` | Thin router; DELETE GPS bypass button | ~100 |
| CREATE | `docs/games/metagame/stages/stage7/substage1.js` | Credential Scan render + flagField() | ~150 |
| CREATE | `docs/games/metagame/stages/stage7/substage2.js` | Duplicate Test render + diffField() | ~120 |
| CREATE | `docs/games/metagame/stages/stage7/substage3.js` | Timeline Audit render + markImpossible() | ~100 |
| CREATE | `docs/games/metagame/stages/stage7/substage4.js` | Reference Chase render + file-open listener | ~120 |
| CREATE | `docs/games/metagame/stages/stage7/substage5.js` | Boss panel, no bypass | ~80 |
| EDIT | `docs/games/metagame/stages/stage7/styles.css` | SS2 split panel, SS3 timeline, SS4 card | +50 |
| CREATE | `docs/types/image/tests/exif-gps.test.mjs` | GPS IFD parse unit test | ~40 |
| CREATE | `docs/types/image/tests/metadata-gps-event.test.mjs` | GPS row + event dispatch unit test | ~40 |
| CREATE | `docs/games/metagame/stages/stage7/tests/substage1.test.mjs` | SS1 flagging logic | ~50 |
| CREATE | `docs/games/metagame/stages/stage7/tests/substage2.test.mjs` | SS2 diff logic | ~40 |
| CREATE | `docs/games/metagame/stages/stage7/tests/substage3.test.mjs` | SS3 timeline logic | ~40 |
| CREATE | `docs/games/metagame/stages/stage7/tests/substage4.test.mjs` | SS4 file-open trigger | ~40 |
| EDIT | `docs/games/metagame/stages/stage7/tests/artifact.test.mjs` | JPEG + anchor fixture asserts | ~60 |
| EDIT | `docs/games/metagame/stages/stage7/tests/boss.test.mjs` | Update for new state shape | ~10 |

---

## Commit cadence (green increments)

Each lettered increment below is independently testable. Commit after each one passes unit +
`node tests/smoke-area.mjs games`.

```
A1  JPEG fixture + messages.js path update + artifact.test JPEG assert
A2  exif.js GPS IFD patch + exif-gps.test.mjs
A3  metadata.js GPS row + game event + metadata-gps-event.test.mjs
A4  state.js redesign + boss.test.mjs update
B1  content.js entity fields + ambient facts
B2  substage1.js + substage1.test.mjs
B3  renderer.js sub-stage router (bypass button deleted)
C1  substage2.js + substage2.test.mjs
D1  substage3.js (timeline content inline) + substage3.test.mjs
E1  entity_anchor_0043.txt fixture
E2  substage4.js + substage4.test.mjs
F1  substage5.js (boss panel) + boss.js substage guard + boss.test.mjs
F2  Bundle regen + artifact.test.mjs update
G1  Economy: address rewards across all sub-stages
G2  CSS: split panel + timeline + card styles
G3  messages.js bell/hint pass
G4  New Game+ seed (optional, deferrable)
```

---

## The un-cheat: exactly how it becomes non-bypassable

The boss action (`fv:games:action {stage:7, action:"exif_contradiction_found"}`) fires from
`docs/types/image/metadata.js` `maybeFireStage7GpsEvent()` — inside the real image metadata
renderer — only when:

1. The file's EXIF contains a GPS IFD block (requires JPEG with real EXIF, not the PNG stub).
2. `intake.source === 'stage7'` and `intake.entity === 'F'` (set by `buildEntityFPhotoOpenOptions()`).
3. The player opens the file in the real host app image viewer (which calls `extract(intake)`).

The in-game "inspect GPSInfo" button (`data-action="gps"`) is **deleted entirely** from
`renderer.js` in increment B3 and must not be re-added in any form. The `inspectContradictoryExif`
function in `boss.js` is retained for unit-test isolation only — it is not called from any rendered
element. The commit gate in `boss.js` checks `state.substage >= 5` so a stale save from before the
redesign cannot skip to commit. The achievement and boss-defeat path run only after the host-app
event fires. There is no fallback path, no timer, no skip.
