// Extension/filename -> Monaco language id. Shared by detect + syntaxLanguage.
export const LANGS = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'cpp', h: 'cpp', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
  cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin', kts: 'kotlin', scala: 'scala',
  sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell',
  html: 'html', htm: 'html', xml: 'xml', svg: 'xml', vue: 'html',
  css: 'css', scss: 'scss', less: 'less',
  yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  lua: 'lua', r: 'r', pl: 'perl', dart: 'dart', ex: 'elixir', exs: 'elixir',
  clj: 'clojure', dockerfile: 'dockerfile', makefile: 'makefile',
};
// Bare filenames (no extension) that map to a language.
export const FILENAMES = { dockerfile: 'dockerfile', makefile: 'makefile' };

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
  shell: 'Shell script',
  powershell: 'PowerShell',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  yaml: 'YAML',
  ini: 'INI/config',
  sql: 'SQL',
  graphql: 'GraphQL',
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
  const lang = typeof intakeOrLang === 'string' ? intakeOrLang : languageFor(intakeOrLang);
  return LANGUAGE_LABELS[lang] || (lang && lang !== 'plaintext' ? lang : 'Code');
}
