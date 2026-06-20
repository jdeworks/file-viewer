export const plugin = {
  id: 'asm-lang',
  label: 'Assembly',
  tags: ['asm', 'assembly', 'nasm', 'gas', 'x86', 's', 'nas'],
  match(intake) {
    const name = (intake.name || intake.filename || '');
    const lower = name.toLowerCase();
    const text = intake.text || '';

    // Unambiguous extensions — no content guard
    if (lower.endsWith('.asm') || lower.endsWith('.nasm') || lower.endsWith('.nas')) return true;

    // .s and .S — need content guard to avoid false positives
    if (lower.endsWith('.s') || name.endsWith('.S')) {
      const head = text.slice(0, 2000);
      return (
        head.includes(';') ||
        head.includes('#') ||
        head.includes('.section') ||
        head.includes('.global') ||
        head.includes('SECTION')
      );
    }

    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Assembly language is a low-level programming language with a strong correspondence to machine code instructions. Common flavors include NASM (Intel syntax), GAS/AT&T syntax (used by GCC), and Intel syntax.',
    usedFor: [
      { label: 'NASM', description: 'Netwide Assembler — popular Intel-syntax assembler', href: 'https://nasm.us/' },
      { label: 'GAS', description: 'GNU Assembler — part of GNU Binutils, AT&T syntax', href: 'https://www.gnu.org/software/binutils/' },
    ],
  },
};
export default plugin;
