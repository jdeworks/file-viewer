// Breakout — paddle + ball + bricks. Self-contained canvas game; keyboard (← →) and touch/pointer
// (drag anywhere to steer the paddle). Difficulty ESCALATES: each cleared board levels up — the ball
// speeds up and a brick row is added. Scoring RAMPS: a brick pays (topRowBonus) × level, so later
// boards are worth disproportionately more. Contract: mount(host, { onScore, onExit }) => { destroy() }.
const W = 320, H = 440;
const COLS = 8, GAP = 3;
const BRICK_H = 16, TOP = 36;
const PADDLE_W = 64, PADDLE_H = 10, PADDLE_Y = H - 26;
const BALL_R = 5;
const START_ROWS = 4, MAX_ROWS = 9;
const ballSpeed = (lvl) => 190 + lvl * 38;                 // px/sec — escalates with level
const rowsFor = (lvl) => Math.min(MAX_ROWS, START_ROWS + lvl);
const ROW_COLORS = ['#e57373', '#ffb74d', '#ffd54f', '#81c784', '#4dd0e1', '#7986cb', '#ba68c8', '#f06292', '#a1887f'];

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
    + '<div style="font-size:12px;opacity:.7">← → or drag to move · Space / tap to launch</div></div>';

  const wrap = host.querySelector('.breakout-wrap');
  const canvas = host.querySelector('.breakout-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.breakout-score');
  const levelEl = host.querySelector('.breakout-level');
  const livesEl = host.querySelector('.breakout-lives');
  const overEl = host.querySelector('.breakout-over');
  const overMsg = host.querySelector('.breakout-over-msg');

  const brickW = (W - GAP * (COLS + 1)) / COLS;
  let paddleX, ball, bricks, score, lives, level, dead, raf, last, keyDir;

  function buildBoard() {
    bricks = [];
    const rows = rowsFor(level);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < COLS; c++)
        bricks.push({ r, c, x: GAP + c * (brickW + GAP), y: TOP + r * (BRICK_H + GAP),
          val: (rows - r), color: ROW_COLORS[r % ROW_COLORS.length] });
  }

  function resetBall() {
    ball = { x: W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true };
  }

  function launch() {
    if (!ball.stuck || dead) return;
    const sp = ballSpeed(level);
    ball.vx = sp * 0.5 * (Math.random() < 0.5 ? -1 : 1);
    ball.vy = -sp;
    ball.stuck = false;
  }

  function reset() {
    score = 0; lives = 3; level = 0; dead = false;
    paddleX = (W - PADDLE_W) / 2; keyDir = 0;
    buildBoard(); resetBall();
    overEl.hidden = true;
    syncHud();
    last = null;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
  }

  function loseLife() {
    lives--;
    syncHud();
    if (lives <= 0) return gameOver();
    resetBall();
  }

  function nextLevel() {
    level++;
    buildBoard(); resetBall();
    syncHud();
  }

  function step(dt) {
    // paddle (keyboard); pointer sets paddleX directly elsewhere
    if (keyDir) paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX + keyDir * 320 * dt));
    if (ball.stuck) { ball.x = paddleX + PADDLE_W / 2; return; }

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H + BALL_R) { loseLife(); return; }

    // paddle bounce — deflection angle depends on where it hits
    if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y - BALL_R <= PADDLE_Y + PADDLE_H
        && ball.x >= paddleX && ball.x <= paddleX + PADDLE_W) {
      const hit = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);   // -1..1
      const sp = ballSpeed(level);
      ball.vx = sp * 0.75 * hit;
      ball.vy = -Math.sqrt(Math.max(sp * sp - ball.vx * ball.vx, sp * sp * 0.25));
      ball.y = PADDLE_Y - BALL_R - 1;
    }

    // brick collisions
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (ball.x + BALL_R < b.x || ball.x - BALL_R > b.x + brickW
          || ball.y + BALL_R < b.y || ball.y - BALL_R > b.y + BRICK_H) continue;
      // reflect on the shallower axis of penetration
      const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + brickW - (ball.x - BALL_R));
      const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BRICK_H - (ball.y - BALL_R));
      if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
      bricks.splice(i, 1);
      score += b.val * (level + 1) * 2;                  // RAMP: brick value × level
      syncHud(); onScore?.(score);
      if (!bricks.length) nextLevel();
      break;
    }
  }

  function draw() {
    ctx.fillStyle = '#0e1117'; ctx.fillRect(0, 0, W, H);
    for (const b of bricks) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, brickW, BRICK_H); }
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
  }

  function loop(ts) {
    if (dead) return;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);       // clamp big gaps (tab switch)
    last = ts;
    step(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    dead = true;
    cancelAnimationFrame(raf);
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
  }

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
    const x = (clientX - rect.left) * (W / rect.width);
    paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
  }
  function onPointerMove(e) { pointAt(e.clientX); }
  function onPointerDown(e) { pointAt(e.clientX); launch(); }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  host.querySelector('.breakout-restart').addEventListener('click', reset);
  host.querySelector('.breakout-quit').addEventListener('click', () => onExit?.());

  wrap.__breakout = { state: () => ({ score, lives, level, dead, stuck: ball.stuck, bricks: bricks.length }),
    speedAt: (lvl) => ballSpeed(lvl), launch };

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
