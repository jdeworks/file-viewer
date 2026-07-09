// Missing-aware merge UI for the side-by-side overlay. Renders two key=value files (env/ini) as a
// per-key comparison grouped by [section], with per-row transfer controls, "transfer whole section"
// and "transfer all missing" bulk actions, and a Download of the combined result.
//
// SECURITY: real values live ONLY in the `model` closure (from kv-merge.js). Every value shown on
// screen is routed through maskedValue() so secrets render as ••••••; the live summary shows COUNTS,
// never value text. Real values leave only via serializeMerge()→downloadBlob (a file, not the DOM).
import { maskedValue } from './known-ui.js';
import { downloadBlob } from './exports.js';
import { buildMergeModel, serializeMerge, summarize, chooseAll, rowValue } from './kv-merge.js';

const STATUS = {
  equal:        { label: 'in both',      cls: 'kv-eq' },
  conflict:     { label: 'differs',      cls: 'kv-conflict' },
  'only-left':  { label: 'left only',    cls: 'kv-left' },
  'only-right': { label: 'missing here', cls: 'kv-right' },
};
const GROUP_STATUS = {
  both:         { label: 'both',       cls: 'kv-eq' },
  'only-left':  { label: 'left only',  cls: 'kv-left' },
  'only-right': { label: 'right only', cls: 'kv-right' },
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function mergedName(leftName, typeId) {
  const name = String(leftName || (typeId === 'ini' ? 'config.ini' : '.env'));
  const dot = name.lastIndexOf('.');
  if (dot > 0) return name.slice(0, dot) + '.merged' + name.slice(dot);
  return name + '.merged';
}

// A single value cell — masked display only.
function valueCell(side, key) {
  if (!side.present) return el('span', 'kv-val kv-absent', '—');
  if (side.empty) return el('span', 'kv-val kv-empty', '(empty)');
  const m = maskedValue(key, side.value);
  const cell = el('span', 'kv-val' + (m.masked ? ' masked' : ''), m.masked ? '••••••' : m.text);
  if (m.masked) cell.title = m.reason;
  return cell;
}

export function mountMerge(host, leftIntake, rightIntake, typeId) {
  host.innerHTML = '';
  const root = el('div', 'kv-merge-root');
  const model = buildMergeModel(leftIntake.text || '', rightIntake.text || '', typeId);

  // ── Header: title, legend, bulk actions, download, summary ──
  const head = el('div', 'kv-merge-head');
  const left = el('div', 'kv-merge-head-l');
  left.append(el('span', 'kv-merge-title', 'Merge'));
  const legend = el('div', 'kv-legend');
  for (const s of ['only-right', 'conflict', 'only-left', 'equal']) {
    const chip = el('span', 'kv-pill ' + STATUS[s].cls, STATUS[s].label);
    legend.append(chip);
  }
  left.append(legend);
  head.append(left);

  const actions = el('div', 'kv-merge-actions');
  const transferAllBtn = el('button', 'kv-btn', 'Transfer all missing');
  transferAllBtn.type = 'button';
  const dlBtn = el('button', 'kv-btn kv-btn-primary', 'Download combined');
  dlBtn.type = 'button';
  actions.append(transferAllBtn, dlBtn);
  head.append(actions);
  root.append(head);

  const summary = el('div', 'kv-merge-summary');
  root.append(summary);

  const bodyWrap = el('div', 'kv-merge-body');
  root.append(bodyWrap);
  host.append(root);

  function updateSummary() {
    const s = summarize(model);
    const bits = [`${s.keys} keys`, `${s.missingIncluded}/${s.missing} missing transferred`];
    if (s.conflicts) bits.push(`${s.conflicts} differ (defaulting to right)`);
    if (typeId === 'ini') bits.push(`${s.groups} sections`);
    summary.textContent = bits.join(' · ');
    transferAllBtn.disabled = s.missing === 0 || s.missingIncluded === s.missing;
  }

  function render() {
    bodyWrap.innerHTML = '';
    for (const g of model.groups) {
      const groupEl = el('div', 'kv-group');
      if (typeId === 'ini') {
        const gh = el('div', 'kv-group-head');
        gh.append(el('span', 'kv-group-name', g.section ? `[${g.section}]` : '(root)'));
        gh.append(el('span', 'kv-pill ' + GROUP_STATUS[g.status].cls, GROUP_STATUS[g.status].label));
        const missingInGroup = g.rows.filter((r) => r.status === 'only-right');
        if (missingInGroup.length) {
          const allIn = missingInGroup.every((r) => r.include);
          const sbtn = el('button', 'kv-btn kv-btn-sm', g.status === 'only-right' ? 'Transfer whole section' : 'Transfer section’s missing');
          sbtn.type = 'button';
          sbtn.disabled = allIn;
          sbtn.addEventListener('click', () => {
            chooseAll(model, (r) => r.section === g.section && r.status === 'only-right', true);
            render(); updateSummary();
          });
          gh.append(sbtn);
        }
        groupEl.append(gh);
      }

      const table = el('div', 'kv-rows');
      for (const r of g.rows) {
        const row = el('div', 'kv-row kv-row-' + r.status + (r.include ? ' kv-in' : ''));
        row.append(el('span', 'kv-key', r.key));
        if (r.duplicate) row.querySelector('.kv-key').append(el('span', 'kv-dup', ' (dup)'));
        row.append(valueCell(r.left, r.key));
        row.append(valueCell(r.right, r.key));
        row.append(el('span', 'kv-pill ' + STATUS[r.status].cls, STATUS[r.status].label));
        row.append(buildControls(r, render, updateSummary));
        table.append(row);
      }
      groupEl.append(table);
      bodyWrap.append(groupEl);
    }
  }

  transferAllBtn.addEventListener('click', () => {
    chooseAll(model, (r) => r.status === 'only-right', true);
    render(); updateSummary();
  });
  dlBtn.addEventListener('click', () => {
    downloadBlob(serializeMerge(model, typeId), mergedName(leftIntake.filename, typeId), 'text/plain');
  });

  render();
  updateSummary();

  // Test seam (no values, only the engine handles): lets the smoke suite drive + read the result.
  const api = {
    model,
    serialize: () => serializeMerge(model, typeId),
    transferAllMissing: () => { chooseAll(model, (r) => r.status === 'only-right', true); render(); updateSummary(); },
  };
  root.__kv = api;
  return { el: root, api, destroy() { host.innerHTML = ''; } };
}

// Per-row controls: conflicts get a left/right chooser; only-right rows get a Transfer toggle.
function buildControls(r, render, updateSummary) {
  const wrap = el('div', 'kv-ctl');
  if (r.status === 'conflict') {
    const seg = el('div', 'kv-seg');
    for (const [side, label] of [['left', '◀ left'], ['right', 'right ▶']]) {
      const b = el('button', 'kv-seg-btn' + (r.choice === side ? ' active' : ''), label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(r.choice === side));
      b.addEventListener('click', () => { r.choice = side; render(); updateSummary(); });
      seg.append(b);
    }
    wrap.append(seg);
  } else if (r.status === 'only-right') {
    const b = el('button', 'kv-btn kv-btn-sm' + (r.include ? ' kv-btn-on' : ''), r.include ? '✓ added' : 'Transfer →');
    b.type = 'button';
    b.addEventListener('click', () => { r.include = !r.include; render(); updateSummary(); });
    wrap.append(b);
  } else {
    wrap.append(el('span', 'kv-kept', r.status === 'only-left' ? 'kept' : ''));
  }
  return wrap;
}
