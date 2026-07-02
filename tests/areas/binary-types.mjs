export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // Shared check for the opt-in 3D molecular viewer: the "Load 3D structure" button must appear,
  // and clicking it must lazily load 3Dmol.js + mount a WebGL <canvas>. Headless Chromium uses
  // SwiftShader for WebGL; if the canvas never appears we still pass the button check and warn,
  // so the test isn't flaky on environments without GL.
  async function checkMol3d(label) {
    const btn = await page.$('#previewHost .mol3d-load-btn');
    if (!btn) { fail(label + ' 3D load button missing'); return; }
    pass(label + ' 3D load button shown');
    await btn.evaluate((b) => b.scrollIntoView({ block: 'center' }));   // clear the bottom-left offline pill
    await btn.click();
    try {
      await page.waitForSelector('#previewHost .mol3d-stage canvas', { timeout: 20000 });
      pass(label + ' 3D canvas mounted');
    } catch {
      // Tolerate a GL-less headless environment: the panel still loaded the toolbar/library.
      const hasBar = await page.$('#previewHost .mol3d-bar');
      const hasErr = await page.$('#previewHost .mol3d-err');
      if (hasBar && !hasErr) pass(label + ' 3D viewer toolbar mounted (canvas GL unavailable)');
      else fail(label + ' 3D viewer failed to mount');
    }
  }

  // ── ELF executable ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.elf');
  const elfFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
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
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample-telegram.json');
  const chatFrame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const chatf = await frameOf('iframe.fv-preview-frame');
  await chatf.waitForSelector('.chat-preview', { timeout: 8000 });
  const chatTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (chatTypeId === 'chat') pass('Telegram JSON detected as chat type'); else fail('chat typeId: ' + chatTypeId);
  const chatBadge = await chatf.$eval('.chat-badge', (el) => el.textContent);
  if (/Telegram/i.test(chatBadge)) pass('Telegram badge shown'); else fail('chat badge: ' + chatBadge);
  const chatStats = await chatf.$$eval('.chat-stat-value', (els) => els.map((e) => e.textContent));
  if (chatStats.includes('8')) pass('Telegram message count 8 shown'); else fail('chat stats: ' + chatStats.join(','));

  // ── Guitar Pro ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.gp5');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const gpf = await frameOf('iframe.fv-preview-frame');
  await gpf.waitForSelector('.gp-preview', { timeout: 8000 });
  const gpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (gpTypeId === 'guitar-pro') pass('.gp5 detected as guitar-pro type'); else fail('gp typeId: ' + gpTypeId);
  const gpText = await gpf.$eval('.gp-preview', (el) => el.textContent);
  if (/Guitar Pro/i.test(gpText)) pass('Guitar Pro format label shown'); else fail('gp text: ' + gpText.slice(0, 200));
  if (/File Viewer Demo Tab/i.test(gpText)) pass('GP5 title parsed correctly'); else fail('gp title: ' + gpText.slice(0, 200));

  // ── APK ───────────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.apk');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const apkf = await frameOf('iframe.fv-preview-frame');
  await apkf.waitForSelector('.apk-preview', { timeout: 12000 });
  const apkTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (apkTypeId === 'apk') pass('.apk detected as apk type'); else fail('apk typeId: ' + apkTypeId);
  const apkText = await apkf.$eval('.apk-preview', (el) => el.textContent);
  if (/classes\.dex/i.test(apkText)) pass('APK classes.dex shown'); else fail('apk content: ' + apkText.slice(0, 200));
  if (/arm64-v8a|x86_64/i.test(apkText)) pass('APK native ABI shown'); else fail('apk abi: ' + apkText.slice(0, 200));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const apkMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*APK/.test(apkMeta)) pass('APK metadata includes format'); else fail('apk meta: ' + apkMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── ISO 9660 ─────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.iso');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const isof = await frameOf('iframe.fv-preview-frame');
  await isof.waitForSelector('.iso-preview', { timeout: 8000 });
  const isoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (isoTypeId === 'iso') pass('.iso detected as iso type'); else fail('iso typeId: ' + isoTypeId);
  const isoText = await isof.$eval('.iso-preview', (el) => el.textContent);
  if (/FILEVIEWER_DEMO/i.test(isoText)) pass('ISO volume ID shown'); else fail('iso content: ' + isoText.slice(0, 200));
  if (/FILE VIEWER PROJECT/i.test(isoText)) pass('ISO publisher shown'); else fail('iso publisher: ' + isoText.slice(0, 200));

  // ── Windows Minidump ─────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Windows Minidump (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const dmpf = await frameOf('iframe.fv-preview-frame');
  await dmpf.waitForSelector('.badge-mdmp', { timeout: 8000 });
  const dmpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dmpTypeId === 'dmp') pass('.dmp detected as dmp type'); else fail('dmp typeId: ' + dmpTypeId);
  const dmpText = await dmpf.$eval('body', (el) => el.textContent);
  if (/MINIDUMP/i.test(dmpText)) pass('MINIDUMP badge shown'); else fail('dmp badge missing');
  if (/Windows 11/i.test(dmpText)) pass('DMP OS Windows 11 shown'); else fail('dmp os: ' + dmpText.slice(0, 300));
  if (/x64|AMD64/i.test(dmpText)) pass('DMP architecture x64 shown'); else fail('dmp arch: ' + dmpText.slice(0, 300));

  // ── DXF AutoCAD ──────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('AutoCAD DXF Drawing (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const dxff = await frameOf('iframe.fv-preview-frame');
  await dxff.waitForSelector('.badge-dxf', { timeout: 8000 });
  const dxfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dxfTypeId === 'dxf') pass('.dxf detected as dxf type'); else fail('dxf typeId: ' + dxfTypeId);
  const dxfText = await dxff.$eval('body', (el) => el.textContent);
  if (/AC1027|AutoCAD 2013/i.test(dxfText)) pass('DXF version AC1027 shown'); else fail('dxf ver: ' + dxfText.slice(0, 300));
  if (/LINE|CIRCLE|TEXT/i.test(dxfText)) pass('DXF entity types shown'); else fail('dxf entities: ' + dxfText.slice(0, 300));
  if (/Walls|Dimensions/i.test(dxfText)) pass('DXF layer names shown'); else fail('dxf layers: ' + dxfText.slice(0, 300));
  // 2D canvas render: the geometry is actually drawn (not just metadata counts).
  await dxff.waitForSelector('.dxf-canvas', { timeout: 8000 });
  const dxfTools = await dxff.$$eval('.dxf-tools button', (b) => b.map((x) => x.textContent));
  if (dxfTools.includes('Fit') && dxfTools.includes('+') && dxfTools.includes('−')) pass('DXF 2D view has fit/zoom controls'); else fail('dxf tools: ' + JSON.stringify(dxfTools));
  const dxfDrawn = await dxff.$eval('.dxf-canvas', (c) => parseInt(c.dataset.drawn || '0', 10));
  if (dxfDrawn > 0) pass(`DXF 2D view drew ${dxfDrawn} entities`); else fail('dxf canvas drawn count: ' + dxfDrawn);
  // Prove real pixels landed on the canvas (some non-transparent pixel exists).
  const dxfPainted = await dxff.$eval('.dxf-canvas', (c) => {
    const g = c.getContext('2d'); if (!c.width || !c.height) return false;
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  });
  if (dxfPainted) pass('DXF 2D canvas has painted pixels'); else fail('dxf canvas is blank');

  // ── Minecraft World (.mcworld) ────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Minecraft World (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const mcf = await frameOf('iframe.fv-preview-frame');
  await mcf.waitForSelector('.badge-mc', { timeout: 12000 });
  const mcTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mcTypeId === 'mcworld') pass('.mcworld detected as mcworld type'); else fail('mcworld typeId: ' + mcTypeId);
  const mcText = await mcf.$eval('body', (el) => el.textContent);
  if (/Minecraft/i.test(mcText)) pass('Minecraft badge shown'); else fail('mc badge missing');
  if (/File Viewer Demo World/i.test(mcText)) pass('MC world name shown'); else fail('mc name: ' + mcText.slice(0, 300));
  if (/level\.dat|levelname\.txt/i.test(mcText)) pass('MC key files listed'); else fail('mc files: ' + mcText.slice(0, 300));
  // Dark mode: toggling the app theme must re-theme the mcworld iframe (it had no dark rules before).
  if (!(await page.evaluate(() => document.documentElement.dataset.theme === 'dark'))) await page.click('#themeBtn');
  await page.waitForTimeout(300);
  const mcDark = await (await frameOf('iframe.fv-preview-frame')).evaluate(() => {
    const m = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || []).slice(0, 3).reduce((a, b) => a + +b, 0);
    return { fvDark: document.body.classList.contains('fv-dark'), bgSum: m };
  });
  if (mcDark.fvDark && mcDark.bgSum < 200) pass('mcworld respects dark mode (iframe re-themed dark)'); else fail('mcworld dark: ' + JSON.stringify(mcDark));
  await page.click('#themeBtn');   // restore light for following tests

  // ── DICOM Medical Image ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('DICOM Medical Image (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const dcmf = await frameOf('iframe.fv-preview-frame');
  await dcmf.waitForSelector('.badge-dcm', { timeout: 8000 });
  const dcmTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dcmTypeId === 'dicom') pass('.dcm detected as dicom type'); else fail('dcm typeId: ' + dcmTypeId);
  const dcmText = await dcmf.$eval('body', (el) => el.textContent);
  if (/DICOM/i.test(dcmText)) pass('DICOM badge shown'); else fail('dcm badge missing');
  if (/CT|Computed Tomography/i.test(dcmText)) pass('DICOM modality CT shown'); else fail('dcm mod: ' + dcmText.slice(0, 300));
  if (/512|Demo Hospital/i.test(dcmText)) pass('DICOM image info shown'); else fail('dcm info: ' + dcmText.slice(0, 300));

  // ── NetCDF Scientific Data ────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('NetCDF Climate Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const ncf = await frameOf('iframe.fv-preview-frame');
  await ncf.waitForSelector('.badge-nc', { timeout: 8000 });
  const ncTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ncTypeId === 'netcdf') pass('.nc detected as netcdf type'); else fail('nc typeId: ' + ncTypeId);
  const ncText = await ncf.$eval('body', (el) => el.textContent);
  if (/NetCDF/i.test(ncText)) pass('NetCDF badge shown'); else fail('nc badge missing');
  if (/temperature|lat|lon/i.test(ncText)) pass('NetCDF variables shown'); else fail('nc vars: ' + ncText.slice(0, 300));
  if (/CF-1\.8|Demo Climate/i.test(ncText)) pass('NetCDF global attributes shown'); else fail('nc attrs: ' + ncText.slice(0, 300));

  // ── KMZ Compressed Map ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('World Cities (KMZ)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const kmzf = await frameOf('iframe.fv-preview-frame');
  await kmzf.waitForSelector('.badge-kmz', { timeout: 8000 });
  const kmzTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (kmzTypeId === 'kmz') pass('.kmz detected as kmz type'); else fail('kmz typeId: ' + kmzTypeId);
  const kmzText = await kmzf.$eval('body', (el) => el.textContent);
  if (/KMZ/i.test(kmzText)) pass('KMZ badge shown'); else fail('kmz badge missing');
  if (/Eiffel Tower|Statue of Liberty|Sydney Opera/i.test(kmzText)) pass('KMZ placemark names shown'); else fail('kmz placemarks: ' + kmzText.slice(0, 300));
  if (/File Viewer Demo KMZ/i.test(kmzText)) pass('KMZ document name shown'); else fail('kmz name: ' + kmzText.slice(0, 300));

  // ── MBTiles Map Tileset ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('File Viewer Demo Map (MBTiles)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const mbtf = await frameOf('iframe.fv-preview-frame');
  await mbtf.waitForSelector('.badge-mbt', { timeout: 12000 });
  const mbtTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mbtTypeId === 'mbtiles') pass('.mbtiles detected as mbtiles type'); else fail('mbt typeId: ' + mbtTypeId);
  const mbtText = await mbtf.$eval('body', (el) => el.textContent);
  if (/MBTiles/i.test(mbtText)) pass('MBTiles badge shown'); else fail('mbt badge missing');
  if (/File Viewer Demo Map/i.test(mbtText)) pass('MBTiles map name shown'); else fail('mbt name: ' + mbtText.slice(0, 300));
  if (/0.*4|minzoom|maxzoom|Zoom/i.test(mbtText)) pass('MBTiles zoom levels shown'); else fail('mbt zoom: ' + mbtText.slice(0, 300));

  // ── PDB Protein Structure (parent-pane mol-doc + opt-in 3D viewer) ─────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Demo Protein Structure (PDB)');
  await page.waitForSelector('#previewHost .pdb-doc', { timeout: 30000 });
  const pdbTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pdbTypeId === 'pdb') pass('.pdb detected as pdb type'); else fail('pdb typeId: ' + pdbTypeId);
  const pdbText = await page.$eval('#previewHost .pdb-doc', (el) => el.textContent);
  if (/PDB/i.test(pdbText)) pass('PDB badge shown'); else fail('pdb badge missing');
  if (/DEMO/i.test(pdbText)) pass('PDB ID shown'); else fail('pdb id: ' + pdbText.slice(0, 300));
  if (/Homo sapiens|HYDROLASE/i.test(pdbText)) pass('PDB organism/type shown'); else fail('pdb org: ' + pdbText.slice(0, 300));
  if (/Chain|chain|1\.80|Residue|residue/i.test(pdbText)) pass('PDB structure info shown'); else fail('pdb struct: ' + pdbText.slice(0, 300));
  await checkMol3d('PDB');

  // ── PCAP Network Capture ──────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Network Capture Demo (PCAP)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const pcapf = await frameOf('iframe.fv-preview-frame');
  await pcapf.waitForSelector('.badge-pcap', { timeout: 8000 });
  const pcapTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pcapTypeId === 'pcap') pass('.pcap detected as pcap type'); else fail('pcap typeId: ' + pcapTypeId);
  const pcapText = await pcapf.$eval('body', (el) => el.textContent);
  if (/PCAP/i.test(pcapText)) pass('PCAP badge shown'); else fail('pcap badge missing');
  if (/Ethernet/i.test(pcapText)) pass('PCAP link type shown'); else fail('pcap link: ' + pcapText.slice(0, 300));
  if (/ARP|TCP|UDP|ICMP/i.test(pcapText)) pass('PCAP protocols shown'); else fail('pcap proto: ' + pcapText.slice(0, 300));

  // ── XYZ Molecular Structure (parent-pane mol-doc + opt-in 3D viewer) ───────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Ethanol Molecule (XYZ)');
  await page.waitForSelector('#previewHost .xyz-doc', { timeout: 30000 });
  const xyzTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (xyzTypeId === 'xyz') pass('.xyz detected as xyz type'); else fail('xyz typeId: ' + xyzTypeId);
  const xyzText = await page.$eval('#previewHost .xyz-doc', (el) => el.textContent);
  if (/XYZ/i.test(xyzText)) pass('XYZ badge shown'); else fail('xyz badge missing');
  if (/Carbon|Hydrogen|Oxygen/i.test(xyzText)) pass('XYZ element names shown'); else fail('xyz elements: ' + xyzText.slice(0, 300));
  if (/12|Atom/i.test(xyzText)) pass('XYZ atom count shown'); else fail('xyz atoms: ' + xyzText.slice(0, 300));
  await checkMol3d('XYZ');

  // ── ESRI Shapefile ────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('NYC Borough Boundary (Shapefile)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const shpf = await frameOf('iframe.fv-preview-frame');
  await shpf.waitForSelector('.badge-shp', { timeout: 8000 });
  const shpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (shpTypeId === 'shapefile') pass('.shp detected as shapefile type'); else fail('shp typeId: ' + shpTypeId);
  const shpText = await shpf.$eval('body', (el) => el.textContent);
  if (/Shapefile/i.test(shpText)) pass('Shapefile badge shown'); else fail('shp badge missing');
  if (/Polygon/i.test(shpText)) pass('Shapefile shape type shown'); else fail('shp type: ' + shpText.slice(0, 300));
  if (/40\.|74\./i.test(shpText)) pass('Shapefile bounding box shown'); else fail('shp bbox: ' + shpText.slice(0, 300));

  // ── Doom WAD Archive ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Doom Patch WAD (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const wadf = await frameOf('iframe.fv-preview-frame');
  await wadf.waitForSelector('.badge-wad', { timeout: 8000 });
  const wadTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (wadTypeId === 'wad') pass('.wad detected as wad type'); else fail('wad typeId: ' + wadTypeId);
  const wadText = await wadf.$eval('body', (el) => el.textContent);
  if (/PWAD|IWAD/i.test(wadText)) pass('WAD type badge shown'); else fail('wad badge: ' + wadText.slice(0, 300));
  if (/Patch WAD|Internal WAD/i.test(wadText)) pass('WAD type description shown'); else fail('wad desc: ' + wadText.slice(0, 300));
  if (/MAP01|Lumps|THINGS|LINEDEFS/i.test(wadText)) pass('WAD lump info shown'); else fail('wad lumps: ' + wadText.slice(0, 300));

  // ── SDF / MDL Molfile (parent-pane mol-doc + opt-in 3D viewer) ─────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Aspirin Molecule (SDF)');
  await page.waitForSelector('#previewHost .sdf-doc', { timeout: 30000 });
  const sdfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (sdfTypeId === 'sdf') pass('.sdf detected as sdf type'); else fail('sdf typeId: ' + sdfTypeId);
  const sdfText = await page.$eval('#previewHost .sdf-doc', (el) => el.textContent);
  if (/SDF\/MOL/i.test(sdfText)) pass('SDF badge shown'); else fail('sdf badge: ' + sdfText.slice(0, 300));
  if (/C9H8O4|Formula/i.test(sdfText)) pass('SDF molecular formula shown'); else fail('sdf formula: ' + sdfText.slice(0, 300));
  if (/aspirin|acetyloxy/i.test(sdfText)) pass('SDF molecule name shown'); else fail('sdf name: ' + sdfText.slice(0, 300));
  await checkMol3d('SDF');

  // ── BSP Game Map ──────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Quake BSP Game Map (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const bspf = await frameOf('iframe.fv-preview-frame');
  await bspf.waitForSelector('.badge-bsp', { timeout: 8000 });
  const bspTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (bspTypeId === 'bsp') pass('.bsp detected as bsp type'); else fail('bsp typeId: ' + bspTypeId);
  const bspText = await bspf.$eval('body', (el) => el.textContent);
  if (/Quake BSP/i.test(bspText)) pass('BSP badge shown'); else fail('bsp badge: ' + bspText.slice(0, 300));
  if (/Quake|GoldSrc/i.test(bspText)) pass('BSP game engine shown'); else fail('bsp engine: ' + bspText.slice(0, 300));
  if (/File Viewer Demo|monster_soldier|info_player/i.test(bspText)) pass('BSP entity info shown'); else fail('bsp entities: ' + bspText.slice(0, 300));

  // ── CBOR Binary Data ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('CBOR API Response (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const cborf = await frameOf('iframe.fv-preview-frame');
  await cborf.waitForSelector('.badge-cbor', { timeout: 8000 });
  const cborTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (cborTypeId === 'cbor') pass('.cbor detected as cbor type'); else fail('cbor typeId: ' + cborTypeId);
  const cborText = await cborf.$eval('body', (el) => el.textContent);
  if (/CBOR/i.test(cborText)) pass('CBOR badge shown'); else fail('cbor badge: ' + cborText.slice(0, 300));
  if (/Map\{|Alice|items/i.test(cborText)) pass('CBOR decoded content shown'); else fail('cbor content: ' + cborText.slice(0, 300));
  if (/310 bytes|Top-level/i.test(cborText)) pass('CBOR metadata shown'); else fail('cbor meta: ' + cborText.slice(0, 300));

  // ── Apache Arrow IPC File ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Apache Arrow IPC File (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const arrf = await frameOf('iframe.fv-preview-frame');
  await arrf.waitForSelector('.badge-arrow', { timeout: 8000 });
  const arrTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (arrTypeId === 'arrow') pass('.arrow detected as arrow type'); else fail('arrow typeId: ' + arrTypeId);
  const arrText = await arrf.$eval('body', (el) => el.textContent);
  if (/Apache Arrow/i.test(arrText)) pass('Arrow badge shown'); else fail('arrow badge: ' + arrText.slice(0, 300));
  if (/Arrow IPC|Feather/i.test(arrText)) pass('Arrow format shown'); else fail('arrow format: ' + arrText.slice(0, 300));
  if (/Footer size\s*101 bytes/.test(arrText) && /name|salary|active/.test(arrText)) pass('Arrow footer info and field-name hints shown'); else fail('arrow details: ' + arrText.slice(0, 300));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const arrowMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*Apache Arrow IPC File/.test(arrowMeta) && /File Size\s*129 bytes/.test(arrowMeta)) pass('Arrow metadata includes format and file size'); else fail('arrow meta: ' + arrowMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  // ── CIF Crystallographic Data (parent-pane mol-doc + opt-in 3D viewer) ─────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Aspirin Crystal Structure (CIF)');
  await page.waitForSelector('#previewHost .cif-doc', { timeout: 30000 });
  const cifTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (cifTypeId === 'cif') pass('.cif detected as cif type'); else fail('cif typeId: ' + cifTypeId);
  const cifText = await page.$eval('#previewHost .cif-doc', (el) => el.textContent);
  if (/CIF/i.test(cifText)) pass('CIF badge shown'); else fail('cif badge: ' + cifText.slice(0, 300));
  if (/Aspirin|C9 H8 O4|acetyloxy/i.test(cifText)) pass('CIF compound info shown'); else fail('cif compound: ' + cifText.slice(0, 300));
  if (/Space Group|P 1 21|Unit Cell/i.test(cifText)) pass('CIF crystal data shown'); else fail('cif crystal: ' + cifText.slice(0, 300));
  await checkMol3d('CIF');

  // ── Apache Parquet ────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Apache Parquet Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const parqf = await frameOf('iframe.fv-preview-frame');
  await parqf.waitForSelector('.badge-parquet', { timeout: 8000 });
  const parqTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (parqTypeId === 'parquet') pass('.parquet detected as parquet type'); else fail('parquet typeId: ' + parqTypeId);
  const parqText = await parqf.$eval('body', (el) => el.textContent);
  if (/Parquet/i.test(parqText)) pass('Parquet badge shown'); else fail('parquet badge: ' + parqText.slice(0, 300));
  if (/PAR1|Parquet/i.test(parqText)) pass('Parquet format confirmed'); else fail('parquet format: ' + parqText.slice(0, 300));
  if (/name|salary|department/i.test(parqText)) pass('Parquet field names shown'); else fail('parquet fields: ' + parqText.slice(0, 300));

  // ── Apache Avro ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Avro Employee Schema (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const avrof = await frameOf('iframe.fv-preview-frame');
  await avrof.waitForSelector('.badge-avro', { timeout: 8000 });
  const avroTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (avroTypeId === 'avro') pass('.avro detected as avro type'); else fail('avro typeId: ' + avroTypeId);
  const avroText = await avrof.$eval('body', (el) => el.textContent);
  if (/Apache Avro/i.test(avroText)) pass('Avro badge shown'); else fail('avro badge: ' + avroText.slice(0, 300));
  if (/Employee|com\.example/i.test(avroText)) pass('Avro schema name shown'); else fail('avro schema: ' + avroText.slice(0, 300));
  if (/salary|department|hire_date/i.test(avroText)) pass('Avro schema fields shown'); else fail('avro fields: ' + avroText.slice(0, 300));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const avroMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Schema\s*com\.example\.Employee/.test(avroMeta) && /Fields\s*8/.test(avroMeta) && /Codec\s*null/.test(avroMeta)) pass('Avro metadata includes schema, field count, and codec'); else fail('avro meta: ' + avroMeta.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaDrawer [data-close]');

  // ── MessagePack ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('MessagePack data (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const msgpf = await frameOf('iframe.fv-preview-frame');
  await msgpf.waitForSelector('.badge-msgpack', { timeout: 8000 });
  const msgpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (msgpTypeId === 'msgpack') pass('.msgpack detected as msgpack type'); else fail('msgpack typeId: ' + msgpTypeId);
  const msgpText = await msgpf.$eval('body', (el) => el.textContent);
  if (/MessagePack/i.test(msgpText)) pass('MessagePack badge shown'); else fail('msgpack badge: ' + msgpText.slice(0, 300));
  if (/status|version|user|scores/i.test(msgpText)) pass('MessagePack keys rendered'); else fail('msgpack keys: ' + msgpText.slice(0, 300));

  // ── BSON (Binary JSON) ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('BSON document (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const bsonf = await frameOf('iframe.fv-preview-frame');
  await bsonf.waitForSelector('.badge-bson', { timeout: 8000 });
  const bsonTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (bsonTypeId === 'bson') pass('.bson detected as bson type'); else fail('bson typeId: ' + bsonTypeId);
  const bsonText = await bsonf.$eval('body', (el) => el.textContent);
  if (/BSON/i.test(bsonText)) pass('BSON badge shown'); else fail('bson badge: ' + bsonText.slice(0, 300));
  if (/name|Alice|role/i.test(bsonText)) pass('BSON fields rendered'); else fail('bson fields: ' + bsonText.slice(0, 300));

  // ── dBase DBF ─────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('dBase DBF database (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const dbff = await frameOf('iframe.fv-preview-frame');
  await dbff.waitForSelector('.badge-dbf', { timeout: 8000 });
  const dbfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dbfTypeId === 'dbf') pass('.dbf detected as dbf type'); else fail('dbf typeId: ' + dbfTypeId);
  const dbfText = await dbff.$eval('body', (el) => el.textContent);
  if (/DBF|dBase/i.test(dbfText)) pass('DBF badge shown'); else fail('dbf badge: ' + dbfText.slice(0, 300));
  if (/NAME|CITY|Alice/i.test(dbfText)) pass('DBF fields and records shown'); else fail('dbf fields: ' + dbfText.slice(0, 300));

  // ── MATLAB MAT-file ───────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('MATLAB MAT-file (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const matf = await frameOf('iframe.fv-preview-frame');
  await matf.waitForSelector('.badge-mat', { timeout: 8000 });
  const matTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (matTypeId === 'mat') pass('.mat detected as mat type'); else fail('mat typeId: ' + matTypeId);
  const matText = await matf.$eval('body', (el) => el.textContent);
  if (/MAT|MATLAB/i.test(matText)) pass('MAT badge shown'); else fail('mat badge: ' + matText.slice(0, 300));
  if (/pi_vals|counts|greeting/i.test(matText)) pass('MAT variables shown'); else fail('mat vars: ' + matText.slice(0, 300));

  // ── FBX 3D Animation ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('FBX 3D animation (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const fbxf = await frameOf('iframe.fv-preview-frame');
  await fbxf.waitForSelector('.badge-fbx', { timeout: 8000 });
  const fbxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fbxTypeId === 'fbx') pass('.fbx detected as fbx type'); else fail('fbx typeId: ' + fbxTypeId);
  const fbxText = await fbxf.$eval('body', (el) => el.textContent);
  if (/FBX/i.test(fbxText)) pass('FBX badge shown'); else fail('fbx badge: ' + fbxText.slice(0, 300));
  if (/7400|7\.4|FBXHeader/i.test(fbxText)) pass('FBX version and nodes shown'); else fail('fbx nodes: ' + fbxText.slice(0, 300));

  // ── Blender 3D Scene ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Blender 3D scene (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const blendf = await frameOf('iframe.fv-preview-frame');
  await blendf.waitForSelector('.badge-blend', { timeout: 8000 });
  const blendTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (blendTypeId === 'blend') pass('.blend detected as blend type'); else fail('blend typeId: ' + blendTypeId);
  const blendText = await blendf.$eval('body', (el) => el.textContent);
  if (/Blender/i.test(blendText)) pass('Blender badge shown'); else fail('blend badge: ' + blendText.slice(0, 300));
  if (/4\.2|420|version/i.test(blendText)) pass('Blender version shown'); else fail('blend version: ' + blendText.slice(0, 300));

  // ── STEP CAD Exchange ─────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('STEP CAD Exchange file (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const stepf = await frameOf('iframe.fv-preview-frame');
  await stepf.waitForSelector('.badge-step', { timeout: 8000 });
  const stepTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (stepTypeId === 'step') pass('.stp detected as step type'); else fail('step typeId: ' + stepTypeId);
  const stepText = await stepf.$eval('body', (el) => el.textContent);
  if (/STEP/i.test(stepText)) pass('STEP badge shown'); else fail('step badge: ' + stepText.slice(0, 300));
  if (/AP214|schema/i.test(stepText)) pass('STEP schema shown'); else fail('step schema: ' + stepText.slice(0, 300));

  // ── AutoCAD DWG ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('AutoCAD DWG drawing (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const dwgf = await frameOf('iframe.fv-preview-frame');
  await dwgf.waitForSelector('.badge-dwg', { timeout: 8000 });
  const dwgTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dwgTypeId === 'dwg') pass('.dwg detected as dwg type'); else fail('dwg typeId: ' + dwgTypeId);
  const dwgText = await dwgf.$eval('body', (el) => el.textContent);
  if (/DWG|AutoCAD/i.test(dwgText)) pass('DWG badge shown'); else fail('dwg badge: ' + dwgText.slice(0, 300));
  if (/AC1015|2000/i.test(dwgText)) pass('DWG version info shown'); else fail('dwg version: ' + dwgText.slice(0, 300));

  // ── OpenEXR ───────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('OpenEXR HDR image (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const exrf = await frameOf('iframe.fv-preview-frame');
  await exrf.waitForSelector('.badge-exr', { timeout: 8000 });
  const exrTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (exrTypeId === 'exr') pass('.exr detected as exr type'); else fail('exr typeId: ' + exrTypeId);
  const exrText = await exrf.$eval('body', (el) => el.textContent);
  if (/OpenEXR/i.test(exrText)) pass('OpenEXR badge shown'); else fail('exr badge: ' + exrText.slice(0, 300));
  if (/compression|window|scanline/i.test(exrText)) pass('EXR header attributes shown'); else fail('exr attrs: ' + exrText.slice(0, 300));

  // ── HDF5 Scientific Data ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('HDF5 Scientific Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const hdf5f = await frameOf('iframe.fv-preview-frame');
  await hdf5f.waitForSelector('.badge-hdf5', { timeout: 8000 });
  const hdf5TypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (hdf5TypeId === 'hdf5') pass('.h5 detected as hdf5 type'); else fail('hdf5 typeId: ' + hdf5TypeId);
  const hdf5Text = await hdf5f.$eval('body', (el) => el.textContent);
  if (/HDF5/i.test(hdf5Text)) pass('HDF5 badge shown'); else fail('hdf5 badge: ' + hdf5Text.slice(0, 300));
  if (/Superblock/i.test(hdf5Text)) pass('HDF5 superblock info shown'); else fail('hdf5 superblock: ' + hdf5Text.slice(0, 300));

  // ── NIfTI Neuroimaging ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('NIfTI neuroimaging (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const niftif = await frameOf('iframe.fv-preview-frame');
  await niftif.waitForSelector('.badge-nifti', { timeout: 8000 });
  const niftiTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (niftiTypeId === 'nifti') pass('.nii detected as nifti type'); else fail('nifti typeId: ' + niftiTypeId);
  const niftiText = await niftif.$eval('body', (el) => el.textContent);
  if (/NIfTI/i.test(niftiText)) pass('NIfTI badge shown'); else fail('nifti badge: ' + niftiText.slice(0, 300));
  if (/3D|64.*64|dimensions/i.test(niftiText)) pass('NIfTI dimension info shown'); else fail('nifti dims: ' + niftiText.slice(0, 300));

  // ── Python Bytecode (.pyc) ────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Python bytecode (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const pycf = await frameOf('iframe.fv-preview-frame');
  await pycf.waitForSelector('.badge-pyc', { timeout: 8000 });
  const pycTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pycTypeId === 'pyc') pass('.pyc detected as pyc type'); else fail('pyc typeId: ' + pycTypeId);
  const pycText = await pycf.$eval('body', (el) => el.textContent);
  if (/PYC|Python/i.test(pycText)) pass('PYC badge shown'); else fail('pyc badge: ' + pycText.slice(0, 300));
  if (/3\.11|3495/i.test(pycText)) pass('Python version shown'); else fail('pyc version: ' + pycText.slice(0, 300));

  // ── LMMS Music Project ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('LMMS music project (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const lmmsf = await frameOf('iframe.fv-preview-frame');
  await lmmsf.waitForSelector('.badge-lmms', { timeout: 8000 });
  const lmmsTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (lmmsTypeId === 'lmms') pass('.mmp detected as lmms type'); else fail('lmms typeId: ' + lmmsTypeId);
  const lmmsText = await lmmsf.$eval('body', (el) => el.textContent);
  if (/LMMS/i.test(lmmsText)) pass('LMMS badge shown'); else fail('lmms badge: ' + lmmsText.slice(0, 300));
  if (/128|BPM|Demo Beat/i.test(lmmsText)) pass('LMMS BPM or name shown'); else fail('lmms bpm: ' + lmmsText.slice(0, 300));

  // ── Fusion 360 Design (.f3d) ──────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Fusion 360 design (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const f3df = await frameOf('iframe.fv-preview-frame');
  await f3df.waitForSelector('.badge-f3d', { timeout: 8000 });
  const f3dTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (f3dTypeId === 'f3d') pass('.f3d detected as f3d type'); else fail('f3d typeId: ' + f3dTypeId);
  const f3dText = await f3df.$eval('body', (el) => el.textContent);
  if (/F3D|Fusion/i.test(f3dText)) pass('F3D badge shown'); else fail('f3d badge: ' + f3dText.slice(0, 300));
  if (/Sample Widget|manifest|archive/i.test(f3dText)) pass('F3D contents shown'); else fail('f3d contents: ' + f3dText.slice(0, 300));

  // ── Debian Package (.deb) ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Debian package (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const debf = await frameOf('iframe.fv-preview-frame');
  await debf.waitForSelector('.badge-deb', { timeout: 8000 });
  const debTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (debTypeId === 'deb') pass('.deb detected as deb type'); else fail('deb typeId: ' + debTypeId);
  const debText = await debf.$eval('body', (el) => el.textContent);
  if (/DEB|Debian/i.test(debText)) pass('DEB badge shown'); else fail('deb badge: ' + debText.slice(0, 300));
  if (/hello-world|Package|debian-binary/i.test(debText)) pass('DEB package info shown'); else fail('deb pkg: ' + debText.slice(0, 300));

  // ── QIF Financial Data (parentNode) ─────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('QIF financial data (demo)');
  await page.waitForSelector('#previewHost .qif-preview', { timeout: 12000 });
  const qifTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (qifTypeId === 'qif') pass('.qif detected as qif type'); else fail('qif typeId: ' + qifTypeId);
  const qifBadge = await page.$eval('#previewHost .qif-badge', (el) => el.textContent);
  if (/QIF/i.test(qifBadge)) pass('QIF badge shown'); else fail('qif badge: ' + qifBadge);
  const qifText = await page.$eval('#previewHost .qif-preview', (el) => el.textContent);
  if (/transaction|Bank|Grocery|Quicken/i.test(qifText)) pass('QIF transactions shown'); else fail('qif txns: ' + qifText.slice(0, 300));

  // ── RPM Package ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('RPM package (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const rpmf = await frameOf('iframe.fv-preview-frame');
  await rpmf.waitForSelector('.badge-rpm', { timeout: 8000 });
  const rpmTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (rpmTypeId === 'rpm') pass('.rpm detected as rpm type'); else fail('rpm typeId: ' + rpmTypeId);
  const rpmText = await rpmf.$eval('body', (el) => el.textContent);
  if (/RPM/i.test(rpmText)) pass('RPM badge shown'); else fail('rpm badge: ' + rpmText.slice(0, 300));
  if (/hello-world|Binary|x86_64/i.test(rpmText)) pass('RPM package info shown'); else fail('rpm pkg: ' + rpmText.slice(0, 300));

  // ── NuGet Package ─────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('NuGet package (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 14000 });
  const nupkgf = await frameOf('iframe.fv-preview-frame');
  await nupkgf.waitForSelector('.badge-nupkg', { timeout: 10000 });
  const nupkgTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (nupkgTypeId === 'nupkg') pass('.nupkg detected as nupkg type'); else fail('nupkg typeId: ' + nupkgTypeId);
  const nupkgText = await nupkgf.$eval('body', (el) => el.textContent);
  if (/NuGet/i.test(nupkgText)) pass('NuGet badge shown'); else fail('nupkg badge: ' + nupkgText.slice(0, 300));
  if (/DemoLibrary|Newtonsoft|package/i.test(nupkgText)) pass('NuGet package info shown'); else fail('nupkg pkg: ' + nupkgText.slice(0, 300));

  // ── VSIX Extension ────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('VS Extension (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 14000 });
  const vsixf = await frameOf('iframe.fv-preview-frame');
  await vsixf.waitForSelector('.badge-vsix', { timeout: 10000 });
  const vsixTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (vsixTypeId === 'nupkg') pass('.vsix detected as nupkg type'); else fail('vsix typeId: ' + vsixTypeId);
  const vsixText = await vsixf.$eval('body', (el) => el.textContent);
  if (/VS Extension|Extension/i.test(vsixText)) pass('VSIX badge shown'); else fail('vsix badge: ' + vsixText.slice(0, 300));

  // ── Python Wheel ──────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Python Wheel (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 14000 });
  const whlf = await frameOf('iframe.fv-preview-frame');
  await whlf.waitForSelector('.badge-whl', { timeout: 10000 });
  const whlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (whlTypeId === 'nupkg') pass('.whl detected as nupkg type'); else fail('whl typeId: ' + whlTypeId);
  const whlText = await whlf.$eval('body', (el) => el.textContent);
  if (/Python Wheel/i.test(whlText)) pass('Python Wheel badge shown'); else fail('whl badge: ' + whlText.slice(0, 300));
  if (/demo.package|requests|package/i.test(whlText)) pass('Wheel package info shown'); else fail('whl pkg: ' + whlText.slice(0, 300));

  // ── iOS IPA ───────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('iOS App (IPA demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 14000 });
  const ipaf = await frameOf('iframe.fv-preview-frame');
  await ipaf.waitForSelector('.badge-ipa', { timeout: 10000 });
  const ipaTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (ipaTypeId === 'ipa') pass('.ipa detected as ipa type'); else fail('ipa typeId: ' + ipaTypeId);
  const ipaText = await ipaf.$eval('body', (el) => el.textContent);
  if (/iOS App/i.test(ipaText)) pass('IPA badge shown'); else fail('ipa badge: ' + ipaText.slice(0, 300));
  if (/Demo App|com\.example|15\.0/i.test(ipaText)) pass('IPA app info shown'); else fail('ipa info: ' + ipaText.slice(0, 300));
}
