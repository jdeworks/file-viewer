export default {
  id: 'rclone-conf',
  label: 'rclone Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Defer to dedicated TOML plugins (these are TOML, not rclone INI).
    if (n === 'frpc.toml' || n === 'listmonk-config.toml') return false;
    if (n === 'rclone.conf') return true;
    const text = intake.textSample || intake.text || '';
    // rclone remotes have [name] sections with type = s3/drive/dropbox/etc.
    if (text.match(/^\[[\w-]+\]/m) && text.includes('type = ')) return true;
    if (text.includes('type = s3') || text.includes('type = drive') || text.includes('type = dropbox')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'rclone cloud storage configuration — remote definitions for S3, Google Drive, Dropbox, and more.',
    tags: ['rclone', 'cloud', 'backup', 'sync', 'config'],
  },
};
