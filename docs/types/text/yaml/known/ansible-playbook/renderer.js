const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parsePlays(text) {
  // Each play is a YAML list item starting with "- " at column 0 or minimal indent
  const plays = [];
  // Split on top-level list items (lines starting with "- ")
  const playBlocks = text.split(/^(?=- )/m).filter((b) => /hosts\s*:/m.test(b) || /name\s*:/m.test(b));
  for (const block of playBlocks) {
    const name = (block.match(/^\s*-?\s*name\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const hosts = (block.match(/^\s*hosts\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const becomeMatch = /^\s*become\s*:\s*(?:true|yes)/m.test(block);
    // Count tasks: each task is a list item under tasks:
    const tasksBlock = block.match(/^\s*tasks\s*:\s*\n((?:\s{4,}.*\n?)*)/m);
    const taskCount = tasksBlock ? (tasksBlock[1].match(/^\s+- /gm) || []).length : 0;
    const taskNames = [];
    if (tasksBlock) {
      const nameMatches = [...tasksBlock[1].matchAll(/^\s+- name\s*:\s*(.+)/gm)];
      for (const m of nameMatches.slice(0, 6)) taskNames.push(m[1].trim().replace(/^['"]|['"]$/g, ''));
    }
    if (hosts) plays.push({ name, hosts, become: becomeMatch, taskCount, taskNames });
  }
  return plays;
}

const CSS = `
.ans-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ans{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e00;color:#fff;vertical-align:middle;margin-right:8px;}
.ans-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.ans-play{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 14px;}
.ans-play-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.ans-play-name{font-size:15px;font-weight:600;}
.ans-hosts{font:12px ui-monospace,monospace;padding:2px 8px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}
.ans-badge{font-size:11px;padding:2px 7px;border-radius:5px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}
.ans-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--fg-2,#888);margin:4px 0 5px;}
.ans-tasks{display:flex;flex-direction:column;gap:3px;}
.ans-task{font:12px ui-monospace,monospace;padding:2px 8px;border-radius:5px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.ans-more{font-size:11px;color:var(--fg-2,#888);padding:2px 4px;}
`;

export function render(intake) {
  const text = intake.text || '';
  const plays = parsePlays(text);

  const host = document.createElement('div');
  host.className = 'ans-doc';

  const playsHtml = plays.map((play) => {
    const tasksHtml = play.taskNames.length
      ? `<div class="ans-sec"><h3>Tasks (${play.taskCount})</h3><div class="ans-tasks">
${play.taskNames.map((t) => `<span class="ans-task">${esc(t)}</span>`).join('')}
${play.taskCount > play.taskNames.length ? `<span class="ans-more">…and ${play.taskCount - play.taskNames.length} more</span>` : ''}
</div></div>`
      : play.taskCount > 0 ? `<div class="ans-sec"><h3>Tasks</h3><span style="font-size:13px">${play.taskCount} task${play.taskCount !== 1 ? 's' : ''}</span></div>` : '';
    return `<div class="ans-play">
<div class="ans-play-header">
  ${play.name ? `<span class="ans-play-name">${esc(play.name)}</span>` : ''}
  <span class="ans-hosts">${esc(play.hosts)}</span>
  ${play.become ? `<span class="ans-badge">become</span>` : ''}
</div>
${tasksHtml}
</div>`;
  }).join('');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-ans">Ansible</span>
  <span class="ans-title">Playbook</span>
  <span style="font-size:12px;color:var(--fg-2,#888)">${plays.length} play${plays.length !== 1 ? 's' : ''}</span>
</div>
${playsHtml || '<p style="color:var(--fg-2,#888);font-size:13px">No plays found.</p>'}`;

  return { parentNode: host };
}
