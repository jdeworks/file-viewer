export default {
  id: 'homepage-config',
  label: 'Homepage Dashboard Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // services.yaml or bookmarks.yaml: array of groups where each group maps key -> array
    if (n === 'services.yaml' || n === 'bookmarks.yaml') {
      const parsed = intake.parsed;
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        const firstVal = Object.values(parsed[0])[0];
        return Array.isArray(firstVal);
      }
      return false;
    }
    // widgets.yaml: array of widget objects
    if (n === 'widgets.yaml') {
      const parsed = intake.parsed;
      return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object';
    }
    // settings.yaml: object with title AND background keys (Homepage settings)
    if (n === 'settings.yaml') {
      const parsed = intake.parsed;
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed) &&
        parsed.title !== undefined && parsed.background !== undefined;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homepage dashboard configuration — services, bookmarks, widgets, or settings YAML files.',
    tags: ['homepage', 'dashboard', 'self-hosted', 'config'],
  },
};
