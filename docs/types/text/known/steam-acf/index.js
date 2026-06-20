export default {
  id: 'steam-acf',
  label: 'Steam App Manifest',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    return name.endsWith('.acf') || (text.includes('"AppState"') && text.includes('"appid"'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Steam App Cache File — Valve\'s KeyValues format used by Steam to track installed game state, depots, and update metadata.',
    usedFor: [{ label: 'Steam', description: 'Steam game installation manifest', href: 'https://partner.steamgames.com/doc/store/application' }],
  },
};
