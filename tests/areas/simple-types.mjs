export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── vCard (.vcf) ── parse contacts into cards (name, email, phone). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.vcf');
  const vcfframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const vcff = await frameOf('iframe.fv-preview-frame');
  await vcff.waitForSelector('.vcf-card', { timeout: 8000 });
  const vcfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (vcfTypeId === 'vcard') pass('.vcf detected as Contacts (vCard)'); else fail('vcard type: ' + vcfTypeId);
  const vcfNames = await vcff.$$eval('.vcf-card .vcf-name', (els) => els.map((e) => e.textContent));
  const mailto = await vcff.$$eval('.vcf-card a[href^="mailto:"]', (els) => els.map((a) => a.getAttribute('href')));
  if (vcfNames.length === 2 && vcfNames.includes('Ada Lovelace') && mailto.some((h) => /ada@example\.com/.test(h))) pass('vCard contacts parsed (2 cards, mailto links)'); else fail('vcard names=' + vcfNames.join(',') + ' mailto=' + mailto.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const vcfMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Organizations\s*2/.test(vcfMeta) && /URLs\s*1/.test(vcfMeta)) pass('vCard metadata includes organizations and URLs'); else fail('vcard meta: ' + vcfMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  // vCard → CSV export (contacts to a spreadsheet).
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const vcfExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (vcfExports.includes('Download contacts as CSV')) pass('vCard export offers contacts CSV'); else fail('vcf exports: ' + vcfExports.join(','));
  const [vcfDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download contacts as CSV")'),
  ]);
  if (/\.csv$/.test(vcfDl.suggestedFilename())) pass('vCard → CSV download (' + vcfDl.suggestedFilename() + ')'); else fail('vcf→csv: ' + vcfDl.suggestedFilename());

  // ── Subtitles (.srt/.vtt) ── parse cues into a timecoded list. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.srt');
  const subframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const subf = await frameOf('iframe.fv-preview-frame');
  await subf.waitForSelector('.sub-cue', { timeout: 8000 });
  const subTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (subTypeId === 'subtitle') pass('.srt detected as Subtitles'); else fail('subtitle type: ' + subTypeId);
  const cueCount = await subf.$$eval('.sub-cue', (els) => els.length);
  const firstTime = await subf.$eval('.sub-cue .sub-time', (e) => e.textContent);
  if (cueCount === 3 && /0:01\s*→\s*0:04/.test(firstTime)) pass('subtitle cues parsed with timecodes (' + cueCount + ' cues)'); else fail('subtitle cues=' + cueCount + ' first=' + firstTime);
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const subMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/First cue\s*0:01/.test(subMeta) && /Spoken time/.test(subMeta)) pass('subtitle metadata includes first cue and spoken time'); else fail('subtitle meta: ' + subMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── GeoJSON map ── pure inline SVG, no tiles (zero network). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.geojson');
  const geoframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const geof = await frameOf('iframe.fv-preview-frame');
  await geof.waitForSelector('.geo-svg', { timeout: 8000 });
  const geoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (geoTypeId === 'geo') pass('.geojson detected as Map (GeoJSON/GPX)'); else fail('geo type: ' + geoTypeId);
  const geoLines = await geof.$$eval('.geo-svg .geo-line', (els) => els.length);
  const geoPolys = await geof.$$eval('.geo-svg .geo-poly', (els) => els.length);
  const geoPts = await geof.$$eval('.geo-svg .geo-pt', (els) => els.length);
  if (geoLines >= 1 && geoPolys >= 1 && geoPts >= 2) pass('GeoJSON drawn as SVG (' + geoLines + ' line, ' + geoPolys + ' polygon, ' + geoPts + ' points)'); else fail('geo svg: line=' + geoLines + ' poly=' + geoPolys + ' pt=' + geoPts);
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const geoMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*GeoJSON/.test(geoMeta) && /Bounds/.test(geoMeta)) pass('geo metadata includes format and bounds'); else fail('geo meta: ' + geoMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  // GeoJSON → GPX export.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const geoExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (geoExports.includes('Download as GPX')) pass('GeoJSON export offers GPX'); else fail('geo exports: ' + geoExports.join(','));
  const [gpxDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as GPX")'),
  ]);
  if (/\.gpx$/.test(gpxDl.suggestedFilename())) pass('GeoJSON → GPX download (' + gpxDl.suggestedFilename() + ')'); else fail('geo→gpx: ' + gpxDl.suggestedFilename());

  // ── ID3 metadata ── an MP3's tags surface in the info drawer. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.mp3');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.click('#metaBtn');
  await page.waitForSelector('#metaDrawer:not([hidden]) #metaBody', { timeout: 6000 });
  await page.waitForFunction(() => /Demo Artist/.test(document.querySelector('#metaBody')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const metaText = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Demo Artist/.test(metaText) && /Demo Track/.test(metaText)) pass('ID3 tags surfaced in metadata (artist + title)'); else fail('id3 meta: ' + metaText.replace(/\s+/g, ' ').slice(0, 100));
  await page.click('#metaDrawer [data-close]').catch(() => {});

  // ── Font specimen ── load the font via FontFace + render sample text in the parent pane. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.ttf');
  await page.waitForSelector('#previewHost .font-doc', { timeout: 12000 });
  const fontTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fontTypeId === 'font') pass('.ttf detected as Font'); else fail('font type: ' + fontTypeId);
  const fontSamples = await page.$$eval('#previewHost .font-sample', (els) => els.length);
  const fontLoaded = await page.evaluate(() => [...document.fonts].some((f) => /^fvfont-/.test(f.family) && f.status === 'loaded'));
  if (fontSamples >= 6 && fontLoaded) pass('font specimen rendered + FontFace loaded (' + fontSamples + ' samples)'); else fail('font: samples=' + fontSamples + ' loaded=' + fontLoaded);

  // ── URL Inspector ── detect + render a .url file. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  // Use __fv.openViewerFile to open the sample.url example directly
  await page.evaluate(async () => { await window.__fv.openViewerFile('/docs/examples/sample.url'); });
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const urlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (urlTypeId === 'url') pass('.url file detected as URL Inspector'); else fail('url type: ' + urlTypeId);
  const urlf = await frameOf('iframe.fv-preview-frame');
  await urlf.waitForSelector('.ui-table', { timeout: 8000 });
  const urlScheme = await urlf.$eval('.ui-table', (e) => e.textContent);
  if (/https/.test(urlScheme) && /api\.example\.com/.test(urlScheme)) pass('URL inspector renders scheme + host'); else fail('url render: ' + urlScheme.slice(0, 120));

  // ── ASCII / ANSI art ── ANSI SGR colors + SAUCE metadata, no external deps. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const sauce = (() => {
      const chars = Array(128).fill(' ');
      const put = (off, s, len) => [...s.padEnd(len, ' ').slice(0, len)].forEach((ch, i) => { chars[off + i] = ch; });
      put(0, 'SAUCE00', 7);
      put(7, 'ANSI Sample', 35);
      put(42, 'The Archivist', 20);
      put(62, 'jdeworks', 20);
      put(82, '20260617', 8);
      return chars.join('');
    })();
    const text = [
      '\x1b[38;5;196mRED\x1b[0m \x1b[48;2;0;64;128mTRUECOLOR BG\x1b[0m',
      '╔════════════════════════════════════════╗',
      '║              ASCII VIEWER              ║',
      '╚════════════════════════════════════════╝',
    ].join('\n') + '\x1a' + sauce;
    window.__fv.state._skipDiscardGuard = true;
    await window.__fv.loadFolder([{ file: new File([text], 'art.ans', { type: 'text/plain' }), path: 'art.ans' }]);
  });
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ansiTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ansiTypeId === 'asciiart') pass('.ans detected as ASCII / ANSI Art'); else fail('ansi type: ' + ansiTypeId);
  const ansif = await frameOf('iframe.fv-preview-frame');
  await ansif.waitForSelector('.aa-pre span[style*="color:#ff0000"]', { timeout: 8000 });
  const ansiHeader = await ansif.$eval('.aa-sauce', (e) => e.textContent);
  const copyText = await ansif.$eval('.aa-copy', (e) => e.textContent);
  if (/ANSI Sample/.test(ansiHeader) && /The Archivist/.test(ansiHeader) && copyText === 'Copy')
    pass('ANSI preview renders SAUCE header + Copy button');
  else fail('ansi header=' + ansiHeader + ' copy=' + copyText);
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const ansiMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/ANSI color sequences\s*yes/.test(ansiMeta) && /Line count/.test(ansiMeta) && /Character count/.test(ansiMeta) && /SAUCE title\s*ANSI Sample/.test(ansiMeta))
    pass('ANSI metadata includes dimensions, color count, chars, and SAUCE fields');
  else fail('ansi meta: ' + ansiMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');
}
