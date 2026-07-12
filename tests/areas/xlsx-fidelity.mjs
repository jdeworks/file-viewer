import { readFileSync } from 'node:fs';
import { createXlsxFidelityFixture, inspectXlsxOoxml } from '../office-fidelity-fixtures.mjs';

function toBase64(bytes) { return Buffer.from(bytes).toString('base64'); }

async function openWorkbookBytes(page, bytes, name) {
  await page.evaluate(({ b64, filename }) => {
    const binary = atob(b64);
    const array = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) array[index] = binary.charCodeAt(index);
    return window.__fv.openBlobFile(
      new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      filename,
      { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
  }, { b64: toBase64(bytes), filename: name });
}

export async function runXlsxFidelity(ctx) {
  const { page, pass, fail } = ctx;
  const offOriginStart = ctx.offOrigin?.length || 0;
  const fixture = createXlsxFidelityFixture();
  const oracle = await inspectXlsxOoxml(fixture);
  if (/<f>SUM\(A2:A3\)<\/f>/.test(oracle.formulaCell) && /<v>3<\/v>/.test(oracle.formulaCell)
    && /state="hidden"/.test(oracle.workbookXml) && /state="veryHidden"/.test(oracle.workbookXml)) {
    pass('XLSX fixture raw OOXML independently proves formula/cache and both hidden states');
  } else fail('XLSX raw fixture oracle did not retain required semantics');

  await openWorkbookBytes(page, fixture, 'fidelity.xlsx');
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .xe-tab').length === 3, null, { timeout: 15000 });
  const tabs = await page.$$eval('#previewHost .xe-tab', (elements) => elements.map((tab) => ({
    state: tab.dataset.visibility,
    badge: tab.querySelector('.xe-sheet-state')?.textContent || '',
  })));
  if (tabs.map((tab) => tab.state).join(',') === '0,1,2'
    && tabs[1].badge === 'Hidden' && tabs[2].badge === 'Very hidden') {
    pass('XLSX tabs expose visible, hidden, and very-hidden workbook states');
  } else fail('XLSX visibility tabs: ' + JSON.stringify(tabs));

  await page.click('#previewHost .xe-panel:not([hidden]) .xe-cell[data-address="B2"]');
  const inspection = await page.evaluate(() => {
    const host = document.querySelector('#previewHost');
    const field = (name) => host.querySelector(`.xe-inspector-field[data-field="${name}"] .xe-inspector-value`)?.textContent || '';
    const link = host.querySelector('.xe-inspector-field[data-field="hyperlink"] a');
    return {
      formula: field('formula'), cached: field('cached'), display: field('display'), comments: field('comments'),
      href: link?.href || '', target: link?.target || '', rel: link?.rel || '', referrerPolicy: link?.referrerPolicy || '',
      locked: !host.querySelector('.xe-cell[data-address="B2"]')?.isContentEditable,
      note: host.querySelector('.xe-fidelity-note')?.textContent || '',
    };
  });
  if (inspection.formula === '=SUM(A2:A3)' && inspection.cached === '3'
    && inspection.display === '3.00' && /Analyst: Stored result/.test(inspection.comments)) {
    pass('XLSX inspector distinguishes formula, cached value, display value, and comments');
  } else fail('XLSX formula inspector: ' + JSON.stringify(inspection));
  if (inspection.href === 'https://example.test/workbook-docs' && inspection.target === '_blank'
    && /noopener/.test(inspection.rel) && inspection.referrerPolicy === 'no-referrer' && inspection.locked) {
    pass('XLSX HTTP(S) hyperlink is explicit and formula cell starts locked');
  } else fail('XLSX safe hyperlink/lock: ' + JSON.stringify(inspection));
  if (/does not recalculate formulas/.test(inspection.note)) pass('XLSX keeps formula-cache limitations persistently visible');
  else fail('XLSX formula fidelity note missing: ' + inspection.note);
  if ((ctx.offOrigin?.length || 0) === offOriginStart) pass('XLSX hyperlink inspection performs no network fetch');
  else fail('XLSX hyperlink inspection made an off-origin request');

  await page.click('#previewHost .xe-panel:not([hidden]) .xe-cell[data-address="C2"]');
  const unsafeLink = await page.evaluate(() => ({
    anchors: document.querySelectorAll('#previewHost .xe-inspector-field[data-field="hyperlink"] a').length,
    text: document.querySelector('#previewHost .xe-inspector-field[data-field="hyperlink"]')?.textContent || '',
  }));
  if (unsafeLink.anchors === 0 && /javascript:alert/.test(unsafeLink.text) && /non-HTTP\(S\)/.test(unsafeLink.text)) {
    pass('XLSX non-HTTP(S) hyperlink target stays visible but inert');
  } else fail('XLSX unsafe hyperlink: ' + JSON.stringify(unsafeLink));

  await page.click('#previewHost .xe-panel:not([hidden]) .xe-cell[data-address="B2"]');
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id === 'moreMenu');
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    inspectorVisible: getComputedStyle(document.querySelector('#previewHost .xe-inspector')).display !== 'none',
    formula: document.querySelector('#previewHost .xe-inspector-field[data-field="formula"]')?.textContent || '',
  }));
  if (mobile.overflow <= 1 && mobile.inspectorVisible && /SUM\(A2:A3\)/.test(mobile.formula)) {
    pass('XLSX cell inspector remains visible without page overflow at 390px');
  } else fail('XLSX mobile inspector: ' + JSON.stringify(mobile));
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => !matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id !== 'moreMenu');

  await page.click('#previewHost .xe-formula-replace');
  await page.waitForSelector('#previewHost .xe-formula-dialog[open]');
  const confirmCopy = await page.$eval('#previewHost .xe-formula-dialog', (dialog) => dialog.textContent);
  if (/Replace formula/.test(confirmCopy) && /literal value/.test(confirmCopy) && /=SUM\(A2:A3\)/.test(confirmCopy)) {
    pass('XLSX formula replacement dialog explains the destructive change');
  } else fail('XLSX formula confirmation copy: ' + confirmCopy);
  await page.click('#previewHost .xe-formula-dialog button:has-text("Cancel")');
  await page.waitForFunction(() => !document.querySelector('#previewHost .xe-formula-dialog')?.open);
  const cancelled = await page.evaluate(() => ({
    editable: document.querySelector('#previewHost .xe-cell[data-address="B2"]')?.isContentEditable,
    downloadDisabled: document.querySelector('#previewHost .xe-download')?.disabled,
    warningHidden: document.querySelector('#previewHost .xe-formula-warning')?.hidden,
  }));
  if (!cancelled.editable && cancelled.downloadDisabled && cancelled.warningHidden) {
    pass('XLSX formula replacement cancel leaves formula locked and workbook clean');
  } else fail('XLSX cancelled formula state: ' + JSON.stringify(cancelled));

  await page.click('#previewHost .xe-formula-replace');
  await page.waitForSelector('#previewHost .xe-formula-dialog[open]');
  await page.click('#previewHost .xe-formula-dialog button:has-text("Replace formula")');
  await page.waitForFunction(() => document.querySelector('#previewHost .xe-cell[data-address="B2"]')?.isContentEditable);
  const accepted = await page.evaluate(() => ({
    warningHidden: document.querySelector('#previewHost .xe-formula-warning')?.hidden,
    warning: document.querySelector('#previewHost .xe-formula-warning')?.textContent || '',
  }));
  if (!accepted.warningHidden && /formulas removed/.test(accepted.warning)) {
    pass('XLSX formula replacement accept unlocks the cell with a persistent warning');
  } else fail('XLSX accepted formula warning: ' + JSON.stringify(accepted));
  await page.$eval('#previewHost .xe-cell[data-address="B2"]', (cell) => {
    cell.textContent = '42';
    cell.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => !document.querySelector('#previewHost .xe-download')?.disabled);
  const editInfo = await page.$eval('#previewHost .xe-info', (element) => element.textContent);
  if (/1 cell edited/.test(editInfo) && /hidden sheet/.test(editInfo) && /very hidden sheet/.test(editInfo)) {
    pass('XLSX edit status retains destructive edit and sheet-visibility context');
  } else fail('XLSX formula edit status: ' + editInfo);

  await page.click('#previewHost .xe-tab[data-visibility="1"]');
  const hiddenPanel = await page.evaluate(() => ({
    text: document.querySelector('#previewHost .xe-panel:not([hidden])')?.textContent || '',
    warningHidden: document.querySelector('#previewHost .xe-formula-warning')?.hidden,
  }));
  if (/Hidden payload/.test(hiddenPanel.text) && !hiddenPanel.warningHidden) pass('XLSX hidden sheet is inspectable and formula warning persists across tabs');
  else fail('XLSX hidden panel/warning: ' + JSON.stringify(hiddenPanel));
  await page.click('#previewHost .xe-tab[data-visibility="0"]');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 12000 }),
    page.click('#previewHost .xe-download'),
  ]);
  const editedBytes = new Uint8Array(readFileSync(await download.path()));
  const roundTrip = await page.evaluate((b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    const workbook = window.XLSX.read(bytes, { type: 'array', cellFormula: true, cellNF: true, cellStyles: true, cellText: true });
    const cell = workbook.Sheets['Visible Data'].B2;
    return {
      value: cell.v, type: cell.t, formula: cell.f || '', format: cell.z || '',
      comment: cell.c?.[0]?.t || '', link: cell.l?.Target || '',
      visibility: workbook.Workbook.Sheets.map((sheet) => sheet.Hidden || 0),
    };
  }, toBase64(editedBytes));
  if (roundTrip.value === 42 && roundTrip.type === 'n' && roundTrip.formula === ''
    && roundTrip.format === '0.00' && /Stored result/.test(roundTrip.comment)
    && roundTrip.link === 'https://example.test/workbook-docs' && roundTrip.visibility.join(',') === '0,1,2') {
    pass('XLSX edited copy removes only the formula and preserves cell metadata and sheet states');
  } else fail('XLSX fidelity round-trip: ' + JSON.stringify(roundTrip));
  const editedOracle = await inspectXlsxOoxml(editedBytes);
  if (!/<f>/.test(editedOracle.formulaCell) && /<v>42<\/v>/.test(editedOracle.formulaCell)
    && /Stored result/.test(editedOracle.commentsXml) && /workbook-docs/.test(editedOracle.sheetRelationships)
    && /state="veryHidden"/.test(editedOracle.workbookXml)) {
    pass('XLSX edited raw OOXML confirms literal replacement without collateral metadata loss');
  } else fail('XLSX edited OOXML oracle did not match the confirmed operation');
}
