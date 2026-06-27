# Stage 6 — Protocol Codex: Round 3 Self-Evaluation

**Evaluator:** Sonnet 4.6 (adversarial game-design critic pass)
**Scope:** Read-only code review + unit tests. No edits, no check.sh.
**Test result: 16/16 PASS** (`node --test tests/*.test.mjs`, all suites green in 120ms)

---

## Scores

| # | Dimension | Score | Verdict |
|---|-----------|-------|---------|
| 1 | Genre fidelity (vs STS/Inscryption) | 8/10 | Full feature parity; hurt by THROUGHPUT turning off after act 3 |
| 2 | Fun / engagement | 7/10 | Verb arc and lenticular depth are real; balance unproven; pool has redundant commons |
| 3 | Theme fit | 9/10 | Network-stack naming is excellent end-to-end; epub un-cheat is a genuine design achievement |
| 4 | Depth & length (vs 40–120 min) | 8/10 | 84 cards + upgrades, 25+ relics, 6 acts, 15 ascension rungs — ambitious but potentially over-long |
| 5 | Difficulty curve & onboarding | 7/10 | Pool escalation and authored map are solid; verb introductions are silent (no tutorial moment) |
| 6 | Polish / UX / readability | 7/10 | Intent telegraph, energy pips, boss banner, jammed row, potion belt — good; log truncation could bite |
| 7 | Determinism & correctness | 8/10 | Math.random closed; tracked RNG resumable; all 16 tests green; one hash-function inconsistency |
| 8 | Replayability (ascension, daily) | 9/10 | 15 ascension rules, daily/custom seeds, true-ending keys, 1-of-3 boss relic draft — standout |
| 9 | Technical health | 7/10 | Split architecture excellent; renderer.js + run.js over soft cap; boss.js has ~100 LOC dead code |
| 10 | Un-cheat discoverability | 8/10 | Boss banner + hub button + escalating hints are all present; depends on epub having Chapter 9 content |

**Simple average: 7.8 / 10**

---

## TOP ISSUES (max ~8, ordered by severity)

### Issue 1 — THROUGHPUT verb turns off after act 3 (SEVERITY: HIGH)
**Where:** `renderer.js:153` — `congestion: run.act === 3`

The congestion window is enabled ONLY for act 3 fights. Acts 4, 5, and 6 revert to flat energy. This silently renders an entire verb obsolete in the back half of the run:
- BANDWIDTH, BACKOFF, DEFRAG cards become dead weight in acts 4–6 (they are THROUGHPUT-verb cards; without a congestion window, BACKOFF's "no shrink" does nothing, DEFRAG has nothing to return, BANDWIDTH widens a window that doesn't decay).
- The OVERCLOCK_BUS cursed relic ("+1 cap, −2 decay") gives you the downside in act 3 and the zero-benefit window in acts 4–6 — a permanently cursed tradeoff with no upside for 4/6 of the game.
- The research.md design principle ("carry all prior verbs forward") is broken.

**Fix:** Enable congestion for acts 3+ (`congestion: run.act >= 3`). Alternatively, keep act-3 as the learning act but persist the mechanism: relics/cards that expand the window should carry their effect forward. At minimum, THROUGHPUT verb cards need to be playable in acts 4–6 without being dead.

---

### Issue 2 — Act 4 has no new verb (SEVERITY: HIGH)
**Where:** `run.js:31` `ACT_BOSSES`, `mapgen.js:14-21` STANDARD_POOLS, `enemies.js` session-hijack

The buildplan promised "one new verb per act." The arc actually delivered:
1. SEQUENCE ✓ (first-card primitives, opener/closer cards)
2. DELAY ✓ (pending queue, new engine primitive)
3. THROUGHPUT ✓ (congestion window, new engine primitive)
4. (nothing new) — act 4 is SESSION but introduces no new primitive. The standard pool in act 4 uses the same enemies as act 3 minus congestion-collapse; the mini-boss is session-hijack, a straightforward scaler.
5. CORRUPTION ✓ (daemon archetype, cleanse/fortify mechanics, entropy-pool relic)
6. CHAIN ✓ (recursion archetype, replayLast, echoNextTurn, depth cap)

