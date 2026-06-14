export async function run(ctx) {
  const { page, origin, frameOf, pass, fail } = ctx;

  // ── Known-file enhancement (Layer 3): package.json -> npm links + revert chip ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'package.json', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  pass('package.json gets the enhanced view (rendered in the parent pane)');
  const npmHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (npmHrefs.some((h) => /npmjs\.com\/package\/markdown-it/.test(h)) && npmHrefs.every((h) => /^https:\/\/www\.npmjs\.com\/package\//.test(h))) pass('dependencies link to npm (' + npmHrefs.length + ' deps)'); else fail('npm links: ' + npmHrefs.join(','));
  // External links are href-only (open in a new tab, rel=noopener) — not auto-fetched.
  const linkRel = await page.$eval('#previewHost .pj-deps a.pj-link', (a) => a.rel + '|' + a.target);
  if (/noopener/.test(linkRel) && /_blank/.test(linkRel)) pass('npm links are external-safe (noopener, new tab)'); else fail('link rel/target: ' + linkRel);
  // The enhance chip is shown and reverts to the plain JSON tree.
  const chipShown = await page.$eval('#enhanceChip', (e) => !e.hidden && /package\.json/.test(e.textContent));
  if (chipShown) pass('enhance chip shows the active known-file'); else fail('enhance chip not shown');
  await page.click('#enhanceChip .ec-toggle');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 8000 });
  const pjFrame = await frameOf('#previewHost iframe.fv-preview-frame');
  await pjFrame.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  pass('revert chip switches to the plain JSON tree view');

  // ── More known-files (Layer 3): Cargo.toml, tsconfig.json, Dockerfile, docker-compose, .gitignore ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cargo.toml', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const crateHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (crateHrefs.some((h) => /crates\.io\/crates\/serde/.test(h))) pass('Cargo.toml: dependencies link to crates.io'); else fail('crate links: ' + crateHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'tsconfig.json', exact: true }).click();
  await page.waitForSelector('#previewHost .ts-table', { timeout: 12000 });
  const tsDocs = await page.$$eval('#previewHost .ts-table .ts-doc', (els) => els.map((e) => e.textContent).join(' '));
  if (/strict type-checking/i.test(tsDocs)) pass('tsconfig.json: compiler options annotated'); else fail('tsconfig docs: ' + tsDocs.slice(0, 80));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Dockerfile', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfBadges = await page.$$eval('#previewHost .kf-badge', (els) => els.map((e) => e.textContent));
  if (dfBadges.filter((b) => b === 'FROM').length === 2 && dfBadges.includes('HEALTHCHECK')) pass('Dockerfile: instructions broken down (2 FROM stages)'); else fail('dockerfile badges: ' + dfBadges.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'docker-compose.yml', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const svcNames = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  if (svcNames.includes('web') && svcNames.includes('api')) pass('docker-compose: a card per service (' + svcNames.join(', ') + ')'); else fail('compose services: ' + svcNames.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '.gitignore', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-pat', { timeout: 12000 });
  const giPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const giTags = await page.$$eval('#previewHost .kf-pat .kf-tag', (els) => els.map((e) => e.textContent));
  if (giPats.includes('node_modules/') && giTags.includes('un-ignore')) pass('.gitignore: patterns annotated (directory, un-ignore, …)'); else fail('gitignore pats=' + giPats.join(',') + ' tags=' + giTags.join(','));

  // ── More known-files (Layer 3): dependency manifests → ecosystem links ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'requirements.txt', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const reqHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (reqHrefs.some((h) => /pypi\.org\/project\/Flask/.test(h)) && reqHrefs.some((h) => /pypi\.org\/project\/celery/i.test(h))) pass('requirements.txt: packages link to PyPI'); else fail('pypi links: ' + reqHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'go.mod', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const goHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const goIndirect = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (goHrefs.some((h) => /pkg\.go\.dev\/github\.com\/gin-gonic\/gin/.test(h)) && goIndirect.includes('indirect')) pass('go.mod: modules link to pkg.go.dev (+ indirect tagged)'); else fail('go links: ' + goHrefs.join(',') + ' tags=' + goIndirect.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'composer.json', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const composerHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composerHrefs.some((h) => /packagist\.org\/packages\/guzzlehttp\/guzzle/.test(h))) pass('composer.json: dependencies link to Packagist'); else fail('packagist links: ' + composerHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Gemfile', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const gemHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const gemGroups = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (gemHrefs.some((h) => /rubygems\.org\/gems\/rails/.test(h)) && gemGroups.some((g) => /development/.test(g))) pass('Gemfile: gems link to RubyGems (+ groups tagged)'); else fail('gem links: ' + gemHrefs.join(',') + ' groups=' + gemGroups.join(','));

  // ── More known-files (Layer 3): CODEOWNERS, .editorconfig, pom.xml ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'CODEOWNERS', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const coPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const coOwners = await page.$$eval('#previewHost .kf-pat a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (coPats.includes('/docs/') && coOwners.some((h) => /github\.com\/orgs\/acme\/teams\/web-team/.test(h)) && coOwners.some((h) => /github\.com\/ada$/.test(h))) pass('CODEOWNERS: rules + owners link to GitHub (user + team)'); else fail('codeowners pats=' + coPats.join(',') + ' owners=' + coOwners.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '.editorconfig', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const ecGlobs = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  const ecRoot = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (ecGlobs.some((g) => /\*\.py/.test(g)) && ecRoot.includes('root')) pass('.editorconfig: sections per glob (+ root flag)'); else fail('editorconfig globs=' + ecGlobs.join(',') + ' tags=' + ecRoot.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'pom.xml', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pomHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pomScopes = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (pomHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && pomScopes.includes('test')) pass('pom.xml: dependencies link to mvnrepository (+ scope tagged)'); else fail('pom links=' + pomHrefs.join(',') + ' scopes=' + pomScopes.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'build.gradle', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const gradleHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const gradleConfigs = await page.$$eval('#previewHost .pj-sec h3', (els) => els.map((e) => e.textContent));
  if (gradleHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && gradleConfigs.some((c) => /implementation/.test(c))) pass('build.gradle: deps link to mvnrepository (grouped by config)'); else fail('gradle links=' + gradleHrefs.join(',') + ' configs=' + gradleConfigs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Pipfile', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pipHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pipTags = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (pipHrefs.some((h) => /pypi\.org\/project\/flask/i.test(h)) && pipTags.some((t) => /Python 3\.12/.test(t))) pass('Pipfile: packages link to PyPI (+ Python version)'); else fail('pip links=' + pipHrefs.join(',') + ' tags=' + pipTags.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'openapi.yaml', exact: true }).click();
  await page.waitForSelector('#previewHost .oa-list', { timeout: 12000 });
  const oaTitle = await page.$eval('#previewHost .pj-title', (e) => e.textContent);
  const oaMethods = await page.$$eval('#previewHost .oa-method', (els) => els.map((e) => e.textContent));
  const oaPaths = await page.$$eval('#previewHost .oa-path', (els) => els.map((e) => e.textContent));
  if (/Widget API/.test(oaTitle) && oaMethods.includes('DELETE') && oaPaths.includes('/widgets/{id}')) pass('OpenAPI: endpoints listed by method + path (' + oaMethods.length + ' ops)'); else fail('openapi: title=' + oaTitle + ' methods=' + oaMethods.join(',') + ' paths=' + oaPaths.join(','));
}
