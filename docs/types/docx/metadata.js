import { loadGlobal, vendor } from '../../core/script-loader.js';

export async function extract(intake) {
  const mammoth = await loadGlobal(vendor('mammoth/mammoth.browser.min.js'), 'mammoth');
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: intake.bytes.slice().buffer });
  const words = (text.match(/\S+/g) || []).length;
  const paras = text.split(/\n{2,}/).filter((p) => p.trim()).length;
  return [
    { label: 'Words', value: String(words) },
    { label: 'Paragraphs', value: String(paras) },
    { label: 'Characters', value: String(text.length) },
    { label: 'Read time', value: Math.max(1, Math.round(words / 200)) + ' min' },
  ];
}
