export const plugin = {
  id: 'liquid-template',
  label: 'Liquid Template',
  tags: ['liquid', 'shopify', 'jekyll', 'template', 'web'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    // Matches *.liquid, *.css.liquid, *.js.liquid etc.
    return name.endsWith('.liquid');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Liquid is a template language created by Shopify, also used by Jekyll for static sites. It uses {{ output }} tags for variable output and {% logic %} tags for control flow, filters, and includes.',
    usedFor: [
      { label: 'Shopify Liquid docs', description: 'Official Liquid templating reference for Shopify themes', href: 'https://shopify.dev/docs/api/liquid' },
      { label: 'Jekyll Liquid usage', description: 'Liquid templates in Jekyll static sites', href: 'https://jekyllrb.com/docs/liquid/' },
    ],
  },
};
export default plugin;
