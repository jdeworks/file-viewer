# Stage 6 — Protocol Codex (deckbuilder) · genre bar: Slay the Spire

The user's exemplar complaint, fully confirmed. The engine underneath is the best in the
metagame; the combat screen presents it like a settings form.

Evidence: `stages/stage6/` ui-combat.js (223) · ui-map.js (212) · ui-rewards.js (271) ·
renderer.js (396) · styles.css (244). Screenshots `s6-hub`, `s6-map`, `s6-combat-full`,
`s6-combat-hand`, `phone/s6-combat-hand`. Metrics: combat 1278px desktop / 1397px phone.

## What exists

Screen-swap architecture (hub/map/combat/reward/rest/shop/event/boss), one delegated
click handler, pure view rebuilds — clean. Combat renders: boss banner → turn/pile
counters → enemy+player panels (HP bars, intent + 2-turn telegraph, status chips) →
energy pips → potion belt → hand → end-turn → 5-line log.

## Why it fails

**UI**
- (P0) **The hand is a vertical list.** `.s6db-hand` has NO layout rule
  (`stage6/styles.css` — the class does not appear); each card is a block-level
  `display:grid` button 150×122px (`styles.css:74-87`), so five cards stack top-to-bottom
  (screenshot `s6-combat-full`). No fan, no overlap, no arc — the defining image of the
  genre is absent, and the stack alone is ~620px tall, which single-handedly breaks the
  no-scroll rule.
- (P0) **Battle in a 470px strip.** The stage root sets no width; the shrink-wrap host
  (00-F2) collapses the whole battlefield to card-width + gap while 35% of the panel is
  empty parchment (same screenshot).
- (P2) The empty combat log is a large dead brown rectangle (`min-height:6rem` on an
  `<ol>` with 0 items) parked under the end-turn button; piles are text (`draw 5 ·
  discard 0`); cards show engine ids (`SYN+`, `JITTER`) as their title
  (`ui-combat.js:196` uses `card.id`) — cards read as debug objects, not artifacts.

**UX**
- (P1) **Click = instant play.** `data-play` fires `playCard` immediately
  (`renderer.js:308-310`). No inspect step, no confirm, no cancel — with upgraded cards
  whose text differs subtly, misclicks are unrecoverable (persisted). The user's spec is
  the genre convention: hover lifts; click inspects; explicit play/discard.
- (P1, phone) **Hand and enemy never share the screen** (screenshot
  `phone/s6-combat-hand`: choosing a card with the intent fully off-screen → you play
  blind, scroll up, learn what happened).
- (P2) End-turn — the most-pressed button — is mid-column between hand and log, not
  anchored in a fixed corner.

**Fun**
- (P1) **No moment of playing a card.** The view rebuild teleports state: no card
  travel, no impact flash, no damage number, no block shield clink. The 0.32s HP-bar
  ease (`styles.css:214`) is the only motion in combat.
- (P2) The map has no drawn edges (`s6-map` shot): "choose your route" over a table of
  disconnected chips — route *planning*, the map screen's whole game, has no visual
  substrate. (Columns exist; only the connective tissue is missing.)
- (P3) Turn flow has no beat: enemy actions resolve inside the same repaint as end-turn.

## Changes (ordered)

1. (P0, M) **StS combat layout** (assumes 00-F1/F2/F3). One viewport, no scroll:
   top band = enemy panel (left) vs player panel (right) with intent/telegraph;
   middle band = flexible arena strip: last-action ticker + floating numbers (log
   expands from here on demand);
   bottom band = **the hand dock**: `display:flex`, centered, cards overlapping
   (negative margin ramp), slight per-index rotation (−6°…+6°), `transform-origin:
   bottom center`; hover/focus lifts `translateY(-28px) scale(1.12)` + z-top (kbd:
   1–9 select). Energy crystal left of the hand; draw/discard/exhaust as pile chips
   with counts right of it (click = card-list modal, 00-F6); end-turn pinned
   bottom-right, always same spot.
2. (P1, M) **Select → inspect → play.** First click/tap raises the card to an inspect
   state (enlarged, centered above the hand, full text); second click on PLAY (or
   drag-up ≥ threshold on desktop) commits; anywhere else cancels. Disabled-by-cost
   cards inspect but grey the PLAY. Kills misclicks and gives every card its close-up.
3. (P1, S) **Card faces.** Add `name` to card defs (display names — `SYN+` → "SYN
   Flood+"); title + type icon + cost pip styled per type (protocol/layer/signal color
   frames already exist as borders — extend to a header strip); upgrade `+` becomes a
   badge; keep rules text.
4. (P1, S) **Play feedback** (00-F5): played card animates to the arena strip and
   dissolves (~200ms, reduced-motion: instant); damage = `.mg-float` number over the
   enemy + hit flash; block = shield pip pulse; status applies pulse their chip. Enemy
   turn: brief "ENEMY TURN" banner, intent executes with the same number/flash language.
5. (P2, S) **Map edges.** Absolutely-positioned SVG under the node columns drawing the
   actual adjacency (data exists in map.js); reachable edges highlighted; cleared path
   traced. Nodes keep their chips.
6. (P2, S) Log: last 2 lines as the arena ticker, full log behind a chip; empty state
   renders nothing (no dead box).
7. (P3, S) Reward/shop/rest reuse the same card face + inspect pattern (they already
   share `.s6db-card`); shop prices onto the cost-pip corner.

## Keep

Everything mechanical (engine, 6 acts, relic hooks, potions, ascension, superboss);
the screen-swap + delegation architecture (the redesign is views/CSS only); intent
telegraph + 2-turn preview (better than base StS — surface it more, drop none);
energy pips; parchment/navy identity (the *layout* is the problem, not the theme);
boss banner + PROTOCOL MISMATCH gate; map column structure and footer stats.

## Second pass — fun & mechanics (overload) [01-fun-complexity.md]

In-run complexity is genre-appropriate (StS carries the same). The overload is the
HUB: a 0-runs player sees 5 meta tiles, daily/custom/seeded-run controls, a greyed
prestige button with its cost formula, and a 16-cell ascension track
(`s6-hub-full`) — 10+ meta concepts before the first card.

- (M1, S) **Hub progressive disclosure** (R1/R4, the StS unlock convention):
  - 0 runs: title + flavor + `begin a run` + `open the codex`. Nothing else.
  - after first death: Runs/Best tiles + banked handshakes appear (now meaningful).
  - after first WIN: ascension track appears (banner: "difficulty 1 unlocked") +
    daily/custom seeds.
  - when bank ≥ prestige cost ×0.75: the `reinforce protocol` block appears.
  Pure hub-view gating; state/engine untouched, saves unaffected.
- (M2, S) **In-run info diet:** relics/keys currently live only as map-footer counts —
  give them a hover/tap strip on the map screen instead of adding more combat chrome;
  congestion window chip only renders from act 3 (it already gates ≥3 — also hide the
  label until first triggered, R4).
- (M3, S) **Key challenges get one-line telegraphs** at the moment they're live
  ("skip this reward to stay Ascetic — ⚷") — the true-ending system is invisible today
  (EVAL flagged; it's a fun leak, not just UX).
- OPTION (user call): first-run act count. Six acts before the first boss kill is a
  long first exposure (~60-90m); StS ships 3. Option: first victory unlocks acts 5-6
  (run ends at act 4's Refused Connection until then — which IS the story boss).
  Engine supports FINAL_BOSS_ACT; this is a settings-level change but touches pacing
  balance — user decides.
