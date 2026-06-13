// Move-aware diff renderer (WP16). Renders computeMoveDiff() output on a CUSTOM two-column
// surface (NOT Monaco's diff editor, which can't draw cross-pane move arrows). Desktop:
// original | current columns with SVG arrows linking moved blocks. Mobile: stacked columns
// with move badges. Includes the >=80%-similarity disclaimer.
import { computeMoveDiff, wordDiff } from './movediff.js';

const KIND_LABEL = { unchanged: 'unchanged', modified: 'modified', moved: 'moved', 'moved-modified': 'moved + edited', added: 'added', removed: 'removed' };
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

// Render wordDiff token runs, wrapping ONLY the changed spans (cls = w-del | w-ins).
function runsHtml(runs, cls) {
  return runs.map((r) => (r.changed ? `<span class="${cls}">${esc(r.text)}</span>` : esc(r.text))).join('');
}

// inner: pre-rendered HTML for the block body (word-diff spans); defaults to escaped text.
function blockHtml(block, kind, attrs = '', inner = null) {
  return `<div class="md-block k-${kind}" ${attrs}><pre>${inner ?? esc(block.lines.join('\n'))}</pre></div>`;
}

export function renderMoveDiff(host, originalText, currentText, { threshold = 0.8 } = {}) {
  const model = computeMoveDiff(originalText, currentText, { threshold });

  // Index pairs by their block position for column rendering.
  const pairByA = new Map(), pairByB = new Map();
  for (const p of model.pairs) { pairByA.set(p.aIndex, p); pairByB.set(p.bIndex, p); }
  const removed = new Set(model.removed), added = new Set(model.added);

  const s = model.stats;
  const summary = [`${s.moved} moved`, `${s['moved-modified']} moved+edited`, `${s.modified} modified`, `${s.added} added`, `${s.removed} removed`]
    .join(' · ');

  // Word-diff cache per pair: a modified/moved-modified block highlights only its changed
  // words (computed once on the displayed text of both sides), not the whole paragraph.
  const wdByPair = new Map();
  const wdFor = (p) => {
    if (!p || p.kind === 'unchanged' || p.kind === 'moved') return null;
    if (!wdByPair.has(p)) {
      wdByPair.set(p, wordDiff(model.blocksA[p.aIndex].lines.join('\n'), model.blocksB[p.bIndex].lines.join('\n')));
    }
    return wdByPair.get(p);
  };

  // Left column = original blocks in order; right = current blocks in order.
  const left = model.blocksA.map((b, i) => {
    const p = pairByA.get(i);
    const kind = removed.has(i) ? 'removed' : (p ? p.kind : 'unchanged');
    const mid = p && p.moveId !== null ? `data-moveid="${p.moveId}" data-side="a"` : '';
    const wd = wdFor(p);
    return blockHtml(b, kind, mid, wd ? runsHtml(wd.a, 'w-del') : null);
  }).join('');
  const right = model.blocksB.map((b, j) => {
    const p = pairByB.get(j);
    const kind = added.has(j) ? 'added' : (p ? p.kind : 'unchanged');
    const badge = p && p.moveId !== null
      ? `<span class="md-badge">${p.kind === 'moved-modified' ? 'moved+edited' : 'moved'} ↕ #${p.moveId + 1}</span>` : '';
    const mid = p && p.moveId !== null ? `data-moveid="${p.moveId}" data-side="b"` : '';
    const wd = wdFor(p);
    return blockHtml(b, kind, mid, wd ? runsHtml(wd.b, 'w-ins') : null).replace('</div>', `${badge}</div>`);
  }).join('');

  host.innerHTML = `
    <div class="movediff ${isNarrow() ? 'narrow' : ''}">
      <div class="md-head">
        <strong>Move-aware diff</strong> — ${summary}
        <span class="md-note">Blocks ≥${Math.round(threshold * 100)}% similar are treated as the same block moved (and edited), not delete+add.</span>
      </div>
      <div class="md-cols">
        <div class="md-col md-original"><div class="md-coltitle">Original</div>${left}</div>
        <div class="md-col md-current"><div class="md-coltitle">Current</div>${right}</div>
        <svg class="md-arrows" aria-hidden="true"></svg>
      </div>
    </div>`;

  if (!isNarrow()) requestAnimationFrame(() => drawArrows(host));
}

function drawArrows(host) {
  const cols = host.querySelector('.md-cols');
  const svg = host.querySelector('.md-arrows');
  if (!cols || !svg) return;
  const w = cols.scrollWidth, h = cols.scrollHeight;
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const base = cols.getBoundingClientRect();
  let paths = '';
  host.querySelectorAll('.md-original [data-moveid]').forEach((aEl) => {
    const id = aEl.getAttribute('data-moveid');
    const bEl = host.querySelector(`.md-current [data-moveid="${id}"]`);
    if (!bEl) return;
    const a = aEl.getBoundingClientRect(), b = bEl.getBoundingClientRect();
    const x1 = a.right - base.left, y1 = a.top + a.height / 2 - base.top;
    const x2 = b.left - base.left, y2 = b.top + b.height / 2 - base.top;
    const mx = (x1 + x2) / 2;
    const cls = bEl.classList.contains('k-moved-modified') ? 'arr-mod' : 'arr-move';
    paths += `<path class="${cls}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" marker-end="url(#md-ah)"/>`;
  });
  svg.innerHTML = `<defs><marker id="md-ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
    <path d="M0,0 L7,3 L0,6 Z"/></marker></defs>${paths}`;
}
