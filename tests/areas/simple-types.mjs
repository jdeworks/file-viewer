export async function run(ctx) {
  const { page, origin, frameOf, pass, fail } = ctx;

  // ── vCard (.vcf) ── parse contacts into cards (name, email, phone). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.vcf' }).click();
  const vcfframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const vcff = await frameOf('iframe.fv-preview-frame');
  await vcff.waitForSelector('.vcf-card', { timeout: 8000 });
  const vcfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (vcfTypeId === 'vcard') pass('.vcf detected as Contacts (vCard)'); else fail('vcard type: ' + vcfTypeId);
  const vcfNames = await vcff.$$eval('.vcf-card .vcf-name', (els) => els.map((e) => e.textContent));
  const mailto = await vcff.$$eval('.vcf-card a[href^="mailto:"]', (els) => els.map((a) => a.getAttribute('href')));
  if (vcfNames.length === 2 && vcfNames.includes('Ada Lovelace') && mailto.some((h) => /ada@example\.com/.test(h))) pass('vCard contacts parsed (2 cards, mailto links)'); else fail('vcard names=' + vcfNames.join(',') + ' mailto=' + mailto.join(','));
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
  await page.getByRole('button', { name: 'Sample.srt' }).click();
  const subframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const subf = await frameOf('iframe.fv-preview-frame');
  await subf.waitForSelector('.sub-cue', { timeout: 8000 });
  const subTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (subTypeId === 'subtitle') pass('.srt detected as Subtitles'); else fail('subtitle type: ' + subTypeId);
  const cueCount = await subf.$$eval('.sub-cue', (els) => els.length);
  const firstTime = await subf.$eval('.sub-cue .sub-time', (e) => e.textContent);
  if (cueCount === 3 && /0:01\s*→\s*0:04/.test(firstTime)) pass('subtitle cues parsed with timecodes (' + cueCount + ' cues)'); else fail('subtitle cues=' + cueCount + ' first=' + firstTime);

  // ── GeoJSON map ── pure inline SVG, no tiles (zero network). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.geojson' }).click();
  const geoframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const geof = await frameOf('iframe.fv-preview-frame');
  await geof.waitForSelector('.geo-svg', { timeout: 8000 });
  const geoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (geoTypeId === 'geo') pass('.geojson detected as Map (GeoJSON/GPX)'); else fail('geo type: ' + geoTypeId);
  const geoLines = await geof.$$eval('.geo-svg .geo-line', (els) => els.length);
  const geoPolys = await geof.$$eval('.geo-svg .geo-poly', (els) => els.length);
  const geoPts = await geof.$$eval('.geo-svg .geo-pt', (els) => els.length);
  if (geoLines >= 1 && geoPolys >= 1 && geoPts >= 2) pass('GeoJSON drawn as SVG (' + geoLines + ' line, ' + geoPolys + ' polygon, ' + geoPts + ' points)'); else fail('geo svg: line=' + geoLines + ' poly=' + geoPolys + ' pt=' + geoPts);
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
  await page.getByRole('button', { name: 'Sample.mp3' }).click();
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.click('#metaBtn');
  await page.waitForSelector('#metaDrawer:not([hidden]) #metaBody', { timeout: 6000 });
  await page.waitForFunction(() => /Demo Artist/.test(document.querySelector('#metaBody')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const metaText = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Demo Artist/.test(metaText) && /Demo Track/.test(metaText)) pass('ID3 tags surfaced in metadata (artist + title)'); else fail('id3 meta: ' + metaText.replace(/\s+/g, ' ').slice(0, 100));
  await page.click('#metaDrawer [data-close]').catch(() => {});

  // ── Font specimen ── load the font via FontFace + render sample text in the parent pane. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ttf' }).click();
  await page.waitForSelector('#previewHost .font-doc', { timeout: 12000 });
  const fontTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fontTypeId === 'font') pass('.ttf detected as Font'); else fail('font type: ' + fontTypeId);
  const fontSamples = await page.$$eval('#previewHost .font-sample', (els) => els.length);
  const fontLoaded = await page.evaluate(() => [...document.fonts].some((f) => /^fvfont-/.test(f.family) && f.status === 'loaded'));
  if (fontSamples >= 6 && fontLoaded) pass('font specimen rendered + FontFace loaded (' + fontSamples + ' samples)'); else fail('font: samples=' + fontSamples + ' loaded=' + fontLoaded);
}
