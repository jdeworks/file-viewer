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

// ../../docs/games/metagame/stages/stage7/renderer.js
function renderStage7({
  host,
  state,
  actions,
  achievements,
  bell,
  bts,
  viewer,
  save,
  onStageComplete
}) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>addresses <span data-field="addresses"></span></div>
      <div>selected <span data-field="selected"></span></div>
    </header>
    <section class="s7-board" aria-label="Name Collision candidates"></section>
    <section class="s7-evidence">
      <div>
        <h2>The Name Collision</h2>
        <div class="s7-status" data-field="status"></div>
        <p data-field="hint"></p>
      </div>
      <div class="s7-meta" aria-label="Entity F metadata"></div>
    </section>
    <ol class="s7-log" aria-label="judgment log"></ol>
    <div class="s7-controls">
      <button type="button" data-action="photo">open Entity F photo</button>
      <button type="button" data-action="gps">inspect GPSInfo</button>
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);
  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const board = root.querySelector(".s7-board");
  const meta = root.querySelector(".s7-meta");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });
  board.replaceChildren(...candidates.map((candidate) => {
    const card = document.createElement("article");
    card.className = "s7-candidate";
    card.dataset.entity = candidate.id;
    card.innerHTML = `
      <strong>Entity ${candidate.id}</strong>
      <span>${candidate.claim}</span>
      <button type="button" data-commit="${candidate.id}">commit</button>
    `;
    return card;
  }));
  meta.replaceChildren(...metadataRows.F.map(([field, value]) => {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.field = field;
    row.innerHTML = `<strong>${field}</strong><span>${value}</span>`;
    return row;
  }));
  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.addresses.textContent = String(state.addresses);
    fields.selected.textContent = state.evidence.selectedEntity || "none";
    fields.status.textContent = `${lock.informationState}${lock.defeated ? " / defeated" : ""}`;
    fields.hint.textContent = lock.hint;
    for (const card of board.querySelectorAll(".s7-candidate")) {
      card.classList.toggle("is-contradicted", state.evidence.contradicted.includes(card.dataset.entity));
      card.classList.toggle("is-selected", state.evidence.selectedEntity === card.dataset.entity);
    }
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
  }
  root.addEventListener("click", (event) => {
    const fieldButton = event.target.closest("button[data-field]");
    if (fieldButton) {
      inspectContradictoryExif({
        state,
        actions,
        achievements,
        bell,
        field: fieldButton.dataset.field,
        entity: "F"
      });
      persistAndPaint();
      return;
    }
    const commitButton = event.target.closest("button[data-commit]");
    if (commitButton) {
      const result = commitIdentity({ state, entity: commitButton.dataset.commit });
      if (result.defeated) {
        completeOnce({ stage: 7, defeated: true, reward: { addresses: 150 }, btsPath: BTS_PATH });
      }
      persistAndPaint();
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "photo") openEntityFPhoto(viewer);
    if (button.dataset.action === "gps") {
      inspectContradictoryExif({ state, actions, achievements, bell, field: "GPSInfo", entity: "F" });
    }
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });
  if (getBossLockState({ actions, state }).unlocked) {
    applyExifContradictionUnlock({ state, achievements, bell });
  }
  repaint();
  return {
    repaint,
    destroy() {
      root.remove();
    }
  };
  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}
function openEntityFPhoto(viewer) {
  const opts = buildEntityFPhotoOpenOptions();
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(ENTITY_F_IMAGE_PATH, opts);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(ENTITY_F_IMAGE_PATH, opts);
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
  const unsubscribe = subscribeToExifContradiction(ctx.actions, () => {
    applyExifContradictionUnlock({ state, achievements: ctx.achievements, bell: ctx.bell });
    if (typeof ctx.save === "function") ctx.save();
    if (view && typeof view.repaint === "function") view.repaint();
  });
  view = renderStage7({ ...ctx, state });
  return {
    destroy() {
      unsubscribe();
      if (view && typeof view.destroy === "function") view.destroy();
    }
  };
}
function subscribeToExifContradiction(actions, onUnlock) {
  if (actions && typeof actions.subscribeToActions === "function") {
    return actions.subscribeToActions((detail) => {
      if (isExifContradictionDetail(detail)) onUnlock(detail);
    }) || (() => {
    });
  }
  const handler = (event) => {
    if (isExifContradictionDetail(event.detail)) onUnlock(event.detail);
  };
  window.addEventListener("fv:games:action", handler);
  return () => window.removeEventListener("fv:games:action", handler);
}
function isExifContradictionDetail(detail) {
  return Boolean(detail && Number(detail.stage) === 7 && detail.action === ACTION_NAME);
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
