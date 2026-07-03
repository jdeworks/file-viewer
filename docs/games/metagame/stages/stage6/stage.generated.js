// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage6/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage6/messages.js
var ACTION_NAME = "protocol_ch9_read";
var REQUIRED_ACTION = "6.protocol_ch9_read";
var ACHIEVEMENT_ID = "stage6.protocol_ch9_read";
var ACHIEVEMENT_TEXT = "I read the fine print.";
var BTS_PATH = "/docs/bts/protocol_codex.bts";
var EPUB_PATH = "/docs/examples/metagame/stage6/protocols_of_the_entity.epub";
var bellMessages = {
  start: "something answered. not clearly. but something.",
  unlock: "Chapter 9 made the refusal legible.",
  phase2: "ACK before signal. the rule holds.",
  phase3: "the unknown protocol still needs acknowledgement.",
  defeated: "the connection accepted a shared rule."
};
var lockedHintLadder = [
  "REFUSED. no protocol recognized.",
  "you are sending data I cannot parse. the protocol must be established first.",
  "Chapter 9 describes what The Refused Connection accepts.",
  "open protocols_of_the_entity.epub and read Chapter 9, then return."
];
var combatLines = {
  lockedDeath: "PROTOCOL MISMATCH remains permanent. every card resolves to zero.",
  mismatch: "protocol mismatch. no damage accepted.",
  synFirst: "SYN opened the turn. the first phase accepts damage.",
  ackSignal: "ACK acknowledged. Signal damage accepted.",
  ackOngoing: "ACK keeps the unknown protocol from bleeding through.",
  defeated: "The Refused Connection closes without refusal."
};

// ../../docs/games/metagame/stages/stage6/boss.js
function hasProtocolChapter9(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(6, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasProtocolChapter9(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    status: unlocked ? "PROTOCOL MATCH NEGOTIABLE" : "PROTOCOL MISMATCH",
    mismatchPermanent: !unlocked,
    defeatPossible: unlocked,
    phase: Number(state?.boss?.phase || 1),
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function recordLockedBossAttempt(state) {
  const boss = state.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  pushLog(state, combatLines.lockedDeath);
  return getBossLockState({ actions: null, state });
}
function applyProtocolChapter9Unlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  if (firstUnlock) {
    pushLog(state, bellMessages.unlock);
    notifyBell(bell, bellMessages.unlock, "stage6.protocol_ch9_read");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 6,
      text: ACHIEVEMENT_TEXT,
      action: "6.protocol_ch9_read"
    });
  }
  return firstUnlock;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 6, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 6 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 6 });
  else if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 6 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}

// ../../docs/games/metagame/stages/stage6/cards-signal.js
var SIGNAL_CARDS = [
  {
    id: "SYN",
    type: "Signal",
    cost: 1,
    rarity: "starter",
    text: "Deal 8. If ACK was played this turn, draw 2.",
    effect: (ctx) => {
      ctx.deal(8);
      if (ctx.playedThisTurn("ACK")) ctx.draw(2);
    }
  },
  {
    id: "RST",
    type: "Signal",
    cost: 2,
    rarity: "starter",
    text: "Deal 14. Interrupt the enemy's next action.",
    effect: (ctx) => {
      ctx.deal(14);
      ctx.skipEnemyNext();
    }
  },
  {
    id: "PUSH",
    type: "Signal",
    cost: 1,
    rarity: "common",
    text: "Deal 5 for each card played this turn.",
    effect: (ctx) => ctx.deal(5 * ctx.cardsPlayed)
  },
  {
    id: "FRAGMENT",
    type: "Signal",
    cost: 0,
    rarity: "uncommon",
    text: "Deal 3. Draw 1.",
    effect: (ctx) => {
      ctx.deal(3);
      ctx.draw(1);
    }
  },
  {
    id: "HANDSHAKE",
    type: "Signal",
    cost: 2,
    rarity: "uncommon",
    text: "Deal 8 and gain 10 block.",
    effect: (ctx) => {
      ctx.deal(8);
      ctx.block(10);
    }
  },
  {
    id: "FLOOD",
    type: "Signal",
    cost: 2,
    rarity: "uncommon",
    text: "Deal 4, four times.",
    effect: (ctx) => {
      for (let i = 0; i < 4; i++) ctx.deal(4);
    }
  },
  {
    id: "NULL_ROUTE",
    type: "Signal",
    cost: 2,
    rarity: "rare",
    text: "Apply 2 Vulnerable to the enemy.",
    effect: (ctx) => ctx.applyEnemy("vulnerable", 2)
  },
  {
    id: "PROBE",
    type: "Signal",
    cost: 1,
    rarity: "common",
    text: "Deal 6. Apply 1 Vulnerable.",
    effect: (ctx) => {
      ctx.deal(6);
      ctx.applyEnemy("vulnerable", 1);
    }
  },
  {
    id: "PRIORITY_PACKET",
    type: "Signal",
    cost: 2,
    rarity: "rare",
    text: "Deal 12.",
    effect: (ctx) => ctx.deal(12)
  },
  {
    id: "ASYMMETRIC",
    type: "Signal",
    cost: 1,
    rarity: "rare",
    text: "Deal 6. If your block exceeds your HP, deal 12 more.",
    effect: (ctx) => {
      ctx.deal(6);
      if (ctx.blockNow > ctx.hp) ctx.deal(12);
    }
  },
  {
    id: "BURST_FRAME",
    type: "Signal",
    cost: 3,
    rarity: "uncommon",
    exhaust: true,
    text: "Deal 30. Apply 1 Weak to yourself. Exhaust.",
    effect: (ctx) => {
      ctx.deal(30);
      ctx.applySelf("weak", 1);
    }
  },
  {
    id: "SCAN",
    type: "Signal",
    cost: 1,
    rarity: "common",
    text: "Deal 4. Apply 1 Weak to the enemy.",
    effect: (ctx) => {
      ctx.deal(4);
      ctx.applyEnemy("weak", 1);
    }
  },
  {
    id: "JITTER",
    type: "Signal",
    cost: 0,
    rarity: "uncommon",
    text: "Deal 4. If a card was replayed this turn, deal 4 more.",
    effect: (ctx) => {
      ctx.deal(4);
      if (ctx.chainCount > 0) ctx.deal(4);
    }
  },
  {
    id: "PIPELINE",
    type: "Signal",
    cost: 1,
    rarity: "uncommon",
    text: "Deal 4. If you've played 2+ cards this turn, deal 4 more.",
    effect: (ctx) => {
      ctx.deal(4);
      if (ctx.cardsPlayed >= 2) ctx.deal(4);
    }
  },
  {
    id: "SPOOF",
    type: "Signal",
    cost: 1,
    rarity: "rare",
    text: "Apply 1 Vulnerable to the enemy. Draw 1.",
    effect: (ctx) => {
      ctx.applyEnemy("vulnerable", 1);
      ctx.draw(1);
    }
  },
  {
    id: "DDOS",
    type: "Signal",
    cost: 3,
    rarity: "rare",
    exhaust: true,
    text: "Deal 6 for each card played this turn. Exhaust.",
    effect: (ctx) => ctx.deal(6 * ctx.cardsPlayed)
  },
  {
    id: "REPLAY",
    type: "Signal",
    cost: 2,
    rarity: "uncommon",
    text: "Deal 10. If ACK was played this turn, deal 5 more.",
    effect: (ctx) => {
      ctx.deal(10);
      if (ctx.playedThisTurn("ACK")) ctx.deal(5);
    }
  },
  // ── Act 1 LINK · SEQUENCE: opener (reward leading) + closer (reward following) ─────────────────────
  {
    id: "PREAMBLE",
    type: "Signal",
    cost: 1,
    rarity: "common",
    text: "Deal 6. If it's the first card you play this turn, deal 6 more.",
    effect: (ctx) => {
      ctx.deal(6);
      if (ctx.isFirstCard) ctx.deal(6);
    }
  },
  {
    id: "FINALIZE",
    type: "Signal",
    cost: 1,
    rarity: "uncommon",
    text: "Deal 8. If it's NOT the first card you play this turn, deal 8 more.",
    effect: (ctx) => {
      ctx.deal(8);
      if (!ctx.isFirstCard) ctx.deal(8);
    }
  },
  // ── Act 2 TRANSPORT · DELAY: deferred resolution (deterministic, resolves on a future turn) ─────────
  {
    id: "WINDOWED_SEND",
    type: "Signal",
    cost: 1,
    rarity: "uncommon",
    text: "Deal 4. Deal 8 at the start of your next turn.",
    effect: (ctx) => {
      ctx.deal(4);
      ctx.queue(1, { deal: 8 });
    }
  },
  {
    id: "RETRANSMIT",
    type: "Signal",
    cost: 2,
    rarity: "rare",
    text: "Deal 18 in 2 turns.",
    effect: (ctx) => ctx.queue(2, { deal: 18 })
  },
  // ── H · additional commons (pool depth — early decks need reliable filler) ──────────────────────────
  { id: "BIT_FLIP", type: "Signal", cost: 0, rarity: "common", text: "Deal 4.", effect: (ctx) => ctx.deal(4) },
  { id: "PING", type: "Signal", cost: 1, rarity: "common", text: "Deal 7.", effect: (ctx) => ctx.deal(7) },
  { id: "ICMP", type: "Signal", cost: 1, rarity: "common", text: "Deal 5. Gain 3 block.", effect: (ctx) => {
    ctx.deal(5);
    ctx.block(3);
  } },
  { id: "TEARDOWN", type: "Signal", cost: 2, rarity: "common", text: "Deal 11.", effect: (ctx) => ctx.deal(11) },
  { id: "DATAGRAM", type: "Signal", cost: 1, rarity: "common", text: "Deal 6.", effect: (ctx) => ctx.deal(6) },
  { id: "BROADCAST", type: "Signal", cost: 2, rarity: "common", text: "Deal 6. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.deal(6);
    ctx.applyEnemy("weak", 1);
  } }
];

// ../../docs/games/metagame/stages/stage6/cards-protocol.js
var PROTOCOL_CARDS = [
  {
    id: "ACK",
    type: "Protocol",
    cost: 1,
    rarity: "starter",
    text: "Gain 10 block.",
    effect: (ctx) => ctx.block(10)
  },
  {
    id: "WINDOW",
    type: "Protocol",
    cost: 1,
    rarity: "common",
    text: "Draw 2 cards.",
    effect: (ctx) => ctx.draw(2)
  },
  {
    id: "BUFFER",
    type: "Protocol",
    cost: 2,
    rarity: "uncommon",
    text: "Gain 4 block for each card in hand.",
    effect: (ctx) => ctx.block(4 * ctx.handSize)
  },
  {
    id: "SEGMENT",
    type: "Protocol",
    cost: 0,
    rarity: "common",
    text: "Gain 5 block.",
    effect: (ctx) => ctx.block(5)
  },
  {
    id: "KEEPALIVE",
    type: "Protocol",
    cost: 1,
    rarity: "uncommon",
    text: "Gain 5 block. If ACK was played this turn, gain 8 more.",
    effect: (ctx) => {
      ctx.block(5);
      if (ctx.playedThisTurn("ACK")) ctx.block(8);
    }
  },
  {
    id: "THROTTLE",
    type: "Protocol",
    cost: 2,
    rarity: "rare",
    text: "Apply 2 Weak to the enemy.",
    effect: (ctx) => ctx.applyEnemy("weak", 2)
  },
  {
    id: "RENEGOTIATE",
    type: "Protocol",
    cost: 1,
    rarity: "rare",
    text: "Remove your debuffs and gain 6 block.",
    effect: (ctx) => {
      ctx.clearSelfDebuffs();
      ctx.block(6);
    }
  },
  {
    id: "BACKLOG",
    type: "Protocol",
    cost: 1,
    rarity: "common",
    text: "Gain 8 block.",
    effect: (ctx) => ctx.block(8)
  },
  {
    id: "NAGLE",
    type: "Protocol",
    cost: 1,
    rarity: "uncommon",
    text: "Gain 4 block. Draw 1.",
    effect: (ctx) => {
      ctx.block(4);
      ctx.draw(1);
    }
  },
  {
    id: "FIREWALL",
    type: "Protocol",
    cost: 2,
    rarity: "rare",
    text: "Gain 12 block. Apply 1 Weak to the enemy.",
    effect: (ctx) => {
      ctx.block(12);
      ctx.applyEnemy("weak", 1);
    }
  },
  {
    id: "CONGESTION_CTL",
    type: "Protocol",
    cost: 1,
    rarity: "uncommon",
    text: "Gain 7 block.",
    effect: (ctx) => ctx.block(7)
  },
  {
    id: "SACK",
    type: "Protocol",
    cost: 2,
    rarity: "rare",
    text: "Gain 6 block. Draw 2.",
    effect: (ctx) => {
      ctx.block(6);
      ctx.draw(2);
    }
  },
  // Act 1 LINK · SEQUENCE: a strong opener that wants to lead the turn.
  {
    id: "ROOT_CERTIFICATE",
    type: "Protocol",
    cost: 1,
    rarity: "rare",
    text: "Gain 4 block. If it's the first card you play this turn, gain 1 energy and draw 1.",
    effect: (ctx) => {
      ctx.block(4);
      if (ctx.isFirstCard) {
        ctx.gainEnergy(1);
        ctx.draw(1);
      }
    }
  },
  // Act 2 TRANSPORT · DELAY: block that arrives across two turns.
  {
    id: "DELAYED_ACK",
    type: "Protocol",
    cost: 1,
    rarity: "uncommon",
    text: "Gain 5 block. Gain 7 block at the start of your next turn.",
    effect: (ctx) => {
      ctx.block(5);
      ctx.queue(1, { block: 7 });
    }
  },
  // Act 3 NETWORK · THROUGHPUT: spend big without the window shrinking next turn.
  {
    id: "BACKOFF",
    type: "Protocol",
    cost: 0,
    rarity: "uncommon",
    text: "Gain 8 block. Your congestion window does not shrink next turn.",
    effect: (ctx) => {
      ctx.block(8);
      ctx.noWindowShrink();
    }
  },
  {
    id: "DEFRAG",
    type: "Protocol",
    cost: 1,
    rarity: "uncommon",
    text: "Return all jammed cards (Packet Loss) to your hand. Draw 1.",
    effect: (ctx) => {
      ctx.defrag();
      ctx.draw(1);
    }
  },
  // ── H · additional commons (pool depth — reliable block filler) ─────────────────────────────────────
  { id: "ACKNOWLEDGE", type: "Protocol", cost: 1, rarity: "common", text: "Gain 9 block.", effect: (ctx) => ctx.block(9) },
  { id: "PADDING", type: "Protocol", cost: 0, rarity: "common", text: "Gain 4 block.", effect: (ctx) => ctx.block(4) },
  { id: "PARITY", type: "Protocol", cost: 1, rarity: "common", text: "Gain 5 block. Draw 1.", effect: (ctx) => {
    ctx.block(5);
    ctx.draw(1);
  } },
  { id: "HEARTBEAT", type: "Protocol", cost: 2, rarity: "common", text: "Gain 11 block.", effect: (ctx) => ctx.block(11) },
  { id: "SLOW_START", type: "Protocol", cost: 1, rarity: "common", text: "Gain 6 block. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.block(6);
    ctx.applyEnemy("weak", 1);
  } }
];

// ../../docs/games/metagame/stages/stage6/cards-layer.js
var LAYER_CARDS = [
  {
    id: "CIPHER_LAYER",
    type: "Layer",
    cost: 2,
    rarity: "uncommon",
    text: "Gain 1 Strength and 6 block.",
    effect: (ctx) => {
      ctx.applySelf("strength", 1);
      ctx.block(6);
    }
  },
  {
    id: "TCP_STACK",
    type: "Layer",
    cost: 2,
    rarity: "rare",
    text: "Gain 2 Strength.",
    effect: (ctx) => ctx.applySelf("strength", 2)
  },
  {
    id: "ENCRYPT",
    type: "Layer",
    cost: 1,
    rarity: "uncommon",
    text: "Gain 4 block and 1 Strength.",
    effect: (ctx) => {
      ctx.block(4);
      ctx.applySelf("strength", 1);
    }
  },
  {
    id: "HANDSHAKE_LAYER",
    type: "Layer",
    cost: 1,
    rarity: "rare",
    text: "Gain 1 Strength.",
    effect: (ctx) => ctx.applySelf("strength", 1)
  },
  {
    id: "DEEP_PACKET",
    type: "Layer",
    cost: 2,
    rarity: "rare",
    text: "Gain 2 Strength. Apply 1 Vulnerable to the enemy.",
    effect: (ctx) => {
      ctx.applySelf("strength", 2);
      ctx.applyEnemy("vulnerable", 1);
    }
  },
  {
    id: "SESSION_KEY",
    type: "Layer",
    cost: 2,
    rarity: "uncommon",
    text: "Gain 1 Strength. Draw 1.",
    effect: (ctx) => {
      ctx.applySelf("strength", 1);
      ctx.draw(1);
    }
  },
  {
    id: "ONION",
    type: "Layer",
    cost: 3,
    rarity: "rare",
    exhaust: true,
    text: "Gain 3 Strength. Exhaust.",
    effect: (ctx) => ctx.applySelf("strength", 3)
  },
  // Act 3 NETWORK · THROUGHPUT: permanently widen the congestion window (and gain energy now).
  {
    id: "BANDWIDTH",
    type: "Layer",
    cost: 1,
    rarity: "rare",
    text: "Widen your congestion window by 1 (gain 1 energy now).",
    effect: (ctx) => ctx.widenWindow(1)
  },
  // ── H · additional commons (pool depth — light power/defense filler) ─────────────────────────────────
  { id: "SHIM", type: "Layer", cost: 1, rarity: "common", text: "Gain 1 Strength.", effect: (ctx) => ctx.applySelf("strength", 1) },
  { id: "ROTATE", type: "Layer", cost: 1, rarity: "common", text: "Gain 4 block. Draw 1.", effect: (ctx) => {
    ctx.block(4);
    ctx.draw(1);
  } },
  { id: "XOR_PAD", type: "Layer", cost: 1, rarity: "common", text: "Gain 5 block.", effect: (ctx) => ctx.block(5) },
  { id: "NONCE", type: "Layer", cost: 0, rarity: "common", text: "Gain 3 block. Draw 1.", effect: (ctx) => {
    ctx.block(3);
    ctx.draw(1);
  } }
];

// ../../docs/games/metagame/stages/stage6/cards-daemon.js
var DAEMON_CARDS = [
  {
    id: "FORK_BOMB",
    type: "Daemon",
    cost: 1,
    rarity: "common",
    text: "Apply 4 Corruption.",
    effect: (ctx) => ctx.applyCorruption(4)
  },
  {
    id: "DAEMON_SPAWN",
    type: "Daemon",
    cost: 0,
    rarity: "common",
    text: "Apply 2 Corruption.",
    effect: (ctx) => ctx.applyCorruption(2)
  },
  {
    id: "ROT",
    type: "Daemon",
    cost: 1,
    rarity: "common",
    text: "Apply 2 Corruption. Apply 1 Weak to the enemy.",
    effect: (ctx) => {
      ctx.applyCorruption(2);
      ctx.applyEnemy("weak", 1);
    }
  },
  {
    id: "ZOMBIE_PROCESS",
    type: "Daemon",
    cost: 1,
    rarity: "common",
    text: "Apply 3 Corruption. If the enemy is already corrupted, apply 3 more.",
    effect: (ctx) => {
      const had = ctx.enemyCorruption > 0;
      ctx.applyCorruption(3);
      if (had) ctx.applyCorruption(3);
    }
  },
  {
    id: "MEMORY_LEAK",
    type: "Daemon",
    cost: 1,
    rarity: "uncommon",
    text: "Corruption you apply is increased by 1 for the rest of combat. Apply 2 Corruption.",
    effect: (ctx) => {
      ctx.boostCorruption(1);
      ctx.applyCorruption(2);
    }
  },
  {
    id: "ENTROPY_WAVE",
    type: "Daemon",
    cost: 2,
    rarity: "uncommon",
    text: "Apply 3 Corruption. Draw 1.",
    effect: (ctx) => {
      ctx.applyCorruption(3);
      ctx.draw(1);
    }
  },
  {
    id: "SEGFAULT_SPILL",
    type: "Daemon",
    cost: 1,
    rarity: "uncommon",
    text: "Deal 4. Apply 2 Corruption.",
    effect: (ctx) => {
      ctx.deal(4);
      ctx.applyCorruption(2);
    }
  },
  {
    id: "CORE_DUMP",
    type: "Daemon",
    cost: 1,
    rarity: "uncommon",
    text: "Deal damage equal to the enemy's Corruption, then halve it.",
    effect: (ctx) => {
      ctx.deal(ctx.enemyCorruption);
      ctx.halveCorruption();
    }
  },
  {
    id: "CASCADE_FAILURE",
    type: "Daemon",
    cost: 2,
    rarity: "rare",
    text: "Apply Corruption equal to the enemy's current Corruption (double it).",
    effect: (ctx) => ctx.applyCorruption(ctx.enemyCorruption)
  },
  {
    id: "GARBAGE_COLLECT",
    type: "Daemon",
    cost: 2,
    rarity: "rare",
    exhaust: true,
    text: "Consume all Corruption on the enemy and deal that much damage instantly. Exhaust.",
    effect: (ctx) => ctx.deal(ctx.consumeCorruption())
  },
  // ── H · additional commons (pool depth — cheap corruption filler) ───────────────────────────────────
  { id: "TAINT", type: "Daemon", cost: 1, rarity: "common", text: "Deal 2. Apply 2 Corruption.", effect: (ctx) => {
    ctx.deal(2);
    ctx.applyCorruption(2);
  } },
  { id: "NULL_DEREF", type: "Daemon", cost: 1, rarity: "common", text: "Deal 5. If the enemy is corrupted, deal 3 more.", effect: (ctx) => {
    ctx.deal(5);
    if (ctx.enemyCorruption > 0) ctx.deal(3);
  } },
  { id: "SPORE", type: "Daemon", cost: 0, rarity: "common", text: "Apply 1 Corruption. Draw 1.", effect: (ctx) => {
    ctx.applyCorruption(1);
    ctx.draw(1);
  } }
];

// ../../docs/games/metagame/stages/stage6/cards-recursion.js
var RECURSION_CARDS = [
  {
    id: "STACK_FRAME",
    type: "Recursion",
    cost: 1,
    rarity: "common",
    text: "Deal 6. If the previous card was a Recursion card, deal 6 more.",
    effect: (ctx) => {
      ctx.deal(6);
      if (ctx.lastPlayedType === "Recursion") ctx.deal(6);
    }
  },
  {
    id: "LOOPBACK",
    type: "Recursion",
    cost: 0,
    rarity: "common",
    text: "Deal 3. If the previous card was a Recursion card, draw 1.",
    effect: (ctx) => {
      ctx.deal(3);
      if (ctx.lastPlayedType === "Recursion") ctx.draw(1);
    }
  },
  {
    id: "ITERATE",
    type: "Recursion",
    cost: 1,
    rarity: "common",
    text: "Deal 4. Deal 4 more for each card replayed this turn.",
    effect: (ctx) => ctx.deal(4 + 4 * ctx.chainCount)
  },
  {
    id: "YIELD",
    type: "Recursion",
    cost: 1,
    rarity: "common",
    text: "Gain 6 block. If the previous card was a Recursion card, gain 4 more block.",
    effect: (ctx) => {
      ctx.block(6);
      if (ctx.lastPlayedType === "Recursion") ctx.block(4);
    }
  },
  {
    id: "TAIL_CALL",
    type: "Recursion",
    cost: 1,
    rarity: "uncommon",
    text: "Replay the last card you played at half value.",
    effect: (ctx) => ctx.replayLast(0.5)
  },
  {
    id: "TRAMPOLINE",
    type: "Recursion",
    cost: 2,
    rarity: "uncommon",
    text: "Deal 8. Replay the last card you played at half value.",
    effect: (ctx) => {
      ctx.deal(8);
      ctx.replayLast(0.5);
    }
  },
  {
    id: "CALLBACK",
    type: "Recursion",
    cost: 1,
    rarity: "uncommon",
    text: "Deal 5. Replay the last card you played at the start of your next turn.",
    effect: (ctx) => {
      ctx.deal(5);
      ctx.echoNextTurn();
    }
  },
  {
    id: "FIXED_POINT",
    type: "Recursion",
    cost: 2,
    rarity: "rare",
    text: "Replay the last card you played twice.",
    effect: (ctx) => ctx.replayLast(1, 2)
  },
  {
    id: "RECURSE",
    type: "Recursion",
    cost: 0,
    rarity: "rare",
    exhaust: true,
    xcost: true,
    text: "X-cost: spend all energy, then replay the last card you played that many times. Exhaust.",
    effect: (ctx) => ctx.replayLast(1, ctx.xValue)
  },
  // ── H · additional commons (pool depth — cheap chain filler) ────────────────────────────────────────
  { id: "TRACE", type: "Recursion", cost: 1, rarity: "common", text: "Deal 5. If the previous card was a Recursion card, gain 3 block.", effect: (ctx) => {
    ctx.deal(5);
    if (ctx.lastPlayedType === "Recursion") ctx.block(3);
  } },
  { id: "BASE_CASE", type: "Recursion", cost: 1, rarity: "common", text: "Deal 7.", effect: (ctx) => ctx.deal(7) }
];

