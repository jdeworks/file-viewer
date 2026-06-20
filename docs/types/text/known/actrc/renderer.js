// Enhanced .actrc viewer — parses act local GitHub Actions runner config.
// Shows: platform mappings (-P), secrets/env files, named options (--bind,
// --artifact-server-path, --container-architecture), and remaining flags.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.actrc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-actrc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e36209;color:#fff;vertical-align:middle;margin-right:8px;}
.actrc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.actrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.actrc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;}
.actrc-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.actrc-sec{margin:14px 0;}
.actrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.actrc-table{border-collapse:collapse;width:100%;margin:0 0 4px;}
.actrc-table th,.actrc-table td{text-align:left;padding:5px 10px;border-bottom:1px solid var(--border,#e0e0e0);}
.actrc-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.6;font-weight:600;}
.actrc-runner{color:var(--accent,#0969da);font-family:ui-monospace,monospace;font-size:12px;}
.actrc-image{font-family:ui-monospace,monospace;font-size:11px;word-break:break-all;opacity:.85;}
.actrc-kv{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0;}
.actrc-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.actrc-kv-item span:first-child{color:var(--fg-2,#888);}
.actrc-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.actrc-flag-list{list-style:none;margin:4px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.actrc-flag-item{font-family:ui-monospace,monospace;font-size:12px;padding:3px 8px;border-radius:5px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.actrc-empty{color:var(--fg-2,#888);font-style:italic;font-size:13px;}
`;

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);

  const platforms = [];   // { runner, image }
  let secretFile = null;
  let envFile = null;
  let bind = false;
  let artifactServerPath = null;
  let containerArch = null;
  const otherFlags = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Platform mapping: -P runner=image
    const platM = line.match(/^-P\s+(.+?)=(.+)$/);
    if (platM) {
      platforms.push({ runner: platM[1].trim(), image: platM[2].trim() });
      continue;
    }

    // --secret-file <path>
    const sfM = line.match(/^--secret-file(?:=|\s+)(.+)$/);
    if (sfM) { secretFile = sfM[1].trim(); continue; }

    // --env-file <path>
    const efM = line.match(/^--env-file(?:=|\s+)(.+)$/);
    if (efM) { envFile = efM[1].trim(); continue; }

    // --bind (boolean flag, no value)
    if (line === '--bind') { bind = true; continue; }

    // --artifact-server-path <path>
    const aspM = line.match(/^--artifact-server-path(?:=|\s+)(.+)$/);
    if (aspM) { artifactServerPath = aspM[1].trim(); continue; }

    // --container-architecture <arch>
    const caM = line.match(/^--container-architecture(?:=|\s+)(.+)$/);
    if (caM) { containerArch = caM[1].trim(); continue; }

    // Everything else
    otherFlags.push(line);
  }

  const totalFlags = platforms.length
    + (secretFile ? 1 : 0) + (envFile ? 1 : 0) + (bind ? 1 : 0)
    + (artifactServerPath ? 1 : 0) + (containerArch ? 1 : 0)
    + otherFlags.length;

  const kvItem = (label, val) => val != null
    ? `<div class="actrc-kv-item"><span>${esc(label)}</span><span>${esc(val)}</span></div>`
    : '';

  let html = `<style>${CSS}</style>
<div class="actrc-title"><span class="badge-actrc">act</span>act GitHub Actions runner</div>
<div class="actrc-sub">.actrc — local act runner configuration</div>
<div class="actrc-tags">
  ${platforms.length ? `<span class="actrc-tag">${platforms.length} platform mapping${platforms.length !== 1 ? 's' : ''}</span>` : ''}
  ${secretFile || envFile ? `<span class="actrc-tag">secrets/env files</span>` : ''}
  ${totalFlags ? `<span class="actrc-tag">${totalFlags} flag${totalFlags !== 1 ? 's' : ''} total</span>` : ''}
</div>`;

  // Platform mappings
  if (platforms.length) {
    html += `<div class="actrc-sec"><h3>Platform Mappings</h3>
<table class="actrc-table"><thead><tr><th>Runner Label</th><th>Container Image</th></tr></thead><tbody>`;
    for (const p of platforms) {
      html += `<tr><td><code class="actrc-runner">${esc(p.runner)}</code></td><td><code class="actrc-image">${esc(p.image)}</code></td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // Secrets / env files
  const hasSecretsEnv = secretFile || envFile;
  if (hasSecretsEnv) {
    html += `<div class="actrc-sec"><h3>Secrets &amp; Environment Files</h3><div class="actrc-kv">
      ${kvItem('Secret file', secretFile)}
      ${kvItem('Env file', envFile)}
    </div></div>`;
  }

  // Named options
  const hasOptions = bind || artifactServerPath || containerArch;
  if (hasOptions) {
    html += `<div class="actrc-sec"><h3>Options</h3><div class="actrc-kv">
      ${bind ? `<div class="actrc-kv-item"><span>Bind workdir</span><span>true</span></div>` : ''}
      ${kvItem('Container arch', containerArch)}
      ${kvItem('Artifact path', artifactServerPath)}
    </div></div>`;
  }

  // Other flags
  if (otherFlags.length) {
    html += `<div class="actrc-sec"><h3>Other Flags</h3><ul class="actrc-flag-list">`;
    for (const f of otherFlags) {
      html += `<li class="actrc-flag-item">${esc(f)}</li>`;
    }
    html += '</ul></div>';
  }

  if (!platforms.length && !hasSecretsEnv && !hasOptions && !otherFlags.length) {
    html += '<p class="actrc-empty">Empty config file.</p>';
  }

  const host = document.createElement('div');
  host.className = 'actrc-doc';
  host.innerHTML = html;
  return { parentNode: host };
}
