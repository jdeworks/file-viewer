// Snake — the first easter-egg game. Self-contained: a canvas grid game with keyboard (arrows /
// WASD) and touch-swipe controls, score + high-score callback, and a game-over/restart overlay.
// Contract: mount(host, { onScore, onExit }) => { destroy() }. No app coupling; pure canvas.
const GRID = 20;           // cells per side
const TICK_MS = 110;       // movement cadence
const CELL = 18;           // px per cell (canvas is GRID*CELL square, scaled to fit via CSS)

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="snake-wrap">'
    + '<div class="snake-hud"><span class="snake-score">Score: 0</span>'
    + '<span class="snake-hint">Arrows / WASD · Swipe on touch</span></div>'
    + '<div class="snake-board"><canvas class="snake-canvas" width="' + GRID * CELL + '" height="' + GRID * CELL + '"></canvas>'
    + '<div class="snake-over" hidden><div class="snake-over-box"><div class="snake-over-msg"></div>'
    + '<button class="snake-restart">Play again</button> <button class="snake-quit">Back</button></div></div>'
    + '</div></div>';

  const canvas = host.querySelector('.snake-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.snake-score');
  const overEl = host.querySelector('.snake-over');
  const overMsg = host.querySelector('.snake-over-msg');

  let snake, dir, nextDir, food, score, timer, dead;

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; dead = false;
    placeFood();
    scoreEl.textContent = 'Score: 0';
    overEl.hidden = true;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    draw();
  }

  function placeFood() {
    // Avoid placing food on the snake. The board is small, so a retry loop is fine.
    let p;
    do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
    while (snake.some((s) => s.x === p.x && s.y === p.y));
    food = p;
  }

  function setDir(x, y) {
    // No 180° reversals (would instantly self-collide).
    if (x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  function tick() {
    if (dead) return;
    dir = nextDir;
    const head = { x: (snake[0].x + dir.x + GRID) % GRID, y: (snake[0].y + dir.y + GRID) % GRID };
    // Only self-collision ends the game (no wall death):
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = 'Score: ' + score;
      onScore?.(score);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function gameOver() {
    dead = true;
    clearInterval(timer); timer = null;
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
    host.querySelector('.snake-board').classList.add('snake-dead');
  }

  function draw() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = dark ? '#161616' : '#f4f6f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // food (a byte)
    ctx.fillStyle = '#e0533d';
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    // snake
    for (let i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? '#2f9e44' : '#40c057';
      ctx.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDir(0, -1);
    else if (k === 'arrowdown' || k === 's') setDir(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDir(1, 0);
    else return;
    e.preventDefault();
  }

  // Touch swipe (mobile): record on touchstart, resolve direction on touchend (20px threshold).
  let tStart = null;
  function onTouchStart(e) { const t = e.touches[0]; tStart = { x: t.clientX, y: t.clientY }; e.preventDefault(); }
  function onTouchEnd(e) {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    tStart = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;  // below threshold — ignore
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  }

  window.addEventListener('keydown', onKey);
  host.addEventListener('touchstart', onTouchStart, { passive: false });
  host.addEventListener('touchend', onTouchEnd, { passive: true });
  host.querySelector('.snake-restart').addEventListener('click', () => { host.querySelector('.snake-board').classList.remove('snake-dead'); reset(); });
  host.querySelector('.snake-quit').addEventListener('click', () => onExit?.());

  reset();

  return {
    destroy() {
      if (timer) clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchend', onTouchEnd);
      host.innerHTML = '';
    },
  };
}
