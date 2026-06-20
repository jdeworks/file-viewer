export default {
  id: 'avro-schema',
  label: 'Avro Schema',
  tags: ['avro', 'schema', 'data'],
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'json') return false;
    const filename = (intake.name || intake.filename || '').toLowerCase();
    if (filename.endsWith('.avsc')) return true;
    // Content-based detection
    const t = intake.textSample || intake.text || '';
    if (t.includes('"type"') && t.includes('"record"') && t.includes('"fields"')) {
      // Deeper check: must have record + fields + namespace at top level
      try {
        const obj = intake.parsed ?? JSON.parse(intake.text || '{}');
        const root = Array.isArray(obj) ? obj[0] : obj;
        return root && root.type === 'record' && Array.isArray(root.fields) && typeof root.namespace === 'string';
      } catch { return false; }
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache Avro schema definition — describes record types, field names, types, defaults, and documentation for data serialization.',
    usedFor: [
      { label: 'Apache Avro', description: 'Data serialization framework with rich data structures and schema evolution', href: 'https://avro.apache.org/docs/current/spec.html' },
      { label: '.avsc files', description: 'Avro schema files used in Kafka, Spark, and data pipelines', href: 'https://avro.apache.org/docs/current/spec.html#schemas' },
    ],
  },
};