// ../../docs/games/metagame/stages/stage6/combat-rng.js
function makeRng(seed) {
  let a = Number(seed) >>> 0 || 1;
  return function rng() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeTrackedRng(seed, steps = 0) {
  const base = makeRng(seed);
  for (let i = 0; i < steps; i++) base();
  let count = steps;
  const rng = () => {
    count += 1;
    return base();
  };
  rng.steps = () => count;
  return rng;
}
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function hashSeed(seed, key) {
  let h = (Number(seed) || 1) >>> 0;
  for (const ch of String(key)) h = Math.imul(h, 31) + ch.charCodeAt(0) >>> 0;
  return h || 1;
}
function strHash(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

// ../../docs/games/metagame/stages/stage6/cards.js
var CARDS = [...SIGNAL_CARDS, ...PROTOCOL_CARDS, ...LAYER_CARDS, ...DAEMON_CARDS, ...RECURSION_CARDS];
var BY_ID = new Map(CARDS.map((card) => [card.id, card]));
var NAME_ACRONYMS = /* @__PURE__ */ new Set(["SYN", "ACK", "RST", "TCP", "DDOS", "ICMP", "SACK", "XOR", "RTT", "GC", "TTL", "IP"]);
var NAME_OVERRIDES = {
  SYN: "SYN Pulse",
  ACK: "ACK Guard",
  RST: "Reset Kill",
  DDOS: "DDoS Storm",
  ICMP: "ICMP Echo",
  SACK: "Selective ACK",
  TCP_STACK: "TCP Stack",
  XOR_PAD: "XOR Pad",
  NAGLE: "Nagle Hold",
  ONION: "Onion Wrap",
  DEFRAG: "Defrag"
};
function displayName(id) {
  if (NAME_OVERRIDES[id]) return NAME_OVERRIDES[id];
  return String(id).split("_").map((w) => NAME_ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}
for (const card of CARDS) card.name = displayName(card.id);
function cardById(id) {
  return BY_ID.get(id) || null;
}
function registerCard(card) {
  if (card && card.id) BY_ID.set(card.id, card);
}
var REWARD_POOL = CARDS.filter((card) => card.rarity !== "starter").map((card) => card.id);
var STARTING_DECK = ["SYN", "SYN", "SYN", "SYN", "SYN", "ACK", "ACK", "ACK", "ACK", "RST"];
var RARITY_WEIGHT_BY_ACT = {
  1: { common: 70, uncommon: 25, rare: 5 },
  2: { common: 50, uncommon: 35, rare: 15 },
  3: { common: 35, uncommon: 40, rare: 25 },
  4: { common: 20, uncommon: 40, rare: 40 },
  5: { common: 12, uncommon: 38, rare: 50 },
  6: { common: 8, uncommon: 32, rare: 60 }
};
function draftRewardCards(seed, act, count = 3) {
  const rng = makeRng(seed);
  const weights = RARITY_WEIGHT_BY_ACT[Math.min(6, Math.max(1, Number(act) || 1))];
  const tierCount = {};
  for (const id of REWARD_POOL) {
    const r = cardById(id)?.rarity || "common";
    tierCount[r] = (tierCount[r] || 0) + 1;
  }
  const pool = REWARD_POOL.map((id) => {
    const r = cardById(id)?.rarity || "common";
    return { id, w: (weights[r] ?? weights.common) / (tierCount[r] || 1) };
  });
  const picks = [];
  while (picks.length < count && pool.length) {
    const total = pool.reduce((sum, c) => sum + c.w, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r < 0) {
        idx = i;
        break;
      }
    }
    picks.push(pool.splice(idx, 1)[0].id);
  }
  return picks;
}

// ../../docs/games/metagame/stages/stage6/combat-damage.js
function dealToEnemy(combat, baseAmount) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.player.statuses.strength) amount += combat.player.statuses.strength;
  if (combat.player.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.enemy.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  amount = Math.max(0, amount - combat.enemy.armor);
  const absorbed = Math.min(combat.enemy.block, amount);
  combat.enemy.block -= absorbed;
  const landed = amount - absorbed;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - landed);
  if (landed > 0) combat.enemy.unhurt = false;
}
function dealToPlayer(combat, baseAmount, { pierce = false } = {}) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.enemy.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.player.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  if (pierce) {
    combat.player.hp = Math.max(0, combat.player.hp - amount);
    return;
  }
  const absorbed = Math.min(combat.player.block, amount);
  combat.player.block -= absorbed;
  combat.player.hp = Math.max(0, combat.player.hp - (amount - absorbed));
}
function addStatus(entity, status, value) {
  entity.statuses[status] = (entity.statuses[status] || 0) + value;
  if (entity.statuses[status] <= 0) delete entity.statuses[status];
}
function tickCorruption(combat) {
  const enemy = combat.enemy;
  const stacks = enemy.statuses.corruption || 0;
  if (stacks <= 0) return;
  const ticks = combat.corruptionDouble ? 2 : 1;
  enemy.hp = Math.max(0, enemy.hp - stacks * ticks);
  enemy.statuses.corruption = stacks - 1;
  if (enemy.statuses.corruption <= 0) delete enemy.statuses.corruption;
}
var DURATION_STATUSES = /* @__PURE__ */ new Set(["vulnerable", "weak"]);
function tickStatuses(entity) {
  for (const key of Object.keys(entity.statuses)) {
    if (!DURATION_STATUSES.has(key)) continue;
    entity.statuses[key] -= 1;
    if (entity.statuses[key] <= 0) delete entity.statuses[key];
  }
}
function log(combat, line) {
  combat.log = [...combat.log, line].slice(-10);
}

// ../../docs/games/metagame/stages/stage6/combat-ctx.js
var MAX_ECHO_DEPTH = 4;
function baseId(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}
function makeCtx(combat, card) {
  return {
    combat,
    card,
    // Boss negotiation (optional): the acceptance hook gates ALL damage to the boss (any archetype).
    // While ch9 is unread it deals 0 ("PROTOCOL MISMATCH" — the airtight un-cheat); while unlocked it
    // lands only when this turn's handshake demand is met. Non-damage effects always resolve.
    deal: (n) => {
      if (combat.acceptance && !combat.acceptance(combat, card)) {
        log(combat, "PROTOCOL MISMATCH — refused.");
        return;
      }
      dealToEnemy(combat, n * (combat.echoScale ?? 1));
    },
    block: (n) => {
      combat.player.block += Math.max(0, Math.round(n * (combat.echoScale ?? 1)));
    },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => {
      combat.player.energy += n;
    },
    // Restore HP (capped at max). Used by potions (Hotfix) and onKill heal relics. No RNG.
    heal: (n) => {
      combat.player.hp = Math.min(combat.player.maxHp, combat.player.hp + Math.max(0, Math.round(n)));
    },
    // Return the last card played this fight from the discard back to hand (Rollback potion).
    returnLastPlayed: () => {
      const id = combat.lastCardPlayed;
      if (id == null) return false;
      const i = combat.discard.lastIndexOf(id);
      if (i < 0) return false;
      combat.discard.splice(i, 1);
      combat.hand.push(id);
      return true;
    },
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n),
    applySelf: (status, n) => addStatus(combat.player, status, n),
    // CORRUPTION (Act 5 · DoT): apply `n` corruption to the enemy (+ this combat's corruption bonus,
    // e.g. from Memory Leak). It ticks for damage at the enemy's turn start, then decays (see
    // combat-damage.tickCorruption). consumeCorruption removes & returns the stacks (Garbage Collect),
    // halveCorruption keeps half (Core Dump), boostCorruption raises this combat's apply bonus by 1.
    applyCorruption: (n) => {
      if (combat.enemy.immuneCorruption) return;
      addStatus(combat.enemy, "corruption", Math.max(0, Math.round(n)) + (combat.corruptionBonus || 0));
    },
    consumeCorruption: () => {
      const c = combat.enemy.statuses.corruption || 0;
      delete combat.enemy.statuses.corruption;
      return c;
    },
    halveCorruption: () => {
      const c = combat.enemy.statuses.corruption || 0;
      const half = Math.floor(c / 2);
      if (half > 0) combat.enemy.statuses.corruption = half;
      else delete combat.enemy.statuses.corruption;
    },
    boostCorruption: (n = 1) => {
      combat.corruptionBonus = (combat.corruptionBonus || 0) + n;
    },
    get enemyCorruption() {
      return combat.enemy.statuses.corruption || 0;
    },
    // DELAY: schedule a DECLARATIVE effect `op` (e.g. { deal: 8 } / { block: 9 }) to resolve at the
    // start of a future player turn. The op is a plain object (not a closure) so the pending queue is
    // serializable — a reload resumes the same delayed packets. combat-modes.applyOp interprets it.
    // A relic (Fast Retransmit) can land the FIRST queued effect one turn sooner.
    queue: (turnsAhead, op) => {
      let ahead = Math.max(1, Math.floor(turnsAhead) || 1);
      if (combat.delaySpeedup && !combat.delayUsed) {
        ahead = Math.max(1, ahead - 1);
        combat.delayUsed = true;
      }
      combat.pending.push({ turn: combat.turn + ahead, op });
    },
    // THROUGHPUT: widen the congestion window by n (and gain n energy now).
    widenWindow: (n) => {
      combat.window = (combat.window || combat.player.maxEnergy) + n;
      combat.player.maxEnergy += n;
      combat.player.energy += n;
    },
    noWindowShrink: () => {
      combat.noShrinkNextTurn = true;
    },
    // THROUGHPUT: return all Packet-Loss jammed cards to hand (Defrag).
    defrag: () => {
      combat.hand.push(...combat.jammed);
      combat.jammed = [];
    },
    clearSelfDebuffs: () => {
      let cleared = 0;
      for (const key of Object.keys(combat.player.statuses)) {
        if (DURATION_STATUSES.has(key)) {
          cleared += combat.player.statuses[key];
          delete combat.player.statuses[key];
        }
      }
      return cleared;
    },
    skipEnemyNext: () => {
      combat.enemy.skipNext = true;
    },
    // CHAIN (Act 6 · APPLICATION LAYER, verb COPY/ECHO): re-run the LAST card played this fight `times`
    // times, optionally at `scale` value (deal/block multiply by it — TAIL_CALL uses 0.5). Returns the
    // number of replays performed. Depth-capped (MAX_ECHO_DEPTH) so a self-referential echo terminates.
    // Note: during playCard, lastCardPlayed is still the PREVIOUS card while the current card resolves,
    // so a replay card echoes the card before it (never itself).
    replayLast: (scale = 1, times = 1) => {
      const id = combat.lastCardPlayed;
      if (id == null) return 0;
      const repl = cardById(id);
      if (!repl || (combat.echoDepth || 0) >= MAX_ECHO_DEPTH) return 0;
      const n = Math.max(1, Math.floor(times) || 1);
      let count = 0;
      for (let i = 0; i < n && !combat.over; i++) {
        const prevScale = combat.echoScale;
        combat.echoDepth = (combat.echoDepth || 0) + 1;
        combat.echoScale = scale;
        repl.effect(makeCtx(combat, repl));
        combat.echoScale = prevScale;
        combat.echoDepth -= 1;
        combat.chainThisTurn = (combat.chainThisTurn || 0) + 1;
        count++;
      }
      return count;
    },
    // CHAIN: schedule a replay of the last card played to land at a future player turn (CALLBACK —
    // fuses with the DELAY verb). Captures the id now; resolves via combat-modes.applyOp's {replay}.
    echoNextTurn: (turnsAhead = 1) => {
      const id = combat.lastCardPlayed;
      if (id == null) return false;
      combat.pending.push({ turn: combat.turn + Math.max(1, Math.floor(turnsAhead) || 1), op: { replay: id } });
      return true;
    },
    get chainCount() {
      return combat.chainThisTurn || 0;
    },
    get xValue() {
      return combat.xValue || 0;
    },
    // CHAIN: energy spent by the current X-cost card (RECURSE)
    get lastPlayedId() {
      return combat.lastCardPlayed ?? null;
    },
    get lastPlayedType() {
      const id = combat.lastCardPlayed;
      const c = id != null ? cardById(id) : null;
      return c ? c.type : null;
    },
    // Base-id aware: an upgraded "ACK+" still counts as having played "ACK" this turn.
    playedThisTurn: (id) => combat.playedIdsThisTurn.some((pid) => baseId(pid) === baseId(id)),
    // SEQUENCE: true while resolving the FIRST card played this turn (the counter is bumped before
    // the effect runs, so the first card sees cardsPlayedThisTurn === 1).
    get isFirstCard() {
      return combat.cardsPlayedThisTurn === 1;
    },
    get cardsPlayed() {
      return combat.cardsPlayedThisTurn;
    },
    get energySpent() {
      return combat.energySpentThisTurn;
    },
    get handSize() {
      return combat.hand.length;
    },
    get blockNow() {
      return combat.player.block;
    },
    get hp() {
      return combat.player.hp;
    },
    get discardPile() {
      return combat.discard;
    }
  };
}
function relicCtx(combat, card) {
  return {
    combat,
    card,
    // Relic damage is gated by the same boss acceptance hook (e.g. Checksum Offload can't chip a
    // ch9-locked boss — closes a latent un-cheat hole).
    deal: (n) => {
      if (combat.acceptance && !combat.acceptance(combat, card)) return;
      dealToEnemy(combat, n);
    },
    block: (n) => {
      combat.player.block += Math.max(0, Math.round(n));
    },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => {
      combat.player.energy += n;
    },
    heal: (n) => {
      combat.player.hp = Math.min(combat.player.maxHp, combat.player.hp + Math.max(0, Math.round(n)));
    },
    applySelf: (status, n) => addStatus(combat.player, status, n),
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n)
  };
}
function runHook(combat, name, card = null) {
  for (const relic of combat.relics) {
    const fn = relic.hooks?.[name];
    if (typeof fn === "function") fn(relicCtx(combat, card));
  }
}

// ../../docs/games/metagame/stages/stage6/combat-piles.js
function drawCards(combat, n) {
  for (let i = 0; i < n; i++) {
    if (combat.draw.length === 0) {
      if (combat.discard.length === 0) return;
      combat.draw = shuffle(combat.discard, combat.rng);
      combat.discard = [];
      runHook(combat, "onShuffle");
    }
    combat.hand.push(combat.draw.shift());
  }
}
function jamOne(combat) {
  if (combat.hand.length) combat.jammed.push(combat.hand.shift());
}
function releaseJam(combat) {
  if (combat.jammed.length) {
    combat.discard.push(...combat.jammed);
    combat.jammed = [];
  }
}

// ../../docs/games/metagame/stages/stage6/combat-enemy.js
function currentIntent(combat) {
  const script = combat.enemy.script;
  return script[combat.enemy.intentIndex % script.length];
}
function enemyTurn(combat) {
  const enemy = combat.enemy;
  enemy.block = 0;
  tickCorruption(combat);
  checkEnemyDead(combat);
  if (combat.over) return;
  const intent = currentIntent(combat);
  const hpBefore = combat.player.hp;
  if (enemy.skipNext) {
    enemy.skipNext = false;
    enemy.rttStacks = 0;
    log(combat, `${enemy.name} action interrupted.`);
  } else {
    resolveIntent(combat, intent);
    enemy.rttStacks = (enemy.rttStacks || 0) + 1;
  }
  const lost = hpBefore - combat.player.hp;
  if (lost > 0) {
    combat.lastDamageTaken = lost;
    runHook(combat, "onDamageTaken");
  }
  enemy.intentIndex += 1;
  tickStatuses(enemy);
  enemy.unhurt = true;
  checkPlayerDead(combat);
}
function resolveIntent(combat, intent) {
  const enemy = combat.enemy;
  if (intent.block) enemy.block += intent.block;
  if (intent.attack) {
    const hits = (intent.hits || 1) + (intent.rampHits ? enemy.rttStacks || 0 : 0);
    const dmg = intent.attack + (intent.ramp ? intent.ramp * (enemy.rttStacks || 0) : 0);
    for (let i = 0; i < hits; i++) dealToPlayer(combat, dmg, { pierce: Boolean(intent.pierce) });
  }
  if (intent.cleanse) {
    delete enemy.statuses.corruption;
    delete enemy.statuses.weak;
    delete enemy.statuses.vulnerable;
    log(combat, `${enemy.name} cleansed itself.`);
  }
  if (intent.fortify && enemy.unhurt) enemy.armor += intent.fortify;
  if (intent.congest) dealToPlayer(combat, intent.congest * (combat.energySpentThisTurn || 0));
  if (intent.mirror) dealToPlayer(combat, intent.mirror * combat.cardsPlayedThisTurn);
  if (intent.applySelf) addStatus(enemy, intent.applySelf.status, intent.applySelf.value);
  if (intent.applyPlayer) addStatus(combat.player, intent.applyPlayer.status, intent.applyPlayer.value);
}

// ../../docs/games/metagame/stages/stage6/combat-modes.js
var WINDOW_CAP = 5;
var WINDOW_FLOOR = 2;
var CONGESTION_ACT = 3;
function congestionForAct(act) {
  return Number(act) >= CONGESTION_ACT;
}
function applyTurnEnergy(combat) {
  if (!combat.congestion) {
    combat.player.energy = combat.player.maxEnergy;
    return;
  }
  combat.jamPending = combat.cardsPlayedThisTurn >= 4;
  const wide = combat.energySpentThisTurn >= combat.window;
  if (combat.noShrinkNextTurn) {
    combat.noShrinkNextTurn = false;
  } else if (wide) {
    combat.window = Math.max(WINDOW_FLOOR, combat.window - (combat.windowDecay || 1));
  } else {
    combat.window = Math.min(combat.windowCap || WINDOW_CAP, combat.window + 1);
  }
  combat.player.maxEnergy = combat.window;
  combat.player.energy = combat.window;
}
function applyOp(ctx, op) {
  if (!op || typeof op !== "object") return;
  if (op.deal != null) ctx.deal(op.deal);
  if (op.block != null) ctx.block(op.block);
  if (op.draw != null) ctx.draw(op.draw);
  if (op.gainEnergy != null) ctx.gainEnergy(op.gainEnergy);
  if (op.applyEnemy) ctx.applyEnemy(op.applyEnemy.status, op.applyEnemy.value);
  if (op.applySelf) ctx.applySelf(op.applySelf.status, op.applySelf.value);
  if (op.replay) {
    const combat = ctx.combat;
    const card = cardById(op.replay);
    if (card && (combat.echoDepth || 0) < MAX_ECHO_DEPTH) {
      combat.echoDepth = (combat.echoDepth || 0) + 1;
      card.effect(makeCtx(combat, card));
      combat.echoDepth -= 1;
      combat.chainThisTurn = (combat.chainThisTurn || 0) + 1;
    }
  }
}
function resolvePending(combat) {
  if (!combat.pending || !combat.pending.length) return;
  const due = combat.pending.filter((p) => p.turn <= combat.turn);
  combat.pending = combat.pending.filter((p) => p.turn > combat.turn);
  for (const p of due) {
    if (combat.over) break;
    applyOp(makeCtx(combat, null), p.op);
    checkEnemyDead(combat);
  }
}

// ../../docs/games/metagame/stages/stage6/combat.js
var HAND_SIZE = 5;
var START_ENERGY = 3;
function createCombat({ deck, player, enemy, seed = 1, relics = [], congestion = false, windowCap = WINDOW_CAP }) {
  const rng = makeTrackedRng(seed);
  const combat = {
    rng,
    rngSeed: seed,
    // persisted in the snapshot so a reload resumes the same shuffle sequence
    relics,
    congestion,
    // THROUGHPUT: when true, energy is a dynamic congestion window
    window: START_ENERGY,
    // current window size (== maxEnergy while in congestion mode)
    windowCap: Math.max(START_ENERGY, windowCap),
    windowDecay: 1,
    // how much a wide turn shrinks the window (relics can worsen this)
    player: {
      hp: player.hp,
      maxHp: player.maxHp,
      block: 0,
      energy: START_ENERGY,
      maxEnergy: START_ENERGY,
      statuses: {}
    },
    enemy: {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.hp,
      block: 0,
      armor: Number(enemy.armor || 0),
      statuses: {},
      script: enemy.script,
      intentIndex: 0,
      skipNext: false,
      immuneCorruption: Boolean(enemy.immuneCorruption),
      // CORRUPTION-immune (the boss)
      unhurt: true
      // true while the player hasn't damaged it since its last turn (Stack Overflow fortify)
    },
    draw: shuffle(deck, rng),
    hand: [],
    discard: [],
    exhaust: [],
    pending: [],
    // DELAY (Act 2): effects queued to resolve at a future player turn (no RNG)
    jammed: [],
    // THROUGHPUT (Act 3): cards set aside (Packet Loss) — unplayable until released/Defrag'd
    turn: 1,
    cardsPlayedThisTurn: 0,
    firstCardDiscount: 0,
    // SEQUENCE (Act 1): the first card each turn costs this much less (relic-set)
    energySpentThisTurn: 0,
    chainThisTurn: 0,
    // CHAIN (Act 6): number of card-replays/echoes this turn (resets each turn)
    playedIdsThisTurn: [],
    lastCardPlayed: null,
    over: false,
    result: null,
    log: []
  };
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onCombatStart");
  runHook(combat, "onPlayerTurnStart");
  return combat;
}
function playCard(combat, handIndex) {
  if (combat.over) return { ok: false, reason: "over" };
  const cardId = combat.hand[handIndex];
  if (cardId == null) return { ok: false, reason: "no-card" };
  const card = cardById(cardId);
  if (!card) return { ok: false, reason: "unknown-card" };
  const isFirst = combat.cardsPlayedThisTurn === 0;
  let cost;
  if (card.xcost) {
    cost = combat.player.energy;
    combat.xValue = cost;
  } else cost = Math.max(0, card.cost - (isFirst ? combat.firstCardDiscount || 0 : 0));
  if (cost > combat.player.energy) return { ok: false, reason: "no-energy" };
  combat.player.energy -= cost;
  combat.energySpentThisTurn += cost;
  combat.cardsPlayedThisTurn += 1;
  combat.hand.splice(handIndex, 1);
  combat.playedIdsThisTurn.push(card.id);
  card.effect(makeCtx(combat, card));
  combat.lastCardPlayed = card.id;
  if (card.exhaust) {
    combat.exhaust.push(card.id);
    runHook(combat, "onExhaust", card);
  } else combat.discard.push(card.id);
  runHook(combat, "onCardPlay", card);
  checkEnemyDead(combat);
  return { ok: true, card: card.id };
}
function endTurn(combat) {
  if (combat.over) return combat;
  if (typeof combat.onPlayerTurnEnd === "function") combat.onPlayerTurnEnd(combat);
  if (combat.over) return combat;
  runHook(combat, "onTurnEnd");
  if (combat.over) return combat;
  combat.discard.push(...combat.hand);
  combat.hand = [];
  enemyTurn(combat);
  if (combat.over) return combat;
  combat.turn += 1;
  combat.player.block = 0;
  applyTurnEnergy(combat);
  combat.cardsPlayedThisTurn = 0;
  combat.energySpentThisTurn = 0;
  combat.chainThisTurn = 0;
  combat.playedIdsThisTurn = [];
  tickStatuses(combat.player);
  releaseJam(combat);
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onPlayerTurnStart");
  resolvePending(combat);
  if (combat.jamPending) {
    jamOne(combat);
    combat.jamPending = false;
  }
  return combat;
}
function applyPotionEffect(combat, potion) {
  if (combat.over || !potion || typeof potion.effect !== "function") return false;
  potion.effect(makeCtx(combat, null));
  checkEnemyDead(combat);
  return true;
}
function checkEnemyDead(combat) {
  if (combat.enemy.hp <= 0 && !combat.over) {
    runHook(combat, "onKill");
    if (typeof combat.advancePhase === "function" && combat.advancePhase(combat)) return;
    combat.over = true;
    combat.result = "win";
  }
}
function checkPlayerDead(combat) {
  if (combat.player.hp <= 0 && !combat.over) {
    combat.over = true;
    combat.result = "lose";
  }
}

