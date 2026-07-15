import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { renderSitemap, runSeo } from '../scripts/seo.mjs';

const root = await mkdtemp(join(tmpdir(), 'file-viewer-seo-'));
const docs = join(root, 'docs');
const child = join(docs, 'formats', 'csv');
const configPath = join(root, 'seo.config.json');

const config = {
  siteName: 'Fixture Viewer',
  baseUrl: 'https://example.test/viewer/',
  publishDir: 'docs',
  sitemap: 'sitemap.xml',
  pages: [
    {
      file: 'index.html',
      route: '',
      title: 'Fixture Viewer',
      description: 'Open fixture files locally in a browser.',
    },
    {
      file: 'formats/csv/index.html',
      route: 'formats/csv/',
      title: 'Fixture CSV Viewer',
      description: 'View fixture CSV tables locally in a browser.',
    },
  ],
};

const shell = (body) => `<!doctype html>
<html lang="en"><head>
  <!-- SEO:START -->
  <!-- SEO:END -->
</head><body>${body}</body></html>
`;

try {
  await mkdir(child, { recursive: true });
  await writeFile(join(docs, 'index.html'), shell('<h1>Fixture Viewer</h1><a href="formats/csv/">CSV</a>'));
  await writeFile(join(child, 'index.html'), shell('<h1>CSV viewer</h1><a href="../../">Viewer</a>'));
  await writeFile(configPath, JSON.stringify(config, null, 2));

  const first = await runSeo({ configPath, write: true });
  assert.equal(first.changed, 3, 'first write updates both pages and the sitemap');
  const second = await runSeo({ configPath, write: true });
  assert.equal(second.changed, 0, 'SEO generation is idempotent');
  await runSeo({ configPath, write: false });

  const sitemap = await readFile(join(docs, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /https:\/\/example\.test\/viewer\/formats\/csv\//);
  assert.doesNotMatch(sitemap, /<lastmod>/, 'sitemap does not invent build-time lastmod values');
  assert.match(
    renderSitemap({ ...config, baseUrl: 'https://example.test/a&b/' }),
    /a&amp;b/,
    'sitemap URLs are XML escaped',
  );

  const csvPath = join(child, 'index.html');
  const csv = await readFile(csvPath, 'utf8');
  await writeFile(csvPath, csv.replace('</head>', '<meta name="robots" content="noindex"></head>'));
  await assert.rejects(
    runSeo({ configPath, write: false }),
    /contains noindex/,
    'declared indexable pages reject noindex',
  );
  await writeFile(csvPath, csv);

  const duplicated = structuredClone(config);
  duplicated.pages[1].description = duplicated.pages[0].description;
  await writeFile(configPath, JSON.stringify(duplicated, null, 2));
  await assert.rejects(
    runSeo({ configPath, write: false }),
    /description is not unique/,
    'page descriptions must be unique',
  );

  console.log('SEO generator and published-page checks passed');
} finally {
  await rm(root, { recursive: true, force: true });
}
