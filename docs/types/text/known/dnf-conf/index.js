export default {
  id: 'dnf-conf',
  label: 'DNF Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'dnf.conf' || n === 'yum.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[main]') && text.includes('gpgcheck') && (text.includes('cachedir') || text.includes('keepcache'))) return true;
    if (text.includes('fastestmirror') && text.includes('max_parallel_downloads')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'DNF/YUM package manager configuration — cache, GPG verification, parallel downloads, and proxy settings.',
    tags: ['dnf', 'yum', 'fedora', 'rhel', 'linux', 'package', 'config'],
  },
};
