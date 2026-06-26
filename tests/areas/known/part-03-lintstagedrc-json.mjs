// Auto-split slice 03/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: .lintstagedrc.json … .clang-tidy.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── .lintstagedrc.json viewer ──
  await openExample('.lintstagedrc.json');
  await page.waitForSelector('#previewHost .lst-doc', { timeout: 12000 });
  const lstText = await page.$eval('#previewHost .lst-doc', (e) => e.textContent);
  if (/lint-staged/i.test(lstText)) pass('.lintstagedrc.json: badge shown'); else fail('lint-staged badge: ' + lstText.slice(0, 200));
  if (/eslint|prettier|stylelint/i.test(lstText)) pass('.lintstagedrc.json: glob rules shown'); else fail('lint-staged rules: ' + lstText.slice(0, 200));

  // ── nest-cli.json viewer ──
  await openExample('nest-cli.json');
  await page.waitForSelector('#previewHost .nst-doc', { timeout: 12000 });
  const nstText = await page.$eval('#previewHost .nst-doc', (e) => e.textContent);
  if (/NestJS/i.test(nstText)) pass('nest-cli.json: badge shown'); else fail('nest-cli badge: ' + nstText.slice(0, 200));
  if (/monorepo|api|auth|library/i.test(nstText)) pass('nest-cli.json: projects shown'); else fail('nest-cli projects: ' + nstText.slice(0, 200));

  // ── .swcrc viewer ──
  await openExample('.swcrc');
  await page.waitForSelector('#previewHost .swc-doc', { timeout: 12000 });
  const swcText = await page.$eval('#previewHost .swc-doc', (e) => e.textContent);
  if (/SWC/i.test(swcText)) pass('.swcrc: badge shown'); else fail('swcrc badge: ' + swcText.slice(0, 200));
  if (/typescript|es2020|es6|source maps/i.test(swcText)) pass('.swcrc: compiler config shown'); else fail('swcrc config: ' + swcText.slice(0, 200));

  // ── Chart.yaml (Helm chart) viewer ──
  await openExample('Chart.yaml (Helm chart)');
  await page.waitForSelector('#previewHost .helmchart-doc', { timeout: 12000 });
  pass('Chart.yaml: renders');
  const hcText = await page.$eval('#previewHost .helmchart-doc', (e) => e.textContent);
  if (/Helm/i.test(hcText)) pass('Chart.yaml: Helm badge shown'); else fail('helm-chart badge: ' + hcText.slice(0, 200));
  if (/version|name/i.test(hcText)) pass('Chart.yaml: chart info shown'); else fail('helm-chart content: ' + hcText.slice(0, 200));
  if (/my-app|postgresql|redis/i.test(hcText)) pass('Chart.yaml: chart name and dependencies shown'); else fail('helm-chart content: ' + hcText.slice(0, 200));
  if (/Helm Chart Review|dependency range|condition/i.test(hcText)) pass('Chart.yaml: review findings shown'); else fail('helm-chart review: ' + hcText.slice(0, 300));
  const hcHelpTitle = await page.$eval('#previewHost .helmchart-doc .helmchart-link[data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Helm chart|Open line|source/i.test(hcHelpTitle)) pass('Chart.yaml: hover source help shown'); else fail('helm-chart hover help: ' + hcHelpTitle);
  const hcSourceCollapsed = await page.$eval('#previewHost .helmchart-doc .kf-source-details', (e) => !e.open && /Source/.test(e.textContent));
  if (hcSourceCollapsed) pass('Chart.yaml: source collapsed'); else fail('helm-chart source should start collapsed');
  const hcSourceLine = await page.$eval('#previewHost .helmchart-doc .helmchart-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .helmchart-doc .kf-source-details');
    return details?.open && document.getElementById(`helmchart-line-${line}`);
  }, hcSourceLine, { timeout: 3000 });
  pass('Chart.yaml: source links open source');

  // ── kustomization.yaml (Kustomize) viewer ──
  await openExample('kustomization.yaml (Kustomize)');
  await page.waitForSelector('#previewHost .kustomize-doc', { timeout: 12000 });
  pass('kustomization.yaml: renders');
  const kustText = await page.$eval('#previewHost .kustomize-doc', (e) => e.textContent);
  if (/Kustomize/i.test(kustText)) pass('kustomization.yaml: Kustomize badge shown'); else fail('kustomize badge: ' + kustText.slice(0, 200));
  if (/resources/i.test(kustText)) pass('kustomization.yaml: resources shown'); else fail('kustomize content: ' + kustText.slice(0, 200));
  if (/commonLabels|common labels/i.test(kustText)) pass('kustomization.yaml: commonLabels shown'); else fail('kustomize commonLabels: ' + kustText.slice(0, 200));

  // ── ansible-playbook.yml (Ansible) viewer ──
  await openExample('ansible-playbook.yml (Ansible)');
  await page.waitForSelector('#previewHost .ans-doc', { timeout: 12000 });
  const ansText = await page.$eval('#previewHost .ans-doc', (e) => e.textContent);
  if (/Ansible/i.test(ansText)) pass('ansible-playbook.yml: Ansible badge shown'); else fail('ansible badge: ' + ansText.slice(0, 200));
  if (/webservers|databases|nginx|postgresql/i.test(ansText)) pass('ansible-playbook.yml: plays and tasks shown'); else fail('ansible content: ' + ansText.slice(0, 200));

  // ── Pulumi.yaml (Pulumi project) viewer ──
  await openExample('Pulumi.yaml (Pulumi project)');
  await page.waitForSelector('#previewHost .pul-doc', { timeout: 12000 });
  const pulText = await page.$eval('#previewHost .pul-doc', (e) => e.textContent);
  if (/Pulumi/i.test(pulText)) pass('Pulumi.yaml: Pulumi badge shown'); else fail('pulumi badge: ' + pulText.slice(0, 200));
  if (/nodejs|cloud-infra|region/i.test(pulText)) pass('Pulumi.yaml: runtime and config shown'); else fail('pulumi content: ' + pulText.slice(0, 200));

  // ── packer.json (HashiCorp Packer) viewer ──
  await openExample('packer.json (HashiCorp Packer)');
  await page.waitForSelector('#previewHost .pkr-doc', { timeout: 12000 });
  const pkrText = await page.$eval('#previewHost .pkr-doc', (e) => e.textContent);
  if (/Packer/i.test(pkrText)) pass('packer.json: Packer badge shown'); else fail('packer badge: ' + pkrText.slice(0, 200));
  if (/amazon-ebs|shell|builders/i.test(pkrText)) pass('packer.json: builders and provisioners shown'); else fail('packer content: ' + pkrText.slice(0, 200));

  // ── ruff.toml (Ruff linter) viewer ──
  await openExample('ruff.toml (Ruff linter)');
  await page.waitForSelector('#previewHost .rufftoml-doc', { timeout: 12000 });
  pass('ruff.toml: badge shown');
  const rufText = await page.$eval('#previewHost .rufftoml-doc', (e) => e.textContent);
  if (!rufText.includes('py311') && !rufText.includes('3.11')) fail('ruff.toml: python version not shown'); else pass('ruff.toml: python version shown');
  if (!rufText.includes('120')) fail('ruff.toml: line length not shown'); else pass('ruff.toml: line length shown');

  // ── uv.toml (uv package manager) viewer ──
  await openExample('uv.toml (uv package manager)');
  await page.waitForSelector('#previewHost .uv-doc', { timeout: 12000 });
  const uvText = await page.$eval('#previewHost .uv-doc', (e) => e.textContent);
  if (/uv/i.test(uvText)) pass('uv.toml: uv badge shown'); else fail('uv badge: ' + uvText.slice(0, 200));
  if (/3\.12|python|hardlink/i.test(uvText)) pass('uv.toml: Python version and settings shown'); else fail('uv content: ' + uvText.slice(0, 200));

  // ── values.yaml (Helm values) viewer ──
  await openExample('values.yaml (Helm values)');
  await page.waitForSelector('#previewHost .helmvalues-doc', { timeout: 12000 });
  pass('values.yaml: renders');
  const hvText = await page.$eval('#previewHost .helmvalues-doc', (e) => e.textContent);
  if (/Helm/i.test(hvText)) pass('values.yaml: Helm Values badge shown'); else fail('helm-values badge: ' + hvText.slice(0, 200));
  if (/image|service/i.test(hvText)) pass('values.yaml: values info shown'); else fail('helm-values content: ' + hvText.slice(0, 200));
  if (/Helm Values Review|autoscaling|reference|public host/i.test(hvText)) pass('values.yaml: review findings shown'); else fail('helm-values review: ' + hvText.slice(0, 300));
  const hvHelpTitle = await page.$eval('#previewHost .helmvalues-doc .helmvalues-link[data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Helm values|Open line|source/i.test(hvHelpTitle)) pass('values.yaml: hover source help shown'); else fail('helm-values hover help: ' + hvHelpTitle);
  const hvSourceCollapsed = await page.$eval('#previewHost .helmvalues-doc .kf-source-details', (e) => !e.open && /Redacted source/.test(e.textContent));
  if (hvSourceCollapsed) pass('values.yaml: source collapsed'); else fail('helm-values source should start collapsed');
  const hvSourceLine = await page.$eval('#previewHost .helmvalues-doc .helmvalues-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .helmvalues-doc .kf-source-details');
    return details?.open && document.getElementById(`helmvalues-line-${line}`);
  }, hvSourceLine, { timeout: 3000 });
  pass('values.yaml: source links open source');

  // ── package-lock.json viewer ──
  await openExample('package-lock.json');
  await page.waitForSelector('#previewHost .plk-doc', { timeout: 12000 });
  const plkText = await page.$eval('#previewHost .plk-doc', (e) => e.textContent);
  if (/npm/i.test(plkText)) pass('package-lock.json: badge shown'); else fail('package-lock badge: ' + plkText.slice(0, 200));
  if (/lockfileVersion|v3|Total|packages/i.test(plkText)) pass('package-lock.json: stats shown'); else fail('package-lock stats: ' + plkText.slice(0, 200));
  if (/Root Dependencies|Resolved Packages|express|integrity/i.test(plkText)) pass('package-lock.json: dependency rows shown'); else fail('package-lock rows: ' + plkText.slice(0, 300));
  const plkSourceCollapsed = await page.$eval('#previewHost .plk-doc .kf-source-details', (e) => !e.open && /Source/.test(e.textContent));
  if (plkSourceCollapsed) pass('package-lock.json: source collapsed'); else fail('package-lock source should start collapsed');
  const plkSourceLine = await page.$eval('#previewHost .plk-doc .kf-source-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .plk-doc .kf-source-details');
    return details?.open && document.getElementById(`plk-line-${line}`);
  }, plkSourceLine, { timeout: 3000 });
  pass('package-lock.json: source links open source');
  const plkBad = await page.evaluate(async () => {
    const mod = await import('/types/text/json/known/package-lock/renderer.js');
    const text = JSON.stringify({
      name: 'risky-lock',
      lockfileVersion: 3,
      packages: {
        '': {
          dependencies: {
            loose: '*',
            custom: '^1.0.0',
          },
        },
        'node_modules/loose': {
          version: '1.0.0',
          resolved: 'http://registry.example.test/loose-1.0.0.tgz',
        },
        'node_modules/custom': {
          version: '1.0.0',
          resolved: 'https://mirror.example.test/custom-1.0.0.tgz',
          integrity: 'sha512-custom',
        },
      },
    }, null, 2);
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    const open = rendered.querySelector('.kf-source-details')?.open || false;
    rendered.remove();
    return { out, issues, open };
  });
  if (/Package Lock Review|broad range|missing integrity|plain HTTP|custom source|loose|custom/i.test(plkBad.out + plkBad.issues) && !plkBad.open) pass('package-lock.json: broad range and resolution diagnostics shown'); else fail('package-lock synthetic diagnostics: ' + JSON.stringify(plkBad).slice(0, 1000));

  // ── composer.lock viewer ──
  await openExample('composer.lock');
  await page.waitForSelector('#previewHost .cpl-doc', { timeout: 12000 });
  const cplText = await page.$eval('#previewHost .cpl-doc', (e) => e.textContent);
  if (/Composer/i.test(cplText)) pass('composer.lock: badge shown'); else fail('composer-lock badge: ' + cplText.slice(0, 200));
  if (/guzzlehttp|symfony|phpunit|package/i.test(cplText)) pass('composer.lock: packages shown'); else fail('composer-lock packages: ' + cplText.slice(0, 200));

  // ── pnpm-lock.yaml viewer ──
  await openExample('pnpm-lock.yaml');
  await page.waitForSelector('#previewHost .pkl-doc', { timeout: 12000 });
  const pklText = await page.$eval('#previewHost .pkl-doc', (e) => e.textContent);
  if (/pnpm/i.test(pklText)) pass('pnpm-lock.yaml: badge shown'); else fail('pnpm-lock badge: ' + pklText.slice(0, 200));
  if (/lockfileVersion|9|Packages|react/i.test(pklText)) pass('pnpm-lock.yaml: stats shown'); else fail('pnpm-lock stats: ' + pklText.slice(0, 200));

  // ── Cargo.lock viewer ──
  await openExample('Cargo.lock');
  await page.waitForSelector('#previewHost .clk-doc', { timeout: 12000 });
  const clkText = await page.$eval('#previewHost .clk-doc', (e) => e.textContent);
  if (/Cargo/i.test(clkText)) pass('Cargo.lock: badge shown'); else fail('cargo-lock badge: ' + clkText.slice(0, 200));
  if (/serde|crate|Workspace/i.test(clkText)) pass('Cargo.lock: crates shown'); else fail('cargo-lock crates: ' + clkText.slice(0, 200));

  // ── poetry.lock viewer ──
  await openExample('poetry.lock');
  await page.waitForSelector('#previewHost .plo-doc', { timeout: 12000 });
  const ploText = await page.$eval('#previewHost .plo-doc', (e) => e.textContent);
  if (/Poetry/i.test(ploText)) pass('poetry.lock: badge shown'); else fail('poetry-lock badge: ' + ploText.slice(0, 200));
  if (/flask|requests|certifi|package/i.test(ploText)) pass('poetry.lock: packages shown'); else fail('poetry-lock packages: ' + ploText.slice(0, 200));

  // ── Julia Project.toml viewer ──
  await openExample('Project.toml');
  await page.waitForSelector('#previewHost .julia-doc', { timeout: 12000 });
  const jpText = await page.$eval('#previewHost .julia-doc', (e) => e.textContent);
  if (/Julia/i.test(jpText)) pass('Project.toml: Julia badge shown'); else fail('julia-project badge: ' + jpText.slice(0, 200));
  if (/MyPackage/i.test(jpText)) pass('Project.toml: package name shown'); else fail('julia-project name: ' + jpText.slice(0, 200));
  if (/DataFrames|HTTP|Dependencies/i.test(jpText)) pass('Project.toml: dependencies shown'); else fail('julia-project deps: ' + jpText.slice(0, 300));

  // ── Julia Manifest.toml viewer ──
  await openExample('Manifest.toml');
  await page.waitForSelector('#previewHost .julia-mani-doc', { timeout: 12000 });
  const jmText = await page.$eval('#previewHost .julia-mani-doc', (e) => e.textContent);
  if (/Julia Manifest/i.test(jmText)) pass('Manifest.toml: Julia Manifest badge shown'); else fail('julia-manifest badge: ' + jmText.slice(0, 200));
  if (/1\.9\.0/.test(jmText)) pass('Manifest.toml: julia_version shown'); else fail('julia-manifest version: ' + jmText.slice(0, 200));
  if (/DataFrames|HTTP|Statistics|package/i.test(jmText)) pass('Manifest.toml: packages shown'); else fail('julia-manifest pkgs: ' + jmText.slice(0, 300));
  if (/do not edit manually/i.test(jmText)) pass('Manifest.toml: lockfile warning shown'); else fail('julia-manifest lockfile note: ' + jmText.slice(0, 200));

  // ── go.sum viewer ──
  await openExample('go.sum');
  await page.waitForSelector('#previewHost .gsm-doc', { timeout: 12000 });
  const gsmText = await page.$eval('#previewHost .gsm-doc', (e) => e.textContent);
  if (/Go/i.test(gsmText)) pass('go.sum: badge shown'); else fail('go-sum badge: ' + gsmText.slice(0, 200));
  if (/gin-gonic|module|Entries|Modules/i.test(gsmText)) pass('go.sum: module list shown'); else fail('go-sum modules: ' + gsmText.slice(0, 200));

  // ── go.work viewer ──
  await openExample('go.work');
  await page.waitForSelector('#previewHost .gw-doc', { timeout: 12000 });
  const gwText = await page.$eval('#previewHost .gw-doc', (e) => e.textContent);
  if (/Go Workspace|Go/i.test(gwText)) pass('go.work: badge shown'); else fail('go-work badge: ' + gwText.slice(0, 200));
  if (/\.\/core|\.\/api|1\.22\.0/i.test(gwText)) pass('go.work: modules or version shown'); else fail('go-work modules: ' + gwText.slice(0, 300));

  // ── Makefile viewer ──
  await openExample('Makefile');
  await page.waitForSelector('#previewHost .makefile-doc', { timeout: 12000 });
  pass('Makefile: renders');
  const mkfText = await page.$eval('#previewHost .makefile-doc', (e) => e.textContent);
  if (/Make|Makefile/i.test(mkfText)) pass('Makefile: badge shown'); else fail('makefile badge: ' + mkfText.slice(0, 200));
  if (/all|test|clean|serve|build/i.test(mkfText)) pass('Makefile: targets shown'); else fail('makefile targets: ' + mkfText.slice(0, 200));

  // ── Justfile viewer ──
  await openExample('Justfile');
  await page.waitForSelector('#previewHost .jst-doc', { timeout: 12000 });
  const jstText = await page.$eval('#previewHost .jst-doc', (e) => e.textContent);
  if (/[Jj]ust/i.test(jstText)) pass('Justfile: badge shown'); else fail('justfile badge: ' + jstText.slice(0, 200));
  if (/build|test|fmt|release/i.test(jstText)) pass('Justfile: recipes shown'); else fail('justfile recipes: ' + jstText.slice(0, 200));

  // ── Procfile viewer ──
  await openExample('Procfile');
  await page.waitForSelector('#previewHost .pfl-doc', { timeout: 12000 });
  const pflText = await page.$eval('#previewHost .pfl-doc', (e) => e.textContent);
  if (/Procfile|process/i.test(pflText)) pass('Procfile: badge shown'); else fail('procfile badge: ' + pflText.slice(0, 200));
  if (/web|worker|scheduler/i.test(pflText)) pass('Procfile: process types shown'); else fail('procfile procs: ' + pflText.slice(0, 200));

  // ── rust-toolchain.toml viewer ──
  await openExample('rust-toolchain.toml');
  await page.waitForSelector('#previewHost .rusttoolchain-doc', { timeout: 12000 });
  pass('rust-toolchain.toml: badge shown');
  const rtText = await page.$eval('#previewHost .rusttoolchain-doc', (e) => e.textContent);
  if (!rtText.includes('1.75') && !rtText.includes('1.75.0')) fail('rust-toolchain.toml: channel not shown');
  else pass('rust-toolchain.toml: channel shown');
  if (!rtText.includes('clippy')) fail('rust-toolchain.toml: components not shown');
  else pass('rust-toolchain.toml: components shown');

  // ── .envrc viewer ──
  await openExample('.envrc');
  await page.waitForSelector('#previewHost .erc-doc', { timeout: 12000 });
  const ercText = await page.$eval('#previewHost .erc-doc', (e) => e.textContent);
  if (/direnv|envrc/i.test(ercText)) pass('.envrc: badge shown'); else fail('envrc badge: ' + ercText.slice(0, 200));
  if (/NODE_ENV|PORT|DATABASE_URL/i.test(ercText)) pass('.envrc: exports shown'); else fail('envrc exports: ' + ercText.slice(0, 200));
  if (!/do-not-commit/i.test(ercText)) pass('.envrc: sensitive values redacted'); else fail('envrc not redacting secrets');

  // ── mise.toml viewer ──
  await openExample('mise.toml');
  await page.waitForSelector('#previewHost .mise-doc', { timeout: 12000 });
  const mseText = await page.$eval('#previewHost .mise-doc', (e) => e.textContent);
  if (/mise/i.test(mseText)) pass('mise.toml: badge shown'); else fail('mise badge: ' + mseText.slice(0, 200));
  if (/node|python|ruby/i.test(mseText)) pass('mise.toml: tools shown'); else fail('mise tools: ' + mseText.slice(0, 200));

  // ── .tool-versions viewer ──
  await openExample('.tool-versions');
  await page.waitForSelector('.toolversions-doc', { timeout: 12000 });
  pass('.tool-versions: renders');
  const tvrText = await page.$eval('.toolversions-doc', (e) => e.textContent);
  if (/asdf|tool.version/i.test(tvrText)) pass('.tool-versions: badge shown'); else fail('tool-versions badge: ' + tvrText.slice(0, 200));
  if (/node|python|ruby/i.test(tvrText)) pass('.tool-versions: tools shown'); else fail('tool-versions tools: ' + tvrText.slice(0, 200));

  // ── .gitattributes viewer ──
  await openExample('.gitattributes');
  await page.waitForSelector('#previewHost .gitattr-doc', { timeout: 12000 });
  pass('.gitattributes: badge shown');
  const gaText = await page.$eval('#previewHost .gitattr-doc', el => el.textContent);
  if (!gaText.includes('eol=lf') && !gaText.includes('LF')) fail('.gitattributes: line endings not shown');
  else pass('.gitattributes: line endings shown');
  if (!gaText.includes('lfs') && !gaText.includes('LFS')) fail('.gitattributes: LFS not shown');
  else pass('.gitattributes: LFS shown');

  // ── .mailmap viewer ──
  await openExample('.mailmap');
  await page.waitForSelector('#previewHost .mm-doc', { timeout: 12000 });
  const mmText = await page.$eval('#previewHost .mm-doc', (e) => e.textContent);
  if (/mailmap/i.test(mmText)) pass('.mailmap: title shown'); else fail('mailmap title: ' + mmText.slice(0, 200));
  const mmNames = await page.$$eval('#previewHost .mm-doc .mm-name', (els) => els.map((e) => e.textContent));
  if (mmNames.length > 0) pass('.mailmap: canonical names shown'); else fail('mailmap names: ' + mmText.slice(0, 200));

  // ── .npmignore viewer ──
  await openExample('.npmignore');
  await page.waitForSelector('#previewHost .nig-doc', { timeout: 12000 });
  const nigText = await page.$eval('#previewHost .nig-doc', (e) => e.textContent);
  if (/npmignore/i.test(nigText)) pass('.npmignore: title shown'); else fail('npmignore title: ' + nigText.slice(0, 200));
  const nigPats = await page.$$eval('#previewHost .nig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (nigPats.some((p) => /node_modules|test|dist/.test(p))) pass('.npmignore: patterns shown'); else fail('npmignore patterns: ' + nigPats.join(','));

  // ── .dockerignore viewer ──
  await openExample('.dockerignore');
  await page.waitForSelector('#previewHost .dig-doc', { timeout: 12000 });
  const digText = await page.$eval('#previewHost .dig-doc', (e) => e.textContent);
  if (/dockerignore/i.test(digText)) pass('.dockerignore: title shown'); else fail('dockerignore title: ' + digText.slice(0, 200));
  const digPats = await page.$$eval('#previewHost .dig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (digPats.some((p) => /node_modules|\.git|dist/.test(p))) pass('.dockerignore: patterns shown'); else fail('dockerignore patterns: ' + digPats.join(','));

  // ── .npmignore upgraded viewer (npmignore-doc class + badge) ──
  await openExample('.npmignore');
  await page.waitForSelector('.npmignore-doc');
  pass('.npmignore: renders');
  const npmignoreText = await page.$eval('.npmignore-doc', el => el.textContent);
  if (!npmignoreText.includes('npm')) fail('.npmignore: missing badge'); else pass('.npmignore: badge shown');
  if (!npmignoreText.includes('pattern') && !npmignoreText.includes('node_modules') && !npmignoreText.includes('test')) fail('.npmignore: no patterns shown'); else pass('.npmignore: patterns shown');

  // ── .dockerignore upgraded viewer (dockerignore-doc class + badge) ──
  await openExample('.dockerignore');
  await page.waitForSelector('.dockerignore-doc');
  pass('.dockerignore: renders');
  const dockerignoreText = await page.$eval('.dockerignore-doc', el => el.textContent);
  if (!dockerignoreText.includes('Docker')) fail('.dockerignore: missing badge'); else pass('.dockerignore: badge shown');
  if (!dockerignoreText.includes('.git') && !dockerignoreText.includes('node_modules') && !dockerignoreText.includes('pattern')) fail('.dockerignore: no patterns shown'); else pass('.dockerignore: patterns shown');

  // ── AppVeyor CI viewer ──
  await openExample('appveyor.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const avyChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/AppVeyor/i.test(avyChipText)) pass('appveyor.yml: badge shown'); else fail('appveyor chip: ' + avyChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .avy-doc', { timeout: 12000 });
  const avyText = await page.$eval('#previewHost .avy-doc', (e) => e.textContent);
  if (/AppVeyor/i.test(avyText)) pass('appveyor.yml: label shown'); else fail('appveyor label: ' + avyText.slice(0, 200));
  if (/Visual Studio|Build Script|build step/i.test(avyText)) pass('appveyor.yml: build info shown'); else fail('appveyor build info: ' + avyText.slice(0, 200));

  // ── RuboCop viewer ──
  await openExample('.rubocop.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const rbcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/RuboCop/i.test(rbcChipText)) pass('.rubocop.yml: badge shown'); else fail('rubocop chip: ' + rbcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .rbc-doc', { timeout: 12000 });
  const rbcText = await page.$eval('#previewHost .rbc-doc', (e) => e.textContent);
  if (/RuboCop/i.test(rbcText)) pass('.rubocop.yml: label shown'); else fail('rubocop label: ' + rbcText.slice(0, 200));
  if (/Ruby|3\.[12]|TargetRuby/i.test(rbcText)) pass('.rubocop.yml: ruby version shown'); else fail('rubocop ruby version: ' + rbcText.slice(0, 200));

  // ── RuboCop TODO viewer ──
  await openExample('.rubocop_todo.yml');
  await page.waitForSelector('.rubocoptodo-doc', { timeout: 12000 });
  pass('.rubocop_todo.yml: renders');
  const rubocoptodoText = await page.$eval('.rubocoptodo-doc', el => el.textContent);
  if (!rubocoptodoText.includes('RuboCop')) fail('.rubocop_todo.yml: missing badge'); else pass('.rubocop_todo.yml: badge shown');
  if (!rubocoptodoText.includes('cop') && !rubocoptodoText.includes('Style') && !rubocoptodoText.includes('Metrics')) fail('.rubocop_todo.yml: no cops shown'); else pass('.rubocop_todo.yml: cops shown');

  // ── Taskfile viewer ──
  await openExample('Taskfile.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const tkfChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Taskfile/i.test(tkfChipText)) pass('Taskfile.yml: badge shown'); else fail('taskfile chip: ' + tkfChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .tkf-doc', { timeout: 12000 });
  const tkfText = await page.$eval('#previewHost .tkf-doc', (e) => e.textContent);
  if (/Taskfile/i.test(tkfText)) pass('Taskfile.yml: label shown'); else fail('taskfile label: ' + tkfText.slice(0, 200));
  if (/build|test|clean/i.test(tkfText)) pass('Taskfile.yml: tasks shown'); else fail('taskfile tasks: ' + tkfText.slice(0, 200));

  // ── MkDocs viewer ──
  await openExample('mkdocs.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const mdkChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/MkDocs/i.test(mdkChipText)) pass('mkdocs.yml: badge shown'); else fail('mkdocs chip: ' + mdkChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .mkdocs-doc', { timeout: 12000 });
  const mdkText = await page.$eval('#previewHost .mkdocs-doc', (e) => e.textContent);
  if (/MkDocs/i.test(mdkText)) pass('mkdocs.yml: label shown'); else fail('mkdocs label: ' + mdkText.slice(0, 200));
  if (/My Project Docs|material|Getting Started/i.test(mdkText)) pass('mkdocs.yml: site info shown'); else fail('mkdocs site info: ' + mdkText.slice(0, 200));

  // ── Gemfile.lock viewer ──
  await openExample('Gemfile.lock');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const gflChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Gemfile|Bundler/i.test(gflChipText)) pass('Gemfile.lock: chip shown'); else fail('gemfile-lock chip: ' + gflChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .gfl-doc', { timeout: 12000 });
  const gflText = await page.$eval('#previewHost .gfl-doc', (e) => e.textContent);
  if (/GEM|BUNDLED|Gemfile|rails/i.test(gflText)) pass('Gemfile.lock: content shown'); else fail('gemfile-lock content: ' + gflText.slice(0, 200));

  // ── SonarQube config viewer ──
  await openExample('sonar-project.properties');
  await page.waitForSelector('#previewHost .sonarprops-doc', { timeout: 12000 });
  const snrText = await page.$eval('#previewHost .sonarprops-doc', (e) => e.textContent);
  if (/SonarQube/i.test(snrText)) pass('sonar-project.properties: badge shown'); else fail('sonar badge: ' + snrText.slice(0, 200));
  if (snrText.includes('My Application')) pass('sonar-project.properties: project name shown'); else fail('sonar-project.properties: project name not shown: ' + snrText.slice(0, 200));
  if (snrText.includes('squ_abc123xyz456def789')) fail('sonar-project.properties: token leaked'); else pass('sonar-project.properties: token masked');

  // ── Hatch config viewer ──
  await openExample('hatch.toml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const htcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Hatch/i.test(htcChipText)) pass('hatch.toml: chip shown'); else fail('hatch chip: ' + htcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .htc-doc', { timeout: 12000 });
  const htcText = await page.$eval('#previewHost .htc-doc', (e) => e.textContent);
  if (/Hatch|build|env/i.test(htcText)) pass('hatch.toml: content shown'); else fail('hatch content: ' + htcText.slice(0, 200));

  // ── rush.json viewer ──
  await openExample('rush.json');
  await page.waitForSelector('#previewHost .rsh-doc', { timeout: 12000 });
  const rshText = await page.$eval('#previewHost .rsh-doc', (e) => e.textContent);
  if (/Rush/i.test(rshText)) pass('rush.json: badge shown'); else fail('rush badge: ' + rshText.slice(0, 200));
  if (/5\.109|rushVersion|@acme/i.test(rshText)) pass('rush.json: version and projects shown'); else fail('rush content: ' + rshText.slice(0, 200));

  // ── .markdownlint.json viewer ──
  await openExample('.markdownlint.json');
  await page.waitForSelector('#previewHost .mdlint-doc', { timeout: 12000 });
  const mdlText = await page.$eval('#previewHost .mdlint-doc', (e) => e.textContent);
  if (/markdownlint/i.test(mdlText)) pass('.markdownlint.json: badge shown'); else fail('markdownlint badge: ' + mdlText.slice(0, 200));
  if (/MD013|MD033|disabled|enabled/i.test(mdlText)) pass('.markdownlint.json: rules shown'); else fail('markdownlint rules: ' + mdlText.slice(0, 200));
  if (/120/.test(mdlText)) pass('.markdownlint.json: line length shown'); else fail('markdownlint line length: ' + mdlText.slice(0, 200));

  // ── .clang-format viewer ──
  await openExample('.clang-format');
  await page.waitForSelector('#previewHost .clangformat-doc', { timeout: 12000 });
  pass('.clang-format: renders');
  const clangFmtText = await page.$eval('#previewHost .clangformat-doc', (e) => e.textContent);
  if (/clang-format/i.test(clangFmtText)) pass('.clang-format: badge shown'); else fail('.clang-format: missing badge');
  if (/Google|style|Indent/i.test(clangFmtText)) pass('.clang-format: style shown'); else fail('.clang-format: no style info');

  // ── .clang-tidy viewer ──
  await openExample('.clang-tidy');
  await page.waitForSelector('#previewHost .clangtidy-doc', { timeout: 12000 });
  pass('.clang-tidy: renders');
  const clangtidyText = await page.$eval('#previewHost .clangtidy-doc', (e) => e.textContent);
  if (/clang-tidy/i.test(clangtidyText)) pass('.clang-tidy: badge shown'); else fail('.clang-tidy: missing badge');
  if (/modernize|check/i.test(clangtidyText)) pass('.clang-tidy: checks shown'); else fail('.clang-tidy: no checks shown');
}
