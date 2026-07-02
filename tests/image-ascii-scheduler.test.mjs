import assert from 'node:assert/strict';
import { createAsciiUpdateScheduler } from '../docs/types/image/ascii/update-scheduler.js';

function harness(lastConvertMs = 0) {
  const calls = [];
  const timers = [];
  const frames = [];
  const engine = {
    lastConvertMs,
    scheduleUpdate() { calls.push('update'); },
    regrab() { calls.push('regrab'); },
  };
  const scheduler = createAsciiUpdateScheduler({
    engine,
    onBusy: (on) => calls.push('busy:' + on),
    onDisplay: () => calls.push('display'),
    setTimer(fn, ms) { const t = { fn, ms, live: true }; timers.push(t); return t; },
    clearTimer(t) { if (t) t.live = false; },
    requestFrame(fn) { const f = { fn, live: true }; frames.push(f); return f; },
    cancelFrame(f) { if (f) f.live = false; },
  });
  const runTimer = () => {
    const t = timers.findLast((entry) => entry.live);
    assert.ok(t, 'expected a live timer');
    t.live = false;
    t.fn();
    return t.ms;
  };
  const runFrame = () => {
    const f = frames.findLast((entry) => entry.live);
    assert.ok(f, 'expected a live animation frame');
    f.live = false;
    f.fn();
  };
  return { calls, scheduler, runTimer, runFrame };
}

{
  const h = harness(100);
  h.scheduler.scheduleUpdate();
  h.scheduler.scheduleUpdate();
  assert.deepEqual(h.calls, [], 'rapid updates wait for debounce');
  assert.equal(h.runTimer(), 180, 'default debounce is phone-friendly');
  assert.deepEqual(h.calls, ['busy:true'], 'slow previous conversion shows busy before work');
  h.runFrame();
  assert.deepEqual(h.calls, ['busy:true', 'update'], 'coalesced updates run once');
}

{
  const h = harness();
  h.scheduler.scheduleUpdate();
  h.scheduler.scheduleRegrab();
  h.runTimer();
  h.runFrame();
  assert.deepEqual(h.calls, ['regrab'], 'latest conversion kind wins');
}

{
  const h = harness();
  h.scheduler.scheduleDisplay();
  h.scheduler.scheduleDisplay();
  h.runFrame();
  assert.deepEqual(h.calls, ['display'], 'display-only settings coalesce to one frame');
}

{
  const h = harness();
  h.scheduler.scheduleUpdate();
  h.scheduler.scheduleDisplay();
  h.scheduler.destroy();
  assert.deepEqual(h.calls, [], 'destroy cancels pending work');
}

console.log('image ascii scheduler: ok');
