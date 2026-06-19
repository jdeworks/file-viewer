export default {
  id: 'capacitor',
  label: 'capacitor.config.json',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'capacitor.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'capacitor.config.json — Capacitor framework configuration for building native iOS/Android apps from web projects.',
    usedFor: [{ label: 'Mobile app config', description: 'Cross-platform native mobile app configuration with Capacitor', href: 'https://capacitorjs.com/docs/config' }],
  },
};
