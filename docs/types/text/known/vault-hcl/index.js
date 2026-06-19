export default {
  id: 'vault-hcl',
  label: 'Vault config',
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'vault.hcl' || n === 'vault-config.hcl') return true;
    if (n === 'config.hcl') {
      const text = intake.textSample || intake.text || '';
      return text.includes('storage "') || text.includes("storage '") || /listener\s+"tcp"/.test(text) || /listener\s+'tcp'/.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Vault server configuration — storage backend, listeners, seals, HA settings, and telemetry.',
    usedFor: [{ label: 'Secret management', description: 'Configure HashiCorp Vault server: storage, listeners, TLS, seals, and cluster settings.', href: 'https://developer.hashicorp.com/vault/docs/configuration' }],
  },
};
