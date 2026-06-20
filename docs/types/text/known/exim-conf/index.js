export default {
  id: 'exim-conf',
  label: 'Exim Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'exim4.conf' || n === 'exim.conf' || n === 'configure' || n === 'update-exim4.conf.conf') return true;
    if (text.includes('begin routers') && text.includes('begin transports')) return true;
    if (text.includes('primary_hostname') && text.includes('domainlist') && text.includes('begin acl')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Exim MTA configuration — controls mail routing, transport, access control, and TLS for the Exim mail transfer agent.',
    usedFor: [{ label: 'Exim', description: 'Message transfer agent widely used on Unix systems', href: 'https://www.exim.org/exim-html-current/doc/html/spec_html/' }],
  },
};
