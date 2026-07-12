import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const fixtures = [
  {
    name: 'package.json',
    mime: 'application/json',
    selector: '.pj-doc',
    sentinel: 'SENTINEL_JSON_UNKNOWN',
    source: '\ufeff{\r\n  "name": "fidelity-package",\r\n  "version": "1.0.0",\r\n  "description": "Grüße 🌍",\r\n  "scripts": {"test": "node test.js"},\r\n  "x-fidelity-unknown": "SENTINEL_JSON_UNKNOWN"\r\n}\r\n',
  },
  {
    name: 'pubspec.yaml',
    mime: 'application/yaml',
    selector: '.pubspec-doc, [class*="pubspec"]',
    sentinel: 'SENTINEL_YAML_UNKNOWN',
    source: 'name: fidelity_app\r\ndescription: "Grüße 🌍"\r\nversion: 1.0.0\r\nenvironment:\r\n  sdk: ">=3.0.0 <4.0.0"\r\ndependencies:\r\n  flutter:\r\n    sdk: flutter\r\nx-fidelity-unknown: SENTINEL_YAML_UNKNOWN\r\n',
  },
  {
    name: 'pyproject.toml',
    mime: 'application/toml',
    selector: '.pyproject-doc',
    sentinel: 'SENTINEL_TOML_UNKNOWN',
    source: '[project]\r\nname = "fidelity-project"\r\nversion = "1.0.0"\r\ndescription = "Grüße 🌍"\r\n\r\n[tool.fidelity]\r\nunknown = "SENTINEL_TOML_UNKNOWN"\r\n',
  },
  {
    name: 'Dockerfile',
    mime: 'text/plain',
    selector: '.kf-list',
    sentinel: 'SENTINEL_DOCKER_UNKNOWN',
    source: '# SENTINEL_DOCKER_UNKNOWN\r\nFROM alpine:3.20\r\nLABEL org.example.note="Grüße 🌍"\r\nRUN printf "ready\\n"\r\n',
  },
  {
    name: 'docker-compose.yml',
    mime: 'application/yaml',
    selector: '.kf-svc',
    sentinel: 'SENTINEL_COMPOSE_UNKNOWN',
    source: 'services:\r\n  app:\r\n    image: alpine:3.20\r\n    command: ["echo", "Grüße 🌍"]\r\nx-fidelity-unknown: SENTINEL_COMPOSE_UNKNOWN\r\n',
  },
  {
    name: 'Makefile',
    mime: 'text/plain',
    selector: '.makefile-doc',
    sentinel: 'SENTINEL_MAKE_UNKNOWN',
    source: '# SENTINEL_MAKE_UNKNOWN\r\n.DEFAULT_GOAL := build\r\nGREETING := Grüße 🌍\r\n\r\nbuild:\r\n\t@printf "%s\\n" "$(GREETING)"\r\n',
  },
  {
    name: 'query.sql',
    mime: 'text/plain',
    selector: '.sql-doc',
    sentinel: 'SENTINEL_CODE_UNKNOWN',
    source: '-- SENTINEL_CODE_UNKNOWN\r\nCREATE TABLE readings (id INTEGER, note TEXT);\r\nSELECT id, note FROM readings ORDER BY id;\r\n',
  },
];

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function openFixture(page, fixture) {
  const encoded = Buffer.from(fixture.source, 'utf8').toString('base64');
  await page.evaluate(({ encoded: data, name, mime }) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return window.__fv.openBlobFile(new Blob([bytes], { type: mime }), name, { mime });
  }, { encoded, name: fixture.name, mime: fixture.mime });
  const scopedSelector = fixture.selector.split(',').map((selector) => `#previewHost ${selector.trim()}`).join(', ');
  await page.waitForSelector(scopedSelector, { timeout: 15000 });
  await page.waitForFunction(() => !document.getElementById('enhanceChip')?.hidden && !window.__fv.state.forceBase);
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const digest = await crypto.subtle.digest('SHA-256', window.__fv.state.intake.bytes);
    const originalHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const preview = document.getElementById('previewHost').cloneNode(true);
    preview.querySelectorAll('.kf-source-details').forEach((node) => node.remove());
    return {
      chip: document.querySelector('#enhanceChip .ec-label')?.textContent || '',
      action: document.querySelector('#enhanceChip .ec-toggle')?.textContent || '',
      raw: window.__fv.state.rawview?.getValue?.() || '',
      originalModel: window.__fv.state.rawview?.originalValue?.() || '',
      sourceText: window.__fv.state.intake.sourceText,
      parserText: window.__fv.state.intake.text,
      originalText: window.__fv.state.intake.originalText,
      hadBom: window.__fv.state.intake.hadBom,
      originalHash,
      rawVisible: document.getElementById('rawPane').getClientRects().length > 0,
      previewVisible: document.getElementById('previewPane').getClientRects().length > 0,
      summaryText: preview.textContent || '',
    };
  });
}

