export const plugin = {
  id: 'pdns-recursor-conf',
  label: 'PowerDNS Recursor Config',
  tags: ['powerdns', 'pdns', 'dns', 'recursor', 'resolver'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'recursor.conf' || n === 'pdns-recursor.conf';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
