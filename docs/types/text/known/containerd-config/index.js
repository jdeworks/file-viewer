export default {
  id: 'containerd-config',
  label: 'containerd Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // containerd config file named config.toml inside containerd path
    if (n === 'config.toml' && (text.includes('[plugins."io.containerd') || text.includes('containerd'))) return true;
    if (n === 'containerd.toml') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'containerd configuration — container runtime settings, snapshotter, CRI plugin, and registry mirrors.',
    usedFor: [{ label: 'containerd', description: 'Industry-standard container runtime', href: 'https://github.com/containerd/containerd/blob/main/docs/man/containerd-config.toml.5.md' }],
  },
};
