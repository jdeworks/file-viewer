export default {
  id: 'vector-toml',
  label: 'Vector config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'vector.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vector.dev log pipeline configuration — defines sources, transforms, and sinks for data collection and routing.',
    usedFor: [{ label: 'Vector', description: 'High-performance observability data pipeline for logs, metrics, and traces', href: 'https://vector.dev/docs/reference/configuration/' }],
  },
};
