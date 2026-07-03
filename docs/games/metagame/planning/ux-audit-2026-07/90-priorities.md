# 90 — Cross-stage priorities (impact-per-effort order)

Effort: S ≤ ~1 focused increment · M = 2-4 · L = a stage-sized pass. Every item cites
its detail file. Rule of engagement: un-cheats/boss gates untouched; mechanics changes
allowed ONLY per the second-pass items (M#) and their rules (01-fun-complexity.md R1–R6);
items marked OPTION need user sign-off before building.

## Wave 0 — the shell (blocks everything)   [00-shared-shell.md]
1. **F1 height contract** (M) — panel fixed height, host `flex:1 min-height:0`,
   stage-must-fit rule + interim overflow for unconverted stages.
2. **F2 shrink-wrap fix** (S) — stages get `width:100%` from the host.
3. **F3 wide panel for metagame** (S) — `min(1100px, 96vw)` while metagame mounted.
4. **F4 phone chrome diet** (M) — stage nav → compact strip/select ≤760px; merged
   header row.
5. **F5 feedback kit** (M) — `.mg-hit/.mg-shake/.mg-float/.mg-banner` + helper;
   F6 shared modal (S). F7 glyph set rides along opportunistically.

## Wave 1 — the exemplar + the flagship pains
6. **S6 combat rebuild** (M) — StS layout: hand dock w/ fan+hover-lift,
   select→inspect→play, pile chips, pinned end-turn, play/damage feedback, card names.
   The user's named example; sets the pattern for "screen = game". [stage6.md #1-4]
   Plus **S6 hub disclosure** (S) — fresh hub = title + begin-a-run; meta tiles/
   ascension/seeds/prestige appear on their unlock events. [stage6.md M1]
7. **S5 race mode takeover + de-menu** (M+M) — menus collapse during play, big
   centered road, speed texture, docked/thumb steering + tap-to-steer, result overlay;
   7 upgrade tracks → 3 stats, shop replaced by pit-stop offers, first contact = one
   START button. [stage5.md #1-3, M1-M4]
8. **S8 sticky command bar** (S — do immediately after F1) + **act-gated disclosure +
   counter mergers** (M) + **spatial node map** (L). The command bar + disclosure
   convert S8 from unplayable-loop to playable; the map is the big rock.
   [stage8.md #1-2, M1-M3]

## Wave 2 — board legibility
9. **S4 colored board + docked controls + range preview + shop stats** (M+M) +
   **map-1-is-vanilla display gating + armory-after-map-1** (S+S). [stage4.md #1-4, M1-M2]
10. **S3 board scale + boss staging + un-paginated shop + solve reveal** (M) +
    **one acquisition surface + one-currency HUD** (S+S). [stage3.md #1-4, M1-M3]
11. **S7 board look + strings + triad sockets + verdict beats** (M+M) + board info
    diet (S). [stage7.md #1-4, M1-M2]

## Wave 3 — feel and finale
12. **S9 input (Space/tap-arena) + crossing marker + denser ring** (S+S+S) — cheapest
    whole-stage lift in the audit — + aid-shop gating (S). [stage9.md #1-3, M1]
13. **S10 memory grid + Phase-A reference + ceremony pass** (M+S+M) — the finale
    should land LAST so it inherits the mature feedback kit — + single progress
    notion + auto-READ (S). [stage10.md #1-3, M1-M2]
14. Remaining P2/P3 sweep per stage files (S8 HUD clusters + tech panel, S4 wave
    preview, S5 legend line, S7 claim grouping + hint-laddered search, S9 verdict
    depth, S3 verb-bar teaching, S10 dedupe/sigil).

## OPTION items awaiting user sign-off (mechanics with tradeoffs)
- S3: cap simultaneous active tier mechanics at 2 per snapshot.
- S4: targeting modes → 3 presets.
- S5: merge the 3 signal sub-effects into one curve.
- S6: first victory unlocks acts 5-6 (first-run ends at the act-4 story boss).
- S8: merge scrap+insight into one salvage currency.

## Verification per wave
- `node tools/../ux-audit-2026-07/tools/shots.mjs` (from repo root:
  `node docs/games/metagame/planning/ux-audit-2026-07/tools/shots.mjs`) → all in-play
  screens content ≤ visible; phone: verb + play surface co-viewport.
- `node tests/smoke-area.mjs games` green per increment (per-increment contract).
- A stage is DONE when: no scroll during play (desktop+phone), its genre's signature
  read is present (fan / road / lit path / board-with-strings / spatial map / marked
  target / grid), and every player action has a visible reaction.
