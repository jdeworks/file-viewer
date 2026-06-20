import { parseIni } from '../../renderer.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /PASSWORD|SECRET|TOKEN|KEY|PASS/i;

function maskEnvValue(key, value) {
  return SECRET_RE.test(key) ? '***' : value;
}

const CSS = `
.pq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#892CA0;color:#fff;vertical-align:middle;margin-right:8px;}
.pq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pq-sec{margin:14px 0;}
.pq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pq-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pq-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pq-kv-k{color:var(--fg-2,#888);min-width:140px;font-family:ui-monospace,monospace;flex-shrink:0;}
.pq-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pq-env-list{display:flex;flex-direction:column;gap:3px;margin:0;}
.pq-env-row{display:flex;gap:6px;align-items:baseline;font-size:12px;font-family:ui-monospace,monospace;}
.pq-env-key{color:var(--fg,#24292f);font-weight:600;}
.pq-env-val{color:var(--fg-2,#555);word-break:break-all;}
.pq-env-masked{color:#c2410c;font-style:italic;}
.pq-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pq-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pq-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8;margin-left:4px;font-family:ui-monospace,monospace;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="pq-kv"><span class="pq-kv-k">${esc(label)}</span><span class="pq-kv-v">${esc(value)}</span></div>`;
}

/** Build a section map: lowercased section name → array of {key,value} pairs (preserving duplicates). */
function buildSectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    if (!m[key]) m[key] = [];
    for (const p of s.pairs) m[key].push({ key: p.key, value: p.value });
  }
  return m;
}

/** Get all values for a given key (case-insensitive) from a pairs array. */
function allValues(pairs, keyName) {
  const k = keyName.toLowerCase();
  return pairs.filter((p) => p.key.toLowerCase() === k).map((p) => p.value);
}

/** Get first value for a given key, or fallback. */
function firstValue(pairs, keyName, fallback = '') {
  return allValues(pairs, keyName)[0] ?? fallback;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const sm = buildSectionMap(sections);

  const unitPairs = sm['unit'] || [];
  const containerPairs = sm['container'] || [];
  const podPairs = sm['pod'] || [];
  const kubePairs = sm['kube'] || [];
  const servicePairs = sm['service'] || [];
  const installPairs = sm['install'] || [];

  // [Unit]
  const description = firstValue(unitPairs, 'Description');

  // [Container]
  const image = firstValue(containerPairs, 'Image');
  const envLines = allValues(containerPairs, 'Environment');
  const volumes = allValues(containerPairs, 'Volume');
  const network = firstValue(containerPairs, 'Network') || firstValue(podPairs, 'Network');
  const ports = allValues(containerPairs, 'PublishPort');

  // [Pod]
  const podName = firstValue(podPairs, 'PodName');

  // [Kube]
  const kubeYaml = firstValue(kubePairs, 'Yaml');

  // [Service]
  const restart = firstValue(servicePairs, 'Restart');
  const timeoutStart = firstValue(servicePairs, 'TimeoutStartSec');

  // [Install]
  const wantedBy = firstValue(installPairs, 'WantedBy');

  // Determine unit type for subtitle
  const unitType = containerPairs.length ? 'Container' : podPairs.length ? 'Pod' : kubePairs.length ? 'Kube' : 'Network';
  const filename = (intake.name || intake.filename || '').split('/').pop();

  // Parse environment variables: KEY=VALUE per line
  const envVars = [];
  for (const line of envLines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim();
      envVars.push({ k, v: maskEnvValue(k, v), masked: SECRET_RE.test(k) });
    } else if (line.trim()) {
      envVars.push({ k: line.trim(), v: '', masked: false });
    }
  }

  // Build HTML sections
  const imageHtml = image ? `
<div class="pq-sec"><h3>Image</h3><div class="pq-card">
${kv('Image', image)}
</div></div>` : '';

  const envHtml = envVars.length ? `
<div class="pq-sec"><h3>Environment</h3><div class="pq-card">
<div class="pq-env-list">
${envVars.map((e) => `<div class="pq-env-row"><span class="pq-env-key">${esc(e.k)}</span><span>=</span>${e.masked ? `<span class="pq-env-masked">***</span>` : `<span class="pq-env-val">${esc(e.v)}</span>`}</div>`).join('')}
</div>
</div></div>` : '';

  const volumeHtml = volumes.length ? `
<div class="pq-sec"><h3>Volumes</h3><div class="pq-card">
<div class="pq-pills">
${volumes.map((v) => `<span class="pq-pill">${esc(v)}</span>`).join('')}
</div>
</div></div>` : '';

  const networkHtml = network ? `
<div class="pq-sec"><h3>Network</h3><div class="pq-card">
${kv('Network', network)}
</div></div>` : '';

  const portsHtml = ports.length ? `
<div class="pq-sec"><h3>Ports</h3><div class="pq-card">
<div class="pq-pills">
${ports.map((p) => `<span class="pq-pill">${esc(p)}</span>`).join('')}
</div>
</div></div>` : '';

  const kubeHtml = kubeYaml ? `
<div class="pq-sec"><h3>Kube YAML</h3><div class="pq-card">
${kv('Yaml', kubeYaml)}
</div></div>` : '';

  const podHtml = podName ? `
<div class="pq-sec"><h3>Pod</h3><div class="pq-card">
${kv('PodName', podName)}
</div></div>` : '';

  const serviceHtml = (restart || timeoutStart) ? `
<div class="pq-sec"><h3>Service</h3><div class="pq-card">
${kv('Restart', restart)}
${kv('TimeoutStartSec', timeoutStart)}
</div></div>` : '';

  const installHtml = wantedBy ? `
<div class="pq-sec"><h3>Install</h3><div class="pq-card">
${kv('WantedBy', wantedBy)}
</div></div>` : '';

  const subParts = [];
  if (image) subParts.push(image);
  if (network) subParts.push(`net: ${network}`);
  if (ports.length) subParts.push(`ports: ${ports.join(', ')}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'pq-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="pq-badge">Podman Quadlet</span>
  <span class="pq-title">${esc(description || filename)}</span>
  ${unitType ? `<span class="pq-tag">${esc(unitType)}</span>` : ''}
</div>
<div class="pq-sub">${esc(sub)}</div>
${imageHtml}${envHtml}${volumeHtml}${networkHtml}${portsHtml}${kubeHtml}${podHtml}${serviceHtml}${installHtml}`;

  return { parentNode: host };
}
