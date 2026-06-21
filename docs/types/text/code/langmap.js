// Extension/filename -> Monaco language id. Shared by detect + syntaxLanguage.
export const LANGS = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'cpp', h: 'cpp', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
  cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin', kts: 'kotlin', scala: 'scala',
  m: 'objective-c', fs: 'fsharp', fsx: 'fsharp', vb: 'vb',
  sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell', bat: 'bat', cmd: 'bat',
  html: 'html', htm: 'html', xml: 'xml', svg: 'xml', vue: 'html',
  css: 'css', scss: 'scss', less: 'less',
  yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini', tf: 'hcl', hcl: 'hcl',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  proto: 'protobuf', wgsl: 'wgsl', sol: 'solidity',
  lua: 'lua', r: 'r', pl: 'perl', dart: 'dart', ex: 'elixir', exs: 'elixir',
  clj: 'clojure', dockerfile: 'dockerfile', makefile: 'makefile',
  // Build-system source files (no dedicated Monaco grammar → closest fit / plaintext).
  cmake: 'plaintext', bazel: 'python', bzl: 'python', ninja: 'plaintext',
};
// Bare filenames (no extension) that map to a language. Build files often have a
// fixed name (or a name whose extension isn't a language ext), so map them by name.
export const FILENAMES = {
  dockerfile: 'dockerfile', makefile: 'makefile',
  'cmakelists.txt': 'plaintext', cmakelists: 'plaintext',
  'build.bazel': 'python', build: 'python', 'workspace.bazel': 'python', workspace: 'python',
  'build.ninja': 'plaintext',
  '.bazelrc': 'ini', bazelrc: 'ini',
};

export const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  ruby: 'Ruby',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  cpp: 'C / C++',
  csharp: 'C#',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  'objective-c': 'Objective-C',
  fsharp: 'F#',
  vb: 'Visual Basic',
  shell: 'Shell script',
  powershell: 'PowerShell',
  bat: 'Batch file',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  yaml: 'YAML',
  ini: 'INI/config',
  sql: 'SQL',
  graphql: 'GraphQL',
  hcl: 'HCL / Terraform',
  protobuf: 'Protocol Buffers',
  wgsl: 'WGSL',
  solidity: 'Solidity',
  lua: 'Lua',
  r: 'R',
  perl: 'Perl',
  dart: 'Dart',
  elixir: 'Elixir',
  clojure: 'Clojure',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
};

export function languageFor(intake) {
  const name = (intake.filename || '').toLowerCase();
  const base = name.split('/').pop();
  if (FILENAMES[base]) return FILENAMES[base];
  const ext = base.includes('.') ? base.split('.').pop() : '';
  return LANGS[ext] || 'plaintext';
}

export function isCode(intake) {
  const name = (intake.filename || '').toLowerCase();
  const base = name.split('/').pop();
  if (FILENAMES[base]) return true;
  const ext = base.includes('.') ? base.split('.').pop() : '';
  return !!LANGS[ext];
}

export function languageLabelFor(intakeOrLang) {
  if (intakeOrLang && typeof intakeOrLang === 'object') {
    const base = String(intakeOrLang.filename || '').split('/').pop().toLowerCase();
    const ext = base.includes('.') ? base.split('.').pop() : '';
    if (ext === 'c') return 'C';
    if (ext === 'h') return 'C/C++ header';
    if (['cpp', 'cc', 'cxx'].includes(ext)) return 'C++';
    if (['hpp', 'hh'].includes(ext)) return 'C++ header';
    if (ext === 'jsx') return 'JavaScript JSX';
    if (ext === 'tsx') return 'TypeScript TSX';
    if (ext === 'mjs') return 'JavaScript module';
    if (ext === 'cjs') return 'JavaScript CommonJS';
  }
  const lang = typeof intakeOrLang === 'string' ? intakeOrLang : languageFor(intakeOrLang);
  return LANGUAGE_LABELS[lang] || (lang && lang !== 'plaintext' ? lang : 'Code');
}
