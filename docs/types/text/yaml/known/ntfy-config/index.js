export default {
  id: 'ntfy-config',
  label: 'ntfy Server Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'server.yml' && n !== 'ntfy-server.yml') return false;
    const text = intake.text || '';
    return text.includes('base-url:') && (text.includes('listen-http:') || text.includes('auth-default-access:') || text.includes('upstream-base-url:'));
  },
  loadRenderer: () => import('./renderer.js'),
};
