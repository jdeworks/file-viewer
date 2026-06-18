export const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

export function splitVolumeShortSyntax(entry) {
  const text = String(entry || '');
  if (/^[A-Za-z]:[\\/]/.test(text)) {
    const next = text.indexOf(':', 2);
    return next === -1 ? { source: text, target: '' } : { source: text.slice(0, next), target: text.slice(next + 1) };
  }
  const [source = '', target = ''] = text.split(':');
  return { source, target };
}

export function isRelativePath(value) {
  return value === '.'
    || value === '..'
    || value.startsWith('./')
    || value.startsWith('../');
}

export function isLocalPath(value) {
  return !value
    || isRelativePath(value)
    || value.startsWith('/')
    || value.startsWith('~/')
    || /^[A-Za-z]:[\\/]/.test(value);
}

export function classifyVolume(entry, topVolumes = {}) {
  if (typeof entry === 'string') {
    const { source } = splitVolumeShortSyntax(entry);
    if (source && Object.prototype.hasOwnProperty.call(topVolumes, source) && !isLocalPath(source)) return 'named';
    return isLocalPath(source) ? 'bind' : 'named';
  }
  if (entry && typeof entry === 'object') {
    if (entry.type === 'bind') return 'bind';
    if (entry.type === 'volume') return 'named';
    const source = String(entry.source || entry.src || '');
    if (source && Object.prototype.hasOwnProperty.call(topVolumes, source) && !isLocalPath(source)) return 'named';
    return isLocalPath(source) ? 'bind' : 'named';
  }
  return 'other';
}

export function imageLink(image) {
  const ref = String(image || '').trim();
  if (!ref || ref.includes('${')) return '';
  const withoutDigest = ref.split('@')[0];
  const slashParts = withoutDigest.split('/');
  const first = slashParts[0] || '';
  if (slashParts.length > 1 && (first.includes('.') || first.includes(':') || first === 'localhost')) {
    if (first !== 'docker.io' && first !== 'registry-1.docker.io') return '';
    slashParts.shift();
  }
  if (slashParts.length === 1) {
    const repo = slashParts[0].split(':')[0];
    return repo ? 'https://hub.docker.com/_/' + encodeURIComponent(repo) : '';
  }
  if (slashParts.length >= 2) {
    const namespace = slashParts[0];
    const repo = slashParts[1].split(':')[0];
    if (!namespace || !repo) return '';
    if (namespace === 'library') return 'https://hub.docker.com/_/' + encodeURIComponent(repo);
    return 'https://hub.docker.com/r/' + encodeURIComponent(namespace) + '/' + encodeURIComponent(repo);
  }
  return '';
}

export function buildContext(build) {
  if (!build) return '';
  if (typeof build === 'string') return build;
  if (typeof build === 'object') return String(build.context || '');
  return '';
}
