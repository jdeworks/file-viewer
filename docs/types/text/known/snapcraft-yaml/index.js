// Snapcraft manifest (snap/snapcraft.yaml or .snapcraft.yaml or content with snap keys)
function looksLikeSnapContent(text) {
  return /^\s*name\s*:/m.test(text) &&
    /^\s*version\s*:/m.test(text) &&
    /^\s*grade\s*:/m.test(text) &&
    /^\s*confinement\s*:/m.test(text) &&
    /^\s*parts\s*:/m.test(text);
}

export default {
  id: 'snapcraft-yaml',
  label: 'Snapcraft',
  tags: ['snap', 'snapcraft', 'linux', 'packaging'],
  match(intake) {
    const filename = (intake.name || intake.filename || '');
    const base = filename.split('/').pop().toLowerCase();
    // Filename matches
    if (base === 'snapcraft.yaml' || base === '.snapcraft.yaml') return true;
    // Path contains /snap/ + snapcraft.yaml
    if (/\/snap\//.test(filename) && base === 'snapcraft.yaml') return true;
    // Content-based detection
    const text = intake.textSample || intake.text || '';
    return looksLikeSnapContent(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Snapcraft manifest — defines the snap package name, version, confinement, apps, and build parts.',
    usedFor: [
      { label: 'Snapcraft documentation', description: 'Official Snapcraft documentation', href: 'https://snapcraft.io/docs' },
      { label: 'Snap Store', description: 'Browse available snaps', href: 'https://snapcraft.io/store' },
    ],
  },
};
