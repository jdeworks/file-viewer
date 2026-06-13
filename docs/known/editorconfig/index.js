// .editorconfig enhancement: group properties under each [glob] section, annotate the common
// keys (indent_style, end_of_line, charset, …) and surface the root flag.
export default {
  id: 'editorconfig',
  label: '.editorconfig',
  match: (intake) => /(^|\/)\.editorconfig$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
};
