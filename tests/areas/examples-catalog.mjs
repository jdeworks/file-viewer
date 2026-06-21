import { REGISTRY } from '../../docs/core/registry.js';

export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  await page.goto(origin, { waitUntil: 'load' });
  const examples = await page.evaluate(async () => {
    const res = await fetch('examples/index.json');
    return res.ok ? res.json() : [];
  });
  if (examples.length > 100) pass('examples catalog loaded (' + examples.length + ' samples)'); else fail('examples catalog too small: ' + examples.length);
  const requiredCodeSamples = [
    'main.py',
    'app.ts',
    'Dashboard.tsx',
    'Widget.jsx',
    'server.go',
    'worker.rs',
    'Main.java',
    'main.c',
    'mesh.cpp',
    'Program.cs',
    'script.sh',
    'query.sql',
    'styles.css',
    'theme.scss',
    'theme.less',
    'main.rb',
    'index.php',
    'App.swift',
    'Main.kt',
    'Job.scala',
    'filter.lua',
    'analysis.r',
    'report.pl',
    'app.dart',
    'pipeline.ex',
    'core.clj',
    'schema.graphql',
    'deploy.ps1',
    'Makefile',
    'infra.tf',
    'build.bat',
    'Panel.vue',
    'Controller.m',
    'analytics.fs',
    'Module.vb',
    'shader.wgsl',
    'Escrow.sol'
  ];
  const byFile = new Map(examples.map((ex) => [ex.file, ex]));
  const missingCodeSamples = requiredCodeSamples.filter((file) => byFile.get(file)?.type !== 'code');
  if (missingCodeSamples.length) {
    fail('missing programming samples: ' + missingCodeSamples.join(', '));
  } else {
    pass('programming language samples indexed (' + requiredCodeSamples.length + ')');
  }
  const sourcedSamples = ['sample.epub', 'sample.mobi', 'sample.png'];
  const missingProvenance = sourcedSamples.filter((file) => {
    const ex = byFile.get(file);
    return !ex?.source || !ex?.license || !ex?.attribution || !/^https:\/\//.test(ex.source);
  });
  if (missingProvenance.length) {
    fail('missing sample provenance: ' + missingProvenance.join(', '));
  } else {
    pass('sourced samples include provenance metadata (' + sourcedSamples.length + ')');
  }
  const quality = await page.evaluate(async () => {
    const [epub, mobi, png] = await Promise.all([
      fetch('examples/sample.epub').then((r) => r.arrayBuffer()),
      fetch('examples/sample.mobi').then((r) => r.arrayBuffer()),
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = 'examples/sample.png';
      }),
    ]);
    return { epub: epub.byteLength, mobi: mobi.byteLength, png };
  });
  if (quality.epub > 50_000 && quality.mobi > 20_000 && quality.png.w >= 256 && quality.png.h >= 256) {
    pass('sourced ebook/image samples are non-placeholder assets');
  } else {
    fail('sample quality too low: ' + JSON.stringify(quality));
  }
  const imageFormatSamples = ['sample.jpg', 'sample.jpeg', 'sample.gif', 'sample.webp', 'sample.bmp'];
  const missingImageFormats = imageFormatSamples.filter((file) => byFile.get(file)?.type !== 'image');
  if (missingImageFormats.length) {
    fail('missing dedicated image format samples: ' + missingImageFormats.join(', '));
  } else {
    pass('dedicated raster image format samples indexed (' + imageFormatSamples.length + ')');
  }
  const tiffSample = byFile.get('sample.tiff');
  if (tiffSample?.type === 'tiff' && tiffSample.partial) {
    pass('dedicated TIFF partial-support sample indexed');
  } else {
    fail('missing dedicated TIFF partial-support sample');
  }
  // HEIC is a dedicated 'heif' type; AVIF is decoded natively by the base image renderer
  // (the heif detector deliberately yields to 'image' for the avif brand), so it indexes as 'image'.
  const heifSamples = ['sample.heic'];
  const missingHeif = heifSamples.filter((file) => byFile.get(file)?.type !== 'heif');
  const avifSample = byFile.get('sample.avif');
  if (missingHeif.length || avifSample?.type !== 'image') {
    fail('missing dedicated HEIF/AVIF samples: ' + [...missingHeif, avifSample?.type !== 'image' ? 'sample.avif' : ''].filter(Boolean).join(', '));
  } else {
    pass('dedicated HEIF/AVIF samples indexed (2)');
  }
  const jxlSample = byFile.get('sample.jxl');
  // JXL now decodes in-browser (lazy wasm), so it's a normal image sample (not partial).
  if (jxlSample?.type === 'image' && !jxlSample.partial) {
    pass('JPEG XL sample indexed as a decodable image');
  } else {
    fail('JPEG XL sample state: ' + JSON.stringify(jxlSample));
  }
  const mediaFormatSamples = ['sample.wav', 'sample.mp3', 'sample.ogg', 'sample.mp4', 'sample.webm', 'sample.mov', 'sample.mkv', 'sample.flac', 'sample.m4a', 'sample.aac'];
  const missingMediaFormats = mediaFormatSamples.filter((file) => byFile.get(file)?.type !== 'media');
  if (missingMediaFormats.length) {
    fail('missing dedicated media format samples: ' + missingMediaFormats.join(', '));
  } else {
    pass('dedicated media format samples indexed (' + mediaFormatSamples.length + ')');
  }
  const partialContainerSamples = ['sample.mov', 'sample.mkv'];
  const missingPartialContainers = partialContainerSamples.filter((file) => !byFile.get(file)?.partial);
  if (missingPartialContainers.length) {
    fail('container-dependent media samples should be marked partial: ' + missingPartialContainers.join(', '));
  } else {
    pass('container-dependent media samples document partial playback support');
  }
  const fontFormatSamples = ['sample.ttf', 'sample.otf', 'sample.woff', 'sample.woff2'];
  const missingFontFormats = fontFormatSamples.filter((file) => byFile.get(file)?.type !== 'font');
  if (missingFontFormats.length) {
    fail('missing dedicated font format samples: ' + missingFontFormats.join(', '));
  } else {
    pass('dedicated font format samples indexed (' + fontFormatSamples.length + ')');
  }
  const missingFontCategory = fontFormatSamples.filter((file) => !((byFile.get(file)?.categories || []).includes('Font')));
  if (missingFontCategory.length) {
    fail('font samples missing Font category: ' + missingFontCategory.join(', '));
  } else {
    pass('font samples carry Font category');
  }
  const designSamples = new Map([
    ['sample.clip', 'clip'],
    ['sample.procreate', 'procreate'],
    ['sample.sketch', 'sketch'],
    ['sample.ora', 'layered'],
    ['sample.kra', 'layered'],
    ['sample.psd', 'layered'],
    ['sample.psb', 'layered'],
    ['sample.xcf', 'layered'],
  ]);
  const missingDesignTypes = [...designSamples].filter(([file, type]) => byFile.get(file)?.type !== type).map(([file]) => file);
  if (missingDesignTypes.length) {
    fail('design/layered samples missing explicit types: ' + missingDesignTypes.join(', '));
  } else {
    pass('design/layered samples expose explicit catalog types');
  }
  const xcfSample = byFile.get('sample.xcf');
  if (xcfSample?.partial) {
    pass('XCF sample documents partial structure-only support');
  } else {
    fail('XCF sample should be marked partial');
  }

  const seenTypes = new Set();
  for (const ex of examples) {
    const opened = await page.evaluate((file) => window.__fv.openExampleFile(file), ex.file);
    if (!opened) { fail('sample did not open: ' + ex.file); continue; }
    await page.waitForFunction(() => document.querySelector('#fileName')?.textContent && !/—/.test(document.querySelector('#fileName')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
    const type = await page.$eval('#typeSelect', (s) => s.value).catch(() => '');
    if (type) seenTypes.add(type);
    if (ex.type && type !== ex.type) fail('sample type mismatch: ' + ex.file + ' expected ' + ex.type + ' got ' + type);
    const previewText = await page.$eval('#previewHost', (e) => e.textContent || '').catch(() => '');
    // Word-boundary-anchored: config tokens like `log_type` + `error` render as the substring
    // "log_typeerror", which must NOT be mistaken for a JS "TypeError". Only match these error
    // names when they stand on their own (not glued to a preceding identifier char).
    const crashed = /Preview failed|Failed to execute|DjVu missing after load|Failed to load DjVu library|(?<![a-z0-9_])(?:TypeError|ReferenceError)\b/i.test(previewText);
    if (crashed && !ex.partial) fail('sample preview crashed: ' + ex.file + ' :: ' + previewText.replace(/\s+/g, ' ').slice(0, 160));
    await page.waitForTimeout(10);
  }
  pass('all indexed samples open without preview crashes');
  const missingTypes = REGISTRY.map((t) => t.id).filter((id) => !seenTypes.has(id));
  if (missingTypes.length) {
    fail('registered types without indexed sample coverage: ' + missingTypes.join(', '));
  } else {
    pass('all registered types have indexed sample coverage (' + REGISTRY.length + ')');
  }
  if (ctx.consoleErrors.length) fail('sample catalog console/page errors:\n  ' + ctx.consoleErrors.join('\n  '));
  else pass('sample catalog produced no console/page errors');
  if (ctx.offOrigin.length) fail('sample catalog off-origin requests:\n  ' + ctx.offOrigin.join('\n  '));
  else pass('sample catalog made zero off-origin requests');

  // Quality badges: sourced and partial examples display visual indicators
  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForSelector('.ex-folder-card', { timeout: 10000 }).catch(() => {});
  const sourcedBadgeOk = await page.evaluate(async () => {
    // Open a category that contains sourced examples (Image category has sample.png)
    const cards = Array.from(document.querySelectorAll('.ex-folder-card'));
    const imageCard = cards.find((c) => c.dataset.categories === 'Image');
    if (!imageCard) return { ok: false, reason: 'Image category card not found' };
    imageCard.click();
    await new Promise((r) => setTimeout(r, 100));
    // sample.png should have a sourced badge
    const btns = Array.from(document.querySelectorAll('.ex-file-btn'));
    const pngBtn = btns.find((b) => (b.dataset.search || '').includes('sample.png'));
    if (!pngBtn) return { ok: false, reason: 'sample.png button not found in Image category' };
    const badge = pngBtn.querySelector('.ex-badge-sourced');
    if (!badge) return { ok: false, reason: 'no sourced badge on sample.png' };
    return { ok: true };
  });
  if (sourcedBadgeOk.ok) pass('sourced badge visible on sample.png in examples gallery');
  else fail('sourced badge missing: ' + sourcedBadgeOk.reason);

  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForSelector('.ex-showall-btn', { timeout: 10000 }).catch(() => {});
  const partialBadgeOk = await page.evaluate(async () => {
    // Show all files and look for any .ex-badge-partial badge (djvu or lrf are partial)
    const showAll = document.querySelector('.ex-showall-btn');
    if (!showAll) return { ok: false, reason: 'show-all button not found' };
    showAll.click();
    await new Promise((r) => setTimeout(r, 200));
    const partialBadges = document.querySelectorAll('.ex-badge-partial');
    if (!partialBadges.length) return { ok: false, reason: 'no partial badges found in full gallery' };
    // Verify a known partial file (djvu or lrf) has the badge
    const btns = Array.from(document.querySelectorAll('.ex-file-btn'));
    const djvuBtn = btns.find((b) => {
      const s = (b.dataset.search || '');
      return s.includes('djvu') || s.includes('sample.lrf');
    });
    if (!djvuBtn) return { ok: false, reason: 'no djvu/lrf button found in show-all view' };
    const badge = djvuBtn.querySelector('.ex-badge-partial');
    if (!badge) return { ok: false, reason: 'no partial badge on djvu/lrf button' };
    return { ok: true };
  });
  if (partialBadgeOk.ok) pass('partial badge visible on partial-support samples in examples gallery');
  else fail('partial badge missing: ' + partialBadgeOk.reason);

  // JPEG XL now decodes in-browser, so it's sourced (✓) and NOT partial (no ⚠).
  const jxlBadgesOk = await page.evaluate(async () => {
    const showAll = document.querySelector('.ex-showall-btn');
    if (showAll) { showAll.click(); await new Promise((r) => setTimeout(r, 200)); }
    const btns = Array.from(document.querySelectorAll('.ex-file-btn'));
    const jxlBtn = btns.find((b) => (b.dataset.search || '').includes('sample.jxl'));
    if (!jxlBtn) return { ok: false, reason: 'sample.jxl button not found' };
    return { ok: !jxlBtn.querySelector('.ex-badge-partial'), sourced: !!jxlBtn.querySelector('.ex-badge-sourced') };
  });
  if (jxlBadgesOk.ok && jxlBadgesOk.sourced) pass('JPEG XL shows sourced ✓ and no partial ⚠ (decodes now)');
  else fail('jxl badges: ' + JSON.stringify(jxlBadgesOk));

  // Gallery layout: filter bar above groups, known-files section + show-all at
  // bottom, and known/enhanced files only inside the known-files section.
  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForSelector('.ex-known-section', { timeout: 10000 }).catch(() => {});
  const layout = await page.evaluate(async () => {
    const host = document.getElementById('examples');
    if (!host) return { ok: false, reason: 'examples host not found' };
    // Absolute document position helper (works regardless of nesting depth).
    const all = Array.from(host.querySelectorAll('*'));
    const pos = (el) => (el ? all.indexOf(el) : -1);

    const tools = host.querySelector('.ex-tools');
    const firstSuper = host.querySelector('.ex-super-section');
    const firstFolderCard = host.querySelector('.ex-folder-card');
    const knownSection = host.querySelector('.ex-known-section');
    const showAll = host.querySelector('.ex-showall-btn');
    const lastSuper = [...host.querySelectorAll('.ex-super-section')].pop();

    if (!tools) return { ok: false, reason: 'filter bar (.ex-tools) not rendered' };
    if (!firstSuper || !firstFolderCard) return { ok: false, reason: 'no file-type groups rendered' };
    if (!knownSection) return { ok: false, reason: 'known-files section not rendered' };
    if (!showAll) return { ok: false, reason: 'show-all button not rendered' };

    const searchAbove = pos(tools) < pos(firstSuper) && pos(tools) < pos(firstFolderCard);
    const knownAfterGroups = pos(knownSection) > pos(lastSuper);
    const showAllAtBottom = pos(showAll) > pos(knownSection) && pos(showAll) > pos(lastSuper);

    // No known/enhanced file (real-world Config/Code filename, not sample.*) may
    // appear as a normal category file button. Probe a few canonical ones.
    const probes = ['package.json', 'dockerfile', 'requirements.txt', 'cargo.toml', 'go.mod'];
    const categoryFileBtns = Array.from(host.querySelectorAll('.ex-folder-grid .ex-file-btn, .ex-super-section .ex-file-btn'));
    const leaked = [];
    for (const name of probes) {
      const found = categoryFileBtns.find((b) => (b.dataset.search || '').includes(name));
      if (found) leaked.push(name);
    }
    // And confirm at least one of those known files IS present in the known section.
    const knownBtns = Array.from(knownSection.querySelectorAll('.ex-known-btn'));
    const knownNames = knownBtns.map((b) => (b.textContent || '').toLowerCase());
    const presentInKnown = probes.some((name) => knownNames.some((kn) => kn.includes(name)));

    return { ok: true, searchAbove, knownAfterGroups, showAllAtBottom, leaked, presentInKnown, knownCount: knownBtns.length };
  });

  if (!layout.ok) {
    fail('examples gallery layout probe failed: ' + layout.reason);
  } else {
    if (layout.searchAbove) pass('search + filter chips appear above the file-type groups');
    else fail('search/filter bar is NOT above the file-type groups');

    if (layout.knownAfterGroups) pass('known-files section sits after the last file-type group');
    else fail('known-files section is not after the file-type groups');

    if (layout.showAllAtBottom) pass('show-all button is at the bottom (after known-files section)');
    else fail('show-all button is not at the bottom');

    if (!layout.leaked.length) pass('known/enhanced files excluded from category groups');
    else fail('known/enhanced files leaked into category groups: ' + layout.leaked.join(', '));

    if (layout.presentInKnown && layout.knownCount > 0) pass('known/enhanced files present in dedicated known-files section (' + layout.knownCount + ')');
    else fail('known/enhanced files missing from known-files section (count ' + layout.knownCount + ')');
  }

  // Search still filters across the visible gallery.
  const searchWorks = await page.evaluate(async () => {
    const host = document.getElementById('examples');
    const search = host.querySelector('.ex-search');
    if (!search) return { ok: false, reason: 'search input not found' };
    const visibleCards = () => Array.from(host.querySelectorAll('.ex-folder-card')).filter((c) => !c.hidden).length;
    const before = visibleCards();
    search.value = 'zzznomatchzzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    const afterNoMatch = visibleCards();
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    const afterClear = visibleCards();
    return { ok: true, before, afterNoMatch, afterClear };
  });
  if (searchWorks.ok && searchWorks.before > 0 && searchWorks.afterNoMatch === 0 && searchWorks.afterClear === searchWorks.before) {
    pass('gallery search filter still narrows and restores the visible cards');
  } else {
    fail('gallery search filter behavior broken: ' + JSON.stringify(searchWorks));
  }
}
