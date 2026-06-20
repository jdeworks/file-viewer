export const plugin = {
  id: 'shopify-app',
  label: 'Shopify app',
  tags: ['shopify', 'ecommerce', 'app'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'shopify.app.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Shopify app configuration for the Shopify CLI v3+ — defines app identity, OAuth scopes, webhooks, extensions, and redirect URLs.',
    usedFor: [
      { label: 'Shopify apps', description: 'Configure and deploy Shopify apps using the Shopify CLI', href: 'https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration' },
    ],
  },
};

export default plugin;
