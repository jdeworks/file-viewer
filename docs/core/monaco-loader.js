// Lazy Monaco loader. Monaco is the heaviest dependency, so it is only fetched
// the first time a raw view / diff is actually shown. Loaded from vendor (no CDN).

let monacoPromise = null;
let cancellationGuardInstalled = false;

function installCancellationGuard() {
  if (cancellationGuardInstalled) return;
  cancellationGuardInstalled = true;
  // Monaco rejects some internal async editor work with its private `Canceled` error when an
  // editor is deliberately disposed during a fast file switch. That is expected lifecycle
  // cancellation, but an unhandled rejection otherwise becomes a misleading page error. Keep the
  // guard deliberately narrow so application errors and AbortErrors still surface normally.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason?.name === 'Canceled' && reason?.message === 'Canceled'
        && /\/vendor\/monaco\//.test(String(reason.stack || ''))) {
      event.preventDefault();
    }
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

export function loadMonaco() {
  installCancellationGuard();
  if (monacoPromise) return monacoPromise;
  monacoPromise = (async () => {
    const base = new URL('../vendor/monaco/vs', import.meta.url).href;
    // Monaco's AMD loader expects a global `require`. Configure worker via blob to
    // avoid cross-origin worker issues while staying same-origin / no-CDN.
    await loadScript(base + '/loader.js');
    const req = window.require;
    req.config({ paths: { vs: base } });
    window.MonacoEnvironment = {
      getWorkerUrl(_moduleId, _label) {
        const proxy = `self.MonacoEnvironment={baseUrl:'${base}/..'};importScripts('${base}/base/worker/workerMain.js');`;
        return URL.createObjectURL(new Blob([proxy], { type: 'text/javascript' }));
      },
    };
    const monaco = await new Promise((resolve) => req(['vs/editor/editor.main'], () => resolve(window.monaco)));
    return monaco;
  })();
  return monacoPromise;
}
