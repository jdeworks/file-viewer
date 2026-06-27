import { loadSave, persistSave, resetSave } from './save.js';
import * as actions from './action-flags.js';
import * as achievements from './achievements.js';
import * as bell from './bell.js';
import * as bts from './bts.js';
import { createStageRegistry } from './registry.js';
import { createViewerBridge } from './viewer-bridge.js';
import { MANIFEST_FIELDS, listStageMetas, stageMetaFor, loadStage } from './stage-manifest.js';

// Stages are loaded lazily (one stage's module graph at a time) rather than eagerly importing all
// ten up front. The registry starts empty and each stage module is registered the first time it's
// loaded; the hub's all-stages views (nav, title, dev menu, bts) read the lightweight manifest.
const registry = createStageRegistry([]);
const loadedStages = new Map();

// Load + register a stage module on demand. Validates that its stageMeta matches the manifest
// (drift guard — the games smoke traverses every stage, so a mismatch fails the smoke).
async function ensureStageModule(id) {
  const n = Number(id);
  if (loadedStages.has(n)) return loadedStages.get(n);
  const mod = await loadStage(n);
  const manifest = stageMetaFor(n);
  for (const field of MANIFEST_FIELDS) {
    if (mod.stageMeta?.[field] !== manifest?.[field]) {
      throw new Error(`stage ${n} stageMeta.${field} drifted from stage-manifest.js`);
    }
  }
  if (!registry.getStage(n)) registry.register(mod);
  loadedStages.set(n, mod);
  return mod;
}

// Warm the module cache for the other unlocked stages once the active one is mounted, so switching
// stages is instant. Best-effort and idle-scheduled; failures are ignored (lazy load will retry).
function prefetchStages(ids) {
  const run = () => { for (const id of ids) loadStage(id).catch(() => {}); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 400);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Dev-menu unlock is a *machine-local* setting (a debug affordance), kept in its own
// localStorage key so it survives "Reset save" — resetting the game should not re-lock
// the dev tools on a machine where they were already unlocked.
const DEV_KEY = 'fv:games:mg:dev';
function devUnlockedPersisted() {
  try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; }
}
function persistDevUnlock() {
  try { localStorage.setItem(DEV_KEY, '1'); } catch { /* storage may be blocked */ }
}

// Seed a single stage's state from its defaultState if it's still an empty placeholder. Seeding is
// lazy now (only the stage being mounted), since defaultState lives in the lazily-loaded module.
function seedStageState(save, mod) {
  const id = mod.stageMeta.id;
  if (!save.stageState[id] || !Object.keys(save.stageState[id]).length) {
    save.stageState[id] = mod.defaultState({ save, now: Date.now() });
  }
}

function createServices(getSave, persist, viewer) {
  actions.bindActionSaveProvider(getSave, persist);
  achievements.bindAchievementSaveProvider(getSave, persist);
  bell.bindBellSaveProvider(getSave, persist);
  bts.bindBtsSaveProvider(getSave, persist, () => ({
    getStageMeta: (stage) => registry.getStageMeta(stage) || stageMetaFor(stage),
  }));
  const off = actions.subscribeToActions((detail) => {
    const record = achievements.unlockAchievementForAction(detail.stage, detail.action, detail);
    if (record) bell.showBell(`${detail.stage}.${detail.action}`, record.title || record.id, { stage: detail.stage, detail });
  });
  return {
    actions,
    achievements,
    bell,
    bts: {
      ...bts,
      open: (stage) => bts.openBts(stage, viewer),
    },
    destroy: off,
  };
}

