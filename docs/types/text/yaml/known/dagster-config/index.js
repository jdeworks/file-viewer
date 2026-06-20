export const plugin = {
  id: 'dagster-config',
  label: 'Dagster Config',
  tags: ['orchestration', 'data'],
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'dagster.yaml') return true;
    if (n === 'workspace.yaml') {
      const text = intake.textSample || intake.text || '';
      return text.includes('load_from:');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dagster data orchestration configuration — dagster.yaml configures storage, logging, and compute backends; workspace.yaml defines code locations (python packages, files, or gRPC servers).',
    usedFor: [{ label: 'Dagster', description: 'Open-source data orchestration platform', href: 'https://docs.dagster.io/deployment/dagster-instance' }],
  },
};
export default plugin;
