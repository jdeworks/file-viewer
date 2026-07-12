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
  ok(isValidSave(save), 'save: fresh v6 validates');
  ok(save.version === 7 && save.currentStage === 1, 'save: fresh v7 starts at stage 1');
  ok(save.unlockedStages.join(',') === '1,2,3,4,5,6,7,8', 'save: fresh v6 unlocks stages 1–8 (stage 9 gated)');
  ok(!save.unlockedStages.includes(9), 'save: fresh v6 does NOT unlock stage 9');
  ok(Object.keys(save.stageState).length === 9 && save.stageState[9], 'save: fresh v6 creates all stageState slots');
  ok(save.runs && Object.keys(save.runs).length === 0, 'save: fresh v6 has an empty run-counter map');
  ok(save.global.maxAscension === 0 && save.global.ascensionCleared && Object.keys(save.global.ascensionCleared).length === 0, 'save: fresh v6 seeds the ascension summary');
}

{
  const storage = new MemoryStorage({ [SAVE_KEY]: '{bad json' });
  const save = loadSave({ storage, timestamp: 2000 });
  ok(isValidSave(save), 'save: malformed storage becomes fresh v6');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === SAVE_VERSION, 'save: malformed replacement is persisted');
}

{
  // A valid v3 save with real player data MIGRATES forward to v6 with all prior data intact and the
  // freshly-defaulted additive fields (`runs`, the ascension summary) — it must NOT be discarded/reset.
  // Stages 1-7 are untouched by the v5->v6 stage-renumbering step, so this fixture's stage-3/stage-6
  // substate is a faithful regression check that ordinary per-stage data survives the full ladder.
  const v3 = {
    version: 3,
    currentStage: 6,
    defeated: [1, 2],
    unlockedStages: [1, 2, 3],
    achievements: { 'stage1.cheat_disabled': { id: 'stage1.cheat_disabled' } },
    actions: { '2.search_passage': { detail: { value: 'PASSAGE' } } },
    bell: { seen: ['x'], log: [{ id: 'x', text: 'hi' }] },
    bts: { opened: { 2: true } },
    stageState: { 1: {}, 2: {}, 3: { progress: 7 }, 4: {}, 5: {}, 6: { run: { hp: 42 } }, 7: {}, 8: {}, 9: {}, 10: {} },
    global: { loopCount: 3, createdAt: 111, updatedAt: 222 },
  };
  const storage = new MemoryStorage({ [SAVE_KEY]: JSON.stringify(v3) });
  const save = loadSave({ storage, timestamp: 3000 });
  ok(isValidSave(save) && save.version === 7, 'save: a valid v3 save migrates forward to v7');
  ok(save.defeated.join(',') === '1,2', 'migrate: defeated preserved');
  ok(save.unlockedStages.join(',') === '1,2,3,4,5,6,7,8', 'migrate: an old [1,2,3] save normalizes to 1–8 unlocked (stage 9 still gated)');
  ok(save.achievements['stage1.cheat_disabled'] && save.actions['2.search_passage'].detail.value === 'PASSAGE', 'migrate: achievements/actions preserved');
  ok(save.stageState[3].progress === 7 && save.stageState[6].run.hp === 42, 'migrate: per-stage progress preserved');
  ok(save.global.loopCount === 3 && save.global.createdAt === 111, 'migrate: global data preserved (not reset to fresh)');
  ok(save.runs && Object.keys(save.runs).length === 0, 'migrate: v3->v6 backfills an empty runs map');
  ok(save.global.maxAscension === 0 && save.global.ascensionCleared && Object.keys(save.global.ascensionCleared).length === 0, 'migrate: v3->v6 backfills the ascension summary');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === 7, 'migrate: the upgraded save is persisted back');
}

