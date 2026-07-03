export default {
  id: 'esbuild-config',
  label: 'esbuild config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'esbuild.config.mjs' || n === 'esbuild.config.js' || n === 'esbuild.config.ts' || n === 'esbuild.config.cjs') return true;
    // "build.mjs" is a generic name lots of bundler-agnostic projects use — only claim it when
    // the content actually references the esbuild package, to avoid shadowing unrelated build
    // scripts (webpack/rollup/custom) that happen to share the filename.
    if (n === 'build.mjs') {
      const text = intake.textSample || intake.text || '';
      return /(?:from|require\()\s*['"]esbuild['"]/.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'esbuild configuration — entry points, bundle output, minification, target environments, and plugins for the esbuild JavaScript bundler.',
    usedFor: [{ label: 'esbuild', description: 'Fast JavaScript bundler and minifier', href: 'https://esbuild.github.io/api/' }],
  },
};
