const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cdk-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cdk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8711a;color:#fff;vertical-align:middle;margin-right:8px;}
.cdk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cdk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cdk-sec{margin:14px 0;}
.cdk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cdk-table{width:100%;border-collapse:collapse;font-size:13px;}
.cdk-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cdk-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;word-break:break-all;}
.cdk-mono{font:12px ui-monospace,monospace;}
.cdk-kv{display:flex;gap:10px;align-items:baseline;margin:3px 0;}
.cdk-key{font-size:12px;color:var(--fg-2,#888);min-width:160px;}
.cdk-val{font:12px ui-monospace,monospace;font-weight:600;}
.cdk-chips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.cdk-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const app = cfg.app || '';
  const build = cfg.build || '';
  const toolkitStackName = cfg.toolkitStackName || '';
  const context = cfg.context || {};
  const watch = cfg.watch || {};
  const watchInclude = Array.isArray(watch.include) ? watch.include : [];
  const watchExclude = Array.isArray(watch.exclude) ? watch.exclude : [];

  const contextEntries = Object.entries(context);

  const host = document.createElement('div');
  host.className = 'cdk-doc';

  // App / build info
  const metaHtml = [
    app && `<div class="cdk-kv"><span class="cdk-key">app</span><span class="cdk-val">${esc(app)}</span></div>`,
    build && `<div class="cdk-kv"><span class="cdk-key">build</span><span class="cdk-val">${esc(build)}</span></div>`,
    toolkitStackName && `<div class="cdk-kv"><span class="cdk-key">toolkitStackName</span><span class="cdk-val">${esc(toolkitStackName)}</span></div>`,
  ].filter(Boolean).join('');

  // Context table
  const contextHtml = contextEntries.length ? `
<div class="cdk-sec"><h3>Context (${contextEntries.length})</h3>
<table class="cdk-table">
<thead><tr><th>Key</th><th>Value</th></tr></thead>
<tbody>${contextEntries.slice(0, 30).map(([k, v]) => {
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `<tr><td><span class="cdk-mono">${esc(k)}</span></td><td><span class="cdk-mono">${esc(val.length > 80 ? val.slice(0, 80) + '…' : val)}</span></td></tr>`;
  }).join('')}</tbody>
</table></div>` : '';

  // Watch settings
  const watchHtml = (watchInclude.length || watchExclude.length) ? `
<div class="cdk-sec"><h3>Watch</h3>
${watchInclude.length ? `<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--fg-2,#888);">Include</span><div class="cdk-chips">${watchInclude.map((p) => `<span class="cdk-chip">${esc(p)}</span>`).join('')}</div></div>` : ''}
${watchExclude.length ? `<div><span style="font-size:11px;color:var(--fg-2,#888);">Exclude</span><div class="cdk-chips">${watchExclude.map((p) => `<span class="cdk-chip">${esc(p)}</span>`).join('')}</div></div>` : ''}
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="cdk-title"><span class="badge-cdk">AWS CDK</span>cdk.json</div>
<div class="cdk-sub">CDK app configuration${contextEntries.length ? ` · ${contextEntries.length} context key${contextEntries.length !== 1 ? 's' : ''}` : ''}</div>
${metaHtml ? `<div class="cdk-sec">${metaHtml}</div>` : ''}
${contextHtml}
${watchHtml}`;

  return { parentNode: host };
}
