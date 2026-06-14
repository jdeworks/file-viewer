// The meta-game orchestrator. A staged incremental: per stage you GRIND bits (click + automation)
// toward a goal, then face a unique BOSS that cheats and is beaten only with one of the app's real
// features. Phases: intro → grind → boss → victory → (next stage). Stage/boss content lives in
// stages.js; the dialog/hint box in dialog.js. Contract: mount(host, { onExit }) => { destroy() }.
import { playDialog } from './dialog.js';
import { STAGES, stageByNumber } from './stages.js';

const SAVE_KEY = 'fv:games:metagame';

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
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } };
const save = (st) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch { /* private mode */ } };
const snakeHigh = () => { try { return Number(localStorage.getItem('fv:games:hi:snake') || 0); } catch { return 0; } };

export function mount(host, { onExit } = {}) {
  const s = load();
  const state = {
    bits: s.bits || 0,
    clickPower: s.clickPower || 1,
    owned: Object.assign({}, ...UPGRADES.map((u) => ({ [u.id]: 0 })), s.owned || {}),
    snakeClaimed: !!s.snakeClaimed,
    stage: s.stage || 1,
    defeated: Array.isArray(s.defeated) ? s.defeated : [],
    introSeen: !!s.introSeen,
  };
  let timer = null, bossCtl = null, dlgCtl = null;

  const stage = () => stageByNumber(Math.min(state.stage, STAGES.length));
  const stageBeaten = () => state.defeated.includes(stage()?.n);
  const cost = (u) => Math.ceil(u.base * Math.pow(1.15, state.owned[u.id]));
  const totalRate = () => UPGRADES.reduce((sum, u) => sum + u.rate * state.owned[u.id], 0);

  function clearTransient() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bossCtl) { bossCtl.destroy && bossCtl.destroy(); bossCtl = null; }
    if (dlgCtl) { dlgCtl.destroy && dlgCtl.destroy(); dlgCtl = null; }
  }

  /* ── Phase: intro ── */
  function startIntro() {
    clearTransient();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"></div>';
    const st = stage();
    dlgCtl = playDialog(host.querySelector('.mg-stage-host'), st.intro, {
      cta: 'Begin', onDone: () => { state.introSeen = true; save(state); renderGrind(); },
    });
  }

  /* ── Phase: grind (Bit Foundry) ── */
  function renderGrind() {
    clearTransient();
    const st = stage();
    host.innerHTML =
      '<div class="mg-wrap">'
      + '<div class="mg-stage-banner">Stage ' + st.n + ' · <strong>' + st.title + '</strong></div>'
      + '<div class="mg-head"><div class="mg-bits"></div><div class="mg-rate"></div></div>'
      + '<div class="mg-progress"><div class="mg-progress-bar"></div></div>'
      + '<button class="mg-compute" type="button">⚙ Compute<span class="mg-click"></span></button>'
      + '<button class="mg-faceboss" type="button" hidden>⚔ Confront ' + st.bossName + '</button>'
      + '<div class="mg-snake" hidden></div>'
      + '<div class="mg-shop"></div>'
      + '<button class="mg-back" type="button">‹ Back to arcade</button>'
      + '</div>';
    const $ = (s2) => host.querySelector(s2);
    const shopEl = $('.mg-shop');
    shopEl.innerHTML = UPGRADES.map((u) =>
      '<button class="mg-buy" data-id="' + u.id + '"><span class="mg-buy-name">' + u.name
      + ' <span class="mg-owned">×' + state.owned[u.id] + '</span></span>'
      + '<span class="mg-buy-blurb">' + u.blurb + ' · +' + u.rate + '/s</span>'
      + '<span class="mg-buy-cost"></span></button>').join('');
    shopEl.querySelectorAll('.mg-buy').forEach((b) => b.addEventListener('click', () => {
      const u = UPGRADES.find((x) => x.id === b.dataset.id); const c = cost(u);
      if (state.bits < c) return; state.bits -= c; state.owned[u.id]++; save(state); paint();
    }));
    $('.mg-compute').addEventListener('click', () => { state.bits += state.clickPower; paint(); });
    $('.mg-faceboss').addEventListener('click', () => startBoss());
    $('.mg-back').addEventListener('click', () => onExit && onExit());

    function paint() {
      $('.mg-bits').textContent = fmt(state.bits) + ' bits';
      $('.mg-rate').textContent = fmt(totalRate()) + '/s';
      $('.mg-click').textContent = ' +' + fmt(state.clickPower);
      const goal = st.goal, beaten = stageBeaten();
      $('.mg-progress-bar').style.width = Math.min(100, (state.bits / goal) * 100) + '%';
      $('.mg-faceboss').hidden = beaten || state.bits < goal;
      for (const b of shopEl.querySelectorAll('.mg-buy')) {
        const u = UPGRADES.find((x) => x.id === b.dataset.id); const c = cost(u);
        b.querySelector('.mg-buy-cost').textContent = fmt(c);
        b.querySelector('.mg-owned').textContent = '×' + state.owned[u.id];
        b.classList.toggle('mg-afford', state.bits >= c);
      }
      const hi = snakeHigh(), snakeEl = $('.mg-snake');
      if (hi > 0 && !state.snakeClaimed) {
        snakeEl.hidden = false;
        snakeEl.innerHTML = '<button class="mg-claim" type="button">Import Snake high score (' + hi + ') → +' + fmt(hi * 25) + ' bits</button>';
        snakeEl.querySelector('.mg-claim').onclick = () => { state.bits += hi * 25; state.snakeClaimed = true; save(state); paint(); };
      } else snakeEl.hidden = true;
    }
    paint();
    let acc = 0;
    timer = setInterval(() => { state.bits += totalRate() / 10; paint(); if (++acc >= 10) { acc = 0; save(state); } }, 100);
  }

  /* ── Phase: boss ── */
  function startBoss() {
    clearTransient();
    const st = stage();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"><div class="mg-arena"></div>'
      + '<div class="mg-boss-bar"><button class="mg-hint-btn" type="button">💡 Hint</button>'
      + '<button class="mg-flee" type="button">Retreat</button></div></div>';
    const stageHost = host.querySelector('.mg-stage-host');
    const arena = host.querySelector('.mg-arena');
    host.querySelector('.mg-flee').addEventListener('click', () => renderGrind());
    let hintIdx = 0;
    host.querySelector('.mg-hint-btn').addEventListener('click', () => {
      const line = st.hints[Math.min(hintIdx, st.hints.length - 1)];
      hintIdx++;
      if (dlgCtl) dlgCtl.destroy();
      dlgCtl = playDialog(stageHost, [line], { cta: 'Got it', onDone: () => { dlgCtl = null; } });
    });
    // Boss taunt, then the arena goes live.
    dlgCtl = playDialog(stageHost, st.bossIntro, {
      cta: 'Fight', onDone: () => { dlgCtl = null; bossCtl = st.mountBoss(arena, { stage: st, onDefeat: onBossDefeat }); },
    });
  }
  function onBossDefeat() {
    const st = stage();
    if (!state.defeated.includes(st.n)) state.defeated.push(st.n);
    state.bits += st.goal * 5;                 // spoils
    save(state);
    clearTransient();
    host.innerHTML = '<div class="mg-wrap mg-stage-host"></div>';
    dlgCtl = playDialog(host.querySelector('.mg-stage-host'), st.victory, {
      cta: 'Continue', onDone: () => { if (state.stage < STAGES.length) state.stage++; save(state); renderGrind(); },
    });
  }

  if (!state.introSeen) startIntro(); else renderGrind();

  return {
    destroy() { clearTransient(); save(state); host.innerHTML = ''; },
    _state: state,
    _debug: { startBoss, renderGrind },   // test seam
  };
}
