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

  // ── PCAP Network Capture ──────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Network Capture Demo (PCAP)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const pcapf = await frameOf('iframe.fv-preview-frame');
  await pcapf.waitForSelector('.badge-pcap', { timeout: 8000 });
  const pcapTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pcapTypeId === 'pcap') pass('.pcap detected as pcap type'); else fail('pcap typeId: ' + pcapTypeId);
  const pcapText = await pcapf.$eval('body', (el) => el.textContent);
  if (/PCAP/i.test(pcapText)) pass('PCAP badge shown'); else fail('pcap badge missing');
  if (/Ethernet/i.test(pcapText)) pass('PCAP link type shown'); else fail('pcap link: ' + pcapText.slice(0, 300));
  if (/ARP|TCP|UDP|ICMP/i.test(pcapText)) pass('PCAP protocols shown'); else fail('pcap proto: ' + pcapText.slice(0, 300));

  // ── XYZ Molecular Structure ───────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Ethanol Molecule (XYZ)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const xyzf = await frameOf('iframe.fv-preview-frame');
  await xyzf.waitForSelector('.badge-xyz', { timeout: 8000 });
  const xyzTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (xyzTypeId === 'xyz') pass('.xyz detected as xyz type'); else fail('xyz typeId: ' + xyzTypeId);
  const xyzText = await xyzf.$eval('body', (el) => el.textContent);
  if (/XYZ/i.test(xyzText)) pass('XYZ badge shown'); else fail('xyz badge missing');
  if (/Carbon|Hydrogen|Oxygen/i.test(xyzText)) pass('XYZ element names shown'); else fail('xyz elements: ' + xyzText.slice(0, 300));
  if (/12|Atom/i.test(xyzText)) pass('XYZ atom count shown'); else fail('xyz atoms: ' + xyzText.slice(0, 300));

  // ── ESRI Shapefile ────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('NYC Borough Boundary (Shapefile)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const shpf = await frameOf('iframe.fv-preview-frame');
  await shpf.waitForSelector('.badge-shp', { timeout: 8000 });
  const shpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (shpTypeId === 'shapefile') pass('.shp detected as shapefile type'); else fail('shp typeId: ' + shpTypeId);
  const shpText = await shpf.$eval('body', (el) => el.textContent);
  if (/Shapefile/i.test(shpText)) pass('Shapefile badge shown'); else fail('shp badge missing');
  if (/Polygon/i.test(shpText)) pass('Shapefile shape type shown'); else fail('shp type: ' + shpText.slice(0, 300));
  if (/40\.|74\./i.test(shpText)) pass('Shapefile bounding box shown'); else fail('shp bbox: ' + shpText.slice(0, 300));

  // ── Doom WAD Archive ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Doom Patch WAD (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const wadf = await frameOf('iframe.fv-preview-frame');
  await wadf.waitForSelector('.badge-wad', { timeout: 8000 });
  const wadTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (wadTypeId === 'wad') pass('.wad detected as wad type'); else fail('wad typeId: ' + wadTypeId);
  const wadText = await wadf.$eval('body', (el) => el.textContent);
  if (/PWAD|IWAD/i.test(wadText)) pass('WAD type badge shown'); else fail('wad badge: ' + wadText.slice(0, 300));
  if (/Patch WAD|Internal WAD/i.test(wadText)) pass('WAD type description shown'); else fail('wad desc: ' + wadText.slice(0, 300));
  if (/MAP01|Lumps|THINGS|LINEDEFS/i.test(wadText)) pass('WAD lump info shown'); else fail('wad lumps: ' + wadText.slice(0, 300));

  // ── SDF / MDL Molfile ─────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Aspirin Molecule (SDF)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const sdff = await frameOf('iframe.fv-preview-frame');
  await sdff.waitForSelector('.badge-sdf', { timeout: 8000 });
  const sdfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (sdfTypeId === 'sdf') pass('.sdf detected as sdf type'); else fail('sdf typeId: ' + sdfTypeId);
  const sdfText = await sdff.$eval('body', (el) => el.textContent);
  if (/SDF\/MOL/i.test(sdfText)) pass('SDF badge shown'); else fail('sdf badge: ' + sdfText.slice(0, 300));
  if (/C9H8O4|Formula/i.test(sdfText)) pass('SDF molecular formula shown'); else fail('sdf formula: ' + sdfText.slice(0, 300));
  if (/aspirin|acetyloxy/i.test(sdfText)) pass('SDF molecule name shown'); else fail('sdf name: ' + sdfText.slice(0, 300));

  // ── BSP Game Map ──────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Quake BSP Game Map (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const bspf = await frameOf('iframe.fv-preview-frame');
  await bspf.waitForSelector('.badge-bsp', { timeout: 8000 });
  const bspTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (bspTypeId === 'bsp') pass('.bsp detected as bsp type'); else fail('bsp typeId: ' + bspTypeId);
  const bspText = await bspf.$eval('body', (el) => el.textContent);
  if (/Quake BSP/i.test(bspText)) pass('BSP badge shown'); else fail('bsp badge: ' + bspText.slice(0, 300));
  if (/Quake|GoldSrc/i.test(bspText)) pass('BSP game engine shown'); else fail('bsp engine: ' + bspText.slice(0, 300));
  if (/File Viewer Demo|monster_soldier|info_player/i.test(bspText)) pass('BSP entity info shown'); else fail('bsp entities: ' + bspText.slice(0, 300));

  // ── CBOR Binary Data ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CBOR API Response (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const cborf = await frameOf('iframe.fv-preview-frame');
  await cborf.waitForSelector('.badge-cbor', { timeout: 8000 });
  const cborTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (cborTypeId === 'cbor') pass('.cbor detected as cbor type'); else fail('cbor typeId: ' + cborTypeId);
  const cborText = await cborf.$eval('body', (el) => el.textContent);
  if (/CBOR/i.test(cborText)) pass('CBOR badge shown'); else fail('cbor badge: ' + cborText.slice(0, 300));
  if (/Map\{|Alice|items/i.test(cborText)) pass('CBOR decoded content shown'); else fail('cbor content: ' + cborText.slice(0, 300));
  if (/310 bytes|Top-level/i.test(cborText)) pass('CBOR metadata shown'); else fail('cbor meta: ' + cborText.slice(0, 300));

  // ── Apache Arrow IPC File ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Apache Arrow IPC File (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const arrf = await frameOf('iframe.fv-preview-frame');
  await arrf.waitForSelector('.badge-arrow', { timeout: 8000 });
  const arrTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (arrTypeId === 'arrow') pass('.arrow detected as arrow type'); else fail('arrow typeId: ' + arrTypeId);
  const arrText = await arrf.$eval('body', (el) => el.textContent);
  if (/Apache Arrow/i.test(arrText)) pass('Arrow badge shown'); else fail('arrow badge: ' + arrText.slice(0, 300));
  if (/Arrow IPC|Feather/i.test(arrText)) pass('Arrow format shown'); else fail('arrow format: ' + arrText.slice(0, 300));

  // ── CIF Crystallographic Data ─────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Aspirin Crystal Structure (CIF)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ciff = await frameOf('iframe.fv-preview-frame');
  await ciff.waitForSelector('.badge-cif', { timeout: 8000 });
  const cifTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (cifTypeId === 'cif') pass('.cif detected as cif type'); else fail('cif typeId: ' + cifTypeId);
  const cifText = await ciff.$eval('body', (el) => el.textContent);
  if (/CIF/i.test(cifText)) pass('CIF badge shown'); else fail('cif badge: ' + cifText.slice(0, 300));
  if (/Aspirin|C9 H8 O4|acetyloxy/i.test(cifText)) pass('CIF compound info shown'); else fail('cif compound: ' + cifText.slice(0, 300));
  if (/Space Group|P 1 21|Unit Cell/i.test(cifText)) pass('CIF crystal data shown'); else fail('cif crystal: ' + cifText.slice(0, 300));

  // ── Apache Parquet ────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Apache Parquet Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const parqf = await frameOf('iframe.fv-preview-frame');
  await parqf.waitForSelector('.badge-parquet', { timeout: 8000 });
  const parqTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (parqTypeId === 'parquet') pass('.parquet detected as parquet type'); else fail('parquet typeId: ' + parqTypeId);
  const parqText = await parqf.$eval('body', (el) => el.textContent);
  if (/Parquet/i.test(parqText)) pass('Parquet badge shown'); else fail('parquet badge: ' + parqText.slice(0, 300));
  if (/PAR1|Parquet/i.test(parqText)) pass('Parquet format confirmed'); else fail('parquet format: ' + parqText.slice(0, 300));
  if (/name|salary|department/i.test(parqText)) pass('Parquet field names shown'); else fail('parquet fields: ' + parqText.slice(0, 300));

  // ── Apache Avro ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Avro Employee Schema (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const avrof = await frameOf('iframe.fv-preview-frame');
  await avrof.waitForSelector('.badge-avro', { timeout: 8000 });
  const avroTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (avroTypeId === 'avro') pass('.avro detected as avro type'); else fail('avro typeId: ' + avroTypeId);
  const avroText = await avrof.$eval('body', (el) => el.textContent);
  if (/Apache Avro/i.test(avroText)) pass('Avro badge shown'); else fail('avro badge: ' + avroText.slice(0, 300));
  if (/Employee|com\.example/i.test(avroText)) pass('Avro schema name shown'); else fail('avro schema: ' + avroText.slice(0, 300));
  if (/salary|department|hire_date/i.test(avroText)) pass('Avro schema fields shown'); else fail('avro fields: ' + avroText.slice(0, 300));

  // ── MessagePack ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('MessagePack data (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const msgpf = await frameOf('iframe.fv-preview-frame');
  await msgpf.waitForSelector('.badge-msgpack', { timeout: 8000 });
  const msgpTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (msgpTypeId === 'msgpack') pass('.msgpack detected as msgpack type'); else fail('msgpack typeId: ' + msgpTypeId);
  const msgpText = await msgpf.$eval('body', (el) => el.textContent);
  if (/MessagePack/i.test(msgpText)) pass('MessagePack badge shown'); else fail('msgpack badge: ' + msgpText.slice(0, 300));
  if (/status|version|user|scores/i.test(msgpText)) pass('MessagePack keys rendered'); else fail('msgpack keys: ' + msgpText.slice(0, 300));

  // ── BSON (Binary JSON) ───────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('BSON document (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const bsonf = await frameOf('iframe.fv-preview-frame');
  await bsonf.waitForSelector('.badge-bson', { timeout: 8000 });
  const bsonTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (bsonTypeId === 'bson') pass('.bson detected as bson type'); else fail('bson typeId: ' + bsonTypeId);
  const bsonText = await bsonf.$eval('body', (el) => el.textContent);
  if (/BSON/i.test(bsonText)) pass('BSON badge shown'); else fail('bson badge: ' + bsonText.slice(0, 300));
  if (/name|Alice|role/i.test(bsonText)) pass('BSON fields rendered'); else fail('bson fields: ' + bsonText.slice(0, 300));

  // ── dBase DBF ─────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dBase DBF database (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const dbff = await frameOf('iframe.fv-preview-frame');
  await dbff.waitForSelector('.badge-dbf', { timeout: 8000 });
  const dbfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dbfTypeId === 'dbf') pass('.dbf detected as dbf type'); else fail('dbf typeId: ' + dbfTypeId);
  const dbfText = await dbff.$eval('body', (el) => el.textContent);
  if (/DBF|dBase/i.test(dbfText)) pass('DBF badge shown'); else fail('dbf badge: ' + dbfText.slice(0, 300));
  if (/NAME|CITY|Alice/i.test(dbfText)) pass('DBF fields and records shown'); else fail('dbf fields: ' + dbfText.slice(0, 300));

  // ── MATLAB MAT-file ───────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('MATLAB MAT-file (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const matf = await frameOf('iframe.fv-preview-frame');
  await matf.waitForSelector('.badge-mat', { timeout: 8000 });
  const matTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (matTypeId === 'mat') pass('.mat detected as mat type'); else fail('mat typeId: ' + matTypeId);
  const matText = await matf.$eval('body', (el) => el.textContent);
  if (/MAT|MATLAB/i.test(matText)) pass('MAT badge shown'); else fail('mat badge: ' + matText.slice(0, 300));
  if (/pi_vals|counts|greeting/i.test(matText)) pass('MAT variables shown'); else fail('mat vars: ' + matText.slice(0, 300));

  // ── FBX 3D Animation ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('FBX 3D animation (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const fbxf = await frameOf('iframe.fv-preview-frame');
  await fbxf.waitForSelector('.badge-fbx', { timeout: 8000 });
  const fbxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fbxTypeId === 'fbx') pass('.fbx detected as fbx type'); else fail('fbx typeId: ' + fbxTypeId);
  const fbxText = await fbxf.$eval('body', (el) => el.textContent);
  if (/FBX/i.test(fbxText)) pass('FBX badge shown'); else fail('fbx badge: ' + fbxText.slice(0, 300));
  if (/7400|7\.4|FBXHeader/i.test(fbxText)) pass('FBX version and nodes shown'); else fail('fbx nodes: ' + fbxText.slice(0, 300));

  // ── Blender 3D Scene ──────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Blender 3D scene (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const blendf = await frameOf('iframe.fv-preview-frame');
  await blendf.waitForSelector('.badge-blend', { timeout: 8000 });
  const blendTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (blendTypeId === 'blend') pass('.blend detected as blend type'); else fail('blend typeId: ' + blendTypeId);
  const blendText = await blendf.$eval('body', (el) => el.textContent);
  if (/Blender/i.test(blendText)) pass('Blender badge shown'); else fail('blend badge: ' + blendText.slice(0, 300));
  if (/4\.2|420|version/i.test(blendText)) pass('Blender version shown'); else fail('blend version: ' + blendText.slice(0, 300));

  // ── STEP CAD Exchange ─────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('STEP CAD Exchange file (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const stepf = await frameOf('iframe.fv-preview-frame');
  await stepf.waitForSelector('.badge-step', { timeout: 8000 });
  const stepTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (stepTypeId === 'step') pass('.stp detected as step type'); else fail('step typeId: ' + stepTypeId);
  const stepText = await stepf.$eval('body', (el) => el.textContent);
  if (/STEP/i.test(stepText)) pass('STEP badge shown'); else fail('step badge: ' + stepText.slice(0, 300));
  if (/AP214|schema/i.test(stepText)) pass('STEP schema shown'); else fail('step schema: ' + stepText.slice(0, 300));

  // ── AutoCAD DWG ───────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('AutoCAD DWG drawing (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const dwgf = await frameOf('iframe.fv-preview-frame');
  await dwgf.waitForSelector('.badge-dwg', { timeout: 8000 });
  const dwgTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (dwgTypeId === 'dwg') pass('.dwg detected as dwg type'); else fail('dwg typeId: ' + dwgTypeId);
  const dwgText = await dwgf.$eval('body', (el) => el.textContent);
  if (/DWG|AutoCAD/i.test(dwgText)) pass('DWG badge shown'); else fail('dwg badge: ' + dwgText.slice(0, 300));
  if (/AC1015|2000/i.test(dwgText)) pass('DWG version info shown'); else fail('dwg version: ' + dwgText.slice(0, 300));

  // ── OpenEXR ───────────────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('OpenEXR HDR image (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const exrf = await frameOf('iframe.fv-preview-frame');
  await exrf.waitForSelector('.badge-exr', { timeout: 8000 });
  const exrTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (exrTypeId === 'exr') pass('.exr detected as exr type'); else fail('exr typeId: ' + exrTypeId);
  const exrText = await exrf.$eval('body', (el) => el.textContent);
  if (/OpenEXR/i.test(exrText)) pass('OpenEXR badge shown'); else fail('exr badge: ' + exrText.slice(0, 300));
  if (/compression|window|scanline/i.test(exrText)) pass('EXR header attributes shown'); else fail('exr attrs: ' + exrText.slice(0, 300));

  // ── HDF5 Scientific Data ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('HDF5 Scientific Dataset (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hdf5f = await frameOf('iframe.fv-preview-frame');
  await hdf5f.waitForSelector('.badge-hdf5', { timeout: 8000 });
  const hdf5TypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (hdf5TypeId === 'hdf5') pass('.h5 detected as hdf5 type'); else fail('hdf5 typeId: ' + hdf5TypeId);
  const hdf5Text = await hdf5f.$eval('body', (el) => el.textContent);
  if (/HDF5/i.test(hdf5Text)) pass('HDF5 badge shown'); else fail('hdf5 badge: ' + hdf5Text.slice(0, 300));
  if (/Superblock/i.test(hdf5Text)) pass('HDF5 superblock info shown'); else fail('hdf5 superblock: ' + hdf5Text.slice(0, 300));

  // ── NIfTI Neuroimaging ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('NIfTI neuroimaging (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const niftif = await frameOf('iframe.fv-preview-frame');
  await niftif.waitForSelector('.badge-nifti', { timeout: 8000 });
  const niftiTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (niftiTypeId === 'nifti') pass('.nii detected as nifti type'); else fail('nifti typeId: ' + niftiTypeId);
  const niftiText = await niftif.$eval('body', (el) => el.textContent);
  if (/NIfTI/i.test(niftiText)) pass('NIfTI badge shown'); else fail('nifti badge: ' + niftiText.slice(0, 300));
  if (/3D|64.*64|dimensions/i.test(niftiText)) pass('NIfTI dimension info shown'); else fail('nifti dims: ' + niftiText.slice(0, 300));

  // ── Python Bytecode (.pyc) ────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Python bytecode (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const pycf = await frameOf('iframe.fv-preview-frame');
  await pycf.waitForSelector('.badge-pyc', { timeout: 8000 });
  const pycTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (pycTypeId === 'pyc') pass('.pyc detected as pyc type'); else fail('pyc typeId: ' + pycTypeId);
  const pycText = await pycf.$eval('body', (el) => el.textContent);
  if (/PYC|Python/i.test(pycText)) pass('PYC badge shown'); else fail('pyc badge: ' + pycText.slice(0, 300));
  if (/3\.11|3495/i.test(pycText)) pass('Python version shown'); else fail('pyc version: ' + pycText.slice(0, 300));

  // ── LMMS Music Project ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('LMMS music project (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const lmmsf = await frameOf('iframe.fv-preview-frame');
  await lmmsf.waitForSelector('.badge-lmms', { timeout: 8000 });
  const lmmsTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (lmmsTypeId === 'lmms') pass('.mmp detected as lmms type'); else fail('lmms typeId: ' + lmmsTypeId);
  const lmmsText = await lmmsf.$eval('body', (el) => el.textContent);
  if (/LMMS/i.test(lmmsText)) pass('LMMS badge shown'); else fail('lmms badge: ' + lmmsText.slice(0, 300));
  if (/128|BPM|Demo Beat/i.test(lmmsText)) pass('LMMS BPM or name shown'); else fail('lmms bpm: ' + lmmsText.slice(0, 300));

  // ── Fusion 360 Design (.f3d) ──────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Fusion 360 design (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const f3df = await frameOf('iframe.fv-preview-frame');
  await f3df.waitForSelector('.badge-f3d', { timeout: 8000 });
  const f3dTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (f3dTypeId === 'f3d') pass('.f3d detected as f3d type'); else fail('f3d typeId: ' + f3dTypeId);
  const f3dText = await f3df.$eval('body', (el) => el.textContent);
  if (/F3D|Fusion/i.test(f3dText)) pass('F3D badge shown'); else fail('f3d badge: ' + f3dText.slice(0, 300));
  if (/Sample Widget|manifest|archive/i.test(f3dText)) pass('F3D contents shown'); else fail('f3d contents: ' + f3dText.slice(0, 300));

  // ── Debian Package (.deb) ─────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Debian package (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const debf = await frameOf('iframe.fv-preview-frame');
  await debf.waitForSelector('.badge-deb', { timeout: 8000 });
  const debTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (debTypeId === 'deb') pass('.deb detected as deb type'); else fail('deb typeId: ' + debTypeId);
  const debText = await debf.$eval('body', (el) => el.textContent);
  if (/DEB|Debian/i.test(debText)) pass('DEB badge shown'); else fail('deb badge: ' + debText.slice(0, 300));
  if (/hello-world|Package|debian-binary/i.test(debText)) pass('DEB package info shown'); else fail('deb pkg: ' + debText.slice(0, 300));

  // ── QIF Financial Data ────────────────────────────────────────────────────────
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('QIF financial data (demo)');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const qiff = await frameOf('iframe.fv-preview-frame');
  await qiff.waitForSelector('.badge-qif', { timeout: 8000 });
  const qifTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (qifTypeId === 'qif') pass('.qif detected as qif type'); else fail('qif typeId: ' + qifTypeId);
  const qifText = await qiff.$eval('body', (el) => el.textContent);
  if (/QIF|Quicken/i.test(qifText)) pass('QIF badge shown'); else fail('qif badge: ' + qifText.slice(0, 300));
  if (/transaction|Bank|Grocery/i.test(qifText)) pass('QIF transactions shown'); else fail('qif txns: ' + qifText.slice(0, 300));
}
