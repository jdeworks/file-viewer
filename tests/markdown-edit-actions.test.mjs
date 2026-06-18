import {
  markdownHeading,
  markdownLinkForPastedUrl,
  markdownTable,
  markdownWrap,
  sortMarkdownTable,
  tableSortOptions,
} from '../docs/types/markdown/edit-actions.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

ok(markdownHeading('Title', 1) === '# Title', 'heading: prefixes selected/current line');
ok(markdownHeading('## Old', 1) === '# Old', 'heading: replaces an existing heading marker');
ok(markdownHeading('A\n\nB', 2) === '## A\n\n## B', 'heading: applies across selected nonblank lines');

const bold = markdownWrap('name', '**', 'strong text');
ok(bold.text === '**name**' && bold.selectStart === 2 && bold.selectEnd === 6, 'bold: wraps selected text and reports inner selection');
const italic = markdownWrap('', '*', 'emphasis');
ok(italic.text === '*emphasis*' && italic.selectStart === 1 && italic.selectEnd === 9, 'italic: inserts placeholder when selection is empty');

ok(markdownLinkForPastedUrl('OpenAI', 'https://openai.com/') === '[OpenAI](https://openai.com/)', 'paste URL: selected text becomes markdown link');
ok(markdownLinkForPastedUrl('', 'https://openai.com/') === null, 'paste URL: empty selection is left to normal paste');
ok(markdownLinkForPastedUrl('label', 'not a url') === null, 'paste URL: non-URL paste is left unchanged');

const table = markdownTable(2, 3);
ok(table.split('\n').length === 4 && /\| Column 1 \| Column 2 \| Column 3 \|/.test(table), 'table: builds configurable rows and columns');

const unsorted = [
  '| Name | Score |',
  '| --- | --- |',
  '| Beta | 10 |',
  '| Alpha | 2 |',
  '| Gamma | 1 |',
].join('\n');
const opts = tableSortOptions(unsorted);
ok(opts.length === 2 && opts[1].label === 'Score', 'table sort: exposes header columns');
const byName = sortMarkdownTable(unsorted, 0);
ok(/\| Alpha \| 2 \|\n\| Beta \| 10 \|\n\| Gamma \| 1 \|/.test(byName), 'table sort: sorts selected table by text column');
const byScore = sortMarkdownTable(unsorted, 1);
ok(/\| Gamma \| 1 \|\n\| Alpha \| 2 \|\n\| Beta \| 10 \|/.test(byScore), 'table sort: sorts selected table by numeric column');
ok(sortMarkdownTable('not a table', 0) === null, 'table sort: rejects non-table selection');

if (failed) {
  console.error(`\n${failed} markdown edit action test(s) failed`);
  process.exit(1);
}
