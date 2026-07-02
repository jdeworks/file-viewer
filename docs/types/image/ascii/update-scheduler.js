export function createAsciiUpdateScheduler({
  engine,
  debounceMs = 180,
  slowMs = 80,
  onBusy,
  onDisplay,
  requestFrame = (fn) => requestAnimationFrame(fn),
  cancelFrame = (id) => cancelAnimationFrame(id),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
} = {}) {
  let timer = 0;
  let displayFrame = 0;
  let convertFrame = 0;
  let pending = null;

  const clearConvertTimer = () => {
    if (timer) clearTimer(timer);
    timer = 0;
  };

  const clearConvertFrame = () => {
    if (convertFrame) cancelFrame(convertFrame);
    convertFrame = 0;
  };

  function runPending() {
    timer = 0;
    const kind = pending || 'update';
    pending = null;
    if (engine?.lastConvertMs > slowMs) onBusy?.(true);
    convertFrame = requestFrame(() => {
      convertFrame = 0;
      if (kind === 'regrab') engine?.regrab?.();
      else engine?.scheduleUpdate?.();
    });
  }

  function schedule(kind = 'update', delay = debounceMs) {
    pending = kind;
    clearConvertTimer();
    clearConvertFrame();
    timer = setTimer(runPending, Math.max(0, delay));
  }

  function display() {
    if (displayFrame) return;
    displayFrame = requestFrame(() => {
      displayFrame = 0;
      onDisplay?.();
    });
  }

  function destroy() {
    clearConvertTimer();
    clearConvertFrame();
    if (displayFrame) cancelFrame(displayFrame);
    displayFrame = 0;
    pending = null;
  }

  return {
    scheduleUpdate: (delay) => schedule('update', delay),
    scheduleRegrab: (delay) => schedule('regrab', delay),
    scheduleDisplay: display,
    flush: runPending,
    destroy,
  };
}
