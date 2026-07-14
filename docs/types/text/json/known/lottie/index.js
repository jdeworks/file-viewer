import { matchesLottie } from './model.js';

export default {
  id: 'lottie',
  label: 'Lottie animation',
  preferredMode: 'preview',
  match: matchesLottie,
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'JSON-based vector animation with local, sandboxed playback controls.',
    usedFor: [{ label: 'Motion graphics', description: 'Portable UI and illustration animations rendered from JSON.', href: 'https://lottie.github.io/' }],
  },
};
