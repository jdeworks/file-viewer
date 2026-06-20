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
  // Toggle off: if the selection is already wrapped with this marker, unwrap it.
  if (value.length >= marker.length * 2 && value.startsWith(marker) && value.endsWith(marker)) {
    const inner = value.slice(marker.length, value.length - marker.length);
    return { text: inner, selectStart: 0, selectEnd: inner.length };
  }
  const inner = value || placeholder;
  return {
    text: marker + inner + marker,
    selectStart: marker.length,
    selectEnd: marker.length + inner.length,
  };
}

export function markdownCodeBlock(text) {
  const value = String(text || '');
  if (!value.includes('\n') && value.length > 0) {
    // Inline selection with no newlines → inline code
    return markdownInlineCode(value);
  }
  const inner = value || 'code';
  return {
    text: '```\n' + inner + '\n```',
    selectStart: 4,
    selectEnd: 4 + inner.length,
  };
}

export function markdownInlineCode(text) {
  const value = String(text || '');
  const inner = value || 'code';
  return { text: '`' + inner + '`', selectStart: 1, selectEnd: 1 + inner.length };
}

export function markdownBlockquote(text) {
  const value = String(text || '');
  const lines = value.split('\n');
  return lines.map((line) => '> ' + line).join('\n');
}

export function markdownBulletList(text) {
  const value = String(text || '');
  const lines = value.split('\n');
  return lines.map((line) => (line.trim() ? '- ' + line : line)).join('\n');
}

export function markdownOrderedList(text) {
  const value = String(text || '');
  const lines = value.split('\n');
  let counter = 1;
  return lines.map((line) => {
    if (!line.trim()) return line;
    return counter++ + '. ' + line;
  }).join('\n');
}

export function markdownStrikethrough(text) {
  return markdownWrap(text, '~~', 'strikethrough');
}

export function markdownLinkForPastedUrl(selection, pastedText) {
  const label = String(selection || '').trim();
  const url = String(pastedText || '').trim();
  if (!label || !isLikelyUrl(url)) return null;
  return `[${label}](${url})`;
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

function isLikelyUrl(value) {
  if (!/^(https?:\/\/|mailto:|ftp:\/\/)/i.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.protocol && (url.protocol !== 'mailto:' || !!url.pathname);
  } catch {
    return false;
  }
}
