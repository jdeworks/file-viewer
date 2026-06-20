export default {
  id: 'netbox-config',
  label: 'NetBox Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'configuration.py' && n !== 'netbox-configuration.py') return false;
    const text = intake.text || '';
    return text.includes('ALLOWED_HOSTS') && (text.includes('DATABASE') || text.includes('REDIS')) && text.includes('SECRET_KEY');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NetBox DCIM/IPAM network documentation tool Django configuration — database, Redis, secrets, allowed hosts, localization, and plugins.',
    tags: ['netbox', 'dcim', 'ipam', 'django', 'network', 'config'],
  },
};
