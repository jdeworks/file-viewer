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

  // ── GPX track viewer ── canvas map, elevation profile, stats, metadata, and GeoJSON export. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.gpx');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const gpxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (gpxTypeId === 'geo') pass('.gpx detected as Map (GeoJSON/GPX)'); else fail('gpx type: ' + gpxTypeId);
  const gpxf = await frameOf('iframe.fv-preview-frame');
  await gpxf.waitForSelector('.gpx-doc canvas.gpx-map', { timeout: 8000 });
  await gpxf.waitForSelector('.gpx-doc canvas.gpx-elevation', { timeout: 8000 });
  await page.waitForTimeout(250);
  const gpxCanvasPainted = await gpxf.$eval('canvas.gpx-map', (c) => {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] && (data[i] < 230 || data[i + 1] < 230 || data[i + 2] < 230)) painted++;
    return painted;
  });
  if (gpxCanvasPainted > 100) pass('GPX map canvas painted track (' + gpxCanvasPainted + ' pixels)'); else fail('gpx map painted=' + gpxCanvasPainted);
  const gpxStats = await gpxf.$eval('.gpx-stats', (e) => e.textContent);
  if (/Distance/.test(gpxStats) && /Elevation gain/.test(gpxStats) && /Duration\s*15 min/.test(gpxStats) && /Trackpoints\s*4/.test(gpxStats) && /Waypoints\s*2/.test(gpxStats))
    pass('GPX stats include distance, gain/loss, duration, trackpoints, waypoints');
  else fail('gpx stats: ' + gpxStats.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const gpxMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*GPX/.test(gpxMeta) && /Track name\s*Morning Loop/.test(gpxMeta) && /Creator\s*file-viewer/.test(gpxMeta) && /Distance/.test(gpxMeta) && /Elevation gain/.test(gpxMeta) && /Duration\s*15 min/.test(gpxMeta))
    pass('GPX metadata includes track name, creator, stats, and bounds');
  else fail('gpx meta: ' + gpxMeta.replace(/\s+/g, ' ').slice(0, 200));
  await page.click('#metaDrawer [data-close]');
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const gpxExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (gpxExports.includes('Download as GeoJSON')) pass('GPX export offers GeoJSON'); else fail('gpx exports: ' + gpxExports.join(','));
  const [geojsonDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as GeoJSON")'),
  ]);
  if (/\.geojson$/.test(geojsonDl.suggestedFilename())) pass('GPX → GeoJSON download (' + geojsonDl.suggestedFilename() + ')'); else fail('gpx→geojson: ' + geojsonDl.suggestedFilename());

  // ── Ableton Live Set (.als) ── gzip XML decoded to project summary. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.als');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const alsTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (alsTypeId === 'als') pass('.als detected as Ableton Live Set'); else fail('als type: ' + alsTypeId);
  const alsf = await frameOf('iframe.fv-preview-frame');
  await alsf.waitForSelector('.als-doc .als-track', { timeout: 8000 });
  const alsText = await alsf.$eval('.als-doc', (e) => e.textContent);
  if (/128/.test(alsText) && /4\/4/.test(alsText) && /Drums/.test(alsText) && /Lead Synth/.test(alsText) && /Main Theme/.test(alsText) && /Wavetable/.test(alsText))
    pass('Ableton set renders BPM, time signature, tracks, clips, and plugins');
  else fail('als render: ' + alsText.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const alsMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/BPM\s*128/.test(alsMeta) && /Time signature\s*4\/4/.test(alsMeta) && /Audio tracks\s*1/.test(alsMeta) && /MIDI tracks\s*1/.test(alsMeta) && /Return tracks\s*1/.test(alsMeta) && /Clips\s*3/.test(alsMeta) && /Plugins\s*Drum Buss, Wavetable/.test(alsMeta))
    pass('Ableton metadata includes tempo, track counts, clips, and plugins');
  else fail('als meta: ' + alsMeta.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaDrawer [data-close]');

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
  const rawIsCode = await urlf.$eval('.ui-raw-box', (e) => e.tagName);
  if (/https/.test(urlScheme) && /api\.example\.com/.test(urlScheme) && rawIsCode === 'CODE') pass('URL inspector renders raw code block, scheme + host'); else fail('url render: ' + urlScheme.slice(0, 120) + ' raw=' + rawIsCode);

  const openTextFile = async (name, text) => {
    await page.evaluate(async ({ name, text }) => {
      window.__fv.state._skipDiscardGuard = true;
      await window.__fv.loadFolder([{ file: new File([text], name, { type: 'text/plain' }), path: name }]);
    }, { name, text });
    await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
    const typeId = await page.$eval('#typeSelect', (s) => s.value);
    if (typeId !== 'url') fail(name + ' type: ' + typeId);
    return frameOf('iframe.fv-preview-frame');
  };

  const mailFrame = await openTextFile('mailto.url', 'mailto:ada@example.com?subject=Hello%20Ada&cc=grace@example.com&body=Line%201%0ALine%202');
  await mailFrame.waitForSelector('.ui-table', { timeout: 8000 });
  const mailText = await mailFrame.$eval('.ui-table', (e) => e.textContent);
  if (/mailto: address/.test(mailText) && /ada@example\.com/.test(mailText) && /Hello Ada/.test(mailText) && /Line 1/.test(mailText))
    pass('URL inspector renders mailto fields');
  else fail('mailto render: ' + mailText.replace(/\s+/g, ' ').slice(0, 160));

  const dataFrame = await openTextFile('data.url', 'data:text/plain,Hello%20offline%20URL');
  const dataText = await dataFrame.$eval('.ui-table', (e) => e.textContent);
  if (/data: URI/.test(dataText) && /text\/plain/.test(dataText) && /Hello offline URL/.test(dataText))
    pass('URL inspector decodes data:text URIs');
  else fail('data uri render: ' + dataText.replace(/\s+/g, ' ').slice(0, 160));

  const jwt = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.sig';
  const oauthFrame = await openTextFile('oauth.url', 'https://example.com/callback?code=abc123&state=%7B%22csrf%22%3Atrue%7D&id_token=' + jwt + '#done');
  await oauthFrame.waitForSelector('.ui-badge-jwt', { timeout: 8000 });
  const oauthText = await oauthFrame.$eval('body', (e) => e.textContent);
  if (/OAuth/.test(oauthText) && /JWT/.test(oauthText) && /URL-decoded/.test(oauthText) && /Pretty-print JSON/.test(oauthText) && /Payload/.test(oauthText) && /done/.test(oauthText))
    pass('URL inspector highlights OAuth, JWT, decoded JSON, and fragment');
  else fail('oauth url render: ' + oauthText.replace(/\s+/g, ' ').slice(0, 220));

  const multiFrame = await openTextFile('links.url', [
    'https://one.example/a?x=1',
    'https://two.example/b?y=2',
    'https://three.example/c?z=3',
  ].join('\n'));
  const multiCount = await multiFrame.$$eval('.ui-url-item', (els) => els.length);
  const multiRows = await multiFrame.$$eval('.ui-table tbody tr', (els) => els.length);
  if (multiCount === 3 && multiRows >= 4) pass('URL inspector lists multiple URLs in table + expandable details'); else fail('multi-url count=' + multiCount + ' rows=' + multiRows);

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

  // ── JSONL / NDJSON viewer ── summary card + table columns. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.jsonl');
  const jsonlFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const jsonlf = await frameOf('iframe.fv-preview-frame');
  await jsonlf.waitForSelector('.jsonl-preview', { timeout: 8000 });
  const jsonlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (jsonlTypeId === 'jsonl') pass('sample.jsonl detected as JSON Lines'); else fail('jsonl type: ' + jsonlTypeId);
  const jsonlSummary = await jsonlf.$eval('.jsonl-summary', (e) => e.textContent);
  if (/5\s*records/.test(jsonlSummary) && /lines/.test(jsonlSummary)) pass('JSONL summary card shows record and line counts'); else fail('jsonl summary: ' + jsonlSummary.replace(/\s+/g, ' ').slice(0, 100));
  const jsonlCols = await jsonlf.$$eval('.jsonl-table th', (ths) => ths.map((th) => th.textContent));
  if (jsonlCols.includes('timestamp') && jsonlCols.includes('level') && jsonlCols.includes('message')) pass('JSONL table shows shared schema columns'); else fail('jsonl cols: ' + jsonlCols.join(','));

  // ── Bioinformatics viewer (FASTA / VCF) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample gene sequences (FASTA)');
  const fastaf = await frameOf('iframe.fv-preview-frame');
  await fastaf.waitForSelector('.bio-preview', { timeout: 8000 });
  const fastaTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fastaTypeId === 'bio') pass('sample.fasta detected as bioinformatics type'); else fail('bio fasta type: ' + fastaTypeId);
  const fastaBadge = await fastaf.$eval('.bio-badge', (e) => e.textContent);
  const fastaRows = await fastaf.$$('.bio-seq-row');
  if (fastaBadge === 'FASTA' && fastaRows.length >= 3) pass('FASTA sequences listed with FASTA badge'); else fail('fasta badge=' + fastaBadge + ' rows=' + fastaRows.length);
  const fastaStats = await fastaf.$eval('.bio-header', (e) => e.textContent);
  if (/3\s*sequences/i.test(fastaStats)) pass('FASTA sequence count shown in header'); else fail('fasta stats: ' + fastaStats.replace(/\s+/g, ' ').slice(0, 80));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample variants (VCF)');
  const vcff2 = await frameOf('iframe.fv-preview-frame');
  await vcff2.waitForSelector('.bio-preview', { timeout: 8000 });
  const vcfTypeId2 = await page.$eval('#typeSelect', (s) => s.value);
  if (vcfTypeId2 === 'bio') pass('sample-variants.vcf detected as bioinformatics type'); else fail('bio vcf type: ' + vcfTypeId2);
  const vcfBadge = await vcff2.$eval('.bio-badge', (e) => e.textContent);
  const vcfVarRows = await vcff2.$$('.bio-table tbody tr');
  if (vcfBadge === 'VCF' && vcfVarRows.length >= 5) pass('VCF variants table shown with VCF badge'); else fail('vcf badge=' + vcfBadge + ' rows=' + vcfVarRows.length);

  // ── MusicXML music notation viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Ode to Joy Theme (MusicXML)');
  const mxmlf = await frameOf('iframe.fv-preview-frame');
  await mxmlf.waitForSelector('.mxml-preview', { timeout: 8000 });
  const mxmlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mxmlTypeId === 'musicxml') pass('sample.musicxml detected as MusicXML Score'); else fail('musicxml type: ' + mxmlTypeId);
  const mxmlTitle = await mxmlf.$eval('.mxml-title', (e) => e.textContent);
  const mxmlComposer = await mxmlf.$eval('.mxml-composer', (e) => e.textContent);
  if (/Ode to Joy/i.test(mxmlTitle) && /Beethoven/i.test(mxmlComposer)) pass('MusicXML score header shows title and composer'); else fail('mxml header: ' + mxmlTitle + ' / ' + mxmlComposer);
  const mxmlParts = await mxmlf.$$eval('.mxml-part-chip', (els) => els.map((e) => e.textContent));
  if (mxmlParts.length >= 2 && mxmlParts.some((p) => /violin/i.test(p)) && mxmlParts.some((p) => /piano/i.test(p))) pass('MusicXML instrumentation list shows parts'); else fail('mxml parts: ' + mxmlParts.join(', '));

  // ── OFX / QFX financial viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.ofx');
  const ofxf = await frameOf('iframe.fv-preview-frame');
  await ofxf.waitForSelector('.ofx-preview', { timeout: 8000 });
  const ofxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ofxTypeId === 'ofx') pass('sample.ofx detected as OFX / QFX Financial'); else fail('ofx type: ' + ofxTypeId);
  const ofxAcct = await ofxf.$eval('.ofx-acct', (e) => e.textContent);
  if (/\*{4}\d{4}/.test(ofxAcct) && /CHECKING/i.test(ofxAcct)) pass('OFX account card shows masked account number and type'); else fail('ofx acct: ' + ofxAcct.replace(/\s+/g, ' ').slice(0, 100));
  const ofxRows = await ofxf.$$eval('.ofx-table tbody tr', (els) => els.length);
  if (ofxRows >= 4) pass('OFX transaction table shows expected rows'); else fail('ofx txn rows: ' + ofxRows);
}
