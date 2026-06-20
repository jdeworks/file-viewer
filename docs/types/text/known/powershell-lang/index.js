export const plugin = {
  id: 'powershell-lang',
  label: 'PowerShell',
  tags: ['powershell', 'ps1', 'psm1', 'psd1', 'windows', 'scripting'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.ps1') || name.endsWith('.psm1') || name.endsWith('.psd1')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PowerShell is a cross-platform task automation shell and scripting language. .ps1 are scripts, .psm1 are modules, .psd1 are module manifests/data files.',
    usedFor: [
      { label: 'PowerShell Docs', description: 'Official Microsoft PowerShell documentation', href: 'https://learn.microsoft.com/en-us/powershell/' },
      { label: 'PowerShell Gallery', description: 'Community module repository', href: 'https://www.powershellgallery.com/' },
    ],
  },
};
export default plugin;
