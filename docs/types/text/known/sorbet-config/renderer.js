const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sbt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sbt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C3AED;color:#fff;vertical-align:middle;margin-right:8px;}
.sbt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sbt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.sbt-sec{margin:12px 0;}
.sbt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sbt-chips{display:flex;flex-wrap:wrap;gap:6px;}
.sbt-chip{display:inline-flex;align-items:center;font:12px/1 ui-monospace,monospace;padding:4px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.sbt-chip.dir{background:#f3e8ff;border-color:#c4b5fd;color:#4c1d95;}
.sbt-chip.ignore{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.sbt-chip.exp{background:#ecfdf5;border-color:#6ee7b7;color:#064e3b;}
.sbt-empty{font-size:12px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const dirs = [];
  const ignores = [];
  const experimental = [];
  const other = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const dirMatch = line.match(/^--dir(?:=|\s+)(.+)$/);
    if (dirMatch) { dirs.push(dirMatch[1].trim()); continue; }

    const ignoreMatch = line.match(/^--ignore(?:=|\s+)(.+)$/);
    if (ignoreMatch) { ignores.push(ignoreMatch[1].trim()); continue; }

    if (line.startsWith('--enable-experimental-')) {
      experimental.push(line.replace(/^--enable-experimental-/, ''));
      continue;
    }

    other.push(line);
  }

  const parts = [];
  if (dirs.length) parts.push(`${dirs.length} source dir${dirs.length !== 1 ? 's' : ''}`);
  if (ignores.length) parts.push(`${ignores.length} ignore pattern${ignores.length !== 1 ? 's' : ''}`);
  const subtitle = parts.length ? parts.join(' · ') : 'Sorbet type checker configuration';

  const dirsHtml = dirs.length
    ? `<div class="sbt-sec"><h3>Source Dirs (--dir)</h3><div class="sbt-chips">${dirs.map((d) => `<span class="sbt-chip dir">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const ignoresHtml = ignores.length
    ? `<div class="sbt-sec"><h3>Ignore Patterns (--ignore)</h3><div class="sbt-chips">${ignores.map((i) => `<span class="sbt-chip ignore">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const expHtml = experimental.length
    ? `<div class="sbt-sec"><h3>Experimental Features</h3><div class="sbt-chips">${experimental.map((e) => `<span class="sbt-chip exp">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const otherHtml = other.length
    ? `<div class="sbt-sec"><h3>Other Flags</h3><div class="sbt-chips">${other.map((f) => `<span class="sbt-chip">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const emptyHtml = (!dirs.length && !ignores.length && !experimental.length && !other.length)
    ? '<div class="sbt-empty">No flags found</div>'
    : '';

  const host = document.createElement('div');
  host.className = 'sbt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sbt-title"><span class="badge-sbt">Sorbet</span>Sorbet config</div>
<div class="sbt-sub">${esc(subtitle)}</div>
${dirsHtml}${ignoresHtml}${expHtml}${otherHtml}${emptyHtml}`;
  return { parentNode: host };
}
