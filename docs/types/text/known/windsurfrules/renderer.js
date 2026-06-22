const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wsr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wsr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.wsr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wsr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wsr-section{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden;}
.wsr-section-header{padding:8px 12px;background:var(--bg-2,#f6f8fa);font-weight:600;font-size:13px;color:#0ea5e9;}
.wsr-section-body{padding:8px 12px;font-size:13px;line-height:1.6;color:var(--fg,#24292f);}
.wsr-para{margin:4px 0;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0);}
.wsr-para:last-child{border-bottom:none;}
`;

function parseSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('#')) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, '').trim(), lines: [] };
    } else if (current) {
      if (line.trim()) current.lines.push(line.trim());
    } else {
      if (line.trim()) {
        if (!current) current = { heading: 'Rules', lines: [] };
        current.lines.push(line.trim());
      }
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: 'Rules', lines: text.split('\n').map((l) => l.trim()).filter(Boolean) });
  }

  return sections;
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'wsr-doc';

  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseSections(text);

  const sectionsHtml = sections.map((s) => {
    const contentLines = s.lines.filter((l) => l);
    const bodyHtml = contentLines.map((l) => `<div class="wsr-para">${esc(l)}</div>`).join('');
    return `<div class="wsr-section">
  <div class="wsr-section-header">${esc(s.heading)}</div>
  ${bodyHtml ? `<div class="wsr-section-body">${bodyHtml}</div>` : ''}
</div>`;
  }).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="wsr-title"><span class="badge-wsr">Windsurf</span>.windsurfrules</div>
<div class="wsr-sub">${sections.length} rule section${sections.length !== 1 ? 's' : ''}</div>
${sectionsHtml || '<div style="color:var(--fg-2,#888);font-size:13px">No rules found</div>'}`;

  return { parentNode: host };
}
