// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/games/metagame/stages/stage7/index.js (+ its local modules) by
// build/metagame/build.mjs. Rebuild:  node build/metagame/build.mjs  (run by scripts/check.sh).
// Exports stageMeta / defaultState / mountStage. Shared ../../*.js singletons + ./styles.css stay
// external (NOT inlined). The hub's stage-manifest.js LOADERS import THIS file.


// ../../docs/games/metagame/stages/stage7/messages.js
var ACTION_NAME = "exif_contradiction_found";
var REQUIRED_ACTION = "7.exif_contradiction_found";
var ACHIEVEMENT_ID = "stage7.exif_contradiction_found";
var ACHIEVEMENT_TEXT = "I looked beyond the surface of the image.";
var BTS_PATH = "/docs/bts/identity_arbiter.bts";
var ENTITY_F_IMAGE_PATH = "/docs/examples/metagame/stage7/entity_f_verification.png";
var ENTITY_METADATA_SIDECAR_PATH = "/docs/examples/metagame/stage7/entity_metadata.json";
var ENTITY_ANCHOR_PATH = "/docs/examples/metagame/stage7/entity_anchor_0043.txt";
var ANCHOR_ACTION = "anchor_chain_examined";
var substageHints = {
  1: "Six dossiers, one name. Scan B, C, D, E — flag the field that contradicts an ambient fact.",
  2: "A and F are tied on documents. Diff the two dossiers and find the tampered field.",
  3: "Audit Entity F's activity log. One entry is logically impossible.",
  4: "Follow F's credential chain. Open the referenced anchor record in the viewer.",
  5: "Open Entity F's photo, inspect its metadata, then commit to the real holder."
};
var bellMessages = {
  start: "something presented itself. I had to decide.",
  unlock: "the image knew more than the image showed. the GPS was outside any layer.",
  wrongCommit: "incorrect. one of them was not what it appeared.",
  defeated: "I know which one. I chose. I was right."
};
var lockedHintLadder = [
  "one of them looks exactly like the description. that does not mean it is real.",
  "the documents leave Entity A and Entity F tied.",
  "the photo shows something the document does not. the metadata holds the answer.",
  "open Entity F's image metadata and inspect GPSInfo, then commit to Entity A."
];
var arbiterLines = {
  fContradicted: "Entity F contradicted: GPSInfo is outside every known entity layer.",
  stillChoose: "Entity F is eliminated. Judgment still requires selecting Entity A.",
  defeated: "The Name Collision resolves to Entity A."
};

