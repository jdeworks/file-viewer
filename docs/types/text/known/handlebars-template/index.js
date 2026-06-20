export const plugin = {
  id: 'handlebars-template',
  label: 'Handlebars Template',
  tags: ['handlebars', 'hbs', 'mustache', 'template', 'javascript'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.hbs') || name.endsWith('.handlebars') || name.endsWith('.mustache.hbs')) return true;
    const text = intake.text || '';
    // Content-based: require at least one Handlebars block helper or partial
    return /\{\{#(?:if|each|with|unless|>)/.test(text) || /\{\{>\s*\w/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Handlebars is a logic-minimal templating language that extends Mustache. It supports block helpers like {{#if}}, {{#each}}, partials via {{> name}}, and custom helper registration.',
    usedFor: [
      { label: 'Handlebars.js docs', description: 'Official Handlebars.js documentation', href: 'https://handlebarsjs.com/' },
      { label: 'Ember.js templates', description: 'Handlebars is the basis of Ember.js component templates', href: 'https://guides.emberjs.com/release/components/' },
    ],
  },
};
export default plugin;
