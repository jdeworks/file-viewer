export default {
  id: 'fstab',
  label: 'fstab',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'fstab') return true;
    // Skip file extensions that aren't fstab
    if (/\.(eps|ps|log|md|txt|yaml|yml|json|xml|html|css|js|ts|py|rb|sh)$/.test(n)) return false;
    // Content: lines with 6 mount fields (device mountpoint fstype options dump pass)
    // device must look like a real block device, UUID, LABEL, or known pseudo-fs
    const fstabDevice = /^(\/dev\/|UUID=|LABEL=|PARTUUID=|tmpfs$|proc$|sysfs$|devpts$|none$|overlay$|nfs|cifs|\/\/)/i;
    const nonCommentLines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const looksLikeFstab = nonCommentLines.filter(l => {
      const parts = l.trim().split(/\s+/);
      // field[0]=device, field[1]=mountpoint (must start with /), field[2]=fstype, field[3]=options
      return parts.length >= 4 && fstabDevice.test(parts[0]) && parts[1].startsWith('/');
    }).length;
    return looksLikeFstab >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Linux filesystem table — defines how disk partitions, devices, and remote file systems should be mounted.',
    usedFor: [{ label: 'fstab', description: 'Linux file system mount configuration', href: 'https://man7.org/linux/man-pages/man5/fstab.5.html' }],
  },
};
