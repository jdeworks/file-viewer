import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gardenio-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gardenio{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7340;color:#fff;vertical-align:middle;margin-right:8px;}
.gardenio-kind{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-weight:600;margin-left:4px;vertical-align:middle;}
.gardenio-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gardenio-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gardenio-sec{margin:14px 0;}
.gardenio-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.gardenio-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.gardenio-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.gardenio-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:13px;}
.gardenio-kv-k{color:var(--fg-2,#888);min-width:150px;flex-shrink:0;}
.gardenio-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.gardenio-masked{color:var(--fg-2,#888);font-style:italic;}
.gardenio-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;}
.gardenio-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gardenio-count{font-size:12px;color:var(--fg-2,#888);margin-left:4px;}
`;

const SECRET_RE = /SECRET|TOKEN|KEY|PASSWORD/;

function masked() {
  return `<span class="gardenio-masked">[masked]</span>`;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="gardenio-kv"><span class="gardenio-kv-k">${esc(label)}</span><span class="gardenio-kv-v">${esc(String(value))}</span></div>`;
}

function renderProjectKind(cfg) {
  const envs = Array.isArray(cfg.environments) ? cfg.environments : [];
  const providers = Array.isArray(cfg.providers) ? cfg.providers : [];
  const defaultEnv = cfg.defaultEnvironment || '';

  const envsHtml = envs.length ? `
<div class="gardenio-sec"><h3>Environments (${envs.length})</h3>
${envs.map((e) => {
  const name = typeof e === 'string' ? e : (e.name || '');
  const vars = typeof e === 'object' && e.variables ? Object.keys(e.variables) : [];
  return `<div class="gardenio-card">
<div class="gardenio-card-name">${esc(name)}${name === defaultEnv ? ' <span class="gardenio-kind">default</span>' : ''}</div>
${vars.length ? `<div class="gardenio-kv"><span class="gardenio-kv-k">variables</span><span class="gardenio-pills">${vars.map((v) => {
  const val = e.variables[v];
  const hide = typeof val === 'string' && SECRET_RE.test(v);
  return `<span class="gardenio-pill">${esc(v)}=${hide ? '[masked]' : esc(String(val ?? ''))}</span>`;
}).join('')}</span></div>` : ''}
</div>`;
}).join('')}
</div>` : '';

  const providersHtml = providers.length ? `
<div class="gardenio-sec"><h3>Providers (${providers.length})</h3>
<div class="gardenio-pills">
${providers.map((p) => {
  const name = typeof p === 'string' ? p : (p.name || '');
  return `<span class="gardenio-pill">${esc(name)}</span>`;
}).join('')}
</div>
</div>` : '';

  return envsHtml + providersHtml;
}

function renderModuleKind(cfg) {
  const type = cfg.type || '';
  const description = cfg.description || '';
  const deps = Array.isArray(cfg.build?.dependencies) ? cfg.build.dependencies : [];
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const tasks = Array.isArray(cfg.tasks) ? cfg.tasks : [];
  const tests = Array.isArray(cfg.tests) ? cfg.tests : [];

  const countsHtml = [
    services.length ? `<span class="gardenio-pill">${services.length} service${services.length !== 1 ? 's' : ''}</span>` : '',
    tasks.length ? `<span class="gardenio-pill">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>` : '',
    tests.length ? `<span class="gardenio-pill">${tests.length} test suite${tests.length !== 1 ? 's' : ''}</span>` : '',
  ].filter(Boolean).join('');

  const depsHtml = deps.length ? `
<div class="gardenio-sec"><h3>Build Dependencies</h3>
<div class="gardenio-pills">
${deps.map((d) => {
  const name = typeof d === 'string' ? d : (d.name || '');
  return `<span class="gardenio-pill">${esc(name)}</span>`;
}).join('')}
</div>
</div>` : '';

  return `
<div class="gardenio-sec"><h3>Module Info</h3><div class="gardenio-card">
${kv('type', type)}
${description ? kv('description', description) : ''}
${countsHtml ? `<div class="gardenio-kv"><span class="gardenio-kv-k">components</span><span class="gardenio-pills">${countsHtml}</span></div>` : ''}
</div></div>
${depsHtml}`;
}

function renderWorkflowKind(cfg) {
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  return steps.length ? `
<div class="gardenio-sec"><h3>Steps (${steps.length})</h3>
${steps.map((s, i) => {
  const label = s.name || s.command || `Step ${i + 1}`;
  return `<div class="gardenio-card"><div class="gardenio-card-name">${esc(String(label))}</div>${s.script ? kv('script', s.script.slice(0, 80) + (s.script.length > 80 ? '…' : '')) : ''}</div>`;
}).join('')}
</div>` : '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const kind = cfg.kind || 'Project';
  const name = cfg.name || '';
  const apiVersion = cfg.apiVersion || '';

  const kindLabel = kind === 'Project' ? 'Garden project'
    : kind === 'Workflow' ? 'Garden workflow'
    : `Garden ${kind.toLowerCase()}`;

  let kindHtml = '';
  if (kind === 'Project') {
    kindHtml = renderProjectKind(cfg);
  } else if (kind === 'Module' || kind === 'Deploy' || kind === 'Build' || kind === 'Run' || kind === 'Test') {
    kindHtml = renderModuleKind(cfg);
  } else if (kind === 'Workflow') {
    kindHtml = renderWorkflowKind(cfg);
  }

  const sub = [
    name ? `name: ${name}` : '',
    apiVersion,
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'gardenio-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gardenio">Garden.io</span>
  <span class="gardenio-title">${esc(kindLabel)}</span>
  <span class="gardenio-kind">${esc(kind)}</span>
</div>
<div class="gardenio-sub">${esc(sub)}</div>
${name ? `<div style="margin-bottom:12px;">${kv('name', name)}</div>` : ''}
${kindHtml}`;
  return { parentNode: host };
}
