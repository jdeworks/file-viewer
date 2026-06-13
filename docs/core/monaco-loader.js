// Lazy Monaco loader. Monaco is the heaviest dependency, so it is only fetched
// the first time a raw view / diff is actually shown. Loaded from vendor (no CDN).

let monacoPromise = null;

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
