// Simon — repeat the growing colour/tone sequence. Pure DOM pads (tap/click), tones synthesised with
// WebAudio (no assets; pads flash so it works muted). Difficulty sets the pad COUNT: Easy 4 / Medium 9
// / Hard 16 (more colours = harder to recall) — laid out as a square grid with per-pad hue + pitch.
// Difficulty ESCALATES within a game: the sequence grows by one and playback speeds up each round.
// Scoring RAMPS: each cleared round pays 10 × round. Contract: mount(host,{onScore,onExit})=>{destroy()}.
const COUNTS = { easy: 4, medium: 9, hard: 16 };
const DEFAULT_DIFF = 'easy';
const SFX_KEY = 'fv:simon:sfx', DIFF_KEY = 'fv:simon:diff';
const flashMs = (round) => Math.max(150, 480 - round * 22);  // playback tempo — escalates with round
const colsFor = (n) => Math.round(Math.sqrt(n));             // 4→2, 9→3, 16→4
const padPx = (cols) => (cols <= 2 ? 80 : cols === 3 ? 60 : 46);

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="simon-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px">'
    + '<div class="simon-hud" style="display:flex;gap:14px;font-size:14px;font-weight:600;align-items:center">'
    + '<span class="simon-score">Score: 0</span><span class="simon-round">Round 1</span>'
    + '<select class="simon-diff" style="font-size:13px;cursor:pointer">'
    + '<option value="easy">Easy · 4</option><option value="medium">Medium · 9</option><option value="hard">Hard · 16</option></select>'
    + '<button class="simon-sfx" type="button" title="Toggle sound" style="border:0;background:transparent;cursor:pointer;font-size:16px">🔊</button></div>'
    + '<div class="simon-status" style="font-size:13px;opacity:.8;min-height:1.2em">Watch the sequence…</div>'
    + '<div class="simon-board" style="display:grid;gap:6px"></div>'
    + '<div class="simon-over" hidden style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px">'
    + '<div class="simon-over-msg" style="font-size:16px;font-weight:700"></div>'
    + '<div><button class="simon-restart">Play again</button> <button class="simon-quit">Back</button></div></div>'
    + '</div>';

  const wrap = host.querySelector('.simon-wrap');
  const board = host.querySelector('.simon-board');
  const scoreEl = host.querySelector('.simon-score');
  const roundEl = host.querySelector('.simon-round');
  const statusEl = host.querySelector('.simon-status');
  const diffSel = host.querySelector('.simon-diff');
  const sfxBtn = host.querySelector('.simon-sfx');
  const overEl = host.querySelector('.simon-over');
  const overMsg = host.querySelector('.simon-over-msg');

  let seq, inputIdx, round, score, dead, accepting, timers, count, pads, padEls, sfxOn, actx;
  let diffKey;
  try { diffKey = localStorage.getItem(DIFF_KEY) || DEFAULT_DIFF; } catch { diffKey = DEFAULT_DIFF; }
  if (!COUNTS[diffKey]) diffKey = DEFAULT_DIFF;
  try { sfxOn = localStorage.getItem(SFX_KEY) !== '0'; } catch { sfxOn = true; }
  diffSel.value = diffKey;
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

  function buildPads() {
    count = COUNTS[diffKey];
    const cols = colsFor(count), px = padPx(cols);
    pads = Array.from({ length: count }, (_, i) => ({
      base: 'hsl(' + Math.round((i / count) * 360) + ',70%,45%)',
      lit: 'hsl(' + Math.round((i / count) * 360) + ',85%,68%)',
      freq: 180 * Math.pow(2, i / 12),
    }));
    board.style.gridTemplateColumns = 'repeat(' + cols + ', ' + px + 'px)';
    board.innerHTML = pads.map((p, i) =>
      '<button class="simon-pad" data-pad="' + i + '" style="width:' + px + 'px;height:' + px + 'px;border:0;'
      + 'border-radius:12px;cursor:pointer;opacity:.7;transition:opacity .07s,filter .07s;background:' + p.base + '"></button>').join('');
    padEls = [...board.querySelectorAll('.simon-pad')];
  }

  function light(pad, on) {
    const el = padEls[pad]; if (!el) return;
    el.style.opacity = on ? '1' : '.7';
    el.style.background = on ? pads[pad].lit : pads[pad].base;
  }
  function resetVisuals() { padEls.forEach((_, i) => light(i, false)); }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function syncHud() { scoreEl.textContent = 'Score: ' + score; roundEl.textContent = 'Round ' + round; }

  function flash(pad, ms) { light(pad, true); tone(pads[pad].freq, ms / 1000); timers.push(setTimeout(() => { if (!dead) light(pad, false); }, ms * 0.6)); }

  function play() {
    accepting = false; inputIdx = 0;
    statusEl.textContent = 'Watch the sequence…';
    const fm = flashMs(round), gap = Math.max(90, fm * 0.5);
    let i = 0;
    const stepPlay = () => {
      if (dead) return;
      if (i >= seq.length) { accepting = true; statusEl.textContent = 'Your turn'; return; }
      flash(seq[i], fm); i++;
      timers.push(setTimeout(stepPlay, fm + gap));
    };
    timers.push(setTimeout(stepPlay, 420));
  }

  function pressPad(pad) {
    if (dead || !accepting) return;
    flash(pad, 200);
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
    round++; seq.push(Math.floor(Math.random() * count)); inputIdx = 0;
    statusEl.textContent = 'Nice! Next round…';
    timers.push(setTimeout(play, 760));
  }

  function gameOver() {
    dead = true; accepting = false; clearTimers(); resetVisuals();
    statusEl.textContent = '';
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
  }

  function reset() {
    timers = timers || []; clearTimers();
    buildPads();
    seq = [Math.floor(Math.random() * count)]; round = 1; score = 0; inputIdx = 0; dead = false; accepting = false;
    overEl.hidden = true; resetVisuals(); syncHud();
    timers.push(setTimeout(play, 500));
  }

  function onClick(e) { const b = e.target.closest('.simon-pad'); if (b) pressPad(Number(b.dataset.pad)); }
  function onSfx() { sfxOn = !sfxOn; sfxBtn.textContent = sfxOn ? '🔊' : '🔇'; try { localStorage.setItem(SFX_KEY, sfxOn ? '1' : '0'); } catch { /* ok */ } }
  function onDiff() { diffKey = COUNTS[diffSel.value] ? diffSel.value : DEFAULT_DIFF; try { localStorage.setItem(DIFF_KEY, diffKey); } catch { /* ok */ } reset(); }

  board.addEventListener('click', onClick);
  sfxBtn.addEventListener('click', onSfx);
  diffSel.addEventListener('change', onDiff);
  host.querySelector('.simon-restart').addEventListener('click', reset);
  host.querySelector('.simon-quit').addEventListener('click', () => onExit?.());

  // Test/debug hook: forceAccept skips waiting on the playback timers.
  wrap.__simon = {
    state: () => ({ score, round, dead, accepting, seqLen: seq.length, count, lit: padEls.filter((el) => el.style.opacity === '1').length }),
    seq: () => [...seq], tap: (i) => pressPad(i), forceAccept: () => { accepting = true; }, tempoAt: (r) => flashMs(r),
  };

  timers = [];
  reset();

  return {
    destroy() {
      clearTimers();
      board.removeEventListener('click', onClick);
      sfxBtn.removeEventListener('click', onSfx);
      diffSel.removeEventListener('change', onDiff);
      try { actx?.close(); } catch { /* ok */ }
      host.innerHTML = '';
    },
  };
}
