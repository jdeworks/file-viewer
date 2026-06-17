function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const EXPLANATIONS = {
  'text=auto': 'auto line ending normalization',
  'text': 'normalize line endings',
  'binary': 'binary — no CRLF, no diff expansion',
  'eol=lf': 'force LF line endings (Unix)',
  'eol=crlf': 'force CRLF line endings (Windows)',
  'diff=csharp': 'use C# diff driver',
  'diff=python': 'use Python diff driver',
  'diff=rust': 'use Rust diff driver',
  'diff=lfs': 'Git LFS diff driver',
  'merge=ours': 'always keep our version on conflict',
  'merge=union': 'merge by combining both',
  'merge=lfs': 'Git LFS merge driver',
  'export-ignore': 'excluded from git archive',
  'linguist-generated=true': 'GitHub: mark as generated code',
  'linguist-vendored=true': 'GitHub: mark as vendor code',
  'linguist-documentation=true': 'GitHub: mark as documentation',
  'filter=lfs': 'stored in Git LFS',
  'lockable': 'Git LFS lockable file',
};

function explainAttr(attr) {
  const full = attr.key + (attr.value !== null ? '=' + attr.value : '');
  if (EXPLANATIONS[full]) return EXPLANATIONS[full];
  if (attr.key.startsWith('linguist-language')) return 'GitHub: override detected language';
  if (attr.key.startsWith('linguist-')) return 'GitHub Linguist: ' + attr.key.slice('linguist-'.length);
  if (attr.op === 'unset') return attr.key + ' disabled';
  if (attr.op === 'unspecified') return attr.key + ' unspecified';
  if (attr.value !== null) return attr.key + '=' + attr.value;
  return attr.key;
}

function categorizeAttr(attr) {
  if (attr.key === 'binary') return 'binary';
  if (attr.key === 'text' || attr.key === 'eol') return 'eol';
  if (attr.key === 'diff') return 'diff';
  if (attr.key === 'merge') return 'merge';
  if (attr.key.startsWith('linguist-')) return 'linguist';
  if (attr.key === 'export-ignore') return 'export';
  if (attr.key === 'filter' || attr.key === 'lockable') return 'lfs';
  return 'other';
}

const CATEGORY_STYLES = {
  eol:      { bg: '#1e3a5f', border: '#2d5a8e', text: '#93c5fd' },
  binary:   { bg: '#2a2a3e', border: '#4a4a6a', text: '#9ca3af' },
  diff:     { bg: '#1a3a2a', border: '#2d5c3e', text: '#6ee7b7' },
  merge:    { bg: '#2a1a3a', border: '#4e2d6a', text: '#c4b5fd' },
  linguist: { bg: '#3a1a4a', border: '#6a2d7e', text: '#e879f9' },
  export:   { bg: '#3a2a1a', border: '#7e4d2d', text: '#fb923c' },
  lfs:      { bg: '#3a1a1a', border: '#7e2d2d', text: '#fca5a5' },
  other:    { bg: '#1a1a2a', border: '#3a3a5a', text: '#e2e8f0' },
};

function attrBadge(attr) {
  const cat = categorizeAttr(attr);
  const style = CATEGORY_STYLES[cat];
  const label = attr.op === 'unset' ? '-' + attr.key
    : attr.op === 'unspecified' ? '!' + attr.key
    : attr.value !== null ? attr.key + '=' + attr.value
    : attr.key;
  const title = explainAttr(attr);
  return `<span title="${esc(title)}" style="display:inline-block;background:${style.bg};border:1px solid ${style.border};border-radius:3px;padding:1px 7px;font-size:11px;font-family:monospace;color:${style.text};white-space:nowrap">${esc(label)}</span>`;
}

function parseGitattributes(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { rules.push({ type: 'blank' }); continue; }
    if (line.startsWith('#')) { rules.push({ type: 'comment', text: line.slice(1).trim() }); continue; }

    const parts = line.split(/\s+/);
    const pattern = parts[0];
    const attrs = parts.slice(1).map(a => {
      if (a.startsWith('-')) return { key: a.slice(1), op: 'unset', value: null };
      if (a.startsWith('!')) return { key: a.slice(1), op: 'unspecified', value: null };
      const eq = a.indexOf('=');
      if (eq >= 0) return { key: a.slice(0, eq), op: 'set', value: a.slice(eq + 1) };
      return { key: a, op: 'true', value: null };
    });
    rules.push({ type: 'rule', pattern, attrs });
  }
  return rules;
}

