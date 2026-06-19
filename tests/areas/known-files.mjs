export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── Known-file enhancement (Layer 3): package.json -> npm links + revert chip ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('package.json');
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
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const pkgMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Package\s*demo-package/.test(pkgMeta) && /Dependencies\s*4/.test(pkgMeta)) pass('package.json metadata includes package and dependency counts'); else fail('package meta: ' + pkgMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  await page.click('#enhanceChip .ec-toggle');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 8000 });
  const pjFrame = await frameOf('#previewHost iframe.fv-preview-frame');
  await pjFrame.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  pass('revert chip switches to the plain JSON tree view');

  // ── More known-files (Layer 3): Cargo.toml, tsconfig.json, Dockerfile, docker-compose, .gitignore ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Cargo.toml');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const crateHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (crateHrefs.some((h) => /crates\.io\/crates\/serde/.test(h))) pass('Cargo.toml: dependencies link to crates.io'); else fail('crate links: ' + crateHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tsconfig.json');
  await page.waitForSelector('#previewHost .ts-table', { timeout: 12000 });
  const tsDocs = await page.$$eval('#previewHost .ts-table .ts-doc', (els) => els.map((e) => e.textContent).join(' '));
  if (/strict type-checking/i.test(tsDocs)) pass('tsconfig.json: compiler options annotated'); else fail('tsconfig docs: ' + tsDocs.slice(0, 80));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Dockerfile');
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfBadges = await page.$$eval('#previewHost .kf-badge', (els) => els.map((e) => e.textContent));
  if (dfBadges.filter((b) => b === 'FROM').length === 2 && dfBadges.includes('HEALTHCHECK')) pass('Dockerfile: instructions broken down (2 FROM stages)'); else fail('dockerfile badges: ' + dfBadges.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const dfMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Instructions\s*\d+/.test(dfMeta) && /Build stages\s*2/.test(dfMeta)) pass('Dockerfile metadata comes from known-file extractor'); else fail('dockerfile meta: ' + dfMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docker-compose.yml');
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const svcNames = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  if (svcNames.includes('web') && svcNames.includes('api')) pass('docker-compose: a card per service (' + svcNames.join(', ') + ')'); else fail('compose services: ' + svcNames.join(','));
  const composeHrefs = await page.$$eval('#previewHost .kf-svc a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composeHrefs.some((h) => /hub\.docker\.com\/_\/node/.test(h))) pass('docker-compose: Docker Hub image links are href-only'); else fail('compose links: ' + composeHrefs.join(','));
  const composeRel = await page.$eval('#previewHost .kf-svc a.pj-link', (a) => a.rel + '|' + a.target);
  if (/noopener/.test(composeRel) && /_blank/.test(composeRel)) pass('docker-compose: image links are external-safe'); else fail('compose link rel/target: ' + composeRel);
  const composeText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/current directory build context/.test(composeText) && /relative bind/.test(composeText) && /host-local paths/.test(composeText)) pass('docker-compose: build and local bind hints are visible');
  else fail('compose text: ' + composeText.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const composeMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Services\s*4/.test(composeMeta) && /Build services\s*1/.test(composeMeta) && /Bind mounts\s*1/.test(composeMeta)) pass('docker-compose metadata includes stack and volume facts');
  else fail('compose meta: ' + composeMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitignore');
  await page.waitForSelector('#previewHost .kf-pat', { timeout: 12000 });
  const giPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const giTags = await page.$$eval('#previewHost .kf-pat .kf-tag', (els) => els.map((e) => e.textContent));
  if (giPats.includes('node_modules/') && giTags.includes('un-ignore')) pass('.gitignore: patterns annotated (directory, un-ignore, …)'); else fail('gitignore pats=' + giPats.join(',') + ' tags=' + giTags.join(','));

  // ── More known-files (Layer 3): dependency manifests → ecosystem links ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('requirements.txt');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const reqHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (reqHrefs.some((h) => /pypi\.org\/project\/Flask/.test(h)) && reqHrefs.some((h) => /pypi\.org\/project\/celery/i.test(h))) pass('requirements.txt: packages link to PyPI'); else fail('pypi links: ' + reqHrefs.join(','));
  const reqTags = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (reqTags.includes('redis') && reqTags.includes('include') && reqTags.includes('index')) pass('requirements.txt: extras and option kinds are tagged'); else fail('requirements tags: ' + reqTags.join(','));
  if (!reqHrefs.some((h) => /pypi\.org\/project\/https/i.test(h))) pass('requirements.txt: option URLs are not linked as packages'); else fail('requirements option URL linked: ' + reqHrefs.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const reqMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Pinned\s*4/.test(reqMeta) && /Constrained\s*2/.test(reqMeta) && /Unpinned\s*2/.test(reqMeta) && /Index URLs\s*1/.test(reqMeta)) pass('requirements.txt metadata includes pinning and index facts');
  else fail('requirements meta: ' + reqMeta.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaDrawer [data-close]');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('go.mod');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const goHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const goIndirect = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (goHrefs.some((h) => /pkg\.go\.dev\/github\.com\/gin-gonic\/gin/.test(h)) && goIndirect.includes('indirect')) pass('go.mod: modules link to pkg.go.dev (+ indirect tagged)'); else fail('go links: ' + goHrefs.join(',') + ' tags=' + goIndirect.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('composer.json');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const composerHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composerHrefs.some((h) => /packagist\.org\/packages\/guzzlehttp\/guzzle/.test(h))) pass('composer.json: dependencies link to Packagist'); else fail('packagist links: ' + composerHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Gemfile');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const gemHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const gemGroups = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (gemHrefs.some((h) => /rubygems\.org\/gems\/rails/.test(h)) && gemGroups.some((g) => /development/.test(g))) pass('Gemfile: gems link to RubyGems (+ groups tagged)'); else fail('gem links: ' + gemHrefs.join(',') + ' groups=' + gemGroups.join(','));

  // ── More known-files (Layer 3): CODEOWNERS, .editorconfig, pom.xml ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CODEOWNERS');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const coPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const coOwners = await page.$$eval('#previewHost .kf-pat a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (coPats.includes('/docs/') && coOwners.some((h) => /github\.com\/orgs\/acme\/teams\/web-team/.test(h)) && coOwners.some((h) => /github\.com\/ada$/.test(h))) pass('CODEOWNERS: rules + owners link to GitHub (user + team)'); else fail('codeowners pats=' + coPats.join(',') + ' owners=' + coOwners.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.editorconfig');
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const ecGlobs = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  const ecRoot = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (ecGlobs.some((g) => /\*\.py/.test(g)) && ecRoot.includes('root')) pass('.editorconfig: sections per glob (+ root flag)'); else fail('editorconfig globs=' + ecGlobs.join(',') + ' tags=' + ecRoot.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pom.xml');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pomHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pomScopes = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (pomHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && pomScopes.includes('test')) pass('pom.xml: dependencies link to mvnrepository (+ scope tagged)'); else fail('pom links=' + pomHrefs.join(',') + ' scopes=' + pomScopes.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.gradle');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const gradleHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const gradleConfigs = await page.$$eval('#previewHost .pj-sec h3', (els) => els.map((e) => e.textContent));
  if (gradleHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && gradleConfigs.some((c) => /implementation/.test(c))) pass('build.gradle: deps link to mvnrepository (grouped by config)'); else fail('gradle links=' + gradleHrefs.join(',') + ' configs=' + gradleConfigs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Pipfile');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pipHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pipTags = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (pipHrefs.some((h) => /pypi\.org\/project\/flask/i.test(h)) && pipTags.some((t) => /Python 3\.12/.test(t))) pass('Pipfile: packages link to PyPI (+ Python version)'); else fail('pip links=' + pipHrefs.join(',') + ' tags=' + pipTags.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('openapi.yaml');
  await page.waitForSelector('#previewHost .oa-list', { timeout: 12000 });
  const oaTitle = await page.$eval('#previewHost .pj-title', (e) => e.textContent);
  const oaMethods = await page.$$eval('#previewHost .oa-method', (els) => els.map((e) => e.textContent));
  const oaPaths = await page.$$eval('#previewHost .oa-path', (els) => els.map((e) => e.textContent));
  if (/Widget API/.test(oaTitle) && oaMethods.includes('DELETE') && oaPaths.includes('/widgets/{id}')) pass('OpenAPI: endpoints listed by method + path (' + oaMethods.length + ' ops)'); else fail('openapi: title=' + oaTitle + ' methods=' + oaMethods.join(',') + ' paths=' + oaPaths.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const oaMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/API title\s*Widget API/.test(oaMeta) && /Endpoints\s*6/.test(oaMeta)) pass('OpenAPI metadata includes title and endpoint count'); else fail('openapi meta: ' + oaMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── GitHub Actions workflow viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('GitHub Actions CI workflow (demo)');
  await page.waitForSelector('#previewHost .gha-doc, #previewHost [class*="gha"]', { timeout: 12000 });
  const ghaText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/GitHub Actions/i.test(ghaText)) pass('GitHub Actions: badge shown'); else fail('gha badge: ' + ghaText.slice(0, 200));
  if (/push|pull.request|workflow.dispatch/i.test(ghaText)) pass('GitHub Actions: triggers shown'); else fail('gha triggers: ' + ghaText.slice(0, 200));
  if (/test|lint|build/i.test(ghaText)) pass('GitHub Actions: jobs shown'); else fail('gha jobs: ' + ghaText.slice(0, 200));

  // ── Kubernetes manifest viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Kubernetes Deployment manifest (demo)');
  await page.waitForSelector('#previewHost .k8s-doc, #previewHost [class*="k8s"]', { timeout: 12000 });
  const k8sText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Kubernetes/i.test(k8sText)) pass('Kubernetes: badge shown'); else fail('k8s badge: ' + k8sText.slice(0, 200));
  if (/Deployment/i.test(k8sText)) pass('Kubernetes: kind shown'); else fail('k8s kind: ' + k8sText.slice(0, 200));
  if (/web-app|production/i.test(k8sText)) pass('Kubernetes: name/namespace shown'); else fail('k8s meta: ' + k8sText.slice(0, 200));

  // ── Flutter pubspec viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Flutter pubspec.yaml (demo)');
  await page.waitForSelector('#previewHost .pubspec-doc, #previewHost [class*="pubspec"]', { timeout: 12000 });
  const psText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Flutter|Dart/i.test(psText)) pass('pubspec: badge shown'); else fail('pubspec badge: ' + psText.slice(0, 200));
  if (/my.flutter.app|1\.2\.0/i.test(psText)) pass('pubspec: name/version shown'); else fail('pubspec name: ' + psText.slice(0, 200));

  // ── Netlify config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Netlify config (netlify.toml demo)');
  await page.waitForSelector('#previewHost .badge-netlify, #previewHost [class*="ntl"]', { timeout: 12000 });
  const ntlText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Netlify/i.test(ntlText)) pass('netlify.toml: badge shown'); else fail('netlify badge: ' + ntlText.slice(0, 200));
  if (/npm run build|dist/i.test(ntlText)) pass('netlify.toml: build command shown'); else fail('netlify build: ' + ntlText.slice(0, 200));

  // ── Vercel config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Vercel config (vercel.json demo)');
  await page.waitForSelector('#previewHost .badge-vercel, #previewHost [class*="vcl"]', { timeout: 12000 });
  const vclText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Vercel/i.test(vclText)) pass('vercel.json: badge shown'); else fail('vercel badge: ' + vclText.slice(0, 200));
  if (/nextjs|Next\.js/i.test(vclText)) pass('vercel.json: framework shown'); else fail('vercel framework: ' + vclText.slice(0, 200));

  // ── pyproject.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pyproject.toml');
  await page.waitForSelector('#previewHost .ppy-doc', { timeout: 12000 });
  const ppyText = await page.$eval('#previewHost .ppy-doc', (e) => e.textContent);
  if (/Python/i.test(ppyText)) pass('pyproject.toml: badge shown'); else fail('pyproject badge: ' + ppyText.slice(0, 200));
  if (/my-library|hatchling|ruff|pytest/i.test(ppyText)) pass('pyproject.toml: content shown'); else fail('pyproject content: ' + ppyText.slice(0, 200));

  // ── .npmrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.npmrc');
  await page.waitForSelector('#previewHost .npmrc-doc', { timeout: 12000 });
  const npmrcText = await page.$eval('#previewHost .npmrc-doc', (e) => e.textContent);
  if (/npm/i.test(npmrcText)) pass('.npmrc: badge shown'); else fail('npmrc badge: ' + npmrcText.slice(0, 200));
  if (!/secrettoken|publictoken/i.test(npmrcText)) pass('.npmrc: auth tokens redacted'); else fail('npmrc tokens not redacted');

  // ── renovate.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('renovate.json');
  await page.waitForSelector('#previewHost .rnv-doc', { timeout: 12000 });
  const rnvText = await page.$eval('#previewHost .rnv-doc', (e) => e.textContent);
  if (/Renovate/i.test(rnvText)) pass('renovate.json: badge shown'); else fail('renovate badge: ' + rnvText.slice(0, 200));
  if (/package rule|automerge|schedule/i.test(rnvText)) pass('renovate.json: rules/settings shown'); else fail('renovate content: ' + rnvText.slice(0, 200));

  // ── .prettierrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.prettierrc.json');
  await page.waitForSelector('#previewHost .prt-doc', { timeout: 12000 });
  const prtText = await page.$eval('#previewHost .prt-doc', (e) => e.textContent);
  if (/Prettier/i.test(prtText)) pass('.prettierrc.json: badge shown'); else fail('prettierrc badge: ' + prtText.slice(0, 200));
  if (/single quote|tab width|trailing comma/i.test(prtText)) pass('.prettierrc.json: options shown'); else fail('prettierrc options: ' + prtText.slice(0, 200));

  // ── turbo.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('turbo.json');
  await page.waitForSelector('#previewHost .turbo-doc', { timeout: 12000 });
  const turboText = await page.$eval('#previewHost .turbo-doc', (e) => e.textContent);
  if (/Turbo/i.test(turboText)) pass('turbo.json: badge shown'); else fail('turbo badge: ' + turboText.slice(0, 200));
  if (/build|test|lint/i.test(turboText)) pass('turbo.json: tasks shown'); else fail('turbo tasks: ' + turboText.slice(0, 200));

  // ── dependabot.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dependabot.yml');
  await page.waitForSelector('#previewHost .dbt-doc', { timeout: 12000 });
  const dbtText = await page.$eval('#previewHost .dbt-doc', (e) => e.textContent);
  if (/Dependabot/i.test(dbtText)) pass('dependabot.yml: badge shown'); else fail('dependabot badge: ' + dbtText.slice(0, 200));

  // ── .eslintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.eslintrc.json');
  await page.waitForSelector('#previewHost .esl-doc', { timeout: 12000 });
  const eslText = await page.$eval('#previewHost .esl-doc', (e) => e.textContent);
  if (/ESLint/i.test(eslText)) pass('.eslintrc.json: badge shown'); else fail('eslint badge: ' + eslText.slice(0, 200));
  if (/no-console|no-unused-vars|prefer-const/i.test(eslText)) pass('.eslintrc.json: rules shown'); else fail('eslint rules: ' + eslText.slice(0, 200));

  // ── jest.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jest.config.json');
  await page.waitForSelector('#previewHost .jest-doc', { timeout: 12000 });
  const jestText = await page.$eval('#previewHost .jest-doc', (e) => e.textContent);
  if (/Jest/i.test(jestText)) pass('jest.config.json: badge shown'); else fail('jest badge: ' + jestText.slice(0, 200));
  if (/jsdom|coverage/i.test(jestText)) pass('jest.config.json: env and coverage shown'); else fail('jest content: ' + jestText.slice(0, 200));

  // ── .stylelintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.stylelintrc.json');
  await page.waitForSelector('#previewHost .stl-doc', { timeout: 12000 });
  const stlText = await page.$eval('#previewHost .stl-doc', (e) => e.textContent);
  if (/Stylelint/i.test(stlText)) pass('.stylelintrc.json: badge shown'); else fail('stylelint badge: ' + stlText.slice(0, 200));
  if (/color-no-invalid-hex|block-no-empty/i.test(stlText)) pass('.stylelintrc.json: rules shown'); else fail('stylelint rules: ' + stlText.slice(0, 200));

  // ── babel.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('babel.config.json');
  await page.waitForSelector('#previewHost .bbl-doc', { timeout: 12000 });
  const bblText = await page.$eval('#previewHost .bbl-doc', (e) => e.textContent);
  if (/Babel/i.test(bblText)) pass('babel.config.json: badge shown'); else fail('babel badge: ' + bblText.slice(0, 200));
  if (/@babel\/preset-env|@babel\/preset-react/i.test(bblText)) pass('babel.config.json: presets shown'); else fail('babel presets: ' + bblText.slice(0, 200));

  // ── .commitlintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.commitlintrc.json');
  await page.waitForSelector('#previewHost .cml-doc', { timeout: 12000 });
  const cmlText = await page.$eval('#previewHost .cml-doc', (e) => e.textContent);
  if (/commitlint/i.test(cmlText)) pass('.commitlintrc.json: badge shown'); else fail('commitlint badge: ' + cmlText.slice(0, 200));
  if (/type-enum|header-max-length/i.test(cmlText)) pass('.commitlintrc.json: rules shown'); else fail('commitlint rules: ' + cmlText.slice(0, 200));

  // ── lefthook.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lefthook.yml');
  await page.waitForSelector('#previewHost .lfh-doc', { timeout: 12000 });
  const lfhText = await page.$eval('#previewHost .lfh-doc', (e) => e.textContent);
  if (/Lefthook/i.test(lfhText)) pass('lefthook.yml: badge shown'); else fail('lefthook badge: ' + lfhText.slice(0, 200));
  if (/pre-commit|commit-msg|pre-push/i.test(lfhText)) pass('lefthook.yml: hook stages shown'); else fail('lefthook hooks: ' + lfhText.slice(0, 200));

  // ── wrangler.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wrangler.toml');
  await page.waitForSelector('#previewHost .wgl-doc', { timeout: 12000 });
  const wglText = await page.$eval('#previewHost .wgl-doc', (e) => e.textContent);
  if (/Wrangler|Cloudflare/i.test(wglText)) pass('wrangler.toml: badge shown'); else fail('wrangler badge: ' + wglText.slice(0, 200));
  if (/my-worker|MY_KV|example\.com/i.test(wglText)) pass('wrangler.toml: content shown'); else fail('wrangler content: ' + wglText.slice(0, 200));

  // ── fly.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('fly.toml');
  await page.waitForSelector('#previewHost .fly-doc', { timeout: 12000 });
  const flyText = await page.$eval('#previewHost .fly-doc', (e) => e.textContent);
  if (/Fly\.io/i.test(flyText)) pass('fly.toml: badge shown'); else fail('fly badge: ' + flyText.slice(0, 200));
  if (/my-app|iad|8080/i.test(flyText)) pass('fly.toml: content shown'); else fail('fly content: ' + flyText.slice(0, 200));

  // ── cliff.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cliff.toml');
  await page.waitForSelector('#previewHost .clf-doc', { timeout: 12000 });
  const clfText = await page.$eval('#previewHost .clf-doc', (e) => e.textContent);
  if (/git-cliff/i.test(clfText)) pass('cliff.toml: badge shown'); else fail('cliff badge: ' + clfText.slice(0, 200));
  if (/Features|Bug Fixes|commit/i.test(clfText)) pass('cliff.toml: parsers shown'); else fail('cliff content: ' + clfText.slice(0, 200));

  // ── .releaserc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.releaserc.json');
  await page.waitForSelector('#previewHost .rls-doc', { timeout: 12000 });
  const rlsText = await page.$eval('#previewHost .rls-doc', (e) => e.textContent);
  if (/semantic-release/i.test(rlsText)) pass('.releaserc.json: badge shown'); else fail('releaserc badge: ' + rlsText.slice(0, 200));
  if (/commit-analyzer|npm|github/i.test(rlsText)) pass('.releaserc.json: plugins shown'); else fail('releaserc plugins: ' + rlsText.slice(0, 200));

  // ── lerna.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lerna.json');
  await page.waitForSelector('#previewHost .lrn-doc', { timeout: 12000 });
  const lrnText = await page.$eval('#previewHost .lrn-doc', (e) => e.textContent);
  if (/Lerna/i.test(lrnText)) pass('lerna.json: badge shown'); else fail('lerna badge: ' + lrnText.slice(0, 200));

  // ── nx.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nx.json');
  await page.waitForSelector('#previewHost .nx-doc', { timeout: 12000 });
  const nxText = await page.$eval('#previewHost .nx-doc', (e) => e.textContent);
  if (/Nx/i.test(nxText)) pass('nx.json: badge shown'); else fail('nx badge: ' + nxText.slice(0, 200));

  // ── biome.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('biome.json');
  await page.waitForSelector('#previewHost .bmo-doc', { timeout: 12000 });
  const bmoText = await page.$eval('#previewHost .bmo-doc', (e) => e.textContent);
  if (/Biome/i.test(bmoText)) pass('biome.json: badge shown'); else fail('biome badge: ' + bmoText.slice(0, 200));

  // ── codecov.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('codecov.yml');
  await page.waitForSelector('#previewHost .ccv-doc', { timeout: 12000 });
  const ccvText = await page.$eval('#previewHost .ccv-doc', (e) => e.textContent);
  if (/Codecov/i.test(ccvText)) pass('codecov.yml: badge shown'); else fail('codecov badge: ' + ccvText.slice(0, 200));
  if (/80|70|unit|integration/i.test(ccvText)) pass('codecov.yml: targets or flags shown'); else fail('codecov content: ' + ccvText.slice(0, 200));

  // ── serverless.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('serverless.yml');
  await page.waitForSelector('#previewHost .sls-doc', { timeout: 12000 });
  const slsText = await page.$eval('#previewHost .sls-doc', (e) => e.textContent);
  if (/Serverless/i.test(slsText)) pass('serverless.yml: badge shown'); else fail('serverless badge: ' + slsText.slice(0, 200));
  if (/api|worker|scheduler/i.test(slsText)) pass('serverless.yml: functions shown'); else fail('serverless functions: ' + slsText.slice(0, 200));

  // ── azure-pipelines.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('azure-pipelines.yml');
  await page.waitForSelector('#previewHost .azp-doc', { timeout: 12000 });
  const azpText = await page.$eval('#previewHost .azp-doc', (e) => e.textContent);
  if (/Azure Pipelines/i.test(azpText)) pass('azure-pipelines.yml: badge shown'); else fail('azure badge: ' + azpText.slice(0, 200));
  if (/Build|Test|ubuntu/i.test(azpText)) pass('azure-pipelines.yml: stages and pool shown'); else fail('azure content: ' + azpText.slice(0, 200));

  // ── vscode-settings.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-settings.json');
  await page.waitForSelector('#previewHost .vsc-settings-doc', { timeout: 12000 });
  const vscText = await page.$eval('#previewHost .vsc-settings-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscText)) pass('vscode-settings.json: badge shown'); else fail('vscode badge: ' + vscText.slice(0, 200));
  if (/formatOnSave|tabSize|fontSize/i.test(vscText)) pass('vscode-settings.json: settings shown'); else fail('vscode settings: ' + vscText.slice(0, 200));

  // ── vscode-extensions.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-extensions.json');
  await page.waitForSelector('#previewHost .vsc-ext-doc', { timeout: 12000 });
  const vscExtText = await page.$eval('#previewHost .vsc-ext-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscExtText)) pass('vscode-extensions.json: badge shown'); else fail('vscode-ext badge: ' + vscExtText.slice(0, 200));
  if (/prettier|eslint|gitlens/i.test(vscExtText)) pass('vscode-extensions.json: extensions shown'); else fail('vscode-ext content: ' + vscExtText.slice(0, 200));

  // ── vscode-launch.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-launch.json');
  await page.waitForSelector('#previewHost .vsc-launch-doc', { timeout: 12000 });
  const vscLaunchText = await page.$eval('#previewHost .vsc-launch-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscLaunchText)) pass('vscode-launch.json: badge shown'); else fail('vscode-launch badge: ' + vscLaunchText.slice(0, 200));
  if (/Debug Node|Chrome|node/i.test(vscLaunchText)) pass('vscode-launch.json: configs shown'); else fail('vscode-launch content: ' + vscLaunchText.slice(0, 200));

  // ── vscode-tasks.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-tasks.json');
  await page.waitForSelector('#previewHost .vsc-tasks-doc', { timeout: 12000 });
  const vscTasksText = await page.$eval('#previewHost .vsc-tasks-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscTasksText)) pass('vscode-tasks.json: badge shown'); else fail('vscode-tasks badge: ' + vscTasksText.slice(0, 200));
  if (/build|test|lint/i.test(vscTasksText)) pass('vscode-tasks.json: tasks shown'); else fail('vscode-tasks content: ' + vscTasksText.slice(0, 200));

  // ── travis.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('travis.yml');
  await page.waitForSelector('#previewHost .trv-doc', { timeout: 12000 });
  const trvText = await page.$eval('#previewHost .trv-doc', (e) => e.textContent);
  if (/Travis CI/i.test(trvText)) pass('travis.yml: badge shown'); else fail('travis badge: ' + trvText.slice(0, 200));
  if (/node_js|node|python|ruby/i.test(trvText)) pass('travis.yml: language shown'); else fail('travis language: ' + trvText.slice(0, 200));

  // ── circleci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('circleci.yml');
  await page.waitForSelector('#previewHost .cci-doc', { timeout: 12000 });
  const cciText = await page.$eval('#previewHost .cci-doc', (e) => e.textContent);
  if (/CircleCI/i.test(cciText)) pass('circleci.yml: badge shown'); else fail('circleci badge: ' + cciText.slice(0, 200));
  if (/build|test|deploy|job/i.test(cciText)) pass('circleci.yml: jobs shown'); else fail('circleci jobs: ' + cciText.slice(0, 200));

  // ── amplify.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('amplify.yml');
  await page.waitForSelector('#previewHost .amp-doc', { timeout: 12000 });
  const ampText = await page.$eval('#previewHost .amp-doc', (e) => e.textContent);
  if (/AWS Amplify/i.test(ampText)) pass('amplify.yml: badge shown'); else fail('amplify badge: ' + ampText.slice(0, 200));
  if (/preBuild|build|npm/i.test(ampText)) pass('amplify.yml: build phases shown'); else fail('amplify phases: ' + ampText.slice(0, 200));

  // ── buildspec.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('buildspec.yml');
  await page.waitForSelector('#previewHost .cod-doc', { timeout: 12000 });
  const codText = await page.$eval('#previewHost .cod-doc', (e) => e.textContent);
  if (/CodeBuild/i.test(codText)) pass('buildspec.yml: badge shown'); else fail('codebuild badge: ' + codText.slice(0, 200));
  if (/install|build|npm/i.test(codText)) pass('buildspec.yml: phases shown'); else fail('codebuild phases: ' + codText.slice(0, 200));

  // ── jsconfig.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jsconfig.json');
  await page.waitForSelector('#previewHost .jsc-doc', { timeout: 12000 });
  const jscText = await page.$eval('#previewHost .jsc-doc', (e) => e.textContent);
  if (/jsconfig/i.test(jscText)) pass('jsconfig.json: title shown'); else fail('jsconfig title: ' + jscText.slice(0, 200));
  if (/ES2020|target|checkJs/i.test(jscText)) pass('jsconfig.json: options shown'); else fail('jsconfig options: ' + jscText.slice(0, 200));

  // ── deno.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('deno.json');
  await page.waitForSelector('#previewHost .den-doc', { timeout: 12000 });
  const denText = await page.$eval('#previewHost .den-doc', (e) => e.textContent);
  if (/Deno/i.test(denText)) pass('deno.json: badge shown'); else fail('deno badge: ' + denText.slice(0, 200));
  if (/imports|tasks|hono|std/i.test(denText)) pass('deno.json: imports or tasks shown'); else fail('deno content: ' + denText.slice(0, 200));

  // ── .nvmrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nvmrc');
  await page.waitForSelector('#previewHost .nvm-doc', { timeout: 12000 });
  const nvmText = await page.$eval('#previewHost .nvm-doc', (e) => e.textContent);
  if (/Node\.js|nvmrc/i.test(nvmText)) pass('nvmrc: badge shown'); else fail('nvmrc badge: ' + nvmText.slice(0, 200));
  if (/v20|20\.11|lts/i.test(nvmText)) pass('nvmrc: version shown'); else fail('nvmrc version: ' + nvmText.slice(0, 200));

  // ── .browserslistrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('browserslistrc');
  await page.waitForSelector('#previewHost .brl-doc', { timeout: 12000 });
  const brlText = await page.$eval('#previewHost .brl-doc', (e) => e.textContent);
  if (/Browserslist/i.test(brlText)) pass('browserslistrc: badge shown'); else fail('browserslist badge: ' + brlText.slice(0, 200));
  if (/last|Firefox|chrome/i.test(brlText)) pass('browserslistrc: queries shown'); else fail('browserslist queries: ' + brlText.slice(0, 200));

  // ── pre-commit-config.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pre-commit-config.yaml');
  await page.waitForSelector('#previewHost .prc-doc', { timeout: 12000 });
  const prcText = await page.$eval('#previewHost .prc-doc', (e) => e.textContent);
  if (/pre-commit/i.test(prcText)) pass('pre-commit-config.yaml: badge shown'); else fail('pre-commit badge: ' + prcText.slice(0, 200));
  if (/trailing|yaml|json|repo/i.test(prcText)) pass('pre-commit-config.yaml: hooks shown'); else fail('pre-commit hooks: ' + prcText.slice(0, 200));

  // ── pyrightconfig.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pyrightconfig.json');
  await page.waitForSelector('#previewHost .pyr-doc', { timeout: 12000 });
  const pyrText = await page.$eval('#previewHost .pyr-doc', (e) => e.textContent);
  if (/Pyright/i.test(pyrText)) pass('pyrightconfig.json: badge shown'); else fail('pyright badge: ' + pyrText.slice(0, 200));
  if (/standard|3\.11|typeCheck/i.test(pyrText)) pass('pyrightconfig.json: config shown'); else fail('pyright config: ' + pyrText.slice(0, 200));

  // ── tox.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tox.ini');
  await page.waitForSelector('#previewHost .tox-doc', { timeout: 12000 });
  const toxText = await page.$eval('#previewHost .tox-doc', (e) => e.textContent);
  if (/tox/i.test(toxText)) pass('tox.ini: badge shown'); else fail('tox badge: ' + toxText.slice(0, 200));
  if (/py39|py3|lint|type/i.test(toxText)) pass('tox.ini: environments shown'); else fail('tox envs: ' + toxText.slice(0, 200));

  // ── mypy.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mypy.ini');
  await page.waitForSelector('#previewHost .myp-doc', { timeout: 12000 });
  const mypText = await page.$eval('#previewHost .myp-doc', (e) => e.textContent);
  if (/mypy/i.test(mypText)) pass('mypy.ini: badge shown'); else fail('mypy badge: ' + mypText.slice(0, 200));
  if (/3\.11|disallow|strict|override/i.test(mypText)) pass('mypy.ini: config shown'); else fail('mypy config: ' + mypText.slice(0, 200));

  // ── angular.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Angular workspace');
  await page.waitForSelector('#previewHost .ngw-doc', { timeout: 12000 });
  const ngwText = await page.$eval('#previewHost .ngw-doc', (e) => e.textContent);
  if (/Angular/i.test(ngwText)) pass('angular.json: badge shown'); else fail('angular badge: ' + ngwText.slice(0, 200));
  if (/my-app|project|build|serve/i.test(ngwText)) pass('angular.json: projects shown'); else fail('angular projects: ' + ngwText.slice(0, 200));

  // ── capacitor.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('capacitor.config.json');
  await page.waitForSelector('#previewHost .cap-doc', { timeout: 12000 });
  const capText = await page.$eval('#previewHost .cap-doc', (e) => e.textContent);
  if (/Capacitor/i.test(capText)) pass('capacitor.config.json: badge shown'); else fail('capacitor badge: ' + capText.slice(0, 200));
  if (/com\.example|SplashScreen|StatusBar/i.test(capText)) pass('capacitor.config.json: config shown'); else fail('capacitor config: ' + capText.slice(0, 200));

  // ── .nycrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.nycrc.json');
  await page.waitForSelector('#previewHost .nyc-doc', { timeout: 12000 });
  const nycText = await page.$eval('#previewHost .nyc-doc', (e) => e.textContent);
  if (/NYC/i.test(nycText)) pass('.nycrc.json: badge shown'); else fail('nyc badge: ' + nycText.slice(0, 200));
  if (/80|90|branches|lines/i.test(nycText)) pass('.nycrc.json: thresholds shown'); else fail('nyc thresholds: ' + nycText.slice(0, 200));

  // ── devcontainer.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('devcontainer.json');
  await page.waitForSelector('#previewHost .dvc-doc', { timeout: 12000 });
  const dvcText = await page.$eval('#previewHost .dvc-doc', (e) => e.textContent);
  if (/Dev Container/i.test(dvcText)) pass('devcontainer.json: badge shown'); else fail('devcontainer badge: ' + dvcText.slice(0, 200));
  if (/Node\.js|typescript|3000|5432/i.test(dvcText)) pass('devcontainer.json: config shown'); else fail('devcontainer config: ' + dvcText.slice(0, 200));

  // ── knip.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('knip.json');
  await page.waitForSelector('#previewHost .knp-doc', { timeout: 12000 });
  const knpText = await page.$eval('#previewHost .knp-doc', (e) => e.textContent);
  if (/Knip/i.test(knpText)) pass('knip.json: badge shown'); else fail('knip badge: ' + knpText.slice(0, 200));
  if (/typescript|eslint|jest|src/i.test(knpText)) pass('knip.json: content shown'); else fail('knip content: ' + knpText.slice(0, 200));

  // ── .mocharc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.mocharc.json');
  await page.waitForSelector('#previewHost .moc-doc', { timeout: 12000 });
  const mocText = await page.$eval('#previewHost .moc-doc', (e) => e.textContent);
  if (/Mocha/i.test(mocText)) pass('.mocharc.json: badge shown'); else fail('mocha badge: ' + mocText.slice(0, 200));
  if (/spec|timeout|reporter|bdd/i.test(mocText)) pass('.mocharc.json: config shown'); else fail('mocha config: ' + mocText.slice(0, 200));

  // ── .gitlab-ci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitlab-ci.yml');
  await page.waitForSelector('#previewHost .glb-doc', { timeout: 12000 });
  const glbText = await page.$eval('#previewHost .glb-doc', (e) => e.textContent);
  if (/GitLab/i.test(glbText)) pass('.gitlab-ci.yml: badge shown'); else fail('gitlab-ci badge: ' + glbText.slice(0, 200));
  if (/install|lint|test|build|deploy/i.test(glbText)) pass('.gitlab-ci.yml: stages/jobs shown'); else fail('gitlab-ci jobs: ' + glbText.slice(0, 200));

  // ── pnpm-workspace.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pnpm-workspace.yaml');
  await page.waitForSelector('#previewHost .pnw-doc', { timeout: 12000 });
  const pnwText = await page.$eval('#previewHost .pnw-doc', (e) => e.textContent);
  if (/pnpm/i.test(pnwText)) pass('pnpm-workspace.yaml: badge shown'); else fail('pnpm-workspace badge: ' + pnwText.slice(0, 200));
  if (/packages|apps|catalog|react/i.test(pnwText)) pass('pnpm-workspace.yaml: workspaces shown'); else fail('pnpm-workspace content: ' + pnwText.slice(0, 200));

  // ── vitest.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vitest.config.json');
  await page.waitForSelector('#previewHost .vt-doc', { timeout: 12000 });
  const vtText = await page.$eval('#previewHost .vt-doc', (e) => e.textContent);
  if (/Vitest/i.test(vtText)) pass('vitest.config.json: badge shown'); else fail('vitest badge: ' + vtText.slice(0, 200));
  if (/jsdom|environment|coverage|reporters/i.test(vtText)) pass('vitest.config.json: config shown'); else fail('vitest config: ' + vtText.slice(0, 200));

  // ── graphql.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('graphql.config.json');
  await page.waitForSelector('#previewHost .gql-doc', { timeout: 12000 });
  const gqlText = await page.$eval('#previewHost .gql-doc', (e) => e.textContent);
  if (/GraphQL/i.test(gqlText)) pass('graphql.config.json: badge shown'); else fail('graphql badge: ' + gqlText.slice(0, 200));
  if (/schema|documents|extensions|codegen/i.test(gqlText)) pass('graphql.config.json: config shown'); else fail('graphql config: ' + gqlText.slice(0, 200));

  // ── apollo.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('apollo.config.json');
  await page.waitForSelector('#previewHost .apl-doc', { timeout: 12000 });
  const aplText = await page.$eval('#previewHost .apl-doc', (e) => e.textContent);
  if (/Apollo/i.test(aplText)) pass('apollo.config.json: badge shown'); else fail('apollo badge: ' + aplText.slice(0, 200));
  if (/client|service|my-app|endpoint/i.test(aplText)) pass('apollo.config.json: client and service shown'); else fail('apollo config: ' + aplText.slice(0, 200));

  // ── storybook.main.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('storybook.main.json (.storybook/main.json)');
  await page.waitForSelector('#previewHost .sb-doc', { timeout: 12000 });
  const sbText = await page.$eval('#previewHost .sb-doc', (e) => e.textContent);
  if (/Storybook/i.test(sbText)) pass('storybook.main.json: badge shown'); else fail('storybook badge: ' + sbText.slice(0, 200));
  if (/addon|stories|framework|react-vite/i.test(sbText)) pass('storybook.main.json: addons and framework shown'); else fail('storybook config: ' + sbText.slice(0, 200));

  // ── .drone.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.drone.yml');
  await page.waitForSelector('#previewHost .drn-doc', { timeout: 12000 });
  const drnText = await page.$eval('#previewHost .drn-doc', (e) => e.textContent);
  if (/Drone/i.test(drnText)) pass('.drone.yml: badge shown'); else fail('drone badge: ' + drnText.slice(0, 200));
  if (/pipeline|steps|install|test|build/i.test(drnText)) pass('.drone.yml: steps shown'); else fail('drone steps: ' + drnText.slice(0, 200));

  // ── buildkite.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('buildkite.yml');
  await page.waitForSelector('#previewHost .bk-doc', { timeout: 12000 });
  const bkText = await page.$eval('#previewHost .bk-doc', (e) => e.textContent);
  if (/Buildkite/i.test(bkText)) pass('buildkite.yml: badge shown'); else fail('buildkite badge: ' + bkText.slice(0, 200));
  if (/Build|test|Deploy|step/i.test(bkText)) pass('buildkite.yml: steps shown'); else fail('buildkite steps: ' + bkText.slice(0, 200));

  // ── skaffold.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('skaffold.yaml');
  await page.waitForSelector('#previewHost .skf-doc', { timeout: 12000 });
  const skfText = await page.$eval('#previewHost .skf-doc', (e) => e.textContent);
  if (/Skaffold/i.test(skfText)) pass('skaffold.yaml: badge shown'); else fail('skaffold badge: ' + skfText.slice(0, 200));
  if (/artifact|deploy|kubectl|profile/i.test(skfText)) pass('skaffold.yaml: build and deploy shown'); else fail('skaffold config: ' + skfText.slice(0, 200));

  // ── .hadolint.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.hadolint.yaml');
  await page.waitForSelector('#previewHost .hdl-doc', { timeout: 12000 });
  const hdlText = await page.$eval('#previewHost .hdl-doc', (e) => e.textContent);
  if (/Hadolint/i.test(hdlText)) pass('.hadolint.yaml: badge shown'); else fail('hadolint badge: ' + hdlText.slice(0, 200));
  if (/DL3008|DL3009|ignore|threshold/i.test(hdlText)) pass('.hadolint.yaml: ignored rules and threshold shown'); else fail('hadolint rules: ' + hdlText.slice(0, 200));

  // ── firebase.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('firebase.json');
  await page.waitForSelector('#previewHost .fbs-doc', { timeout: 12000 });
  const fbsText = await page.$eval('#previewHost .fbs-doc', (e) => e.textContent);
  if (/Firebase/i.test(fbsText)) pass('firebase.json: badge shown'); else fail('firebase badge: ' + fbsText.slice(0, 200));
  if (/dist|hosting|functions|emulators/i.test(fbsText)) pass('firebase.json: config sections shown'); else fail('firebase config: ' + fbsText.slice(0, 200));

  // ── app.json (Expo) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.json (Expo)');
  await page.waitForSelector('#previewHost .exp-doc', { timeout: 12000 });
  const expText = await page.$eval('#previewHost .exp-doc', (e) => e.textContent);
  if (/Expo/i.test(expText)) pass('app.json (Expo): badge shown'); else fail('expo badge: ' + expText.slice(0, 200));
  if (/MyAwesomeApp|51\.0\.0|ios|android/i.test(expText)) pass('app.json (Expo): app config shown'); else fail('expo config: ' + expText.slice(0, 200));

  // ── tailwind.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tailwind.config.json');
  await page.waitForSelector('#previewHost .twl-doc', { timeout: 12000 });
  const twlText = await page.$eval('#previewHost .twl-doc', (e) => e.textContent);
  if (/Tailwind/i.test(twlText)) pass('tailwind.config.json: badge shown'); else fail('tailwind badge: ' + twlText.slice(0, 200));
  if (/content|theme|plugins|class/i.test(twlText)) pass('tailwind.config.json: config shown'); else fail('tailwind config: ' + twlText.slice(0, 200));

  // ── postcss.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('postcss.config.json');
  await page.waitForSelector('#previewHost .pcs-doc', { timeout: 12000 });
  const pcsText = await page.$eval('#previewHost .pcs-doc', (e) => e.textContent);
  if (/PostCSS/i.test(pcsText)) pass('postcss.config.json: badge shown'); else fail('postcss badge: ' + pcsText.slice(0, 200));
  if (/tailwindcss|autoprefixer|cssnano/i.test(pcsText)) pass('postcss.config.json: plugins shown'); else fail('postcss plugins: ' + pcsText.slice(0, 200));

  // ── .huskyrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.huskyrc.json');
  await page.waitForSelector('#previewHost .hsk-doc', { timeout: 12000 });
  const hskText = await page.$eval('#previewHost .hsk-doc', (e) => e.textContent);
  if (/Husky/i.test(hskText)) pass('.huskyrc.json: badge shown'); else fail('husky badge: ' + hskText.slice(0, 200));
  if (/pre-commit|commit-msg|lint-staged/i.test(hskText)) pass('.huskyrc.json: hooks shown'); else fail('husky hooks: ' + hskText.slice(0, 200));

  // ── .lintstagedrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.lintstagedrc.json');
  await page.waitForSelector('#previewHost .lst-doc', { timeout: 12000 });
  const lstText = await page.$eval('#previewHost .lst-doc', (e) => e.textContent);
  if (/lint-staged/i.test(lstText)) pass('.lintstagedrc.json: badge shown'); else fail('lint-staged badge: ' + lstText.slice(0, 200));
  if (/eslint|prettier|stylelint/i.test(lstText)) pass('.lintstagedrc.json: glob rules shown'); else fail('lint-staged rules: ' + lstText.slice(0, 200));

  // ── nest-cli.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nest-cli.json');
  await page.waitForSelector('#previewHost .nst-doc', { timeout: 12000 });
  const nstText = await page.$eval('#previewHost .nst-doc', (e) => e.textContent);
  if (/NestJS/i.test(nstText)) pass('nest-cli.json: badge shown'); else fail('nest-cli badge: ' + nstText.slice(0, 200));
  if (/monorepo|api|auth|library/i.test(nstText)) pass('nest-cli.json: projects shown'); else fail('nest-cli projects: ' + nstText.slice(0, 200));

  // ── .swcrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.swcrc');
  await page.waitForSelector('#previewHost .swc-doc', { timeout: 12000 });
  const swcText = await page.$eval('#previewHost .swc-doc', (e) => e.textContent);
  if (/SWC/i.test(swcText)) pass('.swcrc: badge shown'); else fail('swcrc badge: ' + swcText.slice(0, 200));
  if (/typescript|es2020|es6|source maps/i.test(swcText)) pass('.swcrc: compiler config shown'); else fail('swcrc config: ' + swcText.slice(0, 200));

  // ── Chart.yaml (Helm chart) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Chart.yaml (Helm chart)');
  await page.waitForSelector('#previewHost .hc-doc', { timeout: 12000 });
  const hcText = await page.$eval('#previewHost .hc-doc', (e) => e.textContent);
  if (/Helm/i.test(hcText)) pass('Chart.yaml: Helm badge shown'); else fail('helm-chart badge: ' + hcText.slice(0, 200));
  if (/my-webapp|postgresql|redis/i.test(hcText)) pass('Chart.yaml: chart name and dependencies shown'); else fail('helm-chart content: ' + hcText.slice(0, 200));

  // ── kustomization.yaml (Kustomize) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('kustomization.yaml (Kustomize)');
  await page.waitForSelector('#previewHost .kust-doc', { timeout: 12000 });
  const kustText = await page.$eval('#previewHost .kust-doc', (e) => e.textContent);
  if (/Kustomize/i.test(kustText)) pass('kustomization.yaml: Kustomize badge shown'); else fail('kustomize badge: ' + kustText.slice(0, 200));
  if (/resources|patches|configMap|app-config/i.test(kustText)) pass('kustomization.yaml: overlay content shown'); else fail('kustomize content: ' + kustText.slice(0, 200));

  // ── ansible-playbook.yml (Ansible) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ansible-playbook.yml (Ansible)');
  await page.waitForSelector('#previewHost .ans-doc', { timeout: 12000 });
  const ansText = await page.$eval('#previewHost .ans-doc', (e) => e.textContent);
  if (/Ansible/i.test(ansText)) pass('ansible-playbook.yml: Ansible badge shown'); else fail('ansible badge: ' + ansText.slice(0, 200));
  if (/webservers|databases|nginx|postgresql/i.test(ansText)) pass('ansible-playbook.yml: plays and tasks shown'); else fail('ansible content: ' + ansText.slice(0, 200));

  // ── Pulumi.yaml (Pulumi project) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Pulumi.yaml (Pulumi project)');
  await page.waitForSelector('#previewHost .pul-doc', { timeout: 12000 });
  const pulText = await page.$eval('#previewHost .pul-doc', (e) => e.textContent);
  if (/Pulumi/i.test(pulText)) pass('Pulumi.yaml: Pulumi badge shown'); else fail('pulumi badge: ' + pulText.slice(0, 200));
  if (/nodejs|cloud-infra|region/i.test(pulText)) pass('Pulumi.yaml: runtime and config shown'); else fail('pulumi content: ' + pulText.slice(0, 200));

  // ── packer.json (HashiCorp Packer) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('packer.json (HashiCorp Packer)');
  await page.waitForSelector('#previewHost .pkr-doc', { timeout: 12000 });
  const pkrText = await page.$eval('#previewHost .pkr-doc', (e) => e.textContent);
  if (/Packer/i.test(pkrText)) pass('packer.json: Packer badge shown'); else fail('packer badge: ' + pkrText.slice(0, 200));
  if (/amazon-ebs|shell|builders/i.test(pkrText)) pass('packer.json: builders and provisioners shown'); else fail('packer content: ' + pkrText.slice(0, 200));

  // ── ruff.toml (Ruff linter) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ruff.toml (Ruff linter)');
  await page.waitForSelector('#previewHost .ruf-doc', { timeout: 12000 });
  const rufText = await page.$eval('#previewHost .ruf-doc', (e) => e.textContent);
  if (/Ruff/i.test(rufText)) pass('ruff.toml: Ruff badge shown'); else fail('ruff badge: ' + rufText.slice(0, 200));
  if (/py311|E|F|W|line-length|100/i.test(rufText)) pass('ruff.toml: rules and settings shown'); else fail('ruff content: ' + rufText.slice(0, 200));

  // ── uv.toml (uv package manager) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('uv.toml (uv package manager)');
  await page.waitForSelector('#previewHost .uv-doc', { timeout: 12000 });
  const uvText = await page.$eval('#previewHost .uv-doc', (e) => e.textContent);
  if (/uv/i.test(uvText)) pass('uv.toml: uv badge shown'); else fail('uv badge: ' + uvText.slice(0, 200));
  if (/3\.12|python|hardlink/i.test(uvText)) pass('uv.toml: Python version and settings shown'); else fail('uv content: ' + uvText.slice(0, 200));

  // ── values.yaml (Helm values) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('values.yaml (Helm values)');
  await page.waitForSelector('#previewHost .hv-doc', { timeout: 12000 });
  const hvText = await page.$eval('#previewHost .hv-doc', (e) => e.textContent);
  if (/Helm/i.test(hvText)) pass('values.yaml: Helm values badge shown'); else fail('helm-values badge: ' + hvText.slice(0, 200));
  if (/replicaCount|image|service|ingress/i.test(hvText)) pass('values.yaml: key sections shown'); else fail('helm-values content: ' + hvText.slice(0, 200));

  // ── package-lock.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('package-lock.json');
  await page.waitForSelector('#previewHost .plk-doc', { timeout: 12000 });
  const plkText = await page.$eval('#previewHost .plk-doc', (e) => e.textContent);
  if (/npm/i.test(plkText)) pass('package-lock.json: badge shown'); else fail('package-lock badge: ' + plkText.slice(0, 200));
  if (/lockfileVersion|v3|Total|packages/i.test(plkText)) pass('package-lock.json: stats shown'); else fail('package-lock stats: ' + plkText.slice(0, 200));

  // ── composer.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('composer.lock');
  await page.waitForSelector('#previewHost .cpl-doc', { timeout: 12000 });
  const cplText = await page.$eval('#previewHost .cpl-doc', (e) => e.textContent);
  if (/Composer/i.test(cplText)) pass('composer.lock: badge shown'); else fail('composer-lock badge: ' + cplText.slice(0, 200));
  if (/guzzlehttp|symfony|phpunit|package/i.test(cplText)) pass('composer.lock: packages shown'); else fail('composer-lock packages: ' + cplText.slice(0, 200));

  // ── pnpm-lock.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pnpm-lock.yaml');
  await page.waitForSelector('#previewHost .pkl-doc', { timeout: 12000 });
  const pklText = await page.$eval('#previewHost .pkl-doc', (e) => e.textContent);
  if (/pnpm/i.test(pklText)) pass('pnpm-lock.yaml: badge shown'); else fail('pnpm-lock badge: ' + pklText.slice(0, 200));
  if (/lockfileVersion|9|Packages|react/i.test(pklText)) pass('pnpm-lock.yaml: stats shown'); else fail('pnpm-lock stats: ' + pklText.slice(0, 200));

  // ── Cargo.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Cargo.lock');
  await page.waitForSelector('#previewHost .clk-doc', { timeout: 12000 });
  const clkText = await page.$eval('#previewHost .clk-doc', (e) => e.textContent);
  if (/Cargo/i.test(clkText)) pass('Cargo.lock: badge shown'); else fail('cargo-lock badge: ' + clkText.slice(0, 200));
  if (/serde|crate|Workspace/i.test(clkText)) pass('Cargo.lock: crates shown'); else fail('cargo-lock crates: ' + clkText.slice(0, 200));

  // ── poetry.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('poetry.lock');
  await page.waitForSelector('#previewHost .plo-doc', { timeout: 12000 });
  const ploText = await page.$eval('#previewHost .plo-doc', (e) => e.textContent);
  if (/Poetry/i.test(ploText)) pass('poetry.lock: badge shown'); else fail('poetry-lock badge: ' + ploText.slice(0, 200));
  if (/flask|requests|certifi|package/i.test(ploText)) pass('poetry.lock: packages shown'); else fail('poetry-lock packages: ' + ploText.slice(0, 200));

  // ── go.sum viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('go.sum');
  await page.waitForSelector('#previewHost .gsm-doc', { timeout: 12000 });
  const gsmText = await page.$eval('#previewHost .gsm-doc', (e) => e.textContent);
  if (/Go/i.test(gsmText)) pass('go.sum: badge shown'); else fail('go-sum badge: ' + gsmText.slice(0, 200));
  if (/gin-gonic|module|Entries|Modules/i.test(gsmText)) pass('go.sum: module list shown'); else fail('go-sum modules: ' + gsmText.slice(0, 200));

  // ── Makefile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Makefile');
  await page.waitForSelector('#previewHost .mkf-doc', { timeout: 12000 });
  const mkfText = await page.$eval('#previewHost .mkf-doc', (e) => e.textContent);
  if (/Make|Makefile/i.test(mkfText)) pass('Makefile: badge shown'); else fail('makefile badge: ' + mkfText.slice(0, 200));
  if (/all|test|clean|serve/i.test(mkfText)) pass('Makefile: targets shown'); else fail('makefile targets: ' + mkfText.slice(0, 200));

  // ── Justfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Justfile');
  await page.waitForSelector('#previewHost .jst-doc', { timeout: 12000 });
  const jstText = await page.$eval('#previewHost .jst-doc', (e) => e.textContent);
  if (/[Jj]ust/i.test(jstText)) pass('Justfile: badge shown'); else fail('justfile badge: ' + jstText.slice(0, 200));
  if (/build|test|fmt|release/i.test(jstText)) pass('Justfile: recipes shown'); else fail('justfile recipes: ' + jstText.slice(0, 200));

  // ── Procfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Procfile');
  await page.waitForSelector('#previewHost .pfl-doc', { timeout: 12000 });
  const pflText = await page.$eval('#previewHost .pfl-doc', (e) => e.textContent);
  if (/Procfile|process/i.test(pflText)) pass('Procfile: badge shown'); else fail('procfile badge: ' + pflText.slice(0, 200));
  if (/web|worker|scheduler/i.test(pflText)) pass('Procfile: process types shown'); else fail('procfile procs: ' + pflText.slice(0, 200));

  // ── .envrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.envrc');
  await page.waitForSelector('#previewHost .erc-doc', { timeout: 12000 });
  const ercText = await page.$eval('#previewHost .erc-doc', (e) => e.textContent);
  if (/direnv|envrc/i.test(ercText)) pass('.envrc: badge shown'); else fail('envrc badge: ' + ercText.slice(0, 200));
  if (/NODE_ENV|PORT|DATABASE_URL/i.test(ercText)) pass('.envrc: exports shown'); else fail('envrc exports: ' + ercText.slice(0, 200));
  if (!/do-not-commit/i.test(ercText)) pass('.envrc: sensitive values redacted'); else fail('envrc not redacting secrets');

  // ── mise.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mise.toml');
  await page.waitForSelector('#previewHost .mse-doc', { timeout: 12000 });
  const mseText = await page.$eval('#previewHost .mse-doc', (e) => e.textContent);
  if (/mise/i.test(mseText)) pass('mise.toml: badge shown'); else fail('mise badge: ' + mseText.slice(0, 200));
  if (/node|python|ruby/i.test(mseText)) pass('mise.toml: tools shown'); else fail('mise tools: ' + mseText.slice(0, 200));

  // ── .tool-versions viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.tool-versions');
  await page.waitForSelector('#previewHost .tvr-doc', { timeout: 12000 });
  const tvrText = await page.$eval('#previewHost .tvr-doc', (e) => e.textContent);
  if (/asdf|tool.version/i.test(tvrText)) pass('.tool-versions: badge shown'); else fail('tool-versions badge: ' + tvrText.slice(0, 200));
  if (/node|python|ruby/i.test(tvrText)) pass('.tool-versions: tools shown'); else fail('tool-versions tools: ' + tvrText.slice(0, 200));

  // ── .gitattributes viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitattributes');
  await page.waitForSelector('#previewHost .gat-doc', { timeout: 12000 });
  const gatText = await page.$eval('#previewHost .gat-doc', (e) => e.textContent);
  if (/gitattributes/i.test(gatText)) pass('.gitattributes: title shown'); else fail('gitattributes title: ' + gatText.slice(0, 200));
  const gatPats = await page.$$eval('#previewHost .gat-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (gatPats.some((p) => /\*/.test(p))) pass('.gitattributes: patterns shown'); else fail('gitattributes patterns: ' + gatPats.join(','));

  // ── .mailmap viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.mailmap');
  await page.waitForSelector('#previewHost .mm-doc', { timeout: 12000 });
  const mmText = await page.$eval('#previewHost .mm-doc', (e) => e.textContent);
  if (/mailmap/i.test(mmText)) pass('.mailmap: title shown'); else fail('mailmap title: ' + mmText.slice(0, 200));
  const mmNames = await page.$$eval('#previewHost .mm-doc .mm-name', (els) => els.map((e) => e.textContent));
  if (mmNames.length > 0) pass('.mailmap: canonical names shown'); else fail('mailmap names: ' + mmText.slice(0, 200));

  // ── .npmignore viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.npmignore');
  await page.waitForSelector('#previewHost .nig-doc', { timeout: 12000 });
  const nigText = await page.$eval('#previewHost .nig-doc', (e) => e.textContent);
  if (/npmignore/i.test(nigText)) pass('.npmignore: title shown'); else fail('npmignore title: ' + nigText.slice(0, 200));
  const nigPats = await page.$$eval('#previewHost .nig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (nigPats.some((p) => /node_modules|test|dist/.test(p))) pass('.npmignore: patterns shown'); else fail('npmignore patterns: ' + nigPats.join(','));

  // ── .dockerignore viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.dockerignore');
  await page.waitForSelector('#previewHost .dig-doc', { timeout: 12000 });
  const digText = await page.$eval('#previewHost .dig-doc', (e) => e.textContent);
  if (/dockerignore/i.test(digText)) pass('.dockerignore: title shown'); else fail('dockerignore title: ' + digText.slice(0, 200));
  const digPats = await page.$$eval('#previewHost .dig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (digPats.some((p) => /node_modules|\.git|dist/.test(p))) pass('.dockerignore: patterns shown'); else fail('dockerignore patterns: ' + digPats.join(','));

  // ── AppVeyor CI viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('appveyor.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const avyChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/AppVeyor/i.test(avyChipText)) pass('appveyor.yml: badge shown'); else fail('appveyor chip: ' + avyChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .avy-doc', { timeout: 12000 });
  const avyText = await page.$eval('#previewHost .avy-doc', (e) => e.textContent);
  if (/AppVeyor/i.test(avyText)) pass('appveyor.yml: label shown'); else fail('appveyor label: ' + avyText.slice(0, 200));
  if (/Visual Studio|Build Script|build step/i.test(avyText)) pass('appveyor.yml: build info shown'); else fail('appveyor build info: ' + avyText.slice(0, 200));

  // ── RuboCop viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.rubocop.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const rbcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/RuboCop/i.test(rbcChipText)) pass('.rubocop.yml: badge shown'); else fail('rubocop chip: ' + rbcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .rbc-doc', { timeout: 12000 });
  const rbcText = await page.$eval('#previewHost .rbc-doc', (e) => e.textContent);
  if (/RuboCop/i.test(rbcText)) pass('.rubocop.yml: label shown'); else fail('rubocop label: ' + rbcText.slice(0, 200));
  if (/Ruby|3\.2|TargetRuby/i.test(rbcText)) pass('.rubocop.yml: ruby version shown'); else fail('rubocop ruby version: ' + rbcText.slice(0, 200));

  // ── Taskfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Taskfile.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const tkfChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Taskfile/i.test(tkfChipText)) pass('Taskfile.yml: badge shown'); else fail('taskfile chip: ' + tkfChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .tkf-doc', { timeout: 12000 });
  const tkfText = await page.$eval('#previewHost .tkf-doc', (e) => e.textContent);
  if (/Taskfile/i.test(tkfText)) pass('Taskfile.yml: label shown'); else fail('taskfile label: ' + tkfText.slice(0, 200));
  if (/build|test|clean/i.test(tkfText)) pass('Taskfile.yml: tasks shown'); else fail('taskfile tasks: ' + tkfText.slice(0, 200));

  // ── MkDocs viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mkdocs.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const mdkChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/MkDocs/i.test(mdkChipText)) pass('mkdocs.yml: badge shown'); else fail('mkdocs chip: ' + mdkChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .mdk-doc', { timeout: 12000 });
  const mdkText = await page.$eval('#previewHost .mdk-doc', (e) => e.textContent);
  if (/MkDocs/i.test(mdkText)) pass('mkdocs.yml: label shown'); else fail('mkdocs label: ' + mdkText.slice(0, 200));
  if (/My Project Docs|material|Getting Started/i.test(mdkText)) pass('mkdocs.yml: site info shown'); else fail('mkdocs site info: ' + mdkText.slice(0, 200));

  // ── Gemfile.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Gemfile.lock');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const gflChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Gemfile|Bundler/i.test(gflChipText)) pass('Gemfile.lock: chip shown'); else fail('gemfile-lock chip: ' + gflChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .gfl-doc', { timeout: 12000 });
  const gflText = await page.$eval('#previewHost .gfl-doc', (e) => e.textContent);
  if (/GEM|BUNDLED|Gemfile|rails/i.test(gflText)) pass('Gemfile.lock: content shown'); else fail('gemfile-lock content: ' + gflText.slice(0, 200));

  // ── SonarQube config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sonar-project.properties');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const snrChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Sonar/i.test(snrChipText)) pass('sonar-project.properties: chip shown'); else fail('sonar chip: ' + snrChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .snr-doc', { timeout: 12000 });
  const snrText = await page.$eval('#previewHost .snr-doc', (e) => e.textContent);
  if (/sonar|project/i.test(snrText)) pass('sonar-project.properties: content shown'); else fail('sonar content: ' + snrText.slice(0, 200));

  // ── Hatch config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hatch.toml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const htcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Hatch/i.test(htcChipText)) pass('hatch.toml: chip shown'); else fail('hatch chip: ' + htcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .htc-doc', { timeout: 12000 });
  const htcText = await page.$eval('#previewHost .htc-doc', (e) => e.textContent);
  if (/Hatch|build|env/i.test(htcText)) pass('hatch.toml: content shown'); else fail('hatch content: ' + htcText.slice(0, 200));

  // ── rush.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rush.json');
  await page.waitForSelector('#previewHost .rsh-doc', { timeout: 12000 });
  const rshText = await page.$eval('#previewHost .rsh-doc', (e) => e.textContent);
  if (/Rush/i.test(rshText)) pass('rush.json: badge shown'); else fail('rush badge: ' + rshText.slice(0, 200));
  if (/5\.109|rushVersion|@acme/i.test(rshText)) pass('rush.json: version and projects shown'); else fail('rush content: ' + rshText.slice(0, 200));

  // ── .markdownlint.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.markdownlint.json');
  await page.waitForSelector('#previewHost .mdl-doc', { timeout: 12000 });
  const mdlText = await page.$eval('#previewHost .mdl-doc', (e) => e.textContent);
  if (/markdownlint/i.test(mdlText)) pass('.markdownlint.json: badge shown'); else fail('markdownlint badge: ' + mdlText.slice(0, 200));
  if (/MD013|MD033|disabled|enabled/i.test(mdlText)) pass('.markdownlint.json: rules shown'); else fail('markdownlint rules: ' + mdlText.slice(0, 200));

  // ── .clang-format viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.clang-format');
  await page.waitForSelector('#previewHost .clf-doc', { timeout: 12000 });
  const clangFmtText = await page.$eval('#previewHost .clf-doc', (e) => e.textContent);
  if (/clang-format/i.test(clangFmtText)) pass('.clang-format: badge shown'); else fail('clang-format badge: ' + clangFmtText.slice(0, 200));
  if (/Google|IndentWidth|ColumnLimit/i.test(clangFmtText)) pass('.clang-format: style settings shown'); else fail('clang-format settings: ' + clangFmtText.slice(0, 200));

  // ── moon.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('moon.yml');
  await page.waitForSelector('#previewHost .moon-doc', { timeout: 12000 });
  const moonText = await page.$eval('#previewHost .moon-doc', (e) => e.textContent);
  if (/Moon/i.test(moonText)) pass('moon.yml: badge shown'); else fail('moon badge: ' + moonText.slice(0, 200));
  if (/language|tasks|project|schema|vcs|pnpm/i.test(moonText)) pass('moon.yml: content shown'); else fail('moon content: ' + moonText.slice(0, 200));

  // ── crowdin.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('crowdin.yml');
  await page.waitForSelector('#previewHost .cwd-doc', { timeout: 12000 });
  const cwdText = await page.$eval('#previewHost .cwd-doc', (e) => e.textContent);
  if (/Crowdin/i.test(cwdText)) pass('crowdin.yml: badge shown'); else fail('crowdin badge: ' + cwdText.slice(0, 200));
  if (/source|translation|mapping/i.test(cwdText)) pass('crowdin.yml: file mappings shown'); else fail('crowdin content: ' + cwdText.slice(0, 200));

  // ── Matchfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Matchfile');
  await page.waitForSelector('#previewHost .mf-doc', { timeout: 12000 });
  const mfText = await page.$eval('#previewHost .mf-doc', (e) => e.textContent);
  if (/Match/i.test(mfText)) pass('Matchfile: badge shown'); else fail('matchfile badge: ' + mfText.slice(0, 200));
  if (/git|storage|com\.example|development/i.test(mfText)) pass('Matchfile: certificate config shown'); else fail('matchfile content: ' + mfText.slice(0, 200));

  // ── Appfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Appfile');
  await page.waitForSelector('#previewHost .af-doc', { timeout: 12000 });
  const afText = await page.$eval('#previewHost .af-doc', (e) => e.textContent);
  if (/Fastlane|Appfile/i.test(afText)) pass('Appfile: badge shown'); else fail('appfile badge: ' + afText.slice(0, 200));
  if (/com\.example|apple_id|team/i.test(afText)) pass('Appfile: app config shown'); else fail('appfile content: ' + afText.slice(0, 200));

  // ── .ruby-version viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.ruby-version');
  await page.waitForSelector('#previewHost .rv-doc', { timeout: 12000 });
  const rvText = await page.$eval('#previewHost .rv-doc', (e) => e.textContent);
  if (/Ruby/i.test(rvText)) pass('.ruby-version: badge shown'); else fail('ruby-version badge: ' + rvText.slice(0, 200));
  if (/rbenv|rvm|asdf/i.test(rvText)) pass('.ruby-version: install commands shown'); else fail('ruby-version content: ' + rvText.slice(0, 200));

  // ── .python-version viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.python-version');
  await page.waitForSelector('#previewHost .pv-doc', { timeout: 12000 });
  const pvText = await page.$eval('#previewHost .pv-doc', (e) => e.textContent);
  if (/Python/i.test(pvText)) pass('.python-version: badge shown'); else fail('python-version badge: ' + pvText.slice(0, 200));
  if (/pyenv|asdf|3\.\d/i.test(pvText)) pass('.python-version: version and install commands shown'); else fail('python-version content: ' + pvText.slice(0, 200));

  // ── Supabase config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('supabase-config.toml');
  await page.waitForSelector('#previewHost .sbc-doc', { timeout: 12000 });
  const sbcText = await page.$eval('#previewHost .sbc-doc', (e) => e.textContent);
  if (/Supabase/i.test(sbcText)) pass('supabase config.toml: badge shown'); else fail('supabase badge: ' + sbcText.slice(0, 200));
  if (/my-supabase-project|54321|54322/i.test(sbcText)) pass('supabase config.toml: settings shown'); else fail('supabase content: ' + sbcText.slice(0, 200));

  // ── Netlify _redirects viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('_redirects');
  await page.waitForSelector('#previewHost .rdx-doc', { timeout: 12000 });
  const rdxText = await page.$eval('#previewHost .rdx-doc', (e) => e.textContent);
  if (/Netlify/i.test(rdxText)) pass('_redirects: badge shown'); else fail('redirects badge: ' + rdxText.slice(0, 200));
  if (/301|\/old-blog|\/api/i.test(rdxText)) pass('_redirects: rules shown'); else fail('redirects content: ' + rdxText.slice(0, 200));

  // ── CMakeLists.txt viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CMakeLists.txt');
  await page.waitForSelector('#previewHost .cmake-doc', { timeout: 12000 });
  const cmakeText = await page.$eval('#previewHost .cmake-doc', (e) => e.textContent);
  if (/CMake/i.test(cmakeText)) pass('CMakeLists.txt: badge shown'); else fail('cmake badge: ' + cmakeText.slice(0, 200));
  if (/myapp|mylib|OpenSSL|MyApp/i.test(cmakeText)) pass('CMakeLists.txt: targets or deps shown'); else fail('cmake targets: ' + cmakeText.slice(0, 200));

  // ── Jenkinsfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Jenkinsfile');
  await page.waitForSelector('#previewHost .jkf-doc', { timeout: 12000 });
  const jkfText = await page.$eval('#previewHost .jkf-doc', (e) => e.textContent);
  if (/Jenkins/i.test(jkfText)) pass('Jenkinsfile: badge shown'); else fail('jenkins badge: ' + jkfText.slice(0, 200));
  if (/Install|Lint|Test|Build|Deploy/i.test(jkfText)) pass('Jenkinsfile: stages shown'); else fail('jenkins stages: ' + jkfText.slice(0, 200));

  // ── BUILD.bazel viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('BUILD.bazel');
  await page.waitForSelector('#previewHost .bzl-doc', { timeout: 12000 });
  const bzlText = await page.$eval('#previewHost .bzl-doc', (e) => e.textContent);
  if (/Bazel/i.test(bzlText)) pass('BUILD.bazel: Bazel badge shown'); else fail('bazel badge: ' + bzlText.slice(0, 200));
  if (/server|lib|py_binary|py_library|py_test/i.test(bzlText)) pass('BUILD.bazel: targets shown'); else fail('bazel targets: ' + bzlText.slice(0, 200));

  // ── .bazelrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bazelrc');
  await page.waitForSelector('#previewHost .brc-doc', { timeout: 12000 });
  const brcText = await page.$eval('#previewHost .brc-doc', (e) => e.textContent);
  if (/Bazel/i.test(brcText)) pass('.bazelrc: Bazel badge shown'); else fail('bazelrc badge: ' + brcText.slice(0, 200));
  if (/build|test|common|remote/i.test(brcText)) pass('.bazelrc: option groups shown'); else fail('bazelrc groups: ' + brcText.slice(0, 200));

  // ── build.ninja viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.ninja');
  await page.waitForSelector('#previewHost .nj-doc', { timeout: 12000 });
  const njText = await page.$eval('#previewHost .nj-doc', (e) => e.textContent);
  if (/Ninja/i.test(njText)) pass('build.ninja: Ninja badge shown'); else fail('ninja badge: ' + njText.slice(0, 200));
  if (/cc_compile|cc_link|myapp|build\./i.test(njText)) pass('build.ninja: rules or targets shown'); else fail('ninja targets: ' + njText.slice(0, 200));
}
