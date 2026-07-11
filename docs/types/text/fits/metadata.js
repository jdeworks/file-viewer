import { parseFitsHeader } from './parser.js';

export async function extractMetadata(intake) {
  const cards = parseFitsHeader(intake);
  const values = Object.fromEntries(cards
    .filter((card) => card.kw !== 'COMMENT' && card.kw !== 'HISTORY')
    .map((card) => [card.kw, card.value]));
  const bitpixDesc = { 8: '8-bit uint', 16: '16-bit int', 32: '32-bit int', 64: '64-bit int', '-32': '32-bit float', '-64': '64-bit float' };
  const fields = [
    { label: 'Format', value: 'FITS (Flexible Image Transport System)' },
    { label: 'Object', value: values.OBJECT || null },
    { label: 'Telescope', value: values.TELESCOP || null },
    { label: 'Instrument', value: values.INSTRUME || null },
    { label: 'Observer', value: values.OBSERVER || null },
    { label: 'Date', value: values['DATE-OBS'] || values.DATE || null },
    { label: 'Dimensions', value: [values.NAXIS1, values.NAXIS2, values.NAXIS3].filter(Boolean).join(' × ') || null },
    { label: 'Data Type', value: values.BITPIX ? (bitpixDesc[values.BITPIX] || `BITPIX=${values.BITPIX}`) : null },
    { label: 'Exposure', value: values.EXPTIME ? `${values.EXPTIME}s` : null },
  ].filter((field) => field.value);
  return { fields };
}
