import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderStep(step, idx) {
  const name = step.name || `Step ${idx + 1}`;
  const script = Array.isArray(step.script) ? step.script : [];
  const image = step.image?.name || step.image || null;
  return `<div class="bbp-step">
    <div class="bbp-step-header">
      <span class="bbp-step-name">${esc(name)}</span>
      ${image ? `<span class="bbp-step-image">${esc(image)}</span>` : ''}
      <span class="bbp-step-lines">${script.length} script line${script.length !== 1 ? 's' : ''}</span>
    </div>
    ${script.length ? `<div class="bbp-script">${script.slice(0, 3).map(l => `<code>${esc(String(l))}</code>`).join('')}${script.length > 3 ? `<code class="bbp-more">… ${script.length - 3} more</code>` : ''}</div>` : ''}
  </div>`;
}

function renderPipelineList(steps, label) {
  if (!steps || !steps.length) return '';
  const stepsHtml = steps.map((s, i) => {
    if (!s) return '';
    // step may be { step: {...} } or { parallel: [...] }
    if (s.step) return renderStep(s.step, i);
    if (s.parallel) return `<div class="bbp-parallel">Parallel group (${s.parallel.length} steps)</div>`;
    return '';
  }).filter(Boolean).join('');
  return `<div class="bbp-pipeline-group"><h3>${esc(label)}</h3>${stepsHtml}</div>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* ignore parse errors */ }

  const image = doc.image?.name || (typeof doc.image === 'string' ? doc.image : null);
  const pipelines = doc.pipelines || {};
  const defaultSteps = pipelines.default || [];
  const branchKeys = pipelines.branches ? Object.keys(pipelines.branches) : [];
  const prKeys = pipelines['pull-requests'] ? Object.keys(pipelines['pull-requests']) : [];
  const tagKeys = pipelines.tags ? Object.keys(pipelines.tags) : [];

  const host = document.createElement('div');
  host.className = 'bbp-doc';
  host.innerHTML = `<style>
.bbp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-bbp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0052cc;color:#fff;margin-right:8px;vertical-align:middle;}
.bbp-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.bbp-image-row{display:flex;align-items:center;gap:8px;margin:8px 0 14px;font-size:13px;color:var(--fg-2,#888);}
.bbp-image-val{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);padding:2px 8px;border-radius:4px;color:var(--fg,#333);}
.bbp-pipeline-group{margin:14px 0;}
.bbp-pipeline-group h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.bbp-step{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:6px;}
.bbp-step-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.bbp-step-name{font-weight:600;font-size:13px;}
.bbp-step-image{font:11px ui-monospace,monospace;background:var(--bg-3,#e8e8e8);padding:1px 6px;border-radius:3px;color:var(--fg-2,#666);}
.bbp-step-lines{font-size:11px;color:var(--fg-2,#888);margin-left:auto;}
.bbp-script{margin-top:6px;display:flex;flex-direction:column;gap:2px;}
.bbp-script code{font:11px ui-monospace,monospace;background:var(--bg-3,#e8e8e8);padding:1px 6px;border-radius:3px;display:block;color:var(--fg,#333);}
.bbp-script .bbp-more{color:var(--fg-2,#888);font-style:italic;}
.bbp-parallel{font-size:12px;color:var(--fg-2,#888);padding:4px 0;}
.bbp-branches{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.bbp-branch-tag{padding:2px 10px;border-radius:10px;font-size:12px;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);}
.bbp-sec{margin:12px 0;}
.bbp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-bbp">Bitbucket Pipelines</span>
  <span class="bbp-title">bitbucket-pipelines.yml</span>
</div>
${image ? `<div class="bbp-image-row"><span>Default image:</span><span class="bbp-image-val">${esc(image)}</span></div>` : ''}
${defaultSteps.length ? renderPipelineList(defaultSteps, `Default pipeline (${defaultSteps.length} step${defaultSteps.length !== 1 ? 's' : ''})`) : ''}
${branchKeys.length ? `<div class="bbp-sec"><h3>Branch triggers (${branchKeys.length})</h3><div class="bbp-branches">${branchKeys.map(k => `<span class="bbp-branch-tag">${esc(k)}</span>`).join('')}</div></div>` : ''}
${prKeys.length ? `<div class="bbp-sec"><h3>Pull-request triggers (${prKeys.length})</h3><div class="bbp-branches">${prKeys.map(k => `<span class="bbp-branch-tag">${esc(k)}</span>`).join('')}</div></div>` : ''}
${tagKeys.length ? `<div class="bbp-sec"><h3>Tag triggers (${tagKeys.length})</h3><div class="bbp-branches">${tagKeys.map(k => `<span class="bbp-branch-tag">${esc(k)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
