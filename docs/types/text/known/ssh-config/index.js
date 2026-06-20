export default {
  id: 'ssh-client-config',
  label: 'SSH Client Config',
  match(intake, baseType) {
    // Don't override the dedicated ssh-config base type renderer.
    if (baseType && baseType.id === 'ssh-config') return false;
    const fullPath = intake.name || intake.filename || '';
    const n = fullPath.split('/').pop().toLowerCase();
    // Match the canonical Unix client config filename (underscore form) only.
    if (n === 'ssh_config') return true;
    if (n === 'config' && fullPath.includes('.ssh/')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSH client configuration — host aliases, connection settings, key paths, and proxy configuration.',
    usedFor: [{ label: 'ssh_config', description: 'OpenSSH client configuration file', href: 'https://man.openbsd.org/ssh_config.5' }],
  },
};
