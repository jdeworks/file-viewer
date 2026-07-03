# Stage 8 — Entropy Field (survival/factory) · genre bar: survival-sim dashboards (Frostpunk-style legibility: map + resources + one decisive verb)

Evidence: `stages/stage8/` renderer.js (269) · paint.js (183) · techpanel.js (70) ·
storms.js (151) · boss.js (213) · styles.css (184). Screenshots `s8-initial`, `s8-mid`,
`s8-late-full`, `phone/s8-initial`. Metrics: 1477 → 2459 → **3243px** as the network
grows 14→34 nodes (desktop, 734 visible); phone start 2215px.

## What exists

Vertical document: 14-stat HUD → node list + archive/file panel → Heat Death panel →
storm telegraph banner → two `<details>` accordions (tech tree, structures) → log →
controls row (`advance cycle ▸`, brace, stabilizer, boss). Nodes are full-width cards
with a health bar and HL/freeze/repair buttons. State-driven glitch CSS by entropy.
The engine (sectors, storms, cascade, tech, automation) is deep and sound.

## Why it fails

**UX**
- (P0) **The core verb is at the bottom of a 3243px document.** `advance cycle ▸` — the
  button pressed literally every turn — is the LAST element (`renderer.js:69-77`,
  screenshot `s8-late-full`). The consequences of pressing it (node health, storm
  countdown) render at the TOP. The core loop is: scroll down, act blind, scroll up,
  read, repeat. This is the single worst interaction in the metagame.
- (P1) The boss gate line is cryptography: `storms ✗ · action ✗ · salvage ✗ · cycles ✓ ·
  lifetime-States ✓` (paint.js:38) — five unlabeled glyph pairs encode the entire
  victory condition.
- (P2) Tech tree and structures — the strategic layer — hide inside collapsed
  `<details>` accordions between the boss panel and the log.

**UI**
- (P0) **A network rendered as a list.** The game is *about* topology — adjacency
  cascade, sector storms, load routing — and the UI is 34 identical stacked cards in a
  ~200px-wide column (screenshot `s8-late-full`), with the map column half the width of
  the mostly-empty archive panel beside it. Which nodes are adjacent? Which sector is
  ALPHA? Where will the cascade spread? Unanswerable by looking. The `⚠+N` stress tags
  are the only topology signal and they're per-card text.
- (P1) The 14-stat HUD is an unbroken text wall (`s8-hud` flex-wrap, paint.js:13-34):
  act, storms, cycle, States, entropy, stress, heat(+rate), repair, stabilizers, scrap,
  insight(+rate), salvage — no grouping, no hierarchy, all 14px.
- (P2) Per-node buttons ~18-20px tall (`styles.css:71`), three crowded on a line —
  `repair` is the most-tapped control in the stage.

**Fun**
- (P2) Crises don't *land*: a storm is a 1-line banner; a node failure is a class swap
  + log line; TOTAL CASCADE prints a list item. The glitch CSS (good!) is the only
  drama. Advancing a cycle — the heartbeat — has no rhythm: no tick animation, no
  per-node settle, no cascade propagation you can watch.
- (P3) Debris drag-to-archive is dead weight on touch (tap path exists and is primary
  anyway — MOBILE_AUDIT.md:189-211).

## Changes (ordered)

1. (P0, S) **Sticky command bar.** `advance cycle ▸` + brace + the 4 decisive numbers
   (cycle, entropy, heat rate, storm countdown) pinned at the top (or bottom) of the
   stage zone, always visible; the last log line rides in it as a ticker. One CSS
   change + moving the controls row; do this before anything else.
2. (P0/P1, L) **Spatial node map.** Render nodes as compact tiles (id · bar · stress
   pip) laid out by sector — CORE center column, ALPHA/BETA/GAMMA blocks around it —
   with adjacency edges drawn (SVG or CSS grid + border tricks; `nodes.js` has the
   topology). Cascade stress = edge highlights; storms tint their sector. Tile tap →
   action popover (repair / HL / freeze with 40px targets). The 34-card list dies; the
   whole network fits one screen under 00-F1/F3.
3. (P1, S) **Boss gate checklist card.** Five labeled rows with live values
   ("storms survived 2/3 ✗ · manual archive done ✓ · salvage 41/72 ✗ …") replacing the
   glyph line; sits in the Heat Death panel.
4. (P1, M) **HUD → four labeled clusters** (NETWORK / THERMAL / RESOURCES / PRESTIGE)
   with the 2 key numbers large per cluster, rates as small signed chips; hide
   locked-mechanic stats until first unlock (progressive disclosure — stress/insight
   mean nothing in act 1).
5. (P2, M) Tech tree + structures become a proper tabbed panel (side sheet on desktop,
   full-height sheet on phone) with owned/affordable/locked color states; keep branch
   columns.
6. (P2, S) **Cycle beat + crisis drama** (00-F5): advance = quick sweep highlight
   across tiles in decay order (~250ms, reduced-motion: none); node failure = tile
   flash + `.mg-float` "-N States"; storm arrival = full-zone banner + sector shake;
   cascade = edges pulse in propagation order. The existing entropy glitch stays as the
   ambient layer.
7. (P3, S) Label the drop zone as tappable ("tap a debris chip, then Archive") and keep
   drag as a desktop nicety.

## Keep

The engine and all mechanics; storm telegraph banner (right instinct — make it louder);
entropy-driven glitch CSS with reduced-motion guard (best ambient touch in the
metagame); `<pre>` file-tree/burn readouts (thematic, well-capped); the tap-first
archive path; monospace terminal identity.
