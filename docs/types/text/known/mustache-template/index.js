export const plugin = {
  id: 'mustache-template',
  label: 'Mustache Template',
  tags: ['mustache', 'template', 'logic-less'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.mustache') || name.endsWith('.mst') || name.endsWith('.ms')) return true;
    // Content-based: require section blocks with matching open/close names — more specific than bare {{ }}
    const text = intake.text || '';
    return /\{\{#(\w+)\}[\s\S]*?\{\{\/\1\}/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mustache is a logic-less templating language available across many languages. It uses {{variable}}, {{#section}}...{{/section}} blocks, {{^inverted}} sections, {{> partials}}, and {{{unescaped}}} triple-stache for raw HTML.',
    usedFor: [
      { label: 'Mustache spec', description: 'The Mustache logic-less template specification', href: 'https://mustache.github.io/mustache.5.html' },
      { label: 'mustache.js', description: 'JavaScript implementation of Mustache templates', href: 'https://github.com/janl/mustache.js' },
    ],
  },
};
export default plugin;
