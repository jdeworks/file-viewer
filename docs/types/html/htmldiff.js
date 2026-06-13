// Structural HTML diff (Layer-2 custom diff) — compares documents by DOM structure rather than
// raw text, so reindenting or attribute reordering doesn't read as a change. The engine lives in
// core/domdiff.js (shared with XML); this file only supplies the HTML parser.
import { renderDomDiff } from '../../core/domdiff.js';

const parse = (text) => {
  const doc = new DOMParser().parseFromString(text || '', 'text/html');
  return doc.body || doc.documentElement;
};

export function render(host, aText, bText) {
  renderDomDiff(host, aText, bText, {
    parse,
    heading: 'HTML structural diff',
    note: 'Compared by element/attribute/text structure; whitespace & formatting are ignored.',
    cleanText: 'No structural differences (only whitespace/formatting changed).',
  });
}
