const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function parseTopLevelKeys(text) {
  // Get all top-level keys (no leading indent)
  return [...text.matchAll(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/gm)].map((m) => m[1]);
}

function parseSection(text, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(?:\\n|$)((?: {2,}.*\\n?)*)', 'm');
  const m = text.match(re);
  if (!m) return null;
  return m[1];
}

function extractKV(block, depth = 1) {
  const indent = '  '.repeat(depth);
  const re = new RegExp('^' + indent + '([a-zA-Z_][a-zA-Z0-9_-]*)\\s*:\\s*(.*)$', 'gm');
  const result = [];
  let m;
  while ((m = re.exec(block)) !== null && result.length < 10) {
    const val = m[2].trim().replace(/^['"]|['"]$/g, '');
    if (val && !val.startsWith('{') && !val.startsWith('[')) {
      result.push({ key: m[1], val });
    }
  }
  return result;
}

const CSS = `
.hv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f62fe;color:#fff;vertical-align:middle;margin-right:8px;}
.hv-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.hv-sec{margin:12px 0;}
.hv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hv-keys{display:flex;flex-wrap:wrap;gap:5px;}
.hv-key{font:12px ui-monospace,monospace;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.hv-table{width:100%;border-collapse:collapse;font-size:13px;}
.hv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.hv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.hv-mono{font:12px ui-monospace,monospace;}
`;

const KNOWN_SECTIONS = ['image', 'replicaCount', 'service', 'ingress', 'resources', 'autoscaling',
  'nodeSelector', 'tolerations', 'affinity', 'env', 'config', 'persistence', 'serviceAccount'];

export function render(intake) {
  const text = intake.text || '';
  const topKeys = parseTopLevelKeys(text);
  const unique = [...new Set(topKeys)];

  // Find known sections to show details for
  const detailSections = [];
  for (const key of KNOWN_SECTIONS) {
    if (!unique.includes(key)) continue;
    const block = parseSection(text, key);
    if (!block) continue;
    const kv = extractKV(block, 1);
    if (kv.length > 0) detailSections.push({ key, kv });
    if (detailSections.length >= 4) break;
  }

  // Image info special case
  const image = topScalar(text, 'image') || '';
  const tag = topScalar(text, 'tag') || '';
  const replicaCount = topScalar(text, 'replicaCount') || '';

  const host = document.createElement('div');
  host.className = 'hv-doc';

  const quickFacts = [
    replicaCount ? `replicas: ${replicaCount}` : '',
    tag ? `tag: ${tag}` : '',
    image && !image.includes('\n') ? `image: ${image}` : '',
  ].filter(Boolean);

  const detailHtml = detailSections.map(({ key, kv }) =>
    `<div class="hv-sec"><h3>${esc(key)}</h3><table class="hv-table">
<thead><tr><th>Key</th><th>Value</th></tr></thead>
<tbody>${kv.map((r) => `<tr><td><span class="hv-mono">${esc(r.key)}</span></td><td><span class="hv-mono">${esc(r.val)}</span></td></tr>`).join('')}</tbody>
</table></div>`
  ).join('');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-hv">Helm values</span>
  <span class="hv-title">values.yaml</span>
</div>
${quickFacts.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">${quickFacts.map((f) => `<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)">${esc(f)}</span>`).join('')}</div>` : ''}
${detailHtml}
<div class="hv-sec"><h3>All top-level keys (${unique.length})</h3><div class="hv-keys">
${unique.map((k) => `<span class="hv-key">${esc(k)}</span>`).join('')}
</div></div>`;

  return { parentNode: host };
}
