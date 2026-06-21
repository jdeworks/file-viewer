export const plugin = {
  id: 'neomutt-conf',
  label: 'NeoMutt Config',
  tags: ['neomutt', 'mutt', 'email', 'mail-client', 'config'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Defer plain (neo)muttrc to the dedicated muttrc plugin.
    if (name === '.muttrc' || name === 'muttrc') return false;
    if (name === '.neomuttrc' || name === 'neomuttrc') return true;
    const text = intake.text || '';
    // NeoMutt-specific: requires at least 2 of these neomutt-specific keywords
    const neomuttSpecific = [
      /sidebar_width/,
      /sidebar_format/,
      /color sidebar/,
      /virtual-mailboxes/,
      /set sidebar_visible/,
      /bind index,pager/,
    ];
    const matchCount = neomuttSpecific.filter((re) => re.test(text)).length;
    return (
      matchCount >= 2 &&
      /set realname/.test(text) &&
      /set from/.test(text)
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NeoMutt mail client configuration — defines identity, mailboxes, sidebar layout, key bindings, and color schemes.',
    usedFor: [
      { label: 'NeoMutt documentation', description: 'NeoMutt user guide and configuration reference', href: 'https://neomutt.org/guide/' },
    ],
  },
};
export default plugin;
