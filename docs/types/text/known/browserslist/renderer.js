const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.brl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-brl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fbbf24;color:#1c1917;vertical-align:middle;margin-right:8px;}
.brl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.brl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.brl-sec{margin:12px 0;}
.brl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.brl-pills{display:flex;flex-wrap:wrap;gap:6px;}
.brl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.brl-comment{font-size:12px;color:var(--fg-2,#888);font-style:italic;margin:4px 0;}
`;

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');

  const sections = [];
  let currentSection = { header: null, queries: [] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      if (currentSection.queries.length || currentSection.header) {
        sections.push(currentSection);
      }
      currentSection = { header: line.slice(1).trim(), queries: [] };
    } else {
      currentSection.queries.push(line);
    }
  }
  if (currentSection.queries.length || currentSection.header) sections.push(currentSection);

  const totalQueries = sections.reduce((n, s) => n + s.queries.length, 0);

  const secHtml = sections.map((s) => {
    const hdr = s.header ? `<div class="brl-comment"># ${esc(s.header)}</div>` : '';
    const pills = s.queries.map((q) => `<span class="brl-pill">${esc(q)}</span>`).join('');
    return `<div class="brl-sec">${hdr}<div class="brl-pills">${pills}</div></div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'brl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="brl-title"><span class="badge-brl">Browserslist</span>.browserslistrc</div>
<div class="brl-sub">${totalQueries} browser quer${totalQueries !== 1 ? 'ies' : 'y'}</div>
${secHtml || '<div style="color:var(--fg-2,#888);font-size:13px">No queries found</div>'}`;
  return { parentNode: host };
}
