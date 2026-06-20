export default {
  id: 'nix-config',
  label: 'Nix config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['flake.nix', 'shell.nix', 'default.nix', 'configuration.nix', 'home.nix'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nix configuration file — package definitions, flake inputs/outputs, development shells, or NixOS system configuration.',
  },
};
