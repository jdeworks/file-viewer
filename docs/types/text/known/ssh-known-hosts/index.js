export default {
  id: 'ssh-known-hosts',
  label: 'SSH Known Hosts',
  tags: ['ssh', 'security', 'host-keys', 'network'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'known_hosts' || n === 'known_hosts2') return true;
    // System-wide known hosts
    if (n === 'ssh_known_hosts' || n === 'ssh_known_hosts2') return true;
    const text = intake.textSample || intake.text || '';
    // Content guard: lines that look like "hostname keytype base64key" with common SSH key types
    if (/(^|\n)[\w\[*,.-]+\s+(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp|ssh-dss|sk-ssh-ed25519)\s+[A-Za-z0-9+/]+=*/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SSH known hosts file — stores fingerprints of trusted SSH server host keys to prevent MITM attacks.',
    usedBy: [{ label: 'OpenSSH', description: 'SSH client known hosts database', href: 'https://man.openbsd.org/ssh_known_hosts.5' }],
  },
};
