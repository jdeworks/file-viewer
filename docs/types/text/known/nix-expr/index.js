export const plugin = {
  id: 'nix-expr',
  label: 'Nix expression',
  tags: ['nix', 'nixos', 'package-manager', 'functional'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Exclude well-known filenames handled by nix-config plugin
    if (['flake.nix', 'shell.nix', 'default.nix', 'configuration.nix', 'home.nix'].includes(name)) return false;
    return /\.nix$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nix expression language file — functional, lazy, purely declarative expressions for packages, modules, or configuration.',
    usedFor: [{ label: 'Nix language docs', description: 'The Nix expression language reference', href: 'https://nix.dev/manual/nix/stable/language/' }],
  },
};
export default plugin;
