const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.supd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.supd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#336699;color:#fff;vertical-align:middle;margin-right:8px;}
.supd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.supd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.supd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.supd-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.supd-section-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.supd-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.supd-tag-daemon{background:#dce8f5;color:#1a4a80;border:1px solid #b0cce8;}
.supd-tag-program{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.supd-tag-group{background:#e2d9f3;color:#4a235a;border:1px solid #c9b8e8;}
.supd-tag-http{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.supd-tag-other{background:#e9ecef;color:#495057;border:1px solid #ced4da;}
.supd-table{width:100%;border-collapse:collapse;font-size:12px;}
.supd-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.supd-table td:first-child{color:var(--fg-2,#888);width:36%;white-space:nowrap;}
.supd-table tr:last-child td{border-bottom:none;}
.supd-autostart-yes{color:#155724;font-weight:600;}
.supd-autostart-no{color:#856404;}
.supd-cmd{color:#0969da;}
`;

function parseIni(text) {
  const sections = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      current = { header: sectionMatch[1], entries: {} };
      sections.push(current);
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      current.entries[kvMatch[1].trim().toLowerCase()] = kvMatch[2].trim();
    }
  }
  return sections;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');

  const daemonSections = sections.filter((s) => s.header.toLowerCase() === 'supervisord');
  const programSections = sections.filter((s) => s.header.toLowerCase().startsWith('program:'));
  const groupSections = sections.filter((s) => s.header.toLowerCase().startsWith('group:'));
  const httpSections = sections.filter((s) => s.header.toLowerCase() === 'inet_http_server');
  const otherSections = sections.filter((s) => {
    const h = s.header.toLowerCase();
    return h !== 'supervisord' && !h.startsWith('program:') && !h.startsWith('group:') && h !== 'inet_http_server';
  });

  const programCount = programSections.length;

  function renderDaemonCard(sec) {
    const show = ['logfile', 'loglevel', 'nodaemon'];
    const rows = show
      .filter((k) => sec.entries[k] != null)
      .map((k) => `<tr><td>${esc(k)}</td><td>${esc(sec.entries[k])}</td></tr>`);
    return `<div class="supd-card">
  <div class="supd-card-hd">
    <span class="supd-section-name">[supervisord]</span>
    <span class="supd-tag supd-tag-daemon">daemon</span>
  </div>
  ${rows.length ? `<table class="supd-table"><tbody>${rows.join('')}</tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
</div>`;
  }

  function renderProgramCard(sec) {
    const name = sec.header.slice('program:'.length);
    const show = ['command', 'directory', 'autostart', 'autorestart', 'user', 'stdout_logfile'];
    const rows = show
      .filter((k) => sec.entries[k] != null)
      .map((k) => {
        const v = sec.entries[k];
        let val;
        if (k === 'command') {
          val = `<span class="supd-cmd">${esc(v)}</span>`;
        } else if (k === 'autostart') {
          const yes = v.toLowerCase() === 'true';
          val = `<span class="${yes ? 'supd-autostart-yes' : 'supd-autostart-no'}">${esc(v)}</span>`;
        } else {
          val = esc(v);
        }
        return `<tr><td>${esc(k)}</td><td>${val}</td></tr>`;
      });
    const autostart = sec.entries['autostart'];
    const autostartLabel = autostart
      ? `<span class="supd-tag ${autostart.toLowerCase() === 'true' ? 'supd-tag-program' : 'supd-tag-other'}" style="margin-left:4px;">${esc(autostart)}</span>`
      : '';
    return `<div class="supd-card">
  <div class="supd-card-hd">
    <span class="supd-section-name">[program:${esc(name)}]</span>
    <span class="supd-tag supd-tag-program">program</span>
    ${autostartLabel}
  </div>
  ${rows.length ? `<table class="supd-table"><tbody>${rows.join('')}</tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
</div>`;
  }

  function renderGroupCard(sec) {
    const name = sec.header.slice('group:'.length);
    const programs = sec.entries['programs'] || '';
    return `<div class="supd-card">
  <div class="supd-card-hd">
    <span class="supd-section-name">[group:${esc(name)}]</span>
    <span class="supd-tag supd-tag-group">group</span>
  </div>
  ${programs ? `<table class="supd-table"><tbody><tr><td>programs</td><td>${esc(programs)}</td></tr></tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No programs listed.</p>'}
</div>`;
  }

  function renderHttpCard(sec) {
    const port = sec.entries['port'];
    return `<div class="supd-card">
  <div class="supd-card-hd">
    <span class="supd-section-name">[inet_http_server]</span>
    <span class="supd-tag supd-tag-http">http</span>
  </div>
  ${port != null ? `<table class="supd-table"><tbody><tr><td>port</td><td>${esc(port)}</td></tr></tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No port configured.</p>'}
</div>`;
  }

  function renderOtherCard(sec) {
    return `<div class="supd-card">
  <div class="supd-card-hd">
    <span class="supd-section-name">[${esc(sec.header)}]</span>
    <span class="supd-tag supd-tag-other">section</span>
  </div>
</div>`;
  }

  const subLine = `${programCount} program${programCount !== 1 ? 's' : ''}${groupSections.length ? `, ${groupSections.length} group${groupSections.length !== 1 ? 's' : ''}` : ''}`;

  const host = document.createElement('div');
  host.className = 'supd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="supd-title"><span class="supd-badge">Supervisor</span>Supervisord Configuration</div>
<div class="supd-sub">${subLine}</div>
${daemonSections.map(renderDaemonCard).join('')}
${programSections.map(renderProgramCard).join('')}
${groupSections.map(renderGroupCard).join('')}
${httpSections.map(renderHttpCard).join('')}
${otherSections.map(renderOtherCard).join('')}
${!sections.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No Supervisor sections found.</p>' : ''}`;

  return { parentNode: host };
}
