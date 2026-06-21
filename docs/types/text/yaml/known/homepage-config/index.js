export default {
  id: 'homepage-config',
  label: 'Homepage Dashboard Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    // services.yaml or bookmarks.yaml (incl. homepage-services.yaml): top-level YAML
    // sequence of named groups, e.g. lines like "- Group Name:"
    if (n.endsWith('services.yaml') || n.endsWith('bookmarks.yaml')) {
      return /^-\s+\S.*:\s*$/m.test(text);
    }
    // widgets.yaml: top-level YAML sequence of widget objects
    if (n.endsWith('widgets.yaml')) {
      return /^-\s+\S+:/m.test(text);
    }
    // settings.yaml: top-level mapping with title AND background keys
    if (n.endsWith('settings.yaml')) {
      return /^title:/m.test(text) && /^background:/m.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homepage dashboard configuration — services, bookmarks, widgets, or settings YAML files.',
    tags: ['homepage', 'dashboard', 'self-hosted', 'config'],
  },
};
