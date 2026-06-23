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
    id: '2048',
    title: '2048',
    emoji: '🔢',
    blurb: 'Slide tiles, merge matching numbers, reach 2048. Arrows or swipe.',
    load: () => import('./2048/g2048.js'),
  },
  {
    id: 'flappybird',
    title: 'Flappy Bird',
    emoji: '🐤',
    blurb: 'Click, tap, or press Space to flap. Thread the pipes — don’t hit one.',
    load: () => import('./flappybird/flappybird.js'),
  },
  {
    id: 'tetris',
    title: 'Tetris',
    emoji: '🟦',
    blurb: 'Stack falling blocks, clear lines. Arrows + Space, or swipe/tap. Speeds up as you go.',
    load: () => import('./tetris/tetris.js'),
  },
  {
    id: 'breakout',
    title: 'Breakout',
    emoji: '🧱',
    blurb: 'Bounce the ball, smash every brick. ← → or drag. Each board gets faster.',
    load: () => import('./breakout/breakout.js'),
  },
  {
    id: 'memory',
    title: 'Memory',
    emoji: '🃏',
    blurb: 'Flip and match the file-type pairs. Tap to play. Each round adds more cards.',
    load: () => import('./memory/memory.js'),
  },
  {
    id: 'metagame',
    title: 'Bit Foundry',
    emoji: '⚙️',
    blurb: 'a machine, dormant. tap to begin.',
    load: () => import('./metagame/metagame.js'),
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null;
}
