# Metagame mobile-readiness audit

Read-only UX audit of the 10 easter-egg metagame stages against a **390px-wide** touch
viewport (the common phone width). Each stage mounts inside the chrome host
`.mg-v3 { width: min(760px, 100%) }` (`docs/assets/games.css:465`). The project's mobile
threshold is **760px** consistently: `isMobile = innerWidth < 760` (`docs/games/hub.js:9`),
the stage-2 d-pad media query, and the host max-width all key off it. The hub shows a
one-time "tap fullscreen" tip on mobile (`docs/games/hub.js:41-51`).

**Reference for good touch support:** Stage 2's purpose-built on-screen d-pad.
`.s2-dpad` is `display:none` by default (`stage2/styles.css:67`, desktop uses arrows/WASD)
and becomes a 3-column grid with `min-height:48px` buttons inside
`@media (max-width:760px)` (`stage2/styles-ui.css:97,134-152`). That is the bar: every
keyboard verb has a sized, tappable on-screen equivalent that appears on small screens.

## Summary

| Stage | Name | Input touch-OK? | Layout touch-OK? | Rating | Top blocker |
|------|------|-----------------|------------------|--------|-------------|
| 1 | Bit Foundry (idle clicker) | Yes (tap-native) | Yes (1 breakpoint) | **needs-work** | ×1/×10/×100/MAX count buttons ~20px tall (`games.css:303`) |
| 2 | Glyph Dungeon (roguelike) | Yes (d-pad + item btns) | Mostly | **good** | 48-col `width:max-content` board overflows ≤~360px (`view.js:22`, `styles.css:152`) |
| 3 | Memory Grid (nonogram) | **No** | Yes | **BROKEN** | mark / color-B / volatile-lock are right/alt/keyboard-only — no tap path (`grid.js:73-80`, `renderer.js:268-270`) |
| 4 | Fractal Bastion (tower defense) | Yes (click) | Yes (1 breakpoint) | **needs-work** | ~7.6×11.5px board cells + scroll-offset placement bug (`ui-combat.js:243-252`, `styles.css:37-49`) |
| 5 | Signal Racer (racing) | **No** | Yes | **BROKEN** | in-race steering is arrow-key only, no touch control (`renderer.js:255-262`, `game-loop.js:179-184`) |
| 6 | Protocol Codex (deck-builder) | Yes (all click) | Yes (720px breakpoint) | **good** | act map relies on horizontal scroll (`styles.css:102`) — minor |
| 7 | Identity Arbiter (detective) | Yes (all buttons) | Yes (720px breakpoint) | **good** | SS3 timeline row cramped at 390px (`styles.css:136`) — minor |
| 8 | Entropy Field (factory) | Yes (tap fallback) | Yes (760px breakpoint) | **needs-work** | per-node repair/HL/freeze buttons ~18px tall (`styles.css:71`) |
| 9 | Observer State (rhythm ring) | Yes (CROSS is a button) | Yes (760px breakpoint) | **good** | aid buttons auto-width inline — minor |
| 10 | Awakening (finale) | Yes (all buttons) | Yes (640px breakpoint) | **good** | buttons ~33px tall, no min-height rule (`styles.css:124-133`) — minor |

**Tally:** 2 broken (3, 5) · 3 needs-work (1, 4, 8) · 5 good (2, 6, 7, 9, 10).

**Unplayable on touch:** Stage 5 (cannot steer at all — every round and the boss are
unwinnable) and Stage 3 (clearable only through the first ~5 tutorial puzzles, then hits a
hard input wall at corruption ≥2). Stage 4 is **playable but awkward** (tiny cells + a
placement bug), not unplayable.

---

## Per-stage detail

### Stage 1 — Bit Foundry (idle clicker) — needs-work
Styles live in `docs/assets/games.css` under `.mg-s1*`.

- **Input:** tap-native. Pixel-reveal tap `stage1.js:244` (`pointerdown` on full-area
  `.mg-s1-tap`); compute/buy click `stage1.js:254`; tabs `stage1.js:128`. Shop/manager/reset
  rows go through `bindActivate` (`s1dom.js:31-55`) which binds pointer+click and relies on the
  synthetic click for touch; press-and-hold auto-repeat via `bindHoldRepeat` (`s1dom.js:63-81`).
  Boss fights (`stages.js`, `stages2.js`, `stages3.js`) use text inputs with Enter/Ctrl+Enter
  shortcuts **plus** equivalent buttons (`stages.js:79-80,167-168`, `stages3.js:205-206`), so no
  action is keyboard-only. Only true keyboard-only surface is the dev/debug hook
  (`stage1.js:275`), not a player affordance.
