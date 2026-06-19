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

  // ── ISO 9660 ─────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sample.iso');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const isof = await frameOf('iframe.fv-preview-frame');
  await isof.waitForSelector('.iso-preview', { timeout: 8000 });
  const isoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (isoTypeId === 'iso') pass('.iso detected as iso type'); else fail('iso typeId: ' + isoTypeId);
  const isoText = await isof.$eval('.iso-preview', (el) => el.textContent);
  if (/FILEVIEWER_DEMO/i.test(isoText)) pass('ISO volume ID shown'); else fail('iso content: ' + isoText.slice(0, 200));
  if (/FILE VIEWER PROJECT/i.test(isoText)) pass('ISO publisher shown'); else fail('iso publisher: ' + isoText.slice(0, 200));

  // ── Windows Minidump ─────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Windows Minidump (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const dmpf = await frameOf('iframe.fv-preview-frame');
  await dmpf.waitForSelector('.badge-mdmp', { timeout: 8000 });
  const dmpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dmpTypeId === 'dmp') pass('.dmp detected as dmp type'); else fail('dmp typeId: ' + dmpTypeId);
  const dmpText = await dmpf.$eval('body', (el) => el.textContent);
  if (/MINIDUMP/i.test(dmpText)) pass('MINIDUMP badge shown'); else fail('dmp badge missing');
  if (/Windows 11/i.test(dmpText)) pass('DMP OS Windows 11 shown'); else fail('dmp os: ' + dmpText.slice(0, 300));
  if (/x64|AMD64/i.test(dmpText)) pass('DMP architecture x64 shown'); else fail('dmp arch: ' + dmpText.slice(0, 300));

  // ── DXF AutoCAD ──────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('AutoCAD DXF Drawing (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const dxff = await frameOf('iframe.fv-preview-frame');
  await dxff.waitForSelector('.badge-dxf', { timeout: 8000 });
  const dxfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dxfTypeId === 'dxf') pass('.dxf detected as dxf type'); else fail('dxf typeId: ' + dxfTypeId);
  const dxfText = await dxff.$eval('body', (el) => el.textContent);
  if (/AC1027|AutoCAD 2013/i.test(dxfText)) pass('DXF version AC1027 shown'); else fail('dxf ver: ' + dxfText.slice(0, 300));
  if (/LINE|CIRCLE|TEXT/i.test(dxfText)) pass('DXF entity types shown'); else fail('dxf entities: ' + dxfText.slice(0, 300));
  if (/Walls|Dimensions/i.test(dxfText)) pass('DXF layer names shown'); else fail('dxf layers: ' + dxfText.slice(0, 300));

  // ── Minecraft World (.mcworld) ────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Minecraft World (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const mcf = await frameOf('iframe.fv-preview-frame');
  await mcf.waitForSelector('.badge-mc', { timeout: 12000 });
  const mcTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mcTypeId === 'mcworld') pass('.mcworld detected as mcworld type'); else fail('mcworld typeId: ' + mcTypeId);
  const mcText = await mcf.$eval('body', (el) => el.textContent);
  if (/Minecraft/i.test(mcText)) pass('Minecraft badge shown'); else fail('mc badge missing');
  if (/File Viewer Demo World/i.test(mcText)) pass('MC world name shown'); else fail('mc name: ' + mcText.slice(0, 300));
  if (/level\.dat|levelname\.txt/i.test(mcText)) pass('MC key files listed'); else fail('mc files: ' + mcText.slice(0, 300));
}
