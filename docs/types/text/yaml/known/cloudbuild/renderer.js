import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gcb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gcb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;vertical-align:middle;margin-right:8px;}
.gcb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gcb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gcb-sec{margin:12px 0;}
.gcb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gcb-step{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:5px 0;overflow:hidden;}
.gcb-step-hd{padding:6px 10px;background:var(--bg-2,#f6f8fa);display:flex;align-items:center;gap:8px;}
.gcb-step-num{font-size:11px;font-weight:700;color:var(--fg-2,#888);min-width:20px;}
.gcb-step-name{font:13px/1.4 ui-monospace,monospace;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gcb-step-img{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;}
.gcb-step-args{font:11px/1.4 ui-monospace,monospace;padding:4px 10px;border-top:1px solid var(--border,#e0e0e0);color:var(--fg-2,#666);white-space:pre-wrap;word-break:break-all;}
.gcb-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.gcb-key{font-size:12px;color:var(--fg-2,#888);}
.gcb-val{font:12px ui-monospace,monospace;color:var(--accent,#1a73e8);word-break:break-all;}
.gcb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gcb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gcb-pill.sub{background:#e8f0fe;border-color:#aecbfa;color:#1a73e8;}
`;

function stepName(step) {
  if (step.id) return step.id;
  if (step.name) {
    // Extract last part of image name e.g. gcr.io/cloud-builders/docker -> docker
    const img = String(step.name);
    return img.split('/').pop().split(':')[0];
  }
  return 'step';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  const substitutions = cfg.substitutions || {};
  const subKeys = Object.keys(substitutions);
  const timeout = cfg.timeout || '';
  const options = cfg.options || {};
  const images = Array.isArray(cfg.images) ? cfg.images : [];
  const artifacts = cfg.artifacts || null;
  const availableSecrets = cfg.availableSecrets || cfg.available_secrets || null;

  const machineType = options.machineType || options.machine_type || '';
  const logBucket = options.logsBucket || options.logs_bucket || '';

  const parts = [];
  parts.push(`${steps.length} step${steps.length !== 1 ? 's' : ''}`);
  if (timeout) parts.push(`timeout: ${timeout}`);
  if (images.length) parts.push(`${images.length} image${images.length !== 1 ? 's' : ''}`);

  const stepsHtml = steps.slice(0, 10).map((step, i) => {
    const name = stepName(step);
    const img = step.name ? String(step.name) : '';
    const args = Array.isArray(step.args) ? step.args.join(' ') : (step.args ? String(step.args) : '');
    const entrypoint = step.entrypoint ? `[${esc(step.entrypoint)}] ` : '';
    return `<div class="gcb-step">
  <div class="gcb-step-hd">
    <span class="gcb-step-num">${i + 1}</span>
    <span class="gcb-step-name">${esc(name)}</span>
    ${img ? `<span class="gcb-step-img">${esc(img)}</span>` : ''}
  </div>
  ${args ? `<div class="gcb-step-args">${entrypoint}${esc(args.slice(0, 120))}${args.length > 120 ? '…' : ''}</div>` : ''}
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'gcb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gcb-title"><span class="badge-gcb">Cloud Build</span>cloudbuild.yaml</div>
<div class="gcb-sub">${parts.join(' · ')}</div>

${steps.length ? `<div class="gcb-sec"><h3>Steps (${steps.length})</h3>${stepsHtml}${steps.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${steps.length - 10} more</div>` : ''}</div>` : ''}

${subKeys.length ? `<div class="gcb-sec"><h3>Substitutions</h3><div class="gcb-pills">${subKeys.slice(0, 8).map((k) => `<span class="gcb-pill sub">${esc(k)}</span>`).join('')}${subKeys.length > 8 ? `<span class="gcb-pill">+${subKeys.length - 8}</span>` : ''}</div></div>` : ''}

${images.length ? `<div class="gcb-sec"><h3>Published Images</h3><div class="gcb-pills">${images.slice(0, 5).map((img) => `<span class="gcb-pill">${esc(String(img))}</span>`).join('')}${images.length > 5 ? `<span class="gcb-pill">+${images.length - 5}</span>` : ''}</div></div>` : ''}

${timeout || machineType || logBucket ? `<div class="gcb-sec"><h3>Options</h3><div class="gcb-grid">
${timeout ? `<span class="gcb-key">Timeout</span><span class="gcb-val">${esc(timeout)}</span>` : ''}
${machineType ? `<span class="gcb-key">Machine type</span><span class="gcb-val">${esc(machineType)}</span>` : ''}
${logBucket ? `<span class="gcb-key">Logs bucket</span><span class="gcb-val">${esc(logBucket)}</span>` : ''}
</div></div>` : ''}

${availableSecrets ? `<div class="gcb-sec"><h3>Secrets</h3><div class="gcb-pills"><span class="gcb-pill">availableSecrets configured</span></div></div>` : ''}
`;
  return { parentNode: host };
}
