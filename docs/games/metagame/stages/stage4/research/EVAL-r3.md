# Stage 4 — Fractal Bastion: Self-Evaluation Round 3

**Date:** 2026-06-27  
**Scope:** read-only code audit + unit tests. No edits made. No browser tests run.  
**Tests:** `node --test docs/games/metagame/stages/stage4/tests/*.test.mjs` — **19/19 PASS**.

---

## Scores

| # | Dimension | Score | Justification |
|---|-----------|-------|---------------|
| 1 | Genre fidelity | 6/10 | Real TD tick loop, enemies on path, auto-fire towers, economy loop. But the signature mechanic (path shape changes per wave group) is absent; the board is static within a map. |
| 2 | Fun / engagement | 6/10 | Sub-bosses, fork choices, Armory, call-early bonus, 14-tower shop are all real decisions. The absence of path mutation removes the stage's defining tension. |
| 3 | Theme fit | 8/10 | L-system Koch path, recursion-named enemies/bosses, file-tree JSON blueprint, Greek-glyph guardians — all coherent with the fractal theme. |
| 4 | Depth & length | 6/10 | 150 total waves across 5 maps likely runs 2–4 hours, far above the 120-min target. Map 4 alone (70 waves) is a session-length campaign. |
| 5 | Difficulty curve & onboarding | 4/10 | The 14-tower shop is fully exposed from wave 1 (ui-combat.js:19–23). No progressive unlock, no wave-note display, no in-game matchup guidance. PORTFOLIO/ANTICIPATE verbs never fire. |
| 6 | Polish / UX / readability | 5/10 | Board render works; log is visible; map-select is clear. Missing: sell-tower button (sellTower exists but is never wired in ui-combat.js), wave-preview panel (Phase D4 not built), board color phase (Phase F2 not built), wave notes never surface. |
| 7 | Determinism & correctness | 8/10 | Both original bugs fixed. No Math.random or Date.now in source. LCG is sound. One latent ID-scheme mismatch (see Issue 5). The fireAbilities(state, dist) hoisting reliance is fragile but correct. |
| 8 | Replayability | 6/10 | 5 maps × different path seeds, 4 Armory upgrades, 14 towers × 2 forks = real build diversity. But each map's path is identical every run (fixed seed per map); the "different L-system grammars" prestige from research.md is unbuilt. |
| 9 | Technical health | 8/10 | 19/19 unit tests passing. All files under the 300 LOC soft cap (engine.js 297, ui-combat.js 284). Well-commented, modular, no off-origin, pure engine/state separation throughout. |
| 10 | Un-cheat discoverability | 7/10 | Boss total-armor in LOCKED state is enforced (boss.js:98–100). Hint ladder in messages.js escalates over repeated failures. `bellMessages.needsCoverage` teaches the coverage step. Risk: `openRecursionBlueprintInViewer` (boss.js:118–120) directly calls `applyRecursionBlueprintOpen` and is exported — a developer invoking it bypasses the file-tree gate. |

**Weighted average (equal weights): 6.4 / 10**

---

## Global Laws Compliance

| Law | Status |
|-----|--------|
| Boss only after full stage body | PASS — `bossUnlocked` in run4.js requires all 5 maps cleared; `enterBoss` enforces it (run4.js:137–143). Debug `seatAtBoss` is clearly marked not-a-player-affordance. |
| Un-cheat uses real app feature | PARTIAL — the boss total-armor check is load-bearing and the file must be opened in the host viewer. But `openRecursionBlueprintInViewer` is exported and calls `applyRecursionBlueprintOpen` directly (see Issue 4). |
| Zero off-origin at runtime | PASS — no CDN or external fetch found. |
| Deterministic seeded RNG | PASS — both research.md bugs fixed. No Math.random or Date.now in any source file. |
| Modular files 300/500 LOC | PASS — all files within the soft cap. engine.js=297, ui-combat.js=284. |

---

