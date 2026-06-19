// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Awesome Docs',
  tagline: 'Documentation made simple and beautiful',
  url: 'https://my-org.github.io',
  baseUrl: '/my-project/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'my-org',
  projectName: 'my-project',
  trailingSlash: false,

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de', 'ja'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/my-org/my-project/tree/main/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/my-org/my-project/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  plugins: [
    'docusaurus-plugin-sass',
    ['@docusaurus/plugin-content-docs', { id: 'api', path: 'api', routeBasePath: 'api' }],
    '@docusaurus/plugin-sitemap',
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'My Docs',
        logo: {
          alt: 'My Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          { to: '/api', label: 'API', position: 'left' },
          { to: '/changelog', label: 'Changelog', position: 'left' },
          {
            href: 'https://github.com/my-org/my-project',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} My Org.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
