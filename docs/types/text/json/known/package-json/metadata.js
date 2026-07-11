import { parseJsonLike } from '../../jsonparse.js';
import { diagnoseDuplicateJsonKeys } from '../../duplicate-keys.js';

function parse(text) {
  try { return parseJsonLike(text || '{}', '{}').data; } catch { return {}; }
}

function count(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).length : 0;
}

export function extract(intake) {
  const pkg = parse(intake.text);
  const duplicateKeys = diagnoseDuplicateJsonKeys(intake.text || '').totalDuplicates;
  const deps = count(pkg.dependencies);
  const dev = count(pkg.devDependencies);
  const peer = count(pkg.peerDependencies);
  const optional = count(pkg.optionalDependencies);
  const scripts = count(pkg.scripts);
  return [
    ...(pkg.name ? [{ label: 'Package', value: pkg.name }] : []),
    ...(pkg.version ? [{ label: 'Version', value: pkg.version }] : []),
    ...(pkg.license ? [{ label: 'License', value: Array.isArray(pkg.license) ? pkg.license.join(', ') : String(pkg.license) }] : []),
    { label: 'Private package', value: pkg.private ? 'yes' : 'no' },
    { label: 'Dependencies', value: String(deps) },
    { label: 'Dev dependencies', value: String(dev) },
    { label: 'Peer dependencies', value: String(peer) },
    { label: 'Optional dependencies', value: String(optional) },
    { label: 'Scripts', value: String(scripts) },
    { label: 'Duplicate keys', value: String(duplicateKeys) },
  ];
}
