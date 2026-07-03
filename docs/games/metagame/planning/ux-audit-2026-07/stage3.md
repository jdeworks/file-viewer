# Stage 3 — Memory Grid (nonogram) · genre bar: Picross / Nonograms

Evidence: `stages/stage3/` renderer.js (395) · grid.js (140) · view.js (49) ·
s3modal.js (64) · styles.css (239). Screenshots `s3-initial`, `s3-midgame`,
`s3-shop-modal`, `phone/s3-initial`. Metrics: 658→757px content (desktop, 734 visible).

## What exists

One persistent screen: HUD row → objective line → puzzle grid (CSS grid,
`--s3-cell:24px`) + toolbar/verb bar on the left, help text + THE MEMORY LEAK boss panel
on the right, 6-line log at the bottom. Shop/boon-draft are fixed-position 340px modals
paginated one item per page. Verb bar (Fill A/B, Mark, Lock) exists and works on touch.

## Why it fails

**UX**
- (P1) **The boss out-shouts the game.** The MEMORY LEAK panel — five buttons + a
  restoration-key text input — is permanently rendered from snapshot #1
  (`view.js:28-44`; screenshot `s3-midgame`: the boss box is *larger than the puzzle*).
  The player's eye goes to the loudest object, which for 13+ solves is a locked wall of
  controls they cannot use. It also leaks the entire endgame (three memory logs, key
  input) before the story earns it.
- (P1) **One item per page in the shop/draft** (`s3modal.js:37-59`, `s3-shop-modal`
  shot: "1 / 6" + Prev/Next). You cannot compare upgrades — a shop's only job.
- (P2) Onboarding is a keybinding wall: "arrows / WASD move · space/1 fill A · 2 fill B
  (alt-click) · x mark · l lock…" rendered as body text (`view.js` help block; on phone
  it's noise below the verb bar, screenshot `phone/s3-initial`).

**UI**
- (P1) **The puzzle is a postage stamp.** A 7×7 board at 24px cells is ~170×170px inside
  a ~680px-wide beige panel (screenshot `s3-midgame`) — under 5% of the screen for the
  object the player stares at for 45–70 minutes. The clue digits are 11px.
- (P2) Log and boss aside push content to 757px → the panel scrolls mid-game (barely,
  but the rule is zero).

**Fun**
- (P1) **No solve payoff — the genre's core joy is missing.** Real Picross climaxes in a
  revealed *picture*. Here a solved snapshot just… stops (log line "+57 registers", next
  puzzle). The fiction ("restore the memory snapshot") begs for the reveal moment; the
  mechanic already produces a bitmap and we throw it away.
- (P2) Filling cells has no feel: no tick, no cascade, no clue-line completion flourish
  (clues do strike through — the one good beat — but silently).

## Changes (ordered)

1. (P1, M) **Scale the board to the space.** Compute `--s3-cell` from the grid host
   (`clamp(24px, hostMin/size, 44px)`); center the puzzle; it should be the dominant
   object at every size. Touch minimum 36px for ≤12×12.
2. (P1, M) **Stage the boss.** Until `corruption ≥ 4`: a one-line status chip ("the leak
   spreads… 4/8") where the panel was. At corruption 8 (gate open): panel expands with a
   deliberate arrival beat (banner via shared `.mg-banner`, bell line). The three
   memory-log buttons and key input appear only then. No rule changes — the gate already
   requires corruption 8; the UI just stops spoiling it.
3. (P1, S) **Un-paginate shop/draft** onto the shared modal grid (00-F6): all 6 upgrades
   visible, cost + level on each card.
4. (P1, M) **Solve reveal.** Author each snapshot's solution as a 1-bit pictogram (chip,
   key, bell, glyphs — theme icons; generator constraint: keep uniqueness). On solve:
   cells cascade-fill (one wave, ~400ms, reduced-motion: instant), the picture flashes
   in accent color, its name stamps into the log ("fragment: CACHE KEY crystallized").
   This is the single biggest fun lever in the stage.
5. (P2, S) Replace the keybinding wall with the verb bar as the primary teacher: keys
   shown as small kbd hints ON the verb buttons (`Fill A (space)`), help text collapses
   behind the ❓ button. Hide key hints on coarse pointers.
6. (P2, S) Fit budget: HUD one line, log 3 lines with internal scroll, board zone flex
   (00-F1) — target ≤ visible height at all times.
7. (P3, S) STABILITY meter already color-stages; add a 1px pulse on state change only.

## Keep

The verb bar (good fix, right pattern); the STABILITY meter; volatile pulse + lock ring
visuals; clue strike-through; the light "paper memory" theme (it's the intended outlier
and reads well); the objective one-liner; the diff un-cheat flow untouched.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

Current cognitive load: registers + retained fragments + Engram Bank + shop (6 tracks)
+ boon drafts (solves 0/5/10) + STABILITY/pressure + corruption tiers + boss keys —
seven systems around a nonogram, most visible from snapshot 1.

- (M1, S) **Two acquisition surfaces → one.** Fold the defrag shop INTO the boon-draft
  moment: at each draft, offer 1-of-3 where purchasable shop upgrades appear as picks
  (pay registers) alongside free boons. The shop button disappears; the same economy
  runs through one in-flow choice (R2). Engram Bank becomes one card in that pool
  (R3) — its separate panel dies.
- (M2, S) **Retained fragments stop being a "currency".** Display them only as boss
  progress ("fragments 3 — the leak feeds on them"), not a spendable-looking counter
  next to registers. One currency on the HUD: registers.
- (M3, S) **First contact = the puzzle.** Snapshot 1 shows: grid, verb bar, objective,
  registers. No shop/draft buttons (first draft announces itself at solve 1 with a
  banner), no boss panel (chip arrives at corruption 2 with the tier message — the
  s3tiers arrival lines already exist, reuse them), help behind ❓ (UI pass #5).
- (M4, S) **Tier arrivals get a learning window** (formalize what partially exists):
  the first snapshot after each tier unlock is a small board featuring ONLY the new
  mechanic, introduced by its one-liner. No other change to tier thresholds.
- OPTION (user call): cap simultaneous ACTIVE tier mechanics at 2 per snapshot late-game
  (volatile+decay+two-colour+aliased can all stack today) — trades peak chaos for
  legibility; engine-side flag, easy to try.
