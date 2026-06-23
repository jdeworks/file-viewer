// Breakout — paddle + ball + bricks across several maps. Self-contained canvas game; keyboard (← →)
// and touch/pointer (drag anywhere to steer). Brick types: normal, tough (2 hits), and indestructible
// walls (#). Power-ups drop from broken bricks and activate when caught: multiball, expand paddle,
// slow ball, extra life. Difficulty ESCALATES: each cleared board levels up (faster ball) and cycles
// to the next map; scoring RAMPS: a brick pays its value × level. Contract:
// mount(host, { onScore, onExit }) => { destroy() }.
import { buildBricks, breakableLeft } from './maps.js';

const W = 320, H = 440, GAP = 3, BRICK_H = 16, TOP = 36;
const BASE_PADDLE_W = 64, PADDLE_H = 10, PADDLE_Y = H - 26, BALL_R = 5;
const ballSpeed = (lvl) => 190 + lvl * 34;                 // px/sec — escalates with level
const DROP_CHANCE = 0.24, DROP_V = 105, MAX_BALLS = 6;
const POWERUPS = ['multi', 'expand', 'slow', 'life'];
const PU = { multi: { c: '#4dd0e1', t: 'M' }, expand: { c: '#81c784', t: 'E' }, slow: { c: '#7986cb', t: 'S' }, life: { c: '#f06292', t: '+' } };

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="breakout-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + '<div class="breakout-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="breakout-score">Score: 0</span><span class="breakout-level">Lv 1</span>'
    + '<span class="breakout-lives">♥♥♥</span></div>'
    + '<div style="position:relative">'
    + '<canvas class="breakout-canvas" width="' + W + '" height="' + H + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#0e1117;cursor:pointer;touch-action:none"></canvas>'
    + '<div class="breakout-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(8,10,15,.78);color:#fff;border-radius:8px">'
    + '<div class="breakout-over-msg" style="font-size:18px;font-weight:700"></div>'
    + '<div><button class="breakout-restart">Play again</button> <button class="breakout-quit">Back</button></div></div>'
    + '</div>'
    + '<div style="font-size:12px;opacity:.7">← → or drag to move · Space / tap to launch · catch the drops</div></div>';

  const wrap = host.querySelector('.breakout-wrap');
  const canvas = host.querySelector('.breakout-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.breakout-score');
  const levelEl = host.querySelector('.breakout-level');
  const livesEl = host.querySelector('.breakout-lives');
  const overEl = host.querySelector('.breakout-over');
  const overMsg = host.querySelector('.breakout-over-msg');

  let paddleX, paddleW, balls, bricks, drops, score, lives, level, dead, raf, last, keyDir, expandTtl, slowTtl;

  function buildBoard() { ({ bricks } = buildBricks(level, W, GAP, BRICK_H, TOP)); }
  function spdMul() { return slowTtl > 0 ? 0.62 : 1; }
  function setSpeed(b, sp) { const m = Math.hypot(b.vx, b.vy) || 1; b.vx = b.vx / m * sp; b.vy = b.vy / m * sp; }

  function stuckBall() { return { x: paddleX + paddleW / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true }; }
  function resetBalls() { balls = [stuckBall()]; }

  function launch() {
    const sp = ballSpeed(level) * spdMul();
    let any = false;
    for (const b of balls) if (b.stuck) { b.vx = sp * 0.5 * (Math.random() < 0.5 ? -1 : 1); b.vy = -sp; b.stuck = false; any = true; }
    return any;
  }

  function reset() {
    score = 0; lives = 3; level = 0; dead = false;
    paddleX = (W - BASE_PADDLE_W) / 2; paddleW = BASE_PADDLE_W; keyDir = 0;
    expandTtl = 0; slowTtl = 0; drops = [];
    buildBoard(); resetBalls();
    overEl.hidden = true; syncHud();
    last = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
  }

  function loseLife() {
    lives--; syncHud();
    if (lives <= 0) return gameOver();
    paddleW = BASE_PADDLE_W; expandTtl = 0; slowTtl = 0;
    resetBalls();
  }

  function nextLevel() { level++; drops = []; buildBoard(); resetBalls(); paddleW = BASE_PADDLE_W; expandTtl = slowTtl = 0; syncHud(); }

  function activate(type) {
    if (type === 'multi') {
      const moving = balls.filter((b) => !b.stuck);
      const src = moving.length ? moving : balls;
      for (const b of src.slice()) {
        if (balls.length >= MAX_BALLS) break;
        const sp = ballSpeed(level) * spdMul();
        const clone = { x: b.x, y: b.y, vx: -b.vx || sp * 0.5, vy: b.vy || -sp, stuck: false };
        setSpeed(clone, sp); clone.vx += sp * 0.25; balls.push(clone);
      }
    } else if (type === 'expand') { paddleW = BASE_PADDLE_W * 1.6; expandTtl = 12; }
    else if (type === 'slow') { slowTtl = 10; for (const b of balls) if (!b.stuck) setSpeed(b, ballSpeed(level) * 0.62); }
    else if (type === 'life') { lives++; syncHud(); }
  }

  function hitBrick(b, i) {
    const brick = bricks[i];
    const overlapX = Math.min(b.x + BALL_R - brick.x, brick.x + brick.w - (b.x - BALL_R));
    const overlapY = Math.min(b.y + BALL_R - brick.y, brick.y + brick.h - (b.y - BALL_R));
    if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
    if (brick.type === 'solid') return;
    brick.hp--;
    if (brick.hp > 0) { brick.color = '#aeb4c0'; return; }   // tough brick cracked
    bricks.splice(i, 1);
    score += brick.val * (level + 1);                        // RAMP: brick value × level
    syncHud(); onScore?.(score);
    if (Math.random() < DROP_CHANCE) drops.push({ x: brick.x + brick.w / 2, y: brick.y, type: POWERUPS[Math.floor(Math.random() * POWERUPS.length)] });
    if (breakableLeft(bricks) === 0) nextLevel();
  }

  function step(dt) {
    if (keyDir) paddleX = Math.max(0, Math.min(W - paddleW, paddleX + keyDir * 340 * dt));
    if (expandTtl > 0 && (expandTtl -= dt) <= 0) { paddleW = BASE_PADDLE_W; paddleX = Math.min(paddleX, W - paddleW); }
    if (slowTtl > 0 && (slowTtl -= dt) <= 0) for (const b of balls) if (!b.stuck) setSpeed(b, ballSpeed(level));

    for (const b of balls) {
      if (b.stuck) { b.x = paddleX + paddleW / 2; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H && b.x >= paddleX && b.x <= paddleX + paddleW) {
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
    ctx.fillStyle = '#e8eaed'; ctx.fillRect(paddleX, PADDLE_Y, paddleW, PADDLE_H);
    for (const b of balls) { ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); }
  }

  function loop(ts) {
    if (dead) return;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    step(dt); if (dead) return;
    draw(); raf = requestAnimationFrame(loop);
  }

  function gameOver() { dead = true; cancelAnimationFrame(raf); overMsg.textContent = 'Game over — score ' + score; overEl.hidden = false; }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keyDir = -1;
    else if (k === 'arrowright' || k === 'd') keyDir = 1;
    else if (k === ' ') launch();
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
    paddleX = Math.max(0, Math.min(W - paddleW, (clientX - rect.left) * (W / rect.width) - paddleW / 2));
  }
  function onPointerMove(e) { pointAt(e.clientX); }
  function onPointerDown(e) { pointAt(e.clientX); launch(); }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  host.querySelector('.breakout-restart').addEventListener('click', reset);
  host.querySelector('.breakout-quit').addEventListener('click', () => onExit?.());

  wrap.__breakout = {
    state: () => ({ score, lives, level, dead, stuck: balls.every((b) => b.stuck), bricks: breakableLeft(bricks), balls: balls.length }),
    speedAt: (lvl) => ballSpeed(lvl), activate, launch,
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
