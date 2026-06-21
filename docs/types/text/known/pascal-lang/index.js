const PASCAL_EXTS = new Set(['pas', 'pp', 'dpr', 'dpk']);

export const plugin = {
  id: 'pascal-lang',
  label: 'Pascal',
  tags: ['pascal', 'freepascal', 'delphi', 'compiled', 'language'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (/\.(pas|pp|dpr|dpk)$/.test(name)) return true;
    // The content heuristic (program/unit/begin/end. keywords) appears in other languages
    // (Fortran, Ada). Only content-match files with no/unknown extension (a bare extension guard).
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && !PASCAL_EXTS.has(ext)) return false;
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
