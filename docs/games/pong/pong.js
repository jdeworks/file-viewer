// Pong — you (left) vs an AI (right), or 2-player on one keyboard. Canvas game; player 1 = ↑ ↓ or
// pointer/touch drag; pressing W or S hands the right paddle to player 2 (the AI steps aside).
// Difficulty ESCALATES over time: the ball accelerates on every paddle hit during a rally, so long
// rallies outpace the (fixed-speed) AI and force a miss; base speed also rises with level. Scoring
// RAMPS in 1P: a point pays (level+1) × 10 + rally bonus. Contract: mount(host,{onScore,onExit})=>{destroy()}.
const W = 400, H = 280;
const PW = 9, PH = 56, PLAYER_X = 14, AI_X = W - 14 - PW, BALL_R = 6, PADDLE_SPEED = 340;
const ballSpeed = (lvl) => 210 + lvl * 26;                 // base serve speed — escalates with level
const aiSpeed = (lvl) => 150 + lvl * 20;                   // AI tracking cap — deliberately < a fast rally ball
const RALLY_ACCEL = 1.06, RALLY_MAX = 2.7;                 // ball speeds up each hit, capped at ×2.7 base

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="pong-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + '<div class="pong-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="pong-score">Score: 0</span><span class="pong-level">Lv 1</span>'
    + '<span class="pong-lives">♥♥♥</span></div>'
    + '<div style="position:relative">'
    + '<canvas class="pong-canvas" width="' + W + '" height="' + H + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#0a0e16;cursor:ns-resize;touch-action:none"></canvas>'
    + '<div class="pong-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(6,9,16,.8);color:#fff;border-radius:8px">'
    + '<div class="pong-over-msg" style="font-size:18px;font-weight:700"></div>'
    + '<div><button class="pong-restart">Play again</button> <button class="pong-quit">Back</button></div></div>'
    + '</div>'
    + '<div style="font-size:12px;opacity:.7">P1: ↑ ↓ or drag · press W/S to join as P2</div></div>';

  const wrap = host.querySelector('.pong-wrap');
  const canvas = host.querySelector('.pong-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.pong-score');
  const levelEl = host.querySelector('.pong-level');
  const livesEl = host.querySelector('.pong-lives');
  const overEl = host.querySelector('.pong-over');
  const overMsg = host.querySelector('.pong-over-msg');

  let ball, leftY, rightY, score, lives, level, dead, raf, last, p1Dir, p2Dir, mode, p1pts, p2pts;

  function syncHud() {
    if (mode === '2p') {
      scoreEl.textContent = 'P1  ' + p1pts + ' — ' + p2pts + '  P2';
      levelEl.textContent = ''; livesEl.textContent = '2-player';
    } else {
      scoreEl.textContent = 'Score: ' + score;
      levelEl.textContent = 'Lv ' + (level + 1);
      livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
    }
  }

  function serve(dir) {
    const sp = ballSpeed(level), a = (Math.random() * 0.5 - 0.25);
    ball = { x: W / 2, y: H / 2, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, speed: sp };
  }

  function reset() {
    leftY = rightY = (H - PH) / 2;
    score = 0; lives = 3; level = 0; dead = false; p1Dir = 0; p2Dir = 0; mode = '1p'; p1pts = 0; p2pts = 0;
    serve(Math.random() < 0.5 ? -1 : 1);
    overEl.hidden = true; syncHud();
    last = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function paddleBounce(py, towardRight) {
    const hit = (ball.y - (py + PH / 2)) / (PH / 2);       // -1..1 → deflection angle
    ball.speed = Math.min(ball.speed * RALLY_ACCEL, ballSpeed(level) * RALLY_MAX);   // rally escalation
    const angle = hit * 1.0;
    ball.vx = (towardRight ? 1 : -1) * Math.abs(ball.speed * Math.cos(angle));
    ball.vy = ball.speed * Math.sin(angle);
  }

  function leftMiss() {                                     // ball passed player 1 (left)
    if (mode === '2p') { p2pts++; syncHud(); serve(1); return; }
    lives--; syncHud();
    if (lives <= 0) return gameOver();
    serve(1);
  }
  function rightMiss() {                                    // ball passed the right paddle
    if (mode === '2p') { p1pts++; syncHud(); serve(-1); return; }
    p1pts++;                                                // (1P) you scored past the AI
    score += (level + 1) * 10 + Math.round((ball.speed / ballSpeed(level) - 1) * 40);   // RAMP: + rally bonus
    level = Math.floor(p1pts / 3);
    syncHud(); onScore?.(score);
    serve(-1);
  }

  function step(dt) {
    if (p1Dir) leftY = Math.max(0, Math.min(H - PH, leftY + p1Dir * PADDLE_SPEED * dt));
    if (mode === '2p') {
      if (p2Dir) rightY = Math.max(0, Math.min(H - PH, rightY + p2Dir * PADDLE_SPEED * dt));
    } else {
      const target = ball.y - PH / 2;                       // AI tracks, capped by its speed
      rightY += Math.max(-aiSpeed(level) * dt, Math.min(aiSpeed(level) * dt, target - rightY));
      rightY = Math.max(0, Math.min(H - PH, rightY));
    }

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - BALL_R) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

    if (ball.vx < 0 && ball.x - BALL_R <= PLAYER_X + PW && ball.x > PLAYER_X && ball.y >= leftY && ball.y <= leftY + PH) {
      ball.x = PLAYER_X + PW + BALL_R; paddleBounce(leftY, true);
    }
    if (ball.vx > 0 && ball.x + BALL_R >= AI_X && ball.x < AI_X + PW && ball.y >= rightY && ball.y <= rightY + PH) {
      ball.x = AI_X - BALL_R; paddleBounce(rightY, false);
    }

    if (ball.x < -BALL_R) leftMiss();
    else if (ball.x > W + BALL_R) rightMiss();
  }

  function draw() {
    ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(PLAYER_X, leftY, PW, PH);
    ctx.fillStyle = mode === '2p' ? '#ffd43b' : '#e8eaed';   // P2 paddle tinted in 2-player
    ctx.fillRect(AI_X, rightY, PW, PH);
    ctx.fillStyle = '#e8eaed';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
  }

  function loop(ts) {
    if (dead) return;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    step(dt); if (dead) return;
    draw(); raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    dead = true; cancelAnimationFrame(raf);
    overMsg.textContent = 'Game over — score ' + score; overEl.hidden = false;
  }

  function joinP2() { if (mode !== '2p') { mode = '2p'; p1pts = 0; p2pts = 0; syncHud(); } }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup') p1Dir = -1;
    else if (k === 'arrowdown') p1Dir = 1;
    else if (k === 'w') { joinP2(); p2Dir = -1; }
    else if (k === 's') { joinP2(); p2Dir = 1; }
    else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' && p1Dir < 0) p1Dir = 0;
    else if (k === 'arrowdown' && p1Dir > 0) p1Dir = 0;
    else if (k === 'w' && p2Dir < 0) p2Dir = 0;
    else if (k === 's' && p2Dir > 0) p2Dir = 0;
  }
  function pointAt(clientY) {
    const rect = canvas.getBoundingClientRect();
    leftY = Math.max(0, Math.min(H - PH, (clientY - rect.top) * (H / rect.height) - PH / 2));
  }
  function onPointerMove(e) { if (e.buttons || e.pointerType === 'touch') pointAt(e.clientY); }
  function onPointerDown(e) { pointAt(e.clientY); }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  host.querySelector('.pong-restart').addEventListener('click', reset);
  host.querySelector('.pong-quit').addEventListener('click', () => onExit?.());

  wrap.__pong = {
    state: () => ({ score, lives, level, dead, ballX: ball.x, mode, p1pts, p2pts }),
    speedAt: (lvl) => ballSpeed(lvl),
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
