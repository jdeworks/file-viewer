const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-fd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3b82f6;color:#fff;vertical-align:middle;margin-right:8px;}
.fd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fd-sec{margin:14px 0;}
.fd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.fd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.fd-card-name{font:700 13px/1.4 ui-monospace,monospace;margin-bottom:4px;}
.fd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.fd-kv-k{color:var(--fg-2,#888);min-width:100px;font-family:ui-monospace,monospace;}
.fd-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.fd-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;margin-left:4px;}
.fd-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
`;

/**
 * Parse <source>, <filter>, <match> blocks from Fluentd config.
 */
function parseFluentd(text) {
  const sources = [];
  const filters = [];
  const matches = [];

  // Remove line comments
  const cleaned = text.replace(/^\s*#.*$/gm, '');

  // Match top-level <source>, <filter pattern>, <match pattern> blocks
  const blockRe = /<(source|filter|match)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = blockRe.exec(cleaned)) !== null) {
    const blockType = m[1].toLowerCase();
    const pattern = m[2].trim();
    const body = m[3];
    const settings = extractFluentdSettings(body);
    const type = settings.find((s) => s.key === '@type' || s.key === 'type')?.val || '';

    if (blockType === 'source') {
      const port = settings.find((s) => s.key === 'port')?.val || '';
      const tag = settings.find((s) => s.key === 'tag')?.val || '';
      sources.push({ type, port, tag, settings });
    } else if (blockType === 'filter') {
      filters.push({ pattern, type, settings });
    } else if (blockType === 'match') {
      filters.push({ pattern, type, settings, isMatch: true });
      matches.push({ pattern, type, settings });
    }
  }

  return { sources, filters, matches };
}

function extractFluentdSettings(body) {
  const settings = [];
  const lineRe = /^\s*(@?[a-z_][a-z0-9_.-]*)\s+(.+?)(?:\s*#.*)?$/gim;
  let m;
  let count = 0;
  while ((m = lineRe.exec(body)) !== null && count < 8) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    // Skip sub-block headers
    if (key.startsWith('<')) continue;
    settings.push({ key, val });
    count++;
  }
  return settings;
}

export function render(intake) {
  const text = intake.text || '';
  const { sources, filters, matches } = parseFluentd(text);

  function kv(key, val) {
    if (!val) return '';
    return `<div class="fd-kv"><span class="fd-kv-k">${esc(key)}</span><span class="fd-kv-v">${esc(val)}</span></div>`;
  }

  const sourcesHtml = sources.length ? `
<div class="fd-sec"><h3>Sources (${sources.length})</h3>
${sources.map((s) => `<div class="fd-card">
<div class="fd-card-name">${esc(s.type || '(source)')}</div>
${s.port ? kv('port', s.port) : ''}
${s.tag ? kv('tag', s.tag) : ''}
${s.settings.filter((x) => !['@type', 'type', 'port', 'tag'].includes(x.key)).slice(0, 3).map((x) => kv(x.key, x.val)).join('')}
</div>`).join('')}
</div>` : '';

  const filtersHtml = filters.length ? `
<div class="fd-sec"><h3>Filters</h3>
${filters.map((f) => `<div class="fd-card">
<div class="fd-card-name">${esc(f.type || '(filter)')}</div>
${f.pattern ? kv('match', f.pattern) : ''}
${f.settings.filter((x) => !['@type', 'type'].includes(x.key)).slice(0, 3).map((x) => kv(x.key, x.val)).join('')}
</div>`).join('')}
</div>` : '';

  const matchesHtml = matches.length ? `
<div class="fd-sec"><h3>Outputs / Match Rules (${matches.length})</h3>
${matches.map((m) => `<div class="fd-card">
<div class="fd-card-name">${esc(m.type || '(output)')}</div>
${m.pattern ? kv('pattern', m.pattern) : ''}
${m.settings.filter((x) => !['@type', 'type'].includes(x.key)).slice(0, 3).map((x) => kv(x.key, x.val)).join('')}
</div>`).join('')}
</div>` : '';

  const parts = [];
  if (sources.length) parts.push(`${sources.length} source${sources.length !== 1 ? 's' : ''}`);
  if (filters.length) parts.push(`${filters.length} filter${filters.length !== 1 ? 's' : ''}`);
  if (matches.length) parts.push(`${matches.length} match${matches.length !== 1 ? 'es' : ''}`);
  const sub = parts.join(' · ');

  const host = document.createElement('div');
  host.className = 'fd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-fd">Fluentd</span>
  <span class="fd-title">Config</span>
  ${parts.length ? `<span class="fd-tag">${esc(sub)}</span>` : ''}
</div>
<div class="fd-sub">Log routing configuration</div>
${sourcesHtml}${filtersHtml}${matchesHtml}
${!sources.length && !matches.length ? '<div style="color:var(--fg-2,#888);font-size:13px;">No Fluentd blocks detected.</div>' : ''}`;

  return { parentNode: host };
}
