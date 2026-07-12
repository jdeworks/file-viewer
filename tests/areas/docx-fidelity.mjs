import { readFileSync } from 'node:fs';
import { createDocxFidelityFixture, inspectDocxOoxml } from '../office-fidelity-fixtures.mjs';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openDocx(page, bytes, name) {
  const b64 = Buffer.from(bytes).toString('base64');
  await page.evaluate(({ data, filename, mime }) => {
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) array[index] = binary.charCodeAt(index);
    return window.__fv.openBlobFile(new Blob([array], { type: mime }), filename, { mime });
  }, { data: b64, filename: name, mime: DOCX_MIME });
}

export async function runDocxFidelity(ctx) {
  const { page, pass, fail } = ctx;
  const fixture = await createDocxFidelityFixture();
  const oracle = await inspectDocxOoxml(fixture);
  if (/Original review comment/.test(oracle.commentsXml) && /Original footnote detail/.test(oracle.footnotesXml)
    && /Original confidential header/.test(oracle.headerXml)) {
    pass('DOCX fixture raw OOXML independently proves comment, footnote, and header fidelity');
  } else fail('DOCX raw fixture oracle is missing fidelity-only parts');

  await openDocx(page, fixture, 'fidelity-original.docx');
  await page.waitForSelector('#previewHost .dx-view', { timeout: 15000 });
  const initial = await page.evaluate(() => ({
    warning: document.querySelector('#previewHost .dx-note')?.textContent || '',
    warningVisible: getComputedStyle(document.querySelector('#previewHost .dx-note')).display !== 'none',
    originalDisabled: document.querySelector('#previewHost .dx-download-original')?.disabled,
    rebuiltDisabled: document.querySelector('#previewHost .dx-download-rebuilt')?.disabled,
    info: document.querySelector('#previewHost .dx-info')?.textContent || '',
  }));
  if (initial.warningVisible && /headers\/footers/.test(initial.warning) && /comments/.test(initial.warning)
    && /Download original/.test(initial.warning) && !initial.originalDisabled && initial.rebuiltDisabled
    && /unchanged/.test(initial.info)) {
    pass('DOCX persistently distinguishes exact original from disabled rebuilt copy');
  } else fail('DOCX initial fidelity state: ' + JSON.stringify(initial));

  await page.evaluate(() => {
    window.__docxCreateObjectURL = URL.createObjectURL;
    window.__docxCapturedBlob = null;
    URL.createObjectURL = function captureDocxBlob(blob) {
      window.__docxCapturedBlob = blob;
      return window.__docxCreateObjectURL.call(URL, blob);
    };
  });
  const [originalDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#previewHost .dx-download-original'),
  ]);
  const capturedOriginalMime = await page.evaluate(() => {
    const type = window.__docxCapturedBlob?.type || '';
    URL.createObjectURL = window.__docxCreateObjectURL;
    delete window.__docxCreateObjectURL;
    delete window.__docxCapturedBlob;
    return type;
  });
  const originalBytes = new Uint8Array(readFileSync(await originalDownload.path()));
  if (originalDownload.suggestedFilename() === 'fidelity-original.docx'
    && capturedOriginalMime === DOCX_MIME && Buffer.compare(Buffer.from(originalBytes), Buffer.from(fixture)) === 0) {
    pass('DOCX original download preserves exact bytes, filename, and MIME');
  } else fail('DOCX original download changed bytes/name/MIME');

  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id === 'moreMenu');
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    warningVisible: getComputedStyle(document.querySelector('#previewHost .dx-note')).display !== 'none',
    buttons: [...document.querySelectorAll('#previewHost .dx-bar button')].every((button) => button.getBoundingClientRect().right <= innerWidth + 1),
  }));
  if (mobile.overflow <= 1 && mobile.warningVisible && mobile.buttons) pass('DOCX fidelity controls remain visible without page overflow at 390px');
  else fail('DOCX mobile fidelity layout: ' + JSON.stringify(mobile));
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => !matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id !== 'moreMenu');

  await page.click('#previewHost .dx-edit');
  await page.waitForSelector('#previewHost .dx-edit-host .ProseMirror', { timeout: 12000 });
  await page.waitForFunction(() => document.querySelector('#previewHost .dx-edit')?.classList.contains('active')
    && /Editing/.test(document.querySelector('#previewHost .dx-info')?.textContent || ''));
  if (await page.$eval('#previewHost .dx-download-rebuilt', (button) => button.disabled)) {
    pass('DOCX entering Edit without a content change keeps rebuilt export disabled');
  } else fail('DOCX rebuilt export enabled merely by entering Edit');
  await page.$eval('#previewHost .ProseMirror', (editor) => editor.focus());
  await page.keyboard.type(' NET_EDIT');
  await page.waitForFunction(() => !document.querySelector('#previewHost .dx-download-rebuilt')?.disabled);
  pass('DOCX real edit enables rebuilt export');
  for (let index = 0; index < ' NET_EDIT'.length; index++) await page.keyboard.press('Backspace');
  await page.waitForFunction(() => document.querySelector('#previewHost .dx-download-rebuilt')?.disabled);
  const reverted = await page.$eval('#previewHost .ProseMirror', (editor) => editor.textContent);
  if (!reverted.includes('NET_EDIT')) pass('DOCX editing back to the normalized baseline disables rebuilt export');
  else fail('DOCX net-dirty revert retained edit: ' + reverted.slice(-80));
  await page.keyboard.type(' NET_EDIT');
  await page.waitForFunction(() => !document.querySelector('#previewHost .dx-download-rebuilt')?.disabled);
  await page.click('#previewHost .dx-edit');
  const [rebuiltDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#previewHost .dx-download-rebuilt'),
  ]);
  const rebuiltBytes = new Uint8Array(readFileSync(await rebuiltDownload.path()));
  const rebuiltOracle = await inspectDocxOoxml(rebuiltBytes);
  if (rebuiltDownload.suggestedFilename() === 'fidelity-original-rebuilt.docx'
    && /NET_EDIT/.test(rebuiltOracle.documentXml)
    && !rebuiltOracle.files.includes('word/comments.xml')
    && !rebuiltOracle.files.includes('word/footnotes.xml')
    && !rebuiltOracle.files.includes('word/header1.xml')) {
    pass('DOCX rebuilt copy carries edits and honestly omits unsupported original-only parts');
  } else fail('DOCX rebuilt OOXML fidelity: ' + JSON.stringify(rebuiltOracle.files));

  // Deterministic lazy-import race: navigate away while TipTap is paused immediately before mount.
  await openDocx(page, fixture, 'lazy-editor.docx');
  await page.waitForSelector('#previewHost .dx-edit');
  await page.evaluate(() => {
    window.__docxHookReached = false;
    window.__docxMountSkipped = false;
    window.__releaseDocxMount = null;
    window.__fvDocxEditorTestHook = ({ stage }) => {
      if (stage === 'before-tiptap-mount') {
        window.__docxHookReached = true;
        return new Promise((resolve) => { window.__releaseDocxMount = resolve; });
      }
      if (stage === 'tiptap-mount-skipped') window.__docxMountSkipped = true;
      return undefined;
    };
  });
  await page.click('#previewHost .dx-edit');
  await page.waitForFunction(() => window.__docxHookReached === true);
  await page.evaluate(() => window.__fv.openBlobFile(
    new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'after-docx.csv', { mime: 'text/csv' },
  ));
  await page.waitForSelector('#previewHost .csv-doc', { timeout: 10000 });
  await page.evaluate(() => window.__releaseDocxMount?.());
  await page.waitForFunction(() => window.__docxMountSkipped === true);
  const stale = await page.evaluate(() => {
    window.__fvDocxEditorTestHook = null;
    return {
      type: window.__fv.state.type?.id,
      filename: window.__fv.state.intake?.filename,
      staleEditors: document.querySelectorAll('.dx-doc .ProseMirror').length,
    };
  });
  if (stale.type === 'csv' && stale.filename === 'after-docx.csv' && stale.staleEditors === 0) {
    pass('DOCX lazy TipTap completion cannot mount after navigation');
  } else fail('DOCX stale TipTap state: ' + JSON.stringify(stale));
}