function hasAutoNorm(rules) {
  return rules.some(r => {
    if (r.type !== 'rule') return false;
    return r.attrs.some(a => a.key === 'text' && (a.value === 'auto' || (a.op === 'set' && a.value === 'auto')))
      || (r.pattern === '*' && r.attrs.some(a => a.key === 'text'));
  });
}

function hasLFS(rules) {
  return rules.some(r => r.type === 'rule' && r.attrs.some(a => a.key === 'filter' && a.value === 'lfs' || a.key === 'lockable'));
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const rules = parseGitattributes(text);

  // Stats
  const ruleEntries = rules.filter(r => r.type === 'rule');
  const eolRules = ruleEntries.filter(r => r.attrs.some(a => a.key === 'text' || a.key === 'eol'));
  const binaryRules = ruleEntries.filter(r => r.attrs.some(a => a.key === 'binary'));
  const total = ruleEntries.length;

  // Stats card
  const statsCard = `<div style="border:1px solid #3a3a5a;border-radius:6px;padding:12px 16px;margin-bottom:16px;background:#16162a">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="font-size:22px;font-weight:700;color:#e2e8f0">${total}</span>
    <span style="color:#9a9ab8;font-size:13px">rule${total !== 1 ? 's' : ''}</span>
    <span style="margin-left:4px;font-size:13px;color:#9a9ab8">
      <span style="color:#93c5fd">${eolRules.length} line ending</span>
      <span style="color:#4a4a6a"> · </span>
      <span style="color:#9ca3af">${binaryRules.length} binary</span>
    </span>
  </div>
  ${hasAutoNorm(rules) ? '<div style="margin-top:8px;color:#4ade80;font-size:12px">&#10003; Auto line ending normalization enabled</div>' : ''}
</div>`;

  // LFS banner
  const lfsBanner = hasLFS(rules)
    ? `<div style="border:1px solid #7e2d2d;border-radius:6px;padding:10px 14px;margin-bottom:14px;background:#3a1a1a;color:#fca5a5;font-size:12px">&#9889; Git LFS tracked paths detected</div>`
    : '';

  // Build rows
  let rowsHtml = '';
  for (const r of rules) {
    if (r.type === 'blank') {
      rowsHtml += '<tr><td colspan="2" style="height:6px;border:none"></td></tr>';
      continue;
    }
    if (r.type === 'comment') {
      rowsHtml += `<tr>
  <td colspan="2" style="padding:2px 0 2px 4px;font-style:italic;color:#555;font-size:12px;border-bottom:1px solid #1e1e2e"># ${esc(r.text)}</td>
</tr>`;
      continue;
    }
    // rule
    const badges = r.attrs.map(attrBadge).join(' ');
    const explanations = r.attrs.map(a => {
      const cat = categorizeAttr(a);
      const style = CATEGORY_STYLES[cat];
      return `<span style="color:${style.text};font-size:11px">${esc(explainAttr(a))}</span>`;
    }).join('<span style="color:#3a3a5a"> · </span>');

    rowsHtml += `<tr style="border-bottom:1px solid #1e1e2e">
  <td style="padding:5px 12px 5px 4px;vertical-align:top;white-space:nowrap">
    <code style="font-family:monospace;font-size:12px;color:#e2e8f0;background:#12121e;border-radius:3px;padding:1px 5px">${esc(r.pattern)}</code>
  </td>
  <td style="padding:5px 0;vertical-align:top">
    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${badges}</div>
    <div style="margin-top:3px">${explanations}</div>
  </td>
</tr>`;
  }

  const table = `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead>
    <tr style="border-bottom:1px solid #3a3a5a">
      <th style="text-align:left;padding:4px 12px 6px 4px;color:#6a6a8a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap">Pattern</th>
      <th style="text-align:left;padding:4px 0 6px;color:#6a6a8a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Attributes</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>`;

  const bodyHtml = `<div style="padding:16px;font-family:system-ui,sans-serif;font-size:13px;color:#e2e8f0">
${statsCard}
${lfsBanner}
<div style="background:#12121e;border:1px solid #3a3a5a;border-radius:6px;padding:12px 14px;overflow-x:auto">
${table}
</div>
</div>`;

  return { bodyHtml, hadUnsafe: false };
}
