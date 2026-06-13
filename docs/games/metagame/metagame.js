// The meta-game incremental core (build phase P2): a light "spine" resource game themed on the
// app itself — you generate BITS by computing, then buy automation that compiles them for you.
// It's deliberately small per bracket (pacing/connective tissue, not a full clicker); later phases
// add the boss set-pieces that are beaten with the file-viewer's real features. High scores from
// the other arcade games (e.g. Snake) can be imported as a one-time bit bonus — the economy link.
// Contract: mount(host, { onScore, onExit }) => { destroy() }. State persists in localStorage.
const SAVE_KEY = 'fv:games:metagame';

// Automation upgrades — IT-themed escalation. cost grows 1.15× per owned; rate is bits/second.
const UPGRADES = [
  { id: 'cron', name: 'Cron job', base: 15, rate: 0.2, blurb: 'runs a tiny task on a schedule' },
  { id: 'thread', name: 'Worker thread', base: 110, rate: 1, blurb: 'computes in the background' },
  { id: 'container', name: 'Container', base: 1300, rate: 8, blurb: 'a packaged, reproducible worker' },
  { id: 'rack', name: 'Server rack', base: 14000, rate: 47, blurb: 'a wall of compute' },
  { id: 'datacenter', name: 'Data center', base: 200000, rate: 260, blurb: 'industrial-scale bits' },
];

function fmt(n) {
  if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace(/\.0$/, '');
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  let u = -1, v = n;
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return v.toFixed(2) + units[u];
}

function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}
function snakeHigh() {
  try { return Number(localStorage.getItem('fv:games:hi:snake') || 0); } catch { return 0; }
}

export function mount(host, { onExit } = {}) {
  const s = load();
  const state = {
    bits: s.bits || 0,
    clickPower: s.clickPower || 1,
    owned: Object.assign({}, ...UPGRADES.map((u) => ({ [u.id]: 0 })), s.owned || {}),
    snakeClaimed: !!s.snakeClaimed,
  };

  host.innerHTML =
    '<div class="mg-wrap">'
    + '<div class="mg-head"><div class="mg-bits"></div><div class="mg-rate"></div></div>'
    + '<button class="mg-compute" type="button">⚙ Compute<span class="mg-click"></span></button>'
    + '<div class="mg-snake" hidden></div>'
    + '<div class="mg-shop"></div>'
    + '<button class="mg-back" type="button">‹ Back to arcade</button>'
    + '</div>';

  const bitsEl = host.querySelector('.mg-bits');
  const rateEl = host.querySelector('.mg-rate');
  const clickEl = host.querySelector('.mg-click');
  const shopEl = host.querySelector('.mg-shop');
  const snakeEl = host.querySelector('.mg-snake');

  const cost = (u) => Math.ceil(u.base * Math.pow(1.15, state.owned[u.id]));
  const totalRate = () => UPGRADES.reduce((sum, u) => sum + u.rate * state.owned[u.id], 0);

  function buildShop() {
    shopEl.innerHTML = UPGRADES.map((u) =>
      '<button class="mg-buy" data-id="' + u.id + '">'
      + '<span class="mg-buy-name">' + u.name + ' <span class="mg-owned">×' + state.owned[u.id] + '</span></span>'
      + '<span class="mg-buy-blurb">' + u.blurb + ' · +' + u.rate + '/s</span>'
      + '<span class="mg-buy-cost"></span></button>').join('');
    shopEl.querySelectorAll('.mg-buy').forEach((b) => b.addEventListener('click', () => buy(b.dataset.id)));
  }

  function buy(id) {
    const u = UPGRADES.find((x) => x.id === id);
    const c = cost(u);
    if (state.bits < c) return;
    state.bits -= c;
    state.owned[id]++;
    save(state);
    buildShop();
    render();
  }

  function render() {
    bitsEl.textContent = fmt(state.bits) + ' bits';
    rateEl.textContent = fmt(totalRate()) + '/s';
    clickEl.textContent = ' +' + fmt(state.clickPower);
    for (const b of shopEl.querySelectorAll('.mg-buy')) {
      const u = UPGRADES.find((x) => x.id === b.dataset.id);
      const c = cost(u);
      b.querySelector('.mg-buy-cost').textContent = fmt(c);
      b.querySelector('.mg-owned').textContent = '×' + state.owned[u.id];
      b.classList.toggle('mg-afford', state.bits >= c);
    }
    // Snake bonus: claim once, scaled by the Snake high score.
    const hi = snakeHigh();
    if (hi > 0 && !state.snakeClaimed) {
      snakeEl.hidden = false;
      snakeEl.innerHTML = '<button class="mg-claim" type="button">Import Snake high score (' + hi + ') → +' + fmt(hi * 25) + ' bits</button>';
      snakeEl.querySelector('.mg-claim').onclick = () => { state.bits += hi * 25; state.snakeClaimed = true; save(state); snakeEl.hidden = true; render(); };
    } else snakeEl.hidden = true;
  }

  host.querySelector('.mg-compute').addEventListener('click', () => { state.bits += state.clickPower; render(); });
  host.querySelector('.mg-back').addEventListener('click', () => onExit?.());

  buildShop();
  render();

  // Tick: accrue automation bits 10×/s; save once a second.
  let acc = 0;
  const timer = setInterval(() => {
    state.bits += totalRate() / 10;
    render();
    if (++acc >= 10) { acc = 0; save(state); }
  }, 100);

  return {
    destroy() { clearInterval(timer); save(state); host.innerHTML = ''; },
    // test seam
    _state: state,
  };
}