// ../../docs/games/metagame/stages/stage6/enemies.js
var ENEMIES = {
  // ── Standard trash ──────────────────────────────────────────────────────────────────────────────
  "corrupt-packet": {
    id: "corrupt-packet",
    name: "Corrupt Packet",
    tier: "standard",
    hp: 46,
    hpPerAct: 22,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Attack 10", attack: 10 },
      { label: "Attack 15", attack: 15 },
      { label: "Attack 22", attack: 22 }
    ]
  },
  "firewall-entity": {
    id: "firewall-entity",
    name: "Firewall Entity",
    tier: "standard",
    hp: 38,
    hpPerAct: 16,
    armor: 4,
    armorPerAct: 4,
    script: [
      { label: "Block 14", block: 14 },
      { label: "Attack 16", attack: 16 },
      { label: "Block 10 + Attack 12", block: 10, attack: 12 }
    ]
  },
  "null-pointer": {
    id: "null-pointer",
    name: "Null Pointer",
    tier: "standard",
    hp: 32,
    hpPerAct: 18,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Attack 9 + Weak", attack: 9, applyPlayer: { status: "weak", value: 1 } },
      { label: "Attack 9, twice", attack: 9, hits: 2 },
      { label: "Attack 20", attack: 20 }
    ]
  },
  // Appears act 2+: an escalating spike that punishes slow kills.
  "race-condition": {
    id: "race-condition",
    name: "Race Condition",
    tier: "standard",
    hp: 50,
    hpPerAct: 20,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Attack 8, twice", attack: 8, hits: 2 },
      { label: "Attack 11 + Vulnerable", attack: 11, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Data race — Attack 26", attack: 26 }
    ]
  },
  // Appears act 2+: a Round-Trip Timer whose retransmit storm GROWS each uninterrupted round —
  // interrupt it (skipEnemyNext, e.g. RST) to reset the ramp. Telegraphed two steps ahead in the UI.
  "round-trip-timer": {
    id: "round-trip-timer",
    name: "Round-Trip Timer",
    tier: "standard",
    hp: 52,
    hpPerAct: 18,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Measuring RTT — block 8", block: 8 },
      { label: "Probe — Attack 6", attack: 6 },
      { label: "Retransmit storm — Attack 8 (+6 each uninterrupted round)", attack: 8, ramp: 6 }
    ]
  },
  // Appears act 3+: armored bruiser, long fights, sustained pressure.
  "packet-storm": {
    id: "packet-storm",
    name: "Packet Storm",
    tier: "standard",
    hp: 64,
    hpPerAct: 22,
    armor: 2,
    armorPerAct: 2,
    script: [
      { label: "Attack 14", attack: 14 },
      { label: "Block 12 + Attack 10", block: 12, attack: 10 },
      { label: "Flood — Attack 7, three times", attack: 7, hits: 3 }
    ]
  },
  // Appears act 3: punishes WIDE turns — its Collapse deals damage scaling with the energy you spent.
  "congestion-collapse": {
    id: "congestion-collapse",
    name: "Congestion Collapse",
    tier: "standard",
    hp: 58,
    hpPerAct: 16,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Buffer — Block 10", block: 10 },
      { label: "Collapse — 3 × energy you spent", congest: 3 },
      { label: "Attack 12", attack: 12 }
    ]
  },
  // Appears act 5+ (CORRUPTION): cleanses its OWN debuffs (incl. corruption) every 3rd turn —
  // punishes a slow DoT plan, so you must burst the stack (Core Dump / Garbage Collect) before it wipes.
  "heisenbug": {
    id: "heisenbug",
    name: "Heisenbug",
    tier: "standard",
    hp: 56,
    hpPerAct: 18,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Attack 12", attack: 12 },
      { label: "Attack 8 + Weak", attack: 8, applyPlayer: { status: "weak", value: 1 } },
      { label: "Observe — cleanse itself, Attack 8", cleanse: true, attack: 8 }
    ]
  },
  // Appears act 5+: a corruption-flavoured bruiser that forks into multi-hits.
  "daemon-process": {
    id: "daemon-process",
    name: "Daemon Process",
    tier: "standard",
    hp: 58,
    hpPerAct: 16,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Spawn — Block 8", block: 8 },
      { label: "Attack 15", attack: 15 },
      { label: "Fork — Attack 6, twice + Vulnerable", attack: 6, hits: 2, applyPlayer: { status: "vulnerable", value: 1 } }
    ]
  },
  // Appears act 6+ (CHAIN): its attack repeats one more time each UNINTERRUPTED turn — interrupt it
  // (RST / skipEnemyNext) to reset the loop, or it spirals out of control.
  "infinite-loop": {
    id: "infinite-loop",
    name: "Infinite Loop",
    tier: "standard",
    hp: 60,
    hpPerAct: 18,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Iterate — Attack 5 (+1 hit each uninterrupted turn)", attack: 5, rampHits: true },
      { label: "Branch — Block 10", block: 10 },
      { label: "Continue — Attack 9", attack: 9 }
    ]
  },
  // Appears act 6+: a chain-flavoured striker that punishes wide turns.
  "recursive-call": {
    id: "recursive-call",
    name: "Recursive Call",
    tier: "standard",
    hp: 62,
    hpPerAct: 18,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Call — Attack 8, twice", attack: 8, hits: 2 },
      { label: "Return — Attack 12 + Vulnerable", attack: 12, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Echo your traffic — 5 × cards played", mirror: 5 }
    ]
  },
  // ── Elites (need engine features: pierce + mirror) ──────────────────────────────────────────────
  "expired-certificate": {
    // Stalls behind heavy block, then expires for a large UNBLOCKABLE hit — race it or heal.
    id: "expired-certificate",
    name: "Expired Certificate",
    tier: "elite",
    hp: 64,
    hpPerAct: 22,
    armor: 2,
    armorPerAct: 2,
    script: [
      { label: "Re-signing — block 14", block: 14 },
      { label: "Re-signing — block 14", block: 14 },
      { label: "Certificate expires — 24 unblockable", attack: 24, pierce: true }
    ]
  },
  "man-in-the-middle": {
    // Punishes wide turns: its Mirror reflects 6 damage per card you played that turn.
    id: "man-in-the-middle",
    name: "Man-in-the-Middle",
    tier: "elite",
    hp: 72,
    hpPerAct: 24,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Intercept — attack 9", attack: 9 },
      { label: "Mirror your traffic — 6 × cards played", mirror: 6 },
      { label: "Inject — attack 7, twice", attack: 7, hits: 2 }
    ]
  },
  // Act 6 elite (CHAIN): a recursion-themed mini-boss whose stack-trace attack repeats +1 each
  // uninterrupted turn (rampHits) and which echoes wide turns — a serious spike before the finale.
  "segfault": {
    id: "segfault",
    name: "Segfault",
    tier: "elite",
    hp: 96,
    hpPerAct: 20,
    armor: 2,
    armorPerAct: 2,
    script: [
      { label: "Null deref — Attack 12", attack: 12 },
      { label: "Stack trace — Attack 6 (+1 hit each uninterrupted turn)", attack: 6, rampHits: true },
      { label: "Echo your traffic — 5 × cards played", mirror: 5 },
      { label: "Core dumped — Attack 10, twice", attack: 10, hits: 2 }
    ]
  },
  // ── Per-act mini-bosses (fixed HP; carry their act's combat finale) ───────────────────────────────
  "kernel-panic": {
    id: "kernel-panic",
    name: "Kernel Panic",
    tier: "boss",
    hp: 150,
    hpPerAct: 0,
    armor: 2,
    armorPerAct: 0,
    script: [
      { label: "Attack 14", attack: 14 },
      { label: "Block 14 + Attack 8", block: 14, attack: 8 },
      { label: "Attack 9, twice", attack: 9, hits: 2 },
      { label: "Halt — Attack 30", attack: 30 }
    ]
  },
  "buffer-overflow": {
    id: "buffer-overflow",
    name: "Buffer Overflow",
    tier: "boss",
    hp: 205,
    hpPerAct: 0,
    armor: 4,
    armorPerAct: 0,
    script: [
      { label: "Overflow — Attack 9, three times", attack: 9, hits: 3 },
      { label: "Block 18", block: 18 },
      { label: "Smash — Attack 14 + Weak", attack: 14, applyPlayer: { status: "weak", value: 1 } },
      { label: "Stack smash — Attack 34", attack: 34 }
    ]
  },
  "deadlock": {
    id: "deadlock",
    name: "Deadlock",
    tier: "boss",
    hp: 260,
    hpPerAct: 0,
    armor: 6,
    armorPerAct: 0,
    script: [
      { label: "Attack 20", attack: 20 },
      { label: "Mirror your traffic — 5 × cards played", mirror: 5 },
      { label: "Block 26", block: 26 },
      { label: "Attack 16 + Vulnerable", attack: 16, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Deadlock — Attack 32", attack: 32 }
    ]
  },
  // Act 4 mini-boss (SESSION): a session-hijacker that strips your defenses (Vulnerable) and punishes
  // with a big reset hit — the finale of the SESSION act now that the negotiation moved to act 6.
  "session-hijack": {
    id: "session-hijack",
    name: "Session Hijack",
    tier: "boss",
    hp: 290,
    hpPerAct: 0,
    armor: 4,
    armorPerAct: 0,
    script: [
      { label: "Intercept — Attack 16", attack: 16 },
      { label: "Forge token — Attack 8 + Vulnerable", attack: 8, applyPlayer: { status: "vulnerable", value: 1 } },
      { label: "Replay session — Attack 7, three times", attack: 7, hits: 3 },
      { label: "Hijack — Block 18 + Attack 14", block: 18, attack: 14 },
      { label: "Reset — Attack 30", attack: 30 }
    ]
  },
  // Act 5 mini-boss (CORRUPTION): gains armor on any turn you DON'T damage it (fortify) — so a pure
  // corruption-DoT turn (no direct hits) lets it wall up. Forces you to mix burst with the DoT.
  "stack-overflow": {
    id: "stack-overflow",
    name: "Stack Overflow",
    tier: "boss",
    hp: 320,
    hpPerAct: 0,
    armor: 4,
    armorPerAct: 0,
    script: [
      { label: "Recurse — Attack 14", attack: 14 },
      { label: "Reinforce — +6 armor if you didn't hit it, Block 8", fortify: 6, block: 8 },
      { label: "Attack 10, twice", attack: 10, hits: 2 },
      { label: "Overflow — Attack 28", attack: 28 }
    ]
  },
  // ── The final-act finale: fought with the REAL deck; negotiation = an acceptance hook (boss-combat.js).
  // HP here is the PHASE-1 pool; phase advance refills to BOSS_PHASE_HP[2]/[3]. Pressure is modest —
  // the challenge is satisfying the handshake (lead SYN / play ACK), not a raw damage race.
  "the-refused-connection": {
    id: "the-refused-connection",
    name: "The Refused Connection",
    tier: "boss",
    // A connection, not a process — it cannot be CORRUPTED, so a corruption build can't sidestep the
    // handshake; damage must come through accepted Signals. Reinforces the negotiation un-cheat.
    immuneCorruption: true,
    hp: 60,
    hpPerAct: 0,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Backpressure — Attack 8", attack: 8 },
      { label: "Re-handshake — Block 12", block: 12 },
      { label: "Reset — Attack 6, twice", attack: 6, hits: 2 },
      { label: "Silence — Block 10 + Attack 7", block: 10, attack: 7 }
    ]
  },
  // The key-gated TRUE-ENDING superboss (superboss.js owns its phase HP/scripts). This base def is a
  // placeholder; wireSuperboss overrides hp + script per phase. Tier "boss" so it skips enemy mults.
  "the-kernel-of-refusal": {
    id: "the-kernel-of-refusal",
    name: "The Kernel of Refusal",
    tier: "boss",
    hp: 50,
    hpPerAct: 0,
    armor: 0,
    armorPerAct: 0,
    script: [
      { label: "Ordered strike", attack: 6 },
      { label: "Deferred packet", attack: 8 },
      { label: "Reorder buffer", block: 8 }
    ]
  }
};
function instantiateEnemy(id, act = 1) {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  const scale = Math.max(0, act - 1);
  return {
    id: def.id,
    name: def.name,
    tier: def.tier,
    immuneCorruption: Boolean(def.immuneCorruption),
    hp: def.hp + def.hpPerAct * scale,
    armor: def.armor + def.armorPerAct * scale,
    script: def.script.map((intent) => ({ ...intent }))
  };
}

// ../../docs/games/metagame/stages/stage6/relics.js
var RELICS = [
  {
    id: "handshake-token",
    name: "Handshake Token",
    rarity: "common",
    text: "At the start of each combat, gain 8 block.",
    hooks: { onCombatStart: (ctx) => ctx.block(8) }
  },
  {
    id: "syn-cookie",
    name: "SYN Cookie",
    rarity: "common",
    text: "At the start of each combat, draw 1 extra card.",
    hooks: { onCombatStart: (ctx) => ctx.draw(1) }
  },
  {
    id: "persistent-socket",
    name: "Persistent Socket",
    rarity: "uncommon",
    text: "At the start of each of your turns, gain 3 block.",
    hooks: { onPlayerTurnStart: (ctx) => ctx.block(3) }
  },
  {
    id: "protocol-primer",
    name: "Protocol Primer",
    rarity: "uncommon",
    text: "Whenever you play a Protocol card, gain 1 block.",
    hooks: { onCardPlay: (ctx) => {
      if (ctx.card?.type === "Protocol") ctx.block(1);
    } }
  },
  {
    id: "overclock-chip",
    name: "Overclock Chip",
    rarity: "rare",
    text: "At the start of each combat, gain 1 Strength.",
    hooks: { onCombatStart: (ctx) => ctx.applySelf("strength", 1) }
  },
  // ── Build-definers: relics that change HOW you build, not just stat-sticks ──────────────────────────
  {
    // Rewards WIDE turns — makes dumping your hand a plan, not a panic.
    id: "full-duplex",
    name: "Full Duplex",
    rarity: "uncommon",
    text: "Each turn, when you play your 3rd card, draw 1.",
    hooks: { onCardPlay: (ctx) => {
      if (ctx.combat.cardsPlayedThisTurn === 3) ctx.draw(1);
    } }
  },
  {
    // Turns a Protocol/defensive deck into a KILL plan — Protocol cards now bite.
    id: "checksum-offload",
    name: "Checksum Offload",
    rarity: "rare",
    text: "Whenever you play a Protocol card, deal 3 to the enemy.",
    hooks: { onCardPlay: (ctx) => {
      if (ctx.card?.type === "Protocol") ctx.deal(3);
    } }
  },
  {
    // Layer/power decks get an extra payoff for stacking Strength.
    id: "cipher-cascade",
    name: "Cipher Cascade",
    rarity: "uncommon",
    text: "Whenever you play a Layer card, gain 2 block.",
    hooks: { onCardPlay: (ctx) => {
      if (ctx.card?.type === "Layer") ctx.block(2);
    } }
  },
  // ── Cursed: strong, with a real downside (tag `cursed` so the UI can warn) ──────────────────────────
  {
    id: "memory-leak",
    name: "Memory Leak",
    rarity: "rare",
    cursed: true,
    text: "Cursed. At the start of each combat, gain 2 Strength — but also 2 Weak.",
    hooks: { onCombatStart: (ctx) => {
      ctx.applySelf("strength", 2);
      ctx.applySelf("weak", 2);
    } }
  },
  {
    id: "overcommit-buffer",
    name: "Overcommit Buffer",
    rarity: "rare",
    cursed: true,
    text: "Cursed. At the start of each of your turns, gain 1 energy — but become Vulnerable.",
    hooks: { onPlayerTurnStart: (ctx) => {
      ctx.gainEnergy(1);
      ctx.applySelf("vulnerable", 1);
    } }
  },
  // ── Act 1 LINK · SEQUENCE: rewards leading the turn with the right card ─────────────────────────────
  {
    id: "tcp-fast-open",
    name: "TCP Fast Open",
    rarity: "rare",
    text: "The first card you play each turn costs 1 less.",
    hooks: { onCombatStart: (ctx) => {
      ctx.combat.firstCardDiscount = (ctx.combat.firstCardDiscount || 0) + 1;
    } }
  },
  // ── Act 2 TRANSPORT · DELAY: lands the first delayed packet a turn sooner ───────────────────────────
  {
    id: "fast-retransmit",
    name: "Fast Retransmit",
    rarity: "uncommon",
    text: "Your first delayed effect each combat resolves a turn sooner.",
    hooks: { onCombatStart: (ctx) => {
      ctx.combat.delaySpeedup = true;
    } }
  },
  // ── Act 3 NETWORK · THROUGHPUT: bigger pipe, harsher collapse (cursed Overclock successor) ──────────
  {
    id: "overclock-bus",
    name: "Overclock Bus",
    rarity: "rare",
    cursed: true,
    text: "Cursed. Your congestion window cap is +1, but a wide turn shrinks it by 2.",
    hooks: { onCombatStart: (ctx) => {
      ctx.combat.windowCap = (ctx.combat.windowCap || 5) + 1;
      ctx.combat.windowDecay = 2;
    } }
  },
  // ── Act 5 PRESENTATION · CORRUPTION: a build-definer — every corruption stack ticks twice ──────────
  {
    id: "entropy-pool",
    name: "Entropy Pool",
    rarity: "rare",
    text: "Corruption on the enemy ticks twice each turn.",
    hooks: { onCombatStart: (ctx) => {
      ctx.combat.corruptionDouble = true;
    } }
  },
  // ── Act 6 APPLICATION · CHAIN: a build-definer — the first big-chain turn refunds energy ────────────
  {
    id: "jit-compiler",
    name: "JIT Compiler",
    rarity: "rare",
    text: "The first turn you replay 3+ cards, gain 1 energy.",
    hooks: { onCardPlay: (ctx) => {
      if ((ctx.combat.chainThisTurn || 0) >= 3 && !ctx.combat.jitUsed) {
        ctx.combat.jitUsed = true;
        ctx.gainEnergy(1);
      }
    } }
  },
  // ── Phase G: relics built on the new combat hooks (onTurnEnd/onKill/onDamageTaken/onExhaust/onShuffle) ─
  {
    // Rewards leaving energy on the table — turtle decks turn the leftover into armor.
    id: "nagle-buffer",
    name: "Nagle Buffer",
    rarity: "uncommon",
    text: "At the end of your turn, gain block equal to your unspent energy.",
    hooks: { onTurnEnd: (ctx) => ctx.block(ctx.combat.player.energy || 0) }
  },
  {
    // A defensive failsafe: never end an exposed turn for free.
    id: "keepalive-probe",
    name: "Keepalive Probe",
    rarity: "common",
    text: "At the end of your turn, if you have no block, gain 4 block.",
    hooks: { onTurnEnd: (ctx) => {
      if (!ctx.combat.player.block) ctx.block(4);
    } }
  },
  {
    // Sustain between fights: each kill tops you up, so a long run is survivable.
    id: "reaper-thread",
    name: "Reaper Thread",
    rarity: "uncommon",
    text: "Whenever you defeat an enemy, heal 6 HP.",
    hooks: { onKill: (ctx) => ctx.heal(6) }
  },
  {
    // Getting hit hardens you — the first blow each fight turns pain into lasting power. (Block from a
    // damage-reaction would be wiped at your next turn, so this grants persistent Strength instead.)
    id: "exception-handler",
    name: "Exception Handler",
    rarity: "uncommon",
    text: "The first time you take damage each combat, gain 2 Strength.",
    hooks: { onDamageTaken: (ctx) => {
      if (!ctx.combat.exceptionHandled) {
        ctx.combat.exceptionHandled = true;
        ctx.applySelf("strength", 2);
      }
    } }
  },
  {
    // A big hit triggers a counter-debuff — turns a heavy enemy turn into your opening.
    id: "watchdog-timer",
    name: "Watchdog Timer",
    rarity: "rare",
    text: "The first time you take 10+ damage each combat, apply 2 Weak to the enemy.",
    hooks: { onDamageTaken: (ctx) => {
      if ((ctx.combat.lastDamageTaken || 0) >= 10 && !ctx.combat.watchdogUsed) {
        ctx.combat.watchdogUsed = true;
        ctx.applyEnemy("weak", 2);
      }
    } }
  },
  {
    // Build-definer for exhaust decks: every burned card sharpens you.
    id: "coredump-collector",
    name: "Coredump Collector",
    rarity: "rare",
    text: "Whenever a card is Exhausted, gain 1 Strength.",
    hooks: { onExhaust: (ctx) => ctx.applySelf("strength", 1) }
  },
  {
    // Rewards deck cycling — every reshuffle banks armor (great in long, lean-deck fights).
    id: "write-back-cache",
    name: "Write-Back Cache",
    rarity: "uncommon",
    text: "Whenever your discard reshuffles into your draw pile, gain 4 block.",
    hooks: { onShuffle: (ctx) => ctx.block(4) }
  },
  {
    // Tempo on cycle — a thin deck reshuffles often, refunding energy.
    id: "reset-vector",
    name: "Reset Vector",
    rarity: "rare",
    text: "Whenever you reshuffle your deck, gain 1 energy.",
    hooks: { onShuffle: (ctx) => ctx.gainEnergy(1) }
  }
];
var BY_ID2 = new Map(RELICS.map((relic) => [relic.id, relic]));
function relicById(id) {
  return BY_ID2.get(id) || null;
}
function relicsFor(ids) {
  return (ids || []).map(relicById).filter(Boolean);
}
function rollRelic(seed, owned = []) {
  const ownedSet = new Set(owned);
  const pool = RELICS.filter((relic) => !ownedSet.has(relic.id));
  if (!pool.length) return null;
  const rng = makeRng(seed);
  return pool[Math.floor(rng() * pool.length)].id;
}
function rollRelics(seed, owned = [], count = 3) {
  const ownedSet = new Set(owned);
  const pool = RELICS.filter((relic) => !ownedSet.has(relic.id));
  const rng = makeRng(seed);
  const out = [];
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  }
  return out;
}

// ../../docs/games/metagame/stages/stage6/potions.js
var POTIONS = [
  {
    id: "hotfix",
    name: "Hotfix",
    rarity: "common",
    text: "Heal 12 HP.",
    effect: (ctx) => ctx.heal(12)
  },
  {
    id: "burst-buffer",
    name: "Burst Buffer",
    rarity: "common",
    text: "Gain 2 energy this turn.",
    effect: (ctx) => ctx.gainEnergy(2)
  },
  {
    id: "smoke-test",
    name: "Smoke Test",
    rarity: "common",
    text: "Gain 15 block.",
    effect: (ctx) => ctx.block(15)
  },
  {
    id: "fuzzer",
    name: "Fuzzer",
    rarity: "uncommon",
    text: "Apply 3 Vulnerable to the enemy.",
    effect: (ctx) => ctx.applyEnemy("vulnerable", 3)
  },
  {
    id: "snapshot",
    name: "Snapshot",
    rarity: "uncommon",
    text: "Draw 3 cards.",
    effect: (ctx) => ctx.draw(3)
  },
  {
    id: "rollback",
    name: "Rollback",
    rarity: "uncommon",
    text: "Return the last card you played to your hand.",
    effect: (ctx) => ctx.returnLastPlayed()
  },
  {
    id: "core-dump-vial",
    name: "Core Dump Vial",
    rarity: "rare",
    text: "Deal 25 to the enemy and apply 2 Weak.",
    effect: (ctx) => {
      ctx.deal(25);
      ctx.applyEnemy("weak", 2);
    }
  }
];
var BY_ID3 = new Map(POTIONS.map((p) => [p.id, p]));
function potionById(id) {
  return BY_ID3.get(id) || null;
}
var POTION_SLOTS = 2;
var POTION_COST = 35;
var POTION_DROP_CHANCE = 0.4;
function addPotion(run, potionId, replaceIndex) {
  if (!run.potions) run.potions = [];
  if (!potionById(potionId)) return { ok: false, reason: "unknown" };
  if (run.potions.length < POTION_SLOTS) {
    run.potions.push(potionId);
    return { ok: true };
  }
  if (Number.isInteger(replaceIndex) && replaceIndex >= 0 && replaceIndex < run.potions.length) {
    const replaced = run.potions[replaceIndex];
    run.potions[replaceIndex] = potionId;
    return { ok: true, replaced };
  }
  return { ok: false, full: true };
}
function usePotion(run, index) {
  if (!run.potions || index < 0 || index >= run.potions.length) return { ok: false };
  const [id] = run.potions.splice(index, 1);
  return { ok: true, id };
}
function takePotion(run, replaceIndex) {
  const id = run.pendingReward?.potion;
  if (!id) return { ok: false, reason: "none" };
  const r = addPotion(run, id, replaceIndex);
  if (r.ok) run.pendingReward.potion = null;
  return r;
}
function buyPotion(run, potionId, cost = POTION_COST, replaceIndex) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const r = addPotion(run, potionId, replaceIndex);
  if (!r.ok) return { ...r, cost };
  run.handshakes -= cost;
  return { ok: true, cost, replaced: r.replaced };
}
var RARITY_WEIGHT = { common: 4, uncommon: 2, rare: 1 };
function rollPotion(seed) {
  let h = (Number(seed) || 1) >>> 0;
  h = h + 1831565813 | 0;
  let t = Math.imul(h ^ h >>> 15, 1 | h);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  const r = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const total = POTIONS.reduce((sum, p) => sum + (RARITY_WEIGHT[p.rarity] || 1), 0);
  let pick = r * total;
  for (const p of POTIONS) {
    pick -= RARITY_WEIGHT[p.rarity] || 1;
    if (pick < 0) return p.id;
  }
  return POTIONS[POTIONS.length - 1].id;
}

