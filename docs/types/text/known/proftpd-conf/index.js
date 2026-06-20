export const plugin = {
  id: 'proftpd-conf',
  label: 'ProFTPD Config',
  tags: ['proftpd', 'ftp', 'server', 'linux'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'proftpd.conf';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
