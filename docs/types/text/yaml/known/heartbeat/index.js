export default {
  id: 'heartbeat',
  label: 'Heartbeat',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'heartbeat.yml' || n === 'heartbeat.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elastic Heartbeat configuration — uptime monitors (HTTP, TCP, ICMP), scheduler settings, and output.',
    usedFor: [{ label: 'Uptime monitoring', description: 'Configure Heartbeat to probe HTTP endpoints, TCP ports, and ICMP hosts on a schedule and ship availability data to Elasticsearch for use in Kibana Uptime.', href: 'https://www.elastic.co/guide/en/beats/heartbeat/current/heartbeat-overview.html' }],
  },
};
