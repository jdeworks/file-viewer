export default {
  id: 'openrc-init',
  label: 'OpenRC Init Script',
  tags: ['openrc', 'init', 'service', 'gentoo', 'alpine'],
  match(intake) {
    const fullPath = (intake.name || intake.filename || '');
    const n = fullPath.split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Scripts in /etc/init.d/ or /etc/conf.d/
    if (/\/etc\/init\.d\//.test(fullPath) || /\/etc\/conf\.d\//.test(fullPath)) {
      // Confirm it's an OpenRC-style script
      return text.includes('start()') || text.includes('stop()') || text.includes('depend()') ||
             text.includes('. /etc/rc') || text.includes('. "${RC_LIBEXECDIR}') ||
             text.includes('openrc-run') || text.includes('rc-service');
    }
    // Scripts with openrc shebang or explicitly using openrc-run
    if (text.startsWith('#!/sbin/openrc-run') || text.startsWith('#!/usr/sbin/openrc-run')) return true;
    // SH scripts that define start/stop/depend and use rc.conf idioms
    if ((text.includes('start()') && text.includes('stop()') && text.includes('depend()')) &&
        (text.includes('ebegin') || text.includes('eend') || text.includes('eerror') || text.includes('checkpath'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenRC init script — defines service start/stop/depend functions for the OpenRC init system used by Gentoo and Alpine Linux.',
    usedFor: [{ label: 'OpenRC', description: 'Dependency-based init system', href: 'https://github.com/OpenRC/openrc' }],
  },
};
