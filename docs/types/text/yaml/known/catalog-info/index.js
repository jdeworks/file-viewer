export default {
  id: 'catalog-info',
  label: 'Backstage Catalog Entity',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'catalog-info.yaml' || name === 'catalog-info.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Backstage service catalog entity descriptor — kind, metadata, spec (type, lifecycle, owner, dependencies).',
    usedFor: [{ label: 'Backstage catalog', description: 'Register services in the Backstage developer portal', href: 'https://backstage.io/docs/features/software-catalog/descriptor-format' }],
  },
};
