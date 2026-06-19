export default {
  id: 'tiltfile',
  label: 'Tiltfile',
  match(intake) {
    const n = (intake.filename || '').split('/').pop();
    return n === 'Tiltfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Tilt Kubernetes dev-loop config (Starlark) — defines Docker builds, k8s resources, live updates, and local tasks.' },
};
