// Web Audio click tick — singleton AudioContext for low latency
let ctx;
let lastTick = 0;
function getCtx() {
  return ctx ||= new (window.AudioContext || window.webkitAudioContext)();
}

export function clickTick() {
  try {
    // Throttle: cap at ~25 ticks/sec so rapid tapping can't spawn an unbounded pile of oscillator
    // nodes (a slow audio-graph leak that degrades a long session).
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastTick < 40) return;
    lastTick = now;
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = 560 + Math.random() * 120;
    gain.gain.setValueAtTime(0.07, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.045);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.05);
  } catch { /* no audio support */ }
}
