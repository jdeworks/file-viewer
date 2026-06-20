export const plugin = {
  id: 'wpa-supplicant-conf',
  label: 'wpa_supplicant',
  tags: ['wpa_supplicant', 'wifi', 'wireless', 'network', 'linux'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'wpa_supplicant.conf' || /^wpa_supplicant[-_].+\.conf$/.test(name)) return true;
    const text = intake.text || '';
    return /ctrl_interface\s*=/i.test(text) && /network\s*=\s*\{/i.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'wpa_supplicant configuration file — manages wireless network connections on Linux systems.',
    usedFor: [
      { label: 'wpa_supplicant man page', description: 'Official wpa_supplicant configuration reference', href: 'https://linux.die.net/man/5/wpa_supplicant.conf' },
    ],
  },
};
export default plugin;
