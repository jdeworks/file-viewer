export default {
  id: 'ssh-config',
  label: 'SSH Config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    const text = intake.text || '';
    return name === 'config' && (text.includes('Host ') || text.includes('IdentityFile') || text.includes('StrictHostKeyChecking'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSH client configuration — host aliases, connection settings, key paths, and proxy configuration.',
    usedFor: [{ label: 'ssh_config', description: 'OpenSSH client configuration file', href: 'https://man.openbsd.org/ssh_config.5' }],
  },
};