The NEGOTIATE verb (the final boss's mutating handshake) IS implemented and IS at act 6, but act 4 is a verb gap: it raises numbers without introducing a new decision type.

**Fix:** Give act 4 a lightweight verb. The SESSION concept offers "carry a token across nodes" (a small inter-fight economy where a per-fight buff carries forward), or simply move the throughput window persistence to act 4 so the player learns to manage it entering the negotiation act.

---

### Issue 3 — `strHash` vs `hashSeed` inconsistency in enemy-pick seeding (SEVERITY: MEDIUM)
**Where:** `renderer.js:138` vs `run.js:153`

The renderer derives the enemy-pick seed via `strHash(`${run.seed}:${run.currentNodeId}:enemy`)` (FNV-1a, concatenated string). The `enemyForCurrentNode` default parameter uses `hashSeed(run.seed, `${run.currentNodeId}:enemy`)` (polynomial hash, seed + key separately). These are different hash functions, producing different seeds.

Consequence: the unit tests in `run.test.mjs` that assert "same seed → same enemy" exercise a different hash path than what the renderer uses live. The renderer is internally consistent (it always passes `strHash` explicitly), so in-game play is deterministic. But the tests verify a different sequence than what players actually see.

**Fix:** Unify to one function. The simplest fix is to make `run.js`'s `enemyForCurrentNode` default parameter use `strHash` style: `makeRng(hashSeed(run.seed ^ strHashOfNode(...)))` — or just export a shared `pickEnemy(run, node)` helper from `run.js` that uses the same derivation the renderer uses.

---

### Issue 4 — `JITTER` and `BIT_FLIP` are functionally identical (SEVERITY: MEDIUM)
**Where:** `cards-signal.js:73` (JITTER: "Deal 4.", cost 0) and `cards-signal.js:115` (BIT_FLIP: "Deal 4.", cost 0)

Both are 0-cost common Signal cards that deal exactly 4 damage. Functionally indistinguishable. This is card-pool bloat and can confuse a player building a deck ("why do I have two of the same card with different names?"). In STS, even commons have distinct mechanical niches.

**Fix:** Give one of them a secondary effect that distinguishes it. JITTER could "deal 4; if a card was replayed this turn, deal 4 more" (chain synergy). BIT_FLIP could "deal 4; Apply 1 Weak." Either differentiates archetypes rather than doubling up on a stat-stick.

---

### Issue 5 — Superboss HP is lower than the mandatory final boss (SEVERITY: MEDIUM)
**Where:** `superboss.js:17` `SUPERBOSS_PHASE_HP = [50, 55, 60]` (total: 165 HP) vs `boss-combat.js:23` `BOSS_PHASE_HP = {1:60, 2:80, 3:60}` (total: 200 base, 260 at ascension 5)

The true-ending superboss (The Kernel of Refusal) has 165 total HP across 3 phases. The mandatory negotiation boss has 200 HP at base and up to 300+ HP at ascension 5. The "true ending" fight is mechanically easier than the requirement to get there, which undercuts the prestige of collecting all 3 keys. The player arrives at the superboss at full post-negotiation HP, so they're also healthier than entering the 3-phase boss.

**Fix:** Raise SUPERBOSS_PHASE_HP to at least [80, 90, 100] (270 total) so it reads as a genuine reward-difficulty escalation. The fight already lacks the handshake constraint, which makes it simpler to play — the HP pool needs to compensate.

---

### Issue 6 — `boss.js` has ~100 LOC of dead code (SEVERITY: LOW-MEDIUM)
**Where:** `boss.js:57–144` — `playProtocolCard`, `startProtocolTurn`, `endProtocolTurn`, `defeatRefusedConnection`, `applyBossDamage`, `normalizeCard`, `phaseAckLine`

These functions implemented the OLD 3-button boss puzzle (retired in B2b). The renderer no longer calls any of them; the UI that drove them (`ui-boss.js`, `content.js`) was deleted. `boss.js` is imported ONLY for `getBossLockState` and `applyProtocolChapter9Unlock` (8 exported functions, ~170 LOC total, ~100 LOC dead). The `boss.test.mjs` suite tests the dead functions, meaning it verifies unreachable code.

**Fix:** Delete the 7 dead functions and their tests from `boss.test.mjs`. Keep `getBossLockState`, `applyProtocolChapter9Unlock`, `recordLockedBossAttempt`, `hasProtocolChapter9`, `pushLog`. This reclaims ~100 LOC and removes a misleading test suite.

---

### Issue 7 — renderer.js (382 LOC) and run.js (374 LOC) over the 300 soft cap (SEVERITY: LOW)
**Where:** `renderer.js`, `run.js`

Both files are flagged in the BUILD_LOG as "split candidates" but not yet split. The hard cap is 500 (both are under it), but the 300 soft cap exists for a reason: files over it are harder to scan and review. `renderer.js` grows with every new screen; `run.js` has grown with every new economy feature.

**Fix:** Split `renderer.js` → a thin router + `renderer-actions.js` (the `handleTarget`/`runAction` delegation tree). Split `run.js` → `run-core.js` (createRun, moveTo, availableNodes, score) + `run-economy.js` (buyCard, buyRemoval, buyUpgrade, buyRelic, removalCost) + `run-rest.js` (rest, upgradeDeckCard, removeCard, closeNode). These are natural seams.

---

### Issue 8 — Act 3 THROUGHPUT verb cards are rewardable in acts 1–2 but useless there (SEVERITY: LOW)
**Where:** `cards-protocol.js:78-90` (BACKOFF, DEFRAG) and `cards-layer.js:42-45` (BANDWIDTH) in the REWARD_POOL

BACKOFF/DEFRAG/BANDWIDTH are meaningful only in act 3 (when `congestion` is on). They appear in the rarity-weighted reward pool from act 1 onward. A player who drafts BANDWIDTH in act 1 or 2 is carrying a dead card for 2 acts.

**Fix:** Tag these cards with a minimum reward act (e.g. `rewardActMin: 3`) and filter the draft pool per act so they don't appear as rewards before they're meaningful. This is the same discipline the enemy pool applies (`STANDARD_POOLS` is act-keyed).

---

## TOP OPPORTUNITIES (max 5)

### Opportunity 1 — Persist the THROUGHPUT window as a permanent mechanic
If Issue 1 is fixed by making congestion on in acts 3+, the congestion window becomes a permanent character stat. This also means BANDWIDTH (widen window) becomes a permanent investment — a player who grabs BANDWIDTH in act 3 carries a slightly bigger pipeline into act 4's session-hijack and act 5's corruption fights. This is exactly what Inscryption does: each act carries the system forward with new rules added.

### Opportunity 2 — Boss phase 3 mutation should be richer than turn parity
Current: `(combat.turn % 2 === 1) ? DEMAND_LEAD_SYN : DEMAND_ACK_FIRST`. The demand is completely predictable after 1 turn. A mid-build improvement: demand switches on BOSS HP thresholds within phase 3 (e.g. at 60% HP it switches demand; at 30% it switches again), or is triggered by whether the player dealt damage the prior turn. This makes the re-sequencing "on the fly" feel genuinely reactive rather than memorizable.

### Opportunity 3 — The Ascetic key needs a better UI prompt
`KEY_ASCETIC` is earned by skipping a card reward. The player gets the key silently — there's no reward screen hint saying "skipping earns a key." A player who doesn't know about the key system (no in-game tutorial) will never optimize for it. A small prompt on the reward screen ("skip to bank handshakes · and earn the ascetic key if you haven't already") closes this discoverability gap without breaking the opt-in feel.

### Opportunity 4 — Add a daily-seed leaderboard hook
The infrastructure is in place (`state.meta.dailyBest[dailyKey]`), and the score formula is solid. The missing piece is a simple shareable code: e.g. `DAILY 2026-06-27 · SCORE 1240 · A3`. This costs nothing (just a "share score" text copy on the won screen) and multiplies the social replayability of the daily-seed mode significantly.

### Opportunity 5 — First-clear tutorial moment for the congestion window
Act 3 activates the congestion window silently — the `⇄ congestion window N (cap M)` readout appears in the energy row with no explanation. A one-time "you've entered the transport layer — your congestion window opens" bell or notice on entering the first act-3 combat would teach the mechanic before it bites the player with packet loss. A 2-line in-fight explanation (like a boss banner but for a new system) is the minimum viable onboarding.

---

## OVERALL VERDICT

**Stage 6 is the most fully realized stage in the metagame, and genuinely reaches for the genre.** The engine is clean (seeded, modular, all-green tests), the boss un-cheat is properly load-bearing (no bypass possible, correctly wired through `accepts()`), the relic pool is diverse and build-defining, the ascension ladder gives 15 meaningful rungs, and the card pool's 5-archetype structure with cross-archetype synergies (SYN+ACK combos, ASYMMETRIC, CHECKSUM_OFFLOAD-on-Protocol, replayLast chaining with delay) creates a real draft identity problem per run.

The gap that most limits round-4 potential is **Issue 1**: the THROUGHPUT verb turns off after act 3. A player who picks up BANDWIDTH or BACKOFF in the draft is carrying dead weight for 4 of the 6 acts. The OVERCLOCK_BUS cursed relic is permanently and pointlessly punishing in acts 4–6. This is a structural design regression — the research explicitly says "carry all prior verbs forward" — and it's a one-line fix in `renderer.js`. Fix it first.

**Single most important round-4 action:** Change `renderer.js:153` from `congestion: run.act === 3` to `congestion: run.act >= 3`. This one change makes THROUGHPUT verb cards playable for the entire back half of the run, makes the OVERCLOCK_BUS risk/reward meaningful through act 6, and restores the design principle that each act's verb accumulates rather than being replaced by the next.

---

*Test results: 16/16 PASS. No failures. Overall score: 7.8/10.*
