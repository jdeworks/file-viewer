const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.drz-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-drz{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c5f74f;color:#1a2e05;vertical-align:middle;margin-right:8px}
.drz-title{font-size:18px;font-weight:700;margin:0 0 4px}
.drz-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.drz-sec{margin:12px 0}
.drz-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.drz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.drz-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.drz-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px}
.drz-card-val{font:13px/1.4 ui-monospace,monospace;word-break:break-all;font-weight:600}
.drz-dialect{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;font-family:ui-monospace,monospace}
.drz-dialect.pg{background:#e8f0fe;color:#1a73e8}
.drz-dialect.mysql{background:#fff3e0;color:#e65100}
.drz-dialect.sqlite{background:#e8f5e9;color:#2e7d32}
.drz-dialect.turso{background:#fce4ec;color:#880e4f}
.drz-dialect.other{background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.drz-warn{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#5d4037;margin-top:10px}
`;

function dialectClass(dialect) {
  if (!dialect) return 'other';
  const d = dialect.toLowerCase();
  if (d.includes('pg') || d.includes('postgres')) return 'pg';
  if (d.includes('mysql')) return 'mysql';
  if (d.includes('turso') || d.includes('libsql')) return 'turso';
  if (d.includes('sqlite')) return 'sqlite';
  return 'other';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = intake.name || 'drizzle.config.ts';

  // Extract dialect
  let dialect = null;
  const dialectM = /dialect\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (dialectM) dialect = dialectM[1];

  // Extract schema path(s)
  let schema = null;
  const schemaM = /\bschema\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (schemaM) schema = schemaM[1];
  if (!schema) {
    const schemaArrM = /\bschema\s*:\s*\[([^\]]+)\]/.exec(text);
    if (schemaArrM) schema = schemaArrM[1].replace(/['"`\s]/g, '').split(',').join(', ');
  }

  // Extract out dir
  let out = null;
  const outM = /\bout\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (outM) out = outM[1];

  // Extract migrations table name
  let migrationsTable = null;
  const mtM = /migrationsTable\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (mtM) migrationsTable = mtM[1];

  // Extract migration folder
  let migrationsFolder = null;
  const mfM = /(?:migrationsFolder|prefix)\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (mfM) migrationsFolder = mfM[1];

  // Detect driver / dbCredentials host
  let dbHost = null;
  const hostM = /host\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (hostM) dbHost = hostM[1];

  let dbName = null;
  const dbNameM = /database\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (dbNameM) dbName = dbNameM[1];

  // Check for env() usage
  const usesEnv = /process\.env\.|env\(/.test(text);

  const dcls = dialectClass(dialect);

  const cards = [
    dialect ? `<div class="drz-card"><div class="drz-card-label">Dialect</div><div class="drz-card-val"><span class="drz-dialect ${dcls}">${esc(dialect)}</span></div></div>` : '',
    schema ? `<div class="drz-card"><div class="drz-card-label">Schema</div><div class="drz-card-val">${esc(schema)}</div></div>` : '',
    out ? `<div class="drz-card"><div class="drz-card-label">Output dir</div><div class="drz-card-val">${esc(out)}</div></div>` : '',
    migrationsTable ? `<div class="drz-card"><div class="drz-card-label">Migrations table</div><div class="drz-card-val">${esc(migrationsTable)}</div></div>` : '',
    dbHost ? `<div class="drz-card"><div class="drz-card-label">DB host</div><div class="drz-card-val">${esc(dbHost)}</div></div>` : '',
    dbName ? `<div class="drz-card"><div class="drz-card-label">DB name</div><div class="drz-card-val">${esc(dbName)}</div></div>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'drz-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="drz-title"><span class="badge-drz">Drizzle</span>${esc(name)}</div>
<div class="drz-sub">Drizzle ORM configuration</div>
${cards ? `<div class="drz-sec"><h3>Settings</h3><div class="drz-grid">${cards}</div></div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No Drizzle settings extracted.</p>'}
${usesEnv ? '<div class="drz-warn">Uses environment variables for credentials — actual values not shown.</div>' : ''}`;
  return { parentNode: host };
}
