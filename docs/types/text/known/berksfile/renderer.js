const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.berksfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.berksfile-doc .badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e35b00;color:#fff;vertical-align:middle;margin-right:8px}
.berksfile-doc .bk-title{font-size:18px;font-weight:700;margin:0 0 4px}
.berksfile-doc .bk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.berksfile-doc .bk-sec{margin:12px 0}
.berksfile-doc .bk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.berksfile-doc .bk-source{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;font-family:ui-monospace,monospace;font-size:12px;margin-bottom:6px;word-break:break-all}
.berksfile-doc .bk-table{width:100%;border-collapse:collapse;font-size:13px}
.berksfile-doc .bk-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.berksfile-doc .bk-table td{padding:6px 8px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-size:13px}
.berksfile-doc .bk-table td.mono{font-family:ui-monospace,monospace;font-size:12px}
.berksfile-doc .bk-name{font-weight:600;color:var(--fg,#24292f)}
.berksfile-doc .bk-chip{display:inline-block;font-size:10px;padding:1px 7px;border-radius:8px;font-weight:600;margin-left:6px;vertical-align:middle}
.berksfile-doc .bk-chip-community{background:#e8f4e8;color:#276025;border:1px solid #b2d9b0}
.berksfile-doc .bk-chip-path{background:#fff3e0;color:#b26000;border:1px solid #f5c97a}
.berksfile-doc .bk-chip-git{background:#e8eaf6;color:#3949ab;border:1px solid #c5cae9}
`;

function parseBerksfile(text) {
  const lines = text.split('\n');
  const sources = [];
  const cookbooks = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    // Source line: source "https://..."
    {
      const m = line.match(/^source\s+["']([^"']+)["']/);
      if (m) { sources.push(m[1]); continue; }
    }

    // Cookbook line: cookbook "name" [, "version"] [, options...]
    {
      const m = line.match(/^cookbook\s+["']([^"']+)["'](.*)/);
      if (m && cookbooks.length < 20) {
        const name = m[1];
        const rest = m[2] || '';

        // Version constraint — first quoted string after name that looks like ~> 1.0 or >= 2
        let version = null;
        const verM = rest.match(/,\s*["']([^"']*(?:~>|>=|<=|>|<|=)[^"']*)["']/);
        if (verM) version = verM[1];

        // Source type
        let sourceType = 'community';
        let sourceDetail = null;

        const pathM = rest.match(/path:\s*["']([^"']+)["']/);
        if (pathM) { sourceType = 'path'; sourceDetail = pathM[1]; }

        const gitM = rest.match(/git:\s*["']([^"']+)["']/);
        if (gitM) { sourceType = 'git'; sourceDetail = gitM[1]; }

        const githubM = rest.match(/github:\s*["']([^"']+)["']/);
        if (githubM) { sourceType = 'git'; sourceDetail = `github:${githubM[1]}`; }

        cookbooks.push({ name, version, sourceType, sourceDetail });
        continue;
      }
    }
  }

  return { sources, cookbooks };
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const { sources, cookbooks } = parseBerksfile(text);

  const sub = [
    sources.length ? `${sources.length} source${sources.length !== 1 ? 's' : ''}` : '',
    cookbooks.length ? `${cookbooks.length} cookbook${cookbooks.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'Chef cookbook deps';

  // Sources section
  const sourcesHtml = sources.length ? `<div class="bk-sec"><h3>Sources</h3>
    ${sources.map((s) => `<div class="bk-source">${esc(s)}</div>`).join('')}</div>` : '';

  // Cookbooks section
  const chipHtml = (type) => {
    if (type === 'path') return `<span class="bk-chip bk-chip-path">path</span>`;
    if (type === 'git') return `<span class="bk-chip bk-chip-git">git</span>`;
    return `<span class="bk-chip bk-chip-community">community</span>`;
  };

  const cookbooksHtml = cookbooks.length ? `<div class="bk-sec"><h3>Cookbooks (${cookbooks.length})</h3>
    <table class="bk-table">
      <thead><tr><th>Name</th><th>Version</th><th>Source</th></tr></thead>
      <tbody>${cookbooks.map((c) => `<tr>
        <td><span class="bk-name">${esc(c.name)}</span>${chipHtml(c.sourceType)}</td>
        <td class="mono">${c.version ? esc(c.version) : '<span style="opacity:.5">any</span>'}</td>
        <td class="mono">${c.sourceDetail ? esc(c.sourceDetail) : ''}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '';

  const host = document.createElement('div');
  host.className = 'berksfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bk-title"><span class="badge">Berkshelf</span>Berksfile</div>
<div class="bk-sub">${esc(sub)}</div>
${sourcesHtml}${cookbooksHtml}`;
  return { parentNode: host };
}
