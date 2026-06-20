export default {
  id: 'lxc-config',
  label: 'LXC Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'config' || n === 'lxc.conf') {
      if (text.includes('lxc.uts.name') || text.includes('lxc.utsname') ||
          text.includes('lxc.rootfs') || text.includes('lxc.net.0') || text.includes('lxc.network.type')) return true;
    }
    if (text.match(/^lxc\.\w/m) && (text.includes('lxc.rootfs') || text.includes('lxc.net') || text.includes('lxc.arch'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'LXC container configuration — defines container identity, network, resource limits, mounts, and security settings.',
    usedFor: [{ label: 'LXC', description: 'Linux Containers — operating system-level virtualization', href: 'https://linuxcontainers.org/lxc/getting-started/' }],
  },
};
