export default {
  id: 'wakapi-config',
  label: 'Wakapi Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'wakapi.yml' && n !== 'config.yml') return false;
    const text = intake.text || '';
    return (text.includes('password_salt:') || text.includes('wakatime')) && text.includes('database:');
  },
  loadRenderer: () => import('./renderer.js'),
};
