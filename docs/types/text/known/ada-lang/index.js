export const plugin = {
  id: 'ada-lang',
  label: 'Ada',
  tags: ['ada', 'safety-critical', 'embedded', 'military'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.ads') || name.endsWith('.adb')) {
      // Content guard: must have at least one keyword in first 3000 chars
      const preview = (intake.text || '').slice(0, 3000);
      if (!/package\s/i.test(preview) && !/procedure\s/i.test(preview) && !/function\s/i.test(preview)) return false;
      return true;
    }
    const text = intake.text || '';
    const hits = [
      /\bpackage\s+\w+/i.test(text),
      /\bprocedure\s+\w+/i.test(text),
      /\bfunction\s+\w+/i.test(text),
      /\bwith\s+[\w.]+\s*;/i.test(text),
      /\bpragma\s+\w+/i.test(text),
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ada is a structured, statically typed, imperative, and object-oriented high-level programming language designed for safety-critical and large-scale systems. .ads files are package specs; .adb files are package bodies.',
    usedFor: [
      { label: 'ada-lang.io', description: 'Ada community hub', href: 'https://ada-lang.io/' },
      { label: 'AdaCore', description: 'Ada tools and documentation', href: 'https://www.adacore.com/' },
    ],
  },
};
export default plugin;
