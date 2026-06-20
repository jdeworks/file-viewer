export default {
  id: 'crossplane-config',
  label: 'Crossplane config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('crossplane.io') && (
      t.includes('kind: Configuration') ||
      t.includes('kind: Provider') ||
      t.includes('kind: CompositeResourceDefinition') ||
      t.includes('kind: Composition')
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crossplane resource manifest — shows kind, apiVersion, name, and spec summary for Providers, Configurations, XRDs, and Compositions.',
    usedFor: [{ label: 'Cloud infrastructure control plane', description: 'Crossplane extends Kubernetes to provision and manage cloud infrastructure as custom resources.', href: 'https://docs.crossplane.io/' }],
  },
};
