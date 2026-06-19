export default {
  id: 'elm-json',
  label: 'Elm Package / Application',
  match: (intake, baseType) => {
    if (baseType?.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'elm.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elm language project manifest — describes whether this is a package or application, the Elm version, and dependencies.',
    usedFor: [
      { label: 'Elm applications', description: 'Browser applications built with the Elm language', href: 'https://elm-lang.org/' },
      { label: 'Elm packages', description: 'Libraries published to the Elm package catalog', href: 'https://package.elm-lang.org/' },
    ],
  },
};
