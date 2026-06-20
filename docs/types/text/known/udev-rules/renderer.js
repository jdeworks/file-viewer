const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.udev-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.udev-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4a90d9;color:#fff;vertical-align:middle;margin-right:8px;}
.udev-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.udev-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.udev-sec{margin:14px 0;}
.udev-sec-hdr{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.udev-comment-hdr{font-size:12px;font-style:italic;color:var(--fg-2,#888);padding:6px 0 2px;border-top:1px solid var(--border,#e0e0e0);margin-top:10px;}
.udev-comment-hdr:first-child{border-top:none;margin-top:0;}
.udev-table{width:100%;border-collapse:collapse;font-size:12px;}
.udev-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.udev-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.udev-kv-chip{display:inline-block;font-size:11px;padding:1px 6px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 2px 1px 0;font-family:ui-monospace,monospace;}
.udev-action-chip{display:inline-block;font-size:11px;padding:1px 6px;border-radius:6px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;margin:1px 2px 1px 0;font-family:ui-monospace,monospace;}
.udev-group-header{font-size:13px;font-weight:600;color:var(--fg,#24292f);padding:10px 0 4px;border-top:2px solid var(--border,#e0e0e0);margin-top:10px;}
.udev-group-header:first-child{border-top:none;margin-top:0;padding-top:0;}
`;

// Known match keys (used for filtering match vs action columns)
const MATCH_KEYS = new Set(['SUBSYSTEM', 'KERNEL', 'KERNELS', 'ACTION', 'DRIVER', 'DEVPATH', 'DEVTYPE', 'ATTR', 'ATTRS', 'ENV', 'TAG', 'PROGRAM', 'RESULT']);
const ACTION_KEYS = new Set(['MODE', 'GROUP', 'OWNER', 'NAME', 'SYMLINK', 'RUN', 'RUN+', 'TAG+', 'ENV+', 'LABEL', 'GOTO', 'OPTIONS', 'IMPORT']);

function parseUdevRules(text) {
  const lines = text.split('\n');
  const entries = []; // {type:'comment'|'rule', text?, matchPairs?, actionPairs?}

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      // Strip leading # and whitespace
      const comment = line.replace(/^#+\s*/, '');
      if (comment) entries.push({ type: 'comment', text: comment });
      continue;
    }

    // Parse key=value or key=="value" pairs separated by commas
    const matchPairs = [];
    const actionPairs = [];
    // Tokenise by comma, but be careful of commas inside quoted strings
    const tokens = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; current += ch; }
      else if (ch === ',' && !inQuote) { tokens.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    if (current.trim()) tokens.push(current.trim());

    for (const tok of tokens) {
      // key=="value" or key="value" or key+="value" or key:="value"
      const m = /^([A-Z][A-Z0-9_+]*(?:\{[^}]*\})?)\s*(?:==|!=|\+=|:=|=)\s*"?([^"]*)"?/.exec(tok);
      if (!m) continue;
      const key = m[1];
      const val = m[2];
      const baseKey = key.replace(/\{[^}]*\}/, '').replace(/\+$/, '');
      if (ACTION_KEYS.has(baseKey) || ACTION_KEYS.has(key)) {
        actionPairs.push({ key, val });
      } else {
        matchPairs.push({ key, val });
      }
    }

    if (matchPairs.length || actionPairs.length) {
      entries.push({ type: 'rule', matchPairs, actionPairs });
    }
  }

  return entries;
}

function groupBySubsystem(entries) {
  // Build groups: rules are grouped under the preceding comments and by SUBSYSTEM
  // Returns [{subsystem, groups:[{comment?, rules:[]}]}]
  const subsystemMap = new Map(); // subsystem -> [{comment, rules}]
  let lastComment = null;

  for (const entry of entries) {
    if (entry.type === 'comment') {
      lastComment = entry.text;
      continue;
    }
    // Find SUBSYSTEM value for this rule
    const subsys = entry.matchPairs.find((p) => p.key === 'SUBSYSTEM');
    const key = subsys ? subsys.val : '(other)';

    if (!subsystemMap.has(key)) subsystemMap.set(key, []);
    const group = subsystemMap.get(key);

    // Attach comment to this rule item
    group.push({ comment: lastComment, rule: entry });
    lastComment = null;
  }

  return subsystemMap;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'udev-doc';

  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || '50-usb.rules';
  const entries = parseUdevRules(text);

  const ruleCount = entries.filter((e) => e.type === 'rule').length;
  const subtitle = `${ruleCount} rule${ruleCount !== 1 ? 's' : ''}`;

  const subsystemMap = groupBySubsystem(entries);

  let sectionsHtml = '';
  for (const [subsystem, items] of subsystemMap) {
    const groupLabel = subsystem === '(other)' ? 'Other rules' : `SUBSYSTEM=="${esc(subsystem)}"`;
    let rowsHtml = '';
    let lastComment = null;

    for (const { comment, rule } of items) {
      // Show comment as a mini section header if it differs from previous
      if (comment && comment !== lastComment) {
        rowsHtml += `<tr><td colspan="3" class="udev-comment-hdr" style="font-family:system-ui,sans-serif;"># ${esc(comment)}</td></tr>`;
        lastComment = comment;
      }

      // Match key chips — up to 3 meaningful match keys (skip SUBSYSTEM since it's the group header)
      const matchDisplay = rule.matchPairs
        .filter((p) => p.key !== 'SUBSYSTEM')
        .slice(0, 3)
        .map((p) => `<span class="udev-kv-chip">${esc(p.key)}=<strong>${esc(p.val)}</strong></span>`)
        .join('');

      // Action chips
      const actionDisplay = rule.actionPairs
        .slice(0, 4)
        .map((p) => `<span class="udev-action-chip">${esc(p.key)}=${esc(p.val)}</span>`)
        .join('');

      // Notes: RUN+ scripts
      const runPair = rule.actionPairs.find((p) => p.key === 'RUN+' || p.key === 'RUN');
      const notesHtml = runPair ? `<span style="color:var(--fg-2,#888);font-size:11px;">runs ${esc(runPair.val)}</span>` : '';

      rowsHtml += `<tr>
        <td>${matchDisplay || '<span style="color:var(--fg-2,#888);">—</span>'}</td>
        <td>${actionDisplay || '<span style="color:var(--fg-2,#888);">—</span>'}</td>
        <td style="font-family:system-ui,sans-serif;">${notesHtml}</td>
      </tr>`;
    }

    sectionsHtml += `<div class="udev-group-header">${groupLabel}</div>
<table class="udev-table">
  <thead><tr><th>Match Keys</th><th>Action / Assignment</th><th>Notes</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>`;
  }

  host.innerHTML = `<style>${CSS}</style>
<div class="udev-title"><span class="udev-badge">udev</span>${esc(filename)}</div>
<div class="udev-sub">${esc(subtitle)}</div>
<div class="udev-sec">
${sectionsHtml}
</div>`;

  return { parentNode: host };
}
