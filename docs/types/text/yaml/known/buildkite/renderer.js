import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#30a660;color:#fff;vertical-align:middle;margin-right:8px;}
.bk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.bk-sec{margin:12px 0;}
.bk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.bk-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.bk-step{padding:6px 12px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;}
.bk-step-label{font-weight:600;}
.bk-step-cmd{font:11px ui-monospace,monospace;color:var(--fg-2,#888);margin-left:8px;}
.bk-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.bk-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.bk-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

function getStepLabel(step) {
  if (typeof step === 'string') return step;
  if (!step || typeof step !== 'object') return '?';
  return step.label || step.name || step.command || step.block || step.wait || step.trigger || '?';
}

function getStepType(step) {
  if (typeof step === 'string') return 'command';
  if (!step) return '?';
  if (step.wait != null || step === 'wait') return 'wait';
  if (step.block) return 'block';
  if (step.trigger) return 'trigger';
  if (step.group) return 'group';
  return 'command';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  const agents = cfg.agents || null;
  const env = cfg.env || cfg.environment || null;
  const envKeys = env ? Object.keys(env) : [];
  const notify = Array.isArray(cfg.notify) ? cfg.notify : [];

  const commandSteps = steps.filter((s) => getStepType(s) === 'command');
  const waitSteps = steps.filter((s) => getStepType(s) === 'wait');
  const blockSteps = steps.filter((s) => getStepType(s) === 'block');
  const triggerSteps = steps.filter((s) => getStepType(s) === 'trigger');

  const stepsHtml = steps.length
    ? `<div class="bk-sec"><h3>Steps (${steps.length})</h3>${steps.slice(0, 10).map((s) => {
        const label = getStepLabel(s);
        const type = getStepType(s);
        const cmd = typeof s === 'object' && s?.command ? String(s.command).slice(0, 60) : '';
        return `<div class="bk-step"><span class="bk-step-label">${esc(label)}</span>${type !== 'command' ? ` <span style="font-size:10px;background:var(--bg-3,#eee);border-radius:4px;padding:1px 5px;color:var(--fg-2,#888)">${esc(type)}</span>` : ''}${cmd ? `<span class="bk-step-cmd">${esc(cmd)}</span>` : ''}</div>`;
      }).join('')}${steps.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${steps.length - 10} more</div>` : ''}</div>`
    : '';

  const agentsHtml = agents
    ? `<div class="bk-sec"><h3>Agent tags</h3><div class="bk-kv">${Object.entries(agents).slice(0, 6).map(([k, v]) =>
        `<span class="bk-k">${esc(k)}</span><span class="bk-v">${esc(v)}</span>`
      ).join('')}</div></div>`
    : '';

  const envHtml = envKeys.length
    ? `<div class="bk-sec"><h3>Environment variables (${envKeys.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${envKeys.slice(0, 8).map((k) => `<span class="bk-pill">${esc(k)}</span>`).join('')}${envKeys.length > 8 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${envKeys.length - 8} more</span>` : ''}</div></div>`
    : '';

  const stepCounts = [
    commandSteps.length ? `${commandSteps.length} command${commandSteps.length !== 1 ? 's' : ''}` : '',
    waitSteps.length ? `${waitSteps.length} wait` : '',
    blockSteps.length ? `${blockSteps.length} block` : '',
    triggerSteps.length ? `${triggerSteps.length} trigger` : '',
  ].filter(Boolean).join(', ');

  const sub = steps.length
    ? `${steps.length} step${steps.length !== 1 ? 's' : ''} (${stepCounts || 'mixed'})`
    : 'Buildkite pipeline';

  const host = document.createElement('div');
  host.className = 'bk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bk-title"><span class="badge-bk">Buildkite</span>Pipeline</div>
<div class="bk-sub">${esc(sub)}</div>
${stepsHtml}${agentsHtml}${envHtml}`;

  return { parentNode: host };
}
