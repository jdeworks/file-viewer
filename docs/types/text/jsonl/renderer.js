const MAX_ROWS = 500;
const SCHEMA_THRESHOLD = 0.5;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cellVal(v) {
  if (v === null) return '<span class="jsonl-null">null</span>';
  if (typeof v === 'boolean') return '<span class="jsonl-bool">' + v + '</span>';
  if (typeof v === 'number') return '<span class="jsonl-num">' + esc(String(v)) + '</span>';
  if (typeof v === 'object') return '<span class="jsonl-obj">' + esc(JSON.stringify(v)) + '</span>';
  const s = String(v);
  return s.length > 120 ? esc(s.slice(0, 120)) + '…' : esc(s);
}

export function parseJsonl(text) {
  const records = [], errors = [];
  const raw = (text || '').split('\n');
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i].trim();
    if (!line || line.startsWith('#')) continue;
    try {
      records.push(JSON.parse(line));
    } catch (e) {
      errors.push({ line: i + 1, msg: e.message });
    }
  }
  return { records, errors, lineCount: raw.length };
}

function detectSchema(records) {
  if (!records.length) return null;
  const objects = records.filter((r) => r && typeof r === 'object' && !Array.isArray(r));
  if (objects.length < records.length * SCHEMA_THRESHOLD) return null;
  const freq = new Map();
  for (const obj of objects) {
    for (const k of Object.keys(obj)) freq.set(k, (freq.get(k) || 0) + 1);
  }
  const minCount = objects.length * SCHEMA_THRESHOLD;
  return [...freq.entries()].filter(([, n]) => n >= minCount).map(([k]) => k);
}

export async function render(intake, _ctx) {
  const { records, errors, lineCount } = parseJsonl(intake.text || '');
  const schema = detectSchema(records);
  const truncated = records.length > MAX_ROWS;
  const shown = truncated ? records.slice(0, MAX_ROWS) : records;

  const errHtml = errors.length
    ? '<div class="jsonl-errors"><strong>⚠ ' + errors.length + ' parse error' + (errors.length > 1 ? 's' : '') + ':</strong><ul>'
      + errors.slice(0, 20).map((e) => '<li>Line ' + e.line + ': ' + esc(e.msg) + '</li>').join('')
      + (errors.length > 20 ? '<li>… and ' + (errors.length - 20) + ' more</li>' : '')
      + '</ul></div>'
    : '';

  let bodyHtml;
  if (schema && schema.length > 0) {
    // Table view
    const cols = schema.slice(0, 20);
    const thead = '<tr>' + cols.map((k) => '<th>' + esc(k) + '</th>').join('') + '</tr>';
    const tbody = shown.map((r) => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        return '<tr><td colspan="' + cols.length + '">' + esc(JSON.stringify(r)) + '</td></tr>';
      }
      return '<tr>' + cols.map((k) => '<td>' + cellVal(r[k]) + '</td>').join('') + '</tr>';
    }).join('');
    bodyHtml = '<table class="jsonl-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>'
      + (truncated ? '<p class="jsonl-note">Showing first ' + MAX_ROWS + ' of ' + records.length + ' records.</p>' : '');
  } else if (records.length > 0) {
    // Fallback: formatted JSON blocks
    bodyHtml = shown.map((r) =>
      '<pre class="jsonl-block">' + esc(JSON.stringify(r, null, 2)) + '</pre>'
    ).join('')
      + (truncated ? '<p class="jsonl-note">Showing first ' + MAX_ROWS + ' of ' + records.length + ' records.</p>' : '');
  } else {
    bodyHtml = '<p class="jsonl-empty">No records found.</p>';
  }

  const summary = '<div class="jsonl-summary">'
    + '<span class="jsonl-stat"><strong>' + lineCount + '</strong> lines</span>'
    + '<span class="jsonl-stat"><strong>' + records.length + '</strong> records</span>'
    + (errors.length ? '<span class="jsonl-stat jsonl-stat-err"><strong>' + errors.length + '</strong> errors</span>' : '')
    + (schema ? '<span class="jsonl-stat"><strong>' + schema.length + '</strong> shared keys</span>' : '')
    + '</div>';

  return {
    hadUnsafe: false,
    bodyHtml: '<div class="jsonl-preview">' + summary + errHtml + bodyHtml + '</div>',
  };
}
