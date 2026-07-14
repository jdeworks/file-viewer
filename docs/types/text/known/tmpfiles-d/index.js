// Type codes for systemd tmpfiles.d
const TMPFILES_TYPE_CODES = 'fdDlLctCwpsumaAeEv+!-?:^';

function looksLikeTmpfiles(text) {
  const lines = (text || '').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const hits = lines.filter((l) => /^[fdDlLctCwpsumaAeEv+!\-?:^] /.test(l.trim())).length;
  return hits >= 2;
}

export default {
  id: 'tmpfiles-d',
  label: 'tmpfiles.d',
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (/tmpfiles\.d\/[^/]+\.conf$/.test(name)) return true;
    const base = name.split('/').pop();
    if (base === 'gitolite.conf') return false;
    if (base.endsWith('.conf') && looksLikeTmpfiles(intake.text)) return true;
    if (base.endsWith('.tmpfiles') || base.endsWith('.tmpfiles-d')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'systemd tmpfiles.d configuration — manages creation, deletion, and cleanup of volatile and temporary files and directories.',
    usedFor: [
      { label: 'tmpfiles.d(5)', description: 'Manual page for tmpfiles.d configuration format', href: 'https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html' },
    ],
  },
};
