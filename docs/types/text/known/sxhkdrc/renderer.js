// sxhkd hotkey daemon config renderer. Pure text parsing — no eval, no execution.
// Parses alternating key / command pairs, groups by modifier pattern, detects brace expansions.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseBindings(text) {
  const bindings = [];
  let currentComment = null;
  let pendingKey = null;
  let pendingCommentForKey = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();

    // Blank line resets state
    if (!line.trim()) {
      pendingKey = null;
      currentComment = null;
      continue;
    }

    // Comment line: becomes section label for next binding
    if (/^\s*#/.test(line)) {
      // Only treat as section header if we're not mid-binding
      if (pendingKey === null) {
        currentComment = line.replace(/^\s*#+\s*/, '').trim();
      }
      continue;
    }

    // Indented line = command for the pending key
    if (/^[\t ]/.test(line)) {
      if (pendingKey !== null) {
        bindings.push({ key: pendingKey, command: line.trim(), comment: pendingCommentForKey });
        pendingKey = null;
        pendingCommentForKey = null;
      }
      continue;
    }

    // Non-indented, non-comment = key line
    pendingKey = line.trim();
    pendingCommentForKey = currentComment;
    currentComment = null;
  }

  return bindings;
}

function countExpansions(key) {
  // Count brace expansions like {a,b,c} → 3 variants
  const m = key.match(/\{([^}]+)\}/g);
  if (!m) return 1;
  return m.reduce((prod, grp) => {
    const count = grp.slice(1, -1).split(',').length;
    return prod * count;
  }, 1);
}

function classifyKey(key) {
  const lk = key.toLowerCase();
  if (/super\s*\+\s*ctrl/.test(lk)) return 'super+ctrl';
  if (/super\s*\+\s*shift/.test(lk)) return 'super+shift';
  if (/super\s*\+\s*alt/.test(lk)) return 'super+alt';
  if (/^super\s*\+/.test(lk)) return 'super';
  if (/^xf86/.test(lk)) return 'media';
  return 'other';
}

const GROUP_ORDER = ['super', 'super+shift', 'super+ctrl', 'super+alt', 'media', 'other'];
const GROUP_LABELS = {
  'super': 'Super + …',
  'super+shift': 'Super + Shift + …',
  'super+ctrl': 'Super + Ctrl + …',
  'super+alt': 'Super + Alt + …',
  'media': 'Media / Function Keys',
  'other': 'Other',
};

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'sxhkdrc-doc';
  const text = intake.text || '';

  const bindings = parseBindings(text);

  // Count total expanded bindings
  let totalExpanded = 0;
  for (const b of bindings) totalExpanded += countExpansions(b.key);
  const hasBraces = bindings.some((b) => /\{[^}]+\}/.test(b.key));

  const badge = '<span class="sxhkdrc-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#006a6a;color:#fff;font-weight:700;font-size:0.85em">sxhkd</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge + ' <span style="font-weight:600">sxhkd Hotkeys</span></div>';
  html += '<div class="pj-meta">';
  html += '<span class="pj-tag">' + bindings.length + ' binding' + (bindings.length !== 1 ? 's' : '') + '</span>';
  if (hasBraces) html += '<span class="pj-tag">' + totalExpanded + ' effective shortcuts</span>';
  html += '</div></header>';

  // Group bindings
  const groups = {};
  for (const g of GROUP_ORDER) groups[g] = [];
  for (const b of bindings) {
    const g = classifyKey(b.key);
    groups[g].push(b);
  }

  for (const g of GROUP_ORDER) {
    const items = groups[g];
    if (!items.length) continue;

    html += '<section class="kf-svc"><h3>' + esc(GROUP_LABELS[g]) + ' <span class="pj-count">' + items.length + '</span></h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:0.88em">';
    html += '<colgroup><col style="width:46%"><col style="width:54%"></colgroup>';

    // Group by section comment
    let lastComment = null;
    for (const b of items) {
      if (b.comment && b.comment !== lastComment) {
        html += '<tr><td colspan="2" style="padding:6px 0 2px;color:var(--fg2,#777);font-style:italic;font-size:0.9em">'
          + esc(b.comment) + '</td></tr>';
        lastComment = b.comment;
      }
      const expansionCount = countExpansions(b.key);
      const expansionNote = expansionCount > 1
        ? ' <span class="kf-tag" style="font-size:0.75em;padding:1px 4px">×' + expansionCount + '</span>'
        : '';
      html += '<tr style="border-top:1px solid var(--border,#eee)">'
        + '<td style="padding:4px 6px 4px 0;vertical-align:top"><code class="ts-key" style="word-break:break-all">' + esc(b.key) + '</code>' + expansionNote + '</td>'
        + '<td style="padding:4px 0;color:var(--fg2,#555);vertical-align:top">' + esc(b.command.slice(0, 50)) + (b.command.length > 50 ? '…' : '') + '</td>'
        + '</tr>';
    }
    html += '</table></section>';
  }

  if (!bindings.length) {
    html += '<p class="kf-note">No sxhkd key bindings detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