## Top Issues

### Issue 1 — Path shape never changes within a run (CRITICAL)

**Where:** `ui-combat.js:71` — `let path = buildPath(...)` is called once at mount and never updated.  
**What:** `maps.js` assigns a static `depth` per map (1, 1, 2, 2, 3). The path is generated once at map entry. Within a map, across all 5–70 waves, the board layout is identical. The research.md ANTICIPATE verb (pre-place towers for a future path shape) and PORTFOLIO verb (defend a branching path) never occur. The line in research.md §3 calling this "genuinely novel" — "no major TD game changes the path shape over the course of a run" — describes something the current code does not do.  
**Fix:** Rebuild `path` at wave-group boundaries. When `waveNumber` crosses 10 or 20 on maps with multiple depth levels, call `buildPath` with the next depth before `engineStartWave`. The engine already supports path input (`tick(state, dt, pathTiles)`) — the renderer just needs to pass the updated path. Enemies currently on the path would need to be transferred (or waves transition cleanly since the path is rebuilt between waves anyway).  
**Severity:** HIGH — this is the stage's design differentiator.

---

### Issue 2 — Sell-tower button missing from the combat UI (HIGH)

**Where:** `ui-combat.js` — the `rosterRows()` function (lines 107–137) generates Upgrade / Fork buttons but no Sell button. `sellTower()` in `upgrades.js` is fully implemented and tested.  
**What:** Without a sell affordance, the REPAIR verb is crippled. Players cannot sell Attractor Fields to replace them when Resonance Ghosts enter (wave 16). The economy pressure of "30% loss on sell" — which research.md called a meaningful decision — is inaccessible.  
**Fix:** In `rosterRows()`, after the upgrade/fork buttons, add:
```js
const sell = document.createElement('button');
sell.type = 'button'; sell.dataset.sellId = tower.id;
sell.textContent = `sell (${Math.floor((TOWER_TYPES[tower.type]?.cost||0)*Math.pow(2,(tower.level||1)-1)*0.7)})`;
wrap.append(sell);
```
And in the click handler, handle `[data-sell-id]`. One event binding + the existing `sellTower()` call.  
**Severity:** HIGH — blocks a key verb.

---

### Issue 3 — All 14 towers visible from wave 1 (HIGH)

**Where:** `ui-combat.js:19–23` — `PLACEABLE` lists all 14 tower types unconditionally.  
**What:** Research.md specifies a staged unlock: Pulse Node + Cycle Extractor on wave 1; Scatter Array + Null Spike + Attractor Field from wave 6; Resonance Hub from wave 16. The current shop dumps everything immediately. A new player on wave 1 sees a 14-item shop — overwhelming and eliminating the MATCH mechanic's learning curve.  
**Fix:** Filter `PLACEABLE` by wave number (or by campaign map index, which correlates). A simple `const available = PLACEABLE.filter((t) => towerUnlockedAt(t) <= state.waveNumber)` with a `towerUnlockedAt` table would suffice.  
**Severity:** HIGH — ruins onboarding and the MATCH verb pacing.

---

### Issue 4 — `openRecursionBlueprintInViewer` bypasses file-tree gate (MEDIUM)

