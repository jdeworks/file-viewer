export function markdownHeading(text, level = 1) {
  const depth = Math.max(1, Math.min(6, Number(level) || 1));
  const prefix = '#'.repeat(depth) + ' ';
  return String(text || '').split('\n').map((line) => {
    if (!line.trim()) return line;
    return line.replace(/^(\s*)#{1,6}\s*/, '$1').replace(/^(\s*)/, '$1' + prefix);
  }).join('\n');
}

export function markdownWrap(text, marker, placeholder) {
  const value = String(text || '');
  const inner = value || placeholder;
  return {
    text: marker + inner + marker,
    selectStart: marker.length,
    selectEnd: marker.length + inner.length,
  };
}

export function markdownTable(rows = 3, cols = 3) {
  const rowCount = Math.max(1, Math.min(20, Number(rows) || 3));
  const colCount = Math.max(1, Math.min(10, Number(cols) || 3));
  const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
  const separator = Array.from({ length: colCount }, () => '---');
  const body = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ''));
  return [headers, separator, ...body].map(formatRow).join('\n');
}

export function tableSortOptions(text) {
  const parsed = parseMarkdownTable(text);
  if (!parsed) return [];
  return parsed.header.map((label, index) => ({ index, label: label || `Column ${index + 1}` }));
}

export function sortMarkdownTable(text, columnIndex, direction = 'asc') {
  const parsed = parseMarkdownTable(text);
  const col = Number(columnIndex);
  if (!parsed || col < 0 || col >= parsed.header.length) return null;
  const sign = direction === 'desc' ? -1 : 1;
  const sorted = [...parsed.body].sort((a, b) => compareCells(a[col] || '', b[col] || '') * sign);
  const lines = [parsed.header, parsed.separator, ...sorted].map(formatRow);
  return lines.join('\n');
}

function parseMarkdownTable(text) {
  const rawLines = String(text || '').split(/\r?\n/);
  const lines = rawLines.filter((line) => line.trim());
  if (lines.length < 2) return null;
  const header = splitRow(lines[0]);
  const separator = splitRow(lines[1]);
  if (!header || !separator || header.length < 1 || separator.length !== header.length) return null;
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) return null;
  const body = lines.slice(2).map(splitRow);
  if (body.some((row) => !row || row.length !== header.length)) return null;
  return { header, separator, body };
}

function splitRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.includes('|')) return null;
  const body = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return body.split('|').map((cell) => cell.trim());
}

function formatRow(cells) {
  return '| ' + cells.map((cell) => String(cell || '').trim()).join(' | ') + ' |';
}

function compareCells(a, b) {
  const av = String(a || '').trim();
  const bv = String(b || '').trim();
  const an = Number(av.replace(/,/g, ''));
  const bn = Number(bv.replace(/,/g, ''));
  if (av && bv && Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
}
