export default {
  id: 'twenty-crm-config',
  label: 'Twenty CRM Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'twenty.env';
  },
  loadRenderer: () => import('./renderer.js'),
};
