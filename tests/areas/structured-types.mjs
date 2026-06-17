export async function run(ctx) {
  const { page, origin, frameOf, pass, fail } = ctx;

  // ── JSON / Code / Image simple types (WP19) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.json' }).click();
  const jframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const jf = await frameOf('iframe.fv-preview-frame');
  await jf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const jkeys = await jf.$$eval('.json-tree .j-key', (els) => els.length);
  if (jkeys > 0) pass('JSON rendered as collapsible tree (' + jkeys + ' keys)'); else fail('no json keys');
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const jsonMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Root type\s*object/.test(jsonMeta) && /Objects\s*\d+/.test(jsonMeta) && /Arrays\s*\d+/.test(jsonMeta)) pass('JSON metadata includes structure counts'); else fail('json meta: ' + jsonMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // Semantic JSON key-tree diff: edit working copy (add/remove/change a key + REORDER one)
  // then open Diff — reordering must NOT show as a change.
  await page.evaluate(() => {
    const obj = { private: true, name: 'file-viewer', mobileFirst: false, added: 1, trust: { server: false, tracking: false, cdn: false }, types: ['markdown', 'pdf', 'csv', 'xlsx', 'docx', 'pptx', 'json', 'image', 'code'], counts: { smokeChecks: 29, offOriginRequests: 0 }, tags: ['client-only', 'vendored', 'modular'] };
    window.__fv.state.rawview.setValue(JSON.stringify(obj, null, 2));
  });   // vs original: 'private' moved up (reorder), mobileFirst true->false, 'added' new, 'name' same
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForSelector('.jsondiff', { timeout: 6000 });
  const jdAdded = await page.$$eval('.jd-added > .jd-key, .jd-added > summary .jd-key', (els) => els.map((e) => e.textContent));
  const jdChanged = await page.$$eval('.jsondiff .jd-changed', (els) => els.length);
  if (jdAdded.includes('added')) pass('JSON key diff flags an added key'); else fail('jd-added keys: ' + jdAdded.join(','));
  // 'mobileFirst' changed value -> a changed leaf; reordered 'private'/'name' must NOT be changed.
  const changedKeys = await page.$$eval('.jsondiff .jd-changed > .jd-key', (els) => els.map((e) => e.textContent));
  if (changedKeys.includes('mobileFirst') && !changedKeys.includes('private') && !changedKeys.includes('name')) pass('JSON key diff: value change flagged, reordered keys ignored'); else fail('jd changed keys: ' + changedKeys.join(','));
  await page.click('#rawMode button[data-raw="current"]');

  // ── YAML ── parse with js-yaml, render as a collapsible tree (reuses JSON tree styling).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.yaml' }).click();
  const yframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const yf = await frameOf('iframe.fv-preview-frame');
  await yf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const yType = await page.$eval('#typeSelect', (s) => s.value);
  if (yType === 'yaml') pass('.yaml detected as YAML'); else fail('yaml type: ' + yType);
  const yKeys = await yf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (yKeys.includes('mobileFirst') && yKeys.includes('trust')) pass('YAML rendered as tree (' + yKeys.length + ' keys)'); else fail('yaml keys: ' + yKeys.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const yamlMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Mappings\s*\d+/.test(yamlMeta) && /Sequences\s*\d+/.test(yamlMeta)) pass('YAML metadata includes mapping/sequence counts'); else fail('yaml meta: ' + yamlMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  const yBool = await yf.$$eval('.json-tree .j-bool', (els) => els.length);
  if (yBool > 0) pass('YAML scalar types preserved (booleans rendered)'); else fail('no yaml booleans');
  const yamlHasEditor = await page.$('#editor .monaco-editor');
  if (yamlHasEditor) pass('YAML has raw editor (editable text)'); else fail('YAML missing raw editor');

  // ── TOML ── hand-rolled parser, render as a collapsible tree (reuses JSON tree styling).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.toml' }).click();
  const tframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const tf = await frameOf('iframe.fv-preview-frame');
  await tf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const tType = await page.$eval('#typeSelect', (s) => s.value);
  if (tType === 'toml') pass('.toml detected as TOML'); else fail('toml type: ' + tType);
  const tKeys = await tf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (tKeys.includes('trust') && tKeys.includes('types')) pass('TOML tables rendered as tree (' + tKeys.length + ' keys)'); else fail('toml keys: ' + tKeys.join(','));
  // Array-of-tables [[types]] -> an array with 2 entries; booleans preserved.
  const tBool = await tf.$$eval('.json-tree .j-bool', (els) => els.length);
  const tNum = await tf.$$eval('.json-tree .j-num', (els) => els.length);
  if (tBool >= 4 && tNum >= 2) pass('TOML scalar types preserved (booleans + numbers)'); else fail('toml scalars: bool=' + tBool + ' num=' + tNum);

  // ── XML ── element tree (reuses JSON tree styling) + structural diff. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.xml' }).click();
  const xmlframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const xmlf = await frameOf('iframe.fv-preview-frame');
  await xmlf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const xType = await page.$eval('#typeSelect', (s) => s.value);
  if (xType === 'xml') pass('.xml detected as XML'); else fail('xml type: ' + xType);
  const xTags = await xmlf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (xTags.some((t) => /<catalog>/.test(t)) && xTags.some((t) => /<book>/.test(t))) pass('XML rendered as element tree (' + xTags.length + ' nodes)'); else fail('xml tags: ' + xTags.slice(0, 6).join(','));
  // Structural diff: change one element's text → flagged; reindenting ignored.
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, { timeout: 8000 });
  const xmlOrig = await page.evaluate(() => window.__fv.state.rawview.originalValue());
  await page.evaluate((o) => window.__fv.state.rawview.setValue(o.replace('Midnight Rain', 'Midnight Sun')), xmlOrig);
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForFunction(() => /\bchanged\b/.test(document.querySelector('.jsondiff .jd-head')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const xmlDiffHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  if (/changed/.test(xmlDiffHead)) pass('XML structural diff flags a changed text node'); else fail('xml diff: ' + xmlDiffHead.slice(0, 80));
  await page.click('#rawMode button[data-raw="current"]');

  // ── INI / .env ── key-value tables grouped by section. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ini' }).click();
  const iniframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const inif = await frameOf('iframe.fv-preview-frame');
  await inif.waitForSelector('.kv-table', { timeout: 8000 });
  const iniType = await page.$eval('#typeSelect', (s) => s.value);
  if (iniType === 'ini') pass('.ini detected as Config (INI/env)'); else fail('ini type: ' + iniType);
  const iniSecs = await inif.$$eval('.kv-section h3', (els) => els.map((e) => e.textContent));
  const iniKeys = await inif.$$eval('.kv-key', (els) => els.map((e) => e.textContent));
  if (iniSecs.some((s) => /server/.test(s)) && iniKeys.includes('port')) pass('INI rendered as sectioned key-value tables'); else fail('ini secs=' + iniSecs.join(',') + ' keys=' + iniKeys.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const iniMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Comments\s*\d+/.test(iniMeta) && /Duplicate keys\s*0/.test(iniMeta)) pass('INI metadata includes comments and duplicate-key count'); else fail('ini meta: ' + iniMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── Patch / unified diff ── colorized add/remove/hunk lines. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.patch' }).click();
  const patchframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const patchf = await frameOf('iframe.fv-preview-frame');
  await patchf.waitForSelector('.patch', { timeout: 8000 });
  const patchType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (patchType2 === 'patch') pass('.patch detected as Patch / Diff'); else fail('patch type: ' + patchType2);
  const adds = await patchf.$$eval('.patch .p-add', (els) => els.length);
  const dels = await patchf.$$eval('.patch .p-del', (els) => els.length);
  const hunks = await patchf.$$eval('.patch .p-hunk', (els) => els.length);
  if (adds >= 2 && dels >= 1 && hunks >= 1) pass('patch colorized (+' + adds + ' −' + dels + ', ' + hunks + ' hunk)'); else fail('patch lines: add=' + adds + ' del=' + dels + ' hunk=' + hunks);

  // ── Log ── severity highlighting + timestamps. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.log' }).click();
  const lframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const lf = await frameOf('iframe.fv-preview-frame');
  await lf.waitForSelector('.logv', { timeout: 8000 });
  const logType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (logType2 === 'log') pass('.log detected as Log'); else fail('log type: ' + logType2);
  const errLines = await lf.$$eval('.logv .l-error', (els) => els.length);
  const warnLines = await lf.$$eval('.logv .l-warn', (els) => els.length);
  const tsSpans = await lf.$$eval('.logv .l-ts', (els) => els.length);
  if (errLines >= 1 && warnLines >= 1 && tsSpans >= 4) pass('log severity highlighted (' + errLines + ' error, ' + warnLines + ' warn, ' + tsSpans + ' timestamps)'); else fail('log: err=' + errLines + ' warn=' + warnLines + ' ts=' + tsSpans);
}
