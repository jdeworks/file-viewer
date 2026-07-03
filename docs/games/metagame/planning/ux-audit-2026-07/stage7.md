# Stage 7 — Identity Arbiter (investigation) · genre bar: Obra Dinn / Her Story boards (evidence you can touch)

Evidence: `stages/stage7/` renderer.js (300) · board-render.js (124) ·
evidence-board.js (105) · accusation.js (161) · styles.css (267). Screenshots `s7-ss1`,
`s7-board-full`, `phone/s7-ss1`. Metrics: ss1 1509px · board 1623px (desktop, 734
visible) · phone ss1 2052px.

## What exists

Seven linear sub-stages (scan → dup test → timeline → reference chase → Case 2 → Case 3
→ EXIF boss). Cases 2/3 use the evidence board: source-file buttons (real viewer opens /
search), three columns (Dossiers / Claims / Source facts), pin-by-click, an Accuse
button gated on a full triad, hint ladder, 6-line judgment log. Mechanics are genuinely
good: triads, real-file gating, rule-of-three.

## Why it fails

**UI**
- (P1) **The board doesn't look like a board.** Everything is the same beige rounded
  button (screenshot `s7-board-full`): 4 dossiers, 12 claims and N facts are visually
  identical form controls in three columns. No pins, no strings, no stamps, no paper —
  "pinned" is a text prefix + border (`board-render.js:77`, `styles.css:206-209`). The
  fantasy (detective connecting evidence) has zero visual substrate.
- (P1) **Links are never drawn.** `state.board.links` exists (`evidence-board.js`) and
  accusations create links — but nothing renders them; the one payoff visual of an
  evidence board (strings converging on the culprit) is stored and discarded.
- (P2) Claims are 12 flat cards, ungrouped (`s7-board-full`: the Claims column is
  ~800px tall). Grouping by entity (G/H/J/K headers) would halve the height and mirror
  how the player actually reasons ("check K's claims against the route table").
- (P2) 1509–2052px screens; the log (where verdict feedback lands) is at the very
  bottom, off-screen from the Accuse button that triggers it.

**UX**
- (P1) **Silent partial state.** With 0–2 pins, Accuse is disabled with only a label
  swap; pinning a 4th candidate silently does nothing visible near the button
  (`accusation.js:90-152` is intentionally quiet on partials — fine as *rules*, but the
  UI must show triad slots filling: Entity ✓ / Claim ✓ / Fact ○).
- (P2) **The Case-3 search query is printed on the button** ("search session_ledger.csv
  for \"S-7741\"", `board-render.js:55-62`) — the investigative step (what would prove
  this?) is answered by the chrome. The hint ladder should earn it: attempt 1 names the
  file, attempt 2 the column, attempt 3 the token.
- (P2) **No CASE CLOSED beat.** Solving a case increments `substage` and repaints
  (EVAL-r3 flagged it; still true) — the biggest win in the stage has less ceremony
  than a log line.

**Fun**
- (P2) Zero motion in the whole stage (styles.css has no transition/animation rules):
  flags, pins, verdicts, eliminations all snap. A wrong accusation costs 10 addresses
  and prints one neutral sentence — no sting; a correct one crosses nothing out — no
  triumph.
- (P3) SS2/SS3 solve on sight (the tampered field / impossible event is the visually
  divergent row) — fine as tutorials, but they're labeled cases; one extra decoy row
  each would make them read as deductions.

## Changes (ordered)

1. (P1, M) **Make it a board.** Dark cork/slate surface panel; three card styles:
   dossiers = folder-tab cards with a monogram, claims = paper slips, facts = stamped
   notes (source filename as the stamp). Pinned = a pushpin glyph + slight rotation
   (−2°/+2°) + shadow lift. Same DOM/data; CSS + a wrapper class per column.
2. (P1, M) **Draw the strings.** SVG overlay on the board grid: pinned triad = three
   lines converging on the Accuse plate (live while pinning — the "is this a theory?"
   feel); established links persist as green threads to the eliminated dossier; a wrong
   accusation's threads snap red then fade (reduced-motion: color only, no motion).
3. (P1, S) **Triad slots UI.** Above Accuse: three labeled sockets (DOSSIER / CLAIM /
   FACT) filling as you pin; the 4th-pin case highlights the socket being replaced.
   Accuse enables with a color change + the culprit's monogram on the button.
4. (P2, S) **Verdict beats** (00-F5): wrong = board shake + red "DOES NOT HOLD" stamp
   over the triad + address cost floats away; right = green "ESTABLISHED" stamp,
   dossier card gets crossed out and greys, `CASE CLOSED — <case name>` interstitial
   banner before the next sub-stage mounts.
5. (P2, S) Group claims under entity headers (collapsible on phone); move the judgment
   log's last line into a status strip directly under Accuse (full log behind a chip).
6. (P2, S) Hint-ladder the Case-3 search query off the button (file → column → token).
7. (P3, S) One decoy row each in SS2/SS3 so the tutorial cases require one real
   comparison.

## Keep

The 7-sub-stage structure and case scripts; pin-by-tap (NO drag requirement — taps are
the right verb on both inputs; the strings are feedback, not the input method); real
file-open/search gating (load-bearing un-cheats — untouched); hint ladder economics;
serif dossier typography (it becomes characterful once the surfaces differ); the
timeline's monospace look.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

The lightest stage on the census (one currency, no meta layers) — within budget.
Remaining overload is *informational*, not systemic:

- (M1, S) **Board information diet.** Claims grouped per entity (UI pass #5) plus:
  facts column shows only facts RELEVANT to un-eliminated entities (established/
  eliminated evidence collapses into a "case file" accordion). The board shrinks as
  you solve — progress you can feel, less to scan (R4).
- (M2, S) **Ambient facts arrive as used.** SS1's full ambient-facts list fronts the
  screen; instead, reveal each fact the first time its topic is touched (flag a field
  → its related ambient line slides in). Same content, paced (R5).
- (M3, S) Addresses: show the wrong-accusation cost ON the Accuse button
  ("Accuse K — costs 10 if wrong") at the moment it matters, not in help text.
- No mechanics cuts proposed — the triad/rule-of-three economy is the right size.
