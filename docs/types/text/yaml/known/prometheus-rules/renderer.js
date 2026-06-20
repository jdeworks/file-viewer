import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px}
.pr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pr-sec{margin:14px 0}
.pr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.pr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.pr-card-name{font:700 13px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);margin-bottom:4px}
.pr-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.pr-kv-k{color:var(--fg-2,#888);min-width:100px;flex-shrink:0}
.pr-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.pr-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin-right:4px}
.pr-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;margin-left:4px}
.pr-tag.alert{background:#fff0eb;border:1px solid #f7b799;color:#c0392b}
.pr-tag.record{background:#eaf4ff;border:1px solid #a5c8f7;color:#1a5c99}
.pr-tag.sev-warning{background:#fff8e1;border:1px solid #ffe082;color:#b45309}
.pr-tag.sev-critical{background:#fde8e8;border:1px solid #fca5a5;color:#b91c1c}
.pr-tag.sev-info{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
`;

function sevClass(sev) {
  if (!sev) return 'pr-tag';
  const s = String(sev).toLowerCase();
  if (s === 'critical') return 'pr-tag sev-critical';
  if (s === 'warning') return 'pr-tag sev-warning';
  if (s === 'info') return 'pr-tag sev-info';
  return 'pr-tag';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
  let totalAlerts = 0;
  let totalRecording = 0;

  groups.forEach((g) => {
    (Array.isArray(g.rules) ? g.rules : []).forEach((r) => {
      if (r.alert) totalAlerts++;
      else if (r.record) totalRecording++;
    });
  });

  const groupsHtml = groups.map((g) => {
    const rules = Array.isArray(g.rules) ? g.rules : [];
    const rulesHtml = rules.map((r) => {
      const isAlert = !!r.alert;
      const name = r.alert || r.record || '';
      const severity = r.labels?.severity;
      const summary = r.annotations?.summary ? String(r.annotations.summary).slice(0, 80) + (r.annotations.summary.length > 80 ? '…' : '') : '';
      return `<div class="pr-card">
<div class="pr-card-name">${esc(name)}<span class="${isAlert ? 'pr-tag alert' : 'pr-tag record'}" style="margin-left:6px">${isAlert ? 'alert' : 'record'}</span>${severity ? `<span class="${sevClass(severity)}" style="margin-left:4px">${esc(severity)}</span>` : ''}</div>
${summary ? `<div class="pr-kv"><span class="pr-kv-k">summary</span><span class="pr-kv-v">${esc(summary)}</span></div>` : ''}
</div>`;
    }).join('');
    return `<div class="pr-sec"><h3>${esc(g.name || '(unnamed group)')}</h3>${rulesHtml}</div>`;
  }).join('');

  const subParts = [
    `${totalAlerts} alert rule${totalAlerts !== 1 ? 's' : ''}`,
    `${totalRecording} recording rule${totalRecording !== 1 ? 's' : ''}`,
    `${groups.length} group${groups.length !== 1 ? 's' : ''}`,
  ];

  const host = document.createElement('div');
  host.className = 'pr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pr">Prometheus Rules</span>
  <span class="pr-title">Rules</span>
  <span class="pr-tag" style="background:#fff0eb;border:1px solid #f7b799;color:#c0392b">${groups.length} group${groups.length !== 1 ? 's' : ''}</span>
</div>
<div class="pr-sub">${esc(subParts.join(' · '))}</div>
${groupsHtml}`;
  return { parentNode: host };
}
