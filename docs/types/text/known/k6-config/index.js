export default {
  id: 'k6-config',
  label: 'k6 Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'k6.config.js' || n === 'k6.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'k6 performance test configuration — defines virtual users, duration, load stages, and threshold rules.' },
};