- **Layout:** `.mg-s1 { width: min(460px,100%) }` (`games.css:211`). Just **one** breakpoint in
  the whole file — `@media (max-width:480px)` stacks shop buy-rows so the MAX button stops
  clipping (`games.css:310-316`). Tabs flex-wrap (`games.css:284`); panels scroll
  (`max-height:58vh; overflow-y:auto`, `games.css:293-294`). ASCII boss terminal `.mg-term`
  is `white-space:pre; overflow:hidden` (`games.css:199-200`) → right side clipped (hidden, no
  layout break) on narrow screens.
- **Tap targets — top issue:** ×1/×10/×100/MAX count selectors are tiny —
  `.mg-s1-counts .mg-mult-b { padding:2px 6px; font-size:11px }` (`games.css:303`) ≈ 18-20px
  tall; base `.mg-mult-b` similar (`games.css:136`). Tabs ~31px (`games.css:285-286`); manager
  hire/lvl/fire ~34px (`games.css:387-395`) — borderline.
- **Modals:** Help is an absolute overlay with `max-height:70vh; overflow-y:auto`
  (`games.css:262-265`) — fine. Shop/achievements/reset are inline in the scrolling panel, no
  overflow trap.
- **Text:** dense, lots of 11-13px text; score chip is an absolute overlay at `top:-24px`
  (`games.css:249`) that can ride over the chrome header on short layouts. Readable but cramped.
- **Blocker:** the multiplier/count selector buttons are below comfortable touch size; text-input
  boss fights are usable but awkward to type on a phone.

### Stage 2 — Glyph Dungeon (roguelike) — good
- **Input:** keyboard `keydown` (`renderer.js:327`, Arrows/WASD → move, keys 1-3 → consumables,
  `renderer.js:313-326`) is fully mirrored by touch: d-pad buttons (`renderer.js:86-91`),
  inventory `[data-use]` buttons (`renderer.js:202-206`), and `[data-action]` buttons for
  help/shop/retreat/boss/search (`renderer.js:329-344`). No keyboard-only action at ≤760px.
- **Layout:** `@media (max-width:760px)` (`styles-ui.css:97`) shrinks fonts, stacks `.s2-play`,
  wraps controls, and reveals the d-pad — well structured. **Caveat:** the camera is a fixed
  `VIEW_W=48` cols (`view.js:22-23`) rendered `width:max-content; white-space:pre`
  (`styles.css:141-153`); at 11px mono ≈ 339px intrinsic, so it fits 390px but **overflows /
  clips right columns on ≤~360px** (iPhone SE-class). Legend is contained
  (`styles-ui.css:26-27`).
- **Tap targets:** d-pad `min-height:48px` (`styles-ui.css:144-147`) — excellent. Action buttons
  `min-height:34px` → `flex:1 1 42%` on mobile (`styles-ui.css:85,118-122`). Inventory
  `min-height:30px` and shop rows `min-height:32px` (`styles.css:78-88`,
  `styles-overlays.css:74`) — small but tappable.
- **Modals:** shop/help/rune overlays all centered with `max-width:94%; max-height:90%;
  overflow:auto` (`styles-overlays.css:5-19,97-111,149-163`) and pause play — good.
- **Caveat:** d-pad is gated at exactly 760px, so a tablet/landscape phone just above 760px CSS
  px would lose touch movement entirely (keys only).

