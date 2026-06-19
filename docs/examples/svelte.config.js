import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    prerender: {
      default: true,
    },
    alias: {
      '$components': 'src/lib/components',
      '$utils': 'src/lib/utils',
      '$stores': 'src/lib/stores',
    },
    csp: {
      mode: 'auto',
      directives: {
        'script-src': ['self'],
      },
    },
  },
};

export default config;
