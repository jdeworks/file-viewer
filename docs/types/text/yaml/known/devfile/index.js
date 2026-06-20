export const plugin = {
  id: 'devfile',
  label: 'Devfile',
  tags: ['devworkspace', 'openshift', 'che', 'development'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'devfile.yaml' || n === 'devfile.yml') return true;
    // content heuristic
    const t = intake.text || '';
    return /^schemaVersion:\s*2\./m.test(t) && /^(components|commands|projects):/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Devfile v2 — developer workspace specification used by Red Hat OpenShift Dev Spaces, Eclipse Che, and compatible tooling.',
    usedFor: [{ label: 'Developer workspaces', description: 'Define portable, reproducible development environments with components, commands, and starter projects.', href: 'https://devfile.io/' }],
  },
};
export default plugin;
