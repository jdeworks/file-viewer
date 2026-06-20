export default {
  id: 'fstab',
  label: 'fstab',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'fstab') return true;
    // Content: lines with 6 mount fields (device mountpoint fstype options dump pass)
    const nonCommentLines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const looksLikeFstab = nonCommentLines.filter(l => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 5 && (parts[0].startsWith('/') || parts[0].startsWith('UUID=') || parts[0].startsWith('LABEL='));
    }).length;
    return looksLikeFstab >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linux filesystem table — defines how disk partitions, devices, and remote file systems should be mounted.',
    usedFor: [{ label: 'fstab', description: 'Linux file system mount configuration', href: 'https://man7.org/linux/man-pages/man5/fstab.5.html' }],
  },
};
