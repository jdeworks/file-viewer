export default {
  id: 'dex-config',
  label: 'Dex OIDC Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'dex.yaml' && n !== 'dex.yml' && n !== 'config.yaml') return false;
    const text = intake.text || '';
    return text.includes('issuer:') && (text.includes('connectors:') || text.includes('staticClients:') || text.includes('enablePasswordDB:'));
  },
  loadRenderer: () => import('./renderer.js'),
};
