export default {
  id: 'synapse-config',
  label: 'Matrix Synapse config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'synapse.yaml') return true;
    if (n === 'homeserver.yaml') {
      const text = intake.text || '';
      return text.includes('server_name:') && (text.includes('listeners:') || text.includes('database:'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Matrix Synapse homeserver configuration — federation, database, listeners, authentication, and media settings.',
    usedFor: [{ label: 'Matrix Synapse', description: 'Matrix Synapse homeserver configuration file controlling federation, database, listeners, and authentication.', href: 'https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html' }],
  },
};
