export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── JSON / Code / Image simple types (WP19) ──
  // JSON now renders as a live parentNode (tree + query panel) in #previewHost, not an iframe.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.json');
  await page.waitForSelector('#previewHost .json-qp .json-tree .j-key', { timeout: 30000 });
  const jf = page;   // tree is in the parent document now
  const jkeys = await page.$$eval('#previewHost .json-tree .j-key', (els) => els.length);
  if (jkeys > 0) pass('JSON rendered as collapsible tree (' + jkeys + ' keys)'); else fail('no json keys');
  const marker = await page.$eval('#previewHost .json-tree summary', (el) => getComputedStyle(el, '::before').content);
  await page.click('#previewHost .json-tree summary');
  const closedMarker = await page.$eval('#previewHost .json-tree summary', (el) => getComputedStyle(el, '::before').content);
  await page.click('#previewHost .json-tree summary');
  if (/▾/.test(marker) && /▸/.test(closedMarker) && !/25be|25b8/.test(marker + closedMarker)) pass('JSON disclosure marker renders as a glyph'); else fail('json marker content: ' + marker + ' / ' + closedMarker);
  // Query panel: JSONPath highlights matching nodes.
  const qpPresent = await page.$('#previewHost .json-qp .qp-panel .qp-input');
  if (qpPresent) pass('JSON query panel rendered'); else fail('json query panel missing');
  await page.fill('#previewHost .json-qp .qp-input', '$..name');
  await page.click('#previewHost .json-qp .qp-btn');
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .json-tree .qp-match').length > 0, null, { timeout: 4000 }).catch(() => {});
  const jMatches = await page.$$eval('#previewHost .json-tree .qp-match', (els) => els.length);
  if (jMatches > 0) pass('JSON query panel highlights JSONPath matches (' + jMatches + ')'); else fail('json query no matches');
  const sortedKeys = await page.evaluate(async () => {
    const { render } = await import('./types/text/json/renderer.js');
    const rendered = await render(window.__fv.state.intake, { settings: { jsonSortKeys: 'A-Z' } });
    const doc = new DOMParser().parseFromString(rendered.bodyHtml, 'text/html');
    return [...doc.querySelectorAll('.json-tree > .j-node > .j-children > .j-row > .j-key, .json-tree > .j-node > .j-children > .j-node > summary > .j-key')].map((e) => e.textContent);
  });
  if (sortedKeys.slice(0, 3).join(',') === 'counts,mobileFirst,name') pass('JSON preview can sort object keys A-Z'); else fail('json sorted keys: ' + sortedKeys.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const jsonMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Root type\s*object/.test(jsonMeta) && /Objects\s*\d+/.test(jsonMeta) && /Arrays\s*\d+/.test(jsonMeta)) pass('JSON metadata includes structure counts'); else fail('json meta: ' + jsonMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── JSON toolbar ── Format / Minify / Validate buttons appear for JSON files.
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const jsonToolsHidden = await page.$eval('#jsonTools', (el) => el.hidden);
  if (!jsonToolsHidden) pass('JSON toolbar visible in raw view for JSON files'); else fail('json toolbar hidden');
  const jsonFormatBtn = await page.$('[data-json-action="format"]');
  const jsonMinifyBtn = await page.$('[data-json-action="minify"]');
  const jsonValidateBtn = await page.$('[data-json-action="validate"]');
  if (jsonFormatBtn && jsonMinifyBtn && jsonValidateBtn) pass('JSON toolbar has Format, Minify, Validate buttons'); else fail('json toolbar buttons missing');
  // Validate: Sample.json is valid → indicator shows ✓
  await page.click('[data-json-action="validate"]');
  await page.waitForFunction(() => !document.getElementById('jsonValidIndicator')?.hidden, null, { timeout: 4000 });
  const validText = await page.$eval('#jsonValidIndicator', (el) => el.textContent);
  if (/✓/.test(validText)) pass('JSON validate shows ✓ for valid JSON'); else fail('json valid indicator: ' + validText);
  // Minify: content should become a single line
  await page.click('[data-json-action="minify"]');
  const minifiedValue = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (!minifiedValue.includes('\n') && minifiedValue.startsWith('{')) pass('JSON minify removes whitespace'); else fail('json minify result: ' + minifiedValue.slice(0, 80));
  // Format: re-expand with 2-space indentation
  await page.click('[data-json-action="format"]');
  await page.waitForFunction(() => window.__fv.state.rawview.getValue().includes('\n'), null, { timeout: 3000 });
  const formattedValue = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (formattedValue.includes('\n') && formattedValue.includes('  ')) pass('JSON format restores pretty-printed indentation'); else fail('json format result: ' + formattedValue.slice(0, 80));
  // Validate invalid JSON: inject bad JSON → indicator shows ✗
  await page.evaluate(() => window.__fv.state.rawview.setValue('{bad json}'));
  await page.click('[data-json-action="validate"]');
  await page.waitForFunction(() => /✗/.test(document.getElementById('jsonValidIndicator')?.textContent || ''), null, { timeout: 4000 });
  const invalidText = await page.$eval('#jsonValidIndicator', (el) => el.textContent);
  if (/✗/.test(invalidText)) pass('JSON validate shows ✗ for invalid JSON'); else fail('json invalid indicator: ' + invalidText);
  // Verify toolbar is hidden for non-JSON files
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.yaml');
  await page.waitForSelector('#previewHost .yaml-preview', { timeout: 30000 });
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const jsonToolsHiddenForYaml = await page.$eval('#jsonTools', (el) => el.hidden);
  if (jsonToolsHiddenForYaml) pass('JSON toolbar hidden for non-JSON files (YAML)'); else fail('json toolbar unexpectedly visible for yaml');
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.json');
  await page.waitForSelector('#previewHost .json-tree', { timeout: 30000 });

  await page.evaluate(() => window.__fv.openViewerFile('edge.jsonc', {
    text: '{\n  // File Examples JSON comments edge case\n  "name": "jsonc",\n  "items": [1, 2,],\n}\n',
  }));
  await page.waitForSelector('#previewHost .json-warning', { timeout: 8000 });
  const jsoncWarning = await page.$eval('#previewHost .json-warning', (e) => e.textContent);
  const jsoncKeys = await page.$$eval('#previewHost .json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (/Parsed as JSONC/.test(jsoncWarning) && jsoncKeys.includes('name') && jsoncKeys.includes('items')) pass('JSONC-style comments/trailing commas render with recovery warning');
  else fail('jsonc warning=' + jsoncWarning + ' keys=' + jsoncKeys.join(','));
  await page.evaluate(async () => {
    const { buildMetadata } = await import('./core/meta-drawer.js');
    await buildMetadata();
  });
  await page.waitForFunction(() => /edge\.jsonc/.test(document.querySelector('#metaBody')?.textContent || ''), null, { timeout: 6000 });
  const jsoncMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Parse mode\s*JSONC recovery/.test(jsoncMeta)) pass('JSON metadata reports JSONC recovery mode');
  else fail('jsonc meta: ' + jsoncMeta.replace(/\s+/g, ' ').slice(0, 180));

  // ── HAR ── JSON-shaped HTTP archive gets a waterfall, filters, sortable request table.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.har');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const harType = await page.$eval('#typeSelect', (s) => s.value);
  if (harType === 'har') pass('.har detected as HTTP Archive'); else fail('har type: ' + harType);
  const harf = await frameOf('iframe.fv-preview-frame');
  await harf.waitForSelector('.har-doc .har-table tbody tr', { timeout: 8000 });
  await page.waitForTimeout(250);
  const harSummary = await harf.$eval('.har-summary', (e) => e.textContent);
  const harRows = await harf.$$eval('.har-table tbody tr', (rows) => rows.length);
  if (/6\s*Requests/.test(harSummary) && /Transferred/.test(harSummary) && /Total duration/.test(harSummary) && harRows === 6)
    pass('HAR summary and request table rendered');
  else fail('har summary=' + harSummary.replace(/\s+/g, ' ') + ' rows=' + harRows);
  const harChartPainted = await harf.$eval('canvas.har-waterfall', (c) => {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245)) painted++;
    return painted;
  });
  if (harChartPainted > 100) pass('HAR waterfall chart painted (' + harChartPainted + ' pixels)'); else fail('har chart painted=' + harChartPainted);
  await harf.click('.har-filter[data-filter="xhr"]');
  const harVisibleXhr = await harf.$$eval('.har-table tbody tr:not([hidden])', (rows) => rows.map((r) => r.textContent));
  if (harVisibleXhr.length === 2 && harVisibleXhr.some((t) => /api\/users/.test(t)) && harVisibleXhr.some((t) => /POST/.test(t) && /api\/login/.test(t))) pass('HAR XHR filter narrows table'); else fail('har xhr rows=' + harVisibleXhr.join(' | '));
  await harf.click('.har-filter[data-filter="all"]');
  await harf.click('.har-table th[data-sort="status"]');
  const harStatuses = await harf.$$eval('.har-table tbody tr:not([hidden]) .har-status', (els) => els.map((e) => e.textContent));
  if (harStatuses[0] === '200' && harStatuses.at(-1) === '401') pass('HAR table sorts by status'); else fail('har statuses=' + harStatuses.join(','));
  // Per-entry detail panel: click the /api/users row → headers/timing/body, with auth/token redacted.
  await harf.click('.har-row[data-url*="api/users"]');
  await harf.waitForSelector('.har-detail:not([hidden])', { timeout: 4000 });
  const harDetail = await harf.evaluate(() => {
    const p = document.querySelector('.har-detail');
    return { text: p.textContent, redactedCount: p.querySelectorAll('.har-redacted').length, hasTiming: !!p.querySelector('.har-tim-bar'), hasReqHeaders: /Request headers/.test(p.textContent), hasRespBody: /Response body/.test(p.textContent) };
  });
  const harSecretLeak = /sk_live_9f8a7b6c5d/.test(harDetail.text) || /eyJhbGciOi/.test(harDetail.text);
  if (harDetail.hasTiming && harDetail.hasReqHeaders && harDetail.hasRespBody && harDetail.redactedCount >= 2 && !harSecretLeak)
    pass('HAR detail panel shows headers/timing/body with secrets redacted (' + harDetail.redactedCount + ' redacted)');
  else fail('har detail: ' + JSON.stringify({ ...harDetail, text: harDetail.text.replace(/\s+/g, ' ').slice(0, 160) }));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const harMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Entries\s*6/.test(harMeta) && /Creator\s*DemoCapture 2\.0/.test(harMeta) && /Pages\s*1/.test(harMeta))
    pass('HAR metadata includes entries, creator, and pages');
  else fail('har meta: ' + harMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.json');
  await page.waitForSelector('#previewHost .json-tree .j-key', { timeout: 30000 });

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
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.yaml');
  await page.waitForSelector('#previewHost .yaml-preview .json-tree .j-key', { timeout: 30000 });
  const yType = await page.$eval('#typeSelect', (s) => s.value);
  if (yType === 'yaml') pass('.yaml detected as YAML'); else fail('yaml type: ' + yType);
  const yKeys = await page.$$eval('#previewHost .yaml-preview .json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (yKeys.includes('mobileFirst') && yKeys.includes('trust')) pass('YAML rendered as tree (' + yKeys.length + ' keys)'); else fail('yaml keys: ' + yKeys.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const yamlMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Mappings\s*\d+/.test(yamlMeta) && /Sequences\s*\d+/.test(yamlMeta)) pass('YAML metadata includes mapping/sequence counts'); else fail('yaml meta: ' + yamlMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  const yBool = await page.$$eval('#previewHost .yaml-preview .json-tree .j-bool', (els) => els.length);
  if (yBool > 0) pass('YAML scalar types preserved (booleans rendered)'); else fail('no yaml booleans');
  const yamlPreviewText = await page.$eval('#previewHost .yaml-preview', (el) => el.textContent);
  if (/trust\.server|server\.hosts/.test(yamlPreviewText)) pass('YAML path breadcrumbs shown'); else fail('yaml path text: ' + yamlPreviewText.replace(/\s+/g, ' ').slice(0, 300));
  const yamlSourceCollapsed = await page.$eval('#previewHost .yaml-preview .kf-source-details', (el) => !el.open);
  if (yamlSourceCollapsed) pass('YAML redacted source starts collapsed'); else fail('yaml source unexpectedly open');
  const yamlSourceLine = await page.$eval('#previewHost .yaml-preview .yaml-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .yaml-preview .kf-source-details');
    return details?.open && document.getElementById(`yaml-line-${line}`);
  }, yamlSourceLine, { timeout: 3000 });
  pass('YAML source links open source');
  await page.evaluate(() => window.__fv.openViewerFile('secrets.yaml', {
    text: 'name: app\npassword: plain-text-secret\nnested:\n  apiKey: abcdefghijklmnopqrstuvwxyz123456\n',
  }));
  await page.waitForSelector('#previewHost .yaml-preview .kf-issues', { timeout: 8000 });
  const yamlSecretText = await page.$eval('#previewHost .yaml-preview', (el) => el.textContent);
  const yamlSecretHtml = await page.$eval('#previewHost .yaml-preview', (el) => el.innerHTML);
  if (/YAML Structure Review|secret|\[configured\]/i.test(yamlSecretText) && !/plain-text-secret|abcdefghijklmnopqrstuvwxyz123456/.test(yamlSecretHtml)) pass('YAML secret-like values are warned and redacted'); else fail('yaml secret redaction: ' + yamlSecretText.replace(/\s+/g, ' ').slice(0, 400));
  const yamlHasEditor = await page.$('#editor .monaco-editor');
  if (yamlHasEditor) pass('YAML has raw editor (editable text)'); else fail('YAML missing raw editor');

  // ── YAML toolbar ── Format / Validate buttons appear for YAML files in raw view.
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const yamlToolsHidden = await page.$eval('#yamlTools', (el) => el.hidden);
  if (!yamlToolsHidden) pass('YAML toolbar visible in raw view for YAML files'); else fail('yaml toolbar hidden');
  const yamlFormatBtn = await page.$('#yamlFormatBtn');
  const yamlValidateBtn = await page.$('#yamlValidateBtn');
  if (yamlFormatBtn && yamlValidateBtn) pass('YAML toolbar has Format and Validate buttons'); else fail('yaml toolbar buttons missing');
  // Validate: Sample.yaml is valid → indicator shows ✓
  await page.click('#yamlValidateBtn');
  await page.waitForFunction(() => !document.getElementById('yamlValidIndicator')?.hidden, null, { timeout: 4000 });
  const yamlValidText = await page.$eval('#yamlValidIndicator', (el) => el.textContent);
  if (/✓/.test(yamlValidText)) pass('YAML validate shows ✓ for valid YAML'); else fail('yaml valid indicator: ' + yamlValidText);
  // Format: round-trip through js-yaml should preserve structure
  await page.click('#yamlFormatBtn');
  await page.waitForFunction(() => window.__fv.state.rawview.getValue().length > 0, null, { timeout: 3000 });
  const formattedYaml = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (formattedYaml.includes(':') && formattedYaml.includes('\n')) pass('YAML format produces valid YAML output'); else fail('yaml format result: ' + formattedYaml.slice(0, 80));
  // Validate invalid YAML → indicator shows ✗
  await page.evaluate(() => window.__fv.state.rawview.setValue('{bad: yaml: file:'));
  await page.click('#yamlValidateBtn');
  await page.waitForFunction(() => /✗/.test(document.getElementById('yamlValidIndicator')?.textContent || ''), null, { timeout: 4000 });
  const yamlInvalidText = await page.$eval('#yamlValidIndicator', (el) => el.textContent);
  if (/✗/.test(yamlInvalidText)) pass('YAML validate shows ✗ for invalid YAML'); else fail('yaml invalid indicator: ' + yamlInvalidText);
  // JSON toolbar must remain hidden for YAML files
  const jsonToolsHiddenForYamlRaw = await page.$eval('#jsonTools', (el) => el.hidden);
  if (jsonToolsHiddenForYamlRaw) pass('JSON toolbar hidden while YAML toolbar is active'); else fail('json toolbar unexpectedly visible for yaml in raw view');

  // ── TOML ── hand-rolled parser, render as a collapsible tree (reuses JSON tree styling).
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.toml');
  await page.waitForSelector('#previewHost .toml-preview .json-tree .j-key', { timeout: 30000 });
  const tType = await page.$eval('#typeSelect', (s) => s.value);
  if (tType === 'toml') pass('.toml detected as TOML'); else fail('toml type: ' + tType);
  const tKeys = await page.$$eval('#previewHost .toml-preview .json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (tKeys.includes('trust') && tKeys.includes('types')) pass('TOML tables rendered as tree (' + tKeys.length + ' keys)'); else fail('toml keys: ' + tKeys.join(','));
  // Array-of-tables [[types]] -> an array with 2 entries; booleans preserved.
  const tBool = await page.$$eval('#previewHost .toml-preview .json-tree .j-bool', (els) => els.length);
  const tNum = await page.$$eval('#previewHost .toml-preview .json-tree .j-num', (els) => els.length);
  if (tBool >= 4 && tNum >= 2) pass('TOML scalar types preserved (booleans + numbers)'); else fail('toml scalars: bool=' + tBool + ' num=' + tNum);
  const tomlPathText = await page.$eval('#previewHost .toml-preview', (el) => el.textContent);
  if (/trust\.server|types\.0\.id/.test(tomlPathText)) pass('TOML path breadcrumbs shown'); else fail('toml path text: ' + tomlPathText.replace(/\s+/g, ' ').slice(0, 300));
  const tomlSourceCollapsed = await page.$eval('#previewHost .toml-preview .kf-source-details', (el) => !el.open);
  if (tomlSourceCollapsed) pass('TOML source starts collapsed'); else fail('toml source unexpectedly open');
  const tomlSourceLine = await page.$eval('#previewHost .toml-preview .toml-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .toml-preview .kf-source-details');
    return details?.open && document.getElementById(`toml-line-${line}`);
  }, tomlSourceLine, { timeout: 3000 });
  pass('TOML source links open source');

  await page.evaluate(() => window.__fv.openViewerFile('duplicate.toml', {
    text: 'title = "first"\ntitle = "second"\n[tool]\nname = "one"\nname = "two"\n',
  }));
  await page.waitForSelector('#previewHost .toml-preview .kf-issues', { timeout: 8000 });
  const tomlDupText = await page.$eval('#previewHost .toml-preview', (el) => el.textContent);
  if (/TOML Structure Review|duplicate key|title|tool\.name/i.test(tomlDupText)) pass('TOML duplicate key diagnostics shown'); else fail('toml duplicate diagnostics: ' + tomlDupText.replace(/\s+/g, ' ').slice(0, 400));

  // ── TOML toolbar ── Validate button appears for TOML files in raw view.
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const tomlToolsHidden = await page.$eval('#tomlTools', (el) => el.hidden);
  if (!tomlToolsHidden) pass('TOML toolbar visible in raw view for TOML files'); else fail('toml toolbar hidden');
  const tomlValidateBtn = await page.$('#tomlValidateBtn');
  if (tomlValidateBtn) pass('TOML toolbar has Validate button'); else fail('toml toolbar button missing');
  // Validate: Sample.toml is valid → indicator shows ✓
  await page.click('#tomlValidateBtn');
  await page.waitForFunction(() => !document.getElementById('tomlValidIndicator')?.hidden, null, { timeout: 4000 });
  const tomlValidText = await page.$eval('#tomlValidIndicator', (el) => el.textContent);
  if (/✓/.test(tomlValidText)) pass('TOML validate shows ✓ for valid TOML'); else fail('toml valid indicator: ' + tomlValidText);
  // Validate invalid TOML → indicator shows ✗
  await page.evaluate(() => window.__fv.state.rawview.setValue('[bad\nkey = "unclosed'));
  await page.click('#tomlValidateBtn');
  await page.waitForFunction(() => /✗/.test(document.getElementById('tomlValidIndicator')?.textContent || ''), null, { timeout: 4000 });
  const tomlInvalidText = await page.$eval('#tomlValidIndicator', (el) => el.textContent);
  if (/✗/.test(tomlInvalidText)) pass('TOML validate shows ✗ for invalid TOML'); else fail('toml invalid indicator: ' + tomlInvalidText);
  // XML toolbar must remain hidden for TOML files
  const xmlToolsHiddenForToml = await page.$eval('#xmlTools', (el) => el.hidden);
  if (xmlToolsHiddenForToml) pass('XML toolbar hidden while TOML toolbar is active'); else fail('xml toolbar unexpectedly visible for toml in raw view');

  // ── TOML form editor ── Form button in TOML toolbar; clicking renders typed inputs.
  // Re-use the already-open Sample.toml page (now at raw view); navigate back to it.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.toml');
  await page.waitForSelector('#previewHost .toml-preview', { timeout: 30000 });
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const tomlFormBtnEl = await page.$('#tomlFormBtn');
  if (tomlFormBtnEl) pass('TOML toolbar has Form button for .toml file'); else fail('tomlFormBtn missing');
  await page.click('#tomlFormBtn');
  // Wait for form host to appear and contain a .toml-form element
  await page.waitForFunction(() => {
    const host = document.getElementById('tomlFormHost');
    return host && !host.hidden && host.querySelector('.toml-form');
  }, null, { timeout: 5000 });
  const tomlFormVisible = await page.$eval('#tomlFormHost', (el) => !el.hidden);
  if (tomlFormVisible) pass('TOML form editor renders into #tomlFormHost'); else fail('tomlFormHost hidden after click');
  const tomlSections = await page.$$eval('#tomlFormHost .ini-section', (els) => els.length);
  if (tomlSections >= 1) pass('TOML form editor renders sections from Sample.toml (' + tomlSections + ')'); else fail('toml form sections: ' + tomlSections);
  // Toggle off: form host hides
  await page.click('#tomlFormBtn');
  await page.waitForFunction(() => {
    const host = document.getElementById('tomlFormHost');
    return !host || host.hidden;
  }, null, { timeout: 4000 });
  const tomlFormOff = await page.evaluate(() => {
    const host = document.getElementById('tomlFormHost');
    return !host || host.hidden;
  });
  if (tomlFormOff) pass('TOML form editor hides when toggled off'); else fail('tomlFormHost still visible after toggle off');

  // ── XML ── element tree (reuses JSON tree styling) + XPath query panel + structural diff. ──
  // XML now renders as a live parentNode (tree + XPath panel) in #previewHost, not an iframe.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.xml');
  await page.waitForSelector('#previewHost .xml-qp .json-tree .j-key', { timeout: 30000 });
  const xType = await page.$eval('#typeSelect', (s) => s.value);
  if (xType === 'xml') pass('.xml detected as XML'); else fail('xml type: ' + xType);
  const xTags = await page.$$eval('#previewHost .json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (xTags.some((t) => /<catalog>/.test(t)) && xTags.some((t) => /<book>/.test(t))) pass('XML rendered as element tree (' + xTags.length + ' nodes)'); else fail('xml tags: ' + xTags.slice(0, 6).join(','));
  // XPath query panel highlights matching elements.
  const xqp = await page.$('#previewHost .xml-qp .qp-panel .qp-input');
  if (xqp) pass('XML XPath query panel rendered'); else fail('xml query panel missing');
  await page.fill('#previewHost .xml-qp .qp-input', '//book');
  await page.click('#previewHost .xml-qp .qp-btn');
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .json-tree .qp-match').length > 0, null, { timeout: 4000 }).catch(() => {});
  const xMatches = await page.$$eval('#previewHost .json-tree .qp-match', (els) => els.length);
  if (xMatches > 0) pass('XML XPath query highlights //book elements (' + xMatches + ')'); else fail('xml xpath no matches');
  // Structural diff: change one element's text → flagged; reindenting ignored.
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, null, { timeout: 8000 });
  const xmlOrig = await page.evaluate(() => window.__fv.state.rawview.originalValue());
  await page.evaluate((o) => window.__fv.state.rawview.setValue(o.replace('Midnight Rain', 'Midnight Sun')), xmlOrig);
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForFunction(() => /\bchanged\b/.test(document.querySelector('.jsondiff .jd-head')?.textContent || ''), null, { timeout: 6000 }).catch(() => {});
  const xmlDiffHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  if (/changed/.test(xmlDiffHead)) pass('XML structural diff flags a changed text node'); else fail('xml diff: ' + xmlDiffHead.slice(0, 80));
  await page.click('#rawMode button[data-raw="current"]');

  // ── XML toolbar ── Format / Validate buttons appear for XML files in raw view.
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const xmlToolsHidden = await page.$eval('#xmlTools', (el) => el.hidden);
  if (!xmlToolsHidden) pass('XML toolbar visible in raw view for XML files'); else fail('xml toolbar hidden');
  const xmlFormatBtn = await page.$('#xmlFormatBtn');
  const xmlValidateBtn = await page.$('#xmlValidateBtn');
  if (xmlFormatBtn && xmlValidateBtn) pass('XML toolbar has Format and Validate buttons'); else fail('xml toolbar buttons missing');
  // Validate: sample.xml is valid → indicator shows ✓
  await page.click('#xmlValidateBtn');
  await page.waitForFunction(() => !document.getElementById('xmlValidIndicator')?.hidden, null, { timeout: 4000 });
  const xmlValidText = await page.$eval('#xmlValidIndicator', (el) => el.textContent);
  if (/✓/.test(xmlValidText)) pass('XML validate shows ✓ for valid XML'); else fail('xml valid indicator: ' + xmlValidText);
  // Format: round-trip through DOMParser/XMLSerializer should preserve structure
  await page.click('#xmlFormatBtn');
  await page.waitForFunction(() => window.__fv.state.rawview.getValue().includes('<'), null, { timeout: 3000 });
  const formattedXml = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (formattedXml.includes('<catalog') && formattedXml.includes('\n')) pass('XML format produces indented output'); else fail('xml format result: ' + formattedXml.slice(0, 80));
  // Validate invalid XML → indicator shows ✗
  await page.evaluate(() => window.__fv.state.rawview.setValue('<unclosed>'));
  await page.click('#xmlValidateBtn');
  await page.waitForFunction(() => /✗/.test(document.getElementById('xmlValidIndicator')?.textContent || ''), null, { timeout: 4000 });
  const xmlInvalidText = await page.$eval('#xmlValidIndicator', (el) => el.textContent);
  if (/✗/.test(xmlInvalidText)) pass('XML validate shows ✗ for invalid XML'); else fail('xml invalid indicator: ' + xmlInvalidText);
  // YAML toolbar must remain hidden for XML files
  const yamlToolsHiddenForXml = await page.$eval('#yamlTools', (el) => el.hidden);
  if (yamlToolsHiddenForXml) pass('YAML toolbar hidden while XML toolbar is active'); else fail('yaml toolbar unexpectedly visible for xml in raw view');

  // ── INI / .env ── key-value tables grouped by section. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.ini');
  const iniframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
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
  if (/Sections\s*\d+/.test(iniMeta)) pass('INI metadata includes section count'); else fail('ini meta missing sections: ' + iniMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── INI form editor ── Form button in raw view swaps Monaco for the editable section/pair form.
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const iniFormBtnVisible = await page.$eval('#iniFormBtn', (el) => !el.hidden);
  if (iniFormBtnVisible) pass('INI toolbar shows Form button for .ini file'); else fail('iniFormBtn hidden');
  await page.click('#iniFormBtn');
  await page.waitForFunction(() => {
    const host = document.getElementById('iniFormHost');
    return host && !host.hidden && host.querySelector('.ini-form');
  }, null, { timeout: 5000 });
  const iniFormSecs = await page.$$eval('#iniFormHost .ini-section', (els) => els.length);
  const iniFormRows = await page.$$eval('#iniFormHost .ini-row .ini-key', (els) => els.length);
  if (iniFormSecs >= 1 && iniFormRows >= 1) pass('INI form editor renders editable sections + key rows (' + iniFormSecs + ' secs, ' + iniFormRows + ' keys)'); else fail('ini form secs=' + iniFormSecs + ' rows=' + iniFormRows);
  // Edit a key value through the form → it flushes back to Monaco on toggle-off.
  await page.fill('#iniFormHost .ini-row .ini-val', 'EDITED_BY_SMOKE');
  await page.click('#iniFormBtn');
  await page.waitForFunction(() => {
    const host = document.getElementById('iniFormHost');
    return !host || host.hidden;
  }, null, { timeout: 4000 });
  const iniEditedText = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/EDITED_BY_SMOKE/.test(iniEditedText)) pass('INI form edit flushes back into the editable text'); else fail('ini form edit not flushed: ' + iniEditedText.slice(0, 120));

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.env (environment variables)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const envMode = await page.$eval('#panes', (e) => e.dataset.mode || '');
  if (envMode === 'preview') pass('.env defaults to redacted preview mode'); else fail('env mode: ' + envMode);
  const envf = await frameOf('iframe.fv-preview-frame');
  await envf.waitForSelector('.env-secret-val', { timeout: 8000 });
  const envText = await envf.$eval('body', (e) => e.textContent);
  const envHtml = await envf.$eval('body', (e) => e.innerHTML);
  if (/sensitive \(redacted\)/i.test(envText) && /masked because/i.test(envText) && !/(super_secret_password_123|sk_test_|whsec_|REDACTED_PASSWORD)/.test(envText + envHtml)) pass('.env preview redacts sensitive values and DOM attributes'); else fail('env preview leaked or missed redaction: ' + envText.replace(/\s+/g, ' ').slice(0, 180));
  const envSourceCollapsed = await envf.$eval('.env-source-details', (e) => !e.open && /Redacted source/.test(e.querySelector('summary')?.textContent || ''));
  if (envSourceCollapsed) pass('.env redacted source is collapsed with a source summary'); else fail('env redacted source was not collapsed');
  await envf.click('.env-line-btn');
  await envf.waitForFunction(() => document.querySelector('.env-source-details')?.open, null, { timeout: 3000 });
  const envLineLinked = await envf.$eval('.env-source-details', (e) => {
    const firstLine = e.querySelector('#env-src-1');
    return e.open && !!firstLine && getComputedStyle(firstLine.querySelector('.env-src-code')).whiteSpace === 'pre-wrap';
  });
  if (envLineLinked) pass('.env line numbers open the wrapped redacted source view'); else fail('env source line link did not open wrapped source');
  const envCentered = await envf.$eval('.env-doc', (e) => {
    const body = document.body.getBoundingClientRect();
    const doc = e.getBoundingClientRect();
    return Math.abs((doc.left + doc.right) / 2 - (body.left + body.right) / 2) <= 2 && doc.width <= 980;
  });
  if (envCentered) pass('.env preview content is centered'); else fail('env preview not centered');
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const envMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Total variables\s*20/.test(envMeta) && /Sensitive variables\s*8/.test(envMeta)) pass('.env metadata includes variable and sensitive counts'); else fail('env meta: ' + envMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const rawMode = await page.$eval('#panes', (e) => e.dataset.mode || '');
  if (rawMode === 'raw') pass('.env raw view remains explicitly available'); else fail('env raw mode: ' + rawMode);

  // ── .env form editor: view switch, undo/redo, credential masking, comment round-trip ──
  // cal-com.env has DATABASE_URL=postgresql://calcom:s3cr3tp4ss@… — the credentialed value must be
  // detected (password-masked in the form); the read-only preview's masking is unit-tested separately.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('cal-com.env');
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', null, { timeout: 10000 });
  await page.click('#envFormBtn');
  await page.waitForSelector('#envFormHost .env-form', { timeout: 8000, state: 'visible' });
  const formMode = await page.$eval('#panes', (e) => e.dataset.mode || '');
  if (formMode === 'raw') pass('.env "edit as form" switches to the raw pane (form visible)'); else fail('env form mode: ' + formMode);
  const formBits = await page.evaluate(() => ({
    undo: !!document.querySelector('#envFormHost .env-btn[title^="Undo"]'),
    redo: !!document.querySelector('#envFormHost .env-btn[title^="Redo"]'),
    pwd: [...document.querySelectorAll('#envFormHost .env-val')].some((i) => i.type === 'password'),
  }));
  if (formBits.undo && formBits.redo) pass('.env form has Undo/Redo controls'); else fail('env form undo/redo missing: ' + JSON.stringify(formBits));
  if (formBits.pwd) pass('.env form masks credentialed value (postgres://…) as password'); else fail('env form pwd missing');
  // Comment a var, then un-comment it back (revert).
  const v0 = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  await page.evaluate(() => document.querySelector('#envFormHost .env-var-row .env-toggle').click());
  const vCommented = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  await page.evaluate(() => document.querySelector('#envFormHost .env-uncomment').click());
  const vBack = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  if (vCommented === v0 - 1 && vBack === v0) pass('.env form comment-out → un-comment round-trip (' + v0 + '→' + vCommented + '→' + vBack + ')'); else fail('env comment round-trip: ' + v0 + '/' + vCommented + '/' + vBack);

  // ── .env form: Sort / Trim / Dedup toolbar + selection + drag reorder ──
  const utilBits = await page.evaluate(() => ({
    sort: !!document.querySelector('#envFormHost .env-btn[title^="Sort"]'),
    trim: !!document.querySelector('#envFormHost .env-btn[title^="Trim"]'),
    dedup: !!document.querySelector('#envFormHost .env-btn[title^="Remove duplicate"]'),
    checks: document.querySelectorAll('#envFormHost .env-check').length,
    handles: document.querySelectorAll('#envFormHost .env-drag').length,
    draggable: [...document.querySelectorAll('#envFormHost .env-var-row')].every((r) => r.draggable === true),
  }));
  if (utilBits.sort && utilBits.trim && utilBits.dedup) pass('.env form has Sort/Trim/Dedup buttons'); else fail('env form util buttons: ' + JSON.stringify(utilBits));
  if (utilBits.checks > 0 && utilBits.handles > 0) pass('.env form rows have selection checkboxes + drag handles'); else fail('env form check/handle missing: ' + JSON.stringify(utilBits));
  if (utilBits.draggable) pass('.env form var rows are draggable'); else fail('env form rows not draggable');

  const dragOrder = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#envFormHost .env-var-row')];
    const before = [...document.querySelectorAll('#envFormHost .env-key')].map((i) => i.value);
    const src = rows[0], dest = rows[1];
    if (!src || !dest) return { before, after: [], missing: true };
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dest.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dest.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    const after = [...document.querySelectorAll('#envFormHost .env-key')].map((i) => i.value);
    return { before, after, missing: false };
  });
  if (!dragOrder.missing && dragOrder.after[0] === dragOrder.before[1] && dragOrder.after[1] === dragOrder.before[0]) {
    pass('.env form drag/drop reorders adjacent variable rows');
  } else {
    fail('env drag reorder: ' + JSON.stringify(dragOrder));
  }
  await page.evaluate(() => document.querySelector('#envFormHost .env-btn[title^="Undo"]').click());

  // Sort ALL keys (no selection) — keys should come back in ascending order.
  const keysBefore = await page.$$eval('#envFormHost .env-key', (e) => e.map((i) => i.value));
  await page.evaluate(() => document.querySelector('#envFormHost .env-btn[title^="Sort"]').click());
  const keysAfter = await page.$$eval('#envFormHost .env-key', (e) => e.map((i) => i.value));
  const expectSorted = [...keysBefore].sort((a, b) => a.localeCompare(b));
  const sortedOk = JSON.stringify(keysAfter) === JSON.stringify(expectSorted) && JSON.stringify(keysBefore) !== JSON.stringify(keysAfter);
  if (sortedOk) pass('.env form Sort orders all keys A→Z'); else fail('env sort: ' + JSON.stringify(keysAfter));
  // Undo the sort to restore original order (verifies Sort is an undoable mutation).
  await page.evaluate(() => document.querySelector('#envFormHost .env-btn[title^="Undo"]').click());
  const keysUndone = await page.$$eval('#envFormHost .env-key', (e) => e.map((i) => i.value));
  if (JSON.stringify(keysUndone) === JSON.stringify(keysBefore)) pass('.env form Sort is undoable'); else fail('env sort undo: ' + JSON.stringify(keysUndone));

  // Dedup: add a row, type a duplicate of the first key into it, then Dedup ALL → row removed.
  const dCount0 = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  const firstKey = await page.$eval('#envFormHost .env-key', (e) => e.value);
  await page.evaluate(() => document.querySelector('#envFormHost .env-btn').click()); // + Add variable
  const dCountAdded = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  // Type the duplicate key into the newly-added (last) key input; fire input so _entries updates.
  await page.evaluate((k) => {
    const keys = document.querySelectorAll('#envFormHost .env-key');
    const inp = keys[keys.length - 1];
    inp.value = k; inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, firstKey);
  await page.evaluate(() => document.querySelector('#envFormHost .env-btn[title^="Remove duplicate"]').click());
  const dCountDedup = await page.$$eval('#envFormHost .env-var-row', (e) => e.length);
  if (dCountAdded === dCount0 + 1 && dCountDedup === dCount0) pass('.env form Dedup removes duplicate keys (' + dCount0 + '→' + dCountAdded + '→' + dCountDedup + ')'); else fail('env dedup: ' + dCount0 + '/' + dCountAdded + '/' + dCountDedup);

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('ssh-config');
  await page.waitForSelector('#previewHost .sc-root', { timeout: 12000 });
  const sshType = await page.$eval('#typeSelect', (s) => s.value);
  const sshMode = await page.$eval('#panes', (e) => e.dataset.mode || '');
  if (sshType === 'ssh-config' && sshMode === 'preview') pass('SSH config defaults to rendered preview mode'); else fail('ssh type/mode: ' + sshType + '/' + sshMode);
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('#previewHost .sc-tab')];
    tabs.find((tab) => tab.textContent === 'prod')?.click();
  });
  const sshCommand = await page.$$eval('#previewHost .sc-panel.active .sc-cmd-text', (els) => els.map((e) => e.textContent).find((text) => text.startsWith('ssh -p')) || '');
  if (/ssh -p 2222 -i ~\/\.ssh\/id_ed25519 -J bastion -A deploy@prod-server\.example\.com/.test(sshCommand)) pass('SSH config preview builds full command from parsed directives'); else fail('ssh command: ' + sshCommand);
  await page.evaluate(async () => {
    const { buildMetadata } = await import('./core/meta-drawer.js');
    await buildMetadata();
  });
  const sshMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Host blocks\s*4/.test(sshMeta) && /Identity files\s*~\/\.ssh\/id_ed25519, ~\/\.ssh\/id_dev/.test(sshMeta)
    && /ProxyJump hosts\s*bastion/.test(sshMeta) && /ForwardAgent enabled\s*2/.test(sshMeta)
    && /Security notes\s*2 host blocks enable agent forwarding/.test(sshMeta)) pass('SSH config metadata includes hosts, identities, jumps, and security notes');
  else fail('ssh meta: ' + sshMeta.replace(/\s+/g, ' ').slice(0, 260));
  const wasDark = await page.$eval('html', (e) => e.dataset.theme === 'dark');
  if (!wasDark) await page.click('#themeBtn');
  const sshTitleColor = await page.$eval('#previewHost .sc-title', (e) => getComputedStyle(e).color);
  if (!/rgb\(17,\s*17,\s*17\)/.test(sshTitleColor)) pass('SSH config preview text follows dark theme'); else fail('ssh dark title color: ' + sshTitleColor);
  if (!wasDark) await page.click('#themeBtn');
  await page.click('#viewMode button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const sshRawMode = await page.$eval('#panes', (e) => e.dataset.mode || '');
  if (sshRawMode === 'raw') pass('SSH config raw view remains explicitly available'); else fail('ssh raw mode: ' + sshRawMode);

  // ── RDP ── connection info card, mstsc command. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.rdp');
  await page.waitForSelector('#previewHost .rdp-doc', { timeout: 12000 });
  const rdpType = await page.$eval('#typeSelect', (s) => s.value);
  if (rdpType === 'rdp') pass('.rdp detected as RDP Connection'); else fail('rdp type: ' + rdpType);
  const rdpTxt = await page.textContent('#previewHost .rdp-doc');
  if (rdpTxt.includes('myserver.example.com') || rdpTxt.includes('RDP')) pass('RDP connection host shown'); else fail('rdp txt: ' + rdpTxt.replace(/\s+/g, ' ').slice(0, 200));
  if (rdpTxt.includes('mstsc') || rdpTxt.includes('jdoe')) pass('RDP mstsc command or username shown'); else fail('rdp mstsc/user: ' + rdpTxt.replace(/\s+/g, ' ').slice(0, 200));

  // ── MCP Config ── server cards, env var redaction. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('claude_desktop_config.json');
  await page.waitForSelector('#previewHost .mc-root', { timeout: 12000 });
  const mcpType = await page.$eval('#typeSelect', (s) => s.value);
  if (mcpType === 'mcp-config') pass('claude_desktop_config.json detected as MCP Server Config'); else fail('mcp type: ' + mcpType);
  const mcpTxt = await page.textContent('#previewHost .mc-root');
  if (mcpTxt.includes('filesystem') || mcpTxt.includes('github')) pass('MCP server names shown'); else fail('mcp servers: ' + mcpTxt.replace(/\s+/g, ' ').slice(0, 200));
  if (!mcpTxt.includes('BSAexamplekeyABC123') && !mcpTxt.includes('ghp_example')) pass('MCP secret env values redacted'); else fail('mcp secret visible: ' + mcpTxt.replace(/\s+/g, ' ').slice(0, 200));

  // ── Kubeconfig ── cluster/context/user tables. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('kubeconfig');
  await page.waitForSelector('#previewHost .kc-root', { timeout: 12000 });
  const kubeType = await page.$eval('#typeSelect', (s) => s.value);
  if (kubeType === 'kubeconfig') pass('kubeconfig detected as Kubernetes Config'); else fail('kube type: ' + kubeType);
  const kubeTxt = await page.textContent('#previewHost .kc-root');
  if (kubeTxt.includes('prod-cluster') || kubeTxt.includes('dev-cluster')) pass('kubeconfig cluster names shown'); else fail('kube clusters: ' + kubeTxt.replace(/\s+/g, ' ').slice(0, 200));
  if (kubeTxt.includes('prod-admin') || kubeTxt.includes('developer')) pass('kubeconfig users shown'); else fail('kube users: ' + kubeTxt.replace(/\s+/g, ' ').slice(0, 200));
  const kubeHtml = await page.$eval('#previewHost .kc-root', (e) => e.innerHTML);
  if (/Kubeconfig Review|TLS skip|embedded credential|current context/i.test(kubeTxt)) pass('kubeconfig review warnings shown'); else fail('kube review: ' + kubeTxt.replace(/\s+/g, ' ').slice(0, 240));
  if (/Redacted source/i.test(kubeTxt) && !/example-token-payload|UFJJVkFURSBLRVk/.test(kubeTxt + kubeHtml)) pass('kubeconfig redacted source does not leak token/key data'); else fail('kube source leaked: ' + kubeTxt.replace(/\s+/g, ' ').slice(0, 240));
  const kubeSourceCollapsed = await page.$eval('#previewHost .kc-root .kf-source-details', (e) => !e.open);
  if (kubeSourceCollapsed) pass('kubeconfig redacted source is collapsed'); else fail('kube source unexpectedly expanded');
  await page.click('#previewHost .kc-root [data-source-line]');
  await page.waitForFunction(() => document.querySelector('#previewHost .kc-root .kf-source-details')?.open, null, { timeout: 3000 });
  const kubeSourceOpened = await page.$eval('#previewHost .kc-root .kf-source-details', (e) => e.open && !!e.querySelector('#kc-line-1'));
  if (kubeSourceOpened) pass('kubeconfig source links open source preview'); else fail('kube source link did not open preview');

  // ── Patch / unified diff ── colorized add/remove/hunk lines. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.patch');
  const patchframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const patchf = await frameOf('iframe.fv-preview-frame');
  await patchf.waitForSelector('.patch', { timeout: 8000 });
  const patchType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (patchType2 === 'patch') pass('.patch detected as Patch / Diff'); else fail('patch type: ' + patchType2);
  const adds = await patchf.$$eval('.patch .p-add', (els) => els.length);
  const dels = await patchf.$$eval('.patch .p-del', (els) => els.length);
  const hunks = await patchf.$$eval('.patch .p-hunk', (els) => els.length);
  if (adds >= 2 && dels >= 1 && hunks >= 1) pass('patch colorized (+' + adds + ' −' + dels + ', ' + hunks + ' hunk)'); else fail('patch lines: add=' + adds + ' del=' + dels + ' hunk=' + hunks);
  // Hunk include/exclude → rebuilds a filtered partial patch in the output textarea.
  const patchInit = await patchf.evaluate(() => ({ cbs: document.querySelectorAll('.patch-hcb').length, count: document.querySelector('.patch-count')?.textContent || '', out: document.querySelector('.patch-out')?.value || '' }));
  if (patchInit.cbs === 3 && /3 of 3/.test(patchInit.count) && /greeting library/.test(patchInit.out)) pass('patch hunk checkboxes + full filtered output'); else fail('patch init: ' + JSON.stringify(patchInit));
  await patchf.evaluate(() => { const c = document.querySelectorAll('.patch-hcb'); const last = c[c.length - 1]; last.checked = false; last.dispatchEvent(new Event('change', { bubbles: true })); });
  const patchAfter = await patchf.evaluate(() => ({ count: document.querySelector('.patch-count')?.textContent || '', out: document.querySelector('.patch-out')?.value || '' }));
  if (/2 of 3/.test(patchAfter.count) && !/greeting library/.test(patchAfter.out) && /Hello, /.test(patchAfter.out)) pass('patch excludes a deselected hunk from the filtered output'); else fail('patch after: ' + JSON.stringify(patchAfter));
  await patchf.click('.patch-none');
  const patchNone = await patchf.evaluate(() => ({ count: document.querySelector('.patch-count')?.textContent || '', out: (document.querySelector('.patch-out')?.value || '').trim() }));
  if (/0 of 3/.test(patchNone.count) && patchNone.out === '') pass('patch None clears the filtered output'); else fail('patch none: ' + JSON.stringify(patchNone));

  // ── Log ── severity highlighting + timestamps. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.log');
  const lframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const lf = await frameOf('iframe.fv-preview-frame');
  await lf.waitForSelector('.logv', { timeout: 8000 });
  const logType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (logType2 === 'log') pass('.log detected as Log'); else fail('log type: ' + logType2);
  const errLines = await lf.$$eval('.logv .l-error', (els) => els.length);
  const warnLines = await lf.$$eval('.logv .l-warn', (els) => els.length);
  const tsSpans = await lf.$$eval('.logv .l-ts', (els) => els.length);
  if (errLines >= 1 && warnLines >= 1 && tsSpans >= 4) pass('log severity highlighted (' + errLines + ' error, ' + warnLines + ' warn, ' + tsSpans + ' timestamps)'); else fail('log: err=' + errLines + ' warn=' + warnLines + ' ts=' + tsSpans);
  // ANSI escapes render as coloured spans (sample.log has \x1b[..m lines, incl. 256/truecolor).
  const ansiSpans = await lf.$$eval('.logv .ll span[style*="color"]', (els) => els.length);
  if (ansiSpans >= 3) pass('log renders ANSI colour escapes (' + ansiSpans + ' coloured spans)'); else fail('log ANSI spans: ' + ansiSpans);
  // Severity filter: clicking "Error" leaves only error rows visible.
  await lf.click('.logv-filter[data-sev="l-error"]');
  const filtered = await lf.evaluate(() => {
    const vis = [...document.querySelectorAll('.logv .ll')].filter((r) => r.style.display !== 'none');
    return { count: vis.length, allError: vis.every((r) => r.classList.contains('l-error')) };
  });
  if (filtered.count >= 1 && filtered.allError) pass('log severity filter narrows to errors (' + filtered.count + ')'); else fail('log filter: ' + JSON.stringify(filtered));

  // ── Word count bar ── visible for markdown, shows stats. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  // The count renders on the standalone bar, OR inline on the text-utils row when that bar is
  // showing (markdown shows the text-utils row, so the count is inline there).
  const wc = await page.evaluate(() => {
    const bar = document.getElementById('wordCountBar');
    const inline = document.getElementById('textUtilsCount');
    const el = (bar && !bar.hidden) ? bar : (inline && !inline.hidden ? inline : null);
    return { shown: !!el, text: el ? el.textContent : '' };
  });
  if (wc.shown) pass('word count visible for markdown file'); else fail('word count hidden for markdown');
  if (wc.text.includes('words') && wc.text.includes('chars')) pass('word count shows words and chars for markdown: ' + wc.text.trim()); else fail('word count missing stats: ' + wc.text);
  if (/min read/.test(wc.text)) pass('word count shows reading time for markdown'); else fail('word count missing read time: ' + wc.text);

  // ── Text utilities toolbar ── visible for all non-binary text files. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const textUtilsHidden = await page.$eval('#textUtils', (el) => el.hidden);
  if (!textUtilsHidden) pass('text utilities toolbar visible for markdown (non-binary text) file'); else fail('text utils toolbar hidden for markdown');
  const sortAscBtn = await page.$('[data-textutil="sortAsc"]');
  const trimBtn = await page.$('[data-textutil="trim"]');
  const b64encBtn = await page.$('[data-textutil="b64encode"]');
  if (sortAscBtn && trimBtn && b64encBtn) pass('text utils toolbar has Sort ↑, Trim, and B64 ↑ buttons'); else fail('text utils buttons missing');
}
