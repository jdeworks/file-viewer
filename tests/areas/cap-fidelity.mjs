export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  const consoleStart = ctx.consoleErrors.length;
  const offOriginStart = ctx.offOrigin.length;
  await page.goto(origin, { waitUntil: 'load' });

  const renderDirect = (modulePath, intake) => page.evaluate(async ({ modulePath, intake }) => {
    document.getElementById('cap-fidelity-probe')?.remove();
    const module = await import(modulePath);
    const rendered = await module.render(intake, { settings: {} });
    const probe = document.createElement('div');
    probe.id = 'cap-fidelity-probe';
    probe.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:2147483647;background:var(--bg,#fff)';
    if (rendered.parentNode) probe.appendChild(rendered.parentNode);
    else probe.innerHTML = rendered.bodyHtml || '';
    document.body.appendChild(probe);
    return (probe.textContent || '').replace(/\s+/g, ' ').trim();
  }, { modulePath, intake });

  const verify = async (name, modulePath, intake, expected, absent = []) => {
    const text = await renderDirect(modulePath, intake);
    for (const needle of expected) {
      if (text.includes(needle)) pass(`${name}: ${needle}`);
      else fail(`${name}: missing ${JSON.stringify(needle)} in ${text.slice(0, 500)}`);
    }
    for (const needle of absent) {
      if (!text.includes(needle)) pass(`${name}: omitted item ${needle} stays outside rendered cap`);
      else fail(`${name}: capped item leaked into output: ${needle}`);
    }
  };

  const brew = [
    ...Array.from({ length: 9 }, (_, i) => `tap "tap-${i}"`),
    ...Array.from({ length: 11 }, (_, i) => `mas "mas-${i}", id: ${1000 + i}`),
    ...Array.from({ length: 11 }, (_, i) => `vscode "vscode-${i}"`),
  ].join('\n');
  await verify('Brewfile caps', '/types/text/known/brewfile/renderer.js', { text: brew }, [
    'Taps Showing 8 of 9', 'Mac App Store Showing 10 of 11', 'VS Code Extensions Showing 10 of 11',
  ], ['tap-8', 'mas-10', 'vscode-10']);

  const claude = [
    ...Array.from({ length: 13 }, (_, i) => `# Header ${i}`),
    ...Array.from({ length: 7 }, (_, i) => `content-line-${i}`),
  ].join('\n');
  await verify('CLAUDE.md caps', '/types/text/known/claude-md/renderer.js', { text: claude }, [
    'Summary (Showing 6 of 7 content lines)', 'Sections (Showing 12 of 13)', '+1 more',
  ], ['Header 12', 'content-line-6']);

  const editorconfig = Array.from({ length: 11 }, (_, i) => `[*.type${i}]\nindent_size = ${i + 1}`).join('\n');
  await verify('EditorConfig cap', '/types/text/known/editorconfig/renderer.js', { text: editorconfig }, [
    'Showing 10 of 11 sections',
  ], ['*.type10']);

  const isabelle = `theory Cap_Audit imports Main begin\n${Array.from({ length: 9 }, (_, i) => `lemma cap_${i}: True by method${i}`).join('\n')}\nend`;
  await verify('Isabelle method cap', '/types/text/known/isabelle-thy/renderer.js', { text: isabelle }, [
    'Proof Methods (Showing 8 of 9)',
  ], ['method8']);

  const mailmap = Array.from({ length: 31 }, (_, i) => `Canonical ${i} <canon${i}@example.test> Old ${i} <old${i}@example.test>`).join('\n');
  await verify('Mailmap cap', '/types/text/known/mailmap/renderer.js', { text: mailmap }, [
    'Showing 30 of 31 entries',
  ], ['canon30@example.test']);

  const polybar = `[colors]\n${Array.from({ length: 9 }, (_, i) => `color-${i} = #${String(i).repeat(6)}`).join('\n')}`;
  await verify('Polybar color cap', '/types/text/known/polybar-conf/renderer.js', { text: polybar }, [
    'Colors (Showing 8 of 9)',
  ], ['color-8']);

  const appJson = {
    buildpacks: Array.from({ length: 9 }, (_, i) => ({ url: `buildpack-${i}` })),
    addons: Array.from({ length: 11 }, (_, i) => `addon-${i}`),
  };
  await verify('Heroku app.json caps', '/types/text/json/known/app-json/renderer.js', { parsed: appJson }, [
    'Buildpacks (Showing 8 of 9)', 'Add-ons (Showing 10 of 11)',
  ], ['buildpack-8', 'addon-10']);

  const tauri = {
    productName: 'Cap audit',
    app: {
      windows: Array.from({ length: 6 }, (_, i) => ({ label: `window-${i}` })),
      security: { permissions: Array.from({ length: 9 }, (_, i) => `permission-${i}`) },
    },
  };
  await verify('Tauri caps', '/types/text/json/known/tauri-conf/renderer.js', { text: JSON.stringify(tauri) }, [
    'Windows (Showing 5 of 6)', 'Permissions (Showing 8 of 9)',
  ], ['window-5', 'permission-8']);

  const clang = {
    Checks: Array.from({ length: 11 }, (_, i) => `family${i}-*`).join(','),
    CheckOptions: Array.from({ length: 11 }, (_, i) => ({ key: `option-${i}`, value: i })),
  };
  await verify('clang-tidy caps', '/types/text/yaml/known/clang-tidy/renderer.js', { text: JSON.stringify(clang), filename: '.clang-tidy' }, [
    'Check Categories (Showing 10 of 11)', 'Check Options (Showing 10 of 11)',
  ], ['family10', 'option-10']);

  const hadolint = {
    ignore: Array.from({ length: 16 }, (_, i) => `DL${1000 + i}`),
    'trusted-registries': Array.from({ length: 9 }, (_, i) => `registry-${i}.test`),
  };
  await verify('Hadolint caps', '/types/text/yaml/known/hadolint/renderer.js', { text: JSON.stringify(hadolint) }, [
    'Ignored rules (Showing 15 of 16)', 'trusted registries (Showing 8 of 9)',
  ], ['DL1015', 'registry-8.test']);

  const hydra = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`config_${i}`, `value-${i}`]));
  await verify('Hydra config cap', '/types/text/yaml/known/hydra-config/renderer.js', { text: JSON.stringify(hydra), filename: 'config.yaml' }, [
    'Config Values (Showing 30 of 31)',
  ], ['config_30']);

  const moonGlobs = { projects: Array.from({ length: 9 }, (_, i) => `apps/project-${i}`) };
  await verify('Moon glob cap', '/types/text/yaml/known/moonrepo/renderer.js', { text: JSON.stringify(moonGlobs), filename: 'moon.yml' }, [
    'Projects (Showing 8 of 9)', '+1 more',
  ], ['apps/project-8']);
  const moonObjects = { projects: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`project-${i}`, `apps/${i}`])) };
  await verify('Moon object cap', '/types/text/yaml/known/moonrepo/renderer.js', { text: JSON.stringify(moonObjects), filename: 'moon.yml' }, [
    'Projects (Showing 8 of 9)',
  ], ['project-8']);

  const pubspec = { name: 'cap_audit', flutter: { fonts: Array.from({ length: 11 }, (_, i) => ({ family: `font-${i}` })) } };
  await verify('Pubspec font cap', '/types/text/yaml/known/pubspec/renderer.js', { text: JSON.stringify(pubspec), filename: 'pubspec.yaml' }, [
    'Fonts (Showing 10 of 11)', '+1 more',
  ], ['font-10']);

  const semaphore = {
    blocks: Array.from({ length: 9 }, (_, i) => ({ name: `block-${i}`, task: { jobs: [] } })),
    global_job_config: { secrets: Array.from({ length: 7 }, (_, i) => ({ name: `secret-${i}` })) },
  };
  await verify('Semaphore caps', '/types/text/yaml/known/semaphore-ci/renderer.js', { text: JSON.stringify(semaphore) }, [
    'Blocks (Showing 8 of 9)', 'Showing 6 of 7',
  ], ['block-8', 'secret-6']);

  const pyproject = {
    project: {
      name: 'cap-audit',
      authors: Array.from({ length: 4 }, (_, i) => ({ name: `author-${i}` })),
      maintainers: Array.from({ length: 3 }, (_, i) => ({ name: `maintainer-${i}` })),
    },
    tool: {
      pytest: { ini_options: { markers: Array.from({ length: 4 }, (_, i) => `marker-${i}`) } },
      ruff: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`ruff-${i}`, i])),
      black: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`black-${i}`, i])),
      isort: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`isort-${i}`, i])),
    },
  };
  await verify('Pyproject caps', '/types/text/toml/known/pyproject/renderer.js', { parsed: pyproject }, [
    'authors (Showing 3 of 4)', 'maintainers (Showing 2 of 3)', 'markers (Showing 3 of 4)',
    '[tool.ruff] (Showing 6 of 7)', '[tool.black] (Showing 4 of 5)', '[tool.isort] (Showing 4 of 5)',
  ], ['author-3', 'maintainer-2', 'marker-3', 'ruff-6', 'black-4', 'isort-4']);

  const org = Array.from({ length: 31 }, (_, i) => `[[https://example.test/${i}][link-${i}]]`).join('\n');
  await verify('Org link cap', '/types/text/known/org-mode/renderer.js', { text: org }, [
    'Links (Showing 30 of 31)',
  ]);
  const orgLinkRows = await page.$$eval('#cap-fidelity-probe .org-sec', (sections) => {
    const section = sections.find((node) => node.querySelector('h3')?.textContent?.startsWith('Links'));
    return section?.querySelectorAll('li').length || 0;
  });
  if (orgLinkRows === 30) pass('Org link cap: rendered list contains exactly 30 of 31 links');
  else fail(`Org link cap: expected 30 rendered rows, got ${orgLinkRows}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await renderDirect('/types/text/json/known/tauri-conf/renderer.js', { text: JSON.stringify(tauri) });
  const mobileFit = await page.$eval('#cap-fidelity-probe', (node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    visible: !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
  }));
  if (mobileFit.visible && mobileFit.scrollWidth <= mobileFit.clientWidth) {
    pass('truthful cap summaries remain visible without horizontal overflow at 390px');
  } else fail('mobile cap summary layout overflow: ' + JSON.stringify(mobileFit));

  // Exercise one repaired renderer through real intake/detection and the generated known registry,
  // not only direct module imports.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fv);
  await page.evaluate(async (value) => {
    const blob = new Blob([JSON.stringify(value)], { type: 'application/json' });
    await window.__fv.openBlobFile(blob, 'tauri.conf.json', { mime: 'application/json' });
  }, tauri);
  await page.waitForSelector('#previewHost .tauri-doc');
  const integratedText = await page.$eval('#previewHost .tauri-doc', (node) => (node.textContent || '').replace(/\s+/g, ' '));
  if (integratedText.includes('Windows (Showing 5 of 6)') && integratedText.includes('Permissions (Showing 8 of 9)')) {
    pass('generated known registry serves truthful caps through real Tauri intake');
  } else fail('integrated Tauri cap output: ' + integratedText.slice(0, 500));

  const capErrors = ctx.consoleErrors.slice(consoleStart);
  const capOffOrigin = ctx.offOrigin.slice(offOriginStart);
  if (capErrors.length) fail('cap fidelity console/page errors:\n  ' + capErrors.join('\n  '));
  else pass('cap fidelity renderers produced no console/page errors');
  if (capOffOrigin.length) fail('cap fidelity off-origin requests:\n  ' + capOffOrigin.join('\n  '));
  else pass('cap fidelity renderers made zero off-origin requests');
}
