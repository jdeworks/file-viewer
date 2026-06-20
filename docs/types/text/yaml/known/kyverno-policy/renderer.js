import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kyv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.kyv-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2E6CF7;color:#fff;vertical-align:middle;margin-right:8px}
.kyv-title{font-size:18px;font-weight:700;margin:0 0 4px}
.kyv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.kyv-sec{margin:14px 0}
.kyv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.kyv-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.kyv-card-name{font:700 13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);margin-bottom:4px}
.kyv-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.kyv-kv-k{color:var(--fg-2,#888);min-width:80px;flex-shrink:0}
.kyv-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.kyv-chip{display:inline-block;font-size:11px;padding:2px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0}
.kyv-action{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px}
.kyv-action.enforce{background:#fde8e8;border:1px solid #fca5a5;color:#b91c1c}
.kyv-action.audit{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
.kyv-type-chip{display:inline-block;font-size:11px;padding:2px 7px;border-radius:8px;margin-right:4px;font-weight:600}
.kyv-type-chip.validate{background:#eaf4ff;border:1px solid #a5c8f7;color:#1a5c99}
.kyv-type-chip.mutate{background:#fff8e1;border:1px solid #ffe082;color:#b45309}
.kyv-type-chip.generate{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
.kyv-type-chip.verifyImages{background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8}
`;

function getRuleTypes(rule) {
  const types = [];
  if (rule.validate) types.push('validate');
  if (rule.mutate) types.push('mutate');
  if (rule.generate) types.push('generate');
  if (rule.verifyImages) types.push('verifyImages');
  return types;
}

function getMatchKinds(rule) {
  const kinds = [];
  const matchAny = rule.match?.any || rule.match?.all || [];
  const matchArr = Array.isArray(matchAny) ? matchAny : [matchAny];
  for (const m of matchArr) {
    const ks = m?.resources?.kinds || [];
    for (const k of (Array.isArray(ks) ? ks : [])) {
      if (!kinds.includes(k)) kinds.push(k);
    }
  }
  return kinds;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let cfg = {};
  try {
    cfg = (jsYaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const kind = String(cfg.kind || 'Policy');
  const name = cfg.metadata?.name || '(unnamed)';
  const namespace = cfg.metadata?.namespace || null;
  const spec = cfg.spec || {};
  const validationFailureAction = String(spec.validationFailureAction || '');
  const background = spec.background !== undefined ? spec.background : null;
  const rules = Array.isArray(spec.rules) ? spec.rules : [];

  const actionClass = validationFailureAction === 'enforce' ? 'enforce' : validationFailureAction === 'audit' ? 'audit' : '';
  const actionHtml = validationFailureAction
    ? `<span class="kyv-action ${actionClass}">${esc(validationFailureAction)}</span>`
    : '';

  const bgChip = background !== null
    ? `<span class="kyv-chip">background: ${background ? 'enabled' : 'disabled'}</span>`
    : '';

  const subParts = [kind, namespace ? `namespace: ${namespace}` : 'cluster-scoped'];

  const rulesHtml = rules.map((r) => {
    const rname = String(r.name || '(unnamed)');
    const types = getRuleTypes(r);
    const matchKinds = getMatchKinds(r);
    const typeChips = types.map((t) => `<span class="kyv-type-chip ${t}">${esc(t)}</span>`).join('');
    const kindChips = matchKinds.map((k) => `<span class="kyv-chip">${esc(k)}</span>`).join('');
    return `<div class="kyv-card">
<div class="kyv-card-name">${esc(rname)}</div>
${types.length > 0 ? `<div style="margin:4px 0">${typeChips}</div>` : ''}
${matchKinds.length > 0 ? `<div class="kyv-kv"><span class="kyv-kv-k">match</span><span class="kyv-kv-v">${kindChips}</span></div>` : ''}
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'kyv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="kyv-badge">Kyverno</span>
  <span class="kyv-title">${esc(kind)}: ${esc(name)}</span>
  ${actionHtml}
</div>
<div class="kyv-sub">${esc(subParts.join(' · '))}${bgChip ? ' · ' + bgChip : ''}</div>
${rules.length > 0 ? `<div class="kyv-sec"><h3>${rules.length} Rule${rules.length !== 1 ? 's' : ''}</h3>${rulesHtml}</div>` : ''}`;

  return { parentNode: host };
}
