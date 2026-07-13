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
  bindActionSaveProvider,
  clearActionsForDebug,
  getAction,
  hasAction,
  hydrateActionsFromSave,
  listActions,
  mirrorActionsToSave,
  setAction,
  subscribeToActions,
} from '../docs/games/metagame/action-flags.js';
import {
  bindAchievementSaveProvider,
  clearAchievementsForDebug,
  hasAchievement,
  listAchievements,
  unlockAchievement,
  unlockAchievementForAction,
} from '../docs/games/metagame/achievements.js';
import {
  bindBellSaveProvider,
  clearBellForDebug,
  hasBellSeen,
  listBellLog,
  markBellSeen,
  pushBellMessage,
} from '../docs/games/metagame/bell.js';
import {
  bindBtsSaveProvider,
  getBtsPath,
  hasOpenedBts,
  isBtsAvailable,
  markBtsOpened,
  openBts,
} from '../docs/games/metagame/bts.js';
import { createStageRegistry, registerStageModule, validateStageModule } from '../docs/games/metagame/registry.js';
import { createViewerBridge } from '../docs/games/metagame/viewer-bridge.js';

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
}

function validStageModule(id = 2) {
  return {
    stageMeta: {
      id,
      slug: `stage-${id}`,
      name: `Stage ${id}`,
      btsPath: `/docs/bts/stage_${id}.bts`,
      requiredAction: `${id}.required_action`,
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
  ok(isValidSave(save), 'save: fresh v8 validates');
  ok(save.version === SAVE_VERSION && save.currentStage === 1, 'save: fresh v8 starts at stage 1');
  ok(save.unlockedStages.join(',') === '1,2,3,4,5', 'save: all five retained games are unlocked');
  ok(Object.keys(save.stageState).join(',') === '1,2,3,4,5', 'save: only five stage-state slots exist');
  ok(Object.keys(save.runs).length === 0, 'save: fresh save has an empty run-counter map');
  ok(save.global.maxAscension === 0 && Object.keys(save.global.ascensionCleared).length === 0, 'save: fresh save seeds the ascension summary');
  ok(!('devUnlocked' in save.global) && !('loopCount' in save.global), 'save: removed finale/dev globals are absent');
}

{
  const storage = new MemoryStorage({ [SAVE_KEY]: '{bad json' });
  const save = loadSave({ storage, timestamp: 2000 });
  ok(isValidSave(save), 'save: malformed storage becomes fresh v8');
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
    ok(isValidSave(reset) && reset.version === SAVE_VERSION, `migrate: v${version} resets to v8`);
    ok(reset.currentStage === 1 && reset.defeated.length === 0 && Object.keys(reset.actions).length === 0, `migrate: v${version} progress is pristine`);
    ok(reset.unlockedStages.join(',') === '1,2,3,4,5' && Object.keys(reset.stageState).join(',') === '1,2,3,4,5', `migrate: v${version} reset has the five-game shape`);
  }
}

{
  const legacy = { version: 7, currentStage: 5, defeated: [1, 2], stageState: { 5: { legacy: true } } };
  const storage = new MemoryStorage({ [SAVE_KEY]: JSON.stringify(legacy) });
  const save = loadSave({ storage, timestamp: 4200 });
  ok(isValidSave(save) && save.version === SAVE_VERSION, 'save: loading a v7 save produces valid v8');
  ok(save.currentStage === 1 && save.defeated.length === 0 && !save.stageState[5].legacy, 'save: loading legacy storage discards old progression');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'save: the reset v8 save is persisted back');
}

{
  const storage = new MemoryStorage();
  const reset = resetSave({ storage, timestamp: 8000 });
  ok(reset.unlockedStages.join(',') === '1,2,3,4,5', 'reset: a full reset unlocks exactly five games');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'reset: v8 is persisted under the stable key');
}

{
  const current = createFreshSave(9000);
  current.currentStage = 5;
  current.defeated = [1, 5, 7];
  current.unlockedStages = [1, 9];
  current.stageState[3] = { progress: 7 };
  current.stageState[6] = { removed: true };
  current.runs = { 3: 2, 6: 10 };
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

  ok(migrateSave(null) === null && migrateSave({ noVersion: true }) === null, 'migrate: corrupt/versionless inputs return null');
  ok(migrateSave({ version: SAVE_VERSION + 1 }) === null, 'migrate: a future version is not down-migrated');
  ok(migrateSave(shaped) === shaped, 'migrate: a current v8 save passes through');
}

{
  const save = createFreshSave(3000);
  save.stageState[4].kept = true;
  persistSave(save, { storage: new MemoryStorage(), timestamp: 3500, key: SAVE_KEY });
  ok(save.stageState[4].kept === true && save.global.updatedAt === 3500, 'save: persist preserves stage substate');
}

