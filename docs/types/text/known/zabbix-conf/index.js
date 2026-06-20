export default {
  id: 'zabbix-conf',
  label: 'Zabbix Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'zabbix_agentd.conf' || n === 'zabbix_agent2.conf' || n === 'zabbix_server.conf' || n === 'zabbix_proxy.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Zabbix monitoring agent/server/proxy configuration — controls server addresses, monitoring targets, TLS, and remote command settings.',
    usedFor: [{ label: 'Zabbix', description: 'Enterprise-class open source distributed monitoring solution', href: 'https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/zabbix_agent' }],
  },
};
