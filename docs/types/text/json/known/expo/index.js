export default {
  id: 'expo',
  label: 'Expo App Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'app.json') return false;
    try {
      const parsed = JSON.parse(intake.text || '{}');
      return parsed && typeof parsed.expo === 'object' && parsed.expo !== null;
    } catch { return false; }
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Expo React Native application configuration — app metadata, SDK version, platform settings.' },
};