// ../../docs/games/metagame/stages/stage6/mapgen.js
var STANDARD_POOLS = {
  1: ["corrupt-packet", "firewall-entity", "null-pointer"],
  2: ["corrupt-packet", "firewall-entity", "null-pointer", "race-condition", "round-trip-timer"],
  3: ["firewall-entity", "null-pointer", "race-condition", "packet-storm", "round-trip-timer", "congestion-collapse"],
  4: ["null-pointer", "race-condition", "packet-storm", "round-trip-timer", "congestion-collapse"],
  // Act 5 PRESENTATION · CORRUPTION: cleansers + corruption-flavoured bruisers reward burst-DoT play.
  5: ["packet-storm", "race-condition", "heisenbug", "daemon-process"],
  // Act 6 APPLICATION · CHAIN: looping/echoing strikers reward interrupt timing + replay payoffs.
  6: ["heisenbug", "infinite-loop", "recursive-call", "packet-storm"]
};
var ELITE_POOLS = {
  default: ["expired-certificate", "man-in-the-middle"],
  6: ["man-in-the-middle", "segfault"]
};
var CONTENT_LAYERS = 6;
function generateAct(act, seed) {
  const rng = makeRng((Number(seed) || 1) * 100 + act);
  const layers = [];
  for (let layer = 0; layer < CONTENT_LAYERS; layer++) {
    const width = layerWidth(layer, rng);
    const nodes = [];
    for (let col = 0; col < width; col++) {
      nodes.push({ id: nodeId(act, layer, col), act, layer, col, type: defaultType(layer), next: [] });
    }
    layers.push(nodes);
  }
  composeAct(layers, rng);
  layers.push([{ id: nodeId(act, CONTENT_LAYERS, 0), act, layer: CONTENT_LAYERS, col: 0, type: "boss", next: [] }]);
  wireEdges(layers, rng);
  return { act, layers, startIds: layers[0].map((n) => n.id) };
}
function generateRun(seed, acts = 3) {
  return { seed, acts: Array.from({ length: acts }, (_, i) => generateAct(i + 1, seed)) };
}
function nodeById(run, id) {
  for (const act of run.acts) {
    for (const layer of act.layers) {
      const found = layer.find((n) => n.id === id);
      if (found) return found;
    }
  }
  return null;
}
function layerWidth(layer, rng) {
  if (layer === 0) return 2;
  return 2 + (rng() < 0.5 ? 1 : 0);
}
function defaultType(layer) {
  return layer === CONTENT_LAYERS - 1 ? "rest" : "combat";
}
function composeAct(layers, rng) {
  const mid = [];
  for (let l = 1; l <= CONTENT_LAYERS - 2; l++) mid.push(l);
  const eliteIdx = 1 + Math.floor(rng() * (mid.length - 1));
  const eliteLayer = mid[eliteIdx];
  const pool = mid.filter((l) => l !== eliteLayer);
  const shopLayer = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  const eventLayer = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  setOne(layers[eliteLayer], "elite", rng);
  setOne(layers[shopLayer], "shop", rng);
  setOne(layers[eventLayer], "event", rng);
}
function setOne(layerNodes, type, rng) {
  layerNodes[Math.floor(rng() * layerNodes.length)].type = type;
}
function wireEdges(layers, rng) {
  for (let i = 0; i < layers.length - 1; i++) {
    const here = layers[i];
    const next = layers[i + 1];
    for (const node of here) {
      const a = next[Math.floor(rng() * next.length)];
      node.next = [a.id];
      if (next.length > 1 && rng() < 0.5) {
        const b = next[Math.floor(rng() * next.length)];
        if (b.id !== a.id) node.next.push(b.id);
      }
    }
    for (const target of next) {
      const hasIncoming = here.some((node) => node.next.includes(target.id));
      if (!hasIncoming) {
        const source = here[Math.floor(rng() * here.length)];
        source.next.push(target.id);
      }
    }
  }
}
function nodeId(act, layer, col) {
  return `a${act}-l${layer}-n${col}`;
}
function enemyForNode(node, act = 1, rng) {
  if (typeof rng !== "function") throw new TypeError("enemyForNode requires a seeded rng");
  if (node.type === "elite") {
    const elites = ELITE_POOLS[act] || ELITE_POOLS.default;
    return elites[Math.floor(rng() * elites.length)];
  }
  const pool = STANDARD_POOLS[act] || STANDARD_POOLS[6];
  return pool[Math.floor(rng() * pool.length)];
}

// ../../docs/games/metagame/stages/stage6/card-upgrades.js
var UPGRADED_SUFFIX = "+";
var SPECS = {
  SYN: { text: "Deal 11. If ACK was played this turn, draw 2.", effect: (ctx) => {
    ctx.deal(11);
    if (ctx.playedThisTurn("ACK")) ctx.draw(2);
  } },
  ACK: { text: "Gain 13 block.", effect: (ctx) => ctx.block(13) },
  RST: { text: "Deal 18. Interrupt the enemy's next action.", effect: (ctx) => {
    ctx.deal(18);
    ctx.skipEnemyNext();
  } },
  PUSH: { text: "Deal 7 for each card played this turn.", effect: (ctx) => ctx.deal(7 * ctx.cardsPlayed) },
  WINDOW: { cost: 0, text: "Draw 2 cards. (cost 0)", effect: (ctx) => ctx.draw(2) },
  FRAGMENT: { text: "Deal 5. Draw 1.", effect: (ctx) => {
    ctx.deal(5);
    ctx.draw(1);
  } },
  HANDSHAKE: { text: "Deal 10 and gain 12 block.", effect: (ctx) => {
    ctx.deal(10);
    ctx.block(12);
  } },
  FLOOD: { text: "Deal 5, four times.", effect: (ctx) => {
    for (let i = 0; i < 4; i++) ctx.deal(5);
  } },
  BUFFER: { text: "Gain 5 block for each card in hand.", effect: (ctx) => ctx.block(5 * ctx.handSize) },
  NULL_ROUTE: { text: "Apply 3 Vulnerable to the enemy.", effect: (ctx) => ctx.applyEnemy("vulnerable", 3) },
  PROBE: { text: "Deal 8. Apply 1 Vulnerable.", effect: (ctx) => {
    ctx.deal(8);
    ctx.applyEnemy("vulnerable", 1);
  } },
  PRIORITY_PACKET: { text: "Deal 16.", effect: (ctx) => ctx.deal(16) },
  ASYMMETRIC: { text: "Deal 8. If your block exceeds your HP, deal 16 more.", effect: (ctx) => {
    ctx.deal(8);
    if (ctx.blockNow > ctx.hp) ctx.deal(16);
  } },
  BURST_FRAME: { text: "Deal 40. Apply 1 Weak to yourself. Exhaust.", effect: (ctx) => {
    ctx.deal(40);
    ctx.applySelf("weak", 1);
  } },
  SEGMENT: { text: "Gain 8 block.", effect: (ctx) => ctx.block(8) },
  KEEPALIVE: { text: "Gain 7 block. If ACK was played this turn, gain 10 more.", effect: (ctx) => {
    ctx.block(7);
    if (ctx.playedThisTurn("ACK")) ctx.block(10);
  } },
  THROTTLE: { text: "Apply 3 Weak to the enemy.", effect: (ctx) => ctx.applyEnemy("weak", 3) },
  RENEGOTIATE: { text: "Remove your debuffs and gain 9 block.", effect: (ctx) => {
    ctx.clearSelfDebuffs();
    ctx.block(9);
  } },
  CIPHER_LAYER: { text: "Gain 1 Strength and 9 block.", effect: (ctx) => {
    ctx.applySelf("strength", 1);
    ctx.block(9);
  } },
  TCP_STACK: { cost: 1, text: "Gain 2 Strength. (cost 1)", effect: (ctx) => ctx.applySelf("strength", 2) },
  // C5b additions
  SCAN: { text: "Deal 6. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.deal(6);
    ctx.applyEnemy("weak", 1);
  } },
  JITTER: { text: "Deal 6. If a card was replayed this turn, deal 6 more.", effect: (ctx) => {
    ctx.deal(6);
    if (ctx.chainCount > 0) ctx.deal(6);
  } },
  PIPELINE: { text: "Deal 5. If you've played 2+ cards this turn, deal 5 more.", effect: (ctx) => {
    ctx.deal(5);
    if (ctx.cardsPlayed >= 2) ctx.deal(5);
  } },
  SPOOF: { text: "Apply 2 Vulnerable to the enemy. Draw 1.", effect: (ctx) => {
    ctx.applyEnemy("vulnerable", 2);
    ctx.draw(1);
  } },
  DDOS: { text: "Deal 8 for each card played this turn. Exhaust.", effect: (ctx) => ctx.deal(8 * ctx.cardsPlayed) },
  REPLAY: { text: "Deal 13. If ACK was played this turn, deal 6 more.", effect: (ctx) => {
    ctx.deal(13);
    if (ctx.playedThisTurn("ACK")) ctx.deal(6);
  } },
  BACKLOG: { text: "Gain 11 block.", effect: (ctx) => ctx.block(11) },
  NAGLE: { text: "Gain 6 block. Draw 1.", effect: (ctx) => {
    ctx.block(6);
    ctx.draw(1);
  } },
  FIREWALL: { text: "Gain 15 block. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.block(15);
    ctx.applyEnemy("weak", 1);
  } },
  CONGESTION_CTL: { text: "Gain 10 block.", effect: (ctx) => ctx.block(10) },
  SACK: { text: "Gain 8 block. Draw 2.", effect: (ctx) => {
    ctx.block(8);
    ctx.draw(2);
  } },
  ENCRYPT: { text: "Gain 6 block and 1 Strength.", effect: (ctx) => {
    ctx.block(6);
    ctx.applySelf("strength", 1);
  } },
  HANDSHAKE_LAYER: { cost: 0, text: "Gain 1 Strength. (cost 0)", effect: (ctx) => ctx.applySelf("strength", 1) },
  DEEP_PACKET: { text: "Gain 2 Strength. Apply 2 Vulnerable to the enemy.", effect: (ctx) => {
    ctx.applySelf("strength", 2);
    ctx.applyEnemy("vulnerable", 2);
  } },
  SESSION_KEY: { text: "Gain 2 Strength. Draw 1.", effect: (ctx) => {
    ctx.applySelf("strength", 2);
    ctx.draw(1);
  } },
  ONION: { text: "Gain 4 Strength. Exhaust.", effect: (ctx) => ctx.applySelf("strength", 4) },
  // D1 SEQUENCE
  PREAMBLE: { text: "Deal 8. If it's the first card this turn, deal 8 more.", effect: (ctx) => {
    ctx.deal(8);
    if (ctx.isFirstCard) ctx.deal(8);
  } },
  FINALIZE: { text: "Deal 10. If it's NOT the first card this turn, deal 10 more.", effect: (ctx) => {
    ctx.deal(10);
    if (!ctx.isFirstCard) ctx.deal(10);
  } },
  ROOT_CERTIFICATE: { text: "Gain 5 block. If it's the first card this turn, gain 1 energy and draw 2.", effect: (ctx) => {
    ctx.block(5);
    if (ctx.isFirstCard) {
      ctx.gainEnergy(1);
      ctx.draw(2);
    }
  } },
  // D2 DELAY
  WINDOWED_SEND: { text: "Deal 6. Deal 10 at the start of your next turn.", effect: (ctx) => {
    ctx.deal(6);
    ctx.queue(1, { deal: 10 });
  } },
  RETRANSMIT: { text: "Deal 24 in 2 turns.", effect: (ctx) => ctx.queue(2, { deal: 24 }) },
  DELAYED_ACK: { text: "Gain 6 block. Gain 9 block at the start of your next turn.", effect: (ctx) => {
    ctx.block(6);
    ctx.queue(1, { block: 9 });
  } },
  // D3 THROUGHPUT
  BANDWIDTH: { text: "Widen your congestion window by 2 (gain 2 energy now).", effect: (ctx) => ctx.widenWindow(2) },
  BACKOFF: { text: "Gain 11 block. Your congestion window does not shrink next turn.", effect: (ctx) => {
    ctx.block(11);
    ctx.noWindowShrink();
  } },
  DEFRAG: { text: "Return all jammed cards to your hand. Draw 2.", effect: (ctx) => {
    ctx.defrag();
    ctx.draw(2);
  } },
  // H · Act 5 CORRUPTION (Daemon Swarm)
  FORK_BOMB: { text: "Apply 6 Corruption.", effect: (ctx) => ctx.applyCorruption(6) },
  DAEMON_SPAWN: { text: "Apply 3 Corruption.", effect: (ctx) => ctx.applyCorruption(3) },
  ROT: { text: "Apply 3 Corruption. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.applyCorruption(3);
    ctx.applyEnemy("weak", 1);
  } },
  ZOMBIE_PROCESS: { text: "Apply 4 Corruption. If the enemy is already corrupted, apply 4 more.", effect: (ctx) => {
    const had = ctx.enemyCorruption > 0;
    ctx.applyCorruption(4);
    if (had) ctx.applyCorruption(4);
  } },
  MEMORY_LEAK: { text: "Corruption you apply is increased by 1. Apply 3 Corruption.", effect: (ctx) => {
    ctx.boostCorruption(1);
    ctx.applyCorruption(3);
  } },
  ENTROPY_WAVE: { text: "Apply 4 Corruption. Draw 1.", effect: (ctx) => {
    ctx.applyCorruption(4);
    ctx.draw(1);
  } },
  SEGFAULT_SPILL: { text: "Deal 6. Apply 3 Corruption.", effect: (ctx) => {
    ctx.deal(6);
    ctx.applyCorruption(3);
  } },
  CORE_DUMP: { text: "Deal damage equal to the enemy's Corruption (keep the stack).", effect: (ctx) => ctx.deal(ctx.enemyCorruption) },
  CASCADE_FAILURE: { text: "Apply Corruption equal to the enemy's Corruption + 2.", effect: (ctx) => ctx.applyCorruption(ctx.enemyCorruption + 2) },
  GARBAGE_COLLECT: { exhaust: false, text: "Consume all Corruption and deal that much damage instantly.", effect: (ctx) => ctx.deal(ctx.consumeCorruption()) },
  // H · Act 6 CHAIN (Recursion)
  STACK_FRAME: { text: "Deal 9. If the previous card was a Recursion card, deal 9 more.", effect: (ctx) => {
    ctx.deal(9);
    if (ctx.lastPlayedType === "Recursion") ctx.deal(9);
  } },
  LOOPBACK: { text: "Deal 4. If the previous card was a Recursion card, draw 1.", effect: (ctx) => {
    ctx.deal(4);
    if (ctx.lastPlayedType === "Recursion") ctx.draw(1);
  } },
  ITERATE: { text: "Deal 5. Deal 5 more for each card replayed this turn.", effect: (ctx) => ctx.deal(5 + 5 * ctx.chainCount) },
  YIELD: { text: "Gain 8 block. If the previous card was a Recursion card, gain 6 more block.", effect: (ctx) => {
    ctx.block(8);
    if (ctx.lastPlayedType === "Recursion") ctx.block(6);
  } },
  TAIL_CALL: { text: "Replay the last card you played at three-quarters value.", effect: (ctx) => ctx.replayLast(0.75) },
  TRAMPOLINE: { text: "Deal 10. Replay the last card you played at half value.", effect: (ctx) => {
    ctx.deal(10);
    ctx.replayLast(0.5);
  } },
  CALLBACK: { text: "Deal 7. Replay the last card at the start of your next turn.", effect: (ctx) => {
    ctx.deal(7);
    ctx.echoNextTurn();
  } },
  FIXED_POINT: { cost: 1, text: "Replay the last card you played twice. (cost 1)", effect: (ctx) => ctx.replayLast(1, 2) },
  RECURSE: { exhaust: false, text: "X-cost: spend all energy, then replay the last card that many times.", effect: (ctx) => ctx.replayLast(1, ctx.xValue) },
  // H · pool-depth commons
  BIT_FLIP: { text: "Deal 6.", effect: (ctx) => ctx.deal(6) },
  PING: { text: "Deal 10.", effect: (ctx) => ctx.deal(10) },
  ICMP: { text: "Deal 7. Gain 4 block.", effect: (ctx) => {
    ctx.deal(7);
    ctx.block(4);
  } },
  TEARDOWN: { text: "Deal 15.", effect: (ctx) => ctx.deal(15) },
  DATAGRAM: { text: "Deal 9.", effect: (ctx) => ctx.deal(9) },
  BROADCAST: { text: "Deal 8. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.deal(8);
    ctx.applyEnemy("weak", 1);
  } },
  ACKNOWLEDGE: { text: "Gain 12 block.", effect: (ctx) => ctx.block(12) },
  PADDING: { text: "Gain 6 block.", effect: (ctx) => ctx.block(6) },
  PARITY: { text: "Gain 7 block. Draw 1.", effect: (ctx) => {
    ctx.block(7);
    ctx.draw(1);
  } },
  HEARTBEAT: { text: "Gain 15 block.", effect: (ctx) => ctx.block(15) },
  SLOW_START: { text: "Gain 8 block. Apply 1 Weak to the enemy.", effect: (ctx) => {
    ctx.block(8);
    ctx.applyEnemy("weak", 1);
  } },
  SHIM: { cost: 0, text: "Gain 1 Strength. (cost 0)", effect: (ctx) => ctx.applySelf("strength", 1) },
  ROTATE: { text: "Gain 6 block. Draw 1.", effect: (ctx) => {
    ctx.block(6);
    ctx.draw(1);
  } },
  XOR_PAD: { text: "Gain 8 block.", effect: (ctx) => ctx.block(8) },
  NONCE: { text: "Gain 5 block. Draw 1.", effect: (ctx) => {
    ctx.block(5);
    ctx.draw(1);
  } },
  TAINT: { text: "Deal 3. Apply 3 Corruption.", effect: (ctx) => {
    ctx.deal(3);
    ctx.applyCorruption(3);
  } },
  NULL_DEREF: { text: "Deal 7. If the enemy is corrupted, deal 4 more.", effect: (ctx) => {
    ctx.deal(7);
    if (ctx.enemyCorruption > 0) ctx.deal(4);
  } },
  SPORE: { text: "Apply 2 Corruption. Draw 1.", effect: (ctx) => {
    ctx.applyCorruption(2);
    ctx.draw(1);
  } },
  TRACE: { text: "Deal 7. If the previous card was a Recursion card, gain 4 block.", effect: (ctx) => {
    ctx.deal(7);
    if (ctx.lastPlayedType === "Recursion") ctx.block(4);
  } },
  BASE_CASE: { text: "Deal 10.", effect: (ctx) => ctx.deal(10) }
};
function isUpgradedId(id) {
  return typeof id === "string" && id.endsWith(UPGRADED_SUFFIX);
}
function canUpgrade(id) {
  return Boolean(SPECS[id]) && !isUpgradedId(id);
}
function upgradeIdFor(id) {
  return canUpgrade(id) ? id + UPGRADED_SUFFIX : null;
}
var UPGRADED_CARDS = Object.entries(SPECS).map(([baseId3, spec]) => {
  const base = cardById(baseId3);
  return { ...base, ...spec, id: baseId3 + UPGRADED_SUFFIX, base: baseId3, upgraded: true };
});
for (const card of UPGRADED_CARDS) registerCard(card);

// ../../docs/games/metagame/stages/stage6/ascension-mods.js
function baseRunConfig() {
  return {
    handshakeMult: 1,
    // run.js resolveCombat: combat handshake reward multiplier
    restHealMod: 0,
    // run.js rest: added to the 0.30 heal fraction
    windowCapMod: 0,
    // renderer makeCombat: Act-3 congestion window cap delta
    eliteHpBonus: 0,
    // renderer makeCombat: flat HP added to elite enemies
    bossHpMult: 1,
    // boss-combat: per-phase HP multiplier for The Refused Connection
    enemyHpMult: 1,
    // renderer makeCombat: HP multiplier for NON-boss enemies
    enemyArmorBonus: 0,
    // renderer makeCombat: flat armor added to NON-boss enemies
    startHpMod: 0,
    // run.js createRun: delta to the run's STARTING hp (not maxHp)
    skipRewardMod: 0,
    // run.js takeReward: delta to the skip-a-card handshake payout
    removalCostMod: 0,
    // run.js removalCost: delta to the base deck-removal price
    rewardChoicesMod: 0,
    // run.js reward draft: delta to the number of cards offered
    bossExtraPhase: false
    // boss-combat: The Refused Connection gains a 4th mutating phase
  };
}
var ASCENSION_MODS = [
  { level: 1, id: "lean-rewards", label: "Lean economy", desc: "Handshake rewards reduced by 25%.", apply: (c) => {
    c.handshakeMult *= 0.75;
    return c;
  } },
  { level: 2, id: "stingy-rest", label: "Stingy rests", desc: "Rest sites heal 10% less.", apply: (c) => {
    c.restHealMod -= 0.1;
    return c;
  } },
  { level: 3, id: "tight-window", label: "Tight windows", desc: "The Act-3 congestion cap is 1 lower.", apply: (c) => {
    c.windowCapMod -= 1;
    return c;
  } },
  { level: 4, id: "meaner-elites", label: "Meaner elites", desc: "Elites gain +24 HP.", apply: (c) => {
    c.eliteHpBonus += 24;
    return c;
  } },
  { level: 5, id: "tougher-boss", label: "Tougher boss", desc: "The Refused Connection has +30% phase HP.", apply: (c) => {
    c.bossHpMult *= 1.3;
    return c;
  } },
  { level: 6, id: "hardened-foes", label: "Hardened foes", desc: "All non-boss enemies have +15% HP.", apply: (c) => {
    c.enemyHpMult *= 1.15;
    return c;
  } },
  { level: 7, id: "attrition", label: "Attrition", desc: "Each run starts at 8 HP below maximum.", apply: (c) => {
    c.startHpMod -= 8;
    return c;
  } },
  { level: 8, id: "thankless", label: "Thankless thinning", desc: "Skipping a reward card pays nothing.", apply: (c) => {
    c.skipRewardMod -= 5;
    return c;
  } },
  { level: 9, id: "costly-removal", label: "Costly removal", desc: "Deck removal costs 20 more handshakes.", apply: (c) => {
    c.removalCostMod += 20;
    return c;
  } },
  { level: 10, id: "fewer-options", label: "Fewer options", desc: "Reward drafts offer one fewer card.", apply: (c) => {
    c.rewardChoicesMod -= 1;
    return c;
  } },
  { level: 11, id: "armored-foes", label: "Armored foes", desc: "All non-boss enemies gain +3 armor.", apply: (c) => {
    c.enemyArmorBonus += 3;
    return c;
  } },
  { level: 12, id: "austere", label: "Austere economy", desc: "Handshake rewards reduced a further 20%.", apply: (c) => {
    c.handshakeMult *= 0.8;
    return c;
  } },
  { level: 13, id: "brutal-elites", label: "Brutal elites", desc: "Elites gain a further +30 HP.", apply: (c) => {
    c.eliteHpBonus += 30;
    return c;
  } },
  { level: 14, id: "boss-overclock", label: "Boss overclock", desc: "The Refused Connection gains a further +25% phase HP.", apply: (c) => {
    c.bossHpMult *= 1.25;
    return c;
  } },
  { level: 15, id: "endurance", label: "Endurance test", desc: "The Refused Connection gains a fourth mutating phase.", apply: (c) => {
    c.bossExtraPhase = true;
    return c;
  } }
];
var MAX_ASCENSION = ASCENSION_MODS.length;
function activeAscensionMods(level) {
  const cap = Math.max(0, Math.floor(Number(level) || 0));
  return ASCENSION_MODS.filter((m) => m.level <= cap);
}
function foldAscension(baseConfig, level) {
  let acc = { ...baseConfig || baseRunConfig() };
  for (const def of activeAscensionMods(level)) {
    if (typeof def.apply !== "function") continue;
    const next = def.apply(acc, def);
    if (next !== void 0) acc = next;
  }
  return acc;
}

