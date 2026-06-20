export default {
  id: 'odoo-conf',
  label: 'Odoo ERP server config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'odoo.conf' || n === 'odoo-server.conf' || n === 'openerp-server.conf' || n === 'odoo.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Odoo ERP server configuration — defines database connection, HTTP ports, worker counts, memory limits, and addon paths.',
    usedFor: [{ label: 'Odoo', description: 'Open-source ERP and CRM platform for business applications.', href: 'https://www.odoo.com/documentation/17.0/administration/install/deploy.html' }],
  },
};
