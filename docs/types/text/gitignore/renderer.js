function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function classifyRule(rule) {
  if (rule.startsWith('!')) return 'negation';
  if (rule.endsWith('/')) return 'directory';
  if (/^\*\.[\w]+$/.test(rule)) return 'extension';
  if (/[*?[]/.test(rule)) return 'glob';
  return 'file';
}

function parseIgnore(text) {
  const lines = text.split(/\r?\n/);
  const rules = [];
  let commentCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) { commentCount++; continue; }
    rules.push(trimmed);
  }

  let directories = 0, negations = 0, extensions = 0, globs = 0, files = 0;
  const extSet = new Set();

  for (const rule of rules) {
    const kind = classifyRule(rule);
    if (kind === 'directory') directories++;
    else if (kind === 'negation') negations++;
    else if (kind === 'extension') { extensions++; extSet.add(rule.replace(/^\*\./, '')); }
    else if (kind === 'glob') globs++;
    else files++;
  }

  return { rules, commentCount, directories, negations, extensions, globs, files, extSet };
}

function highlightLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#')) {
    return '<span style="color:#888">' + esc(line) + '</span>';
  }
  const kind = classifyRule(trimmed);
  if (kind === 'negation') return '<span style="color:#4ade80">' + esc(line) + '</span>';
  if (kind === 'directory') return '<span style="color:#60a5fa">' + esc(line) + '</span>';
  if (kind === 'extension') return '<span style="color:#f59e0b">' + esc(line) + '</span>';
  return '<span style="color:#e2e8f0">' + esc(line) + '</span>';
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { rules, commentCount, directories, negations, extensions, globs, files, extSet } = parseIgnore(text);

  const total = rules.length;

  // Build breakdown rows
  const breakdown = [
    directories > 0 ? `<span style="color:#60a5fa">${directories} dir${directories !== 1 ? 's' : ''}</span>` : null,
    extensions > 0 ? `<span style="color:#f59e0b">${extensions} ext pattern${extensions !== 1 ? 's' : ''}</span>` : null,
    globs > 0 ? `<span style="color:#c084fc">${globs} glob${globs !== 1 ? 's' : ''}</span>` : null,
    files > 0 ? `<span style="color:#e2e8f0">${files} specific file${files !== 1 ? 's' : ''}</span>` : null,
    negations > 0 ? `<span style="color:#4ade80">${negations} negation${negations !== 1 ? 's' : ''}</span>` : null,
    commentCount > 0 ? `<span style="color:#888">${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>` : null,
  ].filter(Boolean).join('<span style="color:#4a4a6a"> · </span>');

  // Top extensions as chips (max 8)
  const topExts = [...extSet].slice(0, 8);
  const extChips = topExts.length > 0
    ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'
      + topExts.map((e) => `<span style="background:#2a2a3e;border:1px solid #3a3a5a;border-radius:4px;padding:2px 8px;font-size:11px;font-family:monospace;color:#f59e0b">*.${esc(e)}</span>`).join('')
      + '</div>'
    : '';

  const card = `<div style="border:1px solid #3a3a5a;border-radius:6px;padding:12px 16px;margin-bottom:16px;background:#16162a">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="font-size:22px;font-weight:700;color:#e2e8f0">${total}</span>
    <span style="color:#9a9ab8;font-size:13px">rule${total !== 1 ? 's' : ''}</span>
    <span style="margin-left:4px;font-size:13px">${breakdown}</span>
  </div>
  ${extChips}
</div>`;

  // Syntax-highlighted raw lines (include blank lines and comments for visual fidelity)
  const allLines = text.split(/\r?\n/);
  const highlighted = allLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    return highlightLine(line);
  }).join('\n');

  const bodyHtml = `<div style="padding:16px;font-family:system-ui,sans-serif;font-size:13px">
${card}
<pre style="margin:0;overflow:auto;font-size:12px;line-height:1.6;background:#12121e;border:1px solid #3a3a5a;border-radius:6px;padding:12px 14px;white-space:pre-wrap;word-break:break-all">${highlighted}</pre>
</div>`;

  return { bodyHtml, hadUnsafe: false };
}
