export default {
  id: 'crowdsec-acquis',
  label: 'CrowdSec Acquis',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'acquis.yaml' || n === 'acquis.yml';
  },
  loadRenderer: () => import('./renderer.js'),
};
