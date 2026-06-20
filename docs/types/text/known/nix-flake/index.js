export default {
  id: 'nix-flake',
  label: 'Nix Flake',
  tags: ['nix', 'nixos', 'flake', 'package-manager', 'reproducible'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'flake.nix') return false;
    const text = (intake.textSample || intake.text || '').slice(0, 2000);
    return text.includes('outputs =') || text.includes('inputs.') || text.includes('nixpkgs');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nix flake — reproducible, composable Nix configuration with pinned inputs and declared outputs.',
    usedFor: [{ label: 'Nix flakes', description: 'Nix flake reference documentation', href: 'https://nix.dev/concepts/flakes' }],
  },
};
