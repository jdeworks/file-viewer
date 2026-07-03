export default {
  id: 'xorg-conf',
  label: 'Xorg Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'xorg.conf' || n.endsWith('.conf') && n.startsWith('xorg.conf')) return true;
    const text = intake.textSample || intake.text || '';
    // xorg.conf.d drop-ins share the NN-name.conf naming convention with many unrelated
    // tools (systemd, udev, NetworkManager, logrotate…) — require Xorg-specific content too.
    if (n.match(/^\d{2}-\w+\.conf$/) && /Section\s+"/.test(text)) return true;
    // Xorg sections: Section "ServerLayout" / "Screen" / "Device" / "Monitor"
    if (text.includes('Section "ServerLayout"') || text.includes('Section "Screen"')) return true;
    if (text.includes('Section "Device"') && (text.includes('Driver') || text.includes('Option'))) return true;
    if (text.includes('Section "InputClass"') && text.includes('MatchIsPointer')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Xorg X11 server configuration — display, monitor, GPU driver, and input device settings.',
    tags: ['xorg', 'x11', 'display', 'gpu', 'config'],
  },
};
