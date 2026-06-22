export default {
  id: 'jvm-options',
  label: 'JVM Options',
  match: (intake) => {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'jvm.options' || n === 'jvm-default.options') return true;
    if (n.endsWith('.options') && n.startsWith('jvm')) return true;
    const text = intake.text || '';
    return n.endsWith('.options') && (text.includes('-Xms') || text.includes('-Xmx') || text.includes('-XX:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'JVM options file (Elasticsearch, Logstash, etc.) — heap sizing, GC configuration, system properties, and other JVM tuning flags.' },
};
