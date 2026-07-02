// Apache Parquet file format reader
// Magic: 'PAR1' (4 bytes) at start and end
// File layout: [magic][row groups][footer][footer_len:int32LE][magic]
// Footer is Thrift-compact-protocol-encoded FileMetaData; decoded structurally by
// readParquetFooter() (see metadata.js), not guessed at the byte level.
import { readParquetFooter } from './metadata.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Parquet file.</p>', hadUnsafe: false };
  }

  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'PAR1') {
    return { bodyHtml: '<p class="viewer-message">Missing PAR1 magic bytes.</p>', hadUnsafe: false };
  }

  const parsed = readParquetFooter(b);

  const metaRows = [
    ['Magic', 'PAR1'],
    ['File size', `${b.length.toLocaleString()} bytes`],
    parsed?.version != null ? ['Format version', `Parquet v${parsed.version}`] : null,
    parsed?.numRows != null ? ['Row count', parsed.numRows.toLocaleString()] : null,
    parsed?.footerLen != null ? ['Footer size', `${parsed.footerLen} bytes`] : null,
    parsed?.createdBy ? ['Created by', parsed.createdBy] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  let colHtml = '';
  if (parsed?.colNames?.length) {
    const pills = parsed.colNames.slice(0, 40).map((n) => `<span class="parq-col-pill">${esc(n)}</span>`).join(' ');
    const more = parsed.colNames.length > 40 ? ` <span class="viewer-note">+${parsed.colNames.length - 40} more</span>` : '';
    colHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Schema Columns</h4>
        <div class="parq-cols">${pills}${more}</div>
      </div>`;
  } else if (parsed) {
    colHtml = `<p class="viewer-note">Footer parsed but no column names were found (empty schema, or an encoding this reader doesn't yet decode).</p>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-parquet { background: #512da8; color: #fff; }
        .parq-cols { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
        .parq-col-pill { background: var(--bg2,#f0f0f0); color: var(--fg,#333); border-radius: 3px; padding: 0.15rem 0.45rem; font-family: monospace; font-size: 0.82rem; }
      </style>
      <div class="badge-row"><span class="badge badge-parquet">Parquet</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${colHtml}
      <p class="viewer-note">Row data not loaded — use pandas, PyArrow, or DuckDB to query the full dataset.</p>`,
    hadUnsafe: false,
  };
}
