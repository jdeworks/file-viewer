// Breakout - paddle + ball + bricks across Arkanoid-style maps. Keyboard (left/right),
// touch/pointer drag, speed presets, level skip, gated sound effects, and falling capsules:
// multiball, expand, slow, extra life, sticky/catch paddle, and laser cannons.
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
import { MAPS, buildBricks, breakableLeft } from './maps.js';

const W = 384, H = 460, GAP = 3, BRICK_H = 16, TOP = 42;
const BASE_PADDLE_W = 68, PADDLE_H = 10, PADDLE_Y = H - 28, BALL_R = 5;
const DROP_CHANCE = 0.24, DROP_V = 105, MAX_BALLS = 6, SHOT_V = 420;
const SPEEDS = {
  calm: { label: 'Calm', mul: 0.85 },
  normal: { label: 'Normal', mul: 1 },
  fast: { label: 'Fast', mul: 1.18 },
};
const POWERUPS = ['multi', 'expand', 'slow', 'life', 'sticky', 'laser'];
const PU = {
  multi: { c: '#4dd0e1', t: 'M' },
  expand: { c: '#81c784', t: 'E' },
  slow: { c: '#7986cb', t: 'S' },
  life: { c: '#f06292', t: '+' },
  sticky: { c: '#ffcc80', t: 'C' },
  laser: { c: '#ef5350', t: 'L' },
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const baseSpeed = (lvl) => 190 + lvl * 34;

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="breakout-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + '<div class="breakout-hud" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center;font-size:14px;font-weight:600">'
    + '<span class="breakout-score">Score: 0</span><span class="breakout-level">Lv 1</span>'
    + '<span class="breakout-lives">♥♥♥</span><span class="breakout-power"></span>'
    + '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600">Speed '
    + '<select class="breakout-speed"><option value="calm">Calm</option><option value="normal">Normal</option><option value="fast">Fast</option></select></label>'
    + '<button class="breakout-skip" type="button">Skip level</button>'
    + '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600"><input class="breakout-mute" type="checkbox"> Mute</label>'
    + '</div>'
    + '<div style="position:relative">'
    + '<canvas class="breakout-canvas" width="' + W + '" height="' + H + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#0e1117;cursor:pointer;touch-action:none"></canvas>'
    + '<div class="breakout-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(8,10,15,.78);color:#fff;border-radius:8px">'
    + '<div class="breakout-over-msg" style="font-size:18px;font-weight:700"></div>'
    + '<div><button class="breakout-restart">Play again</button> <button class="breakout-quit">Back</button></div></div>'
    + '</div>'
    + '<div style="font-size:12px;opacity:.7;text-align:center">← → or drag · Space / tap launches or fires · Tab releases sticky ball · catch the drops</div></div>';

  const wrap = host.querySelector('.breakout-wrap');
  const canvas = host.querySelector('.breakout-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.breakout-score');
  const levelEl = host.querySelector('.breakout-level');
  const livesEl = host.querySelector('.breakout-lives');
  const powerEl = host.querySelector('.breakout-power');
  const speedEl = host.querySelector('.breakout-speed');
  const muteEl = host.querySelector('.breakout-mute');
  const overEl = host.querySelector('.breakout-over');
  const overMsg = host.querySelector('.breakout-over-msg');
  const skipEl = host.querySelector('.breakout-skip');

  let paddleX, paddleW, balls, bricks, drops, shots, score, lives, level, dead, raf, last, keyDir;
  let expandTtl, slowTtl, stickyCharges, laserShots, speedMode, muted, audioCtx;

  function readSpeedMode() {
    try {
      const saved = localStorage.getItem('fv:breakout:speed');
      if (SPEEDS[saved]) return saved;
    } catch {}
    return 'normal';
  }

  function readMuted() {
    try { return localStorage.getItem('fv:breakout:mute') === '1'; } catch { return false; }
  }

  function ensureAudio() {
    if (muted || audioCtx) return audioCtx;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    audioCtx = new Audio();
    return audioCtx;
  }

  function sfx(kind) {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const freq = kind === 'brick' ? 520 : kind === 'power' ? 760 : kind === 'laser' ? 900 : kind === 'level' ? 660 : 180;
    osc.type = kind === 'lose' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(freq, now);
    if (kind === 'level') osc.frequency.exponentialRampToValueAtTime(990, now + 0.11);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  function ballSpeed(lvl = level) { return baseSpeed(lvl) * SPEEDS[speedMode].mul; }
  function buildBoard() { ({ bricks } = buildBricks(level, W, GAP, BRICK_H, TOP)); }
  function spdMul() { return slowTtl > 0 ? 0.62 : 1; }
  function setSpeed(b, sp) {
    const m = Math.hypot(b.vx, b.vy) || 1;
    b.vx = b.vx / m * sp;
    b.vy = b.vy / m * sp;
  }

  function stuckBall(offset = 0) {
    return { x: paddleX + paddleW / 2 + offset, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true, offset };
  }

  function resetBalls() { balls = [stuckBall()]; }

  function releaseBall(b) {
    const sp = ballSpeed(level) * spdMul();
    const aim = clamp((b.offset || 0) / (paddleW / 2), -0.85, 0.85);
    const fallback = Math.random() < 0.5 ? -0.45 : 0.45;
    b.vx = sp * (aim || fallback);
    b.vy = -Math.sqrt(Math.max(sp * sp - b.vx * b.vx, sp * sp * 0.25));
    b.stuck = false;
    b.offset = 0;
  }

  function launch() {
    let any = false;
    for (const b of balls) if (b.stuck) { releaseBall(b); any = true; }
    if (any) sfx('power');
    return any;
  }

  function reset() {
    speedMode = readSpeedMode();
    muted = readMuted();
    speedEl.value = speedMode;
    muteEl.checked = muted;
    score = 0; lives = 3; level = 0; dead = false;
    paddleX = (W - BASE_PADDLE_W) / 2; paddleW = BASE_PADDLE_W; keyDir = 0;
    expandTtl = 0; slowTtl = 0; stickyCharges = 0; laserShots = 0; drops = []; shots = [];
    buildBoard(); resetBalls();
    overEl.hidden = true; syncHud();
    last = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1) + ' · Map ' + ((level % MAPS.length) + 1) + '/' + MAPS.length;
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
    const bits = [];
    if (stickyCharges > 0) bits.push('Catch ' + stickyCharges);
    if (laserShots > 0) bits.push('Laser ' + laserShots);
    powerEl.textContent = bits.join(' · ');
  }

  function loseLife() {
    lives--; syncHud(); sfx('lose');
    if (lives <= 0) return gameOver();
    paddleW = BASE_PADDLE_W; expandTtl = 0; slowTtl = 0; stickyCharges = 0; laserShots = 0; shots = [];
    resetBalls(); syncHud();
  }

  function nextLevel() {
    level++;
    drops = []; shots = []; buildBoard(); resetBalls();
    paddleW = BASE_PADDLE_W; expandTtl = slowTtl = 0; stickyCharges = laserShots = 0;
    syncHud(); sfx('level');
  }

  function activate(type) {
    if (type === 'multi') {
      const moving = balls.filter((b) => !b.stuck);
      const src = moving.length ? moving : balls;
      for (const b of src.slice()) {
        if (balls.length >= MAX_BALLS) break;
        const sp = ballSpeed(level) * spdMul();
        const clone = { x: b.x, y: b.y, vx: -b.vx || sp * 0.5, vy: b.vy || -sp, stuck: false, offset: 0 };
        setSpeed(clone, sp); clone.vx += sp * 0.25; balls.push(clone);
      }
    } else if (type === 'expand') { paddleW = BASE_PADDLE_W * 1.65; expandTtl = 12; }
    else if (type === 'slow') { slowTtl = 10; for (const b of balls) if (!b.stuck) setSpeed(b, ballSpeed(level) * 0.62); }
    else if (type === 'life') { lives++; }
    else if (type === 'sticky') { stickyCharges = Math.min(5, stickyCharges + 3); }
    else if (type === 'laser') { laserShots = Math.min(12, laserShots + 8); }
    syncHud(); sfx('power');
  }

  function removeBrick(i) {
    const brick = bricks[i];
    bricks.splice(i, 1);
    score += brick.val * (level + 1);
    syncHud(); onScore?.(score); sfx('brick');
    if (Math.random() < DROP_CHANCE) drops.push({ x: brick.x + brick.w / 2, y: brick.y, type: POWERUPS[Math.floor(Math.random() * POWERUPS.length)] });
    if (breakableLeft(bricks) === 0) nextLevel();
  }

  function damageBrick(i) {
    const brick = bricks[i];
    if (!brick || brick.type === 'solid') return false;
    brick.hp--;
    if (brick.hp > 0) { brick.color = '#aeb4c0'; sfx('brick'); return true; }
    removeBrick(i);
    return true;
  }

  function hitBrick(b, i) {
    const brick = bricks[i];
    const overlapX = Math.min(b.x + BALL_R - brick.x, brick.x + brick.w - (b.x - BALL_R));
    const overlapY = Math.min(b.y + BALL_R - brick.y, brick.y + brick.h - (b.y - BALL_R));
    if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
    damageBrick(i);
  }

  function catchBall(b) {
    b.stuck = true;
    b.offset = clamp(b.x - (paddleX + paddleW / 2), -paddleW / 2 + BALL_R, paddleW / 2 - BALL_R);
    b.vx = 0; b.vy = 0; b.y = PADDLE_Y - BALL_R - 1; stickyCharges--; syncHud(); sfx('power');
  }

  function shootLaser() {
    if (laserShots <= 0 || dead) return false;
    const left = paddleX + 9, right = paddleX + paddleW - 9;
    shots.push({ x: left, y: PADDLE_Y - 3 }, { x: right, y: PADDLE_Y - 3 });
    laserShots--; syncHud(); sfx('laser');
    return true;
  }

  function stepShots(dt) {
    for (const s of shots) s.y -= SHOT_V * dt;
    for (let si = shots.length - 1; si >= 0; si--) {
      const s = shots[si];
      if (s.y < -8) { shots.splice(si, 1); continue; }
      for (let i = 0; i < bricks.length; i++) {
        const k = bricks[i];
        if (s.x < k.x || s.x > k.x + k.w || s.y < k.y || s.y > k.y + k.h) continue;
        if (k.type !== 'solid') damageBrick(i);
        shots.splice(si, 1);
        break;
      }
    }
  }

  function step(dt) {
    if (keyDir) paddleX = clamp(paddleX + keyDir * 340 * dt, 0, W - paddleW);
    if (expandTtl > 0 && (expandTtl -= dt) <= 0) { paddleW = BASE_PADDLE_W; paddleX = Math.min(paddleX, W - paddleW); }
    if (slowTtl > 0 && (slowTtl -= dt) <= 0) for (const b of balls) if (!b.stuck) setSpeed(b, ballSpeed(level));
    stepShots(dt);

    for (const b of balls) {
      if (b.stuck) { b.x = clamp(paddleX + paddleW / 2 + (b.offset || 0), BALL_R, W - BALL_R); b.y = PADDLE_Y - BALL_R - 1; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H && b.x >= paddleX && b.x <= paddleX + paddleW) {
        if (stickyCharges > 0) { catchBall(b); continue; }
        const hit = (b.x - (paddleX + paddleW / 2)) / (paddleW / 2);
        const sp = ballSpeed(level) * spdMul();
        b.vx = sp * 0.75 * hit; b.vy = -Math.sqrt(Math.max(sp * sp - b.vx * b.vx, sp * sp * 0.25));
        b.y = PADDLE_Y - BALL_R - 1;
      }
      for (let i = 0; i < bricks.length; i++) {
        const k = bricks[i];
        if (b.x + BALL_R < k.x || b.x - BALL_R > k.x + k.w || b.y + BALL_R < k.y || b.y - BALL_R > k.y + k.h) continue;
        hitBrick(b, i); break;
      }
    }
    balls = balls.filter((b) => b.y <= H + BALL_R);
    if (!balls.length) return loseLife();

    for (const d of drops) d.y += DROP_V * dt;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      if (d.y >= PADDLE_Y && d.y <= PADDLE_Y + PADDLE_H && d.x >= paddleX && d.x <= paddleX + paddleW) { activate(d.type); drops.splice(i, 1); }
      else if (d.y > H) drops.splice(i, 1);
    }
  }

  function draw() {
    ctx.fillStyle = '#0e1117'; ctx.fillRect(0, 0, W, H);
    for (const k of bricks) {
      ctx.fillStyle = k.color; ctx.fillRect(k.x, k.y, k.w, k.h);
      if (k.type === 'solid') { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(k.x + 1, k.y + 1, k.w - 2, k.h - 2); }
    }
    for (const d of drops) {
      ctx.fillStyle = PU[d.type].c; ctx.fillRect(d.x - 8, d.y - 6, 16, 12);
      ctx.fillStyle = '#10131a'; ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(PU[d.type].t, d.x, d.y + 0.5);
    }
    ctx.fillStyle = '#ffeb3b';
    for (const s of shots) ctx.fillRect(s.x - 1, s.y - 8, 2, 8);
    ctx.fillStyle = stickyCharges > 0 ? '#ffcc80' : '#e8eaed';
    ctx.fillRect(paddleX, PADDLE_Y, paddleW, PADDLE_H);
    if (laserShots > 0) {
      ctx.fillStyle = '#ef5350';
      ctx.fillRect(paddleX + 6, PADDLE_Y - 4, 6, 4);
      ctx.fillRect(paddleX + paddleW - 12, PADDLE_Y - 4, 6, 4);
    }
    ctx.fillStyle = '#e8eaed';
    for (const b of balls) { ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); }
  }

  function loop(ts) {
    if (dead) return;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    step(dt); if (dead) return;
    draw(); raf = requestAnimationFrame(loop);
  }

  function gameOver() { dead = true; cancelAnimationFrame(raf); overMsg.textContent = 'Game over - score ' + score; overEl.hidden = false; }

  function fireOrLaunch() {
    if (launch()) return;
    shootLaser();
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keyDir = -1;
    else if (k === 'arrowright' || k === 'd') keyDir = 1;
    else if (k === ' ' || k === 'tab') fireOrLaunch();
    else if (k === 'x') shootLaser();
    else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if ((k === 'arrowleft' || k === 'a') && keyDir < 0) keyDir = 0;
    else if ((k === 'arrowright' || k === 'd') && keyDir > 0) keyDir = 0;
  }
  function pointAt(clientX) {
    const rect = canvas.getBoundingClientRect();
    paddleX = clamp((clientX - rect.left) * (W / rect.width) - paddleW / 2, 0, W - paddleW);
  }
  function onPointerMove(e) { pointAt(e.clientX); }
  function onPointerDown(e) { pointAt(e.clientX); fireOrLaunch(); }

  function setSpeedMode(mode) {
    if (!SPEEDS[mode]) return;
    const was = ballSpeed(level) * spdMul();
    speedMode = mode;
    speedEl.value = mode;
    try { localStorage.setItem('fv:breakout:speed', mode); } catch {}
    const now = ballSpeed(level) * spdMul();
    for (const b of balls) if (!b.stuck) setSpeed(b, now || was);
  }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  host.querySelector('.breakout-restart').addEventListener('click', reset);
  host.querySelector('.breakout-quit').addEventListener('click', () => onExit?.());
  skipEl.addEventListener('click', () => nextLevel());
  speedEl.addEventListener('change', () => setSpeedMode(speedEl.value));
  muteEl.addEventListener('change', () => {
    muted = muteEl.checked;
    try { localStorage.setItem('fv:breakout:mute', muted ? '1' : '0'); } catch {}
  });

  wrap.__breakout = {
    state: () => ({
      score, lives, level, dead, stuck: balls.every((b) => b.stuck), bricks: breakableLeft(bricks),
      balls: balls.length, maps: MAPS.length, speedMode, speedMul: SPEEDS[speedMode].mul,
      stickyCharges, laserShots, shots: shots.length, stuckBalls: balls.filter((b) => b.stuck).length, width: W,
    }),
    speedAt: (lvl, mode = speedMode) => baseSpeed(lvl) * (SPEEDS[mode]?.mul || SPEEDS.normal.mul),
    activate,
    launch,
    shootLaser,
    skipLevel: nextLevel,
    setSpeedMode,
    testCatchSticky() {
      activate('sticky');
      const b = balls[0];
      b.stuck = false;
      b.x = paddleX + paddleW * 0.75;
      b.y = PADDLE_Y - BALL_R;
      b.vx = 0;
      b.vy = ballSpeed(level);
      catchBall(b);
      return this.state();
    },
    testLaserHit() {
      activate('laser');
      const target = bricks.find((b) => b.type !== 'solid');
      if (!target) return this.state();
      shots.push({ x: target.x + target.w / 2, y: target.y + target.h / 2 });
      stepShots(0);
      return this.state();
    },
  };

  reset();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      host.innerHTML = '';
    },
  };
}
