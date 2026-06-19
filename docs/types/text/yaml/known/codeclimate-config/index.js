export default {
  id: 'codeclimate-config',
  label: 'Code Climate config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.codeclimate.yml' || n === '.codeclimate.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Code Climate quality configuration — engines, exclude patterns, checks, and maintainability thresholds.',
    usedFor: [{ label: 'Code Climate', description: 'Automated code review and quality metrics platform', href: 'https://docs.codeclimate.com/docs/advanced-configuration' }],
  },
};
