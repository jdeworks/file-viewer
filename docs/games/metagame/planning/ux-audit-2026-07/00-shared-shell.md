# 00 — Shared shell: the systemic failures every stage inherits

Fix these once, before any per-stage work. Three of the four are one-file CSS/shell
changes; they are the reason no stage can currently satisfy "fits the space, no scroll".

## F1 (P0) — Nothing owns a height: every stage is a scrolling document

Evidence: `.games-panel { width:min(720px,100%); max-height:92vh; overflow:auto }`
(`docs/assets/games.css:11-13`) is the ONLY scroll container. `.games-stage`
(`games.css:29`), `.mg-v3-host` (`games-chrome.css:69`) and every stage root grow with
content. Result (measured): S8 late-game is 3243px of content in a 734px window; S6
combat 1278px; S5 racing 1305px. Scrolling moves the *whole panel* — header, stage nav
and HUD scroll away with it.

Why it fails: a game needs its verbs and its state visible simultaneously. Today S8's
`advance cycle ▸` (pressed every turn) is the LAST element of a 4.4-screen document; S6's
hand is below the fold of its own battle; S5's steering pad on phone is ~1000px below the
track. This one omission produces most of the per-stage P0s.

Change (M): give the shell a height contract.
- `.games-panel` → fixed height (`height:min(92vh, …)`), `display:flex; flex-direction:column`
  (already flex); `.games-stage { flex:1; min-height:0 }` (drop `align-items:flex-start`).
- `.mg-v3` → `display:flex; flex-direction:column; height:100%`; header+nav natural
  height; `.mg-v3-host { flex:1; min-height:0 }`.
- Contract for stages: your root gets `height:100%`; you must NOT overflow it. Interior
  panes (logs, lists, shops) scroll individually. Expose it as a documented rule in
  `metagame.js` next to `mountStage`.
- Migration: stages that don't yet comply keep an interim `overflow:auto` on the host so
  nothing breaks while each stage is converted (the per-stage files say how).

## F2 (P0) — The host shrink-wraps stages: Stage 6 plays in 470px of a 720px panel

Evidence: `.mg-v3-host { display:flex; justify-content:center }`
(`games-chrome.css:69`) makes the mounted stage a flex item sized to max-content. Stages
that set an explicit width (S3 840, S4 760, S5 820) are fine; `stage6-protocol-codex`
sets none (`stage6/styles.css:2-8`) — screenshot `s6-combat-full`: the entire battle
occupies a ~470px-wide strip with the right 35% of the panel empty parchment.

Change (S): `.mg-v3-host > * { width:100%; }` (or `align-items:stretch` + stage roots
`width:100%`), and remove per-stage magic widths once F3 lands.

## F3 (P1) — 720px panel on a 1280px+ desktop: the game is boxed like a toy

Evidence: screenshots `s6-map`, `s5-racing` — the arcade dialog floats in ~45% of the
desktop viewport; each side has ~280px of dead backdrop while stages fight for pixels
(S4's 40×40 board at 11px, S5's 110px track, S3's 170px puzzle).

Why it fails: these are now full games (TD campaign, deckbuilder, survival sim), not
arcade toys. Space starvation is self-inflicted: the panel width is our own CSS.

Change (S): widen the panel while the metagame is mounted — e.g. `.games-panel.is-meta
{ width:min(1100px, 96vw) }` toggled by the hub when `data-game="metagame"` opens
(hub owns the panel; one class). Arcade games keep 720px. Every per-stage layout fix
below assumes this room exists.

## F4 (P0 on phone) — Chrome diet: ~700px of shell before the game starts

Evidence: screenshots `phone/s5-racing`, `phone/s3-initial` — Arcade titlebar + mobile
tip banner + Defragmenter header row + **nine stage pills in 5 rows** consume the entire
first viewport (842px); the play surface starts around y≈900.

Change (M):
- ≤760px: collapse `.mg-v3-stages` into one row — a `<select>` or a horizontal
  scroll-snap strip of number chips (`1…10`), ~44px tall total (today ~370px).
- Tip banner: dismiss persists (it does) but also auto-hide once fullscreen was used.
- Header: merge the banner+stage-name line with the action buttons into one 44px row.
- With F1, the remaining chrome is pinned and only the stage area is the game.

## F5 (P2) — Feedback baseline: actions without reactions

Evidence: S7 has zero CSS transitions (`stage7/styles.css` — none); S10 none beyond
hover; S4 hits/kills/damage have no visual event (board glyphs just change between
frames); S3 solves just repaint. Only S9 (arena flash) and S5 (beat pulse) have any
action feedback. Also: piles/logs are text counters (`s6db-pile`), empty logs render as
large dead boxes (screenshot `s6-combat-full`, bottom).

Change (M): a shared micro-feedback kit in `games-chrome.css` + ~40-line helper —
`.mg-hit` (flash), `.mg-shake` (screen/element shake), `.mg-float` (rising damage/score
number), `.mg-banner` (phase interstitial: "WAVE 12", "CASE CLOSED", "ENEMY TURN"),
all `prefers-reduced-motion`-aware. Stages then attach classes instead of inventing
per-stage systems. This is the cheapest fun-per-line change in the whole audit.

## F6 (P2) — Modal standard

Evidence: S3's shop/draft paginate ONE item per page (`s3modal.js:37-59`, screenshot
`s3-shop-modal`: "1 / 6" with Prev/Next) — comparison shopping is impossible. Other
stages roll their own overlays or use none.

Change (S): one shared modal (fixed, centered, `max-height:80vh`, internal scroll,
backdrop/Esc close, NO pagination — content is a grid). S3 switches to it; future shops
reuse it.

## F7 (P3) — Icon fragility and identity drift

Evidence: intent/node icons are raw emoji (`⚔ ☠ ♨ ⛁ ❓ ☣`, `stage6/ui-map.js:11-13`);
in the headless run several render as tofu boxes (screenshot `s6-combat-full`, header
buttons + intent icon), and across stages emoji weight/style varies per platform. Themes
also swing wildly (S3 paper-light, S4/S5 dark neon, S6/S7 parchment serif, S8/S9 black
mono, S10 serif white) — variety is fine and intended, but shared chrome (header, nav,
bell, dev menu) should stay one visual system so the stages read as chapters, not
different apps.

Change (S, opportunistic): a tiny shared glyph set (text/SVG spans with `.mg-ico--*`
classes) for intents/node types/HUD stats; keep per-stage palettes.

## Measurement contract

`tools/shots.mjs` prints `content Xpx vs visible Ypx` per screen. Definition of done for
F1–F4: every in-play screen X ≤ Y on desktop; on phone, each stage's primary verb
control and its play surface are inside one 842px viewport together.
