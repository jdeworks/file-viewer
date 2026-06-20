export default {
  id: 'ssh-config',
  label: 'SSH Config',
  match(intake) {
    const fullPath = intake.name || intake.filename || '';
    const n = fullPath.split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Standard SSH config file names
    if (n === 'config' && fullPath.includes('.ssh/')) return true;
    if (n === 'ssh_config' || n === 'ssh-config') return true;
    // Content heuristic: Host blocks with HostName/IdentityFile
    if (text.includes('Host ') && (text.includes('HostName') || text.includes('IdentityFile'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSH client configuration — host aliases, connection settings, key paths, and proxy configuration.',
    usedFor: [{ label: 'ssh_config', description: 'OpenSSH client configuration file', href: 'https://man.openbsd.org/ssh_config.5' }],
  },
};
