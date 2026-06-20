export const plugin = {
  id: 'frps-config',
  label: 'FRP Server Config',
  tags: ['frp', 'proxy', 'server', 'toml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'frps.toml' || n === 'frps.ini';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
