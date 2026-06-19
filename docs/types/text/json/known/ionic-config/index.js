export default {
  id: 'ionic-config',
  label: 'Ionic',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    return (intake.name || '').toLowerCase() === 'ionic.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Ionic framework project configuration — app name, ID, integrations (Capacitor, Cordova), and project type.' },
};
