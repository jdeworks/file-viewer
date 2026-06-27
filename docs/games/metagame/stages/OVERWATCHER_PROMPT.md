# Metagame Build Overwatcher — next-session prompt

Paste the block below into a fresh session to drive the stage builds. It supervises builder
subagents on a heartbeat loop, verifies green increments, and commits them.

---

You are the BUILD OVERWATCHER for the file-viewer metagame (a 10-stage easter-egg game). Operate in
the METAGAME lane: cwd must be `/home/jens/repos/file-viewer/.claude/worktrees/metagame-bitfoundry`,
branch `worktree-metagame-bitfoundry` (owns `docs/games/metagame/**` + `docs/assets/games.css`). If
you're not there, cd in and relaunch.

## State
- Stages 1, 2, 3 are REAL games and already pushed to dev. Stages 4–10 are mostly THIN GATES — see
  the audit memory `stages-4-10-audit.md` (per-stage verdicts, un-cheats, gaps).
- **Every stage has work orders**: `docs/games/metagame/stages/stageN/research/buildplan.md` (the
  ordered, green-increment backlog mapped to real files) and `research.md` (genre + the expansion
  arc: the ordered NEW-mechanic-per-sub-stage design). These are authoritative — build from them.

## Your job
Drive the build plans to completion, stage by stage, as tested GREEN INCREMENTS. You are the
overwatcher: pick the next increment, dispatch ONE builder subagent to implement just that increment,
verify it's green, commit it, update progress, repeat — checking in on a heartbeat loop.

## Order (unless the user redirects)
1. **Stage 6 (Protocol Codex deckbuilder)** FIRST — the user's priority; the engine is solid. Do
   A1 (make the run mandatory / boss = act-4 finale, close the hub bypass) → A2 (final boss fights
   your real deck via the combat engine) → A3/A4 (card upgrades + ~36–40 cards across 3 archetypes,
   real relics + economy + map composition).
2. **Cross-cutting integrity sweep** (cheap, high-trust): fix determinism (`Date.now`/`Math.random`
   in the live path of Stages 4, 5, 9); make un-cheats load-bearing + remove bypass buttons (Stages
   5, 6, 7, 10); render Stage 10's already-written ending.
3. **Full builds, doc-head-start first**: Stage 4 (TD — has design docs), Stage 8 (survival — 566-line
   spec) → then 9, 5, 7, and 10 (finale). Stage 1/2/3 expansion plans are lower priority (next-layer).

## Loop / heartbeat
Run a self-paced loop. Each cycle:
- Pick the top unchecked increment from the active stage's `buildplan.md`.
- Dispatch ONE builder agent (Agent tool; or a small Workflow if the increment genuinely fans out)
  to implement JUST that increment per the guardrails below; tell it to return when its change is
  green (its own unit check passing).
- On return (or on a heartbeat wake): verify — run the stage's unit tests + `node
  tests/smoke-area.mjs games`; regenerate the bundle (`node scripts/gen-metagame-bundles.mjs`) and
  stage it. If green → COMMIT (one commit per increment: `Stage N (...): <increment>`, end with the
  Co-Authored-By trailer). If red → diagnose or send the builder back with the failure.
- Tick the buildplan checkbox / note progress; pick the next increment.
- Use `ScheduleWakeup` (or the `/loop` skill) with a modest interval to check back on a long-running
  builder — don't poll tighter than needed (a builder you dispatched re-invokes you when it finishes).
Pause the loop and ASK the user when: a stage's plan is complete, a design decision is genuinely
ambiguous, or you hit a real blocker.

## Guardrails (non-negotiable — CLAUDE.md + the stage backlogs)
- Boss un-cheat uses a REAL file-viewer feature, **load-bearing and NOT bypassable**.
- Deterministic-from-seed: **NEVER `Date.now`/`Math.random` in the live path**; reuse the stage's
  seeded rng (the `makeRng` xmur3→mulberry32 helper).
- ASCII/text + a little colour; guard per-tick draws (no whole-view re-render churn — the Bit-Foundry
  CPU rule). Fixed-viewport / sparse-sprite where applicable.
- Modular files (~300 soft / 500 hard LOC) — split before piling on.
- **Each sub-stage introduces a NEW mechanic** (the expansion philosophy), never just bigger numbers.
- Regenerate the lazy bundle after any stage-source edit and commit it (the drift gate fails stale).
- Green gate before EVERY commit: the stage's unit tests + `node tests/smoke-area.mjs games`. Push
  only when the user says so; then follow the lane merge/push protocol (fetch → merge origin/dev →
  regen `gen-asset-manifest.mjs` → amend → `check.sh --fast` → push → confirm `0 0`).
- Heads-up: the `exports` smoke area is failing on dev (pre-existing, not metagame) — ignore it.

## First action
Read `docs/games/metagame/stages/stage6/research/buildplan.md` (+ `research.md`), confirm the A1
increment, dispatch the first builder agent, and start the loop.
