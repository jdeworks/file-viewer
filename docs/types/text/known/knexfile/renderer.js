const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.knx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-knx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8650a;color:#fff;vertical-align:middle;margin-right:8px}
.knx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.knx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.knx-sec{margin:12px 0}
.knx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.knx-env{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin:6px 0;overflow:hidden}
.knx-env-hd{padding:7px 14px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px}
.knx-env-name{font-family:ui-monospace,monospace}
.knx-client-pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#fff3e0;color:#e65100;border:1px solid #ffcc80;font-family:ui-monospace,monospace}
.knx-rows{padding:6px 14px 8px}
.knx-row{display:flex;gap:8px;font-size:12px;padding:2px 0}
.knx-key{color:var(--fg-2,#888);min-width:90px;flex-shrink:0}
.knx-val{font-family:ui-monospace,monospace;word-break:break-all}
.knx-pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

// Extract the environments from knexfile text using regex
function parseKnexEnvironments(text) {
  const envs = [];

  // Look for top-level environment keys: development:, production:, test:, staging:
  const ENV_NAMES = ['development', 'production', 'test', 'staging', 'qa', 'local'];

  for (const envName of ENV_NAMES) {
    // Match `envName: {` or `envName = {` — grab up to 800 chars of content
    const re = new RegExp(
      `(?:^|[\\s,{])${envName}\\s*[:=]\\s*\\{([\\s\\S]{0,800}?)\\n\\s*\\}`,
      'm',
    );
    const m = re.exec(text);
    if (!m) continue;

    const block = m[1];

    const clientM = /client\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);
    const hostM = /host\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);
    const dbM = /database\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);
    const portM = /port\s*:\s*(\d+)/.exec(block);
    const migDirM = /directory\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);

    envs.push({
      name: envName,
      client: clientM ? clientM[1] : null,
      host: hostM ? hostM[1] : null,
      database: dbM ? dbM[1] : null,
      port: portM ? portM[1] : null,
      migrationDir: migDirM ? migDirM[1] : null,
    });
  }

  // Fallback: single-env file (no named environments)
  if (envs.length === 0) {
    const clientM = /client\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    const hostM = /host\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    const dbM = /database\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
    const portM = /port\s*:\s*(\d+)/.exec(text);
    if (clientM || hostM || dbM) {
      envs.push({
        name: 'default',
        client: clientM ? clientM[1] : null,
        host: hostM ? hostM[1] : null,
        database: dbM ? dbM[1] : null,
        port: portM ? portM[1] : null,
        migrationDir: null,
      });
    }
  }

  return envs;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = intake.name || 'knexfile.js';

  const envs = parseKnexEnvironments(text);
  const usesEnv = /process\.env\./.test(text);

  const envsHtml = envs.map((env) => {
    const rows = [
      env.client ? `<div class="knx-row"><span class="knx-key">client</span><span class="knx-val">${esc(env.client)}</span></div>` : '',
      env.host ? `<div class="knx-row"><span class="knx-key">host</span><span class="knx-val">${esc(env.host)}</span></div>` : '',
      env.database ? `<div class="knx-row"><span class="knx-key">database</span><span class="knx-val">${esc(env.database)}</span></div>` : '',
      env.port ? `<div class="knx-row"><span class="knx-key">port</span><span class="knx-val">${esc(env.port)}</span></div>` : '',
      env.migrationDir ? `<div class="knx-row"><span class="knx-key">migrations</span><span class="knx-val">${esc(env.migrationDir)}</span></div>` : '',
    ].filter(Boolean).join('');
    return `<div class="knx-env">
      <div class="knx-env-hd">
        <span class="knx-env-name">${esc(env.name)}</span>
        ${env.client ? `<span class="knx-client-pill">${esc(env.client)}</span>` : ''}
      </div>
      ${rows ? `<div class="knx-rows">${rows}</div>` : ''}
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'knx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="knx-title"><span class="badge-knx">Knex.js</span>${esc(name)}</div>
<div class="knx-sub">${envs.length ? `${envs.length} environment${envs.length !== 1 ? 's' : ''}` : 'Database configuration'}</div>
${envsHtml ? `<div class="knx-sec"><h3>Environments</h3>${envsHtml}</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No environment configuration extracted.</p>'}
${usesEnv ? '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#5d4037;margin-top:10px;">Uses <code>process.env</code> — actual connection values may vary.</div>' : ''}`;
  return { parentNode: host };
}
