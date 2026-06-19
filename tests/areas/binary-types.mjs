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

  // ── DICOM Medical Image ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('DICOM Medical Image (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const dcmf = await frameOf('iframe.fv-preview-frame');
  await dcmf.waitForSelector('.badge-dcm', { timeout: 8000 });
  const dcmTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dcmTypeId === 'dicom') pass('.dcm detected as dicom type'); else fail('dcm typeId: ' + dcmTypeId);
  const dcmText = await dcmf.$eval('body', (el) => el.textContent);
  if (/DICOM/i.test(dcmText)) pass('DICOM badge shown'); else fail('dcm badge missing');
  if (/CT|Computed Tomography/i.test(dcmText)) pass('DICOM modality CT shown'); else fail('dcm mod: ' + dcmText.slice(0, 300));
  if (/512|Demo Hospital/i.test(dcmText)) pass('DICOM image info shown'); else fail('dcm info: ' + dcmText.slice(0, 300));

  // ── NetCDF Scientific Data ────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('NetCDF Climate Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ncf = await frameOf('iframe.fv-preview-frame');
  await ncf.waitForSelector('.badge-nc', { timeout: 8000 });
  const ncTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ncTypeId === 'netcdf') pass('.nc detected as netcdf type'); else fail('nc typeId: ' + ncTypeId);
  const ncText = await ncf.$eval('body', (el) => el.textContent);
  if (/NetCDF/i.test(ncText)) pass('NetCDF badge shown'); else fail('nc badge missing');
  if (/temperature|lat|lon/i.test(ncText)) pass('NetCDF variables shown'); else fail('nc vars: ' + ncText.slice(0, 300));
  if (/CF-1\.8|Demo Climate/i.test(ncText)) pass('NetCDF global attributes shown'); else fail('nc attrs: ' + ncText.slice(0, 300));

  // ── KMZ Compressed Map ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('World Cities (KMZ)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const kmzf = await frameOf('iframe.fv-preview-frame');
  await kmzf.waitForSelector('.badge-kmz', { timeout: 8000 });
  const kmzTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (kmzTypeId === 'kmz') pass('.kmz detected as kmz type'); else fail('kmz typeId: ' + kmzTypeId);
  const kmzText = await kmzf.$eval('body', (el) => el.textContent);
  if (/KMZ/i.test(kmzText)) pass('KMZ badge shown'); else fail('kmz badge missing');
  if (/Eiffel Tower|Statue of Liberty|Sydney Opera/i.test(kmzText)) pass('KMZ placemark names shown'); else fail('kmz placemarks: ' + kmzText.slice(0, 300));
  if (/File Viewer Demo KMZ/i.test(kmzText)) pass('KMZ document name shown'); else fail('kmz name: ' + kmzText.slice(0, 300));

  // ── MBTiles Map Tileset ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('File Viewer Demo Map (MBTiles)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const mbtf = await frameOf('iframe.fv-preview-frame');
  await mbtf.waitForSelector('.badge-mbt', { timeout: 12000 });
  const mbtTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mbtTypeId === 'mbtiles') pass('.mbtiles detected as mbtiles type'); else fail('mbt typeId: ' + mbtTypeId);
  const mbtText = await mbtf.$eval('body', (el) => el.textContent);
  if (/MBTiles/i.test(mbtText)) pass('MBTiles badge shown'); else fail('mbt badge missing');
  if (/File Viewer Demo Map/i.test(mbtText)) pass('MBTiles map name shown'); else fail('mbt name: ' + mbtText.slice(0, 300));
  if (/0.*4|minzoom|maxzoom|Zoom/i.test(mbtText)) pass('MBTiles zoom levels shown'); else fail('mbt zoom: ' + mbtText.slice(0, 300));

  // ── PDB Protein Structure ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Demo Protein Structure (PDB)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const pdbf = await frameOf('iframe.fv-preview-frame');
  await pdbf.waitForSelector('.badge-pdb', { timeout: 8000 });
  const pdbTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pdbTypeId === 'pdb') pass('.pdb detected as pdb type'); else fail('pdb typeId: ' + pdbTypeId);
  const pdbText = await pdbf.$eval('body', (el) => el.textContent);
  if (/PDB/i.test(pdbText)) pass('PDB badge shown'); else fail('pdb badge missing');
  if (/DEMO/i.test(pdbText)) pass('PDB ID shown'); else fail('pdb id: ' + pdbText.slice(0, 300));
  if (/Homo sapiens|HYDROLASE/i.test(pdbText)) pass('PDB organism/type shown'); else fail('pdb org: ' + pdbText.slice(0, 300));
  if (/Chain|chain|1\.80|Residue|residue/i.test(pdbText)) pass('PDB structure info shown'); else fail('pdb struct: ' + pdbText.slice(0, 300));
}
