// Enhanced CLAUDE.md viewer for Claude Code system prompts.
// Shows a teal badge, summary, and markdown section headers.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d9488;color:#fff;vertical-align:middle;margin-right:8px;}
.cm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cm-sec{margin:12px 0;}
.cm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.cm-summary{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 12px;font-size:13px;line-height:1.6;color:var(--fg,#24292f);white-space:pre-wrap;word-break:break-word;}
.cm-section-item{display:flex;align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.cm-section-item:last-child{border-bottom:none;}
.cm-section-level{font-size:10px;font-weight:700;color:var(--fg-2,#888);min-width:18px;}
.cm-section-name{font-size:13px;color:var(--fg,#24292f);}
`;

function extractHeaders(text) {
  const lines = text.split(/\r?\n/);
  const headers = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)$/);
    if (m) headers.push({ level: m[1].length, title: m[2].trim() });
  }
  return headers;
}

export async function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const headers = extractHeaders(text);

  const firstContent = lines.filter((l) => l.trim() && !l.startsWith('#')).slice(0, 6).join('\n').trim();
  const summary = firstContent.length > 300 ? firstContent.slice(0, 300) + '…' : firstContent;

  let sectionsHtml = '';
  if (headers.length > 0) {
    const items = headers.slice(0, 12).map((h) => {
      const prefix = '#'.repeat(h.level);
      return `<div class="cm-section-item">
        <span class="cm-section-level">${esc(prefix)}</span>
        <span class="cm-section-name">${esc(h.title)}</span>
      </div>`;
    }).join('');
    sectionsHtml = `<div class="cm-sec"><h3>Sections (${headers.length})</h3><div style="border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:4px 12px;">${items}</div>${headers.length > 12 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px;">…and ${headers.length - 12} more</div>` : ''}</div>`;
  }

  const host = document.createElement('div');
  host.className = 'cm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cm-title"><span class="badge-cm">Claude Code</span>CLAUDE.md</div>
<div class="cm-sub">${nonEmpty} non-empty line${nonEmpty !== 1 ? 's' : ''}${headers.length ? ` · ${headers.length} section${headers.length !== 1 ? 's' : ''}` : ''}</div>
${summary ? `<div class="cm-sec"><h3>Summary</h3><div class="cm-summary">${esc(summary)}</div></div>` : ''}
${sectionsHtml}`;

  return { parentNode: host };
}
