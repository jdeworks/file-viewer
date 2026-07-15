import {
  createFreshSave,
  ensureSaveShape,
  isValidSave,
  loadSave,
  migrateSave,
  persistSave,
  resetSave,
  SAVE_KEY,
  SAVE_VERSION,
} from '../docs/games/metagame/save.js';
import {
  bindAchievementSaveProvider,
  clearAchievementsForDebug,
  hasAchievement,
  listAchievements,
  unlockAchievement,
} from '../docs/games/metagame/achievements.js';
import {
  bindBellSaveProvider,
  clearBellForDebug,
  hasBellSeen,
  listBellLog,
  markBellSeen,
  pushBellMessage,
} from '../docs/games/metagame/bell.js';
import { createStageRegistry, registerStageModule, validateStageModule } from '../docs/games/metagame/registry.js';
import { createTickLoop } from '../docs/games/metagame/stages/stage1/s1tick.js';
import { defaultState as createStage1State } from '../docs/games/metagame/stages/stage1/state.js';
import { stageByNumber } from '../docs/games/metagame/stages/stage1/stages.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

class MemoryStorage {
  constructor(seed = {}) {
    this.data = new Map(Object.entries(seed));
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
  key(index) {
    return [...this.data.keys()][index] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

function validStageModule(id = 2) {
  return {
    stageMeta: {
      id,
      slug: `stage-${id}`,
      name: `Stage ${id}`,
    },
    defaultState() {
      return {};
    },
    mountStage() {
      return () => {};
    },
  };
}

{
  const save = createFreshSave(1000);
  ok(isValidSave(save), 'save: fresh v9 validates');
  ok(save.version === SAVE_VERSION && save.currentStage === 1, 'save: fresh v9 starts at stage 1');
  ok(save.unlockedStages.join(',') === '1,2,3,4,5', 'save: all five retained games are unlocked');
  ok(Object.keys(save.stageState).join(',') === '1,2,3,4,5', 'save: only five stage-state slots exist');
  ok(Object.keys(save.runs).length === 0, 'save: fresh save has an empty run-counter map');
  ok(save.global.maxAscension === 0 && Object.keys(save.global.ascensionCleared).length === 0, 'save: fresh save seeds the ascension summary');
  ok(!('devUnlocked' in save.global) && !('loopCount' in save.global), 'save: removed finale/dev globals are absent');
  ok(!('actions' in save) && !('bts' in save), 'save: removed viewer-action and BTS state is absent');
}

{
  const storage = new MemoryStorage({ [SAVE_KEY]: '{bad json' });
  const save = loadSave({ storage, timestamp: 2000 });
  ok(isValidSave(save), 'save: malformed storage becomes fresh v9');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'save: malformed replacement is persisted');
}

{
  // The lineup changed structurally, so every supported legacy schema deliberately resets.
  for (let version = 1; version < SAVE_VERSION; version++) {
    const old = {
      version,
      currentStage: 9,
      defeated: [1, 2, 7],
      unlockedStages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      achievements: { legacy: { id: 'legacy' } },
      actions: { '7.legacy': { detail: {} } },
      bell: { seen: ['legacy'], log: [{ id: 'legacy' }] },
      bts: { opened: { 7: true } },
      runs: { 7: 4 },
      stageState: { 1: { old: true }, 7: { progress: 99 } },
      global: { loopCount: 12, devUnlocked: true, createdAt: 1, updatedAt: 2 },
    };
    const reset = migrateSave(old, 3000 + version);
    ok(isValidSave(reset) && reset.version === SAVE_VERSION, `migrate: v${version} resets to v9`);
    ok(reset.currentStage === 1 && reset.defeated.length === 0 && !('actions' in reset) && !('bts' in reset), `migrate: v${version} progress is pristine`);
    ok(reset.unlockedStages.join(',') === '1,2,3,4,5' && Object.keys(reset.stageState).join(',') === '1,2,3,4,5', `migrate: v${version} reset has the five-game shape`);
  }
}

{
  const legacy = { version: 8, currentStage: 5, defeated: [1, 2], stageState: { 5: { legacy: true } } };
  const storage = new MemoryStorage({ [SAVE_KEY]: JSON.stringify(legacy) });
  const save = loadSave({ storage, timestamp: 4200 });
  ok(isValidSave(save) && save.version === SAVE_VERSION, 'save: loading a v8 save produces valid v9');
  ok(save.currentStage === 1 && save.defeated.length === 0 && !save.stageState[5].legacy, 'save: loading legacy storage discards old progression');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'save: the reset v9 save is persisted back');
}

{
  const storage = new MemoryStorage();
  const reset = resetSave({ storage, timestamp: 8000 });
  ok(reset.unlockedStages.join(',') === '1,2,3,4,5', 'reset: a full reset unlocks exactly five games');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'reset: v9 is persisted under the stable key');
}

