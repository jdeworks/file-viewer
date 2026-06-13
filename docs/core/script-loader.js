// Loads vendored UMD globals (markdown-it, DOMPurify) once, on demand. No CDN.
const cache = new Map();

export function loadGlobal(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (cache.has(src)) return cache.get(src);
  // Monaco's AMD loader installs a global `define`, which would capture UMD libs as
  // anonymous AMD modules instead of attaching them to window. We fetch the source and
  // run it with define/module/exports shadowed, forcing the UMD global-build branch.
  // `this` = window so wrappers that resolve the global via `this` still find window.
  const p = (async () => {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Failed to load ' + src + ' (' + res.status + ')');
    const code = await res.text();
    new Function('define', 'module', 'exports', code).call(window, undefined, undefined, undefined);
    if (!window[globalName]) throw new Error(globalName + ' missing after load');
    return window[globalName];
  })();
  cache.set(src, p);
  return p;
}

export const vendor = (rel) => new URL('../vendor/' + rel, import.meta.url).href;
