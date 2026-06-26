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
var PHASE_HP = { 1: 60, 2: 80, 3: 60 };
var SIGNAL_DAMAGE = 30;
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
function startProtocolTurn(state) {
  state.boss.turn = {
    firstCard: null,
    playedAck: false,
    signalDamageThisTurn: 0
  };
}
function playProtocolCard({ state, card }) {
  const boss = state.boss;
  const normalized = normalizeCard(card);
  boss.reached = true;
  if (boss.defeated) return { ok: false, reason: "defeated", damage: 0, phase: boss.phase };
  if (!boss.unlocked) {
    recordLockedBossAttempt(state);
    return { ok: false, reason: "locked", damage: 0, phase: boss.phase };
  }
  const turn = boss.turn || {};
  if (!turn.firstCard) turn.firstCard = normalized;
  if (normalized === "ACK") {
    turn.playedAck = true;
    boss.turn = turn;
    pushLog(state, phaseAckLine(boss.phase));
    return { ok: true, reason: "ack", damage: 0, phase: boss.phase };
  }
  let damage = 0;
  if (normalized === "Signal" || normalized === "SYN") {
    damage = acceptedSignalDamage({ phase: boss.phase, card: normalized, turn });
    if (damage === 0) pushLog(state, combatLines.mismatch);
    else applyBossDamage(state, damage);
  }
  boss.turn = turn;
  return { ok: damage > 0, reason: damage > 0 ? "accepted" : "mismatch", damage, phase: boss.phase };
}
function endProtocolTurn(state) {
  const boss = state.boss;
  if (!boss.unlocked || boss.defeated) return { penalty: 0 };
  if (boss.phase !== 3) {
    startProtocolTurn(state);
    return { penalty: 0 };
  }
  const acknowledged = Boolean(boss.turn?.playedAck);
  startProtocolTurn(state);
  if (acknowledged) return { penalty: 0 };
  pushLog(state, "no ACK this turn. 8 ongoing damage returns through the protocol.");
  return { penalty: 8 };
}
function defeatRefusedConnection(state) {
  const boss = state.boss;
  if (!boss.unlocked || boss.defeated) return false;
  boss.defeated = true;
  state.handshakes = Number(state.handshakes || 0) + 80;
  state.meta.firstClearComplete = true;
  pushLog(state, combatLines.defeated);
  return true;
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function acceptedSignalDamage({ phase, card, turn }) {
  if (phase === 1) return turn.firstCard === "SYN" ? SIGNAL_DAMAGE : 0;
  if (phase === 2) return turn.playedAck ? SIGNAL_DAMAGE : 0;
  if (phase === 3) return SIGNAL_DAMAGE;
  return card === "SYN" ? SIGNAL_DAMAGE : 0;
}
function applyBossDamage(state, amount) {
  const boss = state.boss;
  boss.hp = Math.max(0, Number(boss.hp || PHASE_HP[boss.phase] || 60) - amount);
  pushLog(state, `${amount} protocol damage accepted.`);
  if (boss.hp > 0) return;
  if (boss.phase < 3) {
    boss.phase += 1;
    boss.hp = PHASE_HP[boss.phase];
    startProtocolTurn(state);
    pushLog(state, boss.phase === 2 ? bellMessages.phase2 : bellMessages.phase3);
    return;
  }
  defeatRefusedConnection(state);
}
function normalizeCard(card) {
  const value = String(card || "").trim().toLowerCase();
  if (value === "syn") return "SYN";
  if (value === "ack") return "ACK";
  return "Signal";
}
function phaseAckLine(phase) {
  if (phase === 2) return combatLines.ackSignal;
  if (phase === 3) return combatLines.ackOngoing;
  return combatLines.synFirst;
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

// ../../docs/games/metagame/stages/stage6/cards.js
var CARDS = [
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
    id: "ACK",
    type: "Protocol",
    cost: 1,
    rarity: "starter",
    text: "Gain 10 block.",
    effect: (ctx) => ctx.block(10)
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
    id: "WINDOW",
    type: "Protocol",
    cost: 1,
    rarity: "common",
    text: "Draw 2 cards.",
    effect: (ctx) => ctx.draw(2)
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
    id: "BUFFER",
    type: "Protocol",
    cost: 2,
    rarity: "uncommon",
    text: "Gain 4 block for each card in hand.",
    effect: (ctx) => ctx.block(4 * ctx.handSize)
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
  }
];
var BY_ID = new Map(CARDS.map((card) => [card.id, card]));
function cardById(id) {
  return BY_ID.get(id) || null;
}
function registerCard(card) {
  if (card && card.id) BY_ID.set(card.id, card);
}
var REWARD_POOL = CARDS.filter((card) => card.rarity !== "starter").map((card) => card.id);
var STARTING_DECK = ["SYN", "SYN", "SYN", "SYN", "SYN", "ACK", "ACK", "ACK", "ACK", "RST"];

// ../../docs/games/metagame/stages/stage6/combat.js
var HAND_SIZE = 5;
var START_ENERGY = 3;
function baseId(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}
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
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function createCombat({ deck, player, enemy, seed = 1, relics = [] }) {
  const rng = makeRng(seed);
  const combat = {
    rng,
    relics,
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
      skipNext: false
    },
    draw: shuffle(deck, rng),
    hand: [],
    discard: [],
    exhaust: [],
    turn: 1,
    cardsPlayedThisTurn: 0,
    energySpentThisTurn: 0,
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
function runHook(combat, name, card = null) {
  for (const relic of combat.relics) {
    const fn = relic.hooks?.[name];
    if (typeof fn === "function") fn(relicCtx(combat, card));
  }
}
function relicCtx(combat, card) {
  return {
    combat,
    card,
    deal: (n) => dealToEnemy(combat, n),
    block: (n) => {
      combat.player.block += Math.max(0, Math.round(n));
    },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => {
      combat.player.energy += n;
    },
    applySelf: (status, n) => addStatus(combat.player, status, n),
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n)
  };
}
function currentIntent(combat) {
  const script = combat.enemy.script;
  return script[combat.enemy.intentIndex % script.length];
}
function playCard(combat, handIndex) {
  if (combat.over) return { ok: false, reason: "over" };
  const cardId = combat.hand[handIndex];
  if (cardId == null) return { ok: false, reason: "no-card" };
  const card = cardById(cardId);
  if (!card) return { ok: false, reason: "unknown-card" };
  if (card.cost > combat.player.energy) return { ok: false, reason: "no-energy" };
  combat.player.energy -= card.cost;
  combat.energySpentThisTurn += card.cost;
  combat.cardsPlayedThisTurn += 1;
  combat.hand.splice(handIndex, 1);
  combat.playedIdsThisTurn.push(card.id);
  card.effect(makeCtx(combat, card));
  combat.lastCardPlayed = card.id;
  if (card.exhaust) combat.exhaust.push(card.id);
  else combat.discard.push(card.id);
  runHook(combat, "onCardPlay", card);
  checkEnemyDead(combat);
  return { ok: true, card: card.id };
}
function makeCtx(combat, card) {
  return {
    combat,
    card,
    // Boss negotiation (optional): a Signal-type card whose handshake is unmet deals 0 —
    // "PROTOCOL MISMATCH". Protocol/Layer cards always resolve. See boss-combat.js.
    deal: (n) => {
      if (combat.acceptance && card && card.type === "Signal" && !combat.acceptance(combat, card)) {
        log(combat, "PROTOCOL MISMATCH — signal refused.");
        return;
      }
      dealToEnemy(combat, n);
    },
    block: (n) => {
      combat.player.block += Math.max(0, Math.round(n));
    },
    draw: (n) => drawCards(combat, n),
    gainEnergy: (n) => {
      combat.player.energy += n;
    },
    applyEnemy: (status, n) => addStatus(combat.enemy, status, n),
    applySelf: (status, n) => addStatus(combat.player, status, n),
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
    // Base-id aware: an upgraded "ACK+" still counts as having played "ACK" this turn.
    playedThisTurn: (id) => combat.playedIdsThisTurn.some((pid) => baseId(pid) === baseId(id)),
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
function endTurn(combat) {
  if (combat.over) return combat;
  if (typeof combat.onPlayerTurnEnd === "function") combat.onPlayerTurnEnd(combat);
  if (combat.over) return combat;
  combat.discard.push(...combat.hand);
  combat.hand = [];
  enemyTurn(combat);
  if (combat.over) return combat;
  combat.turn += 1;
  combat.player.block = 0;
  combat.player.energy = combat.player.maxEnergy;
  combat.cardsPlayedThisTurn = 0;
  combat.energySpentThisTurn = 0;
  combat.playedIdsThisTurn = [];
  tickStatuses(combat.player);
  drawCards(combat, HAND_SIZE);
  runHook(combat, "onPlayerTurnStart");
  return combat;
}
function enemyTurn(combat) {
  const enemy = combat.enemy;
  enemy.block = 0;
  const intent = currentIntent(combat);
  if (enemy.skipNext) {
    enemy.skipNext = false;
    log(combat, `${enemy.name} action interrupted.`);
  } else {
    resolveIntent(combat, intent);
  }
  enemy.intentIndex += 1;
  tickStatuses(enemy);
  checkPlayerDead(combat);
}
function resolveIntent(combat, intent) {
  const enemy = combat.enemy;
  if (intent.block) enemy.block += intent.block;
  if (intent.attack) {
    const hits = intent.hits || 1;
    for (let i = 0; i < hits; i++) dealToPlayer(combat, intent.attack, { pierce: Boolean(intent.pierce) });
  }
  if (intent.mirror) dealToPlayer(combat, intent.mirror * combat.cardsPlayedThisTurn);
  if (intent.applySelf) addStatus(enemy, intent.applySelf.status, intent.applySelf.value);
  if (intent.applyPlayer) addStatus(combat.player, intent.applyPlayer.status, intent.applyPlayer.value);
}
function dealToEnemy(combat, baseAmount) {
  let amount = Math.max(0, Math.round(baseAmount));
  if (combat.player.statuses.strength) amount += combat.player.statuses.strength;
  if (combat.player.statuses.weak) amount = Math.floor(amount * 0.75);
  if (combat.enemy.statuses.vulnerable) amount = Math.floor(amount * 1.5);
  amount = Math.max(0, amount - combat.enemy.armor);
  const absorbed = Math.min(combat.enemy.block, amount);
  combat.enemy.block -= absorbed;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - (amount - absorbed));
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
var DURATION_STATUSES = /* @__PURE__ */ new Set(["vulnerable", "weak"]);
function tickStatuses(entity) {
  for (const key of Object.keys(entity.statuses)) {
    if (!DURATION_STATUSES.has(key)) continue;
    entity.statuses[key] -= 1;
    if (entity.statuses[key] <= 0) delete entity.statuses[key];
  }
}
function drawCards(combat, n) {
  for (let i = 0; i < n; i++) {
    if (combat.draw.length === 0) {
      if (combat.discard.length === 0) return;
      combat.draw = shuffle(combat.discard, combat.rng);
      combat.discard = [];
    }
    combat.hand.push(combat.draw.shift());
  }
}
function checkEnemyDead(combat) {
  if (combat.enemy.hp <= 0 && !combat.over) {
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
function log(combat, line) {
  combat.log = [...combat.log, line].slice(-10);
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
  // ── The act-4 finale: fought with the REAL deck; negotiation = an acceptance hook (boss-combat.js).
  // HP here is the PHASE-1 pool; phase advance refills to BOSS_PHASE_HP[2]/[3]. Pressure is modest —
  // the challenge is satisfying the handshake (lead SYN / play ACK), not a raw damage race.
  "the-refused-connection": {
    id: "the-refused-connection",
    name: "The Refused Connection",
    tier: "boss",
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

// ../../docs/games/metagame/stages/stage6/mapgen.js
var STANDARD_POOLS = {
  1: ["corrupt-packet", "firewall-entity", "null-pointer"],
  2: ["corrupt-packet", "firewall-entity", "null-pointer", "race-condition"],
  3: ["firewall-entity", "null-pointer", "race-condition", "packet-storm"],
  4: ["null-pointer", "race-condition", "packet-storm"]
};
var ELITE_ENEMIES = ["expired-certificate", "man-in-the-middle"];
var CONTENT_LAYERS = 6;
function generateAct(act, seed) {
  const rng = makeRng((Number(seed) || 1) * 100 + act);
  const layers = [];
  for (let layer = 0; layer < CONTENT_LAYERS; layer++) {
    const width = layerWidth(layer, rng);
    const nodes = [];
    for (let col = 0; col < width; col++) {
      nodes.push(makeNode(act, layer, col, rng));
    }
    layers.push(nodes);
  }
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
function makeNode(act, layer, col, rng) {
  return { id: nodeId(act, layer, col), act, layer, col, type: pickType(layer, rng), next: [] };
}
function pickType(layer, rng) {
  if (layer === 0) return "combat";
  if (layer === CONTENT_LAYERS - 1) return "rest";
  const roll = rng();
  if (layer >= 2 && layer <= CONTENT_LAYERS - 2 && roll < 0.18) return "elite";
  if (roll < 0.3) return "event";
  if (roll < 0.42) return "shop";
  return "combat";
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
  if (node.type === "elite") return ELITE_ENEMIES[Math.floor(rng() * ELITE_ENEMIES.length)];
  const pool = STANDARD_POOLS[act] || STANDARD_POOLS[4];
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
  TCP_STACK: { cost: 1, text: "Gain 2 Strength. (cost 1)", effect: (ctx) => ctx.applySelf("strength", 2) }
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

// ../../docs/games/metagame/stages/stage6/run.js
var PLAYER_MAX_HP = 60;
var REST_HEAL_FRACTION = 0.3;
var REWARD_CHOICES = 3;
var HANDSHAKE_REWARD = { combat: 10, elite: 30, boss: 0 };
var SKIP_REWARD = 5;
var REMOVAL_BASE = 25;
var REMOVAL_STEP = 25;
var FINAL_BOSS_ACT = 4;
var ACT_BOSSES = { 1: "kernel-panic", 2: "buffer-overflow", 3: "deadlock" };
var PRESTIGE_HP_PER_VERSION = 5;
function prestigeCost(version) {
  return (Number(version || 0) + 1) * 40;
}
function createRun({ seed = 1, version = 0, handshakes = 0 } = {}) {
  const maxHp = PLAYER_MAX_HP + Number(version || 0) * PRESTIGE_HP_PER_VERSION;
  const run = {
    seed,
    version,
    map: generateRun(seed, FINAL_BOSS_ACT),
    act: 1,
    currentNodeId: null,
    clearedIds: [],
    deck: [...STARTING_DECK],
    relics: [],
    hp: maxHp,
    maxHp,
    handshakes,
    removalsPurchased: 0,
    status: "map",
    pendingReward: null,
    notice: null
  };
  for (let i = 0; i < Number(version || 0); i++) grantRelic(run, `prestige-${i}`);
  return run;
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
function enemyForCurrentNode(run, rng = makeRng(hashSeed(run.seed, `${run.currentNodeId}:enemy`))) {
  const node = nodeById(run.map, run.currentNodeId);
  if (!node) return null;
  if (node.type === "boss") return run.act === FINAL_BOSS_ACT ? "the-refused-connection" : ACT_BOSSES[run.act] || "kernel-panic";
  return enemyForNode(node, run.act, rng);
}
function resolveCombat(run, { win, hpRemaining }) {
  const node = nodeById(run.map, run.currentNodeId);
  if (typeof hpRemaining === "number") run.hp = Math.max(0, hpRemaining);
  if (!win || run.hp <= 0) {
    run.status = "dead";
    return { ok: true, status: "dead" };
  }
  run.clearedIds.push(node.id);
  if (node.type === "boss") return clearBoss(run);
  run.handshakes += HANDSHAKE_REWARD[node.type] ?? HANDSHAKE_REWARD.combat;
  const reward = { cards: rollRewardCards(run, node.id) };
  if (node.type === "elite") {
    const relicId = grantRelic(run, node.id);
    if (relicId) reward.relic = relicId;
  }
  run.pendingReward = reward;
  run.status = "reward";
  return { ok: true, status: "reward" };
}
function takeReward(run, cardId) {
  if (run.status !== "reward") return { ok: false, reason: "no-reward" };
  if (cardId && run.pendingReward?.cards.includes(cardId)) run.deck.push(cardId);
  else run.handshakes += SKIP_REWARD;
  run.pendingReward = null;
  run.status = "map";
  return { ok: true, skipped: !cardId };
}
function rest(run, choice, payload) {
  const node = nodeById(run.map, run.currentNodeId);
  if (node?.type !== "rest") return { ok: false, reason: "not-rest" };
  if (choice === "heal") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * REST_HEAL_FRACTION));
  else if (choice === "upgrade") {
    const r = upgradeDeckCard(run, Number(payload));
    if (!r.ok) return r;
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
  return REMOVAL_BASE + REMOVAL_STEP * (run.removalsPurchased || 0);
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
function seatAtFinalBoss(run, deck) {
  run.act = FINAL_BOSS_ACT;
  const bossNode = run.map.acts[FINAL_BOSS_ACT - 1].layers.at(-1)[0];
  run.currentNodeId = bossNode.id;
  run.status = "boss";
  run.pendingReward = null;
  run.notice = null;
  if (Array.isArray(deck)) run.deck = [...deck];
  return bossNode.id;
}
function clearBoss(run) {
  if (run.act >= FINAL_BOSS_ACT) {
    run.status = "won";
    return { ok: true, status: "won" };
  }
  run.act += 1;
  run.currentNodeId = null;
  const relicId = grantRelic(run, `boss-clear-act${run.act}`);
  if (relicId) run.notice = `Relic acquired — ${relicById(relicId)?.name || relicId}`;
  run.status = "map";
  return { ok: true, status: "map", advancedToAct: run.act, relic: relicId };
}
function awardRelic(run, key = "event") {
  return grantRelic(run, key);
}
function grantRelic(run, key) {
  const id = rollRelic(hashSeed(run.seed, `${key}:relic`), run.relics);
  if (id) run.relics.push(id);
  return id;
}
function rollRewardCards(run, nodeId2) {
  const rng = makeRng(hashSeed(run.seed, nodeId2));
  const pool = [...REWARD_POOL];
  const picks = [];
  while (picks.length < REWARD_CHOICES && pool.length) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picks;
}
function screenForNode(node) {
  if (node.type === "combat" || node.type === "elite") return "combat";
  if (node.type === "boss") return "boss";
  return node.type;
}
function hashSeed(seed, nodeId2) {
  let h = (Number(seed) || 1) >>> 0;
  for (const ch of String(nodeId2)) h = Math.imul(h, 31) + ch.charCodeAt(0) >>> 0;
  return h || 1;
}

// ../../docs/games/metagame/stages/stage6/boss-combat.js
var BOSS_PHASE_HP = { 1: 60, 2: 80, 3: 60 };
var ONGOING_DAMAGE = 8;
function isSignalCard(card) {
  return card?.type === "Signal";
}
function baseId2(id) {
  return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id;
}
function accepts(combat, card) {
  if (!isSignalCard(card)) return true;
  if (combat.bossLocked) return false;
  const phase = combat.bossPhase || 1;
  if (phase === 1) return baseId2(combat.playedIdsThisTurn[0]) === "SYN";
  if (phase === 2) return combat.playedIdsThisTurn.some((id) => baseId2(id) === "ACK");
  return true;
}
function ackPlayed(combat) {
  return combat.playedIdsThisTurn.some((id) => baseId2(id) === "ACK");
}
function wireBossCombat(combat, { locked = false } = {}) {
  combat.bossPhase = 1;
  combat.bossLocked = Boolean(locked);
  combat.enemy.hp = BOSS_PHASE_HP[1];
  combat.enemy.maxHp = BOSS_PHASE_HP[1];
  combat.acceptance = accepts;
  combat.advancePhase = (c) => {
    const phase = c.bossPhase || 1;
    if (phase >= 3) return false;
    c.bossPhase = phase + 1;
    c.enemy.hp = BOSS_PHASE_HP[c.bossPhase];
    c.enemy.maxHp = BOSS_PHASE_HP[c.bossPhase];
    c.log = [...c.log || [], `Phase ${c.bossPhase}.`].slice(-10);
    return true;
  };
  combat.onPlayerTurnEnd = (c) => {
    if ((c.bossPhase || 1) !== 3 || c.bossLocked) return;
    if (!ackPlayed(c)) {
      c.log = [...c.log || [], "no ACK — 8 ongoing damage."].slice(-10);
      dealToPlayer(c, ONGOING_DAMAGE);
      if (c.player.hp <= 0 && !c.over) {
        c.over = true;
        c.result = "lose";
      }
    }
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
  if ((combat.bossPhase || 1) === 1) playFirstMatch(combat, (c) => baseId2(c.id) === "SYN");
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

// ../../docs/games/metagame/stages/stage6/ui-combat.js
var STATUS_LABEL = {
  strength: "STR",
  vulnerable: "VULN",
  weak: "WEAK"
};
var TIER_BADGE = { elite: "☠ ELITE", boss: "☣ BOSS" };
var PHASE_RULE = {
  1: "HANDSHAKE — lead each turn with SYN, or your Signals are refused.",
  2: "ESTABLISHED — play an ACK before your Signals, or they are refused.",
  3: "MAINTAIN — Signals always land, but a turn with no ACK costs 8 ongoing."
};
function combatView(combat, run) {
  const el = document.createElement("div");
  el.className = "s6db-combat";
  const intent = currentIntent(combat);
  el.innerHTML = `
    ${bossBanner(combat)}
    <div class="s6db-combat-head">
      <span class="s6db-turn">turn ${combat.turn}</span>
      <span class="s6db-pile">draw ${combat.draw.length} · discard ${combat.discard.length}${combat.exhaust.length ? ` · exhaust ${combat.exhaust.length}` : ""}</span>
    </div>
    <div class="s6db-fighters">
      ${enemyPanel(combat.enemy, intent, combat)}
      ${playerPanel(combat.player)}
    </div>
    <div class="s6db-energy" aria-label="energy">
      ${energyPips(combat.player.energy, combat.player.maxEnergy)}
      <span class="s6db-energy-num">${combat.player.energy} / ${combat.player.maxEnergy} energy</span>
    </div>
    <div class="s6db-hand" aria-label="hand"></div>
    <div class="s6db-combat-controls">
      <button type="button" data-action="end-turn">end turn ▸</button>
    </div>
    <ol class="s6db-log" aria-label="combat log"></ol>
  `;
  const hand = el.querySelector(".s6db-hand");
  hand.replaceChildren(...combat.hand.map((id, i) => handCard(id, i, combat.player.energy)));
  const log2 = el.querySelector(".s6db-log");
  log2.replaceChildren(...combat.log.slice(-5).map(toLi));
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
      <p class="s6db-boss-rule">${esc(PHASE_RULE[combat.bossPhase] || "")}</p>
      ${locked ? `<p class="s6db-boss-mismatch">PROTOCOL MISMATCH — every Signal deals 0 until you read Chapter 9.</p>
           <button type="button" data-action="epub">open the codex</button>` : ""}
    </div>`;
}
function describeIntent(intent, combat) {
  if (!intent) return { kind: "unknown", icon: "…", primary: "—", detail: "" };
  if (intent.mirror) {
    const reflect = intent.mirror * (combat?.cardsPlayedThisTurn || 0);
    return { kind: "mirror", icon: "🪞", primary: `${intent.mirror}×`, detail: `mirror · ~${reflect} now` };
  }
  if (intent.attack) {
    const hits = intent.hits || 1;
    const total = intent.attack * hits;
    return {
      kind: intent.pierce ? "pierce" : "attack",
      icon: intent.pierce ? "⚡" : "⚔",
      primary: String(total),
      detail: (hits > 1 ? `${intent.attack}×${hits}` : "") + (intent.pierce ? " unblockable" : "")
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
        <span class="s6db-fighter-name">${esc(enemy.name)}</span>
        ${tier ? `<span class="s6db-tier s6db-tier--${enemy.tier}">${tier}</span>` : ""}
      </div>
      ${bar(enemy.hp, enemy.maxHp, "enemy")}
      <div class="s6db-hp">HP ${enemy.hp} / ${enemy.maxHp}</div>
      <div class="s6db-meta">
        ${enemy.block ? `<span class="s6db-block">🛡 ${enemy.block}</span>` : ""}
        ${enemy.armor ? `<span class="s6db-armor">armor ${enemy.armor}</span>` : ""}
      </div>
      ${statusChips(enemy.statuses)}
      <div class="s6db-intent s6db-intent--${d.kind}" title="${esc(intent?.label || "")}">
        <span class="s6db-intent-icon">${d.icon}</span>
        <span class="s6db-intent-num">${esc(d.primary)}</span>
        <span class="s6db-intent-detail">${esc(d.detail || intent?.label || "")}</span>
      </div>
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
function energyPips(energy, maxEnergy) {
  const total = Math.max(maxEnergy, energy);
  let pips = "";
  for (let i = 0; i < total; i++) pips += `<span class="s6db-pip${i < energy ? " is-full" : ""}"></span>`;
  return `<span class="s6db-pips" aria-hidden="true">${pips}</span>`;
}
function handCard(id, index, energy) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card s6db-card--${(card?.type || "").toLowerCase()}`;
  button.dataset.play = String(index);
  const affordable = card && card.cost <= energy;
  button.disabled = !affordable;
  button.innerHTML = `
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    <strong class="s6db-card-id">${esc(card?.id || id)}</strong>
    <span class="s6db-card-type">${esc(card?.type || "")}</span>
    <small class="s6db-card-text">${esc(card?.text || "")}</small>`;
  return button;
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
function toLi(line) {
  const li = document.createElement("li");
  li.textContent = line;
  return li;
}
function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
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
function hubView(state, lock) {
  const el = document.createElement("div");
  el.className = "s6db-hub";
  const m = state.meta;
  const hasRun = Boolean(state.run);
  el.innerHTML = `
    <h2 class="s6db-hub-title">Protocol Codex</h2>
    <p class="s6db-hub-sub">A refused handshake at the edge of the archive. Build a deck of signals
      and protocols, descend four acts, and earn the right to be acknowledged.</p>
    <dl class="s6db-meta-grid">
      <div><dt>Banked handshakes</dt><dd>${m.banked}</dd></div>
      <div><dt>Protocol Version</dt><dd>v${m.protocolVersion}</dd></div>
      <div><dt>Runs cleared</dt><dd>${m.runsCleared}</dd></div>
      <div><dt>The Refused Connection</dt><dd>${lock.defeated ? "answered" : lock.unlocked ? "negotiable" : "refusing"}</dd></div>
    </dl>
    <div class="s6db-hub-actions">
      ${hasRun ? `<button type="button" data-action="continue-run">continue run ▸ act ${state.run.act}</button>
           <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>` : `<button type="button" data-action="begin-run">begin a run ▸</button>`}
      <button type="button" data-action="epub">open the codex</button>
      ${lock.defeated ? `<button type="button" data-action="bts">open trace.bts</button>` : ""}
    </div>
    <div class="s6db-prestige">
      <button type="button" data-action="prestige"${m.banked < prestigeCost(m.protocolVersion) ? " disabled" : ""}>
        reinforce protocol → v${m.protocolVersion + 1}</button>
      <span>cost ${prestigeCost(m.protocolVersion)} banked · each version: +5 max HP &amp; +1 starting relic</span>
    </div>
    <p class="s6db-hint">${esc2(lock.unlocked ? "Chapter 9 is read. The connection can be negotiated." : "The connection refuses everything you send. The codex explains why.")}</p>
  `;
  return el;
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
    ${run.notice ? `<div class="s6db-notice">${esc2(run.notice)}</div>` : ""}`;
  const grid = document.createElement("div");
  grid.className = "s6db-map-grid";
  for (const layer of act.layers) {
    const col = document.createElement("div");
    col.className = "s6db-map-col";
    for (const node of layer) col.appendChild(nodeChip(node, run, available, cleared));
    grid.appendChild(col);
  }
  el.appendChild(grid);
  const footer = document.createElement("div");
  footer.className = "s6db-map-foot";
  footer.innerHTML = `<span>HP ${run.hp}/${run.maxHp}</span><span>handshakes ${run.handshakes}</span>
    <span>deck ${run.deck.length}</span><span>relics ${run.relics.length}</span>
    <button type="button" data-action="to-hub" class="s6db-ghost">to hub</button>
    <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>`;
  el.appendChild(footer);
  return el;
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
  chip.innerHTML = `<span class="s6db-node-icon">${NODE_ICON[node.type] || "?"}</span>
    <span class="s6db-node-type">${esc2(node.type)}</span>`;
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
      <div><dt>Banked total</dt><dd>${state.meta.banked}</dd></div>
    </dl>
    <div class="s6db-hub-actions">
      <button type="button" data-action="new-run">try again ▸</button>
      <button type="button" data-action="abandon" class="s6db-ghost">back to hub</button>
    </div>`;
  return el;
}
function wonView(state) {
  const el = document.createElement("div");
  el.className = "s6db-end s6db-end--won";
  el.innerHTML = `
    <h2>The connection accepted a shared rule</h2>
    <p>Four acts negotiated. The archive lets you pass.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-action="bts">open trace.bts</button>
      <button type="button" data-action="new-run">run again ▸</button>
    </div>`;
  return el;
}
function esc2(value) {
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
    ${relic ? `<p class="s6db-relic-won">⬢ Relic acquired — <strong>${esc3(relic.name)}</strong>: ${esc3(relic.text)}</p>` : ""}
    <p>Add one card to your deck.</p>`;
  const row = document.createElement("div");
  row.className = "s6db-card-row";
  row.replaceChildren(...cards.map((id) => cardOption(id, "take", id)));
  el.appendChild(row);
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-take="skip" class="s6db-ghost">skip</button></div>`
  );
  return el;
}
function restView(run) {
  const el = document.createElement("div");
  el.className = "s6db-rest";
  const heal = Math.round(run.maxHp * 0.3);
  el.innerHTML = `
    <h2>Keepalive</h2>
    <p>A quiet socket. Choose ONE: recover ${heal} HP, upgrade a card, or thin your deck.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-rest="heal">rest — heal ${heal} HP ▸</button>
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
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="s6db-hub-actions"><button type="button" data-action="to-map">leave ▸</button></div>`
  );
  return el;
}
function eventView(run) {
  const el = document.createElement("div");
  el.className = "s6db-event";
  el.innerHTML = `
    <h2>A Defragmenter idles in the corridor</h2>
    <p>It offers to tidy your passage — or to optimize you, which it does not define.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-event="scan">accept payment — +12 handshakes ▸</button>
      <button type="button" data-event="defrag">let it optimize you — heal 30% HP ▸</button>
      <button type="button" data-event="rewrite">let it rewrite a protocol — +relic, −8 HP ▸</button>
      <button type="button" data-action="to-map" class="s6db-ghost">walk past</button>
    </div>`;
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
function cardOption(id, attr, value) {
  const card = cardById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `s6db-card s6db-card--${(card?.type || "").toLowerCase()}`;
  button.dataset[attr] = value;
  button.innerHTML = `
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    <strong class="s6db-card-id">${esc3(card?.id || id)}</strong>
    <span class="s6db-card-type">${esc3(card?.type || "")}</span>
    <small class="s6db-card-text">${esc3(card?.text || "")}</small>`;
  return button;
}
function strHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function esc3(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

// ../../docs/games/metagame/stages/stage6/renderer.js
var REFUSED_CONNECTION = "the-refused-connection";
function renderStage6({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage6-protocol-codex";
  root.innerHTML = `
    <header class="s6db-top"><strong>PROTOCOL CODEX</strong></header>
    <div class="s6db-screen" data-screen></div>`;
  host.replaceChildren(root);
  const screen = root.querySelector("[data-screen]");
  let combat = null;
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  const lockState = () => getBossLockState({ actions, state });
  const mount = (node) => screen.replaceChildren(node);
  const commit = () => {
    if (typeof save === "function") save();
    route();
  };
  root.addEventListener("click", handleClick);
  route();
  window.__fvStage6 = {
    jumpToBoss(deck) {
      if (!state.run) beginRun();
      seatAtFinalBoss(state.run, deck);
      state.ui.screen = "run";
      combat = null;
      commit();
      return state.run.currentNodeId;
    },
    // TEST/DEBUG: drive the in-run boss fight with a correct handshake strategy using the REAL
    // engine + acceptance. NOT a bypass — if ch9 is unread the boss is locked and this cannot win.
    autoNegotiate(maxTurns = 80) {
      const run = state.run;
      if (!run || run.status !== "boss") return { ok: false, reason: "not-at-boss" };
      if (!combat || combat.nodeId !== run.currentNodeId) combat = makeCombat(run);
      autoNegotiate(combat, maxTurns);
      const enemyHp = combat.enemy?.hp;
      const result = combat.result;
      if (combat.over) finishCombat(run);
      commit();
      return { ok: true, result, enemyHp, bossDefeated: Boolean(state.boss.defeated), won: state.run?.status === "won" };
    }
  };
  return { repaint: route, destroy() {
    if (window.__fvStage6) delete window.__fvStage6;
    root.remove();
  } };
  function route() {
    const run = state.run;
    if (state.ui.screen !== "run" || !run) {
      combat = null;
      return mount(hubView(state, lockState()));
    }
    switch (run.status) {
      // Every boss — including the act-4 finale — is now a real-deck fight (combatView).
      case "combat":
      case "boss":
        return mountCombat(run);
      case "reward":
        combat = null;
        return mount(rewardView(run));
      case "rest":
        combat = null;
        return mount(restView(run));
      case "shop":
        combat = null;
        return mount(shopView(run));
      case "event":
        combat = null;
        return mount(eventView(run));
      case "dead":
        combat = null;
        return mount(deathView(state, run));
      case "won":
        combat = null;
        return mount(wonView(state, run));
      case "map":
      default:
        combat = null;
        return mount(mapView(run));
    }
  }
  function mountCombat(run) {
    if (!combat || combat.nodeId !== run.currentNodeId) combat = makeCombat(run);
    if (combat.over) {
      finishCombat(run);
      return route();
    }
    mount(combatView(combat, run));
  }
  function makeCombat(run) {
    const enemyId = enemyForCurrentNode(run, makeRng(strHash2(`${run.seed}:${run.currentNodeId}:enemy`)));
    const enemy = instantiateEnemy(enemyId, run.act);
    const c = createCombat({
      deck: run.deck,
      player: { hp: run.hp, maxHp: run.maxHp },
      enemy,
      seed: strHash2(`${run.seed}:${run.currentNodeId}:combat`),
      relics: relicsFor(run.relics)
    });
    c.nodeId = run.currentNodeId;
    if (enemyId === REFUSED_CONNECTION) wireBossCombat(c, { locked: !lockState().unlocked });
    return c;
  }
  function finishCombat(run) {
    const win = combat.result === "win";
    const node = nodeById(run.map, run.currentNodeId);
    const isFinalBoss = node?.type === "boss" && run.act >= FINAL_BOSS_ACT;
    resolveCombat(run, { win, hpRemaining: combat.player.hp });
    if (win && run.act > (state.meta.bestAct || 0)) state.meta.bestAct = run.act;
    if (!win) state.meta.banked = (state.meta.banked || 0) + Math.floor((run.handshakes || 0) * 0.5);
    combat = null;
    if (win && isFinalBoss) finalBossDefeated(run);
  }
  function finalBossDefeated(run) {
    state.boss.defeated = true;
    state.boss.reached = true;
    state.meta.firstClearComplete = true;
    state.meta.runsCleared = (state.meta.runsCleared || 0) + 1;
    state.meta.banked = (state.meta.banked || 0) + (run.handshakes || 0);
    completeOnce({ stage: 6, defeated: true, reward: { handshakes: 80 }, btsPath: BTS_PATH });
  }
  function doPrestige() {
    const cost = prestigeCost(state.meta.protocolVersion || 0);
    if ((state.meta.banked || 0) < cost) return;
    state.meta.banked -= cost;
    state.meta.protocolVersion = (state.meta.protocolVersion || 0) + 1;
  }
  function beginRun() {
    state.meta.runsStarted = (state.meta.runsStarted || 0) + 1;
    const seed = 1e3 + state.meta.runsStarted * 7919 + (state.meta.protocolVersion || 0) * 131;
    state.run = createRun({ seed, version: state.meta.protocolVersion || 0, handshakes: 0 });
    state.ui.screen = "run";
    combat = null;
  }
  function resolveEvent(run, key) {
    if (key === "scan") run.handshakes += 12;
    else if (key === "defrag") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3));
    else if (key === "rewrite") {
      run.hp = Math.max(1, run.hp - 8);
      const id = awardRelic(run, `event-${run.currentNodeId}`);
      run.notice = id ? `Relic acquired — ${relicById(id)?.name || id}` : "no protocol left to rewrite";
    }
    closeNode(run);
  }
  function handleClick(event) {
    const run = state.run;
    if (handleTarget(event, run)) return commit();
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    if (!runAction(btn.dataset.action, run)) return;
    commit();
  }
  function handleTarget(event, run) {
    const play = event.target.closest("[data-play]");
    if (play && combat && !combat.over) {
      playCard(combat, Number(play.dataset.play));
      if (combat.over) finishCombat(run);
      return true;
    }
    if (!run) return false;
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
      case "continue-run":
        state.ui.screen = "run";
        return true;
      case "abandon":
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
          endTurn(combat);
          if (combat.over) finishCombat(run);
        }
        return true;
      case "epub":
        openEpub({ viewer, actions, achievements, bell, state });
        if (combat && combat.bossPhase && combat.bossLocked) combat = null;
        return true;
      case "bts":
        openBts({ bts, viewer });
        return true;
      default:
        return false;
    }
  }
}
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
function strHash2(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
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
      firstClearComplete: false
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
  requiredAction: REQUIRED_ACTION
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
  const id = "stage6-protocol-codex-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyProtocolChapter9Unlock,
  defaultState2 as defaultState,
  defeatRefusedConnection,
  endProtocolTurn,
  getBossLockState,
  mountStage,
  playProtocolCard,
  recordLockedBossAttempt,
  stageMeta,
  startProtocolTurn
};
