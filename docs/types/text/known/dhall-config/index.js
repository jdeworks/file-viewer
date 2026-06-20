export const plugin = {
  id: 'dhall-config',
  label: 'Dhall',
  tags: ['dhall', 'configuration', 'functional', 'typed'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.dhall');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dhall is a programmable configuration language that is not Turing-complete. It guarantees termination, supports imports, and provides strong typing for generating JSON/YAML configs.',
    usedFor: [{ label: 'dhall-lang.org', description: 'The Dhall configuration language', href: 'https://dhall-lang.org/' }],
  },
};
export default plugin;
