import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.skt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.skt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a56db;color:#fff;vertical-align:middle;margin-right:8px;}
.skt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.skt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.skt-sec{margin:12px 0;}
.skt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.skt-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.skt-pill.error{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.skt-pill.warn{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.skt-pill.ignore{background:#f9fafb;border-color:#d1d5db;color:#6b7280;}
.skt-pill.defer{background:#faf5ff;border-color:#d8b4fe;color:#7e22ce;}
.skt-table{width:100%;border-collapse:collapse;font-size:13px;}
.skt-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.skt-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.skt-table td:first-child{font:12px/1.4 ui-monospace,monospace;}
.skt-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 12px;}
.skt-pat{font:12px/1.6 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;margin:1px;}
`;

const ISSUE_ACTION_COLORS = { error: 'error', warn: 'warn', ignore: 'ignore', defer: 'defer' };

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  // Ignore patterns
  const ignorePatterns = Array.isArray(cfg.ignore) ? cfg.ignore : [];

  // Issue rules — object keyed by issue type
  const issueRules = cfg.issues && typeof cfg.issues === 'object' ? cfg.issues : {};
  const issueEntries = Object.entries(issueRules);

  // Enabled checks
  const enabledChecks = cfg.enable && typeof cfg.enable === 'object' ? cfg.enable : {};
  const enabledEntries = Object.entries(enabledChecks);

  // Defer/allow entries
  const deferEntries = Array.isArray(cfg.defer) ? cfg.defer : [];

  // Ignore patterns section
  const ignorePatternsHtml = ignorePatterns.length
    ? `<div class="skt-sec"><h3>Ignore patterns (${ignorePatterns.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${ignorePatterns.map((p) => `<span class="skt-pat">${esc(String(p))}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Issue rules section
  const issueRulesHtml = issueEntries.length
    ? `<div class="skt-sec"><h3>Issue rules (${issueEntries.length})</h3>
        <div class="skt-card">
          <table class="skt-table">
            <thead><tr><th>Issue type</th><th>Action</th></tr></thead>
            <tbody>${issueEntries.map(([type, action]) => {
              const actionStr = typeof action === 'string' ? action : (action?.action || JSON.stringify(action));
              const cls = ISSUE_ACTION_COLORS[actionStr] || '';
              return `<tr><td>${esc(type)}</td><td><span class="skt-pill ${cls}">${esc(actionStr)}</span></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`
    : '';

  // Enabled checks
  const enabledChecksHtml = enabledEntries.length
    ? `<div class="skt-sec"><h3>Checks enabled</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${enabledEntries.map(([k, v]) => {
            const on = v === true || v === 'true' || v === 'on';
            const cls = on ? '' : 'ignore';
            return `<span class="skt-pill ${cls}">${esc(k)}: ${esc(String(v))}</span>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // Defer list
  const deferHtml = deferEntries.length
    ? `<div class="skt-sec"><h3>Deferred packages (${deferEntries.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${deferEntries.map((d) => `<span class="skt-pill defer">${esc(typeof d === 'string' ? d : JSON.stringify(d))}</span>`).join('')}
        </div>
      </div>`
    : '';

  const subParts = [
    ignorePatterns.length ? `${ignorePatterns.length} ignore pattern${ignorePatterns.length !== 1 ? 's' : ''}` : '',
    issueEntries.length ? `${issueEntries.length} issue rule${issueEntries.length !== 1 ? 's' : ''}` : '',
    enabledEntries.length ? `${enabledEntries.length} check setting${enabledEntries.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'skt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="skt-title"><span class="skt-badge">Socket</span>Socket Security</div>
<div class="skt-sub">${esc(subParts.join(' · ') || 'Socket.dev supply chain security config')}</div>
${ignorePatternsHtml}${issueRulesHtml}${enabledChecksHtml}${deferHtml}`;

  return { parentNode: host };
}
