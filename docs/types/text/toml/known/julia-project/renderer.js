const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function scalar(text, key) {
  const m = new RegExp('^' + key + '\\s*=\\s*"?([^"\\n]+)"?', 'm').exec(text);
  return m ? m[1].trim() : null;
}

// Parse a TOML array value like ["Alice <a@b.com>", "Bob"]
function parseStringArray(text, key) {
  const m = new RegExp('^' + key + '\\s*=\\s*\\[([^\\]]*?)\\]', 'm').exec(text);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

// Extract section content between [section] and the next top-level [
function section(text, name) {
  const re = new RegExp('^\\[' + name.replace('.', '\\.') + '\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$)', 'm');
  const m = re.exec(text);
  return m ? m[1] : '';
}

function parseDeps(block) {
  const deps = [];
  for (const [, name, uuid] of block.matchAll(/^(\S+)\s*=\s*"([0-9a-f-]+)"/gm)) {
    deps.push({ name, uuid });
  }
  return deps;
}

function parseCompat(block) {
  const entries = [];
  for (const [, name, spec] of block.matchAll(/^(\S+)\s*=\s*"([^"]+)"/gm)) {
    entries.push({ name, spec });
  }
  return entries;
}

const CSS = `
.julia-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-julia{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9558B2;color:#fff;vertical-align:middle;margin-right:8px;}
.julia-title{font-size:20px;font-weight:700;margin:0 0 2px;}
.julia-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px;}
.julia-uuid{font:11px ui-monospace,monospace;color:var(--fg-2,#888);margin:0 0 14px;}
.julia-sec{margin:14px 0;}
.julia-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.julia-deps{list-style:none;margin:0;padding:0;}
.julia-deps li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:3px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.julia-dep-name{font:13px ui-monospace,monospace;color:var(--accent,#0969da);}
.julia-dep-uuid{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.julia-compat-spec{font:11px ui-monospace,monospace;color:var(--fg-2,#888);background:var(--bg-2,#f6f8fa);padding:1px 6px;border-radius:4px;}
`;

export function render(intake) {
  const t = intake.text || '';
  const name = scalar(t, 'name') || '(unnamed)';
  const version = scalar(t, 'version') || '';
  const uuid = scalar(t, 'uuid') || '';
  const authors = parseStringArray(t, 'authors');

  const depsBlock = section(t, 'deps');
  const compatBlock = section(t, 'compat');
  const extrasBlock = section(t, 'extras');

  const deps = parseDeps(depsBlock);
  const compat = parseCompat(compatBlock);
  const extras = parseCompat(extrasBlock);

  let depsHtml = '';
  if (deps.length) {
    const rows = deps.map((d) => {
      const compatEntry = compat.find((c) => c.name === d.name);
      return `<li>
        <span class="julia-dep-name">${esc(d.name)}</span>
        <span class="julia-dep-uuid">${esc(d.uuid.slice(0, 8))}…${compatEntry ? ` <span class="julia-compat-spec">${esc(compatEntry.spec)}</span>` : ''}</span>
      </li>`;
    }).join('');
    depsHtml = `<div class="julia-sec"><h3>Dependencies (${deps.length})</h3><ul class="julia-deps">${rows}</ul></div>`;
  }

  // compat entries not in deps (e.g. julia itself)
  const extraCompat = compat.filter((c) => !deps.find((d) => d.name === c.name));
  let compatHtml = '';
  if (extraCompat.length) {
    const rows = extraCompat.map((c) => `<li>
      <span class="julia-dep-name">${esc(c.name)}</span>
      <span class="julia-compat-spec">${esc(c.spec)}</span>
    </li>`).join('');
    compatHtml = `<div class="julia-sec"><h3>Compat (${extraCompat.length})</h3><ul class="julia-deps">${rows}</ul></div>`;
  }

  let extrasHtml = '';
  if (extras.length) {
    const pills = extras.map((e) => `<span style="display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px">${esc(e.name)}</span>`).join('');
    extrasHtml = `<div class="julia-sec"><h3>Extras (${extras.length})</h3>${pills}</div>`;
  }

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style>
<div class="julia-doc">
  <span class="badge-julia">Julia</span>
  <div class="julia-title">${esc(name)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2,#888);margin-left:8px">v${esc(version)}</span>` : ''}</div>
  ${authors.length ? `<div class="julia-meta">${authors.map(esc).join(', ')}</div>` : ''}
  ${uuid ? `<div class="julia-uuid">UUID: ${esc(uuid)}</div>` : ''}
  ${depsHtml}
  ${compatHtml}
  ${extrasHtml}
</div>`;
  return { parentNode: host };
}
