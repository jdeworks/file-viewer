# Stage-by-Stage Feedback

## Stage 1 - Birth / Bit Foundry

Strongest parts:
- The empty-screen/pixel-reveal opening is excellent. It is unique and should remain sacred.
- Idle/clicker fits "birth" because it starts as barely-conscious accumulation.
- Manager running costs are a good Bit Foundry-specific twist.

Concerns:
- Stage 1 already has a lot: big numbers, timed tiers, managers, achievements, prestige, boss cheat,
  save migration, base64, bell, reset. It is nearly a complete idle game.
- The current implemented boss is a click-contest with `CHEAT` in `Overwriter.frag`, while the
  boss-lock doc describes `PROTECTED = true`. Pick one canonical fiction before expanding stages.
- Terminal artstyle says "no icons," but the current design uses emoji icons heavily. For Stage 1
  specifically, I would replace emoji with ASCII/glyph labels or small text symbols.

Recommendation:
- Keep Stage 1 mechanically rich enough to establish the metagame, but stop adding systems after
  the boss loop works. It should not set the expectation that every later stage has the same depth.

## Stage 2 - Syntax / ASCII RPG / Search

Strong alignment. Search maps naturally to syntax and hidden text. ASCII dungeon is thematically
clean: the world is text.

Risk:
- Full procedural dungeon + equipment + auto-combat is fine for the intended scope, but it needs a
  strong deterministic seed/debug mode so agents can test floors and boss paths reliably.

Boss lock works if `cipher.txt` is introduced before the boss. The player should have seen the file
exist, even if they did not know why it mattered.

## Stage 3 - Memory / Nonogram / Diff

Very strong thematic match. Diff is exactly "memory across versions."

Risk:
- Nonograms are easy to make frustrating if generated puzzles are not uniqueness-checked. The plan
  mentions pre-generated verified pools. Treat that as mandatory, not optional.
- A 20x20 timed/corruption boss may be too punishing for players who like the meta story but not
  hard logic puzzles.

Recommendation:
- Add a lower-pressure "story mode" tuning internally, even if not exposed as difficulty. Let diff
  restore enough information that the boss becomes comfortably solvable.

## Stage 4 - Pattern / Tower Defense / Folder Navigation

The recursive path + nested folder blueprints pairing is one of the best matches in the plan.
"Go deeper in the directory to interrupt recursion" is memorable.

Risk:
- 30 waves, 6 towers, upgrades, active abilities, branching paths, and L-system generation are
  appropriate for the large target, but this stage needs especially strict data contracts. Tower,
  enemy, wave, path, and blueprint data should be separate JSON-like modules rather than buried in
  one renderer.

Recommendation:
- Keep the full concept. Build it in passes: first path + one tower + waves, then full tower set,
  then blueprints, then boss lock, then prestige.

## Stage 5 - Signal / Racer / Audio

The theme is good: signal, speed, transmission, listening before moving.

Concern:
- Audio playback as a required boss unlock is weaker than the surrounding stage-tool mappings.
  Playing an MP3 to learn a rhythm can feel like a gimmick unless the audio cue is also visible or
  structurally tied to the race.

Recommendation:
- Make `transmission_hum.mp3` a "telemetry track" rather than just music. The audio player could
  show waveform peaks or metadata markers that correspond to suppression windows. That teaches audio
  playback better and makes the lock less arbitrary.

## Stage 6 - Protocol / Deck Builder / Epub

The protocol/card theme is strong, and an epub as a protocol manual is a good feature match.

Big risk:
- A real roguelite deck builder is a very large implementation. Since the large scope is intended,
  the risk is not size but testability: card effects, combo rules, relics, and enemy intents need
  pure logic tests and a deterministic combat harness.

Recommendation:
- Keep the full deck-builder direction, but spec a minimum viable card pool first. Agents should
  land the engine with a small set, then fill the 54-card pool as data/content work.

## Stage 7 - Identity / Logic Deduction / EXIF

Excellent thematic match. EXIF metadata as hidden identity evidence is one of the clearest
professional-tool lessons in the whole plan.

Risk:
- The boss lock using a 50/50 unknown pair is good, but avoid allowing random guessing to pass. If
  the player guesses without EXIF, the game should either refuse the commitment or always require
  the metadata evidence to finalize.

Recommendation:
- Phrase the boss as "insufficient evidence" rather than "wrong guess." That reinforces the lesson:
  identity decisions require evidence, not luck.

## Stage 8 - Entropy / Survival Management / Drag and Drop

The drag-and-drop salvage concept is thematically excellent. It is probably the best "tool action
as stage verb" in the plan: entropy scatters; the player restores order by moving files.

Main concern:
- Requiring a full stage replay if the player missed salvage is too harsh unless the stage is short.

Recommendation:
- Let the first boss failure create an emergency debris dump with decaying `.sav` files. The player
  still must use drag-and-drop and still learns preparation, but they are not punished with a blind
  60-90 minute replay.

## Stage 9 - Consciousness / Stealth / Offline

The Observer Effect mechanic is excellent. Hovering freezes the observer and freezes the entity is
simple, thematic, and playable.

Concern:
- Requiring actual offline mode can be brittle. Browser/PWA/network behavior is environment-dependent.
  The boss-lock doc already notes a manual "Go Offline" affordance; treat that as required.

Recommendation:
- The file viewer should expose an explicit offline/cache panel action in Stage 9. The player can
  still learn what a service worker does, but the game remains testable and playable.
