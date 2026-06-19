// .gitattributes enhancement: show as a table of pattern → attributes.
// Highlights common attributes: text, binary, eol, diff, linguist-language, export-ignore, etc.
export default {
  id: 'gitattributes',
  label: '.gitattributes',
  match: (intake) => /(^|\/)\.gitattributes$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadDiffRenderer: () => import('../../../../core/diff-renderer.js'),
};
