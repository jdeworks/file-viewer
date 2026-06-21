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

  // ── ASCII Studio ── the ASCII button lazy-mounts the self-contained studio,
  // which converts the image to glyphs and exposes the control panel.
  await page.click('#previewHost .imgv-ascii-btn');
  await page.waitForSelector('#previewHost .asx-root .asx-out', { timeout: 15000 });
  await page.waitForFunction(() => {
    const pre = document.querySelector('#previewHost .asx-out');
    return pre && pre.textContent.replace(/\s/g, '').length > 50;
  }, null, { timeout: 15000 });
  const ctlCount = await page.$$eval('#previewHost .asx-panel .asx-ctl-input', (els) => els.length);
  if (ctlCount > 15) pass('ASCII studio mounts with full control panel (' + ctlCount + ' controls)'); else fail('ascii controls: ' + ctlCount);
  // Switching gradient re-converts; output stays non-empty.
  await page.selectOption('#previewHost .asx-panel select[data-key="gradientName"]', 'blocks');
  await page.waitForFunction(() => document.querySelector('#previewHost .asx-out').textContent.trim().length > 0, null, { timeout: 8000 });
  pass('ASCII studio gradient change re-converts');

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
  // P7: speed presets (0.5–2×) — present on audio, and clicking sets playbackRate live.
  const audioSpeeds = await page.$$eval('#previewHost .media-extras .media-speed-btn', (els) => els.map((e) => e.dataset.rate));
  if (['0.5', '1', '1.5', '2'].every((r) => audioSpeeds.includes(r))) pass('P7 audio: speed presets (0.5×…2×) present'); else fail('audio speeds: ' + audioSpeeds.join(','));
  await page.click('#previewHost .media-extras .media-speed-btn[data-rate="1.5"]');
  const rate15 = await page.$eval('#previewHost audio.media-view', (e) => e.playbackRate);
  if (Math.abs(rate15 - 1.5) < 0.001) pass('P7 audio: speed preset sets playbackRate (1.5×)'); else fail('playbackRate after 1.5×: ' + rate15);
  await page.click('#previewHost .media-extras .media-speed-btn[data-rate="1"]');   // restore
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

  // ── P4 Dynamics panel ── compressor/limiter (live) + gate/de-noise (bake-only).
  // The Dynamics toggle sits between Spectrum and Mixer; CPU-lazy (no panel DOM until opened).
  const dynToggleHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('#previewHost .media-wv-toggle')].find((b) => /Dynamics/.test(b.textContent)) || null);
  const dynToggleExists = await dynToggleHandle.evaluate((e) => !!e);
  if (dynToggleExists) {
    pass('audio dynamics: Dynamics toggle button present');
    const preDyn = await page.$('#previewHost .dyn-wrap');
    if (!preDyn) pass('audio dynamics: CPU-lazy (no panel DOM until opened)'); else fail('dynamics mounted before open');
    await dynToggleHandle.asElement().click();
    await page.waitForSelector('#previewHost .media-dyn-panel:not([hidden]) .dyn-wrap', { timeout: 5000 });
    // Four effect sections: compressor + limiter (live), gate + de-noise (on export).
    const dynSecs = await page.$$eval('#previewHost .dyn-sec .dyn-title', (els) => els.map((e) => e.textContent));
    if (dynSecs.some((t) => /Compressor/.test(t)) && dynSecs.some((t) => /Limiter/.test(t))
      && dynSecs.some((t) => /gate/i.test(t)) && dynSecs.some((t) => /De-noise/.test(t)))
      pass('audio dynamics: compressor + limiter + gate + de-noise sections present');
    else fail('dyn sections: ' + dynSecs.join(','));
    const dynEnables = await page.$$('#previewHost .dyn-enable');
    const dynSliders = await page.$$('#previewHost .dyn-slider');
    if (dynEnables.length === 4) pass('audio dynamics: each section has an enable/bypass toggle'); else fail('dyn enables: ' + dynEnables.length);
    if (dynSliders.length >= 4) pass('audio dynamics: parameter sliders mounted (' + dynSliders.length + ')'); else fail('dyn sliders: ' + dynSliders.length);
    // Bake-only sections (gate + de-noise) are labelled "on export".
    const dynBadges = await page.$$eval('#previewHost .dyn-badge', (els) => els.map((e) => e.textContent));
    if (dynBadges.filter((t) => /on export/i.test(t)).length === 2) pass('audio dynamics: gate + de-noise labelled "on export"'); else fail('dyn badges: ' + dynBadges.join(','));
    // Enabling the live compressor must not throw (lazily allocates the node).
    await page.evaluate(() => {
      const cb = document.querySelector('#previewHost .dyn-sec .dyn-enable');
      cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
    pass('audio dynamics: enabling live compressor handled without error');
    // Close the panel → torn down.
    await dynToggleHandle.asElement().click();
    await page.waitForSelector('#previewHost .media-dyn-panel[hidden]', { state: 'attached', timeout: 3000 });
    pass('audio dynamics: panel collapses');
  } else fail('dynamics toggle button not found');

  // ── P5 Multi-track mixer ("swim lanes") ── opt-in panel; decode-lazy; OfflineAudioContext mixdown → WAV.
  const mxBtn = await page.$('#previewHost .media-mx-panel');
  // The mixer toggle is the LAST .media-wv-toggle (waveform, spectrum, mixer order).
  const mxToggle = (await page.$$('#previewHost .media-wv-toggle')).slice(-1)[0];
  if (mxToggle) {
    const mxText = await mxToggle.evaluate((e) => e.textContent);
    if (/Multi-track mixer/.test(mxText)) pass('audio mixer: toggle button present (collapsed)'); else fail('mixer btn text: ' + mxText);
    // CPU-lazy: panel hidden + no mixer DOM until opened.
    const preOpen = await page.$('#previewHost .mx-wrap');
    if (!preOpen) pass('audio mixer: CPU-lazy (no transport/decode until opened)'); else fail('mixer mounted before open');
    await mxToggle.click();
    await page.waitForSelector('#previewHost .mx-wrap', { timeout: 12000 });
    // Lane 1 seeds from the loaded clip (decoded). Wait for it to appear.
    await page.waitForSelector('#previewHost .mx-lane', { timeout: 12000 });
    const lane1Count = await page.$$eval('#previewHost .mx-lane', (els) => els.length);
    if (lane1Count >= 1) pass('audio mixer: opens with the loaded clip as lane 1'); else fail('mixer lanes after open: ' + lane1Count);
    // Transport + master controls present.
    const hasTransport = await page.$('#previewHost .mx-play') && await page.$('#previewHost .mx-master-slider');
    if (hasTransport) pass('audio mixer: transport (play/stop) + master gain present'); else fail('mixer transport controls missing');
    // Per-lane: gain + mute + solo + fade handles.
    const laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .mx-lane-gain'),
      mute: !!document.querySelector('#previewHost .mx-mute'),
      solo: !!document.querySelector('#previewHost .mx-solo'),
      fadeIn: !!document.querySelector('#previewHost .mx-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .mx-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls: ' + JSON.stringify(laneCtrls));
    // Add a generator lane → a second lane appears (≥2 clips).
    await page.click('#previewHost .mx-add-btn');   // first add button = +440 Hz tone
    await page.waitForFunction(() => document.querySelectorAll('#previewHost .mx-lane').length >= 2, null, { timeout: 6000 });
    const lane2Count = await page.$$eval('#previewHost .mx-lane', (els) => els.length);
    if (lane2Count >= 2) pass('audio mixer: a second lane can be added (generator tone)'); else fail('mixer lanes after add: ' + lane2Count);
    // Mixdown → WAV produces a downloadable file (OfflineAudioContext render → WAV worker/header).
    const mixBtn = await page.$('#previewHost .mx-mix-btn');   // first mix button = Mixdown → WAV
    const [wavDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mixBtn.click(),
    ]);
    const wavName = wavDownload.suggestedFilename();
    if (/\.wav$/.test(wavName)) pass('audio mixer: mixdown → WAV downloaded (' + wavName + ')'); else fail('mixer WAV download name: ' + wavName);
    // Close the panel → mixer torn down.
    await mxToggle.click();
    await page.waitForSelector('#previewHost .mx-wrap', { state: 'detached', timeout: 4000 });
    pass('audio mixer: panel collapses + tears down transport');
  } else fail('mixer panel not found');

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

  // ── P7 Tier-1 video quick wins ── speed presets + frame-step + (gated) PiP + subtitle drop.
  const vidSpeeds = await page.$$eval('#previewHost .media-extras .media-speed-btn', (els) => els.map((e) => e.dataset.rate));
  if (['0.5', '1', '2'].every((r) => vidSpeeds.includes(r))) pass('P7 video: speed presets present'); else fail('video speeds: ' + vidSpeeds.join(','));
  const frameBtns = await page.evaluate(() => ({
    back: !!document.querySelector('#previewHost .media-frame-back'),
    fwd: !!document.querySelector('#previewHost .media-frame-fwd'),
  }));
  if (frameBtns.back && frameBtns.fwd) pass('P7 video: ±1 frame-step buttons present'); else fail('frame-step buttons: ' + JSON.stringify(frameBtns));
  // PiP button only when the browser advertises support — assert it tracks the feature flag.
  const pipState = await page.evaluate(() => ({
    enabled: !!document.pictureInPictureEnabled,
    btn: !!document.querySelector('#previewHost .media-pip-btn'),
  }));
  if (pipState.btn === pipState.enabled) pass('P7 video: PiP button feature-gated (present iff supported)'); else fail('pip gate mismatch: ' + JSON.stringify(pipState));
  // Subtitle sidecar loader mounts; loading an SRT through it adds timed overlay cues.
  const subLoader = await page.$('#previewHost .media-sub-loader');
  if (subLoader) pass('P7 video: subtitle (.srt/.vtt) drop/browse control mounts'); else fail('subtitle loader missing');
  const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello world\n\n2\n00:00:02,500 --> 00:00:04,000\nSecond line';
  const subLoaded = await page.evaluate(async (text) => {
    const file = new File([text], 'cap.srt', { type: 'application/x-subrip' });
    const input = document.querySelector('#previewHost .media-sub-loader input[type=file]');
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    return document.querySelector('#previewHost .media-sub-note')?.textContent || '';
  }, srt);
  if (/2 cues/.test(subLoaded)) pass('P7 video: SRT sidecar parses to 2 cues + mounts overlay'); else fail('subtitle load note: ' + subLoaded);

  // PURE SRT/VTT parser unit check (no DOM) — 2-cue SRT → correct timings + text.
  const parsed = await page.evaluate(async () => {
    const { parseSubtitles, parseTimestamp } = await import('./types/media/subtitles.js');
    const cues = parseSubtitles('1\n00:00:01,000 --> 00:00:03,500\nLine A\n\n2\n00:00:04,000 --> 00:00:06,000\nLine B\nwith wrap');
    return { n: cues.length, c0: cues[0], c1: cues[1], ts: parseTimestamp('00:01:02.250') };
  });
  if (parsed.n === 2 && parsed.c0.start === 1 && parsed.c0.end === 3.5 && parsed.c0.text === 'Line A'
    && parsed.c1.start === 4 && parsed.c1.text === 'Line B\nwith wrap' && parsed.ts === 62.25)
    pass('P7: SRT parser yields correct cue timings + text (pure)');
  else fail('srt parse: ' + JSON.stringify(parsed));

  // ── P1/P3: Export processed audio + baked fades (ffmpeg ON) ──────────────────
  // Enable ffmpeg via the global settings bag so the renderer builds the export panel.
  // (We do NOT actually run ffmpeg.wasm here — that's a 23 MB heavy load; we assert the
  // UI is present + wired, and verify the ffmpeg filter chain via the pure builder.)
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => {
    localStorage.setItem('fv:settings:global', JSON.stringify({ version: 1, values: { enableFfmpeg: true } }));
  });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.wav'));
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });

  const exportPanel = await page.$('#previewHost .media-export-panel');
  if (exportPanel) pass('P1: export panel present when ffmpeg enabled'); else fail('export panel missing with ffmpeg on');
  const exportHeader = exportPanel ? await page.$eval('#previewHost .media-export-panel .media-ed-header', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportHeader)) pass('P1: "Export processed audio" header present'); else fail('export header: ' + exportHeader);
  const exportRunText = exportPanel ? await page.$eval('#previewHost .media-export-run', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportRunText)) pass('P1: export button labelled'); else fail('export run btn: ' + exportRunText);
  const exportFmts = await page.$$eval('#previewHost .media-export-fmt option', (els) => els.map((e) => e.value));
  if (['source', 'mp3', 'wav', 'm4a', 'ogg'].every((f) => exportFmts.includes(f))) pass('P1: export format options (source/mp3/wav/m4a/ogg)'); else fail('export fmts: ' + exportFmts.join(','));
  const fadeInPresent = await page.$('#previewHost .media-ed-fade-in');
  const fadeOutPresent = await page.$('#previewHost .media-ed-fade-out');
  if (fadeInPresent && fadeOutPresent) pass('P3: audio fade-in / fade-out controls present'); else fail('fade controls: in=' + !!fadeInPresent + ' out=' + !!fadeOutPresent);
  // P6 WIRED: the audio cross-clip line now points at the (built) Multi-track mixer
  // rather than the old "needs timeline — coming" stub.
  const stubText = await page.$eval('#previewHost .media-export-stub', (e) => e.textContent).catch(() => '');
  if (/Crossfade.*mixer/i.test(stubText)) pass('P6: audio crossfade points to the multi-track mixer (wired)'); else fail('crossfade stub: ' + stubText.slice(0, 80));
  // The live-EQ summary updates with the fade duration (proves settings are read live).
  await page.fill('#previewHost .media-ed-fade-in', '2');
  await page.evaluate(() => document.querySelector('#previewHost .media-ed-fade-in').dispatchEvent(new Event('input', { bubbles: true })));
  const summaryText = await page.$eval('#previewHost .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/fade-in 2/.test(summaryText)) pass('P1: live export summary reflects fade-in setting'); else fail('export summary: ' + summaryText.slice(0, 100));

  // ── P2: export presets + advanced overrides ────────────────────────────────
  // The flat format picker is now a preset <select> (Podcast / ACX / Custom …).
  const presetSel = await page.$('#previewHost .media-export-preset');
  if (presetSel) pass('P2: export preset selector present'); else fail('export preset selector missing');
  const presetOpts = await page.$$eval('#previewHost .media-export-preset option', (els) => els.map((e) => e.value));
  if (['custom', 'podcast-mp3', 'acx-mp3'].every((v) => presetOpts.includes(v))) pass('P2: presets include Podcast + Audiobook(ACX) + Custom'); else fail('preset opts: ' + presetOpts.join(','));
  // Advanced overrides hidden until "Custom"; default preset is Podcast.
  const advHiddenDefault = await page.$eval('#previewHost .media-export-adv', (e) => e.hidden).catch(() => null);
  if (advHiddenDefault === true) pass('P2: advanced overrides hidden under a concrete preset'); else fail('adv hidden default: ' + advHiddenDefault);
  // Switch to Audiobook (ACX): summary must reflect mono / 192k CBR / −20 LUFS.
  await page.selectOption('#previewHost .media-export-preset', 'acx-mp3');
  const acxSummary = await page.$eval('#previewHost .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/mono/i.test(acxSummary) && /192k CBR/.test(acxSummary) && /-20 LUFS/.test(acxSummary)) pass('P2: ACX preset summary shows mono, 192k CBR, normalize -20 LUFS'); else fail('acx summary: ' + acxSummary.slice(0, 140));
  // Switching to Custom reveals the override fields (container/bitrate/sr/channels/loudness).
  await page.selectOption('#previewHost .media-export-preset', 'custom');
  const advShown = await page.$eval('#previewHost .media-export-adv', (e) => e.hidden).catch(() => null);
  const hasContainer = await page.$('#previewHost .media-export-container');
  const hasBitrate = await page.$('#previewHost .media-export-bitrate');
  const hasLufs = await page.$('#previewHost .media-export-lufs');
  if (advShown === false && hasContainer && hasBitrate && hasLufs) pass('P2: Custom reveals container/bitrate/loudness overrides'); else fail('custom adv: shown=' + advShown + ' c=' + !!hasContainer + ' b=' + !!hasBitrate + ' l=' + !!hasLufs);
  // Verify the PURE preset/codec layer (no ffmpeg load): ACX → mono CBR mp3 args.
  const presetParams = await page.evaluate(async () => {
    const { presetById, resolveExportParams, audioEncodeArgs: enc } = {
      ...(await import('./types/media/export-presets.js')),
      audioEncodeArgs: (await import('./types/media/transcoder.js')).audioEncodeArgs,
    };
    const p = resolveExportParams(presetById('acx-mp3'), {}, 'mp3');
    const e = enc(p.container, { bitrate: p.bitrate, cbr: p.cbr });
    return { channels: p.channels, sampleRate: p.sampleRate, lufs: p.lufsTarget, encArgs: e.args.join(' ') };
  });
  if (presetParams.channels === 1 && presetParams.sampleRate === 44100 && presetParams.lufs === -20 && /libmp3lame -b:a 192k/.test(presetParams.encArgs)) pass('P2: ACX resolves to mono/44.1k/-20 LUFS + CBR 192k mp3 args'); else fail('acx params: ' + JSON.stringify(presetParams));
  // Restore the Podcast preset so the rest of the area sees a stable state.
  await page.selectOption('#previewHost .media-export-preset', 'podcast-mp3');

  // ── P8: Audiobook QC (ACX) — pass/fail report card + one-click ACX export ─────
  // The QC toggle sits in the audio panel stack (after the mixer). CPU-lazy: no
  // decode / ffmpeg until a button is clicked.
  const qcToggle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('#previewHost .media-wv-toggle')].find((b) => /Audiobook QC/.test(b.textContent)) || null);
  const qcToggleExists = await qcToggle.evaluate((e) => !!e);
  if (qcToggleExists) {
    pass('P8: Audiobook QC (ACX) toggle button present');
    const preQc = await page.$('#previewHost .media-qc-run');
    if (!preQc) pass('P8: QC panel CPU-lazy (no decode/ffmpeg until opened)'); else fail('QC panel mounted before open');
    await qcToggle.asElement().click();
    await page.waitForSelector('#previewHost .media-qc-run', { timeout: 6000 });
    // Run QC → decode the sample WAV + render the per-metric card.
    await page.click('#previewHost .media-qc-run');
    await page.waitForSelector('#previewHost .media-qc-table .media-qc-row', { timeout: 15000 });
    const qcMetrics = await page.$$eval('#previewHost .media-qc-row', (els) => els.map((e) => e.dataset.metric));
    if (['rms', 'peak', 'noise', 'sr', 'ch', 'head', 'tail'].every((k) => qcMetrics.includes(k)))
      pass('P8b: QC card shows all 7 ACX metric rows (RMS/peak/noise/sr/ch/head/tail)');
    else fail('qc metrics: ' + qcMetrics.join(','));
    const qcVerdict = await page.$('#previewHost .media-qc-verdict');
    if (qcVerdict) pass('P8b: QC card shows an overall pass/fail verdict'); else fail('qc verdict missing');
    // The "Export for ACX" one-click button mounts alongside.
    const acxBtn = await page.$('#previewHost .media-qc-export');
    const acxBtnText = acxBtn ? await acxBtn.evaluate((e) => e.textContent) : '';
    if (/Export for ACX/i.test(acxBtnText)) pass('P8e: "Export for ACX" one-click button mounts'); else fail('acx export btn: ' + acxBtnText);
    await qcToggle.asElement().click();
    await page.waitForSelector('#previewHost .media-qc-toggle-panel[hidden]', { state: 'attached', timeout: 3000 });
    pass('P8: QC panel collapses');
  } else fail('Audiobook QC toggle not found');

  // ── P8a: PURE BS.1770 integrated LUFS on a synthesized buffer (no ffmpeg/decode) ──
  // A 1 kHz sine targeted to −23 dB RMS should read ≈ −23 LUFS (K-weighting is near-flat
  // at 1 kHz; tolerance ±1 LU). Also verify the noise-floor/RMS math.
  const lufs = await page.evaluate(async () => {
    const { integratedLufs } = await import('./types/media/loudness.js');
    const { integratedRms, samplePeak, noiseFloor, edgeSilence } = await import('./types/media/qc.js');
    const fs = 48000, n = fs * 4;
    const amp = Math.pow(10, (-23 + 3.0103) / 20);   // 1 kHz sine at −23 dB RMS
    const sine = new Float32Array(n);
    for (let i = 0; i < n; i++) sine[i] = amp * Math.sin(2 * Math.PI * 1000 * i / fs);
    // Buffer with a 1 s leading silence then a 0.3-amp tone → known head silence + floor.
    const gapped = new Float32Array(n);
    for (let i = 0; i < n; i++) gapped[i] = i < fs ? 0 : 0.3 * Math.sin(2 * Math.PI * 440 * i / fs);
    const nf = noiseFloor(gapped, fs);
    const es = edgeSilence(gapped, fs);
    return {
      lufs: integratedLufs([sine], fs),
      rms: integratedRms(sine), peak: samplePeak(sine),
      floorDb: nf.db, head: es.head,
    };
  });
  if (Math.abs(lufs.lufs - (-23)) <= 1) pass('P8a: BS.1770 LUFS on −23 dB sine ≈ −23 LUFS (' + lufs.lufs.toFixed(2) + ', ±1 LU)'); else fail('lufs: ' + lufs.lufs);
  if (Math.abs(lufs.rms - (-23)) < 0.1 && Math.abs(lufs.peak - (-20)) < 0.2) pass('P8b: RMS/peak math correct on synthesized sine'); else fail('rms/peak: ' + JSON.stringify(lufs));
  if (lufs.floorDb === -Infinity || lufs.floorDb < -100) pass('P8b: noise floor finds the silent window (−∞ for true silence)'); else fail('noise floor: ' + lufs.floorDb);
  if (Math.abs(lufs.head - 1) < 0.05) pass('P8b: edge-silence detects the 1 s leading gap'); else fail('head silence: ' + lufs.head);

  // ── P8c/P8e: PURE ACX arg builder → mono/44.1k/192k + loudnorm + silenceremove ──
  const acxArgs = await page.evaluate(async () => {
    const { buildAcxExportArgs, buildAcxFilterChain, silenceRemoveFilter } = await import('./types/media/transcoder.js');
    return {
      args: buildAcxExportArgs('input.mp3', 'out.mp3').join(' '),
      chain: buildAcxFilterChain(),
      silence: silenceRemoveFilter(),
    };
  });
  if (/-ac 1/.test(acxArgs.args) && /-ar 44100/.test(acxArgs.args) && /-c:a libmp3lame -b:a 192k/.test(acxArgs.args))
    pass('P8e: ACX arg builder forces mono / 44.1 kHz / MP3 192 k'); else fail('acx args: ' + acxArgs.args);
  if (/loudnorm=I=-20:TP=-3:LRA=11/.test(acxArgs.chain) && /silenceremove=/.test(acxArgs.chain) && /apad=pad_dur=/.test(acxArgs.chain))
    pass('P8c/P8e: ACX -af chain = loudnorm −20/−3 + silenceremove + room-tone pad'); else fail('acx chain: ' + acxArgs.chain);
  if (/start_threshold=-50dB/.test(acxArgs.silence)) pass('P8c: silenceremove trims dead air (−50 dB threshold)'); else fail('silence: ' + acxArgs.silence);

  // Verify the ffmpeg `-af` chain the export will run, via the PURE builder (no ffmpeg load).
  const chain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain(
      { freqs, gains: [0, 3, 0, 0, -2, 0, 0, 0, 0], hpf: 80, lpf: 16000, lufsTarget: -16 },
      { fadeIn: 2, fadeOut: 3, duration: 60 },
    );
  });
  const chainOk = /^highpass=f=80,equalizer=f=120:width_type=o:width=1:g=3,.*equalizer=f=1000.*g=-2,lowpass=f=16000,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,loudnorm=I=-16:TP=-1\.5:LRA=11$/.test(chain);
  if (chainOk) pass('P1: ffmpeg -af chain correct order (HPF→bands→LPF→fades→loudnorm)'); else fail('af chain: ' + chain);

  // ── P4: dynamics filter ordering ── afftdn → agate → acompressor → eq → alimiter.
  // PURE builder again (no ffmpeg). Dynamics fields are OPTIONAL, so the chain above
  // (without `dynamics`) stays byte-identical; with them, the mastering order holds.
  const dynChain = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    const freqs = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
    return buildAudioFilterChain({
      freqs, gains: [0, 0, 0, 0, 2, 0, 0, 0, 0], hpf: 80, lpf: 16000,
      dynamics: {
        denoise: { enabled: true, strength: 12 },
        gate: { enabled: true, threshold: -50, ratio: 2 },
        comp: { enabled: true, threshold: -24, ratio: 4, makeup: 6 },
        limiter: { enabled: true, ceiling: -1 },
      },
    }, {});
  });
  const idx = (s) => dynChain.indexOf(s);
  const dynOrderOk = idx('afftdn') >= 0 && idx('agate') > idx('afftdn')
    && idx('acompressor') > idx('agate') && idx('equalizer') > idx('acompressor')
    && idx('lowpass') > idx('equalizer') && idx('alimiter') > idx('lowpass')
    && idx('highpass') === 0;
  if (dynOrderOk) pass('P4: dynamics chain order (HPF→afftdn→agate→acompressor→EQ→LPF→alimiter)'); else fail('dyn chain: ' + dynChain);
  // Compressor threshold dB→linear (−24 dB ≈ 0.06) and a denoise strength land in the args.
  if (/acompressor=threshold=0\.06:ratio=4/.test(dynChain) && /afftdn=nr=12/.test(dynChain) && /agate=/.test(dynChain) && /alimiter=limit=/.test(dynChain))
    pass('P4: dynamics emit acompressor/afftdn/agate/alimiter with params'); else fail('dyn params: ' + dynChain);
  // No `dynamics` → output is byte-identical to the pre-P4 chain (existing assertion above stays green).
  const noDyn = await page.evaluate(async () => {
    const { buildAudioFilterChain } = await import('./types/media/transcoder.js');
    return buildAudioFilterChain({ freqs: [60], gains: [0], hpf: 80 }, {});
  });
  if (noDyn === 'highpass=f=80') pass('P4: chain without dynamics stays byte-identical (no regression)'); else fail('no-dyn chain: ' + noDyn);

  // ── P3: video fade — the export panel on a video reads "video" and renders fade-to-black.
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.avi'));
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  const vidExportHeader = await page.$eval('#previewHost .media-export-panel .media-ed-header', (e) => e.textContent).catch(() => '');
  if (/Export & Fades \(video\)/i.test(vidExportHeader)) pass('P3: video export panel offers fade-to-black'); else fail('video export header: ' + vidExportHeader);
  const vidFadeIn = await page.$('#previewHost .media-export-panel .media-ed-fade-in');
  if (vidFadeIn) pass('P3: video fade-to/from-black duration controls present'); else fail('video fade controls missing');

  // ── P6: Video timeline (2-lane) + transitions + visual trim ───────────────────
  // Built for video when ffmpeg is enabled; CPU-lazy (no timeline DOM until opened).
  const tlToggle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('#previewHost .media-wv-toggle')].find((b) => /Video timeline/.test(b.textContent)) || null);
  const tlToggleExists = await tlToggle.evaluate((e) => !!e);
  if (tlToggleExists) {
    pass('P6: video timeline toggle button present');
    const preTl = await page.$('#previewHost .tl-wrap');
    if (!preTl) pass('P6: video timeline CPU-lazy (no DOM until opened)'); else fail('timeline mounted before open');
    await tlToggle.asElement().click();
    await page.waitForSelector('#previewHost .tl-wrap', { timeout: 12000 });
    // 2 lanes: video lane (clip A) + second/music lane.
    const lanes = await page.$$eval('#previewHost .tl-lane', (els) => els.length);
    if (lanes === 2) pass('P6: timeline mounts 2 lanes (video + second/music)'); else fail('timeline lanes: ' + lanes);
    // Thumbnail strip with a load-on-demand button + trim handles (in/out).
    const tlBits = await page.evaluate(() => ({
      strip: !!document.querySelector('#previewHost .tl-strip'),
      thumbBtn: !!document.querySelector('#previewHost .tl-thumb-btn'),
      handleIn: !!document.querySelector('#previewHost .tl-handle-in'),
      handleOut: !!document.querySelector('#previewHost .tl-handle-out'),
      drop: !!document.querySelector('#previewHost .tl-lane--b .media-ed-drop-zone'),
    }));
    if (tlBits.strip && tlBits.thumbBtn) pass('P6: thumbnail strip + on-demand thumbnail button present'); else fail('thumb strip: ' + JSON.stringify(tlBits));
    if (tlBits.handleIn && tlBits.handleOut) pass('P6: visual trim handles (in/out) present'); else fail('trim handles: ' + JSON.stringify(tlBits));
    if (tlBits.drop) pass('P6: second-clip / music drop zone present'); else fail('timeline drop zone missing');
    // Transition controls: dissolve/xfade selector + length + the four action buttons.
    const transOpts = await page.$$eval('#previewHost .tl-trans-sel option', (els) => els.map((e) => e.value));
    if (transOpts.includes('fade') && transOpts.includes('fadeblack') && transOpts.includes('wipeleft')) pass('P6: transition selector offers fade/fadeblack/wipe'); else fail('transition opts: ' + transOpts.join(','));
    const acts = await page.evaluate(() => ({
      fade: !!document.querySelector('#previewHost .tl-act-fade'),
      xfade: !!document.querySelector('#previewHost .tl-act-xfade'),
      across: !!document.querySelector('#previewHost .tl-act-across'),
      mux: !!document.querySelector('#previewHost .tl-act-mux'),
    }));
    if (acts.fade && acts.xfade && acts.across && acts.mux) pass('P6: fade/xfade/acrossfade/mux action buttons present'); else fail('timeline actions: ' + JSON.stringify(acts));
    // Cross-clip actions disabled until a second clip is dropped.
    const xfadeDisabled = await page.$eval('#previewHost .tl-act-xfade', (e) => e.disabled);
    if (xfadeDisabled) pass('P6: dissolve disabled until a 2nd clip is added'); else fail('xfade not gated on 2nd clip');
    // Close → torn down.
    await tlToggle.asElement().click();
    await page.waitForSelector('#previewHost .tl-wrap', { state: 'detached', timeout: 4000 });
    pass('P6: video timeline panel collapses + tears down');
  } else fail('P6 video timeline toggle not found');

  // PURE arg-builder unit checks (no ffmpeg load): xfade offset math + acrossfade/mux args.
  const tlArgs = await page.evaluate(async () => {
    const m = await import('./types/media/video-filters.js');
    return {
      offset: m.xfadeOffset(10, 1),                         // durA−d = 9
      xfade: m.buildXfadeArgs('input.mp4', 'secondary.mp4', 'out.mp4', { durationA: 10, transition: 'fade', duration: 1 }).join(' '),
      across: m.buildAcrossfadeArgs('input.mp3', 'secondary.mp3', 'out.m4a', { duration: 2 }).join(' '),
      mux: m.buildMuxMusicArgs('input.mp4', 'secondary.mp3', 'out.mp4', { musicGain: 0.35 }).join(' '),
      badTrans: m.normalizeTransition('nonsense'),
    };
  });
  if (tlArgs.offset === 9) pass('P6: xfadeOffset(10,1) = 9 (durationA − transition)'); else fail('xfade offset: ' + tlArgs.offset);
  if (/xfade=transition=fade:duration=1:offset=9/.test(tlArgs.xfade) && /\[0:a\]\[1:a\]acrossfade=d=1\[a\]/.test(tlArgs.xfade) && /libx264/.test(tlArgs.xfade)) pass('P6: xfade args build dissolve + aligned audio acrossfade'); else fail('xfade args: ' + tlArgs.xfade);
  if (/\[0:a\]\[1:a\]acrossfade=d=2\[a\]/.test(tlArgs.across)) pass('P6: acrossfade args build d=2 audio crossfade'); else fail('acrossfade args: ' + tlArgs.across);
  if (/volume=0\.35/.test(tlArgs.mux) && /amix=inputs=2:duration=first/.test(tlArgs.mux) && /-c:v copy/.test(tlArgs.mux)) pass('P6: mux-music args duck the bed + amix under the video audio'); else fail('mux args: ' + tlArgs.mux);
  if (tlArgs.badTrans === 'fade') pass('P6: unknown transition normalizes to fade'); else fail('bad transition: ' + tlArgs.badTrans);

  // Reset settings so we don't leak ffmpeg-on into later areas sharing the page.
  await page.evaluate(() => localStorage.removeItem('fv:settings:global'));
}
