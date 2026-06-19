export default {
  id: 'vercel-json',
  label: 'Vercel Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop();
    return name === 'vercel.json' || name === '.vercel.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vercel deployment configuration — framework preset, build output, routes/rewrites, and environment variables.',
    usedFor: [
      { label: 'Vercel deployments', description: 'Configure how Vercel builds and routes your project' },
    ],
  },
};
