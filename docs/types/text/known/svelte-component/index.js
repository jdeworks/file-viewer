export const plugin = {
  id: 'svelte-component',
  label: 'Svelte Component',
  tags: ['svelte', 'sfc', 'component', 'frontend'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.svelte');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'A Svelte single-file component (.svelte) combines script, style, and HTML template in one file. Svelte compiles components to highly optimised vanilla JavaScript at build time.',
    usedFor: [
      { label: 'Svelte docs', description: 'Official Svelte documentation', href: 'https://svelte.dev/docs' },
      { label: 'SvelteKit', description: 'Full-stack framework built on Svelte', href: 'https://kit.svelte.dev/' },
    ],
  },
};
export default plugin;
