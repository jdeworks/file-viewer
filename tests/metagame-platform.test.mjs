import {
  createFreshSave,
  isValidSave,
  loadSave,
  persistSave,
  SAVE_KEY,
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
  ok(isValidSave(save), 'save: fresh v3 validates');
  ok(save.version === 3 && save.unlockedStages.join(',') === '1', 'save: fresh v3 starts at stage 1');
  ok(Object.keys(save.stageState).length === 10 && save.stageState[10], 'save: fresh v3 creates all stageState slots');
}

{
  const storage = new MemoryStorage({ [SAVE_KEY]: '{bad json' });
  const save = loadSave({ storage, timestamp: 2000 });
  ok(isValidSave(save), 'save: malformed storage becomes fresh v3');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === 3, 'save: malformed replacement is persisted');
}

{
  const storage = new MemoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 2, old: true }) });
  const save = loadSave({ storage, timestamp: 3000 });
  ok(isValidSave(save) && save.global.createdAt === 3000, 'save: old/malformed shapes are discarded, not migrated');
  save.stageState[4].kept = true;
  persistSave(save, { storage, timestamp: 3500 });
  const roundTrip = JSON.parse(storage.getItem(SAVE_KEY));
  ok(roundTrip.stageState[4].kept === true && roundTrip.global.updatedAt === 3500, 'save: persist preserves stage substate');
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
  registerStageModule(registry, validStageModule(6));
  ok(registry.getStageMeta(6).requiredAction === '6.required_action', 'registry: registers and retrieves stage modules');
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
