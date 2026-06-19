export default {
  id: 'redirects',
  label: 'Netlify _redirects',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === '_redirects';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Netlify _redirects file — defines URL redirect and rewrite rules in plain text format.',
    usedFor: [{ label: 'Netlify Redirects', description: 'URL redirect rules for Netlify deployments', href: 'https://docs.netlify.com/routing/redirects/' }],
  },
};
