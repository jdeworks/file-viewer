const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jst-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-jst{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e76f51;color:#fff;vertical-align:middle;margin-right:8px}
.jst-title{font-size:18px;font-weight:700;margin:0 0 4px}
.jst-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.jst-sec{margin:12px 0}
.jst-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.jst-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.jst-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.jst-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.jst-params{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.jst-pills{display:flex;flex-wrap:wrap;gap:6px}
.jst-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Parse variables: lines like `key := value` or `key := "value"` (not indented)
  const vars = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t') || line.startsWith('#')) continue;
    const m = /^([a-zA-Z_]\w*)\s*:?=\s*(.*)/.exec(line);
    if (m) vars.push({ name: m[1], val: m[2].trim() });
  }

  // Parse recipes: non-indented lines with `name ...:` where : is NOT followed by =
  const recipes = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t') || line.startsWith('#')) continue;
    // Skip variable assignments
    if (/^[a-zA-Z_]\w*\s*:?=/.test(line)) continue;
    const m = /^([a-zA-Z_][a-zA-Z0-9_-]*)((?:\s+\w+)*)\s*:(?!=)/.exec(line);
    if (m) recipes.push({ name: m[1], params: m[2].trim() });
  }

  const recipesHtml = recipes.length
    ? `<div class="jst-sec"><h3>Recipes (${recipes.length})</h3><ul class="jst-list">${recipes.map((r) => `<li class="jst-item"><span class="jst-name">${esc(r.name)}</span>${r.params ? `<span class="jst-params">${esc(r.params)}</span>` : ''}</li>`).join('')}</ul></div>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No recipes found</div>';

  const varsHtml = vars.length
    ? `<div class="jst-sec"><h3>Variables (${vars.length})</h3><div class="jst-pills">${vars.map((v) => `<span class="jst-pill">${esc(v.name)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'jst-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jst-title"><span class="badge-jst">just</span>Justfile</div>
<div class="jst-sub">${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}</div>
${recipesHtml}${varsHtml}`;
  return { parentNode: host };
}
