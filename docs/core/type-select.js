import { REGISTRY, FALLBACK_TYPE } from './registry-runtime.generated.js';
import { $ } from './state.js';

// selectedId may be 'known:X' (known-file override) or a base type id.
export function populateTypeSelect(ranking, selectedId, showAll, intake = null, knownCandidates = []) {
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

  if (knownCandidates.length > 0) {
    // Known-file enhanced views as first optgroup (selectable via type picker)
    const grp = document.createElement('optgroup');
    grp.label = '✦ Enhanced views';
    for (const { known } of knownCandidates) {
      const opt = document.createElement('option');
      opt.value = 'known:' + known.id;
      opt.textContent = '✦ ' + known.label;
      grp.appendChild(opt);
    }
    sel.appendChild(grp);
    // Base types in a second group
    const baseGrp = document.createElement('optgroup');
    baseGrp.label = 'Base type';
    for (const r of rows) {
      const opt = document.createElement('option');
      opt.value = r.t.id;
      const label = typeof r.t.displayLabel === 'function' && intake ? r.t.displayLabel(intake) : r.t.label;
      opt.textContent = r.pct != null ? `${label} (${r.pct}%)` : label;
      baseGrp.appendChild(opt);
    }
    sel.appendChild(baseGrp);
  } else {
    for (const r of rows) {
      const opt = document.createElement('option');
      opt.value = r.t.id;
      const label = typeof r.t.displayLabel === 'function' && intake ? r.t.displayLabel(intake) : r.t.label;
      opt.textContent = r.pct != null ? `${label} (${r.pct}%)` : label;
      sel.appendChild(opt);
    }
  }

  // Force the correct value after building — avoids browser auto-selecting the first option
  // when optgroups are used. Works across both the grouped and flat layouts.
  sel.value = selectedId;
  // If selectedId wasn't found (e.g. a stale type ID), fall back to the first option
  if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
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
