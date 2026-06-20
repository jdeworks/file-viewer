export const plugin = {
  id: 'humans-txt',
  label: 'humans.txt',
  tags: ['web', 'credits', 'team'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'humans.txt';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'humans.txt — a file crediting the people and technologies behind a website, organized into sections like TEAM, THANKS, and SITE.',
    usedFor: [{ label: 'humanstxt.org', description: 'The humans.txt initiative', href: 'https://humanstxt.org/' }],
  },
};
export default plugin;
