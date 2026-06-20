import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.smc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-smc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8711a;color:#fff;vertical-align:middle;margin-right:8px;}
.smc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.smc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.smc-sec{margin:14px 0;}
.smc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.smc-env-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.smc-env-tab{font-size:12px;padding:3px 12px;border-radius:12px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-weight:600;cursor:default;}
.smc-env-tab.env-default{background:#fff3e0;border-color:#ffcc80;color:#bf360c;}
.smc-env-tab.env-staging{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.smc-env-tab.env-prod{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.smc-table{width:100%;border-collapse:collapse;font-size:13px;}
.smc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.smc-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.smc-mono{font:12px ui-monospace,monospace;}
.smc-bool-yes{color:#166534;font-weight:600;}
.smc-bool-no{color:#9a3412;font-weight:600;}
`;

const IMPORTANT_KEYS = ['stack_name', 'region', 's3_bucket', 's3_prefix', 'confirm_changeset', 'capabilities', 'parameter_overrides', 'image_repositories'];

function envTabClass(name) {
  if (name === 'default') return 'env-default';
  if (name === 'staging') return 'env-staging';
  if (/^prod/i.test(name)) return 'env-prod';
  return '';
}

function renderParams(params) {
  if (!params || typeof params !== 'object') return '';
  const rows = [];
  for (const key of IMPORTANT_KEYS) {
    if (params[key] == null) continue;
    const val = params[key];
    const valStr = typeof val === 'boolean'
      ? `<span class="${val ? 'smc-bool-yes' : 'smc-bool-no'}">${val}</span>`
      : `<span class="smc-mono">${esc(String(val).length > 80 ? String(val).slice(0, 80) + '…' : String(val))}</span>`;
    rows.push(`<tr><td><span class="smc-mono">${esc(key)}</span></td><td>${valStr}</td></tr>`);
  }
  // Also show unknown keys
  for (const [k, v] of Object.entries(params)) {
    if (IMPORTANT_KEYS.includes(k)) continue;
    rows.push(`<tr><td><span class="smc-mono">${esc(k)}</span></td><td><span class="smc-mono">${esc(String(v).slice(0, 80))}</span></td></tr>`);
  }
  if (!rows.length) return '';
  return `<table class="smc-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const version = cfg.version != null ? String(cfg.version) : '';
  const envNames = Object.keys(cfg).filter((k) => k !== 'version');

  const host = document.createElement('div');
  host.className = 'smc-doc';

  // Environment tabs
  const tabsHtml = envNames.length ? `
<div class="smc-sec">
<h3>Environments</h3>
<div class="smc-env-tabs">${envNames.map((n) => `<span class="smc-env-tab ${envTabClass(n)}">${esc(n)}</span>`).join('')}</div>
</div>` : '';

  // Per-environment deploy params
  const envsHtml = envNames.map((envName) => {
    const envCfg = cfg[envName] || {};
    // SAM config: environment -> command -> parameters
    // e.g. [default.deploy.parameters]
    const sections = [];
    for (const [cmd, cmdCfg] of Object.entries(envCfg)) {
      if (!cmdCfg || typeof cmdCfg !== 'object') continue;
      const params = cmdCfg.parameters || cmdCfg;
      const tableHtml = renderParams(params);
      if (tableHtml) {
        sections.push(`<div style="margin-bottom:10px;">
<span style="font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;">${esc(cmd)}</span>
${tableHtml}
</div>`);
      }
    }
    if (!sections.length) return '';
    return `<div class="smc-sec"><h3>${esc(envName)}</h3>${sections.join('')}</div>`;
  }).filter(Boolean).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="smc-title"><span class="badge-smc">SAM Config</span>samconfig.toml</div>
<div class="smc-sub">SAM CLI configuration${version ? ` · version ${esc(version)}` : ''}${envNames.length ? ` · ${envNames.length} environment${envNames.length !== 1 ? 's' : ''}` : ''}</div>
${tabsHtml}
${envsHtml}`;

  return { parentNode: host };
}
