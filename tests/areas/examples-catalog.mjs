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
    'Makefile'
  ];
  const byFile = new Map(examples.map((ex) => [ex.file, ex]));
  const missingCodeSamples = requiredCodeSamples.filter((file) => byFile.get(file)?.type !== 'code');
  if (missingCodeSamples.length) {
    fail('missing programming samples: ' + missingCodeSamples.join(', '));
  } else {
    pass('programming language samples indexed (' + requiredCodeSamples.length + ')');
  }

  for (const ex of examples) {
    const opened = await page.evaluate((file) => window.__fv.openExampleFile(file), ex.file);
    if (!opened) { fail('sample did not open: ' + ex.file); continue; }
    await page.waitForFunction(() => document.querySelector('#fileName')?.textContent && !/—/.test(document.querySelector('#fileName')?.textContent || ''), { timeout: 10000 }).catch(() => {});
    const type = await page.$eval('#typeSelect', (s) => s.value).catch(() => '');
    if (ex.type && type !== ex.type) fail('sample type mismatch: ' + ex.file + ' expected ' + ex.type + ' got ' + type);
    const previewText = await page.$eval('#previewHost', (e) => e.textContent || '').catch(() => '');
    const crashed = /Preview failed|Failed to execute|DjVu missing after load|Failed to load DjVu library|TypeError|ReferenceError/i.test(previewText);
    if (crashed && !ex.partial) fail('sample preview crashed: ' + ex.file + ' :: ' + previewText.replace(/\s+/g, ' ').slice(0, 160));
    await page.waitForTimeout(10);
  }
  pass('all indexed samples open without preview crashes');
}