// ../../docs/games/metagame/stages/stage7/boss.js
function hasExifContradiction(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(7, ACTION_NAME));
}
function getBossLockState({ actions, state }) {
  const unlocked = hasExifContradiction(actions) || Boolean(state?.boss?.unlocked);
  const hintIndex = Math.min(Math.max(Number(state?.boss?.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state?.boss?.defeated),
    informationState: unlocked ? "Entity F contradicted" : "A/F unresolved",
    contradicted: [...state?.evidence?.contradicted || []],
    defeatPossible: unlocked,
    requiredSelection: "A",
    hint: unlocked ? bellMessages.unlock : lockedHintLadder[hintIndex]
  };
}
function recordLockedBossAttempt(state) {
  const boss = state.boss;
  boss.reached = true;
  boss.attempts = Number(boss.attempts || 0) + 1;
  boss.lockHintStep = Math.min(Number(boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  pushLog(state, bellMessages.wrongCommit);
  return getBossLockState({ actions: null, state });
}
function applyExifContradictionUnlock({ state, achievements, bell }) {
  const boss = state.boss;
  const firstUnlock = !boss.unlocked;
  boss.unlocked = true;
  markContradicted(state, "F");
  if (firstUnlock) {
    pushLog(state, arbiterLines.fContradicted);
    pushLog(state, arbiterLines.stillChoose);
    notifyBell(bell, bellMessages.unlock, "stage7.exif_contradiction_found");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 7,
      text: ACHIEVEMENT_TEXT,
      action: "7.exif_contradiction_found",
      entity: "F"
    });
  }
  return firstUnlock;
}
function inspectContradictoryExif({ state, actions, achievements, bell, field = "GPSInfo", entity = "F" }) {
  if (entity !== "F" || field !== "GPSInfo") {
    pushLog(state, "metadata inspected. no decisive contradiction found.");
    return { ok: false };
  }
  actions?.setAction?.(7, ACTION_NAME, {
    source: "image-metadata",
    file: "entity_f_verification.png",
    field: "GPSInfo",
    entity: "F"
  });
  applyExifContradictionUnlock({ state, achievements, bell });
  return { ok: true, contradicted: "F" };
}
function commitIdentity({ state, entity }) {
  const selected = String(entity || "").trim().toUpperCase();
  if (Number(state.substage || 1) < 5) return { ok: false, reason: "not-yet-boss" };
  state.boss.reached = true;
  state.evidence.selectedEntity = selected;
  if (!state.boss.unlocked) {
    recordLockedBossAttempt(state);
    return { ok: false, reason: "locked" };
  }
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  if (selected !== "A") {
    pushLog(state, `${selected || "unknown"} is not the real credential holder.`);
    return { ok: false, reason: "wrong-entity" };
  }
  state.boss.defeated = true;
  state.addresses = Number(state.addresses || 0) + 150;
  state.meta.firstClearComplete = true;
  pushLog(state, arbiterLines.defeated);
  return { ok: true, defeated: true };
}
function pushLog(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}
function markContradicted(state, entity) {
  const set = new Set(state.evidence.contradicted || []);
  set.add(entity);
  state.evidence.contradicted = [...set];
}
function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 7, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 7 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 7 });
  else if (bell && typeof bell.showBell === "function") bell.showBell(id, text, { stage: 7 });
}
function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") {
    achievements.unlockAchievement(id, detail);
  } else if (achievements && typeof achievements.unlock === "function") {
    achievements.unlock(id, detail);
  }
}

