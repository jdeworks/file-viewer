import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cci-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cci{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#343434;color:#fff;vertical-align:middle;margin-right:8px;}
.cci-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cci-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cci-sec{margin:12px 0;}
.cci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cci-pills{display:flex;flex-wrap:wrap;gap:6px;}
.cci-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.cci-pill.orb{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.cci-pill.job{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.cci-job{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const version = cfg.version || '?';
  const orbs = cfg.orbs ? Object.keys(cfg.orbs) : [];
  const jobs = cfg.jobs ? Object.keys(cfg.jobs) : [];
  const workflows = cfg.workflows ? Object.keys(cfg.workflows).filter((k) => k !== 'version') : [];

  const orbsHtml = orbs.length
    ? `<div class="cci-sec"><h3>Orbs (${orbs.length})</h3><div class="cci-pills">${orbs.map((o) => `<span class="cci-pill orb">${esc(o)}</span>`).join('')}</div></div>`
    : '';

  const workflowsHtml = workflows.length
    ? `<div class="cci-sec"><h3>Workflows (${workflows.length})</h3><div class="cci-pills">${workflows.map((w) => `<span class="cci-pill">${esc(w)}</span>`).join('')}</div></div>`
    : '';

  const jobsHtml = jobs.length
    ? `<div class="cci-sec"><h3>Jobs (${jobs.length})</h3>${jobs.slice(0, 8).map((j) => {
        const jd = cfg.jobs[j] || {};
        const steps = Array.isArray(jd.steps) ? jd.steps.length : 0;
        return `<div class="cci-job"><span class="cci-pill job" style="margin-right:6px">${esc(j)}</span>${steps ? `<span style="font-size:12px;color:var(--fg-2,#888)">${steps} step${steps !== 1 ? 's' : ''}</span>` : ''}</div>`;
      }).join('')}${jobs.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${jobs.length - 8} more</div>` : ''}</div>`
    : '';

  const sub = [`v${esc(version)}`, workflows.length ? `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}` : '', jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'cci-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cci-title"><span class="badge-cci">CircleCI</span>Pipeline config</div>
<div class="cci-sub">${sub}</div>
${orbsHtml}${workflowsHtml}${jobsHtml}`;
  return { parentNode: host };
}
