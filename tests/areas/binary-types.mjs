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

  // ── Guitar Pro ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.gp5');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const gpf = await frameOf('iframe.fv-preview-frame');
  await gpf.waitForSelector('.gp-preview', { timeout: 8000 });
  const gpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (gpTypeId === 'guitar-pro') pass('.gp5 detected as guitar-pro type'); else fail('gp typeId: ' + gpTypeId);
  const gpText = await gpf.$eval('.gp-preview', (el) => el.textContent);
  if (/Guitar Pro/i.test(gpText)) pass('Guitar Pro format label shown'); else fail('gp text: ' + gpText.slice(0, 200));
  if (/File Viewer Demo Tab/i.test(gpText)) pass('GP5 title parsed correctly'); else fail('gp title: ' + gpText.slice(0, 200));

  // ── APK ───────────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.apk');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const apkf = await frameOf('iframe.fv-preview-frame');
  await apkf.waitForSelector('.apk-preview', { timeout: 12000 });
  const apkTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (apkTypeId === 'apk') pass('.apk detected as apk type'); else fail('apk typeId: ' + apkTypeId);
  const apkText = await apkf.$eval('.apk-preview', (el) => el.textContent);
  if (/classes\.dex/i.test(apkText)) pass('APK classes.dex shown'); else fail('apk content: ' + apkText.slice(0, 200));
  if (/arm64-v8a|x86_64/i.test(apkText)) pass('APK native ABI shown'); else fail('apk abi: ' + apkText.slice(0, 200));
}
