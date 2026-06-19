export default {
  id: 'svelte-config',
  label: 'SvelteKit Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^svelte\.config\.(js|ts)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'SvelteKit configuration — defines adapter, prerendering, CSP, and aliases.' },
};
