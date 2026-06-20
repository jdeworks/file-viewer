import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.glb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-glb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fc6d26;color:#fff;vertical-align:middle;margin-right:8px;}
.glb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.glb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.glb-sec{margin:12px 0;}
.glb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.glb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.glb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.glb-pill.stage{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.glb-pill.job{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.glb-job{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:center;gap:8px;}
`;

const RESERVED = new Set(['stages','variables','include','image','services','before_script','after_script','cache','default','workflow','rules']);

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const image = cfg.image || (cfg.default?.image) || '';
  const variables = cfg.variables ? Object.keys(cfg.variables) : [];
  const includes = Array.isArray(cfg.include) ? cfg.include : (cfg.include ? [cfg.include] : []);
  const jobs = Object.entries(cfg).filter(([k]) => !RESERVED.has(k) && typeof cfg[k] === 'object');

  const stagesHtml = stages.length
    ? `<div class="glb-sec"><h3>Stages (${stages.length})</h3><div class="glb-pills">${stages.map((s) => `<span class="glb-pill stage">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const jobsHtml = jobs.length
    ? `<div class="glb-sec"><h3>Jobs (${jobs.length})</h3>${jobs.slice(0, 8).map(([name, j]) => {
        const stage = (j && j.stage) || '';
        const script = Array.isArray(j?.script) ? j.script.length : (j?.script ? 1 : 0);
        return `<div class="glb-job">
          <span class="glb-pill job">${esc(name)}</span>
          ${stage ? `<span class="glb-pill stage">${esc(stage)}</span>` : ''}
          ${script ? `<span style="font-size:12px;color:var(--fg-2,#888)">${script} script step${script !== 1 ? 's' : ''}</span>` : ''}
        </div>`;
      }).join('')}${jobs.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${jobs.length - 8} more</div>` : ''}</div>`
    : '';

  const varsHtml = variables.length
    ? `<div class="glb-sec"><h3>Variables (${variables.length})</h3><div class="glb-pills">${variables.slice(0, 6).map((v) => `<span class="glb-pill">${esc(v)}</span>`).join('')}${variables.length > 6 ? `<span class="glb-pill">+${variables.length - 6}</span>` : ''}</div></div>`
    : '';

  const inclHtml = includes.length
    ? `<div class="glb-sec"><h3>Includes (${includes.length})</h3><div class="glb-pills">${includes.slice(0, 4).map((inc) => {
        const label = typeof inc === 'string' ? inc : (inc.project || inc.file || inc.template || 'remote');
        return `<span class="glb-pill">${esc(String(label).split('/').pop())}</span>`;
      }).join('')}</div></div>`
    : '';

  const sub = [
    stages.length ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : '',
    jobs.length ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}` : '',
    image ? image.split(':')[0].split('/').pop() : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'glb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="glb-title"><span class="badge-glb">GitLab CI</span>.gitlab-ci.yml</div>
<div class="glb-sub">${esc(sub) || 'GitLab CI/CD pipeline'}</div>
${stagesHtml}${jobsHtml}${varsHtml}${inclHtml}`;
  return { parentNode: host };
}
