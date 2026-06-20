export const plugin = {
  id: 'pdns-conf',
  label: 'PowerDNS Authoritative Config',
  tags: ['powerdns', 'pdns', 'dns', 'authoritative'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'pdns.conf';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