// ../../docs/games/metagame/stages/stage6/superboss.js
var SUPERBOSS_ID = "the-kernel-of-refusal";
var SUPERBOSS_PHASE_HP = [82, 88, 94];
var SUPERBOSS_PHASE_SCRIPTS = [
  // Phase 1 — SEQUENCE / DELAY: ordered pressure with a guard turn.
  [
    { label: "Ordered strike", attack: 6 },
    { label: "Deferred packet", attack: 8 },
    { label: "Reorder buffer", block: 8 }
  ],
  // Phase 2 — THROUGHPUT / CORRUPTION: punishes a wide turn, then steady attrition.
  [
    { label: "Congestion", congest: 2 },
    { label: "Overflow", attack: 8 },
    { label: "Corruption tick", attack: 6 }
  ],
  // Phase 3 — CHAIN / HANDSHAKE: reflects your turn, then the final refusal.
  [
    { label: "Reflection", mirror: 2 },
    { label: "Recursion strike", attack: 7 },
    { label: "The final refusal", attack: 9 }
  ]
];
function wireSuperboss(combat) {
  combat.superPhase = 0;
  combat.congestion = false;
  combat.enemy.hp = SUPERBOSS_PHASE_HP[0];
  combat.enemy.maxHp = SUPERBOSS_PHASE_HP[0];
  combat.enemy.armor = 0;
  combat.enemy.script = SUPERBOSS_PHASE_SCRIPTS[0].map((i) => ({ ...i }));
  combat.enemy.intentIndex = 0;
  rewireSuperboss(combat);
  return combat;
}
function rewireSuperboss(combat) {
  combat.advancePhase = (c) => {
    const next = (c.superPhase || 0) + 1;
    if (next >= SUPERBOSS_PHASE_HP.length) return false;
    c.superPhase = next;
    c.enemy.hp = SUPERBOSS_PHASE_HP[next];
    c.enemy.maxHp = SUPERBOSS_PHASE_HP[next];
    c.enemy.script = SUPERBOSS_PHASE_SCRIPTS[next].map((i) => ({ ...i }));
    c.enemy.intentIndex = 0;
    c.log = [...c.log || [], `The kernel reshapes — phase ${next + 1}.`].slice(-10);
    return true;
  };
  return combat;
}