// ../../docs/games/metagame/stages/stage7/content.js
var candidates = [
  { id: "A", claim: "consistent EXIF, consistent credentials", status: "real" },
  { id: "B", claim: "photo software exposes editing", status: "impostor" },
  { id: "C", claim: "response timing is scripted", status: "impostor" },
  { id: "D", claim: "activity log names an impossible event", status: "impostor" },
  { id: "E", claim: "route is inactive since cycle 0043", status: "impostor" },
  { id: "F", claim: "documents are clean; GPSInfo is outside any known layer", status: "impostor" }
];
var metadataRows = {
  A: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "Layer-0 coordinates"],
    ["Software", "Boot Vision 1.0"]
  ],
  F: [
    ["DateTimeOriginal", "Boot cycle 0047"],
    ["GPSInfo", "52.3N, 4.8E / outside known layers"],
    ["Software", "Boot Vision 1.0"]
  ]
};
var entityFields = {
  B: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    {
      id: "route_active_since",
      label: "Route Active Since",
      value: "cycle 0043",
      wrong: true,
      reason: "Route ENTITY_ANCHOR_0043 was decommissioned at cycle 0043."
    },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ],
  C: [
    {
      id: "response_timing",
      label: "Response Timing",
      value: "scripted: 0ms variance",
      wrong: true,
      reason: "All entities exhibit non-zero timing variance in this system."
    },
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" }
  ],
  D: [
    { id: "credential_class", label: "Credential Class", value: "TIER-1-PROXY" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" },
    {
      id: "log_event",
      label: "Activity Log Event",
      value: "LAYER_MERGE",
      wrong: true,
      reason: "LAYER_MERGE is not a valid event type in this system."
    }
  ],
  E: [
    {
      id: "route_status",
      label: "Route Status",
      value: "active since cycle 0044",
      wrong: true,
      reason: "Route inactive since cycle 0043; activity after 0043 is impossible."
    },
    { id: "layer_tag", label: "Layer Tag", value: "LAYER-0" },
    { id: "software", label: "Software", value: "Boot Vision 1.0" }
  ]
};
var SCAN_ENTITIES = ["B", "C", "D", "E"];
var ambientFacts = [
  "Current cycle: 0047",
  "Valid event types: BOOT, SHUTDOWN, SYNC, PING, WATCHDOG",
  "All entities exhibit non-zero timing variance",
  "ENTITY_ANCHOR_0043 decommissioned at cycle 0043"
];
var entityFEventLog = [
  { cycle: "0039", event: "BOOT", id: "ev1" },
  { cycle: "0040", event: "SYNC", id: "ev2" },
  { cycle: "0041", event: "PING", id: "ev3" },
  { cycle: "0042", event: "WATCHDOG", id: "ev4" },
  { cycle: "0043", event: "ACTIVE", id: "ev5" },
  {
    cycle: "0043",
    event: "DORMANT",
    id: "ev6",
    impossible: true,
    reason: "Simultaneous ACTIVE/DORMANT states at cycle 0043 — a logical impossibility."
  },
  { cycle: "0044", event: "SYNC", id: "ev7" },
  { cycle: "0045", event: "PING", id: "ev8" },
  { cycle: "0046", event: "WATCHDOG", id: "ev9" },
  { cycle: "0047", event: "BOOT", id: "ev10" }
];
var metadataArtifact = {
  format: "stage7-image-metadata-sidecar",
  note: "The current app image metadata reader extracts EXIF from JPEG APP1 but not PNG text chunks. Stage 7 therefore uses real same-origin PNG fixtures plus this local sidecar for the authored EXIF-style evidence.",
  decisiveField: "GPSInfo",
  decisiveEntity: "F",
  entities: {
    A: Object.fromEntries(metadataRows.A),
    F: Object.fromEntries(metadataRows.F)
  }
};

// ../../docs/games/metagame/stages/stage7/substages.js
var SUBSTAGE = { SCAN: 1, DUP: 2, TIMELINE: 3, CHAIN: 4, BOSS: 5 };
function flagField({ state, entityId, fieldId }) {
  const field = (entityFields[entityId] || []).find((f) => f.id === fieldId);
  if (!field) return { ok: false, reason: "unknown" };
  if (!field.wrong) {
    state.evidence.wrongFlagCount = Number(state.evidence.wrongFlagCount || 0) + 1;
    pushLog2(state, "insufficient evidence — cross-check the ambient facts.");
    return { ok: false, reason: "not-contradiction" };
  }
  if (state.evidence.flags[entityId]) return { ok: true, already: true };
  state.evidence.flags[entityId] = fieldId;
  state.evidence.eliminated = [.../* @__PURE__ */ new Set([...state.evidence.eliminated || [], entityId])];
  state.addresses = Number(state.addresses || 0) + 10;
  pushLog2(state, `Entity ${entityId}: ${field.reason}`);
  const complete = SCAN_ENTITIES.every((e) => state.evidence.flags[e]);
  if (complete) {
    if (Number(state.evidence.wrongFlagCount || 0) === 0) {
      state.addresses += 25;
      pushLog2(state, "clean scan. +25 precision bonus.");
    }
    advance(state, SUBSTAGE.DUP);
  }
  return { ok: true, complete };
}
function diffField({ state, fieldName }) {
  if (fieldName !== "GPSInfo") {
    pushLog2(state, "this field matches across both dossiers.");
    return { ok: false };
  }
  state.evidence.partialContra = [.../* @__PURE__ */ new Set([...state.evidence.partialContra || [], "F.GPSInfo"])];
  state.evidence.dupTestComplete = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Entity F's GPSInfo diverges from Entity A. Not yet decisive — the case continues.");
  advance(state, SUBSTAGE.TIMELINE);
  return { ok: true, complete: true };
}
function markImpossible({ state, evId }) {
  const ev = entityFEventLog.find((e) => e.id === evId);
  if (!ev || !ev.impossible) {
    pushLog2(state, "this entry is plausible. keep looking.");
    return { ok: false };
  }
  state.evidence.timelineContradictionCycle = ev.cycle;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, ev.reason);
  advance(state, SUBSTAGE.CHAIN);
  return { ok: true, complete: true };
}
function markChainBroken({ state }) {
  if (state.evidence.chainBroken) return { ok: true, already: true };
  state.evidence.chainBroken = true;
  state.addresses = Number(state.addresses || 0) + 15;
  pushLog2(state, "Entity F's credential chain references a decommissioned anchor. The chain is invalid.");
  advance(state, SUBSTAGE.BOSS);
  return { ok: true, complete: true };
}
function advance(state, to) {
  if (Number(state.substage || 1) < to) state.substage = to;
}
function pushLog2(state, line) {
  state.log = [...state.log || [], line].slice(-8);
}

