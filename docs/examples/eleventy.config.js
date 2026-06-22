import { EleventyHtmlBasePlugin } from '@11ty/eleventy';
import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import rssPlugin from '@11ty/eleventy-plugin-rss';
import navigationPlugin from '@11ty/eleventy-navigation';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(navigationPlugin);

  eleventyConfig.setTemplateFormats(['md', 'njk', 'html', 'liquid', '11ty.js']);

  eleventyConfig.addPassthroughCopy('src/assets');
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy({ 'src/favicon.ico': '/favicon.ico' });

  eleventyConfig.addFilter('readableDate', (dateObj) => {
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);

  return {
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
    },
  };
}
