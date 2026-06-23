// Asteroids — vector ship shooting drifting rocks. Self-contained canvas game; keyboard (← → rotate,
// ↑ thrust, Space fire) and an on-screen d-pad (shared controls.js) so it plays on phone and desktop.
// Difficulty ESCALATES: each cleared wave spawns more, faster rocks. Scoring RAMPS: a rock pays its
// size value × wave, plus a wave-clear bonus × wave. Contract: mount(host,{onScore,onExit})=>{destroy()}.
import { dpad } from '../controls.js';
import { AST, wrap, splitAsteroid, dist2, spawnWave } from './entities.js';

const W = 360, H = 360;
const ROT = 4.2, THRUST = 240, DRAG = 0.7, MAX_V = 320;     // ship handling
const BULLET_V = 420, BULLET_LIFE = 0.9, FIRE_MS = 180, MAX_BULLETS = 5;
const rockSpeed = (wave) => 36 + wave * 12;                 // escalates with wave
const rocksInWave = (wave) => 3 + wave;

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="asteroids-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + '<div class="asteroids-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="asteroids-score">Score: 0</span><span class="asteroids-wave">Wave 1</span>'
    + '<span class="asteroids-lives">▲▲▲</span></div>'
    + '<div style="position:relative">'
    + '<canvas class="asteroids-canvas" width="' + W + '" height="' + H + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#06080f;touch-action:none"></canvas>'
    + '<div class="asteroids-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(4,6,12,.8);color:#fff;border-radius:8px">'
    + '<div class="asteroids-over-msg" style="font-size:18px;font-weight:700"></div>'
    + '<div><button class="asteroids-restart">Play again</button> <button class="asteroids-quit">Back</button></div></div>'
    + '</div>'
    + '<div style="font-size:12px;opacity:.7">← → rotate · ↑ thrust · Space fire · d-pad on touch</div></div>';

  const wrap_ = host.querySelector('.asteroids-wrap');
  const canvas = host.querySelector('.asteroids-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.asteroids-score');
  const waveEl = host.querySelector('.asteroids-wave');
  const livesEl = host.querySelector('.asteroids-lives');
  const overEl = host.querySelector('.asteroids-over');
  const overMsg = host.querySelector('.asteroids-over-msg');

  let ship, bullets, rocks, score, lives, wave, dead, raf, last, fireCd;
  const keys = { l: false, r: false, thrust: false };

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    waveEl.textContent = 'Wave ' + wave;
    livesEl.textContent = lives > 0 ? '▲'.repeat(lives) : '—';
  }

  function newShip() { return { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, inv: 2 }; }

  function startWave() {
    rocks = spawnWave(rocksInWave(wave), W, H, ship.x, ship.y, rockSpeed(wave));
  }

  function reset() {
    ship = newShip(); bullets = []; score = 0; lives = 3; wave = 1; dead = false; fireCd = 0;
    keys.l = keys.r = keys.thrust = false;
    startWave();
    overEl.hidden = true; syncHud();
    last = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function fire() {
    if (dead || fireCd > 0 || bullets.length >= MAX_BULLETS) return;
    bullets.push({ x: ship.x + Math.cos(ship.angle) * 14, y: ship.y + Math.sin(ship.angle) * 14,
      vx: ship.vx + Math.cos(ship.angle) * BULLET_V, vy: ship.vy + Math.sin(ship.angle) * BULLET_V, life: BULLET_LIFE });
    fireCd = FIRE_MS / 1000;
  }

  function loseLife() {
    lives--; syncHud();
    if (lives <= 0) return gameOver();
    ship = newShip();
  }

  function step(dt) {
    if (keys.l) ship.angle -= ROT * dt;
    if (keys.r) ship.angle += ROT * dt;
    if (keys.thrust) { ship.vx += Math.cos(ship.angle) * THRUST * dt; ship.vy += Math.sin(ship.angle) * THRUST * dt; }
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > MAX_V) { ship.vx *= MAX_V / sp; ship.vy *= MAX_V / sp; }
    ship.vx *= (1 - DRAG * dt); ship.vy *= (1 - DRAG * dt);
    ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship, W, H);
    if (ship.inv > 0) ship.inv -= dt;
    if (fireCd > 0) fireCd -= dt;

    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b, W, H); }
    bullets = bullets.filter((b) => b.life > 0);

    for (const a of rocks) { a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr; wrap(a, W, H); }

    // bullet → rock
    for (let i = rocks.length - 1; i >= 0; i--) {
      const a = rocks[i];
      const bi = bullets.findIndex((b) => dist2(a.x, a.y, b.x, b.y) < a.r * a.r);
      if (bi === -1) continue;
      bullets.splice(bi, 1);
      rocks.splice(i, 1, ...splitAsteroid(a, rockSpeed(wave) * 1.2));
      score += AST[a.size].score * wave;                  // RAMP: rock value × wave
      syncHud(); onScore?.(score);
    }
    // ship → rock
    if (ship.inv <= 0) {
      for (const a of rocks) if (dist2(a.x, a.y, ship.x, ship.y) < (a.r + 9) * (a.r + 9)) { loseLife(); break; }
    }
    if (!rocks.length) { wave++; score += 100 * wave; syncHud(); onScore?.(score); ship.inv = Math.max(ship.inv, 1); startWave(); }
  }

  function draw() {
    ctx.fillStyle = '#06080f'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#9aa7c7';
    for (const a of rocks) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot); ctx.beginPath();
      a.verts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#ffe066';
    for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    if (!dead && (ship.inv <= 0 || Math.floor(ship.inv * 10) % 2 === 0)) {   // blink while invulnerable
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
      ctx.strokeStyle = '#4dd2ff'; ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-10, -8); ctx.lineTo(-6, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke();
      if (keys.thrust) { ctx.strokeStyle = '#ff922b'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-15, 0); ctx.stroke(); }
      ctx.restore();
    }
  }

  function loop(ts) {
    if (dead) return;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    step(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    dead = true; cancelAnimationFrame(raf);
    overMsg.textContent = 'Game over — score ' + score; overEl.hidden = false;
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.l = true;
    else if (k === 'arrowright' || k === 'd') keys.r = true;
    else if (k === 'arrowup' || k === 'w') keys.thrust = true;
    else if (k === ' ') fire();
    else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.l = false;
    else if (k === 'arrowright' || k === 'd') keys.r = false;
    else if (k === 'arrowup' || k === 'w') keys.thrust = false;
  }

  // Touch: discrete impulses per press (the d-pad repeats while held).
  const pad = dpad(wrap_, [
    { id: 'l', label: '◀', hold: true }, { id: 'thr', label: '🔥', hold: true },
    { id: 'r', label: '▶', hold: true }, { id: 'fire', label: '⦿' },
  ], (id) => {
    if (dead) return;
    if (id === 'l') ship.angle -= 0.32;
    else if (id === 'r') ship.angle += 0.32;
    else if (id === 'thr') { ship.vx += Math.cos(ship.angle) * 42; ship.vy += Math.sin(ship.angle) * 42; }
    else if (id === 'fire') fire();
  }, { repeatMs: 80 });

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  host.querySelector('.asteroids-restart').addEventListener('click', reset);
  host.querySelector('.asteroids-quit').addEventListener('click', () => onExit?.());

  wrap_.__asteroids = {
    state: () => ({ score, lives, wave, dead, rocks: rocks.length, bullets: bullets.length }),
    rocksInWave: (w) => rocksInWave(w), fire,
  };

  reset();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      pad.destroy();
      host.innerHTML = '';
    },
  };
}
