import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hrn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hrn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#004FBF;color:#fff;vertical-align:middle;margin-right:8px;}
.hrn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hrn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.hrn-sec{margin:12px 0;}
.hrn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hrn-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.hrn-table{width:100%;border-collapse:collapse;font-size:13px;}
.hrn-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 10px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.hrn-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:top;}
.hrn-stage-name{font-weight:600;}
.hrn-type{font:11px ui-monospace,monospace;padding:2px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.hrn-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.hrn-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.hrn-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const pipeline = cfg.pipeline || {};
  const name = pipeline.name || (intake.filename || '').split('/').pop() || 'Pipeline';
  const identifier = pipeline.identifier || '';
  const rawStages = Array.isArray(pipeline.stages) ? pipeline.stages : [];
  const rawVars = Array.isArray(pipeline.variables) ? pipeline.variables : [];
  const tags = pipeline.tags && typeof pipeline.tags === 'object' && !Array.isArray(pipeline.tags)
    ? Object.keys(pipeline.tags)
    : Array.isArray(pipeline.tags) ? pipeline.tags : [];

  // Harness stages can be nested: each element may be { stage: {...} } or { parallel: [...] }
  const flatStages = [];
  for (const item of rawStages) {
    if (item && item.stage) {
      flatStages.push(item.stage);
    } else if (item && Array.isArray(item.parallel)) {
      for (const p of item.parallel) {
        if (p && p.stage) flatStages.push(p.stage);
      }
    }
  }

  const stagesHtml = flatStages.length
    ? `<div class="hrn-sec"><h3>Stages (${flatStages.length})</h3><table class="hrn-table"><thead><tr><th>Name</th><th>Type</th><th>Steps</th></tr></thead><tbody>${
        flatStages.map((s) => {
          const sname = s.name || s.identifier || '?';
          const stype = s.type || '—';
          const steps = s.spec && s.spec.execution && Array.isArray(s.spec.execution.steps)
            ? s.spec.execution.steps.length
            : null;
          return `<tr><td class="hrn-stage-name">${esc(sname)}</td><td><span class="hrn-type">${esc(stype)}</span></td><td>${steps !== null ? steps : '—'}</td></tr>`;
        }).join('')
      }</tbody></table></div>`
    : '';

  const varsHtml = rawVars.length
    ? `<div class="hrn-sec"><h3>Variables (${rawVars.length})</h3><div class="hrn-kv">${
        rawVars.map((v) => `<span class="hrn-k">${esc(v.name || '?')}</span><span class="hrn-v">${esc(v.value != null ? v.value : '')}${v.type ? ` <span style="font-weight:400;color:var(--fg-2,#888)">(${esc(v.type)})</span>` : ''}</span>`).join('')
      }</div></div>`
    : '';

  const tagsHtml = tags.length
    ? `<div class="hrn-sec"><h3>Tags</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${tags.map((t) => `<span class="hrn-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const identityHtml = `<div class="hrn-sec"><h3>Pipeline info</h3><div class="hrn-kv">
    ${identifier ? `<span class="hrn-k">identifier</span><span class="hrn-v">${esc(identifier)}</span>` : ''}
    ${flatStages.length ? `<span class="hrn-k">stages</span><span class="hrn-v">${flatStages.length}</span>` : ''}
    ${rawVars.length ? `<span class="hrn-k">variables</span><span class="hrn-v">${rawVars.length}</span>` : ''}
  </div></div>`;

  const sub = [
    identifier ? `id: ${identifier}` : '',
    flatStages.length ? `${flatStages.length} stage${flatStages.length !== 1 ? 's' : ''}` : '',
    rawVars.length ? `${rawVars.length} variable${rawVars.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'hrn-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hrn-title"><span class="badge-hrn">Harness</span>${esc(name)}</div>
<div class="hrn-sub">${esc(sub)}</div>
${identityHtml}${stagesHtml}${varsHtml}${tagsHtml}`;

  return { parentNode: host };
}
