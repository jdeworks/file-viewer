const REQUIRED_STAGE_EXPORTS = Object.freeze(['stageMeta', 'defaultState', 'mountStage']);

export function validateStageModule(module, expectedStage = null) {
  const errors = [];
  if (!module || typeof module !== 'object') {
    return { ok: false, errors: ['stage module must be an object'] };
  }
  for (const name of REQUIRED_STAGE_EXPORTS) {
    if (!(name in module)) errors.push(`missing export: ${name}`);
  }
  const meta = module.stageMeta;
  if (!meta || typeof meta !== 'object') {
    errors.push('stageMeta must be an object');
  } else {
    const id = Number(meta.id);
    if (!Number.isInteger(id) || id < 1 || id > 5) errors.push('stageMeta.id must be an integer from 1 to 5');
    if (expectedStage !== null && id !== Number(expectedStage)) errors.push(`stageMeta.id must match expected stage ${expectedStage}`);
    if (typeof meta.slug !== 'string' || !meta.slug) errors.push('stageMeta.slug must be a non-empty string');
    if (typeof meta.name !== 'string' || !meta.name) errors.push('stageMeta.name must be a non-empty string');
  }
  if (typeof module.defaultState !== 'function') errors.push('defaultState must be a function');
  if (typeof module.mountStage !== 'function') errors.push('mountStage must be a function');
  return { ok: errors.length === 0, errors };
}

export function createStageRegistry(stageModules = []) {
  const modules = new Map();
  for (const module of stageModules) registerStageModule(modules, module);
  return {
    modules,
    register(module) {
      return registerStageModule(modules, module);
    },
    getStage(stage) {
      return modules.get(Number(stage)) || null;
    },
    getStageMeta(stage) {
      return modules.get(Number(stage))?.stageMeta || null;
    },
    listStages() {
      return [...modules.values()].sort((a, b) => a.stageMeta.id - b.stageMeta.id);
    },
  };
}

export function registerStageModule(registryOrMap, module) {
  const result = validateStageModule(module);
  if (!result.ok) {
    throw new Error(`Invalid metagame stage module: ${result.errors.join('; ')}`);
  }
  const map = registryOrMap instanceof Map ? registryOrMap : registryOrMap.modules;
  if (!(map instanceof Map)) throw new Error('registry must be a Map or createStageRegistry() result');
  const id = Number(module.stageMeta.id);
  if (map.has(id)) throw new Error(`Duplicate metagame stage id: ${id}`);
  map.set(id, module);
  return module;
}
