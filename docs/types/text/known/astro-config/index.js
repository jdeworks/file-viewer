export default {
  id: 'astro-config',
  label: 'Astro Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return /^astro\.config\.(mjs|ts|js)$/.test(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Astro framework configuration — defines integrations, output mode, adapter, and site settings.' },
};
