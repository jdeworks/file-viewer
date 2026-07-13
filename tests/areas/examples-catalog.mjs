import { REGISTRY } from '../../docs/core/registry.js';

export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  const loadExamplesGallery = async (selector = '.ex-folder-card') => {
    await page.click('#loadExamplesBtn');
    await page.waitForSelector(selector, { timeout: 10000 });
  };
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
  // TIFF now decodes in-browser (vendored UTIF, lazy) into the editable image editor, so it's
  // a fully-supported dedicated 'tiff' sample (no longer partial / metadata-only).
  if (tiffSample?.type === 'tiff' && !tiffSample.partial) {
    pass('dedicated TIFF sample indexed as a decodable image');
  } else {
    fail('TIFF sample state: ' + JSON.stringify(tiffSample));
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
  const mp4Video = await page.evaluate(() => new Promise((resolve) => {
    const video = document.createElement('video');
    const finish = (error = '') => resolve({
      error,
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      readyState: video.readyState,
    });
    const timer = setTimeout(() => finish('metadata timeout'), 8000);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => { clearTimeout(timer); finish(); };
    video.onerror = () => { clearTimeout(timer); finish(video.error?.message || 'media error'); };
    video.src = 'examples/sample.mp4';
  }));
  if (!mp4Video.error && mp4Video.width === 320 && mp4Video.height === 180
    && Number.isFinite(mp4Video.duration) && mp4Video.duration >= 1) {
    pass('MP4 sample decodes as a real 320×180 video track');
  } else {
    fail('MP4 sample is not a decodable video: ' + JSON.stringify(mp4Video));
  }
  const partialContainerSamples = ['sample.mov', 'sample.mkv'];
  const missingPartialContainers = partialContainerSamples.filter((file) => !byFile.get(file)?.partial);
  if (missingPartialContainers.length) {
    fail('container-dependent media samples should be marked partial: ' + missingPartialContainers.join(', '));
  } else {
    pass('container-dependent media samples document partial playback support');
  }
  const fidelityPartialSamples = [
    'sample.blend', 'sample.dcm', 'sample.dwg', 'sample.exr', 'sample.fbx', 'sample.fits',
    'sample.nc', 'sample.nii', 'sample.pages', 'sample.rtf', 'sample.sketch', 'sample.eps',
  ];
  const missingFidelityPartial = fidelityPartialSamples.filter((file) => !byFile.get(file)?.partial);
  if (missingFidelityPartial.length) {
    fail('fidelity-limited samples should be marked partial: ' + missingFidelityPartial.join(', '));
  } else {
    pass('all twelve fidelity-limited samples carry partial catalog claims');
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

  // FV_SMOKE_SUBSET=1 (set by check.sh --fast when examples-catalog is a path-owned area): open a
  // DETERMINISTIC representative subset — the first sample (by file name) of each declared type —
  // instead of all ~1,100. This keeps the "every registered type has coverage" assertion meaningful
  // (one open per type) while cutting the ~1,100-open sweep (the area's dominant cost) to ~one-per-type.
  // The exhaustive sweep still runs in the full gate (no FV_SMOKE_SUBSET) and asserts every sample opens.
  // Three open-sweep tiers:
  //  • FV_SMOKE_SUBSET=1  (check.sh --fast): one sample per declared type (~36) then early-return
  //    before badges/ASCII (path-owned fast validation).
  //  • FV_SMOKE_SAMPLE=release (check.sh default release gate): one-per-type PLUS every partial
  //    sample (the riskiest renderers), then the full badge + ASCII-Studio checks run once — but the
  //    exhaustive 1,129-open sweep and the "every registry type covered" guarantee are deferred to
  //    the exhaustive gate.
  //  • neither (check.sh --exhaustive): open ALL ~1,129 + full type-coverage assertion.
  const SUBSET = process.env.FV_SMOKE_SUBSET === '1';
  const RELEASE = process.env.FV_SMOKE_SAMPLE === 'release';
  let toOpen = examples;
  if (SUBSET || RELEASE) {
    const byType = new Map();
    for (const ex of [...examples].sort((a, b) => String(a.file).localeCompare(String(b.file)))) {
      if (!byType.has(ex.type)) byType.set(ex.type, ex);
    }
    const picked = new Map([...byType.values()].map((ex) => [ex.file, ex]));
    // Release tier additionally opens every partial sample so the format-limited renderers (the
    // ones most likely to crash) all get an open-crash check, not just one representative per type.
    if (RELEASE) for (const ex of examples) if (ex.partial) picked.set(ex.file, ex);
    toOpen = [...picked.values()];
    pass(`${RELEASE ? 'release' : 'fast'} subset: opening ${toOpen.length} representative samples (one per type${RELEASE ? ' + all partial' : ''}) of ${examples.length} — full sweep runs in the exhaustive gate`);
  }
  const seenTypes = new Set();
  let sweptCount = 0;
  for (const ex of toOpen) {
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
    // Bound renderer memory over a long sweep. This raw open loop (unlike the harness openExample)
    // has no periodic reload, so the exhaustive 1,129-open run accumulates disposed-but-retained
    // Monaco models / blob URLs until the renderer OOM-crashes — which then took down the heavy
    // ASCII-Studio conversions that follow ("died at two different points across runs"). Dispose +
    // GC every 40 opens, and hard-reload every 250 to flush anything GC can't reach.
    if (++sweptCount % 40 === 0) {
      await page.evaluate(() => {
        try { window.monaco?.editor?.getModels?.().forEach((m) => m.dispose()); } catch { /* no monaco */ }
        try { (window.__fvBlobUrls || []).forEach((u) => URL.revokeObjectURL(u)); } catch { /* none */ }
        try { window.gc?.(); } catch { /* gc not exposed */ }
      }).catch(() => {});
    }
    if (sweptCount % 250 === 0) {
      await page.goto(origin, { waitUntil: 'load' });
      await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(10);
  }
  pass(`all ${SUBSET || RELEASE ? 'representative' : 'indexed'} samples open without preview crashes (${toOpen.length})`);
  // "Every registered type has a working sample" is a FULL-SWEEP guarantee — a per-type subset opens
  // only ~36 of ~146 registry types (declared ex.type does not map 1:1 to registry ids), so this check
  // only runs in the exhaustive gate. Under --fast/--release it would spuriously fail.
  if (!SUBSET && !RELEASE) {
    const missingTypes = REGISTRY.map((t) => t.id).filter((id) => !seenTypes.has(id));
    if (missingTypes.length) {
      fail('registered types without indexed sample coverage: ' + missingTypes.join(', '));
    } else {
      pass('all registered types have indexed sample coverage (' + REGISTRY.length + ')');
    }
  }
  if (ctx.consoleErrors.length) fail('sample catalog console/page errors:\n  ' + ctx.consoleErrors.join('\n  '));
  else pass('sample catalog produced no console/page errors');
  if (ctx.offOrigin.length) fail('sample catalog off-origin requests:\n  ' + ctx.offOrigin.join('\n  '));
  else pass('sample catalog made zero off-origin requests');

  // Fast path stops here: catalog index integrity + a representative per-type open sweep are what a
  // path-owned example change needs to validate. The remaining badge checks and the heavy
  // ASCII-Studio tool sweep are release-gate + exhaustive concerns, not fast-gate ones. (The
  // release gate DOES run them — that path is FV_SMOKE_SAMPLE=release, which is not SUBSET.)
  if (SUBSET) return;

  // Release the renderer memory accumulated by the open sweep BEFORE the heavy ASCII-Studio
  // conversions, so those start from a clean heap instead of tipping an already-loaded renderer over.
  await page.evaluate(() => { try { window.gc?.(); } catch { /* gc not exposed */ } });

  // Quality badges: sourced and partial examples display visual indicators
  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
  await page.goto(origin, { waitUntil: 'load' });
  await loadExamplesGallery('.ex-folder-card');
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

  // ASCII Studio is NOT attached to individual samples.
  const noPerSampleTool = await page.evaluate(async () => {
    const res = await fetch('examples/index.json');
    const examples = res.ok ? await res.json() : [];
    const linked = examples.filter((ex) => Array.isArray(ex.tools) && ex.tools.some((tool) => (tool.href || '').includes('tools/ascii-studio/')));
    return { total: examples.length, linked: linked.length };
  });
  if (noPerSampleTool.total > 0 && noPerSampleTool.linked === 0) {
    pass('no sample is individually linked to the ASCII Studio tool');
  } else {
    fail('samples still carry ASCII Studio tool links: ' + JSON.stringify(noPerSampleTool));
  }

  // The Image category is still open from the sourced-badge check: the Media-only tool must not
  // leak here, into folder view, or into the show-all view.
  if ((await page.$$('.ex-ascii-studio')).length === 0) pass('ASCII Studio is absent from Image category');
  else fail('ASCII Studio leaked into Image category');
  await page.click('.ex-back-btn');
  if ((await page.$$('.ex-ascii-studio')).length === 0) pass('ASCII Studio is absent from folder overview');
  else fail('ASCII Studio leaked into folder overview');

  const mediaCard = await page.$('.ex-folder-card[data-categories="Media"]');
  if (!mediaCard) {
    fail('Media category card missing');
  } else {
    await mediaCard.click();
    await page.waitForSelector('.ex-ascii-studio');
    const asciiBtnOk = await page.$eval('.ex-ascii-studio', (link) => ({
      count: document.querySelectorAll('.ex-ascii-studio').length,
      href: link.getAttribute('href'),
      absolute: link.href,
      target: link.target,
      rel: link.rel,
      aria: link.getAttribute('aria-label'),
      visible: !link.closest('.ex-media-tools').hidden,
    }));
    if (asciiBtnOk.count === 1 && asciiBtnOk.visible
        && asciiBtnOk.href === 'tools/ascii-studio/index.html'
        && asciiBtnOk.absolute.startsWith(origin + '/tools/ascii-studio/')
        && !asciiBtnOk.absolute.includes('?sample=') && asciiBtnOk.target === '_blank'
        && asciiBtnOk.rel.includes('noopener') && /ASCII Studio/.test(asciiBtnOk.aria || '')) {
      pass('Media category exposes one accessible standalone ASCII Studio button');
    } else fail('Media ASCII Studio button invalid: ' + JSON.stringify(asciiBtnOk));

    await page.fill('.ex-search', 'no-media-sample-can-match-this');
    if (await page.isHidden('.ex-media-tools')) pass('ASCII Studio hides when search leaves no Media match');
    else fail('ASCII Studio remained visible with zero Media search matches');
    await page.fill('.ex-search', 'sample.mp4');
    if (await page.isVisible('.ex-media-tools')) pass('ASCII Studio returns when a Media search match remains');
    else fail('ASCII Studio did not return for a Media search match');
    await page.click('.ex-filter-chip[data-filter="edit"]');
    if (await page.isHidden('.ex-media-tools')) pass('ASCII Studio follows zero-match kind filter');
    else fail('ASCII Studio remained visible after zero-match kind filter');
    await page.click('.ex-filter-chip[data-filter="view"]');
    if (await page.isVisible('.ex-media-tools')) pass('ASCII Studio returns for matching preview-only Media filter');
    else fail('ASCII Studio did not return for matching preview-only filter');
    await page.fill('.ex-search', '');
    await page.click('.ex-filter-chip[data-filter="all"]');
    await page.click('.ex-back-btn');
    if ((await page.$$('.ex-ascii-studio')).length === 0) pass('ASCII Studio is removed on Media back navigation');
    else fail('ASCII Studio remained after leaving Media category');
  }

  await page.goto(origin + '/tools/ascii-studio/index.html?sample=sample.png', { waitUntil: 'load' });
  await page.waitForSelector('.asx-root .asx-out', { timeout: 10000 });
  await page.waitForFunction(() => (document.querySelector('.asx-out')?.textContent || '').trim().length > 20, null, { timeout: 10000 });
  const asciiLoaded = await page.$eval('.asx-out', (el) => (el.textContent || '').trim().length);
  if (asciiLoaded > 20) pass('ASCII Studio tool loads linked sample image from same-origin query');
  else fail('ASCII Studio linked sample did not render ASCII output');

  // A JPEG ?sample= must render the real image, NOT silently fall back to the
  // generated placeholder. Prove it by comparing against a forced-fallback render
  // (an unknown sample name → placeholder): a real image yields different ASCII.
  const asciiFor = async (sampleName) => {
    await page.goto(origin + '/tools/ascii-studio/index.html?sample=' + sampleName, { waitUntil: 'load' });
    await page.waitForSelector('.asx-root .asx-out', { timeout: 10000 });
    await page.waitForFunction(() => (document.querySelector('.asx-out')?.textContent || '').trim().length > 20, null, { timeout: 10000 });
    const out = await page.$eval('.asx-out', (el) => (el.textContent || '').trim());
    await page.evaluate(() => { try { window.gc?.(); } catch { /* gc not exposed */ } });
    return out;
  };
  const jpegAscii = await asciiFor('sample.jpeg');
  const placeholderAscii = await asciiFor('__no_such_sample__.jpg');
  if (jpegAscii.length > 20 && jpegAscii !== placeholderAscii) {
    pass('ASCII Studio renders a JPEG ?sample= (not the placeholder)');
  } else {
    fail('ASCII Studio JPEG ?sample= fell back to the placeholder: ' + JSON.stringify({ jpegLen: jpegAscii.length, sameAsPlaceholder: jpegAscii === placeholderAscii }));
  }

  // Default mode keeps the generated starter art but Use a sample must open a
  // real, keyboard-accessible gallery and allow several maintained examples.
  await page.goto(origin + '/tools/ascii-studio/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('.asx-out')?.textContent || '').trim().length > 20, null, { timeout: 10000 });
  const standaloneLayout = await page.evaluate(() => {
    const host = document.querySelector('.studio-host').getBoundingClientRect();
    return { hostHeight: host.height, viewportHeight: window.innerHeight, bodyOverflow: getComputedStyle(document.body).overflow };
  });
  if (standaloneLayout.hostHeight > standaloneLayout.viewportHeight * 0.72 && standaloneLayout.bodyOverflow === 'hidden') {
    pass('ASCII Studio uses the full remaining viewport');
  } else fail('ASCII Studio standalone height: ' + JSON.stringify(standaloneLayout));
  const generatedAscii = await page.$eval('.asx-out', (el) => el.textContent);
  await page.click('#sample');
  const gallery = await page.evaluate(() => ({
    open: document.querySelector('#sample-dialog')?.open,
    count: document.querySelectorAll('.sample-card').length,
    focused: document.activeElement?.classList.contains('sample-card'),
  }));
  if (gallery.open && gallery.count >= 6 && gallery.focused) pass('Use a sample opens the maintained accessible image gallery');
  else fail('ASCII sample gallery: ' + JSON.stringify(gallery));
  await page.click('.sample-card[data-sample="sample.jpg"]');
  await page.waitForFunction(() => !document.querySelector('#sample-dialog').open, null, { timeout: 10000 });
  await page.waitForFunction((before) => document.querySelector('.asx-out')?.textContent !== before, generatedAscii, { timeout: 10000 });
  const jpgAscii = await page.$eval('.asx-out', (el) => el.textContent);
  await page.click('#sample');
  await page.click('.sample-card[data-sample="sample.gif"]');
  await page.waitForFunction((before) => !document.querySelector('#sample-dialog').open && document.querySelector('.asx-out')?.textContent !== before, jpgAscii, { timeout: 10000 });
  pass('ASCII sample gallery loads multiple distinct maintained images');
  const gifAscii = await page.$eval('.asx-out', (el) => el.textContent);
  await page.click('#sample');
  await page.evaluate(() => {
    document.querySelector('.sample-card[data-sample="sample.jpg"]').click();
    document.querySelector('.sample-card[data-sample="sample.gif"]').click();
  });
  await page.waitForFunction(() => !document.querySelector('#sample-dialog').open, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const latestAscii = await page.$eval('.asx-out', (el) => el.textContent);
  if (latestAscii === gifAscii) pass('ASCII sample gallery keeps the latest choice when an earlier load finishes late');
  else fail('ASCII sample gallery allowed a stale sample load to win');

  // Single canonical webcam entry: no page-level "Webcam" tab; the ONLY camera
  // door is the studio's own 📷 Camera toolbar button (matches the in-viewer studio).
  const camEntry = await page.evaluate(() => ({
    pageTab: !!document.getElementById('tab-webcam'),
    studioCamBtn: !!document.querySelector('button.asx-cam'),
  }));
  if (!camEntry.pageTab && camEntry.studioCamBtn) pass('ASCII Studio tool has a single webcam entry (studio 📷 button, no page tab)');
  else fail('ASCII Studio webcam entry not canonical: ' + JSON.stringify(camEntry));

  await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
  await page.goto(origin, { waitUntil: 'load' });
  await loadExamplesGallery('.ex-showall-btn');
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
  await loadExamplesGallery('.ex-known-section');
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
