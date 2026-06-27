// testhook.js — Stage 6 window.__fvStage6 TEST/DEBUG surface (NOT a player affordance, no hub
// button). It fast-forwards a run to the boss / superboss and drives the REAL engine so the smoke
// harness can verify the negotiation, the un-cheat, the keys, and the true-ending superboss in a few
// hops instead of dozens of fights. It NEVER bypasses the ch9 un-cheat or the real-deck fight — it
// only seats position and replays correct play through the normal engine.
//
// It closes over the renderer's live combat instance, so the renderer passes accessors rather than
// the value: getCombat/setCombat (the mutable engine) and setDailyKeyOverride (the daily-seed clock).

export function installStage6TestHook(api) {
  const {
    state, combatRun, runScore, seatAtFinalBoss, runAutoNegotiate,
    playCard, endTurn, cardById, beginRun, commit, makeCombat, finishCombat,
    getCombat, setCombat, setDailyKeyOverride
  } = api;

  window.__fvStage6 = {
    // Start a run in a given mode ("standard"|"daily"|"custom"); returns the derived seed + mode so a
    // test can assert that the same date/custom key reproduces the same run.
    beginRun(opts) {
      beginRun(opts || {});
      commit();
      return { seed: state.run?.seed, mode: state.run?.mode, dailyKey: state.run?.dailyKey };
    },
    // Pin the daily-seed clock so a daily run is reproducible in the harness.
    setDailyKey(key) { setDailyKeyOverride(key ? String(key) : null); },
    // The current run's self-competition score, plus the meta high-water marks.
    score() {
      return {
        run: state.run ? runScore(state.run) : 0,
        best: state.meta.bestScore || 0,
        last: state.meta.lastScore || 0,
        lastMode: state.meta.lastMode || null
      };
    },
    // Grant the true-ending keys on the current run (a real run earns them via the
    // untouchable/ascetic/sacrifice challenges). Returns the key count.
    grantKeys(n = 3) {
      if (!state.run) { beginRun(); commit(); }
      state.run.keys = ["untouchable", "ascetic", "sacrifice"].slice(0, Math.max(0, Math.min(3, n)));
      commit();
      return state.run.keys.length;
    },
    // Drive the key-gated superboss to its end with the REAL deck (play all affordable cards each
    // turn). Not a bypass — it uses the normal engine. Returns the outcome.
    autoSuperboss(maxTurns = 120) {
      const run = state.run;
      if (!run || run.status !== "superboss") return { ok: false, reason: "not-at-superboss" };
      let combat = getCombat();
      if (!combat || combat.nodeId !== run.currentNodeId) { combat = makeCombat(run); setCombat(combat); }
      let turns = 0;
      while (!combat.over && turns++ < maxTurns) {
        let guard = 0;
        while (guard++ < 30 && !combat.over) {
          const idx = combat.hand.findIndex((id) => { const c = cardById(id); return c && c.cost <= combat.player.energy; });
          if (idx < 0) break;
          playCard(combat, idx);
        }
        if (combat.over) break;
        endTurn(combat);
      }
      const result = combat.result ?? null;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, status: state.run?.status, trueEnding: Boolean(state.run?.trueEnding), keys: run.keys?.length || 0 };
    },
    // Seat a run directly at the act-6 boss so the harness reaches the negotiation in one hop.
    jumpToBoss(deck) {
      if (!state.run) beginRun();
      seatAtFinalBoss(state.run, deck);
      state.ui.screen = "run";
      if (combatRun) combatRun.reset(); // ensure a fresh boss fight, never a resumed snapshot
      setCombat(null);
      commit();
      return state.run.currentNodeId;
    },
    // Drive the in-run boss fight with a correct handshake strategy using the REAL engine +
    // acceptance. NOT a bypass — if ch9 is unread the boss is locked and this cannot win.
    autoNegotiate(maxTurns = 80) {
      const run = state.run;
      if (!run || run.status !== "boss") return { ok: false, reason: "not-at-boss" };
      let combat = getCombat();
      if (!combat || combat.nodeId !== run.currentNodeId) { combat = makeCombat(run); setCombat(combat); }
      runAutoNegotiate(combat, maxTurns);
      const enemyHp = combat.enemy?.hp;
      const result = combat.result;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, enemyHp, bossDefeated: Boolean(state.boss.defeated), won: state.run?.status === "won" };
    }
  };
}

export function removeStage6TestHook() {
  if (window.__fvStage6) delete window.__fvStage6;
}
