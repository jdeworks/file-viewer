import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cfd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cfd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#06A0CE;color:#fff;vertical-align:middle;margin-right:8px;}
.cfd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cfd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cfd-sec{margin:12px 0;}
.cfd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cfd-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.cfd-table{width:100%;border-collapse:collapse;font-size:13px;}
.cfd-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.cfd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:top;}
.cfd-table td:first-child{font-weight:600;}
.cfd-step-type{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.cfd-step-img{font:11px ui-monospace,monospace;color:var(--fg-2,#888);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cfd-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.cfd-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.cfd-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version != null ? String(cfg.version) : null;
  const filename = (intake.filename || '').split('/').pop() || 'codefresh.yml';

  // Steps: object where each key is step name
  const stepsObj = cfg.steps && typeof cfg.steps === 'object' && !Array.isArray(cfg.steps) ? cfg.steps : {};
  const stepEntries = Object.entries(stepsObj);

  // Triggers: array of objects
  const triggers = Array.isArray(cfg.triggers) ? cfg.triggers : [];

  // Variables: array of objects or plain object
  const variables = Array.isArray(cfg.variables)
    ? cfg.variables
    : (cfg.variables && typeof cfg.variables === 'object' ? Object.entries(cfg.variables).map(([key, value]) => ({ key, value })) : []);

  // Steps table
  const stepsHtml = stepEntries.length
    ? `<div class="cfd-sec"><h3>Steps (${stepEntries.length})</h3>
        <table class="cfd-table">
          <thead><tr><th>Name</th><th>Type</th><th>Image</th><th>Commands</th></tr></thead>
          <tbody>${stepEntries.slice(0, 10).map(([name, step]) => {
            const type = step.type || '—';
            const image = step.image || '—';
            const cmds = Array.isArray(step.commands) ? step.commands.length : 0;
            return `<tr>
              <td>${esc(name)}</td>
              <td><span class="cfd-step-type">${esc(type)}</span></td>
              <td><span class="cfd-step-img">${esc(image)}</span></td>
              <td>${cmds ? `${cmds} cmd${cmds !== 1 ? 's' : ''}` : '—'}</td>
            </tr>`;
          }).join('')}${stepEntries.length > 10 ? `<tr><td colspan="4" style="font-size:12px;color:var(--fg-2,#888)">…and ${stepEntries.length - 10} more</td></tr>` : ''}
          </tbody>
        </table></div>`
    : '';

  // Triggers section
  const triggersHtml = triggers.length
    ? `<div class="cfd-sec"><h3>Triggers (${triggers.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${triggers.map((t) => {
        const label = t.name || t.type || '?';
        const type = t.name && t.type ? ` (${t.type})` : '';
        return `<span class="cfd-pill">${esc(label)}${esc(type)}</span>`;
      }).join('')}</div></div>`
    : '';

  // Variables section
  const variablesHtml = variables.length
    ? `<div class="cfd-sec"><h3>Variables (${variables.length})</h3><div class="cfd-kv">${variables.slice(0, 12).map((v) => {
        const key = v.key || v.name || '?';
        const val = v.value != null ? String(v.value) : '(not set)';
        return `<span class="cfd-k">${esc(key)}</span><span class="cfd-v">${esc(val)}</span>`;
      }).join('')}${variables.length > 12 ? `<span class="cfd-k" style="color:var(--fg-2,#888)">…</span><span class="cfd-v" style="color:var(--fg-2,#888)">${variables.length - 12} more</span>` : ''}</div></div>`
    : '';

  const sub = [
    version ? `version ${version}` : null,
    stepEntries.length ? `${stepEntries.length} step${stepEntries.length !== 1 ? 's' : ''}` : null,
    triggers.length ? `${triggers.length} trigger${triggers.length !== 1 ? 's' : ''}` : null,
    variables.length ? `${variables.length} variable${variables.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const infoHtml = `<div class="cfd-sec"><h3>Pipeline info</h3><div class="cfd-kv">
    ${version ? `<span class="cfd-k">version</span><span class="cfd-v">${esc(version)}</span>` : ''}
    ${cfg.mode ? `<span class="cfd-k">mode</span><span class="cfd-v">${esc(cfg.mode)}</span>` : ''}
    ${cfg.fail_fast != null ? `<span class="cfd-k">fail_fast</span><span class="cfd-v">${esc(String(cfg.fail_fast))}</span>` : ''}
  </div></div>`;

  const host = document.createElement('div');
  host.className = 'cfd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cfd-title"><span class="badge-cfd">Codefresh</span>${esc(filename)}</div>
<div class="cfd-sub">${esc(sub)}</div>
${infoHtml}${stepsHtml}${triggersHtml}${variablesHtml}`;

  return { parentNode: host };
}
