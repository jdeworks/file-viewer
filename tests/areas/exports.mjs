export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── JSON ↔ YAML conversion exports (loadExports) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.json');
  await page.waitForSelector('#previewHost .json-tree', { timeout: 30000 });
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const jsonExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (jsonExports.includes('Download as YAML') && jsonExports.includes('Download minified JSON')) pass('JSON export menu offers YAML + minified'); else fail('json exports: ' + jsonExports.join(','));
  const [yamlDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as YAML")'),
  ]);
  if (/\.yaml$/.test(yamlDownload.suggestedFilename())) pass('JSON → YAML conversion download (' + yamlDownload.suggestedFilename() + ')'); else fail('json→yaml name: ' + yamlDownload.suggestedFilename());

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.yaml');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const yamlExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (yamlExports.includes('Download as JSON')) pass('YAML export menu offers JSON'); else fail('yaml exports: ' + yamlExports.join(','));
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as JSON")'),
  ]);
  if (/\.json$/.test(jsonDownload.suggestedFilename())) pass('YAML → JSON conversion download (' + jsonDownload.suggestedFilename() + ')'); else fail('yaml→json name: ' + jsonDownload.suggestedFilename());

  // ── Subtitle SRT → VTT + TOML → JSON conversions (loadExports) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.srt');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const srtExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (srtExports.some((t) => /WebVTT/.test(t))) pass('subtitle SRT export offers WebVTT'); else fail('srt exports: ' + srtExports.join(','));
  const [vttDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("WebVTT")'),
  ]);
  if (/\.vtt$/.test(vttDl.suggestedFilename())) pass('subtitle SRT → VTT download (' + vttDl.suggestedFilename() + ')'); else fail('srt→vtt: ' + vttDl.suggestedFilename());

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.toml');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const tomlExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (tomlExports.includes('Download as JSON')) pass('TOML export offers JSON'); else fail('toml exports: ' + tomlExports.join(','));
  const [tjDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as JSON")'),
  ]);
  if (/\.json$/.test(tjDl.suggestedFilename())) pass('TOML → JSON download (' + tjDl.suggestedFilename() + ')'); else fail('toml→json: ' + tjDl.suggestedFilename());

  // ── OFX → CSV transaction export (loadExports) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.ofx');
  await page.waitForSelector('#previewHost .ofx-preview', { timeout: 8000 });
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const ofxExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (ofxExports.some((t) => /CSV/i.test(t))) pass('OFX export menu offers CSV'); else fail('ofx exports: ' + ofxExports.join(','));
  const [ofxDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("CSV")'),
  ]);
  if (/\.csv$/.test(ofxDl.suggestedFilename())) pass('OFX → CSV download (' + ofxDl.suggestedFilename() + ')'); else fail('ofx→csv: ' + ofxDl.suggestedFilename());
}
