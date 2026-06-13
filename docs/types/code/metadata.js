import { languageFor } from './langmap.js';
import { analyze } from './metrics.js';

export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const lang = languageFor(intake);
  const out = [
    { label: 'Language', value: lang },
    { label: 'Lines', value: String(lines.length) },
    { label: 'Non-empty lines', value: String(nonEmpty) },
    { label: 'Characters', value: String(text.length) },
  ];
  // File-level code metrics summary (per-function detail shows as a CodeLens in the editor).
  const { summary } = analyze(text, lang);
  if (summary && summary.count > 0) {
    out.push(
      { label: 'Functions', value: String(summary.count) },
      { label: 'Avg complexity', value: String(summary.avgComplexity) },
      { label: 'Max complexity', value: String(summary.maxComplexity) },
    );
  }
  return out;
}
