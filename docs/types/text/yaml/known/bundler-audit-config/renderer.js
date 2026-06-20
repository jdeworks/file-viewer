import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bac-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bac{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC0000;color:#fff;vertical-align:middle;margin-right:8px;}
.bac-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bac-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bac-sec{margin:12px 0;}
.bac-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.bac-pills{display:flex;flex-wrap:wrap;gap:6px;}
.bac-pill{display:inline-block;font:12px/1 ui-monospace,monospace;padding:3px 10px;border-radius:12px;background:#fff1f0;border:1px solid #fca5a5;color:#991b1b;font-weight:600;}
.bac-pill.neutral{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg,#24292f);font-family:system-ui,sans-serif;font-weight:400;}
.bac-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin:4px 0;}
.bac-kv dt{font-weight:600;white-space:nowrap;color:var(--fg-2,#555);}
.bac-kv dd{margin:0;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const ignored = Array.isArray(cfg.ignore) ? cfg.ignore : (cfg.ignore ? [cfg.ignore] : []);
  const update = cfg.update;
  const verbosity = cfg.verbosity;

  const subParts = [];
  if (ignored.length) subParts.push(`${ignored.length} CVE${ignored.length !== 1 ? 's' : ''} ignored`);
  if (update != null) subParts.push(`update: ${String(update)}`);
  const subtitle = subParts.join(' · ') || 'bundler-audit configuration';

  const ignoredHtml = ignored.length
    ? `<div class="bac-sec"><h3>Ignored CVEs (${ignored.length})</h3><div class="bac-pills">${ignored.map((c) => `<span class="bac-pill">${esc(c)}</span>`).join('')}</div></div>`
    : '<div class="bac-sec" style="font-size:13px;color:var(--fg-2,#888);">No CVEs ignored — all vulnerabilities will be reported.</div>';

  const settingsRows = [];
  if (update != null) settingsRows.push(`<dt>Auto-update DB</dt><dd>${esc(String(update))}</dd>`);
  if (verbosity != null) settingsRows.push(`<dt>Verbosity</dt><dd>${esc(String(verbosity))}</dd>`);

  const settingsHtml = settingsRows.length
    ? `<div class="bac-sec"><h3>Settings</h3><dl class="bac-kv">${settingsRows.join('')}</dl></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'bac-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bac-title"><span class="badge-bac">Bundler Audit</span>Security config</div>
<div class="bac-sub">${esc(subtitle)}</div>
${ignoredHtml}${settingsHtml}`;

  return { parentNode: host };
}
