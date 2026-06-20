export const plugin = {
  id: 'borgmatic-config',
  label: 'Borgmatic Config',
  tags: ['borgmatic', 'backup', 'borg', 'yaml'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'borgmatic.yaml' || n === 'borgmatic.yml') return true;
    if (n === 'config.yaml' && text.includes('source_directories:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Borgmatic backup configuration defining source directories, Borg repositories, retention policy, consistency checks, and hooks.',
    usedFor: [{ label: 'Borgmatic', description: 'Configure borgmatic to run Borg backups: source directories, repositories, retention policy, and lifecycle hooks.', href: 'https://torsion.org/borgmatic/' }],
  },
};
export default plugin;
