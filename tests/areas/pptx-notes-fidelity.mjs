import { createPptxNotesFixture, inspectPptxOoxml } from '../office-fidelity-fixtures.mjs';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function runPptxNotesFidelity(ctx) {
  const { page, pass, fail } = ctx;
  const offOriginStart = ctx.offOrigin?.length || 0;
  const fixture = await createPptxNotesFixture();
  const oracle = await inspectPptxOoxml(fixture);
  const order = [...oracle.presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((match) => match[1]);
  if (order.join(',') === 'rId3,rId2'
    && /rId3[^>]*slides\/slide2\.xml/.test(oracle.presentationRelationshipsXml)
    && /notesSlide2\.xml/.test(oracle.slide2RelationshipsXml)) {
    pass('PPTX fixture raw OOXML independently proves reordered slide-to-notes relationships');
  } else fail('PPTX raw relationship oracle: ' + JSON.stringify(order));

  const b64 = Buffer.from(fixture).toString('base64');
  await page.evaluate(({ data, mime }) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return window.__fv.openBlobFile(new Blob([bytes], { type: mime }), 'reordered-notes.pptx', { mime });
  }, { data: b64, mime: PPTX_MIME });
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .pptx-slide').length === 2
    && document.querySelectorAll('#previewHost .pptx-notes-card').length === 2, null, { timeout: 30000 });
  const cards = await page.$$eval('#previewHost .pptx-notes-card', (elements) => elements.map((card) => ({
    slide: card.dataset.slideNumber,
    headline: card.querySelector('.pptx-notes-headline')?.textContent || '',
    count: card.querySelector('.pptx-notes-count')?.textContent || '',
  })));
  if (cards[0]?.slide === '1' && cards[0].headline === 'Presented first headline' && cards[0].count === '2 paragraphs'
    && cards[1]?.slide === '2' && cards[1].headline === 'Presented second headline' && cards[1].count === '3 paragraphs') {
    pass('PPTX speaker-note headlines and paragraph counts follow presentation order');
  } else fail('PPTX notes cards: ' + JSON.stringify(cards));
  const status = await page.$eval('#previewHost .pptx-notes-status', (element) => element.textContent);
  if (/2 slides with speaker notes/.test(status)) pass('PPTX toolbar reports notes-bearing slide count');
  else fail('PPTX notes status: ' + status);

  await page.click('#previewHost .pptx-notes-card[data-slide-number="1"] summary');
  const renderedNotes = await page.evaluate(() => {
    const host = document.querySelector('#previewHost');
    return {
      text: [...host.querySelectorAll('.pptx-notes-body')].map((body) => body.textContent).join('\n'),
      injectedNodes: host.querySelectorAll('.pptx-notes-body img,.pptx-notes-body script,.pptx-notes-body iframe').length,
    };
  });
  if (/Presented first detail <img src=x onerror=alert\(1\)>/.test(renderedNotes.text)
    && /Additional speaker cue/.test(renderedNotes.text) && renderedNotes.injectedNodes === 0) {
    pass('PPTX note content renders as inert text while preserving full speaker cues');
  } else fail('PPTX rendered note text: ' + JSON.stringify(renderedNotes));
  for (const excluded of ['EXCLUDED IMAGE PLACEHOLDER', 'EXCLUDED HEADER', 'EXCLUDED FOOTER', 'EXCLUDED DATE', '999']) {
    if (renderedNotes.text.includes(excluded)) fail('PPTX notes leaked placeholder text: ' + excluded);
  }
  if (!['EXCLUDED IMAGE PLACEHOLDER', 'EXCLUDED HEADER', 'EXCLUDED FOOTER', 'EXCLUDED DATE', '999']
    .some((excluded) => renderedNotes.text.includes(excluded))) pass('PPTX notes exclude image/header/footer/date/slide-number placeholders');

  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id === 'moreMenu');
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    visibleCards: [...document.querySelectorAll('#previewHost .pptx-notes-card')]
      .filter((card) => card.getClientRects().length > 0).length,
    headlineWrap: getComputedStyle(document.querySelector('#previewHost .pptx-notes-headline')).whiteSpace,
  }));
  if (mobile.overflow <= 1 && mobile.visibleCards === 2 && mobile.headlineWrap === 'normal') {
    pass('PPTX speaker-note summaries remain visible without page overflow at 390px');
  } else fail('PPTX mobile notes layout: ' + JSON.stringify(mobile));
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => !matchMedia('(max-width: 760px)').matches
    && document.getElementById('exportBtn')?.parentElement?.id !== 'moreMenu');

  if ((ctx.offOrigin?.length || 0) === offOriginStart) pass('PPTX note extraction makes zero off-origin requests');
  else fail('PPTX note extraction made an off-origin request');
}
