// s1reveal.js — Stage 1 phase-1 pixel-reveal grid. Tapping fills a 100-square grid toward the next
// Multiplier price; when full the Compute button becomes interactive. Pulled out of stage1.js.

import { fromNumber } from './bignum.js';
import { totalCost } from './s1economy.js';
import { bigToNum } from './s1dom.js';
import { GRID_CELLS, GRID_ROWS } from './s1layout.js';

// createReveal({ host, grid, computeBtn, state, multTier }) → { reveal }
// Builds the column-major cell grid once, then reveal() repaints the fill on demand.
export function createReveal({ host, grid, computeBtn, state, multTier }) {
  const cells = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const c = Math.floor(i / GRID_ROWS), r = i % GRID_ROWS;
    const cell = document.createElement('div');
    cell.className = 'mg-s1-cell';
    cell.style.gridColumn = (c + 1);
    cell.style.gridRow = (r + 1);
    cell.dataset.i = String(i);
    grid.appendChild(cell);
    cells.push(cell);
  }

  function reveal() {
    if (state.tabsUnlocked) return;   // phase 2: no pixel reveal
    const wrapper = host.querySelector('.mg-wrap.mg-s1');
    if (wrapper) wrapper.classList.toggle('mg-s1-empty', bigToNum(state.bits) <= 0 && bigToNum(state.totalBits) <= 0);
    const bits = bigToNum(state.bits);
    const owned = state.owned['s1-mult'] || 0;
    const cost = multTier ? totalCost(multTier, owned, 1) : fromNumber(GRID_CELLS);
    const target = Math.max(1, bigToNum(cost));
    const progress = Math.max(0, Math.min(1, bits / target));
    const n = bits <= 0 ? 0 : Math.min(GRID_CELLS, Math.max(1, Math.floor(GRID_CELLS * progress)));
    for (let i = 0; i < GRID_CELLS; i++) cells[i].classList.toggle('mg-s1-on', i < n);
    const done = progress >= 1;
    computeBtn.style.opacity = done ? '' : String(progress);
    computeBtn.classList.toggle('mg-s1-ready', done);
    grid.classList.toggle('mg-s1-clear', done);
    // Tap stays active at all times — clicking outside the button still adds bits even when ready.
  }

  return { reveal };
}
