export default {
  id: 'rdp-config',
  label: 'RDP Config',
  match(intake) {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    if (n.endsWith('.rdp')) return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('full address:s:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Windows Remote Desktop Protocol configuration file — connection settings, credentials, and display options.',
    usedFor: [{ label: 'mstsc', description: 'Windows Remote Desktop Connection client', href: 'https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-clients' }],
  },
};
