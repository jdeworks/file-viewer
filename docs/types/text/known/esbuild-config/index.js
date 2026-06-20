export default {
  id: 'esbuild-config',
  label: 'esbuild config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'esbuild.config.mjs' || n === 'esbuild.config.js' || n === 'esbuild.config.ts' ||
           n === 'esbuild.config.cjs' || n === 'build.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'esbuild configuration — entry points, bundle output, minification, target environments, and plugins for the esbuild JavaScript bundler.',
    usedFor: [{ label: 'esbuild', description: 'Fast JavaScript bundler and minifier', href: 'https://esbuild.github.io/api/' }],
  },
};
