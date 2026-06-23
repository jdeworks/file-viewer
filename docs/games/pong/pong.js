// Pong — you (left paddle) vs an AI (right). Self-contained canvas game; keyboard (↑ ↓ / W S) and
// pointer/touch (drag vertically anywhere on the board) so it plays on phone and desktop. Difficulty
// ESCALATES: ball and AI speed rise with your level. Scoring RAMPS: a point pays (level+1) × 10 plus a
// rally bonus, so longer/later points are worth disproportionately more. Three lives (your misses).
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
const W = 400, H = 280;
const PW = 9, PH = 56, PLAYER_X = 14, AI_X = W - 14 - PW, BALL_R = 6;
const PLAYER_SPEED = 340;
const ballSpeed = (lvl) => 200 + lvl * 30;                 // escalates with level
const aiSpeed = (lvl) => 150 + lvl * 28;                   // AI tracking speed — also escalates

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
    + '<div style="font-size:12px;opacity:.7">↑ ↓ / W S or drag to move</div></div>';

  const wrap = host.querySelector('.pong-wrap');
  const canvas = host.querySelector('.pong-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.pong-score');
  const levelEl = host.querySelector('.pong-level');
  const livesEl = host.querySelector('.pong-lives');
  const overEl = host.querySelector('.pong-over');
  const overMsg = host.querySelector('.pong-over-msg');

  let ball, playerY, aiY, score, lives, level, points, rally, dead, raf, last, moveDir;

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
  }

  function serve(dir) {
    ball = { x: W / 2, y: H / 2, vx: ballSpeed(level) * dir, vy: ballSpeed(level) * (Math.random() * 0.5 - 0.25) };
    rally = 0;
  }

  function reset() {
    playerY = aiY = (H - PH) / 2;
    score = 0; lives = 3; level = 0; points = 0; dead = false; moveDir = 0;
    serve(Math.random() < 0.5 ? -1 : 1);
    overEl.hidden = true; syncHud();
    last = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function bouncePaddle(py) {
    const hit = (ball.y - (py + PH / 2)) / (PH / 2);       // -1..1 → deflection angle
    const sp = ballSpeed(level);
    ball.vx = Math.sign(ball.vx) * -Math.abs(sp * Math.cos(hit * 0.9));
    ball.vy = sp * Math.sin(hit * 0.9);
    rally++;
  }

  function step(dt) {
    if (moveDir) playerY = Math.max(0, Math.min(H - PH, playerY + moveDir * PLAYER_SPEED * dt));
    // AI tracks the ball, capped by its (escalating) speed
    const target = ball.y - PH / 2;
    aiY += Math.max(-aiSpeed(level) * dt, Math.min(aiSpeed(level) * dt, target - aiY));
    aiY = Math.max(0, Math.min(H - PH, aiY));

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - BALL_R) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

    if (ball.vx < 0 && ball.x - BALL_R <= PLAYER_X + PW && ball.x > PLAYER_X
        && ball.y >= playerY && ball.y <= playerY + PH) { ball.x = PLAYER_X + PW + BALL_R; bouncePaddle(playerY); }
    if (ball.vx > 0 && ball.x + BALL_R >= AI_X && ball.x < AI_X + PW
        && ball.y >= aiY && ball.y <= aiY + PH) { ball.x = AI_X - BALL_R; bouncePaddle(aiY); }

    if (ball.x < -BALL_R) {                                // you missed
      lives--; syncHud();
      if (lives <= 0) return gameOver();
      serve(1);
    } else if (ball.x > W + BALL_R) {                      // you scored past the AI
      points++;
      score += (level + 1) * 10 + rally * 2;               // RAMP: point value × level + rally bonus
      level = Math.floor(points / 3);
      syncHud(); onScore?.(score);
      serve(-1);
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(PLAYER_X, playerY, PW, PH);
    ctx.fillRect(AI_X, aiY, PW, PH);
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
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
    if (k === 'arrowup' || k === 'w') moveDir = -1;
    else if (k === 'arrowdown' || k === 's') moveDir = 1;
    else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if ((k === 'arrowup' || k === 'w') && moveDir < 0) moveDir = 0;
    else if ((k === 'arrowdown' || k === 's') && moveDir > 0) moveDir = 0;
  }
  function pointAt(clientY) {
    const rect = canvas.getBoundingClientRect();
    const y = (clientY - rect.top) * (H / rect.height);
    playerY = Math.max(0, Math.min(H - PH, y - PH / 2));
  }
  function onPointerMove(e) { if (e.buttons || e.pointerType === 'touch') pointAt(e.clientY); }
  function onPointerDown(e) { pointAt(e.clientY); }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  host.querySelector('.pong-restart').addEventListener('click', reset);
  host.querySelector('.pong-quit').addEventListener('click', () => onExit?.());

  wrap.__pong = { state: () => ({ score, lives, level, dead, ballX: ball.x, playerY }), speedAt: (lvl) => ballSpeed(lvl) };

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
