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
  await page.waitForFunction(() => /Demo Artist/.test(document.querySelector('#metaBody')?.textContent || ''), null, { timeout: 6000 }).catch(() => {});
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
  await page.waitForSelector('#previewHost .mxml-preview', { timeout: 12000 });
  const mxmlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mxmlTypeId === 'musicxml') pass('sample.musicxml detected as MusicXML Score'); else fail('musicxml type: ' + mxmlTypeId);
  const mxmlTitle = await page.$eval('#previewHost .mxml-title', (e) => e.textContent);
  const mxmlComposer = await page.$eval('#previewHost .mxml-composer', (e) => e.textContent);
  if (/Ode to Joy/i.test(mxmlTitle) && /Beethoven/i.test(mxmlComposer)) pass('MusicXML score header shows title and composer'); else fail('mxml header: ' + mxmlTitle + ' / ' + mxmlComposer);
  const mxmlTreeNodes = await page.$$eval('#previewHost .mxml-tree .mxml-node-label', (els) => els.map((e) => e.textContent));
  if (mxmlTreeNodes.length >= 2 && mxmlTreeNodes.some((p) => /violin/i.test(p)) && mxmlTreeNodes.some((p) => /piano/i.test(p))) pass('MusicXML instrumentation list shows parts'); else fail('mxml parts: ' + mxmlTreeNodes.join(', '));

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

  // ── KiCad EDA PCB viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('LED Blinker PCB (KiCad)');
  const kicadf = await frameOf('iframe.fv-preview-frame');
  await kicadf.waitForSelector('.kicad-preview', { timeout: 8000 });
  const kicadTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (kicadTypeId === 'kicad') pass('sample.kicad_pcb detected as KiCad EDA type'); else fail('kicad type: ' + kicadTypeId);
  const kicadBadge = await kicadf.$eval('.kicad-badge', (e) => e.textContent);
  if (kicadBadge === 'PCB Layout') pass('KiCad PCB badge shown'); else fail('kicad badge: ' + kicadBadge);
  const kicadStats = await kicadf.$$('.kicad-stat');
  if (kicadStats.length >= 3) pass('KiCad PCB stats shown (footprints, nets, tracks)'); else fail('kicad stats count: ' + kicadStats.length);
  const kicadTitle = await kicadf.$eval('.kicad-title', (e) => e.textContent);
  if (/LED Blinker/i.test(kicadTitle)) pass('KiCad PCB title shown'); else fail('kicad title: ' + kicadTitle);

  // ── PostScript / EPS viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Hello PostScript (EPS)');
  const psf = await frameOf('iframe.fv-preview-frame');
  await psf.waitForSelector('.ps-preview', { timeout: 8000 });
  const psTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (psTypeId === 'postscript') pass('sample.eps detected as PostScript type'); else fail('postscript type: ' + psTypeId);
  const psBadge = await psf.$eval('.ps-badge', (e) => e.textContent);
  if (/PS/i.test(psBadge)) pass('PostScript DSC version badge shown'); else fail('ps badge: ' + psBadge);
  const psTitle = await psf.$eval('.ps-table', (e) => e.textContent);
  if (/Hello PostScript/i.test(psTitle)) pass('PostScript title from DSC comments shown'); else fail('ps table: ' + psTitle.slice(0, 100));

  // ── Steam ACF viewer (known-file plugin) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Steam App Manifest (ACF)');
  await page.waitForSelector('#previewHost .steam-doc', { timeout: 12000 });
  const acfText = await page.$eval('#previewHost .steam-doc', (e) => e.textContent);
  if (/ACF|Steam/i.test(acfText)) pass('sample.acf: ACF/Steam badge shown'); else fail('acf badge: ' + acfText.slice(0, 200));
  if (/Spacewar/i.test(acfText)) pass('sample.acf: game name shown'); else fail('acf name: ' + acfText.slice(0, 300));
  if (/480/.test(acfText)) pass('sample.acf: App ID shown'); else fail('acf appid: ' + acfText.slice(0, 300));

  // ── FITS astronomy image viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Helix Nebula (FITS)');
  const fitsf = await frameOf('iframe.fv-preview-frame');
  await fitsf.waitForSelector('.fits-preview', { timeout: 8000 });
  const fitsTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fitsTypeId === 'fits') pass('sample.fits detected as FITS type'); else fail('fits type: ' + fitsTypeId);
  const fitsBadge = await fitsf.$eval('.fits-badge', (e) => e.textContent);
  if (fitsBadge === 'FITS') pass('FITS badge shown'); else fail('fits badge: ' + fitsBadge);
  const fitsSubhead = await fitsf.$eval('.fits-subhead', (e) => e.textContent);
  if (/NGC.?7293|Helix/i.test(fitsSubhead)) pass('FITS object name shown'); else fail('fits subhead: ' + fitsSubhead);

  // ── KML map viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Silicon Valley Map (KML)');
  const kmlf = await frameOf('iframe.fv-preview-frame');
  await kmlf.waitForSelector('.kml-preview', { timeout: 8000 });
  const kmlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (kmlTypeId === 'kml') pass('sample.kml detected as KML type'); else fail('kml type: ' + kmlTypeId);
  const kmlTitle = await kmlf.$eval('.kml-title', (e) => e.textContent);
  if (/Silicon Valley/i.test(kmlTitle)) pass('KML document name shown'); else fail('kml title: ' + kmlTitle);
  const kmlRows = await kmlf.$$eval('.kml-table tbody tr', (els) => els.length);
  if (kmlRows >= 4) pass('KML placemark table rows rendered'); else fail('kml rows: ' + kmlRows);

  // ── ABC music notation viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Folk Tunes (ABC)');
  const abcf = await frameOf('iframe.fv-preview-frame');
  await abcf.waitForSelector('.abc-preview', { timeout: 8000 });
  const abcTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (abcTypeId === 'abc') pass('sample.abc detected as ABC type'); else fail('abc type: ' + abcTypeId);
  const abcSubtitle = await abcf.$eval('.abc-subtitle', (e) => e.textContent);
  if (/3 tune/i.test(abcSubtitle)) pass('ABC 3 tunes counted'); else fail('abc subtitle: ' + abcSubtitle);
  const abcFirstTitle = await abcf.$eval('.abc-tune-title', (e) => e.textContent);
  if (/Scarborough/i.test(abcFirstTitle)) pass('ABC first tune title shown'); else fail('abc title: ' + abcFirstTitle);

  // ── HL7 health message viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Patient Admission (HL7)');
  const hl7f = await frameOf('iframe.fv-preview-frame');
  await hl7f.waitForSelector('.hl7-preview', { timeout: 8000 });
  const hl7TypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (hl7TypeId === 'hl7') pass('sample.hl7 detected as HL7 type'); else fail('hl7 type: ' + hl7TypeId);
  const hl7Badge = await hl7f.$eval('.hl7-badge', (e) => e.textContent);
  if (hl7Badge === 'HL7') pass('HL7 badge shown'); else fail('hl7 badge: ' + hl7Badge);
  const hl7Segs = await hl7f.$$eval('.hl7-table tbody tr', (els) => els.length);
  if (hl7Segs >= 8) pass('HL7 segment table rows rendered'); else fail('hl7 segs: ' + hl7Segs);

  // ── Hydrogen drum machine viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Demo Beat (Hydrogen)');
  const h2f = await frameOf('iframe.fv-preview-frame');
  await h2f.waitForSelector('.h2-preview', { timeout: 8000 });
  const h2TypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (h2TypeId === 'hydrogen') pass('sample.h2song detected as Hydrogen type'); else fail('hydrogen type: ' + h2TypeId);
  const h2Title = await h2f.$eval('.h2-title', (e) => e.textContent);
  if (/Demo Beat/i.test(h2Title)) pass('Hydrogen song name shown'); else fail('h2 title: ' + h2Title);
  const h2Chips = await h2f.$$('.h2-chip');
  if (h2Chips.length >= 4) pass('Hydrogen instrument chips shown'); else fail('h2 chips: ' + h2Chips.length);

  // ── Adobe Premiere .prproj viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Short Film Project (Premiere)');
  const ppf = await frameOf('iframe.fv-preview-frame');
  await ppf.waitForSelector('.prproj-preview', { timeout: 10000 });
  const ppTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ppTypeId === 'prproj') pass('sample.prproj detected as Premiere type'); else fail('prproj type: ' + ppTypeId);
  const ppBadge = await ppf.$eval('.prproj-badge', (e) => e.textContent);
  if (ppBadge === 'Premiere') pass('Premiere badge shown'); else fail('prproj badge: ' + ppBadge);
  const ppStats = await ppf.$$('.prproj-stat');
  if (ppStats.length >= 2) pass('Premiere project stats shown'); else fail('prproj stats: ' + ppStats.length);

  // ── MT940 Bank Statement ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('MT940 bank statement (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const mt940f = await frameOf('iframe.fv-preview-frame');
  await mt940f.waitForSelector('.badge-mt940', { timeout: 8000 });
  const mt940TypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mt940TypeId === 'mt940') pass('.mt940 detected as mt940 type'); else fail('mt940 typeId: ' + mt940TypeId);
  const mt940Text = await mt940f.$eval('body', (el) => el.textContent);
  if (/MT940|Statement/i.test(mt940Text)) pass('MT940 badge shown'); else fail('mt940 badge: ' + mt940Text.slice(0, 300));
  if (/DE89|EUR|balance/i.test(mt940Text)) pass('MT940 account\/balance shown'); else fail('mt940 acct: ' + mt940Text.slice(0, 300));

  // ── GFF/GTF Genomic Features ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('GFF3 genome annotation (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const gfff = await frameOf('iframe.fv-preview-frame');
  await gfff.waitForSelector('.badge-gff', { timeout: 8000 });
  const gffTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (gffTypeId === 'gff') pass('.gff3 detected as gff type'); else fail('gff typeId: ' + gffTypeId);
  const gffText = await gfff.$eval('body', (el) => el.textContent);
  if (/GFF3?/i.test(gffText)) pass('GFF badge shown'); else fail('gff badge: ' + gffText.slice(0, 300));
  if (/gene|exon|CDS|mRNA/i.test(gffText)) pass('GFF feature types shown'); else fail('gff features: ' + gffText.slice(0, 300));
  if (/chr\d|chromosome/i.test(gffText)) pass('GFF chromosome info shown'); else fail('gff chrom: ' + gffText.slice(0, 300));

  // ── Dockerfile viewer ──
  // Known-file enhancement takes over for Dockerfiles (returns parentNode with .kf-list, no iframe)
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Dockerfile');
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dfTypeId === 'dockerfile') pass('Dockerfile detected'); else fail('dockerfile typeId: ' + dfTypeId);
  const dfText = await page.$eval('#previewHost', (el) => el.textContent);
  if (/Dockerfile/i.test(dfText)) pass('Dockerfile heading shown'); else fail('dockerfile heading: ' + dfText.slice(0, 200));
  if (/nginx|node|stage/i.test(dfText)) pass('Dockerfile images\/stages shown'); else fail('dockerfile content: ' + dfText.slice(0, 200));

  // ── docker-compose viewer ──
  // Known-file enhancement takes over (returns parentNode with .kf-svc, no iframe)
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docker-compose.yml');
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const dcTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dcTypeId === 'known:docker-compose' || dcTypeId === 'docker-compose') pass('docker-compose.yml detected'); else fail('docker-compose typeId: ' + dcTypeId);
  const dcText = await page.$eval('#previewHost', (el) => el.textContent);
  if (/compose stack|docker.compose/i.test(dcText)) pass('docker-compose heading shown'); else fail('dc heading: ' + dcText.slice(0, 200));
  if (/web|api|db/i.test(dcText)) pass('docker-compose services shown'); else fail('dc services: ' + dcText.slice(0, 200));

  // ── SARIF security scan viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('SARIF security scan results (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const srf = await frameOf('iframe.fv-preview-frame');
  await srf.waitForSelector('.badge-sarif', { timeout: 8000 });
  const srTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (srTypeId === 'sarif') pass('SARIF detected'); else fail('sarif typeId: ' + srTypeId);
  const srText = await srf.$eval('body', (el) => el.textContent);
  if (/SARIF/i.test(srText)) pass('SARIF badge shown'); else fail('sarif badge: ' + srText.slice(0, 200));
  if (/error|warning/i.test(srText)) pass('SARIF findings shown'); else fail('sarif findings: ' + srText.slice(0, 200));

  // ── Protocol Buffer viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Protocol Buffer IDL (demo)');
  await page.waitForSelector('#previewHost .proto-root', { timeout: 12000 });
  const protoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (protoTypeId === 'proto') pass('.proto detected as Protocol Buffer type'); else fail('proto typeId: ' + protoTypeId);
  const protoText = await page.$eval('#previewHost .proto-root', (el) => el.textContent);
  if (/proto3|Protocol Buffer/i.test(protoText)) pass('proto badge/syntax shown'); else fail('proto badge: ' + protoText.slice(0, 300));
  if (/message|UserService/i.test(protoText)) pass('proto messages and service shown'); else fail('proto content: ' + protoText.slice(0, 300));

  // ── Apache Thrift viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Apache Thrift IDL (demo)');
  await page.waitForSelector('#previewHost .thrift-root', { timeout: 12000 });
  const thriftTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (thriftTypeId === 'thrift') pass('.thrift detected as Apache Thrift type'); else fail('thrift typeId: ' + thriftTypeId);
  const thriftText = await page.$eval('#previewHost .thrift-root', (el) => el.textContent);
  if (/Thrift/i.test(thriftText)) pass('thrift badge shown'); else fail('thrift badge: ' + thriftText.slice(0, 300));
  if (/struct|UserService/i.test(thriftText)) pass('thrift structs and service shown'); else fail('thrift content: ' + thriftText.slice(0, 300));

  // ── secret.txt Easter egg — The Archivist lore file loads as plain text ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('secret.txt');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const secretf = await frameOf('iframe.fv-preview-frame');
  await secretf.waitForSelector('.plain-doc .plain-text', { timeout: 8000 });
  const secretText = await secretf.$eval('.plain-doc .plain-text', (e) => e.textContent);
  if (/Archivist/i.test(secretText)) pass('secret.txt Easter egg loads as plain text with Archivist lore'); else fail('secret.txt text: ' + secretText.slice(0, 200));

  // ── RTF WYSIWYG editor (parentNode) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.rtf');
  await page.waitForSelector('#previewHost .rtf-paper', { timeout: 12000 });
  const rtfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (rtfTypeId === 'rtf') pass('sample.rtf detected as RTF type'); else fail('rtf typeId: ' + rtfTypeId);
  const rtfText = await page.$eval('#previewHost .rtf-paper', (e) => e.textContent);
  if (/Sample RTF Document/i.test(rtfText)) pass('RTF document title rendered'); else fail('rtf title: ' + rtfText.slice(0, 200));
  const boldEls = await page.$$('#previewHost .rtf-paper [style*="font-weight:bold"]');
  if (boldEls.length >= 1) pass('RTF bold formatting rendered (' + boldEls.length + ' bold spans)'); else fail('rtf bold spans: ' + boldEls.length);
  const italicEls = await page.$$('#previewHost .rtf-paper [style*="font-style:italic"]');
  if (italicEls.length >= 1) pass('RTF italic formatting rendered'); else fail('rtf italic spans: ' + italicEls.length);
  const rtfToolbar = await page.$('#previewHost .rtf-editor-toolbar');
  if (rtfToolbar) pass('RTF WYSIWYG toolbar present'); else fail('rtf toolbar missing');
  const rtfRowBreak = await page.$('#previewHost .rtf-tb-row-break');
  if (rtfRowBreak) pass('RTF toolbar row 2 present'); else fail('rtf toolbar row 2 missing');
  const rtfColorInput = await page.$('#previewHost .rtf-tb-color');
  if (rtfColorInput) pass('RTF text color picker present'); else fail('rtf color picker missing');

  // ── SVG dual-pane viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.svg');
  // SVG type: dual-pane (Monaco editor left, sandboxed iframe preview right) via parentNode
  const svgTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (svgTypeId === 'svg') pass('example.svg detected as SVG type'); else fail('svg typeId: ' + svgTypeId);
  // The dual-pane container (.svg-editor) should be present in the preview host
  const svgEditorContainer = await page.waitForSelector('.svg-editor', { timeout: 12000 });
  if (svgEditorContainer) pass('SVG dual-pane container (.svg-editor) mounted in preview host'); else fail('SVG dual-pane container not found');
  // The live preview iframe (srcdoc, sandbox=allow-same-origin) should be present
  const svgPreviewIframe = await page.waitForSelector('.svg-preview-iframe', { timeout: 8000 });
  if (svgPreviewIframe) pass('SVG preview iframe (.svg-preview-iframe) present'); else fail('SVG preview iframe not found');
  // The toolbar with Copy SVG button and dimensions badge should be present
  const svgToolbar = await page.$('.svg-toolbar');
  if (svgToolbar) pass('SVG toolbar present'); else fail('SVG toolbar not found');
}
