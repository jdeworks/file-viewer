export const plugin = {
  id: 'd-lang',
  label: 'D',
  tags: ['dlang', 'd', 'dmd', 'phobos'],
  match(intake) {
    const name = (intake.name || intake.filename || '');
    const lower = name.toLowerCase();
    if (!lower.endsWith('.d')) return false;

    const text = intake.text || '';
    const head = text.slice(0, 2000);

    // Reject makefile dependency files: first non-empty line looks like "target: dep dep dep"
    const firstNonEmpty = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    if (/^[a-zA-Z0-9_./\\-]+:\s/.test(firstNonEmpty.trim())) return false;

    // D files almost always have module or import or common D keywords
    const lines = head.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trimStart();
      if (t.startsWith('module ') || t.startsWith('import ') || t.startsWith('class ') ||
          t.startsWith('void ') || t.startsWith('auto ') || t.startsWith('struct ') ||
          t.startsWith('interface ') || t.startsWith('enum ') || t.startsWith('template ')) {
        return true;
      }
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'D is a systems programming language with C-like syntax, combining the power of C++ with modern safety and productivity features. It supports garbage collection, templates, contracts, and built-in unit tests.',
    usedFor: [
      { label: 'dlang.org', description: 'Official D programming language website', href: 'https://dlang.org/' },
      { label: 'DMD', description: 'Digital Mars D Compiler — the reference D compiler', href: 'https://dlang.org/dmd.html' },
    ],
  },
};
export default plugin;