**Where:** `boss.js:118–120` — exported function directly calls `applyRecursionBlueprintOpen`.  
**What:** The buildplan explicitly warned: "the critical change: `applyRecursionBlueprintOpen` must ONLY be called when the host app's file-open dispatch fires." This function is also exported from `index.js:52–53`. If called programmatically (e.g., from an automated test that reaches into the stage's exports, or from a future code path that imports it), the boss's total-armor lock is bypassed without the player ever opening the file.  
**Fix:** Delete `openRecursionBlueprintInViewer` from `boss.js`. Remove it from `index.js` exports. The only entry point to `applyRecursionBlueprintOpen` should be the host's `recordMetagameViewerOpen` dispatch.  
**Severity:** MEDIUM — latent bypass, not exploitable via normal play, but breaks the un-cheat invariant for automated callers.

---

### Issue 5 — Dual tower ID schemes that can collide (MEDIUM)

**Where:** `boss.js:59` uses `tower-${state.towers.length + 1}`. `state.js:normalizeTower:136` uses `tower-${type}-${x}-${y}`.  
**What:** When towers are placed (`boss.placeTower`) then saved and normalized (`state.normalizeState`), the IDs diverge. A `pulse_node` placed at (5, 5) gets ID `tower-1` from `placeTower`, but after a save/load cycle `normalizeTower` would produce `tower-pulse_node-5-5`. The `upgradeTower` and `sellTower` functions look up by ID — if the ID changes after a round-trip, upgrades on any persisted tower will fail silently.  
**Fix:** Either: (a) change `placeTower` to derive the ID the same way `normalizeTower` does (`tower-${type}-${x}-${y}`), or (b) remove the derivation from `normalizeTower` and always trust the stored ID. Option (a) is simpler and makes both paths consistent. Note that position-based IDs break if a tower is sold and replaced at the same cell — the counter avoids that. A composite approach `tower-${type}-${x}-${y}-${state.towerNextId++}` is most robust.  
**Severity:** MEDIUM — latent data-corruption bug that manifests on save/reload with upgrade/sell.

---

### Issue 6 — Campaign map 4 at 70 waves grossly exceeds the 120-min target (MEDIUM)

**Where:** `maps.js:40` — `infinite-approach` has `waveCount: 70`. Total campaign: 5+10+20+45+70 = 150 waves.  
**What:** At ~0.7s spawn interval and 14+ enemies per late wave, each late wave takes 1–3 minutes of real-time play. Map 4 alone is 1–3 hours. The research.md target was 40–120 minutes total for Stage 4.  
**Fix:** Reduce wave counts: consider 5/8/15/25/40 (total 93) or add an explicit "one session" time estimate in maps.js so balancing is deliberate. Alternatively, the sub-boss density already provides natural stopping points — add "chapter select" so returning players can continue from their last cleared arc.  
**Severity:** MEDIUM — affects player completion rate.

---

### Issue 7 — Wave-note display and preview panel are missing (MEDIUM)

**Where:** `waves.js:21–50` has `note:` fields on many waves (e.g., wave 6: "pattern crawlers sprint through gaps"). `ui-combat.js` never reads the `note` field and has no wave-preview panel.  
**What:** The `note` field authored into each wave composition is silently discarded. The ANTICIPATE verb depends on players seeing what's coming next. Without a preview, the player has no pre-wave decision signal.  
**Fix:** In `repaint()`, when `!state.waveActive`, read `waveComposition(state.waveNumber, ...)?.note` and display it in `fields.hint`. A full wave-preview panel (Phase D4) is ideal but even just surfacing the note would partially restore the intended signal.  
**Severity:** MEDIUM — authored content is dead, ANTICIPATE verb weakened.

---

### Issue 8 — `fightInfiniteLoop` is still arithmetic, not a wave (LOW-MEDIUM)

**Where:** `boss.js:94–116` — damage is `coveredPoints * 120`. `ui-combat.js:213` — `confront()` calls this directly.  
**What:** The research.md boss (Phase E1) was meant to be wave 31 — a boss entity that traverses the path, fires abilities, and whose HP is drained by towers covering recursion points. The current implementation is still a button → arithmetic → `boss.hp -= N` flow. The "TOTAL ARMOR" lock is correct, but the fight has no traversal, no timing pressure, no active ability interaction.  
**Fix:** Phase E1 was explicitly deprioritized in the buildplan (listed as a "later increment"). This is a known gap, not a regression. Making The Infinite Loop an actual wave entity (pathIndex-traversing sub-boss with extremely high HP) would complete the vision. For Round 4, even converting the confront to a multi-click sequence (each click = one damage phase, boss logs its own resistance) would add texture without requiring a full wave engine change.  
**Severity:** LOW-MEDIUM — boss works functionally; it just lacks the drama described in the design.

---

## Top Opportunities

### Opportunity 1 — Per-wave-group path reshape (the signature mechanic)

The L-system infrastructure is complete and correct (`lsystem.js`, `buildPath`, `pathTileIndex`). The engine already supports different path inputs each wave (`tick(state, dt, pathTiles)`). Adding path reshape requires only:
1. Track a `pathDepthForGroup` variable in `ui-combat.js` (starts at `map.depth - 1` or 1).
2. On wave-group boundary (`waveNumber % 10 === 0` or however groups are defined per map), call `buildPath` with the next depth and update `path`.
3. Show the new path in the preview before the player clicks "start wave" — this IS the ANTICIPATE verb.

This is the highest-value addition for Round 4. Everything else in the architecture already supports it.

---

### Opportunity 2 — Progressive tower unlock gates the learning curve

The authored wave sequence already introduces enemy types in order (fast on wave 6, armored on wave 8, slow-immune on wave 16). Locking towers to match that cadence would make the MATCH verb feel designed rather than lucky:
- Waves 1–5: pulse_node, cycle_extractor only
- Wave 6+: add scatter_array, null_spike, attractor_field, frost_lattice, thermal_loop
- Wave 11+: add chain_resonator, shatter_drill, resonance_hub
- Wave 16+: add long_recursor, glyph_mortar, gravity_well, bank_node

The shop `PLACEABLE` filter by `state.waveNumber` is a 10-line change in `ui-combat.js`.

---

### Opportunity 3 — Wire the sell button and complete the REPAIR verb

`sellTower` is implemented, tested, and correct. The roster already iterates towers in `rosterRows()`. Adding a sell button to each roster row is a 5-line change in `ui-combat.js` — the single cheapest improvement with a significant verb payoff.

---

### Opportunity 4 — Surface wave notes as a preview panel

The `note` field on wave compositions (authored for all landmark waves) is production-quality text ("pattern crawlers sprint through gaps", "three depth-crawler elites"). It takes two lines to display it in `fields.hint` when `!state.waveActive`. This gives players an ANTICIPATE signal without building a full wave-preview panel.

---

### Opportunity 5 — Tighten playtime by reducing map 4 wave count

Map 4 (70 waves) is a standalone session. Cutting it to 35–40 waves and boosting wave difficulty would halve the map's time-cost while keeping the content pressure. Alternatively: add a "continue from wave N" resume within a map so a player who reaches wave 40 can quit and return without replaying 40 waves.

---

## Overall Verdict

**Score: 6.4 / 10** (unweighted average of the 10 dimensions).

Stage 4 in Round 3 is a structurally sound, mechanically rich tower defense with excellent determinism, solid test coverage, and ambitious depth (damage types, status effects, sub-bosses, Armory, tower forks). The engineering quality is high and the building blocks for the design vision are all present. The problem is that the **design vision's signature mechanic — the L-system path reshaping per wave group — is not connected**. The `lsystem.js` module exists and is correct; `buildPath` is called once per map and then frozen. Every novel verb from the research (PORTFOLIO, ANTICIPATE, path-as-the-strategic-lever) requires that one path mutation loop to exist — and it doesn't.

Secondary gaps: no sell button despite `sellTower` being complete, all 14 towers exposed from wave 1, wave notes silently discarded, campaign runtime likely 3× the target.

**Single most important Round 4 action:** Implement in-map path reshape at wave-group boundaries. When wave 10 ends on a depth-2 map, call `buildPath` with depth 2 before wave 11 starts and update `path` in `ui-combat.js`. Display the new path in the pre-wave "start wave" panel so players see the board change. This one change activates the ANTICIPATE verb, makes the board feel alive, and delivers the stated design uniqueness — everything else in the codebase is already ready for it.
