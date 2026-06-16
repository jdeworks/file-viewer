You are picking up Stage 1 of the Bit Foundry metagame the morning after all 12 WPs shipped.

Read these files before doing anything:
- docs/games/metagame/design/04-game-plan.md (the authoritative Stage 1 spec)
- /home/jens/.claude/projects/-home-jens-repos-file-viewer/memory/open-tasks.md (live backlog)
- /home/jens/.claude/projects/-home-jens-repos-file-viewer/memory/easter-egg-metagame.md (full 10-stage design)

Per-increment contract (every change, no exceptions):
implement → ≥1 smoke check → ./scripts/check.sh GREEN (ZERO off-origin) → regen asset-manifest.json → commit+push to dev
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

---

## Immediate: Stage 1 playtest fixes (do these first, in order)

1. **Browser playtest** — open the app in a real browser (chromium or equivalent), navigate to the
   metagame, play through Stage 1 from a fresh save. Catch any runtime errors in the console.
   Known risk areas: BigNum state flowing through stage1.js, base64 save round-trip on reload,
   timed buttons completing, manager auto-fire, prestige reset. Fix any errors found.

2. **buyMult persistence** — `state.buyMult` is in the save schema but the ×1/10/100/1000/MAX
   selector in stage1.js is probably a local variable that resets on reload. Check: does the
   buy-count selection survive a page reload? If not, sync the active selector to `state.buyMult`
   on change and read it back on mount.

3. **canFightBoss allOwned check** — stage1.js's boss button is gated on `gte(bits, 1B)` only.
   Add the missing check: all non-cursor tiers must be owned ≥1. Gate: allOwned && gte(bits, 1B).
   (metagame.js already computes `canFightBoss` correctly and passes it in ctx — check whether
   stage1.js uses it or recomputes; if it ignores ctx.canFightBoss, switch to using that.)

---

## Then: Stage 2–4 design (or user-directed enhancements outside the easter egg)

The user has:
- New stage designs to spec (Stages 2–4 specifically, building on easter-egg-metagame.md)
- Smaller enhancements to the main file-viewer app (outside the metagame)

Wait for the user to direct which of these to tackle first.

For stage design work, the pattern from Stage 1:
- Write a design doc (docs/games/metagame/design/05-stage2-plan.md etc.)
- Lock it with the user before any implementation
- Then dispatch agents in waves following the same WP pattern

---

## Architecture reminders

- BigNum ({m,e}) is Stage 1 only; stages 2-10 use plain numbers
- stage1.js is the bespoke renderer; metagame.js is the orchestrator
- s1state.js handles base64 save/load for Stage 1
- s1economy.js has all the math (costOf, totalCost, maxAffordable, timedPayout, netRate, pullGain…)
- boss1.js mounts The Defragmenter fight; rawpane.js has the cheat hook
- Key localStorage keys: fv:games:metagame (save), fv:games:mg:bell (bell), fv:boss1:cheat (cheat latch)
- check.sh runs movediff + headless smoke; gen-asset-manifest.mjs regenerates the manifest
