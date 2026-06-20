export default {
  id: 'dvc-pipeline',
  label: 'DVC Pipeline',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    return name === 'dvc.yaml' && text.includes('stages:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'DVC pipeline definition — declares stages with commands, dependencies, outputs, and parameters for reproducible ML pipelines.',
    usedFor: [{ label: 'DVC', description: 'Data Version Control — ML pipeline orchestration and data management', href: 'https://dvc.org/doc/user-guide/project-structure/dvcyaml-files' }],
  },
};
