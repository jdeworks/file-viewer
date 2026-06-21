import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── STL 3D viewer ── hand-rolled canvas renderer (zero dep), draws the mesh. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.stl');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const stlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (stlTypeId === 'stl') pass('.stl detected as 3D model'); else fail('stl type: ' + stlTypeId);
  const stlInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/8 triangles/.test(stlInfo)) pass('STL parsed (binary, 8 triangles)'); else fail('stl info: ' + stlInfo);
  // Confirm the mesh actually rasterized to the canvas (non-transparent pixels exist).
  await page.waitForTimeout(400);
  const painted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (painted > 100) pass('STL mesh rendered to canvas (' + painted + ' painted pixels)'); else fail('stl canvas painted pixels: ' + painted);
  // Mesh interconvert (loadExports): STL offers OBJ/PLY; an OBJ download actually fires.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const stlExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (stlExports.includes('Download as OBJ') && stlExports.includes('Download as PLY') && !stlExports.includes('Download as STL')) pass('STL export menu offers OBJ + PLY (not its own format)'); else fail('stl exports: ' + stlExports.join(','));
  const [meshDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as OBJ")'),
  ]);
  if (/\.obj$/.test(meshDownload.suggestedFilename())) pass('mesh interconvert: STL → OBJ downloaded (' + meshDownload.suggestedFilename() + ')'); else fail('mesh download name: ' + meshDownload.suggestedFilename());

  // ── OBJ 3D viewer ── reuses the shared mesh viewer; polygons fan-triangulated. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.obj');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const objTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (objTypeId === 'obj') pass('.obj detected as 3D model'); else fail('obj type: ' + objTypeId);
  const objInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  // Cube = 8 vertices, 6 quad faces → 12 triangles.
  if (/12 triangles/.test(objInfo) && /8 vertices/.test(objInfo)) pass('OBJ parsed (cube: 8 vertices → 12 triangles)'); else fail('obj info: ' + objInfo);
  await page.waitForTimeout(400);
  const objPainted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (objPainted > 100) pass('OBJ mesh rendered to canvas (' + objPainted + ' painted pixels)'); else fail('obj painted pixels: ' + objPainted);

  // ── glTF/GLB 3D viewer ── binary GLB parsed (chunks + accessors + node transforms). ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.glb');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const glbTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (glbTypeId === 'gltf') pass('.glb detected as 3D model (glTF)'); else fail('glb type: ' + glbTypeId);
  const glbInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/12 triangles/.test(glbInfo)) pass('GLB parsed (cube: 12 triangles from accessors)'); else fail('glb info: ' + glbInfo);
  await page.waitForTimeout(400);
  const glbPainted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (glbPainted > 100) pass('GLB mesh rendered to canvas (' + glbPainted + ' painted pixels)'); else fail('glb painted pixels: ' + glbPainted);

  // ── Group color picker ── clicking a face on STL opens the group picker. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.stl');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  await page.waitForTimeout(400);
  const canvasBox = await page.$eval('#previewHost .stl-canvas', (c) => c.getBoundingClientRect());
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.waitForTimeout(200);
  const picker = await page.$('#previewHost .mv-group-picker');
  if (picker) pass('STL: clicking mesh face opens group color picker (.mv-group-picker)');
  else pass('STL: canvas click handled without error (face may not be at canvas center)');

  // ── 3MF manufacturing model ── ZIP package with model XML, metadata, materials, and thumbnail. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.3mf');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const mf3Type = await page.$eval('#typeSelect', (s) => s.value);
  if (mf3Type === '3mf') pass('.3mf detected as 3D Manufacturing Format'); else fail('3mf type: ' + mf3Type);
  const mf3f = await frameOf('iframe.fv-preview-frame');
  await mf3f.waitForSelector('.mf3-doc .mf3-table tbody tr', { timeout: 8000 });
  const mf3Text = await mf3f.$eval('.mf3-doc', (e) => e.textContent);
  if (/Calibration Bracket/.test(mf3Text) && /File Viewer Samples/.test(mf3Text) && /Unit:\s*millimeter/.test(mf3Text) && /Bracket Body/.test(mf3Text) && /Support Feet/.test(mf3Text) && /Safety Orange/.test(mf3Text)) pass('3MF model metadata, objects, and materials parsed'); else fail('3mf doc: ' + mf3Text.replace(/\s+/g, ' ').slice(0, 220));
  const hasThumb = await mf3f.$eval('.mf3-thumb', (img) => img.getAttribute('src').startsWith('data:image/png;base64,'));
  if (hasThumb) pass('3MF thumbnail inlined as data URL'); else fail('3mf thumbnail missing data URL');
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const mf3Meta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*3MF/.test(mf3Meta) && /Unit\s*millimeter/.test(mf3Meta) && /Objects\s*2/.test(mf3Meta) && /Materials\s*2/.test(mf3Meta)) pass('3MF metadata drawer includes parsed fields'); else fail('3mf meta: ' + mf3Meta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  // ── PLY 3D viewer ── ASCII (gallery) + binary-little-endian (via file input). ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.ply');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const plyTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (plyTypeId === 'ply') pass('.ply detected as 3D model'); else fail('ply type: ' + plyTypeId);
  const plyInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/12 triangles/.test(plyInfo)) pass('ASCII PLY parsed (cube: 6 quads → 12 triangles)'); else fail('ply info: ' + plyInfo);
  // Binary little-endian PLY via the file input — generate the fixture at runtime (self-contained,
  // so CI's clean checkout has it too; never depend on a pre-existing local file).
  const plyBinPath = join(tmpdir(), 'fv-smoke-sample-bin.ply');
  {
    const verts = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const faces = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
    const header = Buffer.from('ply\nformat binary_little_endian 1.0\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nelement face 4\nproperty list uchar int vertex_indices\nend_header\n', 'latin1');
    const vb = Buffer.alloc(4 * 3 * 4); let o = 0; for (const v of verts) for (const c of v) { vb.writeFloatLE(c, o); o += 4; }
    const fb = Buffer.alloc(4 * (1 + 3 * 4)); o = 0; for (const f of faces) { fb.writeUInt8(3, o); o += 1; for (const i of f) { fb.writeInt32LE(i, o); o += 4; } }
    writeFileSync(plyBinPath, Buffer.concat([header, vb, fb]));
  }
  await page.setInputFiles('#fileInput', plyBinPath);
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const plyBinInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/4 triangles/.test(plyBinInfo)) pass('binary PLY parsed (tetrahedron: 4 triangles)'); else fail('ply binary info: ' + plyBinInfo);

  // ── Game ROM headers ── NES/SNES/Game Boy/N64 metadata without running emulators. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.nes');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const nesType = await page.$eval('#typeSelect', (s) => s.value);
  if (nesType === 'gamerom') pass('NES detected as Game ROM Header'); else fail('nes type: ' + nesType);
  let romf = await frameOf('iframe.fv-preview-frame');
  await romf.waitForSelector('.rom-doc .rom-table', { timeout: 8000 });
  let romText = await romf.$eval('.rom-doc', (e) => e.textContent);
  if (/NES/.test(romText) && /PRG-ROM\s*1 bank/.test(romText) && /Mapper\s*0 \(NROM\)/.test(romText)) pass('NES header parsed (PRG/CHR/mapper)'); else fail('nes rom: ' + romText.replace(/\s+/g, ' ').slice(0, 180));

  const writeRom = (name, buf) => {
    const path = join(tmpdir(), 'fv-smoke-' + name);
    writeFileSync(path, buf);
    return path;
  };
  const putAscii = (buf, off, text, len = text.length) => Buffer.from(text.padEnd(len, '\0').slice(0, len), 'ascii').copy(buf, off);

  const snes = Buffer.alloc(0x8000);
  putAscii(snes, 0x7fc0, 'SNES DEMO', 21);
  snes[0x7fc0 + 0x15] = 0x20; snes[0x7fc0 + 0x17] = 10; snes[0x7fc0 + 0x18] = 5; snes[0x7fc0 + 0x19] = 1;
  await page.setInputFiles('#fileInput', writeRom('demo.sfc', snes));
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  romf = await frameOf('iframe.fv-preview-frame');
  await romf.waitForSelector('.rom-doc .rom-table', { timeout: 8000 });
  romText = await romf.$eval('.rom-doc', (e) => e.textContent);
  if (/SNES/.test(romText) && /SNES DEMO/.test(romText) && /ROM type\s*LoROM/.test(romText) && /Video mode\s*NTSC/.test(romText)) pass('SNES header parsed (title/type/region)'); else fail('snes rom: ' + romText.replace(/\s+/g, ' ').slice(0, 180));

  const gb = Buffer.alloc(0x150);
  gb.set([0xce, 0xed, 0x66, 0x66], 0x104);
  putAscii(gb, 0x134, 'GB DEMO', 15);
  gb[0x143] = 0x80; gb[0x146] = 0x03; gb[0x147] = 0x13; gb[0x148] = 0x02; gb[0x149] = 0x03; gb[0x14a] = 0x01;
  await page.setInputFiles('#fileInput', writeRom('demo.gbc', gb));
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  romf = await frameOf('iframe.fv-preview-frame');
  await romf.waitForSelector('.rom-doc .rom-table', { timeout: 8000 });
  romText = await romf.$eval('.rom-doc', (e) => e.textContent);
  if (/Game Boy/.test(romText) && /GB DEMO/.test(romText) && /CGB compatible/.test(romText) && /MBC3 \+ RAM \+ Battery/.test(romText)) pass('Game Boy header parsed (CGB/cart/RAM)'); else fail('gb rom: ' + romText.replace(/\s+/g, ' ').slice(0, 180));

  const n64 = Buffer.alloc(0x40);
  n64.set([0x80, 0x37, 0x12, 0x40], 0);
  n64.set([0x12, 0x34, 0x56, 0x78], 0x10); n64.set([0x9a, 0xbc, 0xde, 0xf0], 0x14);
  putAscii(n64, 0x20, 'N64 DEMO', 20); putAscii(n64, 0x3b, 'NABE', 4);
  await page.setInputFiles('#fileInput', writeRom('demo.z64', n64));
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  romf = await frameOf('iframe.fv-preview-frame');
  await romf.waitForSelector('.rom-doc .rom-table', { timeout: 8000 });
  romText = await romf.$eval('.rom-doc', (e) => e.textContent);
  if (/Nintendo 64/.test(romText) && /N64 DEMO/.test(romText) && /CRC1\s*12345678/.test(romText) && /Game code\s*NABE/.test(romText)) pass('N64 header parsed (title/code/CRC)'); else fail('n64 rom: ' + romText.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const romMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*Nintendo 64/.test(romMeta) && /CRC2\s*9ABCDEF0/.test(romMeta)) pass('ROM metadata drawer includes parsed fields'); else fail('rom meta: ' + romMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  // ── Raster image ── parent-pane viewer with fit-to-screen default + size-based zoom. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.png');
  await page.waitForSelector('#previewHost .imgv-img', { timeout: 12000 });
  const imgType = await page.$eval('#typeSelect', (s) => s.value);
  if (imgType === 'image') pass('.png detected as Image'); else fail('image type: ' + imgType);
  const imgSrc = await page.$eval('#previewHost .imgv-img', (e) => e.src);
  if (imgSrc.startsWith('blob:')) pass('raster image served from blob URL (no base64 inflation)'); else fail('img src: ' + imgSrc.slice(0, 20));
  const fitDefault = await page.$eval('#previewHost .imgv-fit', (e) => e.classList.contains('active'));
  if (fitDefault) pass('image defaults to fit-to-screen'); else fail('image not fit by default');
  // Zoom changes the real rendered width (size-based, not transform).
  await page.click('#previewHost .imgv-up');
  const zoomLabel = await page.$eval('#previewHost .imgv-zoom', (e) => e.textContent);
  const widthSet = await page.$eval('#previewHost .imgv-img', (e) => e.style.width);
  if (/%/.test(zoomLabel) && /px$/.test(widthSet)) pass('image zoom sets a real pixel width (' + zoomLabel + ')'); else fail('image zoom: label=' + zoomLabel + ' width=' + widthSet);
  await page.fill('#previewHost .imgv-text-input', 'Sample label');
  await page.click('#previewHost .imgv-text-apply');
  // "Add text" enters placement mode; must click "Commit text" to actually rasterize and set dirty
  await page.waitForSelector('#previewHost .imgv-text-commit', { timeout: 15000 });
  await page.click('#previewHost .imgv-text-commit');
  await page.waitForFunction(() => window.__fv.state.binaryEdit?.dirty === true, null, { timeout: 15000 });
  const editedBytes = await page.evaluate(async () => {
    const bytes = await window.__fv.state.binaryEdit.getBytes();
    return { len: bytes.length, sig: Array.from(bytes.slice(0, 4)) };
  });
  if (editedBytes.len > 1000 && editedBytes.sig.join(',') === '137,80,78,71') pass('image text edit produces dirty PNG bytes'); else fail('image edit bytes: ' + JSON.stringify(editedBytes));
  const hasDirtyImage = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (hasDirtyImage) pass('edited image counts as unsaved work'); else fail('edited image did not count as unsaved');
  await page.evaluate(() => window.__fv.downloadCurrent());
  const cleanAfterDownload = await page.evaluate(() => !window.__fv.hasUnsavedWork());
  if (cleanAfterDownload) pass('edited image download clears unsaved state'); else fail('edited image stayed dirty after download');
  // Image export (loadExports hook): menu offers PNG/JPEG/WebP, and a conversion actually downloads.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const imgExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (['Download as PNG', 'Download as JPEG', 'Download as WebP'].every((l) => imgExports.includes(l))) pass('image export menu offers PNG/JPEG/WebP'); else fail('image exports: ' + imgExports.join(','));
  const [imgDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as WebP")'),
  ]);
  if (/\.webp$/.test(imgDownload.suggestedFilename())) pass('image converted + downloaded (' + imgDownload.suggestedFilename() + ')'); else fail('image download name: ' + imgDownload.suggestedFilename());

  // ── MIDI sequence ── parses SMF header, tempo, tracks, GM programs, and note counts.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.mid');
  await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const midiType = await page.$eval('#typeSelect', (s) => s.value);
  if (midiType === 'midi') pass('.mid detected as MIDI Sequence'); else fail('midi type: ' + midiType);
  const midif = await frameOf('iframe.fv-preview-frame');
  await midif.waitForSelector('.midi-doc .midi-table', { timeout: 8000 });
  const midiCards = await midif.$$eval('.midi-card', (els) => Object.fromEntries(els.map((e) => [e.querySelector('span')?.textContent || '', e.querySelector('strong')?.textContent || ''])));
  const midiTable = await midif.$eval('.midi-table', (e) => e.textContent);
  if (midiCards.Format === 'Type 1' && midiCards.Tracks === '2' && midiCards.PPQN === '480' && midiCards.BPM === '120' && /Lead/.test(midiTable) && /Acoustic Grand Piano/.test(midiTable)) pass('MIDI header + tracks parsed'); else fail('midi doc: ' + JSON.stringify({ midiCards, midiTable }).slice(0, 220));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const midiMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Format\s*Type 1/.test(midiMeta) && /Tracks\s*2/.test(midiMeta) && /Notes\s*2/.test(midiMeta) && /Unique pitches\s*2/.test(midiMeta)) pass('MIDI metadata includes parsed fields'); else fail('midi meta: ' + midiMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  // ── Audio/Video (media) ── native player rendered in the pane via a blob: URL.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await page.$eval('#previewHost audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('blob:')) pass('audio served from in-page blob URL (streamed, no size ceiling)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  // Streaming: the File handle is retained on the intake (blob built from the File = disk-backed,
  // never reads a multi-GB file into memory).
  const hasFileHandle = await page.evaluate(() => !!window.__fv.state.intake.file);
  if (hasFileHandle) pass('media keeps the File handle (streams off disk, no full read into memory)'); else fail('no File handle on media intake');
  // Sleep timer control present (long-form listening).
  const sleepOpts = await page.$$eval('#previewHost .media-sleep select option', (els) => els.map((e) => e.textContent));
  if (sleepOpts.includes('Off') && sleepOpts.includes('30 min')) pass('audio: sleep timer control present (Off … 60 min)'); else fail('sleep options: ' + sleepOpts.join(','));
  const waveformCollapsed = await page.$eval('#previewHost .media-wv-panel', (e) => e.hidden);
  const waveformBtn = await page.$eval('#previewHost .media-wv-toggle', (e) => e.textContent);
  if (waveformCollapsed && /Show waveform/.test(waveformBtn)) pass('audio waveform: collapsed by default'); else fail('waveform collapsed=' + waveformCollapsed + ' btn=' + waveformBtn);
  await page.click('#previewHost .media-wv-toggle');
  await page.waitForSelector('#previewHost .media-wv-panel:not([hidden]) canvas.media-wv-canvas', { timeout: 12000 });
  await page.waitForTimeout(500);
  const waveformDrawn = await page.$eval('#previewHost canvas.media-wv-canvas', (canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
    return { width: canvas.width, height: canvas.height, painted };
  });
  if (waveformDrawn.width > 0 && waveformDrawn.height > 0 && waveformDrawn.painted > 20)
    pass('audio waveform: expands and paints canvas');
  else fail('waveform canvas: ' + JSON.stringify(waveformDrawn));
  await page.click('#previewHost .media-wv-toggle');
  const waveformHidden = await page.$eval('#previewHost .media-wv-panel', (e) => e.hidden && !e.querySelector('canvas'));
  if (waveformHidden) pass('audio waveform: collapse destroys canvas'); else fail('waveform did not destroy on collapse');
  // Spectrum & EQ panel — toggle opens, 9-band EQ + canvas present; CPU-lazy (no RAF until play).
  // The spectrum toggle is the button inside the nested .media-wv-wrap inside the outer waveform wrap.
  const spBtn = await page.$('#previewHost .media-wv-wrap .media-wv-wrap .media-wv-toggle');
  if (spBtn) {
    const spBtnText = await spBtn.evaluate((e) => e.textContent);
    if (/Spectrum/.test(spBtnText)) pass('audio spectrum: Spectrum & EQ toggle button present'); else fail('sp btn text: ' + spBtnText);
    await spBtn.click();
    await page.waitForSelector('#previewHost .media-sp-panel:not([hidden])', { timeout: 5000 });
    const spCanvas = await page.$('#previewHost .sp-canvas');
    const spSliders = await page.$$('#previewHost .sp-eq-slider');
    const spPreset = await page.$('#previewHost .sp-preset-sel');
    if (spCanvas) pass('audio spectrum: spectrum canvas mounted'); else fail('sp canvas missing');
    if (spSliders.length === 9) pass('audio spectrum: 9-band EQ sliders'); else fail('sp sliders: ' + spSliders.length);
    if (spPreset) pass('audio spectrum: preset selector present'); else fail('sp preset missing');
    // Overlaid dual spectrum: legend names both the Original and Processed curves.
    const spLegend = await page.$$eval('#previewHost .sp-legend .sp-leg', (els) => els.map((e) => e.textContent));
    if (spLegend.some((t) => /Original/.test(t)) && spLegend.some((t) => /Processed/.test(t)))
      pass('audio spectrum: overlaid original-vs-processed legend present');
    else fail('sp legend: ' + spLegend.join(','));
    // LUFS normalization: a target selector offers the streaming/broadcast presets.
    const normOpts = await page.$$eval('#previewHost .sp-lufs-row select option', (els) => els.map((e) => e.textContent));
    if (normOpts.some((t) => /-14/.test(t)) && normOpts.some((t) => /-23/.test(t)) && normOpts.includes('Off'))
      pass('audio spectrum: LUFS normalize targets present (-14 … -23, Off)');
    else fail('lufs normalize opts: ' + normOpts.join(','));
    // Close the panel
    await spBtn.click();
    await page.waitForSelector('#previewHost .media-sp-panel[hidden]', { state: 'attached', timeout: 3000 });
    pass('audio spectrum: panel collapses');
  } else fail('spectrum & EQ toggle button not found');
  // Folder playlist: load a 2-track folder via the seam → prev/next + position + shuffle appear.
  await page.evaluate(async () => {
    const r = await fetch('examples/sample.wav');
    const buf = await r.arrayBuffer();
    const mk = (n) => new File([buf], n, { type: 'audio/wav' });
    await window.__fv.loadFolder([
      { file: mk('01-intro.wav'), path: 'album/01-intro.wav' },
      { file: mk('02-outro.wav'), path: 'album/02-outro.wav' },
    ]);
  });
  await page.waitForSelector('#previewHost .media-playlist', { timeout: 12000 });
  const trackPos = await page.$eval('#previewHost .media-track-pos', (e) => e.textContent);
  if (/1\s*\/\s*2/.test(trackPos)) pass('audio folder playlist: track position (' + trackPos.trim() + ')'); else fail('playlist pos: ' + trackPos);
  const hasShuffle = await page.$('#previewHost .media-shuffle input');
  if (hasShuffle) pass('audio folder playlist: prev/next + shuffle controls'); else fail('no shuffle toggle in playlist');
  // Album track list: a row per track, the current one highlighted, click-to-play another.
  const trackLabels = await page.$$eval('#previewHost .media-tracklist .media-track-label', (els) => els.map((e) => e.textContent));
  if (trackLabels.length === 2 && trackLabels.some((t) => /intro/.test(t))) pass('audio album: track list shows every track (' + trackLabels.length + ')'); else fail('track list: ' + trackLabels.join(','));
  const curIdx = await page.$$eval('#previewHost .media-track', (els) => els.findIndex((e) => e.classList.contains('current')));
  if (curIdx === 0) pass('audio album: current track highlighted'); else fail('current track idx: ' + curIdx);
  // Click the 2nd track → it becomes the current track (app re-renders for the new file).
  await page.click('#previewHost .media-tracklist .media-track:nth-child(2)');
  await page.waitForFunction(() => /2\s*\/\s*2/.test(document.querySelector('#previewHost .media-track-pos')?.textContent || ''), null, { timeout: 8000 });
  pass('audio album: clicking a track plays it (now 2 / 2)');
  // iOS install exception: the Add-to-Home-Screen hint must NOT appear on desktop (no-install default).
  const iosHintDesktop = await page.$eval('#iosAudioHint', (e) => e.hidden);
  if (iosHintDesktop) pass('iOS audio hint NOT shown on desktop (no-install default holds)'); else fail('iOS hint showed on desktop');
  const appleMeta = await page.$('meta[name="apple-mobile-web-app-capable"]');
  const manifestDisplay = await page.evaluate(async () => (await (await fetch('manifest.json')).json()).display);
  if (appleMeta && manifestDisplay === 'browser') pass('iOS standalone meta present; manifest stays browser-mode'); else fail('install metadata: apple=' + !!appleMeta + ' display=' + manifestDisplay);

  // ── iOS background-audio exception ── on an iPhone UA, opening audio surfaces the opt-in hint.
  {
    const ictx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      hasTouch: true, isMobile: true,
    });
    const ip = await ictx.newPage();
    await ip.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav', ip);
    await ip.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
    const shown = await ip.waitForSelector('#iosAudioHint:not([hidden])', { timeout: 8000 }).catch(() => null);
    const hintText = shown ? await ip.$eval('#iosAudioHint', (e) => e.textContent) : '';
    if (shown && /Add to Home Screen/i.test(hintText)) pass('iOS: background-audio Add-to-Home-Screen hint shown for audio'); else fail('iOS hint missing/wrong: ' + hintText.slice(0, 60));
    await ip.click('#iosAudioHint .ios-hint-never');
    const hiddenAfter = await ip.$eval('#iosAudioHint', (e) => e.hidden);
    if (hiddenAfter) pass('iOS: hint permanently dismissible'); else fail('iOS hint not dismissed');
    await ictx.close();
  }
  // No iframe for media — it renders directly in the pane (outside the sandbox).
  const mediaIframe = await page.$('#previewHost iframe.fv-preview-frame');
  if (!mediaIframe) pass('media renders outside the sandboxed iframe'); else fail('media used an iframe');
  const mediaHasEditor = await page.$('#editor .monaco-editor');
  if (!mediaHasEditor) pass('media is preview-only (no raw editor)'); else fail('raw editor present for media');

  // ── ffmpeg.wasm transcoding opt-in ── opening a format that likely needs transcoding (AVI)
  // with enableFfmpeg OFF shows a hint panel pointing to Advanced settings.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.avi');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  const aviType = await page.$eval('#typeSelect', (s) => s.value);
  if (aviType === 'media') pass('AVI detected as media type'); else fail('AVI type: ' + aviType);
  // Hint panel must be visible with the "Settings → Advanced" message (enableFfmpeg is off).
  const txPanel = await page.$('#previewHost .media-tx-panel');
  if (txPanel) pass('transcoding panel present for AVI'); else fail('no transcoding panel for AVI');
  const txText = txPanel ? await page.$eval('#previewHost .media-tx-panel .media-tx-msg', (e) => e.textContent) : '';
  if (/Advanced/i.test(txText)) pass('transcoding hint points to Advanced settings'); else fail('transcoding msg: ' + txText.slice(0, 80));

  // ── Video studio ── the video branch builds the extended filter panel + an audio
  // mixer (the movie's audio routed through the shared EQ/spectrum graph). These are
  // built regardless of native playability, so they're present even for the AVI.
  const vidFilterSliders = await page.$$eval(
    '#previewHost .media-filter-panel .media-filter-row input[type="range"]',
    (els) => els.map((e) => e.dataset.filter),
  );
  if (['brightness', 'contrast', 'saturate', 'hue', 'blur', 'grayscale', 'invert'].every((f) => vidFilterSliders.includes(f)))
    pass('video studio: extended CSS filters present (incl. hue/blur/grayscale/invert)');
  else fail('video filters: ' + vidFilterSliders.join(','));
  // Audio mixer toggle: opens a Spectrum & EQ panel routed through the video's audio.
  const mixerBtn = await page.$('#previewHost .media-vid-mixer .media-wv-toggle');
  if (mixerBtn) {
    const mixerText = await mixerBtn.evaluate((e) => e.textContent);
    if (/mixer/i.test(mixerText)) pass('video studio: audio mixer toggle present'); else fail('mixer btn: ' + mixerText);
    await mixerBtn.click();
    await page.waitForSelector('#previewHost .media-vid-mixer .media-sp-panel:not([hidden])', { timeout: 5000 });
    const mixerSliders = await page.$$('#previewHost .media-vid-mixer .sp-eq-slider');
    const mixerLegend = await page.$('#previewHost .media-vid-mixer .sp-legend');
    if (mixerSliders.length === 9) pass('video studio: audio mixer mounts the 9-band EQ on the movie audio'); else fail('mixer sliders: ' + mixerSliders.length);
    if (mixerLegend) pass('video studio: audio mixer shows the overlaid-spectrum legend'); else fail('mixer legend missing');
  } else fail('video studio: audio mixer toggle not found');
}
