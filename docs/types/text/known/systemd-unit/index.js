export default {
  id: 'systemd-unit',
  label: 'systemd Unit',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n.endsWith('.service') || n.endsWith('.timer') || n.endsWith('.socket') ||
        n.endsWith('.mount') || n.endsWith('.target') || n.endsWith('.path') ||
        n.endsWith('.scope') || n.endsWith('.slice')) return true;
    if (text.includes('[Unit]') && (text.includes('[Service]') || text.includes('[Timer]') || text.includes('[Socket]'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'systemd unit file — defines a service, timer, socket, or other system unit for the init system.',
    usedFor: [{ label: 'systemd', description: 'Linux service manager and init system', href: 'https://www.freedesktop.org/software/systemd/man/systemd.unit.html' }],
  },
};