{
  // A valid v4 save MIGRATES forward to v6: the 4->5 step backfills the ascension summary and
  // preserves all existing data, including any global fields the player already had.
  const v4 = {
    version: 4,
    currentStage: 2,
    defeated: [1],
    unlockedStages: [1, 2],
    achievements: {},
    actions: {},
    bell: { seen: [], log: [] },
    bts: { opened: {} },
    runs: { 1: 3 },
    stageState: { 1: { economy: { balance: 88 } }, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}, 8: {}, 9: {}, 10: {} },
    global: { loopCount: 1, crashCourseUnlocked: true, createdAt: 5, updatedAt: 6 },
  };
  const storage = new MemoryStorage({ [SAVE_KEY]: JSON.stringify(v4) });
  const save = loadSave({ storage, timestamp: 4200 });
  ok(isValidSave(save) && save.version === 7, 'save: a valid v4 save migrates forward to v7');
  ok(save.runs[1] === 3 && save.stageState[1].economy.balance === 88, 'migrate: v4 runs/stage substate preserved');
  ok(save.global.loopCount === 1 && save.global.crashCourseUnlocked === true && save.global.createdAt === 5, 'migrate: v4 global data preserved');
  ok(save.global.maxAscension === 0 && save.global.ascensionCleared && Object.keys(save.global.ascensionCleared).length === 0, 'migrate: v4->v5 backfills the ascension summary');
  ok(JSON.parse(storage.getItem(SAVE_KEY)).version === 7, 'migrate: the upgraded v4 save is persisted back');
}

{
  // Stages 1–8 unlocked by default: a full reset must yield 1–8 (and never stage 9), so the stage
  // buttons exist immediately. Stage 9 (the finale) stays gated (only beating stage 8 / dev unlock-all
  // adds it).
  const storage = new MemoryStorage();
  const reset = resetSave({ storage, timestamp: 8000 });
  ok(reset.unlockedStages.join(',') === '1,2,3,4,5,6,7,8', 'reset: a full reset unlocks stages 1–8');
  ok(!reset.unlockedStages.includes(9), 'reset: a full reset does NOT unlock stage 9');

  // An old save with only [1] normalizes forward to 1–8.
  const bare = ensureSaveShape({ ...createFreshSave(8100), unlockedStages: [1] }, 8100);
  ok(bare.unlockedStages.join(',') === '1,2,3,4,5,6,7,8', 'normalize: a bare [1] save becomes 1–8 unlocked');
  ok(!bare.unlockedStages.includes(9), 'normalize: a bare [1] save still has stage 9 gated');

  // A save that had already earned stage 9 (the finale) KEEPS it (forward-migration must not lose
  // progress). ensureSaveShape only normalizes within the CURRENT schema's stage numbering — the
  // cross-version stage-8/9/10 renumbering itself is migrateSave's v5->v6 step, tested below.
  const earned = ensureSaveShape({ ...createFreshSave(8200), unlockedStages: [1, 2, 3, 9], defeated: [8] }, 8200);
  ok(earned.unlockedStages.join(',') === '1,2,3,4,5,6,7,8,9', 'normalize: an earned-stage-9 save keeps stage 9');
}

{
  // Legacy/degenerate older versions are shape-upgraded (backfilled), not discarded.
  const up = migrateSave({ version: 1, defeated: [4], stageState: { 4: { kept: true } } }, 500);
  ok(up && up.version === 7, 'migrate: v1 walks the full ladder to v7');
  ok(up.defeated.join(',') === '4' && up.stageState[4].kept === true, 'migrate: v1 player data survives the ladder');
  ok(Object.keys(up.stageState).length === 9, 'migrate: v1 upgrade fills all 9 stage slots');
  ok(up.global.maxAscension === 0 && Object.keys(up.global.ascensionCleared).length === 0, 'migrate: v1 ladder ends with the ascension summary');
  // Truly-unmigratable inputs return null so the caller falls back to fresh.
  ok(migrateSave(null) === null && migrateSave({ noVersion: true }) === null, 'migrate: corrupt/versionless inputs return null');
  ok(migrateSave({ version: 999 }) === null, 'migrate: a future version is not down-migrated');
  ok(migrateSave({ ...createFreshSave(1), version: SAVE_VERSION }) !== null, 'migrate: a current-version save passes through');
}

