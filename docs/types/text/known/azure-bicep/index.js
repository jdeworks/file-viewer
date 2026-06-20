export const plugin = {
  id: 'azure-bicep',
  label: 'Azure Bicep',
  tags: ['azure', 'bicep', 'arm', 'infrastructure', 'iac', 'microsoft'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /\.(bicep|bicepparam)$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Azure Bicep template — a domain-specific language for deploying Azure resources, abstracting Azure Resource Manager (ARM) JSON templates.',
    usedFor: [{ label: 'Bicep docs', description: 'Azure Bicep language documentation and resource reference', href: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview' }],
  },
};
export default plugin;
