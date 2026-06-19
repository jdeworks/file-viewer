export default {
  id: 'nycrc',
  label: '.nycrc.json',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.nycrc.json' || name === 'nycrc.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.nycrc.json — NYC (Istanbul) code coverage configuration: thresholds, reporters, include/exclude patterns.',
    usedFor: [{ label: 'Coverage config', description: 'Istanbul/nyc code coverage thresholds and reporter configuration', href: 'https://github.com/istanbuljs/nyc' }],
  },
};
