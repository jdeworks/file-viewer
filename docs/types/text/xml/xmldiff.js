// Structural XML diff (Layer-2) — reuses the shared DOM diff engine with an XML parser, so two
// XML documents compare by element/attribute/text structure rather than as raw text.
import { renderDomDiff } from '../../../core/domdiff.js';

const parse = (text) => {
  const doc = new DOMParser().parseFromString(text || '', 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('invalid XML');
  return doc.documentElement;
};

export function render(host, aText, bText) {
  renderDomDiff(host, aText, bText, {
    parse,
    heading: 'XML structural diff',
    note: 'Compared by element/attribute/text structure; whitespace & formatting are ignored.',
    cleanText: 'No structural differences (only whitespace/formatting changed).',
  });
}
