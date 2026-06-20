export default {
  id: 'stirling-pdf-config',
  label: 'Stirling PDF Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'settings.yml' && n !== 'stirling-pdf-settings.yml') return false;
    const text = intake.text || '';
    return text.includes('enableLogin:') || (text.includes('ui:') && text.includes('appName:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stirling PDF self-hosted PDF tools web application settings — security, UI, system, endpoints, and metrics.',
    tags: ['stirling-pdf', 'pdf', 'self-hosted', 'config'],
  },
};
