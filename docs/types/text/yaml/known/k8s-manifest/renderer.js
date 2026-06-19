const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function topBlock(text, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(?:\\n|$)((?: {2,}.*(?:\\n|$))*)', 'm');
  const m = text.match(re);
  return m ? m[1] : '';
}

function metaField(block, field) {
  const m = block.match(new RegExp('^ {2}' + field + '\\s*:\\s*(.+)', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function parseLabels(block, indent = '    ') {
  const labelsBlock = block.match(/^ {2}labels\s*:\s*\n((?: {4}.+\n?)*)/m)?.[1] || '';
  return [...labelsBlock.matchAll(/^ {4}(\w[\w./\-]+)\s*:\s*(.+)/gm)].map(m => m[1] + '=' + m[2].trim().replace(/^['"]|['"]$/g, ''));
}

function parseContainers(specText) {
  // Find containers block
  const containersBlock = specText.match(/^ {8}containers\s*:\s*\n((?: {10,}.+\n?)*)/m)?.[1] || '';
  const containers = [];
  // Split on "- name:" entries
  const entries = containersBlock.split(/^ {10}-\s+/m).filter(Boolean);
  for (const entry of entries) {
    const name = (entry.match(/^name\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const image = (entry.match(/^image\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const ports = [...entry.matchAll(/containerPort\s*:\s*(\d+)/g)].map(m => m[1]);
    const cpuReq = (entry.match(/cpu\s*:\s*['"]?(\S+?)['"]?\s*\n.*requests/s) || entry.match(/requests[\s\S]*?cpu\s*:\s*['"]?(\S+?)['"]?/m) || [])[1] || '';
    const memLim = (entry.match(/limits[\s\S]*?memory\s*:\s*['"]?(\S+?)['"]?/m) || [])[1] || '';
    if (name || image) containers.push({ name, image, ports, cpuReq, memLim });
  }
  return containers;
}

function parsePorts(specText) {
  return [...specText.matchAll(/port\s*:\s*(\d+)/gi)].map(m => m[1]);
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="k8s-label">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

const KIND_COLOR = {
  Deployment: '#326CE5', Service: '#7B61FF', ConfigMap: '#F5A623', Secret: '#E53935',
  Ingress: '#00897B', Pod: '#6D4C41', StatefulSet: '#00838F', DaemonSet: '#546E7A',
  Job: '#558B2F', CronJob: '#EF6C00', Namespace: '#5E35B1', default: '#326CE5',
};

export async function render(intake) {
  const text = intake.text || '';
  const kind = topScalar(text, 'kind') || 'Resource';
  const apiVersion = topScalar(text, 'apiVersion') || '';
  const metaBlock = topBlock(text, 'metadata');
  const specBlock = topBlock(text, 'spec');
  const name = metaField(metaBlock, 'name') || '';
  const namespace = metaField(metaBlock, 'namespace') || '';
  const labels = parseLabels(metaBlock);
  const color = KIND_COLOR[kind] || KIND_COLOR.default;

  let kindDetails = '';
  if (kind === 'Deployment' || kind === 'StatefulSet' || kind === 'DaemonSet') {
    const replicas = topScalar(specBlock, 'replicas') || '';
    const containers = parseContainers(specBlock);
    kindDetails = `
${replicas ? `<div class="k8s-sec"><h3>Replicas</h3><span class="k8s-tag">${esc(replicas)}</span></div>` : ''}
${containers.length ? `<div class="k8s-sec"><h3>Containers (${containers.length})</h3>
<table class="k8s-table"><thead><tr><th>Name</th><th>Image</th><th>Ports</th><th>Mem limit</th></tr></thead>
<tbody>${containers.map(c => `<tr>
  <td><span class="k8s-mono">${esc(c.name)}</span></td>
  <td><span class="k8s-mono k8s-image">${esc(c.image)}</span></td>
  <td>${c.ports.length ? c.ports.map(p => `<span class="k8s-tag">${esc(p)}</span>`).join(' ') : '—'}</td>
  <td>${c.memLim ? `<span class="k8s-tag">${esc(c.memLim)}</span>` : '—'}</td>
</tr>`).join('')}</tbody></table></div>` : ''}`;
  } else if (kind === 'Service') {
    const svcType = topScalar(specBlock, 'type') || 'ClusterIP';
    const ports = parsePorts(specBlock);
    kindDetails = `<div class="k8s-sec"><h3>Service</h3>
<table class="k8s-table"><tbody>
${row('Type', svcType)}
${ports.length ? `<tr><td class="k8s-label">Ports</td><td>${ports.map(p => `<span class="k8s-tag">${esc(p)}</span>`).join(' ')}</td></tr>` : ''}
</tbody></table></div>`;
  } else if (kind === 'ConfigMap') {
    const dataBlock = topBlock(text, 'data');
    const keys = [...dataBlock.matchAll(/^ {2}([\w.\-/]+)\s*:/gm)].map(m => m[1]);
    kindDetails = keys.length ? `<div class="k8s-sec"><h3>Data keys (${keys.length})</h3>
<div class="k8s-tags">${keys.map(k => `<span class="k8s-tag">${esc(k)}</span>`).join('')}</div></div>` : '';
  } else if (kind === 'Secret') {
    const dataBlock = topBlock(text, 'data');
    const keys = [...dataBlock.matchAll(/^ {2}([\w.\-/]+)\s*:/gm)].map(m => m[1]);
    const sType = topScalar(specBlock, 'type') || '';
    kindDetails = `<div class="k8s-sec"><h3>Secret keys (values hidden)</h3>
<div class="k8s-tags">${keys.map(k => `<span class="k8s-tag">${esc(k)}</span>`).join('')}</div>
${sType ? `<p style="font-size:12px;color:var(--fg-2)">Type: ${esc(sType)}</p>` : ''}</div>`;
  } else if (kind === 'Ingress') {
    const rulesBlock = specBlock.match(/^ {2}rules\s*:\s*\n((?: {4,}.+\n?)*)/m)?.[1] || '';
    const hosts = [...rulesBlock.matchAll(/host\s*:\s*(.+)/g)].map(m => m[1].trim().replace(/^['"]|['"]$/g, ''));
    kindDetails = hosts.length ? `<div class="k8s-sec"><h3>Hosts</h3>
<div class="k8s-tags">${hosts.map(h => `<span class="k8s-tag">${esc(h)}</span>`).join('')}</div></div>` : '';
  }

  const host = document.createElement('div');
  host.className = 'k8s-doc';
  host.innerHTML = `<style>
.k8s-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-k8s{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.k8s-kind{font-size:19px;font-weight:700;margin:0;}
.k8s-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.k8s-sec{margin:14px 0;}
.k8s-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.k8s-table{width:100%;border-collapse:collapse;font-size:13px;}
.k8s-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--border,#e0e0e0);padding:4px 10px 4px 0;}
.k8s-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.k8s-label{color:var(--fg-2,#888);font-size:12.5px;white-space:nowrap;}
.k8s-mono{font:12px ui-monospace,monospace;}
.k8s-image{color:var(--accent,#0969da);}
.k8s-tag{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);font-size:12px;margin:2px 2px 0 0;}
.k8s-tags{display:flex;flex-wrap:wrap;gap:4px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-k8s" style="background:${color}">Kubernetes</span>
  <span class="k8s-kind">${esc(kind)}</span>
</div>
<div class="k8s-api">${esc(apiVersion)}</div>
<div class="k8s-sec"><table class="k8s-table"><tbody>
${row('Name', name)}
${row('Namespace', namespace)}
${labels.length ? `<tr><td class="k8s-label">Labels</td><td class="k8s-tags">${labels.map(l => `<span class="k8s-tag">${esc(l)}</span>`).join('')}</td></tr>` : ''}
</tbody></table></div>
${kindDetails}`;

  return { parentNode: host };
}
