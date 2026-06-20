export const plugin = {
  id: 'vsftpd-conf',
  label: 'vsftpd Config',
  tags: ['vsftpd', 'ftp', 'server', 'linux'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vsftpd.conf';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
