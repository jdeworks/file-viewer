const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.brc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-brc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.brc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.brc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.brc-sec{margin:12px 0;padding:10px 12px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.brc-sec-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.brc-phase{font:12px/1 ui-monospace,monospace;font-weight:700;padding:2px 8px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.brc-flags{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:2px}
.brc-flag{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);padding:2px 4px;border-radius:4px}
.brc-flag:hover{background:var(--bg-3,#e8ecf0)}
.brc-stat{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Group lines by config/command (phase): lines like `build --flag`
  // Bazel RC format: <phase> <flag>  or  # comment  or  import <path>
  const groups = new Map(); // phase -> flags[]
  const imports = [];
  let totalFlags = 0;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#')) continue;

    // import statement
    if (stripped.startsWith('import ') || stripped.startsWith('try-import ')) {
      imports.push(stripped);
      continue;
    }

    // phase flag line
    const m = /^([a-zA-Z][a-zA-Z0-9_:]*(?:\s+--[^\s].*)?|common|startup|build|test|run|clean|fetch|query|aquery|cquery|mobile-install|coverage|info|print_action|config|sync|version)(\s+.+)?$/.exec(stripped);
    if (m) {
      const parts = stripped.split(/\s+/);
      const phase = parts[0];
      const flag = parts.slice(1).join(' ');
      if (flag) {
        if (!groups.has(phase)) groups.set(phase, []);
        groups.get(phase).push(flag);
        totalFlags++;
      }
    }
  }

  const groupsHtml = [...groups.entries()]
    .map(([phase, flags]) => {
      const flagsHtml = flags.map((f) => `<li class="brc-flag">${esc(f)}</li>`).join('');
      return `<div class="brc-sec">
  <div class="brc-sec-head"><span class="brc-phase">${esc(phase)}</span><span style="font-size:12px;color:var(--fg-2,#888)">${flags.length} option${flags.length !== 1 ? 's' : ''}</span></div>
  <ul class="brc-flags">${flagsHtml}</ul>
</div>`;
    })
    .join('');

  const importsHtml = imports.length
    ? `<div class="brc-stat">${imports.length} import${imports.length !== 1 ? 's' : ''}: ${imports.map((i) => `<code>${esc(i)}</code>`).join(', ')}</div>`
    : '';

  const emptyHtml = groups.size === 0 ? '<div class="brc-stat">No option groups found</div>' : '';

  const host = document.createElement('div');
  host.className = 'brc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="brc-title"><span class="badge-brc">Bazel</span>.bazelrc</div>
<div class="brc-sub">${groups.size} command group${groups.size !== 1 ? 's' : ''}, ${totalFlags} flag${totalFlags !== 1 ? 's' : ''}</div>
${importsHtml}${groupsHtml}${emptyHtml}`;
  return { parentNode: host };
}
