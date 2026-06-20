// ClickHouse server/users configuration: config.xml or users.xml containing <clickhouse> or <yandex>.
export default {
  id: 'clickhouse-config',
  label: 'ClickHouse config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.xml' && n !== 'users.xml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('<clickhouse>') || t.includes('<yandex>');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ClickHouse server or users configuration — listen host/port, max connections, memory limits, logging, and user quotas.',
    usedFor: [{ label: 'ClickHouse', description: 'Configure ClickHouse server network, memory, logging, users, and access management.', href: 'https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings' }],
  },
};
