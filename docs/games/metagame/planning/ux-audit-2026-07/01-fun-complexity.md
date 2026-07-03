# 01 — Fun & complexity: the overload audit (second pass, mechanics now in scope)

User mandate (2026-07-03): good UI/UX includes NOT overloading the player — relevant
information on one screen, and no "going through a lot of menus to then get half a
game." Mechanics changes are allowed where they serve fun. Locked designs stay locked:
un-cheats, boss gates, stage themes, genre picks. What changes is *how much* the player
must hold in their head at once, and *when* each system is introduced.

Rounds 1–2 grew every stage aggressively (tech trees, prestige, ascension, potions,
boons, aids, 7-line shops). The mass is real content — but it is all dumped on the
first screen. The result measured below: stages open on their META layer, not their
game.

## First-contact evidence (fresh save, screenshots)

- **S6 hub** (`s6-hub-full`): a player with 0 runs sees 5 meta stat tiles (banked
  handshakes, protocol version, runs cleared, best score, boss status), daily/custom/
  seeded-run controls, a greyed prestige button WITH its cost formula, and a 16-cell
  ascension track — before the first card is ever played. 10+ meta concepts, 0 game.
- **S5 select** (`s5-select-full`): 9 round buttons + **7 upgrade tracks**
  (Engine/Chassis/Cooling/Nav/Traction/Signal Amp/Noise Filter) + a 14-glyph legend +
  THE JAMMER boss panel + an entirely EMPTY 780px track box. ~33 interactive elements
  before any driving.
- **S8 cycle 1** (`s8-initial-full`): 13-stat HUD of which NINE read zero (storms 0/3,
  States 0, entropy 0%, stress 0, heat 0/100, stabilizers 0, scrap 0, insight 0,
  salvage 0/72), plus tech tree + structures accordions (nothing to spend), plus the
  locked Heat Death panel with a five-✗ gate line, plus a `challenge Heat Death`
  button. Every end-game system is on screen at minute zero.
- **S3 snapshot 1** (`s3-initial`): shop + boon-draft buttons, the full boss panel with
  key input, and a 4-line keybinding wall around a 5×5 tutorial puzzle.

## The budget (definition of "not overloaded" — verify per stage)

1. **First-contact budget:** ≤3 new concepts on the first screen; ≤1 click from stage
   entry to the first meaningful play action; zero UI for locked/empty systems.
2. **Visible-quantity budget:** ≤5 tracked numbers on screen during play (grouped);
   everything else on demand. A stat that is 0 because its system hasn't started MUST
   NOT render (empty-state suppression).
3. **Menu-depth budget:** acquiring an upgrade happens in the flow of play (between
   rounds/snapshots/waves, as an offered choice) wherever possible — a separate shop
   menu is the exception, not the default.
4. **Currency budget:** one in-run currency + at most one meta currency visible.
   A third tracked resource must justify itself with a distinct *decision*, not a
   distinct *counter*.
5. **Progressive disclosure:** each system's UI appears the moment the system first
   matters, with a one-line arrival banner (00-F5 `.mg-banner`), and not before.
   Meta layers (prestige/ascension/seeds) appear only after the event that makes them
   meaningful (first death / first win / first bank).

## Census (systems the player is currently shown at first contact vs. total)

| Stage | Currencies/meters shown at start | Menus/panels at start | Verdict |
|---|---|---|---|
| S3 | registers, retained, snapshot#, stability, corruption+stars (5) | shop, draft, boss panel, help wall | over budget |
| S4 | cycles, integrity, wave, glory(campaign) (4) | shop, roster, armory, maps | near budget |
| S5 | round, race, pos, integrity, packets, calibration (6) | rounds, 7-track shop, legend, boss | far over |
| S6 hub | 5 meta tiles + seeds + prestige + ascension | 4 meta clusters | far over (in-run: fine) |
| S7 | addresses (1) | sources + board columns | within budget |
| S8 | 13 stats (9 zero) | tech, structures, boss, archive | worst offender |
| S9 | level, movement, clarity, seed (4) | aids, boss panel | near budget |
| S10 | 4 counts ×/9 | stepper | within budget |

## Cross-cutting mechanics rules (apply in every per-stage second pass)

- **R1 — Open on play, not meta.** Stage entry lands in (or one obvious click from)
  the first play unit: S6 fresh hub = title + `begin a run`; S5 = round 1 primed with
  one big START; S4 = map 1 preselected. Meta screens are places you *return* to.
- **R2 — Offers over shops.** Where a shop's items are incremental levels (S5's 7
  tracks, S3's 6 upgrades), replace the menu with an in-flow offer: "pit stop — pick 1
  of 2" between rounds / snapshots. The player makes the same economic decision with
  zero navigation. Keep a full shop only where browsing IS the game (S6's Open Port).
- **R3 — Merge counters that don't earn a decision.** Candidates named per stage
  (S3: Engram Bank→shop, retained=progress not currency; S5: 7 tracks→3;
  S8: salvage→archive progress bar, stabilizers→node action not HUD stat).
- **R4 — Empty-state suppression + arrival banners.** No zero-stats, no locked
  panels, no greyed prestige math on first contact. Systems announce themselves once.
- **R5 — Teach in play.** Legends/keybinding walls go behind ❓; the first encounter
  with a glyph/mechanic gets its one-liner in-context (first pickup toast, first
  volatile cell banner, tier-arrival messages — S3 already has these; extend the
  pattern).
- **R6 — Boss presence is earned.** Boss panels render as a one-line locked chip until
  their gate is within reach (S3 done in UI pass; same for S5 JAMMER, S8 Heat Death,
  S9 Observer). The chip names the NEXT missing requirement only — not five ✗ glyphs.

## What this pass does NOT do

No difficulty rebalance, no content cuts of built systems (tech trees, archetypes,
acts, cards all stay), no un-cheat/gate changes. We change *when* systems appear,
*where* their controls live, and merge counters that present as bookkeeping. Anything
deeper (e.g. actually deleting a mechanic) is listed as an OPTION with its tradeoff,
for the user to decide.
