import { REGISTRY, FALLBACK_TYPE } from './registry-runtime.generated.js';
import { $ } from './state.js';

export function populateTypeSelect(ranking, selectedId, showAll) {
  const sel = $('typeSelect');
  const byScore = new Map(ranking.map((r) => [r.type.id, r.score]));
  const rows = [];
  for (const t of REGISTRY) {
    const match = t === FALLBACK_TYPE ? 0 : (byScore.get(t.id) || 0);
    if (!showAll && match < 0.01 && t.id !== selectedId) continue;
    rows.push({ t, match });
  }
  const matched = rows.filter((r) => r.match > 0);
  const pcts = normalizePercents(matched.map((r) => r.match));
  matched.forEach((r, i) => (r.pct = pcts[i]));

  sel.innerHTML = '';
  for (const r of rows) {
    const opt = document.createElement('option');
    opt.value = r.t.id;
    opt.textContent = r.pct != null ? `${r.t.label} (${r.pct}%)` : r.t.label;
    if (r.t.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

function normalizePercents(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!values.length || sum <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * 100);
  const out = raw.map((x) => Math.floor(x));
  let rem = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < order.length && rem > 0; k++, rem--) out[order[k][1]]++;
  return out;
}
