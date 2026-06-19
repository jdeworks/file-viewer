import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://my-astro-site.com',
  base: '/blog',
  output: 'server',
  adapter: netlify(),
  integrations: [
    react(),
    tailwind(),
    mdx(),
    sitemap(),
  ],
  server: {
    port: 4321,
  },
  vite: {
    plugins: [],
  },
});
