export default {
  id: 'sshd-config',
  label: 'sshd_config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'sshd_config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSH daemon configuration — controls SSH server listening ports, authentication methods, and access restrictions.',
    usedFor: [{ label: 'sshd_config', description: 'OpenSSH daemon configuration file', href: 'https://man.openbsd.org/sshd_config.5' }],
  },
};
