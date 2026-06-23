// Simon — repeat the growing colour/tone sequence. Pure DOM pads (tap/click) so it plays on phone
// and desktop; tones are WebAudio-synthesised (no assets, offline-safe), and pads also flash so it
// works muted. Difficulty ESCALATES: the sequence grows by one each round and playback speeds up.
// Scoring RAMPS: each cleared round pays 10 × round. Contract: mount(host,{onScore,onExit})=>{destroy()}.
const PADS = [
  { color: '#2f9e44', lit: '#69db7c', freq: 330 },
  { color: '#e03131', lit: '#ff8787', freq: 262 },
  { color: '#f59f00', lit: '#ffd43b', freq: 392 },
  { color: '#1971c2', lit: '#74c0fc', freq: 196 },
];
const SFX_KEY = 'fv:simon:sfx';
const flashMs = (round) => Math.max(170, 520 - round * 24);   // playback tempo — escalates with round
const rand4 = () => Math.floor(Math.random() * 4);

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="simon-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px">'
    + '<div class="simon-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="simon-score">Score: 0</span><span class="simon-round">Round 1</span>'
    + '<button class="simon-sfx" type="button" title="Toggle sound" style="border:0;background:transparent;cursor:pointer;font-size:16px">🔊</button></div>'
    + '<div class="simon-status" style="font-size:13px;opacity:.8;min-height:1.2em">Watch the sequence…</div>'
    + '<div class="simon-board" style="display:grid;grid-template-columns:repeat(2,84px);grid-template-rows:repeat(2,84px);gap:8px"></div>'
    + '<div class="simon-over" hidden style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px">'
    + '<div class="simon-over-msg" style="font-size:16px;font-weight:700"></div>'
    + '<div><button class="simon-restart">Play again</button> <button class="simon-quit">Back</button></div></div>'
    + '</div>';

  const wrap = host.querySelector('.simon-wrap');
  const board = host.querySelector('.simon-board');
  const scoreEl = host.querySelector('.simon-score');
  const roundEl = host.querySelector('.simon-round');
  const statusEl = host.querySelector('.simon-status');
  const sfxBtn = host.querySelector('.simon-sfx');
  const overEl = host.querySelector('.simon-over');
  const overMsg = host.querySelector('.simon-over-msg');

  board.innerHTML = PADS.map((p, i) =>
    '<button class="simon-pad" data-pad="' + i + '" style="border:0;border-radius:12px;cursor:pointer;background:'
    + p.color + ';opacity:.6;transition:opacity .08s"></button>').join('');
  const padEls = [...board.querySelectorAll('.simon-pad')];

  let seq, inputIdx, round, score, dead, accepting, timers, sfxOn, actx;
  try { sfxOn = localStorage.getItem(SFX_KEY) !== '0'; } catch { sfxOn = true; }
  sfxBtn.textContent = sfxOn ? '🔊' : '🔇';

  function tone(freq, dur) {
    if (!sfxOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const osc = actx.createOscillator(), gain = actx.createGain();
      osc.connect(gain); gain.connect(actx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = actx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch { /* no audio */ }
  }

  function flash(pad, ms) {
    const el = padEls[pad];
    el.style.opacity = '1'; el.style.background = PADS[pad].lit;
    tone(PADS[pad].freq, ms / 1000);
    timers.push(setTimeout(() => { el.style.opacity = '.6'; el.style.background = PADS[pad].color; }, ms * 0.8));
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function syncHud() { scoreEl.textContent = 'Score: ' + score; roundEl.textContent = 'Round ' + round; }

  function play() {
    accepting = false; inputIdx = 0;
    statusEl.textContent = 'Watch the sequence…';
    const fm = flashMs(round), gap = fm * 0.5;
    let t = 380;
    seq.forEach((pad) => { timers.push(setTimeout(() => flash(pad, fm), t)); t += fm + gap; });
    timers.push(setTimeout(() => { accepting = true; statusEl.textContent = 'Your turn'; }, t));
  }

  function pressPad(pad) {
    if (dead || !accepting) return;
    flash(pad, 180);
    if (pad === seq[inputIdx]) {
      inputIdx++;
      if (inputIdx === seq.length) roundComplete();
    } else {
      gameOver();
    }
  }

  function roundComplete() {
    score += round * 10;                                 // RAMP: round value × round
    syncHud(); onScore?.(score);
    accepting = false;
    round++; seq.push(rand4); inputIdx = 0;
    statusEl.textContent = 'Nice! Next round…';
    timers.push(setTimeout(play, 760));
  }

  function gameOver() {
    dead = true; accepting = false; clearTimers();
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
  }

  function reset() {
    clearTimers(); timers = timers || [];
    seq = [rand4()]; round = 1; score = 0; inputIdx = 0; dead = false; accepting = false;
    overEl.hidden = true; syncHud();
    timers.push(setTimeout(play, 500));
  }

  function onClick(e) { const b = e.target.closest('.simon-pad'); if (b) pressPad(Number(b.dataset.pad)); }
  function onSfx() {
    sfxOn = !sfxOn; sfxBtn.textContent = sfxOn ? '🔊' : '🔇';
    try { localStorage.setItem(SFX_KEY, sfxOn ? '1' : '0'); } catch { /* ok */ }
  }

  board.addEventListener('click', onClick);
  sfxBtn.addEventListener('click', onSfx);
  host.querySelector('.simon-restart').addEventListener('click', reset);
  host.querySelector('.simon-quit').addEventListener('click', () => onExit?.());

  // Test/debug hook: forceAccept skips waiting on the playback timers.
  wrap.__simon = {
    state: () => ({ score, round, dead, accepting, seqLen: seq.length }),
    seq: () => [...seq], tap: (i) => pressPad(i), forceAccept: () => { accepting = true; },
    tempoAt: (r) => flashMs(r),
  };

  timers = [];
  reset();

  return {
    destroy() {
      clearTimers();
      board.removeEventListener('click', onClick);
      sfxBtn.removeEventListener('click', onSfx);
      try { actx?.close(); } catch { /* ok */ }
      host.innerHTML = '';
    },
  };
}
