export const plugin = {
  id: 'chapel-lang',
  label: 'Chapel',
  tags: ['chapel', 'chpl', 'parallel', 'hpc', 'compiled'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.chpl')) return true;
    const text = intake.text || '';
    const hits = [/\bmodule\s+\w+/.test(text), /\bproc\s+\w+/.test(text), /\bconfig\b/.test(text), /\bcoforall\b/.test(text), /\bforall\b/.test(text), /\bon\s+/.test(text) && /\bvar\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Chapel is a parallel programming language developed at Cray. It is designed for productivity and performance in high-performance computing (HPC), supporting task and data parallelism natively.',
    usedFor: [
      { label: 'Chapel documentation', description: 'Official Chapel language documentation', href: 'https://chapel-lang.org/docs/' },
      { label: 'Chapel GitHub', description: 'Chapel language source and resources', href: 'https://github.com/chapel-lang/chapel' },
    ],
  },
};
export default plugin;