{
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  const save = createFreshSave(4000);
  let persistCount = 0;
  bindActionSaveProvider(() => save, () => { persistCount++; });
  clearActionsForDebug();

  const seen = [];
  const off = subscribeToActions((detail) => seen.push(detail));
  const first = setAction(2, 'search_passage', { source: 'search', value: 'PASSAGE' });
  const firstSetAt = first.firstSetAt;
  const second = setAction(2, 'search_passage', { result: 'PASSAGE:247' });
  off();

  ok(hasAction(2, 'search_passage'), 'actions: hasAction reads in-memory state');
  ok(second.firstSetAt === firstSetAt && second.updatedAt >= firstSetAt, 'actions: setAction is idempotent and preserves firstSetAt');
  ok(getAction(2, 'search_passage').detail.result === 'PASSAGE:247', 'actions: repeated set merges detail');
  ok(save.actions['2.search_passage'].detail.value === 'PASSAGE', 'actions: mirrored into current save');
  ok(storage.getItem('fv:games:action:stage2:search_passage'), 'actions: writes localStorage fallback key');
  ok(seen.length === 2 && seen[1].result === 'PASSAGE:247', 'actions: dispatches subscriber detail');
  ok(persistCount >= 2, 'actions: provider persist is called on set');

  const target = createFreshSave(4500);
  mirrorActionsToSave(target);
  hydrateActionsFromSave(target);
  ok(listActions(2).length === 1 && hasAction(2, 'search_passage'), 'actions: hydrate/mirror round trip');
  delete globalThis.localStorage;
}

{
  const save = createFreshSave(5000);
  let persistCount = 0;
  bindAchievementSaveProvider(() => save, () => { persistCount++; });
  clearAchievementsForDebug();

  const unlocked = unlockAchievement('custom.id', { stage: 3, title: 'custom' });
  const duplicate = unlockAchievement('custom.id', { stage: 3, title: 'custom changed' });
  const actionUnlock = unlockAchievementForAction(1, 'cheat_disabled');
  ok(unlocked === duplicate, 'achievements: duplicate unlock returns existing record');
  ok(hasAchievement('custom.id') && actionUnlock.id === 'stage1.cheat_disabled', 'achievements: provider-backed unlock and action mapping work');
  ok(listAchievements(3).length === 1, 'achievements: lists by stage');
  ok(persistCount >= 2, 'achievements: persists new unlocks');
}

{
  const save = createFreshSave(6000);
  bindBellSaveProvider(() => save, () => {});
  clearBellForDebug();

  pushBellMessage('stage1.cheat_disabled', { stage: 1, text: 'line' });
  pushBellMessage('stage2.note', { stage: 2, text: 'other' });
  markBellSeen('stage1.cheat_disabled');
  ok(hasBellSeen('stage1.cheat_disabled'), 'bell: seen markers are stored');
  ok(listBellLog({ stage: 1 }).length === 1, 'bell: stage-filtered log works');
  ok(listBellLog({ unseenOnly: true }).length === 1, 'bell: unseen filter excludes seen messages');
}

{
  const save = createFreshSave(7000);
  save.defeated.push(2);
  const registry = createStageRegistry([validStageModule(2)]);
  bindBtsSaveProvider(() => save, () => {}, () => registry);
  ok(isBtsAvailable(2) && !isBtsAvailable(3), 'bts: availability follows defeated stages');
  ok(getBtsPath(2) === '/docs/bts/stage_2.bts', 'bts: resolves path from registry metadata');
  ok(markBtsOpened(2) && hasOpenedBts(2), 'bts: opened state is persisted');
  const opened = [];
  ok(openBts(2, { openViewerFile: (path, opts) => opened.push([path, opts]) || true }), 'bts: open delegates to viewer for available BTS');
  ok(opened[0][0] === '/docs/bts/stage_2.bts' && opened[0][1].stage === 2, 'bts: viewer call includes stage metadata');
}

{
  const valid = validateStageModule(validStageModule(5), 5);
  const invalid = validateStageModule({ stageMeta: { id: 5, requiredAction: '4.bad' } }, 5);
  ok(valid.ok, 'registry: valid stage module passes validation');
  ok(!invalid.ok && invalid.errors.length >= 4, 'registry: invalid stage module reports errors');
  const registry = createStageRegistry();
  registerStageModule(registry, validStageModule(5));
  ok(registry.getStageMeta(5).requiredAction === '5.required_action', 'registry: registers and retrieves stage modules');
}

{
  const calls = [];
  const fakeWindow = {
    __fv: {
      openViewerFile: (path, opts) => {
        calls.push(['open', path, opts]);
        return true;
      },
      search: (path, query, opts) => {
        calls.push(['search', path, query, opts]);
        return { found: true };
      },
    },
  };
  const bridge = createViewerBridge(fakeWindow);
  ok(bridge.available, 'viewer bridge: reports available when window.__fv exists');
  ok(bridge.openViewerFile('/x.txt', { stage: 1 }) === true, 'viewer bridge: delegates openViewerFile');
  ok(bridge.searchViewerFile('/x.txt', 'PASSAGE').found, 'viewer bridge: falls back to compatible search method');
  ok(calls.length === 2 && calls[0][2].stage === 1, 'viewer bridge: forwards arguments');
  ok(createViewerBridge({}).openViewerFile('/missing') === false, 'viewer bridge: missing window.__fv is a safe no-op');
}

console.log(failed ? `\nMETAGAME PLATFORM FAILED (${failed})` : '\nMETAGAME PLATFORM PASSED');
process.exit(failed ? 1 : 0);
