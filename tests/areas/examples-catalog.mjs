import { REGISTRY } from '../../docs/core/registry.js';

export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  await page.goto(origin, { waitUntil: 'networkidle' });
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
    'service.proto',
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
  const imageFormatSamples = ['sample.jpg', 'sample.gif', 'sample.webp', 'sample.bmp'];
  const missingImageFormats = imageFormatSamples.filter((file) => byFile.get(file)?.type !== 'image');
  if (missingImageFormats.length) {
    fail('missing dedicated image format samples: ' + missingImageFormats.join(', '));
  } else {
    pass('dedicated raster image format samples indexed (' + imageFormatSamples.length + ')');
  }

  const seenTypes = new Set();
  for (const ex of examples) {
    const opened = await page.evaluate((file) => window.__fv.openExampleFile(file), ex.file);
    if (!opened) { fail('sample did not open: ' + ex.file); continue; }
    await page.waitForFunction(() => document.querySelector('#fileName')?.textContent && !/—/.test(document.querySelector('#fileName')?.textContent || ''), { timeout: 10000 }).catch(() => {});
    const type = await page.$eval('#typeSelect', (s) => s.value).catch(() => '');
    if (type) seenTypes.add(type);
    if (ex.type && type !== ex.type) fail('sample type mismatch: ' + ex.file + ' expected ' + ex.type + ' got ' + type);
    const previewText = await page.$eval('#previewHost', (e) => e.textContent || '').catch(() => '');
    const crashed = /Preview failed|Failed to execute|DjVu missing after load|Failed to load DjVu library|TypeError|ReferenceError/i.test(previewText);
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
}
