export const plugin = {
  id: 'nunjucks',
  label: 'Nunjucks Template',
  tags: ['nunjucks', 'njk', 'mozilla', 'jinja', 'template'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.njk') || name.endsWith('.nunjucks')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nunjucks is a Mozilla templating language for JavaScript, inspired by Jinja2. It supports template inheritance, macros, async rendering, and a rich set of filters.',
    usedFor: [
      { label: 'Nunjucks docs', description: 'Official Mozilla Nunjucks documentation', href: 'https://mozilla.github.io/nunjucks/' },
      { label: 'Eleventy', description: 'Static site generator with first-class Nunjucks support', href: 'https://www.11ty.dev/docs/languages/nunjucks/' },
    ],
  },
};
export default plugin;
