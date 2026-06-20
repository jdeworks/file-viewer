export default {
  id: 'clang-tidy',
  label: '.clang-tidy',
  tags: ['clang', 'llvm', 'cpp', 'linting'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.clang-tidy';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.clang-tidy configuration — controls the Clang-Tidy static analysis linter for C/C++ code. Enables/disables checks from modernize, cppcoreguidelines, readability, performance, and other check families.',
    usedFor: [{ label: 'Static analysis', description: 'Clang-Tidy linter for C/C++ (LLVM project)', href: 'https://clang.llvm.org/extra/clang-tidy/' }],
  },
};
