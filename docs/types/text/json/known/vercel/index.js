export const plugin = {
  id: 'vercel-json',
  label: 'Vercel',
  tags: ['vercel', 'deploy', 'paas'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vercel.json' || n === '.vercel.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vercel deployment configuration — framework preset, build output, routes/rewrites, and environment variables.',
    usedFor: [
      { label: 'Vercel deployments', description: 'Configure how Vercel builds and routes your project', href: 'https://vercel.com/docs/projects/project-configuration' },
    ],
  },
};

export default plugin;