{
  const current = createFreshSave(9000);
  current.currentStage = 5;
  current.defeated = [1, 5, 7];
  current.unlockedStages = [1, 9];
  current.stageState[3] = { progress: 7 };
  current.stageState[6] = { removed: true };
  current.runs = { 3: 2, 6: 10 };
  current.actions = { stale: true };
  current.bts = { stale: true };
  current.global = {
    ...current.global,
    sfxOff: true,
    maxAscension: 4,
    ascensionCleared: { 2: 1, 5: 3, 7: 9 },
    devUnlocked: true,
    loopCount: 99,
  };
  const shaped = ensureSaveShape(current, 9100);
  ok(shaped.currentStage === 5 && shaped.defeated.join(',') === '1,5', 'normalize: retained current/defeated progress survives');
  ok(shaped.unlockedStages.join(',') === '1,2,3,4,5', 'normalize: all and only retained games stay unlocked');
  ok(Object.keys(shaped.stageState).join(',') === '1,2,3,4,5' && shaped.stageState[3].progress === 7, 'normalize: retained state survives and removed slots are pruned');
  ok(shaped.runs[3] === 2 && !('6' in shaped.runs), 'normalize: removed run counters are pruned');
  ok(shaped.global.sfxOff && shaped.global.maxAscension === 4 && shaped.global.ascensionCleared[5] === 3, 'normalize: retained global settings survive');
  ok(!('devUnlocked' in shaped.global) && !('loopCount' in shaped.global) && !('7' in shaped.global.ascensionCleared), 'normalize: removed global fields/stages are pruned');
  ok(!('actions' in shaped) && !('bts' in shaped), 'normalize: retired cross-surface fields are pruned');

  ok(migrateSave(null) === null && migrateSave({ noVersion: true }) === null, 'migrate: corrupt/versionless inputs return null');
  ok(migrateSave({ version: SAVE_VERSION + 1 }) === null, 'migrate: a future version is not down-migrated');
  ok(migrateSave(shaped) === shaped, 'migrate: a current v9 save passes through');
}

{
  const save = createFreshSave(3000);
  save.stageState[4].kept = true;
  persistSave(save, { storage: new MemoryStorage(), timestamp: 3500, key: SAVE_KEY });
  ok(save.stageState[4].kept === true && save.global.updatedAt === 3500, 'save: persist preserves stage substate');
}

{
  const storage = new MemoryStorage({
    [SAVE_KEY]: JSON.stringify(createFreshSave(4000)),
    'fv:games:action:stage1:old': '1',
    'fv:games:action:stage5:old': '1',
    unrelated: 'kept',
  });
  loadSave({ storage, timestamp: 4100 });
  ok(storage.getItem('fv:games:action:stage1:old') === null && storage.getItem('fv:games:action:stage5:old') === null,
    'save: load clears every legacy action-prefix key');
  ok(storage.getItem('unrelated') === 'kept', 'save: legacy cleanup preserves unrelated storage');
  storage.setItem('fv:games:action:stage2:old', '1');
  resetSave({ storage, timestamp: 4200 });
  ok(storage.getItem('fv:games:action:stage2:old') === null, 'reset: clears legacy action-prefix keys');
}

{
  const save = createFreshSave(5000);
  let persistCount = 0;
  bindAchievementSaveProvider(() => save, () => { persistCount++; });
  clearAchievementsForDebug();

  const unlocked = unlockAchievement('custom.id', { stage: 3, title: 'custom' });
  const duplicate = unlockAchievement('custom.id', { stage: 3, title: 'custom changed' });
  ok(unlocked === duplicate, 'achievements: duplicate unlock returns existing record');
  ok(hasAchievement('custom.id'), 'achievements: provider-backed unlock works');
  ok(listAchievements(3).length === 1, 'achievements: lists by stage');
  ok(persistCount >= 1, 'achievements: persists new unlocks');
}

