// Latest-request-wins lifecycle for async UI work.
//
// A request owns every resource allocated while it is loading/rendering. Callers register cleanup
// immediately (before the async operation can reject), then keep the request current through the
// mounted result's lifetime. Starting a newer request aborts and drains the old request exactly
// once. A cleanup registered after invalidation runs immediately, which closes the common race
// where allocation finishes just after cancellation.

function once(fn, onError) {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    try { fn(); } catch (error) { onError?.(error); }
  };
}

export function createLatestRequestController({ onCleanupError } = {}) {
  let sequence = 0;
  let current = null;

  function begin(snapshot = {}) {
    current?.dispose('superseded');

    const aborter = new AbortController();
    const cleanups = new Set();
    const cleanupByFunction = new Map();
    let disposed = false;

    const request = {
      id: ++sequence,
      snapshot: Object.freeze({ ...snapshot }),
      signal: aborter.signal,
      isCurrent() {
        return current === request && !disposed;
      },
      registerCleanup(fn) {
        if (typeof fn !== 'function') return () => {};
        if (cleanupByFunction.has(fn)) return cleanupByFunction.get(fn).release;
        const cleanup = once(fn, onCleanupError);
        if (disposed) {
          cleanup();
          return () => {};
        }
        cleanups.add(cleanup);
        const release = () => {
          cleanups.delete(cleanup);
          cleanupByFunction.delete(fn);
        };
        cleanupByFunction.set(fn, { cleanup, release });
        return release;
      },
      dispose(reason = 'invalidated') {
        if (disposed) return;
        disposed = true;
        if (current === request) current = null;
        try { aborter.abort(reason); } catch { aborter.abort(); }
        for (const cleanup of [...cleanups].reverse()) cleanup();
        cleanups.clear();
        cleanupByFunction.clear();
      },
    };

    current = request;
    return request;
  }

  return {
    begin,
    invalidate(reason) { current?.dispose(reason); },
    isCurrent(request) { return current === request && request?.isCurrent(); },
    current() { return current; },
  };
}
