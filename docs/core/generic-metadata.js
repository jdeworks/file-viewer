function extensionOf(filename = '') {
  const base = String(filename).split(/[\\/]/).pop() || '';
  if (!base || base.startsWith('.') && base.indexOf('.', 1) === -1) return 'none';
  const i = base.lastIndexOf('.');
  return i > 0 && i < base.length - 1 ? base.slice(i + 1).toLowerCase() : 'none';
}

function bomOf(bytes) {
  if (!bytes || bytes.length < 2) return 'none';
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'UTF-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'UTF-16 LE';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'UTF-16 BE';
  return 'none';
}

function lineEndingStats(text) {
  let crlf = 0;
  let lf = 0;
  let cr = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c === 13 && text.charCodeAt(i + 1) === 10) {
      crlf += 1;
      i += 1;
    } else if (c === 10) {
      lf += 1;
    } else if (c === 13) {
      cr += 1;
    }
  }
  const kinds = [
    crlf ? 'CRLF' : '',
    lf ? 'LF' : '',
    cr ? 'CR' : '',
  ].filter(Boolean);
  return {
    crlf,
    lf,
    cr,
    total: crlf + lf + cr,
    label: kinds.length ? kinds.join(' + ') : 'none',
  };
}

function textStats(text) {
  const endings = lineEndingStats(text);
  if (!text) {
    return { endings, lines: 0, blankLines: 0, longestLine: 0, trailingNewline: false };
  }
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized.split('\n');
  const trailingNewline = endings.total > 0 && parts[parts.length - 1] === '';
  const logicalLines = trailingNewline ? parts.slice(0, -1) : parts;
  return {
    endings,
    lines: logicalLines.length,
    blankLines: logicalLines.filter((line) => line.trim() === '').length,
    longestLine: logicalLines.reduce((max, line) => Math.max(max, line.length), 0),
    trailingNewline,
  };
}

export function genericMetadata(intake) {
  const rows = [
    ['Extension', extensionOf(intake.filename)],
    ['Content kind', intake.isBinary ? 'binary' : 'text'],
  ];
  if (Number.isFinite(intake.loadedBytes) && Number.isFinite(intake.size) && intake.loadedBytes < intake.size) {
    rows.push(['Loaded bytes', `${intake.loadedBytes.toLocaleString()} of ${intake.size.toLocaleString()}`]);
  }
  rows.push(['Byte order mark', bomOf(intake.bytes)]);
  if (!intake.isBinary) {
    const stats = textStats(intake.text || '');
    rows.push(
      ['Line endings', stats.endings.label],
      ['Line break count', stats.endings.total],
      ['Lines', stats.lines],
      ['Blank lines', stats.blankLines],
      ['Longest line', stats.longestLine],
      ['Trailing newline', stats.trailingNewline],
    );
  }
  return rows;
}

export const testExports = { extensionOf, bomOf, lineEndingStats, textStats };
