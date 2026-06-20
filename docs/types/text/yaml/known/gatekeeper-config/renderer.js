import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gkpr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gkpr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F57C00;color:#fff;vertical-align:middle;margin-right:8px}
.gkpr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gkpr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gkpr-sec{margin:14px 0}
.gkpr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.gkpr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.gkpr-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.gkpr-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0}
.gkpr-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.gkpr-chip{display:inline-block;font-size:11px;padding:2px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0}
.gkpr-action{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px}
.gkpr-action.deny{background:#fde8e8;border:1px solid #fca5a5;color:#b91c1c}
.gkpr-action.warn{background:#fff8e1;border:1px solid #ffe082;color:#b45309}
.gkpr-action.dryrun{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
.gkpr-code{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;margin:4px 0;max-height:220px;overflow:auto}
`;

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let cfg = {};
  try {
    cfg = (jsYaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const kind = String(cfg.kind || '');
  const name = cfg.metadata?.name || '(unnamed)';
  const apiVersion = String(cfg.apiVersion || '');
  const spec = cfg.spec || {};

  let bodyHtml = '';

  if (kind === 'ConstraintTemplate') {
    const targets = Array.isArray(spec.targets) ? spec.targets : (spec.targets ? [spec.targets] : []);
    const target = targets[0] || {};
    const targetName = String(target.target || 'admission.k8s.gatekeeper.sh');
    const rego = String(target.rego || '');
    const regoLines = rego.split('\n').slice(0, 15).join('\n');
    const truncated = rego.split('\n').length > 15;

    bodyHtml = `
<div class="gkpr-kv"><span class="gkpr-kv-k">target</span><span class="gkpr-kv-v">${esc(targetName)}</span></div>
${rego ? `<div class="gkpr-sec"><h3>Rego Source${truncated ? ' (first 15 lines)' : ''}</h3><pre class="gkpr-code">${esc(regoLines)}${truncated ? '\n…' : ''}</pre></div>` : ''}`;

  } else if (kind === 'Config') {
    const sync = spec.sync || {};
    const resources = Array.isArray(sync.syncOnly) ? sync.syncOnly : [];
    const resChips = resources.map((r) => {
      const g = r.group ? `${r.group}/` : '';
      return `<span class="gkpr-chip">${esc(g + r.version + '/' + r.kind)}</span>`;
    }).join('');
    bodyHtml = resources.length
      ? `<div class="gkpr-sec"><h3>Sync Resources</h3>${resChips}</div>`
      : '<div class="gkpr-sub">No sync resources defined.</div>';

  } else {
    // Treat as Constraint (has enforcementAction, match, parameters)
    const enforcementAction = String(spec.enforcementAction || 'deny');
    const actionClass = ['deny', 'warn', 'dryrun'].includes(enforcementAction) ? enforcementAction : '';
    const actionHtml = `<span class="gkpr-action ${actionClass}">${esc(enforcementAction)}</span>`;

    const match = spec.match || {};
    const matchKinds = Array.isArray(match.kinds) ? match.kinds : [];
    const kindsChips = matchKinds.flatMap((k) => {
      const ks = Array.isArray(k.kinds) ? k.kinds : [];
      return ks.map((kk) => `<span class="gkpr-chip">${esc(kk)}</span>`);
    }).join('');

    const excludedNs = Array.isArray(match.excludedNamespaces) ? match.excludedNamespaces : [];
    const excNsChips = excludedNs.map((n) => `<span class="gkpr-chip">${esc(n)}</span>`).join('');

    const params = spec.parameters;
    let paramsHtml = '';
    if (params && typeof params === 'object') {
      const entries = Object.entries(params);
      paramsHtml = `<div class="gkpr-sec"><h3>Parameters</h3>` +
        entries.map(([k, v]) => {
          const vStr = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
          const vTrunc = vStr.length > 120 ? vStr.slice(0, 120) + '…' : vStr;
          return `<div class="gkpr-kv"><span class="gkpr-kv-k">${esc(k)}</span><span class="gkpr-kv-v">${esc(vTrunc)}</span></div>`;
        }).join('') + `</div>`;
    }

    bodyHtml = `
<div style="margin-bottom:8px">${actionHtml}</div>
${kindsChips ? `<div class="gkpr-kv"><span class="gkpr-kv-k">match kinds</span><span class="gkpr-kv-v">${kindsChips}</span></div>` : ''}
${excNsChips ? `<div class="gkpr-kv"><span class="gkpr-kv-k">exclude ns</span><span class="gkpr-kv-v">${excNsChips}</span></div>` : ''}
${paramsHtml}`;
  }

  const host = document.createElement('div');
  host.className = 'gkpr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="gkpr-badge">Gatekeeper</span>
  <span class="gkpr-title">${esc(kind || 'Config')}: ${esc(name)}</span>
</div>
<div class="gkpr-sub">${esc(apiVersion)}</div>
${bodyHtml}`;

  return { parentNode: host };
}
