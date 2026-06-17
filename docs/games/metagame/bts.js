let saveProvider = null;
let persistProvider = null;
let registryProvider = null;

function currentSave() {
  return typeof saveProvider === 'function' ? saveProvider() : null;
}

function persistCurrentSave(save) {
  if (typeof persistProvider === 'function') persistProvider(save);
}

function ensureBts(save) {
  if (!save.bts || typeof save.bts !== 'object') save.bts = {};
  if (!save.bts.opened || typeof save.bts.opened !== 'object') save.bts.opened = {};
  return save.bts;
}

function stageMeta(stage) {
  if (typeof registryProvider !== 'function') return null;
  const registry = registryProvider();
  if (!registry) return null;
  if (typeof registry.getStageMeta === 'function') return registry.getStageMeta(stage);
  if (registry instanceof Map) return registry.get(Number(stage))?.stageMeta || registry.get(Number(stage)) || null;
  return registry[stage]?.stageMeta || registry[stage] || null;
}

export function bindBtsSaveProvider(getSave, persistSave = null, getRegistry = null) {
  saveProvider = typeof getSave === 'function' ? getSave : null;
  persistProvider = typeof persistSave === 'function' ? persistSave : null;
  registryProvider = typeof getRegistry === 'function' ? getRegistry : null;
}

export function isBtsAvailable(stage) {
  const save = currentSave();
  return Boolean(save && Array.isArray(save.defeated) && save.defeated.includes(Number(stage)));
}

export function hasOpenedBts(stage) {
  const save = currentSave();
  return Boolean(save && ensureBts(save).opened[Number(stage)]);
}

export function markBtsOpened(stage) {
  const save = currentSave();
  if (!save) return false;
  ensureBts(save).opened[Number(stage)] = true;
  persistCurrentSave(save);
  return true;
}

export function getBtsPath(stage) {
  return stageMeta(stage)?.btsPath || null;
}

export function openBts(stage, viewer = null) {
  if (!isBtsAvailable(stage)) return false;
  const path = getBtsPath(stage);
  if (!path) return false;
  markBtsOpened(stage);
  if (viewer && typeof viewer.openViewerFile === 'function') return viewer.openViewerFile(path, { source: 'metagame-bts', stage: Number(stage) });
  if (viewer && typeof viewer.openFile === 'function') return viewer.openFile(path, { source: 'metagame-bts', stage: Number(stage) });
  return true;
}

export function open(stage, viewer = null) {
  return openBts(stage, viewer);
}
