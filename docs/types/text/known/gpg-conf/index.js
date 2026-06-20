export default {
  id: 'gpg-conf',
  label: 'GnuPG Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'gpg.conf' || n === 'gpg2.conf' || n === 'dirmngr.conf' || n === 'gpg-agent.conf') return true;
    if ((text.includes('keyserver ') || text.includes('default-key ')) && (text.includes('keyserver-options') || text.includes('use-agent') || text.includes('cert-digest-algo'))) return true;
    if (text.includes('default-key') && text.includes('keyid-format')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GnuPG configuration — controls key servers, algorithms, display preferences, and default keys for GnuPG operations.',
    usedFor: [{ label: 'GnuPG', description: 'GNU Privacy Guard — free implementation of the OpenPGP standard', href: 'https://www.gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html' }],
  },
};
