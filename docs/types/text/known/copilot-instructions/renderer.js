// Enhanced copilot-instructions.md viewer for GitHub Copilot custom instructions.
// Shows a blue Copilot badge, instruction count, and section structure.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ci-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ci{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.ci-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ci-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ci-sec{margin:12px 0;}
.ci-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ci-section-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;}
.ci-section-title{font-weight:600;font-size:13px;color:var(--fg,#24292f);margin:0 0 4px;}
.ci-section-body{font-size:12px;color:var(--fg-2,#888);white-space:pre-wrap;word-break:break-word;max-height:80px;overflow:hidden;}
.ci-preview{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 12px;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
`;

function extractSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function countBullets(text) {
  return (text.match(/^[\s]*[-*+]\s+/mg) || []).length + (text.match(/^[\s]*\d+\.\s+/mg) || []).length;
}

export async function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const sections = extractSections(text);
  const bulletCount = countBullets(text);

  let body = '';
  if (sections.length > 0) {
    const cards = sections.slice(0, 8).map((s) => {
      const content = s.lines.filter((l) => l.trim()).join('\n').trim();
      const preview = content.length > 200 ? content.slice(0, 200) + '…' : content;
      return `<div class="ci-section-card">
        <div class="ci-section-title">${esc(s.title)}</div>
        ${preview ? `<div class="ci-section-body">${esc(preview)}</div>` : ''}
      </div>`;
    }).join('');
    body = `<div class="ci-sec"><h3>Sections (${sections.length})</h3>${cards}</div>`;
    if (sections.length > 8) {
      body += `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">…and ${sections.length - 8} more section${sections.length - 8 !== 1 ? 's' : ''}</div>`;
    }
  } else {
    const preview = text.length > 600 ? text.slice(0, 600) + '…' : text;
    body = `<div class="ci-sec"><h3>Instructions</h3><div class="ci-preview">${esc(preview)}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'ci-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ci-title"><span class="badge-ci">GitHub Copilot</span>copilot-instructions.md</div>
<div class="ci-sub">${nonEmpty} non-empty line${nonEmpty !== 1 ? 's' : ''}${bulletCount ? ` · ${bulletCount} instruction item${bulletCount !== 1 ? 's' : ''}` : ''}${sections.length ? ` · ${sections.length} section${sections.length !== 1 ? 's' : ''}` : ''}</div>
${body}`;

  return { parentNode: host };
}