### Stage 3 — Memory Grid (nonogram) — BROKEN
- **Input — the blocker.** Cell interaction `grid.js:73-80` (`mousedown` → `onCell(x,y,mark,colorB)`):
  - `mark` (empty ✕) requires `e.button===2 || e.shiftKey` — right/shift-click.
  - `colorB` requires `e.altKey` — alt-click (or keyboard `2`/`g`, `renderer.js:268`).
  - volatile-cell **lock** is keyboard `l` only (`renderer.js:270` → `lockUnderCursor`
    `renderer.js:134`) — no tap/button anywhere.
  A plain tap can place **fill-A only**. Tier gates (`board.js:18-28`) turn this into a hard wall:
  corruption 0-1 (solves 0-4) is mono fill-only → tappable; corruption ≥2 (`s3volatile.js:13`,
  solves 5+) needs `l` to lock decaying cells → degraded; corruption ≥6 (`s3twocolor.js:13`,
  solves 15+) needs color-B → **two-colour snapshots unsolvable on touch**. The help text itself
  only documents "click fills, right-click marks" (`view.js:29`). HUD buttons
  (shop/draft/hint/check/boss) are all click-wired (`renderer.js:274-290`).
- **Layout:** root `min(840px,100%)` (`styles.css:14`); `@media (max-width:760px)` stacks `.s3-play`
  (`styles.css:193-195`). Board `--s3-cell:24px` (`styles.css:5`); a 12×12 ≈ 368px, right at the
  edge; Overclock sizes exceed but `.s3-grid-host { overflow:auto }` scrolls (`styles.css:65-70`).
- **Tap targets:** 24px cells (`styles.css:5`) — well below 40px, and nonograms demand precise
  per-cell taps. This is painful even on the playable mono tier.
- **Modals:** `.s3-shop` / draft are absolute `width:320px; top:8px` (`styles.css:168-180`) with
  **no max-height/overflow** — a tall shop runs off the bottom with no scroll. Needs the
  stage-1 treatment (`max-height:70vh; overflow-y:auto`).
- **Blocker:** keyboard/modifier-only verbs (mark, color-B, lock) with no tap path; 24px cells.
  Fix = on-screen mode toggle (fill-A / fill-B / mark / lock) so taps express every verb.

### Stage 4 — Fractal Bastion (tower defense) — needs-work
(The brief called it "Hex Hydra"; the code is a 40×40 ASCII tower-defense. The `.mg-hex` rules in
`games.css:204-208` are dead legacy, unreferenced by stage 4.)

- **Input:** no keyboard handlers — purely click, touch-friendly in principle. Tower placement
  `ui-combat.js:228-229` → `boardCell()` maps `clientX/clientY` proportionally to a 40×40 grid
  (`ui-combat.js:243-252`). Shop/upgrade/sell/target/fork and wave controls are all buttons
  (`ui-combat.js:217-240`); map-select & armory tappable (`ui-campaign.js:50-57,89-93`).
- **Layout:** root `min(760px,100%)`; `.s4-layout` 2-col → 1-col at `@media (max-width:760px)`
  (`styles.css:25-29,240-254`). Board `<pre>` 11px mono, `max-height:60vh; overflow:auto`
  (`styles.css:37-49`): 40 cols ≈ 324px fits, 40 rows ≈ 460px → vertical scroll on a phone.
- **Tap targets — blocker:** each cell ≈ **7.6px × 11.5px** — a fingertip covers ~6 cols × 4
  rows, so precise placement on a specific path-adjacent tile is very hard. Roster buttons
  `font-size:11px; padding:3px 6px` ≈ 21px (`styles.css:99-107`); fork/sell tags ~10px
  (`styles.css:132-137`).
- **Bug:** `boardCell` computes the row from the *visible* rect height but the *full* 40 rows and
  ignores the `<pre>`'s `scrollTop` (`ui-combat.js:243-252`). Once the board scrolls vertically
  (likely at 390px), taps map to the wrong cell → towers land in the wrong place. Real
  small-screen bug.
- **Modals:** none — armory/map-select are full-screen replacements that collapse columns at
  ≤760px. No overflow trap.
- **Blocker:** tiny cells + the scroll-offset placement bug + tiny roster controls. Fix = zoom/pan
  or larger cells, fold `scrollTop` into `boardCell`, enlarge roster buttons.

### Stage 5 — Signal Racer (racing) — BROKEN
- **Input — the blocker.** Menu/shop/round actions are click-based and fine
  (`renderer.js:235-253`). But **in-race steering is arrow-key only** with no on-screen
  equivalent: `renderer.js:255-262` listens for Arrow keys → `loop.handleKey`;
  `game-loop.js:179-184` maps Left/Right = lane switch, Up/Down = fork channel. The race is
  real-time (`renderer.js:108-110`); there is **no d-pad, no tap-to-steer, no pointer/touch
  handler anywhere** in the stage. On touch you can open a round but cannot steer it — every body
  round and the boss are unwinnable.
