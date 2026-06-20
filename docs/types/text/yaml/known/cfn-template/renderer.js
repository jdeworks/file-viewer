import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cfn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cfn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8711a;color:#fff;vertical-align:middle;margin-right:8px;}
.cfn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cfn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cfn-sec{margin:14px 0;}
.cfn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cfn-table{width:100%;border-collapse:collapse;font-size:13px;}
.cfn-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cfn-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.cfn-mono{font:12px ui-monospace,monospace;}
.cfn-chips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.cfn-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;}
.cfn-chip.s3{background:#fff3e0;border-color:#ffcc80;color:#bf360c;}
.cfn-chip.lambda{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.cfn-chip.iam{background:#fce4ec;border-color:#f48fb1;color:#880e4f;}
.cfn-chip.ec2{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.cfn-chip.dynamo{background:#f3e5f5;border-color:#ce93d8;color:#4a148c;}
.cfn-chip.api{background:#e0f7fa;border-color:#80deea;color:#006064;}
.cfn-chip.cfn-other{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#777);}
.cfn-outputs{display:flex;flex-wrap:wrap;gap:5px;}
.cfn-out{font:12px ui-monospace,monospace;padding:2px 9px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

function chipClass(type) {
  if (/::S3::/i.test(type)) return 's3';
  if (/::Lambda::/i.test(type)) return 'lambda';
  if (/::IAM::/i.test(type)) return 'iam';
  if (/::EC2::/i.test(type)) return 'ec2';
  if (/::DynamoDB::/i.test(type)) return 'dynamo';
  if (/::ApiGateway|::Serverless::Api/i.test(type)) return 'api';
  return 'cfn-other';
}

function groupByService(resources) {
  const groups = {};
  for (const [name, val] of Object.entries(resources)) {
    const type = (val && val.Type) ? val.Type : 'Unknown';
    const service = type.split('::')[1] || 'Other';
    if (!groups[service]) groups[service] = [];
    groups[service].push({ name, type });
  }
  return groups;
}

export async function render(intake) {
  let tpl = {};
  try { tpl = (jsYaml.loadAll(intake.text || \'\') || [])[0] || {}; } catch { tpl = {}; }

  const version = tpl.AWSTemplateFormatVersion || '';
  const description = tpl.Description || '';
  const parameters = tpl.Parameters || {};
  const resources = tpl.Resources || {};
  const outputs = tpl.Outputs || {};

  const paramEntries = Object.entries(parameters);
  const resourceGroups = groupByService(resources);
  const outputKeys = Object.keys(outputs);
  const resourceCount = Object.keys(resources).length;

  const host = document.createElement('div');
  host.className = 'cfn-doc';

  // Parameters table
  const paramsHtml = paramEntries.length ? `
<div class="cfn-sec"><h3>Parameters (${paramEntries.length})</h3>
<table class="cfn-table">
<thead><tr><th>Name</th><th>Type</th><th>Default</th></tr></thead>
<tbody>${paramEntries.slice(0, 20).map(([k, v]) => {
    const type = (v && v.Type) ? v.Type : '—';
    const def = (v && v.Default != null) ? String(v.Default) : '—';
    return `<tr><td><span class="cfn-mono">${esc(k)}</span></td><td><span class="cfn-mono">${esc(type)}</span></td><td><span class="cfn-mono">${esc(def)}</span></td></tr>`;
  }).join('')}</tbody>
</table></div>` : '';

  // Resources grouped by service
  const resourceHtml = resourceCount ? `
<div class="cfn-sec"><h3>Resources (${resourceCount})</h3>
${Object.entries(resourceGroups).slice(0, 12).map(([svc, items]) => `
<div style="margin-bottom:8px;"><span style="font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;">${esc(svc)}</span>
<div class="cfn-chips" style="margin-top:4px;">${items.map((r) => `<span class="cfn-chip ${chipClass(r.type)}" title="${esc(r.type)}">${esc(r.name)}</span>`).join('')}</div></div>
`).join('')}
</div>` : '';

  // Outputs list
  const outputsHtml = outputKeys.length ? `
<div class="cfn-sec"><h3>Outputs (${outputKeys.length})</h3>
<div class="cfn-outputs">${outputKeys.map((k) => `<span class="cfn-out">${esc(k)}</span>`).join('')}</div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="cfn-title"><span class="badge-cfn">CloudFormation</span>${esc(description || 'CloudFormation Template')}</div>
<div class="cfn-sub">${version ? `AWSTemplateFormatVersion: ${esc(version)} · ` : ''}${resourceCount} resource${resourceCount !== 1 ? 's' : ''}</div>
${paramsHtml}
${resourceHtml}
${outputsHtml}`;

  return { parentNode: host };
}
