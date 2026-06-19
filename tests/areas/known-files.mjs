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

  // ── .gitconfig viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitconfig');
  await page.waitForSelector('#previewHost .gcf-doc', { timeout: 12000 });
  const gcfText = await page.$eval('#previewHost .gcf-doc', (e) => e.textContent);
  if (/Git/i.test(gcfText)) pass('.gitconfig: Git badge shown'); else fail('gitconfig badge: ' + gcfText.slice(0, 200));
  if (/user|remote|alias|core/i.test(gcfText)) pass('.gitconfig: sections shown'); else fail('gitconfig sections: ' + gcfText.slice(0, 200));
  if (/jane@example\.com|Jane Developer/i.test(gcfText)) pass('.gitconfig: user identity shown'); else fail('gitconfig user: ' + gcfText.slice(0, 200));

  // ── playwright.config.ts viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('playwright.config.ts');
  await page.waitForSelector('#previewHost .pw-doc', { timeout: 12000 });
  const pwText = await page.$eval('#previewHost .pw-doc', (e) => e.textContent);
  if (/Playwright/i.test(pwText)) pass('playwright.config.ts: Playwright badge shown'); else fail('playwright badge: ' + pwText.slice(0, 200));
  if (/chromium|firefox|webkit/i.test(pwText)) pass('playwright.config.ts: browsers shown'); else fail('playwright browsers: ' + pwText.slice(0, 200));
  if (/baseURL|localhost/i.test(pwText)) pass('playwright.config.ts: base URL shown'); else fail('playwright baseURL: ' + pwText.slice(0, 200));
  if (/web server/i.test(pwText)) pass('playwright.config.ts: web server indicator shown'); else fail('playwright webserver: ' + pwText.slice(0, 200));

  // ── cypress.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cypress.config.js');
  await page.waitForSelector('#previewHost .cy-doc', { timeout: 12000 });
  const cyText = await page.$eval('#previewHost .cy-doc', (e) => e.textContent);
  if (/Cypress/i.test(cyText)) pass('cypress.config.js: Cypress badge shown'); else fail('cypress badge: ' + cyText.slice(0, 200));
  if (/localhost:4000/i.test(cyText)) pass('cypress.config.js: base URL shown'); else fail('cypress baseURL: ' + cyText.slice(0, 200));
  if (/component/i.test(cyText)) pass('cypress.config.js: component testing section shown'); else fail('cypress component: ' + cyText.slice(0, 200));
  if (/env var/i.test(cyText)) pass('cypress.config.js: env var count shown'); else fail('cypress env: ' + cyText.slice(0, 200));

  // ── .goreleaser.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.goreleaser.yaml');
  await page.waitForSelector('#previewHost .grl-doc', { timeout: 12000 });
  const grlText = await page.$eval('#previewHost .grl-doc', (e) => e.textContent);
  if (/GoReleaser/i.test(grlText)) pass('.goreleaser.yaml: GoReleaser badge shown'); else fail('goreleaser badge: ' + grlText.slice(0, 200));
  if (/myapp/i.test(grlText)) pass('.goreleaser.yaml: project name shown'); else fail('goreleaser project: ' + grlText.slice(0, 200));
  if (/linux|darwin|windows/i.test(grlText)) pass('.goreleaser.yaml: build targets shown'); else fail('goreleaser builds: ' + grlText.slice(0, 200));
  if (/tar\.gz|zip/i.test(grlText)) pass('.goreleaser.yaml: archive formats shown'); else fail('goreleaser archives: ' + grlText.slice(0, 200));

  // ── .golangci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.golangci.yml');
  await page.waitForSelector('#previewHost .gcl-doc', { timeout: 12000 });
  const gclText = await page.$eval('#previewHost .gcl-doc', (e) => e.textContent);
  if (/golangci-lint/i.test(gclText)) pass('.golangci.yml: golangci-lint badge shown'); else fail('golangci badge: ' + gclText.slice(0, 200));
  if (/errcheck|gosimple|govet/i.test(gclText)) pass('.golangci.yml: enabled linters shown'); else fail('golangci linters: ' + gclText.slice(0, 200));
  if (/5m/i.test(gclText)) pass('.golangci.yml: timeout shown'); else fail('golangci timeout: ' + gclText.slice(0, 200));

  // ── buf.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('buf.yaml');
  await page.waitForSelector('#previewHost .buf-doc', { timeout: 12000 });
  const bufText = await page.$eval('#previewHost .buf-doc', (e) => e.textContent);
  if (/Buf/i.test(bufText)) pass('buf.yaml: Buf badge shown'); else fail('buf badge: ' + bufText.slice(0, 200));
  if (/v2/i.test(bufText)) pass('buf.yaml: version shown'); else fail('buf version: ' + bufText.slice(0, 200));
  if (/googleapis|grpc-gateway/i.test(bufText)) pass('buf.yaml: dependencies shown'); else fail('buf deps: ' + bufText.slice(0, 200));

  // ── heroku.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('heroku.yml');
  await page.waitForSelector('#previewHost .hku-doc', { timeout: 12000 });
  const hkuText = await page.$eval('#previewHost .hku-doc', (e) => e.textContent);
  if (/Heroku/i.test(hkuText)) pass('heroku.yml: Heroku badge shown'); else fail('heroku badge: ' + hkuText.slice(0, 200));
  if (/Dockerfile/i.test(hkuText)) pass('heroku.yml: Docker build shown'); else fail('heroku docker: ' + hkuText.slice(0, 200));
  if (/web|worker|scheduler/i.test(hkuText)) pass('heroku.yml: process types shown'); else fail('heroku processes: ' + hkuText.slice(0, 200));

  // ── .readthedocs.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.readthedocs.yaml');
  await page.waitForSelector('#previewHost .rtd-doc', { timeout: 12000 });
  const rtdText = await page.$eval('#previewHost .rtd-doc', (e) => e.textContent);
  if (/ReadTheDocs/i.test(rtdText)) pass('.readthedocs.yaml: ReadTheDocs badge shown'); else fail('readthedocs badge: ' + rtdText.slice(0, 200));
  if (/ubuntu|3\.11|Node/i.test(rtdText)) pass('.readthedocs.yaml: build environment shown'); else fail('readthedocs build env: ' + rtdText.slice(0, 200));
  if (/Sphinx|MkDocs|pdf|epub/i.test(rtdText)) pass('.readthedocs.yaml: doc tool or formats shown'); else fail('readthedocs formats: ' + rtdText.slice(0, 200));

  // ── CITATION.cff viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CITATION.cff');
  await page.waitForSelector('#previewHost .cff-doc', { timeout: 12000 });
  const cffText = await page.$eval('#previewHost .cff-doc', (e) => e.textContent);
  if (/Citation/i.test(cffText)) pass('CITATION.cff: Citation badge shown'); else fail('citation badge: ' + cffText.slice(0, 200));
  if (/MyAwesomeTool/i.test(cffText)) pass('CITATION.cff: title shown'); else fail('citation title: ' + cffText.slice(0, 200));
  if (/Alice|Researcher|Bob|Developer/i.test(cffText)) pass('CITATION.cff: authors shown'); else fail('citation authors: ' + cffText.slice(0, 200));

  // ── .yamllint.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.yamllint.yml');
  await page.waitForSelector('#previewHost .yml-doc', { timeout: 12000 });
  const ymlText = await page.$eval('#previewHost .yml-doc', (e) => e.textContent);
  if (/yamllint/i.test(ymlText)) pass('.yamllint.yml: yamllint badge shown'); else fail('yamllint badge: ' + ymlText.slice(0, 200));
  if (/default/i.test(ymlText)) pass('.yamllint.yml: extends shown'); else fail('yamllint extends: ' + ymlText.slice(0, 200));
  if (/120|line-length|indentation/i.test(ymlText)) pass('.yamllint.yml: key rules shown'); else fail('yamllint rules: ' + ymlText.slice(0, 200));

  // ── .coderabbit.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.coderabbit.yaml');
  await page.waitForSelector('#previewHost .crb-doc', { timeout: 12000 });
  const crbText = await page.$eval('#previewHost .crb-doc', (e) => e.textContent);
  if (/CodeRabbit/i.test(crbText)) pass('.coderabbit.yaml: CodeRabbit badge shown'); else fail('coderabbit badge: ' + crbText.slice(0, 200));
  if (/enabled|auto-review/i.test(crbText)) pass('.coderabbit.yaml: auto-review status shown'); else fail('coderabbit auto-review: ' + crbText.slice(0, 200));
  if (/ruff|eslint|path/i.test(crbText)) pass('.coderabbit.yaml: tools or filters shown'); else fail('coderabbit tools: ' + crbText.slice(0, 200));

  // ── vcpkg.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vcpkg.json');
  await page.waitForSelector('#previewHost .vcpkg-doc', { timeout: 12000 });
  const vcpkgText = await page.$eval('#previewHost .vcpkg-doc', (e) => e.textContent);
  if (/vcpkg/i.test(vcpkgText)) pass('vcpkg.json: vcpkg badge shown'); else fail('vcpkg badge: ' + vcpkgText.slice(0, 200));
  if (/my-cpp-app/i.test(vcpkgText)) pass('vcpkg.json: package name shown'); else fail('vcpkg name: ' + vcpkgText.slice(0, 200));
  if (/fmt|nlohmann-json|boost-filesystem/i.test(vcpkgText)) pass('vcpkg.json: dependencies listed'); else fail('vcpkg deps: ' + vcpkgText.slice(0, 300));
  if (/networking|testing/i.test(vcpkgText)) pass('vcpkg.json: features shown'); else fail('vcpkg features: ' + vcpkgText.slice(0, 300));

  // ── CMakePresets.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CMakePresets.json');
  await page.waitForSelector('#previewHost .cmp-doc', { timeout: 12000 });
  const cmpText = await page.$eval('#previewHost .cmp-doc', (e) => e.textContent);
  if (/CMake Presets/i.test(cmpText)) pass('CMakePresets.json: CMake Presets badge shown'); else fail('cmake-presets badge: ' + cmpText.slice(0, 200));
  if (/3\.25|3\.25\.0/i.test(cmpText)) pass('CMakePresets.json: minimum CMake version shown'); else fail('cmake-presets version: ' + cmpText.slice(0, 200));
  if (/debug|release|ci/i.test(cmpText)) pass('CMakePresets.json: configure presets listed'); else fail('cmake-presets configure: ' + cmpText.slice(0, 300));
  if (/configure|build|test|workflow/i.test(cmpText)) pass('CMakePresets.json: summary tags shown'); else fail('cmake-presets tags: ' + cmpText.slice(0, 200));

  // ── conanfile.txt viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('conanfile.txt');
  await page.waitForSelector('#previewHost .conan-doc', { timeout: 12000 });
  const conanText = await page.$eval('#previewHost .conan-doc', (e) => e.textContent);
  if (/Conan/i.test(conanText)) pass('conanfile.txt: Conan badge shown'); else fail('conan badge: ' + conanText.slice(0, 200));
  if (/boost|fmt|nlohmann_json/i.test(conanText)) pass('conanfile.txt: requires listed'); else fail('conan requires: ' + conanText.slice(0, 300));
  if (/CMakeDeps|CMakeToolchain/i.test(conanText)) pass('conanfile.txt: generators shown'); else fail('conan generators: ' + conanText.slice(0, 200));

  // ── prometheus.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('prometheus.yml');
  await page.waitForSelector('#previewHost .prom-doc', { timeout: 12000 });
  const promText = await page.$eval('#previewHost .prom-doc', (e) => e.textContent);
  if (/Prometheus/i.test(promText)) pass('prometheus.yml: Prometheus badge shown'); else fail('prometheus badge: ' + promText.slice(0, 200));
  if (/node-exporter|prometheus/i.test(promText)) pass('prometheus.yml: scrape jobs shown'); else fail('prometheus scrape jobs: ' + promText.slice(0, 200));
  if (/15s/i.test(promText)) pass('prometheus.yml: scrape_interval shown'); else fail('prometheus interval: ' + promText.slice(0, 200));
  if (/alertmanager/i.test(promText)) pass('prometheus.yml: alertmanager target shown'); else fail('prometheus alertmanager: ' + promText.slice(0, 200));

  // ── alertmanager.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('alertmanager.yml');
  await page.waitForSelector('#previewHost .am-doc', { timeout: 12000 });
  const amText = await page.$eval('#previewHost .am-doc', (e) => e.textContent);
  if (/Alertmanager/i.test(amText)) pass('alertmanager.yml: Alertmanager badge shown'); else fail('alertmanager badge: ' + amText.slice(0, 200));
  if (/default-receiver|pagerduty-critical/i.test(amText)) pass('alertmanager.yml: receivers shown'); else fail('alertmanager receivers: ' + amText.slice(0, 200));
  if (/Slack|PagerDuty/i.test(amText)) pass('alertmanager.yml: receiver types shown'); else fail('alertmanager types: ' + amText.slice(0, 200));
  if (/group_wait|30s/i.test(amText)) pass('alertmanager.yml: route settings shown'); else fail('alertmanager route: ' + amText.slice(0, 200));

  // ── datadog.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('datadog.yaml');
  await page.waitForSelector('#previewHost .dd-doc', { timeout: 12000 });
  const ddText = await page.$eval('#previewHost .dd-doc', (e) => e.textContent);
  if (/Datadog/i.test(ddText)) pass('datadog.yaml: Datadog badge shown'); else fail('datadog badge: ' + ddText.slice(0, 200));
  if (/datadoghq\.com/i.test(ddText)) pass('datadog.yaml: site shown'); else fail('datadog site: ' + ddText.slice(0, 200));
  if (/env:production|service:myapp/i.test(ddText)) pass('datadog.yaml: tags shown'); else fail('datadog tags: ' + ddText.slice(0, 200));
  if (/Log collection|APM/i.test(ddText)) pass('datadog.yaml: feature flags shown'); else fail('datadog features: ' + ddText.slice(0, 200));

  // ── ionic.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ionic.config.json');
  await page.waitForSelector('#previewHost .ion-doc', { timeout: 12000 });
  const ionicText = await page.$eval('#previewHost .ion-doc', (e) => e.textContent);
  if (/Ionic/i.test(ionicText)) pass('ionic.config.json: Ionic badge shown'); else fail('ionic badge: ' + ionicText.slice(0, 200));
  if (/my-ionic-app/i.test(ionicText)) pass('ionic.config.json: app name shown'); else fail('ionic app name: ' + ionicText.slice(0, 200));
  if (/com\.example\.myionicapp/i.test(ionicText)) pass('ionic.config.json: app ID shown'); else fail('ionic app ID: ' + ionicText.slice(0, 200));
  if (/capacitor|cordova/i.test(ionicText)) pass('ionic.config.json: integrations shown'); else fail('ionic integrations: ' + ionicText.slice(0, 300));
  if (/ionic.?react/i.test(ionicText)) pass('ionic.config.json: project type shown'); else fail('ionic type: ' + ionicText.slice(0, 200));

  // ── metro.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('metro.config.js');
  await page.waitForSelector('#previewHost .metro-doc', { timeout: 12000 });
  const metroText = await page.$eval('#previewHost .metro-doc', (e) => e.textContent);
  if (/Metro/i.test(metroText)) pass('metro.config.js: Metro badge shown'); else fail('metro badge: ' + metroText.slice(0, 200));
  if (/8081/i.test(metroText)) pass('metro.config.js: server port shown'); else fail('metro port: ' + metroText.slice(0, 200));
  if (/SVG/i.test(metroText)) pass('metro.config.js: SVG support shown'); else fail('metro SVG: ' + metroText.slice(0, 200));
  if (/svg|ts|tsx/i.test(metroText)) pass('metro.config.js: source extensions shown'); else fail('metro extensions: ' + metroText.slice(0, 300));

  // ── react-native.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('react-native.config.js');
  await page.waitForSelector('#previewHost .rnc-doc', { timeout: 12000 });
  const rncText = await page.$eval('#previewHost .rnc-doc', (e) => e.textContent);
  if (/React Native CLI/i.test(rncText)) pass('react-native.config.js: React Native CLI badge shown'); else fail('rnc badge: ' + rncText.slice(0, 200));
  if (/react-native-vector-icons|react-native-camera|react-native-maps/i.test(rncText)) pass('react-native.config.js: dependencies shown'); else fail('rnc deps: ' + rncText.slice(0, 300));
  if (/ios|android/i.test(rncText)) pass('react-native.config.js: platforms shown'); else fail('rnc platforms: ' + rncText.slice(0, 200));
  if (/fonts|images|assets/i.test(rncText)) pass('react-native.config.js: assets shown'); else fail('rnc assets: ' + rncText.slice(0, 200));

  // ── stack.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('stack.yaml');
  await page.waitForSelector('#previewHost .stk-doc', { timeout: 12000 });
  const stkText = await page.$eval('#previewHost .stk-doc', (e) => e.textContent);
  if (/Haskell Stack/i.test(stkText)) pass('stack.yaml: Haskell Stack badge shown'); else fail('stack badge: ' + stkText.slice(0, 200));
  if (/lts-21\.25/i.test(stkText)) pass('stack.yaml: resolver shown'); else fail('stack resolver: ' + stkText.slice(0, 200));
  if (/my-lib|my-app/i.test(stkText)) pass('stack.yaml: local packages shown'); else fail('stack packages: ' + stkText.slice(0, 300));
  if (/amazonka|async-pool/i.test(stkText)) pass('stack.yaml: extra deps shown'); else fail('stack extra-deps: ' + stkText.slice(0, 300));

  // ── example.cabal viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.cabal');
  await page.waitForSelector('#previewHost .cabal-doc', { timeout: 12000 });
  const cabalText = await page.$eval('#previewHost .cabal-doc', (e) => e.textContent);
  if (/Cabal/i.test(cabalText)) pass('example.cabal: Cabal badge shown'); else fail('cabal badge: ' + cabalText.slice(0, 200));
  if (/my-haskell-app/i.test(cabalText)) pass('example.cabal: package name shown'); else fail('cabal name: ' + cabalText.slice(0, 200));
  if (/0\.1\.0\.0/i.test(cabalText)) pass('example.cabal: version shown'); else fail('cabal version: ' + cabalText.slice(0, 200));
  if (/executable|library|test-suite|benchmark/i.test(cabalText)) pass('example.cabal: components shown'); else fail('cabal components: ' + cabalText.slice(0, 300));
  if (/aeson|mtl|containers/i.test(cabalText)) pass('example.cabal: build dependencies shown'); else fail('cabal deps: ' + cabalText.slice(0, 300));

  // ── Package.resolved viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Package.resolved');
  await page.waitForSelector('#previewHost .pkgr-doc', { timeout: 12000 });
  const pkgrText = await page.$eval('#previewHost .pkgr-doc', (e) => e.textContent);
  if (/Swift/i.test(pkgrText)) pass('Package.resolved: Swift badge shown'); else fail('package-resolved badge: ' + pkgrText.slice(0, 200));
  if (/alamofire|kingfisher/i.test(pkgrText)) pass('Package.resolved: pinned packages shown'); else fail('package-resolved pins: ' + pkgrText.slice(0, 300));
  if (/5\.8\.1|1\.3\.0/i.test(pkgrText)) pass('Package.resolved: package versions shown'); else fail('package-resolved versions: ' + pkgrText.slice(0, 300));

  // ── rebar.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rebar.config');
  await page.waitForSelector('#previewHost .rebar-doc', { timeout: 12000 });
  const rebarText = await page.$eval('#previewHost .rebar-doc', (e) => e.textContent);
  if (/Erlang\/rebar3/i.test(rebarText)) pass('rebar.config: Erlang/rebar3 badge shown'); else fail('rebar badge: ' + rebarText.slice(0, 200));
  if (/cowboy|eredis|poolboy/i.test(rebarText)) pass('rebar.config: dependencies shown'); else fail('rebar deps: ' + rebarText.slice(0, 300));
  if (/25\.0/i.test(rebarText)) pass('rebar.config: minimum OTP version shown'); else fail('rebar otp version: ' + rebarText.slice(0, 200));
  if (/prod|test|dev/i.test(rebarText)) pass('rebar.config: profiles shown'); else fail('rebar profiles: ' + rebarText.slice(0, 300));
  if (/dialyzer/i.test(rebarText)) pass('rebar.config: dialyzer shown'); else fail('rebar dialyzer: ' + rebarText.slice(0, 200));

  // ── project.clj (Leiningen) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('project.clj');
  await page.waitForSelector('#previewHost .lein-doc', { timeout: 12000 });
  const leinText = await page.$eval('#previewHost .lein-doc', (e) => e.textContent);
  if (/Leiningen/i.test(leinText)) pass('project.clj: Leiningen badge shown'); else fail('lein badge: ' + leinText.slice(0, 200));
  if (/my-clojure-app/i.test(leinText)) pass('project.clj: project name shown'); else fail('lein name: ' + leinText.slice(0, 200));
  if (/0\.3\.1/i.test(leinText)) pass('project.clj: version shown'); else fail('lein version: ' + leinText.slice(0, 200));
  if (/compojure|ring|cheshire|next\.jdbc/i.test(leinText)) pass('project.clj: dependencies listed'); else fail('lein deps: ' + leinText.slice(0, 300));
  if (/lein-ring/i.test(leinText)) pass('project.clj: plugins shown'); else fail('lein plugins: ' + leinText.slice(0, 300));
  if (/dev|test|uberjar/i.test(leinText)) pass('project.clj: profiles shown'); else fail('lein profiles: ' + leinText.slice(0, 300));

  // ── deps.edn (Clojure CLI) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('deps.edn');
  await page.waitForSelector('#previewHost .deps-doc', { timeout: 12000 });
  const depsText = await page.$eval('#previewHost .deps-doc', (e) => e.textContent);
  if (/Clojure CLI/i.test(depsText)) pass('deps.edn: Clojure CLI badge shown'); else fail('deps badge: ' + depsText.slice(0, 200));
  if (/reitit|ring|next\.jdbc/i.test(depsText)) pass('deps.edn: dependencies listed'); else fail('deps deps: ' + depsText.slice(0, 300));
  if (/src|resources/i.test(depsText)) pass('deps.edn: source paths shown'); else fail('deps paths: ' + depsText.slice(0, 200));
  if (/dev|test|build|lint/i.test(depsText)) pass('deps.edn: aliases shown'); else fail('deps aliases: ' + depsText.slice(0, 300));

  // ── shadow-cljs.edn viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('shadow-cljs.edn');
  await page.waitForSelector('#previewHost .sc-doc', { timeout: 12000 });
  const scText = await page.$eval('#previewHost .sc-doc', (e) => e.textContent);
  if (/Shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: Shadow-cljs badge shown'); else fail('shadow-cljs badge: ' + scText.slice(0, 200));
  if (/reagent|re-frame|shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: dependencies listed'); else fail('shadow-cljs deps: ' + scText.slice(0, 300));
  if (/src\/main|src\/dev/i.test(scText)) pass('shadow-cljs.edn: source paths shown'); else fail('shadow-cljs paths: ' + scText.slice(0, 200));
  if (/app|tests|browser/i.test(scText)) pass('shadow-cljs.edn: builds shown'); else fail('shadow-cljs builds: ' + scText.slice(0, 300));
  if (/3000/i.test(scText)) pass('shadow-cljs.edn: dev HTTP port shown'); else fail('shadow-cljs port: ' + scText.slice(0, 200));

  // ── app.yaml (Google App Engine) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.yaml');
  await page.waitForSelector('#previewHost .gae-doc', { timeout: 12000 });
  const gaeText = await page.$eval('#previewHost .gae-doc', (e) => e.textContent);
  if (/App Engine/i.test(gaeText)) pass('app.yaml: App Engine badge shown'); else fail('gae-app badge: ' + gaeText.slice(0, 200));
  if (/nodejs20|python311|java17|ruby/i.test(gaeText)) pass('app.yaml: runtime shown'); else fail('gae-app runtime: ' + gaeText.slice(0, 200));
  if (/standard|flex/i.test(gaeText)) pass('app.yaml: environment shown'); else fail('gae-app env: ' + gaeText.slice(0, 200));

  // ── cloudbuild.yaml (Google Cloud Build) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cloudbuild.yaml');
  await page.waitForSelector('#previewHost .gcb-doc', { timeout: 12000 });
  const gcbText = await page.$eval('#previewHost .gcb-doc', (e) => e.textContent);
  if (/Cloud Build/i.test(gcbText)) pass('cloudbuild.yaml: Cloud Build badge shown'); else fail('cloudbuild badge: ' + gcbText.slice(0, 200));
  if (/step|npm|docker|node/i.test(gcbText)) pass('cloudbuild.yaml: build steps shown'); else fail('cloudbuild steps: ' + gcbText.slice(0, 300));
  if (/1200s|machineType|E2_HIGHCPU/i.test(gcbText)) pass('cloudbuild.yaml: timeout and machine type shown'); else fail('cloudbuild options: ' + gcbText.slice(0, 300));

  // ── google-services.json (Firebase) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('google-services.json');
  await page.waitForSelector('#previewHost .gs-doc', { timeout: 12000 });
  const gsText = await page.$eval('#previewHost .gs-doc', (e) => e.textContent);
  if (/Firebase/i.test(gsText)) pass('google-services.json: Firebase badge shown'); else fail('google-services badge: ' + gsText.slice(0, 200));
  if (/myapp-production|project/i.test(gsText)) pass('google-services.json: project ID shown'); else fail('google-services project: ' + gsText.slice(0, 200));
  if (/com\.example\.myapp|package_name|app client/i.test(gsText)) pass('google-services.json: app client shown'); else fail('google-services client: ' + gsText.slice(0, 300));

  // ── catalog-info.yaml (Backstage) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('catalog-info.yaml');
  await page.waitForSelector('#previewHost .cat-doc', { timeout: 12000 });
  const catText = await page.$eval('#previewHost .cat-doc', (e) => e.textContent);
  if (/Backstage/i.test(catText)) pass('catalog-info.yaml: Backstage badge shown'); else fail('catalog-info badge: ' + catText.slice(0, 200));
  if (/Component|API|System|Group|User/i.test(catText)) pass('catalog-info.yaml: entity kind shown'); else fail('catalog-info kind: ' + catText.slice(0, 200));
  if (/order-service|payment-service/i.test(catText)) pass('catalog-info.yaml: entity name shown'); else fail('catalog-info name: ' + catText.slice(0, 200));
  if (/production|experimental|deprecated/i.test(catText)) pass('catalog-info.yaml: lifecycle shown'); else fail('catalog-info lifecycle: ' + catText.slice(0, 200));

  // ── docusaurus.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docusaurus.config.js');
  await page.waitForSelector('#previewHost .dcs-doc', { timeout: 12000 });
  const dcsText = await page.$eval('#previewHost .dcs-doc', (e) => e.textContent);
  if (/Docusaurus/i.test(dcsText)) pass('docusaurus.config.js: Docusaurus badge shown'); else fail('docusaurus badge: ' + dcsText.slice(0, 200));
  if (/My Awesome Docs/i.test(dcsText)) pass('docusaurus.config.js: site title shown'); else fail('docusaurus title: ' + dcsText.slice(0, 200));
  if (/my-org\.github\.io/i.test(dcsText)) pass('docusaurus.config.js: URL shown'); else fail('docusaurus url: ' + dcsText.slice(0, 300));
  if (/Docs|Blog|API|Changelog/i.test(dcsText)) pass('docusaurus.config.js: navbar items shown'); else fail('docusaurus nav: ' + dcsText.slice(0, 300));

  // ── vitepress.config.ts viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vitepress.config.ts');
  await page.waitForSelector('#previewHost .vp-doc', { timeout: 12000 });
  const vpText = await page.$eval('#previewHost .vp-doc', (e) => e.textContent);
  if (/VitePress/i.test(vpText)) pass('vitepress.config.ts: VitePress badge shown'); else fail('vitepress badge: ' + vpText.slice(0, 200));
  if (/My VitePress Site/i.test(vpText)) pass('vitepress.config.ts: site title shown'); else fail('vitepress title: ' + vpText.slice(0, 200));
  if (/Guide|Reference|Examples|Blog/i.test(vpText)) pass('vitepress.config.ts: nav items shown'); else fail('vitepress nav: ' + vpText.slice(0, 300));
  if (/Introduction|Writing|Customization/i.test(vpText)) pass('vitepress.config.ts: sidebar sections shown'); else fail('vitepress sidebar: ' + vpText.slice(0, 300));

  // ── conf.py (Sphinx) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('conf.py');
  await page.waitForSelector('#previewHost .sphinx-doc', { timeout: 12000 });
  const sphinxText = await page.$eval('#previewHost .sphinx-doc', (e) => e.textContent);
  if (/Sphinx/i.test(sphinxText)) pass('conf.py: Sphinx badge shown'); else fail('sphinx badge: ' + sphinxText.slice(0, 200));
  if (/MyPythonLib/i.test(sphinxText)) pass('conf.py: project name shown'); else fail('sphinx project: ' + sphinxText.slice(0, 200));
  if (/Alice Smith/i.test(sphinxText)) pass('conf.py: author shown'); else fail('sphinx author: ' + sphinxText.slice(0, 200));
  if (/furo/i.test(sphinxText)) pass('conf.py: HTML theme shown'); else fail('sphinx theme: ' + sphinxText.slice(0, 300));
  if (/autodoc|napoleon|viewcode/i.test(sphinxText)) pass('conf.py: extensions shown'); else fail('sphinx extensions: ' + sphinxText.slice(0, 300));

  // ── Doxyfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Doxyfile');
  await page.waitForSelector('#previewHost .doxy-doc', { timeout: 12000 });
  const doxyText = await page.$eval('#previewHost .doxy-doc', (e) => e.textContent);
  if (/Doxygen/i.test(doxyText)) pass('Doxyfile: Doxygen badge shown'); else fail('doxygen badge: ' + doxyText.slice(0, 200));
  if (/MyC\+\+ Library/i.test(doxyText)) pass('Doxyfile: project name shown'); else fail('doxygen project: ' + doxyText.slice(0, 200));
  if (/3\.1\.0/i.test(doxyText)) pass('Doxyfile: version shown'); else fail('doxygen version: ' + doxyText.slice(0, 200));
  if (/YES|NO/i.test(doxyText)) pass('Doxyfile: boolean flags shown'); else fail('doxygen flags: ' + doxyText.slice(0, 300));
  if (/src|include|examples/i.test(doxyText)) pass('Doxyfile: input directories shown'); else fail('doxygen input: ' + doxyText.slice(0, 300));

  // ── .cursorrules viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.cursorrules');
  await page.waitForSelector('#previewHost .cr-doc', { timeout: 12000 });
  const crText = await page.$eval('#previewHost .cr-doc', (e) => e.textContent);
  if (/Cursor/i.test(crText)) pass('.cursorrules: Cursor badge shown'); else fail('.cursorrules badge: ' + crText.slice(0, 200));
  if (/section/i.test(crText)) pass('.cursorrules: sections shown'); else fail('.cursorrules sections: ' + crText.slice(0, 200));
  if (/TypeScript|Framework|Code Style/i.test(crText)) pass('.cursorrules: content sections shown'); else fail('.cursorrules content: ' + crText.slice(0, 300));

  // ── CLAUDE.md viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CLAUDE.md');
  await page.waitForSelector('#previewHost .cm-doc', { timeout: 12000 });
  const cmText = await page.$eval('#previewHost .cm-doc', (e) => e.textContent);
  if (/Claude Code/i.test(cmText)) pass('CLAUDE.md: Claude Code badge shown'); else fail('CLAUDE.md badge: ' + cmText.slice(0, 200));
  if (/section/i.test(cmText)) pass('CLAUDE.md: sections shown'); else fail('CLAUDE.md sections: ' + cmText.slice(0, 200));
  if (/monorepo|Next\.js|Fastify|TypeScript/i.test(cmText)) pass('CLAUDE.md: project content shown'); else fail('CLAUDE.md content: ' + cmText.slice(0, 300));

  // ── copilot-instructions.md viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('copilot-instructions.md');
  await page.waitForSelector('#previewHost .ci-doc', { timeout: 12000 });
  const ciText = await page.$eval('#previewHost .ci-doc', (e) => e.textContent);
  if (/GitHub Copilot/i.test(ciText)) pass('copilot-instructions.md: GitHub Copilot badge shown'); else fail('copilot-instructions badge: ' + ciText.slice(0, 200));
  if (/section/i.test(ciText)) pass('copilot-instructions.md: sections shown'); else fail('copilot-instructions sections: ' + ciText.slice(0, 200));
  if (/TypeScript|React|Naming|Error/i.test(ciText)) pass('copilot-instructions.md: content sections shown'); else fail('copilot-instructions content: ' + ciText.slice(0, 300));

  // ── aider.conf.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aider.conf.yml');
  await page.waitForSelector('#previewHost .adr-doc', { timeout: 12000 });
  const adrText = await page.$eval('#previewHost .adr-doc', (e) => e.textContent);
  if (/Aider/i.test(adrText)) pass('aider.conf.yml: Aider badge shown'); else fail('aider.conf.yml badge: ' + adrText.slice(0, 200));
  if (/claude-3-5-sonnet/i.test(adrText)) pass('aider.conf.yml: model shown'); else fail('aider.conf.yml model: ' + adrText.slice(0, 200));
  if (/diff/i.test(adrText)) pass('aider.conf.yml: edit format shown'); else fail('aider.conf.yml edit format: ' + adrText.slice(0, 200));
  if (/auto.commit|Auto.commit/i.test(adrText)) pass('aider.conf.yml: auto-commits setting shown'); else fail('aider.conf.yml auto-commits: ' + adrText.slice(0, 300));

  // ── tauri.conf.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tauri.conf.json');
  await page.waitForSelector('#previewHost .tauri-doc', { timeout: 12000 });
  const tauriText = await page.$eval('#previewHost .tauri-doc', (e) => e.textContent);
  if (/Tauri/i.test(tauriText)) pass('tauri.conf.json: Tauri badge shown'); else fail('tauri badge: ' + tauriText.slice(0, 200));
  if (/MyTauriApp/i.test(tauriText)) pass('tauri.conf.json: productName shown'); else fail('tauri productName: ' + tauriText.slice(0, 200));
  if (/1\.2\.0/i.test(tauriText)) pass('tauri.conf.json: version shown'); else fail('tauri version: ' + tauriText.slice(0, 200));
  if (/com\.example\.mytauriapp/i.test(tauriText)) pass('tauri.conf.json: bundle identifier shown'); else fail('tauri identifier: ' + tauriText.slice(0, 300));
  if (/deb|appimage|msi|nsis|dmg/i.test(tauriText)) pass('tauri.conf.json: bundle targets shown'); else fail('tauri targets: ' + tauriText.slice(0, 300));
  if (/main|splash/i.test(tauriText)) pass('tauri.conf.json: windows listed'); else fail('tauri windows: ' + tauriText.slice(0, 300));

  // ── electron-builder.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('electron-builder.yml');
  await page.waitForSelector('#previewHost .eb-doc', { timeout: 12000 });
  const ebText = await page.$eval('#previewHost .eb-doc', (e) => e.textContent);
  if (/Electron Builder/i.test(ebText)) pass('electron-builder.yml: Electron Builder badge shown'); else fail('electron-builder badge: ' + ebText.slice(0, 200));
  if (/com\.example\.myelectronapp/i.test(ebText)) pass('electron-builder.yml: appId shown'); else fail('electron-builder appId: ' + ebText.slice(0, 200));
  if (/My Electron App/i.test(ebText)) pass('electron-builder.yml: productName shown'); else fail('electron-builder productName: ' + ebText.slice(0, 200));
  if (/linux|win|mac/i.test(ebText)) pass('electron-builder.yml: platform targets shown'); else fail('electron-builder platforms: ' + ebText.slice(0, 300));

  // ── forge.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('forge.config.js');
  await page.waitForSelector('#previewHost .fg-doc', { timeout: 12000 });
  const fgText = await page.$eval('#previewHost .fg-doc', (e) => e.textContent);
  if (/Electron Forge/i.test(fgText)) pass('forge.config.js: Electron Forge badge shown'); else fail('forge badge: ' + fgText.slice(0, 200));
  if (/MyElectronApp/i.test(fgText)) pass('forge.config.js: app name shown'); else fail('forge name: ' + fgText.slice(0, 200));
  if (/maker|squirrel|deb|rpm/i.test(fgText)) pass('forge.config.js: makers shown'); else fail('forge makers: ' + fgText.slice(0, 300));
  if (/plugin|publisher/i.test(fgText)) pass('forge.config.js: plugins or publishers shown'); else fail('forge plugins: ' + fgText.slice(0, 300));

  // ── wails.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wails.json');
  await page.waitForSelector('#previewHost .wails-doc', { timeout: 12000 });
  const wailsText = await page.$eval('#previewHost .wails-doc', (e) => e.textContent);
  if (/Wails/i.test(wailsText)) pass('wails.json: Wails badge shown'); else fail('wails badge: ' + wailsText.slice(0, 200));
  if (/MyWailsApp/i.test(wailsText)) pass('wails.json: app name shown'); else fail('wails name: ' + wailsText.slice(0, 200));
  if (/v2\.9\.1/i.test(wailsText)) pass('wails.json: wailsVersion shown'); else fail('wails version: ' + wailsText.slice(0, 200));
  if (/frontend/i.test(wailsText)) pass('wails.json: frontend dir shown'); else fail('wails frontend: ' + wailsText.slice(0, 200));
  if (/desktop/i.test(wailsText)) pass('wails.json: outputType shown'); else fail('wails outputType: ' + wailsText.slice(0, 200));

  // ── web.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('web.config');
  await page.waitForSelector('#previewHost .wc-doc', { timeout: 12000 });
  const wcText = await page.$eval('#previewHost .wc-doc', (e) => e.textContent);
  if (/ASP\.NET/i.test(wcText)) pass('web.config: ASP.NET badge shown'); else fail('web.config badge: ' + wcText.slice(0, 200));
  if (/DefaultConnection|ReadOnlyDb/i.test(wcText)) pass('web.config: connection strings shown'); else fail('web.config connections: ' + wcText.slice(0, 200));
  if (/ApiBaseUrl|EmailSender/i.test(wcText)) pass('web.config: app settings shown'); else fail('web.config appSettings: ' + wcText.slice(0, 200));
  if (/Forms|Custom/i.test(wcText)) pass('web.config: auth mode or HTTP errors shown'); else fail('web.config auth/errors: ' + wcText.slice(0, 300));
  const wcMasked = await page.$eval('#previewHost .wc-doc .masked', (e) => e.textContent);
  if (/••••/.test(wcMasked)) pass('web.config: secrets masked'); else fail('web.config masking: ' + wcMasked);

  // ── app.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.config');
  await page.waitForSelector('#previewHost .ac-doc', { timeout: 12000 });
  const acText = await page.$eval('#previewHost .ac-doc', (e) => e.textContent);
  if (/\.NET/i.test(acText)) pass('app.config: .NET badge shown'); else fail('app.config badge: ' + acText.slice(0, 200));
  if (/v4\.0|4\.8/i.test(acText)) pass('app.config: runtime version shown'); else fail('app.config runtime: ' + acText.slice(0, 200));
  if (/MyAppDb|ReportsDb/i.test(acText)) pass('app.config: connection strings shown'); else fail('app.config connections: ' + acText.slice(0, 200));
  if (/Environment|LogLevel|SmtpHost/i.test(acText)) pass('app.config: app settings shown'); else fail('app.config appSettings: ' + acText.slice(0, 200));
  const acMasked = await page.$eval('#previewHost .ac-doc .masked', (e) => e.textContent);
  if (/••••/.test(acMasked)) pass('app.config: secrets masked'); else fail('app.config masking: ' + acMasked);

  // ── packages.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('packages.config');
  await page.waitForSelector('#previewHost .pc-doc', { timeout: 12000 });
  const pcText = await page.$eval('#previewHost .pc-doc', (e) => e.textContent);
  if (/NuGet/i.test(pcText)) pass('packages.config: NuGet badge shown'); else fail('packages.config badge: ' + pcText.slice(0, 200));
  if (/14 package/i.test(pcText)) pass('packages.config: package count shown'); else fail('packages.config count: ' + pcText.slice(0, 200));
  if (/Newtonsoft\.Json|EntityFramework|AutoMapper/i.test(pcText)) pass('packages.config: package ids shown'); else fail('packages.config ids: ' + pcText.slice(0, 200));
  if (/13\.0\.3|net48/i.test(pcText)) pass('packages.config: version and target framework shown'); else fail('packages.config version/tf: ' + pcText.slice(0, 200));

  // ── launchSettings.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('launchSettings.json');
  await page.waitForSelector('#previewHost .ls-doc', { timeout: 12000 });
  const lsText = await page.$eval('#previewHost .ls-doc', (e) => e.textContent);
  if (/ASP\.NET Core/i.test(lsText)) pass('launchSettings.json: ASP.NET Core badge shown'); else fail('launchSettings badge: ' + lsText.slice(0, 200));
  if (/4 launch profile/i.test(lsText)) pass('launchSettings.json: profile count shown'); else fail('launchSettings count: ' + lsText.slice(0, 200));
  if (/https|IIS Express|Docker/i.test(lsText)) pass('launchSettings.json: profiles shown'); else fail('launchSettings profiles: ' + lsText.slice(0, 200));
  if (/localhost:5000|localhost:7001/i.test(lsText)) pass('launchSettings.json: application URLs shown'); else fail('launchSettings URLs: ' + lsText.slice(0, 300));
  if (/ASPNETCORE_ENVIRONMENT|Development/i.test(lsText)) pass('launchSettings.json: environment variables shown'); else fail('launchSettings env: ' + lsText.slice(0, 300));

  // ── terragrunt.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('terragrunt.hcl');
  await page.waitForSelector('#previewHost .tgr-doc', { timeout: 12000 });
  const tgrText = await page.$eval('#previewHost .tgr-doc', (e) => e.textContent);
  if (/Terragrunt/i.test(tgrText)) pass('terragrunt.hcl: Terragrunt badge shown'); else fail('terragrunt badge: ' + tgrText.slice(0, 200));
  if (/api-service|modules/i.test(tgrText)) pass('terragrunt.hcl: source shown'); else fail('terragrunt source: ' + tgrText.slice(0, 200));
  if (/vpc|database/i.test(tgrText)) pass('terragrunt.hcl: dependencies shown'); else fail('terragrunt deps: ' + tgrText.slice(0, 200));

  // ── .tflint.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.tflint.hcl');
  await page.waitForSelector('#previewHost .tfl-doc', { timeout: 12000 });
  const tflText = await page.$eval('#previewHost .tfl-doc', (e) => e.textContent);
  if (/TFLint/i.test(tflText)) pass('.tflint.hcl: TFLint badge shown'); else fail('tflint badge: ' + tflText.slice(0, 200));
  if (/aws|terraform/i.test(tflText)) pass('.tflint.hcl: plugins shown'); else fail('tflint plugins: ' + tflText.slice(0, 200));
  if (/enabled|disabled/i.test(tflText)) pass('.tflint.hcl: rule states shown'); else fail('tflint rules: ' + tflText.slice(0, 300));

  // ── .terraform.lock.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.terraform.lock.hcl');
  await page.waitForSelector('#previewHost .tfl-lock-doc', { timeout: 12000 });
  const tflLockText = await page.$eval('#previewHost .tfl-lock-doc', (e) => e.textContent);
  if (/Terraform Lock/i.test(tflLockText)) pass('.terraform.lock.hcl: badge shown'); else fail('tf-lock badge: ' + tflLockText.slice(0, 200));
  if (/hashicorp\/aws|5\.31/i.test(tflLockText)) pass('.terraform.lock.hcl: provider shown'); else fail('tf-lock provider: ' + tflLockText.slice(0, 200));
  if (/hash/i.test(tflLockText)) pass('.terraform.lock.hcl: hash count shown'); else fail('tf-lock hashes: ' + tflLockText.slice(0, 300));

  // ── versions.tf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('versions.tf');
  await page.waitForSelector('#previewHost .vtf-doc', { timeout: 12000 });
  const vtfText = await page.$eval('#previewHost .vtf-doc', (e) => e.textContent);
  if (/Terraform/i.test(vtfText)) pass('versions.tf: Terraform badge shown'); else fail('versions-tf badge: ' + vtfText.slice(0, 200));
  if (/1\.5\.0/i.test(vtfText)) pass('versions.tf: required_version shown'); else fail('versions-tf version: ' + vtfText.slice(0, 200));
  if (/hashicorp\/aws|kubernetes/i.test(vtfText)) pass('versions.tf: providers shown'); else fail('versions-tf providers: ' + vtfText.slice(0, 300));

  // ── mongod.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mongod.conf');
  await page.waitForSelector('#previewHost .mg-doc', { timeout: 12000 });
  const mgText = await page.$eval('#previewHost .mg-doc', (e) => e.textContent);
  if (/MongoDB/i.test(mgText)) pass('mongod.conf: MongoDB badge shown'); else fail('mongod badge: ' + mgText.slice(0, 200));
  if (/27017|\/var\/lib\/mongodb/i.test(mgText)) pass('mongod.conf: storage/network settings shown'); else fail('mongod storage: ' + mgText.slice(0, 300));
  if (/rs0|replSet/i.test(mgText)) pass('mongod.conf: replication section shown'); else fail('mongod repl: ' + mgText.slice(0, 300));
  if (/••••/.test(mgText)) pass('mongod.conf: keyFile value masked'); else fail('mongod masking: ' + mgText.slice(0, 300));

  // ── my.cnf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('my.cnf');
  await page.waitForSelector('#previewHost .my-doc', { timeout: 12000 });
  const myText = await page.$eval('#previewHost .my-doc', (e) => e.textContent);
  if (/MySQL/i.test(myText)) pass('my.cnf: MySQL badge shown'); else fail('my.cnf badge: ' + myText.slice(0, 200));
  if (/3306|127\.0\.0\.1/i.test(myText)) pass('my.cnf: [mysqld] section shown (port/bind)'); else fail('my.cnf mysqld: ' + myText.slice(0, 300));
  if (/256M|innodb_buffer_pool/i.test(myText)) pass('my.cnf: InnoDB buffer pool shown'); else fail('my.cnf innodb: ' + myText.slice(0, 300));
  if (/utf8mb4|default-character-set/i.test(myText)) pass('my.cnf: character set shown'); else fail('my.cnf charset: ' + myText.slice(0, 300));

  // ── postgresql.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('postgresql.conf');
  await page.waitForSelector('#previewHost .pg-doc', { timeout: 12000 });
  const pgText = await page.$eval('#previewHost .pg-doc', (e) => e.textContent);
  if (/PostgreSQL/i.test(pgText)) pass('postgresql.conf: PostgreSQL badge shown'); else fail('postgresql badge: ' + pgText.slice(0, 200));
  if (/5432|localhost/i.test(pgText)) pass('postgresql.conf: connections section shown'); else fail('postgresql conns: ' + pgText.slice(0, 300));
  if (/128MB|shared_buffers/i.test(pgText)) pass('postgresql.conf: memory settings shown'); else fail('postgresql mem: ' + pgText.slice(0, 300));
  if (/replica|wal_level/i.test(pgText)) pass('postgresql.conf: WAL section shown'); else fail('postgresql wal: ' + pgText.slice(0, 300));

  // ── pgbouncer.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pgbouncer.ini');
  await page.waitForSelector('#previewHost .pb-doc', { timeout: 12000 });
  const pbText = await page.$eval('#previewHost .pb-doc', (e) => e.textContent);
  if (/PgBouncer/i.test(pbText)) pass('pgbouncer.ini: PgBouncer badge shown'); else fail('pgbouncer badge: ' + pbText.slice(0, 200));
  if (/mydb|replica/i.test(pbText)) pass('pgbouncer.ini: [databases] section shown'); else fail('pgbouncer dbs: ' + pbText.slice(0, 300));
  if (/transaction|pool_mode/i.test(pbText)) pass('pgbouncer.ini: pool_mode shown'); else fail('pgbouncer pool: ' + pbText.slice(0, 300));
  if (/••••/.test(pbText)) pass('pgbouncer.ini: password in connection string masked'); else fail('pgbouncer masking: ' + pbText.slice(0, 300));

  // ── .pylintrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.pylintrc');
  await page.waitForSelector('#previewHost .pl-doc', { timeout: 12000 });
  const plText = await page.$eval('#previewHost .pl-doc', (e) => e.textContent);
  if (/Pylint/i.test(plText)) pass('.pylintrc: Pylint badge shown'); else fail('pylintrc badge: ' + plText.slice(0, 200));
  if (/disabled/i.test(plText)) pass('.pylintrc: disabled codes section shown'); else fail('pylintrc disabled: ' + plText.slice(0, 200));
  if (/max-line-length|120/i.test(plText)) pass('.pylintrc: max-line-length shown'); else fail('pylintrc max-line: ' + plText.slice(0, 300));
  if (/jobs/i.test(plText)) pass('.pylintrc: jobs shown'); else fail('pylintrc jobs: ' + plText.slice(0, 300));

  // ── .flake8 viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.flake8');
  await page.waitForSelector('#previewHost .f8-doc', { timeout: 12000 });
  const f8Text = await page.$eval('#previewHost .f8-doc', (e) => e.textContent);
  if (/Flake8/i.test(f8Text)) pass('.flake8: Flake8 badge shown'); else fail('flake8 badge: ' + f8Text.slice(0, 200));
  if (/max-line-length|120/i.test(f8Text)) pass('.flake8: max-line-length shown'); else fail('flake8 max-line: ' + f8Text.slice(0, 200));
  if (/E203|W503|E501/i.test(f8Text)) pass('.flake8: ignored codes shown'); else fail('flake8 ignored: ' + f8Text.slice(0, 300));
  if (/venv|migrations|__pycache__/i.test(f8Text)) pass('.flake8: excluded paths shown'); else fail('flake8 excluded: ' + f8Text.slice(0, 300));

  // ── setup.cfg viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('setup.cfg');
  await page.waitForSelector('#previewHost .sc-doc', { timeout: 12000 });
  const scText = await page.$eval('#previewHost .sc-doc', (e) => e.textContent);
  if (/setup\.cfg/i.test(scText)) pass('setup.cfg: badge shown'); else fail('setup.cfg badge: ' + scText.slice(0, 200));
  if (/myproject/i.test(scText)) pass('setup.cfg: package name shown'); else fail('setup.cfg name: ' + scText.slice(0, 200));
  if (/1\.4\.2/i.test(scText)) pass('setup.cfg: version shown'); else fail('setup.cfg version: ' + scText.slice(0, 300));
  if (/fastapi|pydantic|sqlalchemy/i.test(scText)) pass('setup.cfg: dependencies shown'); else fail('setup.cfg deps: ' + scText.slice(0, 300));
  if (/pytest|mypy/i.test(scText)) pass('setup.cfg: tool sections shown'); else fail('setup.cfg tools: ' + scText.slice(0, 300));

  // ── .bandit viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bandit');
  await page.waitForSelector('#previewHost .bd-doc', { timeout: 12000 });
  const bdText = await page.$eval('#previewHost .bd-doc', (e) => e.textContent);
  if (/Bandit/i.test(bdText)) pass('.bandit: Bandit badge shown'); else fail('bandit badge: ' + bdText.slice(0, 200));
  if (/B101|B311|B506/i.test(bdText)) pass('.bandit: skipped test IDs shown'); else fail('bandit skips: ' + bdText.slice(0, 300));
  if (/tests|migrations|venv/i.test(bdText)) pass('.bandit: excluded dirs shown'); else fail('bandit exclude: ' + bdText.slice(0, 300));
  if (/MEDIUM|severity/i.test(bdText)) pass('.bandit: severity filter shown'); else fail('bandit severity: ' + bdText.slice(0, 300));
}
