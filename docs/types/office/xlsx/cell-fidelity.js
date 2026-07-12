const TYPE_LABELS = {
  b: 'Boolean',
  d: 'Date',
  e: 'Error',
  n: 'Number',
  s: 'Text',
  z: 'Empty',
};

function scalarText(value) {
  if (value == null) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  return String(value);
}

export function describeXlsxHyperlink(link) {
  const target = typeof link === 'string' ? link : link?.Target;
  if (typeof target !== 'string' || target === '') return null;
  try {
    const parsed = new URL(target.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { target, href: parsed.href, clickable: true };
    }
  } catch {
    // Relative, internal, and malformed targets remain visible but inert.
  }
  return { target, href: null, clickable: false };
}

export function describeXlsxCell(XLSX, cell, address) {
  const exists = !!cell;
  let display = '';
  if (exists) {
    if (cell.w != null) display = String(cell.w);
    else {
      try { display = String(XLSX?.utils?.format_cell?.(cell) ?? scalarText(cell.v)); }
      catch { display = scalarText(cell.v); }
    }
  }
  return {
    address,
    exists,
    kind: cell?.f != null ? 'Formula' : (TYPE_LABELS[cell?.t] || (exists ? 'Value' : 'Empty')),
    formula: cell?.f != null ? '=' + String(cell.f) : '',
    cached: scalarText(cell?.v),
    display,
    comments: Array.isArray(cell?.c) ? cell.c.map((comment) => ({
      author: scalarText(comment?.a) || 'Unknown author',
      text: scalarText(comment?.t),
    })) : [],
    hyperlink: describeXlsxHyperlink(cell?.l),
  };
}

export function describeXlsxSheetVisibility(workbook, sheetIndex) {
  const raw = Number(workbook?.Workbook?.Sheets?.[sheetIndex]?.Hidden);
  const code = raw === 2 ? 2 : raw === 1 ? 1 : 0;
  if (code === 2) return { code, label: 'Very hidden', classToken: 'very-hidden' };
  if (code === 1) return { code, label: 'Hidden', classToken: 'hidden' };
  return { code, label: 'Visible', classToken: 'visible' };
}

export function coerceXlsxLiteral(value) {
  if (value === '') return { t: 's', v: '' };
  if (value === 'TRUE' || value === 'FALSE') return { t: 'b', v: value === 'TRUE' };
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    const number = Number(value);
    if (Number.isFinite(number)) return { t: 'n', v: number };
  }
  return { t: 's', v: value };
}

export function applyXlsxLiteralEdit(originalCell, value, { replaceFormula = false } = {}) {
  if (originalCell?.f != null && !replaceFormula) {
    throw new Error('Formula cells require an explicit destructive replacement confirmation.');
  }
  const literal = coerceXlsxLiteral(value);
  const next = { ...(originalCell || {}), t: literal.t, v: literal.v };
  // Cached HTML/text must be recomputed from the new literal. Fidelity-bearing metadata such as
  // comments, hyperlinks, number formats, and styles remains on the cloned cell object.
  delete next.h;
  delete next.w;
  if (replaceFormula) {
    delete next.f;
    delete next.F;
  }
  return next;
}
