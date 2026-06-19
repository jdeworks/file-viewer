import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'My VitePress Site',
  description: 'A fast, composable documentation framework built on Vite',
  base: '/docs/',
  lang: 'en-US',
  cleanUrls: true,

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Blog', link: '/blog/' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Routing', link: '/guide/routing' },
          { text: 'Deploying', link: '/guide/deploying' },
        ],
      },
      {
        text: 'Writing',
        items: [
          { text: 'Markdown', link: '/writing/markdown' },
          { text: 'Asset Handling', link: '/writing/asset-handling' },
          { text: 'Frontmatter', link: '/writing/frontmatter' },
        ],
      },
      {
        text: 'Customization',
        items: [
          { text: 'Custom Theme', link: '/customization/theme' },
          { text: 'Extending the Default', link: '/customization/extending' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/my-org/my-project' },
      { icon: 'twitter', link: 'https://twitter.com/my-org' },
      { icon: 'discord', link: 'https://discord.gg/my-server' },
    ],

    search: {
      provider: 'algolia',
      options: {
        appId: 'MY_APP_ID',
        apiKey: 'MY_API_KEY',
        indexName: 'my-project',
      },
    },

    editLink: {
      pattern: 'https://github.com/my-org/my-project/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
