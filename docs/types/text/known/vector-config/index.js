export default {
  id: 'vector-config',
  label: 'Vector Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'vector.toml' || n === 'vector.yaml' || n === 'vector.yml' || n === 'vector.json') return true;
    if (text.includes('[sources.') && (text.includes('[transforms.') || text.includes('[sinks.'))) return true;
    if (text.includes('sources:') && text.includes('sinks:') && (text.includes('type: "file"') || text.includes('type: "kafka"') || text.includes('type: "http"') || text.includes("type: 'file'"))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vector data pipeline configuration — defines sources, transforms, and sinks for log, metric, and trace processing.',
    usedFor: [{ label: 'Vector', description: 'High-performance observability data pipeline', href: 'https://vector.dev/' }],
  },
};
