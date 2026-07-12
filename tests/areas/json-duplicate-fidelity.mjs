export async function runJsonDuplicateFidelity(ctx) {
  const { page, frameOf, pass, fail } = ctx;
  const offOriginStart = ctx.offOrigin?.length || 0;
  const openText = async (filename, text) => page.evaluate(({ filename: name, source }) => (
    window.__fv.openViewerFile(name, { text: source })
  ), { filename, source: text });

  const strictSource = `{
  "top": "first",
  "\\u0074op": "last",
  "nested": {
    "id": "first",
    "id": "last"
  },
  "left": {"same": 1},
  "right": {"same": 2},
  "items": [{"a/b~c": 1, "a\\/b\\u007ec": 2}],
  "__proto__": 1,
  "__proto__": 2,
  "<img src=x onerror=alert(1)>": 1,
  "\\u003cimg src=x onerror=alert(1)\\u003e": 2
}`;
  await openText('duplicates.json', strictSource);
  await page.waitForSelector('#previewHost .json-qp .json-duplicate-warning', { timeout: 10000 });
  const strict = await page.$eval('#previewHost .json-qp', (host) => ({
    total: host.querySelector('.json-duplicate-warning')?.dataset.duplicateTotal,
    pointers: [...host.querySelectorAll('.json-duplicate-warning li')].map((row) => row.dataset.jsonPointer),
    warning: host.querySelector('.json-duplicate-warning')?.textContent || '',
    top: host.querySelector('[data-qp-path="top"]')?.textContent || '',
    nested: host.querySelector('[data-qp-path="nested.id"]')?.textContent || '',
    injected: host.querySelectorAll('.json-duplicate-warning img,.json-duplicate-warning script,.json-duplicate-warning iframe').length,
  }));
  const expectedPointers = ['/top', '/nested/id', '/items/0/a~1b~0c', '/__proto__', '/<img src=x onerror=alert(1)>'];
  if (strict.total === '5' && JSON.stringify(strict.pointers) === JSON.stringify(expectedPointers)
    && /line 3, column 3.*first declared at line 2, column 3/.test(strict.warning)) {
    pass('JSON duplicate warning decodes keys, scopes objects, escapes array JSON Pointers, and reports both locations');
  } else fail('strict JSON duplicate diagnostics: ' + JSON.stringify(strict));
  if (/last/.test(strict.top) && /last/.test(strict.nested) && /earlier values are hidden/i.test(strict.warning)) {
    pass('JSON tree makes last-value semantics explicit instead of silently hiding duplicates');
  } else fail('strict JSON last-value disclosure: ' + JSON.stringify(strict));
  if (strict.injected === 0) pass('JSON duplicate key/path diagnostics render hostile names as inert text');
  else fail('JSON duplicate diagnostics injected active nodes: ' + strict.injected);
  const strictRaw = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (strictRaw === strictSource) pass('JSON duplicate diagnostics preserve exact source text');
  else fail('strict JSON source changed during diagnostics');

  const jsoncSource = '{\r\n'
    + '  // duplicate fixture\r\n'
    + '  "value": "first",\r\n'
    + '  "value": "last",\r\n'
    + '}';
  await openText('duplicates.jsonc', jsoncSource);
  await page.waitForSelector('#previewHost .json-qp .json-duplicate-warning', { timeout: 10000 });
  const jsonc = await page.$eval('#previewHost .json-qp', (host) => ({
    warnings: [...host.querySelectorAll('.json-warning')].map((node) => node.textContent),
    pointer: host.querySelector('.json-duplicate-warning li')?.dataset.jsonPointer,
    duplicate: host.querySelector('.json-duplicate-warning li')?.textContent || '',
  }));
  const jsoncRaw = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/Parsed as JSONC/.test(jsonc.warnings[0])
    && jsonc.pointer === '/value' && /line 4, column 3.*line 3, column 3/.test(jsonc.duplicate)
    && jsoncRaw === jsoncSource) {
    pass('JSONC duplicate diagnostics preserve CRLF source and original 1-based locations');
  } else fail('JSONC duplicate diagnostics: ' + JSON.stringify({ ...jsonc, rawEqual: jsoncRaw === jsoncSource }));

  const bomDirect = await page.evaluate(async () => {
    const source = '\ufeff{"name":"first","name":"last"}';
    const { render } = await import('/types/text/json/renderer.js');
    const rendered = await render({ text: source, filename: 'bom.json' }, { settings: {} });
    document.body.appendChild(rendered.parentNode);
    const result = {
      sourceUnchanged: source.startsWith('\ufeff') && source.length === 31,
      warnings: [...rendered.parentNode.querySelectorAll('.json-warning')].map((node) => node.textContent),
      total: rendered.parentNode.querySelector('.json-duplicate-warning')?.dataset.duplicateTotal,
    };
    rendered.parentNode.remove();
    return result;
  });
  if (bomDirect.sourceUnchanged && /BOM was ignored.*source is unchanged/.test(bomDirect.warnings[0])
    && bomDirect.total === '1') {
    pass('JSON BOM recovery and duplicate diagnostics operate on an unchanged exact-source string');
  } else fail('JSON BOM duplicate recovery: ' + JSON.stringify(bomDirect));

  const malformedSource = '{"kept":1,"kept":2,"nested":{"x":1,"x":2},BROKEN,"late":1,"late":2}';
  await openText('malformed-duplicates.json', malformedSource);
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 10000 });
  const malformedFrame = await frameOf('iframe.fv-preview-frame');
  await malformedFrame.waitForSelector('.json-error + .json-duplicate-warning', { timeout: 8000 });
  const malformed = await malformedFrame.evaluate(() => ({
    firstIsError: document.body.firstElementChild?.classList.contains('json-error'),
    total: document.querySelector('.json-duplicate-warning')?.dataset.duplicateTotal,
    pointers: [...document.querySelectorAll('.json-duplicate-warning li')].map((row) => row.dataset.jsonPointer),
    text: document.body.textContent,
  }));
  if (malformed.firstIsError && malformed.total === '2'
    && malformed.pointers.join(',') === '/kept,/nested/x'
    && /Invalid JSON/.test(malformed.text) && /parse error above is primary/i.test(malformed.text)
    && !/\/late/.test(malformed.text)) {
    pass('Malformed JSON keeps its parse error primary and only retains certain pre-tail duplicates');
  } else fail('malformed duplicate JSON: ' + JSON.stringify(malformed));

  const manySource = '{' + Array.from({ length: 52 }, (_, index) => `"key${index}":0,"key${index}":1`).join(',') + '}';
  await openText('many-duplicates.json', manySource);
  await page.waitForSelector('#previewHost .json-duplicate-warning', { timeout: 10000 });
  const bounded = await page.$eval('#previewHost .json-duplicate-warning', (warning) => ({
    total: warning.dataset.duplicateTotal,
    rows: warning.querySelectorAll('li').length,
    text: warning.textContent,
  }));
  if (bounded.total === '52' && bounded.rows === 50 && /Showing 50 of 52.*2 more omitted/.test(bounded.text)) {
    pass('JSON duplicate warning bounds stored rows while counting and disclosing every occurrence');
  } else fail('bounded duplicate diagnostics: ' + JSON.stringify(bounded));

  const packageSource = `{
  "name": "first-name",
  "name": "last-name",
  "version": "1.0.0",
  "scripts": {
    "build": "first command",
    "build": "last command"
  },
  "dependencies": {
    "alpha": "1.0.0",
    "\\u0061lpha": "2.0.0"
  }
}`;
  await openText('package.json', packageSource);
  await page.waitForSelector('#previewHost .pj-doc .json-duplicate-warning', { timeout: 10000 });
  const packageView = await page.$eval('#previewHost .pj-doc', (host) => ({
    title: host.querySelector('.pj-title')?.textContent || '',
    total: host.querySelector('.json-duplicate-warning')?.dataset.duplicateTotal,
    pointers: [...host.querySelectorAll('.json-duplicate-warning li')].map((row) => row.dataset.jsonPointer),
    text: host.textContent,
    source: host.querySelector('.kf-source')?.textContent || '',
  }));
  const packageRaw = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/last-name/.test(packageView.title) && packageView.total === '3'
    && packageView.pointers.join(',') === '/name,/scripts/build,/dependencies/alpha'
    && /earlier values are hidden/i.test(packageView.text)) {
    pass('package.json enhanced summary surfaces exact-source duplicate keys before last-value analysis');
  } else fail('package.json duplicate diagnostics: ' + JSON.stringify(packageView).slice(0, 1200));
  if (packageRaw === packageSource && /first-name/.test(packageView.source) && /last-name/.test(packageView.source)) {
    pass('package.json duplicate warning retains both declarations in exact source and raw editor');
  } else fail('package.json exact duplicate source was not retained');

  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const tree = document.querySelector('#fileTree');
    if (tree && !tree.hidden) tree.querySelector('.ft-close')?.click();
  });
  await openText('package.json', packageSource);
  await page.waitForFunction(() => matchMedia('(max-width: 760px)').matches
    && getComputedStyle(document.getElementById('tabbar')).display !== 'none'
    && document.querySelector('#tabbar button[data-mode="preview"]')?.classList.contains('active'));
  await page.evaluate(() => {
    const tree = document.querySelector('#fileTree');
    if (tree && !tree.hidden) tree.querySelector('.ft-close')?.click();
  });
  const mobilePreview = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    warningVisible: document.querySelector('#previewHost .json-duplicate-warning')?.getClientRects().length > 0,
  }));
  await page.click('#tabbar button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const mobileRaw = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mobilePreview.overflow <= 1 && mobilePreview.warningVisible && mobileRaw === packageSource) {
    pass('Mobile duplicate warning fits the viewport and exact Raw source is one explicit tab away');
  } else fail('mobile duplicate fidelity: ' + JSON.stringify({ ...mobilePreview, rawEqual: mobileRaw === packageSource }));
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => !matchMedia('(max-width: 760px)').matches);

  const malformedPackage = '{"name":"first","name":"last",BROKEN,"late":1,"late":2}';
  await openText('package.json', malformedPackage);
  await page.waitForSelector('#previewHost .pj-doc .pj-err + .json-duplicate-warning', { timeout: 10000 });
  const packageError = await page.$eval('#previewHost .pj-doc', (host) => ({
    first: host.firstElementChild?.className,
    total: host.querySelector('.json-duplicate-warning')?.dataset.duplicateTotal,
    text: host.textContent,
  }));
  if (packageError.first === 'pj-err' && packageError.total === '1'
    && /parse error above is primary/i.test(packageError.text) && !/\/late/.test(packageError.text)) {
    pass('Malformed package.json keeps primary parse failure plus certain duplicate diagnostics');
  } else fail('malformed package.json diagnostics: ' + JSON.stringify(packageError));

  if ((ctx.offOrigin?.length || 0) === offOriginStart) pass('JSON duplicate diagnostics make zero off-origin requests');
  else fail('JSON duplicate diagnostics made an off-origin request');
}
