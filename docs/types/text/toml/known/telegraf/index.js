export const plugin = {
  id: 'telegraf',
  label: 'Telegraf',
  tags: ['metrics', 'monitoring', 'influxdb', 'telegraf'],
  match(intake, baseType) {
    if (baseType?.id !== 'toml' && baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'telegraf.conf' || n === 'telegraf.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'InfluxData Telegraf metrics agent configuration — defines input plugins, output destinations, and processing pipelines.',
    usedFor: [{ label: 'Telegraf', description: 'Plugin-driven server agent for collecting and sending metrics to InfluxDB and other destinations.', href: 'https://docs.influxdata.com/telegraf/latest/configuration/' }],
  },
};
export default plugin;
