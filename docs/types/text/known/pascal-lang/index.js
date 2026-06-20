export const plugin = {
  id: 'pascal-lang',
  label: 'Pascal',
  tags: ['pascal', 'freepascal', 'delphi', 'compiled', 'language'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (/\.(pas|pp|dpr|dpk)$/.test(name)) return true;
    const text = intake.text || '';
    const kws = ['program ', 'unit ', 'interface', 'implementation', 'procedure ', 'function ', 'begin', 'end.'];
    const matched = kws.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
    return matched.length >= 4;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pascal / Free Pascal / Delphi source file — a strongly-typed, procedural and object-oriented programming language.',
    usedFor: [
      { label: 'Free Pascal documentation', description: 'Free Pascal Compiler reference manual', href: 'https://www.freepascal.org/docs.html' },
      { label: 'Delphi reference', description: 'Embarcadero Delphi language reference', href: 'https://docwiki.embarcadero.com/RADStudio/en/Delphi_Language_Reference' },
    ],
  },
};
export default plugin;