{
  const save = createFreshSave(6000);
  bindBellSaveProvider(() => save, () => {});
  clearBellForDebug();

  pushBellMessage('stage1.note', { stage: 1, text: 'line' });
  pushBellMessage('stage2.note', { stage: 2, text: 'other' });
  markBellSeen('stage1.note');
  ok(hasBellSeen('stage1.note'), 'bell: seen markers are stored');
  ok(listBellLog({ stage: 1 }).length === 1, 'bell: stage-filtered log works');
  ok(listBellLog({ unseenOnly: true }).length === 1, 'bell: unseen filter excludes seen messages');
}

{
  const valid = validateStageModule(validStageModule(5), 5);
  const invalid = validateStageModule({ stageMeta: { id: 5 } }, 5);
  ok(valid.ok, 'registry: valid stage module passes validation');
  ok(!invalid.ok && invalid.errors.length >= 4, 'registry: invalid stage module reports errors');
  const registry = createStageRegistry();
  registerStageModule(registry, validStageModule(5));
  ok(registry.getStageMeta(5).name === 'Stage 5', 'registry: registers and retrieves stage modules');
}

{
  const state = createStage1State({ now: 1 });
  state.tabsUnlocked = true;
  const cfg = stageByNumber(1);
  const host = { isConnected: true };
  const grid = { isConnected: true };
  const calls = {
    save: 0,
    managerTick: 0,
    reveal: 0,
    hud: 0,
    shop: 0,
    timed: 0,
    stats: 0,
    tabs: 0,
    echo: 0,
    teardown: 0,
  };
  const { tick } = createTickLoop({
    host,
    grid,
    state,
    cfg,
    bell: null,
    save: () => { calls.save++; },
    timedTiers: cfg.tiers.filter((tier) => tier.type === 'timed'),
    multTier: cfg.tiers.find((tier) => tier.id === 's1-mult'),
    panelsEl: {},
    managersController: {
      runAutoFire: () => { calls.managerTick++; },
      paint: () => {},
    },
    getActiveTab: () => 'bits',
    reveal: () => { calls.reveal++; },
    checkTabUnlock: () => {},
    updateHud: () => { calls.hud++; },
    updateEcho: () => { calls.echo++; },
    renderTabs: () => { calls.tabs++; },
    paintShop: () => { calls.shop++; },
    paintTimed: () => { calls.timed++; },
    paintStats: () => { calls.stats++; },
    onTeardown: () => { calls.teardown++; },
  });

  globalThis.document = { hidden: false };
  for (let i = 0; i < 100; i++) tick();
  ok(calls.save === 10, 'stage 1 cadence: a 10 Hz loop persists at most once per second');
  ok(calls.hud === 100 && calls.shop === 100 && calls.timed === 100 && calls.stats === 100,
    'stage 1 cadence: visible repaint hooks run on the bounded 10 Hz tick only');

  document.hidden = true;
  for (let i = 0; i < 100; i++) tick();
  ok(calls.save === 20 && calls.managerTick === 200 && state.ticks === 200,
    'stage 1 low-power path: hidden sessions retain deterministic progress and bounded saves');
  ok(calls.hud === 100 && calls.shop === 100 && calls.timed === 100 && calls.stats === 100 && calls.reveal === 100,
    'stage 1 low-power path: hidden sessions suppress all paint callbacks');

  document.hidden = false;
  tick();
  ok(calls.tabs === 1 && calls.echo === 1,
    'stage 1 low-power path: returning performs one deferred progression/echo refresh');
  host.isConnected = false;
  tick();
  ok(calls.teardown === 1, 'stage 1 lifecycle: leaving the stage tears down its tick loop');
  delete globalThis.document;
}

console.log(failed ? `\nMETAGAME PLATFORM FAILED (${failed})` : '\nMETAGAME PLATFORM PASSED');
process.exit(failed ? 1 : 0);
