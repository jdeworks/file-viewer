const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isSafeHref = (href) => /^https?:\/\//i.test(String(href || ''));

function scalar(text, key) {
  const m = new RegExp('^' + key + ':\\s*(.+)', 'm').exec(text);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

// Parse a deps block from shard.yml:
// dependencies:
//   kemal:
//     github: kemalcr/kemal
//     version: ~> 1.0
//   redis:
//     git: https://github.com/stefanwille/crystal-redis.git
function parseDepsBlock(text, key) {
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp('^' + key + ':').test(l));
  if (startIdx < 0) return [];
  const deps = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.startsWith('  ') && l.trim()) break; // back to top-level
    const nameMatch = /^  (\S[^:]+):\s*$/.exec(l);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const props = {};
      i++;
      while (i < lines.length && /^    /.test(lines[i])) {
        const pm = /^    (\w+):\s*(.*)/.exec(lines[i]);
        if (pm) props[pm[1]] = pm[2].trim().replace(/^["']|["']$/g, '');
        i++;
      }
      deps.push({ name, ...props });
      continue;
    }
    i++;
  }
  return deps;
}

function depSource(dep) {
  if (dep.github) return { label: 'GitHub', url: 'https://github.com/' + dep.github, display: dep.github };
  if (dep.gitlab) return { label: 'GitLab', url: 'https://gitlab.com/' + dep.gitlab, display: dep.gitlab };
  if (dep.git) return { label: 'git', url: dep.git, display: dep.git.replace(/^https?:\/\//, '') };
  if (dep.path) return { label: 'path', url: null, display: dep.path };
  return null;
}

const CSS = `
.shard-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-shard{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px;}
.shard-title{font-size:20px;font-weight:700;margin:0 0 2px;}
.shard-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px;}
.shard-desc{color:var(--fg,#24292f);margin:4px 0 14px;}
.shard-sec{margin:14px 0;}
.shard-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.shard-deps{list-style:none;margin:0;padding:0;}
.shard-deps li{display:flex;align-items:baseline;gap:12px;padding:4px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.shard-dep-name{font:13px ui-monospace,monospace;color:var(--accent,#0969da);min-width:140px;}
.shard-dep-src{font-size:12px;color:var(--fg-2,#888);}
.shard-dep-ver{font:11px ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);border-radius:4px;padding:1px 6px;}
.shard-tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);margin-right:4px;}
`;

export function render(intake) {
  const t = intake.text || '';
  const name = scalar(t, 'name') || '(unnamed)';
  const version = scalar(t, 'version') || '';
  const description = scalar(t, 'description') || '';
  const license = scalar(t, 'license') || '';
  const crystal = scalar(t, 'crystal') || '';

  const deps = parseDepsBlock(t, 'dependencies');
  const devDeps = parseDepsBlock(t, 'development_dependencies');

  function renderDeps(list) {
    if (!list.length) return '';
    const rows = list.map((d) => {
      const src = depSource(d);
      // src.url may come straight from an untrusted shard.yml `git:` field — only wire it up
      // as a clickable link if it's http(s); otherwise render as inert text so a "javascript:"
      // URI can't execute in the page's origin when clicked.
      const srcHtml = src
        ? (src.url && isSafeHref(src.url)
          ? `<a class="shard-dep-src" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.label)}: ${esc(src.display)} ↗</a>`
          : `<span class="shard-dep-src">${esc(src.label)}: ${esc(src.display)}</span>`)
        : '';
      const ver = d.version || d.tag || d.branch || '';
      return `<li>
        <span class="shard-dep-name">${esc(d.name)}</span>
        ${srcHtml}
        ${ver ? `<span class="shard-dep-ver">${esc(ver)}</span>` : ''}
      </li>`;
    }).join('');
    return rows;
  }

  const meta = [
    version && `v${version}`,
    crystal && `crystal ${crystal}`,
    license,
  ].filter(Boolean).map((m) => `<span class="shard-tag">${esc(m)}</span>`).join('');

  let html = `<style>${CSS}</style>
<div class="shard-doc">
  <span class="badge-shard">Crystal</span>
  <div class="shard-title">${esc(name)}</div>
  ${meta ? `<div class="shard-meta">${meta}</div>` : ''}
  ${description ? `<div class="shard-desc">${esc(description)}</div>` : ''}`;

  if (deps.length) {
    html += `<div class="shard-sec"><h3>Dependencies (${deps.length})</h3><ul class="shard-deps">${renderDeps(deps)}</ul></div>`;
  }
  if (devDeps.length) {
    html += `<div class="shard-sec"><h3>Dev Dependencies (${devDeps.length})</h3><ul class="shard-deps">${renderDeps(devDeps)}</ul></div>`;
  }

  html += '</div>';
  const host = document.createElement('div');
  host.innerHTML = html;
  return { parentNode: host };
}
