import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.skf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-skf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;vertical-align:middle;margin-right:8px;}
.skf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.skf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.skf-sec{margin:12px 0;}
.skf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.skf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.skf-artifact{padding:6px 12px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.skf-artifact-name{font-weight:600;font-family:ui-monospace,monospace;}
.skf-artifact-kind{font-size:10px;background:var(--bg-3,#eee);border-radius:4px;padding:1px 5px;color:var(--fg-2,#888);}
.skf-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.skf-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.skf-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

function artifactKind(a) {
  if (a.docker) return 'docker';
  if (a.jib) return 'jib';
  if (a.buildpacks) return 'buildpacks';
  if (a.ko) return 'ko';
  if (a.custom) return 'custom';
  return 'docker';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const apiVersion = cfg.apiVersion || null;
  const build = cfg.build || {};
  const deploy = cfg.deploy || {};
  const test = cfg.test || [];
  const profiles = Array.isArray(cfg.profiles) ? cfg.profiles : [];
  const portForward = Array.isArray(cfg.portForward) ? cfg.portForward : [];

  const artifacts = Array.isArray(build.artifacts) ? build.artifacts : [];
  const tagPolicy = build.tagPolicy ? Object.keys(build.tagPolicy)[0] : null;
  const localBuild = build.local || null;
  const clusterBuild = build.cluster || null;

  const deployKubectl = deploy.kubectl || null;
  const deployHelm = deploy.helm || null;
  const deployKustomize = deploy.kustomize || null;
  const deployKind = deployHelm ? 'helm' : deployKustomize ? 'kustomize' : deployKubectl ? 'kubectl' : Object.keys(deploy)[0] || 'kubectl';

  const artifactsHtml = artifacts.length
    ? `<div class="skf-sec"><h3>Build artifacts (${artifacts.length})</h3>${artifacts.slice(0, 6).map((a) => {
        const img = a.image || '?';
        const kind = artifactKind(a);
        const ctx = a.context || a.docker?.dockerfile || '';
        return `<div class="skf-artifact"><span class="skf-artifact-name">${esc(img)}</span><span class="skf-artifact-kind">${esc(kind)}</span>${ctx ? `<span style="font-size:11px;color:var(--fg-2,#888)">${esc(ctx)}</span>` : ''}</div>`;
      }).join('')}${artifacts.length > 6 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${artifacts.length - 6} more</div>` : ''}</div>`
    : '';

  const deployHtml = `<div class="skf-sec"><h3>Deploy</h3><div class="skf-kv">
    <span class="skf-k">deployer</span><span class="skf-v">${esc(deployKind)}</span>
    ${deployHelm && Array.isArray(deployHelm.releases) ? `<span class="skf-k">helm releases</span><span class="skf-v">${deployHelm.releases.map((r) => esc(r.name || r.chart || '?')).join(', ')}</span>` : ''}
    ${portForward.length ? `<span class="skf-k">portForward</span><span class="skf-v">${portForward.length} rule${portForward.length !== 1 ? 's' : ''}</span>` : ''}
  </div></div>`;

  const buildSettingsHtml = (tagPolicy || localBuild || clusterBuild)
    ? `<div class="skf-sec"><h3>Build settings</h3><div class="skf-kv">
        ${tagPolicy ? `<span class="skf-k">tagPolicy</span><span class="skf-v">${esc(tagPolicy)}</span>` : ''}
        ${localBuild ? `<span class="skf-k">build target</span><span class="skf-v">local</span>` : ''}
        ${clusterBuild ? `<span class="skf-k">build target</span><span class="skf-v">cluster</span>` : ''}
      </div></div>`
    : '';

  const profilesHtml = profiles.length
    ? `<div class="skf-sec"><h3>Profiles (${profiles.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${profiles.map((p) => `<span class="skf-pill">${esc(p.name || '?')}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    apiVersion || '',
    artifacts.length ? `${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''}` : '',
    `deploy: ${deployKind}`,
    profiles.length ? `${profiles.length} profile${profiles.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'skf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="skf-title"><span class="badge-skf">Skaffold</span>Skaffold config</div>
<div class="skf-sub">${esc(sub)}</div>
${artifactsHtml}${buildSettingsHtml}${deployHtml}${profilesHtml}`;

  return { parentNode: host };
}
