const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseListBlock(text, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(?:\\n|$)((?: {2,}.*\\n?)*)', 'm');
  const m = text.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/^\s+-\s+(.+)/gm)].map((r) => r[1].trim());
}

function parseNameValueList(text, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(?:\\n|$)((?: {2,}.*\\n?)*)', 'm');
  const m = text.match(re);
  if (!m) return [];
  const items = [];
  const block = m[1];
  const nameMatches = [...block.matchAll(/^\s+-\s*\n?\s+name\s*:\s*(.+)/gm)];
  if (nameMatches.length) {
    for (const nm of nameMatches) items.push(nm[1].trim());
  } else {
    // fallback: list items with dash
    return [...block.matchAll(/^\s+-\s+(.+)/gm)].map((r) => r[1].trim());
  }
  return items;
}

const CSS = `
.kust-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kust{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326ce5;color:#fff;vertical-align:middle;margin-right:8px;}
.kust-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.kust-sec{margin:12px 0;}
.kust-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kust-list{display:flex;flex-direction:column;gap:4px;}
.kust-item{font:12px ui-monospace,monospace;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.kust-item.patch{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.kust-item.gen{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.kust-ns{display:inline-block;padding:2px 8px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:12px;margin-bottom:8px;}
`;

export function render(intake) {
  const text = intake.text || '';
  const resources = parseListBlock(text, 'resources');
  const patches = parseListBlock(text, 'patchesStrategicMerge');
  const patches2 = parseListBlock(text, 'patches');
  const allPatches = [...patches, ...patches2];
  const cmGens = parseNameValueList(text, 'configMapGenerator');
  const secretGens = parseNameValueList(text, 'secretGenerator');
  const images = parseListBlock(text, 'images');
  const nsMatch = text.match(/^namespace\s*:\s*(.+)/m);
  const ns = nsMatch ? nsMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
  const nameMatch = text.match(/^namePrefix\s*:\s*(.+)/m);
  const prefix = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

  const host = document.createElement('div');
  host.className = 'kust-doc';

  const listHtml = (items, cls = '') => items.length
    ? `<div class="kust-list">${items.map((i) => `<span class="kust-item ${cls}">${esc(i)}</span>`).join('')}</div>`
    : '<span style="color:var(--fg-2,#888);font-size:12px">none</span>';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-kust">Kustomize</span>
  <span class="kust-title">kustomization overlay</span>
</div>
${ns ? `<span class="kust-ns">namespace: ${esc(ns)}</span>` : ''}
${prefix ? `<span class="kust-ns">prefix: ${esc(prefix)}</span>` : ''}
${resources.length ? `<div class="kust-sec"><h3>Resources (${resources.length})</h3>${listHtml(resources)}</div>` : ''}
${allPatches.length ? `<div class="kust-sec"><h3>Patches (${allPatches.length})</h3>${listHtml(allPatches, 'patch')}</div>` : ''}
${cmGens.length ? `<div class="kust-sec"><h3>ConfigMap generators (${cmGens.length})</h3>${listHtml(cmGens, 'gen')}</div>` : ''}
${secretGens.length ? `<div class="kust-sec"><h3>Secret generators (${secretGens.length})</h3>${listHtml(secretGens, 'gen')}</div>` : ''}
${images.length ? `<div class="kust-sec"><h3>Image overrides (${images.length})</h3>${listHtml(images)}</div>` : ''}`;

  return { parentNode: host };
}
