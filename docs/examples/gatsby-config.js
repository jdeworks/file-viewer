module.exports = {
  siteMetadata: {
    title: 'My Gatsby Blog',
    description: 'A blog powered by Gatsby and React',
    siteUrl: 'https://myblog.example.com',
    author: {
      name: 'Jane Developer',
      summary: 'Who lives and works in San Francisco building cool things.',
    },
    social: {
      twitter: 'janedev',
    },
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-image',
    'gatsby-plugin-sitemap',
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'blog',
        path: `${__dirname}/content/blog`,
      },
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          'gatsby-remark-images',
          'gatsby-remark-prismjs',
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'My Gatsby Blog',
        short_name: 'GatsbyBlog',
        start_url: '/',
        background_color: '#663399',
        theme_color: '#663399',
        display: 'minimal-ui',
        icon: 'src/images/gatsby-icon.png',
      },
    },
    'gatsby-plugin-offline',
  ],
};
