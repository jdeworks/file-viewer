const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dockerignore-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dockerignore-doc .badge-docker{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d63ed;color:#fff;vertical-align:middle;margin-right:8px;}
.dockerignore-doc .di-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dockerignore-doc .di-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dockerignore-doc .di-sec{margin:12px 0;}
.dockerignore-doc .di-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.dockerignore-doc .di-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.dockerignore-doc .di-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  const lines = (intake.text || '').split(/\r?\n/);
  const sections = [];
  let current = { label: 'Patterns', patterns: [] };
  sections.push(current);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const label = line.replace(/^#+\s*/, '') || 'Patterns';
      if (current.patterns.length > 0 || sections.length === 1) {
        current = { label, patterns: [] };
        sections.push(current);
      } else {
        current.label = label;
      }
      continue;
    }
    current.patterns.push(line);
  }

  const nonEmpty = sections.filter((s) => s.patterns.length > 0);
  const totalPatterns = nonEmpty.reduce((n, s) => n + s.patterns.length, 0);

  const host = document.createElement('div');
  host.className = 'dig-doc dockerignore-doc';

  const sectionsHtml = nonEmpty.map((s) => `<div class="di-sec">
<h3>${esc(s.label)} (${s.patterns.length})</h3>
<ul class="di-pills" style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:5px">${s.patterns.slice(0, 12).map((p) => `<li class="kf-pat di-pill"><code>${esc(p)}</code></li>`).join('')}${s.patterns.length > 12 ? `<li class="di-pill">+${s.patterns.length - 12} more</li>` : ''}</ul>
</div>`).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="di-title"><span class="badge-docker">Docker</span>.dockerignore</div>
<div class="di-sub">${totalPatterns} pattern${totalPatterns !== 1 ? 's' : ''}${nonEmpty.length > 1 ? ` in ${nonEmpty.length} sections` : ''} · controls Docker build context exclusions</div>
${sectionsHtml || '<p style="color:var(--fg-2,#888);font-size:13px">No patterns found.</p>'}`;

  return { parentNode: host };
}
