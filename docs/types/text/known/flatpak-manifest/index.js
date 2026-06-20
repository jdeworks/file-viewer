// Flatpak application manifest (.yaml/.yml/.json with app-id + runtime + sdk + modules)
const FLATPAK_APP_ID_RE = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/i;

function looksLikeFlatpakFilename(name) {
  // org.gnome.App.yaml / com.example.Foo.json style names
  return FLATPAK_APP_ID_RE.test(name.replace(/\.(ya?ml|json)$/i, ''));
}

function looksLikeFlatpakContent(text) {
  // YAML: app-id: or id: + runtime: + sdk: + modules:
  const hasAppId = /^\s*app-id\s*:/m.test(text) || /^\s*id\s*:/m.test(text);
  const hasRuntime = /^\s*runtime\s*:/m.test(text);
  const hasSdk = /^\s*sdk\s*:/m.test(text);
  const hasModules = /^\s*modules\s*:/m.test(text);
  // JSON: "app-id" + "runtime" + "sdk" + "modules"
  const hasJsonAppId = /"app-id"\s*:/.test(text) || /"id"\s*:/.test(text);
  const hasJsonRuntime = /"runtime"\s*:/.test(text);
  const hasJsonSdk = /"sdk"\s*:/.test(text);
  const hasJsonModules = /"modules"\s*:/.test(text);
  return (hasAppId && hasRuntime && hasSdk && hasModules) ||
    (hasJsonAppId && hasJsonRuntime && hasJsonSdk && hasJsonModules);
}

export default {
  id: 'flatpak-manifest',
  label: 'Flatpak Manifest',
  tags: ['flatpak', 'linux', 'packaging', 'manifest'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.replace(/.*\./, '.');
    if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') return false;
    const text = intake.textSample || intake.text || '';
    if (looksLikeFlatpakFilename(name) && looksLikeFlatpakContent(text)) return true;
    if (looksLikeFlatpakContent(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flatpak application manifest — defines app-id, runtime, SDK, modules (build recipes), and finish-args (sandbox permissions).',
    usedFor: [
      { label: 'Flatpak documentation', description: 'Official Flatpak documentation', href: 'https://docs.flatpak.org/' },
      { label: 'Flathub', description: 'Flatpak app repository', href: 'https://flathub.org/' },
    ],
  },
};
