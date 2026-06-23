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
const GROUND = 32;               // ground strip height at the bottom
const MARGIN = 56;               // keep each gap this far from ceiling/ground
const PLAY_H = H - GROUND;       // playable height (above the ground)
const HI_KEY = 'fv:games:hi:flappybird';

const rand = (min, max) => min + Math.random() * (max - min);
const hiScore = () => { try { return Number(localStorage.getItem(HI_KEY) || 0); } catch { return 0; } };

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
    + '<div style="background:var(--bg,#fff);color:var(--fg,#111);padding:18px 24px;border-radius:12px;text-align:center;min-width:180px;line-height:1.4">'
    + '<div class="flappybird-over-msg" style="font-weight:700;font-size:19px;margin-bottom:4px">Game over</div>'
    + '<div class="flappybird-over-sub" style="font-size:14px;opacity:.8;margin-bottom:14px"></div>'
    + '<button class="flappybird-restart" type="button">Play again</button> '
    + '<button class="flappybird-quit" type="button">Back</button></div></div>'
    + '</div></div>';

  const canvas = host.querySelector('.flappybird-canvas');
  const g = canvas.getContext('2d');
  const scoreEl = host.querySelector('.flappybird-score');
  const overEl = host.querySelector('.flappybird-over');
  const overSub = host.querySelector('.flappybird-over-sub');
  const wrap = host.querySelector('.flappybird-wrap');

  let birdY, vy, pipes, score, started, dead, raf, last;
  let groundX = 0, wing = 0;                                    // ambient animation state
  const clouds = Array.from({ length: 4 }, () => ({ x: rand(0, W), y: rand(20, PLAY_H * 0.55), s: rand(0.2, 0.5), r: rand(16, 28) }));

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
    pipes.push({ x, gapY: rand(MARGIN + GAP / 2, PLAY_H - MARGIN - GAP / 2), passed: false });
  }

  // Flap: the only player action. First flap also starts the run (the bird hovers until then).
  function flap() {
    if (dead) return;
    started = true;
    vy = FLAP_V;
    wing = 1;                                                   // kick the wing-flap animation
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

    if (birdY + BIRD_R >= PLAY_H || birdY - BIRD_R <= 0) return gameOver();
    for (const p of pipes) {
      const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
      if (inX && (birdY - BIRD_R < p.gapY - GAP / 2 || birdY + BIRD_R > p.gapY + GAP / 2)) return gameOver();
    }
  }

  function loop(ts) {
    const dtf = last ? Math.min((ts - last) / 16.67, 3) : 1;   // frames elapsed since last tick (clamped)
    last = ts;
    if (!dead) { groundX = (groundX - PIPE_SPEED * dtf) % 24; }  // ground + clouds drift even on the title screen
    for (const c of clouds) { c.x -= c.s * dtf; if (c.x < -c.r * 3) { c.x = W + c.r * 2; c.y = rand(20, PLAY_H * 0.55); } }
    if (wing > 0) wing = Math.max(0, wing - 0.08 * dtf);
    update(dtf);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function draw() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const sky = g.createLinearGradient(0, 0, 0, PLAY_H);         // sky gradient
    sky.addColorStop(0, dark ? '#0b1b2e' : '#79c4ef');
    sky.addColorStop(1, dark ? '#16324d' : '#bfe8fb');
    g.fillStyle = sky; g.fillRect(0, 0, W, PLAY_H);
    g.fillStyle = dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.75)';  // clouds
    for (const c of clouds) {
      g.beginPath();
      g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      g.arc(c.x + c.r * 0.9, c.y + 4, c.r * 0.8, 0, Math.PI * 2);
      g.arc(c.x - c.r * 0.9, c.y + 5, c.r * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    for (const p of pipes) drawPipe(p, dark);
    drawGround(dark);
    drawBird(dark);
    // score: big centered counter while playing; title hint before the first flap
    if (started && !dead) {
      g.font = 'bold 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.55)'; g.fillStyle = '#fff';
      g.strokeText(score, W / 2, 56); g.fillText(score, W / 2, 56);
      g.textBaseline = 'alphabetic';
    } else if (!started && !dead) {
      g.fillStyle = dark ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.78)';
      g.font = 'bold 20px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('Flappy Bird', W / 2, H * 0.34);
      g.font = '14px system-ui, sans-serif';
      g.fillText('Click, tap, or press Space to flap', W / 2, H * 0.34 + 26);
    }
  }

  function drawPipe(p, dark) {
    const topH = p.gapY - GAP / 2, botY = p.gapY + GAP / 2;
    const body = g.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);   // left-lit cylinder shading
    body.addColorStop(0, dark ? '#1f6f31' : '#5fbf57');
    body.addColorStop(0.5, dark ? '#2f9e44' : '#74c365');
    body.addColorStop(1, dark ? '#175726' : '#479a3f');
    g.fillStyle = body;
    g.fillRect(p.x, 0, PIPE_W, topH);
    g.fillRect(p.x, botY, PIPE_W, PLAY_H - botY);
    g.fillStyle = dark ? '#37a04c' : '#3f9c43';                     // caps (lips) at each gap edge
    g.fillRect(p.x - 3, topH - 14, PIPE_W + 6, 14);
    g.fillRect(p.x - 3, botY, PIPE_W + 6, 14);
    g.strokeStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.2)'; g.lineWidth = 2;
    g.strokeRect(p.x, 0, PIPE_W, topH); g.strokeRect(p.x, botY, PIPE_W, PLAY_H - botY);
  }

  function drawGround(dark) {
    g.fillStyle = dark ? '#3a2f1a' : '#ded895';
    g.fillRect(0, PLAY_H, W, GROUND);
    g.fillStyle = dark ? '#2b8a3e' : '#7ec850';                     // grass strip
    g.fillRect(0, PLAY_H, W, 6);
    g.fillStyle = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';   // scrolling dashes
    for (let x = groundX; x < W; x += 24) g.fillRect(x, PLAY_H + 12, 12, 6);
  }

  function drawBird(dark) {
    g.save();
    g.translate(BIRD_X, birdY);
    g.rotate(Math.max(-0.5, Math.min(1.1, vy / 12)));
    g.fillStyle = '#ffd43b';                                        // body
    g.beginPath(); g.arc(0, 0, BIRD_R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#f59f00';                                        // animated wing (folds with `wing`)
    g.beginPath(); g.ellipse(-3, 2, 8, 5 - wing * 3, -0.5 + wing * 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8590c'; g.fillRect(BIRD_R - 3, -3, 8, 6);      // beak
    g.fillStyle = '#fff'; g.beginPath(); g.arc(5, -4, 3.4, 0, Math.PI * 2); g.fill();   // eye
    g.fillStyle = '#111'; g.beginPath(); g.arc(6, -4, 1.6, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function gameOver() {
    if (dead) return;
    dead = true;
    const best = Math.max(hiScore(), score);
    overSub.textContent = 'Score ' + score + '  ·  Best ' + best;
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
