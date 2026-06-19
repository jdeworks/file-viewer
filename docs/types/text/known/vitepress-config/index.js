export default {
  id: 'vitepress-config',
  label: 'VitePress Config',
  match(intake) {
    const path = (intake.path || intake.filename || intake.name || '').toLowerCase();
    const name = path.split('/').pop();
    const isConfigFile = name === 'config.ts' || name === 'config.mts' || name === 'config.js'
      || name === 'vitepress.config.ts' || name === 'vitepress.config.mts' || name === 'vitepress.config.js';
    if (!isConfigFile) return false;
    // Path-based: inside .vitepress directory
    if (path.includes('.vitepress')) return true;
    // Content-based fallback: import from 'vitepress'
    const text = intake.text || intake.textSample || '';
    return /from\s+['"]vitepress['"]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'VitePress documentation site configuration — defines site title, description, theme config, and navigation.' },
};
