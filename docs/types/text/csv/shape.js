// Pure CSV shape helpers shared by the table, chart, and export paths. Ragged input is valid:
// later rows may introduce columns that the first row (including a short header) does not name.

export function maxCsvColumns(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
}

export function csvColumnLabels(rows, hasHeader = true) {
  const width = maxCsvColumns(rows);
  const header = hasHeader && Array.isArray(rows?.[0]) ? rows[0] : [];
  const used = new Set();
  const nextSuffix = new Map();

  return Array.from({ length: width }, (_, columnIndex) => {
    const raw = header[columnIndex];
    const base = hasHeader && raw != null && String(raw) !== ''
      ? String(raw)
      : `column_${columnIndex + 1}`;
    let label = base;
    let suffix = nextSuffix.get(base) || 2;
    while (used.has(label)) label = `${base}_${suffix++}`;
    nextSuffix.set(base, suffix);
    used.add(label);
    return label;
  });
}

export function csvRowsToRecords(rows, hasHeader = true) {
  const labels = csvColumnLabels(rows, hasHeader);
  if (!labels.length) return [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.map((row) => Object.fromEntries(
    labels.map((label, columnIndex) => [label, row?.[columnIndex] == null ? '' : row[columnIndex]]),
  ));
}

function mostCommonWidth(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    const width = Array.isArray(row) ? row.length : 0;
    counts.set(width, (counts.get(width) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 0;
}

// Papa Parse intentionally recovers ragged/malformed input. Turn that recovery into an explicit,
// bounded explanation instead of silently presenting a rectangular-looking table.
export function csvShapeDiagnostics(rows, parserErrors = [], hasHeader = true) {
  if (!Array.isArray(rows)) return [];
  const dataStart = hasHeader && rows.length ? 1 : 0;
  const expected = hasHeader && Array.isArray(rows[0]) ? rows[0].length : mostCommonWidth(rows);
  const ragged = [];
  for (let index = dataStart; index < rows.length; index += 1) {
    const width = Array.isArray(rows[index]) ? rows[index].length : 0;
    if (width !== expected) ragged.push({ row: index + 1, width });
  }

  const diagnostics = [];
  if (ragged.length) {
    const sample = ragged.slice(0, 5).map((item) => `row ${item.row} has ${item.width}`).join(', ');
    const more = ragged.length > 5 ? `, and ${ragged.length - 5} more` : '';
    diagnostics.push(`${ragged.length} row${ragged.length === 1 ? '' : 's'} have inconsistent field counts (expected ${expected}; ${sample}${more}). Missing cells remain blank and extra cells remain visible.`);
  }

  const meaningful = (parserErrors || []).filter((error) => !['TooFewFields', 'TooManyFields'].includes(error?.code));
  const seen = new Set();
  for (const error of meaningful) {
    const row = Number.isFinite(error?.row) ? `Row ${error.row + 1}: ` : '';
    const message = error?.code === 'MissingQuotes'
      ? `${row}unterminated quoted field; the parser recovered the remaining text.`
      : `${row}${error?.message || error?.code || 'CSV parse issue; the parser recovered what it could.'}`;
    if (seen.has(message)) continue;
    seen.add(message);
    diagnostics.push(message);
    if (diagnostics.length >= 5) break;
  }
  return diagnostics;
}
