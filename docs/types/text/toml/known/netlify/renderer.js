const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tomlScalar(text, key) {
  const m = new RegExp(key + '\\s*=\\s*"?([^"\\n]+)"?').exec(text);
  return m ? m[1].trim() : null;
}

function countSections(text, header) {
  return (text.match(new RegExp('\\[\\[?' + header + '\\]\\]?', 'g')) || []).length;
}

export function render(intake) {
  const t = intake.text || '';
  const buildCmd = tomlScalar(t, 'command');
  const publish = tomlScalar(t, 'publish');
  const functions = tomlScalar(t, 'functions');
  const nodeVer = tomlScalar(t, 'NODE_VERSION') || tomlScalar(t, 'node_version');
  const redirects = countSections(t, 'redirects');
  const headers = countSections(t, 'headers');
  const edgeFunc = countSections(t, 'edge_functions');

  // Collect [[context.*]] or [context.*] contexts
  const ctxMatches = [...t.matchAll(/\[context\.([^\]]+)\]/g)];
  const contexts = [...new Set(ctxMatches.map((m) => m[1]))];

  // Env var names (values could be secrets)
  const envBlock = /\[build\.environment\]([\s\S]*?)(?=\[|\z)/m.exec(t);
  const envKeys = envBlock ? [...envBlock[1].matchAll(/^\s*(\w+)\s*=/mg)].map((m) => m[1]) : [];

  let html = `<style>
.ntl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif}
.badge-netlify{display:inline-block;background:#00AD9F;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px}
.ntl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:12px 0}
.ntl-key{color:var(--fg-2);font-size:12px}
.ntl-val{font:12px ui-monospace,monospace;color:var(--accent);word-break:break-all}
.ntl-sec{margin:12px 0}
.ntl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2);margin:0 0 6px}
.ntl-pill{display:inline-block;background:var(--bg-3);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px}
</style>
<div class="ntl-doc">
<span class="badge-netlify">Netlify Config</span>
<div class="ntl-grid">
${buildCmd ? `<span class="ntl-key">Build command</span><span class="ntl-val">${esc(buildCmd)}</span>` : ''}
${publish ? `<span class="ntl-key">Publish dir</span><span class="ntl-val">${esc(publish)}</span>` : ''}
${functions ? `<span class="ntl-key">Functions dir</span><span class="ntl-val">${esc(functions)}</span>` : ''}
${nodeVer ? `<span class="ntl-key">Node version</span><span class="ntl-val">${esc(nodeVer)}</span>` : ''}
${redirects ? `<span class="ntl-key">Redirects</span><span class="ntl-val">${redirects}</span>` : ''}
${headers ? `<span class="ntl-key">Custom headers</span><span class="ntl-val">${headers}</span>` : ''}
${edgeFunc ? `<span class="ntl-key">Edge functions</span><span class="ntl-val">${edgeFunc}</span>` : ''}
</div>`;

  if (contexts.length) {
    html += `<div class="ntl-sec"><h3>Deploy contexts</h3>${contexts.map((c) => `<span class="ntl-pill">${esc(c)}</span>`).join('')}</div>`;
  }
  if (envKeys.length) {
    html += `<div class="ntl-sec"><h3>Environment variables</h3>${envKeys.map((k) => `<span class="ntl-pill">${esc(k)}</span>`).join('')}</div>`;
  }

  html += '</div>';
  const host = document.createElement('div');
  host.innerHTML = html;
  return { parentNode: host };
}
