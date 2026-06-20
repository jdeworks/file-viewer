export default {
  id: 'smb-conf',
  label: 'Samba Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'smb.conf' || n === 'samba.conf') return true;
    if (text.includes('[global]') && (text.includes('workgroup') || text.includes('netbios name'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Samba configuration file — defines Windows-compatible file sharing, authentication, and network browser settings.',
    usedFor: [{ label: 'Samba', description: 'SMB/CIFS file sharing for Linux', href: 'https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html' }],
  },
};
