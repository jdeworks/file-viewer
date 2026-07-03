export default {
  id: 'wakapi-config',
  label: 'Wakapi Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'wakapi.yaml' || n === 'wakapi.yml' || n === 'wakapi.cfg') return true;
    const text = intake.text || '';
    if (text.includes('security.password_salt:') || text.includes('password_salt:')) return true;
    if (text.includes('aggregation_time:') && text.includes('server:') && text.includes('db:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Wakapi self-hosted coding activity tracker (WakaTime-compatible) configuration file.',
    tags: ['wakapi', 'wakatime', 'coding-stats', 'self-hosted', 'config'],
  },
};