- **Layout:** fine. Root `min(820px,100%)` (`styles.css:16`); `.s5-layout` 2-col → 1-col at
  `@media (max-width:720px)` (`styles.css:27-31,163-167`). The 3-lane ASCII track `<pre>` is
  ~110px wide (`render-track.js:48-49`) — no overflow.
- **Tap targets:** round/shop buttons ~32px (`styles.css:81-90`); ascension ~26px
  (`styles.css:122-128`) — below ideal but usable as menus, not the blocker.
- **Modals:** none (panels are inline in the side column).
- **Blocker:** keyboard-only steering. Fix = a stage-2-style on-screen control (left/right lane +
  up/down channel buttons calling `loop.handleKey`) shown while `mode==='playing'`.

### Stage 6 — Protocol Codex (deck-builder) — good
- **Input:** 100% click delegation, **no keyboard at all** (only
  `root.addEventListener("click", handleClick)`, `renderer.js:72`). Cards played by clicking
  `<button data-play=i>` (`ui-combat.js:186-200`) — no drag. Map nodes are `<button data-node>`
  (`ui-map.js:144-154`). End-turn/potions/rewards/shop/events all buttons.
- **Layout:** no fixed width on root (`styles.css:2-8`). `@media (max-width:720px)`
  (`styles.css:241-244`) collapses `.s6db-fighters`/`.s6db-boss-layout` 2-col→1-col and makes
  `.s6db-card { width:100% }`. Meta grid `auto-fit minmax(160px,1fr)` wraps; card rows
  `flex-wrap`. **Note:** the act map is `display:flex; overflow-x:auto` with `min-width:78px`
  columns (`styles.css:102-103`) — intentionally horizontal-scrolls; usable but the next column of
  nodes can sit off-screen (minor).
- **Tap targets:** hand cards become full-width with `min-height:122px` at ≤720px
  (`styles.css:74-87,243`) — large. Map nodes ~50px (`styles.css:104-110`). Primary buttons ~36px
  (`styles.css:21-29`). Small: ascension cells `min-width:26px` (`styles.css:48`), potion chips
  (`styles.css:185`) — secondary controls.
- **Modals:** none — reward/rest/shop/event/boss-reward are full-screen view swaps via `mount()`
  (`renderer.js:69,88-106`), so no positioned modal to overflow or trap scroll.
- **Text:** dense (card `0.82rem`, intent `0.74rem`, node type `0.7rem`) but sized sensibly.

### Stage 7 — Identity Arbiter (detective) — good
- **Input:** single delegated `click` handler (`renderer.js:66`); **no keydown/pointer/hover/
  contextmenu** anywhere. The evidence board is **pin-by-tap, not drag-to-connect** (`data-pin` →
  `togglePin`, `renderer.js:73`, `board-render.js:77`); `drawLink()` exists but is called only
  internally by `accusation.js`, never wired to a user drag. All verbs (flag/diff/mark-impossible/
  open-source/pin/accuse/commit/open-photo) are buttons. Zero keyboard-only actions.
- **Layout:** `@media (max-width:720px)` (`styles.css:262`) collapses `.s7-ss1` and
  `.s7-duptest-panel` to one column. `.s7-cards`/`.s7-board-grid` use
  `auto-fit minmax(200px,1fr)` → one column at 390px. No canvas, no fixed widths >390. Minor:
  `.s7-timeline li` is `grid 8em 1fr auto` (`styles.css:136`), not collapsed by the query — tight
  at 390px but the `1fr` middle absorbs shrink, no hard overflow.
- **Tap targets:** buttons `padding:8px 10px` ≈ 36px (`styles.css:46,177`); cards full-width.
- **Modals:** none — accusation board/sources/commit render inline; help/hint is an inline `<p>`.
- **Text:** serif body, no tiny fonts; HUD flex-wraps cleanly.