{
  // 5->6: Entropy Field (the old stage 8) is DROPPED; Observer State moves 9->8; Awakening (the
  // finale) moves 10->9. All stage-numbered player data must survive the renumbering.
  const v5 = {
    version: 5,
    currentStage: 10,
    defeated: [1, 7, 9], // 9 (old Observer State) -> remaps to 8; 1/7 untouched
    unlockedStages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    achievements: {
      'stage1.cheat_disabled': { id: 'stage1.cheat_disabled' },
      'stage8.salvage_archived': { id: 'stage8.salvage_archived' },       // old Entropy Field — dropped
      'stage9.offline_mode_activated': { id: 'stage9.offline_mode_activated' }, // -> stage8
      'stage10.full_capstone': { id: 'stage10.full_capstone' },           // -> stage9
    },
    actions: {
      '1.cheat_disabled': { detail: {} },
      '8.salvage_archived': { detail: { v: 'old-entropy' } },  // old Entropy Field — dropped
      '9.offline_mode_activated': { detail: { v: 'observer' } }, // -> 8.offline_mode_activated
      '10.memory_resolved': { detail: { v: 'awakening' } },      // -> 9.memory_resolved
    },
    bell: { seen: [], log: [] },
    bts: { opened: {} },
    runs: { 1: 2, 8: 5, 9: 1, 10: 3 },
    stageState: {
      1: { kept: 1 }, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {},
      8: { entropySpecific: true },   // old Entropy Field — dropped entirely
      9: { observerRun: 'alive' },    // -> stageState[8]
      10: { memories: 'alive' },      // -> stageState[9]
    },
    global: { loopCount: 9, maxAscension: 2, ascensionCleared: {}, createdAt: 1, updatedAt: 1 },
  };
  const up = migrateSave(v5, 900);
  ok(up && up.version === 7, 'migrate: v5 walks the 5->6 renumbering step (and on to v7)');
  ok(up.defeated.join(',') === '1,7,8', 'migrate: defeated remaps 9->8 (1/7 untouched)');
  ok(up.unlockedStages.join(',') === '1,2,3,4,5,6,7,8,9', 'migrate: unlockedStages remaps and drops old stage 8, de-dupes/sorts');
  ok(up.currentStage === 9, 'migrate: currentStage 10->9');
  ok(up.stageState[8].observerRun === 'alive' && up.stageState[9].memories === 'alive', 'migrate: stageState 9->8 and 10->9');
  ok(!('10' in up.stageState) && Object.keys(up.stageState).length === 9, 'migrate: old stage-8 slot dropped, no stray stage-10 slot remains');
  ok(up.runs[8] === 1 && up.runs[9] === 3 && up.runs[1] === 2, 'migrate: runs counter remapped 9->8 and 10->9');
  ok(!('8' in up.runs) || up.runs[8] === 1, 'migrate: old runs[8] (Entropy Field) is gone, not merged into the new runs[8]');
  ok(up.actions['8.offline_mode_activated']?.detail.v === 'observer', 'migrate: action key 9.offline_mode_activated -> 8.offline_mode_activated');
  ok(up.actions['9.memory_resolved']?.detail.v === 'awakening', 'migrate: action key 10.memory_resolved -> 9.memory_resolved');
  ok(!up.actions['8.salvage_archived'] && !up.actions['9.offline_mode_activated'] && !up.actions['10.memory_resolved'], 'migrate: dropped/old action keys are gone');
  ok(up.achievements['stage8.offline_mode_activated'] && up.achievements['stage9.full_capstone'], 'migrate: achievement ids remap stage9->stage8, stage10->stage9');
  ok(!up.achievements['stage8.salvage_archived'] && !up.achievements['stage9.offline_mode_activated'] && !up.achievements['stage10.full_capstone'], 'migrate: dropped/old achievement ids are gone');
  ok(up.achievements['stage1.cheat_disabled'], 'migrate: unaffected stage-1 achievement untouched');
}


{
  // 6->7: the Meridian rework renames the stage-7 boss action + achievement (EXIF -> evidence-board
  // alibi contradiction) and resets in-progress stage-7 case state; completion signals survive.
  const v6 = {
    ...createFreshSave(700),
    version: 6,
    defeated: [1, 7],
    actions: { '1.cheat_disabled': { detail: {} }, '7.exif_contradiction_found': { detail: { v: 'old-exif' } } },
    achievements: { 'stage7.exif_contradiction_found': { id: 'stage7.exif_contradiction_found' } },
  };
  v6.stageState[7] = { caseProgress: 'midway', substage: 4 };
  const up = migrateSave(v6, 950);
  ok(up && up.version === 7, 'migrate: v6 walks the 6->7 Meridian rename step');
  ok(up.actions['7.alibi_contradiction_pinned']?.detail.v === 'old-exif' && !up.actions['7.exif_contradiction_found'], 'migrate: stage-7 boss action renamed, old key gone');
  ok(up.achievements['stage7.alibi_contradiction_pinned'] && !up.achievements['stage7.exif_contradiction_found'], 'migrate: stage-7 achievement renamed, old id gone');
  ok(Object.keys(up.stageState[7]).length === 0, 'migrate: in-progress stage-7 case state resets (content changed wholesale)');
  ok(up.defeated.join(',') === '1,7', 'migrate: stage-7 completion (defeated) preserved');
  ok(up.actions['1.cheat_disabled'], 'migrate: unrelated actions untouched');
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
