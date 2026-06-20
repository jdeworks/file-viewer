export default {
  id: 'devbox-json',
  label: 'Devbox config',
  match: (intake, baseType) => baseType && baseType.id === 'json' && (intake.filename || '').split('/').pop().toLowerCase() === 'devbox.json',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Devbox project configuration — nix packages, shell init hooks, env variables, and scripts.' },
};
