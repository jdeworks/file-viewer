export const plugin = {
  id: 'frpc-config',
  label: 'FRP Client Config',
  tags: ['frp', 'proxy', 'tunnel', 'toml'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'frpc.toml' || n === 'frpc.ini';
  },
  loadRenderer: () => import('./renderer.js'),
};
export default plugin;