export async function runExactSourceFidelity(ctx) {
  const { page, pass, fail } = ctx;
  const offOriginStart = ctx.offOrigin?.length || 0;
  let omittedSentinels = 0;

  for (const fixture of fixtures) {
    await openFixture(page, fixture);
    const expectedHash = hash(Buffer.from(fixture.source, 'utf8'));
    const initial = await snapshot(page);
    const parserSource = fixture.source.startsWith('\ufeff') ? fixture.source.slice(1) : fixture.source;
    if (/^✦ Enhanced summary: /.test(initial.chip) && initial.action === 'Show default view'
      && initial.raw === fixture.source && initial.originalModel === fixture.source
      && initial.sourceText === fixture.source && initial.parserText === parserSource
      && initial.originalText === fixture.source && initial.originalHash === expectedHash
      && initial.rawVisible && initial.previewVisible && initial.raw.includes(fixture.sentinel)) {
      pass(`${fixture.name}: enhanced summary and exact source are simultaneously visible with an immutable byte oracle`);
    } else fail(`${fixture.name} initial source contract: ` + JSON.stringify({
      ...initial,
      rawEqual: initial.raw === fixture.source,
      originalEqual: initial.originalText === fixture.source,
      parserEqual: initial.parserText === parserSource,
      expectedHash,
    }).slice(0, 1500));
    if (!initial.summaryText.includes(fixture.sentinel)) omittedSentinels++;

    await page.click('#enhanceChip .ec-toggle');
    await page.waitForFunction(() => window.__fv.state.forceBase === true);
    const plain = await snapshot(page);
    if (/^Plain view — /.test(plain.chip) && plain.action === 'Show enhanced summary'
      && plain.raw === fixture.source && plain.originalHash === expectedHash) {
      pass(`${fixture.name}: default-view escape hatch preserves exact source and original bytes`);
    } else fail(`${fixture.name} default toggle fidelity: ` + JSON.stringify(plain).slice(0, 900));

    await page.click('#enhanceChip .ec-toggle');
    await page.waitForFunction(() => window.__fv.state.forceBase === false);
    const scopedSelector = fixture.selector.split(',').map((selector) => `#previewHost ${selector.trim()}`).join(', ');
    await page.waitForSelector(scopedSelector, { timeout: 15000 });
    const enhanced = await snapshot(page);
    if (/^✦ Enhanced summary: /.test(enhanced.chip) && enhanced.raw === fixture.source
      && enhanced.originalModel === fixture.source && enhanced.originalHash === expectedHash) {
      pass(`${fixture.name}: returning to the enhanced summary does not normalize or reset source`);
    } else fail(`${fixture.name} enhanced return fidelity: ` + JSON.stringify(enhanced).slice(0, 900));
  }

  if (omittedSentinels >= 5) {
    pass(`Enhanced summaries omit fixture-only fields/comments honestly while Raw retains them (${omittedSentinels}/${fixtures.length})`);
  } else fail(`too few representative summaries demonstrated omission: ${omittedSentinels}/${fixtures.length}`);

  const packageFixture = fixtures[0];
  await openFixture(page, packageFixture);
  const originalHash = hash(Buffer.from(packageFixture.source, 'utf8'));
  const edited = packageFixture.source
    .replace('fidelity-package', 'fidelity-package-edited')
    .replace('SENTINEL_JSON_UNKNOWN', 'SENTINEL_JSON_EDITED');
  await page.evaluate((source) => window.__fv.state.rawview.setValue(source), edited);
  await page.waitForFunction((source) => window.__fv.state.intake.sourceText === source
    && /fidelity-package-edited/.test(document.querySelector('#previewHost .pj-title')?.textContent || ''), edited);

  await page.evaluate(async () => {
    window.__fv.state.settingsModel.values.jsonSortKeys = 'Z-A';
    await window.__fv.rerenderPreview();
  });
  const wasDark = await page.evaluate(() => document.documentElement.dataset.theme === 'dark');
  await page.click('#themeBtn');
  await page.waitForFunction((before) => (document.documentElement.dataset.theme === 'dark') !== before, wasDark);
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 10000 });

  await page.click('#enhanceChip .ec-toggle');
  await page.waitForFunction(() => window.__fv.state.forceBase === true
    && /fidelity-package-edited/.test(document.querySelector('#previewHost .json-tree')?.textContent || ''));
  await page.click('#enhanceChip .ec-toggle');
  await page.waitForFunction(() => window.__fv.state.forceBase === false
    && /fidelity-package-edited/.test(document.querySelector('#previewHost .pj-title')?.textContent || ''));
  await page.evaluate(async () => { await window.__fv.rerenderPreview(); });
  const editedState = await snapshot(page);
  if (editedState.raw === edited && editedState.sourceText === edited
    && editedState.parserText === edited.slice(1)
    && editedState.originalModel === packageFixture.source
    && editedState.originalText === packageFixture.source
    && editedState.originalHash === originalHash) {
    pass('Settings, theme, default/enhanced, and repeated rerenders preserve unsaved exact source while original bytes/text stay immutable');
  } else fail('edited source contract after rerenders: ' + JSON.stringify({
    ...editedState,
    rawEqual: editedState.raw === edited,
    sourceEqual: editedState.sourceText === edited,
    originalEqual: editedState.originalText === packageFixture.source,
    expectedHash: originalHash,
  }).slice(0, 1600));

  const downloadPromise = page.waitForEvent('download');
  await page.click('#downloadBtn');
  const download = await downloadPromise;
  const downloaded = readFileSync(await download.path());
  if (Buffer.compare(downloaded, Buffer.from(edited, 'utf8')) === 0) {
    pass('Current-source download preserves edited BOM, CRLF, Unicode, unknown fields, and trailing newline exactly');
  } else fail(`edited source download bytes differ (${downloaded.length} vs ${Buffer.byteLength(edited)})`);
  if ((await snapshot(page)).originalHash === originalHash) pass('Downloading the edited copy does not replace the original byte oracle');
  else fail('download replaced the original byte oracle');

  if ((await page.evaluate(() => document.documentElement.dataset.theme === 'dark')) !== wasDark) await page.click('#themeBtn');

  await openFixture(page, packageFixture);
  await page.evaluate((source) => window.__fv.state.rawview.setValue(source.slice(1)), packageFixture.source);
  await page.waitForFunction(() => window.__fv.state.intake.sourceText?.startsWith('\ufeff') === false);
  const removedBom = await page.evaluate(() => ({
    dirty: window.__fv.state.rawview.isDirty(),
    currentHasBom: window.__fv.state.rawview.getValue().startsWith('\ufeff'),
    originalHasBom: window.__fv.state.rawview.originalValue().startsWith('\ufeff'),
  }));
  await page.evaluate((source) => window.__fv.state.rawview.setValue(source), packageFixture.source);
  await page.waitForFunction((source) => window.__fv.state.intake.sourceText === source, packageFixture.source);
  const restoredBom = await page.evaluate(() => ({
    dirty: window.__fv.state.rawview.isDirty(),
    exact: window.__fv.state.rawview.getValue() === window.__fv.state.rawview.originalValue(),
  }));
  if (removedBom.dirty && !removedBom.currentHasBom && removedBom.originalHasBom
    && !restoredBom.dirty && restoredBom.exact) {
    pass('RawView treats removing/restoring only the BOM as a real, reversible source edit');
  } else fail('RawView BOM dirty tracking: ' + JSON.stringify({ removedBom, restoredBom }));

  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const tree = document.getElementById('fileTree');
    if (tree && !tree.hidden) tree.querySelector('.ft-close')?.click();
  });
  await openFixture(page, { ...packageFixture, source: edited });
  await page.waitForFunction(() => document.querySelector('#tabbar button[data-mode="preview"]')?.classList.contains('active'));
  const mobilePreview = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chipVisible: document.getElementById('enhanceChip')?.getClientRects().length > 0,
    previewVisible: document.querySelector('#previewHost .pj-doc')?.getClientRects().length > 0,
  }));
  await page.click('#tabbar button[data-mode="raw"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 8000 });
  const mobileRawBefore = await page.evaluate(() => window.__fv.state.rawview.getValue());
  await page.click('#tabbar button[data-mode="preview"]');
  await page.click('#enhanceChip .ec-toggle');
  await page.waitForFunction(() => window.__fv.state.forceBase === true);
  await page.click('#tabbar button[data-mode="raw"]');
  const mobileRawAfter = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mobilePreview.overflow <= 1 && mobilePreview.chipVisible && mobilePreview.previewVisible
    && mobileRawBefore === edited && mobileRawAfter === edited) {
    pass('Mobile enhanced/default views keep exact current Raw source one explicit tab action away without overflow');
  } else fail('mobile exact-source contract: ' + JSON.stringify({
    ...mobilePreview,
    beforeEqual: mobileRawBefore === edited,
    afterEqual: mobileRawAfter === edited,
  }));
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => !matchMedia('(max-width: 760px)').matches);

  if ((ctx.offOrigin?.length || 0) === offOriginStart) pass('Enhanced-summary/source fidelity checks make zero off-origin requests');
  else fail('enhanced-summary/source fidelity made an off-origin request');
}
