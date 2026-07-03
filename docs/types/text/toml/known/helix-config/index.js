export default {
  id: 'helix-config',
  label: 'Helix Config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'config.toml' || n === 'helix.toml') {
      const text = intake.textSample || intake.text || '';
      if (text.includes('[editor]') && (text.includes('theme') || text.includes('cursor-shape') || text.includes('line-number'))) return true;
      if (text.includes('[keys.normal]') || text.includes('[keys.insert]')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Helix modal text editor configuration — theme, editor behavior, LSP, and key mappings.',
    tags: ['helix', 'editor', 'modal', 'config', 'toml'],
  },
};