// ../../docs/games/metagame/stages/stage6/run.js
var PLAYER_MAX_HP = 60;
var REST_HEAL_FRACTION = 0.3;
var REWARD_CHOICES = 3;
var HANDSHAKE_REWARD = { combat: 10, elite: 30, boss: 0 };
var SKIP_REWARD = 5;
var REMOVAL_BASE = 25;
var REMOVAL_STEP = 25;
var FINAL_BOSS_ACT = 6;
var FIRST_RUN_FINAL_ACT = 4;
var ACT_BOSSES = { 1: "kernel-panic", 2: "buffer-overflow", 3: "deadlock", 4: "session-hijack", 5: "stack-overflow" };
var PRESTIGE_HP_PER_VERSION = 5;
function finalActForWins(wins) {
  return (Number(wins) || 0) >= 1 ? FINAL_BOSS_ACT : FIRST_RUN_FINAL_ACT;
}
function finalActOf(run) {
  const n = Number(run?.finalAct);
  return Number.isFinite(n) && n >= 1 ? Math.min(FINAL_BOSS_ACT, n) : FINAL_BOSS_ACT;
}
function isVeteranRun(run) {
  return finalActOf(run) >= FINAL_BOSS_ACT;
}
function prestigeCost(version) {
  return (Number(version || 0) + 1) * 40;
}
function runScore(run) {
  if (!run) return 0;
  const won = run.status === "won";
  const actsCleared = won ? finalActOf(run) : Math.max(0, (run.act || 1) - 1);
  const base = Math.max(0, run.handshakes || 0) + actsCleared * 50 + Math.max(0, run.hp || 0);
  return Math.round(base * (1 + (run.ascension || 0) / 10));
}
function effectiveAscension(version = 0, ascension = 0) {
  return Math.max(0, Math.min(MAX_ASCENSION, Math.max(Number(version) || 0, Number(ascension) || 0)));
}
function createRun({ seed = 1, version = 0, handshakes = 0, ascension = 0, dailyKey = null, mode = "standard", finalAct = FINAL_BOSS_ACT } = {}) {
  const maxHp = PLAYER_MAX_HP + Number(version || 0) * PRESTIGE_HP_PER_VERSION;
  const ascensionLevel = effectiveAscension(version, ascension);
  const acts = Math.max(1, Math.min(FINAL_BOSS_ACT, Number(finalAct) || FINAL_BOSS_ACT));
  const cfg = foldAscension(baseRunConfig(), ascensionLevel);
  const run = {
    seed,
    version,
    ascension: ascensionLevel,
    // the effective rule level this run was built at (for recordClear)
    mode,
    // "standard" | "daily" | "custom" (for the run-end score / labelling)
    dailyKey,
    // the date/custom string the seed was derived from, or null
    finalAct: acts,
    // this run terminates victoriously at this act's boss (4 on a first run)
    map: generateRun(seed, acts),
    act: 1,
    currentNodeId: null,
    clearedIds: [],
    deck: [...STARTING_DECK],
    relics: [],
    potions: [],
    // the 2-slot consumable belt (potions.js); persisted with the run
    keys: [],
    // true-ending keys earned this run (3 ⇒ the hidden superboss opens after the boss)
    atSuperboss: false,
    // true while fighting the key-gated superboss
    superbossCleared: false,
    trueEnding: false,
    hp: maxHp,
    maxHp,
    handshakes,
    removalsPurchased: 0,
    status: "map",
    pendingReward: null,
    notice: null,
    // Ascension rule-modifier knobs (defaults = no modifier); foldAscension tuned them above.
    handshakeMult: cfg.handshakeMult,
    restHealMod: cfg.restHealMod,
    windowCapMod: cfg.windowCapMod,
    eliteHpBonus: cfg.eliteHpBonus,
    bossHpMult: cfg.bossHpMult,
    enemyHpMult: cfg.enemyHpMult,
    enemyArmorBonus: cfg.enemyArmorBonus,
    skipRewardMod: cfg.skipRewardMod,
    removalCostMod: cfg.removalCostMod,
    rewardChoicesMod: cfg.rewardChoicesMod,
    bossExtraPhase: cfg.bossExtraPhase,
    modifiers: activeAscensionMods(ascensionLevel).map((m) => m.id)
  };
  run.hp = Math.max(1, maxHp + (cfg.startHpMod || 0));
  for (let i = 0; i < Number(version || 0); i++) grantRelic(run, `prestige-${i}`);
  return run;
}
var KEY_UNTOUCHABLE = "untouchable";
var KEY_ASCETIC = "ascetic";
var KEY_SACRIFICE = "sacrifice";
var KEYS_FOR_SUPERBOSS = 3;
var KEY_ELITE_MAX_DMG = 5;
function awardKey(run, id) {
  if (!run) return false;
  if (!Array.isArray(run.keys)) run.keys = [];
  if (run.keys.includes(id)) return false;
  run.keys.push(id);
  return true;
}
function hasAllKeys(run) {
  return (run?.keys?.length || 0) >= KEYS_FOR_SUPERBOSS;
}
function availableNodes(run) {
  const act = run.map.acts[run.act - 1];
  if (!run.currentNodeId) return act.startIds.map((id) => nodeById(run.map, id));
  const node = nodeById(run.map, run.currentNodeId);
  return (node?.next || []).map((id) => nodeById(run.map, id));
}
function moveTo(run, nodeId2) {
  const options = availableNodes(run).map((n) => n.id);
  if (!options.includes(nodeId2)) return { ok: false, reason: "unreachable" };
  const node = nodeById(run.map, nodeId2);
  run.notice = null;
  run.currentNodeId = nodeId2;
  run.status = screenForNode(node);
  return { ok: true, node };
}
function enemyForCurrentNode(run, rng = makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`))) {
  if (run.atSuperboss) return SUPERBOSS_ID;
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return null;
  if (node.type === "boss") return run.act === finalActOf(run) ? "the-refused-connection" : ACT_BOSSES[run.act] || "kernel-panic";
  return enemyForNode(node, run.act, rng);
}
function resolveCombat(run, { win, hpRemaining }) {
  const hpBefore = run.hp;
  const node = nodeById(run.map, run.currentNodeId);
  if (typeof hpRemaining === "number") run.hp = Math.max(0, hpRemaining);
  if (!win || run.hp <= 0) {
    run.status = "dead";
    return { ok: true, status: "dead" };
  }
  run.clearedIds.push(node.id);
  if (node.type === "boss") return clearBoss(run);
  run.handshakes += Math.round((HANDSHAKE_REWARD[node.type] ?? HANDSHAKE_REWARD.combat) * (run.handshakeMult ?? 1));
  const reward = { cards: rollRewardCards(run, node.id) };
  if (node.type === "elite") {
    const relicId = grantRelic(run, node.id);
    if (relicId) reward.relic = relicId;
    if (hpBefore - run.hp <= KEY_ELITE_MAX_DMG) awardKey(run, KEY_UNTOUCHABLE);
  }
  const potionId = rollRewardPotion(run, node.id);
  if (potionId) reward.potion = potionId;
  run.pendingReward = reward;
  run.status = "reward";
  return { ok: true, status: "reward" };
}
function takeReward(run, cardId) {
  if (run.status !== "reward") return { ok: false, reason: "no-reward" };
  if (cardId && run.pendingReward?.cards.includes(cardId)) run.deck.push(cardId);
  else {
    run.handshakes += Math.max(0, SKIP_REWARD + (run.skipRewardMod || 0));
    awardKey(run, KEY_ASCETIC);
  }
  run.pendingReward = null;
  run.status = "map";
  return { ok: true, skipped: !cardId };
}
function rest(run, choice, payload) {
  const node = nodeById(run.map, run.currentNodeId);
  if (node?.type !== "rest") return { ok: false, reason: "not-rest" };
  if (choice === "heal") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * Math.max(0, REST_HEAL_FRACTION + (run.restHealMod || 0))));
  else if (choice === "upgrade") {
    const r = upgradeDeckCard(run, Number(payload));
    if (!r.ok) return r;
  } else if (choice === "remove") {
    awardKey(run, KEY_SACRIFICE);
  }
  run.clearedIds.push(node.id);
  run.status = "map";
  return { ok: true, hp: run.hp };
}
function upgradeDeckCard(run, index) {
  if (index < 0 || index >= run.deck.length) return { ok: false, reason: "bad-index" };
  const upgraded = upgradeIdFor(run.deck[index]);
  if (!upgraded) return { ok: false, reason: "not-upgradable" };
  run.deck[index] = upgraded;
  return { ok: true, id: upgraded };
}
function removeCard(run, index) {
  if (index < 0 || index >= run.deck.length) return { ok: false };
  run.deck.splice(index, 1);
  return { ok: true };
}
function closeNode(run) {
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return { ok: false };
  if (!run.clearedIds.includes(node.id)) run.clearedIds.push(node.id);
  run.status = "map";
  return { ok: true };
}
function buyCard(run, cardId, cost) {
  if (run.handshakes < cost) return { ok: false, reason: "poor" };
  if (!REWARD_POOL.includes(cardId)) return { ok: false, reason: "unavailable" };
  run.handshakes -= cost;
  run.deck.push(cardId);
  return { ok: true };
}
function removalCost(run) {
  return REMOVAL_BASE + Math.max(0, run?.removalCostMod || 0) + REMOVAL_STEP * (run.removalsPurchased || 0);
}
function buyRemoval(run, index) {
  const cost = removalCost(run);
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  if (index < 0 || index >= run.deck.length) return { ok: false, reason: "bad-index", cost };
  if (run.deck.length <= 1) return { ok: false, reason: "deck-floor", cost };
  run.handshakes -= cost;
  run.deck.splice(index, 1);
  run.removalsPurchased = (run.removalsPurchased || 0) + 1;
  return { ok: true, cost };
}
var UPGRADE_COST = 40;
var RELIC_COST = 65;
function buyUpgrade(run, index, cost = UPGRADE_COST) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const r = upgradeDeckCard(run, index);
  if (!r.ok) return r;
  run.handshakes -= cost;
  return { ok: true, id: r.id, cost };
}
function buyRelic(run, cost = RELIC_COST) {
  if (run.handshakes < cost) return { ok: false, reason: "poor", cost };
  const id = grantRelic(run, `shop:${run.currentNodeId}`);
  if (!id) return { ok: false, reason: "sold-out", cost };
  run.handshakes -= cost;
  return { ok: true, relic: id, cost };
}
function seatAtFinalBoss(run, deck) {
  const finalAct = finalActOf(run);
  run.act = finalAct;
  const bossNode = run.map.acts[finalAct - 1].layers.at(-1)[0];
  run.currentNodeId = bossNode.id;
  run.status = "boss";
  run.pendingReward = null;
  run.notice = null;
  if (Array.isArray(deck)) run.deck = [...deck];
  return bossNode.id;
}
var BOSS_RELIC_CHOICES = 3;
function clearBoss(run) {
  if (run.act >= finalActOf(run)) {
    if (hasAllKeys(run) && !run.superbossCleared && !run.atSuperboss) {
      run.atSuperboss = true;
      run.currentNodeId = `${run.currentNodeId}:superboss`;
      run.status = "superboss";
      return { ok: true, status: "superboss" };
    }
    run.status = "won";
    return { ok: true, status: "won" };
  }
  const offered = rollRelics(hashSeed(run.seed, `boss-clear-act${run.act}:relics`), run.relics, BOSS_RELIC_CHOICES);
  run.pendingReward = { relics: offered };
  run.status = "boss-reward";
  return { ok: true, status: "boss-reward", offered };
}
function takeBossRelic(run, relicId) {
  if (run.status !== "boss-reward") return { ok: false, reason: "no-reward" };
  const offered = run.pendingReward?.relics || [];
  let granted = null;
  if (relicId && offered.includes(relicId) && !run.relics.includes(relicId)) {
    run.relics.push(relicId);
    granted = relicId;
  }
  run.pendingReward = null;
  run.act += 1;
  run.currentNodeId = null;
  run.status = "map";
  if (granted) run.notice = `Relic acquired — ${relicById(granted)?.name || granted}`;
  return { ok: true, advancedToAct: run.act, relic: granted };
}
function awardRelic(run, key = "event") {
  return grantRelic(run, key);
}
function grantRelic(run, key) {
  const id = rollRelic(hashSeed(run.seed, `${key}:relic`), run.relics);
  if (id) run.relics.push(id);
  return id;
}
function rollRewardPotion(run, nodeId2) {
  const gate = makeRng(hashSeed(run.seed, `${nodeId2}:potion-drop`))();
  if (gate >= POTION_DROP_CHANCE) return null;
  return rollPotion(hashSeed(run.seed, `${nodeId2}:potion-pick`));
}
function rollRewardCards(run, nodeId2) {
  const choices = Math.max(1, REWARD_CHOICES + (run.rewardChoicesMod || 0));
  return draftRewardCards(hashSeed(run.seed, nodeId2), run.act, choices);
}
function screenForNode(node) {
  if (node.type === "combat" || node.type === "elite") return "combat";
  if (node.type === "boss") return "boss";
  return node.type;
}

// ../../docs/games/metagame/stages/stage6/events.js
var RARE_POOL = REWARD_POOL.filter((id) => cardById(id)?.rarity === "rare");
var COMMON_POOL = REWARD_POOL.filter((id) => cardById(id)?.rarity === "common");
function damage(run, n) {
  run.hp = Math.max(1, run.hp - n);
}
function heal(run, n) {
  run.hp = Math.min(run.maxHp, run.hp + n);
}
function relicNotice(run, key) {
  const id = awardRelic(run, key);
  const name = id ? cardById(id)?.name || id : null;
  return id ? `Relic acquired — ${name || id}.` : "No protocol left to acquire.";
}
function potionNotice(run, rng, key) {
  const id = rollPotion(hashSeed(run.seed, `${run.currentNodeId}:${key}`));
  const r = addPotion(run, id);
  return r.ok ? `Potion stowed — ${id}.` : `Potion ${id} found, but the belt is full.`;
}
function randomDeckIndex(run, rng, key, filter) {
  const idxs = run.deck.map((id, i) => i).filter((i) => filter ? filter(run.deck[i]) : true);
  if (!idxs.length) return -1;
  return idxs[rng.int(idxs.length, key)];
}
var EVENTS = [
  {
    id: "defragmenter",
    weight: 2,
    title: "A Defragmenter idles in the corridor",
    text: "It offers to tidy your passage — or to optimize you, which it does not define.",
    choices: [
      { id: "scan", label: "accept payment — +12 handshakes", apply: (run) => {
        run.handshakes += 12;
        return "+12 handshakes.";
      } },
      { id: "defrag", label: "let it optimize you — heal 30% HP", apply: (run) => {
        heal(run, Math.round(run.maxHp * 0.3));
        return "Defragmented — HP restored.";
      } },
      { id: "rewrite", label: "let it rewrite a protocol — +relic, −8 HP", apply: (run) => {
        damage(run, 8);
        return relicNotice(run, "defrag-rewrite");
      } }
    ]
  },
  {
    id: "orphaned-socket",
    weight: 2,
    title: "An orphaned socket dangles open",
    text: "Unclaimed handshakes still trickle from it, but reaching in stings.",
    choices: [
      { id: "claim", label: "claim the trickle — +18 handshakes, −5 HP", apply: (run) => {
        run.handshakes += 18;
        damage(run, 5);
        return "+18 handshakes (−5 HP).";
      } }
    ]
  },
  {
    id: "deprecated-api",
    weight: 2,
    title: "A deprecated API still answers",
    text: "It will rewrite one of your protocols into something it remembers — you don't get to choose what.",
    choices: [
      { id: "transform", label: "transform a random card", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i");
        if (i < 0) return "Nothing to transform.";
        const was = run.deck[i];
        run.deck[i] = rng.pick(REWARD_POOL, "card");
        return `${was} → ${run.deck[i]}.`;
      } }
    ]
  },
  {
    id: "cron-job",
    weight: 2,
    title: "A cron job is mid-cycle",
    text: "Wait for the maintenance window and ride its housekeeping.",
    choices: [
      { id: "wait", label: "wait it out — heal 15% HP, +10 handshakes", apply: (run) => {
        heal(run, Math.round(run.maxHp * 0.15));
        run.handshakes += 10;
        return "Maintenance complete (+heal, +10).";
      } }
    ]
  },
  {
    id: "honeypot",
    weight: (act) => act + 1,
    acts: [2, 3, 4],
    title: "A honeypot glitters with rare protocols",
    text: "Tempting bait — take the prize and the bite both.",
    choices: [
      { id: "take", label: "take the bait — free rare card + relic, −8 HP", apply: (run, rng) => {
        const card = rng.pick(RARE_POOL.length ? RARE_POOL : REWARD_POOL, "card");
        run.deck.push(card);
        damage(run, 8);
        return `${card} taken. ${relicNotice(run, "honeypot")}`;
      } }
    ]
  },
  {
    id: "kernel-module",
    weight: 2,
    title: "A kernel module exposes its source",
    text: "Recompile one of your protocols sharper — it costs blood to patch live.",
    choices: [
      { id: "patch", label: "recompile a card — upgrade one, −8 HP", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i", (id) => canUpgrade(id));
        if (i < 0) return "Nothing left to upgrade.";
        const r = upgradeDeckCard(run, i);
        if (!r.ok) return "Nothing left to upgrade.";
        damage(run, 8);
        return `Upgraded to ${r.id} (−8 HP).`;
      } }
    ]
  },
  {
    id: "mirror-port",
    weight: 1,
    acts: [1, 2, 3],
    title: "A mirror port reflects your traffic",
    text: "It can echo one of your protocols into a duplicate.",
    choices: [
      { id: "duplicate", label: "duplicate a random card", apply: (run, rng) => {
        const i = randomDeckIndex(run, rng, "i");
        if (i < 0) return "Nothing to duplicate.";
        run.deck.push(run.deck[i]);
        return `Duplicated ${run.deck[i]}.`;
      } }
    ]
  },
  {
    id: "garbage-collector",
    weight: 2,
    title: "A garbage collector sweeps through",
    text: "It will reap one dead protocol from your deck, free of charge.",
    choices: [
      { id: "collect", label: "let it reap a random card", apply: (run, rng) => {
        if (run.deck.length <= 1) return "Deck too thin to reap.";
        const i = randomDeckIndex(run, rng, "i");
        const was = run.deck[i];
        removeCard(run, i);
        return `Reaped ${was}.`;
      } }
    ]
  },
  {
    id: "buffer-bloat",
    weight: 2,
    acts: [1, 2],
    title: "Buffer bloat swells your queues",
    text: "Bigger buffers, at the price of banked handshakes.",
    choices: [
      { id: "expand", label: "expand buffers — +12 max HP, −15 handshakes", apply: (run) => {
        run.maxHp += 12;
        run.hp += 12;
        run.handshakes = Math.max(0, run.handshakes - 15);
        return "+12 max HP (−15 handshakes).";
      } }
    ]
  },
  {
    id: "memory-pool",
    weight: 2,
    title: "A memory pool holds a loose vial",
    text: "Someone left a consumable cooling in the cache.",
    choices: [
      { id: "take", label: "take the potion", apply: (run, rng) => potionNotice(run, rng, "memory-pool") }
    ]
  },
  {
    id: "checksum-mismatch",
    weight: 2,
    title: "A checksum mismatch flickers",
    text: "Force a recompute and gamble — it resolves to treasure or to harm.",
    choices: [
      { id: "gamble", label: "force a recompute (50/50)", apply: (run, rng) => {
        if (rng.float("g") < 0.5) return `Checksum cleared. ${relicNotice(run, "checksum")}`;
        damage(run, 10);
        return "Checksum corrupt — −10 HP.";
      } }
    ]
  },
  {
    id: "stale-cache",
    weight: 2,
    title: "A stale cache lingers",
    text: "Purge it: drop one protocol and reclaim its storage as handshakes.",
    choices: [
      { id: "purge", label: "purge — remove a random card, +12 handshakes", apply: (run, rng) => {
        run.handshakes += 12;
        if (run.deck.length <= 1) return "+12 handshakes (deck too thin to purge).";
        const i = randomDeckIndex(run, rng, "i");
        const was = run.deck[i];
        removeCard(run, i);
        return `Purged ${was}, +12 handshakes.`;
      } }
    ]
  },
  {
    id: "packet-sniffer",
    weight: 2,
    title: "A packet sniffer logs the wire",
    text: "Read the capture for coin, or splice in a fresh protocol.",
    choices: [
      { id: "read", label: "read the capture — +handshakes by deck size", apply: (run) => {
        const g = 2 * run.deck.length;
        run.handshakes += g;
        return `+${g} handshakes.`;
      } },
      { id: "splice", label: "splice a fresh card", apply: (run, rng) => {
        const c = rng.pick(COMMON_POOL.length ? COMMON_POOL : REWARD_POOL, "c");
        run.deck.push(c);
        return `Spliced ${c}.`;
      } }
    ]
  },
  {
    id: "daemon-offering",
    weight: 1,
    title: "A daemon waits for an offering",
    text: "Feed it vitality and it leaves a relic in trade.",
    choices: [
      { id: "offer", label: "sacrifice 12 HP for a relic", apply: (run) => {
        damage(run, 12);
        return relicNotice(run, "daemon");
      } }
    ]
  }
];
var BY_ID4 = new Map(EVENTS.map((e) => [e.id, e]));
function eventById(id) {
  return BY_ID4.get(id) || null;
}
function weightFor(event, act) {
  if (event.acts && !event.acts.includes(act)) return 0;
  return typeof event.weight === "function" ? event.weight(act) : event.weight ?? 1;
}
function eventForNode(run, nodeId2 = run.currentNodeId) {
  const pool = EVENTS.filter((e) => weightFor(e, run.act) > 0);
  if (!pool.length) return EVENTS[0];
  const total = pool.reduce((s, e) => s + weightFor(e, run.act), 0);
  let r = makeRng(hashSeed(run.seed, `${nodeId2}:event-pick`))() * total;
  for (const e of pool) {
    r -= weightFor(e, run.act);
    if (r < 0) return e;
  }
  return pool[pool.length - 1];
}
function makeEventRng(run, eventId) {
  const base = (key) => makeRng(hashSeed(run.seed, `${run.currentNodeId}:${eventId}:${key}`))();
  return { float: base, int: (n, key) => Math.floor(base(key) * n), pick: (list, key) => list[Math.floor(base(key) * list.length)] };
}
function applyEventChoice(run, eventId, choiceId) {
  const event = eventById(eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, notice: null };
  const notice = choice.apply(run, makeEventRng(run, eventId)) || null;
  return { ok: true, notice };
}

// ../../docs/games/metagame/stages/stage6/renderer.js
import { banner as banner2 } from "../../shared/feedback.js";

// ../../docs/games/metagame/stages/stage6/boss-combat.js
var BOSS_PHASE_HP = { 1: 60, 2: 80, 3: 60, 4: 60 };
var DEMAND_LEAD_SYN = "lead-syn";
var DEMAND_ACK_FIRST = "ack-first";
function baseId2(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}
function currentDemand(combat) {
  const phase = combat.bossPhase || 1;
  if (phase === 1) return DEMAND_LEAD_SYN;
  if (phase === 2) return DEMAND_ACK_FIRST;
  return combat.turn % 2 === 1 ? DEMAND_LEAD_SYN : DEMAND_ACK_FIRST;
}
function ackPlayed(combat) {
  return combat.playedIdsThisTurn.some((id) => baseId2(id) === "ACK");
}
function demandMet(combat) {
  return currentDemand(combat) === DEMAND_LEAD_SYN ? baseId2(combat.playedIdsThisTurn[0]) === "SYN" : ackPlayed(combat);
}
function accepts(combat, card) {
  if (combat.bossLocked) return false;
  return demandMet(combat);
}
function phaseHp(phase, hpMult) {
  return Math.round(BOSS_PHASE_HP[phase] * (hpMult || 1));
}
function wireBossCombat(combat, { locked = false, hpMult = 1, extraPhase = false } = {}) {
  combat.bossPhase = 1;
  combat.bossLocked = Boolean(locked);
  combat.bossHpMult = hpMult;
  combat.bossMaxPhase = extraPhase ? 4 : 3;
  combat.enemy.hp = phaseHp(1, hpMult);
  combat.enemy.maxHp = phaseHp(1, hpMult);
  rewireBossCombat(combat);
  return combat;
}
function rewireBossCombat(combat) {
  combat.acceptance = accepts;
  combat.advancePhase = (c) => {
    const phase = c.bossPhase || 1;
    if (phase >= (c.bossMaxPhase || 3)) return false;
    c.bossPhase = phase + 1;
    c.enemy.hp = phaseHp(c.bossPhase, c.bossHpMult);
    c.enemy.maxHp = phaseHp(c.bossPhase, c.bossHpMult);
    c.log = [...c.log || [], `Phase ${c.bossPhase}.`].slice(-10);
    return true;
  };
  return combat;
}
function autoNegotiate(combat, maxTurns = 80) {
  let turns = 0;
  while (!combat.over && turns++ < maxTurns) {
    playHandshakeTurn(combat);
    if (combat.over) break;
    endTurn(combat);
  }
  return combat;
}
function playHandshakeTurn(combat) {
  if (currentDemand(combat) === DEMAND_LEAD_SYN) playFirstMatch(combat, (c) => baseId2(c.id) === "SYN");
  else playFirstMatch(combat, (c) => c.type === "Protocol");
  let guard = 0;
  while (guard++ < 20 && playFirstMatch(combat, () => true)) {
  }
}
function playFirstMatch(combat, pred) {
  for (let i = 0; i < combat.hand.length; i++) {
    const card = cardById(combat.hand[i]);
    if (!card || card.cost > combat.player.energy) continue;
    if (!pred(card)) continue;
    playCard(combat, i);
    return true;
  }
  return false;
}

// ../../docs/games/metagame/stages/stage6/testhook.js
var REPRESENTATIVE_ENDGAME_DECK = [
  "SYN+",
  "SYN+",
  "ACK",
  "ACK",
  "PRIORITY_PACKET",
  "PRIORITY_PACKET+",
  "TCP_STACK+",
  "ONION",
  "FLOOD",
  "HANDSHAKE",
  "FIREWALL",
  "REPLAY+",
  "PROBE+",
  "NULL_ROUTE",
  "BURST_FRAME",
  "DDOS+"
];
var REPRESENTATIVE_ENDGAME_HP = 50;
var ENDGAME_FIXTURE_SEED = 7;
function installStage6TestHook(api) {
  const {
    state,
    combatRun,
    runScore: runScore2,
    seatAtFinalBoss: seatAtFinalBoss2,
    runAutoNegotiate,
    playCard: playCard2,
    endTurn: endTurn2,
    cardById: cardById2,
    beginRun,
    commit,
    makeCombat,
    finishCombat,
    getCombat,
    setCombat,
    setDailyKeyOverride
  } = api;
  window.__fvStage6 = {
    // Start a run in a given mode ("standard"|"daily"|"custom"); returns the derived seed + mode so a
    // test can assert that the same date/custom key reproduces the same run.
    beginRun(opts) {
      beginRun(opts || {});
      commit();
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
    setDailyKey(key) {
      setDailyKeyOverride(key ? String(key) : null);
    },
    // The current run's self-competition score, plus the meta high-water marks.
    score() {
      return {
        run: state.run ? runScore2(state.run) : 0,
        best: state.meta.bestScore || 0,
        last: state.meta.lastScore || 0,
        lastMode: state.meta.lastMode || null
      };
    },
    // Grant the true-ending keys on the current run (a real run earns them via the
    // untouchable/ascetic/sacrifice challenges). Returns the key count.
    grantKeys(n = 3) {
      if (!state.run) {
        beginRun();
        commit();
      }
      state.run.keys = ["untouchable", "ascetic", "sacrifice"].slice(0, Math.max(0, Math.min(3, n)));
      commit();
      return state.run.keys.length;
    },
    // Equip the REPRESENTATIVE end-game loadout for the bonus fight (deck + HP + a pinned seed). This
    // stands in for the deck-building of acts 1–5 the test path skips — it is NOT a second un-cheat:
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
      run.seed = ENDGAME_FIXTURE_SEED;
      setCombat(null);
      if (combatRun) combatRun.reset();
      commit();
      return { ok: true, deckSize: run.deck.length, hp: run.hp };
    },
    // Drive the key-gated superboss to its end with the REAL deck (play all affordable cards each
    // turn). Not a bypass — it uses the normal engine. Returns the outcome.
    autoSuperboss(maxTurns = 120) {
      const run = state.run;
      if (!run || run.status !== "superboss") return { ok: false, reason: "not-at-superboss" };
      let combat = getCombat();
      if (!combat || combat.nodeId !== run.currentNodeId) {
        combat = makeCombat(run);
        setCombat(combat);
      }
      const startHp = combat.player.hp;
      let turns = 0;
      while (!combat.over && turns++ < maxTurns) {
        let guard = 0;
        while (guard++ < 30 && !combat.over) {
          const idx = combat.hand.findIndex((id) => {
            const c = cardById2(id);
            return c && c.cost <= combat.player.energy;
          });
          if (idx < 0) break;
          playCard2(combat, idx);
        }
        if (combat.over) break;
        endTurn2(combat);
      }
      const result = combat.result ?? null;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, status: state.run?.status, trueEnding: Boolean(state.run?.trueEnding), keys: run.keys?.length || 0, startHp, endHp: combat.player.hp, turns };
    },
    // Seat a run directly at the act-6 boss so the harness reaches the negotiation in one hop.
    jumpToBoss(deck) {
      if (!state.run) beginRun();
      seatAtFinalBoss2(state.run, deck);
      state.ui.screen = "run";
      if (combatRun) combatRun.reset();
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
      if (!combat || combat.nodeId !== run.currentNodeId) {
        combat = makeCombat(run);
        setCombat(combat);
      }
      runAutoNegotiate(combat, maxTurns);
      const enemyHp = combat.enemy?.hp;
      const result = combat.result;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, enemyHp, bossDefeated: Boolean(state.boss.defeated), won: state.run?.status === "won" };
    }
  };
}
function removeStage6TestHook() {
  if (window.__fvStage6) delete window.__fvStage6;
}

// ../../docs/games/metagame/stages/stage6/combat-persist.js
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
function snapshotCombat(combat) {
  return {
    nodeId: combat.nodeId ?? null,
    rngSeed: combat.rngSeed,
    rngSteps: typeof combat.rng?.steps === "function" ? combat.rng.steps() : 0,
    congestion: Boolean(combat.congestion),
    window: combat.window,
    windowCap: combat.windowCap,
    windowDecay: combat.windowDecay,
    noShrinkNextTurn: Boolean(combat.noShrinkNextTurn),
    jamPending: Boolean(combat.jamPending),
    firstCardDiscount: combat.firstCardDiscount || 0,
    delaySpeedup: Boolean(combat.delaySpeedup),
    delayUsed: Boolean(combat.delayUsed),
    corruptionBonus: combat.corruptionBonus || 0,
    corruptionDouble: Boolean(combat.corruptionDouble),
    turn: combat.turn,
    cardsPlayedThisTurn: combat.cardsPlayedThisTurn || 0,
    energySpentThisTurn: combat.energySpentThisTurn || 0,
    chainThisTurn: combat.chainThisTurn || 0,
    playedIdsThisTurn: [...combat.playedIdsThisTurn || []],
    lastCardPlayed: combat.lastCardPlayed ?? null,
    over: Boolean(combat.over),
    result: combat.result ?? null,
    log: [...combat.log || []],
    player: clone(combat.player),
    enemy: clone(combat.enemy),
    draw: [...combat.draw || []],
    hand: [...combat.hand || []],
    discard: [...combat.discard || []],
    exhaust: [...combat.exhaust || []],
    jammed: [...combat.jammed || []],
    pending: clone(combat.pending || []),
    boss: combat.bossPhase ? { phase: combat.bossPhase, locked: Boolean(combat.bossLocked), hpMult: combat.bossHpMult || 1, maxPhase: combat.bossMaxPhase || 3 } : null,
    // The key-gated superboss only needs its phase index persisted; its per-phase HP/script are
    // already in the cloned enemy. The advancePhase closure is rebuilt on restore via rewireSuperboss.
    superboss: combat.superPhase != null ? { phase: combat.superPhase } : null
  };
}
function restoreCombat(snapshot, { relics = [] } = {}) {
  const s = snapshot || {};
  const combat = {
    rng: makeTrackedRng(s.rngSeed, s.rngSteps || 0),
    rngSeed: s.rngSeed,
    relics,
    congestion: Boolean(s.congestion),
    window: s.window,
    windowCap: s.windowCap,
    windowDecay: s.windowDecay,
    noShrinkNextTurn: Boolean(s.noShrinkNextTurn),
    jamPending: Boolean(s.jamPending),
    firstCardDiscount: s.firstCardDiscount || 0,
    delaySpeedup: Boolean(s.delaySpeedup),
    delayUsed: Boolean(s.delayUsed),
    corruptionBonus: s.corruptionBonus || 0,
    corruptionDouble: Boolean(s.corruptionDouble),
    player: clone(s.player),
    enemy: clone(s.enemy),
    draw: [...s.draw || []],
    hand: [...s.hand || []],
    discard: [...s.discard || []],
    exhaust: [...s.exhaust || []],
    jammed: [...s.jammed || []],
    pending: clone(s.pending || []),
    turn: s.turn,
    cardsPlayedThisTurn: s.cardsPlayedThisTurn || 0,
    energySpentThisTurn: s.energySpentThisTurn || 0,
    chainThisTurn: s.chainThisTurn || 0,
    playedIdsThisTurn: [...s.playedIdsThisTurn || []],
    lastCardPlayed: s.lastCardPlayed ?? null,
    over: Boolean(s.over),
    result: s.result ?? null,
    log: [...s.log || []]
  };
  combat.nodeId = s.nodeId ?? null;
  if (s.boss) {
    combat.bossPhase = s.boss.phase;
    combat.bossLocked = Boolean(s.boss.locked);
    combat.bossHpMult = s.boss.hpMult || 1;
    combat.bossMaxPhase = s.boss.maxPhase || 3;
    rewireBossCombat(combat);
  }
  if (s.superboss) {
    combat.superPhase = s.superboss.phase || 0;
    rewireSuperboss(combat);
  }
  return combat;
}

// ../../docs/games/metagame/stages/stage6/renderer.js
import { createRun as createRunState } from "../../shared/run-state.js";
import { createAscension } from "../../shared/ascension.js";

// ../../docs/games/metagame/stages/stage6/card-face.js
function cardTypeClass(card) {
  return `s6db-card--${(card?.type || "").toLowerCase()}`;
}
function cardFaceInner(id) {
  const card = cardById(id);
  const upgraded = Boolean(card?.upgraded) || typeof id === "string" && id.endsWith("+");
  const name = card?.name || String(id).replace(/\+$/, "");
  return `
    <span class="s6db-card-strip" aria-hidden="true"></span>
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    ${upgraded ? `<span class="s6db-card-badge" title="upgraded">+</span>` : ""}
    <strong class="s6db-card-name">${esc(name)}</strong>
    <span class="s6db-card-type">${esc(card?.type || "")}</span>
    <small class="s6db-card-text">${esc(card?.text || "")}</small>`;
}
function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage6/ui-combat.js
var STATUS_LABEL = { strength: "STR", vulnerable: "VULN", weak: "WEAK" };
var TIER_BADGE = { elite: "☠ ELITE", boss: "☣ BOSS" };
var PHASE_NAME = { 1: "HANDSHAKE", 2: "ESTABLISHED", 3: "MAINTAIN" };
var DEMAND_TEXT = {
  "lead-syn": "lead this turn with SYN, or your Signals are refused.",
  "ack-first": "play an ACK before your Signals, or they are refused."
};
function phaseRuleText(combat) {
  const phase = combat.bossPhase || 1;
  const demand = currentDemand(combat);
  const mutating = phase === 3 ? "MUTATING — " : "";
  return `${PHASE_NAME[phase] || ""} — ${mutating}${DEMAND_TEXT[demand] || ""}`;
}
function normalizePending(idx, combat) {
  return idx == null || idx < 0 || idx >= combat.hand.length ? null : idx;
}
function eliteTelegraph(combat, run) {
  if (combat.enemy?.tier !== "elite" || !isVeteranRun(run) || (run?.keys || []).includes("untouchable")) return "";
  return `<p class="s6db-telegraph">take ≤5 damage this fight to earn the untouchable key ⚷</p>`;
}
function combatView(combat, run, opts = {}) {
  const el = document.createElement("div");
  el.className = "s6db-combat";
  const intent = currentIntent(combat);
  const pending = normalizePending(opts.pendingCardIndex, combat);
  const arena = arenaStrip(combat);
  el.innerHTML = `
    ${bossBanner(combat)}
    ${eliteTelegraph(combat, run)}
    <div class="s6db-battlefield">
      ${enemyPanel(combat.enemy, intent, combat)}
      ${playerPanel(combat.player)}
    </div>
    <div class="s6db-arena${arena ? "" : " is-empty"}">${arena}</div>
    ${inspectOverlay(combat, pending)}
    <div class="s6db-dock">
      <div class="s6db-dock-left">
        ${energyBlock(combat)}
        ${potionBelt(run)}
      </div>
      <div class="s6db-hand" aria-label="hand"></div>
      <div class="s6db-dock-right">
        ${pileChips(combat)}
        <button type="button" class="s6db-endturn" data-action="end-turn">end turn ▸</button>
      </div>
    </div>`;
  const hand = el.querySelector(".s6db-hand");
  hand.replaceChildren(...combat.hand.map((id, i) => handCard(id, i, combat.hand.length, combat.player.energy, pending)));
  return el;
}
function bossBanner(combat) {
  if (!combat.bossPhase) return "";
  const locked = Boolean(combat.bossLocked);
  return `
    <div class="s6db-boss-banner${locked ? " is-locked" : ""}">
      <div class="s6db-boss-banner-head">
        <strong>THE REFUSED CONNECTION</strong>
        <span class="s6db-boss-phase">phase ${combat.bossPhase} / 3</span>
      </div>
      <p class="s6db-boss-rule">${esc2(phaseRuleText(combat))}</p>
      ${locked ? `<p class="s6db-boss-mismatch">PROTOCOL MISMATCH — every Signal deals 0 until you read Chapter 9.</p>
           <button type="button" data-action="epub">open the codex</button>` : ""}
    </div>`;
}
function arenaStrip(combat) {
  const lines = (combat.log || []).slice(-2);
  const ticker = lines.length ? `<div class="s6db-ticker">${lines.map((l) => `<p>${esc2(l)}</p>`).join("")}</div>` : "";
  const logChip = (combat.log || []).length ? `<button type="button" class="s6db-chip" data-log>log ▾</button>` : "";
  return `${ticker}${jammedRow(combat)}${logChip ? `<div class="s6db-arena-tools">${logChip}</div>` : ""}`;
}
function describeIntent(intent, combat) {
  if (!intent) return { kind: "unknown", icon: "…", primary: "—", detail: "" };
  if (intent.mirror) {
    const reflect = intent.mirror * (combat?.cardsPlayedThisTurn || 0);
    return { kind: "mirror", icon: "🪞", primary: `${intent.mirror}×`, detail: `mirror · ~${reflect} now` };
  }
  if (intent.attack) {
    const hits = intent.hits || 1;
    const each = intent.attack + (intent.ramp ? intent.ramp * (combat?.enemy?.rttStacks || 0) : 0);
    const total = each * hits;
    return {
      kind: intent.pierce ? "pierce" : "attack",
      icon: intent.pierce ? "⚡" : "⚔",
      primary: String(total),
      detail: (hits > 1 ? `${each}×${hits}` : "") + (intent.ramp ? " ⏫ growing" : "") + (intent.pierce ? " unblockable" : "")
    };
  }
  if (intent.block) return { kind: "block", icon: "🛡", primary: String(intent.block), detail: "defend" };
  if (intent.applyPlayer) return { kind: "debuff", icon: "☣", primary: intent.applyPlayer.status, detail: "debuff" };
  if (intent.applySelf) return { kind: "buff", icon: "▲", primary: intent.applySelf.status, detail: "buff" };
  return { kind: "wait", icon: "…", primary: "—", detail: "" };
}
function enemyPanel(enemy, intent, combat) {
  const d = describeIntent(intent, combat);
  const tier = TIER_BADGE[enemy.tier];
  return `
    <section class="s6db-fighter s6db-enemy s6db-enemy--${enemy.tier || "standard"}">
      <div class="s6db-fighter-top">
        <span class="s6db-fighter-name">${esc2(enemy.name)}</span>
        ${tier ? `<span class="s6db-tier s6db-tier--${enemy.tier}">${tier}</span>` : ""}
      </div>
      ${bar(enemy.hp, enemy.maxHp, "enemy")}
      <div class="s6db-hp">HP ${enemy.hp} / ${enemy.maxHp}</div>
      <div class="s6db-meta">
        ${enemy.block ? `<span class="s6db-block">🛡 ${enemy.block}</span>` : ""}
        ${enemy.armor ? `<span class="s6db-armor">armor ${enemy.armor}</span>` : ""}
      </div>
      ${statusChips(enemy.statuses)}
      <div class="s6db-intent s6db-intent--${d.kind}" title="${esc2(intent?.label || "")}">
        <span class="s6db-intent-icon">${d.icon}</span>
        <span class="s6db-intent-num">${esc2(d.primary)}</span>
        <span class="s6db-intent-detail">${esc2(d.detail || intent?.label || "")}</span>
      </div>
      ${nextIntentTelegraph(enemy, combat)}
    </section>`;
}
function playerPanel(player) {
  return `
    <section class="s6db-fighter s6db-player">
      <div class="s6db-fighter-top"><span class="s6db-fighter-name">You</span></div>
      ${bar(player.hp, player.maxHp, "player")}
      <div class="s6db-hp">HP ${player.hp} / ${player.maxHp}</div>
      <div class="s6db-meta">
        <span class="s6db-block">🛡 ${player.block}</span>
      </div>
      ${statusChips(player.statuses)}
    </section>`;
}
function potionBelt(run) {
  const potions = run?.potions || [];
  if (!potions.length) return "";
  const chips = potions.map((id, i) => {
    const p = potionById(id);
    return `<button type="button" class="s6db-potion" data-potion="${i}" title="${esc2(p?.text || "")}">⚗ ${esc2(p?.name || id)}</button>`;
  }).join("");
  return `<div class="s6db-potions" aria-label="potion belt"><span class="s6db-potions-label">BELT:</span> ${chips}</div>`;
}
function jammedRow(combat) {
  if (!combat.jammed || !combat.jammed.length) return "";
  const chips = combat.jammed.map((id) => `<span class="s6db-card--jammed" title="Packet Loss — jammed">⛔ ${esc2(id)}</span>`).join("");
  return `<p class="s6db-jammed"><span class="s6db-jammed-label">JAMMED:</span> ${chips}</p>`;
}
function nextIntentTelegraph(enemy, combat) {
  const script = enemy.script;
  if (!script || script.length < 2) return "";
  const next = script[(enemy.intentIndex + 1) % script.length];
  const d = describeIntent(next, combat);
  return `<div class="s6db-intent-next" title="${esc2(next?.label || "")}">then ${d.icon} <strong>${esc2(d.primary)}</strong></div>`;
}
function energyBlock(combat) {
  const { energy, maxEnergy } = combat.player;
  const total = Math.max(maxEnergy, energy);
  let pips = "";
  for (let i = 0; i < total; i++) pips += `<span class="s6db-pip${i < energy ? " is-full" : ""}"></span>`;
  return `<div class="s6db-energy" aria-label="energy">
    <span class="s6db-pips" aria-hidden="true">${pips}</span>
    <span class="s6db-energy-num">${energy}/${maxEnergy}</span>
    ${combat.congestion && (combat.turn || 1) > 1 ? `<span class="s6db-window">⇄ ${combat.window}/${combat.windowCap}</span>` : ""}
  </div>`;
}
function pileChips(combat) {
  const chip = (kind, n, label) => `<button type="button" class="s6db-pilechip" data-pile="${kind}">${label} <b>${n}</b></button>`;
  return `<div class="s6db-pilechips">
    ${chip("draw", combat.draw.length, "draw")}
    ${chip("discard", combat.discard.length, "disc")}
    ${combat.exhaust.length ? chip("exhaust", combat.exhaust.length, "exh") : ""}
  </div>`;
}
function handCard(id, index, count, energy, pending) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card ${cardTypeClass(card)}`;
  button.dataset.inspect = String(index);
  if (!(card && card.cost <= energy)) button.classList.add("is-unaffordable");
  if (pending === index) button.classList.add("is-pending");
  const mid = (count - 1) / 2;
  const t = count > 1 ? (index - mid) / mid : 0;
  button.style.setProperty("--rot", `${(t * 6).toFixed(2)}deg`);
  button.style.setProperty("--ty", `${(t * t * 16).toFixed(1)}px`);
  button.style.setProperty("--z", String(index));
  button.innerHTML = cardFaceInner(id);
  return button;
}
function inspectOverlay(combat, idx) {
  if (idx == null) return "";
  const id = combat.hand[idx];
  const card = cardById(id);
  const affordable = card && card.cost <= combat.player.energy;
  return `<div class="s6db-inspect" role="dialog" aria-label="inspect card">
    <div class="s6db-inspect-card s6db-card ${cardTypeClass(card)}">${cardFaceInner(id)}</div>
    <div class="s6db-inspect-actions">
      <button type="button" class="s6db-play-btn" data-play="${idx}"${affordable ? "" : " disabled"}>play ▸</button>
      <span class="s6db-inspect-hint">${affordable ? "Enter plays · Esc cancels" : "not enough energy"}</span>
    </div>
  </div>`;
}
function statusChips(statuses) {
  const keys = Object.keys(statuses || {}).filter((k) => statuses[k]);
  if (!keys.length) return "";
  return `<div class="s6db-status">${keys.map((k) => `<span class="s6db-status-chip s6db-status-chip--${k}">${STATUS_LABEL[k] || k.toUpperCase()} ${statuses[k]}</span>`).join("")}</div>`;
}
function bar(value, max, who) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0;
  return `<div class="s6db-bar s6db-bar--${who}"><span style="width:${pct}%"></span></div>`;
}
function esc2(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage6/combat-fx.js
import { flash, shake, floatNum, banner } from "../../shared/feedback.js";
var reduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function applyCombatFx(node, fx) {
  if (!node || !fx) return;
  const enemy = node.querySelector(".s6db-enemy");
  const player = node.querySelector(".s6db-player");
  const arena = node.querySelector(".s6db-arena");
  if (fx.banner && arena) banner(arena, fx.banner);
  if (fx.fly && arena) flyCard(fx.fly, arena);
  if (fx.enemyDamage && enemy) {
    flash(enemy, "bad");
    floatNum(enemy, `-${fx.enemyDamage}`, "bad");
  }
  if (fx.blockGain && player) flash(player, "good");
  if (fx.playerDamage && player) {
    flash(player, "bad");
    floatNum(player, `-${fx.playerDamage}`, "bad");
    shake(node.querySelector(".s6db-battlefield"));
  }
}
function flyCard({ rect, faceHTML }, arena) {
  if (!rect || reduce() || typeof document === "undefined") return;
  const clone2 = document.createElement("div");
  clone2.className = "s6db-fly s6db-card";
  clone2.innerHTML = faceHTML || "";
  clone2.style.left = `${rect.left}px`;
  clone2.style.top = `${rect.top}px`;
  clone2.style.width = `${rect.width}px`;
  clone2.style.height = `${rect.height}px`;
  document.body.appendChild(clone2);
  const a = arena.getBoundingClientRect();
  const dx = a.left + a.width / 2 - (rect.left + rect.width / 2);
  const dy = a.top + a.height / 2 - (rect.top + rect.height / 2);
  requestAnimationFrame(() => {
    clone2.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    clone2.style.opacity = "0";
  });
  setTimeout(() => clone2.remove(), 240);
}

// ../../docs/games/metagame/stages/stage6/combat-modals.js
import { openModal } from "../../shared/modal.js";
function openPileModal(combat, kind) {
  if (!combat) return;
  const ids = kind === "draw" ? combat.draw : kind === "discard" ? combat.discard : combat.exhaust;
  const grid = document.createElement("div");
  grid.className = "mg-modal-grid";
  if (ids.length) {
    grid.replaceChildren(...ids.map((id) => {
      const d = document.createElement("div");
      d.className = `s6db-card ${cardTypeClass(cardById(id))}`;
      d.innerHTML = cardFaceInner(id);
      return d;
    }));
  } else {
    const p = document.createElement("p");
    p.className = "mg-modal-empty";
    p.textContent = "empty";
    grid.appendChild(p);
  }
  openModal({ title: `${kind} pile (${ids.length})`, contentEl: grid, className: "s6db-modal" });
}
function openLogModal(combat) {
  if (!combat) return;
  const box = document.createElement("div");
  box.className = "s6db-logfull";
  box.replaceChildren(...(combat.log || []).map((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    return p;
  }));
  openModal({ title: "combat log", contentEl: box, className: "s6db-modal" });
}

// ../../docs/games/metagame/stages/stage6/ui-map.js
var NODE_ICON = {
  combat: "⚔",
  elite: "☠",
  rest: "♨",
  shop: "⛁",
  event: "❓",
  boss: "☣"
};
var KEY_ORDER = ["untouchable", "ascetic", "sacrifice"];
var KEY_INFO = {
  untouchable: { name: "Untouchable", hint: "clear an elite taking ≤5 damage" },
  ascetic: { name: "Ascetic", hint: "skip a card reward" },
  sacrifice: { name: "Sacrifice", hint: "spend a rest thinning a card" }
};
function hubView(state, lock, asc = null) {
  const el = document.createElement("div");
  el.className = "s6db-hub";
  const m = state.meta;
  const d = m.disclosed || {};
  const hasRun = Boolean(state.run);
  const prestigeReady = (m.banked || 0) >= prestigeCost(m.protocolVersion) * 0.75;
  el.innerHTML = `
    <h2 class="s6db-hub-title">Protocol Codex</h2>
    <p class="s6db-hub-sub">A refused handshake at the edge of the archive. Build a deck of signals
      and protocols, descend through the archive, and earn the right to be acknowledged.</p>
    <div class="s6db-hub-actions">
      ${hasRun ? `<button type="button" data-action="continue-run">continue run ▸ act ${state.run.act}</button>
           <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>` : `<button type="button" data-action="begin-run">begin a run ▸</button>`}
      <button type="button" data-action="epub">open the codex</button>
      ${lock.defeated ? `<button type="button" data-action="bts">open trace.bts</button>` : ""}
    </div>
    ${d.stats ? `<dl class="s6db-meta-grid">
      <div><dt>Banked handshakes</dt><dd>${m.banked}</dd></div>
      <div><dt>Protocol Version</dt><dd>v${m.protocolVersion}</dd></div>
      <div><dt>Runs cleared</dt><dd>${m.runsCleared}</dd></div>
      <div><dt>Best score</dt><dd>${m.bestScore || 0}</dd></div>
      <div><dt>The Refused Connection</dt><dd>${lock.defeated ? "answered" : lock.unlocked ? "negotiable" : "refusing"}</dd></div>
    </dl>` : ""}
    ${d.meta ? seedModes(hasRun) : ""}
    ${prestigeReady ? `<div class="s6db-prestige">
      <button type="button" data-action="prestige"${m.banked < prestigeCost(m.protocolVersion) ? " disabled" : ""}>
        reinforce protocol → v${m.protocolVersion + 1}</button>
      <span>cost ${prestigeCost(m.protocolVersion)} banked · each version: +5 max HP, +1 starting relic &amp; one harder rule</span>
    </div>` : ""}
    ${d.meta ? ascensionPicker(asc, hasRun) : ""}
    ${d.stats ? `<p class="s6db-hint">${esc3(lock.unlocked ? "Chapter 9 is read. The connection can be negotiated." : "The connection refuses everything you send. The codex explains why.")}</p>` : ""}
  `;
  return el;
}
function seedModes(hasRun) {
  if (hasRun) return "";
  return `<div class="s6db-seed-modes">
      <button type="button" data-action="daily-run" class="s6db-ghost">daily seed ▸</button>
      <span class="s6db-seed-entry">
        <input type="text" class="s6db-seed-input" maxlength="40" placeholder="custom seed…" aria-label="custom seed" />
        <button type="button" data-action="custom-run" class="s6db-ghost">seeded run ▸</button>
      </span>
    </div>`;
}
function ascensionPicker(asc, hasRun) {
  if (!asc || hasRun) {
    return asc ? activeRules(Math.max(asc.level, asc.floor || 0)) : "";
  }
  const maxPick = Math.max(asc.maxUnlocked, asc.floor || 0);
  const cells = [];
  for (let n = 0; n <= asc.maxLevel; n++) {
    const locked = n > maxPick;
    const sel = n === asc.level ? " is-selected" : "";
    const floorPinned = n <= (asc.floor || 0) ? " is-floor" : "";
    cells.push(locked ? `<span class="s6db-asc-cell is-locked" aria-disabled="true">${n}</span>` : `<button type="button" class="s6db-asc-cell${sel}${floorPinned}" data-ascension="${n}">${n}</button>`);
  }
  const effective = Math.max(asc.level, asc.floor || 0);
  return `<div class="s6db-ascension">
      <div class="s6db-asc-head"><strong>Ascension</strong>
        <span>difficulty ${asc.level} · cleared ${asc.maxCleared}/${MAX_ASCENSION}${asc.floor ? ` · prestige floor ${asc.floor}` : ""}</span></div>
      <div class="s6db-asc-track" aria-label="ascension level picker">${cells.join("")}</div>
      ${activeRules(effective)}
    </div>`;
}
function activeRules(level) {
  const active = activeAscensionMods(level);
  if (!active.length) return "";
  return `<ul class="s6db-modifiers" aria-label="active rules">${active.map((mod) => `<li>⚠ <strong>${esc3(mod.label)}</strong> — ${esc3(mod.desc)}</li>`).join("")}</ul>`;
}
function mapView(run) {
  const el = document.createElement("div");
  el.className = "s6db-map";
  const act = run.map.acts[run.act - 1];
  const available = new Set(availableNodes(run).map((n) => n.id));
  const cleared = new Set(run.clearedIds);
  const total = run.map.acts.length;
  const dots = Array.from({ length: total }, (_, i) => `<span class="s6db-act-dot${i + 1 < run.act ? " is-done" : ""}${i + 1 === run.act ? " is-here" : ""}"></span>`).join("");
  el.innerHTML = `<div class="s6db-map-head">
      <span>Act ${run.act} / ${total} — choose your route</span>
      <span class="s6db-act-track" aria-label="act ${run.act} of ${total}">${dots}</span>
    </div>
    ${run.notice ? `<div class="s6db-notice">${esc3(run.notice)}</div>` : ""}`;
  const grid = document.createElement("div");
  grid.className = "s6db-map-grid";
  for (const layer of act.layers) {
    const col = document.createElement("div");
    col.className = "s6db-map-col";
    for (const node of layer) col.appendChild(nodeChip(node, run, available, cleared));
    grid.appendChild(col);
  }
  el.appendChild(grid);
  el.insertAdjacentHTML("beforeend", inventoryStrip(run));
  const footer = document.createElement("div");
  footer.className = "s6db-map-foot";
  footer.innerHTML = `<span>HP ${run.hp}/${run.maxHp}</span><span>handshakes ${run.handshakes}</span>
    <span>deck ${run.deck.length}</span>
    <button type="button" data-action="to-hub" class="s6db-ghost">to hub</button>
    <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>`;
  el.appendChild(footer);
  return el;
}
function inventoryStrip(run) {
  const relics = (run.relics || []).map(relicById).filter(Boolean);
  const keys = run.keys || [];
  const vet = isVeteranRun(run);
  const rItems = relics.length ? relics.map((r) => `<li><strong>⬢ ${esc3(r.name)}</strong> — ${esc3(r.text)}</li>`).join("") : `<li class="s6db-inv-none">No relics yet — clear elites and act bosses to earn them.</li>`;
  const keyRows = KEY_ORDER.filter((id) => vet || keys.includes(id)).map((id) => {
    const got = keys.includes(id);
    return `<li class="${got ? "is-earned" : ""}"><strong>${got ? "⚷" : "○"} ${esc3(KEY_INFO[id].name)}</strong> — ${esc3(KEY_INFO[id].hint)}</li>`;
  }).join("");
  const keySection = keyRows ? `<div class="s6db-inv-keys"><h4>True-ending keys ${keys.length}/3</h4><ul>${keyRows}</ul></div>` : "";
  return `<details class="s6db-inv"><summary>relics ${relics.length} · keys ${keys.length}/3</summary>
    <div class="s6db-inv-body">
      <div class="s6db-inv-relics"><h4>Relics</h4><ul>${rItems}</ul></div>${keySection}
    </div></details>`;
}
function paintMapEdges(mapEl, run) {
  const grid = mapEl?.querySelector?.(".s6db-map-grid");
  if (!grid) return;
  grid.querySelector(":scope > svg.s6db-edges")?.remove();
  const gridRect = grid.getBoundingClientRect();
  if (!gridRect.width) return;
  const act = run.map.acts[run.act - 1];
  const cleared = new Set(run.clearedIds);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "s6db-edges");
  svg.setAttribute("aria-hidden", "true");
  const w = grid.scrollWidth, h = grid.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const rectOf = (id) => grid.querySelector(`[data-node-id="${id}"]`)?.getBoundingClientRect() || null;
  const frag = document.createDocumentFragment();
  for (const layer of act.layers) {
    for (const node of layer) {
      const from = rectOf(node.id);
      if (!from) continue;
      for (const nextId of node.next || []) {
        const to = rectOf(nextId);
        if (!to) continue;
        const line = document.createElementNS(SVG, "line");
        line.setAttribute("x1", String(from.right - gridRect.left + grid.scrollLeft));
        line.setAttribute("y1", String(from.top - gridRect.top + grid.scrollTop + from.height / 2));
        line.setAttribute("x2", String(to.left - gridRect.left + grid.scrollLeft));
        line.setAttribute("y2", String(to.top - gridRect.top + grid.scrollTop + to.height / 2));
        let cls = "s6db-edge";
        if (node.id === run.currentNodeId) cls += " is-current";
        else if (cleared.has(node.id)) cls += " is-cleared";
        line.setAttribute("class", cls);
        frag.appendChild(line);
      }
    }
  }
  svg.appendChild(frag);
  grid.insertBefore(svg, grid.firstChild);
}
function nodeChip(node, run, available, cleared) {
  const isAvailable = available.has(node.id);
  const isCurrent = node.id === run.currentNodeId;
  const isCleared = cleared.has(node.id);
  const tag = isAvailable ? "button" : "div";
  const chip = document.createElement(tag);
  chip.className = `s6db-node s6db-node--${node.type}` + (isAvailable ? " is-available" : "") + (isCurrent ? " is-current" : "") + (isCleared ? " is-cleared" : "") + (!isAvailable && !isCleared && !isCurrent ? " is-locked" : "");
  if (tag === "button") {
    chip.type = "button";
    chip.dataset.node = node.id;
  }
  chip.dataset.nodeId = node.id;
  chip.innerHTML = `<span class="s6db-node-icon">${NODE_ICON[node.type] || "?"}</span>
    <span class="s6db-node-type">${esc3(node.type)}</span>`;
  return chip;
}
function deathView(state, run) {
  const el = document.createElement("div");
  el.className = "s6db-end s6db-end--dead";
  el.innerHTML = `
    <h2>Connection reset</h2>
    <p>The stack collapsed in act ${run?.act ?? 1}. Your handshakes settle into the bank.</p>
    <dl class="s6db-meta-grid">
      <div><dt>Reached</dt><dd>act ${run?.act ?? 1}</dd></div>
      <div><dt>Score</dt><dd>${run ? runScore(run) : 0}</dd></div>
      <div><dt>Banked total</dt><dd>${state.meta.banked}</dd></div>
    </dl>
    ${scoreLine(state, run)}
    <div class="s6db-hub-actions">
      <button type="button" data-action="new-run">try again ▸</button>
      <button type="button" data-action="abandon" class="s6db-ghost">back to hub</button>
    </div>`;
  return el;
}
function wonView(state, run) {
  const el = document.createElement("div");
  el.className = "s6db-end s6db-end--won";
  const trueEnding = Boolean(run?.trueEnding);
  el.innerHTML = `
    <h2>${trueEnding ? "The Kernel of Refusal yields" : "The connection accepted a shared rule"}</h2>
    <p>${trueEnding ? "Three keys turned in the lock. Past the accepted handshake, the kernel that refused everything finally answers. This is the true ending." : "Six acts negotiated. The archive lets you pass."}</p>
    <dl class="s6db-meta-grid">
      <div><dt>Score</dt><dd>${run ? runScore(run) : 0}</dd></div>
      <div><dt>Ascension</dt><dd>${run?.ascension || 0}</dd></div>
    </dl>
    ${scoreLine(state, run)}
    <div class="s6db-hub-actions">
      <button type="button" data-action="bts">open trace.bts</button>
      <button type="button" data-action="new-run">run again ▸</button>
    </div>`;
  return el;
}
function scoreLine(state, run) {
  const best = state.meta.bestScore || 0;
  const parts = [`<span>Best: <strong>${best}</strong></span>`];
  if (run?.dailyKey) {
    const seedBest = state.meta.dailyBest && state.meta.dailyBest[run.dailyKey] || 0;
    const label = run.mode === "daily" ? "daily" : "seed";
    parts.push(`<span>${esc3(label)} <code>${esc3(run.dailyKey)}</code> best: <strong>${seedBest}</strong></span>`);
  }
  return `<p class="s6db-score-line">${parts.join(" · ")}</p>`;
}
function esc3(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage6/ui-rewards.js
var PRICE = { common: 25, uncommon: 40, rare: 60, starter: 20 };
function rewardView(run) {
  const el = document.createElement("div");
  el.className = "s6db-reward";
  const cards = run.pendingReward?.cards || [];
  const relic = run.pendingReward?.relic ? relicById(run.pendingReward.relic) : null;
  el.innerHTML = `<h2>Signal recovered</h2>
    ${relic ? `<p class="s6db-relic-won">⬢ Relic acquired — <strong>${esc4(relic.name)}</strong>: ${esc4(relic.text)}</p>` : ""}
    <p>Add one card to your deck.</p>
    ${keyTelegraph(run, "ascetic", "skip everything to stay ascetic ⚷")}`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...cards.map((id) => cardOption(id, "take", id)));
  el.appendChild(row);
  const potionId = run.pendingReward?.potion;
  if (potionId) el.appendChild(potionOffer(run, potionId));
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-take="skip" class="s6db-ghost">skip</button></div>`
  );
  return el;
}
function potionOffer(run, potionId) {
  const p = potionById(potionId);
  const wrap = document.createElement("div");
  wrap.className = "s6db-potion-offer";
  const belt = run.potions || [];
  if (belt.length < POTION_SLOTS) {
    wrap.innerHTML = `<p>Potion found — <strong>${esc4(p?.name || potionId)}</strong>: ${esc4(p?.text || "")}</p>
      <button type="button" data-take-potion="">grab potion ⚗</button>`;
  } else {
    wrap.innerHTML = `<p>Potion found — <strong>${esc4(p?.name || potionId)}</strong>: ${esc4(p?.text || "")}. Belt full — replace one:</p>`;
    const actions = document.createElement("div");
    actions.className = "s6db-hub-actions";
    actions.replaceChildren(...belt.map((id, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.takePotion = String(i);
      b.textContent = `replace ${potionById(id)?.name || id}`;
      return b;
    }));
    wrap.appendChild(actions);
  }
  return wrap;
}
function bossRewardView(run) {
  const el = document.createElement("div");
  el.className = "s6db-reward s6db-boss-reward";
  const offered = (run.pendingReward?.relics || []).map(relicById).filter(Boolean);
  el.innerHTML = `<h2>Protocol negotiated</h2>
    <p>${offered.length ? "Claim one relic to carry into the next act." : "No new relics remain."}</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...offered.map((relic) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `s6db-relic-choice${relic.cursed ? " is-cursed" : ""}`;
    b.dataset.bossRelic = relic.id;
    b.innerHTML = `<strong>⬢ ${esc4(relic.name)}</strong><small class="s6db-card-text">${esc4(relic.text)}</small>`;
    return b;
  }));
  el.appendChild(row);
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-boss-relic="skip" class="s6db-ghost">${offered.length ? "skip relic ▸" : "continue ▸"}</button></div>`
  );
  return el;
}
function restView(run) {
  const el = document.createElement("div");
  el.className = "s6db-rest";
  const heal2 = Math.round(run.maxHp * 0.3);
  el.innerHTML = `
    <h2>Keepalive</h2>
    <p>A quiet socket. Choose ONE: recover ${heal2} HP, upgrade a card, or thin your deck.</p>
    ${keyTelegraph(run, "sacrifice", "spend this rest thinning a card to earn the sacrifice key ⚷")}
    <div class="s6db-hub-actions">
      <button type="button" data-rest="heal">rest — heal ${heal2} HP ▸</button>
    </div>
    <div class="s6db-rest-upgrade"><h3>…or upgrade a card</h3></div>
    <div class="s6db-rest-thin"><h3>…or remove a card</h3></div>`;
  const upgradeable = run.deck.map((id, i) => ({ id, i })).filter(({ id }) => canUpgrade(id));
  const up = el.querySelector(".s6db-rest-upgrade");
  if (upgradeable.length) {
    const upList = document.createElement("div");
    upList.className = "s6db-card-row";
    upList.replaceChildren(...upgradeable.map(({ id, i }) => cardOption(upgradeIdFor(id), "upgrade", String(i))));
    up.appendChild(upList);
  } else {
    up.insertAdjacentHTML("beforeend", `<p class="s6db-hint">Every card is already upgraded.</p>`);
  }
  const thin = el.querySelector(".s6db-rest-thin");
  const list = document.createElement("div");
  list.className = "s6db-card-row";
  list.replaceChildren(...run.deck.map((id, i) => cardOption(id, "remove", String(i))));
  thin.appendChild(list);
  return el;
}
function shopView(run) {
  const el = document.createElement("div");
  el.className = "s6db-shop";
  const offers = shopOffers(run);
  el.innerHTML = `<h2>Open port</h2><p>Handshakes: <strong>${run.handshakes}</strong>. Buy what you can afford.</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...offers.map(({ id, price }) => {
    const chip = cardOption(id, "buy", id);
    chip.dataset.price = String(price);
    chip.disabled = run.handshakes < price;
    chip.insertAdjacentHTML("beforeend", `<span class="s6db-price">${price} ✋</span>`);
    return chip;
  }));
  el.appendChild(row);
  const cost = removalCost(run);
  const affordable = run.handshakes >= cost && run.deck.length > 1;
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-shop-remove"><h3>Purge a card — ${cost} ✋ <small>(price rises each purchase)</small></h3></div>`
  );
  const purge = el.querySelector(".s6db-shop-remove");
  const purgeRow = document.createElement("div");
  purgeRow.className = "s6db-card-row";
  purgeRow.replaceChildren(...run.deck.map((id, i) => {
    const chip = cardOption(id, "buy-remove", String(i));
    chip.disabled = !affordable;
    return chip;
  }));
  purge.appendChild(purgeRow);
  const upgradeable = run.deck.map((id, i) => ({ id, i })).filter(({ id }) => canUpgrade(id));
  if (upgradeable.length) {
    el.insertAdjacentHTML(
      "beforeend",
      `<div class="s6db-shop-upgrade"><h3>Sharpen a card — ${UPGRADE_COST} ✋ each</h3></div>`
    );
    const upRow = document.createElement("div");
    upRow.className = "s6db-card-row";
    upRow.replaceChildren(...upgradeable.map(({ id, i }) => {
      const chip = cardOption(upgradeIdFor(id), "buy-upgrade", String(i));
      chip.dataset.price = String(UPGRADE_COST);
      chip.disabled = run.handshakes < UPGRADE_COST;
      return chip;
    }));
    el.querySelector(".s6db-shop-upgrade").appendChild(upRow);
  }
  const potionOffers = shopPotionOffers(run);
  const beltFull = (run.potions || []).length >= POTION_SLOTS;
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-shop-potions"><h3>Consumables — ${POTION_COST} ✋ each${beltFull ? " <small>(belt full)</small>" : ""}</h3></div>`
  );
  const potRow = document.createElement("div");
  potRow.className = "s6db-card-row";
  potRow.replaceChildren(...potionOffers.map((id) => {
    const p = potionById(id);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "s6db-potion s6db-potion--shop";
    b.dataset.buyPotion = id;
    b.dataset.price = String(POTION_COST);
    b.disabled = beltFull || run.handshakes < POTION_COST;
    b.innerHTML = `<strong>⚗ ${esc4(p?.name || id)}</strong><small class="s6db-card-text">${esc4(p?.text || "")}</small><span class="s6db-price">${POTION_COST} ✋</span>`;
    return b;
  }));
  el.querySelector(".s6db-shop-potions").appendChild(potRow);
  const relicAffordable = run.handshakes >= RELIC_COST;
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-shop-relic"><h3>Acquire a relic — ${RELIC_COST} ✋</h3>
       <button type="button" data-buy-relic="1" data-price="${RELIC_COST}"${relicAffordable ? "" : " disabled"}>buy a relic ⬢</button></div>`
  );
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-action="to-map">leave ▸</button></div>`
  );
  return el;
}
function eventView(run, event) {
  const el = document.createElement("div");
  el.className = "s6db-event";
  el.innerHTML = `
    <h2>${esc4(event?.title || "An anomaly idles in the corridor")}</h2>
    <p>${esc4(event?.text || "")}</p>
    ${run.notice ? `<p class="s6db-hint">${esc4(run.notice)}</p>` : ""}`;
  const actions = document.createElement("div");
  actions.className = "s6db-hub-actions";
  const buttons = (event?.choices || []).map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.event = c.id;
    b.textContent = `${c.label} ▸`;
    return b;
  });
  const leave = document.createElement("button");
  leave.type = "button";
  leave.className = "s6db-ghost";
  leave.dataset.action = "to-map";
  leave.textContent = "walk past";
  actions.replaceChildren(...buttons, leave);
  el.appendChild(actions);
  return el;
}
function shopOffers(run) {
  const rng = makeRng(strHash(`${run.seed}:${run.currentNodeId}:shop`));
  const pool = [...REWARD_POOL];
  const out = [];
  while (out.length < 4 && pool.length) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const card = cardById(id);
    out.push({ id, price: PRICE[card?.rarity] || 30 });
  }
  return out;
}
function shopPotionOffers(run) {
  const out = [];
  let salt = 0;
  while (out.length < 2 && salt < 24) {
    const id = rollPotion(strHash(`${run.seed}:${run.currentNodeId}:potion:${salt++}`));
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
function keyTelegraph(run, keyId, text) {
  if (!isVeteranRun(run) || (run?.keys || []).includes(keyId)) return "";
  return `<p class="s6db-telegraph">${esc4(text)}</p>`;
}
function cardOption(id, attr, value) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card ${cardTypeClass(card)}`;
  button.dataset[attr] = value;
  button.innerHTML = cardFaceInner(id);
  return button;
}
function esc4(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage6/renderer-open.js
function openEpub({ viewer, actions, achievements, bell, state }) {
  actions?.setAction?.(6, ACTION_NAME, { source: "stage6-codex", file: EPUB_PATH, chapter: 9 });
  applyProtocolChapter9Unlock({ state, achievements, bell });
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(EPUB_PATH, { source: "stage6" });
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(EPUB_PATH, { source: "stage6" });
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(6);
  else if (bts && typeof bts.openBts === "function") bts.openBts(6);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}

// ../../docs/games/metagame/stages/stage6/s6dev.js
var DEV_CARDS = ["HANDSHAKE", "FIREWALL", "TCP_STACK"];
var ALL_KEYS = [KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE];
function devHeal(run, combatPlayer) {
  if (!run) return { ok: false, reason: "no-run" };
  run.hp = run.maxHp;
  if (combatPlayer && typeof combatPlayer.maxHp === "number") {
    combatPlayer.hp = combatPlayer.maxHp;
  }
  return { ok: true, hp: run.hp };
}
function devGrantKeys(run) {
  if (!run) return { ok: false, reason: "no-run" };
  if (!Array.isArray(run.keys)) run.keys = [];
  for (const k of ALL_KEYS) {
    if (!run.keys.includes(k)) run.keys.push(k);
  }
  return { ok: true, keys: run.keys.length };
}
function devAddCards(run) {
  if (!run) return { ok: false, reason: "no-run" };
  if (!Array.isArray(run.deck)) run.deck = [];
  run.deck = [...run.deck, ...DEV_CARDS];
  return { ok: true, added: DEV_CARDS.length, deckSize: run.deck.length };
}
function devSkipToBoss(run) {
  if (!run) return { ok: false, reason: "no-run" };
  const nodeId2 = seatAtFinalBoss(run);
  return { ok: true, nodeId: nodeId2, act: run.act };
}
function devAddEnergy(combatPlayer, n = 3) {
  if (!combatPlayer) return { ok: false, reason: "no-combat" };
  combatPlayer.energy = Math.min(9, (combatPlayer.energy || 0) + n);
  return { ok: true, energy: combatPlayer.energy };
}
function applyDev(id, run, combatPlayer) {
  switch (id) {
    case "heal":
      return devHeal(run, combatPlayer);
    case "keys":
      return devGrantKeys(run);
    case "cards":
      return devAddCards(run);
    case "energy":
      return devAddEnergy(combatPlayer);
    default:
      return { ok: false, reason: "unknown-id" };
  }
}

// ../../docs/games/metagame/stages/stage6/renderer.js
var REFUSED_CONNECTION = "the-refused-connection";
function renderStage6({ host, state, actions, achievements, bell, bts, viewer, save, orchestrator, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage6-protocol-codex";
  root.innerHTML = `
    <header class="s6db-top"><strong>PROTOCOL CODEX</strong></header>
    <div class="s6db-screen" data-screen></div>`;
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");
  const combatRun = orchestrator?.save ? createRunState({ save: orchestrator.save, stageId: 6, slot: "combat", debounceMs: 0 }) : null;
  const ascension = orchestrator?.save ? createAscension({ save: orchestrator.save, stageId: 6, modifiers: ASCENSION_MODS }) : null;
  const ascInfo = () => ascension ? { level: ascension.level(), maxUnlocked: ascension.maxUnlocked(), maxCleared: ascension.maxCleared(), maxLevel: ascension.maxLevel, floor: state.meta.protocolVersion || 0 } : null;
  let combat = null;
  let pendingCardIndex = null;
  let pendingFx = null;
  let pendingBanner = null;
  let dailyKeyOverride = null;
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  const lockState = () => getBossLockState({ actions, state });
  const mount = (node) => {
    screen.replaceChildren(node);
    if (pendingBanner) {
      banner2(screen, pendingBanner);
      pendingBanner = null;
    }
    return node;
  };
  const commit = () => {
    if (typeof save === "function") save();
    route();
  };
  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKey);
  route();
  installStage6TestHook({
    state,
    combatRun,
    runScore,
    seatAtFinalBoss,
    runAutoNegotiate: autoNegotiate,
    playCard,
    endTurn,
    cardById,
    beginRun,
    commit,
    makeCombat,
    finishCombat,
    getCombat: () => combat,
    setCombat: (c) => {
      combat = c;
    },
    setDailyKeyOverride: (v) => {
      dailyKeyOverride = v;
    }
  });
  return {
    repaint: route,
    // Dev-menu cheats (see index.js stageMeta.devControls; wired by metagame.js → mounted.dev(id)).
    // skip-boss is dispatched inline here because it must null the live combat + reset combatRun.
    // energy mutates the transient combat.player only and is NOT persisted.
    dev(id) {
      if (id === "skip-boss") {
        if (!state.run) beginRun();
        devSkipToBoss(state.run);
        state.ui.screen = "run";
        combat = null;
        if (combatRun) combatRun.reset();
      } else {
        applyDev(id, state.run, combat?.player ?? null);
      }
      if (typeof save === "function") save();
      route();
    },
    destroy() {
      if (combatRun) combatRun.destroy();
      removeStage6TestHook();
      root.remove();
    }
  };
  function route() {
    const run = state.run;
    if (state.ui.screen !== "run" || !run) {
      combat = null;
      return mount(hubView(state, lockState(), ascInfo()));
    }
    switch (run.status) {
      // Every boss — including the act-6 finale and the key-gated superboss — is a real-deck fight.
      case "combat":
      case "boss":
      case "superboss":
        return mountCombat(run);
      case "reward":
        combat = null;
        return mount(rewardView(run));
      case "boss-reward":
        combat = null;
        return mount(bossRewardView(run));
      case "rest":
        combat = null;
        return mount(restView(run));
      case "shop":
        combat = null;
        return mount(shopView(run));
      case "event":
        combat = null;
        return mount(eventView(run, eventForNode(run)));
      case "dead":
        combat = null;
        return mount(deathView(state, run));
      case "won":
        combat = null;
        return mount(wonView(state, run));
      case "map":
      default: {
        combat = null;
        const node = mount(mapView(run));
        paintMapEdges(node, run);
        return node;
      }
    }
  }
  function mountCombat(run) {
    if (!combat || combat.nodeId !== run.currentNodeId) combat = loadOrMakeCombat(run);
    if (combat.over) {
      finishCombat(run);
      return route();
    }
    const node = combatView(combat, run, { pendingCardIndex });
    mount(node);
    if (pendingFx) {
      applyCombatFx(node, pendingFx);
      pendingFx = null;
    }
  }
  function doPlay(idx, sourceEl) {
    if (!combat || combat.over) return false;
    const card = cardById(combat.hand[idx]);
    if (!card || card.cost > combat.player.energy) return false;
    const enemyBefore = combat.enemy.hp;
    const blockBefore = combat.player.block;
    const rect = sourceEl ? sourceEl.getBoundingClientRect() : null;
    const faceHTML = sourceEl ? sourceEl.innerHTML : "";
    playCard(combat, idx);
    pendingCardIndex = null;
    pendingFx = {
      enemyDamage: Math.max(0, enemyBefore - combat.enemy.hp),
      blockGain: Math.max(0, combat.player.block - blockBefore),
      fly: rect ? { rect, faceHTML } : null
    };
    if (combat.over) finishCombat(state.run);
    else checkpointCombat(combat, state.run);
    return true;
  }
  function handleKey(event) {
    if (!combat || combat.over || state.ui.screen !== "run") return;
    if (event.key >= "1" && event.key <= "9") {
      const idx = Number(event.key) - 1;
      if (idx < combat.hand.length) {
        pendingCardIndex = idx;
        route();
        event.preventDefault();
      }
    } else if (event.key === "Enter" && pendingCardIndex != null) {
      const src = root.querySelector(".s6db-inspect .s6db-card");
      if (doPlay(pendingCardIndex, src)) {
        event.preventDefault();
        commit();
      }
    } else if (event.key === "Escape" && pendingCardIndex != null) {
      pendingCardIndex = null;
      route();
      event.preventDefault();
    }
  }
  function loadOrMakeCombat(run) {
    const snap = combatRun?.restore();
    if (snap && !snap.over && snap.runSeed === run.seed && snap.nodeId === run.currentNodeId) {
      const c2 = restoreCombat(snap, { relics: relicsFor(run.relics) });
      c2.nodeId = run.currentNodeId;
      return c2;
    }
    const c = makeCombat(run);
    checkpointCombat(c, run);
    return c;
  }
  function checkpointCombat(c, run) {
    if (!combatRun || !c) return;
    combatRun.checkpoint({ ...snapshotCombat(c), runSeed: run.seed });
  }
  function makeCombat(run) {
    const enemyId = enemyForCurrentNode(run, makeRng(strHash(`${run.seed}:${run.currentNodeId}:enemy`)));
    const enemy = instantiateEnemy(enemyId, run.act);
    if (enemy.tier !== "boss") {
      if (run.enemyHpMult && run.enemyHpMult !== 1) enemy.hp = Math.round(enemy.hp * run.enemyHpMult);
      if (run.enemyArmorBonus) enemy.armor = Number(enemy.armor || 0) + run.enemyArmorBonus;
    }
    if (enemy.tier === "elite" && run.eliteHpBonus) enemy.hp += run.eliteHpBonus;
    const c = createCombat({
      deck: run.deck,
      player: { hp: run.hp, maxHp: run.maxHp },
      enemy,
      seed: strHash(`${run.seed}:${run.currentNodeId}:combat`),
      relics: relicsFor(run.relics),
      congestion: congestionForAct(run.act),
      // THROUGHPUT: window opens in act 3 and persists for acts 3-6 (carry verbs forward)
      windowCap: 5 + (run.windowCapMod || 0)
      // prestige tight-window modifier
    });
    c.nodeId = run.currentNodeId;
    if (enemyId === REFUSED_CONNECTION) wireBossCombat(c, { locked: !lockState().unlocked, hpMult: run.bossHpMult || 1, extraPhase: Boolean(run.bossExtraPhase) });
    else if (enemyId === SUPERBOSS_ID) wireSuperboss(c);
    return c;
  }
  function finishCombat(run) {
    if (run.status === "superboss" || run.atSuperboss) return finishSuperboss(run);
    const win = combat.result === "win";
    const node = nodeById(run.map, run.currentNodeId);
    const isFinalBoss = node?.type === "boss" && run.act >= finalActOf(run);
    if (combatRun) combatRun.reset();
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    if (!win) state.meta.banked = (state.meta.banked || 0) + Math.floor((run.handshakes || 0) * 0.5);
    if (run.status === "dead") state.meta.disclosed.stats = true;
    combat = null;
    pendingCardIndex = null;
    pendingFx = null;
    if (win && isFinalBoss) finalBossDefeated(run);
    if (run.status === "dead" || run.status === "won") recordScore(run);
  }
  function finalBossDefeated(run) {
    state.boss.defeated = true;
    state.boss.reached = true;
    state.meta.firstClearComplete = true;
    state.meta.disclosed.stats = true;
    if (!state.meta.disclosed.meta) {
      state.meta.disclosed.meta = true;
      pendingBanner = "difficulty ladder unlocked ⚑";
    }
    state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
    if (ascension) ascension.recordClear(run.ascension || 0);
    state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    if (run.status === "superboss") return;
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }
  function finishSuperboss(run) {
    const win = combat.result === "win";
    if (combatRun) combatRun.reset();
    run.hp = Math.max(0, combat.player.hp);
    combat = null;
    run.atSuperboss = false;
    run.superbossCleared = true;
    if (win && run.hp > 0) {
      run.status = "won";
      run.trueEnding = true;
    } else run.status = "dead";
    recordScore(run);
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }
  function maybeRevealActs(run) {
    if (!run || run.act < 5 || !isVeteranRun(run) || state.meta.disclosed.actsRevealed) return;
    state.meta.disclosed.actsRevealed = true;
    pendingBanner = "the archive descends further — acts 5 and 6 unlocked";
  }
  function doPrestige() {
    const cost = prestigeCost(state.meta.protocolVersion || 0);
    if ((state.meta.banked || 0) < cost) return;
    state.meta.banked -= cost;
    state.meta.protocolVersion = (state.meta.protocolVersion || 0) + 1;
  }
  function beginRun({ mode = "standard", seedText = null } = {}) {
    state.meta.runsStarted = (state.meta.runsStarted || 0) + 1;
    let seed, dailyKey = null;
    if (mode === "daily") {
      dailyKey = currentDailyKey();
      seed = strHash(`daily:${dailyKey}`);
    } else if (mode === "custom" && String(seedText || "").trim()) {
      dailyKey = String(seedText).trim().slice(0, 40);
      seed = strHash(`custom:${dailyKey}`);
    } else {
      mode = "standard";
      seed = 1e3 + state.meta.runsStarted * 7919 + (state.meta.protocolVersion || 0) * 131;
    }
    state.run = createRun({
      seed,
      version: state.meta.protocolVersion || 0,
      handshakes: 0,
      ascension: ascension ? ascension.level() : 0,
      mode,
      dailyKey,
      // First-ever run (0 wins) ends at the act-4 story boss; ≥1 win restores the full six acts.
      finalAct: finalActForWins(state.meta.runsCleared || 0)
    });
    state.ui.screen = "run";
    if (combatRun) combatRun.reset();
    combat = null;
    pendingCardIndex = null;
    pendingFx = null;
  }
  function currentDailyKey() {
    if (dailyKeyOverride) return dailyKeyOverride;
    try {
      return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    } catch {
      return "1970-01-01";
    }
  }
  function recordScore(run) {
    if (!run) return;
    const score = runScore(run);
    state.meta.lastScore = score;
    state.meta.lastMode = run.mode || "standard";
    state.meta.lastSeedKey = run.dailyKey || null;
    if (score > (state.meta.bestScore || 0)) state.meta.bestScore = score;
    if (run.dailyKey) {
      if (!state.meta.dailyBest || typeof state.meta.dailyBest !== "object") state.meta.dailyBest = {};
      if (score > (state.meta.dailyBest[run.dailyKey] || 0)) state.meta.dailyBest[run.dailyKey] = score;
    }
  }
  function resolveEvent(run, choiceId) {
    const event = eventForNode(run);
    const { notice } = applyEventChoice(run, event.id, choiceId);
    closeNode(run);
    if (notice) run.notice = notice;
  }
  function handleClick(event) {
    const run = state.run;
    let cancelled = false;
    if (pendingCardIndex != null && !event.target.closest("[data-inspect],[data-play]")) {
      pendingCardIndex = null;
      cancelled = true;
    }
    const inspect = event.target.closest("[data-inspect]");
    if (inspect && combat && !combat.over) {
      const i = Number(inspect.dataset.inspect);
      pendingCardIndex = pendingCardIndex === i ? null : i;
      return route();
    }
    const pile = event.target.closest("[data-pile]");
    if (pile && combat) return openPileModal(combat, pile.dataset.pile);
    if (event.target.closest("[data-log]") && combat) return openLogModal(combat);
    if (handleTarget(event, run)) return commit();
    const btn = event.target.closest("button[data-action]");
    if (btn && runAction(btn.dataset.action, run)) return commit();
    if (cancelled) route();
  }
  function handleTarget(event, run) {
    const play = event.target.closest("[data-play]");
    if (play && combat && !combat.over) {
      doPlay(Number(play.dataset.play), root.querySelector(".s6db-inspect .s6db-card"));
      return true;
    }
    const ascBtn = event.target.closest("[data-ascension]");
    if (ascBtn) {
      if (ascension) ascension.setLevel(Number(ascBtn.dataset.ascension));
      return true;
    }
    const potion = event.target.closest("[data-potion]");
    if (potion && combat && !combat.over && run) {
      const used = usePotion(run, Number(potion.dataset.potion));
      if (used.ok) {
        applyPotionEffect(combat, potionById(used.id));
        if (combat.over) finishCombat(run);
        else checkpointCombat(combat, run);
      }
      return true;
    }
    if (!run) return false;
    const takePot = event.target.closest("[data-take-potion]");
    if (takePot) {
      takePotion(run, takePot.dataset.takePotion === "" ? void 0 : Number(takePot.dataset.takePotion));
      return true;
    }
    const buyPot = event.target.closest("[data-buy-potion]");
    if (buyPot) {
      buyPotion(run, buyPot.dataset.buyPotion, Number(buyPot.dataset.price));
      return true;
    }
    const node = event.target.closest("[data-node]");
    if (node) {
      moveTo(run, node.dataset.node);
      return true;
    }
    const take = event.target.closest("[data-take]");
    if (take) {
      takeReward(run, take.dataset.take === "skip" ? null : take.dataset.take);
      return true;
    }
    const bossRelic = event.target.closest("[data-boss-relic]");
    if (bossRelic) {
      takeBossRelic(run, bossRelic.dataset.bossRelic === "skip" ? null : bossRelic.dataset.bossRelic);
      maybeRevealActs(run);
      return true;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      removeCard(run, Number(remove.dataset.remove));
      rest(run, "remove");
      return true;
    }
    const upgrade = event.target.closest("[data-upgrade]");
    if (upgrade) {
      rest(run, "upgrade", Number(upgrade.dataset.upgrade));
      return true;
    }
    const restEl = event.target.closest("[data-rest]");
    if (restEl) {
      rest(run, restEl.dataset.rest);
      return true;
    }
    const buy = event.target.closest("[data-buy]");
    if (buy) {
      buyCard(run, buy.dataset.buy, Number(buy.dataset.price));
      return true;
    }
    const buyRemove = event.target.closest("[data-buy-remove]");
    if (buyRemove) {
      buyRemoval(run, Number(buyRemove.dataset.buyRemove));
      return true;
    }
    const buyUp = event.target.closest("[data-buy-upgrade]");
    if (buyUp) {
      buyUpgrade(run, Number(buyUp.dataset.buyUpgrade), Number(buyUp.dataset.price));
      return true;
    }
    const buyRel = event.target.closest("[data-buy-relic]");
    if (buyRel) {
      buyRelic(run, Number(buyRel.dataset.price));
      return true;
    }
    const ev = event.target.closest("[data-event]");
    if (ev) {
      resolveEvent(run, ev.dataset.event);
      return true;
    }
    return false;
  }
  function runAction(action, run) {
    switch (action) {
      case "begin-run":
      case "new-run":
        beginRun();
        return true;
      case "daily-run":
        beginRun({ mode: "daily" });
        return true;
      case "custom-run": {
        const input = root.querySelector(".s6db-seed-input");
        const seedText = input ? input.value : "";
        if (!String(seedText || "").trim()) return false;
        beginRun({ mode: "custom", seedText });
        return true;
      }
      case "continue-run":
        state.ui.screen = "run";
        return true;
      case "abandon":
        if (combatRun) combatRun.reset();
        state.run = null;
        combat = null;
        state.ui.screen = "hub";
        return true;
      case "prestige":
        doPrestige();
        return true;
      case "to-hub":
        state.ui.screen = "hub";
        return true;
      case "to-map":
        if (run) closeNode(run);
        return true;
      case "end-turn":
        if (combat && !combat.over) {
          pendingCardIndex = null;
          const hpBefore = combat.player.hp;
          endTurn(combat);
          pendingFx = { banner: "ENEMY TURN", playerDamage: Math.max(0, hpBefore - combat.player.hp) };
          if (combat.over) finishCombat(run);
          else checkpointCombat(combat, run);
        }
        return true;
      case "epub":
        openEpub({ viewer, actions, achievements, bell, state });
        if (combat && combat.bossPhase && combat.bossLocked) {
          if (combatRun) combatRun.reset();
          combat = null;
        }
        return true;
      case "bts":
        openBts({ bts, viewer });
        return true;
      default:
        return false;
    }
  }
}

// ../../docs/games/metagame/stages/stage6/state.js
var VERSION = 2;
function defaultState() {
  return {
    version: VERSION,
    meta: {
      banked: 0,
      // handshakes banked toward prestige (Protocol Version)
      protocolVersion: 0,
      // prestige tier
      runsStarted: 0,
      runsCleared: 0,
      bestAct: 0,
      firstClearComplete: false,
      // Self-competition run scoring (local-only): a run's score = handshakes + acts cleared + HP,
      // bonused by ascension. bestScore is the all-time high; dailyBest maps a daily/custom seed key
      // to its best score so a player can chase their own seed.
      bestScore: 0,
      lastScore: 0,
      lastMode: null,
      lastSeedKey: null,
      dailyBest: {},
      // Hub progressive disclosure (UX audit M1): which meta clusters have been REVEALED. A fresh
      // save opens on just title + flavor + begin/codex; each cluster appears at the event that makes
      // it meaningful and stays. Additive + backfilled from existing counters (normalizeState) so an
      // existing save NEVER regresses to the minimal hub.
      //   stats       — the stat tiles: first finished run (death or win).
      //   meta        — ascension picker + daily/custom seeds: first WIN (banner announced once).
      //   actsRevealed — acts 5-6 opened: first time a veteran run advances past act 4 (banner once).
      disclosed: { stats: false, meta: false, actsRevealed: false }
    },
    handshakes: 0,
    // legacy mirror the boss reward writes to
    boss: {
      reached: false,
      unlocked: false,
      defeated: false,
      phase: 1,
      hp: 60,
      attempts: 0,
      lockHintStep: 0,
      turn: { firstCard: null, playedAck: false, signalDamageThisTurn: 0 }
    },
    run: null,
    ui: { screen: "hub" },
    log: [
      bellMessages.start,
      "The Refused Connection waits behind a formal silence."
    ]
  };
}
function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  target.version = VERSION;
  target.meta = mergePlain(fresh.meta, target.meta);
  target.meta.disclosed = mergePlain(fresh.meta.disclosed, target.meta.disclosed);
  backfillDisclosure(target.meta);
  target.handshakes = num(target.handshakes, fresh.handshakes);
  target.boss = mergePlain(fresh.boss, target.boss);
  target.boss.turn = mergePlain(fresh.boss.turn, target.boss.turn);
  target.run = target.run && typeof target.run === "object" ? target.run : null;
  target.ui = mergePlain(fresh.ui, target.ui);
  if (!["hub", "run"].includes(target.ui.screen)) target.ui.screen = "hub";
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  delete target.deck;
  return target;
}
function backfillDisclosure(meta) {
  const d = meta.disclosed;
  const won = (meta.runsCleared || 0) > 0;
  const finished = won || (meta.bestScore || 0) > 0 || (meta.bestAct || 0) > 0 || (meta.banked || 0) > 0 || meta.lastMode != null;
  if (finished) d.stats = true;
  if (won) {
    d.meta = true;
    d.actsRevealed = true;
  }
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}
function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ../../docs/games/metagame/stages/stage6/index.js
var stageMeta = {
  id: 6,
  slug: "protocol-codex",
  name: "Protocol Codex",
  btsPath: BTS_PATH,
  requiredAction: REQUIRED_ACTION,
  // Dev-menu controls for this stage (wired in metagame.js → mounted.dev(id)).
  devControls: [
    { id: "heal", label: "Full HP" },
    { id: "keys", label: "Grant 3 Keys" },
    { id: "cards", label: "+3 Cards" },
    { id: "skip-boss", label: "Skip to Boss" },
    { id: "energy", label: "+3 Energy" }
  ]
};
function defaultState2(context) {
  return defaultState(context);
}
function mountStage(ctx) {
  const state = normalizeState(ctx.state);
  let view = null;
  ensureStyles();
  if (hasProtocolChapter9(ctx.actions)) {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }
  const unsubscribe = subscribeToProtocolChapter9(ctx.actions, () => {
    applyProtocolChapter9Unlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  view = renderStage6({ ...ctx, state });
  return {
    devControls: stageMeta.devControls,
    dev(id) {
      if (view && typeof view.dev === "function") view.dev(id);
    },
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function subscribeToProtocolChapter9(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isProtocolChapter9Detail(detail)) onUnlock(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (isProtocolChapter9Detail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function isProtocolChapter9Detail(detail) {
  return Boolean(detail && Number(detail.stage) === 6 && detail.action === ACTION_NAME);
}
function ensureStyles() {
  ensureStylesheet("stage6-protocol-codex-styles", new URL("./styles.css", import.meta.url).href);
  ensureStylesheet("stage6-protocol-codex-combat-styles", new URL("./styles-combat.css", import.meta.url).href);
}
function ensureStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}
export {
  applyProtocolChapter9Unlock,
  defaultState2 as defaultState,
  getBossLockState,
  mountStage,
  recordLockedBossAttempt,
  stageMeta
};