### Stage 8 — Entropy Field (factory) — needs-work
- **Input:** `root.click` (`renderer.js:117`) delegates ALL gameplay (`data-repair`,
  `data-high-load`, `data-stabilize-node`, `data-tech`, `data-struct`, `data-action`). There is
  **no canvas and no node placement** — nodes are a fixed 34-node topology (`nodes.js:32`) drawn
  as `.s8-node` list cards (`paint.js:143`). HTML5 drag-and-drop exists for archiving debris
  (`renderer.js:91,92,105`) but is **dead on touch**. **Critical:** the boss un-cheat
  (`manualArchiveDone` / `salvage_archived`) is set in `archiveDebris` (`boss.js:45,50`), reached
  by BOTH the drag drop AND the tap "Archive" button (`data-action="archive"` → `boss.js:76`),
  with debris chosen via `<select>` or a tappable debris chip (`paint.js:133,181`). So the whole
  game incl. the boss gate **is completable on touch** — drag is redundant, not load-bearing.
- **Layout:** `.s8-layout` 2-col → 1-col at `@media (max-width:760px)` (`styles.css:19,153`).
  `.s8-tech` `auto-fit minmax(190px,1fr)` → one column. File-tree/burn `<pre>` have own
  `overflow:auto; max-height` (`styles.css:89,103`). No page overflow.
- **Tap targets — main problem:** per-node action buttons
  `.s8-node-actions button { font-size:12px; padding:1px 6px }` ≈ **18-20px** tall
  (`styles.css:71`), floated right in a 3-button cluster — and `repair` is the most-used control,
  tapped every cycle, crowded against id/name/bar/hp on one card line at 390px.
- **Modals:** tech tree & structures are inline `<details>` accordions (`renderer.js:59-66`), not
  overlays — no trap.
- **Text:** `.s8-hud` is a flex-wrap row of ~14 stat spans at 14px (`styles.css:9`) → a dense
  ~5-7 line block at 390px.
- **Blockers:** tiny repair/HL/freeze buttons (bump to ≥40px); the dead drag-to-archive affordance
  needs a clearer tap path; 14-field HUD too dense.

### Stage 9 — Observer State (rhythm ring) — good
- **Input:** all tap. The core timing verb **CROSS is a button** (`renderer.js:41`, dispatched
  `:200`), not a key; OBSERVE/aids/notes/offline/bts are buttons too (`renderer.js:40,45,48-49,60`,
  delegated `:195-207`). **No keyboard handler exists** → nothing keyboard-only.
- **Layout:** `.s9-layout` 2-col → 1-col at `@media (max-width:760px)`
  (`styles.css:18-22,107-110`). The ring is a fixed 25×13 char ASCII `<pre>` (`ring.js:7-8`) ≈
  266px at 16px mono — fits 390px, no canvas. HUD/controls flex-wrap.
- **Tap targets:** `@media (max-width:760px)` sets `min-height:40px` on side/control buttons
  (`styles.css:111-114`), covering the aid buttons inside `aside.s9-side`. Meets the bar. Minor:
  buttons are auto-width inline rather than full-width.
- **Modals:** none — notes render inline as `white-space:pre-wrap` (`styles.css:67-72`).
- **Text:** 14px mono base, 16px arena; `prefers-reduced-motion` honored.

### Stage 10 — Awakening (finale) — good
- **Input:** entirely click dialogue + boss; **no keyboard**. Single delegated handler
  (`renderer.js:104`). Memory verbs (`renderer-memory.js:65,71-73,99,106`), stepper nav
  `data-step` (`renderer-memory.js:17-18`), all three boss phases as buttons (compaction/
  fragmentation/core, `renderer-confront.js:72,102,120`), final choices `data-final-choice`
  (`renderer-final.js:18`). No typing.
- **Layout:** real breakpoint `@media (max-width:640px)` in both sheets — header → grid + counts
  flex-wrap (`styles.css:383-395`), capstone grid `repeat(3,…)`→1-col
  (`styles-confront.css:149-153,178-182`). Content blocks are `max-width`-capped (not min-width),
  so they shrink fine. No canvas.
- **Tap targets:** option buttons are `width:100%` (`styles-confront.css:109-113`) and stacked in
  a grid (`styles.css:119-122`), easy to hit horizontally. **Minor:** `.mg-stage10 button` is
  `padding:7px 9px; font:14px/1.35` ≈ **33px** tall (`styles.css:124-133`), under the ~40px bar,
  and stage 10 has no button-sizing media rule (stage 9 does, `styles.css:111-114`).
