export default {
  id: 'restic-config',
  label: 'resticprofile Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'profiles.toml' || n === 'resticprofile.toml' || n === 'profiles.yaml' || n === 'profiles.json') return true;
    const text = intake.textSample || intake.text || '';
    // resticprofile TOML: has [global] or [profilename] with repository, password-file, etc.
    if (text.includes('repository') && text.includes('password-file') && (text.includes('[global]') || text.match(/^\[\w[\w-]*\]$/m))) return true;
    if (text.includes('initialize') && text.includes('backup') && text.includes('repository')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'resticprofile backup configuration — repository, schedule, and backup profile definitions.',
    tags: ['restic', 'resticprofile', 'backup', 'config'],
  },
};
