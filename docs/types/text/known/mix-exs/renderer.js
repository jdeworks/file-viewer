// Enhanced mix.exs view (parent pane, trusted DOM). Parses project config, deps with env
// restrictions, OTP application, and aliases.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mixexs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.mixexs-doc .mx-head{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.mixexs-doc .mx-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e4a7e;color:#fff;vertical-align:middle}
.mixexs-doc .mx-title{font-size:18px;font-weight:700;font-family:ui-monospace,monospace}
.mixexs-doc .mx-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.mixexs-doc .mx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.mixexs-doc .mx-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin-bottom:10px;overflow:hidden}
.mixexs-doc .mx-card-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#666)}
.mixexs-doc .mx-apps{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px}
.mixexs-doc .mx-app-chip{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.mixexs-doc .mx-mod{font-size:13px;padding:4px 12px 8px;color:var(--fg-2,#888)}
.mixexs-doc table{width:100%;border-collapse:collapse}
.mixexs-doc table tr{border-bottom:1px solid var(--border,#e8eaed)}
.mixexs-doc table tr:last-child{border-bottom:none}
.mixexs-doc table td{padding:5px 12px;vertical-align:middle;font-size:13px}
.mixexs-doc .mx-dep-name{font-family:ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.mixexs-doc .mx-ver{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888)}
.mixexs-doc .mx-env{display:inline-flex;padding:1px 7px;border-radius:8px;font-size:11px;font-family:ui-monospace,monospace;background:#ddf4ff;color:#0969da;border:1px solid #b6e3ff}
.mixexs-doc .mx-env.dev{background:#dafbe1;color:#116329;border-color:#aceebb}
.mixexs-doc .mx-env.test{background:#fff8c5;color:#9a6700;border-color:#e3b341}
.mixexs-doc .mx-rt-false{display:inline-flex;padding:1px 6px;border-radius:8px;font-size:11px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0)}
.mixexs-doc .mx-sec-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);padding:6px 12px 2px;background:var(--bg-2,#f6f8fa);border-top:1px solid var(--border,#e0e0e0)}
.mixexs-doc .mx-aliases{font-size:13px;padding:8px 12px;color:var(--fg-2,#888)}
.mixexs-doc .mx-empty{font-size:13px;color:var(--fg-2,#888);padding:8px 12px}
`;

function parseMixExs(text) {
  // App name
  const appMatch = /app:\s*:([a-z_][a-z0-9_]*)/i.exec(text);
  const appName = appMatch ? appMatch[1] : null;

  // Version
  const verMatch = /version:\s*"([^"]+)"/.exec(text);
  const version = verMatch ? verMatch[1] : null;

  // Elixir requirement
  const elixirMatch = /elixir:\s*"([^"]+)"/.exec(text);
  const elixirReq = elixirMatch ? elixirMatch[1] : null;

  // OTP extra_applications
  const otpApps = [];
  const extraAppsMatch = /extra_applications:\s*\[([^\]]*)\]/.exec(text);
  if (extraAppsMatch) {
    for (const m of extraAppsMatch[1].matchAll(/:([a-z_]+)/g)) otpApps.push(m[1]);
  }

  // OTP mod
  let otpMod = null;
  const modMatch = /mod:\s*\{([A-Z][^,}]+),/.exec(text);
  if (modMatch) otpMod = modMatch[1].trim();

  // Dependencies — parse {:name, "~> version", [options]} tuples
  const deps = [];
  const seenDeps = new Set();

  // Find deps function body (between defp deps do ... end)
  const depsFnMatch = /defp?\s+deps\s+do\s*([\s\S]*?)\n\s*end/m.exec(text);
  const depsScope = depsFnMatch ? depsFnMatch[1] : text;

  // Match {:name, "version", keyword: value, ...} or {:name, "version"}
  const depRe = /\{:([a-z_][a-z0-9_]*)\s*,\s*"([^"]*)"\s*((?:,\s*[^{}]+)?)\}/g;
  for (const m of depsScope.matchAll(depRe)) {
    const name = m[1];
    if (seenDeps.has(name)) continue;
    seenDeps.add(name);
    const ver = m[2];
    const opts = m[3] || '';
    // only: :dev / only: :test / only: [:dev, :test]
    let only = null;
    const onlyMatch = /only:\s*(?::([a-z_]+)|\[([^\]]+)\])/.exec(opts);
    if (onlyMatch) only = (onlyMatch[1] || onlyMatch[2]).replace(/[:'" ]/g, '').split(',').filter(Boolean).join(',');
    // runtime: false
    const runtimeFalse = /runtime:\s*false/.test(opts);
    deps.push({ name, ver, only, runtimeFalse });
  }
  // Also tuples with no version like {:dep, github: "..."}
  const depNoVerRe = /\{:([a-z_][a-z0-9_]*)\s*,\s*(?!")[^{}]+\}/g;
  for (const m of depsScope.matchAll(depNoVerRe)) {
    const name = m[1];
    if (seenDeps.has(name)) continue;
    seenDeps.add(name);
    deps.push({ name, ver: null, only: null, runtimeFalse: false });
  }

  // Aliases — look for defp aliases do ... end or aliases: [...]
  let aliasCount = 0;
  const aliasBlockMatch = /defp?\s+aliases\s+do([\s\S]*?)\n\s*end/m.exec(text);
  if (aliasBlockMatch) {
    aliasCount = (aliasBlockMatch[1].match(/"[^"]+"\s*=>/g) || []).length
      || (aliasBlockMatch[1].match(/[a-z_"]+:\s*\[/g) || []).length;
  }
  const aliasInlineMatch = /aliases:\s*aliases\(\)/.test(text);
  if (!aliasCount && aliasInlineMatch) aliasCount = 1; // at least referenced

  return { appName, version, elixirReq, otpApps, otpMod, deps, aliasCount };
}

function depRow(d) {
  const nameCell = `<span class="mx-dep-name">${esc(d.name)}</span>`;
  const verCell = d.ver ? `<span class="mx-ver">${esc(d.ver)}</span>` : '';
  let envCell = '';
  if (d.only) {
    const cls = d.only === 'dev' ? 'dev' : d.only === 'test' ? 'test' : '';
    envCell = `<span class="mx-env ${cls}">:${esc(d.only)}</span>`;
  }
  const rtCell = d.runtimeFalse ? `<span class="mx-rt-false">runtime: false</span>` : '';
  return `<tr><td>${nameCell}</td><td>${verCell}</td><td>${envCell}${rtCell ? ' ' + rtCell : ''}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const { appName, version, elixirReq, otpApps, otpMod, deps, aliasCount } = parseMixExs(text);

  const chips = [
    version ? `<span class="mx-chip">${esc(version)}</span>` : '',
    elixirReq ? `<span class="mx-chip">elixir ${esc(elixirReq)}</span>` : '',
  ].filter(Boolean).join(' ');

  const allEnvDeps = deps.filter((d) => !d.only);
  const devDeps = deps.filter((d) => d.only && d.only.includes('dev') && !d.only.includes('test'));
  const testDeps = deps.filter((d) => d.only && d.only.includes('test') && !d.only.includes('dev'));
  const otherDeps = deps.filter((d) => d.only && !devDeps.includes(d) && !testDeps.includes(d));
  const totalDeps = deps.length;

  // Application card
  const appCardHtml = (otpApps.length || otpMod) ? `<div class="mx-card">
<div class="mx-card-head">Application</div>
${otpApps.length ? `<div class="mx-apps">${otpApps.map((a) => `<span class="mx-app-chip">${esc(a)}</span>`).join('')}</div>` : ''}
${otpMod ? `<div class="mx-mod">OTP module: <code>${esc(otpMod)}</code></div>` : ''}
</div>` : '';

  // Dependencies card
  let depsBody = '';
  if (allEnvDeps.length) {
    depsBody += `<table>${allEnvDeps.map(depRow).join('')}</table>`;
  }
  if (devDeps.length) {
    depsBody += `<div class="mx-sec-label">Dev only</div><table>${devDeps.map(depRow).join('')}</table>`;
  }
  if (testDeps.length) {
    depsBody += `<div class="mx-sec-label">Test only</div><table>${testDeps.map(depRow).join('')}</table>`;
  }
  if (otherDeps.length) {
    depsBody += `<div class="mx-sec-label">Other env</div><table>${otherDeps.map(depRow).join('')}</table>`;
  }

  const depsCardHtml = totalDeps ? `<div class="mx-card">
<div class="mx-card-head">Dependencies <span class="mx-chip" style="font-size:11px">${totalDeps}</span></div>
${depsBody || '<div class="mx-empty">No dependencies.</div>'}
</div>` : '';

  // Aliases
  const aliasHtml = aliasCount ? `<div class="mx-card">
<div class="mx-card-head">Aliases <span class="mx-chip" style="font-size:11px">${aliasCount}</span></div>
<div class="mx-aliases">${aliasCount} alias${aliasCount !== 1 ? 'es' : ''} defined</div>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'mixexs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mx-head">
  <span class="mx-badge">Mix</span>
  <span class="mx-title">${esc(appName || 'mix.exs')}</span>
  ${chips}
</div>
<div class="mx-sub">Elixir Mix build configuration</div>
${appCardHtml}
${depsCardHtml}
${aliasHtml}
${!totalDeps && !otpApps.length ? '<div class="mx-empty">No deps or application config found.</div>' : ''}
`;
  return { parentNode: host };
}
