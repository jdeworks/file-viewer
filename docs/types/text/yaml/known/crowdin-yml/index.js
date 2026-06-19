export default {
  id: 'crowdin-yml',
  label: 'Crowdin config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'crowdin.yml' || name === '.crowdin.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crowdin configuration — defines i18n/translation management settings, file mappings, and API connection for Crowdin localization platform.',
    usedFor: [
      { label: 'Localization', description: 'Maps source files to translation file patterns across languages', href: 'https://developer.crowdin.com/configuration-file/' },
    ],
  },
};
