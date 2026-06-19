export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── ELF executable ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.elf');
  const elfFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const elff = await frameOf('iframe.fv-preview-frame');
  await elff.waitForSelector('.exe-preview', { timeout: 8000 });
  const elfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (elfTypeId === 'exe') pass('.elf detected as exe type'); else fail('elf typeId: ' + elfTypeId);
  const elfBadge = await elff.$eval('.exe-badge', (el) => el.textContent);
  if (/ELF/i.test(elfBadge)) pass('ELF badge shown'); else fail('elf badge: ' + elfBadge);
  const elfRows = await elff.$$eval('.exe-table td', (tds) => tds.map((t) => t.textContent));
  const elfText = elfRows.join(' ');
  if (/x86-64/i.test(elfText)) pass('ELF architecture x86-64 shown'); else fail('elf rows: ' + elfText.slice(0, 200));
  if (/64-bit/i.test(elfText)) pass('ELF 64-bit width shown'); else fail('elf rows (bit): ' + elfText.slice(0, 200));

  // ── GeoJSON ──────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.geojson');
  const geoFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const geof = await frameOf('iframe.fv-preview-frame');
  await geof.waitForSelector('.geo-preview', { timeout: 8000 });
  const geoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (geoTypeId === 'geojson') pass('.geojson detected as geojson type'); else fail('geojson typeId: ' + geoTypeId);
  const geoStats = await geof.$$eval('.geo-stat-value', (els) => els.map((e) => e.textContent));
  if (geoStats.includes('5')) pass('GeoJSON feature count 5 shown'); else fail('geojson stats: ' + geoStats.join(','));
  const geoNames = await geof.$eval('.geo-table', (t) => t.textContent);
  if (/Golden Gate/i.test(geoNames)) pass('GeoJSON named feature Golden Gate shown'); else fail('geo table: ' + geoNames.slice(0, 200));

  // ── Telegram chat export ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample-telegram.json');
  const chatFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const chatf = await frameOf('iframe.fv-preview-frame');
  await chatf.waitForSelector('.chat-preview', { timeout: 8000 });
  const chatTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (chatTypeId === 'chat') pass('Telegram JSON detected as chat type'); else fail('chat typeId: ' + chatTypeId);
  const chatBadge = await chatf.$eval('.chat-badge', (el) => el.textContent);
  if (/Telegram/i.test(chatBadge)) pass('Telegram badge shown'); else fail('chat badge: ' + chatBadge);
  const chatStats = await chatf.$$eval('.chat-stat-value', (els) => els.map((e) => e.textContent));
  if (chatStats.includes('8')) pass('Telegram message count 8 shown'); else fail('chat stats: ' + chatStats.join(','));
}
