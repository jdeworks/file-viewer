export default {
  id: 'crowdsec-config',
  label: 'CrowdSec Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.yaml' && n !== 'crowdsec-config.yaml') return false;
    const text = intake.text || '';
    return text.includes('db_config:') && (text.includes('crowdsec') || text.includes('cscli') || text.includes('credentials_path:'));
  },
  loadRenderer: () => import('./renderer.js'),
};
