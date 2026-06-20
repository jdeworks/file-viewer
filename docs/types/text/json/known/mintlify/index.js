export const plugin = {
  id: 'mintlify',
  label: 'Mintlify docs',
  tags: ['documentation', 'mintlify', 'docs'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'mint.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mintlify documentation platform configuration — defines branding, navigation, API settings, and integrations for a Mintlify-powered docs site.',
    usedFor: [{ label: 'Mintlify', description: 'Beautiful documentation, built to convert', href: 'https://mintlify.com/docs/quickstart' }],
  },
};
export default plugin;
