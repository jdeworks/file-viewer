export const plugin = {
  id: 'influxdb',
  label: 'InfluxDB',
  tags: ['influxdb', 'time-series', 'database'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'influxdb.conf' || n === 'influxdb.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'InfluxDB v1.x configuration — storage paths, HTTP listener, authentication, and retention policies.',
    usedFor: [{ label: 'InfluxDB v1.x config', description: 'Controls data/WAL directories, HTTP API settings, auth, and subscriber options', href: 'https://docs.influxdata.com/influxdb/v1/administration/config/' }],
  },
};

export default plugin;
