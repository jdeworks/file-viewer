import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rubocoptodo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rbctodo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF7900;color:#fff;vertical-align:middle;margin-right:8px;}
.rbctodo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rbctodo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 8px;}
.rbctodo-notice{font-size:12px;color:var(--fg-2,#666);background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 10px;margin:0 0 12px;display:flex;align-items:center;gap:6px;}
.rbctodo-sec{margin:12px 0;}
.rbctodo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rbctodo-table{width:100%;border-collapse:collapse;font-size:12px;}
.rbctodo-table th{text-align:left;padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#555);}
.rbctodo-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e8e8e8);vertical-align:top;}
.rbctodo-table tr:last-child td{border-bottom:none;}
.rbctodo-cop{font-family:monospace;font-size:11px;color:var(--fg,#24292f);}
.rbctodo-dept{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;background:#fff1f0;border:1px solid #fca5a5;color:#991b1b;margin-bottom:2px;}
.rbctodo-count{font-size:11px;color:var(--fg-2,#888);}
.rbctodo-max{font-size:11px;font-family:monospace;color:#c05621;}
.rbctodo-dept-group{margin:10px 0;}
.rbctodo-dept-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#777);margin:0 0 4px;}
`;

const KNOWN_DEPTS = ['Layout', 'Lint', 'Metrics', 'Migration', 'Naming', 'Performance', 'Security', 'Style', 'Bundler', 'Gemspec', 'Rails', 'RSpec'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const cops = Object.entries(cfg || {});
  const totalCops = cops.length;

  // Group by department
  const deptMap = {};
  for (const [cop, settings] of cops) {
    const dept = KNOWN_DEPTS.find((d) => cop.startsWith(d + '/')) || 'Other';
    if (!deptMap[dept]) deptMap[dept] = [];
    deptMap[dept].push({ cop, settings: settings || {} });
  }

  const deptOrder = [...KNOWN_DEPTS.filter((d) => deptMap[d]), ...(deptMap['Other'] ? ['Other'] : [])];
  const MAX_COPS = 30;
  let shown = 0;

  const deptHtml = deptOrder.map((dept) => {
    if (shown >= MAX_COPS) return '';
    const entries = deptMap[dept];
    const rows = entries.slice(0, MAX_COPS - shown).map(({ cop, settings }) => {
      shown++;
      const excList = Array.isArray(settings.Exclude) ? settings.Exclude : [];
      const maxVal = settings.Max != null ? settings.Max : null;
      return `<tr>
        <td class="rbctodo-cop">${esc(cop)}</td>
        <td class="rbctodo-count">${excList.length ? `${excList.length} file${excList.length !== 1 ? 's' : ''}` : ''}</td>
        <td>${maxVal != null ? `<span class="rbctodo-max">Max: ${esc(maxVal)}</span>` : ''}</td>
      </tr>`;
    }).join('');
    const remaining = entries.length - (shown <= MAX_COPS ? entries.length - Math.max(0, entries.length - (MAX_COPS - (shown - entries.length))) : 0);
    return `<div class="rbctodo-dept-group">
      <div class="rbctodo-dept-label">${esc(dept)}</div>
      <table class="rbctodo-table">
        <thead><tr><th>Cop</th><th>Files</th><th>Setting</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const overflowCount = totalCops - MAX_COPS;
  const overflowHtml = overflowCount > 0 ? `<div class="rbctodo-count" style="margin-top:6px">+${overflowCount} more cop${overflowCount !== 1 ? 's' : ''} not shown</div>` : '';

  const sub = `${totalCops} cop${totalCops !== 1 ? 's' : ''} with violations · ${deptOrder.length} department${deptOrder.length !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'rubocoptodo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rbctodo-title"><span class="badge-rbctodo">RuboCop TODO</span>Auto-generated cop list</div>
<div class="rbctodo-sub">${esc(sub)}</div>
<div class="rbctodo-notice">&#8505;&#xFE0F; Auto-generated file listing cops with violations to fix. Run <code>rubocop --auto-gen-config</code> to regenerate.</div>
<div class="rbctodo-sec">${deptHtml}${overflowHtml}</div>`;
  return { parentNode: host };
}
