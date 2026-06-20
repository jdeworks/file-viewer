import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wpc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wpc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F5222D;color:#fff;vertical-align:middle;margin-right:8px;}
.wpc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wpc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.wpc-sec{margin:12px 0;}
.wpc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wpc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.wpc-step{padding:6px 12px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.wpc-step-name{font-weight:600;}
.wpc-step-img{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.wpc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.wpc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.wpc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

function secretName(s) {
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object') return s.source || s.name || JSON.stringify(s);
  return String(s);
}

function whenSummary(when) {
  if (!when) return null;
  const parts = [];
  if (when.branch) parts.push('branch: ' + [].concat(when.branch).join(', '));
  if (when.event) parts.push('event: ' + [].concat(when.event).join(', '));
  if (when.repo) parts.push('repo: ' + [].concat(when.repo).join(', '));
  if (when.status) parts.push('status: ' + [].concat(when.status).join(', '));
  if (when.path) parts.push('path: ' + [].concat(when.path?.include || when.path).join(', '));
  if (when.environment) parts.push('env: ' + [].concat(when.environment).join(', '));
  return parts.length ? parts.join(' | ') : null;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const name = cfg.name || (intake.filename || '').split('/').pop() || 'Pipeline';
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const matrix = cfg.matrix || null;
  const cloneCfg = cfg.clone || null;
  const pipelineWhen = cfg.when || null;

  // Collect all secrets across steps
  const allSecrets = [];
  const seenSecrets = new Set();
  for (const step of steps) {
    const sec = Array.isArray(step.secrets) ? step.secrets : [];
    for (const s of sec) {
      const n = secretName(s);
      if (!seenSecrets.has(n)) { seenSecrets.add(n); allSecrets.push(n); }
    }
  }

  // Steps section
  const stepsHtml = steps.length
    ? `<div class="wpc-sec"><h3>Steps (${steps.length})</h3>${steps.slice(0, 10).map((s) => {
        const sname = s.name || '?';
        const img = s.image || '';
        const cmds = Array.isArray(s.commands) ? s.commands.length : 0;
        const when = whenSummary(s.when);
        return `<div class="wpc-step">
          <span class="wpc-step-name">${esc(sname)}</span>
          ${img ? `<span class="wpc-step-img">${esc(img)}</span>` : ''}
          ${cmds ? `<span style="font-size:11px;color:var(--fg-2,#888)">${cmds} cmd${cmds !== 1 ? 's' : ''}</span>` : ''}
          ${when ? `<span style="font-size:11px;color:var(--fg-2,#888)">when: ${esc(when)}</span>` : ''}
        </div>`;
      }).join('')}${steps.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${steps.length - 10} more</div>` : ''}</div>`
    : '';

  // When conditions (pipeline-level)
  const pipelineWhenSummary = whenSummary(pipelineWhen);
  const whenHtml = pipelineWhenSummary
    ? `<div class="wpc-sec"><h3>Pipeline when</h3><div class="wpc-kv"><span class="wpc-k">conditions</span><span class="wpc-v">${esc(pipelineWhenSummary)}</span></div></div>`
    : '';

  // Matrix builds
  let matrixHtml = '';
  if (matrix && typeof matrix === 'object') {
    const axes = Object.entries(matrix)
      .filter(([k]) => k !== 'include' && k !== 'exclude')
      .map(([k, v]) => `<span class="wpc-k">${esc(k)}</span><span class="wpc-v">${esc(Array.isArray(v) ? v.join(', ') : String(v))}</span>`)
      .join('');
    if (axes) matrixHtml = `<div class="wpc-sec"><h3>Matrix builds</h3><div class="wpc-kv">${axes}</div></div>`;
  }

  // Secrets
  const secretsHtml = allSecrets.length
    ? `<div class="wpc-sec"><h3>Secrets used (${allSecrets.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${allSecrets.map((s) => `<span class="wpc-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  // Services (sidecar containers)
  const servicesHtml = services.length
    ? `<div class="wpc-sec"><h3>Services (${services.length})</h3>${services.slice(0, 8).map((s) => {
        const sname = s.name || '?';
        const img = s.image || '';
        return `<div class="wpc-step"><span class="wpc-step-name">${esc(sname)}</span>${img ? `<span class="wpc-step-img">${esc(img)}</span>` : ''}</div>`;
      }).join('')}</div>`
    : '';

  // Clone config
  let cloneHtml = '';
  if (cloneCfg && typeof cloneCfg === 'object') {
    const cloneEntries = Object.entries(cloneCfg)
      .map(([k, v]) => `<span class="wpc-k">${esc(k)}</span><span class="wpc-v">${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>`)
      .join('');
    if (cloneEntries) cloneHtml = `<div class="wpc-sec"><h3>Clone config</h3><div class="wpc-kv">${cloneEntries}</div></div>`;
  }

  const sub = [
    steps.length ? `${steps.length} step${steps.length !== 1 ? 's' : ''}` : '',
    matrix ? 'matrix build' : '',
    allSecrets.length ? `${allSecrets.length} secret${allSecrets.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'wpc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wpc-title"><span class="badge-wpc">Woodpecker CI</span>${esc(name)}</div>
<div class="wpc-sub">${esc(sub)}</div>
${stepsHtml}${servicesHtml}${whenHtml}${matrixHtml}${secretsHtml}${cloneHtml}`;

  return { parentNode: host };
}
