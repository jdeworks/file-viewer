// CSV preview: PapaParse -> rows -> shared tabular renderer.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { renderTables } from '../../../core/tabular.js';

const DELIMS = { auto: '', comma: ',', semicolon: ';', tab: '\t', pipe: '|' };

export async function parseCsv(intake, settings = {}) {
  const Papa = await loadGlobal(vendor('papaparse/papaparse.min.js'), 'Papa');
  const res = Papa.parse(intake.text || '', {
    delimiter: DELIMS[settings.delimiter || 'auto'] ?? '',
    skipEmptyLines: 'greedy',
  });
  return { rows: res.data, delimiter: res.meta?.delimiter || ',' };
}

export async function render(intake, ctx) {
  const settings = ctx?.settings || {};
  const { rows } = await parseCsv(intake, settings);
  return {
    bodyHtml: renderTables({ sheets: [{ name: '', rows }], firstRowHeader: settings.csvHeader !== false }),
    hadUnsafe: false,
  };
}
