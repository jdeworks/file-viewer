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
