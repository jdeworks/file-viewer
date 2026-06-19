import { loadGlobal, vendor } from '../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.snk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.snk-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.snk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.snk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.snk-sec{margin:12px 0;}
.snk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.snk-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.snk-pill.patch{background:#f0fdf4;border-color:#86efac;color:#166534;}
.snk-pill.ignore{background:#faf5ff;border-color:#d8b4fe;color:#7e22ce;}
.snk-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 12px;}
.snk-table{width:100%;border-collapse:collapse;font-size:13px;}
.snk-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.snk-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.snk-table td:first-child{font:12px/1.4 ui-monospace,monospace;white-space:nowrap;}
.snk-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.snk-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.snk-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.snk-reason{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
`;

export async function render(intake) {
  let cfg = {};
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(text) || {};
  } catch { cfg = {}; }

  const version = cfg.version || null;
  const language = cfg.language || null;

  // Ignore section — keyed by vuln ID, value is object with reason/expiry per path
  const ignoreRaw = cfg.ignore && typeof cfg.ignore === 'object' ? cfg.ignore : {};
  const ignoreEntries = Object.entries(ignoreRaw);

  // Patches section — keyed by vuln ID, value is array of patch objects
  const patchesRaw = cfg.patch && typeof cfg.patch === 'object' ? cfg.patch : {};
  const patchEntries = Object.entries(patchesRaw);

  // Exclude paths
  const excludePaths = Array.isArray(cfg.exclude) ? cfg.exclude : (cfg.exclude ? [cfg.exclude] : []);

  // Ignore section HTML
  const ignoreHtml = ignoreEntries.length
    ? `<div class="snk-sec"><h3>Ignored vulnerabilities (${ignoreEntries.length})</h3>
        <div class="snk-card">
          <table class="snk-table">
            <thead><tr><th>Vulnerability ID</th><th>Reason / Scope</th></tr></thead>
            <tbody>${ignoreEntries.slice(0, 30).map(([id, reasons]) => {
              let reasonText = '';
              if (Array.isArray(reasons)) {
                const first = reasons[0];
                if (first && typeof first === 'object') {
                  const vals = Object.values(first);
                  const r = vals[0];
                  if (r && typeof r === 'object') {
                    reasonText = r.reason || r.description || '';
                    if (r.expires) reasonText += (reasonText ? ' · ' : '') + `expires: ${r.expires}`;
                  }
                }
              } else if (reasons && typeof reasons === 'object') {
                const vals = Object.values(reasons);
                const r = vals[0];
                if (r && typeof r === 'object') reasonText = r.reason || '';
              }
              return `<tr>
                <td><span class="snk-pill ignore">${esc(id)}</span></td>
                <td>${reasonText ? `<div class="snk-reason">${esc(reasonText)}</div>` : '—'}</td>
              </tr>`;
            }).join('')}
            ${ignoreEntries.length > 30 ? `<tr><td colspan="2" style="font-size:12px;color:var(--fg-2,#888);">…and ${ignoreEntries.length - 30} more</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>`
    : '';

  // Patches section HTML
  const patchesHtml = patchEntries.length
    ? `<div class="snk-sec"><h3>Patches applied (${patchEntries.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${patchEntries.map(([id]) => `<span class="snk-pill patch">${esc(id)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Exclude paths
  const excludeHtml = excludePaths.length
    ? `<div class="snk-sec"><h3>Excluded paths (${excludePaths.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${excludePaths.map((p) => `<span class="snk-pill">${esc(typeof p === 'string' ? p : JSON.stringify(p))}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Settings
  const settingsRows = [
    version !== null && version !== undefined && `<span class="snk-k">version</span><span class="snk-v">${esc(String(version))}</span>`,
    language && `<span class="snk-k">language</span><span class="snk-v">${esc(String(language))}</span>`,
  ].filter(Boolean);

  const settingsHtml = settingsRows.length
    ? `<div class="snk-sec"><h3>Settings</h3><div class="snk-card"><div class="snk-kv">${settingsRows.join('')}</div></div></div>`
    : '';

  const subParts = [
    ignoreEntries.length ? `${ignoreEntries.length} ignored vuln${ignoreEntries.length !== 1 ? 's' : ''}` : '',
    patchEntries.length ? `${patchEntries.length} patch${patchEntries.length !== 1 ? 'es' : ''}` : '',
    language ? `language: ${language}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'snk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="snk-title"><span class="snk-badge">Snyk</span>.snyk policy</div>
<div class="snk-sub">${esc(subParts.join(' · ') || 'Snyk vulnerability policy config')}</div>
${settingsHtml}${ignoreHtml}${patchesHtml}${excludeHtml}`;

  return { parentNode: host };
}
