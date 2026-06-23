// Flappy Bird — easter-egg arcade game. Click (or tap) or press Space to flap; thread the pipes.
// Fully self-contained: ALL styling is inline so this stays the only file added — no edit to the
// metagame-lane-owned docs/assets/games.css, keeping the game in the GENERAL lane.
// Contract (same as Snake / 2048): mount(host, { onScore, onExit }) => { destroy() }.

const W = 340, H = 520;          // canvas size (portrait)
const BIRD_X = 84, BIRD_R = 13;  // bird horizontal position + radius
const GRAVITY = 0.45;            // downward accel, px per 60fps-frame²
const FLAP_V = -7.2;             // upward impulse applied on each flap
const MAX_FALL = 11;             // terminal downward velocity
const PIPE_W = 58;               // pipe width
const GAP = 150;                 // vertical gap the bird flies through
const PIPE_SPEED = 2.3;          // leftward px per frame
const PIPE_SPACING = 210;        // horizontal px between successive pipe pairs
const GROUND = 28;               // ground strip height at the bottom
const MARGIN = 56;               // keep each gap this far from ceiling/ground

const rand = (min, max) => min + Math.random() * (max - min);

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="flappybird-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px">'
    + '<div class="flappybird-hud" style="display:flex;gap:14px;align-items:center;font-size:14px">'
    + '<span class="flappybird-score" style="font-weight:700">Score: 0</span>'
    + '<span style="opacity:.7">Click / tap / Space to flap</span></div>'
    + '<div class="flappybird-board" style="position:relative;line-height:0">'
    + '<canvas class="flappybird-canvas" width="' + W + '" height="' + H + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:10px;cursor:pointer;touch-action:none"></canvas>'
    + '<div class="flappybird-over" style="position:absolute;inset:0;display:none;align-items:center;'
    + 'justify-content:center;background:rgba(0,0,0,.45);border-radius:10px">'
    + '<div style="background:var(--bg,#fff);color:var(--fg,#111);padding:18px 22px;border-radius:12px;text-align:center">'
    + '<div class="flappybird-over-msg" style="font-weight:600;margin-bottom:12px"></div>'
    + '<button class="flappybird-restart" type="button">Play again</button> '
    + '<button class="flappybird-quit" type="button">Back</button></div></div>'
    + '</div></div>';

  const canvas = host.querySelector('.flappybird-canvas');
  const g = canvas.getContext('2d');
  const scoreEl = host.querySelector('.flappybird-score');
  const overEl = host.querySelector('.flappybird-over');
  const overMsg = host.querySelector('.flappybird-over-msg');
  const wrap = host.querySelector('.flappybird-wrap');

  let birdY, vy, pipes, score, started, dead, raf, last;

  function reset() {
    birdY = H * 0.42; vy = 0;
    pipes = []; score = 0; started = false; dead = false; last = 0;
    scoreEl.textContent = 'Score: 0';
    overEl.style.display = 'none';
    spawnPipe(W + 40);
    spawnPipe(W + 40 + PIPE_SPACING);
    draw();
  }

  function spawnPipe(x) {
    pipes.push({ x, gapY: rand(MARGIN + GAP / 2, H - GROUND - MARGIN - GAP / 2), passed: false });
  }

  // Flap: the only player action. First flap also starts the run (the bird hovers until then).
  function flap() {
    if (dead) return;
    started = true;
    vy = FLAP_V;
  }

  function update(dtf) {
    if (!started || dead) return;
    vy = Math.min(vy + GRAVITY * dtf, MAX_FALL);
    birdY += vy * dtf;

    for (const p of pipes) p.x -= PIPE_SPEED * dtf;
    while (pipes.length && pipes[0].x < -PIPE_W) pipes.shift();
    const lastX = pipes.length ? pipes[pipes.length - 1].x : 0;
    if (lastX < W - PIPE_SPACING) spawnPipe(lastX + PIPE_SPACING);

    for (const p of pipes) {
      if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
        p.passed = true; score++; scoreEl.textContent = 'Score: ' + score; onScore?.(score);
      }
    }

    if (birdY + BIRD_R >= H - GROUND || birdY - BIRD_R <= 0) return gameOver();
    for (const p of pipes) {
      const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
      if (inX && (birdY - BIRD_R < p.gapY - GAP / 2 || birdY + BIRD_R > p.gapY + GAP / 2)) return gameOver();
    }
  }

  function loop(ts) {
    const dtf = last ? Math.min((ts - last) / 16.67, 3) : 1;   // frames elapsed since last tick (clamped)
    last = ts;
    update(dtf);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function draw() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    g.fillStyle = dark ? '#10243a' : '#9bd3f0';                  // sky
    g.fillRect(0, 0, W, H);
    for (const p of pipes) {                                      // pipes (+ a lip at each gap edge)
      g.fillStyle = dark ? '#2b8a3e' : '#4cae4f';
      const topH = p.gapY - GAP / 2, botY = p.gapY + GAP / 2;
      g.fillRect(p.x, 0, PIPE_W, topH);
      g.fillRect(p.x, botY, PIPE_W, H - GROUND - botY);
      g.fillStyle = dark ? '#37a04c' : '#3f9c43';
      g.fillRect(p.x - 3, topH - 12, PIPE_W + 6, 12);
      g.fillRect(p.x - 3, botY, PIPE_W + 6, 12);
    }
    g.fillStyle = dark ? '#3a2f1a' : '#ded895';                  // ground
    g.fillRect(0, H - GROUND, W, GROUND);
    g.save();                                                    // bird (tilts with velocity)
    g.translate(BIRD_X, birdY);
    g.rotate(Math.max(-0.5, Math.min(1, vy / 12)));
    g.fillStyle = '#ffd43b';
    g.beginPath(); g.arc(0, 0, BIRD_R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8590c'; g.fillRect(BIRD_R - 3, -3, 7, 6);   // beak
    g.fillStyle = '#fff'; g.beginPath(); g.arc(4, -4, 3.2, 0, Math.PI * 2); g.fill();   // eye
    g.fillStyle = '#111'; g.beginPath(); g.arc(5, -4, 1.5, 0, Math.PI * 2); g.fill();
    g.restore();
    if (!started && !dead) {
      g.fillStyle = dark ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.72)';
      g.font = 'bold 18px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('Click or press Space', W / 2, H * 0.62);
    }
  }

  function gameOver() {
    if (dead) return;
    dead = true;
    overMsg.textContent = 'Game over — score ' + score;
    overEl.style.display = 'flex';
  }

  function onKey(e) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') { flap(); e.preventDefault(); }
  }
  function onPointer(e) {
    if (e.target.closest('button')) return;   // overlay buttons (Play again / Back) act normally
    flap(); e.preventDefault();
  }

  window.addEventListener('keydown', onKey);
  host.addEventListener('pointerdown', onPointer);
  host.querySelector('.flappybird-restart').addEventListener('click', reset);
  host.querySelector('.flappybird-quit').addEventListener('click', () => onExit?.());

  reset();
  raf = requestAnimationFrame(loop);

  // Test seam (mirrors 2048's __g2048): read state + drive input without relying on RAF timing.
  wrap.__flappybird = { flap, reset, state: () => ({ birdY, vy, score, started, dead, pipes: pipes.length }) };

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      host.removeEventListener('pointerdown', onPointer);
      host.innerHTML = '';
    },
  };
}
