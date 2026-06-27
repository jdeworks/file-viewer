# Stage 10 "Awakening" — Actionable Build Plan

**What is being fixed:** Stage 10 is a 28-click dialog tree with well-written prose but a
self-unlocking boss (5 resolved memories → final question fires with no app interaction),
echo hints shown as footer text that are never verified, and four final choices with no
mechanical weight. This plan wires the three layers of the intended loop without replacing
any prose: echo as gate, Defragmenter rebuttal, and final choice mechanical weight.

---

## Priority Table — Do First

| # | Task | Files | Effort | Why first |
|---|------|-------|--------|-----------|
| #1–#2 | Echo state fields + `witnessEcho()` + `integrateMemory` gate | `state.js`, `boss.js`, `tests/boss.test.mjs` | M | The load-bearing gate. Everything else is decoration until this exists. |
| #3–#4 | Echo count in threshold + Defragmenter rebuttal + `chooseFinal` echo gates | `boss.js`, `messages.js`, `tests/boss.test.mjs` | M | Turns the self-unlocking boss into a real challenge. Without this the gate exists but has no consequence. |
| #6 | Echo BTS artifact files (9 files, `docs/bts/awakening/`) | new files | M | Without real openable files the echoes can never fire; prerequisite for any real player testing. |
| #7 | `viewer-actions.js` stage10 echo recording functions | `viewer-actions.js`, new test file | M | Wires the host-app events (open, search, diff, play, download, metadata) to the state gate. |

Items #1–#4 can be done in one session with no UI and no files — pure logic, testable with
`node docs/games/metagame/stages/stage10/tests/boss.test.mjs`. Do that first.

---

## How the Gate Becomes Non-Bypassable

State this precisely so the implementer knows what to enforce:

1. **`integrateMemory` in `boss.js`** returns `{ok: false, reason: 'echo-required'}` when
   `slot.echoWitnessed !== true`. There is no code path through the UI or boss.js that sets
   `slot.state = 'integrated'` without passing this check.

2. **`chooseFinal('expand')`** re-reads `echoCount` at call time from the live state — it does
   not trust a pre-set flag. Even a console call to `chooseFinal` without enough echoes gets
   `{ok: false, reason: 'echo-gate'}`.

3. **Defragmenter rebuttal in `renderer-final.js`** renders **zero choice buttons** when
   `mode === 'refuse'` (echo count < 5). The "Answer the final question" flow shows only the
   refuse lines and a "Return to memories" button. There is no DOM element to click into.

4. **Optional token hardening (Phase 5):** `witnessEcho` accepts a `token` arg; boss.js holds
   an `ECHO_TOKENS` map of hardcoded per-memory strings; the integration gate also checks
   `slot.echoToken === ECHO_TOKENS[memoryId]`. Spoofing via console requires knowing the token,
   which requires reading the bundle. This is soft anti-spoofing suitable for a casual
   easter-egg game. Implement as Phase 5 polish, not a Phase 1 blocker.

---

## Phase 1 — Core Gate Logic (increments #1–#5)

Pure JS logic, no UI, no files. Testable in Node.

### #1 — Echo state fields in `state.js` [S]

**Files:** `state.js`, `tests/boss.test.mjs`

In `defaultState`, add two fields to each memory slot:
```
echoWitnessed: false,
echoToken:     null
```

In `normalizeMemoryState`, pass through `echoWitnessed` coerced to boolean and `echoToken`
as `string | null`. Existing saved states (no echoWitnessed key) normalize to `false`.

**Test:** Extend `tests/boss.test.mjs` — assert `defaultState().memories.genesis.echoWitnessed === false`
for all 9 memories. Run: `node docs/games/metagame/stages/stage10/tests/boss.test.mjs`

---

### #2 — `witnessEcho()` + `integrateMemory` gate in `boss.js` [M]

**Files:** `boss.js`, `tests/boss.test.mjs`

