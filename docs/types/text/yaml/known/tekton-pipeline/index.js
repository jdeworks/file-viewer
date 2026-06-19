export default {
  id: 'tekton-pipeline',
  label: 'Tekton Pipeline / Task',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('tekton.dev') || (t.includes('kind: Pipeline') && t.includes('tasks:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Tekton Pipeline or Task manifest — shows params, tasks, and steps for cloud-native CI/CD.',
    usedFor: [{ label: 'Kubernetes-native CI/CD', description: 'Define reusable Tekton Pipelines and Tasks that run on Kubernetes.', href: 'https://tekton.dev/docs/' }],
  },
};
