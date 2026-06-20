export const plugin = {
  id: 'nix-daemon-conf',
  label: 'Nix config',
  tags: ['nix', 'nixos', 'package-manager'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'nix.conf') return false;
    // distinguish from other nix.conf files by content heuristic
    const t = intake.text || '';
    return t.includes('substituters') || t.includes('trusted-users') || t.includes('experimental-features') || t.includes('max-jobs');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nix daemon configuration — controls binary caches, trusted users, experimental features, build concurrency, and sandboxing.',
    usedFor: [
      { label: 'nix.conf', description: 'System-wide Nix daemon settings at /etc/nix/nix.conf or per-user at ~/.config/nix/nix.conf.', href: 'https://nixos.org/manual/nix/stable/command-ref/conf-file' },
    ],
  },
};
export default plugin;
