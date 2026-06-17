function currentWindow(explicitWindow = null) {
  if (explicitWindow) return explicitWindow;
  return typeof window === 'undefined' ? null : window;
}

function viewerApi(explicitWindow = null) {
  return currentWindow(explicitWindow)?.__fv || null;
}

function callViewer(methodNames, args, explicitWindow = null) {
  const api = viewerApi(explicitWindow);
  if (!api) return false;
  for (const methodName of methodNames) {
    if (typeof api[methodName] === 'function') return api[methodName](...args);
  }
  return false;
}

export function createViewerBridge(explicitWindow = null) {
  return {
    get available() {
      return Boolean(viewerApi(explicitWindow));
    },
    openViewerFile(path, opts = {}) {
      return callViewer(['openViewerFile', 'openFile', 'open'], [path, opts], explicitWindow);
    },
    openFile(path, opts = {}) {
      return this.openViewerFile(path, opts);
    },
    openExamples(opts = {}) {
      return callViewer(['openExamples'], [opts], explicitWindow);
    },
    openBts(path, opts = {}) {
      return this.openViewerFile(path, { ...opts, source: opts.source || 'metagame-bts' });
    },
    revealViewerPath(path, opts = {}) {
      return callViewer(['revealViewerPath', 'revealPath', 'reveal'], [path, opts], explicitWindow);
    },
    revealInTree(path, opts = {}) {
      return this.revealViewerPath(path, opts);
    },
    searchViewerFile(path, query, opts = {}) {
      return callViewer(['searchViewerFile', 'searchFile', 'search'], [path, query, opts], explicitWindow);
    },
    diffViewerFiles(leftPath, rightPath, opts = {}) {
      return callViewer(['diffViewerFiles', 'openDiff', 'diff'], [leftPath, rightPath, opts], explicitWindow);
    },
    raw() {
      return viewerApi(explicitWindow);
    },
  };
}

export const viewerBridge = createViewerBridge();
