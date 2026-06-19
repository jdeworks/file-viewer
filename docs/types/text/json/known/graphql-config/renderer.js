const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gql-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gql{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e10098;color:#fff;vertical-align:middle;margin-right:8px;}
.gql-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gql-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gql-sec{margin:12px 0;}
.gql-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gql-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.gql-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.gql-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.gql-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.gql-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
`;

function toArr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'gql-doc';
    host.innerHTML = `<style>${CSS}</style><div class="gql-title"><span class="badge-gql">GraphQL</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const schema = toArr(cfg.schema);
  const documents = toArr(cfg.documents);
  const extensions = cfg.extensions ? Object.keys(cfg.extensions) : [];
  const projects = cfg.projects ? Object.keys(cfg.projects) : [];

  const schemaHtml = schema.length
    ? `<div class="gql-sec"><h3>Schema (${schema.length})</h3><div class="gql-chip-list">${schema.map((s) => `<span class="gql-chip">${esc(typeof s === 'string' ? s : JSON.stringify(s))}</span>`).join('')}</div></div>`
    : '';

  const docsHtml = documents.length
    ? `<div class="gql-sec"><h3>Documents (${documents.length})</h3><div class="gql-chip-list">${documents.map((d) => `<span class="gql-chip">${esc(typeof d === 'string' ? d : JSON.stringify(d))}</span>`).join('')}</div></div>`
    : '';

  const extHtml = extensions.length
    ? `<div class="gql-sec"><h3>Extensions (${extensions.length})</h3><div class="gql-chip-list">${extensions.map((e) => `<span class="gql-chip">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const projHtml = projects.length
    ? `<div class="gql-sec"><h3>Projects (${projects.length})</h3><div class="gql-chip-list">${projects.map((p) => `<span class="gql-chip">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    schema.length ? `${schema.length} schema` : '',
    documents.length ? `${documents.length} documents` : '',
    projects.length ? `${projects.length} projects` : '',
  ].filter(Boolean).join(' · ') || 'GraphQL workspace config';

  const host = document.createElement('div');
  host.className = 'gql-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gql-title"><span class="badge-gql">GraphQL</span>GraphQL Config</div>
<div class="gql-sub">${esc(sub)}</div>
${schemaHtml}${docsHtml}${extHtml}${projHtml}`;

  return { parentNode: host };
}
