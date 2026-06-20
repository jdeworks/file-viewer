export default {
  id: 'earthfile',
  label: 'Earthfile (Earthly)',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop();
    return name === 'Earthfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Earthfile — Earthly CI/CD build targets (Dockerfile-like syntax).' },
};
