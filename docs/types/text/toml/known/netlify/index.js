export default {
  id: 'netlify-toml',
  label: 'Netlify Config',
  match: (intake) => (intake.name || intake.filename || '').split('/').pop().toLowerCase() === 'netlify.toml',
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Netlify deployment configuration — build command, publish directory, redirects, and environment variables.',
    usedFor: [
      { label: 'Static sites', description: 'Build and deploy static websites and SPAs to Netlify' },
    ],
  },
};
