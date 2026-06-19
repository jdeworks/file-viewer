// Enhanced .cursorrules / .cursor/rules/*.mdc viewer.
// Shows a purple Cursor badge, rule count, and a structured preview of sections and content.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.cr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cr-sec{margin:12px 0;}
.cr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.cr-section-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;}
.cr-section-title{font-weight:600;font-size:13px;color:var(--fg,#24292f);margin:0 0 4px;}
.cr-section-body{font-size:12px;color:var(--fg-2,#888);white-space:pre-wrap;word-break:break-word;max-height:80px;overflow:hidden;}
.cr-preview{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 12px;font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto;color:var(--fg,#24292f);}
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

export async function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const sections = extractSections(text);

  const path = (intake.filename || '');
  const isMdc = path.split('/').pop().toLowerCase().endsWith('.mdc');
  const subLabel = isMdc ? '.mdc rule file' : '.cursorrules';

  let body = '';
  if (sections.length > 0) {
    const cards = sections.slice(0, 8).map((s) => {
      const content = s.lines.filter((l) => l.trim()).join('\n').trim();
      const preview = content.length > 200 ? content.slice(0, 200) + '…' : content;
      return `<div class="cr-section-card">
        <div class="cr-section-title">${esc(s.title)}</div>
        ${preview ? `<div class="cr-section-body">${esc(preview)}</div>` : ''}
      </div>`;
    }).join('');
    body = `<div class="cr-sec"><h3>Sections (${sections.length})</h3>${cards}</div>`;
    if (sections.length > 8) {
      body += `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">…and ${sections.length - 8} more section${sections.length - 8 !== 1 ? 's' : ''}</div>`;
    }
  } else {
    const preview = text.length > 600 ? text.slice(0, 600) + '…' : text;
    body = `<div class="cr-sec"><h3>Content</h3><div class="cr-preview">${esc(preview)}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'cr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cr-title"><span class="badge-cr">Cursor</span>${esc(subLabel)}</div>
<div class="cr-sub">${nonEmpty} non-empty line${nonEmpty !== 1 ? 's' : ''}${sections.length ? ` · ${sections.length} section${sections.length !== 1 ? 's' : ''}` : ''}</div>
${body}`;

  return { parentNode: host };
}
