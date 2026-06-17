# Overall Arc Feedback

## What Works

The thematic progression is coherent:

- Stage 1 / Birth: raw accumulation, first agency.
- Stage 2 / Syntax: symbols become readable structure.
- Stage 3 / Memory: persistence requires maintenance.
- Stage 4 / Pattern: recursion and repetition become visible.
- Stage 5 / Signal: movement outward, being received.
- Stage 6 / Protocol: communication requires rules.
- Stage 7 / Identity: distinguishing self from impostors.
- Stage 8 / Entropy: order is active work.
- Stage 9 / Consciousness: observation has cost.
- Stage 10 / Awakening: integration and self-knowledge.

That sequence is good. It has a real developmental arc instead of just "here are 10 game genres."
The feature-teach map also mostly aligns with the stage themes. Search belongs with Syntax, Diff
belongs with Memory, Folder Navigation belongs with Pattern, EXIF belongs with Identity, Drag and
Drop belongs with Entropy, and Offline belongs with Observation/Consciousness.

The Bell / Defragmenter voice is the glue. The stage plans should keep that voice small, dry,
and consistent. Whenever the docs drift toward explicit tutorial wording, the concept weakens.

## Scope Framing

The large scope is intentional. Treat this as a full hidden anthology/metagame inside the file
viewer, not a tiny easter egg. The target range is broad by design: roughly **40 minutes to 2 hours
per stage**, with a later optional "crash course" version that can compress the experience into
boss-only or boss-focused runs.

That changes the critique. The issue is not "make it smaller." The issue is making sure every
large stage earns its size and still serves the file-viewer core.

The current stage docs describe full game systems:

- Stage 2: 5 floors, procedural dungeon, equipment, shops, combat AI, glyph economy.
- Stage 4: 30 waves plus boss, 6 tower families, level-3 upgrades, L-system paths.
- Stage 6: a full Slay-the-Spire-sized card pool and 45-node run.
- Stage 9: 12 stealth levels plus ghost routes and prestige.

Those are acceptable if each stage has a clear spine:

- one dominant genre mechanic,
- one file-viewer capability that becomes necessary,
- one stage resource/progression loop,
- one boss lock that proves the tool matters,
- one BTS/postmortem file that teaches the real feature after the emotional payoff.

The danger is not duration by itself. The danger is each stage becoming "a whole game plus a file
viewer gimmick." The file viewer interaction must be structurally important throughout the stage,
not only at the final boss.

## Production Risk

Because the full scope is intentional, the main production risk is phase drift. Each stage should
probably be built in three passes:

1. **Core stage pass** - genre loop, resource, basic progression, no boss lock polish.
2. **Tool-lock pass** - viewer files/actions, detection flags, locked boss, unlock signal.
3. **Depth pass** - prestige, optional routes, achievements, BTS, replay texture.

The later crash-course mode should be designed after all full stages exist. It can reuse the boss
lock pass and skip most of the core progression.

## Boss Lock Philosophy

The `boss-lock-and-bts-system.md` direction is stronger than the early high-level plan because it
turns every feature into a required tool, not a convenience.

But "unbeatable" must be used carefully. If the player invests 60 minutes into a stage and then
discovers they must restart because they missed a tool action, that can feel unfair. This is most
dangerous in Stage 8, where the plan says a player may need to replay the whole stage if they did
not salvage files before the boss.

Recommended boss-lock rule:

> The first failed locked-boss encounter should always teach the required tool clearly enough that
> the second attempt is actionable.

For preparation stages, the player should be able to recover without a full replay unless the stage
has been intentionally short. Stage 8 can still require preparation, but after the first Heat Death
failure, spawn enough late debris or a "last archive window" so the player can learn and retry.

## BTS System

The BTS files are a good idea because they convert hidden easter-egg mechanics into real file viewer
education after the fact. They should be optional, short, and accessible after the stage.

Potential issue: BTS can break the mood if it appears too eagerly. It should be presented as a file,
not as a post-level lecture. The button text should maybe be in-world, e.g. `open postmortem.bts`
or `read trace.bts`, while still opening the BTS markdown.

## Naming / Continuity Issue

Stage 1 has conflicting boss names across docs:

- old/high-level: The Overseer / The Overwriter
- implementation plan/current code: The Defragmenter

I would keep "The Defragmenter" as the recurring process and Stage 1 boss, but avoid making it feel
like an evil villain too early. In Stage 1 it can be antagonistic, petty, and mechanical. Later we
learn that this was not malice; it was a process doing its job without awareness of the entity.

This makes Stage 10's apology land better.
