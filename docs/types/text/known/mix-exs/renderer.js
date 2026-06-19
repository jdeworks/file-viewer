const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mix-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mix{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4b1664;color:#fff;vertical-align:middle;margin-right:8px}
.mix-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.mix-sec{margin:12px 0}
.mix-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.mix-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.mix-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.mix-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.mix-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.mix-pills{display:flex;flex-wrap:wrap;gap:6px}
.mix-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.mix-meta{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  // App name
  let appName = null;
  const appMatch = /app:\s*:([a-z_]+)/i.exec(text);
  if (appMatch) appName = appMatch[1];

  // Version
  let version = null;
  const verMatch = /version:\s*"([^"]+)"/.exec(text);
  if (verMatch) version = verMatch[1];

  // Elixir version requirement
  let elixirReq = null;
  const elixirMatch = /elixir:\s*"([^"]+)"/.exec(text);
  if (elixirMatch) elixirReq = elixirMatch[1];

  // Description
  let description = null;
  const descMatch = /description:\s*"([^"]+)"/.exec(text);
  if (descMatch) description = descMatch[1];

  // Extra applications / OTP applications
  const otpApps = [];
  const extraAppsMatch = /extra_applications:\s*\[([^\]]*)\]/.exec(text);
  if (extraAppsMatch) {
    for (const m of extraAppsMatch[1].matchAll(/:([a-z_]+)/g)) otpApps.push(m[1]);
  }
  const appsMatch = /applications:\s*\[([^\]]*)\]/.exec(text);
  if (appsMatch && !extraAppsMatch) {
    for (const m of appsMatch[1].matchAll(/:([a-z_]+)/g)) otpApps.push(m[1]);
  }

  // Dependencies — extract from deps/0 function: {:name, ...}
  const deps = [];
  const seenDeps = new Set();
  // Find the deps function body
  const depsFnMatch = /def\s+deps\s*(?:do|\()[^]*?(?:^\s*end|\]\s*\n\s*end)/m.exec(text);
  const depsScope = depsFnMatch ? depsFnMatch[0] : text;
  for (const m of depsScope.matchAll(/\{:([a-z_][a-z0-9_]*)\s*,\s*"([^"]+)"/g)) {
    if (!seenDeps.has(m[1])) { seenDeps.add(m[1]); deps.push({ name: m[1], ver: m[2] }); }
  }
  // Also catch tuples with no version string like {:dep, github: "..."}
  for (const m of depsScope.matchAll(/\{:([a-z_][a-z0-9_]*)\s*,/g)) {
    if (!seenDeps.has(m[1])) { seenDeps.add(m[1]); deps.push({ name: m[1], ver: null }); }
  }

  const metaHtml = [
    version ? `<div class="mix-meta">Version: <strong>${esc(version)}</strong></div>` : '',
    elixirReq ? `<div class="mix-meta">Elixir requirement: <strong>${esc(elixirReq)}</strong></div>` : '',
    description ? `<div class="mix-meta">${esc(description)}</div>` : '',
  ].join('');

  const depsHtml = deps.length
    ? `<div class="mix-sec"><h3>Dependencies (${deps.length})</h3><ul class="mix-list">${deps.map((d) => `<li class="mix-item"><span class="mix-name">${esc(d.name)}</span>${d.ver ? `<span class="mix-ver">${esc(d.ver)}</span>` : ''}</li>`).join('')}</ul></div>`
    : '';

  const otpHtml = otpApps.length
    ? `<div class="mix-sec"><h3>OTP Applications</h3><div class="mix-pills">${otpApps.map((a) => `<span class="mix-pill">${esc(a)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'mix-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mix-title"><span class="badge-mix">Elixir/Mix</span>${esc(appName || 'mix.exs')}</div>
<div class="mix-sub">Elixir Mix build configuration</div>
${metaHtml}${depsHtml}${otpHtml}`;
  return { parentNode: host };
}
