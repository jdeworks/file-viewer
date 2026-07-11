# Stage 10 "Awakening" — Round 3 Evaluation

**Evaluator:** Rigorous critic pass. Read-only. Tests run; no edits made.
**Test result:** 6/6 files PASS (achievements, boss, confront, crossstage, echo-token, epilogue).

---

## Scores

| # | Dimension | Score | One-line justification |
|---|-----------|-------|------------------------|
| 1 | Genre fidelity (narrative finale) | 7/10 | Three-phase confront + stance epilogue is genuinely Planescape-flavored; echo verb diversity (the Edith Finch skeleton) was never built |
| 2 | Fun / engagement | 5/10 | Phase A recall mechanic is clever; echo excursions collapse to "open a txt file 9 times" — no discovery, no verb learning |
| 3 | Theme fit (compaction metaphor) | 8/10 | "I compact what isn't load-bearing" is pitch-perfect; Defragmenter voice is the best prose in the metagame |
| 4 | Depth & length (40–120 min target) | 4/10 | With txt-only echoes, 9 excursions take ~5 min total not 45–90; target unreachable without real verb diversity |
| 5 | Difficulty curve & onboarding | 6/10 | Four-state memory arc is well-paced; Phase A scramble could be near-impossible without memory; echo hint names actions that aren't enforced |
| 6 | Polish / UX / readability | 5/10 | CSS architecture is good BUT `.mg-stage10__echo` has zero CSS rules — the load-bearing gate block is completely unstyled |
| 7 | Determinism & correctness | 8/10 | FNV-1a compaction seed, token gate in subscribeToEchoes, null-guarded crossstage — all solid; Phase B re-witness bypass is a logic flaw |
| 8 | Replayability (routes/endings) | 7/10 | Four routes with real content differences; stance system (keeper/seeker/free) genuinely personalises the epilogue; `understand` synthesis is strong |
| 9 | Technical health | 7/10 | All files under 300 LOC, tests pass, no live entropy in state path, token anti-spoof correct; Phase B and missing echo CSS are the two structural defects |
| 10 | Un-cheat discoverability | 5/10 | Echo block visible on every memory, disabled-button copy is clear, but "raw mode" / "diff" / "play mp3" hints describe gates that are never enforced |

**Weighted average: 6.2 / 10**

---

## GLOBAL LAW COMPLIANCE

