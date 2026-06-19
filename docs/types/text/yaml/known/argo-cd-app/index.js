export default {
  id: 'argo-cd-app',
  label: 'Argo CD Application',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('argoproj.io') && (t.includes('kind: Application') || t.includes('kind: AppProject') || t.includes('kind: ApplicationSet'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Argo CD Application manifest — shows source repo, destination cluster, and sync policy.',
    usedFor: [{ label: 'GitOps continuous delivery', description: 'Declare Argo CD Application, AppProject, or ApplicationSet resources for GitOps-driven deployments.', href: 'https://argo-cd.readthedocs.io/en/stable/' }],
  },
};
