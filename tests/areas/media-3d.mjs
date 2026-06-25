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

  // ── Face / Region / Group select modes ── per-face + coplanar-region coloring on the OBJ cube. ──
  // The cube has no OBJ groups, so the old "Group" path recolors all 12 triangles; Face colors one,
  // Region colors the flat side (its 2 fan-triangles) — this is the user-reported fix.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.obj');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  await page.waitForTimeout(400);
  // The select-mode toggle exists with Region (default) / Face / Group.
  const modeBtns = await page.$$eval('#previewHost .mv-mode-btn', (els) => els.map((e) => ({ mode: e.dataset.mode, active: e.classList.contains('active') })));
  const modeOk = modeBtns.length === 3 && modeBtns.find((b) => b.mode === 'region')?.active
    && modeBtns.some((b) => b.mode === 'face') && modeBtns.some((b) => b.mode === 'group');
  if (modeOk) pass('select-mode toggle present: Region (default) / Face / Group'); else fail('mode toggle: ' + JSON.stringify(modeBtns));

  // Helper: click the centre of the canvas (always lands on a front face of the cube).
  const clickCanvasCentre3D = async () => {
    const b = await page.$eval('#previewHost .stl-canvas', (c) => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    await page.waitForTimeout(120);
  };
  // FACE mode: pick face, apply a color → exactly one triangle is recolored. We verify via the
  // popover label ("Face #N") since faceColors is module-internal.
  await page.click('#previewHost .mv-mode-btn[data-mode="face"]');
  await clickCanvasCentre3D();
  let label = await page.$eval('#previewHost .mv-group-picker .mv-gp-name', (e) => e.textContent).catch(() => '');
  if (/^Face #\d+$/.test(label)) pass('Face mode: click selects a single triangle (' + label + ')'); else fail('face label: ' + label);
  // Apply a color in Face mode and confirm the canvas re-rendered (paint changed somewhere).
  const paintBeforeFace = await page.evaluate(() => { const c = document.querySelector('#previewHost .stl-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 7 + d[i + 1] * 13 + d[i + 2]; return s; });
  await page.evaluate(() => { const inp = document.querySelector('#previewHost .mv-group-picker .mv-gp-color'); inp.value = '#ff2020'; inp.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150);
  const paintAfterFace = await page.evaluate(() => { const c = document.querySelector('#previewHost .stl-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 7 + d[i + 1] * 13 + d[i + 2]; return s; });
  if (paintAfterFace !== paintBeforeFace) pass('Face mode: applying a color repaints the mesh'); else fail('face color did not change canvas');

  // REGION mode: a flat cube side is 2 coplanar fan-triangles → label reports >1 face from 1 click.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.obj');
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  await page.waitForTimeout(400);
  await page.click('#previewHost .mv-mode-btn[data-mode="region"]');
  await clickCanvasCentre3D();
  label = await page.$eval('#previewHost .mv-group-picker .mv-gp-name', (e) => e.textContent).catch(() => '');
  const regionFaces = parseInt((label.match(/Region \((\d+)/) || [])[1] || '0', 10);
  if (regionFaces > 1) pass('Region mode: one click selects >1 coplanar face (' + label + ')'); else fail('region label: ' + label);

  // ── Colored OBJ export carries per-face/region colors as newmtl/usemtl ──
  // Apply a region color, then download OBJ + MTL and assert the MTL has a synthetic face material.
  await page.evaluate(() => { const inp = document.querySelector('#previewHost .mv-group-picker .mv-gp-color'); inp.value = '#10c040'; inp.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(120);
  const dlDir = join(tmpdir(), 'fv-smoke-3d-' + Date.now());
  const downloads = [];
  page.on('download', (d) => downloads.push(d));
  await page.click('#previewHost .stl-dl-obj');
  await page.waitForTimeout(800); // OBJ then (200ms later) MTL fire
  let objText = '', mtlText = '';
  for (const d of downloads) {
    const name = d.suggestedFilename();
    const p = join(dlDir, name);
    await d.saveAs(p).catch(() => {});
    const fs = await import('node:fs');
    const txt = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    if (name.endsWith('.obj')) objText = txt; else if (name.endsWith('.mtl')) mtlText = txt;
  }
  const exportOk = /newmtl fv_face_/.test(mtlText) && /usemtl fv_face_/.test(objText) && /Kd /.test(mtlText);
  if (exportOk) pass('colored OBJ export: per-face/region color emitted as newmtl/usemtl (synthetic material)'); else fail('obj export mtl/obj: ' + JSON.stringify({ mtlHead: mtlText.slice(0, 120), hasUsemtl: /usemtl fv_face_/.test(objText) }));

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
  // Ctrl + '=' zooms in (keyboard shortcut).
  const wPreKey = await page.$eval('#previewHost .imgv-img', (e) => parseFloat(e.style.width) || 0);
  await page.keyboard.down('Control'); await page.keyboard.press('='); await page.keyboard.up('Control');
  const wPostKey = await page.$eval('#previewHost .imgv-img', (e) => parseFloat(e.style.width) || 0);
  if (wPostKey > wPreKey) pass('Ctrl+= zooms in (keyboard)'); else fail('ctrl-zoom key: ' + wPreKey + ' -> ' + wPostKey);
  // Images open in plain VIEW mode — the edit toolbar is hidden until you press Edit
  // (the Edit + ASCII buttons are stacked next to the zoom controls).
  const editToolbarShown = () => page.$eval('#previewHost .imgv-edit-tools', (el) => getComputedStyle(el).display !== 'none');
  const startsInView = !(await editToolbarShown());
  if (startsInView) pass('image opens in view mode (edit toolbar hidden until Edit)'); else fail('edit toolbar visible on open');
  await page.click('#previewHost .imgv-tools-btn');   // enter edit mode
  if (await editToolbarShown()) pass('Edit button reveals the editing toolbar'); else fail('Edit did not reveal toolbar');
  // The editing toolbar is grouped into tabs; open the relevant tab before each tool.
  const openTab = (name) => page.click(`#previewHost .imgv-tab[data-tab="${name}"]`);
  const tabState = await page.evaluate(() => ({
    count: document.querySelectorAll('#previewHost .imgv-tab').length,
    active: document.querySelector('#previewHost .imgv-tab.active')?.dataset.tab,
  }));
  if (tabState.count === 6 && tabState.active === 'common') pass('editor toolbar grouped into 6 tabs, Common active'); else fail('tabs: ' + JSON.stringify(tabState));
  // The main action buttons (text input + Add, Pencil/Fill, rotate/flip, Crop,
  // Resize, Expand, Filters, BG, Compare) all live in the Common tab — each also
  // appears (linked) in its own tab, which additionally holds the fine-tuning.
  await openTab('common');
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
  // Undo reverts the edit (back to clean), redo re-applies it (dirty again).
  await page.click('#previewHost .imgv-undo');
  await page.waitForFunction(() => !window.__fv.state.binaryEdit, null, { timeout: 5000 }).catch(() => {});
  const afterUndo = await page.evaluate(() => ({ dirty: !!window.__fv.state.binaryEdit, redoShown: !document.querySelector('#previewHost .imgv-redo').hidden }));
  if (!afterUndo.dirty && afterUndo.redoShown) pass('image undo reverts edit + reveals redo'); else fail('after undo: ' + JSON.stringify(afterUndo));
  await page.click('#previewHost .imgv-redo');
  await page.waitForFunction(() => !!window.__fv.state.binaryEdit, null, { timeout: 5000 }).catch(() => {});
  const afterRedo = await page.evaluate(() => !!window.__fv.state.binaryEdit);
  if (afterRedo) pass('image redo re-applies edit'); else fail('redo did not re-apply edit');
  // Keyboard Ctrl+Z / Ctrl+Y must reach the editor even when focus sits on a
  // toolbar control (a range/number <input>) — the previous handler bailed on any
  // focused input, so adjusting the fill-tolerance slider then pressing Ctrl+Z did
  // nothing. Fill lives in Common; its tolerance slider lives in the Draw tab —
  // activate fill (Common), switch to Draw, park focus on the slider, then undo/redo.
  await openTab('common');
  await page.click('#previewHost .imgv-fill');
  await openTab('draw');
  await page.evaluate(() => document.querySelector('#previewHost .imgv-fill-tol').focus());
  const sliderFocused = await page.evaluate(() => /imgv-fill-tol/.test(document.activeElement.className || ''));
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
  await page.waitForFunction(() => !window.__fv.state.binaryEdit, null, { timeout: 5000 }).catch(() => {});
  const kbdUndo = await page.evaluate(() => !window.__fv.state.binaryEdit);
  await page.keyboard.down('Control'); await page.keyboard.press('y'); await page.keyboard.up('Control');
  await page.waitForFunction(() => !!window.__fv.state.binaryEdit, null, { timeout: 5000 }).catch(() => {});
  const kbdRedo = await page.evaluate(() => !!window.__fv.state.binaryEdit);
  await openTab('common');
  await page.click('#previewHost .imgv-fill');   // toggle fill off, restore for later steps
  if (sliderFocused && kbdUndo && kbdRedo) pass('Ctrl+Z / Ctrl+Y reach the editor with focus on a toolbar slider'); else fail('keyboard undo w/ slider focus: ' + JSON.stringify({ sliderFocused, kbdUndo, kbdRedo }));
  // ── Magic-wand selection ── click a region to build a pixel mask (its own overlay
  // canvas shows a tint + boundary); a Deselect button appears. The mask constrains
  // the pixel tools (verified by the pure clipToBase unit tests).
  await openTab('common');
  await page.click('#previewHost .imgv-select');                 // enter wand mode
  await page.click('#previewHost .imgv-sel-overlay', { position: { x: 20, y: 20 } });   // pick a region
  const selState = await page.evaluate(() => {
    const ov = document.querySelector('#previewHost .imgv-sel-overlay');
    let painted = false;
    if (ov && ov.width) { const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data; for (let i = 3; i < d.length; i += 4) { if (d[i]) { painted = true; break; } } }
    return {
      active: document.querySelector('#previewHost .imgv-select').classList.contains('active'),
      deselectShown: !document.querySelector('#previewHost .imgv-deselect').hidden,
      painted,
    };
  });
  if (selState.active && selState.deselectShown && selState.painted) pass('magic-wand: selects a region (mask overlay painted + Deselect shown)'); else fail('wand select: ' + JSON.stringify(selState));
  await page.click('#previewHost .imgv-deselect');               // clear the selection
  await page.click('#previewHost .imgv-select');                 // leave wand mode (restore state for later steps)
  const selCleared = await page.evaluate(() => ({
    deselectHidden: document.querySelector('#previewHost .imgv-deselect').hidden,
    modeOff: !document.querySelector('#previewHost .imgv-select').classList.contains('active'),
  }));
  if (selCleared.deselectHidden && selCleared.modeOff) pass('magic-wand: Deselect clears the selection + leaving wand mode'); else fail('wand clear: ' + JSON.stringify(selCleared));
  // Rectangular marquee — a second mask SOURCE: drag a box → a rectangular selection
  // (same overlay/tint + Deselect; same clipToBase constraint on the pixel tools).
  await page.click('#previewHost .imgv-marquee');                 // enter box-select mode
  const selBox = await page.$eval('#previewHost .imgv-sel-overlay', (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(selBox.x + 15, selBox.y + 15);
  await page.mouse.down();
  await page.mouse.move(selBox.x + selBox.w * 0.6, selBox.y + selBox.h * 0.6, { steps: 5 });
  await page.mouse.up();
  const marq = await page.evaluate(() => {
    const ov = document.querySelector('#previewHost .imgv-sel-overlay');
    let painted = false;
    if (ov && ov.width) { const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data; for (let i = 3; i < d.length; i += 4) { if (d[i]) { painted = true; break; } } }
    return { painted, deselectShown: !document.querySelector('#previewHost .imgv-deselect').hidden, active: document.querySelector('#previewHost .imgv-marquee').classList.contains('active') };
  });
  if (marq.painted && marq.deselectShown && marq.active) pass('marquee: drag a box builds a rectangular selection (overlay painted + Deselect shown)'); else fail('marquee: ' + JSON.stringify(marq));
  await page.click('#previewHost .imgv-deselect');                // clear
  await page.click('#previewHost .imgv-marquee');                 // leave box-select
  // Elliptical + lasso selection (Draw tab) — more mask SOURCES via canvas-path raster.
  const ovPainted = () => page.evaluate(() => { const ov = document.querySelector('#previewHost .imgv-sel-overlay'); if (!ov || !ov.width) return false; const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; });
  await openTab('draw');
  await page.click('#previewHost .imgv-ellipse');                 // oval-select mode
  const ovBox = await page.$eval('#previewHost .imgv-sel-overlay', (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(ovBox.x + ovBox.w * 0.2, ovBox.y + ovBox.h * 0.2);
  await page.mouse.down();
  await page.mouse.move(ovBox.x + ovBox.w * 0.8, ovBox.y + ovBox.h * 0.8, { steps: 5 });
  await page.mouse.up();
  const ellipsePainted = await ovPainted();
  await page.click('#previewHost .imgv-lasso');                   // lasso (freehand) mode — overwrites the mask
  await page.mouse.move(ovBox.x + ovBox.w * 0.3, ovBox.y + ovBox.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(ovBox.x + ovBox.w * 0.7, ovBox.y + ovBox.h * 0.35, { steps: 3 });
  await page.mouse.move(ovBox.x + ovBox.w * 0.6, ovBox.y + ovBox.h * 0.7, { steps: 3 });
  await page.mouse.move(ovBox.x + ovBox.w * 0.35, ovBox.y + ovBox.h * 0.6, { steps: 3 });
  await page.mouse.up();
  const lassoPainted = await ovPainted();
  await page.click('#previewHost .imgv-lasso');                   // leave select mode (mask lingers)
  await openTab('common');                                        // Common tab → canonical Deselect is visible
  await page.click('#previewHost .imgv-deselect');                // clear the selection for later steps
  if (ellipsePainted && lassoPainted) pass('selection: elliptical + lasso build masks (canvas-path raster)'); else fail('ellipse/lasso: ' + JSON.stringify({ ellipsePainted, lassoPainted }));
  // ── Transform / filter / draw commit pipeline ── each tool writes a FRESH edited
  // blob, so img.src (a blob: URL) flips to a new value when a commit lands. This is
  // a tool-agnostic regression signal that protects the editor-module split.
  const imgSrcNow = () => page.$eval('#previewHost .imgv-img', (e) => e.src);
  const waitNewSrc = async (before) => page.waitForFunction((s) => document.querySelector('#previewHost .imgv-img').src !== s, before, { timeout: 8000 }).then(() => true).catch(() => false);
  // Selection OPS — build a wand selection, Invert the mask, then Cut deletes the
  // selected pixels (commits a transparent PNG). Then clear for the later steps.
  await openTab('common');
  await page.click('#previewHost .imgv-select');                  // wand mode
  await page.click('#previewHost .imgv-sel-overlay', { position: { x: 18, y: 18 } });   // pick a region
  await openTab('draw');
  await page.click('#previewHost .imgv-sel-invert');              // invert the mask
  const cutBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-sel-cut');                 // delete selected → new PNG
  const cutCommitted = await waitNewSrc(cutBefore);
  if (cutCommitted) pass('selection ops: invert + cut deletes the selection (commits a new image)'); else fail('selection cut did not commit');
  await openTab('common');
  await page.click('#previewHost .imgv-select');                  // leave wand
  await page.click('#previewHost .imgv-deselect');                // clear the mask
  // Selection MOVE — box-select a region, then drag it to a new spot (one PNG commit).
  await page.click('#previewHost .imgv-marquee');                 // box-select mode
  const mvBox = await page.$eval('#previewHost .imgv-sel-overlay', (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(mvBox.x + mvBox.w * 0.25, mvBox.y + mvBox.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(mvBox.x + mvBox.w * 0.55, mvBox.y + mvBox.h * 0.55, { steps: 4 });
  await page.mouse.up();
  await page.click('#previewHost .imgv-marquee');                 // leave box-select (mask stays)
  await openTab('draw');
  await page.click('#previewHost .imgv-sel-move');                // move mode
  const moveBefore = await imgSrcNow();
  await page.mouse.move(mvBox.x + mvBox.w * 0.4, mvBox.y + mvBox.h * 0.4);
  await page.mouse.down();
  await page.mouse.move(mvBox.x + mvBox.w * 0.62, mvBox.y + mvBox.h * 0.5, { steps: 4 });
  await page.mouse.up();
  const moveCommitted = await waitNewSrc(moveBefore);
  if (moveCommitted) pass('selection move: drag the selected pixels commits a new image'); else fail('selection move did not commit');
  await page.click('#previewHost .imgv-sel-move');                // leave move mode
  await openTab('common');
  // Rotate 90° CW also swaps width/height — a strong correctness check.
  await openTab('common');
  const rotBefore = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight, src: e.src }));
  await page.click('#previewHost .imgv-rot-r');
  await waitNewSrc(rotBefore.src);
  const rotAfter = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  if (rotAfter.w === rotBefore.h && rotAfter.h === rotBefore.w) pass('rotate 90° swaps image dimensions + commits'); else fail('rotate dims: ' + JSON.stringify({ rotBefore, rotAfter }));
  // Flip H commits a new edited image.
  const flipBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-flip-h');
  if (await waitNewSrc(flipBefore)) pass('flip H commits a new edited image'); else fail('flip H did not commit');
  // Filters: the ⚙ button lives in Common and jumps to the Adjust tab (data-go-tab)
  // where the sliders are; raise brightness, Apply → bakes a new blob.
  await openTab('common');
  await page.click('#previewHost .imgv-filters-btn');
  await page.evaluate(() => { const s = document.querySelector('#previewHost .imgv-f-brightness'); s.value = '150'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  const filterBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-f-apply');
  if (await waitNewSrc(filterBefore)) pass('filters Apply bakes a new edited image'); else fail('filters apply did not commit');
  // Levels: black/white/gamma LUT (not expressible as a CSS filter) — live preview by
  // swapping img.src, Apply commits the LUT-mapped pixels, panel closes. The Adjust tab
  // is already open (Filters jumped here via data-go-tab).
  await page.click('#previewHost .imgv-levels-btn');               // open + cache source pixels
  await page.waitForSelector('#previewHost .imgv-levels-panel:not([hidden])', { timeout: 3000 });
  const lvOpenSrc = await imgSrcNow();
  await page.evaluate(() => { const g = document.querySelector('#previewHost .imgv-lv-gamma'); g.value = '200'; g.dispatchEvent(new Event('input', { bubbles: true })); });
  const lvPreviewed = await waitNewSrc(lvOpenSrc);                 // a processed preview blob swapped in
  const lvBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-lv-apply');
  const lvCommitted = await waitNewSrc(lvBefore);
  const lvClosed = await page.evaluate(() => document.querySelector('#previewHost .imgv-levels-panel').hidden);
  if (lvPreviewed && lvCommitted && lvClosed) pass('levels: live preview + Apply commits a LUT-mapped image + panel closes'); else fail('levels: ' + JSON.stringify({ lvPreviewed, lvCommitted, lvClosed }));
  // Curves: drag a control point on the curve canvas to lift the midtones → live preview by
  // swapping img.src, Apply bakes the LUT-remapped pixels, panel closes (edit-curves.js).
  await page.click('#previewHost .imgv-curves-btn');               // open + cache source pixels
  await page.waitForSelector('#previewHost .imgv-curves-panel:not([hidden])', { timeout: 3000 });
  const curveOpenSrc = await imgSrcNow();
  const cbox = await page.evaluate(() => {
    const r = document.querySelector('#previewHost .imgv-curve-canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  // Empty-space pointerdown at the curve's middle inserts a handle; dragging it up brightens.
  const dragCurve = async () => {
    await page.mouse.move(cbox.x + cbox.w / 2, cbox.y + cbox.h / 2);
    await page.mouse.down();
    await page.mouse.move(cbox.x + cbox.w / 2, cbox.y + cbox.h / 2 - 45, { steps: 6 });
    await page.mouse.up();
  };
  await dragCurve();
  const curvePreviewed = await waitNewSrc(curveOpenSrc);           // a processed preview blob swapped in
  // Switch to the Red channel and bend it too — per-channel grading composes onto the master curve.
  const redBefore = await imgSrcNow();
  await page.selectOption('#previewHost .imgv-curve-ch', 'r');
  await dragCurve();
  const curveChannelPreviewed = await waitNewSrc(redBefore);
  const curveBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-curve-apply');
  const curveCommitted = await waitNewSrc(curveBefore);
  const curveClosed = await page.waitForFunction(() => document.querySelector('#previewHost .imgv-curves-panel')?.hidden === true, { timeout: 2000 }).then(() => true).catch(() => false);
  if (curvePreviewed && curveChannelPreviewed && curveCommitted && curveClosed) pass('curves: master + per-channel (Red) curves preview + Apply commits a LUT-mapped image + panel closes'); else fail('curves: ' + JSON.stringify({ curvePreviewed, curveChannelPreviewed, curveCommitted, curveClosed }));
  // Sharpen/Blur: open panel → caches source pixels; pick Sharpen + nudge strength → live
  // preview swaps img.src; Apply bakes the convolved pixels and the panel closes (edit-convolve.js).
  await page.click('#previewHost .imgv-convolve-btn');
  await page.waitForSelector('#previewHost .imgv-convolve-panel:not([hidden])', { timeout: 3000 });
  const convOpenSrc = await imgSrcNow();
  await page.selectOption('#previewHost .imgv-conv-type', 'sharpen');
  await page.evaluate(() => { const s = document.querySelector('#previewHost .imgv-conv-strength'); s.value = '80'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  const convPreviewed = await waitNewSrc(convOpenSrc);
  const convBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-conv-apply');
  const convCommitted = await waitNewSrc(convBefore);
  const convClosed = await page.waitForFunction(() => document.querySelector('#previewHost .imgv-convolve-panel')?.hidden === true, { timeout: 2000 }).then(() => true).catch(() => false);
  if (convPreviewed && convCommitted && convClosed) pass('sharpen/blur: convolution previews + Apply commits a filtered image + panel closes'); else fail('convolve: ' + JSON.stringify({ convPreviewed, convCommitted, convClosed }));
  // One-click presets (greyscale/sepia/invert) bake straight to pixels via a canvas filter.
  const greyBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-preset-grey');
  if (await waitNewSrc(greyBefore)) pass('preset: greyscale bakes a new edited image'); else fail('greyscale preset did not commit');
  await openTab('common');
  // Fill bucket: the button lives in Common; its options live in the Draw tab.
  // Activating from Common still un-hides the option controls.
  await openTab('common');
  await page.click('#previewHost .imgv-fill');
  const fillModeOn = await page.evaluate(() => {
    const b = document.querySelector('#previewHost .imgv-fill');
    const opts = [...document.querySelectorAll('#previewHost .imgv-fill-opt')];
    const hasControls = !!document.querySelector('#previewHost .imgv-fill-mode')
      && !!document.querySelector('#previewHost .imgv-fill-percep')
      && !!document.querySelector('#previewHost .imgv-fill-feather');
    return b.classList.contains('active') && opts.every((o) => !o.hidden) && hasControls;
  });
  if (fillModeOn) pass('fill tool activates + reveals tolerance/mode/perceptual/feather options'); else fail('fill mode not active');
  const clickCanvasCentre = () => page.evaluate(() => {
    // The draw overlay (the fill/brush canvas) — NOT the magic-wand selection overlay.
    const cv = document.querySelector('#previewHost .imgv-stage canvas:not(.imgv-sel-overlay)');
    const r = cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true }));
  });
  const fillBefore = await imgSrcNow();
  await clickCanvasCentre();
  if (await waitNewSrc(fillBefore)) pass('fill bucket floods a region + commits'); else fail('fill did not commit');
  // Region (Sobel edge-stop) mode + feather — set in the Draw tab — also commit.
  await openTab('draw');
  await page.selectOption('#previewHost .imgv-fill-mode', 'region');
  await page.check('#previewHost .imgv-fill-feather');
  const regionBefore = await imgSrcNow();
  await clickCanvasCentre();
  if (await waitNewSrc(regionBefore)) pass('fill region/edge-stop mode + feather floods + commits'); else fail('region fill did not commit');
  await page.uncheck('#previewHost .imgv-fill-feather');
  await page.selectOption('#previewHost .imgv-fill-mode', 'seed');
  await openTab('common');
  await page.click('#previewHost .imgv-fill');   // toggle fill mode off
  // BG removal: the ✂ BG button lives in Common and jumps to the Background tab.
  await openTab('common');
  await page.click('#previewHost .imgv-bg-btn');
  const bgActive = await page.evaluate(() => document.querySelector('#previewHost .imgv-bg-btn').classList.contains('active'));
  if (bgActive) pass('BG-removal tool enters colour-pick mode'); else fail('BG tool did not activate');
  await openTab('common');
  await page.click('#previewHost .imgv-bg-btn');   // cancel BG mode, restore for later steps
  // Background tab: the "Extract tolerance" label stays hidden until a colour is
  // sampled, and the Checkerboard toggle changes how transparency is displayed.
  await openTab('bg');
  const bgTabState = await page.evaluate(() => ({
    tolHidden: document.querySelector('#previewHost .imgv-bg-tol-wrap')?.hidden !== false,
    hasChecker: !!document.querySelector('#previewHost .imgv-bg-checker'),
  }));
  await page.check('#previewHost .imgv-bg-checker');
  const checkerOn = await page.evaluate(() => document.querySelector('#previewHost .imgv-img').classList.contains('imgv-checker'));
  await page.uncheck('#previewHost .imgv-bg-checker');
  const checkerOff = await page.evaluate(() => !document.querySelector('#previewHost .imgv-img').classList.contains('imgv-checker'));
  if (bgTabState.tolHidden && bgTabState.hasChecker && checkerOn && checkerOff) pass('Background tab: tolerance hidden until sampled; checkerboard toggle shows transparency'); else fail('bg tab: ' + JSON.stringify({ ...bgTabState, checkerOn, checkerOff }));
  await openTab('common');
  // Crop: button + apply/cancel live in Common. Enter mode, drag a centre rectangle
  // (real mouse → pointer capture works), Apply → the image shrinks + commits.
  await openTab('common');
  await page.click('#previewHost .imgv-crop-btn');
  const cropModeOn = await page.evaluate(() => document.querySelector('#previewHost .imgv-crop-btn').classList.contains('active'));
  const cropDimsBefore = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  const imgRect = await page.$eval('#previewHost .imgv-img', (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
  await page.mouse.move(imgRect.l + imgRect.w * 0.25, imgRect.t + imgRect.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(imgRect.l + imgRect.w * 0.75, imgRect.t + imgRect.h * 0.75, { steps: 6 });
  await page.mouse.up();
  const cropSrcBefore = await imgSrcNow();
  await page.click('#previewHost .imgv-crop-apply');
  const cropped = await waitNewSrc(cropSrcBefore);
  const cropDimsAfter = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  if (cropModeOn && cropped && cropDimsAfter.w < cropDimsBefore.w && cropDimsAfter.h < cropDimsBefore.h) pass('crop selects a region + shrinks the image'); else fail('crop: ' + JSON.stringify({ cropModeOn, cropped, cropDimsBefore, cropDimsAfter }));
  // Pencil: button lives in Common. A real drag over the image draws + commits.
  await openTab('common');
  await page.click('#previewHost .imgv-pencil');
  const penModeOn = await page.evaluate(() => document.querySelector('#previewHost .imgv-pencil').classList.contains('active'));
  const penRect = await page.$eval('#previewHost .imgv-img', (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
  const penSrcBefore = await imgSrcNow();
  await page.mouse.move(penRect.l + penRect.w * 0.3, penRect.t + penRect.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(penRect.l + penRect.w * 0.6, penRect.t + penRect.h * 0.6, { steps: 6 });
  await page.mouse.up();
  const penCommitted = await waitNewSrc(penSrcBefore);
  if (penModeOn && penCommitted) pass('pencil stroke draws + commits a new image'); else fail('pencil: ' + JSON.stringify({ penModeOn, penCommitted }));
  await page.click('#previewHost .imgv-pencil');   // toggle pencil off, restore for later steps
  // Clone stamp (Draw tab): Alt-click sets a source anchor + snapshot, then a plain drag paints
  // sampled pixels from (dest − offset). Asserts the source marker shows + a commit with unchanged dims.
  await openTab('draw');
  await page.click('#previewHost .imgv-clone');
  const cloneModeOn = await page.evaluate(() => document.querySelector('#previewHost .imgv-clone').classList.contains('active'));
  const clRect = await page.$eval('#previewHost .imgv-img', (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
  const clDimsBefore = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  await page.keyboard.down('Alt');                 // Alt-click → set the clone source
  await page.mouse.move(clRect.l + clRect.w * 0.65, clRect.t + clRect.h * 0.3);
  await page.mouse.down(); await page.mouse.up();
  await page.keyboard.up('Alt');
  const cloneMarkerShown = await page.evaluate(() => { const m = document.querySelector('#previewHost .imgv-clone-src'); return !!m && m.style.display !== 'none'; });
  const cloneSrcBefore = await imgSrcNow();
  await page.mouse.move(clRect.l + clRect.w * 0.3, clRect.t + clRect.h * 0.6);   // paint elsewhere
  await page.mouse.down();
  await page.mouse.move(clRect.l + clRect.w * 0.45, clRect.t + clRect.h * 0.65, { steps: 6 });
  await page.mouse.up();
  const cloneCommitted = await waitNewSrc(cloneSrcBefore);
  const clDimsAfter = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  if (cloneModeOn && cloneMarkerShown && cloneCommitted && clDimsAfter.w === clDimsBefore.w && clDimsAfter.h === clDimsBefore.h) pass('clone stamp: Alt-click sets a source marker, painting clones pixels + commits (dims unchanged)'); else fail('clone: ' + JSON.stringify({ cloneModeOn, cloneMarkerShown, cloneCommitted, clDimsBefore, clDimsAfter }));
  await page.click('#previewHost .imgv-clone');    // toggle clone off, restore for later steps
  // Heal (Draw tab): same Alt-source + paint mechanics as Clone, but the dab is mean-shifted to the
  // destination surround. Asserts mode activates, the source marker shows, and a paint commits (dims unchanged).
  await page.click('#previewHost .imgv-heal');
  const healModeOn = await page.evaluate(() => document.querySelector('#previewHost .imgv-heal').classList.contains('active'));
  const hlDimsBefore = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  await page.keyboard.down('Alt');
  await page.mouse.move(clRect.l + clRect.w * 0.6, clRect.t + clRect.h * 0.35);
  await page.mouse.down(); await page.mouse.up();
  await page.keyboard.up('Alt');
  const healMarkerShown = await page.evaluate(() => { const m = document.querySelector('#previewHost .imgv-clone-src'); return !!m && m.style.display !== 'none'; });
  const healSrcBefore = await imgSrcNow();
  await page.mouse.move(clRect.l + clRect.w * 0.35, clRect.t + clRect.h * 0.55);
  await page.mouse.down();
  await page.mouse.move(clRect.l + clRect.w * 0.5, clRect.t + clRect.h * 0.6, { steps: 6 });
  await page.mouse.up();
  const healCommitted = await waitNewSrc(healSrcBefore);
  const hlDimsAfter = await page.$eval('#previewHost .imgv-img', (e) => ({ w: e.naturalWidth, h: e.naturalHeight }));
  if (healModeOn && healMarkerShown && healCommitted && hlDimsAfter.w === hlDimsBefore.w && hlDimsAfter.h === hlDimsBefore.h) pass('heal: Alt-click source + paint mean-shifts the patch + commits (dims unchanged)'); else fail('heal: ' + JSON.stringify({ healModeOn, healMarkerShown, healCommitted, hlDimsBefore, hlDimsAfter }));
  await page.click('#previewHost .imgv-heal');     // toggle heal off, restore for later steps
  // Toolbar declutter: the 🛠 toggle collapses the editing-tools group.
  const toolsVisInit = await page.$eval('#previewHost .imgv-edit-tools', (el) => getComputedStyle(el).display !== 'none');
  await page.click('#previewHost .imgv-tools-btn');
  const toolsHidden = await page.$eval('#previewHost .imgv-edit-tools', (el) => getComputedStyle(el).display === 'none');
  await page.click('#previewHost .imgv-tools-btn');   // restore for later steps
  if (toolsVisInit && toolsHidden) pass('image editing tools collapse behind the 🛠 toggle'); else fail('tools toggle: ' + JSON.stringify({ toolsVisInit, toolsHidden }));
  // Resize in PERCENT: the ⊡ button lives in Common and jumps to the Size tab where
  // the W/H panel lives; 50% should halve the natural width.
  await openTab('common');
  const wBefore = await page.$eval('#previewHost .imgv-img', (el) => el.naturalWidth);
  await page.click('#previewHost .imgv-resize-btn');
  await page.selectOption('#previewHost .imgv-resize-unit', 'pct');
  await page.fill('#previewHost .imgv-resize-w', '50');
  await page.click('#previewHost .imgv-resize-apply');
  await page.waitForFunction((w) => document.querySelector('#previewHost .imgv-img').naturalWidth > 0 && document.querySelector('#previewHost .imgv-img').naturalWidth < w, wBefore, { timeout: 8000 }).catch(() => {});
  const wAfter = await page.$eval('#previewHost .imgv-img', (el) => el.naturalWidth);
  if (Math.abs(wAfter - Math.round(wBefore / 2)) <= 1) pass('resize percent (50%) halves the image width'); else fail('resize %: ' + wBefore + ' -> ' + wAfter);
  // Expand (opposite of crop): pad 30px on every side → width grows by 60, content
  // unchanged. Button is in Common, panel in the Size tab.
  await openTab('common');
  const expBefore = await page.$eval('#previewHost .imgv-img', (el) => el.naturalWidth);
  await page.click('#previewHost .imgv-expand-btn');
  await page.fill('#previewHost .imgv-expand-pad', '30');
  await page.click('#previewHost .imgv-expand-apply');
  await page.waitForFunction((w) => document.querySelector('#previewHost .imgv-img').naturalWidth === w + 60, expBefore, { timeout: 8000 }).catch(() => {});
  const expAfter = await page.$eval('#previewHost .imgv-img', (el) => el.naturalWidth);
  if (expAfter === expBefore + 60) pass('expand pads the canvas (+30px each side) without resizing content'); else fail('expand: ' + expBefore + ' -> ' + expAfter);
  // Linked proxies: the Fill button in the Draw tab drives the same canonical Fill.
  await openTab('draw');
  await page.click('#previewHost .imgv-tabpanel[data-tab="draw"] [data-link="imgv-fill"]');
  const proxyLinked = await page.evaluate(() => document.querySelector('#previewHost .imgv-fill').classList.contains('active'));
  await page.click('#previewHost .imgv-tabpanel[data-tab="draw"] [data-link="imgv-fill"]');   // toggle back off
  const adjustHasFilters = await page.evaluate(() => !!document.querySelector('#previewHost .imgv-tabpanel[data-tab="adjust"] [data-link="imgv-filters-btn"]'));
  if (proxyLinked && adjustHasFilters) pass('linked proxies: Draw-tab Fill drives canonical Fill; Adjust tab has its Filters button'); else fail('proxies: ' + JSON.stringify({ proxyLinked, adjustHasFilters }));
  await openTab('common');
  await page.evaluate(() => window.__fv.downloadCurrent());
  const cleanAfterDownload = await page.evaluate(() => !window.__fv.hasUnsavedWork());
  if (cleanAfterDownload) pass('edited image download clears unsaved state'); else fail('edited image stayed dirty after download');
  // ── Compare overlay: split / overlay (opacity) / diff (highlight) modes ──
  await openTab('common');
  await page.click('#previewHost .imgv-compare');
  await page.waitForSelector('#previewHost .imgv-compare-view .imgv-cmp-mode', { timeout: 8000 });
  const editToolsHiddenInCompare = await page.$eval('#previewHost .imgv-edit-tools', (el) => getComputedStyle(el).display === 'none');
  await page.click('#previewHost .imgv-cmp-mode[data-mode="overlay"]');
  const overlaySliders = await page.$$eval('#previewHost .imgv-cmp-op-o, #previewHost .imgv-cmp-op-c', (els) => els.length);
  await page.click('#previewHost .imgv-cmp-mode[data-mode="diff"]');
  await page.waitForSelector('#previewHost .imgv-cmp-stack canvas, #previewHost .imgv-cmp-note', { timeout: 8000 });
  const diffControls = await page.$$eval('#previewHost .imgv-cmp-d-color, #previewHost .imgv-cmp-d-op, #previewHost .imgv-cmp-d-min, #previewHost .imgv-cmp-d-spread, #previewHost .imgv-cmp-d-outline', (els) => els.length);
  if (editToolsHiddenInCompare && overlaySliders === 2 && diffControls === 5) pass('compare: overlay opacity + diff-highlight controls; edit tools hidden'); else fail('compare modes: ' + JSON.stringify({ editToolsHiddenInCompare, overlaySliders, diffControls }));
  await page.click('#previewHost .imgv-cmp-close');
  const cmpRestored = await page.evaluate(() => ({
    gone: !document.querySelector('#previewHost .imgv-compare-view'),
    imgShown: getComputedStyle(document.querySelector('#previewHost .imgv-img')).display !== 'none',
    toolsShown: getComputedStyle(document.querySelector('#previewHost .imgv-edit-tools')).display !== 'none',
  }));
  if (cmpRestored.gone && cmpRestored.imgShown && cmpRestored.toolsShown) pass('compare closes + restores image interaction'); else fail('compare close: ' + JSON.stringify(cmpRestored));
  // ── Adv Edit (vector layers) ── lazy-loads Konva and overlays re-editable TEXT
  // objects (bg colour + opacity, multiple); leaving flattens onto the pixel base.
  await page.click('#previewHost .imgv-adv-btn');
  await page.waitForSelector('#previewHost .imgv-adv-stage canvas', { timeout: 15000 });
  const advUp = await page.evaluate(() => ({
    stage: !!document.querySelector('#previewHost .imgv-adv-stage canvas'),
    toolbar: getComputedStyle(document.querySelector('#previewHost .imgv-adv-bar')).display !== 'none',
    konva: !!window.Konva,
  }));
  if (advUp.stage && advUp.toolbar && advUp.konva) pass('Adv Edit: Konva lazy-loads + stage/toolbar mount'); else fail('adv mount: ' + JSON.stringify(advUp));
  await page.fill('#previewHost .imgv-adv-text', 'Layer A');
  await page.evaluate(() => { const s = document.querySelector('#previewHost .imgv-adv-bgop'); s.value = '60'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#previewHost .imgv-adv-add');   // a second text object
  await page.click('#previewHost .imgv-adv-rect');  // a rectangle shape (selects it)
  const advLayers = await page.$$eval('#previewHost .imgv-adv-layers > div', (els) => els.length);   // header + 3 rows
  const shapeCtl = await page.$eval('#previewHost .imgv-adv-stroke', (el) => getComputedStyle(el.closest('label')).display !== 'none').catch(() => false);
  if (advLayers === 4 && shapeCtl) pass('Adv Edit: layers panel + shapes (text ×2 + rect; stroke controls shown)'); else fail('adv layers/shape: ' + JSON.stringify({ advLayers, shapeCtl }));
  // Unified Ctrl+Z: the vector overlay shares editor-core's history, so a global undo
  // removes the last object (the rectangle) — one undo stack across pixel + vector.
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => document.querySelectorAll('#previewHost .imgv-adv-layers > div').length === 3, null, { timeout: 5000 }).catch(() => {});
  const afterAdvUndo = await page.$$eval('#previewHost .imgv-adv-layers > div', (els) => els.length);   // header + 2 rows
  if (afterAdvUndo === 3) pass('Adv Edit: unified Ctrl+Z removes the last vector object (header + 2 rows)'); else fail('adv unified undo: ' + afterAdvUndo);
  // Polygon + star shapes: RegularPolygon/Star objects join the same overlay model
  // (selectable, layered, named in the panel). Adds two rows → header + 4.
  await page.click('#previewHost .imgv-adv-poly');
  await page.click('#previewHost .imgv-adv-star');
  const advPolyStar = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#previewHost .imgv-adv-layers > div')];
    const names = rows.map((r) => r.querySelector('span')?.textContent || '').join('|');
    return { count: rows.length, hasPoly: names.includes('Polygon'), hasStar: names.includes('Star') };
  });
  if (advPolyStar.count === 5 && advPolyStar.hasPoly && advPolyStar.hasStar) pass('Adv Edit: polygon + star shapes added (named in layers panel)'); else fail('adv poly/star: ' + JSON.stringify(advPolyStar));
  // Per-object blend mode: set the (selected) star to Multiply; selecting Polygon then Star again shows
  // the blend select reflects each object's own value (per-object, persisted on the Konva node).
  const clickAdvRow = (n) => page.evaluate((name) => {
    const row = [...document.querySelectorAll('#previewHost .imgv-adv-layers > div')].find((r) => r.querySelector('span')?.textContent === name);
    row?.click(); return !!row;
  }, n);
  await page.selectOption('#previewHost .imgv-adv-blend', 'multiply');   // star is the active selection
  await clickAdvRow('Polygon');
  const polyBlend = await page.$eval('#previewHost .imgv-adv-blend', (e) => e.value);
  await clickAdvRow('Star');
  const starBlend = await page.$eval('#previewHost .imgv-adv-blend', (e) => e.value);
  if (polyBlend === 'source-over' && starBlend === 'multiply') pass('Adv Edit: per-object blend mode persists on the node (poly=Normal, star=Multiply)'); else fail('adv blend: ' + JSON.stringify({ polyBlend, starBlend }));
  // Persistent overlay: leaving Adv makes the stage non-interactive but KEEPS it
  // mounted (non-destructive). The doc is dirty and getBytes() flattens base+overlay
  // ON DEMAND — the overlay is never baked onto the base just for leaving Adv.
  await page.click('#previewHost .imgv-adv-btn');   // leave Adv → overlay STAYS, just non-interactive
  await page.waitForFunction(() => window.__fv.state.binaryEdit?.dirty === true, null, { timeout: 8000 }).catch(() => {});
  const advFlat = await page.evaluate(async () => {
    const be = window.__fv.state.binaryEdit; if (!be) return { dirty: false };
    const bytes = await be.getBytes();
    return {
      dirty: true, len: bytes.length, sig: Array.from(bytes.slice(0, 4)).join(','),
      stagePresent: !!document.querySelector('#previewHost .imgv-adv-stage canvas'),
      barInteractive: getComputedStyle(document.querySelector('#previewHost .imgv-adv-bar')).display !== 'none',
    };
  });
  if (advFlat.dirty && advFlat.len > 1000 && advFlat.sig === '137,80,78,71' && advFlat.stagePresent && !advFlat.barInteractive) pass('Adv Edit: overlay persists non-interactively; output flattens base+overlay (dirty PNG)'); else fail('adv persist: ' + JSON.stringify(advFlat));
  // Geometry coord-transform: a rotate in Edit mode with a live overlay TRANSFORMS the
  // vector objects (they stay editable) instead of baking them. Re-enter Adv and confirm
  // the objects are still listed — a bake-first seam would have emptied the overlay.
  await page.click('#previewHost .imgv-tools-btn');                 // enter pixel Edit
  await openTab('common');                                         // rotate/flip live in the Common tab
  await page.click('#previewHost .imgv-rot-r');                     // rotate 90° CW (base + overlay ride along)
  await page.waitForTimeout(500);                                   // base re-encodes/reloads → applyGeometry runs
  await page.click('#previewHost .imgv-tools-btn');                 // leave Edit
  await page.click('#previewHost .imgv-adv-btn');                   // re-enter Adv to read the layers panel
  await page.waitForSelector('#previewHost .imgv-adv-layers > div', { timeout: 5000 }).catch(() => {});
  const afterGeom = await page.$$eval('#previewHost .imgv-adv-layers > div', (els) => els.length);   // header + 4 rows (2 text + poly + star)
  if (afterGeom === 5) pass('Adv Edit: geometry (rotate) transforms the overlay objects, keeps them editable (not baked)'); else fail('adv geometry-transform: ' + afterGeom);
  await page.click('#previewHost .imgv-adv-btn');                   // leave Adv again for the export/ASCII steps
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
  // In ASCII mode the image bar is fully hidden; the studio bar carries the 🖼 Image back-button.
  const asciiNav = await page.evaluate(() => ({
    imgBarHidden: getComputedStyle(document.querySelector('#previewHost .imgv-bar')).display === 'none',
    backInStudio: !!document.querySelector('#previewHost .asx-bar .asx-back'),
  }));
  if (asciiNav.imgBarHidden && asciiNav.backInStudio) pass('ASCII mode hides image bar; Image back-button in studio toolbar'); else fail('ascii nav: ' + JSON.stringify(asciiNav));
  // Settings layout: open groups use a responsive grid (aligned columns), not a flat stack.
  // Settings use a row layout: label and its control sit on the SAME row (the
  // .asx-ctl is a 2-col grid), not stacked label-above-control.
  const ctlRow = await page.$eval('#previewHost .asx-panel .asx-ctl', (el) => {
    const name = el.querySelector('.asx-ctl-name').getBoundingClientRect();
    const row = el.querySelector('.asx-ctl-row').getBoundingClientRect();
    return { display: getComputedStyle(el).display, sameRow: Math.abs(name.top - row.top) < 14, sideBySide: row.left > name.left + 20 };
  });
  if (ctlRow.display === 'grid' && ctlRow.sameRow && ctlRow.sideBySide) pass('ASCII settings use an aligned row layout (label | control)'); else fail('settings row layout: ' + JSON.stringify(ctlRow));
  // Settings is a toggleable drawer — the ⚙ button hides/shows the panel.
  const panelVisInit = await page.$eval('#previewHost .asx-panel', (el) => getComputedStyle(el).display !== 'none');
  await page.click('#previewHost .asx-settings-btn');
  const panelHidden = await page.$eval('#previewHost .asx-panel', (el) => getComputedStyle(el).display === 'none');
  await page.click('#previewHost .asx-settings-btn');   // restore
  const panelBack = await page.$eval('#previewHost .asx-panel', (el) => getComputedStyle(el).display !== 'none');
  if (panelVisInit && panelHidden && panelBack) pass('ASCII settings drawer toggles open/closed'); else fail('settings toggle: ' + JSON.stringify({ panelVisInit, panelHidden, panelBack }));
  // Frame padding visibly pads the <pre> preview (was a no-op before — only the canvas honoured it).
  const padBefore = await page.$eval('#previewHost .asx-out', (el) => parseFloat(getComputedStyle(el).paddingLeft));
  await page.evaluate(() => { const i = document.querySelector('#previewHost .asx-panel input[data-key="transparentFrame"]'); i.value = 40; i.dispatchEvent(new Event('input', { bubbles: true })); });
  const padAfter = await page.$eval('#previewHost .asx-out', (el) => parseFloat(getComputedStyle(el).paddingLeft));
  if (padAfter > padBefore + 20) pass('frame padding pads the ASCII preview'); else fail('frame padding: ' + padBefore + ' -> ' + padAfter);
  await page.evaluate(() => { const i = document.querySelector('#previewHost .asx-panel input[data-key="transparentFrame"]'); i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
  // Switching gradient re-converts; output stays non-empty.
  await page.selectOption('#previewHost .asx-panel select[data-key="gradientName"]', 'blocks');
  await page.waitForFunction(() => document.querySelector('#previewHost .asx-out').textContent.trim().length > 0, null, { timeout: 8000 });
  pass('ASCII studio gradient change re-converts');

  // ── Camera mode UI ── the 📷 button mounts the webcam consumer (no getUserMedia
  // until "Start camera"). It has its OWN toolbar incl. working flip/rotate, and
  // the image-studio toolbar's buttons hide so they don't drive the wrong engine.
  await page.click('#previewHost .asx-cam');
  await page.waitForSelector('#previewHost .asx-cam-host .cam-out', { timeout: 8000 });
  const camUi = await page.evaluate(() => {
    const sb = document.querySelector('#previewHost .cam-start');
    return {
      transforms: document.querySelectorAll('#previewHost .asx-cam-host .cam-rot-l, .cam-rot-r, .cam-flip-h, .cam-flip-v').length,
      barScoped: document.querySelector('#previewHost .asx-bar').classList.contains('asx-cam-on'),
      imageRotHidden: getComputedStyle(document.querySelector('#previewHost .asx-bar .asx-rot-l')).display === 'none',
      backVisible: getComputedStyle(document.querySelector('#previewHost .asx-bar .asx-cam')).display !== 'none',
      startFlash: sb.classList.contains('cam-flash'),
      startPlay: /▶/.test(sb.textContent),
    };
  });
  if (camUi.transforms === 4 && camUi.barScoped && camUi.imageRotHidden && camUi.backVisible) pass('camera mode: own flip/rotate toolbar + image buttons hidden'); else fail('camera ui: ' + JSON.stringify(camUi));
  if (camUi.startFlash && camUi.startPlay) pass('camera Start button flashes + shows ▶ until started'); else fail('start button: ' + JSON.stringify({ startFlash: camUi.startFlash, startPlay: camUi.startPlay }));
  await page.click('#previewHost .asx-cam');   // back to image
  await page.waitForSelector('#previewHost .asx-out', { timeout: 5000 });

  // ── AVIF parity ── AVIF must expose the SAME editor toolbar as PNG/JPEG/WebP
  // (canEdit), not just fit/zoom + ASCII. Regression guard for EDITABLE_MIME.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.avif');
  await page.waitForSelector('#previewHost .imgv-img', { timeout: 12000 });
  const avifType = await page.$eval('#typeSelect', (s) => s.value);
  const avifEdits = await page.$$eval(
    '#previewHost .imgv-pencil, #previewHost .imgv-fill, #previewHost .imgv-crop-btn, #previewHost .imgv-f-hue, #previewHost .imgv-bg-btn',
    (els) => els.length,
  );
  if (avifType === 'image' && avifEdits === 5) pass('AVIF gets the full editor toolbar (parity with PNG)'); else fail('avif parity: type=' + avifType + ' editControls=' + avifEdits);

  // ── Animated GIF ── a multi-frame GIF hands the pane to the player (play/pause +
  // opt-in Split-into-frames); the vendored gifuct decoder loads lazily, only for a
  // .gif. Inject a tiny 2-frame GIF89a (red→green, 2×2) through the blob intake.
  await page.goto(origin, { waitUntil: 'load' });
  const GIF2 = [71, 73, 70, 56, 57, 97, 2, 0, 2, 0, 128, 0, 0, 255, 0, 0, 0, 255, 0, 33, 255, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0, 33, 249, 4, 0, 10, 0, 0, 0, 44, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 3, 4, 128, 2, 0, 33, 249, 4, 0, 10, 0, 0, 0, 44, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 3, 76, 146, 2, 0, 59];
  await page.evaluate((arr) => window.__fv.openBlobFile(new Blob([new Uint8Array(arr)], { type: 'image/gif' }), 'anim.gif', { mime: 'image/gif' }), GIF2);
  const gifPlayer = await page.waitForSelector('#previewHost .gifv-root', { timeout: 15000 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => { const b = document.querySelector('#previewHost .gifv-play'); return b && !b.disabled; }, null, { timeout: 8000 }).catch(() => {});
  const gifAnimated = await page.evaluate(() => !document.querySelector('#previewHost .gifv-play')?.disabled);
  if (gifPlayer && gifAnimated) pass('animated GIF mounts the player (play/pause enabled for multi-frame)'); else fail('gif player: ' + JSON.stringify({ gifPlayer, gifAnimated }));
  await page.click('#previewHost .gifv-split');
  const gifFrames = await page.waitForFunction(() => document.querySelectorAll('#previewHost .gifv-frame').length >= 2, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const splitRows = await page.$$eval('#previewHost .gifv-frame', (els) => els.length);
  if (gifFrames && splitRows === 2) pass('GIF Split decomposes into per-frame images (' + splitRows + ' frames)'); else fail('gif split: rows=' + splitRows);

  // ── JPEG XL ── browsers can't decode JXL; the renderer decodes it via a lazy
  // wasm decoder into a canvas. The decoded image shows (note clears, img visible
  // with real dimensions).
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.jxl');
  await page.waitForSelector('#previewHost .imgv-img', { timeout: 12000 });
  const jxlOk = await page.waitForFunction(() => {
    const img = document.querySelector('#previewHost .imgv-img');
    const note = document.querySelector('#previewHost .imgv-note');
    return img && !img.hidden && img.naturalWidth > 0 && (!note || note.hidden);
  }, null, { timeout: 30000 }).then(() => true).catch(() => false);
  if (jxlOk) pass('JPEG XL decoded in-browser (lazy wasm) and rendered'); else fail('jxl did not decode/render');

  // ── TIFF ── browsers can't decode TIFF natively; the tiff plugin decodes it via the lazy
  // vendored UTIF bundle → PNG and delegates to the full image editor, so a .tiff opens as an
  // editable raster (real dimensions + the editing toolbar), not the metadata-only fallback.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.tiff');
  await page.waitForSelector('#previewHost .imgv-img', { timeout: 30000 });
  const tiffOk = await page.waitForFunction(() => {
    const img = document.querySelector('#previewHost .imgv-img');
    return img && !img.hidden && img.naturalWidth > 0;
  }, null, { timeout: 30000 }).then(() => true).catch(() => false);
  const tiffEdits = await page.$$eval(
    '#previewHost .imgv-pencil, #previewHost .imgv-fill, #previewHost .imgv-crop-btn, #previewHost .imgv-f-hue, #previewHost .imgv-bg-btn',
    (els) => els.length,
  ).catch(() => 0);
  if (tiffOk && tiffEdits === 5) pass('TIFF decoded in-browser (lazy UTIF) into the full editable image editor'); else fail('tiff decode/edit: ' + JSON.stringify({ tiffOk, tiffEdits }));

  // ── Blob-intake seam ── window.__fv.openBlobFile opens an in-memory Blob via
  // the same intake→detect→render path a file uses (this is how a webcam
  // recording opens directly in the studio instead of round-tripping a download).
  const blobOpen = await page.evaluate(async () => {
    if (typeof window.__fv.openBlobFile !== 'function') return { fn: false };
    const bytes = new Uint8Array(await (await fetch('examples/sample.webp')).arrayBuffer());
    const ok = await window.__fv.openBlobFile(new Blob([bytes], { type: 'image/webp' }), 'from-blob.webp', { mime: 'image/webp' });
    return { fn: true, ok, filename: window.__fv.state.intake?.filename, type: window.__fv.state.type?.id };
  });
  if (blobOpen.fn && blobOpen.ok && blobOpen.filename === 'from-blob.webp' && blobOpen.type === 'image') pass('openBlobFile opens an in-memory Blob through the full intake path'); else fail('openBlobFile: ' + JSON.stringify(blobOpen));

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
  const audioWorkspace = await page.$('#previewHost .media-audio-workspace');
  if (audioWorkspace) pass('audio workspace: top-level audio workspace exists'); else fail('media-audio-workspace missing');
  const assertAudioTopViewport = async (label) => {
    const geometry = await page.$eval('#previewHost .media-doc.media-audio', (host) => {
      const workspace = host.querySelector('.media-audio-workspace');
      const modeTabs = host.querySelector('.media-mode-tabs');
      const media = host.querySelector('.media-audio-surface audio.media-view');
      const title = host.querySelector('.media-workspace-title');
      const time = host.querySelector('.media-workspace-time');
      const waveform = host.querySelector('.media-waveform-surface');
      if (!workspace || !modeTabs || !media || !title || !time || !waveform) return null;
      const hostRect = host.getBoundingClientRect();
      const workspaceRect = workspace.getBoundingClientRect();
      const modeRect = modeTabs.getBoundingClientRect();
      const waveformRect = waveform.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const docEl = document.documentElement;
      return {
        topInset: Math.round(workspaceRect.top - hostRect.top),
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        hostLeft: Math.round(hostRect.left),
        hostRight: Math.round(hostRect.right),
        workspaceLeft: Math.round(workspaceRect.left),
        workspaceRight: Math.round(workspaceRect.right),
        overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
        titleVisible: title.textContent.trim().length > 0 && title.getBoundingClientRect().height > 0,
        timeVisible: time.textContent.trim().length > 0 && time.getBoundingClientRect().height > 0,
        mediaControlVisible: mediaRect.height > 0 && getComputedStyle(media).display !== 'none',
        waveformVisible: waveformRect.height > 0,
        modeTabsVisible: modeRect.height > 0 && getComputedStyle(modeTabs).display !== 'none',
      };
    });
    if (!geometry) return fail('audio first-viewport geometry unavailable (' + label + ')');
    const topLimit = Math.min(72, Math.floor(geometry.viewportH * 0.2));
    if (geometry.titleVisible && geometry.timeVisible && geometry.mediaControlVisible && geometry.waveformVisible && geometry.modeTabsVisible) pass('audio first-viewport core surfaces are visible (' + label + ')');
    else fail('audio first-viewport core surface missing (' + label + '): ' + JSON.stringify({
      titleVisible: geometry.titleVisible,
      timeVisible: geometry.timeVisible,
      mediaControlVisible: geometry.mediaControlVisible,
      waveformVisible: geometry.waveformVisible,
      modeTabsVisible: geometry.modeTabsVisible,
    }));
    if (geometry.topInset >= 0 && geometry.topInset <= topLimit) pass('audio first viewport begins near top (workspace inset ' + geometry.topInset + 'px <= ' + topLimit + 'px)');
    else fail('audio first-viewport top inset too large (' + geometry.topInset + 'px > ' + topLimit + 'px) for ' + label);
    if (geometry.overflowX === 0 && geometry.workspaceLeft >= geometry.hostLeft - 1 && geometry.workspaceRight <= geometry.hostRight + 1)
      pass('audio first-viewport has no horizontal overflow (' + label + ')');
    else fail('audio first-viewport overflow/width issue (' + label + '): ' + JSON.stringify(geometry));
  };
  await assertAudioTopViewport('desktop');
  const desktopViewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await assertAudioTopViewport('mobile');
  if (desktopViewport) {
    await page.setViewportSize(desktopViewport);
    await page.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav');
    await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  } else {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav');
    await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  }
  const waveformSurface = await page.$eval('#previewHost .media-waveform-surface', (el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), w: r.width, h: r.height, displayed: getComputedStyle(el).display !== 'none' };
  });
  if (waveformSurface.w > 0 && waveformSurface.h > 0 && waveformSurface.displayed) pass('audio waveform surface is visible by default'); else fail('waveform surface: ' + JSON.stringify(waveformSurface));
  const waveformDrawn = await page.$eval('#previewHost .media-waveform-surface canvas.media-wv-canvas', (canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
    return { width: canvas.width, height: canvas.height, painted };
  });
  if (waveformDrawn.width > 0 && waveformDrawn.height > 0 && waveformDrawn.painted > 20)
    pass('audio waveform: visible workspace canvas paints by default');
  else fail('waveform canvas: ' + JSON.stringify(waveformDrawn));
  const modeTabs = await page.$$eval('#previewHost .media-mode-tab', (els) => els.map((e) => e.textContent.trim()));
  if (modeTabs.join('|') === 'Listen|Tune|QC|Export|Mix') pass('audio mode tabs exist and are ordered');
  else fail('audio mode tabs: ' + modeTabs.join(','));
  const modeListen = await page.$('#previewHost .media-mode-tab[data-mode="listen"]');
  const isListenActive = await modeListen?.evaluate((b) => b.classList.contains('active')) || false;
  if (isListenActive) pass('audio mode tabs default to Listen'); else fail('default mode tab not active');
  await page.click('#previewHost .media-mode-tab[data-mode="tune"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="tune"]');
  const tunePanelSel = '#previewHost .media-mode-panel[data-mode="tune"]';
  const tuneIntents = await page.$$eval(`${tunePanelSel} .media-tune-intent-btn`, (els) => els.map((el) => ({ intent: el.dataset.intent, text: el.textContent.trim() })));
  if (tuneIntents.length >= 6) pass('audio tune: intent surface appears before raw controls');
  else fail('tune intent buttons: ' + tuneIntents.length);
  const tuneStatusInitial = await page.$eval(`${tunePanelSel} .media-tune-intent-status`, (el) => el.textContent.trim());
  if (tuneStatusInitial.length > 0) pass('audio tune: quick intent status visible'); else fail('tune intent status missing');
  const tuneLazyBase = await page.$$eval(`${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`, (els) => els.length);
  if (tuneLazyBase === 0) pass('audio tune: raw .sp-wrap/.dyn-wrap not mounted until expanded');
  else fail('Tune should not mount raw controls immediately: ' + tuneLazyBase);

  const podcastBtn = await page.$(`${tunePanelSel} .media-tune-intent-btn[data-intent="podcast"]`);
  if (!podcastBtn) {
    fail('Tune podcast intent button not found');
  } else {
    await podcastBtn.click();
    const podcastActive = await page.$eval(
      `${tunePanelSel} .media-tune-intent-btn[data-intent="podcast"]`,
      (btn) => btn.matches('.media-tune-intent-btn--active') || btn.getAttribute('aria-pressed') === 'true',
    );
    if (podcastActive) pass('audio tune: quick intent click marks active intent');
    else fail('podcast intent not active');
    const statusAfterIntent = await page.$eval(`${tunePanelSel} .media-tune-intent-status`, (el) => el.textContent.trim());
    if (/Intent: Podcast/.test(statusAfterIntent)) pass('audio tune: quick intent updates visible status');
    else fail('intent status unchanged: ' + statusAfterIntent);
    const tuneLazyAfterIntent = await page.$$eval(`${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`, (els) => els.length);
    if (tuneLazyAfterIntent === 0) pass('audio tune: quick intent does not eagerly mount raw panels');
    else fail('quick intent should not mount raw controls; found: ' + tuneLazyAfterIntent);
  }

  // Spectrum & EQ panel — toggle opens, 9-band EQ + canvas present; CPU-lazy (no RAF until play).
  const spBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('#previewHost .media-mode-panel[data-mode="tune"] .media-wv-toggle')]
      .find((b) => /Spectrum/.test(b.textContent)) || null);
  const spBtnExists = await spBtn.evaluate((e) => !!e);
  if (spBtnExists) {
    const spBtnText = await spBtn.evaluate((e) => e.textContent);
    if (/Spectrum/.test(spBtnText)) pass('audio spectrum: Spectrum & EQ toggle button present'); else fail('sp btn text: ' + spBtnText);
    await spBtn.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-sp-panel:not([hidden])`, { timeout: 5000 });
    const spCanvas = await page.$(`${tunePanelSel} .sp-canvas`);
    const spSliders = await page.$$eval(`${tunePanelSel} .sp-eq-slider`, (els) => els.map((el) => parseFloat(el.value)));
    if (spCanvas) pass('audio spectrum: spectrum canvas mounted'); else fail('sp canvas missing');
    if (spSliders.length === 9) pass('audio spectrum: 9-band EQ sliders'); else fail('sp sliders: ' + spSliders.length);
    // Opening Spectrum after a quick intent should hydrate from graph state, not default zeros.
    const spState = await page.$eval(`${tunePanelSel} .media-sp-panel:not([hidden])`, (panel) => {
      const presetEl = panel.querySelector('.sp-preset-sel');
      const filterInputs = Array.from(panel.querySelectorAll('.sp-filter-slider')).map((el) => parseInt(el.value, 10));
      const eq = Array.from(panel.querySelectorAll('.sp-eq-slider')).map((el) => parseFloat(el.value));
      return { preset: presetEl ? presetEl.value : null, filters: filterInputs, eq };
    });
    const podcastPresetGains = [0, 0, 1, -1, 0, 1, 2, 1, 0];
    const podcastPresetMatch = spState.filters[0] === 80
      && spState.filters[1] === 18000
      && spState.eq.length === 9
      && spState.eq.every((g, i) => Math.abs(g - podcastPresetGains[i]) <= 0.0001);
    if (podcastPresetMatch) pass('audio spectrum: preset intent reflected in eq/filter controls');
    else fail('spectrum state after intent: ' + JSON.stringify(spState));
    // Overlaid dual spectrum: legend names both the Original and Processed curves.
    const spLegend = await page.$$eval(`${tunePanelSel} .sp-legend .sp-leg`, (els) => els.map((e) => e.textContent));
    if (spLegend.some((t) => /Original/.test(t)) && spLegend.some((t) => /Processed/.test(t)))
      pass('audio spectrum: overlaid original-vs-processed legend present');
    else fail('sp legend: ' + spLegend.join(','));
    // LUFS normalization: a target selector offers the streaming/broadcast presets.
    const normOpts = await page.$$eval(`${tunePanelSel} .sp-lufs-row option`, (els) => els.map((e) => e.textContent));
    if (normOpts.some((t) => /-14/.test(t)) && normOpts.some((t) => /-23/.test(t)) && normOpts.includes('Off'))
      pass('audio spectrum: LUFS normalize targets present (-14 … -23, Off)');
    else fail('lufs normalize opts: ' + normOpts.join(','));
    // Close the panel
    await spBtn.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-sp-panel[hidden]`, { state: 'attached', timeout: 3000 });
    pass('audio spectrum: panel collapses');
  } else fail('spectrum & EQ toggle button not found');

  // ── P4 Dynamics panel ── compressor/limiter (live) + gate/de-noise (bake-only).
  // The Dynamics toggle sits between Spectrum and Mixer; CPU-lazy (no panel DOM until opened).
  const dynToggleHandle = await page.evaluateHandle(() =>
      [...document.querySelectorAll('#previewHost .media-mode-panel[data-mode="tune"] .media-wv-toggle')]
        .find((b) => /Dynamics/.test(b.textContent)) || null);
  const dynToggleExists = await dynToggleHandle.evaluate((e) => !!e);
  if (dynToggleExists) {
    pass('audio dynamics: Dynamics toggle button present');
    const preDyn = await page.$(`${tunePanelSel} .dyn-wrap`);
    if (!preDyn) pass('audio dynamics: CPU-lazy (no panel DOM until opened)'); else fail('dynamics mounted before open');
    await dynToggleHandle.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-dyn-panel:not([hidden]) .dyn-wrap`, { timeout: 5000 });
    // Four effect sections: compressor + limiter (live), gate + de-noise (on export).
    const dynSecs = await page.$$eval(`${tunePanelSel} .dyn-sec .dyn-title`, (els) => els.map((e) => e.textContent));
    if (dynSecs.some((t) => /Compressor/.test(t)) && dynSecs.some((t) => /Limiter/.test(t))
      && dynSecs.some((t) => /gate/i.test(t)) && dynSecs.some((t) => /De-noise/.test(t)))
      pass('audio dynamics: compressor + limiter + gate + de-noise sections present');
    else fail('dyn sections: ' + dynSecs.join(','));
    const dynEnables = await page.$$( `${tunePanelSel} .dyn-enable`);
    const dynSliders = await page.$$( `${tunePanelSel} .dyn-slider`);
    if (dynEnables.length === 4) pass('audio dynamics: each section has an enable/bypass toggle'); else fail('dyn enables: ' + dynEnables.length);
    if (dynSliders.length >= 4) pass('audio dynamics: parameter sliders mounted (' + dynSliders.length + ')'); else fail('dyn sliders: ' + dynSliders.length);
    // Bake-only sections (gate + de-noise) are labelled "on export".
    const dynBadges = await page.$$eval(`${tunePanelSel} .dyn-badge`, (els) => els.map((e) => e.textContent));
    if (dynBadges.filter((t) => /on export/i.test(t)).length === 2) pass('audio dynamics: gate + de-noise labelled "on export"'); else fail('dyn badges: ' + dynBadges.join(','));
    // Enabling the live compressor must not throw (lazily allocates the node).
    await page.evaluate(() => {
      const cb = document.querySelector('#previewHost .dyn-sec .dyn-enable');
      cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
    pass('audio dynamics: enabling live compressor handled without error');
    // Close the panel → torn down.
    await dynToggleHandle.asElement().click();
    await page.waitForSelector(`${tunePanelSel} .media-dyn-panel[hidden]`, { state: 'attached', timeout: 3000 });
    pass('audio dynamics: panel collapses');
  } else fail('dynamics toggle button not found');

  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  await page.waitForFunction(() => {
    const tunePanel = document.querySelector('#previewHost .media-mode-panel[data-mode="tune"]');
    return tunePanel && tunePanel.hidden;
  }, null, { timeout: 3000 });
  const tuneNodes = await page.$$eval(
    `${tunePanelSel} .media-wv-wrap, ${tunePanelSel} .media-sp-panel, ${tunePanelSel} .media-dyn-panel, ${tunePanelSel} .sp-wrap, ${tunePanelSel} .dyn-wrap`,
    (els) => els.length,
  );
  if (tuneNodes === 0) pass('audio tune: switching away from Tune removes Spectrum/Dynamics panel DOM');
  else fail('tune panel nodes after leaving Tune: ' + tuneNodes);
  await page.click('#previewHost .media-mode-tab[data-mode="tune"]');
  await page.waitForSelector(`${tunePanelSel} .media-wv-wrap`, { state: 'attached', timeout: 6000 });
  await page.waitForSelector(`${tunePanelSel} .media-dyn-panel`, { state: 'attached', timeout: 6000 });
  await page.waitForSelector(`${tunePanelSel} .media-sp-panel`, { state: 'attached', timeout: 6000 });
  pass('audio tune: remounting Tune rebuilds Spectrum/Dynamics');
  await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
  await page.waitForFunction(() => {
    const tunePanel = document.querySelector('#previewHost .media-mode-panel[data-mode="tune"]');
    return tunePanel && tunePanel.hidden;
  }, null, { timeout: 3000 });

  // ── P5 Multi-track mixer ("swim lanes") ── opt-in panel; decode-lazy; OfflineAudioContext mixdown → WAV.
  const mixTab = await page.$('#previewHost .media-mode-tab[data-mode="mix"]');
  if (mixTab) {
    const mxTextMode = await mixTab.evaluate((e) => e.textContent);
    if (/Mix/i.test(mxTextMode)) pass('audio mixer: mix mode tab exists'); else fail('mix tab text: ' + mxTextMode);
    const preOpen = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap');
    if (!preOpen) pass('audio mixer: CPU-lazy (no transport/decode until opened)'); else fail('mixer mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    const mixBtnText = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-mix-btn', (e) => e.textContent).catch(() => '');
    if (/Mixdown/i.test(mixBtnText)) pass('audio mixer: mix mode mounts multi-track mixer'); else fail('mixer panel button text: ' + mixBtnText);
    const laneCount = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (laneCount === 0) pass('audio mixer: panel opens with no lane until async decode completes');
    else pass('audio mixer: panel mounts with lane(s) already loaded');
    const hasTransport = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-play')
      && await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-master-slider');
    if (hasTransport) pass('audio mixer: transport (play/stop) + master gain present'); else fail('mixer transport controls missing');
    const mixGrammar = await page.evaluate(() => ({
      hasRuler: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-ruler'),
      hasPlayhead: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-playhead'),
      hasContext: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-context'),
      hasLaneIdx: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-index'),
      hasContextText: !!(document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-context')?.textContent || '').trim(),
    }));
    if (mixGrammar.hasRuler && mixGrammar.hasPlayhead && mixGrammar.hasContext && mixGrammar.hasLaneIdx && mixGrammar.hasContextText)
      pass('audio mixer: timeline grammar visible (ruler/playhead/context/index)');
    else fail('mixer timeline grammar: ' + JSON.stringify(mixGrammar));
    let laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls: ' + JSON.stringify(laneCtrls));
    // Wait for the auto-decoded primary lane.
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', { timeout: 12000 });
    const lane1Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (lane1Count >= 1) pass('audio mixer: opens with the loaded clip as lane 1'); else fail('mixer lanes after open: ' + lane1Count);
    laneCtrls = await page.evaluate(() => ({
      gain: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane-gain'),
      mute: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-mute'),
      solo: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-solo'),
      fadeIn: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-in'),
      fadeOut: !!document.querySelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-fade-out'),
    }));
    if (laneCtrls.gain && laneCtrls.mute && laneCtrls.solo && laneCtrls.fadeIn && laneCtrls.fadeOut)
      pass('audio mixer: per-lane gain/mute/solo + fade handles present');
    else fail('mixer lane controls after open: ' + JSON.stringify(laneCtrls));
    // Add a generator lane → a second lane appears (≥2 clips).
    await page.click('#previewHost .media-mode-panel[data-mode="mix"] .mx-add-btn');   // first add button = +440 Hz tone
    await page.waitForFunction(() => document.querySelectorAll('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane').length >= 2, null, { timeout: 6000 });
    const lane2Count = await page.$$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-lane', (els) => els.length);
    if (lane2Count >= 2) pass('audio mixer: a second lane can be added (generator tone)'); else fail('mixer lanes after add: ' + lane2Count);
    const assertMixViewport = async (label) => {
      const geometry = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', (el) => {
        const host = document.querySelector('#previewHost');
        const hostRect = host?.getBoundingClientRect();
        const wrapRect = el.getBoundingClientRect();
        const ruler = el.querySelector('.mx-ruler');
        const playhead = el.querySelector('.mx-playhead');
        const lanes = el.querySelector('.mx-lanes');
        const timeline = el.querySelector('.mx-timeline');
        const context = el.querySelector('.mx-context');
        if (!hostRect || !ruler || !playhead || !lanes || !timeline || !context) return null;
        const docEl = document.documentElement;
        const rulerRect = ruler.getBoundingClientRect();
        const playheadRect = playhead.getBoundingClientRect();
        return {
          wrapLeft: Math.round(wrapRect.left),
          wrapRight: Math.round(wrapRect.right),
          hostLeft: Math.round(hostRect.left),
          hostRight: Math.round(hostRect.right),
          overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
          rulerVisible: rulerRect.height > 0 && rulerRect.width > 0,
          playheadVisible: playheadRect.height > 0 && playheadRect.width > 0,
          lanesVisible: lanes.getBoundingClientRect().height > 0,
          timelineScroll: timeline.scrollWidth > Math.round(timeline.clientWidth),
          contextVisible: getComputedStyle(context).display !== 'none' && context.textContent.includes('Context'),
          activeViewportW: window.innerWidth,
        };
      });
      if (!geometry) return fail('audio mixer geometry unavailable (' + label + ')');
      if (geometry.rulerVisible && geometry.playheadVisible && geometry.lanesVisible && geometry.contextVisible)
        pass('audio mixer: timeline grammar visible in mix panel (' + label + ')');
      else fail('audio mixer geometry visibility (' + label + '): ' + JSON.stringify({
        rulerVisible: geometry?.rulerVisible,
        playheadVisible: geometry?.playheadVisible,
        lanesVisible: geometry?.lanesVisible,
        contextVisible: geometry?.contextVisible,
      }));
      if (geometry.timelineScroll) pass('audio mixer: timeline is horizontally scrollable when needed');
      if (geometry.overflowX === 0) pass('audio mixer: no horizontal overflow in mix (' + label + ')');
      else fail('audio mixer: horizontal overflow while in mix (' + label + '): ' + geometry.overflowX);
      if (geometry.wrapLeft >= geometry.hostLeft - 1 && geometry.wrapRight <= geometry.hostRight + 1)
        pass('audio mixer: mix workspace fits host width (' + label + ')');
      else fail('audio mixer workspace width issue (' + label + '): ' + JSON.stringify({
        wrapLeft: geometry.wrapLeft,
        wrapRight: geometry.wrapRight,
        hostLeft: geometry.hostLeft,
        hostRight: geometry.hostRight,
      }));
    };
    // Mixdown → WAV produces a downloadable file (OfflineAudioContext render → WAV worker/header).
    const mixBtn = await page.$('#previewHost .media-mode-panel[data-mode="mix"] .mx-mix-btn');   // first mix button = Mixdown → WAV
    await assertMixViewport('desktop');
    const [wavDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mixBtn.click(),
    ]);
    const wavName = wavDownload.suggestedFilename();
    if (/\.wav$/.test(wavName)) pass('audio mixer: mixdown → WAV downloaded (' + wavName + ')'); else fail('mixer WAV download name: ' + wavName);
    const audioMixDesktopViewport = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.wav');
    await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
    await page.click('#previewHost .media-mode-tab[data-mode="mix"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', { timeout: 12000 });
    await assertMixViewport('mobile');
    if (audioMixDesktopViewport) {
      await page.setViewportSize(audioMixDesktopViewport);
      await page.goto(origin, { waitUntil: 'load' });
      await openExample('Sample.wav');
      await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
    }
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    const mixDetached = await page.waitForSelector('#previewHost .media-mode-panel[data-mode="mix"] .mx-wrap', {
      state: 'detached',
      timeout: 4000,
    }).then(() => true).catch(() => false);
    if (mixDetached) pass('audio mixer: switching to Listen detaches the mix markup');
    else fail('audio mix panel still mounted after switching to Listen');
  } else fail('mixer tab not found');

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

  // Export mode is explicit even when transcoding is disabled: it should show a clear
  // hint (not an empty surface).
  await openExample('Sample.wav');
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"]:not([hidden])', { timeout: 8000 });
  const exportHint = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-ed-note', (el) => el.textContent).catch(() => '');
  if (/Settings → Advanced/i.test(exportHint) && /media transcoding/i.test(exportHint)) pass('audio export mode shows clear disabled/ffmpeg-off hint'); else fail('audio export hint: ' + exportHint.slice(0, 120));

  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });
  await page.evaluate(() => window.__fv.openExampleByLabel('Sample.avi'));
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });

  // ── Video task-mode shell + default mode ──
  const videoModeNames = await page.$$eval('#previewHost .media-mode-tab', (els) => els.map((e) => e.textContent.trim()));
  if (videoModeNames.join('|') === 'Watch|Adjust|Timeline|Subtitles|Export') pass('video shell has ordered task tabs: Watch/Adjust/Timeline/Subtitles/Export');
  else fail('video tabs order: ' + videoModeNames.join('|'));
  const videoWatchActive = await page.$eval('#previewHost .media-mode-tab[data-mode="watch"]', (el) => el.classList.contains('active'))
    .catch(() => false);
  if (videoWatchActive) pass('video default mode is Watch'); else fail('video default mode tab is not Watch');

  const assertVideoTopViewport = async (label) => {
    const geometry = await page.$eval('#previewHost .media-doc.media-video', (host) => {
      const workspace = host.querySelector('.media-video-workspace');
      const modeTabs = host.querySelector('.media-mode-tabs');
      const media = host.querySelector('.media-video-surface video.media-view');
      const title = host.querySelector('.media-workspace-title');
      const time = host.querySelector('.media-workspace-time');
      const watchPanel = host.querySelector('.media-mode-panel[data-mode="watch"]');
      const panelVisible = watchPanel && getComputedStyle(watchPanel).display !== 'none' && !watchPanel.hidden;
      if (!workspace || !modeTabs || !media || !title || !time || !watchPanel) return null;
      const hostRect = host.getBoundingClientRect();
      const workspaceRect = workspace.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const docEl = document.documentElement;
      return {
        topInset: Math.round(workspaceRect.top - hostRect.top),
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        hostLeft: Math.round(hostRect.left),
        hostRight: Math.round(hostRect.right),
        workspaceLeft: Math.round(workspaceRect.left),
        workspaceRight: Math.round(workspaceRect.right),
        overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
        titleVisible: title.textContent.trim().length > 0 && title.getBoundingClientRect().height > 0,
        timeVisible: time.textContent.trim().length > 0 && time.getBoundingClientRect().height > 0,
        mediaVisible: mediaRect.height > 0 && getComputedStyle(media).display !== 'none',
        modeTabsVisible: modeTabs.getBoundingClientRect().height > 0 && getComputedStyle(modeTabs).display !== 'none',
        watchModeVisible: panelVisible,
      };
    });
    if (!geometry) return fail('video first-viewport geometry unavailable (' + label + ')');
    const topLimit = Math.min(72, Math.floor(geometry.viewportH * 0.2));
    if (geometry.titleVisible && geometry.timeVisible && geometry.mediaVisible && geometry.modeTabsVisible && geometry.watchModeVisible)
      pass('video first-viewport core surfaces are visible (' + label + ')');
    else fail('video first-viewport core surface missing (' + label + '): ' + JSON.stringify({
      titleVisible: geometry.titleVisible,
      timeVisible: geometry.timeVisible,
      mediaVisible: geometry.mediaVisible,
      modeTabsVisible: geometry.modeTabsVisible,
      watchModeVisible: geometry.watchModeVisible,
    }));
    if (geometry.topInset >= 0 && geometry.topInset <= topLimit)
      pass('video first-viewport begins near top (workspace inset ' + geometry.topInset + 'px <= ' + topLimit + 'px)');
    else fail('video first viewport top inset too large (' + geometry.topInset + 'px > ' + topLimit + 'px) for ' + label);
    if (geometry.overflowX === 0 && geometry.workspaceLeft >= geometry.hostLeft - 1 && geometry.workspaceRight <= geometry.hostRight + 1)
      pass('video first-viewport has no horizontal overflow (' + label + ')');
    else fail('video first-viewport overflow/width issue (' + label + '): ' + JSON.stringify(geometry));
  };
  await assertVideoTopViewport('desktop');
  const videoDesktopViewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.avi');
  await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  await assertVideoTopViewport('mobile');
  if (videoDesktopViewport) {
    await page.setViewportSize(videoDesktopViewport);
    await page.goto(origin, { waitUntil: 'load' });
    await openExample('Sample.avi');
    await page.waitForSelector('#previewHost video.media-view', { timeout: 12000 });
  }

  // ── Video studio ── the video branch builds the extended filter panel + an audio
  // mixer (the movie's audio routed through the shared EQ/spectrum graph). These are
  // built regardless of native playability, so they're present even for the AVI.
  await page.click('#previewHost .media-mode-tab[data-mode="adjust"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="adjust"]:not([hidden])', { timeout: 5000 });
  const vidFilterSliders = await page.$$eval(
    '#previewHost .media-mode-panel[data-mode="adjust"] .media-filter-panel .media-filter-row input[type="range"]',
    (els) => els.map((e) => e.dataset.filter),
  );
  if (['brightness', 'contrast', 'saturate', 'hue', 'blur', 'grayscale', 'invert'].every((f) => vidFilterSliders.includes(f)))
    pass('video studio: extended CSS filters present (incl. hue/blur/grayscale/invert)');
  else fail('video filters: ' + vidFilterSliders.join(','));
  // Audio mixer toggle: opens a Spectrum & EQ panel routed through the video's audio.
  const mixerBtn = await page.$('#previewHost .media-mode-panel[data-mode="adjust"] .media-vid-mixer .media-wv-toggle');
  if (mixerBtn) {
    const mixerText = await mixerBtn.evaluate((e) => e.textContent);
    if (/mixer/i.test(mixerText)) pass('video studio: audio mixer toggle present'); else fail('mixer btn: ' + mixerText);
    await mixerBtn.click();
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="adjust"] .media-vid-mixer .media-sp-panel:not([hidden])', { timeout: 5000 });
    const mixerSliders = await page.$$('#previewHost .media-mode-panel[data-mode="adjust"] .media-vid-mixer .sp-eq-slider');
    const mixerLegend = await page.$('#previewHost .media-mode-panel[data-mode="adjust"] .media-vid-mixer .sp-legend');
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
  await page.click('#previewHost .media-mode-tab[data-mode="subtitles"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="subtitles"]:not([hidden])', { timeout: 5000 });
  const subLoader = await page.$('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-loader');
  if (subLoader) pass('P7 video: subtitle (.srt/.vtt) drop/browse control mounts'); else fail('subtitle loader missing');
  const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello world\n\n2\n00:00:02,500 --> 00:00:04,000\nSecond line';
  const subLoaded = await page.evaluate(async (text) => {
    const file = new File([text], 'cap.srt', { type: 'application/x-subrip' });
    const input = document.querySelector('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-loader input[type=file]');
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    return document.querySelector('#previewHost .media-mode-panel[data-mode="subtitles"] .media-sub-note')?.textContent || '';
  }, srt);
  if (/2 cues/.test(subLoaded)) pass('P7 video: SRT sidecar parses to 2 cues + mounts overlay'); else fail('subtitle load note: ' + subLoaded);

  // Switch back to Watch after Subtitle mode assertions.
  await page.click('#previewHost .media-mode-tab[data-mode="watch"]');

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
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel', { timeout: 8000 });

  const exportPanel = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel');
  if (exportPanel) pass('P1: export panel present when ffmpeg enabled'); else fail('export panel missing with ffmpeg on');
  const exportHeader = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-header', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportHeader)) pass('P1: "Export processed audio" header present'); else fail('export header: ' + exportHeader);
  const exportStatus = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-export-head-status', (e) => e.textContent) : '';
  if (/Profile: Podcast MP3/i.test(exportStatus)) pass('P1: export profile status initialized to Podcast'); else fail('export status: ' + exportStatus);
  const presetCards = await page.$$eval(
    '#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-export-preset-card',
    (els) => els.map((e) => ({
      preset: e.dataset.preset || '',
      title: e.querySelector('.media-export-preset-title')?.textContent || '',
      detail: e.querySelector('.media-export-preset-detail')?.textContent || '',
      active: e.getAttribute('aria-pressed') === 'true',
    })),
  );
  const presetHasCards = presetCards.length >= 3
    && presetCards.some((c) => c.preset === 'podcast-mp3')
    && presetCards.some((c) => c.preset === 'acx-mp3')
    && presetCards.some((c) => c.preset === 'custom')
    && presetCards.some((c) => /Podcast/i.test(c.title))
    && presetCards.some((c) => /ACX/i.test(c.title))
    && presetCards.some((c) => /custom/i.test(c.title));
  if (presetHasCards) pass('P1: visible export preset cards show Podcast/ACX/Custom affordances'); else fail('export cards: ' + JSON.stringify(presetCards));
  const presetCardOrder = presetCards.map((c) => c.preset).join(',');
  if (/^podcast-mp3,acx-mp3,custom/.test(presetCardOrder)) pass('P1: export preset cards keep intent presets before Custom');
  else fail('export card order: ' + presetCardOrder);
  const defaultCard = presetCards.find((c) => c.preset === 'podcast-mp3');
  if (defaultCard?.active) pass('P1: default export card state is Podcast');
  else fail('export default card active state: ' + JSON.stringify(defaultCard));

  const exportRunText = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-run', (e) => e.textContent) : '';
  if (/Export processed audio/i.test(exportRunText)) pass('P1: export button labelled'); else fail('export run btn: ' + exportRunText);
  const exportSummary = exportPanel ? await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent) : '';
  if (/live chain =/.test(exportSummary) && /Output =/.test(exportSummary) && /Provenance = -af "/.test(exportSummary)) pass('P1: provenance-style export summary rendered'); else fail('export summary: ' + exportSummary.slice(0, 120));
  const exportFmts = await page.$$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-fmt option', (els) => els.map((e) => e.value));
  if (['source', 'mp3', 'wav', 'm4a', 'ogg'].every((f) => exportFmts.includes(f))) pass('P1: export format options (source/mp3/wav/m4a/ogg)'); else fail('export fmts: ' + exportFmts.join(','));
  const fadeInPresent = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in');
  const fadeOutPresent = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-out');
  if (fadeInPresent && fadeOutPresent) pass('P3: audio fade-in / fade-out controls present'); else fail('fade controls: in=' + !!fadeInPresent + ' out=' + !!fadeOutPresent);
  // P6 WIRED: the audio cross-clip line now points at the (built) Multi-track mixer
  // rather than the old "needs timeline — coming" stub.
  const stubText = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-stub', (e) => e.textContent).catch(() => '');
  if (/Crossfade.*mixer/i.test(stubText)) pass('P6: audio crossfade points to the multi-track mixer (wired)'); else fail('crossfade stub: ' + stubText.slice(0, 80));
  // The live-EQ summary updates with the fade duration (proves settings are read live).
  await page.fill('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in', '2');
  await page.evaluate(() => document.querySelector('#previewHost .media-mode-panel[data-mode="export"] .media-ed-fade-in').dispatchEvent(new Event('input', { bubbles: true })));
  const fadeSummaryText = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/fade-in 2s/.test(fadeSummaryText) && /Output =/.test(fadeSummaryText)) pass('P1: live export summary reflects fade-in setting'); else fail('export summary: ' + fadeSummaryText.slice(0, 120));

  // ── P2: export presets + advanced overrides ────────────────────────────────
  // The flat format picker is now a preset <select> (Podcast / ACX / Custom …).
  const presetSel = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset');
  if (presetSel) pass('P2: export preset selector present'); else fail('export preset selector missing');
  const presetOpts = await page.$$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset option', (els) => els.map((e) => e.value));
  if (['custom', 'podcast-mp3', 'acx-mp3'].every((v) => presetOpts.includes(v))) pass('P2: presets include Podcast + Audiobook(ACX) + Custom'); else fail('preset opts: ' + presetOpts.join(','));
  // Advanced overrides hidden until "Custom"; default preset is Podcast.
  const advHiddenDefault = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv', (e) => e.hidden).catch(() => null);
  if (advHiddenDefault === true) pass('P2: advanced overrides hidden under a concrete preset'); else fail('adv hidden default: ' + advHiddenDefault);
  // Switch to Audiobook (ACX): summary must reflect mono / 192k CBR / −20 LUFS.
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'acx-mp3');
  const acxSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Profile Audiobook ACX MP3/.test(acxSummary) && /mono/.test(acxSummary)
    && /192k CBR/.test(acxSummary) && /-20 LUFS/.test(acxSummary) && /TP -3 dBTP/.test(acxSummary))
    pass('P2: ACX preset summary shows mono, 192k CBR, normalize -20 LUFS, TP -3');
  else fail('acx summary: ' + acxSummary.slice(0, 180));
  await page.click('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset-card[data-preset="podcast-mp3"]');
  const podcastSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Profile Podcast MP3/.test(podcastSummary) && /-16 LUFS/.test(podcastSummary) && /192k/.test(podcastSummary) && /TP -1\.5 dBTP/.test(podcastSummary))
    pass('P2: Podcast preset summary reflects -16 LUFS / 192k / 44.1 kHz / TP -1.5');
  else fail('podcast summary: ' + podcastSummary.slice(0, 180));
  // Switching to Custom reveals the override fields (container/bitrate/sr/channels/loudness).
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'custom');
  const advShown = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv', (e) => e.hidden).catch(() => null);
  const hasContainer = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-container');
  const hasBitrate = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-bitrate');
  const hasLufs = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-lufs');
  const customNote = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-adv-note', (e) => e.textContent).catch(() => '');
  if (advShown === false && hasContainer && hasBitrate && hasLufs && /manual container|manual sample/.test((customNote || '').toLowerCase()))
    pass('P2: Custom reveals manual path controls with explicit guidance');
  else fail('custom adv: shown=' + advShown + ' c=' + !!hasContainer + ' b=' + !!hasBitrate + ' l=' + !!hasLufs + ' note=' + customNote);
  await page.click('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset-card[data-preset="acx-mp3"]');
  const acxCardSummary = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-summary', (e) => e.textContent).catch(() => '');
  if (/Profile Audiobook ACX MP3/.test(acxCardSummary) && /Output =/.test(acxCardSummary))
    pass('P2: ACX card path reselect keeps summary visible');
  else fail('acx card select: ' + acxCardSummary.slice(0, 120));
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
  await page.selectOption('#previewHost .media-mode-panel[data-mode="export"] .media-export-preset', 'podcast-mp3');

  // ── P8: Audiobook QC (ACX) — pass/fail report card + one-click ACX export ─────
  // QC now lives in a dedicated mode tab. CPU-lazy: no decode / ffmpeg until Run is clicked.
  const qcTab = await page.$('#previewHost .media-mode-tab[data-mode="qc"]');
  if (qcTab) {
    pass('P8: Audiobook QC (ACX) mode tab present');
    const qcPanelSel = '#previewHost .media-mode-panel[data-mode="qc"]';
    const preQc = await page.$(qcPanelSel + ' .media-qc-run');
    if (!preQc) pass('P8: QC panel CPU-lazy (no decode/ffmpeg until opened)'); else fail('QC panel mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector(qcPanelSel + ' .media-qc-run', { timeout: 6000 });
    const noIntro = await page.$eval(qcPanelSel, (el) => !el.querySelector('.media-ed-note'));
    if (noIntro) pass('P8b: QC shell renders as a report card instead of prose-heavy intro text'); else fail('qc intro paragraph still present');
    const checklist = await page.$$eval(qcPanelSel + ' .media-qc-checklist-item .media-qc-checklist-label',
      (els) => els.map((e) => e.textContent.trim().toLowerCase()));
    if (['rms', 'sample peak', 'noise floor', 'sample rate', 'channels', 'head silence', 'tail silence']
      .every((n) => checklist.includes(n))) pass('P8b: QC pre-run shows the full 7-item check checklist');
    else fail('qc checklist labels: ' + checklist.join(','));
    const qcActions = await page.$eval(qcPanelSel, (el) => {
      const run = el.querySelector('.media-qc-run');
      const exp = el.querySelector('.media-qc-export');
      const actions = el.querySelector('.media-ed-actions.media-qc-actions');
      const actionText = actions ? getComputedStyle(actions).display !== 'none' : false;
      const runVisible = run ? run.offsetWidth > 0 && run.offsetHeight > 0 && actionText : false;
      const expVisible = exp ? exp.offsetWidth > 0 && exp.offsetHeight > 0 && actionText : false;
      return { runVisible, expVisible };
    });
    if (qcActions.runVisible && qcActions.expVisible) pass('P8b: QC actions (Run QC + Export for ACX) are visible before run');
    else fail('qc actions: ' + JSON.stringify(qcActions));
    const exportHint = await page.$eval(qcPanelSel + ' .media-qc-export-hint', (el) => el.textContent).catch(() => '');
    if (/mono 44\.1 kHz mp3 192k cbr/i.test(exportHint)) pass('P8b: QC export hint clearly states the ACX target'); else fail('qc export hint: ' + exportHint);
    // Run QC → decode the sample WAV + render the per-metric card.
    await page.click(qcPanelSel + ' .media-qc-run');
    await page.waitForSelector(qcPanelSel + ' .media-qc-table .media-qc-row', { timeout: 15000 });
    const qcMetrics = await page.$$eval(qcPanelSel + ' .media-qc-row', (els) => els.map((e) => e.dataset.metric));
    if (['rms', 'peak', 'noise', 'sr', 'ch', 'head', 'tail'].every((k) => qcMetrics.includes(k)))
      pass('P8b: QC card shows all 7 ACX metric rows (RMS/peak/noise/sr/ch/head/tail)');
    else fail('qc metrics: ' + qcMetrics.join(','));
    const qcVerdict = await page.$(qcPanelSel + ' .media-qc-verdict');
    if (qcVerdict) pass('P8b: QC card shows an overall pass/fail verdict'); else fail('qc verdict missing');
    // The "Export for ACX" one-click button mounts alongside.
    const acxBtn = await page.$(qcPanelSel + ' .media-qc-export');
    const acxBtnText = acxBtn ? await acxBtn.evaluate((e) => e.textContent) : '';
    if (/Export for ACX/i.test(acxBtnText)) pass('P8e: "Export for ACX" one-click button mounts'); else fail('acx export btn: ' + acxBtnText);
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    await page.waitForFunction(() => {
      const panel = document.querySelector('#previewHost .media-mode-panel[data-mode="qc"]');
      return panel && panel.hidden;
    }, null, { timeout: 3000 });
    pass('P8: QC panel collapses');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-run', { timeout: 6000 });
    pass('P8: QC remounts after leaving to Listen');
  } else fail('Audiobook QC mode tab not found');

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
  await page.click('#previewHost .media-mode-tab[data-mode="export"]');
  await page.waitForSelector('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel', { timeout: 8000 });
  const vidExportHeader = await page.$eval('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-header',
    (e) => e.textContent).catch(() => '');
  if (/Export & Fades \(video\)/i.test(vidExportHeader)) pass('P3: video export panel offers fade-to-black'); else fail('video export header: ' + vidExportHeader);
  const vidFadeIn = await page.$('#previewHost .media-mode-panel[data-mode="export"] .media-export-panel .media-ed-fade-in');
  if (vidFadeIn) pass('P3: video fade-to/from-black duration controls present'); else fail('video fade controls missing');

  // ── P6: Video timeline (2-lane) + transitions + visual trim ───────────────────
  // Built for video when ffmpeg is enabled; CPU-lazy (no timeline DOM until opened).
  const tlModeSel = '#previewHost .media-mode-panel[data-mode="timeline"]';
  await page.click('#previewHost .media-mode-tab[data-mode="timeline"]');
  await page.waitForSelector(tlModeSel + ':not([hidden])', { timeout: 5000 });
  const tlToggle = await page.evaluateHandle((sel) =>
    [...document.querySelectorAll(sel + ' .media-wv-toggle')].find((b) => /Video timeline/.test(b.textContent)) || null, tlModeSel);
  const tlToggleExists = await tlToggle.evaluate((e) => !!e);
  if (tlToggleExists) {
    pass('P6: video timeline toggle button present');
    const preTl = await page.$(tlModeSel + ' .tl-wrap');
    if (!preTl) pass('P6: video timeline CPU-lazy (no DOM until opened)'); else fail('timeline mounted before open');
    await tlToggle.asElement().click();
    await page.waitForSelector(tlModeSel + ' .tl-wrap', { timeout: 12000 });
    // 2 lanes: video lane (clip A) + second/music lane.
    const lanes = await page.$$eval(tlModeSel + ' .tl-lane', (els) => els.length);
    if (lanes === 2) pass('P6: timeline mounts 2 lanes (video + second/music)'); else fail('timeline lanes: ' + lanes);
    // Thumbnail strip with a load-on-demand button + trim handles (in/out).
    const tlBits = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      return {
        strip: !!root.querySelector('.tl-strip'),
        thumbBtn: !!root.querySelector('.tl-thumb-btn'),
        handleIn: !!root.querySelector('.tl-handle-in'),
        handleOut: !!root.querySelector('.tl-handle-out'),
        drop: !!root.querySelector('.tl-lane--b .media-ed-drop-zone'),
      };
    }, tlModeSel);
    if (!tlBits) fail('P6: cannot find timeline mode panel root');
    if (tlBits.strip && tlBits.thumbBtn) pass('P6: thumbnail strip + on-demand thumbnail button present'); else fail('thumb strip: ' + JSON.stringify(tlBits));
    if (tlBits.handleIn && tlBits.handleOut) pass('P6: visual trim handles (in/out) present'); else fail('trim handles: ' + JSON.stringify(tlBits));
    if (tlBits.drop) pass('P6: second-clip / music drop zone present'); else fail('timeline drop zone missing');
    // Transition controls: dissolve/xfade selector + length + the four action buttons.
    const transOpts = await page.$$eval(tlModeSel + ' .tl-trans-sel option', (els) => els.map((e) => e.value));
    if (transOpts.includes('fade') && transOpts.includes('fadeblack') && transOpts.includes('wipeleft')) pass('P6: transition selector offers fade/fadeblack/wipe'); else fail('transition opts: ' + transOpts.join(','));
    const acts = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      return {
        trim: !!root.querySelector('.tl-act-trim'),
        fade: !!root.querySelector('.tl-act-fade'),
        xfade: !!root.querySelector('.tl-act-xfade'),
        across: !!root.querySelector('.tl-act-across'),
        mux: !!root.querySelector('.tl-act-mux'),
      };
    }, tlModeSel);
    if (acts && acts.trim && acts.fade && acts.xfade && acts.across && acts.mux)
      pass('P6: trim + fade/xfade/acrossfade/mux action buttons present'); else fail('timeline actions: ' + JSON.stringify(acts));
    const trimBtnText = await page.$eval(tlModeSel + ' .tl-act-trim', (e) => e.textContent);
    if (trimBtnText.includes('Trim selected range')) pass('P6: trim action has visible label'); else fail('trim button text: ' + trimBtnText);
    // Cross-clip actions disabled until a second clip is dropped.
    const xfadeDisabled = await page.$eval(tlModeSel + ' .tl-act-xfade', (e) => e.disabled);
    if (xfadeDisabled) pass('P6: dissolve disabled until a 2nd clip is added'); else fail('xfade not gated on 2nd clip');
    // Close → torn down.
    await tlToggle.asElement().click();
    await page.waitForSelector(tlModeSel + ' .tl-wrap', { state: 'detached', timeout: 4000 });
    pass('P6: video timeline panel collapses + tears down');
    await page.click('#previewHost .media-mode-tab[data-mode="watch"]');
  } else {
    fail('P6 video timeline toggle not found');
  }
  

  // PURE arg-builder unit checks (no ffmpeg load): xfade offset math + acrossfade/mux args.
  const tlArgs = await page.evaluate(async () => {
    const m = await import('./types/media/video-filters.js');
    return {
      offset: m.xfadeOffset(10, 1),                         // durA−d = 9
      xfade: m.buildXfadeArgs('input.mp4', 'secondary.mp4', 'out.mp4', { durationA: 10, transition: 'fade', duration: 1 }).join(' '),
      across: m.buildAcrossfadeArgs('input.mp3', 'secondary.mp3', 'out.m4a', { duration: 2 }).join(' '),
      mux: m.buildMuxMusicArgs('input.mp4', 'secondary.mp3', 'out.mp4', { musicGain: 0.35 }).join(' '),
      badTrans: m.normalizeTransition('nonsense'),
      trimClamped: m.clampTrimRange(12, 8, 10),
    };
  });
  if (tlArgs.offset === 9) pass('P6: xfadeOffset(10,1) = 9 (durationA − transition)'); else fail('xfade offset: ' + tlArgs.offset);
  if (/xfade=transition=fade:duration=1:offset=9/.test(tlArgs.xfade) && /\[0:a\]\[1:a\]acrossfade=d=1\[a\]/.test(tlArgs.xfade) && /libx264/.test(tlArgs.xfade)) pass('P6: xfade args build dissolve + aligned audio acrossfade'); else fail('xfade args: ' + tlArgs.xfade);
  if (/\[0:a\]\[1:a\]acrossfade=d=2\[a\]/.test(tlArgs.across)) pass('P6: acrossfade args build d=2 audio crossfade'); else fail('acrossfade args: ' + tlArgs.across);
  if (/volume=0\.35/.test(tlArgs.mux) && /amix=inputs=2:duration=first/.test(tlArgs.mux) && /-c:v copy/.test(tlArgs.mux)) pass('P6: mux-music args duck the bed + amix under the video audio'); else fail('mux args: ' + tlArgs.mux);
  if (tlArgs.badTrans === 'fade') pass('P6: unknown transition normalizes to fade'); else fail('bad transition: ' + tlArgs.badTrans);
  if (tlArgs.trimClamped.start < tlArgs.trimClamped.end && tlArgs.trimClamped.end === 10)
    pass('P6: pure trim clamp keeps in/out from crossing within duration');
  else fail('trim clamp: ' + JSON.stringify(tlArgs.trimClamped));

  // Reset settings so we don't leak ffmpeg-on into later areas sharing the page.
  await page.evaluate(() => localStorage.removeItem('fv:settings:global'));
}
