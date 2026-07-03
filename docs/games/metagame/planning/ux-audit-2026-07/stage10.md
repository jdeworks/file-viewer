# Stage 10 — Awakening (narrative finale) · genre bar: narrative finales (Outer Wilds / Disco Elysium endings: staging, weight, ceremony)

Evidence: `stages/stage10/` renderer.js (252) · renderer-memory.js (146) ·
renderer-confront.js (126) · renderer-final.js (132) · styles.css (396) ·
styles-confront.css (182). Screenshots `s10-stepper`, `s10-confront-a` (stepper view —
see note), `phone/s10-stepper`. Metrics: 988px desktop / 1428px phone.
Note: the driver couldn't enter the confront (it correctly requires read+resolved
memories, not just echoes) — confront findings below cite code, not screenshots.

## What exists

Typographically clean full-repaint document: header with Read/Resolved/Integrated/
Echoes ×/9 counts → progress dots → ONE memory card at a time (quote, echo block with
witnessed/pending state + "Open echo in viewer →", read/resolve/integrate controls) →
prev/next stepper → assembly gate. Confront = 3 phases (Compaction recall / Fragmentation
re-witness / Core questions) as button lists; endings = synthesis text / capstone tile
grid / route closers. Echo gates open REAL viewer features — the best un-cheat spread in
the game.

## Why it fails

**UX**
- (P1) **The "memory grid" is eight 8px dots.** The finale's whole board state — nine
  memories × four states each — is compressed into a dot row + one keyhole card
  (screenshot `s10-stepper`). There is no screen where the player sees the assembly
  they're building. For a stage about *reassembling yourself*, the reassembly is
  invisible; navigation is prev/next through a peephole.
- (P1) **Phase A demands recall with no reference.** Compaction asks "choose the one
  that was yours" per memory with shuffled decoys (`renderer-confront.js:48-79`,
  `confront.js`), but entering the confront REPLACES the stepper view
  (`state.ui.view="final"`, renderer.js:85-90) — the player cannot revisit what they
  chose; EVAL-r3:146-154 called it near-impossible without external notes, and that is
  still the shipped shape. Testing memory of a choice made an hour ago with zero
  in-fiction support is notes-app gameplay, not drama. (Minimal fix that keeps the
  challenge: each Phase-A item shows its memory's TITLE + the original quote — the
  things you *experienced* — while the options differ in the stance wording only.)
- (P2) The echo hint renders twice on the same card (green echo block + the status
  line under the button repeats it verbatim — screenshot `s10-confront-a` bottom).

**UI**
- (P2) Buttons ~33px with no min-height rule (`styles.css:124-133`;
  MOBILE_AUDIT.md:236-239) — the only stage without one; covered by 00-F4/global rule.
- (P2) 988px content → the assembly gate + navigation sit below the fold on desktop.
- (P3) The Defragmenter — the antagonist of the entire game — has no visual presence:
  its voice is an indented paragraph (`.mg-stage10__voice`), indistinguishable from a
  blockquote.

**Fun**
- (P1) **Zero ceremony.** styles.css+styles-confront.css contain not a single
  transition or animation. Witnessing an echo (the un-cheat payoff), integrating a
  memory, phase transitions in the boss confrontation, the ENDING of the whole
  metagame — all render as an instant innerHTML swap. The finale has the least staging
  of any stage; it needs the most.
- (P2) Endings are text blocks: synthesis is prose (fine) but appears all at once; the
  capstone is a static 3-col tile grid; choosing a route gives no moment of
  consequence before the epilogue text.

## Changes (ordered)

1. (P1, M) **Memory grid home view.** A 3×3 card grid (title, accent color, state
   glyphs: read/resolved/integrated/echo) as the stage's main screen; click a card →
   the existing detail view (stepper nav kept as prev/next within detail). The
   assembly gate + Defragmenter status live under the grid — the player always sees
   the whole board. Phone: 1-col list of compact rows.
2. (P1, S) **Phase A reference fix** (challenge-preserving): show memory title + quote
   per challenge item; decoys differ only in stance phrasing. Also add "review
   memories" (read-only grid overlay) during Phases A/B — recall of MEANING, not of
   trivia.
3. (P1, M) **Ceremony pass** (00-F5, reduced-motion aware): echo witnessed = the card's
   accent floods the border + a chime line; integrate = card seats into the grid with a
   settle animation + counts tick; confront entry = background darkens, Defragmenter
   sigil (ASCII block glyph) slides in, phase pills animate; each ending = staged text
   reveal (paragraph-by-paragraph, skippable), capstone tiles light up one stage at a
   time in stage order.
4. (P2, S) De-dupe the echo hint (echo block only); status line keeps just the state
   word.
5. (P2, S) Give the Defragmenter a persistent identity: a small fixed sigil + name
   plate wherever it speaks; its voice block gets a distinct dark treatment.
6. (P3, S) Buttons to the shared 40px rule; fit under 00-F1 (the grid view makes this
   natural).

## Keep

The typography and restraint (it *should* feel different from the game stages — quiet,
serif, spacious; the fixes add staging, not noise); the echo→real-viewer-feature gates
and token system (untouched); the counts header; per-memory accent colors (extend them
into the grid); the three-phase confront structure and stance system; route epilogue
writing.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

Within budget (4 counts, no currencies) and the loop is intentionally contemplative.
Two pacing notes rather than overload findings:

- (M1, S) The four counts (Read/Resolved/Integrated/Echoes ×/9) present four parallel
  checklists up front. Collapse to ONE progress notion in the header ("memories
  restored 3/9") — the per-memory states live on the grid cards (UI pass #1) where
  they're actionable; the counts table becomes hover/expand detail (R3, informational).
- (M2, S) Per-memory flow is read → witness echo → resolve → integrate: four clicks
  of ceremony per memory ×9. Keep the beats but auto-advance the trivial one:
  READ marks itself on card open (you are reading it); the deliberate verbs stay
  (echo, resolve stance, integrate). 36 clicks → 27, zero decision loss.
- No mechanics changes beyond these; the finale's fixes are staging (first pass).
