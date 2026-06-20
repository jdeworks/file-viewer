import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sqlc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sqlc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1CA8DD;color:#fff;vertical-align:middle;margin-right:8px;}
.sqlc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sqlc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sqlc-sec{margin:12px 0;}
.sqlc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sqlc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.sqlc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.sqlc-db{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:10px 14px;background:var(--bg,#fff);}
.sqlc-db-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:6px;}
.sqlc-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.sqlc-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:120px;}
.sqlc-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
.sqlc-engine{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;background:#e8f4fd;color:#1CA8DD;border:1px solid #bee3f8;margin-left:6px;}
`;

const ENGINE_COLORS = {
  postgresql: '#336791',
  postgres: '#336791',
  mysql: '#4479A1',
  sqlite: '#003B57',
};

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const version = cfg.version != null ? String(cfg.version) : '';
  const sql = Array.isArray(cfg.sql) ? cfg.sql : [];

  const dbHtml = sql.slice(0, 6).map((db, i) => {
    const engine = db.engine || db.database?.engine || '';
    const queries = Array.isArray(db.queries)
      ? db.queries.join(', ')
      : (db.queries || '');
    const schema = Array.isArray(db.schema)
      ? db.schema.join(', ')
      : (db.schema || '');
    const pkgName = db.gen?.go?.package || db.gen?.go?.out || '';
    const outDir = db.gen?.go?.out || '';
    const plugins = Array.isArray(db.plugins) ? db.plugins.map((p) => p.name || p.wasm?.url?.split('/').pop() || 'plugin') : [];
    const overrides = Array.isArray(db.gen?.go?.overrides) ? db.gen.go.overrides.length : 0;

    const engineColor = ENGINE_COLORS[engine?.toLowerCase()] || '#1CA8DD';

    return `<div class="sqlc-db">
      <div class="sqlc-db-name">
        ${`DB ${i + 1}`}
        ${engine ? `<span class="sqlc-engine" style="background:${engineColor}15;color:${engineColor};border-color:${engineColor}40">${esc(engine)}</span>` : ''}
      </div>
      ${queries ? `<div class="sqlc-kv"><span class="sqlc-kv-k">queries</span><span class="sqlc-kv-v">${esc(queries)}</span></div>` : ''}
      ${schema ? `<div class="sqlc-kv"><span class="sqlc-kv-k">schema</span><span class="sqlc-kv-v">${esc(schema)}</span></div>` : ''}
      ${outDir ? `<div class="sqlc-kv"><span class="sqlc-kv-k">output</span><span class="sqlc-kv-v">${esc(outDir)}</span></div>` : ''}
      ${pkgName ? `<div class="sqlc-kv"><span class="sqlc-kv-k">package</span><span class="sqlc-kv-v">${esc(pkgName)}</span></div>` : ''}
      ${plugins.length ? `<div class="sqlc-kv"><span class="sqlc-kv-k">plugins</span><span class="sqlc-kv-v">${plugins.map(esc).join(', ')}</span></div>` : ''}
      ${overrides ? `<div class="sqlc-kv"><span class="sqlc-kv-k">overrides</span><span class="sqlc-kv-v">${overrides} type override${overrides !== 1 ? 's' : ''}</span></div>` : ''}
    </div>`;
  }).join('');

  const engines = [...new Set(sql.map((d) => d.engine || d.database?.engine).filter(Boolean))];

  const host = document.createElement('div');
  host.className = 'sqlc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sqlc-title"><span class="badge-sqlc">sqlc</span>SQL code generation</div>
<div class="sqlc-sub">${sql.length ? `${sql.length} database${sql.length !== 1 ? 's' : ''}` : 'Type-safe Go from SQL'}${version ? ` · v${esc(version)}` : ''}</div>

${engines.length ? `<div class="sqlc-sec"><h3>SQL Engine${engines.length !== 1 ? 's' : ''}</h3><div class="sqlc-pills">${engines.map((e) => `<span class="sqlc-pill">${esc(e)}</span>`).join('')}</div></div>` : ''}

${sql.length ? `<div class="sqlc-sec"><h3>Databases</h3>${dbHtml}${sql.length > 6 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${sql.length - 6} more</div>` : ''}</div>` : ''}
`;
  return { parentNode: host };
}
