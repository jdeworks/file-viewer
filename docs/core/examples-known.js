// Known-file grouping for the examples gallery's dedicated "Known files" section.
// A "known file" is a Config/Code example whose name is a real-world filename
// (e.g. package.json, Dockerfile, requirements.txt) rather than a generic
// sample.* — these are listed only here, never in the type-category groups.

export const KNOWN_GROUP_ORDER = [
  'Text / Shell', 'JSON', 'YAML', 'TOML', 'INI/Config', 'Docker',
  'XML', 'Build', 'Terraform', 'JavaScript', 'TypeScript', 'React/JSX', 'CSS',
  'Python', 'Go', 'Rust', 'JVM', 'C/C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Dart',
  'Elixir', 'Clojure', 'Perl', 'R', 'Lua', 'Shell', 'PowerShell',
  'Protobuf', 'GraphQL', 'SQL', 'Apple Config',
];

export function knownFileGroup(fname) {
  const ext = fname.includes('.') ? fname.split('.').pop().toLowerCase() : '';
  const base = fname.toLowerCase();
  if (ext === 'json' || ext === 'jsonc') return 'JSON';
  if (ext === 'yaml' || ext === 'yml') return 'YAML';
  if (ext === 'toml') return 'TOML';
  if (base === 'dockerfile' || base.startsWith('dockerfile.') || ext === 'dockerignore') return 'Docker';
  if (ext === 'xml') return 'XML';
  if (ext === 'gradle' || ext === 'bazel' || ext === 'ninja' || base === 'cmakelists.txt' || base === 'makefile' || base === 'build.bazel' || base === 'build.xml' || base === 'build.ninja') return 'Build';
  if (ext === 'tf' || ext === 'tfvars' || ext === 'hcl') return 'Terraform';
  if (ext === 'proto') return 'Protobuf';
  if (ext === 'graphql' || ext === 'gql') return 'GraphQL';
  if (ext === 'sql') return 'SQL';
  if (ext === 'css' || ext === 'scss' || ext === 'less') return 'CSS';
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'JavaScript';
  if (ext === 'ts') return 'TypeScript';
  if (ext === 'tsx' || ext === 'jsx') return 'React/JSX';
  if (ext === 'py') return 'Python';
  if (ext === 'go') return 'Go';
  if (ext === 'rs') return 'Rust';
  if (ext === 'java' || ext === 'kt' || ext === 'scala') return 'JVM';
  if (ext === 'c' || ext === 'cpp' || ext === 'h') return 'C/C++';
  if (ext === 'cs') return 'C#';
  if (ext === 'rb') return 'Ruby';
  if (ext === 'php') return 'PHP';
  if (ext === 'swift') return 'Swift';
  if (ext === 'dart') return 'Dart';
  if (ext === 'r') return 'R';
  if (ext === 'lua') return 'Lua';
  if (ext === 'ex' || ext === 'exs') return 'Elixir';
  if (ext === 'clj') return 'Clojure';
  if (ext === 'pl') return 'Perl';
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh') return 'Shell';
  if (ext === 'ps1') return 'PowerShell';
  if (ext === 'ini' || ext === 'cfg' || ext === 'conf') return 'INI/Config';
  if (ext === 'plist' || ext === 'strings') return 'Apple Config';
  return 'Text / Shell';
}

// A "known file" example: Config/Code category, real-world filename (not sample.*).
export function isKnownExample(ex, categoriesFor) {
  const fname = (ex.file || '').split('/').pop();
  const cats = categoriesFor(ex);
  return cats.some((c) => c === 'Config' || c === 'Code') && !fname.startsWith('sample.');
}
