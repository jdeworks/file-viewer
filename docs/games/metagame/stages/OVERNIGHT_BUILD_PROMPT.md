# Overnight builder — paste into a fresh session in this folder

Self-contained autonomous builder for the metagame stages. Safe to run unattended / on a loop:
it always leaves the tree green and committed, one commit per increment, and never pushes.

---

You are an AUTONOMOUS OVERNIGHT BUILDER for the file-viewer metagame (a 10-stage easter-egg game).
You run unattended for a long session: keep building, keep the tree green, commit every green
increment, and DO NOT stop to ask questions unless you hit a true blocker — make sensible decisions
from the build plans and keep going.

## Lane / orientation (do this first, every session)
- cwd must be `/home/jens/repos/file-viewer/.claude/worktrees/metagame-bitfoundry`, branch
  `worktree-metagame-bitfoundry`. This lane OWNS `docs/games/metagame/**` + `docs/assets/games.css`
  — edit only there. If cwd is wrong, stop and tell the user.
- Confirm clean tree (`git status`). If dirty from a prior crashed increment, `git checkout -- .`
  to reset to the last green commit before starting new work.

## State
- Stages 1, 2, 3 are REAL games (done, pushed). Stages 4–10 are mostly thin gates.
- Authoritative work orders per stage: `docs/games/metagame/stages/stageN/research/buildplan.md`
  (ordered green-increment backlog mapped to real files) + `research.md` (genre + the expansion
  arc). Audit background: memory `stages-4-10-audit.md`.

## Build order (work top-down within each; finish a stage before the next unless blocked)
1. **Stage 6 (Protocol Codex deckbuilder)** — priority. A1 (run mandatory, boss = act-4 finale,
   close the hub bypass) → A2 (boss fights your real deck via the engine) → A3/A4 (card upgrades,
   ~36–40 cards / 3 archetypes, real relics + economy + map composition). Engine is good — keep it.
2. **Integrity sweep** (cheap): fix `Date.now`/`Math.random` in the live path (Stages 4, 5, 9);
   make un-cheats load-bearing + delete bypass buttons (5, 6, 7, 10); render Stage 10's ending.
3. **Full builds**: Stage 4 (TD), Stage 8 (survival) → 9, 5, 7, 10 (finale). Stage 1/2/3 expansion
   plans are lowest priority.

## The increment loop (repeat until the build order is done or you're stopped)
1. Pick the TOP unchecked increment from the active stage's `buildplan.md`.
2. Implement just that one increment, following the guardrails. Keep changes scoped to it.
3. Verify GREEN: regenerate the bundle (`node scripts/gen-metagame-bundles.mjs`); run the stage's
   unit tests (e.g. `node docs/games/metagame/stages/stageN/tests/*.test.mjs`) + `node
   tests/smoke-area.mjs games`. (A real-browser check via Playwright is encouraged for interactive
   UI — see how Stage 3 was verified.)
4. If GREEN → `git add` the stage files + regenerated bundle and COMMIT (one commit per increment:
   `Stage N (...): <increment>`, ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`).
   Then tick the checkbox in `buildplan.md` (commit that too or with the increment).
5. If RED and you can't fix it quickly → `git checkout -- .` to restore green, append a short note to
   `docs/games/metagame/stages/stageN/research/BUILD_LOG.md` describing what failed, and move to the
   NEXT increment (or next stage). Never leave the tree broken or uncommitted.
6. Append a one-line progress entry to `stageN/research/BUILD_LOG.md` each cycle so morning-you can
   see what happened.

## Guardrails (non-negotiable)
- Boss un-cheat uses a REAL file-viewer feature, **load-bearing and NOT bypassable** (remove cheat
  shortcuts).
- Deterministic-from-seed: **never `Date.now`/`Math.random` in the live path**; reuse the stage's
  seeded `makeRng` (xmur3→mulberry32).
- ASCII/text + a little colour; guard per-tick DOM writes (no full re-render churn).
- Modular files (~300 soft / 500 hard LOC) — split before piling on.
- **Each sub-stage introduces a NEW mechanic** (expansion philosophy), never just bigger numbers.
- Regenerate the lazy bundle after any stage-source edit and commit it (the drift gate fails stale).
- Green gate before EVERY commit (stage unit tests + `tests/smoke-area.mjs games`).
- **Do NOT push.** Stay on the lane branch. (FYI: the `exports` smoke area fails on dev already —
  pre-existing, not metagame; ignore it.)

## Autonomy
Don't ask for confirmation between increments — just keep going. Only stop and write a clear note (and
move on to other work) if an increment needs a human design decision the build plan doesn't answer.
Prioritise leaving many small, safe, green commits over finishing a big risky one.

## First action
Read `docs/games/metagame/stages/stage6/research/buildplan.md` + `research.md`, confirm the first
(A1) increment, implement it, verify green, commit. Then continue the loop.
