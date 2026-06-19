const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rebar-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rebar{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a90533;color:#fff;vertical-align:middle;margin-right:8px}
.rebar-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rebar-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.rebar-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.rebar-meta strong{color:var(--fg,#24292f)}
.rebar-sec{margin:12px 0}
.rebar-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rebar-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px}
.rebar-item{display:flex;align-items:baseline;gap:8px;padding:3px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.rebar-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.rebar-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.rebar-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.rebar-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function extractTupleList(text, key) {
  // Match {key, [...]} block
  const re = new RegExp('\\{' + key + '\\s*,\\s*\\[([\\s\\S]*?)\\]\\s*\\}', 'i');
  const m = re.exec(text);
  return m ? m[1] : null;
}

function parseDeps(text) {
  const block = extractTupleList(text, 'deps');
  if (!block) return [];
  const deps = [];
  // {package_name, "version"} or {package_name, {git, ...}} or {package_name, Version, ...}
  const re = /\{([a-z][a-z0-9_]*)\s*,/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    deps.push(m[1]);
  }
  return deps;
}

function parseOtpVersion(text) {
  const m = /\{minimum_otp_vsn\s*,\s*"([^"]+)"\s*\}/.exec(text);
  return m ? m[1] : null;
}

function parsePlugins(text) {
  const block = extractTupleList(text, 'plugins');
  if (!block) return [];
  const plugins = [];
  const re = /([a-z][a-z0-9_]*)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1] !== 'git' && m[1] !== 'hex' && m[1] !== 'tag') plugins.push(m[1]);
  }
  return [...new Set(plugins)];
}

function parseProfiles(text) {
  const block = extractTupleList(text, 'profiles');
  if (!block) return [];
  // Profiles: {profile_name, [...]}
  const profiles = [];
  const re = /\{([a-z][a-z0-9_]*)\s*,\s*\[/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    profiles.push(m[1]);
  }
  return profiles;
}

function parseDialyzer(text) {
  const m = /\{dialyzer\s*,/i.exec(text);
  return !!m;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  const deps = parseDeps(text);
  const otpVersion = parseOtpVersion(text);
  const plugins = parsePlugins(text);
  const profiles = parseProfiles(text);
  const hasDialyzer = parseDialyzer(text);

  const host = document.createElement('div');
  host.className = 'rebar-doc';

  let html = `<style>${CSS}</style>
<div class="rebar-title"><span class="badge-rebar">Erlang/rebar3</span>rebar.config</div>
<div class="rebar-sub">rebar3 Erlang build configuration</div>`;

  if (otpVersion) {
    html += `<div class="rebar-meta">Minimum OTP version: <strong>${esc(otpVersion)}</strong></div>`;
  }

  if (hasDialyzer) {
    html += `<div class="rebar-meta">Dialyzer: <strong>configured</strong></div>`;
  }

  if (deps.length) {
    html += `<div class="rebar-sec"><h3>Dependencies (${deps.length})</h3><ul class="rebar-list">`;
    html += deps.map((d) => `<li class="rebar-item"><span class="rebar-name">${esc(d)}</span></li>`).join('');
    html += `</ul></div>`;
  }

  if (plugins.length) {
    html += `<div class="rebar-sec"><h3>Plugins</h3><div class="rebar-pills">`;
    html += plugins.map((p) => `<span class="rebar-pill">${esc(p)}</span>`).join('');
    html += `</div></div>`;
  }

  if (profiles.length) {
    html += `<div class="rebar-sec"><h3>Profiles</h3><div class="rebar-pills">`;
    html += profiles.map((p) => `<span class="rebar-pill">${esc(p)}</span>`).join('');
    html += `</div></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