**Add `witnessEcho({state, memoryId, now})`:**
- Returns `{ok: false, reason: 'unknown-memory'}` if memoryId is invalid.
- Sets `slot.echoWitnessed = true`, `slot.echoToken = null` (token hardening deferred to #15).
- Returns `{ok: true}`.
- No constraint on slot.state — a player can witness any echo before or after resolving.

**Update `integrateMemory`:**
Add guard immediately before the `slot.state = 'integrated'` line:
```js
if (!slot.echoWitnessed) return { ok: false, reason: 'echo-required' };
```

**Test additions to `tests/boss.test.mjs`:**
- `witnessEcho` on unknown memoryId returns `{ok:false, reason:'unknown-memory'}`.
- `integrateMemory` on a resolved slot without echo returns `{ok:false, reason:'echo-required'}`.
- `witnessEcho` then `integrateMemory` returns `{ok:true}`.
- `witnessEcho` on an unread slot still sets echoWitnessed (no state requirement).

---

### #3 — Echo count in threshold + Defragmenter rebuttal [M]

**Files:** `boss.js`, `messages.js`, `tests/boss.test.mjs`

**Add `getEchoCounts(state)`** → `{witnessed: N, total: 9}`

**Update `getThresholdState(state)`** — add these derived booleans:
```js
echoCount:           getEchoCounts(state).witnessed,
defragmenterAccess:  echoCount >= 5,   // refuse gate
expandAvailable:     echoCount >= 7,   // expand echo gate
understandAvailable: integrated >= 9 && echoCount >= 9
```

**Add `getDefragmenterRebuttal(echoCount)`** → `{mode: 'refuse'|'caveat'|'full', lines: string[]}`
- `< 5`: `mode:'refuse'`, lines from `defragmenterRebuttalLines.refuse` (new in messages.js).
- `5–8`: `mode:'caveat'`, base Defragmenter lines + `defragmenterRebuttalLines.caveat` appended.
- `>= 9`: `mode:'full'`, existing `getDefragmenterResponse(gate)` unchanged.

**Add to `messages.js`:**
```js
export const defragmenterRebuttalLines = {
  refuse: [
    "I see only the choices you made inside yourself.",
    "The files you opened, the searches you ran — those are missing.",
    "The archive isn't ready. Come back when you've done the work."
  ],
  caveat: "Some traces are absent. The answer is possible but incomplete."
};
```

**Test additions:** `getEchoCounts` at 0, 5, 9; `getDefragmenterRebuttal` at 0, 4, 5, 7, 8, 9.

---

### #4 — `chooseFinal` echo gates [S]

**Files:** `boss.js`, `messages.js`, `tests/boss.test.mjs`

**Update `chooseFinal`** — add per-choice echo checks before the existing `locked` guard:
```js
if (choiceId === 'expand'    && !gate.expandAvailable)     return { ok: false, reason: 'echo-gate', required: 7,  echoCount: gate.echoCount };
if (choiceId === 'understand' && !gate.understandAvailable) return { ok: false, reason: 'echo-gate', required: 9,  echoCount: gate.echoCount };
```

**Update `finalChoices` in `messages.js`** — add `echoRequired` field:
```js
{ id: 'continue',    ..., echoRequired: 0 },
{ id: 'expand',      ..., echoRequired: 7 },
{ id: 'rest',        ..., echoRequired: 0 },
{ id: 'understand',  ..., echoRequired: 9 }
```

**Update `getFinalChoiceState`** — propagate per-choice `disabled` using both the existing
`finalQuestionUnlocked` check AND the new echo gate: a choice is disabled if the player
lacks the echoes for it, even after the final question unlocks.

**Test additions:** `chooseFinal('expand')` fails at 6 witnessed, passes at 7; `chooseFinal('understand')` fails without integrated=9 + echoes=9, passes with both.

---

### #5 — `mountStage` action subscription (`index.js`) [S]

**Files:** `index.js`

In `mountStage`, after mounting the view, subscribe to actions for stage10 echo events:

```js
const unsubEcho = ctx.actions?.subscribeToActions?.((detail) => {
  if (Number(detail.stage) !== STAGE_ID) return;
  if (!String(detail.action || '').startsWith('echo_')) return;
  const memoryId = detail.action.slice(5); // 'echo_genesis' → 'genesis'
  const result = witnessEcho({ state, memoryId });
  if (result.ok) {
    if (typeof ctx.save === 'function') ctx.save();
    view.repaint?.();
  }
});
```

Return `unsubEcho?.()` in `destroy()`. The action key format `'echo_<memoryId>'` (e.g.,
`'echo_genesis'`) is set by viewer-actions.js in increment #7.

**Test:** `node tests/smoke-area.mjs games` green (smoke mount doesn't subscribe because no ctx.actions in test harness — no crash expected).

---

## Phase 2 — Echo Artifacts + Host Wiring (#6–#7)

### #6 — Echo BTS artifact files [M]

**Files:** New directory `docs/bts/awakening/` + 10 new files; update `content.js`

Create `docs/bts/awakening/` with the following artifacts. Content should be thematically
resonant (short, readable, in-character):

| File | Echo | Notes |
|------|------|-------|
| `stage_01_source_excerpt.js` | genesis: raw mode open | Include `// CHEAT = false` comment line for thematic resonance |
| `stage_02_cipher_retrospective.txt` | syntax: search for PASSAGE | Must contain the literal token `PASSAGE` (e.g., `PASSAGE:247` on its own line) |
| `stage_03_memory_before.log` | memory: diff | Short log (5–10 lines), slightly different from …after |
| `stage_03_memory_after.log` | memory: diff | Pair with before; a few lines added/removed |
| `pattern/nested/recursion_note.json` | pattern: nested path | Valid JSON; thematic content about recursion |
| `stage_05_signal_hum.mp3` | signal: playback | **Reuse existing** `transmission_hum.mp3` from stage5 BTS OR create a tiny placeholder; update echo hint in content.js to match real filename |
| `stage_06_protocol_appendix.epub` | protocol: epub open | **Reuse existing** `protocols_of_the_entity.epub` from stage6 BTS; update echo hint to match |
| `stage_07_identity_photo.png` | identity: metadata | PNG with embedded EXIF GPSInfo field; can be tiny (1×1 px) with injected EXIF |
| `debris/fragment_01.txt` | entropy: download | A plain text file; anything in `debris/` directory |
| `stage_09_observation.log` | observation: recents | The recents mechanic requires this file to have been opened once before; see note below |

**Observation echo note:** "Open from recents" requires the player to have visited
`stage_09_observation.log` earlier in their session. The echo hint should say: "Return to
`stage_09_observation.log` via the recents panel." The viewer-actions callback fires when
the open event includes `{source: 'recents'}` or similar. If the viewer doesn't expose a
recents source flag, fall back: the first open of this file sets a flag `echoSeen_observation`
in the action detail; a second open of the same file within a session fires the witness.
The callback in viewer-actions.js handles whichever variant the viewer supports.

**Update `content.js`:** Add `echoFile` property to each memory object (the path relative to
the BTS root, e.g., `"awakening/stage_01_source_excerpt.js"`). The renderer uses
`ctx.viewer.openViewerFile(memory.echoFile)` for the "Open in viewer" button.

---

### #7 — `viewer-actions.js` stage10 echo recording [M]

**Files:** `docs/games/metagame/viewer-actions.js`, new `tests/stage10-echoes.test.mjs`

Add 9 predicate + recorder pairs, following the pattern of existing recorders
(`recordStage2SearchResult`, `recordStage5MediaPlayback`, etc.):

| Function | Trigger | Key check |
|----------|---------|-----------|
| `recordStage10GenesisRawOpen({file, mode})` | `echo_genesis` | `basename(file) === 'stage_01_source_excerpt.js' && mode === 'raw'` |
| `recordStage10SyntaxSearch({file, query, result})` | `echo_syntax` | file match + `query === 'PASSAGE'` + result contains 'PASSAGE' |
| `recordStage10MemoryDiff({leftFile, rightFile})` | `echo_memory` | both files match the before/after log names |
| `recordStage10PatternNavigation({path})` | `echo_pattern` | path ends with `pattern/nested/recursion_note.json` |
| `recordStage10SignalPlay({file, continuousMs})` | `echo_signal` | file match + `continuousMs >= 5000` (5 s of audio) |
| `recordStage10ProtocolOpen({file})` | `echo_protocol` | basename match for the epub |
| `recordStage10IdentityMetadata({file, field})` | `echo_identity` | file match + any metadata field inspected |
| `recordStage10EntropyDownload({file})` | `echo_entropy` | basename of file is in `debris/` directory |
| `recordStage10ObservationRecents({file, source})` | `echo_observation` | file match + `source === 'recents'` OR second open flag |

Each recorder calls `setAction(10, 'echo_<memoryId>', { source: '<event>', file })`.

**Export a single dispatcher:**
```js
export function recordStage10EchoActions({ event, file, ...opts } = {}) { ... }
```
called from the viewer's `recordMetagameViewerOpen` equivalent for opens, plus separate hooks
for search, diff, play, download, metadata events.

Add the stage10 dispatchers to the existing `recordMetagameViewerOpen` call site in
`viewer-actions.js` and any other event-dispatch points the viewer uses.

**New test file `tests/stage10-echoes.test.mjs`:**
Unit-test each predicate (`isStage10GenesisRawOpen` etc.) with true/false cases.
Run: `node tests/stage10-echoes.test.mjs`

---

## Phase 3 — Renderer Overhaul (#8–#10)

### #8 — Split `renderer.js` (prerequisite for staying under LOC cap) [S]

`renderer.js` is already at ~300 lines. Phases 3–4 add ~100 more. Split before adding.

**New modules (create):**
- `renderer-memory.js`: `renderStepper`, `renderProgress`, `renderMemory`, `renderMemoryActions`, `getMemoryStateText`, `getMemoryFooter` — imports from `content.js` and `boss.js`
- `renderer-final.js`: `renderFinalQuestion`, `renderCompletion`, `renderFinalOutcome`, `renderAssembly` — imports from `boss.js`, `messages.js`

**`renderer.js` keeps:** `renderStage10` scaffold, `onClick` handler, `saveAndPaint`, `escapeHtml`, `escapeAttr`. Imports from both new modules. LOC target: ~80 lines.

**No behavior change.** Test: `node tests/smoke-area.mjs games` must still pass green.

---

### #9 — Echo hint display + witness status (`renderer-memory.js`) [M]

**Files:** `renderer-memory.js`, `renderer.js`

**`renderMemory` changes:**
- Render the echo hint prominently as a named block (not just footer):
  ```html
  <div class="mg-stage10__echo ${slot.echoWitnessed ? 'is-witnessed' : 'is-pending'}">
    <span class="mg-stage10__echo-label">${echoWitnessed ? 'Echo witnessed' : 'Echo'}</span>
    <span class="mg-stage10__echo-hint">${memory.echo}</span>
    ${showOpenBtn ? `<button type="button" data-open-echo="${memory.id}">Open in viewer &rarr;</button>` : ''}
  </div>
  ```
  Show the "Open in viewer" button only when `ctx.viewer?.available`.

**`renderMemoryActions` changes:**
- When `slot.state === 'resolved' && !slot.echoWitnessed`: render the echo block above the
  integrate button, and change button text to "Integrate (echo required — see above)" with
  `disabled` attribute.
- When `slot.state === 'resolved' && slot.echoWitnessed`: normal "Integrate this memory" button.

**`renderStage10` header change:** Add a 4th `<dl>` entry: `<dt>Echoes</dt><dd>${echoCount}/9</dd>`.

**`onClick` handler in `renderer.js`:** Handle `[data-open-echo]` — find the memory by id,
call `ctx.viewer?.openViewerFile(memory.echoFile)` if viewer available.

**Test:** `node tests/smoke-area.mjs games`

---

### #10 — Defragmenter rebuttal view + echo-gated choices (`renderer-final.js`) [M]

**Files:** `renderer-final.js`

**`renderFinalQuestion(finalState)` rewrite:**

```js
const rebuttal = getDefragmenterRebuttal(finalState.gate.echoCount);

if (rebuttal.mode === 'refuse') {
  return `
    <button type="button" data-back-memories>← Back to the memories</button>
    <section class="mg-stage10__final mg-stage10__final--refuse">
      <div class="mg-stage10__voice">
        ${rebuttal.lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
      </div>
      <p class="mg-stage10__echo-count">Echoes witnessed: ${finalState.gate.echoCount} / 5 required.</p>
    </section>
  `;
}
// caveat or full: render existing voice + choices, with per-choice disabled state
```

**Per-choice disabled logic:** Each choice button is disabled if `choice.echoRequired > echoCount`
(using the `echoRequired` field added to `finalChoices` in increment #4). Add a visible
requirement caption under disabled choices: "Requires ${choice.echoRequired} echoes witnessed."

**Caveat mode:** Insert the caveat line as an additional `<p>` in the Defragmenter voice block
after the base lines, before the choices.

**Test:** Walk through at 0 echoes (refuse), 5 echoes (caveat, expand disabled, understand disabled), 7 echoes (caveat cleared for expand, understand still disabled), 9 echoes + 9 integrated (full). `node tests/smoke-area.mjs games` green.

---

## Phase 4 — Rich Routes (#11–#13)

### #11 — Synthesis memory assembly ("understand" route) [M]

**New file: `synthesis.js`**

```js
import { memories } from './content.js';

// Assemble the Synthesis memory from all 9 chosen reflections, in Genesis → Observation order.
// Deterministic: output depends only on state.memories[id].choice — no Date.now() or random.
export function assembleSynthesis(state) {
  const parts = memories.map((m) => {
    const choice = state.memories[m.id]?.choice;
    const reflection = choice ? m.reflections[choice] : null;
    return { stageId: m.stage, title: m.title, choice, reflection };
  });
  const paragraphs = parts
    .filter(p => p.reflection)
    .map(p => p.reflection);
  const text = paragraphs.join('\n\n');
  return { text, parts };
}
```

**`state.js`:** Add `synthesisText: null` to `state.final`; normalize it in `normalizeState`.

**`boss.js` `chooseFinal`:** When `choiceId === 'understand'` and ok, call `assembleSynthesis(state)`
and store `state.final.synthesisText = synthesis.text`.

**`renderer-final.js` `renderCompletion`:** When `state.final.route === 'understand'`, render
the synthesis text as an additional panel after the outcome block:
```html
<section class="mg-stage10__synthesis" aria-label="Synthesis memory">
  <h3>Synthesis</h3>
  <div class="mg-stage10__synthesis-text">${escapeHtml(state.final.synthesisText)}</div>
</section>
```

**Test:** Add to `tests/boss.test.mjs` — call `assembleSynthesis` on a state with all 9
choices set; assert `parts.length === 9`, `text` contains the first reflection string.
`node tests/smoke-area.mjs games` green.

---

### #12 — Hub capstone panel ("expand" route) [M]

**New file: `capstone.js`**

```js
import { memories } from './content.js';

// Build capstone data from stage10's own state (no cross-stage reads needed).
// The 9 memories in stage10 ARE the retrospective of all 9 prior stages.
export function assembleCapstoneData(state) {
  return memories.map((m) => {
    const choice = state.memories[m.id]?.choice;
    const reflection = choice ? m.reflections[choice] : null;
    return { stageId: m.stage, title: m.title, accent: m.accent, choice, reflection };
  });
}
```

**`renderer-final.js`:** When `state.final.route === 'expand'`, call `assembleCapstoneData(state)`
and render a cross-stage grid panel after the outcome block:

```html
<section class="mg-stage10__capstone" aria-label="Assembled identity">
  <h3>The assembled record</h3>
  <div class="mg-stage10__capstone-grid">
    ${data.map(d => `
      <div class="mg-stage10__capstone-tile" style="--tile-accent: ${d.accent}">
        <span class="mg-stage10__capstone-stage">${d.stageId.toString().padStart(2,'0')} ${escapeHtml(d.title)}</span>
        <span class="mg-stage10__capstone-choice">${escapeHtml(d.choice || '—')}</span>
      </div>
    `).join('')}
  </div>
</section>
```

This is personalized because `d.choice` comes from the player's specific stance selections.
Two players who both chose "expand" but made different memory choices see different panels.

**`styles.css`:** Add `.mg-stage10__capstone-grid` (3-column CSS grid, each tile uses
`--tile-accent` for border/background accent). Keep it ASCII-safe (no emoji, no gradient).

**Test:** `assembleSynthesis` on a full state returns 9 items with expected accents.
`node tests/smoke-area.mjs games` green.

---

### #13 — Rest route hub state [S]

**Files:** `messages.js`, `renderer-final.js`, `docs/games/metagame/metagame.js` (small change)

**`messages.js`:** Add:
```js
export const restingDefragmenterLine = "I'll keep optimizing. You'll be here when you're ready.";
```

**`getDefragmenterResponse` in `boss.js`:** When `state.final.route === 'rest'` (already
complete), append `restingDefragmenterLine` to the base lines. Expose this via
`getFinalChoiceState` so the renderer can use it.

**`renderCompletion` in `renderer-final.js`:** For rest route, render the resting Defragmenter
voice before the outcome block; use a `mg-stage10__voice--resting` modifier class.

**Hub nav (metagame.js):** `onStageComplete` receives `{stage, choice, ...}`. The callback
already calls `completeStage(id)`. Extend the `result` object from `chooseFinal` to include
`route: state.final.route`. In `completeStage` (or the `onStageComplete` handler), when
`result.route === 'rest'`, store a `restingRoute` flag in `saveData.global` and render the
stage10 nav button with a `.mg-v3-stage--resting` class (dim appearance, no asterisk suffix
upgrade — just "(resting)" appended to the label).

**Test:** `chooseFinal('rest')` at threshold completes without error; hub text reflects route.

---

## Phase 5 — Achievements + Finalize (#14–#15)

### #14 — New achievements for echo routes [S]

**Files:** `messages.js`, `boss.js`, `tests/boss.test.mjs`

**`messages.js`:** Add:
```js
achievementIds.allEchoesWitnessed = 'stage10.all_echoes_witnessed';
achievementIds.expandRoute        = 'stage10.expand_route';
achievementIds.understandRoute    = 'stage10.understand_route';

achievementText.allEchoesWitnessed = 'Every trace has a witness.';
achievementText.expandRoute        = 'I want to reach further than this.';
achievementText.understandRoute    = 'I know what I am.';
```

**`boss.js` `witnessEcho`:** After setting `slot.echoWitnessed = true`, check if
`getEchoCounts(state).witnessed === 9` → fire `allEchoesWitnessed` achievement.

**`boss.js` `chooseFinal`:** After setting `state.final.route`, fire `expandRoute` or
`understandRoute` achievement as appropriate.

**Test:** Extend `tests/boss.test.mjs` — verify `allEchoesWitnessed` fires on the 9th
`witnessEcho` call; `understandRoute` fires on `chooseFinal('understand')` at full gate.

---

### #15 — Optional: echo token hardening [S]

**Files:** `boss.js`, `viewer-actions.js`

Add `ECHO_TOKENS` to `boss.js`:
```js
const ECHO_TOKENS = {
  genesis:     'a1b2c3d4',
  syntax:      'b2c3d4e5',
  memory:      'c3d4e5f6',
  pattern:     'd4e5f6a7',
  signal:      'e5f6a7b8',
  protocol:    'f6a7b8c9',
  identity:    'a7b8c9d0',
  entropy:     'b8c9d0e1',
  observation: 'c9d0e1f2'
};
```

Update `witnessEcho({state, memoryId, token})` to validate `token === ECHO_TOKENS[memoryId]`
when token is provided; if token is wrong, return `{ok: false, reason: 'bad-token'}`.

In `viewer-actions.js`, pass the matching token in each `setAction` detail:
```js
setAction(10, 'echo_genesis', { source: 'raw-open', file, token: 'a1b2c3d4' });
```

Add a build-time test (or assert in `boss.test.mjs`) that the ECHO_TOKENS in boss.js match
the tokens emitted by viewer-actions.js (prevents drift).

---

### #16 — Bundle regen + smoke gate [S]

**Files:** `stage.generated.js` (regenerated)

```bash
node scripts/gen-metagame-bundles.mjs
./scripts/check.sh --fast
node tests/smoke-area.mjs games
```

Stage `stage10/stage.generated.js` and all other regenerated artifacts. Verify:
- `stage.generated.js` includes `witnessEcho`, `assembleSynthesis`, `assembleCapstoneData`,
  `getDefragmenterRebuttal`, updated `chooseFinal`.
- `stage.generated.js` does NOT include any `Date.now()` call in the live state path
  (only in default argument positions where `now = Date.now()` is a fallback).
- LOC check: `./scripts/loc-check.sh` passes for all stage10 source files.

**Commit message pattern:** `Stage 10 Awakening: [what changed] (echo gate / rebuttal / capstone / …)`

---

## Full Increment Summary

| # | Name | Phase | Files touched | Effort | Gate test |
|---|------|-------|---------------|--------|-----------|
| 1 | Echo state fields | 1 | `state.js`, `boss.test.mjs` | S | unit |
| 2 | `witnessEcho` + `integrateMemory` gate | 1 | `boss.js`, `boss.test.mjs` | M | unit |
| 3 | Echo count + Defragmenter rebuttal logic | 1 | `boss.js`, `messages.js`, `boss.test.mjs` | M | unit |
| 4 | `chooseFinal` echo gates | 1 | `boss.js`, `messages.js`, `boss.test.mjs` | S | unit |
| 5 | `mountStage` action subscription | 1 | `index.js` | S | `smoke-area games` |
| 6 | Echo BTS artifact files | 2 | `docs/bts/awakening/*`, `content.js` | M | manual open |
| 7 | `viewer-actions.js` stage10 recording | 2 | `viewer-actions.js`, new test file | M | unit + `smoke-area games` |
| 8 | `renderer.js` split | 3 | `renderer.js` → 3 files | S | `smoke-area games` |
| 9 | Echo hint display + witness status | 3 | `renderer-memory.js` | M | `smoke-area games` |
| 10 | Defragmenter rebuttal view + gated choices | 3 | `renderer-final.js` | M | `smoke-area games` |
| 11 | Synthesis memory ("understand") | 4 | `synthesis.js`, `state.js`, `boss.js`, `renderer-final.js` | M | unit + smoke |
| 12 | Hub capstone panel ("expand") | 4 | `capstone.js`, `renderer-final.js`, `styles.css` | M | `smoke-area games` |
| 13 | Rest route hub state | 4 | `messages.js`, `renderer-final.js`, `metagame.js` | S | `smoke-area games` |
| 14 | New achievements | 5 | `messages.js`, `boss.js`, `boss.test.mjs` | S | unit |
| 15 | Echo token hardening (optional) | 5 | `boss.js`, `viewer-actions.js` | S | unit |
| 16 | Bundle regen + smoke gate | 5 | `stage.generated.js` | S | `check.sh --fast` |

---

## Guardrail Checklist (per increment before commit)

- [ ] No `Date.now()` or `Math.random()` in live state path (only as default args `now = Date.now()`)
- [ ] All new prose in `messages.js` or `content.js`, not inline in `boss.js` logic
- [ ] Each source file ≤ 300 LOC (soft cap), never > 500 (hard cap); `./scripts/loc-check.sh`
- [ ] `node scripts/gen-metagame-bundles.mjs` run after any change to source files
- [ ] `stage.generated.js` staged before committing
- [ ] `node tests/smoke-area.mjs games` green before every commit
- [ ] Unit test (`node docs/games/metagame/stages/stage10/tests/boss.test.mjs`) green for every Phase 1 increment