| Law | Status | Notes |
|-----|--------|-------|
| Boss only after full stage body | PASS | `chooseFinal` requires `state.confront.completed` (boss.js:230); confront entry gate is `finalQuestionUnlocked && defragmenterAccess` |
| Un-cheat uses a REAL app feature, not trivially bypassable | PARTIAL FAIL | Integration echo gate is real and token-protected; Phase B re-witness is bypassable on click (see Issue #2) |
| Zero off-origin | PASS | No CDN references in any stage10 source |
| Deterministic seeded RNG | PASS | `getCompactionOptions` uses FNV-1a seeded from `createdAt`; echo tokens are static functions of memoryId only |
| Modular files (300 soft / 500 hard LOC) | PASS | Largest file is boss.js at 296 LOC |

---

## TOP ISSUES

### Issue 1 — Echo verbs all collapse to plain-text opens (CRITICAL)

**Where:** `viewer-actions.js:253–259`, `content.js:238–246`, `/docs/bts/awakening/*`

The design's core mechanic — 9 distinct viewer capabilities as echo gates (raw mode, in-file search, diff, nested navigation, media playback, epub, metadata panel, download, recents) — was never implemented. Every echo resolves to `*_echo.txt` open events, handled by a single `recordStage10EchoOpen` function that only checks the filename pattern (`/^([a-z]+)_echo\./`). No mode, no format, no interaction type is checked.

The actual echo hints describe verbs that are never enforced:
- Genesis: "Open stage_01_source_excerpt.js **in raw mode**" — opens a txt in any mode.
- Memory: "**Diff** stage_03_memory_before.log and stage_03_memory_after.log" — only `memory_echo.txt` exists; no diff pair; no diff verb.
- Signal: "**Play** stage_05_signal_hum.mp3" — opens `signal_echo.txt`, a text file; no audio renderer.
- Protocol: "Open stage_06_protocol_appendix.**epub**" — opens `protocol_echo.txt`.
- Identity: "**Inspect metadata** on stage_07_identity_photo.png" — opens `identity_echo.txt`.
- Entropy: "Archive one memory fragment from **debris/**" — there is no `debris/` subdirectory; opens `entropy_echo.txt`.
- Observation: "Open the **cached** observation memory" (recents panel) — just a txt open.

This collapses the most distinctive design element of Stage 10 into nine identical interactions. The Edith Finch "new verb per sub-stage" arc does not exist.

**Fix:** Implement Phase 2 (#6–#7 from buildplan): create real artifact files (`signal_echo.mp3`, `memory_before.log`/`memory_after.log`, `identity_echo.png`, `debris/fragment_01.txt`), then extend `recordMetagameViewerOpen` (and add a mode-switch hook, a diff-open hook, a download hook) to dispatch the correct echo verb. Priority order: genesis (raw mode, just check `opts.mode === 'raw'`), signal (mp3 actual file, fires on media renderer mount), entropy (download event on any file in `debris/`). Those three alone differentiate the experience; the rest follow the same pattern.

---

### Issue 2 — Phase B re-witness fires on click, not on actual viewer open (HIGH)

**Where:** `renderer.js:155–159`

```js
const fragButton = event.target.closest("[data-confront-echo]");
if (fragButton) {
  const id = fragButton.dataset.confrontEcho;
  openEcho(ctx, id);                                    // fire-and-forget
  rewitnessFragmentation({ state, memoryId: id, save: save() }); // fires unconditionally
  saveAndPaint(ctx, repaint);
  return true;
}
```

`rewitnessFragmentation` sets the transient confront flag immediately, regardless of whether `openEcho` finds a viewer or the file loads. A player can click "Re-open echo in viewer →" in Phase B and advance without the viewer doing anything (e.g., if `ctx.viewer` is absent, or the file fails to load). This undermines the Phase B "prove you did the work" premise.

The integration echo gate (Phase A prerequisite) is properly token-gated via the `subscribeToEchoes` action subscription in index.js. Phase B should use the same path: the click opens the file; `rewitnessFragmentation` fires when the echo action returns from the viewer (carrying the valid token), not immediately.

**Fix:** Remove the direct `rewitnessFragmentation` call from the click handler. In `subscribeToEchoes` (index.js:34–41), when `state.confront.phase === 'fragmentation'`, already call `rewitnessFragmentation` after a successful token-verified echo. This path exists — it just needs to be the only path.

---

### Issue 3 — Echo block has no CSS (HIGH)

**Where:** `styles.css` (338 lines), `styles-confront.css` (182 lines)

The renderer-memory.js echo block uses these classes:
- `.mg-stage10__echo`, `.mg-stage10__echo.is-witnessed`, `.mg-stage10__echo.is-pending`
- `.mg-stage10__echo-label`, `.mg-stage10__echo-hint`

None appear in either stylesheet. Every player on every memory sees an unstyled block — no visual distinction between witnessed and pending states, no border/background indicating "this is a gate." The "Open echo in viewer →" button gets the generic button style but the surrounding block has no container style.

The `.mg-stage10__echo-req` class in `renderer-final.js:22` (shown when a choice requires more echoes than the player has) is also unstyled.

**Fix:** ~25 lines of CSS in `styles.css`:

```css
.mg-stage10__echo {
  border-left: 3px solid #c7c4ba;
  margin: 10px 0;
  padding: 8px 10px;
}
.mg-stage10__echo.is-witnessed {
  border-color: #35d07f;
  background: rgba(53, 208, 127, 0.07);
}
.mg-stage10__echo.is-pending {
  border-color: #d59b2d;
  background: rgba(213, 155, 45, 0.07);
}
.mg-stage10__echo-label {
  color: #5f5b52;
  display: block;
  font: 11px/1.4 "Courier New", monospace;
  margin-bottom: 2px;
  text-transform: uppercase;
}
.mg-stage10__echo-hint {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
}
.mg-stage10__echo-req {
  display: block;
  font-size: 12px;
  font-style: normal;
  opacity: 0.7;
  padding-top: 4px;
}
```

---

### Issue 4 — Playtime target unreachable under current echo design (HIGH)

**Where:** Design level, downstream of Issue 1

The buildplan's 40–120 min estimate rests on "nine echoes at 5–10 minutes each" because "for a player unfamiliar with that feature, discovery + use can take 5–15 minutes." With all echoes as txt opens, each excursion takes 30 seconds. Total echo time: ~5 minutes. Total stage time: ~20–30 minutes maximum. This falls well below the finale's bar for a payoff stage.

This is not fixable without addressing Issue 1. Even implementing 3 of the 9 real verb types (e.g., genesis raw-mode, signal audio, entropy download) extends per-echo time to 2–5 minutes for unfamiliar features.

---

### Issue 5 — Phase A flawless-compaction is near-impossible without prior notes (MEDIUM)

**Where:** `confront.js:53–61`, `getCompactionOptions`

Compaction options are shuffled per-save via FNV-1a. A player who clicked through their memory stances hours or sessions ago faces a 1-in-3 random chance per memory, with no context shown (the Defragmenter prompt only says "choose the one that was yours"). For a player who resolved all 9 memories: (1/3)^9 ≈ 0.005% chance of a clean first pass. The `flawlessCompaction` achievement is in practice a "remember your notes" badge.

The game correctly allows re-affirm after a wrong pick (you can still correct a "compacted" state), so flawless is the only thing lost. But the `confrontLines.compaction.prompt` ("choose the one that was yours") gives no hint that the player can scroll back to check — and the stepper view is replaced by the confront view while fighting.

**Fix:** During Phase A, show the player's resolved memory text (slot.resolvedText or reflections[slot.choice]) underneath each compaction item BEFORE they answer — or at minimum show a "Your memory: [slot text preview]" hint. This turns Phase A from "random 1-in-3" to "reading comprehension" as intended.

---

### Issue 6 — Observation echo is mechanically contradictory (MEDIUM)

**Where:** `content.js:208`, `viewer-actions.js:247–259`

The echo hint says "Open the cached observation memory" — implying the player must use the recents panel to navigate to a previously opened file. But the echo artifact is `observation_echo.txt`, a file the player opens for the first time. There is no recents-panel check in `recordStage10EchoOpen`. The hint describes an interaction that cannot be satisfied by the artifact.

The buildplan's design (second open of the same file, or `source: 'recents'` flag) was not implemented.

**Fix:** Either (a) change the echo hint to "Open observation_echo.txt" (matching the trivial implementation), or (b) implement the recents-gate by checking `opts.source === 'recents'` in the recorder and updating the observation hint accordingly.

---

### Issue 7 — `synthesis.js` result not persisted to state (LOW)

**Where:** `boss.js:236–251`, `renderer-final.js:69–79`

The buildplan (#11) specifies storing `state.final.synthesisText = synthesis.text` on `chooseFinal('understand')`. The current `chooseFinal` does not call `assembleSynthesis` or write to state. The synthesis is re-assembled at render time from `assembleSynthesis(state)`. This is functionally correct (it's deterministic), but the `state.final` shape documented in the buildplan diverges from the actual implementation. If another system reads `state.final.synthesisText` expecting it to be populated, it will be null.

**Fix:** Either remove `synthesisText` from the documented state shape (it's not needed since the render is pure), or add the `assembleSynthesis` call in `chooseFinal` for alignment with the design doc. Low risk either way.

---

### Issue 8 — `observation` accent (#1a1a1a black) is invisible on dark backgrounds (LOW)

**Where:** `content.js:193`

The Observation memory's accent is `#1a1a1a` — near-black. The capstone grid tile will render a near-black border-left against the white tile background, which is legible but indistinct from "no accent." On any theme with a dark background this becomes invisible. All other 8 accents are vivid colors.

**Fix:** Change `observation` accent to something thematically "quiet but visible" — e.g., `#4a5568` (slate-gray) or `#6b7280`. Black has semantic meaning as "final/dark" but is a poor CSS accent color.

---

## TOP OPPORTUNITIES

### Opportunity 1 — Echo CSS (immediate, zero risk)

25 lines of CSS (see Issue 3 fix above) transforms the most-touched UI element from unstyled to visually communicative. The pending/witnessed state distinction is critical for players to understand what they need to do. This is the highest ratio of impact-to-effort in the codebase.

### Opportunity 2 — Genesis + Signal as proof-of-concept for verb diversity

Genesis raw-mode check: extend `recordMetagameViewerOpen` to accept `opts.mode`; in `recordStage10EchoOpen` add `if (id === 'genesis' && opts.mode !== 'raw') return false`. Replace `genesis_echo.txt` with `genesis_echo.js` (the current content works; just rename). This implements the raw-mode verb with about 3 lines of code.

Signal audio: replace `signal_echo.txt` with a tiny real `.mp3` file (or reuse an existing BTS audio file from Stage 5). Add a `recordStage10EchoOnPlay` function that fires `echo_signal` when media playback starts on `signal_echo.mp3`. These two implementations prove the verb-diversity concept with minimal scope.

### Opportunity 3 — Debris directory for entropy echo

Create `docs/bts/awakening/debris/fragment_01.txt` with thematic content. Wire the entropy echo to fire on download of any file matching `debris/*`. The download event is already tracked in other stages — this is a one-recorder addition plus one directory + one file.

### Opportunity 4 — Phase A hint: show the player's prior reflection

During Phase A compaction, show a 1-line preview of what the player chose in the memory body (`slot.reflections[slot.choice]` truncated to 60 chars with "…"). This turns a 1-in-3 guess into a reading comprehension check — much more satisfying for a finale that is supposed to test what the player actually remembers. Renders in the compaction item BEFORE the options, just like the concede lines do in Phase B.

### Opportunity 5 — Rest-route hub state (buildplan #13, not yet visible)

The buildplan specifies a `.mg-v3-stage--resting` class on the hub nav button for the rest route, rendering it dim with "(resting)" appended. The `metagame.js` handler for `onStageComplete` does not yet read `result.route`. Since the rest route's distinctive epilogue is already written (`routeEpilogues.rest`), wiring the hub state would close the full loop of "rest means something visible in the hub."

---

## OVERALL VERDICT

**6.2 / 10** — The architecture is sound and the confrontation is the strongest boss in the metagame. The three-phase Defragmenter fight (active recall → trace evidence → self-definition) is well-designed, fully tested, and genuinely harder to bypass than any prior stage boss. The prose quality (Defragmenter voice, memory texts, stance epilogues) is the best writing in the whole game.

What prevents this from being a satisfying finale is the collapse of the echo design. Stage 10's pitch is "the host app is the game" — nine viewer features as the real content of the stage. That pitch was never built. Instead, all nine echoes are plain-text file opens, which takes ~5 minutes total and teaches the player nothing about the viewer they didn't already know. A player who spent 40+ hours with the prior 9 stages deserves a finale that explicitly exercises and celebrates those specific skills. The crossstage.js Phase B references (concede lines per prior-stage un-cheat) come closest to this — they're excellent — but they're only visible during the fight, not during the main body.

**Does it succeed as a satisfying finale?** Not yet. It succeeds as a satisfying boss fight. The finale frame (retrospective + confrontation + choice) is correct; the frame content (nine echo excursions) is currently hollow.

---

## SINGLE MOST IMPORTANT ROUND-4 ACTION

**Add CSS for the echo block.** It is the only defect that every player hits on every memory in the stage, it requires ~25 lines of CSS, and it has zero logic risk. Without it, the load-bearing gate that defines Stage 10's identity is visually invisible. Fix this first, then address echo verb diversity — the two are sequentially independent and the CSS unblocks accurate playtesting of the verb-diversity work.

---

*Scores table summary for quick reference:*

| Dim | 1 Genre | 2 Fun | 3 Theme | 4 Depth | 5 Curve | 6 Polish | 7 Determinism | 8 Replay | 9 Tech | 10 Uncheat | **Avg** |
|-----|---------|-------|---------|---------|---------|---------|--------------|---------|--------|-----------|---------|
| Score | 7 | 5 | 8 | 4 | 6 | 5 | 8 | 7 | 7 | 5 | **6.2** |
