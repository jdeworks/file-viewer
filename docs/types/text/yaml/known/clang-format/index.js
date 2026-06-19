export default {
  id: 'clang-format',
  label: 'clang-format config',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.clang-format' || name === '_clang-format';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'clang-format configuration — controls C/C++/Java/JavaScript/Objective-C/Protobuf/C# code formatting style. Integrates with editors and CI pipelines to enforce consistent code style.',
    usedFor: [{ label: 'Code formatting', description: 'Automatic code formatter for C-family languages by LLVM', href: 'https://clang.llvm.org/docs/ClangFormat.html' }],
  },
};
