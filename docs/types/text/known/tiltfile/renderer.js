const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tlt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tlt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#20a147;color:#fff;vertical-align:middle;margin-right:8px}
.tlt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tlt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.tlt-sec{margin:12px 0}
.tlt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.tlt-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.tlt-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.tlt-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.tlt-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534}
.tlt-pills{display:flex;flex-wrap:wrap;gap:6px}
.tlt-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.tlt-badge-lu{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-weight:600}
`;

function extractArgs(line, fn) {
  // Extract first string argument from a function call on the same line
  const re = new RegExp(fn + '\\s*\\(\\s*["\']([^"\']+)["\']');
  const m = re.exec(line);
  return m ? m[1] : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // docker_build( calls — extract image name (first arg)
  const dockerImages = [];
  const seenImages = new Set();
  for (const line of lines) {
    if (!line.includes('docker_build(')) continue;
    const name = extractArgs(line, 'docker_build');
    if (name && !seenImages.has(name)) { seenImages.add(name); dockerImages.push(name); }
  }

  // k8s_yaml( calls — extract file/glob (first arg)
  const k8sYamls = [];
  for (const line of lines) {
    if (!line.includes('k8s_yaml(')) continue;
    const name = extractArgs(line, 'k8s_yaml');
    if (name) k8sYamls.push(name);
  }

  // k8s_resource( calls — extract workload name
  const k8sResources = [];
  const seenRes = new Set();
  for (const line of lines) {
    if (!line.includes('k8s_resource(')) continue;
    const name = extractArgs(line, 'k8s_resource');
    if (name && !seenRes.has(name)) { seenRes.add(name); k8sResources.push(name); }
  }

  // local_resource( calls
  const localResources = [];
  const seenLocal = new Set();
  for (const line of lines) {
    if (!line.includes('local_resource(')) continue;
    const name = extractArgs(line, 'local_resource');
    if (name && !seenLocal.has(name)) { seenLocal.add(name); localResources.push(name); }
  }

  // helm( calls
  const helmReleases = [];
  for (const line of lines) {
    if (!line.includes('helm(')) continue;
    const name = extractArgs(line, 'helm');
    if (name) helmReleases.push(name);
  }

  // live_update presence
  const hasLiveUpdate = lines.some((l) => l.includes('live_update=[') || l.includes('live_update ='));

  // load() and include()
  const loads = [];
  for (const line of lines) {
    if (!line.trimStart().startsWith('load(')) continue;
    const name = extractArgs(line, 'load');
    if (name) loads.push(name);
  }
  const includes = [];
  for (const line of lines) {
    if (!line.includes('include(')) continue;
    const name = extractArgs(line, 'include');
    if (name) includes.push(name);
  }

  const parts = [];
  if (dockerImages.length) parts.push(`${dockerImages.length} image${dockerImages.length !== 1 ? 's' : ''}`);
  if (k8sResources.length + k8sYamls.length > 0) parts.push('k8s');
  if (localResources.length) parts.push(`${localResources.length} local task${localResources.length !== 1 ? 's' : ''}`);
  if (hasLiveUpdate) parts.push('live update');

  const dockerHtml = dockerImages.length
    ? `<div class="tlt-sec"><h3>Docker images (${dockerImages.length})</h3><ul class="tlt-list">${dockerImages.map((img) => `<li class="tlt-item"><span class="tlt-name">${esc(img)}</span>${hasLiveUpdate ? `<span class="tlt-badge-lu">live update</span>` : ''}</li>`).join('')}</ul></div>`
    : '';

  const k8sHtml = (k8sYamls.length || k8sResources.length)
    ? `<div class="tlt-sec"><h3>Kubernetes</h3>
        ${k8sYamls.length ? `<div class="tlt-pills">${k8sYamls.map((f) => `<span class="tlt-pill">${esc(f)}</span>`).join('')}</div>` : ''}
        ${k8sResources.length ? `<ul class="tlt-list" style="margin-top:6px">${k8sResources.map((r) => `<li class="tlt-item"><span class="tlt-name">${esc(r)}</span><span class="tlt-kind">resource</span></li>`).join('')}</ul>` : ''}
      </div>`
    : '';

  const localHtml = localResources.length
    ? `<div class="tlt-sec"><h3>Local resources (${localResources.length})</h3><div class="tlt-pills">${localResources.map((r) => `<span class="tlt-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const helmHtml = helmReleases.length
    ? `<div class="tlt-sec"><h3>Helm (${helmReleases.length})</h3><div class="tlt-pills">${helmReleases.map((r) => `<span class="tlt-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = (loads.length || includes.length)
    ? `<div class="tlt-sec"><h3>Dependencies / Includes</h3><div class="tlt-pills">
        ${loads.map((l) => `<span class="tlt-pill">${esc(l)}</span>`).join('')}
        ${includes.map((i) => `<span class="tlt-pill">${esc(i)}</span>`).join('')}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'tlt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tlt-title"><span class="badge-tlt">Tilt</span>Tiltfile</div>
<div class="tlt-sub">${parts.length ? parts.join(' · ') : 'Tilt dev-loop config'}</div>
${dockerHtml}${k8sHtml}${localHtml}${helmHtml}${depsHtml}`;
  return { parentNode: host };
}
