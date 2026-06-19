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
}
