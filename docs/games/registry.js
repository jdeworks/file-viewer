// Games registry (easter eggs). Each entry is a tiny lazy-loaded module so the bundle only grows
// when a game is actually launched. A game module exports `mount(host, ctx) => { destroy() }`,
// where host is a DOM node to render into and ctx = { onScore(n), onExit() }.
//
// `unlock` is the localStorage flag that reveals the game in the hub. Snake is the first game and
// is unlocked by the Konami code (see launcher.js). Future games can gate on their own discovery
// (e.g. typing `import easteregg` in a new file) — see [[easter-egg-metagame]] for the roadmap.
export const GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    emoji: '🐍',
    blurb: 'The classic. Arrow keys or swipe. Eat the bytes, don’t bite yourself.',
    load: () => import('./snake/snake.js'),
  },
  {
    id: 'metagame',
    title: 'Bit Foundry',
    emoji: '⚙️',
    blurb: 'Generate bits, automate the grind. The spine of the bigger game to come.',
    load: () => import('./metagame/metagame.js'),
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null;
}
