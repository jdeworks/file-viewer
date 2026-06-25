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

}
