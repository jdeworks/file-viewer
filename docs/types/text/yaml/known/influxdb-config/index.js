export default {
  id: 'influxdb-config',
  label: 'InfluxDB Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'influxdb.yml' || n === 'influxdb.yaml') return true;
    const cfg = intake.parsed || {};
    return cfg['bolt-path'] !== undefined && cfg['engine-path'] !== undefined;
  },
  loadRenderer: () => import('./renderer.js'),
};