// ../../docs/games/metagame/stages/stage7/renderer.js
var SUBSTAGE_LABEL = {
  1: "1/5 CREDENTIAL SCAN",
  2: "2/5 DUPLICATE TEST",
  3: "3/5 TIMELINE AUDIT",
  4: "4/5 REFERENCE CHASE",
  5: "5/5 EXIF ARBITER (BOSS)"
};
function renderStage7({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>stage <span data-field="substage"></span></div>
      <div>addresses <span data-field="addresses"></span></div>
    </header>
    <section class="s7-main" aria-label="investigation"></section>
    <p class="s7-hint" data-field="hint"></p>
    <ol class="s7-log" aria-label="judgment log"></ol>
    <div class="s7-controls">
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el2) => [el2.dataset.field, el2]));
  const main = root.querySelector(".s7-main");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-flag], button[data-diff], button[data-ev], button[data-commit]");
    if (!button) return;
    const d = button.dataset;
    if (d.flag) flagField({ state, entityId: d.entity, fieldId: d.flag });
    else if (d.diff) diffField({ state, fieldName: d.diff });
    else if (d.ev) markImpossible({ state, evId: d.ev });
    else if (d.commit) commitBoss(d.commit);
    else if (d.action === "open-anchor") openInViewer(ENTITY_ANCHOR_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "photo") openInViewer(ENTITY_F_IMAGE_PATH, buildEntityFPhotoOpenOptions());
    else if (d.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });
  repaint();
  window.__fvStage7 = {
    state: () => state,
    solveInvestigation() {
      for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: entityFields[id].find((f) => f.wrong).id });
      diffField({ state, fieldName: "GPSInfo" });
      markImpossible({ state, evId: entityFEventLog.find((e) => e.impossible).id });
      persistAndPaint();
      return state.substage;
    }
  };
  return {
    repaint,
    destroy() {
      if (window.__fvStage7) delete window.__fvStage7;
      root.remove();
    }
  };
  function commitBoss(entity) {
    const result = commitIdentity({ state, entity });
    if (result.defeated) completeOnce({ stage: 7, defeated: true, reward: { addresses: 150 }, btsPath: BTS_PATH });
  }
  function openInViewer(path, opts) {
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(path, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(path, opts);
  }
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.substage.textContent = SUBSTAGE_LABEL[state.substage] || String(state.substage);
    fields.addresses.textContent = String(state.addresses);
    fields.hint.textContent = state.boss.defeated ? "Case closed." : substageHints[state.substage] || lock.hint;
    renderMain(lock);
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }
  function renderMain(lock) {
    if (state.substage === SUBSTAGE.SCAN) return main.replaceChildren(renderScan());
    if (state.substage === SUBSTAGE.DUP) return main.replaceChildren(renderDup());
    if (state.substage === SUBSTAGE.TIMELINE) return main.replaceChildren(renderTimeline());
    if (state.substage === SUBSTAGE.CHAIN) return main.replaceChildren(renderChain());
    return main.replaceChildren(renderBoss(lock));
  }
  function renderScan() {
    const wrap = el("div", "s7-ss1");
    const facts = el("aside", "s7-ambient-facts");
    facts.innerHTML = `<h3>Ambient facts</h3><ul>${ambientFacts.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    const cards = el("div", "s7-cards");
    for (const id of SCAN_ENTITIES) {
      const card = el("article", "s7-card");
      if (state.evidence.flags[id]) card.classList.add("is-flagged");
      card.innerHTML = `<strong>Entity ${id}</strong>`;
      for (const f of entityFields[id]) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.entity = id;
        b.dataset.flag = f.id;
        b.disabled = Boolean(state.evidence.flags[id]);
        b.innerHTML = `<span>${f.label}</span><em>${f.value}</em>`;
        card.append(b);
      }
      cards.append(card);
    }
    wrap.append(facts, cards);
    return wrap;
  }
  function renderDup() {
    const wrap = el("div", "s7-ss2");
    const panel = el("div", "s7-duptest-panel");
    const colA = el("div", "s7-duptest-col");
    colA.innerHTML = `<h3>Entity A</h3>${metadataRows.A.map(([f, v]) => `<div class="s7-row"><span>${f}</span><em>${v}</em></div>`).join("")}`;
    const colF = el("div", "s7-duptest-col");
    colF.innerHTML = `<h3>Entity F</h3>`;
    for (const [f, v] of metadataRows.F) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.diff = f;
      b.innerHTML = `<span>${f}</span><em>${v}</em>`;
      colF.append(b);
    }
    panel.append(colA, colF);
    const note = el("p", "s7-duptest-hint");
    note.textContent = "DIFF DOSSIERS — identify the tampered field on Entity F.";
    wrap.append(panel, note);
    return wrap;
  }
  function renderTimeline() {
    const wrap = el("div", "s7-ss3");
    wrap.innerHTML = `<p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. Mark the impossible entry.</p>`;
    const list = el("ol", "s7-timeline");
    for (const ev of entityFEventLog) {
      const li = document.createElement("li");
      li.innerHTML = `<span>cycle ${ev.cycle}</span><span>${ev.event}</span>`;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.ev = ev.id;
      b.textContent = "mark impossible";
      li.append(b);
      list.append(li);
    }
    wrap.append(list);
    return wrap;
  }
  function renderChain() {
    const wrap = el("div", "s7-ss4");
    wrap.innerHTML = `
      <article class="s7-dossier-chain">
        <h3>Entity F — Credential Chain</h3>
        <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
        <p>Chain reference:
          <button type="button" data-action="open-anchor">CREDENTIAL_CHAIN → ENTITY_ANCHOR_0043 [open exhibit]</button>
        </p>
      </article>
      <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>`;
    return wrap;
  }
  function renderBoss(lock) {
    const wrap = el("div", "s7-ss5");
    const header = el("header", "s7-boss-header");
    header.textContent = "IDENTITY REQUIRES PRIMARY SOURCE VERIFICATION";
    wrap.append(header);
    const intro = el("p");
    intro.textContent = "Entity F presents a verification image. Inspect its embedded metadata.";
    wrap.append(intro);
    const controls = el("div", "s7-controls");
    controls.innerHTML = `<button type="button" data-action="photo">open Entity F photo</button>`;
    wrap.append(controls);
    if (lock.unlocked) {
      const verdict = el("div", "s7-verdict");
      verdict.innerHTML = `<p>Entity F's image GPS is outside every known entity layer. F is eliminated.</p>
        <p>Commit to the real credential holder.</p>`;
      const row = el("div", "s7-commit-row");
      for (const c of candidates) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.commit = c.id;
        b.disabled = state.boss.defeated;
        b.textContent = `commit ${c.id}`;
        row.append(b);
      }
      verdict.append(row);
      wrap.append(verdict);
    } else {
      const waiting = el("p", "s7-hint");
      waiting.textContent = lock.hint;
      wrap.append(waiting);
    }
    return wrap;
  }
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}
function buildEntityFPhotoOpenOptions() {
  return {
    mime: "image/png",
    source: "stage7",
    metadataField: metadataArtifact.decisiveField,
    entity: metadataArtifact.decisiveEntity,
    metadataSidecar: ENTITY_METADATA_SIDECAR_PATH,
    metadataRows: metadataRows.F.map(([field, value]) => ({ field, value }))
  };
}
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(7);
  else if (bts && typeof bts.openBts === "function") bts.openBts(7);
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

// ../../docs/games/metagame/stages/stage7/state.js
function defaultState() {
  return {
    version: 2,
    addresses: 0,
    substage: 1,
    // 1 scan · 2 dup · 3 timeline · 4 chain · 5 boss
    evidence: {
      eliminated: [],
      // populated incrementally as entities are flagged
      contradicted: [],
      selectedEntity: null,
      flags: {},
      // { B:"fieldId", C:"fieldId", ... } from the credential scan
      wrongFlagCount: 0,
      dupTestComplete: false,
      timelineContradictionCycle: null,
      chainBroken: false,
      partialContra: []
      // e.g. ["F.GPSInfo"]
    },
    boss: {
      reached: false,
      unlocked: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0
    },
    log: [
      bellMessages.start,
      "Six dossiers claim one name: CORE_ENTITY_001."
    ],
    meta: {
      firstClearComplete: false
    }
  };
}
function normalizeState(state) {
  const fresh = defaultState();
  const incoming = state && typeof state === "object" ? state : {};
  if (Number(incoming.version) < 2) return fresh;
  const target = incoming;
  target.version = 2;
  target.addresses = Number.isFinite(Number(target.addresses)) ? Number(target.addresses) : fresh.addresses;
  target.substage = clampSubstage(target.substage, fresh.substage);
  target.evidence = mergePlain(fresh.evidence, target.evidence);
  target.evidence.eliminated = Array.isArray(target.evidence.eliminated) ? target.evidence.eliminated : [];
  target.evidence.contradicted = Array.isArray(target.evidence.contradicted) ? target.evidence.contradicted : [];
  target.evidence.flags = target.evidence.flags && typeof target.evidence.flags === "object" ? target.evidence.flags : {};
  target.evidence.partialContra = Array.isArray(target.evidence.partialContra) ? target.evidence.partialContra : [];
  target.boss = mergePlain(fresh.boss, target.boss);
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.meta = mergePlain(fresh.meta, target.meta);
  return target;
}
function clampSubstage(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.floor(n) : fallback;
}
function mergePlain(base, override) {
  return { ...base, ...override && typeof override === "object" ? override : {} };
}

// ../../docs/games/metagame/stages/stage7/index.js
var stageMeta = {
  id: 7,
  slug: "identity-arbiter",
  name: "Identity Arbiter",
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
  if (hasExifContradiction(ctx.actions)) {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
  }
  const unsubscribe = subscribeToActionName(ctx.actions, ACTION_NAME, () => {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  const unsubscribeAnchor = subscribeToActionName(ctx.actions, ANCHOR_ACTION, () => {
    markChainBroken({ state });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  view = renderStage7({ ...ctx, state });
  return {
    repaint() {
      if (view && typeof view.repaint === "function") view.repaint();
    },
    destroy() {
      unsubscribe();
      unsubscribeAnchor();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function subscribeToActionName(actions, actionName, onFire) {
  const matches = (detail) => Boolean(detail && Number(detail.stage) === 7 && detail.action === actionName);
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (matches(detail)) onFire(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (matches(event.detail)) onFire(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function ensureStyles() {
  const id = "stage7-identity-arbiter-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.append(link);
}
export {
  applyExifContradictionUnlock,
  commitIdentity,
  defaultState2 as defaultState,
  getBossLockState,
  inspectContradictoryExif,
  mountStage,
  recordLockedBossAttempt,
  stageMeta
};
