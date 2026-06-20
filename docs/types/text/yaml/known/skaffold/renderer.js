import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.skaffold-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.skaffold-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4285f4;color:#fff;vertical-align:middle;margin-right:8px;}
.skaffold-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.skaffold-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.skaffold-sec{margin:14px 0;}
.skaffold-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.skaffold-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.skaffold-table{width:100%;border-collapse:collapse;font-size:13px;}
.skaffold-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.skaffold-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.skaffold-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.skaffold-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.skaffold-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.skaffold-dim{font-size:11px;color:var(--fg-2,#888);}
`;

function artifactKind(a) {
  if (a.docker) return 'docker';
  if (a.jib) return 'jib';
  if (a.buildpacks) return 'buildpacks';
  if (a.ko) return 'ko';
  if (a.custom) return 'custom';
  return 'docker';
}

function shortImage(img) {
  if (!img) return '?';
  const parts = img.split('/');
  return parts.length > 2 ? '…/' + parts.slice(-2).join('/') : img;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const apiVersion = cfg.apiVersion || null;
  const metaName = (cfg.metadata && cfg.metadata.name) ? cfg.metadata.name : null;
  const build = cfg.build || {};
  const deploy = cfg.deploy || {};
  const profiles = Array.isArray(cfg.profiles) ? cfg.profiles : [];
  const portForward = Array.isArray(cfg.portForward) ? cfg.portForward : [];

  const artifacts = Array.isArray(build.artifacts) ? build.artifacts : [];
  const localBuild = build.local || null;
  const clusterBuild = build.cluster || null;

  const deployKubectl = deploy.kubectl || null;
  const deployHelm = deploy.helm || null;
  const deployKustomize = deploy.kustomize || null;
  const deployKind = deployHelm ? 'helm' : deployKustomize ? 'kustomize' : deployKubectl ? 'kubectl' : Object.keys(deploy)[0] || 'kubectl';

  // Build card
  const builderTypes = [...new Set(artifacts.map(artifactKind))];
  const localPush = localBuild && localBuild.push != null ? String(localBuild.push) : null;

  const buildCardHtml = (artifacts.length || localBuild || clusterBuild)
    ? `<div class="skaffold-sec"><h3>Build</h3><div class="skaffold-kv">
        <span class="skaffold-k">artifacts</span><span class="skaffold-v">${artifacts.length}</span>
        ${builderTypes.length ? `<span class="skaffold-k">builder</span><span class="skaffold-v">${builderTypes.map(esc).join(', ')}</span>` : ''}
        ${localPush !== null ? `<span class="skaffold-k">local.push</span><span class="skaffold-v">${esc(localPush)}</span>` : ''}
        ${clusterBuild ? `<span class="skaffold-k">build target</span><span class="skaffold-v">cluster</span>` : ''}
      </div></div>`
    : '';

  // Artifacts table
  const artifactsHtml = artifacts.length
    ? `<div class="skaffold-sec"><h3>Artifacts (${artifacts.length})</h3><table class="skaffold-table">
<thead><tr><th>Image</th><th>Context</th><th>Dockerfile</th></tr></thead>
<tbody>${artifacts.slice(0, 8).map((a) => {
  const img = a.image || '?';
  const ctx = a.context || '.';
  const df = (a.docker && a.docker.dockerfile) ? a.docker.dockerfile : '';
  return `<tr>
  <td><span class="skaffold-dim">${esc(shortImage(img))}</span></td>
  <td><span class="skaffold-dim">${esc(ctx)}</span></td>
  <td><span class="skaffold-dim">${esc(df)}</span></td>
</tr>`;
}).join('')}${artifacts.length > 8 ? `<tr><td colspan="3" class="skaffold-dim">…and ${artifacts.length - 8} more</td></tr>` : ''}
</tbody></table></div>`
    : '';

  // Deploy card
  const deployChips = [deployKind].map((k) => `<span class="skaffold-pill">${esc(k)}</span>`).join('');
  const helmReleasesHtml = deployHelm && Array.isArray(deployHelm.releases) && deployHelm.releases.length
    ? `<div style="margin-top:6px;font-size:13px;"><span class="skaffold-k" style="display:inline">helm releases: </span>${deployHelm.releases.map((r) => `<span class="skaffold-pill">${esc(r.name || r.chart || '?')}</span>`).join('')}</div>`
    : '';

  const deployHtml = `<div class="skaffold-sec"><h3>Deploy</h3><div class="skaffold-meta" style="display:flex;flex-wrap:wrap;gap:4px;">${deployChips}</div>${helmReleasesHtml}</div>`;

  // Profiles
  const profilesHtml = profiles.length
    ? `<div class="skaffold-sec"><h3>Profiles (${profiles.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${profiles.map((p) => `<span class="skaffold-pill">${esc(p.name || '?')}</span>`).join('')}</div></div>`
    : '';

  // Port forwards
  const portFwdHtml = portForward.length
    ? `<div class="skaffold-sec"><h3>Port Forwards</h3><table class="skaffold-table">
<thead><tr><th>Local port</th><th>Remote port</th><th>Resource</th></tr></thead>
<tbody>${portForward.map((pf) => `<tr>
  <td>${esc(String(pf.localPort || pf.port || ''))}</td>
  <td>${esc(String(pf.port || ''))}</td>
  <td><span class="skaffold-dim">${esc(pf.resourceName || '')}</span></td>
</tr>`).join('')}</tbody></table></div>`
    : '';

  const displayName = metaName || 'Skaffold config';

  const host = document.createElement('div');
  host.className = 'skaffold-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="skaffold-badge">Skaffold</span>
  <span class="skaffold-title">${esc(displayName)}</span>
  ${apiVersion ? `<span class="skaffold-pill">${esc(apiVersion)}</span>` : ''}
</div>
${buildCardHtml}${artifactsHtml}${deployHtml}${profilesHtml}${portFwdHtml}`;

  return { parentNode: host };
}
