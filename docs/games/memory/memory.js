// Memory — flip-and-match pairs, themed as file-type icons (on-brand for a file viewer). Pure DOM,
// so tap/click works identically on phone and desktop. Cards do a real 3D flip (CSS rotateY) — built
// once per round and toggled by class so the transition isn't destroyed by re-rendering. Difficulty
// ESCALATES: each cleared round adds a pair (6 → 8 → 10 → 12, capped). Scoring RAMPS: a match pays
// 10 × round and the round-clear bonus rewards efficiency × round.
// Contract: mount(host, { onScore, onExit }) => { destroy() }.
const ICONS = ['📄', '📁', '🖼️', '🎵', '🎬', '📦', '🗜️', '🔑', '📜', '⚙️', '🧾', '💾', '📊', '🔢', '🅿️', '🔣'];
const MAX_PAIRS = 12;
const FLIP_BACK_MS = 760;
const pairsForRound = (round) => Math.min(MAX_PAIRS, 4 + round * 2);   // round 1 → 6 pairs
const colsFor = (pairs) => (pairs <= 6 ? 4 : pairs <= 8 ? 4 : pairs <= 10 ? 5 : 6);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const STYLE = '.memory-card{perspective:600px;background:transparent;border:0;padding:0;width:48px;height:48px;cursor:pointer}'
  + '.memory-inner{position:relative;display:block;width:100%;height:100%;transition:transform .34s;transform-style:preserve-3d}'
  + '.memory-card.flipped .memory-inner{transform:rotateY(180deg)}'
  + '.memory-card.matched{opacity:.5;pointer-events:none}'
  + '.memory-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;'
  + 'line-height:1;border-radius:8px;border:1px solid rgba(128,128,128,.4);backface-visibility:hidden}'
  + '.memory-back{background:rgba(128,128,128,.28)}'
  + '.memory-front{background:rgba(128,128,128,.12);transform:rotateY(180deg)}';

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<style>' + STYLE + '</style>'
    + '<div class="memory-wrap" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px;max-width:100%">'
    + '<div class="memory-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="memory-score">Score: 0</span><span class="memory-round">Round 1</span>'
    + '<span class="memory-moves">Moves: 0</span></div>'
    + '<div class="memory-grid" style="display:grid;gap:8px;justify-content:center"></div>'
    + '<div class="memory-over" hidden style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:4px">'
    + '<div class="memory-over-msg" style="font-size:16px;font-weight:700"></div>'
    + '<div><button class="memory-restart">Play again</button> <button class="memory-quit">Back</button></div></div>'
    + '</div>';

  const wrap = host.querySelector('.memory-wrap');
  const gridEl = host.querySelector('.memory-grid');
  const scoreEl = host.querySelector('.memory-score');
  const roundEl = host.querySelector('.memory-round');
  const movesEl = host.querySelector('.memory-moves');
  const overEl = host.querySelector('.memory-over');

  let deck, round, score, moves, matched, first, busy, flipTimer;

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    roundEl.textContent = 'Round ' + round;
    movesEl.textContent = 'Moves: ' + moves;
  }

  const cardEl = (i) => gridEl.querySelector('.memory-card[data-idx="' + i + '"]');
  function paint(i) {
    const el = cardEl(i); if (!el) return;
    const c = deck[i];
    el.classList.toggle('flipped', c.flipped || c.matched);
    el.classList.toggle('matched', c.matched);
  }

  function buildRound() {
    const pairs = pairsForRound(round);
    const chosen = shuffle(ICONS.slice()).slice(0, pairs);
    deck = shuffle(chosen.concat(chosen).map((emoji) => ({ emoji, flipped: false, matched: false })));
    matched = 0; first = -1; busy = false;
    gridEl.style.gridTemplateColumns = 'repeat(' + colsFor(pairs) + ', minmax(0, 1fr))';
    gridEl.innerHTML = deck.map((c, i) =>
      '<button class="memory-card" data-idx="' + i + '"><span class="memory-inner">'
      + '<span class="memory-face memory-back"></span>'
      + '<span class="memory-face memory-front">' + c.emoji + '</span></span></button>').join('');
  }

  function flip(idx) {
    if (busy) return;
    const card = deck[idx];
    if (!card || card.flipped || card.matched) return;
    card.flipped = true; paint(idx);
    if (first === -1) { first = idx; return; }

    moves++; syncHud();
    if (deck[first].emoji === card.emoji) {
      deck[first].matched = card.matched = true;
      matched++; const a = first; first = -1;
      score += 10 * round;                                 // RAMP: match value × round
      syncHud(); onScore?.(score);
      paint(a); paint(idx);
      if (matched === deck.length / 2) roundComplete();
    } else {
      busy = true;
      const a = first, b = idx; first = -1;
      flipTimer = setTimeout(() => {
        deck[a].flipped = deck[b].flipped = false;
        paint(a); paint(b); busy = false;
      }, FLIP_BACK_MS);
    }
  }

  function roundComplete() {
    const pairs = deck.length / 2;
    const efficiency = Math.max(0, pairs * 2 - moves);     // 0 if sloppy; up to ~pairs if near-perfect
    score += (50 + efficiency * 5) * round;                // RAMP: round-clear bonus scales with round
    syncHud(); onScore?.(score);
    round++; moves = 0;
    setTimeout(() => { if (gridEl.isConnected) { buildRound(); syncHud(); } }, 480);
  }

  function reset() {
    round = 1; score = 0; moves = 0;
    overEl.hidden = true;
    clearTimeout(flipTimer);
    buildRound(); syncHud();
  }

  function onClick(e) {
    const btn = e.target.closest('.memory-card');
    if (!btn) return;
    flip(Number(btn.dataset.idx));
  }

  gridEl.addEventListener('click', onClick);
  host.querySelector('.memory-restart').addEventListener('click', reset);
  host.querySelector('.memory-quit').addEventListener('click', () => onExit?.());

  wrap.__memory = {
    state: () => ({ score, round, moves, matched, cards: deck.length }),
    deck: () => deck.map((c) => c.emoji),
  };

  reset();

  return {
    destroy() {
      clearTimeout(flipTimer);
      gridEl.removeEventListener('click', onClick);
      host.innerHTML = '';
    },
  };
}
