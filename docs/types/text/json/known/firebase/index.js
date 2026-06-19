export default {
  id: 'firebase',
  label: 'Firebase Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'firebase.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Firebase project configuration — hosting, functions, emulators, and security rules.' },
};