- **Modals:** none — full repaint into `host.innerHTML`; echoes open in the main app viewer
  (`renderer.js:186-194`), not an in-stage modal. No overflow trap.
- **Text:** serif body, h2 32px; long echo file paths wrap (no `nowrap` except a harmless small
  progress label `styles.css:234`).

---

## Prioritized cross-stage fix plan

### Shared foundations first (highest leverage)

1. **(S, shared) Global touch-target sizing rule in `games.css`.** Add an
   `@media (max-width:760px)` block giving game buttons a `min-height:40px` (44px ideal) and
   bumping the tiniest controls. Single fix that lifts Stage 1's ×N count buttons
   (`games.css:303,136`), Stage 8's per-node buttons (`stage8/styles.css:71`), Stage 10's buttons
   (`stage10/styles.css:124-133`), and helps stages 4/5 secondary controls. Highest impact for
   lowest effort.

2. **(M, shared) A reusable on-screen control component (generalize the stage-2 d-pad).** Extract
   the `.s2-dpad` pattern (default-hidden, shown at ≤760px, `min-height:48px`) into a shared
   helper so any real-time/keyboard stage can mount tappable verbs. This is the prerequisite for
   unblocking Stage 5 (steer) and is the model for Stage 3's verb toggle. Single highest-impact
   shared fix because it converts the two BROKEN stages into playable ones.

3. **(S, shared) Modal scroll/overflow standard.** Adopt Stage 1's
   `max-height:70vh; overflow-y:auto` (`games.css:265`) on every floating overlay. Concretely
   fixes Stage 3's shop/draft (`stage3/styles.css:168-180`, currently no max-height). Stage 2/6/7
   already comply — codify it so new overlays inherit it.

4. **(S, shared) Raise the d-pad / responsive breakpoint above 760px or make it touch-detected.**
   The d-pad and several layouts vanish at exactly 760px, so a tablet/landscape phone at
   761-900px CSS px loses touch movement. Gate touch controls on `(pointer:coarse)` (or
   `min(900px)`) instead of a hard 760px width.

### Per-stage work, ordered by impact

5. **(M) Stage 5 — add touch steering.** Mount left/right (lane) + up/down (channel) buttons
   during `mode==='playing'`, wired to `loop.handleKey` (`game-loop.js:179-184`). Converts BROKEN
   → playable. Uses shared component #2.

6. **(M) Stage 3 — add an on-screen verb mode toggle.** A fill-A / fill-B / mark / lock selector
   so a plain tap can express every verb currently bound to right/alt/shift/keyboard
   (`grid.js:73-80`, `renderer.js:268-270`). Also raise `--s3-cell` from 24px on touch
   (`stage3/styles.css:5`). Converts BROKEN → playable. Uses shared components #1+#2.

7. **(M) Stage 4 — board placement.** Fix the `boardCell` scroll-offset bug (fold `scrollTop`,
   `ui-combat.js:243-252`), then add zoom/pan or render larger cells so a 40×40 board is tappable
   (`stage4/styles.css:37-49`); enlarge roster/fork/sell controls (`styles.css:99-137`).

8. **(S) Stage 8 — promote the tap-archive path** (label the drop zone as tappable / make the
   `<select>`+Archive flow the primary affordance, since drag is dead on touch) and bump the
   per-node buttons via #1; consider grouping the 14-field HUD (`stage8/styles.css:9`).

9. **(S) Stage 1 — count selectors** handled by #1; consider a second breakpoint pass (only the
   480px one exists).

10. **(S) Stage 2 — board overflow on small phones.** The 48-col `width:max-content` camera
    (`view.js:22`, `styles.css:152`) overflows ≤~360px; clamp the viewport columns or allow
    horizontal scroll on the board container.

11. **(XS) Stage 10 — add the missing button min-height media rule** (covered by #1 if global).

12. **(XS) Stage 6 — act map** horizontal scroll is acceptable; optionally add a scroll affordance.
    Stage 7 timeline row (`styles.css:136`) optionally collapse in the 720px query. Stage 9 is fine.

Effort key: **XS** trivial · **S** small · **M** medium.
