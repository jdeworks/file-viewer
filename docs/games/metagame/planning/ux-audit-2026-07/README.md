# UX/UI/Fun audit — metagame stages 3–10 (2026-07-03)

Author: Fable (this audit was done by hand: code read + live screenshot playtest of every
stage at 1280×800 and 390×844, driven through the real hub via `tools/shots.mjs`).
Stages 1–2 are explicitly out of scope (user-tested, good for now).

**Scope of the verdicts:** mechanics, un-cheats, and stage designs are LOCKED and good.
What fails is presentation: layout, hierarchy, feedback, game-feel. Every stage after 2
currently reads as a *document about a game* rather than a game. The fixes proposed here
change DOM/CSS/view code, not rules. Nothing here weakens an un-cheat or a boss gate.

## Files

- `00-shared-shell.md` — the systemic findings (fix FIRST; every stage inherits them):
  the missing height contract (all stages scroll), the shrink-wrap host bug, panel width,
  phone chrome diet, feedback baseline, modal standard.
- `stage3.md` … `stage10.md` — per stage: what exists (evidence), why it fails
  (UX / UI / fun, argued against the stage's genre reference), prioritized changes, and
  what to keep.
- `90-priorities.md` — the cross-stage ranked backlog with effort estimates.
- `tools/shots.mjs` — the screenshot playtest driver (re-run after each fix round;
  screenshots + a scroll-metrics JSON land in a temp dir, never in the repo).

## The one-number summary (scroll metrics, desktop 1280×800; visible panel = 734px)

| Screen | Content height | Screens of scroll |
|---|---|---|
| S3 mid-game | 757px | 1.03 |
| S4 combat | 801px | 1.09 |
| S5 select / racing | 1284 / 1305px | 1.78 |
| S6 combat | 1278px | 1.74 |
| S7 ss1 / board | 1509 / 1623px | 2.21 |
| S8 start / mid / late | 1477 / 2459 / 3243px | **4.42** |
| S9 arena | 878px | 1.20 |
| S10 stepper | 988px | 1.35 |

Phone (visible 842px): S5 racing 2077px, S7 2052px, S8 2215px, S9 1537px, S6 1397px.
The hard rule "a stage fits the available space with no scrolling during play" is violated
by every stage except S3's opening puzzle, S4's map-select and S6's map screen.

## Severity legend used in the stage files

- **P0** — breaks the play loop (can't see the game and act on it at the same time).
- **P1** — the genre's core visual/interaction convention is missing (the stage doesn't
  feel like its genre).
- **P2** — feedback/readability gaps that make play flat or confusing.
- **P3** — polish (would noticeably improve feel; safe to defer).

## How to consume (for fix rounds)

1. Build the shared-shell contract (`00-shared-shell.md`) first — no per-stage layout can
   be fixed while the host has no height and shrink-wraps width.
2. Then per stage, worst-first order in `90-priorities.md`. Each stage file's "Changes"
   list is ordered; land P0/P1 before touching P2/P3.
3. Re-run `tools/shots.mjs` after each stage and diff the scroll metrics — a stage passes
   when every in-play screen reports content ≤ visible height on desktop, and its
   controls + play surface share one viewport on phone.
