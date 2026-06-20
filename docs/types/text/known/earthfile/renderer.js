const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.earthfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-earthfile{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4e7df0;color:#fff;vertical-align:middle;margin-right:8px}
.earthfile-title{font-size:18px;font-weight:700;margin:0 0 4px}
.earthfile-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.earthfile-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.earthfile-item{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:8px 12px}
.earthfile-target{font:13px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f)}
.earthfile-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:600px}
`;

function parseEarthfile(text) {
  const lines = text.split('\n');
  const targets = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[A-Za-z][A-Za-z0-9_-]*:$/.test(line.trimEnd())) {
      const name = line.trim().slice(0, -1);
      let firstCmd = '';
      for (let j = i + 1; j < lines.length && j < i + 20; j++) {
        const cmd = lines[j];
        if (/^\s+\S/.test(cmd)) { firstCmd = cmd.trim(); break; }
        if (cmd.trim() && !/^\s/.test(cmd)) break;
      }
      targets.push({ name, firstCmd });
    }
  }
  return targets;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const targets = parseEarthfile(text);

  const items = targets
    .map((t) => `<li class="earthfile-item">
      <div class="earthfile-target">${esc(t.name)}:</div>
      ${t.firstCmd ? `<div class="earthfile-cmd">${esc(t.firstCmd)}</div>` : ''}
    </li>`)
    .join('');

  const body = targets.length
    ? `<ul class="earthfile-list">${items}</ul>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No targets found</div>';

  const host = document.createElement('div');
  host.className = 'earthfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="earthfile-title"><span class="badge-earthfile">Earthly</span>Earthfile</div>
<div class="earthfile-sub">${targets.length} target${targets.length !== 1 ? 's' : ''}</div>
${body}`;
  return { parentNode: host };
}
