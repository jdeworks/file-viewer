const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pu-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.pu-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C0392B;color:#fff;vertical-align:middle;margin-right:8px}
.pu-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pu-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pu-sec{margin:14px 0}
.pu-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.pu-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.pu-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.pu-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;flex-shrink:0}
.pu-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.pu-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
`;

/** Extract the first match of a Ruby method call: method_name arg_or_expr */
function extractRubyVal(text, method) {
  const re = new RegExp(`^\\s*${method}\\s+(.+)$`, 'm');
  const m = text.match(re);
  if (!m) return null;
  // Strip string quotes and inline comments
  return m[1].trim().replace(/^['"]|['"]$|#.*$/g, '').trim();
}

function extractThreads(text) {
  // threads min_threads, max_threads   OR   threads 0, 16
  const m = text.match(/^\s*threads\s+(\S+),\s*(\S+)/m);
  if (m) return { min: m[1], max: m[2] };
  return null;
}

function extractPlugins(text) {
  const plugins = [];
  const re = /^\s*plugin\s+['"]?(\S+?)['"]?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) plugins.push(m[1]);
  return plugins;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'puma.rb';

  const workers = extractRubyVal(text, 'workers');
  const threads = extractThreads(text);
  const port = extractRubyVal(text, 'port') || extractRubyVal(text, 'bind');
  const environment = extractRubyVal(text, 'environment');
  const pidfile = extractRubyVal(text, 'pidfile');
  const statefile = extractRubyVal(text, 'state_path');
  const plugins = extractPlugins(text);
  const preload = /^\s*preload_app!/m.test(text) || /^\s*preload_app\s+true/m.test(text);
  const rackupFile = extractRubyVal(text, 'rackup');

  const generalRows = [];
  if (workers) generalRows.push(['workers', workers]);
  if (threads) generalRows.push(['threads', `min ${threads.min}, max ${threads.max}`]);
  if (port) generalRows.push(['port / bind', port]);
  if (environment) generalRows.push(['environment', environment]);
  if (rackupFile) generalRows.push(['rackup', rackupFile]);
  if (pidfile) generalRows.push(['pidfile', pidfile]);
  if (statefile) generalRows.push(['state_path', statefile]);
  generalRows.push(['preload_app', preload ? 'yes' : 'no']);

  const generalHtml = generalRows.length
    ? `<div class="pu-sec"><h3>Configuration</h3><div class="pu-card">${
        generalRows.map(([k, v]) => `<div class="pu-kv"><span class="pu-kv-k">${esc(k)}</span><span class="pu-kv-v">${esc(v)}</span></div>`).join('')
      }</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="pu-sec"><h3>Plugins (${plugins.length})</h3><div class="pu-card">
       <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">${plugins.map((p) => `<span class="pu-pill">${esc(p)}</span>`).join('')}</div>
       </div></div>`
    : '';

  const subParts = [];
  if (workers) subParts.push(`${workers} worker${workers === '1' ? '' : 's'}`);
  if (threads) subParts.push(`threads ${threads.min}–${threads.max}`);
  if (environment) subParts.push(environment);

  const host = document.createElement('div');
  host.className = 'pu-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="pu-badge">Puma</span>
  <span class="pu-title">${esc(filename)}</span>
</div>
<div class="pu-sub">${subParts.length ? esc(subParts.join(' · ')) : 'Puma web server configuration'}</div>
${generalHtml}${pluginsHtml}`;

  return { parentNode: host };
}
