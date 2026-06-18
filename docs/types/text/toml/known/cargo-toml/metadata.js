import { parseTOML } from '../../toml.js';

function count(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).length : 0;
}

export function extract(intake) {
  let toml = {};
  try { toml = parseTOML(intake.text || ''); } catch { /* empty */ }
  const pkg = toml.package || {};
  return [
    ...(pkg.name ? [{ label: 'Package', value: pkg.name }] : []),
    ...(pkg.version ? [{ label: 'Version', value: String(pkg.version) }] : []),
    ...(pkg.edition ? [{ label: 'Edition', value: String(pkg.edition) }] : []),
    ...(pkg.license ? [{ label: 'License', value: String(pkg.license) }] : []),
    { label: 'Dependencies', value: String(count(toml.dependencies)) },
    { label: 'Dev dependencies', value: String(count(toml['dev-dependencies'])) },
    { label: 'Build dependencies', value: String(count(toml['build-dependencies'])) },
    { label: 'Features', value: String(count(toml.features)) },
    { label: 'Workspace members', value: String(Array.isArray(toml.workspace?.members) ? toml.workspace.members.length : 0) },
  ];
}
