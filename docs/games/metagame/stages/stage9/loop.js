// loop.js — Stage 9 Observer State: thin animation driver. startLoop(onTick, ms) ticks onTick on an
// interval and returns { stop }. Keeps the renderer free of timer bookkeeping; no game logic here.
export function startLoop(onTick, intervalMs = 100) {
  const id = setInterval(() => { try { onTick(); } catch { /* ignore tick errors */ } }, intervalMs);
  return { stop() { clearInterval(id); } };
}
