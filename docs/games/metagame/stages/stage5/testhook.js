// testhook.js — Stage 5 window.__fvStage5 TEST/DEBUG surface (NOT a player affordance, no hub
// button). It fast-forwards a run to the boss / superboss and drives the REAL engine so the smoke
// harness can verify the negotiation, the keys, and the true-ending superboss in a few hops instead
// of dozens of fights. It never bypasses the real-deck fight; it only seats position and replays
// correct play through the normal engine.
//
// It closes over the renderer's live combat instance, so the renderer passes accessors rather than
// the value: getCombat/setCombat (the mutable engine) and setDailyKeyOverride (the daily-seed clock).

// A REPRESENTATIVE end-game deck — the kind of developed ~16-card list a real player plausibly holds
// arriving at act 6 (thinned starters, upgraded cores, a strength engine, vulnerable, burst, block).
// This is NOT a bypass: the superboss is still reachable only through the real run + the 3 keys; this
// merely STANDS IN for the deck-building of acts 1–5 that the deterministic test path skips, so the
// bonus fight is tuned against real end-game power rather than the bare 10-card starter. The array
// ORDER is load-bearing (it seeds the shuffle) — keep it in sync with keys.test.mjs.
export const REPRESENTATIVE_ENDGAME_DECK = [
  "SYN+", "SYN+", "ACK", "ACK",
  "PRIORITY_PACKET", "PRIORITY_PACKET+",
  "TCP_STACK+", "ONION",
  "FLOOD", "HANDSHAKE", "FIREWALL",
  "REPLAY+", "PROBE+", "NULL_ROUTE",
  "BURST_FRAME", "DDOS+"
];
// HP a representative act-6 player enters the bonus fight with (PLAYER_MAX_HP is 60). Fixed so the
// observability margin is stable. And a pinned run seed so the bonus-fight shuffle is fully
// deterministic (the act-6 boss node id is always "a6-l6-n0", so this alone pins the combat seed) —
// letting the smoke + unit test assert an exact climactic margin. See superboss.js SUPERBOSS_PHASE_HP.
export const REPRESENTATIVE_ENDGAME_HP = 50;
export const ENDGAME_FIXTURE_SEED = 7;

export function installStage5TestHook(api) {
  const {
    state, combatRun, runScore, seatAtFinalBoss, runAutoNegotiate,
    playCard, endTurn, cardById, beginRun, commit, makeCombat, finishCombat,
    getCombat, setCombat, setDailyKeyOverride
  } = api;

  window.__fvStage5 = {
    // Start a run in a given mode ("standard"|"daily"|"custom"); returns the derived seed + mode so a
    // test can assert that the same date/custom key reproduces the same run.
    beginRun(opts) {
      beginRun(opts || {});
      commit();
      // finalAct exposes the first-run pacing: a fresh save (0 wins) run ends at act 4; a veteran at 6.
      return { seed: state.run?.seed, mode: state.run?.mode, dailyKey: state.run?.dailyKey, finalAct: state.run?.finalAct };
    },
    // TEST seam: mark this save a VETERAN (≥1 win) so the NEXT run restores the full six acts. The
    // superboss fixture (equipEndgameLoadout pins the act-6 boss node a6-l6-n0) is veteran content —
    // it can't be reached on a fresh save's 4-act run. Sets only the win counter; commits.
    markVeteran() {
      state.meta.runsCleared = Math.max(1, state.meta.runsCleared || 0);
      commit();
      return { runsCleared: state.meta.runsCleared };
    },
    // Pin the daily-seed clock so a daily run is reproducible in the harness.
    setDailyKey(key) { setDailyKeyOverride(key ? String(key) : null); },
    // TEST seam: directly bank handshakes (bypasses playing out the run economy) so the harness can
    // reach the prestige cost threshold deterministically, the same way markVeteran() seeds runsCleared.
    grantBanked(n) {
      state.meta.banked = Math.max(0, Number(n) || 0);
      commit();
      return { banked: state.meta.banked };
    },
    // Read-only meta snapshot for prestige/meta-progression assertions.
    meta() { return { ...state.meta }; },
    // Read-only run snapshot (deck, hp, status, etc.) for test assertions.
    run() { return state.run ? { ...state.run } : null; },
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
    // Equip the REPRESENTATIVE end-game loadout for the bonus fight (deck + HP + a pinned seed). This
    // stands in for the deck-building of acts 1–5 the test path skips:
    // the superboss is still reached only via the real run + 3 keys; this only fills the deck/HP a
    // real act-6 player would hold so the fight is tuned against real power, not the bare starter.
    // It also drops any superboss combat the renderer already built from the starter deck (and its
    // checkpoint) so autoSuperboss rebuilds the fight from this loadout. Call it AFTER the negotiation
    // diverts to the superboss and BEFORE autoSuperboss. Deterministic.
    equipEndgameLoadout() {
      const run = state.run;
      if (!run || run.status !== "superboss") return { ok: false, reason: "not-at-superboss" };
      run.deck = [...REPRESENTATIVE_ENDGAME_DECK];
      run.hp = Math.min(run.maxHp || REPRESENTATIVE_ENDGAME_HP, REPRESENTATIVE_ENDGAME_HP);
      run.seed = ENDGAME_FIXTURE_SEED; // pins the bonus-fight shuffle (boss node id is always a6-l6-n0)
      setCombat(null);                 // drop the starter-deck superboss combat the renderer may have built
      if (combatRun) combatRun.reset(); // and its stale checkpoint, so autoSuperboss rebuilds from this deck
      commit();
      return { ok: true, deckSize: run.deck.length, hp: run.hp };
    },
    // Drive the key-gated superboss to its end with the REAL deck (play all affordable cards each
    // turn). Not a bypass — it uses the normal engine. Returns the outcome.
    autoSuperboss(maxTurns = 120) {
      const run = state.run;
      if (!run || run.status !== "superboss") return { ok: false, reason: "not-at-superboss" };
      let combat = getCombat();
      if (!combat || combat.nodeId !== run.currentNodeId) { combat = makeCombat(run); setCombat(combat); }
      const startHp = combat.player.hp; // observability: HP entering the true-ending fight
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
      return { ok: true, result, status: state.run?.status, trueEnding: Boolean(state.run?.trueEnding), keys: run.keys?.length || 0, startHp, endHp: combat.player.hp, turns };
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
    // acceptance. It is not a bypass: the handshake demand remains load-bearing.
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

export function removeStage5TestHook() {
  if (window.__fvStage5) delete window.__fvStage5;
}
