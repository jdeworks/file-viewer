// go.sum enhancement: show total entry count, unique module paths (deduplicated).
// go.sum is a plain text file — each line: `module@version hash`
export default {
  id: 'go-sum',
  label: 'go.sum',
  match: (intake) => /(^|\/)go\.sum$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
};
