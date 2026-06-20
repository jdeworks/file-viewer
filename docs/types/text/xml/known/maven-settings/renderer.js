const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mvns-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mvns{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C71A36;color:#fff;vertical-align:middle;margin-right:8px}
.mvns-title{font-size:18px;font-weight:700;margin:0 0 14px;display:flex;align-items:center}
.mvns-sec{margin:14px 0}
.mvns-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.mvns-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.mvns-kv{display:flex;gap:8px;font-size:12px;margin:3px 0}
.mvns-key{color:var(--fg-2,#888);min-width:90px;flex-shrink:0}
.mvns-val{font-family:ui-monospace,monospace;font-weight:600;word-break:break-all}
.mvns-redacted{font-family:ui-monospace,monospace;color:var(--fg-2,#999)}
.mvns-table{width:100%;border-collapse:collapse;font-size:13px}
.mvns-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mvns-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.mvns-table tr:last-child td{border-bottom:none}
.mvns-pill{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:#dcfce7;border:1px solid #86efac;color:#166534}
.mvns-more{font-size:12px;color:var(--fg-2,#888);padding:4px 8px}
.mvns-err{color:#b91c1c;font-size:13px;padding:8px 0}
`;

function childText(el, tag) {
  if (!el) return '';
  for (const c of el.children) {
    if (c.tagName === tag || c.tagName.endsWith(':' + tag)) return (c.textContent || '').trim();
  }
  return '';
}

function childrenOf(el, parent, child) {
  if (!el) return [];
  const parentEl = el.querySelector(parent);
  if (!parentEl) return [];
  return [...parentEl.children].filter((c) => c.tagName === child || c.tagName.endsWith(':' + child));
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'mvns-doc';
    d.innerHTML = `<style>${CSS}</style><p class="mvns-err">Could not parse settings.xml as XML.</p>`;
    return { parentNode: d };
  }

  const root = doc.documentElement;

  // localRepository
  const localRepo = childText(root, 'localRepository');

  // mirrors (up to 5)
  const mirrors = childrenOf(root, 'mirrors', 'mirror').map((m) => ({
    id: childText(m, 'id'),
    name: childText(m, 'name'),
    url: childText(m, 'url'),
    mirrorOf: childText(m, 'mirrorOf'),
  }));

  // proxies
  const proxies = childrenOf(root, 'proxies', 'proxy').map((p) => ({
    host: childText(p, 'host'),
    port: childText(p, 'port'),
    protocol: childText(p, 'protocol') || 'http',
  }));

  // servers — show id only, NEVER username/password
  const servers = childrenOf(root, 'servers', 'server').map((s) => ({
    id: childText(s, 'id'),
    hasUsername: !!childText(s, 'username'),
    hasPassword: !!childText(s, 'password'),
  }));

  // profiles
  const activeProfileIds = new Set(
    [...(root.querySelector('activeProfiles')?.children || [])].map((el) => (el.textContent || '').trim()),
  );
  const profiles = childrenOf(root, 'profiles', 'profile').map((p) => ({
    id: childText(p, 'id'),
    active: activeProfileIds.has(childText(p, 'id')),
  }));

  // localRepository section
  const localRepoHtml = localRepo
    ? `<div class="mvns-sec"><h3>Local Repository</h3><div class="mvns-card">
<div class="mvns-kv"><span class="mvns-key">path</span><span class="mvns-val">${esc(localRepo)}</span></div>
</div></div>`
    : '';

  // mirrors section
  const SHOW_MIRRORS = 5;
  const mirrorsHtml = mirrors.length
    ? `<div class="mvns-sec"><h3>Mirrors (${mirrors.length})</h3><div class="mvns-card">
<table class="mvns-table"><thead><tr><th>ID</th><th>Name</th><th>URL</th><th>mirrorOf</th></tr></thead><tbody>
${mirrors.slice(0, SHOW_MIRRORS).map((m) => `<tr>
<td>${esc(m.id)}</td>
<td>${esc(m.name)}</td>
<td>${esc(m.url)}</td>
<td>${esc(m.mirrorOf)}</td>
</tr>`).join('')}
</tbody></table>
${mirrors.length > SHOW_MIRRORS ? `<div class="mvns-more">…and ${mirrors.length - SHOW_MIRRORS} more mirrors</div>` : ''}
</div></div>`
    : '';

  // proxies section
  const proxiesHtml = proxies.length
    ? `<div class="mvns-sec"><h3>Proxies (${proxies.length})</h3><div class="mvns-card">
<table class="mvns-table"><thead><tr><th>Protocol</th><th>Host</th><th>Port</th></tr></thead><tbody>
${proxies.map((p) => `<tr>
<td>${esc(p.protocol)}</td>
<td>${esc(p.host)}</td>
<td>${esc(p.port)}</td>
</tr>`).join('')}
</tbody></table>
</div></div>`
    : '';

  // servers section — id only, credentials shown as [configured]
  const serversHtml = servers.length
    ? `<div class="mvns-sec"><h3>Servers (${servers.length})</h3><div class="mvns-card">
<table class="mvns-table"><thead><tr><th>ID</th><th>Credentials</th></tr></thead><tbody>
${servers.map((s) => `<tr>
<td>${esc(s.id)}</td>
<td>${(s.hasUsername || s.hasPassword) ? '<span class="mvns-redacted">[configured]</span>' : '<span style="color:var(--fg-2,#888)">none</span>'}</td>
</tr>`).join('')}
</tbody></table>
</div></div>`
    : '';

  // profiles section
  const profilesHtml = profiles.length
    ? `<div class="mvns-sec"><h3>Profiles (${profiles.length})</h3><div class="mvns-card">
<table class="mvns-table"><thead><tr><th>ID</th><th>Status</th></tr></thead><tbody>
${profiles.map((p) => `<tr>
<td>${esc(p.id)}</td>
<td>${p.active ? '<span class="mvns-pill">active</span>' : '<span style="color:var(--fg-2,#888);font-size:12px">inactive</span>'}</td>
</tr>`).join('')}
</tbody></table>
</div></div>`
    : '';

  // activeProfiles section
  const activeProfilesHtml = activeProfileIds.size
    ? `<div class="mvns-sec"><h3>Active Profiles</h3><div class="mvns-card">
<div class="mvns-val" style="font-size:13px">${[...activeProfileIds].map((id) => esc(id)).join(', ')}</div>
</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'mvns-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mvns-title"><span class="badge-mvns">Maven Settings</span>settings.xml</div>
${localRepoHtml}
${mirrorsHtml}
${proxiesHtml}
${serversHtml}
${profilesHtml}
${activeProfilesHtml}`;

  return { parentNode: host };
}
