export default {
  id: 'crystal-shard',
  label: 'Crystal Shard',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'shard.yml' && n !== 'shard.lock') return false;
    const text = intake.textSample || intake.text || '';
    // shard.yml has 'name:' at top and optionally 'crystal:' version
    if (text.includes('crystal:') || (text.includes('dependencies:') && text.includes('github:'))) return true;
    // shard.lock detection
    if (n === 'shard.lock' && text.includes('version:') && text.includes('git:')) return true;
    // if name.yml with shard fields
    if (text.match(/^name:\s*\S+/m) && text.includes('authors:') && text.includes('version:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Crystal language shard.yml package manifest — dependencies, version, and build targets.',
    tags: ['crystal', 'shard', 'package', 'manifest'],
  },
};
