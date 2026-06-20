const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dvx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-dvx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5B6EE1;color:#fff;vertical-align:middle;margin-right:8px}
.dvx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dvx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.dvx-sec{margin:12px 0}
.dvx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.dvx-kv{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:3px 0}
.dvx-kv-key{font-weight:600;color:var(--fg-2,#888);min-width:120px}
.dvx-kv-val{font:13px/1.4 ui-monospace,monospace}
.dvx-pills{display:flex;flex-wrap:wrap;gap:6px}
.dvx-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.dvx-table{width:100%;border-collapse:collapse;font-size:13px}
.dvx-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.dvx-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.dvx-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.dvx-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all}
.dvx-hook-lines{font:12px/1.6 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-top:4px;white-space:pre-wrap;word-break:break-word}
.dvx-masked{font:13px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);letter-spacing:.05em}
`;

const SECRET_RE = /secret|key|token|password|pass/i;

function maskIfSecret(keyName, value) {
  return SECRET_RE.test(keyName) ? '****' : value;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    const host = document.createElement('div');
    host.className = 'dvx-doc';
    host.innerHTML = `<style>${CSS}</style><div class="dvx-title"><span class="badge-dvx">Devbox</span>devbox.json</div><div class="dvx-sub" style="color:#c0392b">Invalid JSON</div>`;
    return { parentNode: host };
  }

  // --- Devbox version ---
  const version = cfg.devbox_version || null;

  // --- Packages ---
  const pkgsRaw = cfg.packages;
  let pkgs = [];
  if (Array.isArray(pkgsRaw)) {
    pkgs = pkgsRaw.map(String);
  } else if (pkgsRaw && typeof pkgsRaw === 'object') {
    pkgs = Object.keys(pkgsRaw);
  }

  // --- Shell ---
  const shell = cfg.shell || {};

  // Init hooks
  let hooks = [];
  const initHook = shell.init_hook;
  if (typeof initHook === 'string') {
    hooks = initHook.split('\n').filter(Boolean);
  } else if (Array.isArray(initHook)) {
    hooks = initHook.flatMap((h) => String(h).split('\n')).filter(Boolean);
  }

  // Env vars
  const env = shell.env || {};
  const envEntries = Object.entries(env);

  // Scripts
  const scripts = shell.scripts || {};
  const scriptEntries = Object.entries(scripts);

  // --- Build HTML ---
  const versionHtml = version
    ? `<div class="dvx-sec"><h3>Version</h3><div class="dvx-kv"><span class="dvx-kv-key">devbox_version</span><span class="dvx-kv-val">${esc(version)}</span></div></div>`
    : '';

  const pkgsHtml = pkgs.length
    ? `<div class="dvx-sec"><h3>Packages (${pkgs.length})</h3><div class="dvx-pills">${pkgs.map((p) => `<span class="dvx-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const hooksHtml = hooks.length
    ? `<div class="dvx-sec"><h3>Shell init hooks (${hooks.length} line${hooks.length !== 1 ? 's' : ''})</h3><div class="dvx-hook-lines">${hooks.map((l) => esc(l)).join('\n')}</div></div>`
    : '';

  const envHtml = envEntries.length
    ? `<div class="dvx-sec"><h3>Env variables (${envEntries.length})</h3><table class="dvx-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>${
        envEntries
          .map(([k, v]) => {
            const display = maskIfSecret(k, v);
            const isMasked = display === '****';
            return `<tr><td><span class="dvx-name">${esc(k)}</span></td><td>${isMasked ? `<span class="dvx-masked">****</span>` : `<span class="dvx-kv-val">${esc(display)}</span>`}</td></tr>`;
          })
          .join('')
      }</tbody></table></div>`
    : '';

  const scriptsHtml = scriptEntries.length
    ? `<div class="dvx-sec"><h3>Scripts (${scriptEntries.length})</h3><table class="dvx-table"><thead><tr><th>Name</th><th>Command</th></tr></thead><tbody>${
        scriptEntries
          .map(([name, cmd]) => {
            const cmdStr = String(cmd ?? '');
            const truncated = cmdStr.length > 80 ? cmdStr.slice(0, 80) + '…' : cmdStr;
            return `<tr><td><span class="dvx-name">${esc(name)}</span></td><td><span class="dvx-cmd">${esc(truncated)}</span></td></tr>`;
          })
          .join('')
      }</tbody></table></div>`
    : '';

  const subParts = [];
  if (pkgs.length) subParts.push(`${pkgs.length} package${pkgs.length !== 1 ? 's' : ''}`);
  if (scriptEntries.length) subParts.push(`${scriptEntries.length} script${scriptEntries.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'dvx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dvx-title"><span class="badge-dvx">Devbox</span>devbox.json</div>
<div class="dvx-sub">${subParts.length ? esc(subParts.join(', ')) : 'Devbox project configuration'}</div>
${versionHtml}${pkgsHtml}${hooksHtml}${envHtml}${scriptsHtml}`;
  return { parentNode: host };
}