export function mount(host, { onExit } = {}) {
  let saveData = loadSave();
  saveData = persistSave(saveData);

  const viewer = createViewerBridge();
  const persist = () => {
    actions.mirrorActionsToSave(saveData);
    saveData = persistSave(saveData);
  };
  const services = createServices(() => saveData, persist, viewer);

  let mounted = null;

  function selectStage(stage) {
    saveData.currentStage = Number(stage);
    persist();
    render();
  }

  function completeStage(stage) {
    const id = Number(stage);
    if (!saveData.defeated.includes(id)) saveData.defeated.push(id);
    if (id < 10 && !saveData.unlockedStages.includes(id + 1)) saveData.unlockedStages.push(id + 1);
    saveData.currentStage = id < 10 ? id + 1 : id;
    bell.showBell(`stage${id}.defeated`, `${stageMetaFor(id)?.name || `Stage ${id}`} cleared.`, { stage: id });
    persist();
    render();
  }

  function renderShell() {
    host.innerHTML = `
      <div class="mg-wrap mg-v3">
        <header class="mg-v3-head">
          <div>
            <div class="mg-stage-banner">Defragmenter</div>
            <strong>${esc(stageMetaFor(saveData.currentStage)?.name || 'Stage')}</strong>
          </div>
          <div class="mg-v3-head-actions">
            <button class="mg-dev-btn" type="button" data-action="dev" aria-label="Dev menu" title="Dev menu" hidden>🛠</button>
            <button class="mg-help-btn" type="button" data-action="help" aria-label="Help" title="Help" hidden>❓</button>
            <button class="mg-sfx-btn" type="button" data-action="sfx" aria-label="Toggle sound effects"></button>
            <div class="mg-v3-bell"></div>
            <button class="mg-back" type="button" data-action="exit">Back to arcade</button>
          </div>
        </header>
        <nav class="mg-v3-stages" aria-label="Metagame stages"></nav>
        <main class="mg-v3-host"></main>
        <div class="mg-v3-debug" hidden></div>
      </div>`;
    host.querySelector('[data-action="exit"]').addEventListener('click', () => onExit?.());
    const sfxBtn = host.querySelector('[data-action="sfx"]');
    const paintSfx = () => {
      const on = !saveData.global.sfxOff;
      sfxBtn.textContent = on ? '🔊' : '🔇';
      sfxBtn.classList.toggle('mg-sfx-off', !on);
      sfxBtn.setAttribute('aria-pressed', String(on));
    };
    sfxBtn.addEventListener('click', () => {
      saveData.global.sfxOff = !saveData.global.sfxOff;
      persist();
      paintSfx();
    });
    paintSfx();
    const devBtn = host.querySelector('[data-action="dev"]');
    if (saveData.global.devUnlocked || devUnlockedPersisted()) devBtn.hidden = false;
    devBtn.addEventListener('click', () => toggleDevMenu());
    const nav = host.querySelector('.mg-v3-stages');
    nav.replaceChildren(...listStageMetas().filter((meta) => saveData.unlockedStages.includes(meta.id)).map((meta) => {
      const defeated = saveData.defeated.includes(meta.id);
      // Stage 10's "rest" final route leaves the entity dormant — surface a "(resting)" hub state.
      const resting = meta.id === 10 && defeated && saveData.stageState?.[meta.id]?.final?.route === 'rest';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mg-v3-stage${resting ? ' is-resting' : ''}`;
      button.dataset.stage = String(meta.id);
      button.textContent = `${meta.id}. ${meta.name}${defeated ? ' *' : ''}${resting ? ' (resting)' : ''}`;
      button.addEventListener('click', () => selectStage(meta.id));
      nav.appendChild(button);
      return button;
    }));
    mountBell(host.querySelector('.mg-v3-bell'));
  }

  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    mounted?.destroy?.();
    mounted = null;
    renderShell();
    const hostEl = host.querySelector('.mg-v3-host');
    if (hostEl) hostEl.innerHTML = '<div class="mg-v3-loading">loading…</div>';
    const id = stageMetaFor(saveData.currentStage) ? Number(saveData.currentStage) : 1;
    const mod = await ensureStageModule(id);
    if (seq !== renderSeq) return; // a newer render started while this stage loaded
    seedStageState(saveData, mod);
    mounted = mod.mountStage({
      host: host.querySelector('.mg-v3-host'),
      state: saveData.stageState[mod.stageMeta.id],
      save: persist,
      actions,
      achievements,
      bell: services.bell,
      bts: services.bts,
      sfxEnabled: () => !saveData.global.sfxOff,
      orchestrator: { save: saveData, selectStage },
      viewer,
      onExit,
      onStageComplete: () => completeStage(mod.stageMeta.id),
    });
    // Wire the header help button to the active stage's help affordance (if it provides one).
    const helpBtn = host.querySelector('[data-action="help"]');
    if (helpBtn && mounted && typeof mounted.help === 'function') {
      helpBtn.hidden = false;
      helpBtn.addEventListener('click', () => mounted.help());
    }
    prefetchStages(saveData.unlockedStages.filter((s) => Number(s) !== id));
  }

  let bellDotUnsub = null;
  let bellClicks = [];
  function mountBell(target) {
    if (bellDotUnsub) { bellDotUnsub(); bellDotUnsub = null; }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mg-bell-btn';
    button.setAttribute('aria-label', 'Notifications');
    button.innerHTML = '🔔<span class="mg-bell-dot" hidden></span>';
    const dot = button.querySelector('.mg-bell-dot');
    const panel = document.createElement('div');
    panel.className = 'mg-bell-panel';
    panel.hidden = true;
    target.replaceChildren(button, panel);
    const refreshDot = () => { dot.hidden = services.bell.listBellLog({ unseenOnly: true }).length === 0; };
    button.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        panel.innerHTML = services.bell.listBellLog().slice(-8).reverse().map((line) => `<div class="mg-bell-msg">${esc(line.text)}</div>`).join('') || '<div class="mg-bell-empty">nothing here</div>';
        for (const rec of services.bell.listBellLog({ unseenOnly: true })) services.bell.markBellSeen(rec.id);
        refreshDot();
      }
      // Easter egg: 5 rapid bell clicks UNLOCK the dev menu — reveal its header button (🛠, next to
      // SFX) and open it. Once unlocked the button persists (devUnlocked flag).
      const t = Date.now();
      bellClicks = bellClicks.filter((x) => t - x < 1500);
      bellClicks.push(t);
      if (bellClicks.length >= 5) {
        bellClicks = [];
        panel.hidden = true;
        saveData.global.devUnlocked = true;
        persistDevUnlock();
        persist();
        const devBtn = host.querySelector('[data-action="dev"]');
        if (devBtn) devBtn.hidden = false;
        toggleDevMenu();
      }
    });
    bellDotUnsub = services.bell.subscribeToBell(refreshDot);
    refreshDot();
  }

  // ── Dev/testing menu (unlocked by 5 rapid bell clicks) ──────────────────────────────────────
  function toggleDevMenu() {
    const box = host.querySelector('.mg-v3-debug');
    if (!box) return;
    if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
    const stageBtns = listStageMetas().map((meta) => {
      const id = meta.id;
      return `<button type="button" data-dev="stage" data-n="${id}">${id}</button>`;
    }).join('');
    // Boss-jump buttons: "1b", "2b" … land you on the stage with its boss already
    // reachable (stage 1: max bits + every tier owned so Confront opens; stages 2-10:
    // the stage's requiredAction pre-fired so the boss lock is lifted).
    const bossBtns = listStageMetas().map((meta) => {
      const id = meta.id;
      return `<button type="button" data-dev="boss" data-n="${id}">${id}b</button>`;
    }).join('');
    // Controls for the stage currently mounted (each stage exposes its own via stageMeta.devControls).
    const activeCtrls = (mounted && Array.isArray(mounted.devControls)) ? mounted.devControls : [];
    const activeDevRow = activeCtrls.length
      ? `<div class="mg-dev-row"><span>Stage ${saveData.currentStage}:</span>${activeCtrls.map((c) => `<button type="button" data-dev="stagedev" data-id="${c.id}">${c.label}</button>`).join('')}</div>`
      : '';
    // Only the active stage's controls are shown: stage 1 → bits seeds, others → their devControls.
    const bitsRow = Number(saveData.currentStage) === 1
      ? `<div class="mg-dev-row"><span>Stage 1 bits:</span>
          <button type="button" data-dev="bits" data-e="6">1M</button>
          <button type="button" data-dev="bits" data-e="9">1B</button>
          <button type="button" data-dev="bits" data-e="12">1T</button>
          <button type="button" data-dev="bits" data-e="93">1ba</button></div>`
      : '';
    box.innerHTML = `
      <div class="mg-dev">
        <div class="mg-dev-title">🛠 Dev menu <button type="button" data-dev="close" class="mg-dev-x">✕</button></div>
        ${bitsRow}
        ${activeDevRow}
        <div class="mg-dev-row"><span>Jump to stage:</span>${stageBtns}</div>
        <div class="mg-dev-row"><span>Jump to boss:</span>${bossBtns}</div>
        <div class="mg-dev-row">
          <button type="button" data-dev="unlock-all">Unlock all stages</button>
          <button type="button" data-dev="reset">Reset save</button></div>
      </div>`;
    box.hidden = false;
    const seedStage1Bits = (e) => {
      const s = saveData.stageState[1];
      s.bits = { m: 1, e }; s.totalBits = { m: 1, e }; s.tabsUnlocked = true;
      s.milestones = [...new Set([...(s.milestones || []), 'score-unlock', 'sound-unlock'])];
      s.helpersUnlocked = true;
      // Own ≥1 of every Stage-1 tier so the boss "Confront" gate (allSubStagesOwned) is met.
      s.owned = { 's1-mult': 5, 's1-box': 5, 's1-boost': 5, 's1-cluster': 5, 's1-array': 5, 's1-neural': 5, 's1-quantum': 5 };
    };
    box.querySelectorAll('[data-dev]').forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.dev;
      if (kind === 'close') { box.hidden = true; box.innerHTML = ''; return; }
      if (kind === 'stagedev') { mounted?.dev?.(b.dataset.id); return; } // live cheat; keep menu open
      if (kind === 'bits') {
        seedStage1Bits(Number(b.dataset.e));
        if (saveData.currentStage !== 1) saveData.currentStage = 1;
        persist(); render();
      } else if (kind === 'stage') {
        const n = Number(b.dataset.n);
        for (let i = 1; i <= n; i++) if (!saveData.unlockedStages.includes(i)) saveData.unlockedStages.push(i);
        selectStage(n);
      } else if (kind === 'boss') {
        const n = Number(b.dataset.n);
        for (let i = 1; i <= n; i++) if (!saveData.unlockedStages.includes(i)) saveData.unlockedStages.push(i);
        if (n === 1) {
          seedStage1Bits(93); // 1ba — enough to afford the boss ticket
        } else {
          // Pre-fire the stage's required action so its boss lock lifts on mount.
          const req = stageMetaFor(n)?.requiredAction;
          if (req) {
            const dot = req.indexOf('.');
            const stage = Number(req.slice(0, dot));
            const action = req.slice(dot + 1);
            actions.setAction(stage, action, { source: 'dev' });
          }
        }
        selectStage(n);
      } else if (kind === 'unlock-all') {
        for (let i = 1; i <= 10; i++) if (!saveData.unlockedStages.includes(i)) saveData.unlockedStages.push(i);
        persist(); render();
      } else if (kind === 'reset') {
        saveData = resetSave(); render();
      }
    }));
  }

  render();

  return {
    destroy() {
      mounted?.destroy?.();
      if (bellDotUnsub) { bellDotUnsub(); bellDotUnsub = null; }
      services.destroy();
      persist();
      host.innerHTML = '';
    },
    _debug: {
      getSave: () => saveData,
      reset: () => { saveData = resetSave(); render(); },
      selectStage,
    },
  };
}
