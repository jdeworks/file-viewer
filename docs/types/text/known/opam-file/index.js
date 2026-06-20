export const plugin = {
  id: 'opam-file',
  label: 'opam',
  tags: ['ocaml', 'opam', 'package', 'dependency'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'opam' || n.endsWith('.opam')) return true;
    const t = intake.text || '';
    return /^opam-version:/m.test(t);
  },
  renderer: () => import('./renderer.js'),
};
export default plugin;
