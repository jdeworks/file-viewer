import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tfd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-tfd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#166534;color:#fff;vertical-align:middle;margin-right:8px;}
.tfd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tfd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tfd-sec{margin:12px 0;}
.tfd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.tfd-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;font-family:ui-monospace,monospace;}
.tfd-chip.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.tfd-chip.off{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);}
.tfd-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.tfd-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.tfd-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

const SECTIONS = ['providers', 'inputs', 'outputs', 'resources', 'requirements', 'modules'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const formatter = cfg.formatter || null;
  const output = cfg.output || {};
  const outputFile = output.file || null;
  const outputMode = output.mode || null;
  const outputTemplate = output.template || null;
  const sort = cfg.sort || {};
  const sortBy = sort.by || null;
  const sections = cfg.sections || {};

  const settingsEntries = [
    formatter ? `<span class="tfd-k">formatter</span><span class="tfd-v">${esc(formatter)}</span>` : '',
    outputFile ? `<span class="tfd-k">output.file</span><span class="tfd-v">${esc(outputFile)}</span>` : '',
    outputMode ? `<span class="tfd-k">output.mode</span><span class="tfd-v">${esc(outputMode)}</span>` : '',
    outputTemplate ? `<span class="tfd-k">output.template</span><span class="tfd-v">${esc(outputTemplate)}</span>` : '',
    sortBy ? `<span class="tfd-k">sort.by</span><span class="tfd-v">${esc(sortBy)}</span>` : '',
  ].filter(Boolean);

  const settingsHtml = settingsEntries.length ? `<div class="tfd-sec"><h3>Output</h3><div class="tfd-kv">
    ${settingsEntries.join('')}
  </div></div>` : '';

  // Sections: show which are enabled/disabled
  const sectionItems = SECTIONS.map((s) => {
    const val = sections[s];
    const on = val === true || val == null; // default on if unset
    return { name: s, on, explicit: val !== undefined };
  });
  const hasSections = Object.keys(sections).length > 0;
  const sectionsHtml = hasSections ? `<div class="tfd-sec"><h3>Sections</h3><div>
    ${sectionItems.map((s) => `<span class="tfd-chip ${s.on ? 'on' : 'off'}">${esc(s.name)}${s.explicit && !s.on ? ' ✗' : ''}</span>`).join('')}
  </div></div>` : '';

  const sub = [
    formatter ? `formatter: ${formatter}` : '',
    outputFile ? `→ ${outputFile}` : '',
    sortBy ? `sort by ${sortBy}` : '',
  ].filter(Boolean).join(' · ') || 'terraform-docs module documentation config';

  const host = document.createElement('div');
  host.className = 'tfd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tfd-title"><span class="badge-tfd">terraform-docs</span>terraform-docs config</div>
<div class="tfd-sub">${esc(sub)}</div>
${settingsHtml}${sectionsHtml}`;

  return { parentNode: host };
}
