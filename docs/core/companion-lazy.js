// Lightweight Companion boundary. The local-disk runtime is loaded only when the saved opt-in is
// enabled or a user explicitly opens/uses Companion controls. Disabled users keep the ordinary
// browser-only startup graph and make no localhost requests.
let runtime = null;
let runtimePromise = null;
let initDeps = null;
let available = false;
let runtimeInitialized = false;

function companionEnabled() {
  const mobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '');
  return !mobile && localStorage.getItem('fv:companion:enabled') === 'true';
}

function initialize(module) {
  if (!initDeps || runtimeInitialized) return;
  module.initCompanionUi({
    ...initDeps,
    onAvailabilityChange: (value) => { available = !!value; },
  });
  runtimeInitialized = true;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import('./companion-ui.js').then((module) => {
      runtime = module;
      initialize(module);
      return module;
    });
  }
  return runtimePromise;
}

export function initCompanionUi(deps) {
  initDeps = deps;
  if (runtime) initialize(runtime);
  else if (companionEnabled()) void loadRuntime();
}

export function isCompanionAvailable() { return runtime ? runtime.isCompanionAvailable() : available; }
export function hasCompanionFolderRoot() { return runtime?.hasCompanionFolderRoot() || false; }
export function absolutePathForFile(...args) { return runtime?.absolutePathForFile(...args) || null; }

export function setCompanionAvailable(value) {
  available = !!value;
  if (runtime) runtime.setCompanionAvailable(value);
  else if (value || companionEnabled()) {
    void loadRuntime().then((module) => {
      module.setCompanionAvailable(value);
      module.syncSaveBtn();
    });
  }
}

export function setCompanionLinked(...args) { runtime?.setCompanionLinked(...args); }
export function resetCompanionFolderRoot(...args) { runtime?.resetCompanionFolderRoot(...args); }
export function activateCompanionSidebarRoot(...args) { runtime?.activateCompanionSidebarRoot(...args); }
export function startWatching(...args) { runtime?.startWatching(...args); }
export function syncSaveBtn(...args) { runtime?.syncSaveBtn(...args); }
export function tryAutoLink(...args) { runtime?.tryAutoLink(...args); }
export function showCompanionIndicator(...args) { runtime?.showCompanionIndicator(...args); }
export function updateConnButton(...args) { runtime?.updateConnButton(...args); }

export async function resolveDroppedFolderRoot(...args) {
  if (!companionEnabled() && !runtime) return null;
  return (await loadRuntime()).resolveDroppedFolderRoot(...args);
}
export async function onSaveClick(...args) { return (await loadRuntime()).onSaveClick(...args); }
export async function onDeleteClick(...args) { return (await loadRuntime()).onDeleteClick(...args); }
export async function deleteTreePath(...args) { return (await loadRuntime()).deleteTreePath(...args); }
export async function revealTreePath(...args) { return (await loadRuntime()).revealTreePath(...args); }
export async function recoverFolderFile(...args) {
  if (!companionEnabled() && !runtime) return null;
  return (await loadRuntime()).recoverFolderFile(...args);
}
export async function onConnButtonClick(...args) { return (await loadRuntime()).onConnButtonClick(...args); }
export async function detectCompanionOnStartup() {
  if (!companionEnabled()) return false;
  return (await loadRuntime()).detectCompanionOnStartup();
}
