export default {
  id: 'maven-settings',
  label: 'Maven settings',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'settings.xml') return false;
    const text = intake.text || '';
    return text.includes('<settings') && text.includes('maven');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Maven global/user settings — repository mirrors, proxy configuration, server credentials, and active profiles.',
  },
};
