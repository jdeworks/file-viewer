import { META_KEYS, advancedFact, securityFact, textFact } from './metadata-helpers.js';

function extensionOf(filename = '') {
  const base = String(filename).split(/[\\/]/).pop() || '';
  if (!base || base.startsWith('.') && base.indexOf('.', 1) === -1) return 'none';
  const i = base.lastIndexOf('.');
  return i > 0 && i < base.length - 1 ? base.slice(i + 1).toLowerCase() : 'none';
}

function filenameWarnings(filename = '') {
  return filenameRisk(filename).warnings;
}

function filenameRisk(filename = '') {
  const base = String(filename).split(/[\\/]/).pop() || '';
  const warnings = [];
  let score = 0;
  if (/[\u202a-\u202e\u2066-\u2069]/u.test(base)) {
    warnings.push('Unicode direction controls can disguise the visible extension');
    score += 45;
  }
  const parts = base.split('.').filter(Boolean);
  if (parts.length >= 3) {
    const lower = parts.map((p) => p.toLowerCase());
    const tail = lower.slice(-2).join('.');
    const active = new Set(['app', 'bat', 'cmd', 'com', 'cpl', 'exe', 'hta', 'jar', 'js', 'jse', 'msi', 'ps1', 'scr', 'sh', 'vbs', 'wsf']);
    const commonCompound = new Set([
      'config.js', 'config.ts', 'd.ts', 'min.css', 'min.js', 'module.css',
      'spec.js', 'spec.ts', 'test.js', 'test.ts',
    ]);
    if (!(parts.length === 3 && commonCompound.has(tail))) {
      if (active.has(lower[lower.length - 1])) {
        warnings.push(`High-risk double extension ending in executable .${lower[lower.length - 1]}`);
        score += 75;
      } else {
        warnings.push('Multiple extensions; verify the outer format is intentional');
        score += 20;
      }
    }
  }
  score = Math.min(100, score);
  const level = score >= 70 ? 'high' : score >= 20 ? 'caution' : 'none';
  return { score, level, warnings };
}

export function assessFilenameRisk(filename = '') {
  return filenameRisk(filename);
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
    advancedFact('Extension', extensionOf(intake.filename), META_KEYS.extension),
    advancedFact('Content kind', intake.isBinary ? 'binary' : 'text', META_KEYS.contentKind),
  ];
  const risk = filenameRisk(intake.filename);
  if (risk.score) {
    rows.push(
      securityFact('Filename risk', `${risk.level} (${risk.score}/100)`, META_KEYS.filenameRisk),
      securityFact('Filename warnings', risk.warnings.join(', '), META_KEYS.filenameWarnings),
    );
  }
  if (Number.isFinite(intake.loadedBytes) && Number.isFinite(intake.size) && intake.loadedBytes < intake.size) {
    rows.push(advancedFact('Loaded bytes', `${intake.loadedBytes.toLocaleString()} of ${intake.size.toLocaleString()}`, META_KEYS.loadedBytes));
  }
  rows.push(advancedFact('Byte order mark', bomOf(intake.bytes), META_KEYS.bom));
  if (!intake.isBinary) {
    const stats = textStats(intake.text || '');
    rows.push(
      textFact('Line endings', stats.endings.label, META_KEYS.lineEndings),
      textFact('Line break count', stats.endings.total, META_KEYS.lineBreakCount),
      textFact('Lines', stats.lines, META_KEYS.logicalLines),
      textFact('Blank lines', stats.blankLines, META_KEYS.blankLines),
      textFact('Longest line', stats.longestLine, META_KEYS.longestLine),
      textFact('Trailing newline', stats.trailingNewline, META_KEYS.trailingNewline),
    );
  }
  return rows;
}

export const testExports = { extensionOf, filenameRisk, filenameWarnings, bomOf, lineEndingStats, textStats };
